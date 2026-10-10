# PATCHWORK — Hotfix the Internet

Patch live websites **without rebuilding or redeploying them**. Visually edit any element, get changes reviewed and
verified in a real browser, release them as versioned patch sets, and roll back in one click — while an element
tracker keeps patches attached even when the site's markup changes underneath them.

## Run it

```bash
npm run setup      # installs dependencies + the Chromium used for verification (first time only)
npm start          # builds Studio on first run, then starts everything
```

Open **http://localhost:4000** in **Chrome** (previews use `*.localhost` hostnames).
The demo store (ShopLite) runs on http://localhost:4100.

Optional: copy `.env.example` to `.env` and add `ANTHROPIC_API_KEY` for Claude-powered patch generation.

## What's inside

| Folder | What |
|---|---|
| `server/` | Fastify API, patching reverse proxy, SQLite store, Playwright verification worker, releases, drift watcher, audit chain, AI |
| `runtime/` | Scripts injected into patched pages (patch applier + visual-editor overlay) |
| `shared/core.cjs` | The multi-signal element locator and conflict engine (runs in browser **and** server) |
| `studio/` | React app: visual editor, patches & review, conflicts, verification, releases + time machine, tracking, audit, settings |
| `demo-site/` | ShopLite — a deliberately buggy store with a v1 and a redesigned v2 |
| `extension/` | Chrome extension: apply patches on the real site, and propose new ones from the page |
| `scripts/` | Start script, tests (`npm run test:all`), dev tooling |
| `docs/` | The feature & instruction manual |

## Tests

With `npm start` running: `npm run test:all` (core engine, visual editor, full demo storyline, Chrome extension).

See **docs/PATCHWORK_Manual.docx** for the complete manual, demo script and architecture notes.
