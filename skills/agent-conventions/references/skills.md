# Skills: vendored once, pinned, named

## Layout

```
.agents/skills/<name>/       the real files. Tool-neutral: Codex, Cursor and others read here
.claude/skills/<name>        a symlink → ../../.agents/skills/<name>. Claude Code discovers skills here
skills-lock.json             source repo, path and content hash of every installed skill
```

One copy, two consumers. A `cp -r` into `.claude/skills` works on the day and drifts by the month —
then Claude Code and every other agent follow different instructions and nobody notices.
`verify-conventions.mjs` flags a copy even while it is still identical.

## Installing

```bash
npx skills add <owner>/<repo> --skill <name> -a claude-code codex cursor
npx skills add <owner>/<repo> --list                # see what a repository offers
npx skills find <query>                             # search skills.sh
```

Name more than one agent. With several, the CLI writes the canonical copy to `.agents/skills/<name>`
and symlinks `.claude/skills/<name>` to it — exactly this layout (Codex and Cursor read
`.agents/skills` directly). With `-a claude-code` alone it writes a Claude-only copy straight into
`.claude/skills/`, which other agents can't see; the verifier flags that. If a skill arrived some
other way, make the link by hand: `ln -s ../../.agents/skills/<name> .claude/skills/<name>`.

`npx skills add` vendors the files and writes `skills-lock.json`:

```json
{
  "version": 1,
  "skills": {
    "better-ui": {
      "source": "jakubkrehel/skills",
      "sourceType": "github",
      "skillPath": "skills/better-ui/SKILL.md",
      "computedHash": "d05cf568…"
    }
  }
}
```

`computedHash` is SHA-256 over every file in the skill, sorted by path — path and content both.
The verifier recomputes it the same way, so a mismatch means the vendored copy was edited or
updated without the lock.

## Updating and restoring

```bash
npx skills update                   # update, rewriting the lock
npx skills experimental_install     # restore every skill in skills-lock.json (fresh clone, CI)
```

Update deliberately and read the diff: a skill is instructions your agents will follow.

## Skills authored in the repository

A skill that only makes sense here (a deploy runbook, a data migration recipe) lives in
`.agents/skills/<name>/` with the same symlink, and is not in the lock — the verifier notes it as
repository-authored when its SKILL.md carries `metadata.author`.

## Naming them

Each skill gets a line in CLAUDE.md (and AGENTS.md, for other agents) saying **when** to run it:

> Run `/better-ui` on any new or changed component and clear every HIGH and MEDIUM finding.
> Use `/emil-design-eng` to decide whether something should animate; `/animate` to build it.

If a skill's defaults conflict with the project (it assumes a token the project deliberately
doesn't define), say so beside it — the skill won't know.
