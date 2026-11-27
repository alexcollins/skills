# Publishing to a Claude Design System

`design/preview.html` is the local view. A **Claude Design System** is the hosted one: a private
page on claude.ai you can share, with the brand book, tokens across themes, components with live
previews and the brand assets — and the system Claude itself uses when you ask it for an on-brand
deck, design or prototype. It's optional; offer it when the user wants to share the system or
build with Claude Design.

The repository stays the source of truth. The Design System is a published copy, re-synced when
the design changes — never edited by hand and then copied back.

## From Claude Code

```text
/design-sync
```

Claude Code's own command reads the repository and creates or updates the Design System. Point it
at what this skill produced, so it doesn't rediscover the system from scratch:

- **`DESIGN.md`** is the brand book: its body becomes the system's README.
- **`design/tokens.json`** holds every value. The Design System lists tokens with a usage note per
  token; take each note from the matching line in DESIGN.md's Colors, Typography and Shapes prose.
  Themes map directly: the default theme first, then each theme group.
- **Brand assets** — every file DESIGN.md's Brand assets table names, copied as files, never
  redrawn.
- **Components** — the `@path` entries in DESIGN.md's Components section, with their Don'ts as the
  guidelines.

## From any other tool

Cursor, Codex and the rest can't publish to claude.ai. Open the repository in Claude Code (or a
claude.ai conversation with the files attached) and ask for a Design System from `DESIGN.md` and
`design/tokens.json`, as above.

## Keeping it in step

After a change that moves tokens — `npm run tokens` produced a diff — re-run `/design-sync`. Note
the Design System's link in DESIGN.md's Overview, so every reader knows where the hosted copy
lives and that the repository wins when they disagree.
