import {test} from 'node:test';import assert from 'node:assert/strict';import {failedSnapshot,parseCalendar} from './github-core.mjs';
test('API outage keeps last valid content and timestamp',()=>{const p={updatedAt:'2026-10-20T00:00:00Z',calendar:[{date:'2026-10-20',count:7}]};const r=failedSnapshot(p,'HTTP 403','2026-10-21T00:00:00Z');assert.equal(r.updatedAt,p.updatedAt);assert.deepEqual(r.calendar,p.calendar);assert.equal(r.status,'stale')});
test('Markup drift fails closed instead of manufacturing zeros',()=>assert.throws(()=>parseCalendar('<html>unavailable</html>')));
