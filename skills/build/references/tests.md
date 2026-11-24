# Tests worth keeping

A good test reads like a line of the spec — "a customer can check out a valid cart" — and still
passes after the code behind it is rewritten, because it only cares what the code does.

## Through the interface

```ts
// Keep: observable behaviour, public interface
test("a valid cart checks out", async () => {
  const cart = createCart();
  cart.add(product);
  expect((await checkout(cart, card)).status).toBe("confirmed");
});

// Rewrite: asserts how, not what — breaks on a refactor that changes no behaviour
test("checkout calls paymentService.process", async () => {
  const pay = jest.mock(paymentService);
  await checkout(cart, card);
  expect(pay.process).toHaveBeenCalledWith(cart.total);
});
```

The same goes for checking through a side door. Read a created user back with `getUser`, not with
a SQL query against the table.

Signs a test is coupled to the implementation: it mocks the project's own modules, calls private
functions, counts calls or their order, or its name says *how* instead of *what*.

## Independent expected values

```ts
// Rewrite: recomputes the answer the way the code does, so it can never disagree
expect(total(items)).toBe(items.reduce((s, i) => s + i.price, 0));

// Keep: a known answer
expect(total([{ price: 10 }, { price: 5 }])).toBe(15);
```

## Mocks at the edge only

Mock what the project doesn't own: external APIs, email, payments, time, randomness — and the
database or filesystem only when a local stand-in (a test database, an in-memory filesystem)
isn't available. Never mock the project's own modules.

Make the edge easy to replace:

- **Pass dependencies in** rather than constructing them inside: `charge(order, paymentClient)`,
  not `new StripeClient()` in the function body.
- **One function per external operation** (`getUser`, `createOrder`) rather than one generic
  `fetch(endpoint, options)`, so each mock returns one shape and needs no branching.
