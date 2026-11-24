---
name: grill
description: >-
  Interview the user until a plan, design or decision has no open branches left, then confirm the
  shared understanding before anything is built. Use when the user says "grill me", wants to
  stress-test an idea, or a request is too vague to start. Inside a repository it also keeps the
  project's language (GLOSSARY.md) and its decisions (docs/<feature>/PLAN.md) current as answers
  land.
license: MIT
metadata:
  author: alexcollins
  version: "1.0.0"
  adapted-from: mattpocock/skills — grilling, grill-me, grill-with-docs, domain-modeling (MIT)
---

# Grill

Most bad builds start as a misunderstanding nobody caught. Close it before the code: ask until
every decision the work depends on has been made by the user, out loud.

## The loop

Treat the plan as a **decision tree**. A decision is on the **frontier** when everything it depends
on is settled.

1. **Facts are your job.** Anything the code, the docs, a command or the web can answer, look up
   yourself. Run lookups in a subagent where you can, and only hold back the questions that depend
   on them. The user makes decisions; they never fetch facts for you.
2. **Ask the frontier in one round.** Number the questions, recommend an answer to each, and word
   it so "yes" accepts the recommendation. If the frontier holds more than six, ask the six that
   unblock the most.

   ```
   **Q1 · <title>** — <the question; the options if there are any>
   → <your recommendation, and why in one line>
   ```

3. **Recompute.** Each answer settles a branch and opens the ones under it. A question that depends
   on another still open in this round waits for the next.
4. **Done when the frontier is empty.** Play the decisions back as a short list and get an explicit
   yes. Nothing gets built on an unconfirmed understanding.

## Inside a repository: write it down as it lands

Skip this section when there is no working directory. Otherwise, write as each answer lands, not
at the end — a session that dies mid-way still leaves its decisions behind.

- **Read the language first.** `GLOSSARY.md` at the root, or `GLOSSARY-MAP.md` pointing to one per
  context. Use its terms in every question.
- **Challenge the words.** When the user uses a term that clashes with the glossary, or one word
  for two things, stop on it: "The glossary says an *Order* is X — you mean Y?" Resolve it, then
  write the term. Format: [references/glossary.md](references/glossary.md).
- **Check claims against the code.** When the user says how something works and the code disagrees,
  say so before going on.
- **Record a decision only when it is hard to reverse, surprising without context and a real
  trade-off** — all three. It goes in the Decisions table of `docs/<feature>/PLAN.md` (the
  `agent-conventions` format), or `docs/DECISIONS.md` when it spans the whole repository. An idea
  rejected for a reason that will matter later goes under "Not built, on purpose".
- Create each file the first time there is something to put in it.

## Next

Small change: build it. Anything that needs more than one session: `spec`.
