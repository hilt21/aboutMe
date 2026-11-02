import {readFile,writeFile} from 'node:fs/promises';
import {refreshSiteAnalytics} from './site-analytics-core.mjs';

const historyPath=new URL('../src/data/site-analytics-history.json',import.meta.url);
const snapshotPath=new URL('../src/data/site-analytics.json',import.meta.url);
const history=JSON.parse(await readFile(historyPath,'utf8'));
const previous=JSON.parse(await readFile(snapshotPath,'utf8'));
const now=new Date();
try {
  const result=await refreshSiteAnalytics({
    history,token:process.env.CLOUDFLARE_ANALYTICS_TOKEN,
    accountTag:process.env.CLOUDFLARE_ACCOUNT_ID,
    siteTag:process.env.CLOUDFLARE_SITE_TAG,now
  });
  // Persist the canonical immutable history first, then derive the published 30-day view.
  await writeFile(historyPath,JSON.stringify(result.history,null,2)+'\n');
  await writeFile(snapshotPath,JSON.stringify(result.snapshot,null,2)+'\n');
  console.log('Site Insights updated: '+result.snapshot.period.to+
    ', '+result.snapshot.totals?.pageViews+' PV, '+result.snapshot.totals?.visits+
    ' visits, '+result.snapshot.coverage.knownDays+'/'+result.snapshot.coverage.expectedDays+
    ' known days, '+result.observations.length+' daily responses');
} catch (error) {
  // Errors do not alter the verified daily history or publish fabricated zeroes.
  await writeFile(snapshotPath,JSON.stringify({...previous,status:'stale',
    lastAttemptAt:now.toISOString(),error:'refresh-failed'},null,2)+'\n');
  console.error('Site Insights refresh failed: '+String(error.message).slice(0,160));
  process.exitCode=1;
}
