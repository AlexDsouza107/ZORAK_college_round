// Usage: node scripts/shot.mjs <route> <outfile> [width] [height]  — screenshots a Studio page (dev tooling)
import { chromium } from 'playwright';
const [route = '/overview', out = '/tmp/shot.png', w = '1480', h = '940'] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:4000/#' + route); await p.waitForTimeout(2500);
await p.screenshot({ path: out }); await b.close(); if (errs.length) console.log('console errors:', errs.slice(0, 5));
