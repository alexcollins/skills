# skills

My agent skills — one small set that covers the way I build, installable into Claude Code, Codex,
Cursor, Copilot, Gemini, OpenCode and anything else that reads [Agent Skills](https://agentskills.io).

```bash
npx skills add alexcollins/skills                     # choose from the list
npx skills add alexcollins/skills --skill polish      # or just one
```

## The flow

```
grill  →  spec  →  build  →  diff-review
  │         │        │            │
  │         │        │            └─ standards and spec, judged apart (+ polish on UI)
  │         │        └─ test-first at agreed seams, marks the phase Built
  │         └─ docs/<feature>/PLAN.md: decisions, seams, vertical phases
  └─ interview until nothing is assumed; keeps GLOSSARY.md and decisions current
```

Small change: `grill`, then `build`. No setup step, no issue tracker required — the plan is a file
in the repository, in the same format `agent-conventions` uses for every feature.

## The set

| | Skill | What it does |
|---|---|---|
| **Workflow** | [**grill**](skills/grill/SKILL.md) | Interviews you round by round until every decision is made and confirmed. In a repo, it writes the project's language to `GLOSSARY.md` and real trade-offs to the plan as they land. |
| | [**spec**](skills/spec/SKILL.md) | Writes what was agreed into `docs/<feature>/PLAN.md` — decisions, the seams to test at, and phases cut as tracer bullets that each ship alone. |
| | [**build**](skills/build/SKILL.md) | Red, then green, one behaviour at a time at the agreed seams. Updates the plan in the same change, reviews, commits. Runs independent phases in parallel worktrees when it can. |
| | [**diff-review**](skills/diff-review/SKILL.md) | Reviews a diff on two axes kept apart — the repo's written standards (plus a short smell list) and the spec — so one can't hide the other. |
| **Engineering** | [**debug**](skills/debug/SKILL.md) | No theories until there's one command that goes red on this exact bug. Then shrink, hypothesise, probe, fix behind a regression test. |
| | [**architecture**](skills/architecture/SKILL.md) | Finds shallow, tangled, untestable modules and designs deep ones, with a fixed vocabulary and a design-it-twice pattern. |
| | [**prototype**](skills/prototype/SKILL.md) | Throwaway code for one question: a clickable HTML state model, or radically different UI variants on one route. |
| | [**research**](skills/research/SKILL.md) | A background agent that reads primary sources and leaves one cited file. |
| **Design** | [**design-contract**](skills/design-contract/SKILL.md) | A [DESIGN.md](https://github.com/google-labs-code/design.md) whose tokens are **parsed from the code**, never typed, and a `tokens:check` gate that **fails the build** when code and docs disagree. |
| | [**polish**](skills/polish/SKILL.md) | The details that make UI feel finished — radii, alignment, surfaces, icons, states, touch — reviewed inside the project's design contract, with a Block or Approve verdict. |
| | [**motion**](skills/motion/SKILL.md) | Whether to animate at all, then the right tool, properties, curve, duration, exit and reduced motion — using the project's own tokens. |
| **Agents** | [**agent-conventions**](skills/agent-conventions/SKILL.md) | AGENTS.md as the canonical instructions, a short CLAUDE.md, skills vendored once and pinned, decision records, and a verifier that catches drift. |
| | [**handoff**](skills/handoff/SKILL.md) | Compresses a session into a file a fresh agent can start from. |
| | [**retro**](skills/retro/SKILL.md) | After a session, fixes the environment rather than the code: pointers, checks, review rules, steering bloat. |

## How they're written

- **One way to do each thing.** Where the originals offered a range, these pick a value. Where two
  skills overlapped, they merged.
- **The project wins.** `polish` and `motion` read `DESIGN.md` and the project's tokens first; their
  defaults fill only the gaps, and they never reference a token the project doesn't define.
- **Files over services.** Plans, decisions and the glossary live in the repository, where every
  agent and every session can read them.
- **Facts are the agent's job, decisions are yours.** Skills look things up themselves and ask only
  for what you have to decide.

Several are rewrites of skills by Matt Pocock, Emil Kowalski and Jakub Krehel — see
[CREDITS.md](CREDITS.md).

## Why design-contract

Most design-doc skills have an agent read the code and *write down* what it sees. That document is
right on the day and wrong a month later, and nothing notices. `design-contract` is built around the
opposite rule: **values are parsed, never typed.**

- **The frontmatter can't drift.** `scripts/design-tokens.mjs` resolves every `var()` chain and
  `calc()` in your stylesheets and writes the spec's token block itself. You map *roles* once
  ("`--card` is `surface`"); the *values* are always read from the code. A renamed token fails
  loudly instead of publishing yesterday's value.
- **The build enforces it.** `tokens:check` fails when the generated files drift, when a new
  arbitrary value (`bg-white/[0.07]`, `rounded-[13px]`, `z-[70]`) appears in markup — with the file
  and line — and when the hand-written prose names a token or hex the code no longer has.
- **It audits with facts, not impressions.** `--report` counts distinct values per category, finds
  near-duplicate colours *within a theme* (OKLab ΔE), lists tokens with no static reference (aware of
  Tailwind 4 namespaces and dynamically composed names) and hex colours hard-coded in components.
- **It fits a system that already exists.** If something already reads your tokens file in a
  curated shape (a design-system page, a Figma sync), an `extend` module rebuilds that shape from
  the parsed values — gated like everything else — so adopting doesn't break the consumer.
- **It's honest.** Near-duplicates are recorded as Known inconsistencies, never silently merged —
  consolidating changes the design, and that's your call.
- **It protects the brand from other skills.** A *Deliberate choices* section names the patterns
  design skills flag as generic "AI tells" (mono caps labels, near-black grounds, hairlines) when
  your brand uses them on purpose — so the next agent doesn't "fix" them.
- **It lints clean against the spec.** Output passes `npx @google/design.md lint` with zero errors.
  Along the way it handles what the spec's linter rejects or flags: `clamp()` sizes are published
  as their bound with the fluid range kept as a comment, and colours use Material 3 role names the
  linter recognises as families.

## design-contract: tested on

Three production codebases with nothing in common but the author: a Tailwind 3 site with a custom
fluid type scale, `next/font` families and colour that exists only in canvas code; a Tailwind 4 +
shadcn app with three themes (dark by default); and a Tailwind 4 + shadcn directory with its own
token layer over shadcn's. Every output lints at 0 errors, 0 warnings.

Not yet tried on a plain-CSS, SCSS or CSS-in-JS project. The parser reads any CSS custom
properties, so it should work — issues from those stacks are welcome.

## Requirements

Most skills are plain Markdown. The scripts in `design-contract` and `agent-conventions` need
Node 18+ and no dependencies; Tailwind 3 configs resolve through the project's own `tailwindcss`,
and reference captures use the project's Playwright if it has one.

## Development

```bash
npm test       # the scripts' tests, then the skill check
npm run check  # every SKILL.md: frontmatter, name, description length, links
```

## License

MIT
