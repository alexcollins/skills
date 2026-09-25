---
name: agent-conventions
description: >-
  Set up, or repair, the files that make every coding agent work the same way in a repository:
  AGENTS.md (the open standard, read by Codex, Cursor, Copilot, Gemini, OpenCode and Claude
  Code) as the full, tool-neutral instructions; a short CLAUDE.md that points to it and carries
  only the rules most often broken; skills vendored once in .agents/skills, symlinked into
  .claude/skills and pinned in skills-lock.json; docs/<feature>/PLAN.md decision records that
  say what was deliberately not built; SETUP.md for the dashboard steps no agent can do; and a
  verifier that catches broken links, drifted skill copies and unpinned skills. Use this whenever
  someone is preparing a repo for AI agents, writing or cleaning up AGENTS.md or CLAUDE.md,
  finds CLAUDE.md has grown huge or contradicts itself, copies skills between projects, has
  .cursorrules / copilot-instructions / GEMINI.md that disagree, or wants several repositories to
  share one way of working with agents.
license: MIT
metadata:
  author: alexcollins
  version: "1.0.0"
---

# Agent conventions

Agents follow whatever they are given, and most repositories give them a pile: a CLAUDE.md that
grew for a year, a `.cursorrules` nobody updated, a copy of a skill that drifted from the other
copy. This skill replaces the pile with one arrangement that every agent reads the same way and a
script that notices when it rots.

```
AGENTS.md                  the instructions. Tool-neutral, complete, the canonical file
CLAUDE.md                  short. Points at AGENTS.md; the rules most often broken; which skills to run
.agents/skills/<name>/     every skill, vendored once
.claude/skills/<name>      a symlink into .agents/skills — never a second copy
skills-lock.json           where each skill came from, and the hash of what was installed
docs/<feature>/PLAN.md     the decision record: what is built, what isn't, and why not
docs/<feature>/SETUP.md    the dashboard steps a human has to do, in order
scripts/verify-conventions.mjs
```

When the repo has UI, the `design-contract` skill adds DESIGN.md and its design block to both
files. Run this one first; they are made to fit together.

## The rules

1. **AGENTS.md is canonical; CLAUDE.md points.** AGENTS.md is the long, complete, tool-neutral
   file. CLAUDE.md is loaded into every Claude Code session, so it stays short: a pointer, the few
   rules most often broken, the skills to run. Two files, not a symlink — unless Claude Code is the
   only agent that will ever touch the repo, in which case one symlinked file is less to maintain.
2. **Read before you write. Run before you document.** Every command, path and boundary comes from
   the repository, and every command in a Verify block is one you have run. A documented command
   that doesn't work teaches agents to ignore the file.
3. **"Never X, because Y."** A rule without its reason gets argued with; a rule with it tells the
   reader when it stops applying. Negatives are testable; "prefer" rarely is.
4. **A constraint lives next to what it constrains.** "Never import `components/admin/` into a public
   page — it pulls the database client into the bundle" goes in the Repository row for
   `components/admin/`, not in a list three screens away.
5. **Generated files say so, and something checks them.** A "do not edit" label alone gets
   ignored; a label plus a check that fails does not.
6. **Never lose an existing rule.** Existing AGENTS.md, CLAUDE.md, `.cursorrules`,
   `.github/copilot-instructions.md`, `GEMINI.md`, `.windsurfrules`: read them all, merge every rule
   into the new arrangement, and report what moved where. Show the user before replacing anything.
7. **One copy of everything.** One copy of each rule (the others point at it), one copy of each
   skill (the others symlink to it).

## Workflow

### Phase 1 — Read the repository

- The package manager (lockfile), and every script in `package.json` — run the verify-shaped ones
  (typecheck, lint, test, build) to learn which actually pass today.
- The top-level layout, and what each directory is for.
- Boundaries that exist but are written down nowhere: server-only modules, a public bundle that
  must not import an internal one, generated files, a folder owned by a CLI.
- Every existing agent file (list above). Note each rule and where it came from.
- `docs/`, the README, and anything that reads like a decision record.

### Phase 2 — AGENTS.md

Read [references/agents-md.md](references/agents-md.md); start from
[templates/AGENTS.md](templates/AGENTS.md). Sections, in order: who it's for → design system (if
there is UI) → the rules most often broken → repository map with inline constraints → commands →
verify before committing → scope (what not to do unasked) → conventions → docs.

### Phase 3 — CLAUDE.md

Read [references/claude-md.md](references/claude-md.md); start from
[templates/CLAUDE.md](templates/CLAUDE.md). It points at AGENTS.md, repeats only the handful of
rules broken most often, says which skills to run and when, and lists the verify commands. Budget:
about a screen, and never over ~12 KB. If an existing CLAUDE.md is far longer, move its reference
material into AGENTS.md or `docs/` and link it — don't delete it.

### Phase 4 — Other agents' files

For `.cursorrules`, `.github/copilot-instructions.md`, `GEMINI.md`, `.windsurfrules` and similar:
after their rules are merged into AGENTS.md, reduce each to a pointer ("Instructions for this
repository are in AGENTS.md") rather than a second copy. Many of these tools read AGENTS.md
natively; the pointer covers the ones that don't. Ask before deleting any of them.

### Phase 5 — Skills

Read [references/skills.md](references/skills.md). Install with the skills CLI so the lock is
written for you:

```bash
npx skills add <owner>/<repo> --skill <name> -a claude-code codex cursor
# → .agents/skills/<name>, a .claude/skills/<name> symlink, and an entry in skills-lock.json
```

Then name each skill in CLAUDE.md with **when** to run it. A skill nobody is told to invoke never
runs.

### Phase 6 — Feature docs

Read [references/feature-docs.md](references/feature-docs.md). For each significant feature or
integration — anything with phases, a third-party service, or a contract with another system —
`docs/<feature>/PLAN.md` from [templates/PLAN.md](templates/PLAN.md), and `SETUP.md` from
[templates/SETUP.md](templates/SETUP.md) when a human has dashboard steps to do. Don't create them
for a brochure page; do for anything someone will ask "why isn't X built?" about.

### Phase 7 — Verify

```bash
node scripts/verify-conventions.mjs     # copy it from this skill into the project first
```

Zero errors before finishing. Then run every command in AGENTS.md's Verify block one more time,
exactly as written.

## Reporting back

1. **Files** created or changed, one line each.
2. **Consolidated** — every existing rule, where it came from, where it lives now. Anything
   intentionally dropped, and why.
3. **The rules most often broken** you chose, and the evidence for each.
4. **Verifier output**, and what the user needs to decide (deleting old agent files, pinning an
   unpinned skill, a CLAUDE.md that is still over budget).

## Pitfalls

- **Copies of skills.** `cp -r` into `.claude/skills` works on day one and drifts by day thirty.
  The verifier flags a copy even when identical.
- **A Verify block nobody ran.** If `npm test` doesn't exist or fails today, don't list it as a
  gate; say what does run.
- **CLAUDE.md as a dumping ground.** Everything in it costs context in every session. When it
  grows, move reference material out and link it.
- **Rules in the wrong file.** Design rules belong in DESIGN.md; the agent files repeat only the
  most-broken few and point there.
- **Secrets.** SETUP.md names secrets and where they go; it never contains a value.
