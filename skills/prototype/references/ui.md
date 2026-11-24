# UI prototype

Several **structurally different** versions of a screen on one route. The user flips between them
in the browser, picks one or takes parts from each, and the rest go.

## Where it lives

**On the real page, by default.** Variants judged inside the real app — its header, its sidebar,
its data, its density — expose problems an empty route hides. Render them on the existing route,
gated by `?variant=`, keeping its data loading, params and auth. Something new that would naturally
sit inside an existing page (a section, a card, a step) mounts there too.

**A new route only when nothing could host it**: a new top-level surface, or a flow that fits
nowhere. Follow the project's routing convention and put `prototype` in the path.

## Steps

1. **State the question and the count.** Three variants by default, five at most — past that they
   stop being different. One line at the top of the file: "Three variants of the settings page on
   `/settings`, switchable with `?variant=`."
2. **Make them disagree.** Different layout, different hierarchy, a different primary action — not
   different colours. If two come out alike, redo one with an explicit constraint ("no card grid").
   Each uses the project's components and tokens and exports a named component (`VariantA`…).
   Share small pieces if useful; never share the layout, since the layout is what's being judged.
3. **Switch between them.**

   ```tsx
   const variant = searchParams.get("variant") ?? "A";
   return (
     <>
       {variant === "A" && <VariantA {...data} />}
       {variant === "B" && <VariantB {...data} />}
       {variant === "C" && <VariantC {...data} />}
       <PrototypeSwitcher variants={["A", "B", "C"]} current={variant} />
     </>
   );
   ```

4. **The switcher bar.** Fixed, bottom centre, clearly not part of the design: a previous arrow,
   the current key and name ("B · Sidebar"), a next arrow, wrapping round. Arrows update the URL
   through the router, so a variant can be shared and survives a reload. `←` and `→` also cycle,
   except while focus is in an input, textarea or contenteditable. It renders only outside
   production builds. One shared component, wherever shared UI lives.
5. **Hand over the URL** and the variant keys. The useful feedback is usually "B's header with C's
   sidebar" — that's the real design.
6. **Fold in the winner.** Rewrite it properly into the page (or promote it to a real route), drop
   the losers and the switcher from main, and keep the full set on the `prototype/<name>` branch.

Variants read, never write: point anything that mutates at a stub. The question is how it looks,
not whether the backend works.
