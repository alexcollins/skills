# GLOSSARY.md

The project's own words, so people and agents say one thing one way. Terms only: what each thing
*is* in this domain. Implementation lives in the code; decisions live in PLAN.md.

```md
# <Context name>

<One or two sentences: what this context is and why it exists.>

## Language

**Order**
A customer's request for one or more products, placed in one checkout.
_Avoid_: purchase, transaction

**Invoice**
A request for payment sent after delivery.
_Avoid_: bill
```

## Rules

- **Pick one word.** When several words mean the same thing, choose the best and list the rest
  under `_Avoid_`.
- **One or two sentences.** Say what it is, not what it does.
- **Domain terms only.** Words every programmer already knows (timeout, retry, cache) stay out,
  however often the code uses them.
- **Group under subheadings** once clusters appear; a flat list is fine until then.

## More than one context

When the repository holds genuinely separate domains, put a `GLOSSARY.md` in each and a
`GLOSSARY-MAP.md` at the root:

```md
# Glossary map

- [Ordering](./src/ordering/GLOSSARY.md) — takes and tracks orders
- [Billing](./src/billing/GLOSSARY.md) — invoices and payments

## How they relate

- **Ordering → Billing**: Billing invoices an Order once it ships.
```

Work out which context a conversation is in; ask when it isn't clear.
