# skills

Two agent skills for keeping a codebase's design and its agent instructions true — installable into
Claude Code, Codex, Cursor, Copilot, Gemini, OpenCode and anything else that reads
[Agent Skills](https://agentskills.io).

```bash
npx skills add alexcollins/skills
```

| Skill | What it does |
|---|---|
| [**design-contract**](skills/design-contract/SKILL.md) | Turns the design a codebase already has into a [DESIGN.md](https://github.com/google-labs-code/design.md) whose tokens are **parsed from the code**, never typed — plus `design/tokens.json`, a component inventory that says when *not* to use each component, layout and motion references, reference captures at 1440 and 390, and a `tokens:check` gate that **fails the build** when code and docs disagree. |
| [**agent-conventions**](skills/agent-conventions/SKILL.md) | One arrangement every agent reads the same way: AGENTS.md as the canonical instructions, a short CLAUDE.md that points to it, skills vendored once and symlinked, `skills-lock.json` pins, decision records that say what was *not* built and why — and a verifier that catches broken links, drifted skill copies and unpinned skills. |

They're built to be used together — `agent-conventions` first, then `design-contract` for any repo
with UI — and each works alone.

## Why another design skill

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
- **It's honest.** Near-duplicates are recorded as Known inconsistencies, never silently merged —
  consolidating changes the design, and that's your call.
- **It protects the brand from other skills.** A *Deliberate choices* section names the patterns
  design skills flag as generic "AI tells" (mono caps labels, near-black grounds, hairlines) when
  your brand uses them on purpose — so the next agent doesn't "fix" them.
- **It lints clean against the spec.** Output passes `npx @google/design.md lint` with zero errors.
  Along the way it handles what the spec's linter rejects or flags: `clamp()` sizes are published
  as their bound with the fluid range kept as a comment, and colours use Material 3 role names the
  linter recognises as families.

## Tested on

Three production codebases with nothing in common but the author: a Tailwind 3 site with a custom
fluid type scale, `next/font` families and colour that exists only in canvas code; a Tailwind 4 +
shadcn app with three themes (dark by default); and a Tailwind 4 + shadcn directory with its own
token layer over shadcn's. Every output lints at 0 errors, 0 warnings.

## Requirements

Node 18+. No dependencies. Tailwind 3 configs resolve through the project's own `tailwindcss`;
reference captures use the project's Playwright if it has one.

## Development

```bash
npm test     # node --test over both skills' scripts
```

## License

MIT
