import test from 'node:test';
import assert from 'node:assert/strict';
import {windowDates,mergeHistory,buildSnapshot,refreshSiteAnalytics,collectDailyObservations} from './site-analytics-core.mjs';

const NOW=new Date('2026-11-02T13:00:00.000Z');
const base={schemaVersion:1,source:'cloudflare-web-analytics',host:'hilt21.github.io',
  path:'/aboutMe/',telemetryStartedAt:'2026-10-24',records:[
    {date:'2026-10-24',pageViews:6,visits:5,sampleInterval:1,state:'final',
      observedAt:'2026-10-26T12:00:00.000Z',origin:'archived-snapshot',evidenceCommit:'a'.repeat(40)},
    {date:'2026-10-26',pageViews:55,visits:52,sampleInterval:1,state:'final',
      observedAt:'2026-10-27T12:00:00.000Z',origin:'cloudflare-rum'},
    {date:'2026-10-31',pageViews:20,visits:11,sampleInterval:1,state:'provisional',
      observedAt:'2026-11-01T12:00:00.000Z',origin:'cloudflare-rum'}
  ]};
const sample=(date,pv,visits,interval=1)=>({date,pageViews:pv,visits,sampleInterval:interval});
const group=(date,pv,visits,interval=1)=>({
 count:pv,sum:{visits},avg:{sampleInterval:interval},
 dimensions:{date,requestHost:'hilt21.github.io',requestPath:'/aboutMe/'}
});
const setup=(byDay=()=>[])=>{
  const calls=[];
  const fetchImpl=async(_url,init)=>{
    const day=JSON.parse(init.body).variables.day;
    calls.push({day,variables:JSON.parse(init.body).variables});
    return {ok:true,json:async()=>({data:{viewer:{accounts:[{rumPageloadEventsAdaptiveGroups:byDay(day)}]}}})};
  };
  return {fetchImpl,calls};
};
const opts={history:base,token:'test-token',accountTag:'account',siteTag:'site',now:NOW};

test('preserves finalized unsampled history when Cloudflare returns samples or nothing',()=>{
 const next=mergeHistory(base,[sample('2026-10-26',30,30,10),sample('2026-10-30',10,10,10)],NOW);
 assert.equal(next.records.find(x=>x.date==='2026-10-26').pageViews,55);
 assert.equal(next.records.some(x=>x.date==='2026-10-30'),false);
 assert.equal(next.records[0].pageViews,6);
});
test('revises only recent unsampled days and automatically finalizes older provisional days',()=>{
 const next=mergeHistory(base,[sample('2026-10-31',23,13),sample('2026-11-01',10,4)],NOW);
 assert.equal(next.records.find(x=>x.date==='2026-10-31').pageViews,23);
 assert.equal(next.records.find(x=>x.date==='2026-11-01').state,'provisional');
 const later=mergeHistory(next,[],new Date('2026-11-06T13:00:00Z'));
 assert.equal(later.records.find(x=>x.date==='2026-10-31').state,'final');
 assert.equal(later.records.find(x=>x.date==='2026-11-01').state,'final');
 const repeated=mergeHistory(later,[],new Date('2026-11-07T13:00:00Z'));
 assert.deepEqual(later.records,repeated.records);
});
test('out-of-scope dates, duplicates and wrong host are rejected',()=>{
 assert.throws(()=>mergeHistory(base,[sample('2026-11-02',1,1)],NOW));
 assert.throws(()=>mergeHistory(base,[sample('2026-10-31',1,1),sample('2026-10-31',2,2)],NOW));
});
test('outside-telemetry periods and missing days remain unknown, never zero',()=>{
 const view=buildSnapshot(base,NOW);
 assert.equal(view.period.from,'2026-10-03');
 assert.equal(view.coverage.from,'2026-10-24');
 assert.equal(view.coverage.expectedDays,9);
 assert.equal(view.coverage.knownDays,3);
 assert.equal(view.coverage.missingDays,6);
 assert.deepEqual(view.totals,{pageViews:81,visits:68});
 assert.equal(view.daily[0].state,'outside');
 assert.equal(view.daily[0].pageViews,null);
 assert.equal(view.daily.find(x=>x.date==='2026-10-25').state,'missing');
 assert.equal(view.sampled,false);
});
test('only 7 complete UTC dates queried individually, no leakage across GitHub Pages projects',async()=>{
 const {fetchImpl,calls}=setup(day=>day==='2026-11-01'?[group(day,10,4)]:[]);
 const result=await refreshSiteAnalytics({...opts,fetchImpl});
 assert.equal(calls.length,7);
 assert.equal(calls[0].day,'2026-10-26');
 assert.equal(calls.at(-1).day,'2026-11-01');
 assert.ok(calls.every(x=>x.variables.host==='hilt21.github.io'&&x.variables.path==='/aboutMe/'));
 assert.equal(result.history.records.find(x=>x.date==='2026-10-26').pageViews,55);
 assert.equal(result.history.records.find(x=>x.date==='2026-11-01').pageViews,10);
 assert.equal(result.snapshot.sampled,false);
});
test('sampled daily API reply is excluded; no row is missing, never an observed zero',async()=>{
 const {fetchImpl}=setup(day=>day==='2026-11-01'?[group(day,30,30,10)]:[]);
 const result=await refreshSiteAnalytics({...opts,fetchImpl});
 assert.equal(result.snapshot.daily.at(-1).state,'missing');
 assert.equal(result.snapshot.daily.at(-1).pageViews,null);
});
test('query failure, cross-site response or invalid sampling rejects whole batch',async()=>{
 const bad=setup(()=>[group('2026-10-26',2,1)]);
 await assert.rejects(collectDailyObservations({...opts,fetchImpl:bad.fetchImpl}),/Untrusted/);
 const wrong=setup(day=>[{...group(day,2,1),dimensions:{date:day,requestHost:'other.github.io',requestPath:'/aboutMe/'}}]);
 await assert.rejects(collectDailyObservations({...opts,fetchImpl:wrong.fetchImpl}),/Untrusted/);
 const fail=async()=>({ok:false,status:403});
 await assert.rejects(refreshSiteAnalytics({...opts,fetchImpl:fail}),/403/);
});
