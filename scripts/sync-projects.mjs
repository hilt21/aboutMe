import { readFile, writeFile, rename } from 'node:fs/promises';
import { refreshProjects } from './projects-core.mjs';

const path = new URL('../src/data/projects.json', import.meta.url);
const profile = JSON.parse(await readFile(new URL('../src/data/profile.json', import.meta.url), 'utf8'));
let previous = { schemaVersion: 1, updatedAt: null, lastAttemptAt: null, status: 'unavailable', error: null, items: [] };
try { previous = JSON.parse(await readFile(path, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const { snapshot, failed } = await refreshProjects(profile.projects, previous);
await writeFile(new URL('projects.json.tmp', path), JSON.stringify(snapshot, null, 2) + '\n');
await rename(new URL('projects.json.tmp', path), path);
if (failed) {
  console.error('::warning title=Project metadata collection failed::Retained previous snapshot; inspect project_collection events for safe failure category, HTTP status and retry result. Deployment outcome is reported separately.');
  process.exitCode = 1;
}
console.log(JSON.stringify({ stage: 'project_collection', status: snapshot.status, projects: snapshot.items.length, updatedAt: snapshot.updatedAt }));
