# Whole-page local profile preview

Status: design accepted on 2026-10-31. The user authorized a PR and merge after
successful CI. Merge and deployment outcomes are recorded in the PR.
Source branch: `codex/profile-preview`.

## Accepted constraints

- Preserve the accepted single-train sticky transition in both scroll directions.
- Preserve all existing English/Chinese career, responsibility and interest text.
- Keep Codex/GitHub metrics and both heatmaps visible by default. Existing data
  explanations remain native disclosures.
- Keep Project Atlas as the external project index; do not restore project cards.
- Preserve language URLs, SEO metadata, statistical meaning and data snapshots.

## Whole-page extension

- A dedicated content stylesheet continues the existing warm-paper visual
  direction across career, interests, practice, contact and footer.
- Reading copy uses 14px-equivalent rem units; data labels and interactive
  supporting text use 12px-equivalent rem units. Metadata stays quieter.
- Career/data disclosures, the GitHub destination and return-to-top have larger
  targets. Interest links are visibly underlined.
- Desktop calendars stay aligned; mobile panels remain stacked. Calendar labels,
  month/day labels, tooltips and accessible descriptions follow the page locale.
- The ending contact action uses the existing public profile email. Site Insights
  remains separate below it; the footer reflows to readable mobile rows.
- Short desktop spacing is tightened to retain initial Knorr visibility without
  reducing career reading text. The accepted train and navigation logic is unchanged.
- No dependencies, data collectors, routes, release configuration or source
  snapshots changed. The career source and train animation modules are unchanged.

## Local preview

- English: `http://127.0.0.1:4186/aboutMe/`
- Chinese: `http://127.0.0.1:4186/aboutMe/zh/`
- Reproduce checks using the commands in [profile-preview.md](profile-preview.md).

## Verification

- Check: 46 Astro files, zero errors/warnings/hints; snapshot validators pass.
- Unit tests: 38 passed. Built HTML/SEO tests: 12 passed.
- Independent Standards and Spec reviews: no remaining actionable findings.
- EN/ZH first-screen checks passed at 320x568, 390x844 and 1440x900. At 320x568,
  the full default Knorr block ends at 561.3px (EN) and 510.4px (ZH).
- Additional 360/361/640/641/768/1024px widths, 1440x568 short desktop,
  768x1024 tablet and 844x390 short landscape were checked. Initial short-desktop
  overrun was corrected; 641x568 EN now ends at 562.9px, 1024x568 at 531.5px.
  Short landscape remains scrollable; a complete Knorr block is not promised
  inside its shorter 390px initial viewport.
- No document horizontal overflow in the checked views, including expanded
  320px/390px data tables and mobile footer.
- Both calendars are available without opening a disclosure. Desktop calendars
  align and fit together in the practice view; mobile calendars are stacked.
- Practice starts at approximately 140px, below the pinned navigation bottom121px.
- Train remains a single WebGL canvas, running at railTop64px while scrolling,
  and returns to its original document position. Its time increases continuously.
- Actual language switching, practice links, keyboard-operated career/data
  disclosures, contact href and desktop return-to-top were checked.
- Browser warning/error log is empty in the final checked local page.

Published review evidence: [screenshots and measurements](profile-redesign-evidence/README.md),
captured on 2026-10-30 before publication approval. Calendar dates and snapshot
values are capture-time values, not a promise about later refreshes.
Physical phone, Safari, screen-reader and human usability acceptance are not
claimed beyond the user's acceptance of the local preview. Earlier no-script and
reduced-motion checks retain static content; the animated train and compact
navigation require JavaScript, and reduced-motion intentionally stops the train.
The 121px pinned train/navigation area reduces short-landscape reading space;
the full Knorr block requires scrolling at 844x390. The 320x568 English first
screen has about 6.7px clearance, so real-device font rendering needs verification.
