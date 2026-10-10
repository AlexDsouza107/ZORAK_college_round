# Changelog

## v1.0.3 — Landing page: dark premium theme, patch-themed background, scroll effects

A visual redesign of the landing page (`landing/`). **No text content was changed.** The product (server, Studio, extension) is unchanged.

### Theme
- Deep blue-black canvas with solid, layered dark panels (hairline borders, inner top highlight); light-grey body text and near-white headlines.
- One emerald accent for live/active/success; red only for runtime errors. Primary CTAs invert to bright ink on dark.
- The 3D hero scene, charts, terminal, callouts and footer are re-coloured for dark.

### Background
- New full-page **bubble field**: glassy bubbles and stitched "patch" squares drift upward. Bubbles start red (`×`, broken) and ripple into emerald (`✓`, patched) as they rise.
- Bubbles parallax with scroll, move away from the cursor and pop on click. A soft scrim keeps hero copy legible. Slowly parallaxing colour pools sit behind everything.

### Scrolling
- Smooth inertial scrolling (Lenis) with gliding anchor links; thin emerald scroll-progress bar.
- Hero parallax; "How it works" step lines fill, numbers glow and demos drift as each step scrolls through; blur-in section headings and cards; cursor-following spotlight on feature cards and the stats row.
- Reduced-motion users get a static background and native scrolling.

### Performance
- Frosted-glass blur over the animated background dropped a software-rendered test browser to ~22 fps; replaced with solid layered panels. All effects now run at 60 fps in the same test.

### Housekeeping
- New dependency: `lenis`. All workspace packages bumped to 1.0.3.

## v1.0.2 — Overview dashboard + name fix

### Studio
- **Overview redesigned as a full-width dashboard.** The page now uses the whole window (up to 2,200px) instead of a centred ~1,380px column.
  - Welcome box: centred heading with three large rectangular action buttons beneath it (no subtext), sized taller than the pipeline box.
  - Compact, centred KPI tiles in one row (2×2 below 1,200px), with shorter labels.
  - **Patch pipeline** has its own full-width row (compact stage tiles).
  - Cards, tiles, metrics, rows and text are ~6–10% larger for readability; KPI tiles switch to 2×2 below 1,320px.
  - Two roomy columns: Production health (2×2 metrics) + Element tracking, then Review queue + Demo controls.
  - **Recent activity** moved to the bottom at full width and shows the last 5 events.
  - Generous spacing and larger text; card headers wrap their buttons instead of squeezing titles; better dark-theme contrast for secondary text.
- New **Review queue** card (in review, approved and drafts) and a per-patch list under **Element tracking**.
- **Recent activity** now uses the same icons and colour coding as the Audit trail, from one shared definition (`studio/src/auditMeta.tsx`).
- **Patches, Verification and Releases pages:** removed the subtitle under the heading and made the page title larger and bolder (36px).

### Server
- `GET /api/audit` accepts an optional `exclude` prefix filter (e.g. `exclude=drift.`), so the dashboard feed is never flooded by automatic drift checks.

### Housekeeping
- The demo admin user is now named **Alex Dsouza** in the app, the seeded audit trail and the manual.
- All workspace packages bumped to 1.0.2.

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
