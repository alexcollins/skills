# Writing the DESIGN.md body

The frontmatter is generated. Everything below it is written by you, from the code. This guide is
what separates a DESIGN.md that steers an agent from one that describes a mood board.

## Contents

- [What the file is for](#what-the-file-is-for)
- [Section order](#section-order)
- [Section by section](#section-by-section)
- [How to write a rule](#how-to-write-a-rule)
- [Referencing tokens in prose](#referencing-tokens-in-prose)
- [Adopting an existing document](#adopting-an-existing-document)
- [Checklist](#checklist)

## What the file is for

An agent reads DESIGN.md before building UI and has to make hundreds of small calls the file never
mentions. The frontmatter answers "what value"; the body answers "what would this design do here".
From the spec's own philosophy: *the quality of a generated design is determined less by the
precision of its values than by how clearly the intent is described.*

Two consequences:

- **Specific beats descriptive.** "A 1970s graduate lecture handout" or "a darkroom light table:
  everything dim except the work" is a whole world, and the model knows what that world is *not* without
  being told. "Modern, clean, premium" is a region every generic page already sits in.
- **Negative space is information.** What the design refuses defines it as much as what it does.
  A short, deliberate list of don'ts beats a long vague one — a long one usually means the
  reference was too vague to carry them.

## Section order

Spec sections keep this order and these exact headings — tools parse them. Omit one only if it
genuinely doesn't apply (and list it in `designMd.omitted` with a reason). The skill's extension
sections are marked *ext*; the spec preserves unknown sections and its linter accepts them
anywhere.

1. `## Overview`
2. `## Source of truth` *ext*
3. `## Colors`
4. `## Typography`
5. `## Layout`
6. `## Elevation & Depth`
7. `## Shapes`
8. `## Motion` *ext*
9. `## Brand assets` *ext*
10. `## Components`
11. `## Do's and Don'ts`
12. `## Deliberate choices` *ext*
13. `## Known inconsistencies` *ext*
14. `## Before shipping UI` *ext*

Never rename a spec heading ("Color Palette & Roles" breaks parsing; it's "Colors"). Never repeat
one — a duplicate heading makes the linter reject the whole file.

## Section by section

### Overview

Open with the reference — one sentence naming a specific thing in the world this design is. Find
it in the product, not in your taste: the copy, the hero, the name, a comment in the stylesheet.
Then three to six short paragraphs, each one a **rule with its reason**, bold lead-in:

> **Monochrome.** The interface has no brand hue. Every colour is the ground, the text colour, or a
> step between. That restraint is the identity: because nothing else is coloured, the light reads
> as light.

End with **Key characteristics:** — four to six bullets an agent can check a screen against.

If the product has a strategy document (a PRODUCT.md, a brief) take only the durable constraints
from it. DESIGN.md is visual; audience and positioning live elsewhere.

### Source of truth

Which file owns which kind of value, and the commands. Short, and a table:

| Value | Owned by | Change it there, then |
|---|---|---|
| Colours, radii, type scale | `src/app/globals.css` | `npm run tokens` |
| Breakpoints, easing | `tailwind.config.ts` | `npm run tokens` |
| Font families | `src/app/layout.tsx` (next/font) | update `fontVars` |

State that the frontmatter and `design/tokens.json` are generated, and that `npm run tokens:check`
fails the build when they drift.

### Colors

One sentence on the palette's character, then each mapped colour: **descriptive name**, the token,
where it is used, why. Use the frontmatter name so prose and tokens connect:

> - **Ground** `{colors.background}` — every page background. A desaturated blue-violet, never neutral
>   grey and never black: surfaces step up from it by lightness, never by hue.

Then **Named rules** — one to three short doctrines with a name, because named rules get cited:

> **The One Accent Rule.** The accent appears only on the primary action and the focus ring.
> Never on a border, a chip or a decorative state — its scarcity is what makes it read as "do this".

If `primary` maps to the text colour because there is no brand hue, say so explicitly — otherwise
someone "adds the missing accent". Status colours (success/warning/error) get their own line with
where they are allowed.

### Typography

The families and why each exists; the role each plays; the scale (fluid? between which widths?);
how sizes are applied in code (a `.type-*` class system? Tailwind steps? a Text component?) and
what is forbidden (raw `text-*` sizes, stacking tracking on a type class). Emphasis conventions
(italic serif via markers, weight changes) go here. If one element is set in a way that looks like
a generic tell — mono caps labels, for instance — it is also listed in Deliberate choices.

### Layout

The page shell, max widths, the grid, the section rhythm (with the actual classes or values), the
breakpoints and what changes at each, copy widths. Point to `design/layout.md` for the full
reference and keep this section to what an agent needs for a new page.

### Elevation & Depth

Shadows, tonal layering, borders, blur — or explicitly none. "Flat: depth comes from a surface
one step lighter and a 1px hairline, never a shadow" is a complete, useful section.

### Shapes

Radius strategy with the reason ("square hairline cells; the only round thing is a status dot"),
border language, clipping, any signature geometry. If radii nest, the concentric rule
(outer = inner + padding) belongs here.

### Motion

The curves by name and how many there are (usually two), durations by interaction class, what
must never animate, reduced-motion handling. Point to `design/motion.md` for the full reference.
The spec endorses a `## Motion` section with its own inline YAML block if you want one — keep it to
values the code defines.

### Brand assets

Every logo and mark by path, which to use where, and the rule: **never recreate, redraw,
approximate or re-type the logo**, as SVG, as a path or as text. If there is no logo mark, say
"there is no mark — don't draw one". Agents invent logos when this section is missing.

### Components

The primitives an agent builds with, by path, with variants and states — and a **Don't** for each
naming what to use instead. Keep it to the core set; `design/components.md` holds the rest.

### Do's and Don'ts

Two lists, each item one line, each grounded in the code or a decision the user confirmed. Lead
with `**Do**` / `**Don't**`. Include the tooling rules: run the generator, don't hand-edit
tokens.json, name transition properties, check at 390.

### Deliberate choices

The section other design documents don't have, and the one that protects the brand from other
tools. Design skills and models flag certain patterns as generic "AI tells": caps eyebrow labels,
monospace metadata, middle-dot separators, `→` on links, near-black grounds, single-word italic
emphasis, hairline rules, uniform radius. When this design uses one **on purpose**, list it and why:

> - **Mono caps labels.** Every eyebrow and metadata line is Geist Mono in caps. It is the voice of
>   a control surface, not a default — don't "humanise" it to sentence-case sans.

When a choice here is an accident rather than intent, it belongs in Known inconsistencies instead.

### Known inconsistencies

A table: **What · Where · Why it stands**. Every audit finding the user didn't ask to fix: the
near-duplicate colours, the extra easing curve, the hard-coded hex in the login page, the shadcn
aliases nothing uses, the dead keyframes. Documented so nobody copies one as a pattern — and so
nobody "fixes" one as a side effect of another change.

This section is what makes the rest believable. A DESIGN.md that never admits a deviation is one
nobody checked against the code.

### Before shipping UI

The checklist an agent runs before calling UI work done: the project's polish/review skills if it
uses them, the verify commands, the widths to check, the live reference to open.

## How to write a rule

- **Rule, then reason.** "Never `transition-all` — it animates properties you didn't mean to, and
  the jank shows up in review as 'feels off'." Not "Avoid transition-all."
- **Concrete over principle.** A one-sentence test beats a paragraph: "Hover feedback at 150ms or
  less."
- **Hard words for invariants, soft for guidance.** "Never" only where the code and the user agree
  it is never. "Prefer" where it is a default.
- **One rule, one place.** State it once in DESIGN.md; AGENTS.md and CLAUDE.md repeat only the
  five most often broken, pointing back here.

## Referencing tokens in prose

Name tokens the way the frontmatter does — `{colors.background}`, `{typography.headline-lg}` — so an
agent can join prose to value. You may repeat an exact value in parentheses for a human reader
(`{colors.background}` (#15161A)), but it must match the frontmatter exactly; the verify step checks.
Never state a value that differs from the frontmatter: the frontmatter is normative.

## Adopting an existing document

When a DESIGN.md, style guide, or design rules inside CLAUDE.md already exist:

1. Show the user what exists, and say you'll restructure it into the spec without dropping a rule.
2. Map every existing section onto the order above. A section with no home becomes an extension
   section with its original heading.
3. Keep the author's voice and every rule. Reword only to add a missing reason or fix a value
   that no longer matches the code — and note each fix in your report.
4. Move numbers into the frontmatter mapping; prose keeps the names.
5. Diff old against new before finishing: every rule in the old file should be findable in the new
   one, or listed in your report as intentionally superseded.

## Checklist

- [ ] Opens with a specific reference, not adjectives
- [ ] Spec sections in order with exact headings; no duplicates
- [ ] Every rule has its reason
- [ ] Every value in prose matches the frontmatter or tokens.json
- [ ] Brand assets section exists and says "never recreate the logo"
- [ ] Deliberate choices lists every intentional "tell"
- [ ] Known inconsistencies lists every unfixed audit finding
- [ ] `npx @google/design.md lint DESIGN.md` reports 0 errors
- [ ] `npm run tokens:check` passes
