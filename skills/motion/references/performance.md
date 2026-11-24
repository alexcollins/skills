# Performance

## What to animate

`transform` and `opacity` skip layout and paint and run on the compositor. `filter` does too.
`width`, `height`, `top`, `left`, `margin` and `padding` re-run layout every frame. `clip-path` is
cheap enough to animate but only composited in newer Chromium.

## Name the properties

`transition: all` watches every property and animates ones you never meant to — a colour flash, a
padding jump. Name them: `transition-property: scale, opacity`. In Tailwind, `transition-transform`
covers `transform, translate, scale, rotate`; for anything mixed use
`transition-[scale,opacity,filter]`.

## CSS beats JavaScript under load

CSS animations and transitions run off the main thread. `requestAnimationFrame`-driven animation —
including Motion's — drops frames while the page loads, runs scripts or paints. CSS for
predetermined motion, JavaScript for dynamic and interruptible motion. WAAPI gives JavaScript
control at CSS cost:

```js
el.animate(
  [{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0)" }],
  { duration: 600, fill: "forwards", easing: "cubic-bezier(0.77, 0, 0.175, 1)" },
);
```

## Motion: the full transform string

Motion's `x`, `y` and `scale` shorthands run on the main thread. Under load, pass the transform:

```jsx
<motion.div animate={{ x: 100 }} />                         // drops frames under load
<motion.div animate={{ transform: "translateX(100px)" }} /> // composited
```

## Don't animate through a parent's variable

Custom properties inherit, so changing `--offset` on a container recalculates styles for every
child. During a drag, set `transform` on the element itself.

## `will-change`, sparingly

Only for `transform`, `opacity` and `filter`, and only once you see a stutter on the first frame
(Safari benefits most). Never `will-change: all`, and never on every animated element — each layer
costs memory.
