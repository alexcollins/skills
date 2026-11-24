---
name: retro
description: >-
  Look back over a coding session and propose changes to the agent's environment — not the code —
  so the next session goes better: navigation pointers, automated checks, review rules, steering
  files, tooling, access to information. Most severe first. Use when the user asks for a retro or
  retrospective, or after a session that went sideways.
license: MIT
disable-model-invocation: true
metadata:
  author: alexcollins
  version: "1.0.0"
  adapted-from: mattpocock/skills — retro, writing-for-agents (MIT)
---

# Retro

The code is fixed by the session. The **environment** — what the next agent is told, can find and
gets checked against — is fixed here.

## Steps

1. **Read the session** the user names; default to this one. Reading another may mean finding its
   log on this machine.
2. **Find where the agent lost time or made a mistake**, and sort each into one of these:
   - **Navigation** — slow to find the right file, or a hidden dependency between files. Fix: a
     pointer in AGENTS.md, or a constraint written next to the code it constrains.
   - **Missing check** — a mistake a linter, typecheck, test or CI job could have caught. Look at
     the existing scripts and CI first: a check that exists but isn't wired up, or is silently
     broken, is the finding. A repository with no pre-commit hook and no CI running its checks is a
     finding by itself.
   - **Review rule** — a mistake review should have caught. Mechanical (a banned API, an import
     shape, a file location) → build a check, don't write a rule. Judgement (consistency, "matches
     the style around it") → a rule in the standards `diff-review` reads.
   - **Steering bloat** — AGENTS.md or CLAUDE.md lines that change nothing (the agent does it
     anyway), belong in a check, or belong in a doc behind a pointer.
   - **Tool economy** — an expensive or noisy tool call that a script, a flag or a narrower query
     would replace.
   - **Information access** — something the agent needed and couldn't see: dev server logs,
     read-only access to a service, a doc that only lives in someone's head.
3. **Report** most severe first. Each: what happened (with the evidence), the change, and which
   file or check it lands in. Offer to make the changes; don't make them unasked.

## Where things go

Lean on `agent-conventions` for the arrangement: AGENTS.md is the full, tool-neutral instructions;
CLAUDE.md is short and costs context every session; design rules live in DESIGN.md; decisions live
in `docs/<feature>/PLAN.md`. Any skill or instruction you propose follows
[agent-conventions/references/writing.md](../agent-conventions/references/writing.md).

Implementation and review are different jobs. The implementing agent carries the heaviest context
— exploring, writing, debugging — so coding standards belong to review, where the agent gets a diff
and has room to apply them.
