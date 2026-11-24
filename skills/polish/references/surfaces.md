# Surfaces

Defaults for a project with nothing of its own. Where the project has tokens for radius, shadow or
outline, use those.

## Concentric radii

```
outer radius = inner radius + padding
```

```tsx
// Right: 16px outside, 8px padding, 8px inside
<div className="rounded-2xl p-2">
  <div className="rounded-lg">…</div>
</div>

// Off: the same radius twice
<div className="rounded-xl p-2">
  <div className="rounded-xl">…</div>
</div>
```

It matters most when the layers sit close. Where the padding is deliberately uneven or the layers
are independent, keep the component's own radius.

## Optical alignment

```css
/* Text + trailing icon: less padding on the icon side */
.button-with-icon { padding-inline: 16px 14px; }

/* Play triangle: its visual centre sits right of its box centre */
.play svg { translate: 2px 0; }
```

For stars, carets and other lopsided glyphs, fix the `viewBox` or path so no component needs a
nudge; `translate-x-px` on a wrapper is the fallback.

## Shadow instead of border

For cards, bordered buttons, popovers and anything over varied backgrounds:

```css
:root {
  --shadow-border:
    0 0 0 1px oklch(0 0 0 / 0.06),
    0 1px 2px -1px oklch(0 0 0 / 0.06),
    0 2px 4px 0 oklch(0 0 0 / 0.04);
  --shadow-border-hover:
    0 0 0 1px oklch(0 0 0 / 0.08),
    0 1px 2px -1px oklch(0 0 0 / 0.08),
    0 2px 4px 0 oklch(0 0 0 / 0.06);
}

/* Dark: depth shadows vanish on dark grounds — one light ring instead */
.dark {
  --shadow-border: 0 0 0 1px oklch(1 0 0 / 0.08);
  --shadow-border-hover: 0 0 0 1px oklch(1 0 0 / 0.13);
}

.card {
  box-shadow: var(--shadow-border);
  transition: box-shadow 150ms var(--ease-out, ease-out);
}
.card:hover { box-shadow: var(--shadow-border-hover); }
```

| Shadow | Border |
|---|---|
| Cards and containers with depth | Dividers between rows |
| Bordered buttons | Table cells |
| Dropdowns, popovers, modals | Form inputs |
| Anything over images or mixed grounds | Hairlines in dense UI |

## Image outlines

```css
img { outline: 1px solid oklch(0 0 0 / 0.1); outline-offset: -1px; }
.dark img { outline-color: oklch(1 0 0 / 0.1); }
```

```tsx
<img className="outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10" />
```

Pure black and pure white only — never `slate`, `zinc`, `neutral` or the brand colour. An outline
never changes layout, and the negative offset keeps it hugging the corner radius.
