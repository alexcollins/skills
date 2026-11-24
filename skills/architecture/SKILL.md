---
name: architecture
description: >-
  Find and design deep modules — a lot of behaviour behind a small interface, at a clean seam,
  tested through that interface. Surveys a codebase for shallow, tangled or untestable areas and
  ranks the refactors worth doing, then designs the chosen one with the user. Use when the user
  wants the architecture improved or refactoring candidates found, asks where a seam should go or
  how a module's interface should look, or wants code easier to test or for agents to navigate.
license: MIT
metadata:
  author: alexcollins
  version: "1.0.0"
  adapted-from: mattpocock/skills — codebase-design, improve-codebase-architecture (MIT)
---

# Architecture

Agents speed up writing code, so they speed up the mess too. The counterweight is modules that are
**deep**: small to learn, a lot behind them, one place to change. Use the words in
[references/vocabulary.md](references/vocabulary.md) — *module, interface, depth, seam, adapter,
leverage, locality* — exactly, in every suggestion. Name modules with `GLOSSARY.md`'s terms.

## Survey

1. **Aim first.** Take the area the user named. Otherwise read a good stretch of `git log` and
   start where change keeps landing — deepening pays back on code that keeps changing. Read the
   glossary and the Decisions in the relevant `docs/*/PLAN.md` so you don't re-propose something
   already rejected.
2. **Walk it**, in a subagent with fresh context where you can, and note friction:
   - understanding one idea means bouncing between many small modules;
   - an interface nearly as complex as what's behind it;
   - logic pulled into pure functions for testing while the bugs live in how they're called;
   - modules that leak into each other across a seam;
   - code that's untested, or can't be tested through its current interface.

   Put each suspect through the **deletion test**: delete it in your head. If its complexity
   vanishes, it was a pass-through. If it reappears in every caller, it was earning its place.
3. **Report candidates**, best first. For each: the files, the problem, the change in plain words,
   what it buys (leverage, locality, which tests get better), and a strength — *Strong*, *Worth
   exploring* or *Speculative*. A candidate that contradicts a recorded decision appears only when
   the friction justifies reopening it, and says so. End with the one you'd do first and why.
   Offer a visual HTML report only if the user wants one to share.

Propose no interfaces yet. Ask which candidate to explore.

## Design the chosen one

1. `grill` the user through it: constraints, dependencies, what sits behind the seam, which tests
   survive. Record terms and decisions as `grill` does.
2. Classify each dependency and pick the testing strategy for it:
   [references/deepening.md](references/deepening.md).
3. When the interface shape is genuinely open, design it more than once — the parallel design
   pattern in the same file — and recommend one, or a hybrid.
4. A rejected candidate with a reason that will matter later becomes a "Not built, on purpose"
   line, so the next survey doesn't suggest it again.

The result goes into `spec` like any other feature.
