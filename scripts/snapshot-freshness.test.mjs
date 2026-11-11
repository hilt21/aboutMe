import {test} from 'node:test';
import assert from 'node:assert/strict';
import {snapshotOverdue} from '../src/lib/snapshot-freshness.ts';
const now=Date.parse('2026-11-11T00:00:00Z');
const day=24*60*60*1000;

test('freshness boundary is shared by Codex, GitHub and Site Insights',()=>{
  const updated=new Date(now-2*day).toISOString();
  assert.equal(snapshotOverdue(updated,2*day,'ok',now),false);
  assert.equal(snapshotOverdue(new Date(now-2*day-1).toISOString(),2*day,'ok',now),true);
  assert.equal(snapshotOverdue(updated,10*day,'ok',now),false);
});
test('invalid, missing and explicitly stale snapshots are overdue',()=>{
  for(const updated of [null,undefined,'','not-a-date'])
    assert.equal(snapshotOverdue(updated,2*day,'ok',now),true);
  assert.equal(snapshotOverdue(new Date(now).toISOString(),2*day,'stale',now),true);
  assert.equal(snapshotOverdue(new Date(now).toISOString(),2*day,'unavailable',now),true);
});
