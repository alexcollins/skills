# docs/&lt;feature&gt;/

Code says what the system does. It can't say what it deliberately doesn't do, why a simpler option
was rejected, or which dashboard someone has to click through before it works. That lives here,
one folder per feature or integration that has any of: phases, a third-party service, a contract
with another system, or a decision someone will question later.

## PLAN.md — the decision record

The single most valuable line in it is **"Not built, on purpose:"** with the reason. It stops the
same rejected idea being re-proposed every few weeks — by a person or by an agent reading the code
and seeing the gap.

Structure (from [../templates/PLAN.md](../templates/PLAN.md)):

1. **Status line** at the top — what is built, what is next. One line. The verifier looks for it.
2. **What it is**, in one paragraph.
3. **Decisions** — a table: decision · choice · why. Each "why" names the alternative rejected.
4. **Phases** — each marked **Built.** or not; each bullet what and why; each phase ending with
   "Not built, on purpose:".
5. **Open questions** — each with the current default, so work isn't blocked on them.

Update PLAN.md **in the change that makes it true**, not afterwards — a plan that describes last
month's system misleads worse than no plan.

## SETUP.md — what a human has to do

The steps no agent can take: OAuth clients, dashboard toggles, DNS, secret values, billing. In
order, numbered, each with the exact place to click and the exact name to use.

- **Names, never values.** "Add a secret named `WEBHOOK_SECRET` under your host's environment
  variables, for Production" — never the secret itself, not even an example that looks real.
- Say what breaks without each step, so someone can tell which one they missed.
- End with a **Check** section: how to confirm each step took.

## Contract docs

When the feature talks to another system — a webhook, an ingest endpoint, an automation workflow — a
`<NAME>.md` beside PLAN.md with the payload shape, auth, idempotency, retries and failure modes.
It's what someone on the other side of the contract reads.
