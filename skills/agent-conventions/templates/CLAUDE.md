# <Project>

<!-- Loaded into every Claude Code session. Keep it to a screen. Delete this comment. -->

<Stack in one line.> Instructions for this repository are in [`AGENTS.md`](./AGENTS.md) — read it
before non-trivial work.

## Design system

Before creating or substantially modifying user-facing UI, read [`./DESIGN.md`](./DESIGN.md). It
and the files it links are the canonical design specification.

## The rules broken most often

- **<Rule>** — <reason>.
- **<Rule>** — <reason>.
- **<Rule>** — <reason>.

## Skills

- Run `/<skill>` <when — e.g. "on any new or changed component, and clear every HIGH and MEDIUM finding">.
- Use `/<skill>` <when>.

Skills live in `.agents/skills/` and are symlinked into `.claude/skills/`; `skills-lock.json` pins
their sources.

## Verify

`<command>` · `<command>` · `<command>`
