# Writing CLAUDE.md

Claude Code loads CLAUDE.md into every session in the repository, before the first message. That
makes it the most-read file in the repo and the most expensive one: every line costs context in
every conversation, whether or not it's relevant. So it points instead of explaining.

## What goes in

1. **A pointer to AGENTS.md** — "Instructions for this repository are in AGENTS.md; read it before
   non-trivial work." And to DESIGN.md before UI work, when there is one.
2. **The stack and where things live, in two or three lines** — enough to orient, with the detail
   in AGENTS.md.
3. **The rules broken most often** — the same five as AGENTS.md, in substance. One line each. The
   duplication is deliberate: whichever file gets read, the five get read.
4. **Which skills to run, and when.** "Run `/better-ui` on any new or changed component and clear
   every HIGH and MEDIUM finding." A skill that isn't named here with a trigger doesn't run.
5. **Verify** — the commands, one line.
6. **Traps specific to Claude Code** — a slash command that assumes a token this repo doesn't
   define; a skill whose default conflicts with the design.

## What stays out

- Reference material: API contracts, schema explanations, long component docs. They go in
  AGENTS.md or `docs/`, linked.
- History: why a decision was made last year belongs in `docs/<feature>/PLAN.md`.
- Anything duplicated from AGENTS.md beyond the five rules.

## Budget

Aim for a screen — under ~150 lines. Past ~12 KB, the verifier warns. When adopting a large
existing CLAUDE.md, don't delete content: move each block to its right home (AGENTS.md, DESIGN.md,
`docs/`), link it, and report the moves.

## Two files, or one

Default: two files. AGENTS.md is complete and tool-neutral; CLAUDE.md is short and Claude-specific.
If Claude Code is the only agent that will ever work in the repository, `ln -s AGENTS.md CLAUDE.md`
is acceptable — then AGENTS.md must itself stay short, and the skill-invocation lines move into it.

## Template

See [../templates/CLAUDE.md](../templates/CLAUDE.md).
