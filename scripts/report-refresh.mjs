import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function refreshReport({ build, deploy, calendar, projects, analytics }) {
  const safe = value => ['success', 'failure', 'cancelled', 'skipped'].includes(value) ? value : 'unknown';
  const rows = [['Contributions collection', safe(calendar)], ['Project metadata collection', safe(projects)], ['Site Insights collection', safe(analytics)], ['Build', safe(build)], ['Pages deployment', safe(deploy)]];
  const collectionFailed = [calendar, projects, analytics].some(value => ['failure', 'cancelled'].includes(value));
  const collectionUnknown = build === 'success' && [calendar, projects, analytics].some(value => safe(value) === 'unknown');
  const deploymentSucceeded = deploy === 'success';
  const failed = collectionFailed || collectionUnknown || build !== 'success' || !deploymentSucceeded;
  const messages = [];
  if (collectionFailed) messages.push('Collection failed: retained snapshots may have been deployed. Check the collector logs; this does not mean Pages deployment failed.');
  if (collectionUnknown) messages.push('Collection outcome is unknown; inspect the collector steps. Do not assume fresh data from a successful deployment.');
  if (build !== 'success') messages.push('Build did not complete successfully; a new deployment is not confirmed.');
  if (!deploymentSucceeded) messages.push('Pages deployment did not succeed; inspect the deploy/build jobs separately from collection.');
  const summary = ['## Collection and deployment results', '', '| Stage | Result |', '| --- | --- |', ...rows.map(([stage, result]) => `| ${stage} | ${result} |`), '', deploymentSucceeded ? 'Pages deployment succeeded.' : 'Pages deployment is not confirmed successful.', ...messages, ''].join('\n');
  return { failed, summary, messages };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = refreshReport({ build: process.env.BUILD_RESULT, deploy: process.env.DEPLOY_RESULT, calendar: process.env.CALENDAR_OUTCOME, projects: process.env.PROJECTS_OUTCOME, analytics: process.env.ANALYTICS_OUTCOME });
  console.log(result.summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, result.summary);
  for (const message of result.messages) console.error(`::error title=Refresh outcome::${message}`);
  if (result.failed) process.exitCode = 1;
}
