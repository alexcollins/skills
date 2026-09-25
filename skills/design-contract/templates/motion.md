# Motion

## The curves

<!-- State the count. "Two curves for the whole site, and only two." -->

| Name | Value | Use |
|---|---|---|
| `<--ease-out>` | `<cubic-bezier(…)>` | <entrances, feedback> |
| `<--ease-in-out>` | `<cubic-bezier(…)>` | <things that move on screen> |

<!-- If code references an easing or duration variable that is not defined, say so here in bold:
     an undefined var() voids the whole declaration, silently. -->

## Durations

| Interaction | Ceiling | Typical |
|---|---|---|
| Hover / press feedback | <150ms> | <…> |
| Panels, drawers | <…> | <…> |
| Page entrance | <…> | <…> |
| Ambient loops | — | <…> |

## Naming transition properties

Never `transition-all`. Name the properties — <the idiom this codebase uses>.

## The entrance

<!-- The one page-load choreography, if any, and the rule that there is only one. -->

## Hover and press

<!-- Feedback rules; press scale if there is one; which elements never take it. -->

## Reduced motion

<!-- How prefers-reduced-motion is honoured, and the rule that a new loop joins that block in the
     same commit. -->

## When not to animate

- <High-frequency actions, keyboard-driven changes, lists that re-sort, …>

## Known deviations

| What | Where | Why it stands |
|---|---|---|
