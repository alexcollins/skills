# Icons

## Stroke follows the text

| Text beside it | Stroke (24px grid) |
|---|---|
| Regular (400), 14–16px | `1.5px` |
| Medium, semibold (500–600) | `2px` |
| Bold (700), or a standalone emphasised icon | `2.5px` |

A hairline icon next to bold text looks broken; a heavy one next to regular text shouts. Where the
library has no stroke variants, keep its native stroke and use size or colour for emphasis. Never
mix libraries with different stroke conventions on one surface.

## One asset, every state

```html
<svg fill="none" stroke="currentColor" stroke-width="2">…</svg>
```

```html
<button class="text-muted hover:text-fg aria-pressed:text-fg disabled:opacity-40">…</button>
```

Hard-coded fills (`fill="#666"`) break this — strip them to `currentColor` on import. Outline is the
default state, fill the active one (the current tab, a saved bookmark), never interchangeable.

## Render size

Check every icon at the smallest size it ships at, usually `16px`. Use the set's native grid sizes
(16, 20, 24) rather than fractional scales, prefer a simpler glyph for small contexts, and always
SVG.

## RTL

| Flip | Leave |
|---|---|
| Back/forward arrows, navigation chevrons | Logos |
| Text alignment, list and indent glyphs | Checkmarks |
| Send, reply, volume waves | Clocks, cups, pencils |
| | Media playback (play, rewind) |

```css
[dir="rtl"] .icon-directional { scale: -1 1; }
```

Look at composite icons part by part: a badge may stay put while the glyph under it flips.

## Swapping icons

When an icon changes with state (play → pause, copy → copied), cross-fade it — the recipe with
and without a motion library is in the `motion` skill's recipes, under **Icon swap**.
