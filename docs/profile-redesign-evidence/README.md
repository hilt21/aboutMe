# Profile redesign acceptance evidence

Original screenshots and measurements were captured on 2026-10-30 in the
in-app Chromium browser. The user accepted the version on 2026-10-31.
These are viewport simulations, not physical-device or Safari tests.
Snapshot values and calendar dates reflect capture time; deployment refreshes
can legitimately change them.

## Visual evidence

| View | Evidence |
| --- | --- |
| Before: 1440x900, full fixed identity and project cards | [Screenshot](before-desktop-work.png) |
| After: 1440x900, identity/Knorr first screen | [Screenshot](desktop-top.png) |
| After: 1440x900, single persistent train and both visible practice panels | [Screenshot](desktop-practice.png) |
| After: 320x568 English first screen | [Screenshot](mobile-320-en-top.png) |
| After: 390x844 Chinese practice panel, without expanding data details | [Screenshot](mobile-390-zh-practice.png) |
| After: 390x844 Chinese contact/footer | [Screenshot](mobile-390-zh-footer.png) |

The files are unedited copies of the inspected screenshots. [manifest.json](manifest.json)
records their SHA-256 hashes. [browser-results.json](browser-results.json)
preserves original measurements, including initial boundary failures and the
passing `boundaryRetest` results after spacing corrections.

## Acceptance results

- EN/ZH at 320x568, 390x844 and 1440x900: no horizontal overflow; Knorr default
  content fits. At 320x568, Knorr ends at561.3px (EN) /510.4px (ZH).
- Additional 360/361/640/641/768/1024px widths, 1440x568, 768x1024 and844x390
  were checked. Corrected short-desktop EN results: 641x568=562.9px,
  1024x568=531.5px. Short landscape requires scrolling for the complete Knorr block.
- Single WebGL train canvas stays mounted/running, rail sticks at64px and
  releases continuously upward. Animation time increases across transitions.
- Compact navigation is56px below the rail (65-121px); practice targets start
  at approximately140px. No navigation-induced document-height change.
- Metrics and heatmaps are visible by default; data explanations and career
  disclosures support keyboard Enter. Expanded 320/390px tables do not overflow
  the document. Contact points to the existing public profile email.
- Local check: 46 Astro files, zero errors/warnings; 38 unit tests and12 built
  HTML/SEO tests pass. Final browser warning/error log empty.
- Canonical EN/ZH URLs, profile schema, all career/interest text, data snapshots,
  statistical semantics, train animation modules and release workflow are preserved.

## Residual risks and rollback

- Physical phones, Safari and screen readers remain untested. The narrow English
  first-screen clearance is about6.7px; real-device font rendering needs verification.
- The accepted pinned region occupies121px; this reduces short-landscape reading space.
- Animated train/compact navigation require JavaScript; reduced-motion intentionally
  stops animation. Static biography, links and practice data remain available.
- Project Atlas is an independently maintained destination, primarily in Chinese.
- This is a reversible presentation change with no data migration. Revert the
  merged PR and use the existing GitHub Actions Pages workflow to restore the prior UI.

CI and production verification outcomes are recorded in the PR, separately from
the local acceptance evidence above.
