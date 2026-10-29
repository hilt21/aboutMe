import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduledDay, statistics, runDaily } from './activity/daily.mjs';
import { beijingTime, createAudit } from './activity/audit.mjs';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const clock = () => new Date('2026-10-29T13:00:00.123Z');
const makeAudit = (state, now = clock) => {
  const logs = [];
  return { audit: createAudit(state, now, text => logs.push(JSON.parse(text))), logs };
};

test('state read/write failures have safe stages, release locks, and never claim completion', () => {
  const root = mkdtempSync(join(tmpdir(), 'activity-audit-state-'));
  const statePath = join(root, 'state.json');
  const logs = [];
  const options = { root, now: clock, output: text => logs.push(JSON.parse(text)), execute: () => { throw new Error('No command should run'); } };
  try {
    writeFileSync(statePath, 'invalid JSON SECRET');
    assert.throws(() => runDaily(statePath, false, options));
    assert.equal(logs.at(-1).stage, 'state_read');
    assert.equal(existsSync(statePath + '.lock'), false);
    rmSync(statePath);
    mkdirSync(statePath + '.tmp');
    assert.throws(() => runDaily(statePath, false, options));
    assert.equal(logs.some(l => l.stage === 'state_write' && l.event === 'state_write_failed'), true);
    assert.equal(logs.some(l => l.event === 'run_completed'), false);
    assert.equal(JSON.stringify(logs).includes('SECRET'), false);
    assert.equal(existsSync(statePath + '.lock'), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('runner persists ambiguous push and reconciles next invocation without duplicate publication', () => {
  const root = mkdtempSync(join(tmpdir(), 'activity-audit-'));
  const target = join(root, 'src/data/chatgpt-activity.json');
  const statePath = join(root, 'state.json');
  mkdirSync(join(root, 'src/data'), { recursive: true });
  const initial = { source: 'codex-app-server', summary: { lifetimeTokens: 1 }, daily: [] };
  const changed = { ...initial, summary: { lifetimeTokens: 2 } };
  writeFileSync(target, JSON.stringify(initial));
  // An earlier successful scheduled check must not suppress a forced-run failure's retry.
  writeFileSync(statePath, JSON.stringify({ completed_day: '2026-10-29', last_checked_at: clock().toISOString(), published: false, last_result: 'succeeded' }));
  const logs = [];
  let remoteContains = false, pushCount = 0;
  const execute = (file, args) => {
    if (file !== 'git') {
      if (args.at(-1).endsWith('sync.ts')) writeFileSync(target, JSON.stringify(changed));
      return '';
    }
    if (args[0] === 'remote') return 'https://github.com/hilt21/aboutMe.git';
    if (args[0] === 'branch') return args[1] === '--show-current' ? 'main' : remoteContains ? 'origin/main' : '';
    if (args[0] === 'rev-list') return '0';
    if (args[0] === 'rev-parse') return 'snapshot-commit';
    if (args[0] === 'push') {
      pushCount++; remoteContains = true;
      throw Object.assign(new Error('SECRET stderr must never appear'), { code: 'ETIMEDOUT', status: null });
    }
    return '';
  };
  const options = { root, execute, now: clock, output: text => logs.push(JSON.parse(text)) };
  try {
    assert.throws(() => runDaily(statePath, true, options), /git push failed/);
    let saved = JSON.parse(readFileSync(statePath));
    assert.equal(saved.pending_publication.commit, 'snapshot-commit');
    assert.equal(saved.completed_day, '2026-10-29');
    assert.equal(saved.published_today, null);
    assert.equal(existsSync(statePath + '.lock'), false);
    runDaily(statePath, false, options);
    saved = JSON.parse(readFileSync(statePath));
    assert.equal(saved.completed_day, '2026-10-29');
    assert.equal(saved.retry_result, 'succeeded');
    assert.equal(saved.published_this_run, false);
    assert.equal(saved.published_today, true);
    assert.equal(saved.pending_publication, undefined);
    assert.equal(pushCount, 1);
    assert.equal(logs.some(l => l.stage === 'git_push' && l.failure_kind === 'timeout'), true);
    assert.equal(JSON.stringify(logs).includes('SECRET'), false);
    runDaily(statePath, false, options);
    assert.equal(logs.at(-1).event, 'already_completed');
    assert.equal(logs.at(-1).published_this_run, false);
    assert.equal(logs.at(-1).published_today, true);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('structured logs include Beijing time, stage, run identity and per-run/day distinction', () => {
  const state = {};
  let { audit, logs } = makeAudit(state);
  audit.begin('2026-10-29');
  audit.stage('git_push'); audit.beforePush('abc'); audit.pushed(); audit.finish('succeeded');
  assert.equal(state.published_this_run, true);
  assert.equal(state.published_today, true);
  assert.equal(logs.at(-1).time_beijing, '2026-10-29T21:00:00.123+08:00');
  assert.equal(logs.at(-1).stage, 'git_push');
  assert.equal(new Set(logs.map(l => l.run_id)).size, 1);
  ({ audit, logs } = makeAudit(state));
  audit.begin('2026-10-29'); audit.emit('statistics_unchanged'); audit.finish('succeeded');
  assert.equal(state.published_this_run, false);
  assert.equal(state.published_today, true);
  assert.equal(logs.at(-1).published_this_run, false);
  assert.equal(logs.at(-1).published_today, true);
});

test('timed-out push is durable and confirmed on retry without falsely claiming another push', () => {
  const state = {};
  let { audit } = makeAudit(state);
  audit.begin('2026-10-29'); audit.stage('git_push'); audit.beforePush('accepted-remotely'); audit.finish('failed');
  assert.equal(state.pending_publication.commit, 'accepted-remotely');
  assert.equal(state.published_today, null);
  assert.equal(state.retry_result, 'pending');
  const reloaded = JSON.parse(JSON.stringify(state));
  const next = makeAudit(reloaded); audit = next.audit;
  audit.begin('2026-10-29'); audit.pushed(true); audit.finish('succeeded');
  assert.equal(reloaded.attempt_number, 2);
  assert.equal(reloaded.retry_result, 'succeeded');
  assert.equal(reloaded.published_this_run, false);
  assert.equal(reloaded.published_today, true);
  assert.equal(reloaded.pending_publication, undefined);
  assert.equal(next.logs.some(l => l.event === 'previous_push_confirmed_remote'), true);
});

test('failed retry remains failed; later successful retry records a new actual push', () => {
  const state = {};
  let { audit } = makeAudit(state);
  audit.begin('2026-10-29'); audit.finish('failed');
  ({ audit } = makeAudit(state));
  audit.begin('2026-10-29'); audit.finish('failed');
  assert.equal(state.retry_result, 'failed');
  ({ audit } = makeAudit(state));
  audit.begin('2026-10-29'); audit.beforePush('abc'); audit.pushed(); audit.finish('succeeded');
  assert.equal(state.attempt_number, 3);
  assert.equal(state.published_this_run, true);
  assert.equal(state.published_today, true);
  assert.equal(state.retry_result, 'succeeded');
});

test('legacy false stays unknown; positive legacy state migrates without inventing history', () => {
  const noProof = { last_checked_at: clock().toISOString(), published: false };
  makeAudit(noProof);
  assert.equal(noProof.published_today, null);
  assert.equal('published' in noProof, false);
  const proven = { last_checked_at: clock().toISOString(), published: true };
  makeAudit(proven);
  assert.equal(proven.published_today, true);
});

test('civil midnight resets the day, and ambiguous cross-midnight confirmation stays unknown', () => {
  let date = new Date('2026-10-29T15:59:59Z');
  const now = () => date;
  const state = {};
  const { audit, logs } = makeAudit(state, now);
  audit.begin('2026-10-29'); audit.beforePush('abc'); audit.finish('failed');
  date = new Date('2026-10-29T16:00:01Z');
  const retry = makeAudit(state, now).audit;
  retry.begin('2026-10-29'); retry.pushed(true); retry.finish('succeeded');
  assert.equal(state.publication_day, '2026-10-30');
  assert.equal(state.published_today, null);
  assert.equal(state.published_this_run, false);
  assert.equal(beijingTime(date), '2026-10-30T00:00:01.000+08:00');
  date = new Date('2026-10-30T16:00:01Z');
  audit.emit('already_completed');
  assert.equal(logs.at(-1).published_today, false);
  assert.equal(state.publication_day, '2026-10-31');
});

test('21:00 Shanghai boundary and wake-up catch-up across month/year boundaries', () => {
  assert.equal(scheduledDay(new Date('2026-10-27T12:59:59Z')), '2026-10-26');
  assert.equal(scheduledDay(new Date('2026-10-27T13:00:00Z')), '2026-10-27');
  assert.equal(scheduledDay(new Date('2026-10-28T01:00:00Z')), '2026-10-27');
  assert.equal(scheduledDay(new Date('2027-01-01T01:00:00Z')), '2026-12-31');
});

test('publication compares actual statistics, preserves missing versus zero, ignores collection timestamps', () => {
  const a = { source: 'codex-app-server', summary: { lifetimeTokens: 100 }, daily: [{ date: '2026-10-26', value: null, observed_at: 'old' }], last_synced_at: 'old' };
  const b = structuredClone(a);
  b.last_synced_at = 'new'; b.daily[0].observed_at = 'new'; b.stats_as_of = 'new';
  assert.equal(statistics(a), statistics(b));
  b.daily[0].value = 0;
  assert.notEqual(statistics(a), statistics(b));
  b.daily[0].value = null; b.summary.lifetimeTokens++;
  assert.notEqual(statistics(a), statistics(b));
});
