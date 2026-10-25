import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const day = z.object({
  date,
  pageViews: z.number().int().nonnegative(),
  visits: z.number().int().nonnegative(),
  sampleInterval: z.number().min(1)
});
const snapshot = z.object({
  schemaVersion: z.literal(1),
  source: z.literal('cloudflare-web-analytics'),
  status: z.enum(['ok', 'stale', 'unavailable']),
  updatedAt: z.string().datetime().nullable(),
  lastAttemptAt: z.string().datetime(),
  error: z.string().nullable(),
  host: z.literal('hilt21.github.io'),
  path: z.literal('/aboutMe/'),
  period: z.object({ from: date, to: date, timeZone: z.literal('UTC') }),
  totals: z.object({ pageViews: z.number().int().nonnegative(), visits: z.number().int().nonnegative() }).nullable(),
  sampled: z.boolean(),
  daily: z.array(day).length(30)
});
const data = snapshot.parse(JSON.parse(await readFile(new URL('../src/data/site-analytics.json', import.meta.url))));
const dates = data.daily.map(d => d.date);
if (new Set(dates).size !== 30 || dates[0] !== data.period.from || dates.at(-1) !== data.period.to ||
  dates.some((d, i) => i > 0 && Date.parse(d) - Date.parse(dates[i - 1]) !== 86400000)) {
  throw new Error('Invalid Site Insights date window');
}
if (data.totals && (data.daily.reduce((s,d) => s + d.pageViews, 0) !== data.totals.pageViews ||
  data.daily.reduce((s,d) => s + d.visits, 0) !== data.totals.visits)) {
  throw new Error('Site Insights totals do not match daily data');
}
if (data.sampled !== data.daily.some(d => d.sampleInterval > 1)) throw new Error('Site Insights sampling flag does not match');
console.log('Site Insights snapshot validation: passed');
