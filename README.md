# Lu Tao · Engineering × AI

A bilingual professional profile with mechanical engineering and railway braking experience, a Project Atlas entry, visible Codex/GitHub practice calendars, and a continuously animated miniature train on a sticky rail.

GitHub Pages target: https://hilt21.github.io/aboutMe/

Source of truth: this repository, main branch. The earlier ChatGPT Sites preview is a separate publication and is not updated by this repository.

## Development

Node.js 22 or later. Run `npm ci`, `npm run dev:astro`, `npm run check`, `npm test`, `npm run refresh`, and `npm run build` as needed.

Defaults: `SITE_URL=https://hilt21.github.io`, `PUBLIC_BASE_PATH=/aboutMe/`. Override both for another host. Pages serves dist; no server or database is needed. Enable Settings → Pages → Source: GitHub Actions.

## Data and maintenance

- `src/data/profile.json`: identity, contacts, calendar-year experience baseline and retained project records.
- `src/components/Background.astro`: approved bilingual career and interests.
- `src/data/github.json`: public contribution calendar, refreshed by `scripts/sync-github.mjs`.
- `src/data/projects.json`: retained public repository metadata, refreshed by `scripts/sync-projects.mjs`; project cards are presented independently in [Project Atlas](https://hilt21.github.io/#projects).

The ChatGPT curation task runs on Monday mornings in Asia/Shanghai, reviews public engineering/AI projects and commits verified updates. GitHub Actions refreshes contributions and selected-repository metadata on push/manual dispatch, then validates, builds and deploys. ChatGPT is the only recurring scheduler. Selection and maturity labels require public evidence. Failed collection keeps the last valid snapshot and makes the final report job fail after fallback deployment. Contributions older than ten days are flagged. PR/release activity is neither collected nor displayed.

Descriptions and maturity labels are curated. Stars and pushes do not prove deployment, validation, personal responsibility or business impact. Never publish private repositories, prompts, credentials or company-confidential content.

Project metadata uses bounded retries and retains the full previous snapshot on
final failure. Actions reports collection, build and Pages deployment separately;
see [retry policy and failure records](docs/project-metadata-retries.md).

## Train and assets

Three.js primitives, a transparent orthographic scene, ten-second cruise, scroll/pointer acceleration, visibility pausing and reduced-motion support. One train stays mounted while its rail sticks and releases; compact navigation appears below it. SVG is the fallback, including when the WebGL context is lost. Browser QA includes WebGL rendering in the in-app Chromium browser; physical-device rendering and Safari remain untested. See [interaction contract](docs/profile-preview.md), [state contracts and fault-injection checklist](docs/state-contracts.md), and [acceptance evidence](docs/profile-full-page.md).

Font notices are retained in `public/fonts/licenses`. Astro and Three.js retain upstream licenses. The portrait is a user-approved asset and is not offered for reuse. This repository uses its optimized WebP; the original upload is not included.

## Public build provenance

`/aboutMe/site-status.json` is a machine-readable, static build manifest.
It exposes the actual built source commit SHA (when provided by the build runner),
build timestamp, verified snapshot timestamps/status, and Site Insights coverage.
It contains no raw Codex activity, credentials, API responses or error bodies.
`artifact: static-build` does **not** prove Pages deployment; verify Actions
`deploy` and `report` jobs separately. A push refresh may create an additional
data commit; the Pages build embeds `git rev-parse HEAD` **after** that commit.
Local builds without `SITE_SOURCE_SHA` report `sourceCommit: null`.

## Site Insights (Cloudflare)

The quiet bilingual Site Insights component above the footer displays the last
30 complete UTC days, or the actual period since the Beacon was installed when
30 days of observations are not yet available. Cloudflare Web Analytics is the
only telemetry source. No credential is exposed to browsers.

### Daily history and refresh rules

- `src/data/site-analytics-history.json` is the canonical long-term history.
  Initially it was recovered from existing GitHub snapshots with
  `sampleInterval = 1` and evidence commit SHAs.
- `src/data/site-analytics.json` is the derived public rolling view.
  Days before the Beacon began (2026-10-24) are `outside`; unobserved
  days after that point are `missing`, never assumed zero.
- Each refresh individually queries the latest seven **complete UTC days**,
  filtered by exact host `hilt21.github.io` and path `/aboutMe/`.
  The last three days may be revised by new unsampled observations.
  Older unsampled records become final and are never overwritten.
- Data with `sampleInterval > 1` is rejected from the verified history,
  even if Cloudflare estimates a nonzero count. Empty API results cannot
  replace existing days. The public 7-day trend never bridges a missing day.
- Totals sum available verified records. Missing days are explicitly
  reported, and a `≥` sign marks totals as lower bounds when necessary.
  An incomplete 30-day period is labeled with its actual coverage dates.
- The daily history is retained beyond the public 30-day rolling window.

The same GitHub Pages workflow refreshes only telemetry daily at 04:20 UTC.
The Monday ChatGPT editorial scheduler remains separate. An Actions
repository secret named `CLOUDFLARE_ANALYTICS_TOKEN` is required, with
minimum Account Analytics read permission. It must never be committed or
exposed through Astro public variables. Failed refreshes retain the verified
history, mark the published snapshot stale, and fail the report job after
fallback deployment. A missing secret is reported as an error.

See [Site Insights data policy](docs/site-insights.md).


## ChatGPT / Codex activity

The Activity section shows Codex first and GitHub second: side by side on desktop, stacked on mobile. Both calendars show the last 183 days; summary metrics retain their original periods. Data details and daily values are available in collapsed disclosures. The Codex panel reads a verified aggregate-only snapshot. On a locally
signed-in Codex machine, Node >=22.18: `npm run sync:activity` or
`npm run watch:activity -- --interval-minutes 360`. Stop the foreground watcher
to end scheduling; it never pushes or deploys. Unknown dates stay unknown.
Usage Analytics is optional, offline and requires explicit import flags.
See [implementation, source limits and verification](docs/chatgpt-activity-adapter.md).
Publish reviewed snapshots through the existing Pages branch/PR workflow only.

Approved daily-sync exception (2026-10-27): the local Mac may publish validated,
changed Codex aggregate snapshots directly to main at 21:00 Asia/Shanghai, with
wake/login catch-up. Credentials remain local; Pages remains the only deployment
pipeline. See [daily sync operations](docs/activity-daily-sync.md).

## SEO and language URLs

English is statically generated at `/aboutMe/`; Chinese at `/aboutMe/zh/`.
The URL controls language; the old localStorage preference is retired. Language
links work without JavaScript and remain on the current preview/production host.
`npm run build` includes `npm run test:seo`, which validates generated HTML,
canonical/hreflang, profile JSON-LD, sitemap, local assets and links.
See [phase-1 evidence, GitHub Pages robots limits, Search Console owner steps and
pending acceptance](docs/seo-phase-1.md). Site Insights retains its exact English
`/aboutMe/` path scope; Chinese-path traffic is not included in that snapshot.
