import test from 'node:test';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {activitySchema,adaptOfficial,adaptAnalytics,mergeActivity,emptyActivity,calendar,windowDates} from '../src/lib/chatgpt-activity.ts';
import {atomicSnapshot,syncActivity} from './activity/sync.ts';
import {readAccountUsage} from './activity/app-server.ts';
const now='2026-10-26T11:00:00.000Z';
const official=(date='2026-10-25',tokens=12)=>adaptOfficial({summary:{currentStreakDays:0},dailyUsageBuckets:[{startDate:date,tokens}]},now);
test('nullable metrics and missing buckets remain unknown, real zero remains zero',()=>{
 const s=adaptOfficial({summary:{},dailyUsageBuckets:null},now);
 assert.equal(s.summary.lifetimeTokens,null);assert.equal(calendar(s,'2026-10-26').length,365);assert.ok(calendar(s,'2026-10-26').every(d=>d.value===null));
 assert.equal(calendar(official('2026-10-26',0),'2026-10-26').at(-1).value,0);
});
test('strict civil dates, leap-year and history window, source date labels never re-binned',()=>{
 assert.equal(windowDates('2024-03-01').length,365);assert.ok(windowDates('2024-03-01').includes('2024-02-29'));
 assert.throws(()=>official('2026-02-30'));assert.throws(()=>official('2026-10-25',2**53));assert.throws(()=>official('2026-10-25',-1));
 const s=mergeActivity(emptyActivity(),official('2025-10-26'),'2026-10-26');assert.equal(s.daily.length,0);
 assert.equal(calendar(official(),'2026-10-26').at(-2).date,'2026-10-25');
});
test('idempotent repeated import, duplicate conflict rejection and late correction',()=>{
 const s=official(); const merged=mergeActivity(emptyActivity(),s,'2026-10-26');
 assert.deepEqual(mergeActivity(merged,s,'2026-10-26'),merged);
 assert.throws(()=>adaptOfficial({summary:{},dailyUsageBuckets:[{startDate:'2026-10-25',tokens:1},{startDate:'2026-10-25',tokens:2}]},now));
 const newer=adaptOfficial({summary:{},dailyUsageBuckets:[{startDate:'2026-10-25',tokens:15}]},'2026-10-27T00:00:00.000Z');
 assert.equal(mergeActivity(s,newer,'2026-10-27').daily[0].value,15);
 assert.equal(mergeActivity(newer,s,'2026-10-27').daily[0].value,15);
 assert.equal(mergeActivity(newer,adaptOfficial({summary:{},dailyUsageBuckets:null},'2026-10-28T00:00:00.000Z'),'2026-10-28').daily.length,1);
});
test('white-list projection excludes credentials, text, identities and thread usage',()=>{
 const s=adaptOfficial({summary:{email:'private',lifetimeTokens:5},dailyUsageBuckets:null,accessToken:'secret',threadUsage:{text:'prompt'}},now);
 assert.doesNotMatch(JSON.stringify(s),/private|secret|prompt|accessToken|threadUsage/);
 assert.throws(()=>activitySchema.parse({...s,sessionToken:'secret'}));
});
test('opt-in devcxl and codex-meter aggregate formats, day grouping only, separate metric',()=>{
 const rows=[{date:'2026-10-25',totals:{turns:3,credits:8},clients:[{id:'private'}]}];
 assert.throws(()=>adaptAnalytics({capturedAt:now,group_by:'day',data:rows},now,false));
 const s=adaptAnalytics({capturedAt:now,group_by:'day',data:rows},now,true);
 assert.equal(s.last_synced_at,now);assert.equal(s.metric,'workspace-turns');assert.equal(s.daily[0].value,3);assert.doesNotMatch(JSON.stringify(s),/clients|credits|private/);
 assert.throws(()=>adaptAnalytics({capturedAt:now,group_by:'week',data:rows},now,true));
 assert.deepEqual(adaptAnalytics({capturedAt:now,dailyList:rows,pageUrl:'private'},now,true),s);
 assert.throws(()=>mergeActivity(official(),s,'2026-10-26'));
});
test('atomic publication, schema failure preserves previous bytes; import is repeatable and lock excludes overlap',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'activity-test-'));try{
 const path=join(dir,'snapshot.json');await atomicSnapshot(path,official());const before=await readFile(path,'utf8');
 await assert.rejects(atomicSnapshot(path,{invalid:true}));assert.equal(await readFile(path,'utf8'),before);
 const input=join(dir,'input.json');await writeFile(input,JSON.stringify({capturedAt:now,dailyList:[{date:'2026-10-25',totals:{turns:5}}]}));
 const target=join(dir,'analytics.json');const args=['--analytics','--allow-analytics','--input',input,'--output',target];
 await syncActivity(args);const first=await readFile(target,'utf8');await syncActivity(args);assert.deepEqual(JSON.parse(await readFile(target,'utf8')).daily,JSON.parse(first).daily);const latest=await readFile(target,'utf8');
 await writeFile(target+'.lock','');await assert.rejects(syncActivity(args));assert.equal(await readFile(target,'utf8'),latest);
 await assert.rejects(syncActivity(['--analytics','--input',input]));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('unavailable executable/authentication transport fails without publishing',async()=>{
 const old=process.env.PATH;process.env.PATH='/nonexistent';try{await assert.rejects(readAccountUsage(100),/unavailable|exited|transport/);}finally{process.env.PATH=old;}
});

test('timestamp precision does not let an older same-second import replace newer data',()=>{
 const old=adaptOfficial({summary:{},dailyUsageBuckets:[{startDate:'2026-10-25',tokens:10}]},'2026-10-26T11:00:00Z');
 const newer=adaptOfficial({summary:{},dailyUsageBuckets:[{startDate:'2026-10-25',tokens:20}]},'2026-10-26T11:00:00.500Z');
 assert.equal(mergeActivity(newer,old,'2026-10-26').daily[0].value,20);
 assert.equal(mergeActivity(old,newer,'2026-10-26').daily[0].value,20);
 assert.doesNotThrow(()=>adaptAnalytics({capturedAt:'2026-10-26T11:00:00Z',dailyList:[]},'2026-10-26T11:00:00.500Z',true));
});
test('JSON-RPC authentication rejection and timeout are bounded',async()=>{
 const rejectAuth=()=>spawn(process.execPath,['-e',`const r=require('readline').createInterface({input:process.stdin});r.on('line',l=>{const m=JSON.parse(l);if(m.id===1)console.log(JSON.stringify({id:1,result:{}}));if(m.id===2)console.log(JSON.stringify({id:2,error:{code:-32001,message:'private provider text'}}))});`],{stdio:['pipe','pipe','ignore']});
 await assert.rejects(readAccountUsage(1000,rejectAuth),e=>/authentication/.test(e.message)&&!e.message.includes('private'));
 const silence=()=>spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:['pipe','pipe','ignore']});
 await assert.rejects(readAccountUsage(50,silence),/timed out/);
});

test('undated Analytics aggregates cannot masquerade as current captured data',()=>{
 assert.throws(()=>adaptAnalytics({group_by:'day',data:[]},now,true));
 const rows=[{date:'2026-10-25',totals:{turns:3}}];
 const newer=adaptAnalytics({capturedAt:'2026-10-26T10:00:00Z',group_by:'day',data:rows},now,true);
 const older=adaptAnalytics({capturedAt:'2026-10-25T10:00:00Z',group_by:'day',data:[{date:'2026-10-25',totals:{turns:1}}]},now,true);
 assert.equal(mergeActivity(newer,older,'2026-10-26').daily[0].value,3);
});

test('authentication failure preserves existing public snapshot bytes and releases lock',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'activity-auth-'));try{
 const target=join(dir,'activity.json');await atomicSnapshot(target,official());const before=await readFile(target,'utf8');
 await assert.rejects(syncActivity(['--output',target],async()=>{throw new Error('Authentication rejected');}),/Authentication/);
 assert.equal(await readFile(target,'utf8'),before);await assert.rejects(readFile(target+'.lock'),{code:'ENOENT'});
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('capture date and successful local sync time retain separate meanings',()=>{
 const s=adaptAnalytics({capturedAt:'2026-10-20T10:00:00Z',group_by:'day',data:[{date:'2026-10-20',totals:{turns:3}}]},now,true);
 assert.equal(s.last_synced_at,now);assert.equal(s.daily[0].observed_at,'2026-10-20T10:00:00Z');
});
