// Generates docs/PATCHWORK_Demo_Guide.docx  —  run with:  npm run docs
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const { D, ACCENT, INK, MUTED, SOFT, LINE, PAPER, GOOD, WARN, BAD, SERIF, SANS, MONO, W, numberingRefs, runs, P, H1, H2, H3, bullets, steps, spacer, cell, table, callout, code, border, borders } = L;
const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, WidthType, BorderStyle, LevelFormat, TableOfContents, Footer, Header, PageNumber, TabStopType } = D;

const body = [];
const add = (...x) => x.forEach((e) => (Array.isArray(e) ? body.push(...e) : body.push(e)));

/* a feature "card": label column + text column */
function card(title, rows) {
  const widths = [1750, W - 1750];
  return [
    new Paragraph({ children: [new TextRun({ text: title, font: SERIF, bold: true, size: 28, color: ACCENT })], spacing: { before: 280, after: 80 }, keepNext: true, heading: D.HeadingLevel.HEADING_2 }),
    new Table({
      width: { size: W, type: D.WidthType.DXA }, columnWidths: widths,
      rows: rows.map(([k, v], i) => new TableRow({ cantSplit: true, children: [cell(k, widths[0], { fill: SOFT, bold: true, color: ACCENT, border: LINE }), cell(v, widths[1], { fill: i % 2 ? PAPER : undefined })] }))
    })
  ];
}
/* a demo scene: header band + Do / Say / Proof rows */
function scene(num, title, time, rows) {
  const widths = [1100, W - 1100];
  return [
    new Paragraph({ keepNext: true, spacing: { before: 300, after: 80 }, heading: D.HeadingLevel.HEADING_3, children: [new TextRun({ text: `Scene ${num} · ${title}`, font: SANS, bold: true, size: 25 }), new TextRun({ text: `    ${time}`, font: SANS, color: MUTED, size: 20 })] }),
    new Table({
      width: { size: W, type: D.WidthType.DXA }, columnWidths: widths,
      rows: rows.map(([k, v]) => new TableRow({ cantSplit: true, children: [cell(k, widths[0], { fill: k === 'DO' ? SOFT : k === 'SAY' ? 'E6F5EE' : 'FBF1DC', bold: true, color: k === 'DO' ? ACCENT : k === 'SAY' ? GOOD : WARN }), cell(v, widths[1])] }))
    })
  ];
}

/* ------------------------------------------------------------------ cover */
const cover = [
  L.spacer(2600),
  new Paragraph({ children: [new TextRun({ text: 'PATCHWORK', font: SERIF, size: 96, bold: true, color: INK })], spacing: { after: 60 } }),
  new Paragraph({ children: [new TextRun({ text: 'Feature & Demo Guide', font: SERIF, size: 52, italics: true, color: ACCENT })], spacing: { after: 360 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 14 } } }),
  new Paragraph({ children: [new TextRun({ text: 'Everything you need to understand every feature — and to show it with confidence.  (PATCHWORK prototype v1.0.3 · 11 October 2026)', font: SANS, size: 26, color: MUTED })], spacing: { before: 300, after: 1200 } }),
  table(['Inside', ''], [
    ['1', 'The 30-second pitch and the numbers to remember'], ['2', 'Every feature in plain English, with what to click and what to say'],
    ['3', 'Setting up before you go on stage (one command)'], ['4', 'The main demo script — 10 scenes, about 8 minutes'],
    ['5', '3-minute and 12-minute versions'], ['6', 'If something goes wrong'], ['7', 'Questions judges ask, with answers'], ['8', 'One-page click cheat-sheet']
  ], [800, 8838], { boldFirst: true })
];

/* ------------------------------------------------------------------ 1 */
add(L.H1('1. Start here', false));
add(L.H2('The idea in one breath'));
add(L.callout('PATCHWORK is “git for hotfixes, with a seatbelt”.', ['When a live website breaks and nobody can rebuild it, PATCHWORK lets you fix it from a visual editor **without touching the original site**. Every fix is a small reversible patch that is **reviewed, tested in a real browser, released as a numbered version** and can be **undone in one click** — and it **keeps working even when the site is redesigned underneath it**.']));
add(L.spacer(120));
add(L.H2('The 30-second pitch (memorise this)'));
add(L.P('“Imagine your checkout button breaks after a deployment and the original developers are gone. Rebuilding and redeploying the whole app for one small fix is slow and risky. PATCHWORK sits in front of the website and lets a developer fix it visually, in minutes — no rebuild. But we didn’t stop at editing. Every patch goes through review, is verified in a real browser against the live site, ships as a versioned release with canary rollout, and rolls itself back if something goes wrong. And when the site changes under our patches, our element tracker finds the moved elements and heals them automatically.”', { run: { italics: true } }));
add(L.H2('Numbers worth remembering'));
add(table(['Number', 'What it means', 'Where you will see it'], [
  ['**0**', 'lines of the original site’s code changed or redeployed', 'Whole demo — the store on :4100 stays broken the entire time'],
  ['**84 %**', 'locator confidence in the ShopLite demo, when the checkout button re-attached after the v2 redesign (new ids, classes, structure) — a figure from this one scenario, not a benchmark', 'Scene 7, Element tracking'],
  ['**7 types**', 'of automated check in each verification run (patch apply, critical flows, console, network, accessibility, visual, blast radius — desktop and mobile; the count of individual checks grows with pages and patches)', 'Scene 5, Verification'],
  ['**~8 s**', 'a full verification run in two real browsers', 'Scene 5'],
  ['**6 / 6**', 'requirements in the problem statement covered, plus six extras', 'Pitch close'],
  ['**SHA-256**', 'every action sealed in a hash chain — edits to history are detected', 'Scene 9, Audit trail']
], [1500, 5038, 3100]));
add(L.H2('How the pieces fit — the picture to draw on a whiteboard'));
add(new Table({
  width: { size: W, type: D.WidthType.DXA }, columnWidths: [1500, 350, 1700, 350, 1700, 350, 1700, 350, 1638],
  rows: [new TableRow({ children: [
    cell(['**Developer**', 'edits visually'], 1500, { fill: SOFT, border: ACCENT }), cell('→', 350, { border: 'FFFFFF' }),
    cell(['**Review**', 'second person approves'], 1700, { fill: SOFT, border: ACCENT }), cell('→', 350, { border: 'FFFFFF' }),
    cell(['**Verify**', 'real browser tests'], 1700, { fill: SOFT, border: ACCENT }), cell('→', 350, { border: 'FFFFFF' }),
    cell(['**Release**', 'v1, v2… canary'], 1700, { fill: SOFT, border: ACCENT }), cell('→', 350, { border: 'FFFFFF' }),
    cell(['**Live site**', 'patched through the proxy'], 1638, { fill: PAPER })
  ] })]
}));
add(L.spacer(100));
add(L.P('Underneath all of it: the **element tracker** (keeps patches attached), the **audit chain** (records everything) and **auto-rollback** (undoes failures). The original website is never modified.'));

/* ------------------------------------------------------------------ 2 */
add(L.H1('2. Every feature in plain English'));
add(L.P('Each card answers five questions: what is it, why does it matter, how do I show it, what do I say, and what is really happening underneath (for when someone asks).'));

add(card('2.1 Visual patching', [
  ['What it is', 'A point-and-click editor on top of the live website. Click any element — button, heading, link, even a disabled button — and change its text, colour, size, attributes, visibility or position.'],
  ['Why it matters', 'This is requirement #1 and the first thing judges try. Fixing a site without code or a rebuild is the whole promise.'],
  ['Show it', 'Studio → **Visual editor** → pick `/cart` → click the greyed-out checkout button → Inspector → **Attributes & behaviour** → **Enable**. Watch the button light up on the canvas instantly. Change the text in **Content**.'],
  ['Say it', '“No code, no deploy. The button comes alive the moment I click Enable — and nothing is published until it has been reviewed and verified.”'],
  ['Underneath', 'Each control adds one small structured operation (for example `setAttr disabled → null`). Operations are applied reversibly in the browser, so they can be previewed, toggled and undone.']
]));
add(card('2.2 AI assistant', [
  ['What it is', 'A text box under the canvas: describe a change in plain English and PATCHWORK turns it into operations.'],
  ['Why it matters', 'Shows modern thinking and makes non-developers productive. It is never trusted blindly: AI output goes through the same review and verification as anything else.'],
  ['Show it', 'Select the “Continue shopping” link, type **make it blue and bold**, press **Generate**. The change previews instantly with an explanation.'],
  ['Say it', '“The AI can only produce our small, safe vocabulary of operations — never free-form code — so it can’t sneak anything past the safety net.”'],
  ['Underneath', 'With an Anthropic API key it calls Claude with a strict JSON schema. **Without a key (the current default) it uses a simple keyword assistant** — be honest about that if asked. Prompts that work well in fallback mode: “make it blue and bold”, “hide this”, “change the text to "Keep shopping"”.']
]));
add(card('2.3 Smart element tracking and self-healing', [
  ['What it is', 'When a site is redesigned, ids and classes change and ordinary selector-based fixes die. PATCHWORK remembers a rich fingerprint of each element (text, attributes, context, parents, siblings, position) and can find it again.'],
  ['Why it matters', 'This is the hardest requirement and our biggest differentiator. Most teams will only build the editor.'],
  ['Show it', 'Overview → **Redeploy as v2** → open the live site (`shoplite.localhost:4000/cart`): still fixed on a completely different design → **Element tracking → Run drift check** → show **Self-healed 84 %**, what matched (text, attributes, tag) and what changed (id, classes, selector).'],
  ['Say it', '“The vendor redesigned the whole site. A normal hotfix would be dead. We matched the button on what it says, its accessibility label and its place in the page — and re-attached with 84 % confidence.”'],
  ['Underneath', 'Every candidate element is scored on weighted signals (text 30 %, attributes 15 %, structure 10 %, context 8 % …). Above 70 % it applies; between 50–70 % it is held back for review; below, it is reported as lost.']
]));
add(card('2.4 Drift watcher and auto-heal', [
  ['What it is', 'A background checker that re-opens the real site, sees which patches moved, and can re-anchor them, verify the result and ship a new release by itself.'],
  ['Why it matters', 'Turns healing from a safety net into maintenance you don’t have to do.'],
  ['Show it', 'Element tracking → **Re-anchor & release**. A banner says “Verifying…” and a new release **v3 · auto-heal** appears in Releases. Optional: switch on **Autopilot**.'],
  ['Say it', '“It healed, verified and released — no human in the loop. And if verification had failed it would have stopped and told us.”'],
  ['Underneath', 'It rewrites each healed patch’s target to the new fingerprint, runs the same verification as a human release, and only ships on pass or warn.']
]));
add(card('2.4b Collaboration: roles, review, comments, presence', [
  ['What it is', 'Four demo people with different powers: developers propose, reviewers approve, admins also approve script patches and override. Reviewers cannot approve their own work. Comments and a per-patch history live in each patch’s drawer; presence shows who is editing what.'],
  ['Why it matters', 'Requirement #3 — “multiple developers create, review and merge”. It also shows production discipline.'],
  ['Show it', 'Sign in as **Sam** (developer) → open a patch in review → no Approve button, only “Waiting for a reviewer”. Switch to **Jordan** (reviewer) in the sidebar → the same patch now has **Approve / Reject**.'],
  ['Say it', '“Two sets of eyes on every change; scripts need an admin.”'],
  ['Underneath', 'Rules are enforced on the server, not just hidden in the UI. (Roles are demo-level — see Limits.)']
]));
add(card('2.5 Conflict detection and resolution', [
  ['What it is', 'Finds patches that clash — two different labels for the same button, one patch hiding something another patch edits, or missing dependencies — and helps you resolve them.'],
  ['Why it matters', 'The “merge” half of collaborative editing. Without it, two good patches can silently break each other.'],
  ['Show it', 'Patches → **Conflicts** tab. Card: “Fix ‘chekout’ typo” vs “Rename CTA to ‘Secure checkout’” — both change the button’s content. Click **Ask AI** → suggestion with reasoning → **Apply**. The losing patch is rejected and everything is logged.'],
  ['Say it', '“Detected before anything ships — and you can see both sides side by side.”'],
  ['Underneath', 'Each operation “touches” a key such as `content` or `style:color` on an element; the same key on the same element with different values is a collision.']
]));
add(card('2.6 Isolated preview', [
  ['What it is', 'Any patch set can be opened on its own private address so you can test it without any real visitor seeing it.'],
  ['Why it matters', 'Requirement #4: test without affecting the published site.'],
  ['Show it', 'Patches → open a patch → **Isolated preview** (new tab). Compare with the live site side by side — only the preview has the change.'],
  ['Say it', '“Every view gets its own origin, so previews, production and the editor can’t leak into each other.”'],
  ['Underneath', 'The view is encoded in the hostname: `shoplite.localhost` is production, `pv3fa9bc.shoplite.localhost` a preview, `rel2.…` release 2, `none.…` the untouched original.']
]));
add(card('2.7 Automated verification', [
  ['What it is', 'A robot opens the live site and your proposed version in real Chromium (desktop and mobile) and compares them: do patches apply, do user journeys still work, any new errors, accessibility, visual changes, and does any patch hide a huge part of the page.'],
  ['Why it matters', 'Requirement #5. This is the gate that stops bad changes — and it produces evidence judges can see.'],
  ['Show it', 'Verification → run with the default selection → **Safe to release**. Open the **before / after slider**. Then tick the risky draft **Hide order summary** and run again → red **Blocked**: the checkout flow fails and the blast-radius check trips.'],
  ['Say it', '“It doesn’t ask whether the code looks fine — it plays the checkout like a customer. A patch that would have killed checkout never leaves the building.”'],
  ['Underneath', 'Playwright + axe-core + pixel diff. The diff understands layout shift (a banner pushing content down is not an error) and ignores the regions you intentionally changed.']
]));
add(card('2.8 Versioned releases and canary rollout', [
  ['What it is', 'Approved patches ship together as an immutable numbered release (v1, v2, …). You can release to everyone or to a percentage of visitors first (canary), then promote.'],
  ['Why it matters', 'Requirement #6, and it is how real teams reduce risk.'],
  ['Show it', 'Releases → the **release gate** shows three green lights (approved, no conflicts, verified) → **Create release** → **Deploy… → Canary 40 %** → **Promote**.'],
  ['Say it', '“A release can never be changed after the fact — what we tested is exactly what runs.”'],
  ['Underneath', 'A release stores a full snapshot of its patches. The verification result is tied to the exact set of patch ids and revisions, so editing a patch after verifying invalidates it.']
]));
add(card('2.9 Rollback and auto-rollback', [
  ['What it is', 'One click restores the previous version. If a release starts throwing errors — or fails its post-deploy smoke test — PATCHWORK rolls it back by itself.'],
  ['Why it matters', 'Failure detection and recovery are explicit requirements, and the most dramatic part of the demo.'],
  ['Show it', 'As Alex: approve the script patch “Checkout analytics hook”, create a release with **admin override**, deploy, then Overview → **Simulate traffic**. Within seconds a red AUTO-ROLLBACK appears in the audit trail and the site returns to the previous version.'],
  ['Say it', '“We deliberately forced a bad release through. Real visitors’ browsers reported errors, and production healed itself — and the reason is on record.”'],
  ['Underneath', 'The runtime reports each patch error; a monitor rolls back if a release exceeds the threshold (default 4 per minute). Open pages pick up the rollback within seconds without reloading.']
]));
add(card('2.10 Time machine', [
  ['What it is', 'A slider that shows the live site exactly as visitors saw it at any version — including “Original”.'],
  ['Why it matters', 'Makes versioning tangible and is a very visual moment.'],
  ['Show it', 'Releases → scroll to **Time machine** → drag between Original, v1, v2 … and use the page pills to look at other pages. The list on the right says which patches were added or removed.'],
  ['Say it', '“Every version is replayable — handy for incident reviews.”'],
  ['Underneath', 'Each release has its own hostname (`rel2.shoplite.localhost`), so the iframe simply loads that version.']
]));
add(card('2.11 Audit trail with tamper detection', [
  ['What it is', 'A permanent log of every action — who, what, when, why — where each entry is cryptographically linked to the one before.'],
  ['Why it matters', 'Requirement #7, and a credibility moment: history can’t be quietly rewritten.'],
  ['Show it', 'Audit trail → green “Hash chain intact” → **Simulate tampering** → the banner turns red and names the edited entry. (Click **Restore** afterwards.)'],
  ['Say it', '“Edit one old record and every seal after it breaks — and we tell you exactly which one.”'],
  ['Underneath', 'Each row stores a SHA-256 of the previous hash plus its own content. Tamper-**evident**; a production system would also anchor the latest hash externally.']
]));
add(card('2.12 Chrome extension', [
  ['What it is', 'Applies the same patches on the real website in your own browser — no proxy — and lets you propose a patch from any page.'],
  ['Why it matters', 'A bonus that shows the engine is portable.'],
  ['Show it', 'Open `http://localhost:4100/cart` (the real store). The toolbar badge shows **v1** and the button is fixed. Click the icon → **Edit this page** → pick an element → **Save draft patch** → it appears in Studio as a draft.'],
  ['Say it', '“Same tracker, same patches — in the browser.”'],
  ['Underneath', 'A background worker talks to the PATCHWORK API; a content script injects the shared locator and runtime. Unregistered sites are untouched.']
]));
add(card('2.13 Health dashboard', [
  ['What it is', 'The Overview page: a welcome strip with three big buttons beside the patch pipeline, live release, patch counts, errors and self-heals in the last minute, tracking status, and the last five recent-activity events at the bottom.'],
  ['Show it', 'Open it first and last; use **Simulate traffic** to make the numbers move.'],
  ['Say it', '“Everything an on-call person needs on one screen.”']
]));

/* ------------------------------------------------------------------ 3 */
add(L.H1('3. Before you go on stage'));
add(L.H2('One-command setup'));
add(L.code(['npm start                # terminal 1 — leave it running', 'npm run demo:prep        # terminal 2 — resets everything to the demo starting state']));
add(L.spacer(80));
add(L.P('`demo:prep` gives you: ShopLite on v1, release **v1** live, “Hero button contrast” and “Free-shipping banner” **already approved**, the typo-vs-rename **conflict** waiting, the risky **Hide order summary** draft, and the script patch **already in review** for Alex to approve. Run it again any time you want a clean restart (takes ~5 seconds).'));
add(L.H2('Checklist (5 minutes before)'));
add(...L.bullets([
  'Use **Chrome**. Zoom 100 %. Close other windows, mute notifications, hide bookmarks bar.',
  'Tab 1: **Studio** `http://localhost:4000` signed in as **Alex (admin)**.',
  'Tab 2: the **original store** `http://localhost:4100/cart` (add an item first). Tab 3 (later): `http://shoplite.localhost:4000/cart` — the patched store.',
  'Run `npm run demo:prep` and confirm Overview says **v1 · 2 live · 2 in review/approved**.',
  'Optional: load the Chrome extension (`npm run extension`, then chrome://extensions → Load unpacked).',
  'Optional: add `ANTHROPIC_API_KEY` to `.env` before starting if you want real Claude responses; otherwise say “rule-based fallback” if asked.',
  'Keep the manual (`PATCHWORK_Manual.docx`) open for deep questions.'
]));
add(L.H2('Who does what (two presenters)'));
add(table(['Presenter A — storyteller', 'Presenter B — driver'], [['Opens with the problem, narrates every scene, handles questions.', 'Controls mouse and keyboard, switches users, keeps an eye on the terminal. Quietly runs `demo:prep` if a reset is needed.']], [4819, 4819]));

/* ------------------------------------------------------------------ 4 */
add(L.H1('4. The main demo — 10 scenes, about 8 minutes'));
add(L.callout('Rule of thumb', ['Say **what is about to happen**, do it, then say **what you just proved**. Never narrate while waiting for a spinner — talk about the next idea instead (verification takes ~8 seconds, canary a few).']));
add(...scene(1, 'The problem', '45 s', [
  ['DO', 'Tab 2: the original store, cart with an item. Hover the greyed-out **“Proceed to chekout”** button and try to click it.'],
  ['SAY', '“A deployment shipped a disabled checkout button and a typo. Customers can’t pay. The original developers are gone and a rebuild takes days. We’ll fix it without touching this site — and notice this server never changes during the demo.”'],
  ['PROOF', 'The origin stays broken the whole demo. Come back to this tab at the end.']
]));
add(...scene(2, 'The fix already exists — and how it was built', '60 s', [
  ['DO', 'Tab 3: open `shoplite.localhost:4000/cart` — the same page, button enabled and spelled correctly. Then in Studio: **Visual editor** → `/cart`. Click the button on the canvas (it is disabled there on purpose) → **Attributes & behaviour** → show **Enable**.'],
  ['SAY', '“Same site, served through PATCHWORK: fixed. That fix is two tiny patches. Let me show how one is made: click the element, press Enable, done — it previews instantly.”'],
  ['PROOF', 'Disabled button → enabled on the canvas without any reload.']
]));
add(...scene(3, 'A new patch, with a little AI', '60 s', [
  ['DO', 'Still in the editor. Click the **“Continue shopping”** link. In the AI bar type **change the text to "Keep shopping" and make it bold** → **Generate**. Name it and press **Submit**.'],
  ['SAY', '“Describe it in plain English and the AI proposes operations. It can only use our safe vocabulary — and it still has to be reviewed.”'],
  ['PROOF', 'The patch is now **In review** (Patches list shows it).']
]));
add(...scene(4, 'Review and roles', '45 s', [
  ['DO', 'Sidebar → switch to **Sam** → Patches → open the new patch: no Approve button (“Waiting for a reviewer”). Switch to **Jordan** → same patch → **Approve**.'],
  ['SAY', '“Developers propose, reviewers decide, and nobody approves their own work. Scripts need an admin.”'],
  ['PROOF', 'The Approve button only exists for a reviewer.']
]));
add(...scene(5, 'Conflict', '45 s', [
  ['DO', 'Patches → **Conflicts** tab. Show “Fix ‘chekout’ typo” vs “Rename CTA to ‘Secure checkout’”. Click **Ask AI** → read the reasoning → **Apply**.'],
  ['SAY', '“Two developers changed the same button label. We catch it before release, show both sides, and recommend which to keep.”'],
  ['PROOF', 'The losing patch becomes Rejected; the conflict count drops.']
]));
add(...scene(6, 'Verification — pass, then block', '90 s', [
  ['DO', 'Verification → leave the default selection → **Run verification**. While it runs, explain the checks. Show **Safe to release**, the flow trace and the **before/after slider**. Then tick **Hide order summary (experiment)** → run again → **Blocked**.'],
  ['SAY', '“A real browser plays the checkout like a customer, on desktop and mobile. The second run shows why it matters: that experimental patch would have hidden the order summary and killed checkout. It never reaches a customer.”'],
  ['PROOF', '17 checks pass; with the bad patch, the checkout flow and blast-radius checks fail in red.']
]));
add(...scene(7, 'Release: canary, then promote', '45 s', [
  ['DO', 'Releases → confirm the **release gate** is three green lights (if “Not verified” shows, the set differs from what you verified — run verification on the pre-selected set) → add a note → **Create release** → **Deploy… → Canary 40 %** → **Promote**.'],
  ['SAY', '“Immutable versions and gradual rollout — what we tested is exactly what runs.”'],
  ['PROOF', 'Release v2 live; Overview shows it.']
]));
add(...scene(8, 'The wow — the site is redesigned underneath us', '90 s', [
  ['DO', 'Overview → **Redeploy as v2**. Reload tab 3 (`shoplite.localhost:4000/cart`) — completely new design, still fixed. Element tracking → **Run drift check** → show **Self-healed 84 %**, matched-on and changed signals, old vs new selector. Click **Re-anchor & release**; wait for the banner.'],
  ['SAY', '“The vendor shipped a redesign — new ids, new classes, new structure. A selector-based hotfix would be dead. Our tracker found the button by what it says and where it sits and re-attached with 84 % confidence. Then it verified and released the fix by itself.”'],
  ['PROOF', 'New release tagged **auto-heal**; drift check afterwards shows all patches at 100 %.']
]));
add(...scene(9, 'Disaster and recovery', '75 s', [
  ['DO', 'Switch to **Alex**. Patches → open **Checkout analytics hook** → **Approve** (admin). Releases → the release builder preselects it → type an override reason (“demo”) → **Create release** → **Deploy… → Full**. Overview → **Simulate traffic**. Watch production health turn red and the release **roll itself back**. Open the Audit trail.'],
  ['SAY', '“Now I’ll deliberately ship a bad one — a script with a bug, forced past verification by an admin. Real visitors’ browsers report errors, and within seconds production reverts itself. The reason is on the record.”'],
  ['PROOF', 'AUTO-ROLLBACK entry in the audit trail; the bad patch is marked Reverted.']
]));
add(...scene(10, 'Trust — and close', '45 s', [
  ['DO', 'Audit trail → **Verify integrity** (green) → **Simulate tampering** → red banner naming the entry → **Restore**. Finish on Tab 2 (still broken) and Tab 3 (fixed).'],
  ['SAY', '“Every action is hash-chained. And remember — the original store is still broken. We fixed the internet’s experience of it without changing it. Visual patching, smart tracking, collaboration, preview, verification, versioning, audit — all six requirements, plus AI, canary, auto-rollback and a Chrome extension.”'],
  ['PROOF', 'The origin never changed.']
]));

/* ------------------------------------------------------------------ 5 */
add(L.H1('5. Shorter and longer versions'));
add(L.H2('3-minute lightning version'));
add(table(['Time', 'Scene', 'Cut it down to'], [
  ['0:00', '1 The problem', 'Show the broken store and the fixed version side by side. (30 s)'],
  ['0:30', '6 Verification', 'Run once, then block the risky patch. (60 s)'],
  ['1:30', '8 Self-healing', 'Redeploy as v2 → live site still fixed → drift check 84 %. Skip re-anchor. (60 s)'],
  ['2:30', '9 Auto-rollback', 'Show it in the audit trail only if time allows; otherwise describe it. (30 s)']
], [1200, 3000, 5438], { boldFirst: true }));
add(L.H2('12-minute deep version (add these)'));
add(...L.bullets([
  'After Scene 2: tour the Inspector sections, device toggle (desktop / tablet / mobile) and the **Preview edits** switch. Drag the ⠿ handle to move an element.',
  'After Scene 7: **Time machine** — drag through Original → v1 → v2 → v3.',
  'After Scene 8: switch on **Autopilot** (Element tracking) and explain unattended healing.',
  'Show the **Chrome extension** on `localhost:4100` (badge, popup, Edit this page).',
  'Show **Settings**: thresholds, critical-flows JSON, error threshold for auto-rollback.',
  'Show the **isolated preview**: Patches → patch drawer → Isolated preview, side by side with live.'
]));

/* ------------------------------------------------------------------ 6 */
add(L.H1('6. If something goes wrong'));
add(table(['What you see', 'What to do — and what to say'], [
  ['Page is blank or Studio won’t load', 'Terminal 1: `Ctrl+C`, `npm start`, reload. Say: “Give me a moment — the stack restarts in seconds.”'],
  ['“Port already in use” on `npm start`', '`lsof -ti :4000 | xargs kill` and the same for `:4100`, then `npm start`.'],
  ['Canvas / preview frame empty', 'You are not in Chrome, or ShopLite isn’t running on :4100. Switch to Chrome.'],
  ['State is messy (you clicked ahead)', 'Terminal 2: `npm run demo:prep`, reload Studio. 5 seconds.'],
  ['Verification slower than usual', 'Keep talking — explain what the two browsers are doing. It always finishes; do not click away from the page.'],
  ['Release gate shows “Not verified”', 'The set differs from what you verified. Go to Verification, run on the same pre-selected set, return.'],
  ['Auto-rollback doesn’t fire after Simulate traffic', 'Click **Simulate traffic** once more (needs ≥ 4 error reports). If it still doesn’t, click **Roll back** manually and say “one click, either way”.'],
  ['AI says “rule-based assistant”', 'Say so confidently: “No API key on this laptop, so you’re seeing our offline assistant; with a key it uses Claude.” Use simple prompts (“make it blue and bold”).'],
  ['Everything is on fire', 'Switch to the screenshots/recording you prepared (record one dry run beforehand!) and narrate over it.']
], [3300, 6338], { boldFirst: true }));
add(L.callout('Insurance policy', ['Do one full dry run the night before and **screen-record it**. If anything fails live, play the recording and keep talking — judges forgive a glitch, not silence.'], WARN, 'FBF1DC'));

/* ------------------------------------------------------------------ 7 */
add(L.H1('7. Questions judges ask'));
const qa = [
  ['How is this different from a Chrome extension that injects CSS, or a tag manager?', 'Those apply changes blindly and break silently. We add a process (review, conflicts), proof (real-browser verification against the live baseline), resilience (self-healing tracking) and recovery (immutable releases, canary, auto-rollback, audit).'],
  ['What if the site changes and a patch can’t find its element?', 'The tracker scores candidates on many signals. Confident matches heal; ambiguous ones are held back and flagged; lost ones are reported — never applied to the wrong element. Re-anchor & release makes new locations permanent after verification.'],
  ['Why not just fix the source code?', 'Often there is no access, pipeline or people — and rebuilding is slow and risky. Patches are structured data, so exporting them as pull requests is a natural next step.'],
  ['How do you stop a bad patch taking production down?', 'Five layers: four-eyes review, conflict blocking, verification (flows, console, accessibility, visual, blast radius), canary with post-deploy smoke test, and telemetry-driven auto-rollback.'],
  ['Is it secure? What about script patches?', 'Scripts need admin approval and are blocked by verification if they throw. For production we would add real authentication, sandboxing and CSP nonces. The runtime only acts on registered sites.'],
  ['Where does AI fit, and what if it is wrong?', 'It drafts patches and conflict resolutions as structured operations — never free-form code. Anything it proposes goes through the same preview, review and verification as a human’s change.'],
  ['Does verification slow developers down?', 'A run takes seconds, tests desktop and mobile in parallel and replaces manual QA. Admins can override in emergencies with a recorded reason.'],
  ['How does it scale?', 'Serving is stateless (a patch set plus a small script); verification is a queue of independent browser jobs; storage can move from SQLite to Postgres and the proxy to a CDN edge or a one-line SDK.'],
  ['What does the element tracker actually compare?', 'Text (even with typos), accessibility labels and attributes, the chain of parents, nearby headings and labels, classes (ignoring generated ones), siblings and rendered position — weighted, with a bonus for clear winners.'],
  ['Why can’t I see the patches in the original site’s source?', 'By design: the origin is never modified. Patches are applied in the browser by a small runtime, so removing PATCHWORK returns the site to exactly how it was.'],
  ['What did you actually build vs. mock?', 'Everything in the demo is real: the proxy, runtime, tracker, verification in real browsers, releases, rollback, audit chain and extension. Limits: roles are demo-level (no real login), and AI falls back to a keyword assistant without an API key.'],
  ['What would you do with another month?', 'Patch-to-PR export, edge/SDK deployment, real identity and SSO, a visual recorder for critical flows, embedding-based matching, cross-browser verification.']
];
qa.forEach(([q, a]) => { add(L.H3(q)); add(L.P(a)); });
add(L.H2('Be honest about limits — and make it a strength'));
add(...L.bullets([
  '“Roles are demo-level — in production this plugs into SSO.”',
  '“Without an API key the assistant is rule-based; the Claude path is wired and uses the same safe operation vocabulary.”',
  '“Verification is only as good as the pages and flows you configure — it is a safety net, not a proof.”',
  '“The proxy strips security headers so the editor can embed sites; in production we’d use an edge integration and keep CSP.”'
]));

/* ------------------------------------------------------------------ 8 */
add(L.H1('8. One-page click cheat-sheet'));
add(table(['#', 'Where', 'Click', 'Proves'], [
  ['1', 'Tab 2 :4100/cart', 'Try the greyed-out button', 'The origin is broken and never changes'],
  ['2', 'Tab 3 shoplite.localhost:4000/cart', 'Compare', 'Patched through PATCHWORK'],
  ['2', 'Visual editor /cart', 'Click button → Attributes → **Enable**', 'Visual patching, live preview'],
  ['3', 'Visual editor', 'Click “Continue shopping” → AI bar “change the text to "Keep shopping" and make it bold” → Generate → Submit', 'AI assistant, review queue'],
  ['4', 'Sidebar user switch', 'Sam → no Approve; Jordan → **Approve**', 'Roles, four-eyes'],
  ['5', 'Patches → Conflicts', '**Ask AI** → **Apply**', 'Conflict detection and resolution'],
  ['6', 'Verification', 'Run → slider; tick **Hide order summary** → Run', 'Real-browser verification; blocking'],
  ['7', 'Releases', 'Create release → **Deploy… → Canary 40 %** → **Promote**', 'Versioning, gradual rollout'],
  ['8', 'Overview', '**Redeploy as v2** → reload tab 3', 'Patches survive a redesign'],
  ['8', 'Element tracking', '**Run drift check** → **Re-anchor & release**', 'Smart tracking, auto-heal'],
  ['9', 'Alex → Patches', 'Approve **Checkout analytics hook** → Releases (override) → Deploy → Overview **Simulate traffic**', 'Auto-rollback'],
  ['10', 'Audit trail', '**Verify integrity** → **Simulate tampering** → **Restore**', 'Tamper-evident history'],
  ['★', 'Releases', 'Scroll to **Time machine**', 'Every version replayable'],
  ['★', 'Chrome extension', 'Icon → **Edit this page**', 'Same engine in the browser']
], [500, 2500, 4338, 2300]));
add(L.spacer(160));
add(L.callout('Reset any time', ['Terminal 2: `npm run demo:prep` · or Overview → **Reset demo data**. The full reference lives in `PATCHWORK_Manual.docx`.']));

/* ---------------------------------------------------------------- assemble */
const doc = new Document({
  features: { updateFields: true }, creator: 'PATCHWORK team', title: 'PATCHWORK — Feature & Demo Guide', description: 'Plain-English feature guide and demo script',
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
      headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: 'PATCHWORK', font: SERIF, bold: true, size: 18, color: ACCENT }), new TextRun({ text: '   Feature & Demo Guide', font: SANS, size: 18, color: MUTED })], border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 6 } } })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: W }], children: [new TextRun({ text: 'Hotfix the Internet · v1.0.3', font: SANS, size: 17, color: MUTED }), new TextRun({ text: '\tPage ', font: SANS, size: 17, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], font: SANS, size: 17, color: MUTED })] })] }) },
      children: [
        new Paragraph({ children: [new TextRun({ text: 'Contents', font: SERIF, size: 44, bold: true })], spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 8 } } }),
        new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }),
        ...body
      ]
    }
  ]
});
Packer.toBuffer(doc).then((buf) => { const out = path.join(__dirname, 'PATCHWORK_Demo_Guide.docx'); fs.writeFileSync(out, buf); console.log('wrote', out, (buf.length / 1024).toFixed(0) + ' KB'); });
