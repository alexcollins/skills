# design/components.md, layout.md, motion.md

DESIGN.md is what an agent reads first. These three are what it opens when DESIGN.md sends it
there — deeper, more mechanical, still written from the code. Start each from its template in
`templates/`.

## components.md — the inventory

The file agents consult most. Its job is to stop a second button from being built.

**Order.** By layer, lowest first: primitives (`components/ui/`), the pattern layer built on them,
form controls, CSS utilities, icons, then any app-specific kit. Within a layer, most used first.

**Every component gets:**

```markdown
### Button — `components/ui/button.tsx`

The only button on the site.                        ← one line: what it is, and its scope

| Variant | Appearance | Use |                       ← each variant, what it looks like, when
|---|---|---|
| `default` | Light fill, dark ink | The one primary action on a page |
| `ghost` | Muted text → full on hover | Tertiary: toolbars, nav-adjacent |

**States** — hover · press scale 0.96 · focus ring · disabled 40%
**Props beyond variants** — `asChild` renders a Link with button styling; prefer it over
restyling an anchor.

**Don't** use it for a clickable card — cards are content and take no press scale.   ← required
```

The **Don't** line is not optional. Name the misuse you would expect and what to use instead. If
you can't think of one, the component is either trivially scoped (say so) or you haven't read how
it is used yet.

**Find the duplicates.** Before writing, list every component whose name or markup overlaps another
(two cards, a `Button` and a hand-rolled `<a class="btn">`). Each gets an entry that says which one
is canonical and which is legacy — and the legacy one goes in DESIGN.md's Known inconsistencies.

**Utilities count.** Bespoke CSS classes (`.section`, `.hairline-grid`, `.type-*`) are components
too, and agents need their rules as much as React components' rules.

## layout.md

What a new page needs to be consistent with every other page:

- **The page shell** — the wrapper every page sits in, its max width, its gutter, by class name.
- **Vertical rhythm** — section padding at each breakpoint, as the literal classes or values.
- **Copy widths** — the max line length for body, lead and headlines.
- **Grids** — the grid patterns in use and when each applies; the hairline or card grid if there is
  a signature one.
- **Breakpoints** — each one, and what changes at it. Not just the numbers: "below md the rail
  becomes a tab bar".
- **Z-index ladder** — every layer by name and value. Values the report found outside the ladder
  go in DESIGN.md's Known inconsistencies.
- **Page anatomy** — the typical order of sections on each page template.
- **Before committing** — capture at 1440 and 390; at 390 nothing scrolls sideways.

## motion.md

Motion is where agents improvise most and where drift is least visible in review.

- **The curves.** Each by name and value, and what it is for. State how many there are — "two, and
  only two" — so a third is visibly a violation.
- **Undefined tokens.** If any code references an easing or duration variable that is not defined
  (`var(--ease-sheet)` with no declaration), say so prominently: an undefined `var()` voids the
  whole declaration silently.
- **Durations by class of interaction** — hover/press feedback, panels and drawers, page entrance,
  ambient loops. A ceiling for each ("hover ≤ 150ms").
- **Naming transition properties.** Never `transition-all`; name them.
- **The entrance** — the one page-load choreography, if there is one, and the rule that there is
  only one.
- **Reduced motion** — how it is honoured, and the rule that a new loop joins the reduced-motion
  block in the same commit.
- **When not to animate** — high-frequency actions, anything keyboard-driven, lists that re-sort.
- **Known deviations** — curves or durations the report found outside the rules.

## references/README.md

Written by `scripts/capture.mjs`. It says what the captures are, when they were taken, how to
re-take them, and how to read a diff: compare against the capture at the same width, look first at
spacing rhythm and type, then colour; a change you didn't intend is a regression even if it looks
fine.

The script regenerates it only while its first line is the generated marker. Delete that line to
make the README yours — worth doing once the project has something specific to say (a page left
out on purpose, an animation that has to be frozen). An existing hand-written README is never
touched. `capture.json` is likewise written once, on the first run; a later one-route run doesn't
shrink it.

**Capture twice before trusting a baseline.** The script scrolls each page to the bottom and back
so lazy and scroll-revealed content renders. Anything driven by scroll position or scroll speed —
a parallax hero, a canvas that redraws on `scroll`, a reveal that isn't `once` — can land in a
different state each run. If two runs differ, find the component and say so in the README (or in
DESIGN.md → Known inconsistencies when it's a reduced-motion gap); don't commit a baseline that
changes on its own.
