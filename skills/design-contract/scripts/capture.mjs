#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════
   capture.mjs — part of the design-contract skill

   Full-page reference captures of every page template, at a desktop
   and a mobile width, with reduced motion so entrances have settled
   and the result is the same every time. They are what a visual change
   gets compared against.

     node scripts/capture.mjs --base http://localhost:3000 home=/ about=/about
     node scripts/capture.mjs                     # reads design/references/capture.json

   design/references/capture.json (written on first run, edit freely):
     { "base": "http://localhost:3000", "widths": [1440, 390],
       "routes": { "home": "/", "about": "/about" },
       "format": "jpg", "quality": 72, "wait": 600, "hide": [".cookie-banner"] }

   Needs Playwright with a Chromium: the project's own, or a global
   install, or PLAYWRIGHT_CHROMIUM=/path/to/chromium. Nothing else.
   ══════════════════════════════════════════════════════════════════ */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const DIR = join(ROOT, 'design/references');
const CONFIG = join(DIR, 'capture.json');

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const pairs = argv.filter((a, i) => /^[\w-]+=\//.test(a) && !['--base', '--widths'].includes(argv[i - 1]));

const saved = existsSync(CONFIG) ? JSON.parse(readFileSync(CONFIG, 'utf8')) : {};
const config = {
  base: 'http://localhost:3000',
  widths: [1440, 390],
  routes: { home: '/' },
  format: 'jpg',
  quality: 72,
  wait: 600,
  hide: [],
  ...saved,
  ...(opt('--base') ? { base: opt('--base') } : {}),
  ...(opt('--widths') ? { widths: opt('--widths').split(',').map(Number) } : {}),
  ...(pairs.length ? { routes: Object.fromEntries(pairs.map((p) => p.split('=', 2))) } : {}),
};

function loadPlaywright() {
  const tries = [];
  const fromProject = createRequire(join(ROOT, 'package.json'));
  for (const name of ['playwright', '@playwright/test', 'playwright-core']) {
    try {
      return fromProject(name);
    } catch (e) {
      tries.push(name);
    }
  }
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return createRequire(join(globalRoot, 'noop.js'))('playwright');
  } catch {
    /* fall through */
  }
  console.error(
    `capture: Playwright not found (tried ${tries.join(', ')} and the global install).\n` +
      `Install it for this run with:  npm i -D playwright && npx playwright install chromium`
  );
  process.exit(2);
}

const { chromium } = loadPlaywright();
const executablePath = process.env.PLAYWRIGHT_CHROMIUM || undefined;

mkdirSync(DIR, { recursive: true });
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const written = [];
const failed = [];

try {
  for (const width of config.widths) {
    const context = await browser.newContext({
      viewport: { width, height: width >= 1024 ? 900 : 844 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    for (const [name, path] of Object.entries(config.routes)) {
      const url = new URL(path, config.base).href;
      try {
        const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
        if (!res || res.status() >= 400) throw new Error(`HTTP ${res?.status() ?? 'no response'}`);
        /* Two sources of motion have to be pinned. Reduced motion stops
           what reads the preference (most JS and canvas animation); CSS
           loops keep running and land wherever page load left them, so the
           screenshot call freezes those (animations: 'disabled'). Fonts are
           awaited so text doesn't reflow between runs. */
        await page.addStyleTag({
          content:
            '*,*::before,*::after{transition:none!important;caret-color:transparent!important}' +
            (config.hide.length ? `${config.hide.join(',')}{visibility:hidden!important}` : ''),
        });
        await page.evaluate(() => document.fonts?.ready);
        /* Lazy content below the fold: scroll once to the bottom and back. */
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(config.wait);
        const file = `${name}-${width}.${config.format === 'png' ? 'png' : 'jpg'}`;
        await page.screenshot({
          path: join(DIR, file),
          fullPage: true,
          animations: 'disabled',
          type: config.format === 'png' ? 'png' : 'jpeg',
          ...(config.format === 'png' ? {} : { quality: config.quality }),
        });
        const [overflow, dev] = await page.evaluate(() => [
          document.documentElement.scrollWidth > window.innerWidth,
          /* Next, Vite and Nuxt dev servers leave these behind. A dev build
             carries overlays and slower hydration; references come from a
             production build. */
          Boolean(document.querySelector('nextjs-portal, vite-error-overlay, #__nuxt-devtools-container')) ||
            [...document.scripts].some((s) => /\/@vite\/client|_next\/static\/development/.test(s.src)),
        ]);
        written.push({ file, url, overflow, dev });
      } catch (e) {
        failed.push({ name, width, url, error: e.message.split('\n')[0] });
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

/* capture.json is written once, on the first run, from whatever that run
   was given. After that it is the user's: a one-route run (home=/) must
   not shrink the saved route list to that one route. */
if (!existsSync(CONFIG)) writeFileSync(CONFIG, JSON.stringify({ ...config }, null, 2) + '\n');

/* The README is regenerated only while it is still the generated one.
   A README someone has written by hand is theirs; leave it alone. */
const README = join(DIR, 'README.md');
const MARKER = '<!-- generated by capture.mjs; edit and remove this line to keep your changes -->';
const writeReadme = !existsSync(README) || readFileSync(README, 'utf8').includes(MARKER);

const all = existsSync(CONFIG) ? { ...config, ...JSON.parse(readFileSync(CONFIG, 'utf8')) } : config;
const ext = all.format === 'png' ? 'png' : 'jpg';
const overflowing = new Set(written.filter((w) => w.overflow).map((w) => w.file));
const today = new Date().toISOString().slice(0, 10);
const rows = Object.entries(all.routes)
  .flatMap(([name, path]) => all.widths.map((width) => [`${name}-${width}.${ext}`, path]))
  .map(([file, path]) => `| \`${file}\` | ${path} |${overflowing.has(file) ? ' ⚠️ scrolls sideways |' : ' |'}`)
  .join('\n');
if (writeReadme) writeFileSync(
  README,
  `${MARKER}
# Visual reference

Full-page captures of every page template at ${all.widths.join(' and ')} wide, taken with
reduced motion so entrances have settled. Last captured ${today}.

They are what a visual change is compared against. A difference you didn't intend is a regression
even if it looks fine.

| File | Route | |
|---|---|---|
${rows}

## Re-capturing

Start the app, then:

\`\`\`bash
node scripts/capture.mjs            # every route in capture.json
node scripts/capture.mjs home=/     # just one
\`\`\`

Routes, widths, format and elements to hide (cookie banners, live clocks) live in
[\`capture.json\`](capture.json). Re-capture in the same commit as an intended visual change.

## Reading a diff

Open the old and new capture at the same width side by side. Look at spacing rhythm and type
first, colour second — those are what drift quietly. At the mobile width, check nothing scrolls
sideways.
`
);

for (const w of written) console.log(`✓ ${w.file}${w.overflow ? '   ⚠️ page scrolls sideways at this width' : ''}`);
if (written.some((w) => w.dev))
  console.warn('\n⚠️  These came from a development server. Commit references taken from a production build\n   (e.g. `npm run build && npm run start`) — dev overlays and hydration timing differ.');
for (const f of failed) console.error(`✗ ${f.name} @ ${f.width}: ${f.url} — ${f.error}`);
if (!writeReadme) console.log('\ndesign/references/README.md was written by hand — left as it is.');
console.log(`\n${written.length} captured into design/references/${failed.length ? `, ${failed.length} failed` : ''}`);
process.exitCode = failed.length ? 1 : 0;
