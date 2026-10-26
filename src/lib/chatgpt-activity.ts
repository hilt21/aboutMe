import { z } from 'zod';

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const activityDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const n = Date.parse(v + 'T00:00:00Z');
  return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === v;
});
const time = z.string().datetime();
const metric = count.nullable().default(null);
export const summarySchema = z.object({
  lifetimeTokens: metric, peakDailyTokens: metric, longestRunningTurnSec: metric,
  currentStreakDays: metric, longestStreakDays: metric
});
export const officialUsageSchema = z.object({
  summary: summarySchema,
  dailyUsageBuckets: z.array(z.object({ startDate: activityDate, tokens: count })).nullable()
});
const source = z.enum(['codex-app-server', 'usage-analytics-import']);
const observation = z.object({date: activityDate, value: count, observed_at: time}).strict();
export const activitySchema = z.object({
  schema_version: z.literal(1), source,
  metric: z.enum(['tokens', 'workspace-turns']),
  source_timezone: z.string().nullable().refine(v => {
    if (v === null) return true;
    try { new Intl.DateTimeFormat('en', {timeZone:v}); return true; } catch { return false; }
  }),
  stats_as_of: time.nullable(), last_synced_at: time.nullable(),
  summary: summarySchema, daily: z.array(observation),
}).strict().superRefine((s, ctx) => {
  if (new Set(s.daily.map(d => d.date)).size !== s.daily.length) ctx.addIssue({code:'custom',message:'Duplicate dates'});
  if (s.source === 'codex-app-server' && s.metric !== 'tokens' || s.source === 'usage-analytics-import' && s.metric !== 'workspace-turns') ctx.addIssue({code:'custom',message:'Source/metric mismatch'});
  if (s.daily.some(d => !s.last_synced_at || Date.parse(d.observed_at) > Date.parse(s.last_synced_at))) ctx.addIssue({code:'custom',message:'Observation after sync'});
});
export type ActivitySnapshot = z.infer<typeof activitySchema>;
export function windowDates(end: string, size = 365): string[] {
  activityDate.parse(end);
  return Array.from({length:size}, (_,i) => new Date(Date.parse(end+'T00:00:00Z')-(size-1-i)*86400000).toISOString().slice(0,10));
}
export function calendar(s: ActivitySnapshot, end: string) {
  const map = new Map(s.daily.map(d => [d.date,d]));
  return windowDates(end).map(date => ({date, value:map.get(date)?.value ?? null}));
}
export function emptyActivity(kind: 'tokens' | 'workspace-turns' = 'tokens'): ActivitySnapshot {
  return {schema_version:1,source:kind==='tokens'?'codex-app-server':'usage-analytics-import',metric:kind,source_timezone:null,stats_as_of:null,last_synced_at:null,summary:summarySchema.parse({}),daily:[]};
}
// Dates are source labels. Never re-bin a daily aggregate into another time zone.
export function mergeActivity(previous: ActivitySnapshot, incoming: ActivitySnapshot, end: string): ActivitySnapshot {
  activitySchema.parse(previous); activitySchema.parse(incoming);
  if (previous.source !== incoming.source || previous.metric !== incoming.metric || previous.source_timezone !== incoming.source_timezone) throw new Error('Incompatible activity series');
  const rows = new Map(previous.daily.map(d => [d.date,d]));
  for (const row of incoming.daily) {
    const old = rows.get(row.date);
    if (!old || Date.parse(row.observed_at) >= Date.parse(old.observed_at)) rows.set(row.date,row);
  }
  const window = new Set(windowDates(end));
  const latest = (incoming.last_synced_at ? Date.parse(incoming.last_synced_at) : -Infinity) >= (previous.last_synced_at ? Date.parse(previous.last_synced_at) : -Infinity) ? incoming : previous;
  return activitySchema.parse({...latest,daily:[...rows.values()].filter(d=>window.has(d.date)).sort((a,b)=>a.date.localeCompare(b.date))});
}
export function adaptOfficial(input: unknown, observedAt: string): ActivitySnapshot {
  time.parse(observedAt);
  const usage = officialUsageSchema.parse(input);
  const dates = new Map<string,number>();
  for (const d of usage.dailyUsageBuckets ?? []) {
    if (dates.has(d.startDate) && dates.get(d.startDate)!==d.tokens) throw new Error('Conflicting daily totals');
    dates.set(d.startDate,d.tokens);
  }
  return activitySchema.parse({...emptyActivity(),summary:usage.summary,last_synced_at:observedAt,daily:[...dates].map(([date,value])=>({date,value,observed_at:observedAt}))});
}
const analyticsRows = z.array(z.object({date:activityDate,totals:z.object({turns:count})}));
// Offline only: accept aggregate exports, discard clients/models/page URLs and all other fields.
export function adaptAnalytics(input: unknown, observedAt: string, allow: boolean): ActivitySnapshot {
  if (!allow) throw new Error('Usage Analytics import requires explicit opt-in');
  time.parse(observedAt);
  const envelope = z.union([
    z.object({capturedAt:time,group_by:z.literal('day'),data:analyticsRows}),
    z.object({capturedAt:time,dailyList:analyticsRows})
  ]).parse(input);
  const captured = envelope.capturedAt;
  if (Date.parse(captured) > Date.parse(observedAt)) throw new Error('Future capture time');
  const rows = 'data' in envelope ? envelope.data : envelope.dailyList;
  const values = new Map<string,number>();
  for (const row of rows) {
    if (values.has(row.date) && values.get(row.date)!==row.totals.turns) throw new Error('Conflicting daily totals');
    values.set(row.date,row.totals.turns);
  }
  return activitySchema.parse({...emptyActivity('workspace-turns'),last_synced_at:observedAt,daily:[...values].map(([date,value])=>({date,value,observed_at:captured}))});
}
