---
name: build
description: >-
  Build a phase of a plan, an issue or a described change test-first: one failing test at an
  agreed seam, the least code that passes it, repeat; typecheck as you go; mark the phase Built in
  its PLAN.md; review the diff; commit. Runs independent phases in parallel when the agent can.
  Use when the user asks to build or implement a phase, a plan, a ticket or a feature, or to work
  test-first (TDD, red-green).
license: MIT
metadata:
  author: alexcollins
  version: "1.0.0"
  adapted-from: mattpocock/skills — implement, implement-spec, tdd, pr (MIT)
---

# Build

## Before the first line

1. **Know the work.** A phase in `docs/<feature>/PLAN.md`, an issue (fetch it and say its title),
   or what the conversation agreed. If it could mean two things, ask once.
2. **Know the seams.** They're in the plan. With no plan, propose them — the public interfaces the
   tests will go through, one line each on what they catch — and confirm before writing a test.
3. **Know the checks.** Find the typecheck, single-test, full-suite and lint commands in the
   project's scripts and CI, and run them once. Failures that were there before you started aren't
   yours to fix; note them so they don't get blamed on this change.

## The loop

Red, then green, one behaviour at a time:

1. Write one test at an agreed seam for the next behaviour. Run it and watch it fail **for the
   reason you expect**.
2. Write the least code that makes it pass. Nothing for a test that doesn't exist yet.
3. Run the typecheck and that test file. Next behaviour.

What makes a test worth keeping is in [references/tests.md](references/tests.md). The short form:
it goes through the public interface and survives a rewrite of everything behind it; its expected
value comes from somewhere independent of the code (a literal, a worked example, the spec); and
it mocks only what the project doesn't own — the network, third parties, time, randomness.

Write the tests one at a time, not all up front: a batch written before the code tests what you
imagined, not what you learned building it. Refactoring waits until the behaviour is green.

Work with no seam to test at — a visual change, config, copy — still gets checked: run it, look at
it, screenshot it, and say how it was verified.

## Finish

1. Full suite, typecheck and lint, once.
2. Update the plan **in the same change**: the phase marked **Built.**, the Status line moved on,
   and anything learned along the way added — a decision, a "Not built, on purpose".
3. Run `diff-review` from where you started. Fix what it finds; where a finding is a judgement
   call, make the call and say which way you went.
4. Commit to the current branch: what changed and why, in the project's commit style. Push or open
   a pull request only when asked.

When asked for a pull request, the body carries three things: the smallest picture that makes the
change clear (a sentence, a table, a screenshot), evidence that it works (before and after, test
output), and the risk — whether it can be undone easily, and what breaks if it's wrong.

## Several phases at once

When phases don't depend on each other and the agent can run subagents in separate worktrees:

1. Create an integration branch.
2. Start one subagent per ready phase, each on its own branch cut from the integration branch,
   each running this skill for its phase. Brief them with pointers — the plan's path and the phase
   number — not pasted content.
3. As each finishes, merge it into the integration branch and start the phases it unblocked.
4. When none are left, run one `diff-review` over the integration branch, fix in one pass, and
   clean up the worktrees.
