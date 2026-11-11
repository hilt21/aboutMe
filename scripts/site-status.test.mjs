import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSiteStatus} from '../src/lib/site-status.mjs';
const sources={
  sourceCommit:'a'.repeat(40),
  builtAt:'2026-11-11T00:00:00Z',
  github:{status:'stale',updatedAt:'2026-11-09T00:00:00Z',lastAttemptAt:'2026-11-11T00:00:00Z',error:'private'},
  projects:{status:'ok',updatedAt:'2026-11-11T00:00:00Z',lastAttemptAt:'2026-11-11T00:00:00Z',items:[{secret:'private'}]},
  codex:{last_synced_at:'2026-11-10T00:00:00Z',daily:[{date:'2026-11-09',value:20}],summary:{lifetimeTokens:1234}},
  siteInsights:{status:'ok',updatedAt:'2026-11-11T00:00:00Z',lastAttemptAt:'2026-11-11T00:00:00Z',
    period:{from:'2026-10-10',to:'2026-11-10'},
    coverage:{expectedDays:18,knownDays:17,missingDays:1,complete:false},
    daily:[{date:'2026-11-10',visits:1}],error:'private'},
};

test('build status exposes source, snapshot timestamps and coverage without raw data',()=>{
 const m=createSiteStatus(sources);
 assert.equal(m.artifact,'static-build');
 assert.equal(m.sourceCommit,'a'.repeat(40));
 assert.equal(m.sources.github.status,'stale');
 assert.equal(m.sources.codex.latestObservedDate,'2026-11-09');
 assert.deepEqual(m.sources.siteInsights.coverage,{expectedDays:18,knownDays:17,missingDays:1,complete:false});
 const publicText=JSON.stringify(m);
 assert.doesNotMatch(publicText,/private|1234|lifetimeTokens|secret/);
});
test('provenance rejects false commit identifiers and invalid time',()=>{
 assert.throws(()=>createSiteStatus({...sources,sourceCommit:'main'}),/Invalid source commit/);
 assert.throws(()=>createSiteStatus({...sources,builtAt:'bad'}),/Invalid build timestamp/);
 assert.equal(createSiteStatus({...sources,sourceCommit:null}).sourceCommit,null);
});
