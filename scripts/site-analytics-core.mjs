export const ANALYTICS_HOST = 'hilt21.github.io';
export const ANALYTICS_PATH = '/aboutMe/';
export const WINDOW_DAYS = 30;
const CHUNK_DAYS = 6;
const DAY_MS = 86400000;
const GRAPHQL_ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';

const QUERY = `query SiteInsights($accountTag: string!, $siteTag: string!, $host: string!, $path: string!, $from: Date!, $to: Date!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      rumPageloadEventsAdaptiveGroups(
        limit: 10
        filter: { siteTag: $siteTag, requestHost: $host, requestPath: $path, date_geq: $from, date_leq: $to }
        orderBy: [date_ASC]
      ) {
        count
        sum { visits }
        avg { sampleInterval }
        dimensions { date requestHost requestPath }
      }
    }
  }
}`;

function dayString(utcMs) {
  return new Date(utcMs).toISOString().slice(0, 10);
}

export function windowDates(now = new Date()) {
  const today = Date.parse(now.toISOString().slice(0, 10) + 'T00:00:00Z');
  const end = today - DAY_MS;
  const start = end - (WINDOW_DAYS - 1) * DAY_MS;
  return Array.from({ length: WINDOW_DAYS }, (_, i) => dayString(start + i * DAY_MS));
}

function validCount(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid Cloudflare ' + field);
  return value;
}

export async function collectSiteAnalytics({ token, accountTag, siteTag, fetchImpl = fetch, now = new Date() }) {
  if (!token || !accountTag || !siteTag) throw new Error('Cloudflare analytics credentials are not configured');
  const dates = windowDates(now);
  const days = new Map(dates.map(date => [date, { date, pageViews: 0, visits: 0, sampleInterval: 1 }]));
  for (let start = 0; start < dates.length; start += CHUNK_DAYS) {
    const from = dates[start];
    const to = dates[Math.min(start + CHUNK_DAYS - 1, dates.length - 1)];
    const response = await fetchImpl(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: QUERY,
        variables: { accountTag, siteTag, host: ANALYTICS_HOST, path: ANALYTICS_PATH, from, to }
      }),
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error('Cloudflare GraphQL HTTP ' + response.status);
    const body = await response.json();
    if (body.errors?.length) throw new Error('Cloudflare GraphQL returned an error');
    const accounts = body.data?.viewer?.accounts;
    if (!Array.isArray(accounts) || accounts.length !== 1) throw new Error('Unexpected Cloudflare account response');
    const rows = accounts[0].rumPageloadEventsAdaptiveGroups;
    if (!Array.isArray(rows)) throw new Error('Missing Cloudflare RUM groups');
    for (const row of rows) {
      const date = row.dimensions?.date;
      if (typeof date !== 'string' || date < from || date > to || !days.has(date)) throw new Error('Unexpected Cloudflare date');
      if (row.dimensions?.requestHost !== ANALYTICS_HOST || row.dimensions?.requestPath !== ANALYTICS_PATH) {
        throw new Error('Unexpected Cloudflare host/path');
      }
      const current = days.get(date);
      if (current._seen) throw new Error('Duplicate Cloudflare daily aggregate');
      const interval = row.avg?.sampleInterval;
      if (!Number.isFinite(interval) || interval < 1) throw new Error('Missing Cloudflare sampling metadata');
      current.pageViews = validCount(row.count, 'pageviews');
      current.visits = validCount(row.sum?.visits, 'visits');
      current.sampleInterval = interval;
      current._seen = true;
    }
  }
  const daily = [...days.values()].map(({ _seen, ...row }) => row);
  return {
    schemaVersion: 1,
    source: 'cloudflare-web-analytics',
    status: 'ok',
    updatedAt: now.toISOString(),
    lastAttemptAt: now.toISOString(),
    error: null,
    host: ANALYTICS_HOST,
    path: ANALYTICS_PATH,
    period: { from: dates[0], to: dates.at(-1), timeZone: 'UTC' },
    totals: {
      pageViews: daily.reduce((total, day) => total + day.pageViews, 0),
      visits: daily.reduce((total, day) => total + day.visits, 0)
    },
    sampled: daily.some(day => day.sampleInterval > 1),
    daily
  };
}
