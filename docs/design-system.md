# Travel Calendar design system

Source of truth for **product principles & primitives**.  
**Trip workspace UI:** see [`together-story-spec.md`](./together-story-spec.md) (Together Story — locked for build).

Landing may diverge intentionally.

## Principles

1. **Useful first** — shared plans are the primary loop (see → add → invite).
2. **Story over suite** — chronological trip story + capture dock; Notes/Packing peek; no peer tab war.
3. **Color means kind** — spectrum hues for Flight/Stay/Place/Note/Ask/Invite/Live; ocean teal (`--brand`) is wordmark stitch only.
4. **Share / invite is primary** — Invite uses `--together` (the pack’s invite token), not buried in Menu.
5. **Primitives before one-offs** — use `@/components/ui/*` and `@/components/ds/*`; avoid raw buttons without focus rings.
6. **Accessible by default** — labeled controls, keyboard operable, live regions for status/errors.

## Tokens

| Token | Role |
|-------|------|
| `--background` | Foam in light (cool paper) / deep editor |
| `--foreground` | Ink |
| `--cover-chrome` | Cover and mast. Cover type is the light type on this token. |
| `--card` | Raised surface |
| `--primary` | Ink CTA / capture + |
| `--brand` | Ocean teal, wordmark stitch only |
| `--kind-flight` … `--kind-ask` | Kind spectrum (see Together Story spec) |
| `--together` / `--live` / `--partner` | Invite · presence · avatars |
| `--muted-foreground` | Secondary text |
| `--border` | Hairlines |
| `--radius` | 0.5rem base (cards ~14px) |

**Foam** is the paper / near-white surface. **Ink** is type and chrome (`--foreground`, `--primary`). Cover type stays the light type on `--cover-chrome`.

## Layout

One shell for every page. `PageShell` is the landmark. `PageInset` is the column. Trip List and Month both use `TripWorkspace`, so the cover and toolbar stay mounted and do not change size when the view changes.

Tokens live on `:root` in `app/globals.css` and the breakpoints are the Tailwind theme.

| Token | Value | Use |
|-------|--------|-----|
| `--layout-bp-sm` | 40rem | Phone landscape / Tailwind `sm` |
| `--layout-bp-md` | 48rem | Tablet / `md` |
| `--layout-bp-lg` | 64rem | Laptop / `lg`. List becomes two columns here |
| `--layout-bp-xl` | 80rem | Desktop / `xl` |
| `--layout-bp-2xl` | 96rem | Wide desktop / `2xl` |
| `--layout-gutter` | `clamp(1rem, 0.4rem + 2vw, 3rem)` | 16px phone, about 32px at 1280, 48px from large desktops. Below 360px it is 0.25rem so a 7-day month still has 44px targets |
| `--layout-wide-max` | 100rem | Shared trip column: cover text, toolbar, list, month, composer |
| `--layout-content-max` | 48rem | Legal pages and other long pages |
| `--layout-measure` | 75ch | Body copy. Cards may be wider |
| `--layout-toolbar-min` | 3.25rem | List / Month toolbar |
| `--layout-composer-max` | same as wide | Add-to-trip dock |
| `--layout-space-2xs` … `--layout-space-xl` | 0.25rem to 3rem | Section spacing |

Below 360px (`22.5rem`) the gutter drops to `0.25rem`. Sixteen pixels on each side of a 320px screen leaves a 7-day grid under 44px per cell, and the month targets stay at 44px. Toolbar, cover, list, and composer still share that gutter.

Why one wide column: the old list stopped at 52rem, so a 1440px laptop had a ~650px story and empty sides, while month ran nearly edge to edge. A 100rem cap fills that laptop after the gutter, and on a 2560px screen the column stays 1600px so the calendar does not turn into a thin ribbon. From `lg` up, List puts What’s next and What’s missing in a rail beside the plan story. The rail sticks only while the viewport is taller than 700px.

The trip mast (cover + toolbar) is the same in List and Month, inside the scroller. Switching views crossfades the stage and returns that scroller to the top, so the cover and toolbar boxes do not move. On a viewport taller than 701px the toolbar sticks and the cover scrolls away. Shorter viewports, including high zoom, leave the mast in normal flow so it cannot eat the page. Focused controls use scroll-padding so they clear the toolbar. The composer stays at the bottom of the screen.

Temperature is a labeled control in the ⋯ menu: “Temperature: °F / °C”. It is not a floating chip in the story.

Brand is four theme packs. `data-theme` on `html` selects the pack. The trip field `themePack` stores it. Either member can set it. An unset field keeps the current map. The packs are **Golden Hour** (amber + coral), **Dusk Rose** (muted rose + peach), **Coastal Infra** (white + sky + one coral), and **Sage Coast** (foam + sage green + sky blue + sand tan + ink). Invite uses `--together`. Kind rails stay flight, stay, and place. `--brand`, `--live`, and cover chrome stay in `app/globals.css`. The semantic ladder is generated into `app/theme-packs.css`. Optional warmer/cooler bias is Later. Hex pickers and per-card colors are out of scope.

Display: Instrument Serif for trip title, place chapters, capture prompt. UI: DM Sans 11–14px (Geist optional later). **No third family.**

## Component layers

1. **`components/ui/`** — shadcn/Radix primitives (Button, Dialog, Tabs, Input, …).
2. **`components/ds/`** — product patterns:
   - `SegmentedControl` — Trip/Today (`aria-pressed`)
   - `StatusBanner` — success/error/info with `role` + `aria-live`
   - `EmptyState` — Arrive empty with CTAs
   - `SkipLink` — keyboard skip to `#main-content`
3. **Feature** — trip story, capture dock, peeks, Ask whisper, invite sheet (see spec).

## A11y checklist (every surface)

- [ ] Interactive elements are `<button>` / Radix triggers (not clickable `div`s)
- [ ] Icon-only controls have `aria-label`
- [ ] Form fields use `<Label htmlFor>` or `aria-label`
- [ ] Focus ring visible (`focus-visible:ring-*`)
- [ ] Status toasts use `StatusBanner` or `role="status"|"alert"`
- [ ] Dialogs/sheets use focus trap + Escape
- [ ] Honor `prefers-reduced-motion`
