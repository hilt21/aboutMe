import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, renameSync, mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beijingTime, createAudit } from './audit.mjs';

export function scheduledDay(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(p => [p.type, p.value]));
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  return Number(parts.hour) >= 21 ? day : new Date(Date.parse(day + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
}

// Acquisition timestamps must not turn unchanged statistics into a publication.
export function statistics(snapshot) {
  return JSON.stringify({
    schema_version: snapshot.schema_version, source: snapshot.source, metric: snapshot.metric,
    source_timezone: snapshot.source_timezone, summary: snapshot.summary,
    daily: snapshot.daily.map(({ date, value }) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date)),
  });
}

export function runDaily(statePath, force = false, {
  root = fileURLToPath(new URL('../../', import.meta.url)), execute = execFileSync,
  now = () => new Date(), output = console.log,
} = {}) {
  const target = 'src/data/chatgpt-activity.json';
  mkdirSync(dirname(statePath), { recursive: true, mode: 0o700 });
  let lock;
  try { lock = openSync(statePath + '.lock', 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') return console.log(JSON.stringify({ time_beijing: beijingTime(), stage: 'lock', event: 'already_running' })); throw error; }
  let state = {};
  let audit;
  const saveState = () => {
    try {
      writeFileSync(statePath + '.tmp', JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
      renameSync(statePath + '.tmp', statePath);
      audit?.emit('state_saved', { stage: 'state_write' });
    } catch (error) {
      state.failure_stage = 'state_write';
      audit?.emit('state_write_failed', { stage: 'state_write', failure_kind: 'filesystem' });
      throw error;
    }
  };
  const run = (file, args) => {
    const stage = file === 'git' ? 'git_' + args[0] : args.at(-1).includes('validate') ? 'validation' : 'collection';
    audit.stage(stage);
    try {
      const result = execute(file, args, { cwd: root, encoding: 'utf8', timeout: 180000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
      audit.emit('command_succeeded');
      return result;
    }
    catch (error) {
      // Raw command stderr can contain authentication details; log only a safe stage.
      state.failure_stage = stage;
      audit.emit('command_failed', { exit_code: error.status ?? null, failure_kind: error.code === 'ETIMEDOUT' ? 'timeout' : error.code === 'ENOENT' ? 'executable_unavailable' : 'command_error' });
      throw new Error(`${file === 'git' ? 'git ' + args[0] : 'collection/validation'} failed (exit ${error.status ?? 'timeout/launch error'})`);
    }
  };
  const git = (...args) => run('git', args);
  try {
    try { state = JSON.parse(readFileSync(statePath, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    audit = createAudit(state, now, output);
    const due = scheduledDay(now());
    if (!force && state.completed_day >= due && !state.pending_publication && (!state.last_result || state.last_result === 'succeeded')) { saveState(); audit.emit('already_completed'); return; }
    audit.begin(due);
    saveState();
    if (git('remote', 'get-url', 'origin') !== 'https://github.com/hilt21/aboutMe.git' || git('branch', '--show-current') !== 'main') throw new Error('Unexpected sync repository or branch');
    if (git('status', '--porcelain', '--untracked-files=no')) throw new Error('Sync checkout is dirty; manual inspection required');
    git('fetch', 'origin', 'main');
    // A timeout does not establish whether GitHub accepted the previous push.
    if (state.pending_publication && git('branch', '-r', '--contains', state.pending_publication.commit, '--list', 'origin/main')) {
      audit.pushed(true);
      saveState();
    }
    const push = () => {
      audit.beforePush(git('rev-parse', 'HEAD'));
      saveState();
      git('push', 'origin', 'HEAD:main');
      audit.pushed();
      saveState();
    };
    // Retry a previous publication only if its entire pending payload is the aggregate snapshot.
    if (Number(git('rev-list', '--count', 'origin/main..HEAD')) > 0) {
      const files = git('diff', '--name-only', 'origin/main...HEAD');
      if (files !== target) throw new Error('Unexpected pending changes; refusing publication');
      push();
    }
    git('pull', '--ff-only', 'origin', 'main');
    const before = readFileSync(resolve(root, target), 'utf8');
    try {
      run(process.execPath, ['--experimental-strip-types', 'scripts/activity/sync.ts']);
      const after = readFileSync(resolve(root, target), 'utf8');
      if (statistics(JSON.parse(before)) !== statistics(JSON.parse(after))) {
        run(process.execPath, ['--experimental-strip-types', 'scripts/activity/validate.ts']);
        git('add', '--', target);
        git('commit', '-m', 'data: refresh verified Codex activity');
        push();
      } else { writeFileSync(resolve(root, target), before); audit.emit('statistics_unchanged'); }
    } catch (error) {
      // Preserve committed data for retry; restore only an uncommitted collector result.
      if (git('diff', '--name-only', 'HEAD', '--', target)) git('restore', '--staged', '--worktree', '--source=HEAD', '--', target);
      throw error;
    }
    state.commit = git('rev-parse', 'HEAD');
    state.last_checked_at = now().toISOString();
    state.completed_day = due;
    audit.stage('complete');
    audit.finish('succeeded', false);
    saveState();
    audit.emit('run_completed');
  } catch (error) {
    if (audit) { audit.finish('failed'); saveState(); }
    else output(JSON.stringify({ time_beijing: beijingTime(now()), stage: 'state_read', event: 'failed', failure_kind: 'filesystem_or_invalid_state' }));
    throw error;
  } finally { closeSync(lock); unlinkSync(statePath + '.lock'); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!process.env.ACTIVITY_SYNC_STATE) throw new Error('ACTIVITY_SYNC_STATE is required');
    runDaily(process.env.ACTIVITY_SYNC_STATE, process.argv.includes('--force'));
  } catch { console.error(JSON.stringify({ time_beijing: beijingTime(), stage: 'exit', event: 'failed', details: 'See preceding stage event; command output withheld' })); process.exitCode = 1; }
}
