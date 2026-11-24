# Writing for agents

How to write anything an agent reads: a skill, AGENTS.md, CLAUDE.md, a doc behind a pointer. The
goal isn't the same output every run; it's the same *process* every run.

## Pointers

A **pointer** is a line in context that names material outside it and says when to reach for it —
a skill's description, a line in AGENTS.md naming a doc. The wording decides whether the agent
reaches the material, not the material itself. If something important gets missed, sharpen the
pointer before inlining the target.

- Lead with the word that triggers it.
- One trigger per distinct case; synonyms for the same case are one case written twice.
- Every word of an always-loaded pointer costs context on every turn. Prune it harder than the body.

## Two budgets

- **Context** — what sits in the window every turn: AGENTS.md, CLAUDE.md, skill descriptions.
- **Attention** — what the human has to remember exists. Spend it where their judgement matters;
  user-invoked skills cost it, model-invoked ones don't.

## Steps, reference, and the ladder

A document holds **steps** (what to do, in order) and **reference** (rules, facts, definitions to
consult). Place each on a ladder:

1. Steps, in the file.
2. Reference, in the file.
3. Reference in a separate file, behind a pointer, loaded only when it fires.

Push down what only some paths need; keep in the file what every path needs. Keep a concept's
definition, rules and caveats together under one heading. A document that's too long — even if
every line is true — thins attention across all of it; disclose reference and split by case.

## Done means checkable

End every step on a condition the agent can check — "every modified model accounted for", "one
command that goes red on this bug" — not "once it's understood". A vague end invites stopping early,
pulled by the steps still ahead. Sharpen the condition first; only when it can't be sharpened, hide
the later steps behind a real context boundary (a subagent, a handoff).

## Words that carry weight

A **leading word** is a concept the model already knows that stands in for a paragraph: *tracer
bullet*, *red*, *frontier*, *tight*. Repeat the word, never the explanation. Reach for an existing
word before coining one; a coined word has to be defined, a known one comes free.

Say what to do, not what to avoid — a prohibition puts the forbidden thing in context. Keep a
"never" only as a hard guardrail, with its reason and the positive alternative beside it.

## Pruning

- **One source of truth.** Each meaning in one place; the rest point at it.
- **Don't cache the environment.** Scripts, configs and `--help` are already the truth. Write down
  what can't be looked up: the unwritten convention, the reason behind a choice, the gotcha.
- **Delete no-ops.** A sentence the agent would obey anyway changes nothing and costs tokens. Delete
  the sentence, don't trim it. A word too weak to change behaviour ("be thorough") needs a stronger
  word ("relentless"), not more words.
- **Watch for sediment.** Adding feels safe and removing feels risky, so stale layers pile up. A
  shorter document is easier to keep true.
