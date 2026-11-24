---
name: research
description: >-
  Investigate a question against primary sources in a background agent and leave the findings as
  one cited Markdown file in the repository, so work carries on while it reads. Use when the user
  wants a topic researched, documentation or API facts gathered, or reading delegated.
license: MIT
metadata:
  author: alexcollins
  version: "1.0.0"
  adapted-from: mattpocock/skills — research (MIT)
---

# Research

Start a background agent with fresh context, and keep working while it reads. Brief it with the
question, why it matters, and what the answer will be used for. Its job:

1. **Primary sources only** — official docs, source code, specs, changelogs, first-party APIs.
   Follow every claim back to the source that owns it; a blog post is a lead, not a citation.
2. **One Markdown file**: the answer first, then the detail, every claim linked to its source, and
   anything unresolved or contradictory marked as such. Date it — facts about tools go stale.
3. **Saved where the repository keeps notes** (`docs/`, `docs/<feature>/`, `notes/`). With no
   convention, `docs/research/<topic>.md`, and say where.

When it reports back, read the file before relying on it, and point to it from the plan it feeds.
