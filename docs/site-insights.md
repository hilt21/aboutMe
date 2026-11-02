# Site Insights data contract

Public site: https://hilt21.github.io/aboutMe/

## Root cause and correction

Cloudflare retains unsampled Beacon data for seven days, then aggregates
older events to around 10%. GraphQL can apply adaptive sampling. Requerying
the entire 30-day window previously replaced verified days with lower
confidence sampled estimates; missing query rows were converted to zero.

The website now maintains immutable verified daily history and derives the
public rolling window from that historical data. Only `sampleInterval = 1`
is accepted. Day values originate from exact `hilt21.github.io` and
`/aboutMe/` filters.

## History recovery evidence

These unsampled values were extracted from existing GitHub snapshot commits.
More recent provisional days can be updated when unsampled late beacons arrive.

| UTC date | PV | Visits | Evidence commit SHA |
| --- | ---: | ---: | --- |
| 2026-10-24 | 6 | 5 | 2e5230ae536c2b408282aba10f57aae57d64ced7 |
| 2026-10-25 | 20 | 20 | d660fd426b28c8d20f1519a4d3f9f209eb99566c |
| 2026-10-26 | 55 | 52 | 73dedeff85fc2388e2eea30884311e70c101ac74 |
| 2026-10-27 | 12 | 11 | ff10bfa22609b8efef65b86f94ba30027d81dedd |
| 2026-10-28 | 7 | 3 | 68bb55861f90a838532408fe57c3b34b6a54c270 |
| 2026-10-29 | 2 | 2 | 68bb55861f90a838532408fe57c3b34b6a54c270 |
| 2026-10-30 | 9 | 3 | 68bb55861f90a838532408fe57c3b34b6a54c270 |
| 2026-10-31 | 23 | 13 | 68bb55861f90a838532408fe57c3b34b6a54c270 |
| 2026-11-01 | 10 | 4 | 68bb55861f90a838532408fe57c3b34b6a54c270 |

Read `src/data/site-analytics.json` at each commit to verify the sample interval.
The original October 28 figure was 6/2; the newer unsampled snapshot yielded
7/3 and is retained as the latest known unsampled value.

## Data lifecycle

- Canonical history: `src/data/site-analytics-history.json`.
- Derived rolling view: `src/data/site-analytics.json`.
- RUM query: latest seven complete UTC days, one request per day.
- Last three complete UTC days: `provisional`, may change with new
  unsampled RUM observations.
- Older days: `final`, never overwritten by later Cloudflare estimates.
- No observation: `missing` with null counters; older-than-Beacon days:
  `outside` with null counters.
- Only known days contribute to public totals. Missing days receive a
  visible count and totals become lower bounds, prefixed `≥`. The seven-day
  trend is broken at missing days.
- Stored history survives beyond the rolling 30-day display window.

## Verification and failure modes

Run `npm run check && npm test && npm run build`. Compare canonical and
derived snapshot totals. Re-query recent days, observe sampling metadata,
and ensure repeated runs do not alter finalized dates. The Actions job
must commit **both** JSON files after successful sync.

If Cloudflare GraphQL fails, preserve history, mark snapshot as stale and
fail the report job. Missing secrets also constitute a workflow error.
The site can still deploy the last verified snapshot with an overdue mark.
Confirm successful Pages deployment and browser-rendered footer metrics.

Known boundaries: Visits are Cloudflare RUM visits, not unique persons.
A day may change within the provisional period due to late Beacon events.
Events that arrive after finalization are deliberately not retroactively
added. If a day never yields an unsampled record within the recovery window,
it remains a visible gap. Avoid invented zero counts and all-time claims.

Official mechanism: https://developers.cloudflare.com/web-analytics/faq/
