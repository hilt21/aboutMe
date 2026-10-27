import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, renameSync, mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

export function runDaily(statePath, force = false) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const target = 'src/data/chatgpt-activity.json';
  mkdirSync(dirname(statePath), { recursive: true, mode: 0o700 });
  let lock;
  try { lock = openSync(statePath + '.lock', 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') return console.log('Sync already running; skipped.'); throw error; }
  const run = (file, args) => {
    try { return execFileSync(file, args, { cwd: root, encoding: 'utf8', timeout: 180000, stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
    catch (error) {
      // Raw command stderr can contain authentication details; log only a safe stage.
      throw new Error(`${file === 'git' ? 'git ' + args[0] : 'collection/validation'} failed (exit ${error.status ?? 'timeout/launch error'})`);
    }
  };
  const git = (...args) => run('git', args);
  try {
    let state = {};
    try { state = JSON.parse(readFileSync(statePath, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    const due = scheduledDay();
    if (!force && state.completed_day >= due) return console.log('Already completed this scheduled day; skipped.');
    if (git('remote', 'get-url', 'origin') !== 'https://github.com/hilt21/aboutMe.git' || git('branch', '--show-current') !== 'main') throw new Error('Unexpected sync repository or branch');
    if (git('status', '--porcelain', '--untracked-files=no')) throw new Error('Sync checkout is dirty; manual inspection required');
    git('fetch', 'origin', 'main');
    let published = false;
    // Retry a previous publication only if its entire pending payload is the aggregate snapshot.
    if (Number(git('rev-list', '--count', 'origin/main..HEAD')) > 0) {
      const files = git('diff', '--name-only', 'origin/main...HEAD');
      if (files !== target) throw new Error('Unexpected pending changes; refusing publication');
      git('push', 'origin', 'HEAD:main');
      published = true;
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
        git('push', 'origin', 'HEAD:main');
        published = true;
      } else writeFileSync(resolve(root, target), before);
    } catch (error) {
      // Preserve committed data for retry; restore only an uncommitted collector result.
      if (git('diff', '--name-only', 'HEAD', '--', target)) git('restore', '--staged', '--worktree', '--source=HEAD', '--', target);
      throw error;
    }
    const next = { completed_day: due, last_checked_at: new Date().toISOString(), published, commit: git('rev-parse', 'HEAD') };
    writeFileSync(statePath + '.tmp', JSON.stringify(next, null, 2) + '\n', { mode: 0o600 });
    renameSync(statePath + '.tmp', statePath);
    console.log(JSON.stringify(next));
  } finally { closeSync(lock); unlinkSync(statePath + '.lock'); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!process.env.ACTIVITY_SYNC_STATE) throw new Error('ACTIVITY_SYNC_STATE is required');
    runDaily(process.env.ACTIVITY_SYNC_STATE, process.argv.includes('--force'));
  } catch (error) { console.error('Daily activity sync failed:', error.message); process.exitCode = 1; }
}
