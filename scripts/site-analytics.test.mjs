import test from 'node:test';
import assert from 'node:assert/strict';
import { collectSiteAnalytics, windowDates } from './site-analytics-core.mjs';

const fixedNow = new Date('2026-10-26T08:00:00.000Z');
function mockAPI(rowsForRange = () => []) {
  const calls = [];
  const fetchImpl = async (_url, init) => {
    const vars = JSON.parse(init.body).variables;
    calls.push(vars);
    return {
      ok: true,
      json: async () => ({ data: { viewer: { accounts: [{ rumPageloadEventsAdaptiveGroups: rowsForRange(vars) }] } } })
    };
  };
  return { fetchImpl, calls };
}
const group = (date, pv, visits, sampleInterval=1) => ({
  count: pv,
  sum: { visits },
  avg: { sampleInterval },
  dimensions: { date, requestHost: 'hilt21.github.io', requestPath: '/aboutMe/' }
});
const settings = { token: 'test-secret', accountTag: 'test-account', siteTag: 'test-site', now: fixedNow };

test('30 complete UTC days, 5 bounded queries, and exact site/path', async () => {
  const { fetchImpl, calls } = mockAPI(({ from, to }) => from <= '2026-10-24' && to >= '2026-10-24'
    ? [group('2026-10-24', 6, 5)] : []);
  const out = await collectSiteAnalytics({ ...settings, fetchImpl });
  assert.equal(out.period.from, '2026-09-26');
  assert.equal(out.period.to, '2026-10-25');
  assert.deepEqual(out.totals, { pageViews: 6, visits: 5 });
  assert.equal(out.daily.length, 30);
  assert.equal(out.daily.at(-1).pageViews, 0);
  assert.equal(out.sampled, false);
  assert.equal(calls.length, 5);
  for (const call of calls) {
    assert.equal(call.host, 'hilt21.github.io');
    assert.equal(call.path, '/aboutMe/');
    assert.ok(Date.parse(call.to) - Date.parse(call.from) <= 5 * 86400000);
  }
});

test('sampled counts are flagged without pretending they are exact', async () => {
  const { fetchImpl } = mockAPI(({ from, to }) => from <= '2026-10-25' && to >= '2026-10-25'
    ? [group('2026-10-25', 10, 10, 10)] : []);
  const out = await collectSiteAnalytics({ ...settings, fetchImpl });
  assert.equal(out.sampled, true);
  assert.equal(out.daily.at(-1).sampleInterval, 10);
});

test('rejects wrong host, date, missing sampling and GraphQL errors', async () => {
  for (const row of [
    { ...group('2026-10-24', 1, 1), dimensions: { date: '2026-10-24', requestHost: 'other.host', requestPath: '/aboutMe/' } },
    group('2026-11-24', 1, 1),
    { ...group('2026-10-24', 1, 1), avg: {} }
  ]) {
    const { fetchImpl } = mockAPI(() => [row]);
    await assert.rejects(collectSiteAnalytics({ ...settings, fetchImpl }));
  }
  await assert.rejects(collectSiteAnalytics({ ...settings, fetchImpl: async () => ({ ok: true, json: async () => ({ errors: [{ message: 'bad' }] }) }) }));
});

test('requires credentials and never treats unavailable data as zero', async () => {
  await assert.rejects(collectSiteAnalytics({ ...settings, token: '' }), /credentials/);
  await assert.rejects(collectSiteAnalytics({ ...settings, fetchImpl: async () => ({ ok: false, status: 403 }) }), /HTTP 403/);
});
