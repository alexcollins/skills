---
name: prototype
description: >-
  Build throwaway code that answers one design question. Logic and state questions get a single
  HTML file anyone can click through; look-and-feel questions get several radically different UI
  variants on one route, switchable from a floating bar. Use when the user wants to check whether
  a state model or flow feels right, or to see options for what a screen should look like before
  committing.
license: MIT
metadata:
  author: alexcollins
  version: "1.0.0"
  adapted-from: mattpocock/skills — prototype (MIT)
---

# Prototype

A prototype is code written to answer a question, then thrown away. The question decides its shape,
so name it first, in one sentence, at the top of whatever you build.

| The question | Build |
|---|---|
| Does this logic or state model hold up? | One self-contained HTML file: [references/logic.md](references/logic.md) |
| What should this look like? | Three variants on one route, `?variant=` and a switcher bar: [references/ui.md](references/ui.md) |

If it's unclear and the user isn't around, pick by the surrounding code — a backend module means
logic, a page or component means UI — and state the assumption at the top.

## Rules for both

1. **Obviously throwaway.** Put it next to what it's for, with `prototype` in the name, following
   the project's existing layout and routing.
2. **One command, or a double-click.** Nobody should have to think to start it.
3. **State in memory.** Touch a database only when persistence *is* the question, and then a
   scratch one named so anyone would wipe it.
4. **No polish.** No tests, no error handling beyond what keeps it running, no abstractions.
5. **Show the state.** After every action, or on every variant switch, render the full relevant
   state so the change is visible.
6. **Keep the answer, bin the code.** Fold the decision into the real code or the plan — the
   verdict and the question it settled. Commit the prototype to a `prototype/<name>` branch, never
   the main one, and point at that branch from the plan.

On a project with a design system (`DESIGN.md`), UI variants use its components and tokens. A
variant that only looks good because it ignores the system has answered the wrong question.
