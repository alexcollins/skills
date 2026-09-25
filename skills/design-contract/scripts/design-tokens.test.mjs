/* node --test scripts/design-tokens.test.mjs
   Unit tests for the parsers, then an end-to-end run against a small
   Tailwind 4 / shadcn-shaped fixture written to a temp directory. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { parseCss, resolveVars, evalCalc, simplifyCalc, parseColor, deltaE, toDimension, splitDesignMd } from './design-tokens.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'design-tokens.mjs');

/* ── parser ─────────────────────────────────────────────────────── */

test('parseCss finds :root, nested @media and @layer blocks, and @theme', () => {
  const rules = parseCss(
    `@import "tailwindcss";
     /* a { comment } with braces */
     :root { --bg: #fff; --fg: #111; }
     @media (prefers-color-scheme: dark) { :root { --bg: #000; } }
     @layer base { .dark { --bg: #0a0a0a; } }
     @theme inline { --color-bg: var(--bg); }
     .x::before { content: "{ not a block }"; --local: 1px; }`,
    'fixture.css'
  );
  const find = (sel, ctx = 0) => rules.find((r) => r.selector === sel && r.context.length === ctx);
  assert.deepEqual(find(':root').decls, [['--bg', '#fff'], ['--fg', '#111']]);
  assert.equal(rules.find((r) => r.selector === ':root' && r.context[0]?.startsWith('@media')).decls[0][1], '#000');
  assert.equal(rules.find((r) => r.selector === '.dark').decls[0][1], '#0a0a0a');
  assert.equal(find('@theme inline').decls[0][0], '--color-bg');
  assert.deepEqual(find('.x::before').decls[1], ['--local', '1px']);
});

test('declarations keep semicolons inside functions and strings', () => {
  const [rule] = parseCss(`.a { --u: url("a;b.svg"); --f: "x;y"; --c: calc(1px + 2px); }`, 'f.css');
  assert.deepEqual(rule.decls.map(([p]) => p), ['--u', '--f', '--c']);
});

/* ── values ─────────────────────────────────────────────────────── */

test('resolveVars follows chains, uses fallbacks, and survives cycles', () => {
  const vars = { '--a': 'var(--b)', '--b': '#123456', '--loop': 'var(--loop)' };
  const look = (n) => vars[n];
  assert.equal(resolveVars('var(--a)', look), '#123456');
  assert.equal(resolveVars('var(--missing, 4px)', look), '4px');
  assert.equal(resolveVars('var(--missing, var(--b))', look), '#123456');
  assert.equal(resolveVars('var(--loop)', look), 'var(--loop)');
  assert.equal(resolveVars('1px solid var(--b)', look), '1px solid #123456');
});

test('evalCalc handles mixed rem/px and refuses what it cannot know', () => {
  assert.equal(evalCalc('0.625rem - 4px'), '6px');
  assert.equal(evalCalc('10px * 2'), '20px');
  assert.equal(evalCalc('1rem + 0.5rem'), '1.5rem');
  assert.equal(evalCalc('(2px + 2px) / 2'), '2px');
  assert.equal(evalCalc('100% - 2rem'), null);
  assert.equal(evalCalc('1px / 0'), null);
  assert.equal(simplifyCalc('calc(0.625rem + 4px) solid'), '14px solid');
});

test('parseColor reads every format the spec allows and OKLab distance is sane', () => {
  for (const c of ['#fff', '#ffff', '#ffffff', '#ffffffff', 'rgb(255 255 255)', 'rgba(255, 255, 255, 1)', 'hsl(0 0% 100%)', 'oklch(1 0 0)', 'white'])
    assert.ok(deltaE(parseColor(c), parseColor('#ffffff')) < 0.001, c);
  assert.ok(deltaE(parseColor('#000'), parseColor('#fff')) > 0.9);
  assert.ok(deltaE(parseColor('#16181d'), parseColor('#17191e')) < 0.02);
  assert.equal(parseColor('not-a-colour'), null);
  assert.equal(parseColor('var(--x)'), null);
});

test('toDimension reduces clamp() to a bound and remembers the original', () => {
  const comments = {};
  assert.equal(toDimension('clamp(2rem, 1rem + 2vw, 3.75rem)', 'a', 'max', comments), '3.75rem');
  assert.equal(comments.a, 'clamp(2rem, 1rem + 2vw, 3.75rem)');
  assert.equal(toDimension('clamp(2rem, 1rem + 2vw, 3.75rem)', 'b', 'min', comments), '2rem');
  assert.equal(toDimension('1rem', 'c', 'max', comments), '1rem');
  assert.equal(comments.c, undefined);
});

test('splitDesignMd separates the frontmatter from the body', () => {
  const { frontmatter, body } = splitDesignMd('---\nname: "x"\n---\n\n# Body\n');
  assert.equal(frontmatter, '---\nname: "x"\n---\n');
  assert.equal(body, '\n# Body\n');
  assert.equal(splitDesignMd('# no frontmatter').frontmatter, null);
});

/* ── end to end ─────────────────────────────────────────────────── */

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'design-tokens-'));
  const w = (p, s) => {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), s);
  };
  w('package.json', JSON.stringify({ name: 'fixture', devDependencies: { tailwindcss: '^4' } }));
  w(
    'src/app/globals.css',
    `@import "tailwindcss";
     @theme inline {
       --color-background: var(--background);
       --color-primary: var(--primary);
       --radius-sm: calc(var(--radius) - 4px);
       --radius-lg: var(--radius);
     }
     :root {
       --radius: 0.625rem;
       --background: #ffffff;
       --foreground: oklch(0.145 0 0);
       --primary: oklch(0.205 0 0);
       --primary-foreground: oklch(0.985 0 0);
       --card: #fbfbfc;
       --muted: #fafafb;
       --heading: clamp(2rem, 1rem + 3vw, 3.5rem);
     }
     .dark { --background: #0e1116; --primary: oklch(0.922 0 0); }
     .type-display { font-size: var(--heading); line-height: 1.1; letter-spacing: -0.02em; font-weight: 600; }`
  );
  w('src/app/page.tsx', `export default () => <main className="bg-background text-primary rounded-lg z-10 duration-150">hi</main>;\n`);
  w(
    'design/tokens.config.json',
    JSON.stringify({
      name: 'Fixture',
      css: ['src/app/globals.css'],
      sweep: { include: ['src'] },
      designMd: {
        name: 'Fixture',
        colors: { primary: '--primary', 'on-primary': '--primary-foreground', neutral: '--background', surface: '--card' },
        modes: { '.dark': 'dark' },
        typography: { 'headline-display': { class: '.type-display' } },
        rounded: { sm: '--radius-sm', lg: '--radius-lg' },
        components: { 'button-primary': { backgroundColor: '{colors.primary}', textColor: '{colors.on-primary}', rounded: '{rounded.sm}' } },
      },
    })
  );
  return root;
}

const run = (root, ...args) => spawnSync(process.execPath, [SCRIPT, '--root', root, ...args], { encoding: 'utf8' });

test('end to end: generate, check clean, catch an invented value with its location', () => {
  const root = fixture();
  try {
    const gen = run(root);
    assert.equal(gen.status, 0, gen.stderr);

    const md = readFileSync(join(root, 'DESIGN.md'), 'utf8');
    assert.match(md, /^---\n# Generated by/);
    assert.match(md, /primary: "oklch\(0\.205 0 0\)"/);
    assert.match(md, /primary-dark: "oklch\(0\.922 0 0\)"/);
    assert.match(md, /neutral-dark: "#0e1116"/);
    assert.match(md, /sm: "6px"/, 'calc(var(--radius) - 4px) resolves through the chain');
    assert.match(md, /fontSize: "3\.5rem"  # clamp\(2rem, 1rem \+ 3vw, 3\.5rem\)/);
    assert.doesNotMatch(md, /surface-dark/, 'a colour that does not change in a mode is not repeated');

    const tokens = JSON.parse(readFileSync(join(root, 'design/tokens.json'), 'utf8'));
    assert.deepEqual(tokens.literals.zIndex, ['10']);
    assert.deepEqual(tokens.literals.radius, ['rounded-lg']);

    assert.equal(run(root, '--check').status, 0);

    /* A body written by hand survives regeneration untouched. */
    writeFileSync(join(root, 'DESIGN.md'), md + '\n## Overview\n\nHand-written.\n');
    assert.equal(run(root).status, 0);
    assert.match(readFileSync(join(root, 'DESIGN.md'), 'utf8'), /## Overview\n\nHand-written\./);

    /* Invent a value: the check fails and says where. */
    writeFileSync(join(root, 'src/app/page.tsx'), `export default () => <main className="bg-white/[0.07] rounded-[13px] z-[70]">hi</main>;\n`);
    const drift = run(root, '--check');
    assert.equal(drift.status, 1);
    assert.match(drift.stderr, /new opacity white\/\[0\.07\]\s+first seen src\/app\/page\.tsx:1/);
    assert.match(drift.stderr, /new radius rounded-\[13px\]/);
    assert.match(drift.stderr, /new zIndex \[70\]/);
    assert.doesNotMatch(drift.stderr, /arbitrary value rounded/, 'a class is reported once, in its own category');

    /* Change a token: the frontmatter diff names the value. */
    const css = readFileSync(join(root, 'src/app/globals.css'), 'utf8');
    writeFileSync(join(root, 'src/app/globals.css'), css.replace('--radius: 0.625rem', '--radius: 0.75rem'));
    const tokenDrift = run(root, '--check');
    assert.match(tokenDrift.stderr, /- sm: "6px"/);
    assert.match(tokenDrift.stderr, /\+ sm: "8px"/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the prose is checked too: a stale token name or an invented hex fails', () => {
  const root = fixture();
  try {
    assert.equal(run(root).status, 0);
    const md = readFileSync(join(root, 'DESIGN.md'), 'utf8');
    const good = md + '\n## Colors\n\n- **Ground** `{colors.neutral}` (#ffffff) — see [Overview](#add).\n';
    writeFileSync(join(root, 'DESIGN.md'), good);
    assert.equal(run(root, '--check').status, 0, 'a real value in parentheses and an anchor link are fine');

    writeFileSync(join(root, 'DESIGN.md'), good.replace('{colors.neutral}', '{colors.ground}').replace('(#ffffff)', '(#fefefe)'));
    const r = run(root, '--check');
    assert.equal(r.status, 1);
    assert.match(r.stderr, /\{colors\.ground\} is not in the frontmatter/);
    assert.match(r.stderr, /#fefefe appears nowhere in the code/);
    assert.match(r.stderr, /Fix the sentence, not the code/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a mapping to a token that does not exist fails loudly instead of guessing', () => {
  const root = fixture();
  try {
    const cfgPath = join(root, 'design/tokens.config.json');
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
    cfg.designMd.colors.primary = '--brand-that-was-renamed';
    writeFileSync(cfgPath, JSON.stringify(cfg));
    const r = run(root);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /--brand-that-was-renamed is not defined/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a component reference to a missing token fails', () => {
  const root = fixture();
  try {
    const cfgPath = join(root, 'design/tokens.config.json');
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
    cfg.designMd.components['button-primary'].textColor = '{colors.nope}';
    writeFileSync(cfgPath, JSON.stringify(cfg));
    const r = run(root);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /\{colors\.nope\} does not resolve/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--init proposes a shadcn mapping and --report finds the near-duplicate', () => {
  const root = fixture();
  try {
    rmSync(join(root, 'design/tokens.config.json'));
    const init = run(root, '--init');
    assert.equal(init.status, 0, init.stderr);
    const cfg = JSON.parse(readFileSync(join(root, 'design/tokens.config.json'), 'utf8'));
    assert.equal(cfg.designMd.colors.primary, '--primary');
    assert.equal(cfg.designMd.colors.background, '--background', 'Material 3 role names, which the linter treats as families');
    assert.equal(cfg.designMd.colors['on-primary'], '--primary-foreground');
    assert.equal(cfg.designMd.modes, undefined, 'themes are described in prose, not published as suffixed colours');
    assert.match(init.stdout, /Themes found: \.dark/);

    const rep = run(root, '--report', '--json');
    assert.equal(rep.status, 0, rep.stderr);
    const r = JSON.parse(rep.stdout);
    const pair = r.nearDuplicateColours.find((d) => [d.a, d.b].sort().join() === ['#fafafb', '#fbfbfc'].join());
    assert.ok(pair, 'card and muted are a hair apart');
    assert.equal(pair.mode, ':root');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
