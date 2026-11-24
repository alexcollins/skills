# Deepening a module

## Classify each dependency

The category decides how the deepened module is tested at its seam.

1. **In-process** — pure computation, in-memory state, no I/O. Merge the modules and test through
   the new interface. No adapter needed.
2. **Local stand-in exists** — PGlite for Postgres, an in-memory filesystem. Run the stand-in in
   the test suite. The seam stays internal; nothing new appears in the interface.
3. **Remote, but yours** — your own services across the network. Put a port at the seam: the module
   owns the logic, the transport is injected. Tests use an in-memory adapter, production an
   HTTP/queue one.
4. **Remote, not yours** — Stripe, an email provider. Inject it as a port; tests pass a fake.

## Replace the tests, don't stack them

Once tests exist at the deepened module's interface, the old unit tests on the shallow pieces are
dead weight — delete them. New tests assert outcomes through the interface, never internal state,
and survive internal refactors. A test that has to change when only the implementation changed is
testing past the interface.

## Design it more than once

Your first interface is rarely your best. When the shape is genuinely open:

1. **Frame it for the user**: the constraints any interface must meet, the dependencies and their
   categories, and a rough sketch that makes the constraints concrete — not a proposal. Show it and
   move straight on; they read while the designs are made.
2. **Design three or four in parallel** — subagents with fresh context where possible, each with its
   own technical brief (files, coupling, dependency categories, the vocabulary, the glossary terms)
   and a different constraint:
   - fewest entry points — one to three, maximum leverage each;
   - most flexible — many use cases, room to extend;
   - the common caller first — the default case is trivial;
   - ports and adapters for everything that crosses the seam (when it applies).

   Each returns: the interface (types, invariants, ordering, errors), a usage example, what it
   hides, its dependency strategy, and where its leverage is thin.
3. **Compare** them one by one, then on depth, locality and seam placement. Recommend one, or a
   hybrid if parts combine well. Have an opinion; a menu isn't an answer.
