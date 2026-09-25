# design/tokens.config.json

The config says **where** the values live and **which role** each one plays. It never holds a
value the code doesn't. `--init` writes a proposal; review every mapping before generating.

## Contents

- [Keys](#keys)
- [Mapping values](#mapping-values)
- [Typography](#typography)
- [Themes, fluid values and components](#themes-fluid-values-and-components)
- [The sweep](#the-sweep)
- [extend: a project's own semantic layer](#extend-a-projects-own-semantic-layer)
- [Recipes by stack](#recipes-by-stack)
- [Monorepos and non-Node projects](#monorepos-and-non-node-projects)

## Keys

| Key | Required | What it does |
|---|---|---|
| `name` | yes | Project name, used when `designMd.name` is absent |
| `description` | | One-line description for the frontmatter |
| `css` | yes | Stylesheets to parse: every `:root`, theme block, `@theme` and custom property in them |
| `tailwind` | Tailwind 3 only | Path to `tailwind.config.{js,ts}`. Resolved through the project's own `tailwindcss/resolveConfig` — so dependencies must be installed. Omit for Tailwind 4: its theme is read from the CSS |
| `fontVars` | when fonts load at runtime | `{ "--font-geist-sans": "Geist Sans" }`. Family names the CSS can't know. `--check` fails if a listed variable is no longer mentioned anywhere in the source |
| `sweep` | | Where to look for literals in markup. See [the sweep](#the-sweep) |
| `extra` | | Values that live in code, not CSS: `[{ "name": "heroGradient", "file": "components/hero-canvas.tsx", "const": "GRADIENT" }]`. Must be a plain array or object literal |
| `extend` | | A module that adds the project's own semantic groups to tokens.json. See [extend](#extend-a-projects-own-semantic-layer) |
| `references` | | Extra files that *use* tokens (a theme.ts, a plugin), so `--report` doesn't call their tokens unused |
| `output` | | Where tokens.json goes. Default `design/tokens.json` |
| `designMd` | for DESIGN.md | The frontmatter mapping. Without it, only tokens.json is written |

`designMd` keys: `file` (default `DESIGN.md`), `name`, `description`, `mode`, `colors`,
`typography`, `rounded`, `spacing`, `components`, `modes`, `fluid`, `omitted`.

## Naming colours

Use **Material 3 role names** wherever the meaning fits:

| Role | Name | shadcn source |
|---|---|---|
| Page ground | `background` / `on-background` | `--background` / `--foreground` |
| Cards, panels | `surface` / `on-surface` | `--card` / `--card-foreground` |
| Quiet areas, muted text | `surface-variant` / `on-surface-variant` | `--muted` / `--muted-foreground` |
| Hover, selected, raised | `surface-container-high` | `--accent` |
| Floating (popovers, menus) | `surface-container-highest` | `--popover` |
| Inputs | `surface-container` | `--input` |
| Hairlines, dividers | `outline-variant` | `--border` |
| Strong borders | `outline` | — |
| Main action | `primary` / `on-primary` | `--primary` / `--primary-foreground` |
| Secondary action | `secondary` / `on-secondary` | `--secondary` / `--secondary-foreground` |
| Destructive | `error` / `on-error` | `--destructive` |

It is not fashion. The spec's linter treats `primary`, `secondary`, `tertiary`, `error`, `surface`,
`background` and `outline` as standard families, and `on-*`, `*-variant`, `*-container*` as members
of them. Once `components` exist, it warns about every colour no component references — **unless**
it belongs to one of those families. `neutral` (the spec's own example name) and custom names like
`ink` or `brand-glow` get flagged; `background` and `surface-variant` don't. Keep a custom name when
the role genuinely has no Material equivalent — and reference it from a component, or accept the
warning knowingly.

`--init` proposes these names.

## Mapping values

Anywhere a mapping takes a value, it accepts:

| Form | Example | Means |
|---|---|---|
| A custom property | `"--primary"` | Its resolved value in `:root` — through every `var()` chain and `calc()` |
| A property in a mode | `"--primary@.dark"` | Its resolved value with `.dark` applied |
| A Tailwind 3 theme value | `"tailwind:borderRadius.2xl"`, `"tailwind:spacing.6"` | That key in the fully resolved theme, through the project's own `resolveConfig`. For values that only exist in the Tailwind config. On Tailwind 4 the theme is CSS: map `--radius-2xl` instead |
| A token reference | `"{colors.primary}"` | Components only: a reference the spec keeps as-is |
| A literal | `"8px"`, `400` | Allowed, discouraged. A literal can drift; a mapping can't. Use it for facts the CSS genuinely doesn't carry (a font weight set in a component) |

A mapping that points at a property the stylesheets don't define **fails** — it never falls back.
That is the point: a renamed token breaks the build instead of publishing yesterday's value.

## Typography

Each role is an object. Three ways to fill it, combinable (explicit keys win):

```jsonc
"typography": {
  // 1. A selector that declares font-size etc. in the parsed CSS — a class (.type-h1),
  //    an element (h1, often inside @layer base), anything the stylesheet names
  "headline-lg": { "selector": ".type-h1" },

  // 2. A Tailwind text step: TW4 reads --text-4xl and --text-4xl--line-height
  //    from the theme (or the installed defaults); TW3 reads theme.fontSize
  "headline-md": { "tailwind": "text-3xl", "fontFamily": "--font-sans", "fontWeight": 600 },

  // 3. Explicit properties, each a custom property or a literal
  "body-md": { "fontFamily": "--font-sans", "fontSize": "--text-body", "lineHeight": "--leading-body" }
}
```

Properties: `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `fontFeature`,
`fontVariation`. (`class` is accepted as an alias of `selector`.) A rule that uses `@apply` or the
`font` shorthand can't be read — map it explicitly and the generator will tell you so. Rules inside
`@layer` count as always applying; rules inside a media query only fill properties the base rule
leaves out.

Name the roles after the spec's recommended tokens where they fit — `headline-display`,
`headline-lg`, `headline-md`, `body-lg`, `body-md`, `body-sm`, `label-lg`, `label-md`, `label-sm`
— and map roles, not every variant. Nine to fifteen is typical. A system with four faces times
fourteen steps does not need fifty-six entries; it needs the eight an agent will actually reach for.

## Themes, fluid values and components

**The theme people see.** `"mode": ".dark"` makes the frontmatter publish the dark theme. Set it
when the product is dark-first — `<html class="dark">`, a theme provider defaulting to dark —
because the unsuffixed tokens should be what users actually see. `--init` detects this.

**Other themes.** tokens.json always carries every theme in full. In DESIGN.md, describe them in
the Colors prose ("three themes: dark by default, light, and a user-tinted custom theme; every
surface uses semantic tokens, so all three work without per-theme code"). `"modes": { ":root":
"light" }` additionally publishes each mapped colour as `<name>-light`, only where it differs —
but the linter flags every suffixed colour as unreferenced once components exist, so prefer prose
unless a downstream tool needs the values. Any selector works as a mode: `.dark`,
`[data-theme="dark"]`, `@media (prefers-color-scheme: dark) :root`.

A block only counts as a mode when it re-points a variable `:root` declares. A component that sets
its own variables (`.spotlight { --spot-x: 0 }`) is recorded under `scoped` in tokens.json, not
treated as a theme.

**Fluid values.** The spec requires a plain dimension (`px`, `rem`, `em`) and its linter rejects
`clamp()`. With `"fluid": "max"` (default) the frontmatter carries the clamp's upper bound — the
desktop value — with the full clamp as a trailing YAML comment; `"min"` carries the mobile bound.
tokens.json always keeps the clamp whole. Say in Typography prose that the scale is fluid, and
between which widths.

**Components.** Keep to the spec's eight properties: `backgroundColor`, `textColor`, `typography`,
`rounded`, `padding`, `size`, `height`, `width`. Reference tokens as `{colors.primary}`; variants
are sibling keys (`button-primary`, `button-primary-hover`). Every `{ref}` must resolve inside the
frontmatter, or the generator fails. Map the handful of primitives an agent builds with — button
variants, input, card, chip — not every component; the rest belong in `design/components.md`.

**Omitted.** `"omitted": [{ "section": "spacing", "reason": "Tailwind's default 4px scale, unmodified" }]`
tells the linter a group is intentionally absent.

## The sweep

The sweep reads source files for design values written in markup instead of tokens, and records
each category as a **sorted set of distinct values, with no counts**. Counts change on every edit;
the set changes only when a new value appears — which is exactly when `--check` should fail.

```jsonc
"sweep": {
  "include": ["src"],                        // default: src, app, components, lib, pages
  "exclude": ["src/app/design-system"],      // a page that *displays* tokens is not a source of them
  "extensions": [".tsx", ".ts", ".vue"],     // default covers tsx/ts/jsx/js/mjs/vue/svelte/astro/html/mdx
  "gate": ["arbitrary", "opacity", "radius", "zIndex", "motion"],
  "arbitrary": ["rounded", "text", "bg"]     // or "all"; default is the design-value utilities
}
```

| Category | Catches |
|---|---|
| `arbitrary` | `text-[13px]`, `bg-[#0c0c0e]`, `shadow-[…]` — per utility. Layout sizes (`w-[…]`, `top-[…]`) are excluded by default because one-off sizes are usually legitimate |
| `opacity` | `bg-white/[0.07]`, `border-black/40` — the hairline and tint alphas |
| `radius` | every `rounded*` utility |
| `zIndex` | every `z-*` |
| `motion` | `duration-*`, `delay-*`, `ease-*`, `cubic-bezier()` |

A utility with its own category is reported there only (`rounded-[13px]` is a radius, not also an
arbitrary value). Comments are blanked before sweeping so prose like "rounded corners" doesn't
count. Hex colours written in code are reported by `--report` but never gated — a third-party logo
colour is legitimate.

## extend: a project's own semantic layer

By default tokens.json holds what the generator parsed: `theme` (every custom property, resolved,
per mode), `tailwind`, `literals`. When something already **consumes** tokens.json in a curated
shape — a `/design-system` page reading `color.primitive`, a Figma sync, a native app — keep that
shape with `extend` instead of hand-editing the output or keeping a second generator.

```json
{ "extend": "scripts/tokens.extend.mjs" }
```

```js
// scripts/tokens.extend.mjs
export default function tokens({ v, resolve, decl, distinct, tailwind }) {
  return {
    color: {
      ground: v('--bg'),                       // { value: '#…', var: '--bg' }; throws if absent
      text: v('--fg'),
    },
    radius: distinct(/rounded-\[(\d+)px\]/, Number),  // every rounded-[Npx] in the sweep
    easing: { out: decl(':root', '--ease-out') },     // as written in the stylesheet
    container: tailwind?.maxWidth?.['6xl'],           // Tailwind 3, fully resolved
  };
}
```

The default export receives:

| Helper | Returns |
|---|---|
| `v(name)` | `{ value, var }` for a `:root` custom property as written. Throws if it isn't declared |
| `root` | Every `:root` custom property, as written |
| `resolve(value, mode?)` | `value` with every `var()` and `calc()` resolved, in `:root` or a mode |
| `decl(selector, prop)` | The value of `prop` in the first rule for exactly `selector`. Throws if none |
| `distinct(re, cast?)` | Sorted distinct values of `re`'s first group across the swept files |
| `literal(file, name)` | A plain array or object literal assigned to `name` in `file` |
| `tailwind` | The resolved Tailwind 3 theme, or `null` on Tailwind 4 |
| `literals` | The sweep's distinct literals by category |
| `fail(msg)` | Stop the build with a message naming the module |

It may be async. What it returns is merged into tokens.json at the top level, so `--check` gates
it like everything else. The generator's own keys (`theme`, `modes`, `scoped`, `tailwind`,
`literals`, `sources`, `extra`, `$generated`) are reserved; returning one fails.

Every helper throws rather than guessing, so a renamed variable breaks the build instead of
publishing `undefined`. Don't catch those errors in the module.

## Recipes by stack

**Tailwind 4 + shadcn** (the common case; `--init` gets most of it right)

```json
{
  "name": "Acme",
  "css": ["src/app/globals.css"],
  "fontVars": { "--font-geist-sans": "Geist", "--font-geist-mono": "Geist Mono" },
  "sweep": { "include": ["src"] },
  "designMd": {
    "name": "Acme",
    "colors": {
      "primary": "--primary", "on-primary": "--primary-foreground",
      "secondary": "--secondary", "on-secondary": "--secondary-foreground",
      "background": "--background", "on-background": "--foreground",
      "surface": "--card", "on-surface": "--card-foreground",
      "surface-variant": "--muted", "on-surface-variant": "--muted-foreground",
      "surface-container-high": "--accent", "outline-variant": "--border", "error": "--destructive"
    },
    "typography": {
      "headline-lg": { "tailwind": "text-4xl", "fontFamily": "--font-sans", "fontWeight": 600 },
      "body-md": { "tailwind": "text-base", "fontFamily": "--font-sans" },
      "label-sm": { "tailwind": "text-xs", "fontFamily": "--font-mono" }
    },
    "rounded": { "sm": "--radius-sm", "md": "--radius-md", "lg": "--radius-lg", "xl": "--radius-xl" }
  }
}
```

**Tailwind 3 with a custom scale in CSS variables**

```json
{
  "css": ["app/globals.css"],
  "tailwind": "tailwind.config.ts",
  "fontVars": { "--font-display": "Fraunces", "--font-geist-sans": "Geist Sans" },
  "designMd": {
    "colors": { "primary": "--fg", "on-primary": "--bg", "background": "--bg", "on-background": "--fg", "surface": "--surface", "on-surface-variant": "--fg-muted" },
    "typography": {
      "headline-lg": { "fontFamily": "--font-display", "fontSize": "--text-h1", "lineHeight": "--leading-h1", "letterSpacing": "--tracking-h1", "fontWeight": 400 }
    }
  }
}
```

**Plain CSS / SCSS output / CSS modules.** Point `css` at the compiled or source file that holds
`:root`. SCSS variables (`$brand`) are invisible to a CSS parser: if the design lives in SCSS
variables, add a `:root` block that exposes them (`--brand: #{$brand};`) — that is a one-line,
zero-visual change and it gives every tool a way in.

**CSS-in-JS theme object** (styled-components, Emotion, vanilla-extract). Put the theme object in
`extra` so tokens.json carries it, and map DESIGN.md values as literals with a note in Source of
truth that the theme file is canonical. It is the one stack where literals are the honest answer.

## Monorepos and non-Node projects

One config per app, run from that app: `node scripts/design-tokens.mjs --root apps/web`. A shared
design package gets its own config and DESIGN.md; each app's DESIGN.md says which one it inherits.

The generator needs Node 18+ and nothing else. In a project with no Node toolchain, run the check
in CI (`node scripts/design-tokens.mjs --check`) or a pre-commit hook, and say where in AGENTS.md.
