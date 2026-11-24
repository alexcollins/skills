---
name: debug
description: >-
  Find and fix a hard bug or a performance regression with a disciplined loop: first a command that
  goes red on this exact bug, then shrink it, rank falsifiable hypotheses, probe one variable at a
  time, fix behind a regression test, clean up. Use when the user says debug or diagnose, or
  reports something broken, throwing, flaky, failing or slow.
license: MIT
metadata:
  author: alexcollins
  version: "1.0.0"
  adapted-from: mattpocock/skills — diagnosing-bugs (MIT)
---

# Debug

Reading code to build a theory before you can make the bug happen on demand is the failure this
skill exists to prevent. Get the loop first; the rest is mechanical.

**Redact as you go.** Commands, output and captured requests carry secrets. Write `<REDACTED>` in
their place, keep credentials in environment variables rather than in scripts, and quote only the
lines that carry the signal.

## 1. A loop that goes red

One command, already run at least once, that is:

- **Red on this bug** — it drives the real code path and checks the *user's* symptom, not "it
  didn't crash".
- **Deterministic** — same verdict every run.
- **Fast** — seconds.
- **Unattended** — you can run it without a person.

Ways to get one, roughly in order: a failing test at the seam that reaches the bug · a curl script
against the dev server · a CLI run diffed against known-good output · a headless browser script ·
a captured request or event log replayed in isolation · a throwaway harness around one call · a
loop of random inputs · `git bisect run` between a good and a bad state · the same input through
the old and new version, diffed. When a human has to click, drive them with
[scripts/hitl-loop.sh](scripts/hitl-loop.sh) so the loop stays structured.

Then make it tighter: faster setup, a sharper assertion, pinned time and seeds. A flaky bug won't
give a clean repro — raise the rate instead (loop it, parallelise it, add load) until it fails
often enough to work against.

If no loop is possible, stop and say so: what you tried, and what would unblock it — access to an
environment that reproduces it, a captured artifact (HAR, logs, a recording with timestamps), or
permission for temporary production logging.

## 2. Reproduce, then shrink

Run it and check it fails the way the **user** described, not with a neighbouring bug. Then cut
inputs, callers, config and steps one at a time, re-running after each cut, until every part left
is needed for it to fail. The smaller the repro, the fewer suspects — and it becomes the
regression test.

## 3. Hypotheses

Write three to five, ranked, before testing any. Each makes a prediction: "If X is the cause,
changing Y makes it disappear." One you can't phrase that way is a hunch; sharpen it or drop it.
Show the list to the user — they often know which one was deployed yesterday — and carry on with
your ranking if they're away.

## 4. Probe

One variable per probe, each tied to a prediction. A debugger or REPL beats logs; targeted logs at
the boundaries that separate hypotheses beat logging everything. Tag every temporary log with one
prefix, like `[DEBUG-a4f2]`, so cleanup is one search.

For performance, measure before changing anything — a timing harness, a profile, a query plan —
then bisect against the number.

## 5. Fix behind a test

Turn the shrunken repro into a failing test at a seam where the real bug pattern happens, watch it
fail, fix, watch it pass, then re-run the original loop. If no seam can hold that test honestly,
that is a finding: say the architecture is keeping this bug from being locked down
(`architecture` is the follow-up).

## 6. Clean up

- [ ] The original loop no longer goes red.
- [ ] The regression test passes, or the missing seam is written down.
- [ ] No `[DEBUG-` left anywhere.
- [ ] Throwaway harnesses deleted.
- [ ] The cause that turned out true is in the commit message, so the next person learns it.
