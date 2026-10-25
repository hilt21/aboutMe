import { readFile, writeFile } from 'node:fs/promises';
import { collectSiteAnalytics } from './site-analytics-core.mjs';

const file = new URL('../src/data/site-analytics.json', import.meta.url);
const last = JSON.parse(await readFile(file, 'utf8'));
const now = new Date();
try {
  const next = await collectSiteAnalytics({
    token: process.env.CLOUDFLARE_ANALYTICS_TOKEN,
    accountTag: process.env.CLOUDFLARE_ACCOUNT_ID,
    siteTag: process.env.CLOUDFLARE_SITE_TAG,
    now
  });
  await writeFile(file, JSON.stringify(next, null, 2) + '\n');
  console.log('Site Insights refreshed: ' + next.period.to + ', ' + next.totals.pageViews + ' PV');
} catch (error) {
  // Keep the last verified counters. A failed refresh must never be displayed as zero traffic.
  const next = {
    ...last,
    status: last.updatedAt ? 'stale' : 'unavailable',
    lastAttemptAt: now.toISOString(),
    error: 'refresh-failed'
  };
  await writeFile(file, JSON.stringify(next, null, 2) + '\n');
  console.error('Site Insights refresh failed: ' + String(error.message).slice(0, 160));
  process.exitCode = 1;
}
