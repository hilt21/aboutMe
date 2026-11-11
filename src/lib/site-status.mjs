// Public build provenance. Publish only approved aggregate metadata; never
// include API responses, errors, credentials or private activity details.
const SHA = /^[a-f0-9]{40}$/i;

export function createSiteStatus({sourceCommit = null, builtAt, github, projects, codex, siteInsights}) {
  if (sourceCommit !== null && !SHA.test(sourceCommit)) throw new Error('Invalid source commit');
  if (!Number.isFinite(Date.parse(builtAt))) throw new Error('Invalid build timestamp');
  const snapshot = source => ({
    status: source.status,
    updatedAt: source.updatedAt,
    lastAttemptAt: source.lastAttemptAt,
  });
  return {
    schemaVersion: 1,
    artifact: 'static-build', // Does not assert Pages deployment success.
    sourceCommit,
    builtAt,
    sources: {
      github: snapshot(github),
      projects: snapshot(projects),
      codex: {
        lastSyncedAt: codex.last_synced_at,
        latestObservedDate: codex.daily.at(-1)?.date ?? null,
      },
      siteInsights: {
        ...snapshot(siteInsights),
        period: {from: siteInsights.period.from, to: siteInsights.period.to, timeZone: 'UTC'},
        coverage: {
          expectedDays: siteInsights.coverage.expectedDays,
          knownDays: siteInsights.coverage.knownDays,
          missingDays: siteInsights.coverage.missingDays,
          complete: siteInsights.coverage.complete,
        },
      },
    },
  };
}
