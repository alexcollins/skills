# Vocabulary

Use these words exactly. "Component", "service", "API" and "boundary" each mean three things to
three readers; these mean one.

| Term | Meaning |
|---|---|
| **Module** | Anything with an interface and an implementation, at any scale: a function, a class, a package, a slice through several tiers. |
| **Interface** | Everything a caller has to know to use it correctly: the types, and also the invariants, ordering, errors, config and performance. Not just the signature. |
| **Implementation** | What's inside. |
| **Depth** | How much behaviour a caller gets per unit of interface they learn. **Deep**: a little to learn, a lot behind it. **Shallow**: the interface is nearly as complex as the implementation. |
| **Seam** | The place where behaviour can be changed without editing that place — where an interface lives. Where to put it is a decision of its own. |
| **Adapter** | Whatever fills a seam: the Postgres repository, the in-memory fake. A role, not a size. |
| **Leverage** | What callers get from depth: more capability per thing learned. |
| **Locality** | What maintainers get from depth: change, bugs and knowledge concentrated in one place. |

## Principles

- **Depth belongs to the interface.** A deep module can be built from small parts inside; they just
  aren't part of what callers see. A module can have internal seams for its own tests as well as the
  external one.
- **The deletion test.** Delete it in your head. Complexity vanishes → it was a pass-through.
  Complexity reappears in every caller → it was earning its place.
- **The interface is the test surface.** Tests cross the same seam callers do. Wanting to test past
  it means the module is the wrong shape.
- **One adapter is a hypothetical seam; two make it real.** Don't add a seam until something
  actually varies across it — usually production plus a test fake.

When shaping an interface, ask: can there be fewer entry points, simpler parameters, more hidden
inside? And for testability: take dependencies as arguments rather than constructing them, and
return results rather than mutating what was passed in.
