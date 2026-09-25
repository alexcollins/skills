#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════
   design-tokens.mjs — part of the design-contract skill
   https://github.com/alexcollins/skills/tree/main/skills/design-contract

   Reads the implementation and writes two things from it:

     design/tokens.json      a complete, machine-readable mirror of every
                             design value the code actually defines
     DESIGN.md frontmatter   the token block of the DESIGN.md spec
                             (github.com/google-labs-code/design.md),
                             so the part of DESIGN.md that tools parse
                             can never disagree with the code

   Nothing in either file is hand-written. The MAPPING — which custom
   property is "primary", which class is "headline-lg" — is authored
   once in design/tokens.config.json, because that is a judgement. The
   VALUES are always parsed, because that is a fact. If a mapped source
   stops existing the script throws rather than guessing, so a renamed
   token fails loudly instead of publishing a stale value.

   The literal sweep records the distinct design values that live in
   markup rather than in tokens — arbitrary Tailwind values, opacity
   modifiers, radii, z-indexes, motion — as sorted sets with no usage
   counts. Counts churn on every edit; the set only changes when
   someone introduces a genuinely new value, which is exactly when a
   human should look. That is what makes --check quiet during ordinary
   work and loud at the right moment.

     node scripts/design-tokens.mjs            write both
     node scripts/design-tokens.mjs --check    exit 1 on drift; say what, and where
     node scripts/design-tokens.mjs --report   audit facts: counts, near-duplicates,
                                               tokens with no static reference
     node scripts/design-tokens.mjs --init     propose design/tokens.config.json
     --root <dir>    project root (default: cwd)
     --config <p>    config path (default: design/tokens.config.json)
     --json          machine-readable --report / --check output

   No dependencies. Node 18+. Tailwind 3 configs are resolved through
   the project's own tailwindcss/resolveConfig when it is installed;
   Tailwind 4 themes are read straight from the CSS.
   ══════════════════════════════════════════════════════════════════ */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve, extname, sep } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

export const VERSION = '1.0.0';

/* ── CLI ─────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const ROOT = resolve(opt('--root', process.cwd()));
const CONFIG_PATH = resolve(ROOT, opt('--config', 'design/tokens.config.json'));
const AS_JSON = flag('--json');

class TokenError extends Error {}
const fail = (msg) => {
  throw new TokenError(msg);
};

const rel = (p) => relative(ROOT, p).split(sep).join('/');
const readText = (p) => readFileSync(resolve(ROOT, p), 'utf8');

/* ══════════════════════════════════════════════════════════════════
   CSS parsing

   A scanner rather than regexes, because real stylesheets nest
   (@media > :root, @layer > .dark) and carry braces inside strings.
   It yields every rule with its at-rule context and its declarations.
   ══════════════════════════════════════════════════════════════════ */

function stripCssComments(src) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      out += c;
      if (c === '\\') {
        out += src[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      out += c;
      i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      /* keep line numbers stable for the sweep's file:line reporting */
      const chunk = end === -1 ? src.slice(i) : src.slice(i, end + 2);
      out += chunk.replace(/[^\n]/g, ' ');
      i = end === -1 ? src.length : end + 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Index of the brace that closes the one opened at `open`. */
function matchBrace(src, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return -1;
}

/** Split a declaration list on top-level semicolons. */
function splitDecls(body) {
  const out = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ';' && depth === 0) {
      out.push(body.slice(start, i));
      start = i + 1;
    }
  }
  out.push(body.slice(start));
  return out
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const colon = d.indexOf(':');
      if (colon === -1) return null;
      return [d.slice(0, colon).trim(), d.slice(colon + 1).trim().replace(/\s+/g, ' ')];
    })
    .filter(Boolean);
}

/* At-rules whose body holds rules (walk into them) vs declarations
   (treat as a rule). Tailwind 4's @theme is a declaration block. */
const DECL_AT = /^@(theme|font-face|property|page|utility|variant)\b/;

function parseCss(src, file) {
  const css = stripCssComments(src);
  const rules = [];
  function walk(text, context, offset) {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf('{', i);
      if (open === -1) break;
      const semi = text.lastIndexOf(';', open);
      const prevClose = text.lastIndexOf('}', open);
      const headStart = Math.max(semi, prevClose, i - 1) + 1;
      const head = text.slice(headStart, open).trim();
      const close = matchBrace(text, open);
      if (close === -1) fail(`${file}: unbalanced braces near "${head.slice(0, 60)}"`);
      const body = text.slice(open + 1, close);
      if (head.startsWith('@') && !DECL_AT.test(head)) {
        walk(body, [...context, head.replace(/\s+/g, ' ')], offset + open + 1);
      } else {
        /* A rule body can itself contain nested rules (CSS nesting,
           Tailwind's @variant blocks). Declarations are what sit at the
           top level of the body; nested blocks are walked separately. */
        const flat = [];
        let j = 0;
        let depth = 0;
        let buf = '';
        let q = null;
        while (j < body.length) {
          const c = body[j];
          if (q) {
            buf += c;
            if (c === '\\') {
              buf += body[j + 1] ?? '';
              j += 2;
              continue;
            }
            if (c === q) q = null;
            j++;
            continue;
          }
          if (c === '"' || c === "'") {
            q = c;
            buf += c;
            j++;
            continue;
          }
          if (c === '{') {
            if (depth === 0) {
              const cut = Math.max(buf.lastIndexOf(';'), -1);
              const nestedHead = buf.slice(cut + 1).trim();
              buf = buf.slice(0, cut + 1);
              const nClose = matchBrace(body, j);
              if (nClose === -1) break;
              const nested = body.slice(j + 1, nClose);
              const sel = nestedHead.includes('&')
                ? nestedHead.replace(/&/g, head)
                : nestedHead.startsWith('@')
                  ? head
                  : `${head} ${nestedHead}`;
              const ctx = nestedHead.startsWith('@') ? [...context, nestedHead] : context;
              rules.push({ context: ctx, selector: sel.replace(/\s+/g, ' '), decls: splitDecls(nested), file });
              j = nClose + 1;
              continue;
            }
            depth++;
          } else if (c === '}') depth--;
          buf += c;
          j++;
        }
        flat.push(...splitDecls(buf));
        rules.push({ context, selector: head.replace(/\s+/g, ' '), decls: flat, file });
      }
      i = close + 1;
    }
  }
  walk(css, [], 0);
  return rules;
}

/* ══════════════════════════════════════════════════════════════════
   Values: var() resolution, calc(), colour maths
   ══════════════════════════════════════════════════════════════════ */

const ROOT_PX = 16;

/** Replace var(--x, fallback) through `lookup`, recursively. */
function resolveVars(value, lookup, seen = new Set()) {
  let out = '';
  let i = 0;
  while (i < value.length) {
    const at = value.indexOf('var(', i);
    if (at === -1) {
      out += value.slice(i);
      break;
    }
    out += value.slice(i, at);
    let depth = 0;
    let end = -1;
    for (let k = at + 3; k < value.length; k++) {
      if (value[k] === '(') depth++;
      else if (value[k] === ')' && --depth === 0) {
        end = k;
        break;
      }
    }
    if (end === -1) return value;
    const inner = value.slice(at + 4, end);
    const comma = topLevelIndex(inner, ',');
    const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
    const fallback = comma === -1 ? null : inner.slice(comma + 1).trim();
    let resolved;
    if (seen.has(name)) resolved = null;
    else {
      const raw = lookup(name);
      resolved = raw == null ? null : resolveVars(raw, lookup, new Set([...seen, name]));
    }
    if (resolved == null) resolved = fallback == null ? `var(${name})` : resolveVars(fallback, lookup, seen);
    out += resolved;
    i = end + 1;
  }
  return out;
}

function topLevelIndex(s, ch) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    else if (s[i] === ch && depth === 0) return i;
  }
  return -1;
}

/** Evaluate calc() over px / rem / em / unitless. Returns null when it can't. */
function evalCalc(expr) {
  const toks = expr.match(/-?\d*\.?\d+(?:px|rem|em|%)?|[()+\-*/]/g);
  if (!toks || toks.join('').replace(/\s/g, '') !== expr.replace(/\s/g, '')) return null;
  let p = 0;
  const num = (t) => {
    const m = t.match(/^(-?\d*\.?\d+)(px|rem|em|%)?$/);
    if (!m) return null;
    return { v: parseFloat(m[1]), u: m[2] ?? '' };
  };
  const norm = (a, b) => {
    if (a.u === b.u) return [a, b, a.u];
    const px = (x) => (x.u === 'rem' || x.u === 'em' ? { v: x.v * ROOT_PX, u: 'px' } : x);
    const A = px(a);
    const B = px(b);
    if (A.u === B.u || !A.u || !B.u) return [A, B, A.u || B.u];
    return null;
  };
  function expr_() {
    let a = term();
    while (a && (toks[p] === '+' || toks[p] === '-')) {
      const op = toks[p++];
      const b = term();
      if (!b) return null;
      const n = norm(a, b);
      if (!n) return null;
      a = { v: op === '+' ? n[0].v + n[1].v : n[0].v - n[1].v, u: n[2] };
    }
    return a;
  }
  function term() {
    let a = factor();
    while (a && (toks[p] === '*' || toks[p] === '/')) {
      const op = toks[p++];
      const b = factor();
      if (!b) return null;
      if (op === '*') {
        if (a.u && b.u) return null;
        a = { v: a.v * b.v, u: a.u || b.u };
      } else {
        if (b.u || b.v === 0) return null;
        a = { v: a.v / b.v, u: a.u };
      }
    }
    return a;
  }
  function factor() {
    const t = toks[p++];
    if (t === '(') {
      const v = expr_();
      if (toks[p++] !== ')') return null;
      return v;
    }
    if (t === '-') {
      const f = factor();
      return f && { v: -f.v, u: f.u };
    }
    return t == null ? null : num(t);
  }
  const r = expr_();
  if (!r || p !== toks.length) return null;
  const v = Math.round(r.v * 10000) / 10000;
  return `${v}${r.u}`;
}

function simplifyCalc(value) {
  return value.replace(/calc\(((?:[^()]|\([^()]*\))*)\)/g, (m, inner) => evalCalc(inner) ?? m);
}

/* Colours → OKLab, for near-duplicate detection. */
const NAMED = { white: '#ffffff', black: '#000000', transparent: '#00000000' };

function parseColor(input) {
  const s = String(input).trim().toLowerCase();
  if (NAMED[s]) return parseColor(NAMED[s]);
  let m;
  if ((m = s.match(/^#([0-9a-f]{3,8})$/))) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
    return fromSrgb(n(0), n(2), n(4), h.length === 8 ? n(6) : 1);
  }
  const args = (str) =>
    str
      .replace(/[,/]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  const pct = (x, scale = 1) => (x.endsWith('%') ? (parseFloat(x) / 100) * scale : parseFloat(x));
  if ((m = s.match(/^rgba?\((.+)\)$/))) {
    const a = args(m[1]);
    if (a.length < 3) return null;
    return fromSrgb(pct(a[0], 255) / 255, pct(a[1], 255) / 255, pct(a[2], 255) / 255, a[3] ? pct(a[3]) : 1);
  }
  if ((m = s.match(/^hsla?\((.+)\)$/))) {
    const a = args(m[1]);
    if (a.length < 3) return null;
    const h = parseFloat(a[0]);
    const sat = pct(a[1]);
    const l = pct(a[2]);
    const k = (n) => (n + h / 30) % 12;
    const f = (n) => l - sat * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return fromSrgb(f(0), f(8), f(4), a[3] ? pct(a[3]) : 1);
  }
  if ((m = s.match(/^oklch\((.+)\)$/))) {
    const a = args(m[1]);
    if (a.length < 3) return null;
    const L = pct(a[0]);
    const C = pct(a[1], 0.4);
    const H = (parseFloat(a[2]) * Math.PI) / 180;
    return { L, a: C * Math.cos(H), b: C * Math.sin(H), alpha: a[3] ? pct(a[3]) : 1 };
  }
  if ((m = s.match(/^oklab\((.+)\)$/))) {
    const a = args(m[1]);
    if (a.length < 3) return null;
    return { L: pct(a[0]), a: pct(a[1], 0.4), b: pct(a[2], 0.4), alpha: a[3] ? pct(a[3]) : 1 };
  }
  return null;
}

function fromSrgb(r, g, b, alpha) {
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    alpha,
  };
}

const deltaE = (x, y) => Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b, (x.alpha - y.alpha) * 0.5);
/* ~ one just-noticeable difference in OKLab. Below it, most people see one colour. */
const NEAR_DUPLICATE = 0.02;
const isColor = (v) => parseColor(v) != null;

/* ══════════════════════════════════════════════════════════════════
   The model: every custom property, per selector, resolvable per mode
   ══════════════════════════════════════════════════════════════════ */

function modeKey(rule) {
  return [...rule.context.filter((c) => !/^@layer\b/.test(c)), rule.selector].join(' ').trim();
}

function loadModel(config) {
  const cssFiles = config.css ?? [];
  if (!cssFiles.length) fail('config.css lists no stylesheets');
  const rules = [];
  for (const f of cssFiles) {
    if (!existsSync(resolve(ROOT, f))) fail(`config.css names ${f}, which does not exist`);
    rules.push(...parseCss(readText(f), f));
  }

  /* selector -> { --var: raw value }. A later declaration wins, the
     same as the cascade would decide for equal specificity. Keyframe
     steps are animation state, not design values, and are skipped. */
  const blocks = {};
  const theme = {};
  for (const r of rules) {
    if (r.context.some((c) => /^@(-\w+-)?keyframes\b/.test(c))) continue;
    const vars = r.decls.filter(([p]) => p.startsWith('--'));
    if (!vars.length) continue;
    const key = modeKey(r);
    const target = /^@theme\b/.test(r.selector) ? theme : blocks;
    const bucket = (target[key] ??= {});
    for (const [p, v] of vars) bucket[p] = v;
  }

  /* A mode is a block that re-points the root palette: .dark,
     [data-theme=x], a media query on :root, an inverted section.
     A component that only declares its own variables (.spotlight
     { --spot-x: 0 }) is scoped state, recorded but not a theme. */
  const rootNames = new Set(
    Object.entries(blocks)
      .filter(([k]) => /(^|,\s*):root\b/.test(k) && !k.startsWith('@'))
      .flatMap(([, v]) => Object.keys(v))
  );
  const modes = {};
  const scoped = {};
  for (const [key, vars] of Object.entries(blocks)) {
    const isRoot = /(^|,\s*):root\b/.test(key);
    const overridesRoot = Object.keys(vars).some((n) => rootNames.has(n));
    (isRoot || overridesRoot ? modes : scoped)[key] = vars;
  }

  /* Tailwind 4's own defaults, for resolving references the project
     leaves to the framework (text-xl, --spacing, the default radii).
     Read from the installed package; used for lookup only, never
     published, so upgrading Tailwind cannot make --check fail. */
  const twDefaults = {};
  const twTheme = tryResolve('tailwindcss/theme.css');
  if (twTheme) {
    for (const r of parseCss(readFileSync(twTheme, 'utf8'), 'tailwindcss/theme.css')) {
      if (/^@theme\b/.test(r.selector)) for (const [p, v] of r.decls) if (p.startsWith('--')) twDefaults[p] = v;
    }
  }

  const rootKeys = Object.keys(modes).filter((k) => /(^|,\s*):root\b/.test(k) && !k.startsWith('@'));
  const themeVars = Object.assign({}, ...Object.values(theme));

  /* Variables a font loader defines at runtime (next/font, fontsource,
     @font-face in JS). Their family name exists nowhere in the CSS, so
     the config names it once; build() checks the variable still exists
     somewhere in the source, so a removed font fails loudly. */
  const runtime = {};
  for (const [name, family] of Object.entries(config.fontVars ?? {})) {
    if (!/^--[\w-]+$/.test(name)) fail(`fontVars: "${name}" is not a custom property name`);
    runtime[name] = /[\s,]/.test(family) && !/^["']/.test(family) && !family.includes(',') ? `"${family}"` : family;
  }

  /** Scope for a mode: runtime fonts < framework defaults < @theme < :root < the mode. */
  function scope(mode = ':root') {
    const layered = { ...runtime, ...twDefaults, ...themeVars };
    for (const k of rootKeys) Object.assign(layered, modes[k]);
    if (mode !== ':root') {
      const exact = modes[mode] ?? scoped[mode] ?? theme[mode];
      if (!exact) fail(`mode "${mode}" not found; known: ${Object.keys(modes).join(' | ')}`);
      Object.assign(layered, exact);
    }
    return layered;
  }

  function resolveIn(value, mode = ':root') {
    const sc = scope(mode);
    return simplifyCalc(resolveVars(value, (n) => sc[n]));
  }

  return { rules, modes, scoped, theme, twDefaults, hasTwDefaults: Boolean(twTheme), scope, resolveIn, rootKeys };
}

const projectRequire = () => createRequire(join(ROOT, 'package.json'));
function tryResolve(spec) {
  try {
    return projectRequire().resolve(spec);
  } catch {
    return null;
  }
}

/* ── Tailwind 3: the project's own resolver ───────────────────────── */

const TW3_KEYS = [
  'screens',
  'borderRadius',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'boxShadow',
  'transitionTimingFunction',
  'transitionDuration',
  'zIndex',
  'maxWidth',
];

function loadTailwind3(config) {
  if (!config.tailwind) return null;
  const file = resolve(ROOT, config.tailwind);
  if (!existsSync(file)) fail(`config.tailwind names ${config.tailwind}, which does not exist`);
  const req = projectRequire();
  let resolveConfig;
  try {
    resolveConfig = req('tailwindcss/resolveConfig');
  } catch {
    fail(
      `config.tailwind is set but tailwindcss/resolveConfig is not installed.\n` +
        `Install dependencies first (npm ci), or remove "tailwind" from the config if this is Tailwind 4.`
    );
  }
  let raw;
  if (/\.(ts|mts|cts)$/.test(file)) {
    let jiti;
    try {
      jiti = req('jiti')(file, { interopDefault: true });
    } catch {
      fail(`${config.tailwind} is TypeScript and jiti (a Tailwind 3 dependency) is not installed. Run npm ci.`);
    }
    raw = jiti(file);
  } else raw = req(file);
  raw = raw?.default ?? raw;
  const resolved = resolveConfig(raw).theme;
  const out = {};
  for (const k of TW3_KEYS) if (resolved[k]) out[k] = resolved[k];
  /* Colours: only the ones the project defines. The resolved palette
     includes Tailwind's hundreds of defaults, which are not the design. */
  const own = { ...(raw.theme?.colors ?? {}), ...(raw.theme?.extend?.colors ?? {}) };
  const colors = {};
  const flat = (obj, prefix = '') => {
    for (const [k, v] of Object.entries(obj)) {
      const name = k === 'DEFAULT' ? prefix : prefix ? `${prefix}-${k}` : k;
      if (typeof v === 'string') colors[name] = v;
      else if (v && typeof v === 'object') flat(v, name);
    }
  };
  flat(own);
  if (Object.keys(colors).length) out.colors = colors;
  return { theme: out, raw };
}

/* ══════════════════════════════════════════════════════════════════
   The literal sweep
   ══════════════════════════════════════════════════════════════════ */

const DEFAULT_EXT = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.vue', '.svelte', '.astro', '.html', '.mdx'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', '.turbo', '.vercel', 'out', 'coverage', '.svelte-kit', '.astro']);

/* Utilities whose arbitrary values are design values. Layout sizes
   (w-[..], top-[..], grid-cols-[..]) are left out by default: they are
   legitimately one-off far more often than a colour or a radius is. */
const DESIGN_UTILITIES = [
  'rounded', 'z', 'text', 'bg', 'border', 'ring', 'shadow', 'ease', 'duration', 'delay',
  'tracking', 'leading', 'font', 'opacity', 'fill', 'stroke', 'outline', 'from', 'via', 'to',
  'divide', 'decoration', 'blur', 'backdrop-blur', 'drop-shadow', 'caret', 'accent', 'placeholder',
];
const COLOR_UTIL = '(?:bg|text|border|ring|fill|stroke|from|via|to|outline|divide|shadow|decoration|placeholder|caret|accent)';

function walkFiles(dir, exts, exclude, out = []) {
  const abs = resolve(ROOT, dir);
  if (!existsSync(abs)) return out;
  for (const entry of readdirSync(abs)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(abs, entry);
    const r = rel(full);
    if (exclude.some((x) => r === x || r.startsWith(`${x}/`))) continue;
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(r, exts, exclude, out);
    else if (exts.includes(extname(entry))) out.push(r);
  }
  return out;
}

/* Comments hold prose ("rounded corners") that would read as classes.
   Blank them out, keeping line numbers intact for file:line reports. */
function stripCodeComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^(\s*)\/\/.*$/gm, (m, lead) => lead + ' '.repeat(m.length - lead.length))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
}

function sweep(config) {
  const s = config.sweep ?? {};
  const include = s.include ?? ['src', 'app', 'components', 'lib', 'pages'];
  const exclude = (s.exclude ?? []).map((x) => x.replace(/\/$/, ''));
  const exts = s.extensions ?? DEFAULT_EXT;
  const utilities = s.arbitrary === 'all' ? null : (s.arbitrary ?? DESIGN_UTILITIES);
  const categories = s.gate ?? ['arbitrary', 'opacity', 'radius', 'zIndex', 'motion'];

  const files = [...new Set(include.flatMap((d) => walkFiles(d, exts, exclude)))].sort();
  /* The stylesheets are swept too: a literal in globals.css is still a literal. */
  const cssFiles = (config.css ?? []).filter((f) => !exclude.includes(f));

  const found = { arbitrary: {}, opacity: new Map(), radius: new Map(), zIndex: new Map(), motion: new Map(), color: new Map() };
  const note = (map, value, file, text, index) => {
    if (map.has(value)) return;
    const line = text.slice(0, index).split('\n').length;
    map.set(value, `${file}:${line}`);
  };

  /* A utility with its own category is reported there, not twice. */
  const owned = new Set([
    ...(categories.includes('radius') ? ['rounded'] : []),
    ...(categories.includes('zIndex') ? ['z'] : []),
    ...(categories.includes('motion') ? ['duration', 'delay', 'ease'] : []),
  ]);
  const arbUtils = utilities?.filter((u) => !owned.has(u));
  const utilGroup = arbUtils ? `(?:${arbUtils.map((u) => u.replace(/-/g, '\\-')).join('|')})` : '[a-z][a-z0-9-]*?';
  const reArbitrary = new RegExp(`(?<![\\w-])(-?${utilGroup})-\\[([^\\]\\s]+)\\]`, 'g');
  const reOpacity = new RegExp(`(?<![\\w-])${COLOR_UTIL}-([a-z]+(?:-[a-z0-9]+)*)\\/(\\[[^\\]\\s]+\\]|\\d{1,3})(?![\\w-])`, 'g');
  const reRadius = /(?<![\w-])rounded((?:-(?:\[[^\]\s]+\]|[a-z0-9]+))*)(?=[\s"'`:}\]),]|$)/g;
  const reZ = /(?<![\w-])-?z-(\d+|\[[^\]\s]+\]|auto)(?![\w-])/g;
  const reMotion = /(?<![\w-])(duration-(?:\d+|\[[^\]\s]+\])|delay-(?:\d+|\[[^\]\s]+\])|ease-(?:linear|in-out|in|out|\[[^\]\s]+\]|[a-z][a-z0-9-]*))(?![\w-])|cubic-bezier\([^)]*\)/g;
  /* Six or eight digits read as a colour anywhere. Three or four only in
     a colour position — a quote, a bracket, after a colon — because
     "flow #218" in copy is a number, not #221188. */
  const reHex = /(?<![\w&/-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6})(?![\w-])|(?<=['"`[(]|[:,]\s?)#[0-9a-fA-F]{3,4}(?![\w-])/g;

  for (const f of [...files, ...cssFiles]) {
    const raw = readText(f);
    const text = f.endsWith('.css') ? stripCssComments(raw) : stripCodeComments(raw);
    const isCss = f.endsWith('.css');
    if (categories.includes('arbitrary') && !isCss)
      for (const m of text.matchAll(reArbitrary)) {
        const util = m[1].replace(/^-/, '');
        if (owned.has(util)) continue;
        (found.arbitrary[util] ??= new Map());
        note(found.arbitrary[util], `[${m[2]}]`, f, text, m.index);
      }
    if (categories.includes('opacity') && !isCss)
      for (const m of text.matchAll(reOpacity)) note(found.opacity, `${m[1]}/${m[2]}`, f, text, m.index);
    if (categories.includes('radius') && !isCss)
      for (const m of text.matchAll(reRadius)) note(found.radius, `rounded${m[1]}`, f, text, m.index);
    if (categories.includes('zIndex') && !isCss)
      for (const m of text.matchAll(reZ)) note(found.zIndex, m[0].startsWith('-') ? `-${m[1]}` : m[1], f, text, m.index);
    if (categories.includes('motion'))
      for (const m of text.matchAll(reMotion)) note(found.motion, m[0].replace(/\s+/g, ''), f, text, m.index);
    if (!isCss) for (const m of text.matchAll(reHex)) note(found.color, m[0].toLowerCase(), f, text, m.index);
  }

  const sortVals = (arr) =>
    arr.sort((a, b) => {
      const na = parseFloat(String(a).replace(/[^\d.-]/g, ''));
      const nb = parseFloat(String(b).replace(/[^\d.-]/g, ''));
      if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
      return String(a).localeCompare(String(b));
    });

  const literals = {};
  const where = {};
  for (const cat of categories) {
    if (cat === 'arbitrary') {
      literals.arbitrary = {};
      for (const util of Object.keys(found.arbitrary).sort()) {
        literals.arbitrary[util] = sortVals([...found.arbitrary[util].keys()]);
        for (const [v, loc] of found.arbitrary[util]) where[`arbitrary.${util}:${v}`] = loc;
      }
    } else if (found[cat]) {
      literals[cat] = sortVals([...found[cat].keys()]);
      for (const [v, loc] of found[cat]) where[`${cat}:${v}`] = loc;
    }
  }
  const hardcodedColors = [...found.color.entries()].map(([v, loc]) => ({ value: v, at: loc }));
  return { literals, where, files: files.length, hardcodedColors };
}

/* ══════════════════════════════════════════════════════════════════
   Values that live in code: canvas palettes, JS theme objects
   ══════════════════════════════════════════════════════════════════ */

function literalFromCode(file, name) {
  const src = readText(file);
  const start = src.search(new RegExp(`(?:const|let|var)\\s+${name}\\b`));
  if (start === -1) fail(`extra: ${name} not found in ${file}`);
  const assign = src.slice(start).search(/=\s*[[{]/);
  if (assign === -1) fail(`extra: ${name} in ${file} is not assigned an array or object literal`);
  const open = src.slice(start + assign).search(/[[{]/) + start + assign;
  const pair = { '[': ']', '{': '}' };
  const want = pair[src[open]];
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === src[open]) depth++;
    else if (src[i] === want && --depth === 0) {
      end = i + 1;
      break;
    }
  }
  if (end === -1) fail(`extra: could not find the end of ${name} in ${file}`);
  const json = src
    .slice(open, end)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
    .replace(/'([^'\\]*)'/g, '"$1"')
    .replace(/,(\s*[\]}])/g, '$1');
  try {
    return JSON.parse(json);
  } catch (e) {
    fail(`extra: ${name} in ${file} is not a plain literal (${e.message}). Simplify it or drop it from config.extra.`);
  }
}

/* ══════════════════════════════════════════════════════════════════
   DESIGN.md frontmatter
   ══════════════════════════════════════════════════════════════════ */

const TYPO_PROPS = {
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'line-height': 'lineHeight',
  'letter-spacing': 'letterSpacing',
  'font-feature-settings': 'fontFeature',
  'font-variation-settings': 'fontVariation',
};

function classDecls(model, selector) {
  /* Any selector: a class (.type-h1), an element (h1), a compound one.
     A rule listing several selectors (h1, .h1 { … }) counts for each. */
  const matches = (s) => s === selector || s.split(',').map((x) => x.trim()).includes(selector);
  const hits = model.rules.filter((r) => matches(r.selector) && !r.context.some((c) => /^@media\b.*prefers-reduced-motion/.test(c)));
  if (!hits.length) fail(`typography: selector ${selector} not found in ${model.rules[0]?.file ?? 'the stylesheets'}`);
  const out = {};
  /* Unconditioned rules first — @layer orders rules but does not decide
     whether they apply, so it counts as unconditioned. Responsive
     overrides only fill gaps: the frontmatter holds one value, and the
     one that always applies is the honest one. */
  const unconditioned = (h) => h.context.every((c) => /^@layer\b/.test(c));
  for (const r of hits.filter(unconditioned)) for (const [p, v] of r.decls) out[p] = v;
  if (!Object.keys(out).length) for (const r of hits) for (const [p, v] of r.decls) out[p] ??= v;
  if (out['@apply'] || Object.keys(out).some((k) => k.startsWith('@apply')))
    fail(`typography: ${selector} uses @apply; map its properties explicitly in the config instead`);
  return out;
}

function cleanFamily(v) {
  return v
    .split(',')
    .map((f) => f.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
    .join(', ');
}

/* The DESIGN.md spec wants a plain dimension (px, em, rem) and its
   linter rejects clamp() outright. A fluid value is published as one of
   its bounds — the desktop maximum by default — with the full clamp()
   beside it as a YAML comment, and kept whole in tokens.json. */
function toDimension(value, path, fluid, comments) {
  if (typeof value !== 'string') return value;
  const m = value.match(/^clamp\((.+)\)$/);
  if (!m) return value;
  const parts = [];
  let depth = 0;
  let start = 0;
  const inner = m[1];
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '(') depth++;
    else if (inner[i] === ')') depth--;
    else if (inner[i] === ',' && depth === 0) {
      parts.push(inner.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(inner.slice(start).trim());
  if (parts.length !== 3) return value;
  const pick = simplifyCalc(fluid === 'min' ? parts[0] : parts[2]);
  if (!/^-?\d*\.?\d+(px|rem|em)$/.test(pick)) return value;
  comments[path] = value;
  return pick;
}

function typographyEntry(model, tw3, spec, name, fluid = 'max', comments = {}) {
  const entry = {};
  const put = (prop, raw) => {
    if (raw == null || raw === '' || raw === 'normal' || raw === 'inherit') return;
    /* A bare custom-property name means "the value of", the same as in
       every other mapping; a CSS expression is resolved as written. */
    const expr = typeof raw === 'string' && /^--[\w-]+$/.test(raw) ? `var(${raw})` : raw;
    let v = typeof expr === 'string' ? model.resolveIn(expr) : expr;
    if (typeof v === 'string' && /var\(--/.test(v)) fail(`typography.${name}.${prop}: ${raw} is not defined in the mapped stylesheets`);
    if (v === 'normal' || v === 'inherit') return;
    if (prop === 'fontFamily') v = cleanFamily(String(v));
    if (prop === 'fontWeight') v = Number(v);
    if (['fontSize', 'lineHeight', 'letterSpacing'].includes(prop)) v = toDimension(v, `typography.${name}.${prop}`, fluid, comments);
    if (prop === 'lineHeight' && /^-?\d*\.?\d+$/.test(String(v))) v = Number(v);
    entry[prop] = v;
  };
  const sel = spec.selector ?? spec.class;
  if (sel) {
    const decls = classDecls(model, sel);
    for (const [css, key] of Object.entries(TYPO_PROPS)) if (decls[css]) put(key, decls[css]);
    if (decls.font && !decls['font-size']) fail(`typography.${name}: ${sel} uses the font shorthand; map it explicitly`);
  }
  if (spec.tailwind) {
    const step = String(spec.tailwind).replace(/^text-/, '').replace(/^fontSize\./, '');
    const tw4 = model.scope()[`--text-${step}`];
    if (tw4) {
      put('fontSize', tw4);
      const lh = model.scope()[`--text-${step}--line-height`];
      if (lh) put('lineHeight', lh);
      const ls = model.scope()[`--text-${step}--letter-spacing`];
      if (ls) put('letterSpacing', ls);
    } else if (tw3?.theme.fontSize?.[step]) {
      const fs = tw3.theme.fontSize[step];
      const [size, extra] = Array.isArray(fs) ? fs : [fs, {}];
      put('fontSize', size);
      const opts = typeof extra === 'string' ? { lineHeight: extra } : extra ?? {};
      if (opts.lineHeight) put('lineHeight', opts.lineHeight);
      if (opts.letterSpacing) put('letterSpacing', opts.letterSpacing);
      if (opts.fontWeight) put('fontWeight', opts.fontWeight);
    } else fail(`typography.${name}: text-${step} is not defined by the project's theme${model.hasTwDefaults ? '' : ' (and tailwindcss is not installed to resolve defaults)'}`);
  }
  for (const [k, v] of Object.entries(spec)) {
    if (k === 'class' || k === 'selector' || k === 'tailwind') continue;
    if (!Object.values(TYPO_PROPS).includes(k)) fail(`typography.${name}.${k} is not a DESIGN.md typography property`);
    put(k, v);
  }
  if (!entry.fontSize) fail(`typography.${name} resolved no fontSize`);
  return entry;
}

function mapValue(model, raw, where) {
  if (typeof raw !== 'string') return raw;
  const at = raw.match(/^(--[\w-]+)@(.+)$/);
  if (at) return checkResolved(model.resolveIn(`var(${at[1]})`, at[2]), raw, where);
  if (raw.startsWith('--')) return checkResolved(model.resolveIn(`var(${raw})`), raw, where);
  return model.resolveIn(raw);
}

function checkResolved(v, raw, where) {
  if (v.startsWith('var(')) fail(`${where}: ${raw} is not defined in the mapped stylesheets`);
  return v;
}

function buildFrontmatter(config, baseModel, tw3) {
  const d = config.designMd;
  if (!d) return null;
  /* The unsuffixed tokens are the theme people actually see. For a
     dark-first product (<html class="dark">) that is .dark, not :root;
     the other themes are published with a suffix via `modes`. */
  const base = d.mode ?? ':root';
  if (base !== ':root') baseModel.scope(base); /* throws if the mode doesn't exist */
  const model = {
    ...baseModel,
    resolveIn: (v, m) => baseModel.resolveIn(v, m ?? base),
    scope: (m) => baseModel.scope(m ?? base),
  };
  const fm = { version: 'alpha', name: d.name ?? config.name };
  if (!fm.name) fail('designMd.name (or config.name) is required');
  if (d.description ?? config.description) fm.description = d.description ?? config.description;
  if (d.omitted?.length) fm.omitted = d.omitted;

  const modeSuffix = d.modes ?? {};
  if (d.colors) {
    fm.colors = {};
    for (const [name, raw] of Object.entries(d.colors)) {
      const v = mapValue(model, raw, `colors.${name}`);
      if (!isColor(v)) fail(`colors.${name}: ${raw} resolved to "${v}", which is not a colour`);
      fm.colors[name] = v;
    }
    for (const [mode, suffix] of Object.entries(modeSuffix)) {
      if (mode === base) continue;
      for (const [name, raw] of Object.entries(d.colors)) {
        if (typeof raw !== 'string' || !raw.startsWith('--') || raw.includes('@')) continue;
        const v = checkResolved(model.resolveIn(`var(${raw})`, mode), raw, `colors.${name}@${mode}`);
        if (v !== fm.colors[name]) fm.colors[`${name}-${suffix}`] = v;
      }
    }
  }
  const comments = {};
  const fluid = d.fluid ?? 'max';
  if (!['max', 'min'].includes(fluid)) fail(`designMd.fluid must be "max" or "min", not "${fluid}"`);
  if (d.typography) {
    fm.typography = {};
    for (const [name, spec] of Object.entries(d.typography)) fm.typography[name] = typographyEntry(model, tw3, spec, name, fluid, comments);
  }
  for (const group of ['rounded', 'spacing']) {
    if (!d[group]) continue;
    fm[group] = {};
    for (const [name, raw] of Object.entries(d[group])) {
      let v = toDimension(mapValue(model, raw, `${group}.${name}`), `${group}.${name}`, fluid, comments);
      if (typeof v === 'string' && /^-?\d*\.?\d+$/.test(v)) v = Number(v);
      fm[group][name] = v;
    }
  }
  if (d.components) {
    fm.components = {};
    for (const [comp, props] of Object.entries(d.components)) {
      fm.components[comp] = {};
      for (const [prop, raw] of Object.entries(props)) {
        fm.components[comp][prop] = typeof raw === 'string' && /^\{[\w.-]+\}$/.test(raw) ? raw : mapValue(model, raw, `components.${comp}.${prop}`);
      }
    }
    /* Every {ref} must land on something this block defines. */
    for (const [comp, props] of Object.entries(fm.components))
      for (const [prop, v] of Object.entries(props)) {
        if (typeof v !== 'string' || !v.startsWith('{')) continue;
        const path = v.slice(1, -1).split('.');
        let node = fm;
        for (const p of path) node = node?.[p];
        if (node == null) fail(`components.${comp}.${prop}: ${v} does not resolve to a token in this frontmatter`);
      }
  }
  Object.defineProperty(fm, '$comments', { value: comments, enumerable: false });
  return fm;
}

/* A deliberately small YAML writer: maps, lists, strings, numbers,
   and a trailing comment where a value was reduced from a clamp(). */
function toYaml(obj, indent = 0, path = '', comments = obj.$comments ?? {}) {
  const pad = ' '.repeat(indent);
  const key = (k) => (/^[A-Za-z0-9_-]+$/.test(k) ? k : JSON.stringify(k));
  const scalar = (v) => (typeof v === 'number' ? String(v) : JSON.stringify(String(v)));
  const note = (p) => (comments[p] ? `  # ${comments[p]}` : '');
  let out = '';
  for (const [k, v] of Object.entries(obj)) {
    const p = path ? `${path}.${k}` : k;
    if (Array.isArray(v)) {
      out += `${pad}${key(k)}:\n`;
      for (const item of v) {
        if (item && typeof item === 'object') {
          const [first, ...rest] = Object.entries(item);
          out += `${pad}  - ${key(first[0])}: ${scalar(first[1])}\n`;
          for (const [rk, rv] of rest) out += `${pad}    ${key(rk)}: ${scalar(rv)}\n`;
        } else out += `${pad}  - ${scalar(item)}\n`;
      }
    } else if (v && typeof v === 'object') {
      out += `${pad}${key(k)}:\n${toYaml(v, indent + 2, p, comments)}`;
    } else out += `${pad}${key(k)}: ${scalar(v)}${note(p)}\n`;
  }
  return out;
}

const FM_NOTE = (config) =>
  `# Generated by scripts/design-tokens.mjs from ${(config.css ?? []).concat(config.tailwind ? [config.tailwind] : []).join(', ')}.\n` +
  `# Do not edit this block: change the source, or the mapping in design/tokens.config.json, then run the generator.\n`;

function renderFrontmatter(config, fm) {
  return `---\n${FM_NOTE(config)}${toYaml(fm)}---\n`;
}

function splitDesignMd(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  return m ? { frontmatter: m[0], body: text.slice(m[0].length) } : { frontmatter: null, body: text };
}

/* ══════════════════════════════════════════════════════════════════
   Assemble tokens.json
   ══════════════════════════════════════════════════════════════════ */

const sortObj = (o) =>
  Object.fromEntries(
    Object.keys(o)
      .sort()
      .map((k) => [k, o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) ? sortObj(o[k]) : o[k]])
  );

function build(config) {
  const model = loadModel(config);
  const tw3 = loadTailwind3(config);
  const swept = sweep(config);

  if (config.fontVars) {
    const s = config.sweep ?? {};
    const exts = s.extensions ?? DEFAULT_EXT;
    const dirs = [...(s.include ?? ['src', 'app', 'components', 'lib', 'pages'])];
    const files = dirs.flatMap((d) => walkFiles(d, exts, []));
    const corpus = files.map((f) => readText(f)).join('\n') + (config.tailwind ? readText(config.tailwind) : '');
    for (const name of Object.keys(config.fontVars))
      if (!corpus.includes(name)) fail(`fontVars names ${name}, but no source file mentions it any more. Remove it or update the mapping.`);
  }

  /* Every mode's variables, raw as written and resolved as rendered. */
  const modes = {};
  for (const [key, vars] of Object.entries(model.modes)) {
    modes[key] = {};
    const resolveMode = key.startsWith('@') || model.rootKeys.includes(key) ? ':root' : key;
    for (const [name, raw] of Object.entries(vars)) {
      let resolved;
      try {
        resolved = model.resolveIn(raw, resolveMode);
      } catch {
        resolved = model.resolveIn(raw);
      }
      modes[key][name] = resolved === raw ? raw : { value: raw, resolved };
    }
  }
  const resolveBlock = (source, mode) => {
    const out = {};
    for (const [key, vars] of Object.entries(source)) {
      out[key] = {};
      for (const [name, raw] of Object.entries(vars)) {
        const resolved = model.resolveIn(raw, mode(key));
        out[key][name] = resolved === raw ? raw : { value: raw, resolved };
      }
    }
    return out;
  };
  const theme = resolveBlock(model.theme, () => ':root');
  const scoped = resolveBlock(model.scoped, (key) => key);

  const extra = {};
  for (const x of config.extra ?? []) extra[x.name] = literalFromCode(x.file, x.const ?? x.name);

  const tokens = {
    $generated: `design-tokens.mjs ${VERSION}. Do not edit; run the generator.`,
    sources: {
      css: config.css,
      ...(config.tailwind ? { tailwind: config.tailwind } : {}),
      sweep: config.sweep?.include ?? ['src', 'app', 'components', 'lib', 'pages'],
    },
    modes: sortObj(modes),
    ...(Object.keys(theme).length ? { theme: sortObj(theme) } : {}),
    ...(Object.keys(scoped).length ? { scoped: sortObj(scoped) } : {}),
    ...(tw3 ? { tailwind: sortObj(tw3.theme) } : {}),
    literals: swept.literals,
    ...(Object.keys(extra).length ? { extra } : {}),
  };

  const fm = buildFrontmatter(config, model, tw3);
  return { tokens, fm, model, tw3, swept };
}

/* ══════════════════════════════════════════════════════════════════
   --check: what drifted, and where
   ══════════════════════════════════════════════════════════════════ */

function flatten(obj, prefix = '', out = {}) {
  if (Array.isArray(obj)) {
    for (const v of obj) out[`${prefix}[]${JSON.stringify(v)}`] = true;
    return out;
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
    return out;
  }
  out[prefix] = obj;
  return out;
}

function diff(before, after) {
  const a = flatten(before);
  const b = flatten(after);
  const changes = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k.startsWith('$generated')) continue;
    if (!(k in a)) changes.push({ kind: 'added', path: k, to: b[k] });
    else if (!(k in b)) changes.push({ kind: 'removed', path: k, from: a[k] });
    else if (a[k] !== b[k]) changes.push({ kind: 'changed', path: k, from: a[k], to: b[k] });
  }
  return changes.sort((x, y) => x.path.localeCompare(y.path));
}

function describe(change, where) {
  const m = change.path.match(/^literals\.(?:(arbitrary)\.([\w-]+)|([\w]+))\[\](.*)$/);
  if (m) {
    const value = JSON.parse(m[4]);
    const key = m[1] ? `arbitrary.${m[2]}:${value}` : `${m[3]}:${value}`;
    const label = m[1] ? `${m[2]}-${value}` : value;
    const cat = m[1] ? 'arbitrary value' : m[3];
    if (change.kind === 'added') return `+ new ${cat} ${label}   first seen ${where[key] ?? '?'}`;
    return `- ${cat} ${label} no longer appears anywhere`;
  }
  const path = change.path.replace(/\[\](.*)$/, (_, v) => ` ${v}`);
  if (change.kind === 'changed') return `~ ${path}: ${change.from} → ${change.to}`;
  if (change.kind === 'added') return `+ ${path}${change.to === true ? '' : `: ${change.to}`}`;
  return `- ${path}${change.from === true ? '' : `: ${change.from}`}`;
}

/* ══════════════════════════════════════════════════════════════════
   --report: facts for the audit
   ══════════════════════════════════════════════════════════════════ */

/* Tailwind 4 theme namespace → the utilities that read it. Longer
   namespaces first, so --font-weight-bold is not read as --font-*. */
const NAMESPACE_UTILS = {
  'font-weight': ['font'],
  container: ['max-w', 'w', 'min-w', 'basis', '@max', '@min', '@container'],
  'inset-shadow': ['inset-shadow'],
  'drop-shadow': ['drop-shadow'],
  'text-shadow': ['text-shadow'],
  perspective: ['perspective'],
  aspect: ['aspect'],
  blur: ['blur', 'backdrop-blur'],
  color: ['bg', 'text', 'border', 'ring', 'fill', 'stroke', 'from', 'via', 'to', 'outline', 'divide', 'shadow', 'decoration', 'placeholder', 'caret', 'accent', 'ring-offset', 'border-t', 'border-b', 'border-l', 'border-r', 'border-x', 'border-y'],
  radius: ['rounded', 'rounded-t', 'rounded-b', 'rounded-l', 'rounded-r', 'rounded-tl', 'rounded-tr', 'rounded-bl', 'rounded-br', 'rounded-s', 'rounded-e'],
  font: ['font'],
  text: ['text'],
  shadow: ['shadow'],
  ease: ['ease'],
  animate: ['animate'],
  spacing: ['p', 'm', 'gap', 'w', 'h', 'px', 'py', 'mx', 'my'],
  breakpoint: [],
  tracking: ['tracking'],
  leading: ['leading'],
};

function report(config, built) {
  const { model, swept } = built;
  const s = config.sweep ?? {};
  const include = s.include ?? ['src', 'app', 'components', 'lib', 'pages'];
  const exts = s.extensions ?? DEFAULT_EXT;
  const files = [...new Set(include.flatMap((d) => walkFiles(d, exts, (s.exclude ?? []).map((x) => x.replace(/\/$/, '')))))];
  const corpus = files.map((f) => stripCodeComments(readText(f))).join('\n');
  const cssCorpus = (config.css ?? []).map((f) => stripCssComments(readText(f))).join('\n');

  /* Colours, compared within one theme at a time. Across themes,
     similar values are the point (two dark backgrounds); within one,
     two values a hair apart are usually one colour typed twice — or a
     tonal step too small for anyone to see, which is worth knowing too.
     Aliases (shadcn's --color-x: var(--x)) resolve to the same value
     and are not duplicates, so each theme is reduced to distinct values. */
  const colorVals = new Set();
  const nearDuplicates = [];
  const seenPairs = new Set();
  const themeModes = Object.keys(model.modes).filter((k) => !k.startsWith('@') && !model.rootKeys.includes(k));
  for (const mode of [':root', ...themeModes]) {
    const sc = model.scope(mode);
    const byValue = new Map();
    const own = mode === ':root' ? Object.assign({}, ...model.rootKeys.map((k) => model.modes[k])) : { ...Object.assign({}, ...model.rootKeys.map((k) => model.modes[k])), ...model.modes[mode] };
    for (const name of Object.keys(own)) {
      const val = simplifyCalc(resolveVars(sc[name], (n) => sc[n]));
      if (!isColor(val)) continue;
      const key = val.toLowerCase().replace(/\s+/g, ' ');
      colorVals.add(key);
      if (!byValue.has(key)) byValue.set(key, []);
      byValue.get(key).push(name);
    }
    const entries = [...byValue.entries()].map(([v, names]) => ({ v, names, lab: parseColor(v) }));
    for (let i = 0; i < entries.length; i++)
      for (let j = i + 1; j < entries.length; j++) {
        const d = deltaE(entries[i].lab, entries[j].lab);
        const pair = [entries[i].v, entries[j].v].sort().join('|');
        if (d > 0 && d < NEAR_DUPLICATE && !seenPairs.has(pair)) {
          seenPairs.add(pair);
          nearDuplicates.push({ mode, a: entries[i].v, aUsedBy: entries[i].names, b: entries[j].v, bUsedBy: entries[j].names, deltaE: Math.round(d * 10000) / 10000 });
        }
      }
  }
  nearDuplicates.sort((x, y) => x.deltaE - y.deltaE);

  /* Tokens with no static reference. Custom properties: var(--x) anywhere
     but their own definition. Tailwind 4 theme tokens: the utility their
     namespace generates. "No static reference" rather than "dead": a
     class built at runtime (bg-${tone}) cannot be seen from here. */
  const unreferenced = [];
  const allDefs = { ...Object.assign({}, ...Object.values(model.modes)), ...Object.assign({}, ...Object.values(model.theme)) };
  /* Config files reference tokens too: a Tailwind 3 theme is mostly
     var(--x) strings, and plugins compose names at build time. */
  const configFiles = [config.tailwind, ...(config.references ?? [])].filter((f) => f && existsSync(resolve(ROOT, f)));
  const everything = [corpus, cssCorpus, ...configFiles.map((f) => stripCodeComments(readText(f)))].join('\n');
  /* `var(--text-${step})` or '--text-' + step: every --text-* is in use,
     just not by a name this scanner can see written out. */
  const dynamicPrefixes = new Set();
  for (const m of everything.matchAll(/(--[\w-]*?-?)\$\{/g)) if (m[1].length > 2) dynamicPrefixes.add(m[1]);
  for (const m of everything.matchAll(/["'`](--[\w-]+-)["'`]\s*\+/g)) dynamicPrefixes.add(m[1]);
  /* Every mention of a name counts except its own declaration. */
  const mentions = everything.replace(/(--[\w-]+)\s*:(?!:)/g, ' ');
  const spaces = Object.keys(NAMESPACE_UTILS).sort((a, b) => b.length - a.length).join('|');
  const escRe = (s) => s.replace(/[-]/g, '\\-');
  const memo = new Map();
  function isReferenced(name) {
    if (memo.has(name)) return memo.get(name);
    memo.set(name, true); /* cycle guard: assume used while deciding */
    const answer = (() => {
      if (new RegExp(`${escRe(name)}(?![\\w-])`).test(mentions)) return true;
      if ([...dynamicPrefixes].some((p) => name.startsWith(p))) return true;
      /* Consumed by the framework itself, not by a class you write. */
      if (/^--(default|tw)-/.test(name)) return true;
      /* --text-2xl--line-height rides along with text-2xl: judge the base. */
      const sub = name.match(/^(--[\w-]+?)--[\w-]+$/);
      if (sub) return sub[1] in allDefs || sub[1] in model.twDefaults ? isReferenced(sub[1]) : false;
      const ns = name.match(new RegExp(`^--(${spaces})-(.+)$`));
      if (ns) {
        const [, space, tail] = ns;
        const hit = (NAMESPACE_UTILS[space] ?? []).some((u) => new RegExp(`(?<![\\w-])${escRe(u)}-${escRe(tail)}(?![\\w-])`).test(corpus));
        if (hit) return true;
        if (space === 'breakpoint' && new RegExp(`(?<![\\w-])${escRe(tail)}:`).test(corpus)) return true;
      }
      /* Tailwind 3 exposes theme values through classes that name them. */
      const short = name.replace(/^--/, '');
      return new RegExp(`(?<![\\w-])[a-z]+(?:-[a-z]+)*-${escRe(short)}(?![\\w-])`).test(corpus);
    })();
    memo.set(name, answer);
    return answer;
  }
  for (const name of Object.keys(allDefs)) if (!isReferenced(name)) unreferenced.push(name);

  const lit = swept.literals;
  const counts = {
    stylesheets: (config.css ?? []).length,
    filesSwept: swept.files,
    modes: Object.keys(model.modes).length,
    customProperties: Object.keys(allDefs).length,
    distinctColours: colorVals.size,
    arbitraryValues: Object.values(lit.arbitrary ?? {}).reduce((n, a) => n + a.length, 0),
    opacityModifiers: lit.opacity?.length ?? 0,
    radiusUtilities: lit.radius?.length ?? 0,
    zIndexes: lit.zIndex?.length ?? 0,
    motionValues: lit.motion?.length ?? 0,
    hardcodedHexInMarkup: swept.hardcodedColors.length,
  };
  const easings = (lit.motion ?? []).filter((m) => m.startsWith('ease-') || m.startsWith('cubic-bezier'));
  const durations = (lit.motion ?? []).filter((m) => m.startsWith('duration-'));
  return {
    counts,
    modes: Object.keys(model.modes),
    nearDuplicateColours: nearDuplicates,
    unreferencedTokens: unreferenced.sort(),
    arbitraryByUtility: Object.fromEntries(Object.entries(lit.arbitrary ?? {}).map(([k, v]) => [k, v.length])),
    easings,
    durations,
    zIndexes: lit.zIndex ?? [],
    hardcodedHexByFile: Object.values(
      swept.hardcodedColors.reduce((acc, h) => {
        const file = h.at.replace(/:\d+$/, '');
        (acc[file] ??= { file, count: 0, sample: [] }).count++;
        if (acc[file].sample.length < 4) acc[file].sample.push(h.value);
        return acc;
      }, {})
    ).sort((a, b) => b.count - a.count),
    tailwind: config.tailwind ? 3 : model.hasTwDefaults || Object.keys(model.theme).length ? 4 : null,
  };
}

function printReport(r) {
  const lines = [];
  lines.push('design-tokens report');
  lines.push('');
  for (const [k, v] of Object.entries(r.counts)) lines.push(`  ${k.padEnd(22)} ${v}`);
  lines.push('');
  lines.push(`  modes: ${r.modes.join('  |  ') || '(none)'}`);
  if (r.easings.length) lines.push(`  easing values (${r.easings.length}): ${r.easings.join('  ')}`);
  if (r.durations.length) lines.push(`  durations (${r.durations.length}): ${r.durations.join('  ')}`);
  if (r.zIndexes.length) lines.push(`  z-indexes (${r.zIndexes.length}): ${r.zIndexes.join('  ')}`);
  const arb = Object.entries(r.arbitraryByUtility).filter(([, n]) => n);
  if (arb.length) lines.push(`  arbitrary values by utility: ${arb.map(([k, n]) => `${k}×${n}`).join('  ')}`);
  lines.push('');
  const names = (list) => (list.length > 2 ? `${list.slice(0, 2).join(', ')} +${list.length - 2}` : list.join(', '));
  if (r.nearDuplicateColours.length) {
    lines.push(`  near-duplicate colours within one theme (ΔE_ok < ${NEAR_DUPLICATE}, closest first) —`);
    lines.push(`  one colour typed twice, or a step too small to see:`);
    for (const d of r.nearDuplicateColours.slice(0, 15))
      lines.push(`    ${d.mode.padEnd(8)} ${d.a} (${names(d.aUsedBy)})  ≈  ${d.b} (${names(d.bUsedBy)})  ΔE ${d.deltaE}`);
    if (r.nearDuplicateColours.length > 15) lines.push(`    … ${r.nearDuplicateColours.length - 15} more with --json`);
  } else lines.push('  near-duplicate colours: none');
  lines.push('');
  if (r.unreferencedTokens.length) {
    lines.push(`  tokens with no static reference (${r.unreferencedTokens.length}) — check before calling them dead;`);
    lines.push(`  a class built at runtime cannot be seen from here:`);
    for (let i = 0; i < r.unreferencedTokens.length; i += 4) lines.push(`    ${r.unreferencedTokens.slice(i, i + 4).join('  ')}`);
  } else lines.push('  tokens with no static reference: none');
  if (r.hardcodedHexByFile.length) {
    lines.push('');
    lines.push(`  hex colours written in code rather than tokens (${r.counts.hardcodedHexInMarkup} distinct, by file) —`);
    lines.push(`  third-party brand colours are legitimate; a tint of your own palette is not:`);
    for (const f of r.hardcodedHexByFile.slice(0, 12)) lines.push(`    ${String(f.count).padStart(3)}  ${f.file}  ${f.sample.join(' ')}`);
    if (r.hardcodedHexByFile.length > 12) lines.push(`    … ${r.hardcodedHexByFile.length - 12} more files`);
  }
  return lines.join('\n');
}

/* ══════════════════════════════════════════════════════════════════
   --init: propose a config from what is there
   ══════════════════════════════════════════════════════════════════ */

function detectInit() {
  const pkgPath = join(ROOT, 'package.json');
  const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf8')) : {};
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const twVersion = deps.tailwindcss ? parseInt(String(deps.tailwindcss).replace(/[^\d]/, ''), 10) : null;

  const candidates = ['app/globals.css', 'src/app/globals.css', 'src/styles/globals.css', 'styles/globals.css', 'src/index.css', 'src/app.css', 'src/styles/global.css', 'app/app.css', 'src/global.css', 'assets/css/main.css'];
  let css = candidates.filter((c) => existsSync(join(ROOT, c)));
  if (!css.length) {
    const found = walkFiles('.', ['.css'], ['node_modules', 'public', 'dist', 'build', '.next'])
      .filter((f) => /:root|@theme/.test(readText(f)))
      .slice(0, 3);
    css = found;
  }
  const tailwind = ['tailwind.config.ts', 'tailwind.config.js', 'tailwind.config.mjs', 'tailwind.config.cjs'].find((f) => existsSync(join(ROOT, f)));
  const include = ['src', 'app', 'components', 'lib', 'pages', 'ui'].filter((d) => existsSync(join(ROOT, d)));

  const config = {
    name: pkg.name ?? 'Project',
    css,
    ...(tailwind && (twVersion ?? 3) < 4 ? { tailwind } : {}),
    sweep: { include, exclude: [] },
    designMd: { file: 'DESIGN.md', name: pkg.name ?? 'Project', description: '' },
  };

  if (!css.length) return { config, notes: ['No stylesheet with :root or @theme found. Set "css" by hand.'] };

  const model = loadModel(config);
  const vars = model.scope();
  const has = (n) => n in vars;
  const pick = (...names) => names.find(has);
  const notes = [];
  const colors = {};
  const set = (k, ...names) => {
    const n = pick(...names);
    if (n) colors[k] = n;
  };
  /* Material 3 role names. The spec's linter treats primary, secondary,
     tertiary, error, surface, background and outline as standard
     families — and on-*, *-variant, *-container* as members of them — so
     these names lint clean however many components reference them, and
     every design tool already knows what they mean. */
  const shadcn = has('--primary-foreground') && has('--card');
  set('primary', '--primary', '--brand', '--accent-color', '--color-primary', '--fg', '--foreground', '--text');
  set('on-primary', '--primary-foreground', '--on-primary');
  set('secondary', '--secondary', '--color-secondary');
  set('on-secondary', '--secondary-foreground');
  set('background', '--background', '--bg', '--ground', '--color-background');
  set('on-background', '--foreground', '--fg', '--text', '--color-foreground');
  set('surface', '--card', '--surface', '--panel', '--bg-raised');
  set('on-surface', '--card-foreground', '--foreground', '--fg');
  set('surface-variant', '--muted');
  set('on-surface-variant', '--muted-foreground', '--fg-muted', '--text-muted');
  set('surface-container-high', ...(shadcn ? ['--accent'] : []), '--surface-elevated', '--popover');
  set('outline-variant', '--border', '--line', '--hairline', '--border-subtle');
  set('outline', '--input', '--border-strong');
  set('error', '--destructive', '--error', '--danger', '--err');
  if (colors.primary && ['--fg', '--foreground', '--text'].includes(colors.primary))
    notes.push(`No brand colour found, so "primary" maps to ${colors.primary} (the text colour). Correct for a monochrome system; otherwise remap it.`);
  const modes = Object.keys(model.modes).filter((k) => /^\.dark$|^\[data-theme=["']?dark["']?\]$|prefers-color-scheme: ?dark/.test(k));
  const designMd = config.designMd;
  designMd.colors = colors;

  /* Which theme do people actually see? A dark-first product sets it on
     the root element or as the theme provider's default. */
  const shells = ['src/app/layout.tsx', 'app/layout.tsx', 'src/app/layout.jsx', 'app/layout.jsx', 'pages/_document.tsx', 'src/pages/_document.tsx', 'index.html', 'src/app.html', 'app.vue', 'src/App.tsx', 'src/main.tsx']
    .filter((f) => existsSync(join(ROOT, f)))
    .map((f) => readText(f))
    .join('\n');
  const darkFirst =
    /<html[^>]*class(?:Name)?=["'{`][^"'`}]*\bdark\b/.test(shells) || /defaultTheme=["'{]\s*["']?dark["']?/.test(shells) || /forcedTheme=["'{]\s*["']?dark/.test(shells);
  if (modes.length && darkFirst && modes[0] === '.dark') {
    designMd.mode = '.dark';
    notes.push('The root layout defaults to dark, so the frontmatter publishes the dark theme (designMd.mode). tokens.json keeps every theme.');
  }
  const themes = Object.keys(model.modes).filter((k) => !model.rootKeys.includes(k) && !k.startsWith('@'));
  if (themes.length)
    notes.push(
      `Themes found: ${themes.join(', ')}. tokens.json carries all of them; describe them in the Colors prose. ` +
        `Publishing them in the frontmatter too ("modes") makes the linter flag each suffixed colour as unreferenced once components exist.`
    );

  const radii = Object.keys(vars).filter((n) => /^--radius-[\w]+$/.test(n) && !(n in model.twDefaults && !Object.values(model.theme).some((t) => n in t)));
  if (radii.length) designMd.rounded = Object.fromEntries(radii.map((n) => [n.replace('--radius-', ''), n]));
  else if (has('--radius')) designMd.rounded = { md: '--radius' };
  else notes.push('No radius tokens found. Add designMd.rounded by hand, or list it in designMd.omitted.');

  const typeClasses = [...new Set(model.rules.map((r) => r.selector).filter((s) => /^\.(type|text|heading|display|body)-[\w-]+$/.test(s) && model.rules.some((r) => r.selector === s && r.decls.some(([p]) => p === 'font-size'))))];
  if (typeClasses.length) {
    designMd.typography = Object.fromEntries(typeClasses.slice(0, 15).map((c) => [c.replace(/^\./, ''), { class: c }]));
    notes.push(`Mapped ${Math.min(typeClasses.length, 15)} type classes by name. Rename the keys to roles (headline-lg, body-md, label-sm) and drop variants.`);
  } else if (Object.keys(vars).some((n) => /^--text-[\w]+$/.test(n) && !(n in model.twDefaults))) {
    const steps = Object.keys(vars).filter((n) => /^--text-[\w]+$/.test(n) && !(n in model.twDefaults));
    designMd.typography = Object.fromEntries(steps.map((n) => [n.replace('--text-', ''), { tailwind: n.replace('--', '') }]));
  } else if (model.rules.some((r) => /^h[1-6]$/.test(r.selector) && r.decls.some(([p]) => p === 'font-size'))) {
    /* The scale lives on the elements themselves (h1 { font-size … }). */
    const heads = [...new Set(model.rules.filter((r) => /^h[1-6]$/.test(r.selector) && r.decls.some(([p]) => p === 'font-size')).map((r) => r.selector))].sort();
    designMd.typography = Object.fromEntries(heads.map((h) => [h, { selector: h, fontFamily: pick('--font-sans', '--font-geist-sans', '--font-body') ?? undefined }]));
    notes.push(`The type scale is set on ${heads.join(', ')}. Rename the keys to roles (headline-lg, headline-md…) and add body and label roles — e.g. "body-md": { "tailwind": "text-base" }.`);
  } else {
    notes.push('No custom type scale found. Map the roles you use (e.g. "headline-lg": { "tailwind": "text-4xl", "fontFamily": "--font-sans", "fontWeight": 600 }).');
  }
  if (has('--spacing')) designMd.spacing = { unit: '--spacing' };

  return { config, notes };
}

/* ══════════════════════════════════════════════════════════════════
   Main
   ══════════════════════════════════════════════════════════════════ */

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) fail(`no config at ${rel(CONFIG_PATH)}. Run with --init to propose one.`);
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    fail(`${rel(CONFIG_PATH)} is not valid JSON: ${e.message}`);
  }
}

function main() {
  if (flag('--init')) {
    if (existsSync(CONFIG_PATH) && !flag('--force')) fail(`${rel(CONFIG_PATH)} already exists. Pass --force to overwrite it.`);
    const { config, notes } = detectInit();
    mkdirSync(dirname(CONFIG_PATH), { recursive: true });
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
    console.log(`wrote ${rel(CONFIG_PATH)} — a proposal. Review the designMd mapping before generating.`);
    for (const n of notes) console.log(`  · ${n}`);
    return 0;
  }

  const config = loadConfig();
  const built = build(config);
  const tokensPath = resolve(ROOT, config.output ?? 'design/tokens.json');
  const designPath = resolve(ROOT, config.designMd?.file ?? 'DESIGN.md');
  const tokensJson = JSON.stringify(built.tokens, null, 2) + '\n';
  const fmText = built.fm ? renderFrontmatter(config, built.fm) : null;

  if (flag('--report')) {
    const r = report(config, built);
    console.log(AS_JSON ? JSON.stringify(r, null, 2) : printReport(r));
    return 0;
  }

  if (flag('--check')) {
    const problems = [];
    if (!existsSync(tokensPath)) problems.push({ file: rel(tokensPath), lines: ['missing — run the generator and commit it'] });
    else {
      const before = JSON.parse(readFileSync(tokensPath, 'utf8'));
      const changes = diff(before, built.tokens);
      if (changes.length) problems.push({ file: rel(tokensPath), lines: changes.map((c) => describe(c, built.swept.where)) });
    }
    if (fmText) {
      if (!existsSync(designPath)) problems.push({ file: rel(designPath), lines: ['missing'] });
      else {
        const { frontmatter } = splitDesignMd(readFileSync(designPath, 'utf8'));
        if (frontmatter !== fmText) {
          /* A line diff is enough: the block is ours, one value per line. */
          const was = (frontmatter ?? '').split('\n').filter((l) => l && !l.startsWith('#') && l !== '---');
          const now = fmText.split('\n').filter((l) => l && !l.startsWith('#') && l !== '---');
          const lines = [
            ...(frontmatter ? [] : ['no frontmatter — the file was written by hand or the block was deleted']),
            ...was.filter((l) => !now.includes(l)).map((l) => `- ${l.trim()}`),
            ...now.filter((l) => !was.includes(l)).map((l) => `+ ${l.trim()}`),
          ];
          problems.push({ file: `${rel(designPath)} frontmatter`, lines: lines.length ? lines : ['differs in comments or order — regenerate it'] });
        }
      }
    }
    /* The prose, too. The body is hand-written, so it's where stale values
       hide: a {colors.x} the mapping renamed, a hex the code no longer has. */
    if (fmText && existsSync(designPath)) {
      const text = readFileSync(designPath, 'utf8');
      const { frontmatter, body } = splitDesignMd(text);
      const offset = frontmatter ? frontmatter.split('\n').length - 1 : 0;
      const lineOf = (i) => body.slice(0, i).split('\n').length + offset;
      const lines = [];
      for (const m of body.matchAll(/\{(colors|typography|rounded|spacing|components)\.([\w-]+)\}/g)) {
        if (built.fm[m[1]]?.[m[2]] == null) lines.push(`line ${lineOf(m.index)}: {${m[1]}.${m[2]}} is not in the frontmatter`);
      }
      const known = new Set();
      const collect = (node) => {
        if (typeof node === 'string') for (const h of node.match(/#[0-9a-f]{3,8}\b/gi) ?? []) known.add(h.toLowerCase());
        else if (node && typeof node === 'object') Object.values(node).forEach(collect);
      };
      collect(built.tokens);
      collect(built.fm);
      for (const h of built.swept.hardcodedColors) known.add(h.value.toLowerCase());
      const expand = (h) => (h.length === 4 ? `#${[...h.slice(1)].map((c) => c + c).join('')}` : h);
      /* (#15161A) after a token name is the recommended style; ](#anchor) is a link. */
      for (const m of body.matchAll(/(?<![\w&/-])(?<!\]\()#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])/g)) {
        const h = m[0].toLowerCase();
        if (!known.has(h) && !known.has(expand(h))) lines.push(`line ${lineOf(m.index)}: ${m[0]} appears nowhere in the code`);
      }
      if (lines.length) problems.push({ file: `${rel(designPath)} prose`, lines });
    }

    if (AS_JSON) console.log(JSON.stringify({ ok: !problems.length, problems }, null, 2));
    else if (!problems.length) console.log(`✓ ${rel(tokensPath)}${fmText ? ` and ${rel(designPath)} frontmatter` : ''} match the implementation`);
    else {
      console.error('✗ design tokens have drifted from the implementation\n');
      for (const p of problems) {
        console.error(`  ${p.file}`);
        for (const l of p.lines.slice(0, 40)) console.error(`    ${l}`);
        if (p.lines.length > 40) console.error(`    … and ${p.lines.length - 40} more`);
        console.error('');
      }
      if (problems.some((p) => !p.file.endsWith('prose'))) {
        console.error('  A new literal usually means a value was invented instead of reusing a token.');
        console.error('  If the change is intended: run the generator, read the diff, commit both files.');
      }
      if (problems.some((p) => p.file.endsWith('prose')))
        console.error('  The prose names a token or value the code no longer has. Fix the sentence, not the code.');
    }
    return problems.length ? 1 : 0;
  }

  mkdirSync(dirname(tokensPath), { recursive: true });
  writeFileSync(tokensPath, tokensJson);
  let wrote = rel(tokensPath);
  if (fmText) {
    const existing = existsSync(designPath) ? readFileSync(designPath, 'utf8') : '';
    const { body } = splitDesignMd(existing);
    writeFileSync(designPath, fmText + (body.startsWith('\n') || !body ? body : `\n${body}`));
    wrote += ` and ${rel(designPath)} frontmatter`;
    if (!existing) console.log(`created ${rel(designPath)} with its frontmatter; the body is yours to write`);
  }
  console.log(`wrote ${wrote}`);
  return 0;
}

/* The pure parts, for the test suite. Importing this file runs nothing. */
export { parseCss, resolveVars, evalCalc, simplifyCalc, parseColor, deltaE, toDimension, toYaml, splitDesignMd, TokenError };

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.exitCode = main();
  } catch (e) {
    if (e instanceof TokenError) {
      console.error(`design-tokens: ${e.message}`);
      process.exitCode = 2;
    } else throw e;
  }
}
