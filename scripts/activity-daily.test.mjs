import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduledDay, statistics } from './activity/daily.mjs';

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
