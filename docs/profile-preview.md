# Profile preview: scheme 2

Status: local review only. No merge, push or publication is authorized.
Baseline: `90876e6` on `origin/main`.

## Scope

- Keep the existing bilingual identity, career, responsibilities and interests.
- Let the full identity and signature train scroll with the document.
- Add a plain link to `https://hilt21.github.io/#projects` in the identity area.
- Show a compact navigation only after the identity has left the viewport.
- Keep project, practice and contact actions available in the compact navigation.
- Remove duplicate project cards from this local preview. Keep existing project
  data and synchronization unchanged pending whole-page acceptance.
- Keep Codex/GitHub metrics and both heatmaps visible by default. Only their
  existing data explanations remain collapsed.
- Preserve the current language URLs, metadata and structured identity data.
- Leave the remaining page design unchanged until the slice is accepted.

## Acceptance

- English and Chinese at 320x568, 390x844 and 1440x900: project/practice links,
  train and all default Knorr content fit in the initial viewport.
- No document-level horizontal overflow; compact navigation is at most 56px
  tall, stays within the viewport, and does not cover anchor destinations.
- The identity keeps its document height when the navigation appears; no
  replacement spacer or scroll-driven layout shift is introduced.
- Native links, language switching, browser back, career disclosures and data
  explanations work. Keyboard focus remains visible and operable.
- Both heatmaps and their summary metrics remain visible without expansion.
- Reduced motion and no-JavaScript behavior retain usable content/navigation.
- Check, tests and build pass; inspect the actual local site at representative
  desktop, portrait and short landscape dimensions.

## Local preview

Run `npm ci`, then `ASTRO_TELEMETRY_DISABLED=1 npm run check`, `npm test`, and
`ASTRO_TELEMETRY_DISABLED=1 npm run build` sequentially. Check/build both write
Astro's generated cache and must not run concurrently in the same checkout.

Run `ASTRO_TELEMETRY_DISABLED=1 npx astro preview --host 127.0.0.1 --port 4186`.
English: `http://127.0.0.1:4186/aboutMe/`.
Chinese: `http://127.0.0.1:4186/aboutMe/zh/`.

Browser evidence and results are kept in the ignored `qa/` directory.
Physical phone, Safari and real-user acceptance remain outside local browser
viewport simulation. This preview does not claim those checks have passed.

## Verification: 2026-10-30

- `npm run check`: 46 files, zero errors/warnings; snapshot validators passed.
- `npm test`: 38 passed. Build and built HTML/SEO tests: 10 passed.
- Independent Standards/Spec reviews: focus stacking and a 1px navigation
  height issue were corrected; re-review found no remaining actionable issues.
- Browser: EN/ZH initial views at 320x568, 390x844 and 1440x900 passed. Knorr
  default content ends at 557.6px (EN) and 506.1px (ZH) in the 568px-high view.
- Additional 360/361/390/640/641/768/1024px-wide views at 568px height were
  checked. Short-tablet spacing was corrected and retested at 641x568 and
  768x568. Short landscape 844x390 reflows without horizontal overflow; the
  full Knorr block requires scrolling at this shorter height.
- Compact navigation: 56px outer height, no overflow at 320px; links are at
  least 44px high/wide. A focused navigation remains visible above the identity.
- Practice jump: section starts at approximately 76px, below the navigation.
  Showing the navigation leaves document height and section positions intact.
- Desktop metrics and both calendars are visible together. Mobile panels are
  stacked, with metrics and calendars visible without opening disclosures.
- Keyboard Enter opens/closes data details. Language switching, the actual
  Project Atlas #projects destination, and browser-back restoration passed.
- Reduced motion: train enters `reduced` state and smooth scrolling is disabled.
- No JavaScript: static content, project link, direct fragment navigation,
  metrics and both calendars remain available. The animated train and compact
  navigation require JavaScript, as expected. Browser locator clicks could not
  run with scripts disabled; no-script click interaction is not claimed tested.
- Normal script/animation settings restored. Browser warning/error log empty.

This is local implementation evidence, not production or human acceptance.
