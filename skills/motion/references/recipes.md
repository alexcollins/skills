# Recipes

Start here, then adapt. Curves are the project's tokens, or the defaults in SKILL.md when it has
none — check that every `var()` you paste exists in the project.

## Press

```css
.button { transition: scale 150ms var(--ease-out); }
.button:active { scale: 0.96; }
```

```tsx
// Tailwind, with an opt-out
const press = "active:not-disabled:scale-[0.96]";
<button className={cn("transition-[scale] duration-150 ease-out", !isStatic && press)} />

// Motion
<motion.button whileTap={{ scale: 0.96 }} />
```

`scale` carries the label and icon with it, which is what makes it read as a physical press.

## Popover, dropdown, menu

```css
.popover {
  transform-origin: var(--transform-origin); /* supplied by Base UI / Radix */
  transition: opacity 200ms var(--ease-out), scale 200ms var(--ease-out);
}
.popover[data-starting-style],
.popover[data-ending-style] { opacity: 0; scale: 0.95; }
```

## Tooltip

```css
.tooltip {
  transform-origin: var(--transform-origin);
  transition: opacity 125ms var(--ease-out), scale 125ms var(--ease-out);
}
.tooltip[data-starting-style],
.tooltip[data-ending-style] { opacity: 0; scale: 0.97; }
.tooltip[data-instant] { transition-duration: 0ms; } /* neighbours open instantly once one is open */
```

## Modal

```css
.modal {
  transform-origin: center; /* not anchored to a trigger */
  transition: opacity 250ms var(--ease-out), scale 250ms var(--ease-out);
}
.modal[data-starting-style],
.modal[data-ending-style] { opacity: 0; scale: 0.96; }
.backdrop { transition: opacity 250ms var(--ease-out); }
```

## Drawer, sheet

```css
.drawer { transition: transform 500ms var(--ease-drawer); }
.drawer[data-closed] { transform: translateY(100%); }
```

Add dragging and it becomes **Drag to dismiss**, below.

## Toast

```css
.toast {
  transition: opacity 400ms ease, transform 400ms ease;
  @starting-style { opacity: 0; transform: translateY(100%); }
}
```

Without `@starting-style`, set a `data-mounted` flag after the first render. When toasts stack, the
opacity has to work against the height change; tune it by eye, and check again the next day.

## Accordion

```css
.content { overflow: hidden; transition: height 200ms var(--ease-out), opacity 200ms var(--ease-out); }
```

Measure the height (or let a headless primitive supply it) rather than animating to `auto`. Keep it
short — it costs layout every frame.

## Staggered entrance

Rare, staged moments only — a hero on first load, a success or empty state. Never on routine
interactions.

```css
.item {
  opacity: 0;
  transform: translateY(8px);
  animation: enter 300ms var(--ease-out) forwards;
}
.item:nth-child(2) { animation-delay: 50ms; }
.item:nth-child(3) { animation-delay: 100ms; }
@keyframes enter { to { opacity: 1; transform: none; } }
```

```tsx
// Semantic groups (title, text, actions): ~100ms apart, with a little blur
<motion.div initial="hidden" animate="visible"
  variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
  <motion.h1 variants={{
    hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)" },
  }} />
</motion.div>
```

List items 30–80ms apart, semantic groups ~100ms. A stagger never blocks interaction.

## Exit

```tsx
<motion.div exit={{ opacity: 0, y: -8, filter: "blur(4px)", transition: { duration: 0.15 } }} />
```

Slide fully out only when the destination matters (a card returning to a list). Remove instantly
when motion adds nothing, the action repeats often, or reduced motion is on.

## Icon swap

Play → pause, copy → copied. Exactly: scale `0.25 → 1`, opacity `0 → 1`, blur `4px → 0`.

```tsx
// With Motion — import from whichever package is installed
<AnimatePresence initial={false} mode="popLayout">
  <motion.span
    key={state}
    initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
    exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
    transition={{ type: "spring", duration: 0.3, bounce: 0 }}
  >
    <Icon />
  </motion.span>
</AnimatePresence>
```

```tsx
// Without a library: both icons stay mounted, one absolutely on top, and cross-fade
const swap = "transition-[opacity,filter,scale] duration-300 ease-out";
<span className="relative">
  <span className={cn("absolute inset-0 grid place-items-center", swap,
    on ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-[0.25] blur-[4px]")}><OnIcon /></span>
  <span className={cn(swap,
    on ? "opacity-0 scale-[0.25] blur-[4px]" : "opacity-100 scale-100 blur-0")}><OffIcon /></span>
</span>
```

`initial={false}` keeps the swap from playing on page load. Don't use it where the first render is
supposed to animate in.

## Hold to confirm

```css
.overlay { clip-path: inset(0 100% 0 0); transition: clip-path 200ms var(--ease-out); }
.button:active .overlay { clip-path: inset(0); transition: clip-path 2s linear; }
.button:active { scale: 0.96; }
```

Linear on the fill: it's a progress bar, and progress doesn't ease.

## Tabs with a clean colour change

Duplicate the tab list, style the copy as active, and clip it so only the active tab shows. Animate
the clip on change — text and background move together because they're one element being revealed.

```css
.tabs-active { clip-path: inset(0 60% 0 20%); transition: clip-path 250ms var(--ease-in-out); }
```

## Scroll reveal

Marketing pages only, and once.

```css
.reveal { clip-path: inset(0 0 100% 0); transition: clip-path 600ms var(--ease-in-out); }
.reveal[data-visible] { clip-path: inset(0); }
```

Trigger with `IntersectionObserver`, or `useInView(ref, { once: true, margin: "-100px" })`.

## Drag to dismiss

```js
const velocity = Math.abs(distance) / (Date.now() - dragStart);
if (Math.abs(distance) >= THRESHOLD || velocity > 0.11) dismiss(); // a flick is enough
element.style.transform = `translateY(${distance}px)`; // on the element, not via a parent variable
```

- Capture the pointer once the drag starts, so it continues outside the element.
- Ignore extra touch points mid-drag, or switching fingers makes it jump.
- Past a boundary, move less the further they pull — friction, not a wall.
- Settle with a spring so a reversed drag keeps its velocity.

## Theme switch

A theme flip changes colour on nearly every element; every transition fires at once and the switch
smears. Suppress transitions for one frame:

```ts
const style = document.createElement("style");
style.textContent = "*,*::before,*::after{transition:none!important}";
document.head.append(style);
// …flip the theme…
void document.body.offsetHeight; // commit the new colours while transitions are off
requestAnimationFrame(() => requestAnimationFrame(() => style.remove()));
```

`next-themes` does this with `disableTransitionOnChange`.

## A crossfade that won't settle

When two states visibly overlap and no curve fixes it, blur the seam briefly: `filter: blur(2px)`
and `opacity: 0.7` during the change. Keep blur under 20px; it's expensive, in Safari especially.
