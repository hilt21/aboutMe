import test from 'node:test';
import assert from 'node:assert/strict';
import {activityCalendar, formatTokenBillions, calendarDayTitle} from '../src/lib/activity-view.ts';

test('half-year view contains 183 dates including today, clips old/future observations and preserves zero vs unknown',()=>{
 const input=[
  {date:'2026-04-26',value:99,level:4},
  {date:'2026-04-27',value:7,level:1},
  {date:'2026-10-25',value:0,level:0},
  {date:'2026-10-27',value:100,level:4}
 ];
 const days=activityCalendar(input,'2026-10-26');
 assert.equal(days.length,183);assert.equal(days[0].date,'2026-04-27');assert.equal(days.at(-1).date,'2026-10-26');
 assert.equal(days[0].value,7);assert.equal(days.at(-2).value,0);assert.equal(days.at(-1).value,null);
 assert.equal(input.length,4);assert.ok(!days.some(d=>d.value===99||d.value===100));
});
test('half-year calendar retains leap day across civil-date boundaries',()=>{
 const days=activityCalendar([],'2024-03-01');assert.equal(days.length,183);assert.equal(days.at(-2).date,'2024-02-29');
});
test('Token summaries use billions with one decimal, retaining unknown values',()=>{
 assert.equal(formatTokenBillions(7212512179),'7.2B');
 assert.equal(formatTokenBillions(425231411),'0.4B');
 assert.equal(formatTokenBillions(1_250_000_000),'1.3B');
 assert.equal(formatTokenBillions(0),'0.0B');
 assert.equal(formatTokenBillions(null),'—');
});

test('late daily buckets backfill actual values while omitted and current dates remain unprovided', () => {
 const before = activityCalendar([], '2026-11-03');
 const after = activityCalendar([{ date: '2026-11-02', value: 124585128, level: 4 }], '2026-11-03');
 const row = date => after.find(day => day.date === date);
 assert.equal(before.find(day => day.date === '2026-11-02').value, null);
 assert.equal(row('2026-11-02').value, 124585128);
 assert.equal(calendarDayTitle(row('2026-11-02'), 'tokens', 'en', '2026-11-03'), '2026-11-02: 124,585,128 tokens');
 assert.equal(row('2026-11-01').value, null);
 assert.equal(row('2026-11-03').value, null);
 assert.match(calendarDayTitle(row('2026-11-01'), 'tokens', 'en', '2026-11-03'), /Daily tokens not provided by source/);
 assert.match(calendarDayTitle(row('2026-11-03'), 'tokens', 'en', '2026-11-03'), /not yet provided/);
 assert.match(calendarDayTitle(row('2026-11-03'), 'tokens', 'zh', '2026-11-03'), /来源尚未提供/);
 // A static page may be viewed days later; its build-time end must not claim to be today.
 assert.doesNotMatch(calendarDayTitle(row('2026-11-03'), 'tokens', 'en', '2026-11-03'), /Today/);
 assert.doesNotMatch(calendarDayTitle(row('2026-11-03'), 'tokens', 'zh', '2026-11-03'), /今日/);
 assert.equal(calendarDayTitle({ date: '2026-11-01', value: 0, level: 0 }, 'tokens', 'en', '2026-11-03'), '2026-11-01: 0 tokens');
 assert.equal(calendarDayTitle(row('2026-11-01'), 'contributions', 'en', '2026-11-03'), '2026-11-01: Unknown');
});
