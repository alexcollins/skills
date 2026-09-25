# Writing AGENTS.md

AGENTS.md is the open format for guiding coding agents (agents.md) — a README written for the
reader that will actually change the code. Codex, Cursor, Copilot, Gemini, OpenCode, Claude Code
and others read it. It is the canonical instruction file; everything else points at it.

## Sections, in order

Agents weight what comes first. Put what prevents damage before what explains the tour.

### 1. Who it's for (two lines)

> Instructions for coding agents working in this repository — Codex, Cursor, OpenCode, Claude
> Code and anything else. Claude Code additionally reads `CLAUDE.md`, which points back here.

### 2. Design system — only when the repo has UI

The block `design-contract` defines: a pointer to DESIGN.md, a table of the design files, and the
design rules broken most often. If `design-contract` hasn't run, a one-line pointer to wherever
the design rules live today is still better than nothing.

### 3. The rules most often broken

A numbered list of five or six. Each is one sentence starting with **Never**, then its reason:

> 3. **Never `transition-all`.** It animates properties you didn't mean to; name them.

Where they come from, in order of reliability: rules the codebase already breaks (grep for them),
bugs that were fixed more than once (git log), traps with no visible symptom (an undefined CSS
variable that voids a declaration, a server-only import that breaks the client bundle), rules an
existing agent file shouts about. Five. A list of fifteen is a list nobody reads.

### 4. Repository

The stack in one line (framework, language, styling, data). Then a **table** of path → what,
with constraints inline and in bold:

| Where | What |
|---|---|
| `app/` | Routes. The public site at the root; the admin tool under `/admin`. |
| `components/admin/` | Admin chrome. **Never import into a public page — it pulls the database client into the bundle.** |
| `content/` | All copy, as typed data. Adding a page is a data change only. |
| `design/tokens.json` | **Generated.** Never hand-edit; `npm run tokens`. |

Then any authoring convention an agent would otherwise get wrong (copy with `*emphasis*` markers,
the path alias, where server actions live).

### 5. Commands

Dev, build, test, lint, typecheck, the generators. Exactly as typed, with the project's package
manager. Only commands you have run.

### 6. Verify before committing

A fenced block of the exact commands that must pass, in the order to run them. Then any check that
isn't a command: "for visual changes, capture at 1440 and 390 and compare with
`design/references/`".

```bash
npm run tokens:check
npx tsc --noEmit
npm run lint
npm run build
```

If a command fails on the default branch today, don't list it as a gate — say what does pass, and
note the failing one as known.

### 7. Scope — what not to do unasked

Agents reach for these on their own. Name them:

- Don't add a component library, a second icon library, or a state manager.
- Don't refactor the global stylesheet (or any shared config) as a side effect of another change.
- Don't hand-edit generated files.
- Don't upgrade dependencies unless asked.
- Keep internal routes (`/design-system`, admin pages) unlinked, noindex, out of the sitemap.

### 8. Conventions

Commit author and message style, branch naming, PR rules, deploy constraints — the things that
make CI or a deploy reject work. ("Commit author must be X or the deploy is blocked" belongs here,
verbatim.)

### 9. Docs

Pointers to `docs/<feature>/PLAN.md` and `SETUP.md` for each feature, one line each.

## Merging existing files

1. Read every existing agent file. List each rule with its source.
2. Place each rule in the section above where it belongs. Keep the author's wording where it's
   good; add the missing reason where it isn't.
3. Rules that conflict: don't pick silently — list the conflict for the user with your
   recommendation.
4. Rules that only apply to Claude Code (skill invocations, slash commands) go in CLAUDE.md.
5. Report every rule's new home. Nothing disappears unannounced.

## Style

- Imperative, specific, short sentences. Paths in backticks. Real commands, not descriptions of
  them.
- Explain why. An agent that knows why a rule exists applies it to cases the rule never named.
- No motivation, no marketing, no history lessons. The reader wants to do the task correctly.
- Headings stable and predictable — other tools and people link to them.
