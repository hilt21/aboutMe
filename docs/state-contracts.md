# State contracts: aboutMe

Baseline: `main` at `b64a5cad8d83eac540065c6de33b842a82e397b7`.
This inventory separates owned states from derived UI values. It is also a
review checklist for agents changing interaction, collection or publishing.

## Browser interaction

| Owner | State or derivation | Events and guards | Recovery / invariant |
| --- | --- | --- | --- |
| URL and Astro routes | `en` at `/aboutMe/`, `zh` at `/aboutMe/zh/` | Follow language link | No localStorage redirects; preserve canonical and hreflang |
| `scroll-navigation.ts` + `ScrollNavigation.astro` | Pinned × focus-within -> visible/inert | IntersectionObserver; focusin/focusout | Deterministic projection; observer teardown on Astro swap; rail 64px, anchors 140px |
| `TrainBootstrap.ts` | waiting -> loading -> mounted/unavailable -> disposed | IntersectionObserver, import result, pagehide/astro:before-swap | Exactly one mount; ignore completion after departure; try SVG if WebGL import/mount fails |
| `TrainScene.ts` + `TrainFallback.ts` | WebGL or SVG rendering backend | WebGL support, `webglcontextlost` | Retire WebGL and mount SVG with **same x/time/distance and scroll controller** |
| `TrainState.ts` | running/paused/reduced/disposed | Element visibility, page visibility, reduced-motion preference, dispose | One animation loop and one scroll listener owner; reduced motion never advances position |
| Native `details` | open/closed | Click, Enter, Space | Leave career and data disclosures browser-owned |
| Static presentation | breakpoint/layout, experience year, calendar color/values | CSS and pure functions | Avoid storing derived copies as mutable state |
| `snapshot-freshness.ts` + `freshness-view.ts` | Overdue display flag (derived) | Status, timestamp, time threshold; page visibility/pageshow/hourly tick | Recalculate without altering static data; invalid dates fail closed |

## Data and publication

| Owner | State | Recovery / invariant |
| --- | --- | --- |
| `scripts/sync-github.mjs` | ok/stale/unavailable | Previous verified snapshot stays on failure |
| `scripts/projects-core.mjs` | attempt, retry, success, exhausted/nonretryable | Bounded wait; keep complete old snapshot if any project fails |
| `scripts/site-analytics-core.mjs` | outside/missing/provisional/final, plus snapshot ok/stale/unavailable | Missing is unknown, unsampled records only, finalized dates immutable |
| `scripts/activity/sync.ts` | locked/acquiring/validated/merged/committed/failed | Exclusive lock, atomic snapshot, no raw conversation content |
| `scripts/activity/daily.mjs` | due/running/pending-push/confirmed/failed/completed | Reconcile ambiguous Git pushes by commit SHA; no duplicate publication |
| `.github/workflows/pages.yml` | collection + validation + build + deployment + report | Deployment success is independent of data freshness; Pages is sole deployment pipeline |\n| `scripts/generate-site-status.mjs` | static-build provenance | Embed **actual checked-out commit** after snapshot refresh; do not claim deployed status |

The Website has no shared client store or backend session. Do not introduce a
global state-machine framework for local, browser-native or derived states.

## Acceptance checklist

1. `npm ci`, `npm run check`, `npm test`, `npm run build` sequentially.
2. Preserve English/Chinese biography and URLs; 320×568 first-screen Knorr
   visibility, fixed rail, navigation focus, no duplicate train, and both
   default-visible practice calendars.
3. Browser fault injection: disable WebGL and trigger
   `webglcontextlost` on the train canvas. The SVG renderer should appear,
   with continuous `data-train-x`/`data-train-time`, one renderer and no
   duplicate listeners or requestAnimationFrame loop.
4. Test `prefers-reduced-motion`, page hidden/visible, resize, forward/back
   scrolling, loading failure, and navigation away while a chunk is pending.
5. Check Site Insights' missing/zero/final semantics, Codex/GitHub overdue
   labels (including a tab left open across the threshold), GitHub Actions
   collection failures and deployment outcomes independently.
6. After Pages deploy, fetch `/aboutMe/site-status.json`. Compare
   `sourceCommit` with the workflow's **post-collection** build commit,
   check snapshot timestamps, and verify the workflow's deploy/report jobs
   separately. Do not infer deployment success from `artifact: static-build`.
7. Verify rapid pin/unpin, focus retained after unpin, and no new listener/
   IntersectionObserver after Astro navigation. Do not publish based on tests
   alone.

This status-focused change preserves collectors, data contracts, content, analytics scopes and SEO URLs. It updates the build step only to embed an accurate post-refresh commit SHA.
