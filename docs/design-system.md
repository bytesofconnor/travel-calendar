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

## Tokens (`app/globals.css`)

| Token | Role |
|-------|------|
| `--background` | Foam in light (cool paper) / deep editor |
| `--foreground` | Ink (cover type always) |
| `--card` | Raised surface |
| `--primary` | Ink CTA / capture + |
| `--brand` | Ocean teal — wordmark stitch only |
| `--kind-flight` … `--kind-ask` | Kind spectrum (see Together Story spec) |
| `--together` / `--live` / `--partner` | Invite · presence · avatars |
| `--muted-foreground` | Secondary text |
| `--border` | Hairlines |
| `--radius` | 0.5rem base (cards ~14px) |

**Foam** is the paper / near-white surface. **Ink** is type and chrome (`--foreground`, `--primary`). Brand is **theme packs**, not one locked palette: the same tokens remap per `data-theme` (or equivalent) on the trip or couple preference. Named packs: **Golden Hour** (amber + coral), **Dusk Rose** (muted rose + peach), **Coastal Infra** (white + sky + one coral), **Sage Coast** (foam + sage green + sky blue + sand tan + ink). Invite stays `--together`. Kind rails stay `--kind-flight` / `--kind-stay` / `--kind-place`. Couples pick a preset. Optional warmer/cooler bias is Later. Hex pickers and per-card colors are out of scope.

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
