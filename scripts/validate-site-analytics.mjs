import {readFile} from 'node:fs/promises';
import {z} from 'zod';
import {assertHistory,buildSnapshot} from './site-analytics-core.mjs';

const iso=z.string().datetime();
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const day=z.object({
  date,pageViews:z.number().int().nonnegative().nullable(),
  visits:z.number().int().nonnegative().nullable(),
  sampleInterval:z.literal(1).nullable(),
  state:z.enum(['final','provisional','outside','missing'])
});
const snapshotSchema=z.object({
  schemaVersion:z.literal(2),
  source:z.literal('cloudflare-web-analytics'),
  status:z.enum(['ok','stale','unavailable']),
  updatedAt:iso,lastAttemptAt:iso,
  error:z.string().nullable(),
  host:z.literal('hilt21.github.io'),path:z.literal('/aboutMe/'),
  period:z.object({from:date,to:date,timeZone:z.literal('UTC')}),
  totals:z.object({pageViews:z.number().int().nonnegative(),visits:z.number().int().nonnegative()}).nullable(),
  coverage:z.object({
    from:date.nullable(),expectedDays:z.number().int().nonnegative(),
    knownDays:z.number().int().nonnegative(),missingDays:z.number().int().nonnegative(),complete:z.boolean()
  }),
  sampled:z.literal(false),daily:z.array(day).length(30)
});
const history=assertHistory(JSON.parse(await readFile(new URL('../src/data/site-analytics-history.json',import.meta.url))));
const current=snapshotSchema.parse(JSON.parse(await readFile(new URL('../src/data/site-analytics.json',import.meta.url))));
const expected=buildSnapshot(history,new Date(current.updatedAt));
for(const field of ['period','totals','coverage','sampled','daily']){
  if (JSON.stringify(current[field])!==JSON.stringify(expected[field]))
    throw new Error('Site Insights '+field+' diverges from immutable daily history');
}
if (current.coverage.knownDays+current.coverage.missingDays!==current.coverage.expectedDays)
  throw new Error('Invalid traffic coverage accounting');
console.log('Site Insights verified history and rolling snapshot: passed');
