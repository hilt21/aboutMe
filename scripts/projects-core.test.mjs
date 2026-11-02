import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshProjects } from './projects-core.mjs';
import { refreshReport } from './report-refresh.mjs';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const now = () => new Date('2026-11-02T12:00:00Z');
const project = { repo: 'https://github.com/hilt21/aboutMe' };
const metadata = { private: false, stargazers_count: 3, forks_count: 1, pushed_at: '2026-11-01T13:00:00Z', archived: false, default_branch: 'main' };
const previous = { schemaVersion: 1, updatedAt: '2026-11-01T13:00:00Z', status: 'ok', error: null, items: [{ repo: project.repo, stars: 2 }] };
const response = (status, body = {}, headers = {}) => new Response(JSON.stringify(body), { status, headers });

async function scenario(responses, projects = [project]) {
  const events = [], waits = [], requests = [];
  const result = await refreshProjects(projects, previous, {
    now, onEvent: event => events.push(event), sleep: async ms => waits.push(ms),
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      const next = responses.shift();
      if (next instanceof Error) throw next;
      assert.ok(next, 'No unplanned API requests');
      return next;
    },
  });
  return { ...result, events, waits, requests };
}

test('transient unexplained 403 recovers once, logs retry success, and uses no credentials', async () => {
  const result = await scenario([response(403, { message: 'temporary SECRET response' }), response(200, metadata)]);
  assert.equal(result.failed, false);
  assert.equal(result.snapshot.status, 'ok');
  assert.equal(result.snapshot.error, null);
  assert.deepEqual(result.waits, [60000]);
  assert.equal(result.events.at(-1).event, 'retry_succeeded');
  assert.equal(result.events.at(-1).time_beijing, '2026-11-02T20:00:00.000+08:00');
  assert.equal(result.requests.length, 2);
  assert.equal(result.requests[0].options.headers.Authorization, undefined);
  assert.equal(JSON.stringify(result.events).includes('SECRET'), false);
});

test('persistent 403 is bounded, retains full old snapshot and timestamp, records cause', async () => {
  const result = await scenario([response(403), response(403)]);
  assert.equal(result.failed, true);
  assert.equal(result.snapshot.status, 'stale');
  assert.equal(result.snapshot.updatedAt, previous.updatedAt);
  assert.deepEqual(result.snapshot.items, previous.items);
  assert.equal(result.snapshot.lastAttemptAt, now().toISOString());
  assert.match(result.snapshot.error, /http_403_unclassified.*HTTP=403.*attempts=2/);
  assert.equal(result.requests.length, 2);
});

test('permission 403 and 401/404 fail immediately rather than concealing real failures', async () => {
  for (const [status, message, category] of [[403, 'Resource not accessible by integration', 'permission_denied'], [401, 'SECRET', 'authentication_required'], [404, 'SECRET', 'not_found_or_inaccessible']]) {
    const r = await scenario([response(status, { message })]);
    assert.equal(r.failed, true);
    assert.deepEqual(r.waits, []);
    assert.match(r.snapshot.error, new RegExp(category));
    assert.equal(JSON.stringify(r).includes('SECRET'), false);
  }
});

test('explicit permission denial is not misclassified by mixed rate-limit headers', async () => {
  const r = await scenario([response(403, { message: 'Resource not accessible by integration' }, { 'retry-after': '1', 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(now().getTime() / 1000 + 5) })]);
  assert.equal(r.failed, true);
  assert.deepEqual(r.waits, []);
  assert.equal(r.requests.length, 1);
  assert.match(r.snapshot.error, /permission_denied/);
});

test('obeys Retry-After seconds/date and primary-rate-limit reset, never retries too early', async () => {
  const cases = [
    [{ 'retry-after': '4' }, 4000],
    [{ 'retry-after': 'Mon, 02 Nov 2026 12:00:05 GMT' }, 5000],
    [{ 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(now().getTime() / 1000 + 6) }, 6000],
    [{ 'retry-after': '4', 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(now().getTime() / 1000 + 6) }, 6000],
  ];
  for (const [headers, wait] of cases) {
    const r = await scenario([response(403, {}, headers), response(200, metadata)]);
    assert.equal(r.failed, false);
    assert.deepEqual(r.waits, [wait]);
  }
});

test('long limits and exponential secondary backoff stop within total wait budget', async () => {
  const long = await scenario([response(429, {}, { 'retry-after': '3600' })]);
  assert.equal(long.failed, true);
  assert.equal(long.requests.length, 1);
  assert.deepEqual(long.waits, []);
  assert.match(long.snapshot.error, /wait_budget_exceeded/);
  const secondary = await scenario([response(403, { message: 'secondary rate limit' }), response(403, { message: 'secondary rate limit' })]);
  assert.deepEqual(secondary.waits, [60000]);
  assert.equal(secondary.requests.length, 2);
  assert.match(secondary.snapshot.error, /wait_budget_exceeded/);
});

test('network, timeout and 5xx get at most three attempts; raw errors never enter snapshot/logs', async () => {
  for (const problem of [() => new TypeError('SECRET network details'), () => Object.assign(new Error('SECRET'), { name: 'TimeoutError' }), () => response(503)]) {
    const r = await scenario([problem(), problem(), problem()]);
    assert.equal(r.failed, true);
    assert.deepEqual(r.waits, [2000, 4000]);
    assert.equal(r.requests.length, 3);
    assert.match(r.snapshot.error, /attempts_exhausted/);
    assert.equal(JSON.stringify(r.events).includes('SECRET'), false);
    assert.equal(r.snapshot.error.includes('SECRET'), false);
  }
});

test('partial success is never mixed into fallback; invalid JSON/metadata never replaces valid snapshot', async () => {
  const r = await scenario([response(200, metadata), response(404)], [project, { repo: 'https://github.com/hilt21/Quiz410' }]);
  assert.deepEqual(r.snapshot.items, previous.items);
  for (const bad of [new Response('SECRET invalid JSON'), response(200, { private: true })]) {
    const invalid = await scenario([bad]);
    assert.equal(invalid.failed, true);
    assert.deepEqual(invalid.waits, []);
    assert.deepEqual(invalid.snapshot.items, previous.items);
    assert.equal(JSON.stringify(invalid.events).includes('SECRET'), false);
  }
});

test('request-body timeout is retried, and retry waits are shared across repositories', async () => {
  const timeoutResponse = { ok: true, status: 200, json: async () => { throw Object.assign(new Error('SECRET'), { name: 'TimeoutError' }); } };
  const body = await scenario([timeoutResponse, response(200, metadata)]);
  assert.equal(body.failed, false);
  assert.deepEqual(body.waits, [2000]);
  const shared = await scenario([response(429, {}, { 'retry-after': '70' }), response(200, metadata), response(429, {}, { 'retry-after': '70' })], [project, { repo: 'https://github.com/hilt21/Quiz410' }]);
  assert.equal(shared.failed, true);
  assert.deepEqual(shared.waits, [70000]);
  assert.match(shared.snapshot.error, /wait_budget_exceeded/);
});

test('real collector CLI atomically retains fallback with exit1, then recovered retry exits0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'projects-cli-'));
  try {
    mkdirSync(join(dir, 'scripts/activity'), { recursive: true });
    mkdirSync(join(dir, 'src/data'), { recursive: true });
    for (const file of ['sync-projects.mjs', 'projects-core.mjs', 'github-core.mjs', 'activity/audit.mjs']) copyFileSync(new URL(file, import.meta.url), join(dir, 'scripts', file));
    writeFileSync(join(dir, 'src/data/profile.json'), JSON.stringify({ projects: [project] }));
    const target = join(dir, 'src/data/projects.json');
    writeFileSync(target, JSON.stringify(previous));
    const preload = join(dir, 'mock.mjs');
    writeFileSync(preload, `globalThis.fetch=async()=>new Response(JSON.stringify({message:'Resource not accessible SECRET'}),{status:403});`);
    let run = spawnSync(process.execPath, ['--import', preload, join(dir, 'scripts/sync-projects.mjs')], { encoding: 'utf8', timeout: 10000 });
    assert.equal(run.status, 1);
    let saved = JSON.parse(readFileSync(target));
    assert.deepEqual(saved.items, previous.items);
    assert.equal(saved.updatedAt, previous.updatedAt);
    assert.equal(saved.status, 'stale');
    assert.match(run.stderr, /Project metadata collection failed/);
    assert.equal((run.stdout + run.stderr + JSON.stringify(saved)).includes('SECRET'), false);
    writeFileSync(preload, `let n=0;globalThis.fetch=async()=>++n===1?new Response('{}',{status:403,headers:{'retry-after':'0'}}):new Response(${JSON.stringify(JSON.stringify(metadata))},{status:200});`);
    run = spawnSync(process.execPath, ['--import', preload, join(dir, 'scripts/sync-projects.mjs')], { encoding: 'utf8', timeout: 10000 });
    assert.equal(run.status, 0);
    saved = JSON.parse(readFileSync(target));
    assert.equal(saved.status, 'ok');
    assert.equal(saved.error, null);
    assert.match(run.stdout, /retry_succeeded/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('real report CLI writes separate stage summary and fails only when outcome requires it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'refresh-summary-'));
  try {
    const summary = join(dir, 'summary.md');
    const env = { ...process.env, BUILD_RESULT: 'success', DEPLOY_RESULT: 'success', CALENDAR_OUTCOME: 'success', PROJECTS_OUTCOME: 'failure', ANALYTICS_OUTCOME: 'success', GITHUB_STEP_SUMMARY: summary };
    const script = new URL('./report-refresh.mjs', import.meta.url);
    let run = spawnSync(process.execPath, [script.pathname], { env, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.match(readFileSync(summary, 'utf8'), /Pages deployment succeeded/);
    assert.match(readFileSync(summary, 'utf8'), /Project metadata collection \| failure/);
    run = spawnSync(process.execPath, [script.pathname], { env: { ...env, PROJECTS_OUTCOME: 'success' }, encoding: 'utf8' });
    assert.equal(run.status, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('report distinguishes collection failure with successful deployment from failed deployment', () => {
  const good = { build: 'success', deploy: 'success', calendar: 'success', projects: 'success', analytics: 'success' };
  assert.equal(refreshReport(good).failed, false);
  assert.equal(refreshReport({ ...good, calendar: 'skipped', projects: 'skipped' }).failed, false);
  const fallback = refreshReport({ ...good, projects: 'failure' });
  assert.equal(fallback.failed, true);
  assert.match(fallback.summary, /Project metadata collection \| failure/);
  assert.match(fallback.summary, /Pages deployment succeeded/);
  assert.equal(fallback.messages.some(m => m.startsWith('Pages deployment did not succeed')), false);
  const deployment = refreshReport({ ...good, deploy: 'failure' });
  assert.equal(deployment.failed, true);
  assert.equal(deployment.messages.some(m => m.startsWith('Collection failed')), false);
  assert.match(deployment.summary, /Pages deployment did not succeed/);
  const buildFailure = refreshReport({ ...good, build: 'failure', deploy: 'skipped' });
  assert.equal(buildFailure.failed, true);
  assert.match(buildFailure.summary, /Build did not complete/);
  assert.equal(refreshReport({ ...good, projects: undefined }).failed, true);
});
