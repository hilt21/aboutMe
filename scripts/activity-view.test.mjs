import test from 'node:test';
import assert from 'node:assert/strict';
import {activityCalendar, formatTokenBillions} from '../src/lib/activity-view.ts';

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
