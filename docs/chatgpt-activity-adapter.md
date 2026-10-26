# ChatGPT Activity Adapter — implementation and evidence

Verified 2026-10-26, Asia/Shanghai. Development branch only; no production deployment authorized.

## P0: existing website and real source

The current website is https://hilt21.github.io/aboutMe/ and its source is
https://github.com/hilt21/aboutMe, main. Astro 5, TypeScript, Zod, static snapshots.
GitHub Actions `pages.yml` is the only production release path; `validate-pr.yml`
checks branches without deploying. The earlier Hilt21 Sites version 6 is a
separate legacy publication. Both were inspected; the legacy source was restored
for discovery, then excluded from development after reading the current repo's
AGENTS.md. No new site was created or published.

Official contract: https://learn.chatgpt.com/docs/app-server (Token usage section).
Local CLI: 0.164.0-alpha.11.1. Generated experimental TypeScript bindings confirmed
`GetAccountTokenUsageResponse`, `AccountTokenUsageSummary`, and `AccountTokenUsageDailyBucket`.
Only initialize / initialized / account/usage/read were sent; no thread read,
login mutation, credential extraction, browser API interception or raw upload.
A restricted execution timed out after 30 seconds. A network-enabled local run
using existing managed authentication succeeded; ordinary API-key-only auth is
not supported by this endpoint. No API key is required for this integration. A live one-shot scheduler run also succeeded at 11:53:56 UTC with 80 dates; no duplicate dates or extra scheduler infrastructure were introduced.

| Field | Official local response | Visible web Profile | Meaning / limitation |
|---|---:|---:|---|
| lifetimeTokens | 7,212,512,179 | 72.2亿 | Web display rounded; may also be fresher |
| peakDailyTokens | 425,231,411 | 4.3亿 | Web display rounded |
| longestRunningTurnSec | 14,455 | 4 小时 1 分 | Web display has minute precision |
| longestStreakDays | 18 | 18 天 | Matched |
| currentStreakDays | 6 | 7 天 | Does not match; freshness / definition not established |
| dailyUsageBuckets | 80 dates, July 10–October 25 | Calendar visible | Omitted dates are unknown, not verified zero |
| stats_as_of | Absent | No verified cutoff | null; last bucket is not a statistical cutoff |
| source time zone | Absent | Unverified | null; preserve date labels |

The full verified white-listed snapshot is `src/data/chatgpt-activity.json`.
`last_synced_at` records receipt/normalization, not the server's statistical cutoff.
Exact lag, a bucket-by-bucket GUI cross-check and the reason for the streak difference remain unverified. No claim
of a complete 365-day feed or ordinary Chat message history is made.

## P1: data boundary

`src/lib/chatgpt-activity.ts` owns strict public Schema, nullable summary metrics,
actual civil-date validation, safe integers, 365-day windows, exact duplicate
collapse, conflicting duplicate rejection, and source-separated upserts.
Daily aggregate dates are never re-binned into another zone. Display window ends
on today's Asia/Shanghai date, including today; source timezone stays null.
Old imports cannot overwrite newer per-date observations. Later imports revise
historical totals instead of adding them. Missing incoming buckets preserve
previous observations, including their individual observation timestamps.

Only five numeric Profile fields, date/value/observation time, source, metric and
provenance are persisted. Unknown upstream fields are discarded; snapshot Schema
rejects extra fields. No name, account ID, page URL, conversation text, titles,
prompts, OAuth tokens, session tokens or raw response is persisted or uploaded.

## P2: optional local analytics import

Default off. Requires `--analytics --allow-analytics --input <local-file>`.
Requires an explicit `capturedAt` ISO timestamp for both formats (capture time, not import time). Accepts daily `group_by: day / data[].date / totals.turns` aggregates and
`capturedAt / dailyList[].date / totals.turns` report exports. Does not fetch
backend-api endpoints, install either extension or inherit browser credentials.
Only `workspace-turns` is retained; tokens, credits, model/client lists, URLs and
other fields are discarded. Weekly/monthly inputs and conflicting dates fail.
This is Work/Codex workspace-turn activity, not ordinary Chat user-message count.

References inspected at fixed source revisions:

- devcxl/chatgpt-analytics `a4c28348639f791f472023c165ea462b7371fb2b`, `utils/types.ts`: daily aggregate envelope and grouping guard.
- Wangnov/codex-meter `6658e12db2213db9c7070bf8c1000c86c7961169`, `application/report-service.js`: captured time, dailyList and selected-range separation. Its authenticated private endpoint collector is deliberately not reused.

Synthetic test fixtures validate both shapes. No real authorized aggregate export
was imported in this implementation. Empty optional snapshot explicitly means
not imported. Earlier October 21 GUI observations remain historical local evidence
outside this repository; they are not relabeled as current official observations.

## P3: website integration

Existing Codex tab now renders five Profile metrics, a 365-date Token calendar,
14-calendar-day bars, observation coverage, unknown/zero legend, daily table,
source, stats_as_of, last_synced_at and latest observed date. It preserves the
site's bilingual text mechanism and existing visual styles. Missing dates use
stripes; zeros use the zero-level color. Browser marks snapshots over 48 hours
old as overdue even when the static page has not rebuilt. Source cutoff remains
unknown, regardless of a successful sync. Optional analytics stays separate.

## P4: local scheduling and release boundary

Node >=22.18.0 (native TypeScript stripping), existing Zod; no runtime dependency
or cloud database added. On the authorized logged-in local machine, from repo root:

```sh
npm run sync:activity
npm run watch:activity -- --once
npm run watch:activity -- --interval-minutes 360
npm run sync:activity -- --analytics --allow-analytics --input /absolute/aggregate.json
```

The foreground scheduler refreshes immediately, then sequentially every six
hours by default, until stopped. It performs no Git operations or deployments.
The one-shot mode is suitable for an existing local scheduler; no background
service is installed or left running. Auth stays in Codex's existing local
managed lifecycle. No credentials go to Actions or another server.

An exclusive lock covers collection/read/merge/write, avoiding concurrent lost
updates. Each snapshot is validated, written to a mode-0600 temporary sibling,
fsynced, then atomically renamed. Failed auth/network/Schema/lock leaves the last
valid snapshot unchanged and exits nonzero in one-shot mode. A killed process may
leave `.lock`: inspect that no collector is running before manually removing it.
No automatic deletion of locks. Per-file atomicity is provided; no cross-file
transaction or power-loss guarantee for the directory entry is claimed.

Static serving is sufficient for current scale. Cloud storage adds no benefit
until a separate authorized ingestion need exists. PR review gates public
aggregate updates. Merging main triggers existing Pages deployment; this work
opens a PR only. Future data publication can use the same branch/PR process;
no auto-push or production writes are hidden in the collector.

## Failure and verification boundaries

- Unsupported auth / expired login / unavailable Codex executable: fail closed; user reauthenticates locally through Codex if needed.
- Network timeout or server errors: retain snapshot; bounded 30-second deadline.
- Null metrics, absent buckets, sparse historical coverage: unknown, never fabricated zero.
- Rounded GUI values or different update times: preserve official exact values with source; do not invent precision or lag.
- Source Schema changes / unsafe integer / impossible date / conflicting dates: reject, retain snapshot.
- Older import / late historical corrections: per-date timestamps select newer values; unknown dates remain unknown.
- Existing build workflow and real source are preserved; no legacy Sites update, deploy, credential transfer or cloud scraper.

Automated checks, independent review and browser QA results are recorded below
once completed. Synthetic fixture success is not live-source validation.

Live web Analytics cross-check (2026-10-26): the selected 7-day message view
showed 507 messages; 7/30-day selectors and model/client grouping were present.
The page explicitly excludes ordinary Chat conversations from this usage scope.
The separate tool-activity area said updated October 26 05:20 UTC. That timestamp
was NOT applied to messages, Token buckets or Profile. A plan-history row warned
of incomplete data. No per-day analytics export or whole-year message history was
verified or manufactured from those totals.


## Verification log (2026-10-26)

- Automated: `npm ci` from the lockfile; `npm run check` (0 errors, 0 warnings); `npm test` (24 passing tests); `npm run build` (static Astro build).
- Independent standards and spec reviews found timestamp ordering, undated imports and scheduler listener accumulation; all were fixed, with regression tests. No remaining blocker in those reviews.
- Source: local official account/usage/read succeeded with 80 daily buckets and five summary metrics. GUI Profile and Analytics were read through existing authorized Chrome. This is real-source verification, separate from synthetic tests.
- Browser automation: real desktop Chrome and 320×568 viewport; 365 calendar dates, six 12px legend cells, document width 320 with no horizontal page overflow; calendar itself scrolls horizontally (scrollLeft 374, scrollWidth 677, clientWidth 303). English and Chinese labels, 80-row daily table and explicit optional-import empty state verified. Desktop 1470×900 screenshot inspected. Fixed the legend's inherited full-width sizing found by this QA. Original Knorr heading remains in first viewport (bottom 336px at height 568).
- Manual human QA: not performed. A physical phone, mobile Safari, screen reader and a six-hour unattended scheduling cycle are unverified. Mobile viewport testing is not physical-device testing.
- Environment: checks in the Documents checkout stalled; the same hilt21/aboutMe repository and exact changed files were copied to `/tmp/aboutme-activity-work`, where canonical checks completed. Original site identity and release pipeline are unchanged.
- Publication: branch/PR only; do not merge or deploy without additional approval.

`last_synced_at` always means successful local receipt; secondary-import per-day
`observed_at` means the user-supplied capture time. Reimporting a file may update
receipt metadata, but cannot add duplicate counts or overwrite a newer captured
observation. Statistics cutoff remains null.
