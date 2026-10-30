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
