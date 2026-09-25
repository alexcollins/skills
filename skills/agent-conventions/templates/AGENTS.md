# AGENTS.md

Instructions for coding agents working in this repository — Codex, Cursor, Copilot, Gemini,
OpenCode, Claude Code and anything else. Claude Code additionally reads `CLAUDE.md`, which points
back here.

<!-- Delete every HTML comment before finishing. Every command below must be one you have run. -->

---

## Design system

<!-- Only when the repo has UI. The design-contract skill writes this block; until it has run,
     point at wherever the design rules live today. -->

**Before creating or substantially modifying user-facing UI, read [`./DESIGN.md`](./DESIGN.md).**

| | |
|---|---|
| [`DESIGN.md`](./DESIGN.md) | Identity, colour, type, shape, do/don't. **Start here.** |
| [`design/tokens.json`](./design/tokens.json) | Every value, machine-readable. **Generated — never hand-edit.** |
| [`design/components.md`](./design/components.md) | The component inventory, and when not to use each one. |
| [`design/layout.md`](./design/layout.md) | Page shell, widths, grids, breakpoints, z-index. |
| [`design/motion.md`](./design/motion.md) | Curves, durations, reduced motion. |
| [`design/references/`](./design/references/) | Full-page captures at 1440 and 390. |

## The rules broken most often

1. **Never <rule>.** <Reason.>
2. **Never <rule>.** <Reason.>
3. **Never <rule>.** <Reason.>
4. **Never <rule>.** <Reason.>
5. **Never <rule>.** <Reason.>

---

## Repository

<Framework>, <language>, <styling>, <data layer>.

| Where | What |
|---|---|
| `<dir>/` | <what it holds>. **<constraint, if any, with its reason>** |
| `<generated file>` | **Generated.** Never hand-edit; `<command>`. |

Path alias: `<@/*>` → `<root>`.

## Commands

```bash
<pm> run dev        # <what it starts, and on which port>
<pm> run build
<pm> run lint
```

---

## Verify before committing

```bash
<the exact commands, in order>
```

<Non-command checks: visual captures, a manual step.>

---

## Scope

- Don't add <a component library / second icon library / state manager>.
- Don't refactor <shared config> as a side effect of another change.
- Don't hand-edit generated files.
- Don't upgrade dependencies unless asked.

## Conventions

- <Commit author / message style / branch naming / PR rules — anything CI or deploy enforces.>

## Docs

- [`docs/<feature>/PLAN.md`](docs/<feature>/PLAN.md) — <one line>.
