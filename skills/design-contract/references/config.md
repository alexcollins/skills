# design/tokens.config.json

The config says **where** the values live and **which role** each one plays. It never holds a
value the code doesn't. `--init` writes a proposal; review every mapping before generating.

## Contents

- [Keys](#keys)
- [Mapping values](#mapping-values)
- [Typography](#typography)
- [Themes, all, motion, fluid values and components](#themes-all-motion-fluid-values-and-components)
- [What tokens.json holds](#what-tokensjson-holds)
- [The preview](#the-preview)
- [The sweep](#the-sweep)
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
| `extra` | | Values that live in code, not CSS: `[{ "name": "heroGradient", "file": "components/hero-canvas.tsx", "const": "GRADIENT" }]`. Must be a plain array or object literal. Kept in tokens.json under `$extensions` |
| `references` | | Extra files that *use* tokens (a theme.ts, a plugin), so `--report` doesn't call their tokens unused |
| `output` | | Where tokens.json goes. Default `design/tokens.json` |
| `preview` | | `{ "file": "design/preview.html", "fonts": { "Geist Sans": "Geist" }, "googleFonts": true, "sample": "…" }`, or `false` for none. See [the preview](#the-preview) |
| `designMd` | for DESIGN.md | The frontmatter mapping. Without it, only tokens.json is written |

`designMd` keys: `file` (default `DESIGN.md`), `name`, `description`, `themes`, `all`, `colors`,
`typography`, `rounded`, `spacing`, `motion`, `components`, `fluid`, `omitted`.

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

## Themes, all, motion, fluid values and components

**Themes.** `"themes": { ":root": "light", ".dark": "dark" }`, default first — the theme people see
unless they switch. A dark-first product (`<html class="dark">`, a provider defaulting to dark)
lists `.dark` first; `--init` detects it. The default theme is published whole at the top level of
`colors`, so every `{colors.x}` reference resolves. Each other theme becomes a group holding only
the colours it changes:

```yaml
colors:
  primary: "#1a1c1e"
  background: "#ffffff"
  dark:
    primary: "#e8e6f0"
    background: "#15161a"
```

Any selector works: `.dark`, `[data-theme="dark"]`, `@media (prefers-color-scheme: dark) :root`. A
block only counts when it re-points a variable `:root` declares; a component's own variables
(`.spotlight { --spot-x: 0 }`) aren't a theme. With no `themes`, one theme is published (`"mode":
".dark"` picks which, for a single-theme dark product).

**All.** `"all": true` publishes every colour, radius (`--radius*`) and spacing (`--space*`,
`--spacing*`) variable the project declares, named after the variable (`--fg-muted` → `fg-muted`,
`--color-brand` → `brand`). The role mapping sits on top: a variable already mapped to a role isn't
published twice, and a variable that only points at another (`--color-x: var(--x)`, Tailwind 4's
plumbing) is skipped. Without it, only mapped roles are published.

**Motion.** Purpose names, as the spec recommends:

```json
"motion": {
  "state-change":  { "duration": "--duration-fast", "timingFunction": "--ease-out" },
  "surface-enter": { "duration": "250ms", "timingFunction": "--ease-out", "delay": "0ms" }
}
```

Durations resolve to milliseconds; a variable that isn't a duration fails.

**Fluid values.** The spec requires a plain dimension (`px`, `rem`, `em`) and its linter rejects
`clamp()`. With `"fluid": "max"` (default) the frontmatter carries the clamp's upper bound — the
desktop value — with the full clamp as a trailing YAML comment; `"min"` carries the mobile bound.
Say in Typography prose that the scale is fluid, and between which widths.

**Components.** Keep to the spec's eight properties: `backgroundColor`, `textColor`, `typography`,
`rounded`, `padding`, `size`, `height`, `width`. Reference tokens as `{colors.primary}`; variants
are sibling keys (`button-primary`, `button-primary-hover`). Every `{ref}` must resolve inside the
frontmatter, or the generator fails. Map the handful of primitives an agent builds with — button
variants, input, card, chip — not every component; the rest are listed in DESIGN.md's Components
prose with `@path` references.

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

## What tokens.json holds

The W3C Design Tokens format (DTCG 2025.10), so any tool that reads DTCG reads it:

| Group | `$type` | From |
|---|---|---|
| `color` | `color` | The frontmatter's colours; theme groups stay nested (`color.dark.surface`) |
| `typography` | `typography` | The frontmatter's type roles. `em` letter-spacing becomes px against the font size |
| `spacing`, `rounded` | `dimension` | The frontmatter |
| `motion` | `transition` | The frontmatter's motion tokens |
| `duration` | `duration` | Every `--duration-*` / `--dur-*` variable |
| `easing` | `cubicBezier` | Every `--ease*` / `--easing*` variable |
| `shadow` | `shadow` | Every `--shadow*` variable whose value can be read as a shadow |
| `zIndex` | `number` | Every `--z-*` variable |
| `breakpoint` | `dimension` | Tailwind 3 `screens`, or `--breakpoint-*` |

Colours use the same shape Google's `design.md export --format dtcg` writes (`colorSpace`,
`components`, `alpha`, `hex`). The generator's own data — sources, themes, the sweep's literals that
`--check` gates, `extra` — lives under `$extensions["design-contract"]`, where DTCG tools expect
vendor data and ignore it.

## The preview

`design/preview.html` is written from the frontmatter and the DESIGN.md body: colours per theme
with their contrast (an `on-x` colour is measured on `x`), the type ramp, spacing, radii, motion
tiles that play on hover with their curves drawn, the components rendered from their tokens, the
extra code tokens, then the body as Guidelines. One file, no build step; it loads only the font
stylesheet.

- **Fonts.** Each family is requested from Google Fonts by name. When the CSS name differs from
  Google's (`next/font` calls it "Geist Sans", Google calls it "Geist"), map it:
  `"fonts": { "Geist Sans": "Geist" }`. A URL value loads that stylesheet instead; `false` skips a
  family; `"googleFonts": false` turns the requests off. Without the font, the sample falls back to
  the right kind of face (sans, serif or mono).
- **Hosting.** Point `file` into the public folder — `public/design-system/index.html` — and it
  ships with the site. It carries `noindex`; keep it out of the sitemap and navigation.
- **Gated.** `--check` fails when the preview is out of date — including after a prose edit,
  because it renders the body. Run `npm run tokens` after editing DESIGN.md.

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
