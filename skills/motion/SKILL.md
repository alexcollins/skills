---
name: motion
description: >-
  Decide whether something should animate, then build it so it feels right: frequency gate,
  purpose, cheapest tool, transform and opacity only, curve and duration or spring, interruption,
  exit, reduced motion — using the project's own motion tokens. Writes the code. Use when asked to
  animate something, add a transition or micro-interaction, make UI feel alive, or review or fix
  motion that feels slow, janky or off.
license: MIT
metadata:
  author: alexcollins
  version: "1.0.1"
  adapted-from: emilkowalski/skills — emil-design-eng, animate; jakubkrehel/skills — better-ui (MIT)
---

# Motion

Two ways to get motion wrong, and the first is worse: animating something that shouldn't move, and
animating the right thing with the wrong ingredients. Sometimes the right output is zero lines of
code. Make the call, give the reason in one line, write it — never a menu of options.

## Tokens first

Read the project's motion tokens before writing a curve or a duration — `DESIGN.md` (its
`motion` frontmatter and Motion section), the CSS custom properties, the Tailwind config. Use what exists, and map
anything missing onto the nearest token that does.

**Never reference a variable the project doesn't define.** `var(--ease-drawer)` where no
`--ease-drawer` exists doesn't fall back; it voids the whole declaration, silently. Only when the
project has no motion tokens at all, use the defaults below — and offer to add them as tokens
rather than pasting raw values in components.

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);       /* entering, exiting, most UI */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);   /* moving or morphing on screen */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);    /* drawers and sheets */
```

## The sequence

Run it in order. Steps 1 and 2 decide whether there is anything to build.

**1. How often is it seen?**

| Frequency | Decision |
|---|---|
| Hundreds of times a day — keyboard shortcuts, command palette | No animation. Stop. |
| Tens of times a day — hovers, list navigation | Instant, or ≤150ms on opacity and colour |
| Occasionally — modals, drawers, toasts | Standard motion |
| Rarely — first run, success, celebration | Where delight is allowed |

Anything started from the keyboard doesn't animate. Raycast opens instantly because it's opened all
day.

**2. What is it for?** Name one: *feedback*, *spatial consistency* (where it came from, where it
went), *state change*, *bridging a jump*, *explanation* (marketing and onboarding only), *delight*
(rare tier only). Can't name one, don't build it. Data the user is reading or acting on doesn't
move for style.

**3. Cheapest tool that works.**

| Need | Tool |
|---|---|
| Hover, press, a toggled class or attribute | CSS transition |
| Entry on mount, no JS state | `@starting-style` |
| Predetermined motion that must stay smooth while the page is busy | CSS animation |
| Programmatic control, no library | WAAPI, `element.animate()` |
| Springs, exits, layout animation, gestures | Motion (`motion` / `framer-motion`, whichever is installed) |

Never add a library for a fade. When the request is really a component — toast, drawer, menu,
combobox — use a headless primitive rather than hand-rolling one.

**4. Properties.** `transform` and `opacity`; `clip-path` and `filter: blur()` when needed; `height`
only for accordions. Never `scale(0)` — start at `0.95` with `opacity: 0`, because nothing real
appears from nothing. Popovers, menus and tooltips scale from their trigger
(`transform-origin: var(--transform-origin)`); modals stay centred. Prefer `translateY(100%)` (its
own height) to pixel values. More in [references/performance.md](references/performance.md).

**5. Curve and duration, or a spring.**

| Situation | Curve |
|---|---|
| Entering or exiting | `--ease-out` |
| Moving or morphing on screen | `--ease-in-out` |
| Hover, colour | `ease` |
| Constant (marquee, progress) | `linear` |

Never `ease-in` on interface motion: it holds back the first frames, exactly when the user is
looking.

| Element | Duration |
|---|---|
| Press feedback | 150ms |
| Tooltip | 125ms |
| Dropdown, popover | 200ms |
| Modal | 250ms |
| Toast | 400ms, `ease` |
| Drawer, sheet | 500ms, `--ease-drawer` |

Interface motion stays under 300ms; toasts and drawers run longer only because their curve does
the moving up front. Use a spring for drag, gestures that can reverse mid-way, and things that
should feel alive: `{ type: "spring", duration: 0.5, bounce: 0.2 }`, with bounce `0` for anything
that isn't a gesture or a moment of play.

**6. Interruption and exit.** Anything that can fire twice in a second uses transitions, not
keyframes — transitions retarget, keyframes restart. Things leave the way they came. Exits are
quieter than entrances: shorter, and a small fixed offset (`8px`) rather than the full height.
Slow where the user is deciding (hold to confirm: 2s linear), fast where the system answers
(release: 200ms).

**7. Reduced motion and touch ship with it.** Under `prefers-reduced-motion: reduce`, drop movement
and keep the opacity and colour changes that explain what happened — fewer, gentler animations, not
none. Gate hover motion behind `@media (hover: hover) and (pointer: fine)`.

Ready-made versions of the common cases — press, popover, tooltip, modal, drawer, toast, accordion,
stagger, icon swap, hold to confirm, tabs, scroll reveal, drag to dismiss, theme switch — are in
[references/recipes.md](references/recipes.md). Start from the recipe when one fits.

## Never ship

| Never | Instead |
|---|---|
| `transition: all` | Name the properties |
| `scale(0)` entrance | `scale(0.95)` + `opacity: 0` |
| `ease-in` on UI, or the browser's weak built-in `ease-out` | The project's curve, or `--ease-out` |
| An undefined `var(--token)` | The nearest token the project defines |
| Motion on a keyboard shortcut | Instant |
| UI motion over 300ms without a reason | 150–250ms |
| Popover scaling from its centre | `var(--transform-origin)` |
| Keyframes on something re-triggered quickly | A transition |
| Animating `width`, `height`, `top`, `left`, `margin`, `padding` | `transform`, `opacity` |
| Ungated hover motion | The `hover: hover` media query |
| No reduced-motion handling | A gentler version |
| Motion as the only sign of a state change | A static cue as well |

## Output

The code is the deliverable. After it, at most a few lines: the gate (frequency and purpose — or
why it shouldn't animate), the ingredients (tool, properties, curve, duration or spring), and what
needs a feel check that code can't settle — play it at 10% speed or step it frame by frame, test
gestures on a real device, and look again the next day.
