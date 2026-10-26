import test from 'node:test';
import assert from 'node:assert/strict';
import {activityCalendar, activityTrend} from '../src/lib/activity-view.ts';

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
test('trend breaks both line and area across missing observations, retains zero and isolated points',()=>{
 const days=[3,null,0,6,null,2,null].map((value,i)=>({date:`2026-10-${20+i}`,value,level:value===null?null:1}));
 const trend=activityTrend(days);
 assert.deepEqual(trend.map(s=>s.points.map(p=>p.value)),[[3],[0,6],[2]]);
 assert.equal(trend[1].points[0].y,94);assert.equal(trend[1].points[1].y,10);
 assert.ok(trend.every(s=>!s.line.includes('NaN')&&!s.area.includes('NaN')));
 assert.deepEqual(activityTrend(days.map(d=>({...d,value:null}))),[]);
});
