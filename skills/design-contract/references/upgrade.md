# Upgrading from design-contract 1.x

2.0 keeps the parser, the mapping and the gate, and changes what comes out:

| 1.x | 2.0 |
|---|---|
| Frontmatter: mapped roles only | Every token the code declares with `"all": true`, plus motion |
| `mode` / `modes`: other themes as `-dark` suffixed colours, or prose only | `themes`: the default theme whole, other themes as groups of what they change |
| `design/tokens.json` in the generator's own shape (`modes`, `theme`, `literals`) | W3C DTCG 2025.10; the generator's data under `$extensions["design-contract"]` |
| `extend` module for a curated tokens.json shape | Removed — read the DTCG groups |
| `design/components.md`, `layout.md`, `motion.md` | Folded into DESIGN.md's own sections |
| No visualisation | `design/preview.html` |

## Steps

1. Copy the new `scripts/design-tokens.mjs` over the project's copy.
2. Edit `design/tokens.config.json`:
   - replace `mode` / `modes` with `themes`, default first: `{ ":root": "light", ".dark": "dark" }`;
   - add `"all": true`;
   - add `motion` tokens by purpose (`state-change`, `surface-enter`) from the curves and durations
     the stylesheet defines;
   - add `"preview": { "file": "design/preview.html" }`, with `fonts` aliases if a family's CSS name
     differs from its Google Fonts name;
   - remove `extend` (the generator refuses to run with it, and says so).
3. **Find what read the old tokens.json** before regenerating: `grep -rn "tokens.json"` across the
   source. A `/design-system` page or a sync script reading `color.primitive` or `modes[":root"]` will
   read `undefined` after the switch. Port each read to the DTCG paths (`color.surface.$value.hex`,
   `color.dark.surface`, `typography["body-md"].$value`, `easing.out.$value`), or to the frontmatter.
4. Move the three `design/*.md` documents into DESIGN.md: components into **Components** with
   `@path` references, layout into **Layout**, motion into **Motion**. Keep every rule (contract
   rule 5); delete the files once each rule has a home, and fix links to them in AGENTS.md,
   CLAUDE.md and the docs.
5. Add a **Voice & Content Strategy** section if the product has interface copy.
6. `npm run tokens`, read the diff, open the preview, `npm run tokens:check`,
   `npx @google/design.md lint DESIGN.md`, then the project's build.
