import { setTimeout as delay } from 'node:timers/promises';
import { failedSnapshot } from './github-core.mjs';
import { beijingTime } from './activity/audit.mjs';

const MAX_ATTEMPTS = 3;
const WAIT_BUDGET_MS = 120000;

class ProjectFailure extends Error {
  constructor(details) {
    super(`Project collection: ${details.category}; repo=${details.repo}; HTTP=${details.http_status ?? 'none'}; attempts=${details.attempt}; stop=${details.stop}`);
    this.details = details;
  }
}

function retryAfter(value, now) {
  if (value === null) return null;
  if (/^\d+$/.test(value.trim())) return Number(value) * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : null;
}

async function classifyResponse(response, now, attempt) {
  const status = response.status;
  const retryMs = retryAfter(response.headers.get('retry-after'), now);
  const exhausted = response.headers.get('x-ratelimit-remaining') === '0';
  const resetValue = response.headers.get('x-ratelimit-reset');
  const reset = resetValue !== null && /^\d+$/.test(resetValue) ? Number(resetValue) * 1000 - now : null;
  if (status === 403 || status === 429) {
    // Inspect only known classifications; never retain or print API response text.
    let message = '';
    try { message = (await response.json())?.message; } catch {}
    const secondary = typeof message === 'string' && /secondary rate limit|abuse detection/i.test(message);
    if (status === 403 && !secondary && typeof message === 'string' && /resource not accessible|permission|forbidden|access denied/i.test(message)) return { category: 'permission_denied', retry: false };
    if (retryMs !== null || exhausted || secondary || status === 429) {
      const wait = Math.max(retryMs ?? 0, exhausted ? reset ?? 60000 : 0, retryMs === null && !exhausted ? 60000 * 2 ** (attempt - 1) : 0);
      return { category: exhausted ? 'primary_rate_limit' : 'rate_limit', retry: true, wait_ms: Math.max(1000, wait) };
    }
    return { category: 'http_403_unclassified', retry: attempt < 2, wait_ms: 60000 };
  }
  if (status >= 500 && status <= 599) return { category: 'server_error', retry: true, wait_ms: Math.max(retryMs ?? 0, 2000 * 2 ** (attempt - 1)) };
  return { category: status === 401 ? 'authentication_required' : status === 404 ? 'not_found_or_inaccessible' : 'http_error', retry: false };
}

export async function refreshProjects(projects, previous, {
  fetchImpl = fetch, sleep = delay, now = () => new Date(), onEvent = event => console.log(JSON.stringify(event)),
} = {}) {
  const attemptedAt = now().toISOString();
  let waited = 0;
  const emit = details => onEvent({ time_beijing: beijingTime(now()), stage: 'project_collection', ...details });
  try {
    const items = [];
    for (const project of projects) {
      const match = project.repo.match(/^https:\/\/github\.com\/(hilt21\/[\w.-]+)$/);
      if (!match) throw new ProjectFailure({ category: 'invalid_repository', repo: 'invalid', attempt: 0, stop: 'not_retryable' });
      const repoName = match[1];
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        emit({ event: 'attempt_started', repo: repoName, attempt });
        let response, failure, repo;
        try {
          response = await fetchImpl(`https://api.github.com/repos/${repoName}`, {
            headers: { 'User-Agent': 'hilt21-aboutMe', Accept: 'application/vnd.github+json' },
            signal: AbortSignal.timeout(30000),
          });
        } catch (error) {
          failure = { category: ['TimeoutError', 'AbortError'].includes(error.name) ? 'timeout' : 'network_error', retry: true, wait_ms: 2000 * 2 ** (attempt - 1) };
        }
        if (response) {
          if (!response.ok) {
            failure = await classifyResponse(response, now().getTime(), attempt);
            if (!response.bodyUsed) await response.body?.cancel().catch(() => {});
          }
          else {
            try { repo = await response.json(); }
            catch (error) {
              const timeout = ['TimeoutError', 'AbortError'].includes(error.name);
              failure = { category: timeout ? 'timeout' : 'invalid_response', retry: timeout, wait_ms: 2000 * 2 ** (attempt - 1) };
            }
            if (!failure && (!repo || repo.private || !Number.isInteger(repo.stargazers_count) || !repo.pushed_at)) failure = { category: 'invalid_metadata', retry: false };
          }
        }
        if (!failure) {
          items.push({ repo: project.repo, stars: repo.stargazers_count, forks: repo.forks_count, pushedAt: repo.pushed_at, archived: repo.archived, defaultBranch: repo.default_branch });
          emit({ event: attempt > 1 ? 'retry_succeeded' : 'succeeded', repo: repoName, attempt });
          break;
        }
        const stop = !failure.retry ? 'not_retryable' : attempt === MAX_ATTEMPTS ? 'attempts_exhausted' : waited + failure.wait_ms > WAIT_BUDGET_MS ? 'wait_budget_exceeded' : null;
        const details = { category: failure.category, repo: repoName, http_status: response?.status ?? null, attempt, stop };
        emit({ event: stop ? 'failed' : 'retry_scheduled', ...details, ...(stop ? {} : { wait_ms: failure.wait_ms }) });
        if (stop) throw new ProjectFailure(details);
        waited += failure.wait_ms;
        await sleep(failure.wait_ms);
      }
    }
    return { snapshot: { schemaVersion: 1, updatedAt: attemptedAt, lastAttemptAt: attemptedAt, status: 'ok', error: null, items }, failed: false };
  } catch (error) {
    const reason = error instanceof ProjectFailure ? error.message : 'Project collection: unexpected_error; response text withheld';
    emit({ event: 'snapshot_retained', status: previous.updatedAt ? 'stale' : 'unavailable', reason });
    return { snapshot: failedSnapshot(previous, reason, attemptedAt), failed: true };
  }
}
