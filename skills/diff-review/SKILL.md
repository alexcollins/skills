---
name: diff-review
description: >-
  Review the changes since a fixed point (a branch, commit, tag or the default branch) on two
  separate axes: Standards (does it follow this repository's written rules, plus a short code-smell
  baseline?) and Spec (does it do what the plan or issue asked — no less, no more?). Adds a polish
  pass when the diff touches UI. Use when the user wants a branch, pull request or work in progress
  reviewed, and at the end of build.
license: MIT
metadata:
  author: alexcollins
  version: "1.0.0"
  adapted-from: mattpocock/skills — code-review (MIT)
---

# Diff review

Two questions, kept apart on purpose. Code can follow every rule and build the wrong thing, or
build exactly the right thing in a way the repository forbids. Judged together, one hides the
other.

## Steps

1. **Pin the base.** Whatever the user named; otherwise the merge-base with the default branch.
   Check it resolves (`git rev-parse <base>`) and that `git diff <base>...HEAD` isn't empty before
   going further. For uncommitted work, diff against the working tree: `git diff <base>`. Keep the
   commit list too: `git log <base>..HEAD --oneline`.
2. **Find the spec.** In order: issues referenced in the commits; a path the user gave; the
   `docs/<feature>/PLAN.md` for the area the diff touches. If there's none, the Spec axis reports
   "no spec" and stops there.
3. **Find the standards.** `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `CODING_STANDARDS.md`,
   `DESIGN.md` when the diff touches UI, and the lint and format configs — anything those tools
   already enforce is skipped.
4. **Run the axes separately.** In parallel subagents with fresh context where the agent supports
   it; otherwise one after the other, finishing the first before reading for the second.
   - **Standards** gets the diff, the standards files and the smell list below. It reports each
     breach of a written rule with the file and rule it breaks, and each smell as a labelled
     judgement call quoting the hunk. A written rule beats the smell list wherever they disagree.
     Under 400 words.
   - **Spec** gets the diff and the spec. It reports what was asked for and is missing or partial,
     what was built without being asked for, and what is there but looks wrong — each quoting the
     line of the spec. Under 400 words.
5. **UI pass.** When the diff changes components, run `polish` on them and add its table as a third
   section.
6. **Report** each axis under its own heading, as found — not merged, not re-ranked across axes.
   Close with one line: the count per axis and the worst finding within each.

## Smells

Always judgement calls, never violations. Each is *what it looks like* → *what usually fixes it*.

- **Mysterious name** — the name doesn't say what it holds or does → rename; if no honest name
  comes, the design is unclear.
- **Duplicated code** — the same shape in two hunks or files → extract it once, call it twice.
- **Feature envy** — a function that works mostly on another object's data → move it to the data.
- **Data clump** — the same few values always travel together → make them one type.
- **Primitive obsession** — a string or number standing in for a domain idea → give the idea a type.
- **Repeated switch** — the same branching on the same type in several places → one map, or
  polymorphism.
- **Shotgun surgery** — one change needs edits scattered across many files → gather what changes
  together.
- **Divergent change** — one module edited for unrelated reasons → split it by reason.
- **Speculative generality** — options, hooks or abstractions no current need asks for → delete
  until a need shows up.
- **Message chain** — `a.b().c().d()` → one method on `a` that does the walk.
- **Middle man** — something that only forwards calls → call the real thing.
