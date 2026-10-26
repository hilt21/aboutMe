import {readFile} from 'node:fs/promises';
import {activitySchema} from '../../src/lib/chatgpt-activity.ts';
for(const name of ['chatgpt-activity','chatgpt-analytics']) activitySchema.parse(JSON.parse(await readFile(new URL(`../../src/data/${name}.json`,import.meta.url),'utf8')));
console.log('Activity snapshots valid');
