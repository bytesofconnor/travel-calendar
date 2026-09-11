# Together Story — implementable spec

**Status:** Locked for build  
**Canvases:** Cursor canvas `together-story-polish.canvas.tsx` (color + frames)  
**Product goal:** Two people always know what’s happening on the trip — see → add → invite in ≤3 taps.

This is the source of truth for the authenticated trip workspace rebuild. Landing may diverge.

---

## 0. Niche brief (product fit)

**One-liner:** The shared trip calendar for couples and travel partners — one trip, two people, always in sync.

**Who it’s for:** Two people planning *the same* trip (couple, best friends, trip partners). Not travel agents, not solo itinerary power users, not group tours of 12.

**Unit of focus:** The **active trip** is home. You live inside Peru & Bolivia 2026, not a dashboard of every vacation you’ve ever taken.

**Core loop (≤3 taps):** See what’s planned → Add a plan → Invite your partner.

**What sets us apart**

| Us | Not us |
|----|--------|
| Together-first (Invite is first-class; solo feels incomplete) | Solo itinerary tools with share bolted on |
| Chronological **story** + capture at the thumb | Week/month/agenda chrome, map-first Wanderlog |
| Realtime “partner just added…” presence | Email PDFs / stale shared docs |
| Kind color (flight / stay / place) as meaning | One accent blue for every control |
| Packing & Notes as peeks | Equal peer tabs / suite navigation |

**Multi-trip (in scope, light):** A **Trips** sheet — list / switch / create / join. Not a second app, not a portfolio home tab. Entry: cover wordmark, chrome chevron, or ⋯ → All trips.

**Explicitly out of niche (for now):** Map-first planning, booking import suites, public trip pages, multi-org / team workspaces, replacing Google Calendar.

**Positioning test:** If we removed the partner and Invite, would the product still feel complete? If yes, we’ve drifted.

---

## 1. North star

| Principle | Meaning |
|-----------|---------|
| Story over suite | Home is a vertical trip story, not equal Plans/Notes/Packing tabs |
| Capture at thumb | Always-present dock: “Add to the trip…” |
| Together is the product | Invite is first-class; solo trips show an incomplete state |
| Color means kind | Spectrum hues encode type/person — never one blue for every control |
| Smooth, not showy | Motion connects states; honor `prefers-reduced-motion` |

**Hard rules**

1. Trip name appears **once** above the fold (cover). Never duplicate in the sticky bar.
2. Cover is **black chrome** (same as create/join/landing). Optional destination photo is a whisper only (~12% opacity). Type is always light on chrome.
3. Authenticated trip workspace follows **system light/dark** (`prefers-color-scheme` via `next-themes`). Dark = canvas vision; light = cool paper. Cover chrome stays deep in both. Portaled overlays (Invite, Add plan, menus) inherit the same tokens. Landing uses the same chrome mast.
4. Notes & Packing are **peek sheets**, not peer tabs.
5. Ask is unnamed — “Ask about this trip” / whisper drawer.
6. No nested Week / Day / Agenda chrome.

---

## 2. Information architecture

```
Trip workspace
├── Cover (photo or tonal planes + spectrum hairline)
├── Quiet chrome: [Trip | Today] · trips chevron · avatars · Invite
├── Trips sheet (list / switch / create / join) — not a home tab
├── Body
│   ├── Trip mode → chronological story (days as chapters)
│   └── Today mode → “what now” (auto when trip dates include today)
├── Live whisper (partner add toast)
├── Secondary pills → Packing / Notes / Ask (open peeks)
└── Capture dock (sticky) → expands to sheet
```

| Surface | Role | Replaces |
|---------|------|----------|
| Trip Story | Home · vertical days | Plans tab + week/month nested UI |
| Today | Travel-day focus | — (new) |
| Capture dock + sheet | Add plans | FAB / buried “Add” / composer rows only |
| Invite | Share moment | Share as equal header button cluster clutter |
| Packing peek | Checklist sheet | Packing tab |
| Notes peek | Notes sheet | Notes tab |
| Ask whisper | Trip-aware assist | “Mara” / loud AI chrome |

---

## 3. Typography

Modern geometric sans throughout the trip workspace (DM Sans). Hierarchy from **weight + size**, not mixed faces. Landing may still use Instrument Serif.

| Role | Face | Size / treatment |
|------|------|------------------|
| Brand / trip title | DM Sans | 28–32 · **700** · −0.04em |
| Place chapter | DM Sans | 24–28 · **700** · −0.035em |
| Section headline (“Start the story”) | DM Sans | 28–34 · **700** |
| Capture prompt | DM Sans | 16 · **500** · muted (invitation, not a form label) |
| Plan / arrive title | DM Sans | 15–16 · **650–700** · −0.025em |
| Meta / chrome | DM Sans | 12–13 · 450–500 |
| Kind label | DM Sans | 11 · **650** · kind color (sentence case) |

**Rule:** One bold display line per section. No all-caps kickers. Color = kind accents only — not decoration on every surface.

**Minimalism:** Generous space, hairline borders, full-pill primary actions, no stacked shadows. Spectrum hairline under cover stays as the quiet signature.

---

## 4. Color — kind spectrum

Ocean teal (`--brand`) = quiet wordmark stitch only. **Not** Invite / + / every rail.

| Token | Hue intent | Use |
|-------|------------|-----|
| `--kind-flight` | sky blue | Flight rail, chip dot, parse confirm |
| `--kind-stay` | violet | Stay rail, chip, confirm |
| `--kind-place` | green | Place / activity |
| `--kind-note` | amber | Notes, packing peek chip |
| `--kind-ask` | rose | Ask whisper / chip |
| `--together` | warm coral | **Invite only** |
| `--live` | cyan | Partner whisper, Today kicker, “you” avatar |
| `--partner` | warm coral (same family as together) | Partner avatar |
| Cover type | `--foreground` | Always |
| Capture `+` | ink (`--primary`) | Neutral; confirm uses parsed kind |

**Spectrum hairline:** 2px strip under cover — ordered  
`stay → flight → live → place → note → together → ask`  
(purple · blue · cyan · green · amber · coral · rose). Signature, not decoration elsewhere.

**Don’t:** One accent on Invite + + + rails + avatars. Rainbow on every element. Gradients as page background.

**Cover:** Always `--cover-chrome` (black). Photo, if set, sits at ~12% opacity — atmosphere, not a postcard. Spectrum hairline under. Never a destination-dependent hero.

---

## 5.5 Responsive & PWA

The trip workspace is **full-bleed at every width**. Cover, spectrum, sticky chrome, and capture dock span the viewport; story type and controls sit in a centered `story-shell` (max ~48–52rem). At `lg+`, create / join / landing split: chrome mast on the left, form on the right.

Installable PWA: `display: standalone`, `viewport-fit: cover`, safe-area padding on cover / dock / mast, `theme-color` matching cover chrome, maskable 512 icon. Do not lock pinch-zoom (`user-scalable` stays on — WCAG 1.4.4).

**WCAG 2.0 AA (workspace):** skip link, `lang`, labeled controls, 3:1 UI / 4.5:1 text contrast on kind labels and muted meta, visible focus, 44px hit targets on chrome/dock, live regions for errors and partner whisper, `prefers-reduced-motion`.

---

## 5. Screens & components

### 5.1 Cover
- Destination photo when set; else tonal planes + spectrum.
- Content: wordmark (small caps) · serif trip title **once** · meta (`dates · N days · you & Name`).
- Cover scrolls away naturally in the story scrollport (no JS height animation — that caused scroll jank). Spectrum hairline + quiet chrome stay sticky.

### 5.2 Quiet chrome
- Segmented **Trip | Today** (`SegmentedControl`).
- Overlapping avatars (you=`--live`, them=`--partner`).
- **Invite** button filled `--together` (readable ink-on-coral or dark-on-coral per contrast check).
- No second trip title. No Share/Ask/⋯ cramped cluster — Ask lives in secondary pills / whisper.

### 5.3 Trip story body
- Days as chapters: `THU · JUN 12` + serif place + optional note line.
- Plan cards: 14px radius, hairline border, **3px kind rail**, kind label in hue, author name top-right.
- Emphasize (just-added / now): border + rail at full kind opacity.
- Empty trip (“Arrive”): three starts — Add flights · Add stay · Invite partner + capture dock.
- Secondary row under story: pills `Packing n/m` · `N notes` · `Ask`.

### 5.4 Today mode
- Auto-select when `today ∈ [trip.start, trip.end]` (client passes `today` ISO date into query/UI — no `Date.now()` inside Convex queries).
- Hero: live kicker + serif place + soft guidance line.
- Cards for today only; footer hint for tomorrow.
- Capture placeholder: “What’s happening today?”

### 5.5 Capture dock
- Sticky bottom. Ink `+` · serif/sans prompt “Add to the trip…”.
- Kind chips with spectrum dots: Stay · Flight · Place · Note.
- Expand → sheet: NL parse preview (“Stay · 4 nights”) · kind chips · **Add for both** (button = parsed kind color).
- Opens existing `ItemDialog` flow with `initialInput` / kind prefill; polish the shell to match sheet.

### 5.6 Invite
- First-class route/sheet: headline *“This trip needs a second heartbeat.”*
- Copy link / Text partner. Waiting state with solo avatar.
- Wire to existing `ShareTripDialog` content; restyle + elevate entry from `--together` button.

### 5.7 Peeks (Packing / Notes)
- Bottom sheet ~56% height over dimmed story; drag/dismiss / Escape.
- Reuse `TripPackingView` / `TripNotesView` insides; new sheet chrome.
- Authorship on packing rows when available.

### 5.8 Ask whisper
- Drawer/sheet: “Ask about this trip” · trip-aware · optional “Add as note/plan”.
- No character name. Chip hue `--kind-ask`.

### 5.9 Live whisper
- Soft toast on story when partner mutates items: cyan dot + “Brenda just added …”.
- `role="status"` · enter 200ms · hold ~3s · exit. Dedupe per item id.

---

## 6. Motion

| Moment | Behavior | Reduced motion |
|--------|----------|----------------|
| Cover scroll | Cover leaves viewport with native scroll; chrome + hairline sticky | Native |
| Capture expand | Dock → sheet · ~420ms spring | Instant |
| Live whisper | Fade/slide 200ms | Instant show/hide |
| Trip ↔ Today | Place name crossfade ~200ms | Instant swap |
| Card press | scale 0.98 · 100ms | None |
| Peek sheet | Rise + dim · drag dismiss | Instant |

---

## 7. Map kinds → data

Existing item types (Stay / Flight / Idea / etc. in `ItemDialog` / Convex) map:

| UI kind | Data / behavior |
|---------|-----------------|
| Flight | flight travel type |
| Stay | stay / lodging |
| Place | activity / location idea (replace “Idea” chip label in UI) |
| Note | opens note peek compose OR note-type item — prefer peek compose |
| Now | UI-only emphasis on today’s current/next card |

Show `createdBy` display name on every plan card.

---

## 8. Build order (implementation)

1. **Tokens** — spectrum CSS vars + hairline utility in `globals.css`; update `docs/design-system.md` pointer.
2. **Shell** — strip masthead duplicate title + Plans/Notes/Packing tabs from `convex-trip-calendar-app.tsx`; ship Cover + Quiet chrome + Trip/Today.
3. **Story body** — replace week-chip Plans home with chronological chapter list (can derive from existing items sorted by date).
4. **Capture dock** — sticky + expand; wire to `ItemDialog`.
5. **Invite** — restyle share entry (`--together`).
6. **Peeks** — Packing/Notes sheets; remove tab triggers.
7. **Ask** — quiet whisper entry from pill.
8. **Live whisper** — partner mutation toast.
9. **Motion** — cover collapse, dock spring, reduced-motion gates.
10. **Empty Arrive** — three-start empty state.

Desktop: same IA; story max-width ~640–720 centered; peeks as side sheet or modal.

---

## 9. Out of scope (this rebuild)

- Map-first Wanderlog clone  
- Trip portfolio / dashboard as the primary home (Trips sheet is enough)  
- Renaming product / new AI persona  
- Landing page redesign  
- Changing Convex schema unless authorship fields missing on list payloads  

---

## 10. Acceptance checklist

- [ ] Trip title once; readable on cover (photo and fallback)
- [ ] Spectrum hairline visible under cover
- [ ] Kind rails/chips use spectrum (not single blue)
- [ ] Invite is coral; Capture + is ink
- [ ] Trip | Today works; Today auto on in-trip dates
- [ ] No Plans/Notes/Packing tab bar
- [ ] Capture dock always reachable; add succeeds for both members
- [ ] Packing/Notes open as peeks
- [ ] Partner add shows live whisper
- [ ] Trips sheet: list, switch, create/join; reachable from wordmark / chevron / ⋯
- [ ] `prefers-reduced-motion` respected
- [ ] A11y: labels, focus rings, dialog/sheet focus trap, live region for whisper

---

## 11. File touch list (expected)

- `app/globals.css` — tokens, hairline, cover, dock, card rails  
- `docs/design-system.md` — defer to this spec  
- `components/convex-trip-calendar-app.tsx` — shell rewrite  
- `components/week-view.tsx` — story/today body (or new `trip-story-view.tsx`)  
- `components/item-dialog.tsx` — kind labels Place; sheet affordances  
- `components/share-trip-dialog.tsx` — invite moment copy/style  
- `components/trip-copilot.tsx` — whisper entry  
- `components/trip-packing-view.tsx` / `trip-notes-view.tsx` — peek hosts  
- New: `components/capture-dock.tsx`, `components/trip-cover.tsx`, `components/live-whisper.tsx`, `components/peek-sheet.tsx`, `components/trips-sheet.tsx`
