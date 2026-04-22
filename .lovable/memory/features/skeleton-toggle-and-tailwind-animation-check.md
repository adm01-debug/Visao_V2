---
name: Skeleton Toggle & Tailwind Animation Check
description: Floating dev/QA toggle to disable skeleton placeholders + post-build guard ensuring critical animations survive CSS purging
type: feature
---

## Skeleton Toggle (UI)
- `src/contexts/SkeletonToggleContext.tsx` persists `skeletonsEnabled` in `localStorage` (`visao:skeletons-enabled`).
- `src/components/dev/SkeletonToggleButton.tsx` is a floating button visible only in `import.meta.env.DEV` or when URL has `?debug=skeletons`.
- `src/components/PageSkeletons.tsx` `PageSkeleton` renders an empty spacer when toggle is OFF — useful for visual regression / empty-state QA.
- Provider wired in `src/App.tsx` around the router; button rendered alongside the app shell.

## Build-Time Animation Check
- `scripts/check-tailwind-animations.mjs` scans `dist/assets/*.css` after `vite build` and asserts both `@keyframes <name>` and `.animate-<name>` exist for each critical animation:
  `shimmer`, `skeleton-brand-pulse`, `pulse-glow`, `card-enter`, `sheen`, `accordion-down`, `accordion-up`.
- Wired into `package.json` `build` script as the final step (after `vite build`).
- Fails CI with exit code 1 + actionable message if any animation gets purged.

## How to extend
- Add new critical animations to the `REQUIRED` array in `scripts/check-tailwind-animations.mjs`.
- If a class is only used dynamically, safelist it in `tailwind.config.ts`.
