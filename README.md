# Lu Tao · Engineering × AI

A bilingual professional profile with mechanical engineering and railway braking experience, selected engineering/AI projects, a GitHub contribution calendar, and a miniature train.

GitHub Pages target: https://hilt21.github.io/aboutMe/

Source of truth: this repository, main branch. The earlier ChatGPT Sites preview is a separate publication and is not updated by this repository.

## Development

Node.js 22 or later. Run `npm ci`, `npm run dev:astro`, `npm run check`, `npm test`, `npm run refresh`, and `npm run build` as needed.

Defaults: `SITE_URL=https://hilt21.github.io`, `PUBLIC_BASE_PATH=/aboutMe/`. Override both for another host. Pages serves dist; no server or database is needed. Enable Settings → Pages → Source: GitHub Actions.

## Data and maintenance

- `src/data/profile.json`: curated projects, identity, contacts and calendar-year experience baseline.
- `src/components/Background.astro`: approved bilingual career and interests.
- `src/data/github.json`: public contribution calendar, refreshed by `scripts/sync-github.mjs`.
- `src/data/projects.json`: public metadata for curated repositories, refreshed by `scripts/sync-projects.mjs`.

The ChatGPT curation task runs on Monday mornings in Asia/Shanghai, reviews public engineering/AI projects and commits verified updates. GitHub Actions refreshes contributions and selected-repository metadata on push/manual dispatch, then validates, builds and deploys. ChatGPT is the only recurring scheduler. Selection and maturity labels require public evidence. Failed collection keeps the last valid snapshot and makes the final report job fail after fallback deployment. Contributions older than ten days are flagged. PR/release activity is neither collected nor displayed.

Descriptions and maturity labels are curated. Stars and pushes do not prove deployment, validation, personal responsibility or business impact. Never publish private repositories, prompts, credentials or company-confidential content.

## Train and assets

Three.js primitives, a transparent orthographic scene, ten-second cruise, scroll/pointer acceleration, visibility pausing and reduced-motion support. SVG is the fallback. Browser QA to date covers SVG fallback; GPU rendering remains to be checked on a WebGL-capable device.

Font notices are retained in `public/fonts/licenses`. Astro and Three.js retain upstream licenses. The portrait is a user-approved asset and is not offered for reuse. This repository uses its optimized WebP; the original upload is not included.

## Site Insights (Cloudflare)
The quiet Site Insights section above the footer shows the last **30 complete UTC days**
of Page Views, Visits, and the final 7-day trend. Cloudflare Web Analytics is the
sole telemetry source; browsers never call the Cloudflare GraphQL API.

The Pages workflow reads the RUM GraphQL dataset in six-day chunks, strictly
filtering the host `hilt21.github.io` and the path `/aboutMe/` to exclude
other GitHub Pages projects. It generates `src/data/site-analytics.json` and
validates dates and totals. If Cloudflare samples any daily result, public
counters carry an approximate sign. Collection errors retain the latest valid
snapshot, mark it stale, and produce a workflow report failure.

**Required Actions secret:** `CLOUDFLARE_ANALYTICS_TOKEN`. Create a Cloudflare
API token with minimum Account Analytics read access sufficient to query this
account's Web Analytics RUM dataset, then save it as a GitHub repository
Actions secret. Never commit the token or put it in `PUBLIC_*` variables.
Account ID and site tag in the workflow are identifiers, not credentials.
Without the secret, the build warns, keeps the verified baseline and eventually
shows "update overdue".

The *existing* GitHub Pages release workflow gains a **daily 04:20 UTC**
analytics-only schedule. On the daily event, the GitHub contribution and
curated project collectors are skipped; the ChatGPT Monday editorial
curation schedule remains unchanged. GitHub Actions stays the sole
deployment pipeline. The workflow also supports manual dispatch.

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
