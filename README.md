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

The ChatGPT weekly task reviews engineering/AI projects and commits verified updates. The push pipeline refreshes snapshots, checks, builds and deploys. There is no second cron. Failed collection keeps the last valid snapshot and makes the final report job fail after fallback deployment. Contributions older than ten days are flagged. PR/release activity is neither collected nor displayed.

Descriptions and maturity labels are curated. Stars and pushes do not prove deployment, validation, personal responsibility or business impact. Never publish private repositories, prompts, credentials or company-confidential content.

## Train and assets

Three.js primitives, a transparent orthographic scene, ten-second cruise, scroll/pointer acceleration, visibility pausing and reduced-motion support. SVG is the fallback. Browser QA to date covers SVG fallback; GPU rendering remains to be checked on a WebGL-capable device.

Font notices are retained in `public/fonts/licenses`. Astro and Three.js retain upstream licenses. The portrait is a user-approved asset and is not offered for reuse. This repository uses its optimized WebP; the original upload is not included.
