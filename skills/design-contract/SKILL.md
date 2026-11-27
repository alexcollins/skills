---
name: design-contract
description: >-
  Give any project the same design setup: a DESIGN.md that follows Google's open spec with every
  token parsed from the code (themes, type, spacing, radii, motion, components), a standard W3C
  DTCG design/tokens.json, a generated design/preview.html that shows the whole system, and a
  tokens:check gate that fails the build the moment code and docs disagree — optionally published
  as a hosted Claude Design System. Use whenever someone wants to create, extract, document, audit,
  refresh or migrate a design system, DESIGN.md, design tokens or a style guide; wants a page that
  shows their design system; wants AI agents to stay on-brand; or wants every repo's design docs
  done the same way — even if they never say "design system".
license: MIT
metadata:
  author: alexcollins
  version: "2.0.0"
---

# Design contract

A design document is only useful while it's true, and they all go stale the same way: someone
writes the values down once, the code moves, the document doesn't. Here the values are **parsed
from the code, never typed**, the build fails when they disagree, and the same files come out of
every project:

```
DESIGN.md                    Google's spec. Frontmatter generated (every token); body written
design/tokens.config.json    which variable plays which role. The one hand-made judgement
design/tokens.json           W3C DTCG 2025.10. Generated
design/preview.html          the system, rendered. Generated, self-contained, hostable
design/references/           full-page captures at 1440 and 390
scripts/design-tokens.mjs    the generator: write · --check · --report · --init
```

Everything stays inside the standards: DESIGN.md lints clean with `npx @google/design.md lint`,
tokens.json is plain DTCG that Figma plugins, Style Dictionary and Claude can read, and the
preview is one HTML file with no build step.

## The contract

1. **Document what exists. Don't redesign.** Nothing rendered changes while this skill runs. What
   looks wrong goes in the report and Known inconsistencies; fixing it is a separate change.
2. **Values are parsed, never typed.** If the generator can't find a value in the code, it isn't
   part of the system yet. Prose may name a token; it never states a different value.
3. **Honest over tidy.** Two near-identical colours, a third easing curve, a z-index off the ladder:
   record them, never silently merge. Merging changes the design — the user's call.
4. **Every rule carries its reason.** "Never X, because Y" gets followed, and says when it stops
   applying.
5. **Never lose an existing rule.** An existing DESIGN.md, style guide or design section in
   CLAUDE.md gets merged in, every rule kept — moved, reworded or marked superseded, never dropped.
6. **The gate ships, or it's decoration.** `tokens:check` runs before the build (or in CI, or a
   pre-commit hook).

## Pick the mode

Look first: `package.json`, `DESIGN.md`, `design/`, AGENTS.md, CLAUDE.md, `.stitch/`, style guides
in `docs/`, design rules buried in a README.

| Situation | Mode |
|---|---|
| No design docs | **Bootstrap** — every phase |
| Docs exist, but values are hand-typed or there's no gate | **Adopt** — every phase, merging what exists |
| Set up already; `tokens:check` fails or the prose is stale | **Refresh** — regenerate, read the diff, fix the prose that describes what moved |
| Set up with design-contract 1.x | **Upgrade** — see [references/upgrade.md](references/upgrade.md) |
| "How consistent is our styling?" | **Audit** — phase 1 only, write nothing |

If another tool already owns a DESIGN.md (`.stitch/`, `.impeccable/`), don't create a rival: the
root DESIGN.md this skill writes is spec-compliant, so say both can read it and ask before
consolidating.

## Workflow

Each phase names the reference to read before doing it.

### 1 · Audit — report, don't fix

Copy `scripts/design-tokens.mjs` into the project's `scripts/` — the project owns its copy, so CI
never depends on the skill. Then:

```bash
node scripts/design-tokens.mjs --init      # proposes design/tokens.config.json
node scripts/design-tokens.mjs --report    # counts, near-duplicates, unused tokens, hard-coded hex
```

Read [references/audit.md](references/audit.md), then the stylesheet, the theme config, the
component folder and three or four real pages. Report before writing anything: where there should
be one system and there are several, near-duplicate colours, components that duplicate each other,
tokens with no static reference, abandoned directions. In Audit mode, stop here.

### 2 · Generate, and gate

Read [references/config.md](references/config.md) and review the proposed config by hand. `--init`
guesses; you decide:

- **Roles** in Material 3 names (`primary`, `background`, `surface`, `on-surface-variant`,
  `outline-variant`, `error`) — the spec's linter treats them as families.
- **Themes**, default first: `{ ":root": "light", ".dark": "dark" }`. The default is published
  whole; the others list only what they change.
- **`"all": true`** publishes every colour, radius and spacing variable the stylesheets declare;
  the roles sit on top.
- **Typography** roles (`headline-lg`, `body-md`, `label-sm`), **motion** by purpose
  (`state-change`, `surface-enter`), and the handful of **components** an agent builds with.
- **Fonts** a loader defines at runtime go in `fontVars`; `preview.fonts` maps a family to its
  Google Fonts name when they differ.

```bash
node scripts/design-tokens.mjs           # DESIGN.md frontmatter, design/tokens.json, design/preview.html
npx @google/design.md lint DESIGN.md     # 0 errors before moving on
```

Wire it with the project's package manager, the check in front of the build:

```jsonc
"tokens":        "node scripts/design-tokens.mjs",
"tokens:check":  "node scripts/design-tokens.mjs --check",
"tokens:report": "node scripts/design-tokens.mjs --report",
"build":         "npm run tokens:check && <the existing build>"
```

Prove the gate: add an invented literal (`bg-white/[0.07]`) to a component, watch `tokens:check`
fail with its file and line, revert.

### 3 · Write the DESIGN.md body

Read [references/design-md.md](references/design-md.md); start from
[templates/DESIGN.md](templates/DESIGN.md). The generator only rewrites the frontmatter, so the
body is safe across runs. Use the spec's sections in its order — Overview, Colors, Typography,
Layout, Elevation & Depth, Shapes, Motion, Voice & Content Strategy, Components, Do's and Don'ts —
then this skill's three: **Deliberate choices**, **Known inconsistencies**, **Before shipping UI**.
Everything lives in this one file; Components points at source files with `@path` references.

What makes one work, in order of how often it's missing:

1. **A specific reference, not adjectives.** "A darkroom light table: everything dim except the
   work", not "modern, clean, premium". It is usually already in the copy.
2. **Known inconsistencies** — every audit finding left alone, where, and why it stands.
3. **Deliberate choices** — the patterns other design tools flag as generic (mono caps labels,
   near-black grounds, hairlines) that this brand uses on purpose, so nobody "fixes" them.

Run the generator again afterwards: the preview renders the body too.

### 4 · Make it visible

`design/preview.html` is already there. Open it and check every theme, the type ramp and the
components look right. To host it with the site, point `preview.file` into the public folder
(`public/design-system/index.html`); it carries `noindex`. Keep it out of the sitemap and the
navigation.

Then the reference captures, when the app can run here:

```bash
node scripts/capture.mjs --base http://localhost:3000 home=/ about=/about
```

Every page template at 1440 and 390, reduced motion, captured twice — a page that differs between
runs has scroll-driven motion, which goes in the README rather than a baseline. If the app can't
run, leave the README with the command and say so.

**Hosted on claude.ai (optional).** To share it, or have Claude build on-brand from it, publish a
Claude Design System from these files: [references/claude.md](references/claude.md). Offer it;
don't do it unasked.

### 5 · Wire the agents

If `agent-conventions` is installed, run it — it owns AGENTS.md and CLAUDE.md. Otherwise merge the
blocks from [references/wiring.md](references/wiring.md) into both files.

### 6 · Verify

```bash
npm run tokens:check                    # frontmatter, tokens.json and preview match the code; the
                                        # prose names only tokens and hex values that exist
npx @google/design.md lint DESIGN.md    # 0 errors; warnings explained
# plus the project's typecheck, lint and build
```

`tokens:check` catches a stale `{colors.x}` or an invented hex; it can't catch a wrong *claim*.
Re-read DESIGN.md adversarially: every rule has its reason, every path exists, every "never" is
true of the code today.

## Reporting back

1. **What now exists** — the files, one line each, and the preview's path.
2. **The audit** — the findings as a short table, and which went into Known inconsistencies.
3. **The user's decisions** — each consolidation not made ("merge `--muted` into `--card`?"),
   each uncertain mapping, hosting the preview, publishing to Claude. One line each, with a
   recommendation.
4. **The gate** — the command, and proof it failed on an invented value.

## Pitfalls

- **Lint warnings with `"all": true`.** Once components exist, the linter warns about every colour
  no component references. Those are information, not errors; say so in the report.
- **Motion warnings.** The published CLI (0.4) predates the spec's `motion` section and warns that
  it is ignored. The spec includes it; keep it.
- **clamp().** The spec wants a plain dimension. The frontmatter carries the desktop bound with the
  clamp as a comment; tokens.json and the Typography prose say it's fluid.
- **Fonts from a loader** (`next/font`) exist only at runtime. Map them in `fontVars`.
- **A monochrome primary.** No brand hue means `primary` is the text colour. Correct — say so in
  Colors so nobody "adds the missing accent".
- **Dynamic class names.** `bg-${tone}` can't be seen statically; grep the prefix before calling a
  token unused.
- **The generator is the project's copy.** Update it by copying the newer version and running
  `tokens`; the version is the `VERSION` export at the top.
