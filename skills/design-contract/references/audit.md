# The audit

Phase 1 produces a report for the user before any document is written. Two inputs: the facts the
generator can count, and the intent only reading the code reveals. Neither is enough alone.

## Run the numbers

```bash
node scripts/design-tokens.mjs --init       # if there is no config yet
node scripts/design-tokens.mjs --report     # human-readable
node scripts/design-tokens.mjs --report --json > /tmp/audit.json   # for your own analysis
```

What each part of the report means, and how to read it honestly:

| Report line | What it is | How to read it |
|---|---|---|
| `modes` | Blocks that re-point the root palette | The themes that exist. More than expected is a finding |
| `distinctColours` | Distinct resolved colours across all modes | Compare to the number the brand claims |
| `easing values` / `durations` | Every curve and duration in markup and CSS | "Two curves" rules usually find three or four |
| `z-indexes` | Every z value, arbitrary ones bracketed | Values outside the ladder (`[45]`, `[80]`) are findings |
| `arbitrary values by utility` | Counts of `text-[13px]`-style values | High counts in `text`/`bg` mean the scale isn't covering real needs |
| `near-duplicate colours` | Pairs under ΔE_ok 0.02 **within one theme** | One colour typed twice, or a tonal step too small to see. Either way a finding |
| `tokens with no static reference` | Defined, never mentioned | Not proof of death — see below |
| `hex colours written in code` | Hex literals in components, grouped by file | Third-party brand colours are fine; a tint of your own palette is a finding |

### Before calling anything unused

The report says "no static reference", deliberately. Check before writing "dead":

- a class built at runtime — `bg-${tone}`, `` `text-${size}` `` — grep for the prefix
- a token read from JS — `getComputedStyle(...).getPropertyValue('--x')`
- a token consumed by a config the report didn't read — add that file to `references`
- a framework alias you inherited (shadcn's `--color-card`) — present on purpose or by accident;
  either way it is a Known inconsistency to record, not something to delete now

## Read the code

The numbers don't tell you what the design is *for*. Read, in this order:

1. The global stylesheet, top to bottom — including the comments. Developers write intent in
   comments ("the ground is violet, not black").
2. The theme or Tailwind config.
3. The component folder: every primitive, and the pattern layer above it.
4. Three or four production pages of different types (home, a content page, a form, an app view).
5. Any existing design docs, README sections, or rules inside CLAUDE.md/AGENTS.md.

Look for: the same pattern built twice (two card implementations, two button styles); a component
that exists but is bypassed; a rule the code keeps breaking; the traces of an abandoned direction
(tokens named for a colour they no longer are).

## Report to the user

Keep it to what they need to decide. A table, then questions:

| Finding | Where | Suggested handling |
|---|---|---|
| 5 durations (75–700ms) where hover should be ≤150ms | `duration-700` in `hero.tsx` | Known inconsistency, or align? |
| `--card` #16181d ≈ `--muted` #17191e (ΔE 0.006) | `.dark` theme | Likely one colour typed twice — merge? |
| Hex `#0b0c0f` hard-coded | `app/signin/page.tsx:40` | Tokenise later; record now |
| 11 shadcn aliases never used | `globals.css @theme inline` | Record; remove in a cleanup |

Then: "I'll document all of these as they are and put the ones you don't want fixed into Known
inconsistencies. Which, if any, should be fixed as a separate change?"

## Classifying findings

Every finding lands in exactly one place:

| It is… | It goes in… |
|---|---|
| Intentional, and looks generic | **Deliberate choices**, with the reason |
| A deviation the user wants kept for now | **Known inconsistencies**, with why it stands |
| A rule the code mostly follows | **Do's and Don'ts** (and the deviation, if any, in Known inconsistencies) |
| A bug the user wants fixed | A separate change, after this skill finishes — not now |

In **Audit** mode, deliver the table and the questions, and stop.
