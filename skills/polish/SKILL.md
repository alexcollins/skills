---
name: polish
description: >-
  Review and fix the small details that decide whether an interface feels finished — nested radii,
  optical alignment, shadows versus borders, image outlines, icon weight and states, every
  interactive state, hit areas, press feedback, transition hygiene — inside the project's own
  design contract. Reports HIGH, MEDIUM and LOW findings and a Block or Approve verdict. Use on any
  new or changed component, when the user asks to polish, refine or review UI, or when something
  "looks off".
license: MIT
metadata:
  author: alexcollins
  version: "1.0.0"
  adapted-from: jakubkrehel/skills — better-ui; emilkowalski/skills — emil-design-eng (MIT)
---

# Polish

Polish is a pile of small details that compound. Nobody notices one; everybody feels all of them.

## The contract comes first

If the project has a `DESIGN.md` (see `design-contract`), read it and its **Deliberate choices**
before looking at a single component. The project's tokens, radii, curves and choices beat every
default in this skill, and a deliberate choice is never a finding. The defaults below fill in only
where the project says nothing.

Never introduce a value the project doesn't have. Use the nearest existing token, and when none
fits, report the gap instead of inventing one — an arbitrary value is how a design system starts
to drift.

## What to check

**Surfaces** — recipes in [references/surfaces.md](references/surfaces.md).
- **Concentric radii.** Outer radius = inner radius + the padding between them. Past `24px` of
  padding the layers are separate surfaces; choose each radius on its own.
- **Shadows for depth, borders for structure.** A border that only fakes elevation becomes a layered
  transparent shadow, which survives any background. Dividers, table lines, inputs and focus and
  selected states stay borders.
- **Image outlines.** `1px` inside the edge: black at 10% in light mode, white at 10% in dark. Never
  a tinted neutral or the brand colour — they pick up the surface and read as dirt.

**Alignment** — optical beats geometric. A trailing or leading icon gets `2px` less padding on its
side; a play triangle shifts `2px` toward its point; an asymmetric glyph is fixed in the SVG first,
with a nudge only as a fallback.

**Icons** — detail in [references/icons.md](references/icons.md).
- Stroke matches the text beside it: `1.5px` with regular weight, `2px` with medium and semibold,
  `2.5px` with bold.
- One icon library per surface. Inline icons sized `1em`–`1.25em` so they scale with the text.
- One SVG per icon in `currentColor`; hover, selected and disabled come from CSS. Outline by
  default, filled for the active state.
- Under RTL, flip icons tied to reading direction (arrows, chevrons, text alignment) and nothing else.

**States** — every interactive element has hover, `focus-visible`, active and disabled; every data
view has loading, empty and error. A focus ring is never removed without a visible replacement.

**Touch** — targets at least `24×24` CSS px, `44×44` for primary actions on touch, extended with a
pseudo-element so layout doesn't move. Hover effects sit behind
`@media (hover: hover) and (pointer: fine)`, because a tap fires hover on touch screens.

**Motion hygiene** — deciding and building motion is `motion`'s job; check these here:
- Press feedback: `scale(0.96)` on `:active`, with a way to switch it off where it would distract.
- Transitions name their properties — never `all`. Hover and colour changes at `150ms` or less.
- Nothing animates on a keyboard shortcut or a hundred-times-a-day action.
- Every animated state change has a static cue too (colour, icon, label). Motion is never the only
  signal.
- A theme switch snaps instead of smearing: transitions are suppressed for the swap.

## How to look

Slow it down. What feels slightly off at full speed is visibly wrong at 10% — replay motion in the
browser's Animations panel. With a browser, walk every state and screenshot it. Without one, read
every state the code defines and the durations and curves it uses, and report the rest as
*Not verified*.

## Report

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |

- **HIGH** — breaks an interaction, makes motion unusable, leaves a state change visible only while
  an animation runs, or breaks the project's design contract.
- **MEDIUM** — a visible inconsistency in surfaces, icons, states or motion.
- **LOW** — isolated polish.

One row per root cause, listing every location (`path/to/file:line`) it appears in, grouped by
area, worst first. `Why` names the principle and what the user would feel. End with **Block** if any
HIGH remains, **Approve** otherwise. Never approve what you didn't inspect. Nothing to report: say
"No polish findings" and what was verified.

When asked to fix, or when running inside `build`, fix every HIGH and MEDIUM and list the LOWs.
