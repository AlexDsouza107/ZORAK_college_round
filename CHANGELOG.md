# Changelog

## v1.0.1 — Landing page refresh

A design-system refactor of the landing page (`landing/`). The product (server, Studio, extension) is unchanged.

### Design
- **Surfaces:** warm editorial canvas (`#FBFBF9`); pure white is reserved for elevated cards with hairline borders and soft shadows. Removed frosted-glass surfaces and the blurred colour glows.
- **One accent:** emerald for live / active / success; carbon `#111827` for primary CTAs. Red is used only to show runtime errors.
- **Legibility:** body copy moved from washed-out grays to `neutral-700` / `neutral-900`; monospace labels darkened.
- **Typography:** Geist for headlines and body, Geist Mono for all technical data (versions, error codes, element tags, latency). Removed serif accents and outlined numerals.
- **Radii:** pill shapes on cards and secondary containers replaced with crisp 12px / 8px radii.
- **Hero badge:** neutral mono pill instead of a glowing badge.

### 3D hero
- Scene now lives in an intentional browser-window frame (window dots, address bar, `v1.4.2`).
- Drag-to-rotate (springs back after release) alongside the mouse-follow tilt.
- Corner interaction badge: `[ ✦ Drag to rotate • Click node to patch ]`.
- Crisp HTML callouts pinned to broken nodes (`<button.checkout>` · `500 Internal Error` → `200 OK`).
- First frame snaps to the correct layout (no zoom-in at load); callouts are clamped inside the frame on small screens.

### Sections
- **Feature grid:** a strict 3-column grid of six identical cards (same surface, padding, header and fixed-height visual). Added a "Visual Patching" card; removed the dark banner.
- **Playground:** rebuilt as a full-width incident console — staged locate → inject → verify pipeline, `500 Checkout Failure` → `200 OK • Patch Injected` status flip, live p95 latency / error-rate / failed-checkout telemetry with SLO thresholds, and a streaming terminal log.
- **Footer:** light surface with a carbon terminal snippet.

### Housekeeping
- Stopped tracking `landing/dist` build output; `dist/` is now git-ignored.
- All workspace packages bumped to 1.0.1.

## v1.0.0 — Initial prototype
Server, Studio, runtime, Chrome extension, demo store, documentation and the first landing page.
