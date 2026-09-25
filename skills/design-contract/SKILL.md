---
name: design-contract
description: >-
  Turn a codebase's real design into a contract every agent reads and the build enforces: a
  DESIGN.md that follows the open spec (google-labs-code/design.md) with its token frontmatter
  generated from the code, a full design/tokens.json, a component inventory that says when NOT
  to use each component, layout and motion references, reference screenshots at desktop and
  mobile widths, AGENTS.md / CLAUDE.md wiring so agents actually read it — and a tokens:check
  gate that fails the build the moment code and docs disagree. Use this whenever someone wants to
  create, extract, document, audit, refresh or migrate a design system, DESIGN.md, design tokens
  or a style guide for an existing project; wants AI agents to stay on-brand; asks why generated
  UI keeps drifting from the design; or wants the same design-doc setup across several repos —
  even if they never say "design system".
license: MIT
metadata:
  author: alexcollins
  version: "1.0.0"
---

# Design contract

A design document an agent trusts is worse than none when it is wrong, and they all go wrong the
same way: someone writes the values down once, the code moves, the document doesn't. This skill
builds the version that can't drift. The values in it are parsed from the code, never typed. The
build fails when they disagree. The prose around them is written from the code too, and says
plainly where the code breaks its own rules.

It produces, in the target repository:

```
DESIGN.md                    the spec-compliant design system. Frontmatter generated; body written
design/tokens.config.json    which token plays which role — authored once, a judgement
design/tokens.json           every value the code defines — generated, never edited
design/components.md         the inventory, and when NOT to use each component
design/layout.md             shell, widths, grids, breakpoints, z-index ladder
design/motion.md             curves, durations, reduced motion, when not to animate
design/references/           full-page captures at 1440 and 390, and how to re-take them
scripts/design-tokens.mjs    the generator: write · --check · --report · --init
AGENTS.md / CLAUDE.md        the pointers that make every agent read the above
```

## The contract

These are the rules the whole skill rests on. Every one of them exists because the opposite is the
common failure.

1. **Document what exists. Do not redesign.** No rendered pixel changes while this skill runs. If
   something looks wrong, it goes in the audit or Known inconsistencies — it does not get fixed on
   the way past. Fixing is a separate change the user asks for.
2. **Values are parsed, never typed.** The DESIGN.md frontmatter and `design/tokens.json` come out
   of `scripts/design-tokens.mjs`. If you want to write a value that the generator cannot find in
   the code, that value is not part of the system yet. Prose may *name* a value; it never states a
   different one.
3. **Honest over tidy.** Two near-identical colours, three easing curves where the rules say two, a
   z-index outside the ladder: record them. Never silently consolidate. Consolidation changes the
   design, so it is the user's decision (rule 1).
4. **Every rule carries its reason.** "Never X" alone gets argued with or ignored. "Never X, because
   Y" gets followed, and tells the next reader when the rule has stopped applying.
5. **Negative rules are the useful ones.** What a component is *not* for, what the palette never
   does, which generic habits this brand refuses. An inventory that only says what things are
   changes nothing.
6. **Never lose an existing rule.** When DESIGN.md, AGENTS.md, CLAUDE.md or a style guide already
   exists, show it, merge into it, and keep every rule it had — moved, reworded or superseded with
   a note, never dropped.
7. **The gate ships, or the contract is decoration.** `tokens:check` runs in the build (or CI, or a
   pre-commit hook when there is no build). A document without the gate is a snapshot.

## Pick the mode first

Look before deciding. `ls`, read `package.json`, check for `DESIGN.md`, `design/`, `AGENTS.md`,
`CLAUDE.md`, `.stitch/`, `.impeccable/`, a style guide in `docs/`, design rules buried in a
CLAUDE.md.

| Situation | Mode | What changes |
|---|---|---|
| No design docs at all | **Bootstrap** | Everything below, from scratch |
| Design docs exist but no generated frontmatter or no gate — including rules living inside CLAUDE.md or a README | **Adopt** | Restructure into the spec, keep every rule, add the generator and the gate |
| Already set up; `tokens:check` fails, or the prose describes values that changed | **Refresh** | Regenerate, read the diff, update the prose that describes what moved, update Known inconsistencies |
| "How consistent is our design?" / "audit the styling" | **Audit** | Phase 1 only. Report; write nothing |

If `.stitch/DESIGN.md` or `.impeccable/` exists, another tool already owns a DESIGN.md. Do not
create a competing authority: the root DESIGN.md this skill writes is spec-compliant, so both can
read it — say so, and ask whether to consolidate onto it.

## Workflow

Run the phases in order. Each one names the reference to read *before* doing it; read it then, not
up front.

### Phase 1 — Audit (report, don't fix)

Copy `scripts/design-tokens.mjs` from this skill into the project's `scripts/` (the project owns
its copy; CI must not depend on the skill being installed). Then:

```bash
node scripts/design-tokens.mjs --init      # proposes design/tokens.config.json
node scripts/design-tokens.mjs --report    # the facts: counts, near-duplicates, unused tokens
```

Read [references/audit.md](references/audit.md), then read the codebase itself — the global
stylesheet, the theme config, the component folder, three or four production pages. The report
gives you facts no eyeballing will; the reading gives you the intent the report can't. Report to
the user before writing any document:

- where there should be one system and there are N ("5 durations, 3 easing curves, 11 z-indexes")
- near-duplicate colours within one theme, and hex colours hard-coded in components
- components that duplicate each other; a pattern implemented two ways
- tokens with no static reference (say "no static reference", not "dead" — see the audit guide)
- anything that looks like an abandoned direction

In **Audit** mode, stop here.

### Phase 2 — The generator and the gate

Read [references/config.md](references/config.md). Review the proposed `design/tokens.config.json`
by hand — `--init` guesses; you decide. The mapping is the one place judgement enters:

- which custom property plays which role, in Material 3 names — `primary` (in a monochrome system
  it is the text colour, and that is correct: say so in the prose), `background`, `surface`,
  `surface-variant`, `outline-variant`, `error`. The linter treats those as families; custom names
  get flagged once components exist
- which type step is `headline-lg`, `body-md`, `label-sm` — roles, not every variant
- font variables a loader defines at runtime (`next/font`, fontsource) go in `fontVars`
- the theme people actually see is the one the frontmatter publishes — `"mode": ".dark"` for a
  dark-first product; other themes live in tokens.json and the Colors prose
- a fluid `clamp()` is published as its desktop bound

Then:

```bash
node scripts/design-tokens.mjs           # writes design/tokens.json + DESIGN.md frontmatter
npx @google/design.md lint DESIGN.md     # the spec's own linter: 0 errors before moving on
```

Wire the scripts using the project's package manager, and put the check in front of the build:

```jsonc
"tokens":        "node scripts/design-tokens.mjs",
"tokens:check":  "node scripts/design-tokens.mjs --check",
"tokens:report": "node scripts/design-tokens.mjs --report",
"build":         "npm run tokens:check && <the existing build command>"
```

Prove the gate works before trusting it: add an invented literal (`bg-white/[0.07]`) to a
component, run `tokens:check`, see it fail with the file and line, revert.

### Phase 3 — DESIGN.md

Read [references/design-md.md](references/design-md.md) and start from
[templates/DESIGN.md](templates/DESIGN.md). The frontmatter already exists; you write the body
below it. The generator only ever rewrites the frontmatter, so the body is safe across runs.

The sections the spec defines keep its order and exact headings: **Overview, Colors, Typography,
Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts**. This skill adds **Source of
truth, Motion, Brand assets, Deliberate choices, Known inconsistencies, Before shipping UI** —
the spec preserves unknown sections, and the linter accepts them anywhere.

The three things that make a DESIGN.md work, in order of how often they are missing:

1. **A specific reference, not adjectives.** "A darkroom light table: everything dim except the work" carries
   a whole world; "modern, clean, premium" carries nothing. Find the reference in the code and the
   copy — it is usually already there.
2. **Known inconsistencies.** Every audit finding the user did not ask to fix, with where it is and
   why it stands. This is what makes the rest of the document believable.
3. **Deliberate choices.** Design skills like `frontend-design` flag mono labels, caps eyebrows,
   near-black grounds and middle-dot metadata as generic "tells". If this brand uses one on
   purpose, say so and say why — otherwise the next agent "fixes" the brand.

### Phase 4 — The design/ references

Read [references/design-docs.md](references/design-docs.md). Write `design/components.md`,
`design/layout.md` and `design/motion.md` from the templates. The component inventory is the one
agents consult most: every component gets its path, variants, states, and a **Don't** line naming
what to use instead.

### Phase 5 — Reference captures

```bash
node scripts/capture.mjs --base http://localhost:3000 home=/ about=/about pricing=/pricing
```

`scripts/capture.mjs` (copy it alongside the generator) writes `design/references/<name>-<width>`
at 1440 and 390 with reduced motion, plus the README that says how to re-take them. Capture every
page template, not every page. If the app cannot run here, say so and leave the README with the
command; do not skip silently.

A live `/design-system` route (every token, type step and component rendered with the real
components) is worth building when the project has more than a handful of components. It is an
optional follow-up — offer it, don't build it unasked. When it exists: noindex, out of the sitemap,
unlinked from navigation.

### Phase 6 — Wire the agents

The documents only work if every agent reads them before touching UI. If the `agent-conventions`
skill is available, run it now — it owns AGENTS.md and CLAUDE.md as a whole. Otherwise add the
design block from [references/wiring.md](references/wiring.md) to both files, merging into what is
already there (rule 6).

### Phase 7 — Verify

```bash
npm run tokens:check                    # generated files match the code — and the prose only
                                        # names tokens ({colors.x}) and hex values that exist
npx @google/design.md lint DESIGN.md    # 0 errors; warnings explained or fixed
# plus the project's own typecheck, lint and build
```

`tokens:check` catches a stale `{colors.x}` or an invented hex in the prose; it can't catch a wrong
*claim*. Re-read DESIGN.md adversarially for those: every rule has its reason, every file path
exists, every "never" is true of the code today. Confirm the build actually runs the check (break
it once, as in Phase 2).

## Reporting back

End with, in this order:

1. **What now exists** — the files, one line each.
2. **The audit** — the Phase 1 findings as a short table, and which of them went into Known
   inconsistencies.
3. **Decisions that are the user's** — each consolidation you did not make ("merge `--muted`
   `#17191e` into `--card` `#16181d`?"), each mapping you were unsure of, the optional
   `/design-system` route. One line each, with your recommendation.
4. **The gate** — the command, and proof it failed on an invented value.

## Pitfalls

- **clamp() in the frontmatter.** The spec's linter rejects it as a dimension. The generator
  publishes the bound and keeps the clamp as a comment; don't "fix" that by hand.
- **Fonts from a loader.** `next/font` and friends define `--font-*` at runtime, so the CSS alone
  cannot name the family. Map them in `fontVars`; `--check` fails if the variable disappears.
- **shadcn aliases.** Many projects carry shadcn's `--color-card`, `--radius-lg` and friends while
  using their own tokens. The report lists them as having no static reference — that is a finding
  for Known inconsistencies, not permission to delete them.
- **A monochrome primary.** When there is no brand hue, `primary` maps to the text colour. That is
  correct; say it in Colors so nobody "adds the missing accent".
- **Dynamic class names.** `bg-${tone}` cannot be seen statically. Before calling a token unused,
  grep for the prefix.
- **The generator is the project's copy.** Update it by copying the skill's newer version and
  running `tokens`; the version is the `VERSION` export at the top.
