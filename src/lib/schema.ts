import { z } from 'zod';
export const Day = z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),count:z.number().int().nonnegative(),level:z.number().int().min(0).max(4)});
export const Snapshot = z.object({schemaVersion:z.literal(1),source:z.literal('github-public'),updatedAt:z.string().datetime().nullable(),lastAttemptAt:z.string().datetime(),status:z.enum(['ok','stale','unavailable']),error:z.string().nullable(),calendar:z.array(Day),totalContributions:z.number().int().nonnegative().nullable(),repositories:z.number().int().nonnegative().nullable()});
export const Project=z.object({id:z.string(),name:z.string(),category:z.string(),description:z.string(),zh:z.string(),status:z.enum(['Published','Prototype','Live MVP','Experiment']),url:z.string().url(),repo:z.string().url(),stack:z.array(z.string()),kind:z.enum(['lexicon','cad','learning','effects'])});
export const Profile=z.object({name:z.string(),handle:z.string(),linkedin:z.string().url(),email:z.string().email(),location:z.string(),experienceBaselineYear:z.number().int(),experiences:z.array(z.object({id:z.string(),years:z.number().int().nonnegative(),en:z.string(),zh:z.string()})),github:z.string().url(),reviewedAt:z.string(),projects:z.array(Project)});
export const Milestone=z.object({id:z.string(),date:z.string(),title:z.string(),source:z.string().url(),reviewedAt:z.string(),status:z.literal('reviewed')});

export const ProjectSnapshot=z.object({schemaVersion:z.literal(1),updatedAt:z.string().datetime().nullable(),lastAttemptAt:z.string().datetime(),status:z.enum(["ok","stale","unavailable"]),error:z.string().nullable(),items:z.array(z.object({repo:z.string().url(),stars:z.number().int().nonnegative(),forks:z.number().int().nonnegative(),pushedAt:z.string().datetime(),archived:z.boolean(),defaultBranch:z.string()}))});

export const SiteAnalyticsSnapshot = z.object({
  schemaVersion: z.literal(1),
  source: z.literal('cloudflare-web-analytics'),
  status: z.enum(['ok', 'stale', 'unavailable']),
  updatedAt: z.string().datetime().nullable(),
  lastAttemptAt: z.string().datetime(),
  error: z.string().nullable(),
  host: z.literal('hilt21.github.io'),
  path: z.literal('/aboutMe/'),
  period: z.object({ from: z.string(), to: z.string(), timeZone: z.literal('UTC') }),
  totals: z.object({ pageViews: z.number().int().nonnegative(), visits: z.number().int().nonnegative() }).nullable(),
  sampled: z.boolean(),
  daily: z.array(z.object({
    date: z.string(),
    pageViews: z.number().int().nonnegative(),
    visits: z.number().int().nonnegative(),
    sampleInterval: z.number().min(1)
  })).length(30)
});
