# Accepted profile interaction contract

The user accepted the local whole-page preview on 2026-10-31 and authorized a
PR with evidence, followed by merge after successful CI. See
[whole-page verification](profile-full-page.md) for tested views and limitations.

## Behavior to preserve

- Keep the existing English/Chinese career, responsibilities and interests.
- Let the identity scroll. Keep one train renderer and animation instance on
  the same rail throughout scrolling, without a cloned handoff or time reset.
- The rail follows the document until it reaches 64px from the viewport top,
  stays there, then returns along the same path when scrolling back upward.
- Navigation fades below the rail while pinned (65-121px). Fragment targets
  clear the combined region with a 140px top offset. Focused navigation remains
  available until focus leaves it; hidden navigation is inert.
- Keep Project Atlas linked from identity and navigation. The legacy `#work`
  fragment still locates that identity-area entry, rather than project cards.
- Keep Codex/GitHub metrics and both heatmaps visible without expansion.
  Their data explanations remain native disclosures; unknown is not zero.
- Preserve the canonical English/Chinese routes, language-link behavior and
  structured identity data. Project collectors and statistical contracts are
  unchanged by this visual work.
- Keep the full default Knorr block in the initial 320x568 and larger tested
  portrait/desktop views. Short landscape is scrollable and uses compact spacing.

## Reproduce local verification

Run `npm ci`, then `ASTRO_TELEMETRY_DISABLED=1 npm run check`, `npm test`, and
`ASTRO_TELEMETRY_DISABLED=1 npm run build` sequentially. Check/build share Astro's
generated cache and must not run concurrently in one checkout.

Run `ASTRO_TELEMETRY_DISABLED=1 npx astro preview --host 127.0.0.1 --port 4186`.
English: `http://127.0.0.1:4186/aboutMe/`.
Chinese: `http://127.0.0.1:4186/aboutMe/zh/`.

Measurements and original screenshots are preserved in
[review evidence](profile-redesign-evidence/README.md). These are Chromium
viewport simulations; they do not establish physical-phone or Safari acceptance.
