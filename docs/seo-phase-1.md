# SEO phase 1: review and acceptance

Checked 2026-10-27 (Asia/Shanghai). Initial baseline: `origin/main`
`d660fd426b28c8d20f1519a4d3f9f209eb99566c`. Before handoff, integrated current main
`6df7254c2b396aadd6fdfa648d0942ed35d7ad76`, retaining its separately added Google
verification file and refreshed data. Branch: `codex/seo-phase-1`.
This SEO implementation is PR-only; it has not been merged into main or deployed.

## Baseline and resulting contract

| Item | Live baseline | Built result awaiting approval |
|---|---|---|
| English | `/aboutMe/`, HTTP 200, English static body | Same URL, English static body |
| Chinese | `/aboutMe/zh/` HTTP 404; Chinese required a client-side toggle | `/aboutMe/zh/index.html`, Chinese static body |
| Language choice | Button + `profile-language` localStorage changed text at one URL | Native link between static URLs, works without JS; URL owns locale |
| Legacy preference | Could override the page language | Old key is removed in a guarded storage call; no preference-based redirect |
| Search metadata | English title/description, no canonical/hreflang/OG URL | Per-language title/description/OG title/description/URL, self-canonical |
| Alternates | None | Both pages link to `en`, `zh-CN`, and English `x-default` |
| Sitemap | `/aboutMe/sitemap.xml` HTTP 404 | Valid XML containing exactly both canonical URLs |
| Robots | Host root `/robots.txt` HTTP 404; no page noindex or X-Robots-Tag observed | No noindex, no ineffective project-level robots file |
| Identity | Visible existing profile and contacts; no JSON-LD | ProfilePage with Person, existing name, portrait, GitHub and LinkedIn only |

The canonical URLs are `https://hilt21.github.io/aboutMe/` and
`https://hilt21.github.io/aboutMe/zh/`. Language links use root-relative paths
so ordinary localhost previews stay on localhost. Canonical, hreflang and OG URL
remain absolute. The previous localStorage preference does not silently change
content or route: old Chinese-preferring visitors to the English URL see English
and can follow the visible Chinese link. Explicit Chinese links remain Chinese
on reload. Original bilingual copy, projects and data snapshots are preserved.

Astro still generates static HTML. Shared `ProfilePage.astro` selects the existing
bilingual text at build time; browser translation is no longer required.
Person `sameAs` is exactly the existing `profile.json` GitHub and LinkedIn URLs.
Both language pages refer to one stable Person ID. No invented job titles,
qualifications, dates, employers, achievements, or social profiles were added.

## Automated evidence

- `npm run check`: zero errors, warnings or hints; all snapshot validators passed.
- `npm test`: 29 passed, including URL normalization and schema identity tests.
- `npm run build`: Astro emitted both HTML pages and `sitemap.xml`; 8 SEO tests passed.
- `npm run test:seo`: parses actual built HTML with parse5, checks language, one H1,
  metadata, reciprocal alternates, native language link, Chinese/English main copy,
  profile identity, JSON-LD, image alt, local assets, page paths and fragment targets.
- Negative regression cases reject wrong canonical, missing alternate, noindex,
  fabricated `sameAs`, and a broken local link.
- The build command includes SEO checks, so existing PR validation and Pages build
  workflows automatically fail before artifact upload when these checks fail.
- Generated XML was also parsed with Python's XML parser. No `lastmod` was invented.

The fast local build used an exact source mirror outside the iCloud directory,
Node 25.2.1 and the lockfile's installed dependencies. PR CI uses the repository's
Node 22 configuration and `npm ci`; its status is reported separately on the PR.
No project lint command/config exists; `astro check` provides the type diagnostics.

## Actual Chrome verification

Chrome 156.0.8078.48, fresh isolated browser contexts, reduced motion.
Production HTML was the before source. The final static build was served on
loopback and mapped to the production URL in an isolated test context, so canonical
URLs, same-origin links and deployment base paths could be exercised without publishing.
A separate ordinary loopback-preview test verified that language switching stays local.
These are actual desktop Chrome runs with mobile viewport emulation, **not a physical
phone test**. Safari and a physical iPhone/Android device remain unverified.

For both languages at each size, hero, fixed dock and Knorr heading position/size
matched the live baseline within 1 CSS pixel. There was no horizontal page overflow.
The short landscape view preserves its existing compact layout; its Knorr heading
is below the fold in both before and after, as it was before this PR.

| Viewport | English Knorr heading bottom | Chinese Knorr heading bottom | Result |
|---|---:|---:|---|
| 320×568 | 336.14px | 339.42px | Above fold, unchanged |
| 390×844 | 398.41px | 369.52px | Above fold, unchanged |
| 1440×900 | 521.16px | 468.77px | Above fold, unchanged |
| 568×320 | 384.91px | 353.25px | Existing short-landscape behavior unchanged |

Also passed: keyboard Enter on language links and data disclosures; explicit URL
precedence with old `zh`, `en` and invalid preferences; reload/back; Chinese and
English links with JavaScript disabled; blocked localStorage; no application JS
errors or failed local resource responses. The external analytics beacon was
stubbed in test contexts to avoid generating test traffic.

[Machine-readable geometry and results](seo-phase-1/browser-results.json).

| Screenshot | Before | After |
|---|---|---|
| English 320×568 | [Before](seo-phase-1/before-en-320x568.png) | [After](seo-phase-1/after-en-320x568.png) |
| Chinese 320×568 | [Before](seo-phase-1/before-zh-320x568.png) | [After](seo-phase-1/after-zh-320x568.png) |
| English desktop | [Before](seo-phase-1/before-en-1440x900.png) | [After](seo-phase-1/after-en-1440x900.png) |
| Chinese desktop | [Before](seo-phase-1/before-zh-1440x900.png) | [After](seo-phase-1/after-zh-1440x900.png) |

## Robots and Search Console handoff

`aboutMe` is a project site. This repository cannot publish
`https://hilt21.github.io/robots.txt`: a `public/robots.txt` here would land at
`/aboutMe/robots.txt`, which crawlers do not use for host robots rules. The observed
host-root 404 does not disallow Google crawling. No other repository was changed.
If a host-root robots file is later managed by the host-root site's owner, it may
advertise `Sitemap: https://hilt21.github.io/aboutMe/sitemap.xml`, while retaining
rules required by other projects on this shared host. That change is outside this PR.

At the initial baseline the signed-in Search Console session had no access.
During implementation, main gained a Google HTML verification file independently
(commit `91be2ef`). The final recheck now shows **verified owner** for the exact
URL-prefix resource `https://hilt21.github.io/aboutMe/`, and its Sitemaps table
contains **0 submitted sitemaps**. The overview says its data is being processed.
The file was brought into this branch unchanged. This task did not create or
change Search Console ownership or permissions. No sitemap/indexing request was
submitted because this PR's sitemap and Chinese page are not deployed yet.

Owner actions after approving and deploying this PR:

1. Retain the existing Google verification file in `public/` and its corresponding
   public URL under `/aboutMe/`. The final build was checked to preserve it byte
   for byte. Search Console already shows verified ownership; no new token or
   domain-level verification is needed. If access is later lost, use an account
   with access or the available HTML verification method for this exact URL-prefix
   property. Do not try to verify ownership of the shared `github.io` domain.
2. Confirm both public language URLs and `/aboutMe/sitemap.xml` return HTTP 200,
   the XML contains only the two intended canonical URLs, and no production
   header or HTML directive blocks indexing. In the resource's Sitemaps page,
   enter `sitemap.xml` in the field after the displayed `/aboutMe/` prefix and
   submit. Acceptance: submission is recorded and later reports Success, with
   two discovered URLs; retain the submission/result date.
3. Inspect each canonical URL. Run the live URL test, verify the rendered language
   and user-declared canonical, and request indexing if the account allows it.
   Acceptance: live test allows crawling/indexing and the request is recorded.
   Monitor Google's selected canonical and eventual indexing separately.

Verification, sitemap submission and a successful live test are not proof of
indexing, ranking, or citation by an AI answer engine. No ranking deadline is promised.

## Residual limits before approval

- No production deployment or post-deploy crawl has occurred. Merge/deploy needs user approval.
- Search Console ownership is verified; sitemap submission and indexing requests wait for the approved deployment.
- Physical mobile/Safari QA remains pending; mobile Chrome viewport evidence is provided.
- Existing Site Insights collects only exact `/aboutMe/`. It is shown on both pages,
  but new `/aboutMe/zh/` traffic will not enter that snapshot. The original English
  path definition is unchanged; bilingual totals require a separate collector/schema
  change and a clearly defined historical cutover. The UI is not evidence of bilingual totals.
- Structured data validity does not guarantee rich-result eligibility or AI citations.
- The original referenced conversation exposed no readable assistant plan, only content
  reference placeholders; implementation follows the user's explicit phase-1 requirements.

## Primary references

- [Google: localized pages and reciprocal hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google: ProfilePage structured data](https://developers.google.com/search/docs/appearance/structured-data/profile-page)
- [Google: robots scope, subdirectory limitation and HTTP status handling](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)
- [Google: build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Search Console: site ownership verification](https://support.google.com/webmasters/answer/9008080)
