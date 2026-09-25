# Components

The inventory, lowest layer first. Before building anything, find it here. Every entry ends with
what it is **not** for.

<!-- One section per layer that exists. Delete the ones that don't. -->

## Primitives — `<components/ui/>`

### <Name> — `<path>`

<One line: what it is and its scope. "The only button on the site.">

| Variant | Appearance | Use |
|---|---|---|
| `<variant>` | <what it looks like> | <when> |

**States** — <hover> · <press> · <focus> · <disabled> · <loading>

**Props beyond the variants** — <anything an agent would otherwise re-implement>

**Don't** <the misuse you'd expect>; use <the alternative> instead.

## Pattern layer — `<components/site/>`

### <Name> — `<path>`

<…>

**Don't** <…>.

## Form controls

## CSS utilities — `<stylesheet>`

<!-- Bespoke classes are components too: .section, .hairline-grid, .type-* … -->

| Class | What it does | Don't |
|---|---|---|
| `<.class>` | <…> | <…> |

## Icons

<!-- The one icon library, the stroke weight, sizes by context. -->

## Duplicates and legacy

<!-- Every pair that overlaps, and which one is canonical. The legacy side also goes in
     DESIGN.md → Known inconsistencies. -->

| Canonical | Legacy / duplicate | Note |
|---|---|---|
