import {readFile} from 'node:fs/promises';import {z} from 'zod';
const s=JSON.parse(await readFile(new URL('../src/data/github.json',import.meta.url)));
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
z.object({schemaVersion:z.literal(1),source:z.literal('github-public'),updatedAt:z.string().datetime().nullable(),status:z.enum(['ok','stale','unavailable']),calendar:z.array(z.object({date,count:z.number().int().nonnegative(),level:z.number().int().min(0).max(4)}))}).parse(s);
if(new Set(s.calendar.map(d=>d.date)).size!==s.calendar.length)throw Error('Duplicate calendar dates');
console.log('Snapshot schema and unique dates: passed');
