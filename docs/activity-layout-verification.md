# Activity layout verification

2026-10-26. Scope: presentation only; existing `src/data` snapshots and all eight
underlying summary values are unchanged. Base: f5310db550431a1d5c9a33b06a08d683875c9e88.

- Desktop: Codex left, GitHub right, no tabs. Shared calendar components and exact vertical alignment.
- Mobile/tablet: Codex before GitHub, stacked at 900px and below.
- Both calendars show 183 civil dates, 2026-04-27–2026-10-26 in this check. Snapshot retention and summary metric periods stay unchanged.
- Reference-inspired circular dots and large numbers retain the site's light palette, typography and GitHub sage colors. The Token trend was removed in the follow-up revision.
- Explanations and provenance are collapsed by default. Unknown dates share the GitHub Less light fill; null values and Unknown titles/details are retained.
- Native disclosures expose Codex's 80 observed daily values and GitHub's 183 displayed dates, with captioned tables and row headers; keyboard Enter toggles both disclosures.

## Automated verification

`npm run check`: zero errors, warnings or hints. `npm test`: 27 passed.
`npm run build`: static Astro build passed. Added regression tests for the
183-day boundary, leap day, zero/unknown preservation and one-decimal B formatting.
Independent standards/spec reviews identified the missing GitHub touch/keyboard
data fallback; the daily table fixes it, and both reviewers confirmed resolution.

## Real browser verification

Local installed Chrome; built page served only on loopback. Both English and
Chinese labels checked. DOM values were compared to the unchanged source
snapshots (Codex display: 7.2B / 0.4B / 14,455 / 18 / 6; exact Token values remain in details;
GitHub: 648 / 95 / 48).

| Viewport | Layout | Dates per panel | Page/calendar/metric overflow |
|---|---|---:|---|
| 1470×900 | Codex left, GitHub right; calendars aligned | 183 | None |
| 1024×768 | Codex left, GitHub right; calendars aligned | 183 | None |
| 901×768 | Codex left, GitHub right; calendars aligned | 183 | None |
| 768×1024 | Codex first, stacked | 183 | None |
| 390×844 | Codex first, stacked | 183 | None |
| 320×568 | Codex first, stacked | 183 | None |

Desktop 1470×1000 and mobile 390×844 / 320×568 screenshots visually inspected.
Knorr first-screen heading remained visible at 320×568 (Chinese bottom 339.5px).
Browser viewport overrides were restored. Physical phone, Safari and human
manual QA were not performed; mobile viewport checks are not device testing.

Screenshots and raw viewport evidence were saved in the task workspace's
`activity-layout-qa/` directory. This branch is for PR review only; no production
merge, deployment, new site or data collection is part of this revision.


## Follow-up: compact Token summaries

- Lifetime and peak daily summaries use B (10^9) with one decimal. Source snapshots are unchanged; exact values remain in titles and data details.
- Unknown dots and GitHub Less use the same `level-0` rule (computed rgb(231,233,223), no pattern). Unknown dates remain null and are still described as unknown.
- Deleted the Codex Token trend, its helper and styles.
- Chrome 1470×900 and 1024×768: both panel heights equal (452.859px and 503.742px respectively). 390×844 and 320×568 retain Codex-first stacking without page overflow. All four viewports show 7.2B / 0.4B and no trend SVG; 103 unknown dates remain.
- `check`, 27 tests and build passed. Independent reviewers found no remaining issues. No production deployment.
