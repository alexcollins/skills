---
name: spec
description: >-
  Write what has already been agreed into docs/<feature>/PLAN.md: what it is, the decisions, the
  seams the work will be tested at, and the work cut into vertical phases that each ship on their
  own. Synthesis, not an interview. Use after grill, or when the user asks for a plan, a spec,
  tickets or a breakdown of the work.
license: MIT
disable-model-invocation: true
metadata:
  author: alexcollins
  version: "1.0.0"
  adapted-from: mattpocock/skills — to-spec, to-tickets (MIT)
---

# Spec

The plan is a file in the repository, not a ticket system: `docs/<feature>/PLAN.md`, in the format
`agent-conventions` uses for every feature. One file holds the decisions, the phases and what was
deliberately left out, and every later session reads it.

Write down what the conversation settled. A decision that was never made goes under Open
questions with a default; it doesn't stop the plan. The seams in step 2 are the one thing to ask.

## Steps

1. **Read.** The conversation, `GLOSSARY.md`, any existing PLAN.md for this feature, and the code
   it touches. Use the glossary's words throughout.
2. **Agree the seams.** A seam is a public interface the tests will go through. Prefer seams that
   already exist, as high up as possible; fewer is better, one is ideal. Give each a line: what a
   test there catches, what it misses. Confirm them with the user before going on.
3. **Cut phases as tracer bullets.** Each phase is a narrow path through every layer it needs (data,
   logic, interface, test), demoable on its own, small enough for one fresh session. Any
   prefactoring comes first: make the change easy, then make the easy change. Each phase names the
   phases it needs.

   A **wide refactor** (a rename or retype that breaks every caller at once) can't be sliced
   vertically. Sequence it expand → migrate → contract: add the new form beside the old, move
   callers over in batches that each stay green, then delete the old form.
4. **Write the plan** from the template below. Show the phase list and ask three things: is the
   size right, are the dependencies real, should any merge or split? Revise until the user agrees.
5. **Publish only if asked.** When the user wants issues, open one per phase in dependency order,
   blockers first, each linking back to the plan. PLAN.md stays the source of truth.

Leave file paths and code out of the plan; both go stale within days. The exception is a shape a
prototype settled (a state machine, a type, a schema) that prose would blur: inline the essential
part and say where it came from.

## Template

```md
# <Feature> — plan

Status: Nothing built · Next: phase 1.

## What it is

<The problem, as the user has it. The solution, as the user will see it. A paragraph each, at most.>

## Decisions

| Decision | Choice | Why |
|---|---|---|
| <what had to be decided> | <what was chosen> | <why — and the alternative rejected> |

## Seams

- <The interface> — catches <what>; misses <what>.

## Phases

**Phase 1 — <name>.** Needs: nothing.

- Delivers: <the end-to-end behaviour, from the user's side>.
- Done when: <a check anyone can run>.
- Not built, on purpose: <what>, because <why>.

**Phase 2 — <name>.** Needs: phase 1.

- …

## Open questions

1. <Question>? Default until decided: <default>.
```

`build` marks a phase **Built.** and moves the Status line in the same change that builds it.
