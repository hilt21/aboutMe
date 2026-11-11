import {readFile,writeFile} from 'node:fs/promises';
import {createSiteStatus} from '../src/lib/site-status.mjs';
const data = async name => JSON.parse(await readFile(new URL(`../src/data/${name}.json`,import.meta.url),'utf8'));
const manifest = createSiteStatus({
  sourceCommit: process.env.SITE_SOURCE_SHA || null,
  builtAt: new Date().toISOString(),
  github: await data('github'),
  projects: await data('projects'),
  codex: await data('chatgpt-activity'),
  siteInsights: await data('site-analytics'),
});
await writeFile(new URL('../dist/site-status.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
console.log('Build provenance: '+(manifest.sourceCommit ?? 'local/unspecified'));
