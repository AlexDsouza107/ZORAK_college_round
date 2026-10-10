// Generates docs/PATCHWORK_Manual.docx  —  run with:  npm run docs
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const { D, ACCENT, INK, MUTED, SOFT, LINE, PAPER, GOOD, WARN, BAD, SERIF, SANS, MONO, W, numberingRefs, runs, P, H1, H2, H3, bullets, steps, spacer, cell, table, callout, code, border, borders } = L;
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, LevelFormat, PageBreak, TableOfContents, Footer, Header, PageNumber, TabStopType, VerticalAlign } = D;

/* ----------------------------------------------------------------- cover */
const cover = [
  spacer(2600),
  new Paragraph({ children: [new TextRun({ text: 'PATCHWORK', font: SERIF, size: 96, bold: true, color: INK })], spacing: { after: 60 } }),
  new Paragraph({ children: [new TextRun({ text: 'Hotfix the Internet', font: SERIF, size: 44, italics: true, color: ACCENT })], spacing: { after: 360 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 14 } } }),
  new Paragraph({ children: [new TextRun({ text: 'Feature & Instruction Manual', font: SANS, size: 36, color: INK })], spacing: { before: 300, after: 120 } }),
  new Paragraph({ children: [new TextRun({ text: 'Patch live websites without rebuilding them — visually, collaboratively and safely.', font: SANS, size: 24, color: MUTED })], spacing: { after: 1600 } }),
  table(['Document', 'Details'], [['Product', 'PATCHWORK prototype v1.0'], ['Problem statement', '#3 — PATCHWORK: Hotfix the Internet (CRCE round)'], ['Edition', '10 October 2026'], ['Audience', 'Team members, mentors and judges who need to understand, run and demo the prototype']], [2400, 7238], { boldFirst: true })
];

/* ---------------------------------------------------------------- content */
const body = [];
const add = (...x) => x.forEach((e) => (Array.isArray(e) ? body.push(...e) : body.push(e)));

/* 1 ---------------------------------------------------------------------- */
add(H1('1. PATCHWORK at a glance', false));
add(P('A critical button breaks after a deployment. A checkout flow stops working. The original developers have moved on, and rebuilding and redeploying a whole application to change one line is slow, expensive and risky. **PATCHWORK** is the layer that sits between the website and its visitors so that small, reviewed, reversible fixes can be applied to a live site — without touching the original application.'));
add(P('Instead of editing source code, a developer points at an element in a visual editor and describes the change. That change becomes a **patch**: a tiny, structured, reversible set of operations. Patches are reviewed by a second person, tested in a real browser against the live site, released as an immutable **versioned set**, and can be rolled back instantly. An **element tracker** keeps every patch attached to the right element even when the site’s markup changes underneath it.'));
add(H2('1.1 How the six requirements are met'));
add(table(['Requirement from the brief', 'What PATCHWORK does', 'Where to see it'], [
  ['**Visual Patching** — modify elements, layout, content and behaviour through a visual interface', 'Click-to-select editor with live preview: text, colour, size, radius, opacity, attributes (e.g. remove `disabled`), hide, drag-to-move, custom CSS/HTML/insert, and an AI assistant. Desktop / tablet / mobile canvases.', 'Studio → Visual editor'],
  ['**Smart Element Tracking** — notice when updates invalidate patches and find moved elements using structural and semantic context', 'A multi-signal locator scores every candidate element (text, attributes, structure, context, classes, siblings, position…). Confident matches self-heal; ambiguous ones are held back. A drift watcher re-checks the live site and can re-anchor and re-release automatically.', 'Studio → Element tracking'],
  ['**Collaborative Editing** — several developers create, review and merge patches, detecting conflicts', 'Roles (developer / reviewer / admin), four-eyes approval, comments, live presence, and a conflict engine (collisions, removed targets, removed containers, missing dependencies) with side-by-side resolution and AI suggestions.', 'Studio → Patches → Conflicts'],
  ['**Isolated Preview** — test patches without affecting the published site', 'Every patch set can be opened on its own preview origin (`pvXXXX.shoplite.localhost`). Production visitors never see it.', 'Patch drawer → Isolated preview; Time machine'],
  ['**Automated Verification** — browser interactions and visual checks to find regressions before deployment', 'Playwright drives real Chromium on desktop and mobile: patches apply, console/network errors, accessibility (axe-core), pixel diffs with layout-shift awareness, blast-radius, and critical user flows compared against the live baseline. A red result blocks the release.', 'Studio → Verification'],
  ['**Versioned Deployment and Rollback** — track releases, detect failed changes, restore a working state', 'Immutable releases, canary rollout, promote, one-click rollback / restore, post-deploy smoke test, and telemetry-driven **auto-rollback**. A time machine replays every version of the site.', 'Studio → Releases'],
  ['**Audit Trail** — history of modifications, deployments, conflicts and reversions', 'Append-only log of every action, each sealed with a SHA-256 hash chain; integrity can be verified and tampering is detected.', 'Studio → Audit trail']
], [2900, 4638, 2100]));
add(H2('1.2 Going beyond the brief'));
add(...bullets([
  '**AI patch generator** — describe a change in plain English (“make this button green and rounded”) and get structured operations (Claude API; rule-based fallback offline).',
  '**AI conflict resolver** — suggests which side of a conflict to keep, with reasoning.',
  '**Drift watcher with auto-heal** — periodically checks the site, re-anchors moved patches, verifies them and ships a new release by itself.',
  '**Canary rollout and auto-rollback** — release to a percentage of visitors first; a failing release reverts itself.',
  '**Time machine** — scrub through every version of the live site exactly as visitors saw it.',
  '**Chrome extension** — apply patches on the real site origin (no proxy) and propose new ones from any page.',
  '**Tamper-evident audit chain** with a built-in tampering demonstration.',
  '**Blast-radius guard** and **layout-shift-aware visual diff** so legitimate changes do not trigger false alarms while destructive ones are caught.'
]));

/* 2 ---------------------------------------------------------------------- */
add(H1('2. Quick start'));
add(H2('2.1 Requirements'));
add(...bullets(['**Node.js 22.13 or newer** (Node 24 recommended). PATCHWORK uses the built-in `node:sqlite` module, so there is nothing to install for the database.', '**Google Chrome** (or Chromium). Preview URLs use `*.localhost` hostnames, which Chrome resolves automatically; Safari may not.', 'About 600 MB of free disk space (the Chromium used for verification is downloaded on first setup).', 'Optional: an Anthropic API key for Claude-powered AI features.']));
add(H2('2.2 Install and run'));
add(code(['cd Zorak', 'npm run setup      # first time only: installs dependencies + Chromium', 'npm start          # pre-flight checks, builds Studio if needed, starts everything']));
add(spacer(80));
add(P('Open **http://localhost:4000** in Chrome. The demo store (ShopLite) runs at **http://localhost:4100**. Press `Ctrl+C` in the terminal to stop both.'));
add(P('`npm start` runs a pre-flight check first and tells you in plain language if something is wrong: Node too old, dependencies missing, Chromium missing, or ports 4000/4100 already in use (with the exact command to free them).'));
add(table(['Command', 'What it does'], [
  ['`npm run setup`', 'Installs all packages and downloads Chromium for Playwright.'],
  ['`npm start`', 'Starts ShopLite (:4100) and PATCHWORK (:4000: Studio + API + proxy).'],
  ['`npm run dev`', 'As above plus the Vite dev server (:5173) for working on Studio.'],
  ['`npm run build`', 'Builds the Studio front-end into `studio/dist`.'],
  ['`npm run reset`', 'Deletes all data; the demo is re-seeded on next start. (Or use Overview → Demo controls → Reset demo data.)'],
  ['`npm run extension`', 'Copies the shared locator and runtime into the `extension/` folder.'],
  ['`npm run docs`', 'Regenerates this manual.'],
  ['`npm run test:all`', 'Runs every automated test (needs `npm start` running).']
], [2600, 7038], { boldFirst: true }));
add(H2('2.3 Your first sixty seconds'));
add(...steps([
  'Open Studio. You land on **Overview**: one release (v1) is live, two patches are waiting in review, three are drafts.',
  'Open a second tab with the **original** ShopLite cart: `http://localhost:4100/cart`. The checkout button is greyed out and misspelled (“Proceed to chekout”).',
  'Now open the same page **through PATCHWORK**: `http://shoplite.localhost:4000/cart`. The button is enabled and fixed — nothing on the original server changed.',
  'Back in Studio choose **Visual editor**, click the button on the canvas and watch the inspector fill with its details.'
]));
add(H2('2.4 Enabling Claude (optional)'));
add(P('Copy `.env.example` to `.env`, set `ANTHROPIC_API_KEY=` and restart. Studio’s sidebar then shows **Claude connected**. The default model is `claude-opus-5-5` (override with `PATCHWORK_MODEL`). Without a key, a transparent rule-based assistant handles common requests such as “hide this”, “make it green” or “change the text to “Buy now””.'));
add(H2('2.5 Installing the Chrome extension'));
add(...steps(['Run `npm run extension` once (it copies the latest runtime into the folder).', 'In Chrome open `chrome://extensions`, switch on **Developer mode**, click **Load unpacked** and choose the `extension` folder.', 'Open `http://localhost:4100/cart` (the real ShopLite). The toolbar badge shows the live release (for example “v1”) and the page is patched. See chapter 7.']));

/* 3 ---------------------------------------------------------------------- */
add(H1('3. Core concepts'));
add(table(['Term', 'Meaning'], [
  ['Site', 'A website PATCHWORK manages (name + origin). The prototype ships with ShopLite.'],
  ['Patch', 'One proposed fix: a title, a page scope (`/cart` or `*`), a **target** element and a list of **operations**. Patches have a lifecycle: draft → in review → approved → live (or rejected / reverted).'],
  ['Operation', 'A small reversible change: set text, set/remove an attribute, set a style, add/remove a class, hide an element, move it, insert an element, replace HTML, inject CSS, or run a script (admin-approved only).'],
  ['Target / fingerprint', 'Not just a CSS selector. When you pick an element PATCHWORK records its id, classes, attributes, text, surrounding context, ancestor chain, siblings and position — the evidence the tracker uses to find it again later.'],
  ['Runtime', 'A small script injected into the page that applies patches, reverts them cleanly, re-applies them if a framework re-renders, heals moved elements and reports telemetry.'],
  ['Proxy', 'A reverse proxy that serves the original site unchanged and injects the runtime plus the right patch set for the chosen view.'],
  ['Release', 'An immutable, numbered snapshot of a set of patches (v1, v2, …). Exactly one release is “live”; optionally one is running as a canary.'],
  ['Isolated preview', 'A view of the site with a chosen patch set applied, on its own origin, invisible to normal visitors.'],
  ['Verification', 'An automated comparison of baseline (current live site) against candidate (live + your patches) in real browsers, ending in pass / warn / fail.'],
  ['Canary', 'Releasing to a sticky random share of visitors before everyone.'],
  ['Drift', 'The site changing underneath existing patches (a redeploy by the site owner).'],
  ['Audit entry', 'One immutable, hash-chained record of who did what and when.']
], [2400, 7238], { boldFirst: true }));

/* 4 ---------------------------------------------------------------------- */
add(H1('4. Using Studio, screen by screen'));
add(P('Studio is a light, editorial interface. A theme toggle (sun/moon, bottom left) switches to a soft dark mode. The sidebar is grouped as **Workspace** (Overview, Visual editor, Patches), **Ship safely** (Verification, Releases) and **Operate** (Element tracking, Audit trail, Settings).'));
add(H2('4.1 The shell'));
add(...bullets([
  '**Site card** — the managed site and its live release badge (for example “v1”).',
  '**Review counter** — the number beside “Patches” is how many patches are waiting for a reviewer.',
  '**Presence** — teammates who are online appear under the nav; in the editor you see what they are working on (for example “Sam is editing ‘Rename CTA’”).',
  '**User switcher** — bottom left. The prototype has four demo people: Alex (admin), Jordan (reviewer), Sam and Riya (developers). Switch between them to experience the review workflow.',
  '**AI indicator** — shows whether Claude is connected or the rule-based fallback is active.'
]));
add(H2('4.2 Overview'));
add(P('The control room. A welcome banner with quick actions; four stat tiles (live patches, awaiting review, current release, production health); the **patch pipeline** (draft → in review → approved → live); **production health** (patch errors and self-heals in the last minute, with **Simulate traffic** and **Roll back**); an **element tracking** summary with **Run drift check**; recent activity from the audit trail; and **Demo controls**.'));
add(callout('Demo controls', ['**Site v1 (original)** / **Redeploy as v2** pretend that the site’s vendor ships a redesign you do not control (ids, classes and structure all change, but the bugs remain). **Reset demo data** wipes everything and re-seeds ShopLite.']));
add(H2('4.3 Visual editor'));
add(P('Three panes: **Patches** (layers) on the left, the **canvas** in the middle, the **Inspector** on the right, with an **AI bar** underneath the canvas.'));
add(H3('Creating a patch'));
add(...steps([
  'Choose the page with the pills above the canvas (/, /cart, /checkout).',
  'Stay in **Select** mode and click any element — including disabled buttons and links. A purple outline and a label (for example `button#checkout-btn 586×40`) confirm the selection. Use the **Parent / Child / ← / →** buttons in the inspector, or the `↑` `↓` keys, to walk the tree; `Esc` clears the selection.',
  'Change things in the Inspector. Everything previews instantly on the canvas and is listed under **Your patch** at the bottom of the inspector.',
  'Optionally name the patch, choose **This page** or **All pages**, then press **Save draft** or **Submit** (sends it straight to review).'
]));
add(H3('Inspector sections'));
add(table(['Section', 'What you can do'], [
  ['Content', 'Edit the element’s text (elements that contain child elements keep them; only their own text is replaced). **Hide this element** switch (reversible).'],
  ['Appearance', 'Text colour, background, font size, corner radius, opacity, weight, alignment, padding and margin.'],
  ['Attributes & behaviour', 'See every attribute; edit one, or remove it. A disabled element shows a one-click **Enable** button — exactly the fix for ShopLite’s broken checkout. Add new attributes.'],
  ['Advanced', 'Inject a custom CSS rule, replace inner HTML, insert a new element before/after/inside, or add a script (admins only; scripts need admin approval and are blocked by verification if they throw). Drag the **⠿** handle on the canvas to move an element.']
], [2300, 7338], { boldFirst: true }));
add(H3('Other editor controls'));
add(...bullets([
  '**Select / Browse** — Browse lets you use the site normally (click links, add to cart). Selecting is paused so the site’s own handlers run.',
  '**Device toggle** — desktop, tablet (820 px) and mobile (390 px) canvases.',
  '**Preview edits** — switch your unsaved changes off and on to compare before and after.',
  '**Layers (left)** — every patch; the eye icon overlays a patch on the canvas; clicking a layer re-opens it for editing. “This page / All” filters by page. Tracking status (for example “healed 84%”) is shown when known.',
  '**AI bar** — type a request and press **Generate**. With an element selected the operations are added to your draft; without one, the AI picks a target from a page outline. The result is labelled with the provider (Claude or rule-based) and an explanation.'
]));
add(callout('Tip — best targeting', 'For the most accurate fingerprints, select elements while no other patch layers are visible (the eyes are off by default). Then the recorded text and attributes are those of the original page.', WARN, 'FBF1DC'));
add(H2('4.4 Patches and review'));
add(P('A table of every patch with status, page scope, change summary, author, tracking state and age. Filter by status or search. Tick patches and choose **Verify** or **Build release** to carry the selection to those screens. Badges flag script patches and conflicts.'));
add(P('Click a row to open the **patch drawer**: description, the list of changes, the target fingerprint, tracking health, comments (with automatic system comments), the audit history of that patch, and the actions allowed for you.'));
add(table(['Status', 'Meaning', 'Who moves it on'], [
  ['Draft', 'Being worked on. Editing an approved/in-review patch sends it back here.', 'Author → Submit'],
  ['In review', 'Waiting for a second pair of eyes.', 'Reviewer/admin → Approve or Reject'],
  ['Approved', 'Eligible to be included in a release.', 'Reviewer/admin → Create release'],
  ['Live', 'Part of the currently deployed release. Cannot be edited or deleted.', 'Rollback → Reverted'],
  ['Rejected', 'Reviewer said no, or all of its changes lost a conflict.', 'Author may revise and resubmit'],
  ['Reverted', 'Was live but removed by a rollback or a newer release.', 'May be resubmitted']
], [1700, 5438, 2500], { boldFirst: true }));
add(P('Rules enforced by the server: reviewers cannot approve **their own** patches (four-eyes; admins may); patches containing scripts need an **admin**; live patches cannot be edited. **Isolated preview** opens a new tab on a preview origin that shows only this patch.'));
add(H2('4.5 Conflicts'));
add(P('The **Conflicts** tab lists clashes between patches. Each card shows both sides, with Keep-A, Keep-B, a custom merged value (for collisions) and **Ask AI**, which returns a recommendation and reasoning you can apply with one click. Resolving edits the losing patch (removing the clashing operation) and returns affected patches to draft for re-review. Everything is audited.'));
add(table(['Conflict', 'Detected when…', 'Severity'], [
  ['Collision', 'Two patches change the same property of the same element to different values (for example two different labels for one button).', 'High — blocks release'],
  ['Target removed', 'One patch hides/removes an element another patch modifies.', 'High — blocks release'],
  ['Container removed', 'One patch removes a container that holds the element patched by another.', 'Medium'],
  ['Missing dependency', 'A patch depends on one that is not part of the change set.', 'High — blocks release'],
  ['Duplicate', 'Two patches make the identical change.', 'Low']
], [2200, 5738, 1700], { boldFirst: true }));
add(H2('4.6 Verification'));
add(P('Pick the patches that make up your intended release (live patches are pre-ticked) and press **Run verification**. PATCHWORK opens the **baseline** (the live release) and the **candidate** (baseline plus your selection) side by side in real Chromium on desktop and mobile and compares them. Progress streams live; a run takes roughly 5–15 seconds.'));
add(table(['Check', 'What it proves', 'Fails when…'], [
  ['Patches apply cleanly', 'Every patch finds its element and runs without error.', 'Target not located confidently, or an operation throws.'],
  ['Critical user flows', 'Scripted journeys (ShopLite: add to cart → checkout → place order → confirmation) still work. Compared with the baseline.', 'A flow that worked now fails (regression). A flow that was broken and is now fixed is celebrated.'],
  ['Console & network', 'No new JavaScript errors or failed requests.', 'Any new page error or 4xx/5xx/failed request.'],
  ['Accessibility', 'axe-core (WCAG 2 A/AA) before vs after.', 'New serious/critical violations (minor ones warn). Fixed violations are reported.'],
  ['Visual regression', 'Pixel diff, ignoring the patched regions and compensating for vertical layout shift.', 'More than the configured share of unexpected pixels change (default: warn 2 %, fail 8 %).'],
  ['Blast radius', 'A patch must not hide or remove a huge part of the page.', 'A destructive change covers more than 25 % of the page.']
], [2300, 4238, 3100], { boldFirst: true }));
add(P('The result is a verdict — **Safe to release**, **Releasable with warnings**, or **Blocked** — followed by the checklist, patch tracking states, step-by-step flow traces (before vs after), and **visual evidence**: a before/after slider and a diff map (indigo = expected change inside a patched element, red = unexpected). Run history is kept on the left.'));
add(H2('4.7 Releases'));
add(H3('Building a release'));
add(P('The **release gate** has three lights: all patches approved; no conflicts; verification passed for **this exact set** (the set is fingerprinted by patch ids and revisions, so editing a patch after verifying invalidates the result). When all are green, add a note and press **Create release**. Only reviewers and admins can do this.'));
add(P('Admins can override a missing verification by giving a reason; the release is then permanently tagged “verification overridden” and the reason is stored in the audit trail.'));
add(H3('Deploying'));
add(...bullets([
  '**Deploy… → Full rollout** — everyone gets it now. A post-deploy **smoke test** runs your critical flows against the new release; a regression triggers an automatic rollback.',
  '**Deploy… → Canary** — choose 5–90 % of visitors (sticky per browser). The canary shows next to the live release with **Promote** and **Cancel canary**.',
  '**Roll back** — the live release is marked rolled back and the previous release (or the untouched original site) is live within seconds; pages already open pick it up without reloading. **Restore vN** brings any superseded version back.'
]));
add(H3('Auto-rollback'));
add(P('Visitors’ browsers report patch runtime errors. If a release produces more errors in a minute than the configured threshold (default 4), or fails its smoke test, PATCHWORK rolls it back by itself and records `release.auto_rollback` in the audit trail. Use **Overview → Simulate traffic** to generate visits on demand.'));
add(H2('4.8 Time machine'));
add(P('At the bottom of Releases. A slider with one stop per version (plus “Original”). Choosing a stop loads that version of the site, exactly as visitors saw it, in an iframe, with a diff list: patches added (green), changed, or removed (red) compared with the previous version. Use the page pills to look at other pages.'));
add(H2('4.9 Element tracking'));
add(P('Shows whether live patches are still attached to the right elements. **Run drift check** opens the original site (no patches) in real Chromium and asks the tracker where every live patch’s target is now. The result table lists status, confidence, which signals matched and which changed, and — when you expand a row — the old selector and text vs the new ones and the runner-up candidates.'));
add(table(['Status', 'Meaning'], [
  ['Exact match', 'Found right where it was recorded.'],
  ['Self-healed', 'Moved or renamed, but located with enough confidence to apply the patch (default ≥ 70 %).'],
  ['Needs review', 'Several plausible candidates (50–70 % or a near-tie). The patch is held back in production.'],
  ['Lost', 'No credible match. The patch is not applied and a lost-target event is recorded.']
], [2200, 7438], { boldFirst: true }));
add(P('**Re-anchor & release** makes healing permanent: PATCHWORK rewrites each healed patch’s target to its new location, verifies the result and ships it as a new release tagged `auto-heal`. If verification fails nothing is released. **Autopilot** (admins) can watch the site every 30 seconds and run the whole sequence automatically. A live telemetry list shows heal/orphan/error events reported by visitors’ browsers.'));
add(H2('4.10 Audit trail'));
add(P('A day-grouped timeline with filters (patches, releases, verification, health & tracking, site), an actor filter and search. Click an entry to see its hash, the previous hash and its JSON details. The banner at the top shows whether the **hash chain** is intact; **Verify integrity** re-computes it. For demos (admins), **Simulate tampering** silently edits an old record so the banner turns red and names the broken entry; **Restore** repairs the demo data.'));
add(H2('4.11 Settings'));
add(table(['Setting', 'Effect'], [
  ['Auto-rollback / error threshold', 'Arms automatic rollback and sets how many patch errors per minute trigger it.'],
  ['Telemetry poll', 'How quickly open pages pick up a deploy or rollback (1–15 s).'],
  ['Self-heal threshold / review floor', 'Confidence required to apply a patch to a moved element, and the floor of the “held for review” band.'],
  ['Pages to check', 'Paths loaded by verification (desktop and mobile).'],
  ['Visual thresholds', 'Warn/fail percentages for unexpected pixel change.'],
  ['Critical flows (JSON)', 'The user journeys that must keep working. Steps: `goto`, `click`, `fill`, `expectVisible`, `expectUrl`, `expectText`; selectors use Playwright syntax.'],
  ['Team & AI', 'Role summary and AI provider status.']
], [3000, 6638], { boldFirst: true }));
add(P('Settings are editable by admins only.'));

/* 5 ---------------------------------------------------------------------- */
add(H1('5. How it works'));
add(H2('5.1 Architecture'));
add(new Table({
  width: { size: W, type: WidthType.DXA }, columnWidths: [1900, 400, 2100, 400, 2000, 400, 2438],
  rows: [new TableRow({ children: [
    cell(['**Studio**', 'React app: editor, review, releases'], 1900, { fill: SOFT, border: ACCENT }), cell('→', 400, { border: 'FFFFFF' }),
    cell(['**PATCHWORK server**', 'API · SQLite · releases · audit · AI · verification worker'], 2100, { fill: SOFT, border: ACCENT }), cell('→', 400, { border: 'FFFFFF' }),
    cell(['**Patching proxy**', 'injects runtime + patch set'], 2000, { fill: SOFT, border: ACCENT }), cell('→', 400, { border: 'FFFFFF' }),
    cell(['**Original website**', 'never modified or rebuilt'], 2438, { fill: PAPER })
  ] })]
}));
add(spacer(100));
add(P('Visitors (and Studio’s canvas) reach the site **through the proxy**. The proxy fetches the original page, removes headers that would block embedding (CSP, X-Frame-Options), and injects the shared locator, the runtime and the chosen patch set. The runtime applies patches in the browser. Because the original is never changed, **nothing is rebuilt or redeployed**, and removing PATCHWORK returns the site to exactly how it was.'));
add(H2('5.2 Views are encoded in the hostname'));
add(P('Each view of a site has its own origin, so cookies and local storage never leak between production, previews and the editor.'));
add(table(['Hostname', 'What you see'], [
  ['`shoplite.localhost:4000`', 'Production: the live release (or the canary, depending on the visitor’s sticky bucket).'],
  ['`none.shoplite.localhost:4000`', 'The original site with no patches.'],
  ['`rel2.shoplite.localhost:4000`', 'Release version 2 (used by the time machine and post-deploy smoke tests).'],
  ['`pv3fa9bc.shoplite.localhost:4000`', 'An isolated preview of a saved patch set.'],
  ['`edit.none.shoplite.localhost:4000`', 'The editor canvas: original site plus the editor overlay (a capture layer, hover/selection boxes, drag handle).']
], [3700, 5938], { boldFirst: true }));
add(H2('5.3 What a patch looks like'));
add(code([
  '{',
  '  "id": "p_38200522", "page": "/cart", "title": "Enable the checkout button",',
  '  "target": {',
  '    "tag": "button", "id": "checkout-btn", "classes": ["btn", "btn-primary"],',
  '    "attrs": { "data-testid": "checkout", "aria-label": "Proceed to checkout", "type": "button" },',
  '    "text": "Proceed to chekout", "context": "Order summary Subtotal $129 …",',
  '    "ancestors": [{ "tag": "div", "classes": ["cart-summary"] }, …],',
  '    "siblings": { "prev": { "tag": "div" }, "next": { "tag": "a" } },',
  '    "bbox": { "x": 820, "y": 610, "w": 300, "h": 40 }, "selector": "#checkout-btn"',
  '  },',
  '  "ops": [ { "type": "setAttr", "name": "disabled", "value": null } ]',
  '}'
]));
add(spacer(80));
add(P('Operations are applied **reversibly**: before changing anything the runtime records how to undo it. That is what makes instant rollback, the editor’s preview toggle and release switching without a page reload possible. Styles are applied with `!important`, so they win over the site’s own CSS; a MutationObserver re-applies patches if a framework re-renders the element.'));
add(H2('5.4 The element tracker'));
add(P('When a patch is applied the locator scores **every plausible element** on the page against the stored fingerprint. Each signal produces a similarity between 0 and 1; the score is the weighted average over the signals that were available when the patch was made.'));
add(table(['Signal', 'Weight', 'Notes'], [
  ['Text', '0.30', 'Levenshtein + token overlap + containment. Tolerates typos and small edits (“Proceed to chekout” ≈ “Proceed to chekout →”).'],
  ['id / test-id', '0.20 if equal, 0.03 if not', 'Strong evidence when equal, deliberately weak when changed (ids are volatile).'],
  ['Attributes', '0.15', 'aria-label, type, name, placeholder, title, alt, role, href…'],
  ['Structure', '0.10', 'Tag, id and classes of the parent chain, weighted towards the nearest parents.'],
  ['Tag / role', '0.10', 'button ≈ link ≈ role=button; heading levels are interchangeable.'],
  ['Context', '0.08', 'Text of the surrounding container (distinguishes repeated “Add to cart” buttons).'],
  ['Classes, siblings', '0.05 each', 'Ignores generated class names (hashed, css-in-js).'],
  ['Position', '0.04', 'Distance between rendered positions (only for similar viewport widths).'],
  ['Old selector', '0.03', 'Bonus if the stored selector still matches that element.']
], [2200, 2400, 5038], { boldFirst: true }));
add(P('The best candidate’s score is then lifted when it is a clear winner over the runner-up. The result maps to a status: ≥ 97 % with the old selector still valid = **exact**; ≥ 70 % = **healed**; 50–70 % or a near tie = **needs review** (held back in production, applied in previews); lower = **lost**.'));
add(callout('Worked example — ShopLite v1 → v2', ['The vendor’s redesign renamed `#checkout-btn` to `#pay-cta`, replaced the classes `btn btn-primary` with `ui-btn ui-btn--cta`, removed `data-testid`, moved the button inside a new `aside.order-summary` and changed the label to “Proceed to chekout →”.', 'The tracker still finds it: text ≈ 0.9, aria-label equal, `type` equal, same tag, similar context — confidence **84 %**, status **self-healed**, matched on text + attributes + tag, changed: id, classes, selector. After **Re-anchor & release**, the patches track at 100 % again.']));
add(H2('5.5 Conflict engine'));
add(P('Pure data, no browser needed. For every pair of patches on overlapping pages it decides whether the targets are the same element (identical selector, or fingerprint similarity ≥ 0.82), then compares **footprints**: each operation touches a key such as `content`, `attr:disabled`, `style:color`, `class:active`, `position` or `remove`. Same key, different values → collision. A removal against any other key on the same target → target removed. A removed container (identified from the ancestor chain) → container removed. The same code runs in the browser, the server and the Chrome extension.'));
add(H2('5.6 Verification pipeline'));
add(...steps([
  'Create a preview token for the candidate patch set; pick the baseline (live release, or the original site if none).',
  'For each page and viewport, load baseline and candidate in separate fresh browser contexts in parallel; wait for the runtime to finish applying patches.',
  'Capture console errors, failed requests, runtime patch states (status, confidence, bounding boxes), an axe-core scan and a full-page screenshot.',
  'Diff screenshots with pixelmatch. Differences inside padded patched regions are “expected”. If many pixels differ outside them, search for the vertical offset that best re-aligns the lower part of the page (so a banner that pushes content down is not flagged), and count only what still differs.',
  'Run each critical flow on baseline and candidate; compare step by step.',
  'Aggregate into checks and a verdict; store screenshots and the report; write an audit entry.'
]));
add(H2('5.7 Release lifecycle'));
add(code(['staged ──deploy──▶ live ──newer release──▶ superseded', '   │                 │                        │', '   └─ canary ─promote┘         rollback ▼        └─ restore ─▶ live', '                          rolled_back (note records the reason)']));
add(spacer(80));
add(P('Each release stores a full snapshot of its patches, so it can never change after the fact. Deploying updates patch statuses (live / reverted). A background health monitor evaluates telemetry every few seconds; a post-deploy smoke test runs right after each deploy. Both can trigger an **auto-rollback** attributed to “PATCHWORK”.'));
add(H2('5.8 The audit chain'));
add(P('Each audit row stores `hash = SHA-256(previous_hash | site | actor | type | summary | payload | timestamp)`. Altering or deleting any past row breaks its own seal and every seal after it, so `Verify integrity` pinpoints the first modified entry. This is tamper-**evident** (not tamper-proof): in production the head hash would also be anchored somewhere external.'));
add(H2('5.9 Security notes and honest limitations'));
add(...bullets([
  'Roles are demonstration-level: Studio trusts the selected user. A production system would add real authentication and SSO.',
  'Script patches (`injectJS`) run with page privileges. They require admin approval and are blocked by verification if they throw; a real deployment would also sandbox them and use CSP nonces.',
  'The proxy removes CSP and frame headers so the editor can embed sites; in production, the SDK/edge integration would be used instead and CSP kept.',
  'WebSockets and some heavily protected sites are not proxied in the prototype. The Chrome extension covers the real-origin case.',
  'Verification quality depends on the pages and flows you configure — it is a safety net, not a proof.'
]));
add(H2('5.10 Repository layout'));
add(table(['Path', 'Contents'], [
  ['`server/src/`', '`index.js` (boot), `proxy.js`, `routes.js`, `store.js`, `releases.js`, `verify.js`, `drift.js`, `conflicts.js`, `audit.js`, `ai.js`, `seed.js`, `db.js`, `bus.js`, `users.js`'],
  ['`shared/core.cjs`', 'Fingerprinting, scoring, locator, conflict detection (UMD: used in browser and Node).'],
  ['`runtime/`', '`runtime.js` (patch applier) and `editor.js` (visual-editor overlay).'],
  ['`studio/src/`', '`pages/*` (Overview, Editor, Patches, Verify, Releases, Tracking, Audit, Settings), `ctx.tsx`, `api.ts`, `ui.tsx`, `styles.css`.'],
  ['`demo-site/`', 'ShopLite storefront with v1/v2 templates and an admin endpoint to switch versions.'],
  ['`extension/`', 'Chrome MV3 extension (background, content, panel, popup).'],
  ['`scripts/`', '`start.mjs`, test suites, screenshot and build helpers.'],
  ['`data/`', 'SQLite database and verification artifacts (created at run time).']
], [2800, 6838], { boldFirst: true }));

/* 6 ---------------------------------------------------------------------- */
add(H1('6. Roles and permissions'));
add(table(['Capability', 'Developer', 'Reviewer', 'Admin'], [
  ['Create, edit, submit, withdraw patches; comment', '✓', '✓', '✓'],
  ['Resolve conflicts', '✓', '✓', '✓'],
  ['Run verification, simulate site redeploys', '✓', '✓', '✓'],
  ['Approve or reject patches (not their own)', '—', '✓', '✓ (own too)'],
  ['Approve patches that contain scripts; add scripts', '—', '—', '✓'],
  ['Create releases, deploy, canary, promote, roll back, re-anchor & release', '—', '✓', '✓'],
  ['Override failed/missing verification (with recorded reason)', '—', '—', '✓'],
  ['Change settings, reset demo, tamper demo', '—', '—', '✓']
], [4838, 1500, 1500, 1800]));
add(P('The demo users: **Alex Dsouza** (admin), **Jordan Lee** (reviewer), **Sam Rivera** and **Riya Shah** (developers).', { p: { spacing: { before: 120, after: 120 } } }));

/* 7 ---------------------------------------------------------------------- */
add(H1('7. The Chrome extension'));
add(P('The proxy is the most powerful way to use PATCHWORK, but sometimes you want to see patched sites in your own browser, on the **real** origin. The extension does that: for any site registered in PATCHWORK (for the demo, ShopLite at `http://localhost:4100`), it fetches the live release and runs the same runtime and tracker in the page.'));
add(H2('7.1 Using it'));
add(...steps([
  'Load it as described in section 2.5. Visit `http://localhost:4100/cart`: the badge shows the release (“v1”) and the page is patched.',
  'Click the toolbar icon. The popup shows the release, how many patches applied, how many self-healed and how many need attention; **Edit this page** opens the mini editor.',
  'In the mini editor click an element, change its text, colours or size, **Enable** it if disabled, or hide it. The change previews live. Add a title and press **Save draft patch** — it appears in Studio as a draft by the user selected under **Connection**.',
  'Under **Connection** you can change the server URL and “Acting as” user, or switch patching off with the toggle.'
]));
add(H2('7.2 How it works'));
add(...bullets(['A content script asks the background worker whether this origin is managed. The worker (not the page, so no CORS or mixed-content problems) calls the PATCHWORK API and injects the locator and runtime into the page’s isolated world.', 'The runtime polls through the worker, so a deploy or rollback updates open tabs within a few seconds. Heal/orphan/error telemetry flows back the same way.', 'Sites that are not registered are left completely untouched.']));

/* 8 ---------------------------------------------------------------------- */
add(H1('8. Demo playbook (about 7 minutes)'));
add(P('This script tells the product’s story in the order that builds the most tension. Each step has **Do** (clicks) and **Say** (talking points). Before you start: run `npm start`, open Studio in Chrome, open `http://localhost:4100/cart` in a second tab, and use **Overview → Reset demo data** for a clean slate.'));
const demo = [
  ['1. The problem (45 s)', ['**Do:** In the ShopLite tab, add a product and open the cart. Point at the greyed-out “Proceed to chekout” button.', '**Say:** “A deployment shipped a disabled checkout button and a typo. Customers can’t pay. The original developers are gone and a full rebuild takes days. PATCHWORK fixes it live.”']],
  ['2. Visual patch (60 s)', ['**Do:** Visual editor → /cart → click the button → Attributes & behaviour → **Enable**; edit the text to “Proceed to checkout”. Watch the canvas change instantly. **Submit**.', '**Say:** “No code, no deploy. The change is a tiny reversible patch with a fingerprint of the element — not just a selector.”']],
  ['3. Review and collaboration (45 s)', ['**Do:** Switch user to **Jordan** (sidebar). Patches → open the patch → **Approve**. Try approving as the author to show the four-eyes rule.', '**Say:** “Patches are reviewed by a second person. Scripts need an admin.”']],
  ['4. Conflict (45 s)', ['**Do:** Patches → **Conflicts**. Show “Fix chekout typo” vs “Rename CTA to Secure checkout”. Click **Ask AI**, then **Apply**.', '**Say:** “Two developers changed the same label. PATCHWORK detects it before anything ships and helps resolve it.”']],
  ['5. Verification (75 s)', ['**Do:** Verification → tick the approved patches plus the draft **Hide order summary (experiment)** → Run. Show the red **Blocked** verdict and the failed critical flow. Untick it, run again → **Safe to release**; open the before/after slider.', '**Say:** “A real browser tests the live site against the candidate. A patch that hides the order summary would have killed checkout — it never reaches production.”']],
  ['6. Release (45 s)', ['**Do:** Releases → build → **Create release** → **Deploy… → Canary 40 %** → **Promote**.', '**Say:** “Immutable versions, gradual rollout, instant rollback.”']],
  ['7. The wow — the site changes under us (90 s)', ['**Do:** Overview → **Redeploy as v2**. Reload the live site (`shoplite.localhost:4000/cart`): still fixed. Element tracking → **Run drift check** → show “Self-healed 84 %” and the old vs new selector → **Re-anchor & release**.', '**Say:** “The vendor redesigned the site: new ids, new classes, new structure. A normal selector-based hotfix would be dead. Our tracker matched on text, attributes and structure and re-attached itself, then verified and shipped a new release.”']],
  ['8. Disaster and recovery (60 s)', ['**Do:** Switch to Alex. Approve **Checkout analytics hook** (a script that throws), create a release with **admin override**, deploy, then Overview → **Simulate traffic**. Watch the release roll itself back; open Audit trail.', '**Say:** “Even if a bad change slips through, production heals itself and the audit trail records why.”']],
  ['9. Trust (30 s)', ['**Do:** Audit trail → **Verify integrity** → **Simulate tampering** → the banner turns red and names the entry.', '**Say:** “Every action is hash-chained. History cannot be quietly rewritten.”']],
  ['10. Bonus (30 s)', ['**Do:** Click the extension icon on the real ShopLite page → the real origin is patched, no proxy; show Edit this page.', '**Say:** “Same engine, in the browser.”']]
];
demo.forEach(([t, lines]) => { add(H3(t)); add(...lines.map((l) => P(l))); });
add(callout('If something goes wrong', ['**Port in use / blank page:** stop with `Ctrl+C`, run `npm start` again.', '**Previews don’t load:** use Chrome (`*.localhost`).', '**State got messy:** Overview → Reset demo data (or `npm run reset` and restart).', '**No internet / no API key:** AI features fall back to the rule-based assistant — say so; everything else is unaffected.'], BAD, 'FBE9EC'));
add(H2('8.1 What the seeded data demonstrates'));
add(table(['Patch', 'Author · status', 'Purpose in the demo'], [
  ['Enable the checkout button', 'Alex · live (v1)', 'The core fix: removes `disabled`.'],
  ['Fix “chekout” typo', 'Alex · live (v1)', 'Text change; part of the collision.'],
  ['Hero button contrast', 'Riya · in review', 'Accessibility fix (WCAG contrast) — shows up as “fixed” in verification.'],
  ['Free-shipping banner', 'Riya · draft', 'Inserted element; page-wide; pushes content down (layout-shift-aware diff).'],
  ['Rename CTA to “Secure checkout”', 'Sam · in review', 'Collides with the typo fix.'],
  ['Hide order summary (experiment)', 'Sam · draft', 'Dangerous: container removal conflict + fails verification (blast radius, checkout flow).'],
  ['Checkout analytics hook', 'Sam · draft', 'A script that throws: admin-only approval, blocked by verification, triggers auto-rollback if forced out.']
], [3000, 2200, 4438], { boldFirst: true }));

/* 9 ---------------------------------------------------------------------- */
add(H1('9. Testing and quality'));
add(P('With `npm start` running, `npm run test:all` executes four suites against the real stack and real browsers:'));
add(table(['Suite', 'Covers'], [
  ['`scripts/test-core.mjs`', 'Live patching through the proxy; healing after the v2 redeploy; drift watcher; verification passes a good set and blocks a dangerous patch and a throwing script; release gate.'],
  ['`scripts/test-editor.mjs`', 'The visual editor in a browser: loading the canvas, selecting a **disabled** element, live preview of attribute and text edits, saving a patch.'],
  ['`scripts/test-story.mjs`', 'The entire demo storyline: roles and four-eyes, conflicts and AI suggestion, verify, canary and promote, vendor redeploy, auto-heal release, bad release and auto-rollback, audit chain and tamper detection.'],
  ['`scripts/test-extension.mjs`', 'Loads the extension into Chromium; patches the real origin; saves a draft from the mini editor.']
], [3200, 6438], { boldFirst: true }));

/* 10 --------------------------------------------------------------------- */
add(H1('10. Troubleshooting'));
add(table(['Symptom', 'Likely cause and fix'], [
  ['`npm start` says a port is in use', 'An earlier run is still alive. `lsof -ti :4000 | xargs kill` (and `:4100`), then start again.'],
  ['“Node … is too old”', 'Install Node 22.13+ (24 recommended).'],
  ['“Chromium is missing”', 'Run `npx playwright install chromium`.'],
  ['Studio loads but a preview/canvas is blank or “can’t be reached”', 'Use Chrome. `*.localhost` hostnames resolve there automatically. Check the ShopLite process is running on :4100.'],
  ['Verification errors immediately', 'Chromium not installed, or the site origin is unreachable. Check the terminal output.'],
  ['AI says “rule-based fallback”', 'No `ANTHROPIC_API_KEY` in `.env`, or the key is invalid; the message under the AI bar shows the error. The feature still works in simple form.'],
  ['A patch shows “Needs review” or “Lost”', 'The element changed too much. Open the patch in the editor, re-select the element and save; or loosen the thresholds in Settings.'],
  ['Everything looks stale after rebuilding Studio', 'Hard-reload the page (`Cmd+Shift+R`).'],
  ['Want a clean slate', 'Overview → Reset demo data, or `npm run reset` and restart.']
], [3300, 6338], { boldFirst: true }));

/* 11 --------------------------------------------------------------------- */
add(H1('11. API reference (essentials)'));
add(P('Base path `/api`. Send `x-pw-user: alex|jordan|sam|riya` to act as a user. All responses are JSON; errors look like `{ "error": "message" }`. Live updates stream from `GET /api/stream` (server-sent events).'));
add(table(['Method & path', 'Purpose'], [
  ['`GET /sites/:id`', 'Site, status counts, live/canary release, health.'],
  ['`GET/POST /sites/:id/patches`', 'List / create patches.'],
  ['`PUT/DELETE /patches/:id`', 'Edit (returns to draft) / delete.'],
  ['`POST /patches/:id/submit | approve | reject | withdraw`', 'Review workflow.'],
  ['`GET /sites/:id/conflicts?ids=…`', 'Conflicts for the whole site or a candidate set.'],
  ['`POST /conflicts/resolve | suggest`', 'Resolve (keepA / keepB / custom) or ask the AI.'],
  ['`POST /sites/:id/previews`', 'Create an isolated preview URL for a patch set.'],
  ['`POST /sites/:id/verify`, `GET /verifications/:id`', 'Start and read a verification run.'],
  ['`POST /sites/:id/releases`', 'Create a release (gate enforced; admin override allowed).'],
  ['`POST /releases/:id/deploy | promote`', 'Deploy (full or `{ canaryPct }`) or promote a canary.'],
  ['`POST /sites/:id/rollback`', '`{ toVersion?, reason?, canaryOnly? }`.'],
  ['`POST /sites/:id/drift/run | heal`, `GET /sites/:id/drift`', 'Drift check; re-anchor and release; latest report.'],
  ['`GET /audit`, `GET /audit/verify`', 'Audit entries; hash-chain verification.'],
  ['`POST /ai/patch`', 'Generate operations from a request.'],
  ['`GET /ext/site?origin=…`', 'Used by the Chrome extension to fetch the live release for an origin.']
], [4300, 5338]));

/* 12 --------------------------------------------------------------------- */
add(H1('12. Questions judges may ask'));
const qa = [
  ['How is this different from a browser extension that injects CSS, or a tag manager?', 'Those apply changes blindly and break silently. PATCHWORK adds a **process** (review, conflict detection), **proof** (real-browser verification against the live baseline), **resilience** (self-healing element tracking) and **recovery** (immutable releases, canary, auto-rollback, audit).'],
  ['What happens when the site is redeployed and element ids change?', 'The tracker does not rely on selectors. It scores candidates on text, attributes, structure, context and more. Confident matches self-heal; ambiguous ones are held back and flagged; Re-anchor & release makes the new locations permanent after verification. We demonstrate it live with ShopLite v2 (84 % confidence).'],
  ['Why not just edit the source code?', 'Often there is no access, no pipeline, or the people are gone — and a rebuild is slow and risky. PATCHWORK is also a path back to code: patches are structured, so they can be exported as pull requests (roadmap).'],
  ['How do you prevent a bad patch from taking production down?', 'Five layers: four-eyes review, conflict blocking, verification (flows, console, a11y, visual, blast-radius), canary rollout with post-deploy smoke test, and telemetry-driven auto-rollback. Every step is audited.'],
  ['Is it secure? What about script patches?', 'Script patches need admin approval and verification; roles and sandboxing would be hardened for production (see section 5.9). The runtime only operates on registered sites.'],
  ['Does verification slow developers down?', 'A run takes seconds, runs desktop and mobile in parallel, and replaces manual QA. Admins can override with a recorded reason for emergencies.'],
  ['How does the AI help — and what if it is wrong?', 'It drafts patches and conflict resolutions as structured operations (never free-form code). Everything the AI proposes goes through the same preview, review and verification as a human’s change.'],
  ['Could this scale?', 'The model is stateless at the edge (patch set + runtime) and the heavy work (verification) is a queue of independent browser jobs; storage can move from SQLite to Postgres, the proxy to a CDN edge worker or SDK.']
];
qa.forEach(([q, a]) => { add(H3(q)); add(P(a)); });

/* 13 --------------------------------------------------------------------- */
add(H1('13. Roadmap and glossary'));
add(H2('13.1 What we would build next'));
add(...bullets([
  '**Patch → pull request export** for sites whose source is available.',
  '**Edge/SDK deployment** (a one-line script tag or CDN worker) in place of the proxy; keep CSP intact with nonces.',
  '**Real identity**, per-site permissions and SSO; signed audit anchors.',
  '**Visual critical-flow recorder** so non-engineers can define flows.',
  '**Semantic matching with embeddings** as an additional tracker signal, and cross-browser verification (Firefox, WebKit).',
  '**Slack/GitHub integrations** and scheduled drift reports.'
]));
add(H2('13.2 Glossary'));
add(table(['Term', 'Definition'], [
  ['Baseline / candidate', 'The current live site / the live site plus proposed patches.'],
  ['Blast radius', 'How much of a page a patch can affect.'],
  ['Canary', 'Partial rollout to a share of visitors.'],
  ['Drift', 'The site changing independently of your patches.'],
  ['Fingerprint', 'The multi-signal description of an element recorded with a patch.'],
  ['Four-eyes', 'The rule that a second person must approve a change.'],
  ['Hash chain', 'Records sealed with a hash of the previous record, making edits detectable.'],
  ['Layer', 'A patch shown as an overlay in the editor.'],
  ['Self-heal', 'Automatically re-locating a moved element above the confidence threshold.'],
  ['Smoke test', 'A quick check of critical flows right after deployment.']
], [2600, 7038], { boldFirst: true }));

/* --------------------------------------------------------------- assemble */
const doc = new Document({
  features: { updateFields: true }, creator: 'PATCHWORK team', title: 'PATCHWORK — Feature & Instruction Manual', description: 'Manual for the PATCHWORK hackathon prototype',
  styles: {
    default: { document: { run: { font: SANS, size: 21, color: INK } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: SERIF, size: 44, bold: true, color: INK }, paragraph: { spacing: { before: 0, after: 200 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 8 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: SERIF, size: 30, bold: true, color: ACCENT }, paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: SANS, size: 23, bold: true, color: INK }, paragraph: { spacing: { before: 220, after: 80 }, outlineLevel: 2 } }
    ]
  },
  numbering: { config: [
    { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } }, run: { color: ACCENT } } }, { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1000, hanging: 270 } } } }] },
    ...numberingRefs.map((ref) => ({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 340 } }, run: { bold: true, color: ACCENT } } }] }))
  ] },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children: cover },
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1300, bottom: 1200, left: 1134, right: 1134 } } },
      headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: 'PATCHWORK', font: SERIF, bold: true, size: 18, color: ACCENT }), new TextRun({ text: '   Feature & Instruction Manual', font: SANS, size: 18, color: MUTED })], border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 6 } } })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: W }], children: [new TextRun({ text: 'Hotfix the Internet', font: SANS, size: 17, color: MUTED }), new TextRun({ text: '\tPage ', font: SANS, size: 17, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], font: SANS, size: 17, color: MUTED })] })] }) },
      children: [
        new Paragraph({ children: [new TextRun({ text: 'Contents', font: SERIF, size: 44, bold: true })], spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 8 } } }),
        new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }),
        ...body
      ]
    }
  ]
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(__dirname, 'PATCHWORK_Manual.docx');
  fs.writeFileSync(out, buf); console.log('wrote', out, (buf.length / 1024).toFixed(0) + ' KB');
});
