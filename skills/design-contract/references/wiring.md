# Wiring the agents

DESIGN.md does nothing if an agent doesn't open it. Two files are loaded automatically by nearly
every coding agent: **AGENTS.md** (the open standard — Codex, Cursor, Copilot, Gemini, OpenCode,
Claude Code and others) and **CLAUDE.md** (Claude Code specifically). Both get the design block.

If the `agent-conventions` skill is installed, run it instead of this page — it builds both files
in full and includes this block. Otherwise, merge the blocks below into whatever is already there.
Never replace an existing file; never drop an existing rule.

## The AGENTS.md block

Put it near the top — agents weight what they read first.

```markdown
## Design system

**Before creating or substantially modifying user-facing UI, read [`./DESIGN.md`](./DESIGN.md).**

| | |
|---|---|
| [`DESIGN.md`](./DESIGN.md) | Identity, colour, type, shape, do/don't. **Start here.** |
| [`design/tokens.json`](./design/tokens.json) | Every value, machine-readable. **Generated — never hand-edit.** |
| [`design/components.md`](./design/components.md) | The component inventory, and when not to use each one. |
| [`design/layout.md`](./design/layout.md) | Page shell, widths, grids, breakpoints, z-index. |
| [`design/motion.md`](./design/motion.md) | Curves, durations, reduced motion. |
| [`design/references/`](./design/references/) | Full-page captures at 1440 and 390. |

Use existing components and brand assets before creating replacements. Do not approximate logos or
introduce design values that tokens already cover. When unsure of visual intent, read the
production pages rather than guessing.

### The five that get broken most often

1. **Never <the most-broken rule>.** <Its reason.>
2. …

### Tokens

The stylesheet is the source of truth. After changing it, run `npm run tokens` and read the diff.
`npm run tokens:check` fails the build when the generated files have drifted, or when a new
arbitrary value, opacity, radius, z-index or motion value appears in markup — which usually means a
value was invented instead of reusing a token.
```

**Choosing the five.** Take them from the audit and from the code's own history: the rules the
codebase already breaks, the ones the Deliberate choices section exists to protect, the tooling
traps (an undefined easing variable, a type-class system that raw `text-*` bypasses). Each is one
line starting with "Never", with its reason. Five, not fifteen: this list survives being skimmed
because it is short.

## The CLAUDE.md block

Shorter — CLAUDE.md is loaded into every session, so it points rather than repeats:

```markdown
## Design system

Before creating or substantially modifying user-facing UI, read [`./DESIGN.md`](./DESIGN.md).
It and the files it links (`design/tokens.json`, `components.md`, `layout.md`, `motion.md`,
`design/references/`) are the canonical design specification for this repository.

The quick version is in DESIGN.md; these five are the ones most often got wrong:

- <rule> — <reason>
- …

After changing the stylesheet or theme config, run `npm run tokens` and read the diff;
`npm run tokens:check` gates the build.
```

If the project uses design skills (`better-ui`, `emil-design-eng`, `animate`, `impeccable`…), add
a **Before shipping UI** line naming which to run and when — a skill nobody is told to invoke
never runs.

## Checks

- Both files link to DESIGN.md with a relative path that resolves.
- The five rules match DESIGN.md word for word in substance — one source, two pointers.
- The verify commands in AGENTS.md include `tokens:check`.
