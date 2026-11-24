---
name: handoff
description: >-
  Compress the current session into a handoff file a fresh agent — in another tool, directory or
  machine — can pick up and continue from. Use when the user asks for a handoff, wants to move the
  work elsewhere, or is about to clear a long session mid-task.
license: MIT
disable-model-invocation: true
argument-hint: "What will the next session be used for?"
metadata:
  author: alexcollins
  version: "1.0.0"
  adapted-from: mattpocock/skills — handoff (MIT)
---

# Handoff

Write one Markdown file a fresh agent can start from cold. If the user said what the next session
is for, shape it around that.

- **Goal** — what we're doing and why, in two or three sentences.
- **State** — what's done, what's in progress, what's next, as a short list.
- **Decisions and dead ends** — what was settled, and what was tried and failed, with the reason,
  so nobody tries it again.
- **Pointers, not copies.** Plans, specs, issues, commits and branches are linked by path or URL,
  never pasted.
- **Skills to load** — which of this set the next agent should start with.
- **First move** — the exact next action.

Leave out every secret: keys, tokens, passwords, personal details.

Save it outside the repository — the OS temp directory (`$TMPDIR`, else `/tmp`; `%TEMP%` on
Windows) as `handoff-<topic>-<date>.md` — unless the user names a place. Print the full path.
