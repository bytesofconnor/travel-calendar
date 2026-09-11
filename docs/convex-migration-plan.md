# Travel Calendar → Convex Migration Plan

**Goal:** Replace Supabase (Auth + Postgres + Realtime + service-role APIs) with Convex end-to-end, runnable and verifiable locally.

**Why:** Free-tier project limits on Supabase; Convex free/Starter fits a personal couples app; realtime shared trip state maps cleanly to Convex queries.

**Rule of the walkthrough:** You do **browser / account / OAuth console** steps. The agent does **repo / CLI / code**. Each phase ends with a **verify** checklist before the next.

---

## Decisions (locked for this plan)

| Decision | Choice | Why |
|----------|--------|-----|
| Backend | Convex (dev deployment via `npx convex dev`) | Local-friendly, free tier, realtime built-in |
| Auth | `@convex-dev/auth` — **Google** + **Resend OTP** | Closest to today’s Google / email code UX |
| Magic link | **Defer** (OTP covers email; add later if needed) | Cuts migration surface |
| Dev bypass | Convex-only **Password/dev credentials** or env-gated seed user in development | Replaces `/api/dev/auth` admin magic link |
| Paywall | Keep Stripe Payment Link + `access` table in Convex; webhook → Convex HTTP action | Same product model |
| Covers | Keep Pexels URL fields on `trips` (no file storage) | Already works that way |
| Mara | Keep Next.js `/api/brainstorm/chat` for now; trip context from Convex client | Avoid blocking migration on AI |
| Data cutover | **Fresh start in Convex** for local; optional JSON export later | No production remapping of Supabase UUIDs needed to ship |
| Cutover style | **Feature branch**, Convex-only once auth works — no long dual-write | Small app; dual-write cost > benefit |

---

## Current surface (what we’re replacing)

| Area | Today | After |
|------|--------|--------|
| Schema | `supabase/schema.sql` — trips, members, items, notes, packing, access | `convex/schema.ts` |
| Auth | Supabase Auth (Google, OTP, magic link, callback cookies) | Convex Auth |
| Client data | `trip-calendar-app.tsx` + Supabase client + realtime channel | `useQuery` / `useMutation` |
| SSR user | `app/page.tsx` + `lib/supabase/server.ts` | Convex Auth Next.js provider / token |
| Session proxy | `proxy.ts` | `convexAuthNextjsMiddleware` (or equivalent) |
| Dev auth | `POST /api/dev/auth` | Dev-only Convex sign-in |
| Stripe | `POST /api/webhooks/stripe` + admin client | Convex `httpAction` |
| Access bypass | `POST /api/access/bypass` | Convex mutation or HTTP |
| Cover | `POST /api/trips/[tripId]/cover` | Convex action |
| Mara | `POST /api/brainstorm/chat` | **Unchanged** (phase 7 optional move) |

---

## Target Convex schema

```ts
// convex/schema.ts (sketch)
users          // managed largely by Convex Auth; add indexes we need
trips          // name, inviteCode, startDate, endDate, createdBy, cover*
tripMembers    // tripId, userId, role, displayName
tripItems      // calendar rows
tripNotes      // one doc per trip (enforce in createTrip)
tripPackingItems
access         // userId, grantedAt, method: stripe | code
```

**Indexes (required):**
- `trips.by_invite_code`
- `tripMembers.by_user`, `by_trip`, `by_trip_and_user`
- `tripItems.by_trip` (+ optional `by_trip_and_start`)
- `tripNotes.by_trip`
- `tripPackingItems.by_trip`
- `access.by_user`

**Authz pattern:** `authedQuery` / `authedMutation` wrappers; every trip-scoped function checks membership (Convex’s RLS equivalent). Invite lookup is a **dedicated** `joinTrip` mutation that looks up by invite code, then inserts membership — never a public “list all trips.”

---

## Phase map (walkthrough order)

```
0 Browser accounts     → 1 Scaffold Convex     → 2 Schema + auth helpers
→ 3 Next.js providers  → 4 Auth UI parity       → 5 Trip CRUD + realtime
→ 6 Packing + notes    → 7 Paywall + Stripe     → 8 Cover + Mara wiring
→ 9 Delete Supabase    → 10 Hardening / ship
```

Estimated effort: **2–4 focused sessions** for a working local app; Stripe webhook + Google OAuth consoles are the main “you” blockers.

---

## Phase 0 — Accounts & consoles (YOU in the browser)

Do these before / during Phase 1. Keep secrets out of git; paste into Convex env or tell the agent to run `npx convex env set` (don’t commit values).

### 0.1 Convex
1. Sign in at [dashboard.convex.dev](https://dashboard.convex.dev).
2. Create a project (e.g. `travel-calendar`).
3. Leave the dashboard open — you’ll need **Deployment URL** and later **HTTP Actions URL** (`*.convex.site`).

### 0.2 Google OAuth (for Convex Auth)
1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create (or reuse) an OAuth 2.0 Client (Web).
3. **Authorized JavaScript origins:** `http://localhost:59316` and `https://travelcalendar.space`.
4. **Authorized redirect URI:**  
   `https://<YOUR_DEPLOYMENT>.convex.site/api/auth/callback/google`  
   (from Convex dashboard → Settings → URL & Deploy Key → HTTP Actions URL).
5. Copy **Client ID** + **Client Secret** for Phase 1 env.

> If you already have a Google client for Supabase, create a **new** redirect URI for Convex rather than breaking Supabase until cutover is done.

### 0.3 Resend (email OTP)
1. [resend.com](https://resend.com) → create API key.
2. For local OTP, `onboarding@resend.dev` sender is fine initially.
3. Later: verify `travelcalendar.space` domain for production From-address.

### 0.4 Stripe (can wait until Phase 7)
1. Keep existing Payment Link or create a test-mode link.
2. You’ll add a webhook endpoint pointing at Convex HTTP later:  
   `https://<deployment>.convex.site/stripe/webhook` (exact path TBD in code).

### 0.5 Checklist
- [ ] Convex project exists
- [ ] Google Client ID/Secret ready
- [ ] Google redirect URI includes `*.convex.site/.../callback/google`
- [ ] Resend API key ready
- [ ] (Optional) Stripe test webhook postponed until Phase 7

---

## Phase 1 — Scaffold Convex in the repo (AGENT + you once)

### Agent
1. Branch: `cb/convex-migration` (or your preferred name).
2. `pnpm add convex @convex-dev/auth @auth/core` (+ Resend / OTP helper deps as needed).
3. `npx convex dev` — links to your project; creates `convex/`, writes `NEXT_PUBLIC_CONVEX_URL`.
4. Add `.env.local` keys (non-secret URL only in gitignore’d file):
   - `NEXT_PUBLIC_CONVEX_URL`
5. Set Convex env (agent runs, you supply values):
   ```bash
   npx convex env set AUTH_GOOGLE_ID "..."
   npx convex env set AUTH_GOOGLE_SECRET "..."
   npx convex env set AUTH_RESEND_KEY "..."
   # JWT / auth site URL vars per Convex Auth Next.js docs
   ```
6. Add `convex/auth.ts`, `convex/auth.config.ts`, `convex/http.ts` per Convex Auth + Next.js App Router docs.
7. Keep Supabase packages installed until Phase 9 so we can flip gradually if needed — but new work targets Convex only.

### You verify
- [ ] `npx convex dev` stays healthy
- [ ] Dashboard shows the deployment updating
- [ ] `NEXT_PUBLIC_CONVEX_URL` present in `.env.local`

---

## Phase 2 — Schema + auth helpers (AGENT)

### Deliverables
- `convex/schema.ts` — tables + indexes above (plus Convex Auth tables via auth helpers).
- `convex/lib/auth.ts` — `getCurrentUser`, membership helpers.
- `convex/lib/customFunctions.ts` — `authedQuery` / `authedMutation`.
- `convex/trips.ts`, `members.ts`, `items.ts`, `notes.ts`, `packing.ts`, `access.ts` — **stubs** with args/returns validators first.

### Create-trip invariant (replaces SQL triggers)
One mutation `createTrip`:
1. Insert `trips`
2. Insert `tripMembers` (owner)
3. Insert empty `tripNotes`

### You verify
- [ ] Schema appears in Convex dashboard Data tab
- [ ] No runtime functions needed yet beyond auth smoke

---

## Phase 3 — Next.js Convex providers (AGENT)

### Deliverables
- `ConvexAuthNextjsServerProvider` in `app/layout.tsx`
- Client `ConvexAuthNextjsProvider` + `ConvexReactClient`
- Replace / adapt `proxy.ts` with Convex Auth middleware pattern for Next 16
- `app/page.tsx` no longer needs Supabase `getUser` for the long term (may temporarily show login until Phase 4)

### You verify
- [ ] App loads with empty/auth shell, no console provider errors
- [ ] Hard refresh keeps session once Phase 4 works

---

## Phase 4 — Auth UI parity (AGENT + YOU)

### Agent
- Wire `login-screen.tsx` to Convex Auth:
  - Google → `signIn("google")`
  - Email code → `signIn` with provider id + email, then second call with code
  - Sign out → Convex `signOut`
- Dev bypass: env-gated button that signs in a fixed local identity **or** Password provider only when `NODE_ENV=development`
- Remove dependency on `/auth/callback` Supabase route once Convex Auth handles redirects
- Delete or noop `app/api/dev/auth` after replacement

### You verify (browser)
- [ ] Google sign-in round-trips back to localhost logged in
- [ ] Email OTP arrives via Resend; 6-digit verify works
- [ ] Refresh stays logged in
- [ ] Sign out returns to landing
- [ ] Dev bypass works without Google (if enabled)

**Stop here if auth is flaky** — do not port trip CRUD yet.

---

## Phase 5 — Trip shell + calendar CRUD (AGENT)

### Port in this order
1. `listMyTrips` / `getTripBundle` queries (members + trip + items)
2. `createTrip`, `joinTrip(inviteCode, displayName)`, `updateTrip` (owner)
3. Item CRUD: create / update / delete
4. Replace Supabase realtime in `trip-calendar-app.tsx` with `useQuery` (auto-updates)

### UI work
- Keep existing week/month views; swap data props to Convex types (`Id<"trips">` etc.)
- Preserve invite share UX (copy invite code)

### You verify
- [ ] Create trip
- [ ] Add / edit / delete calendar items
- [ ] Second browser (or incognito) joins via invite and sees the same items live
- [ ] Month empty-day add + week views still behave (recent UX fixes)

---

## Phase 6 — Brainstorm + packing (AGENT)

### Port
- Notes: `getNote`, `saveNote` (debounce client-side as today)
- Packing: add / toggle / rename / delete / bulk insert (Mara apply)
- Organize-notes still calls Next `/api/brainstorm/chat`; only persistence is Convex

### You verify
- [ ] Notes autosave + dual-user sync
- [ ] Packing checklist sync
- [ ] Mara “Add to brainstorm / packing / calendar” still writes via new mutations

---

## Phase 7 — Paywall + Stripe (AGENT + YOU)

### Agent
- `access.hasAccess` query
- `access.grantByCode` mutation (server checks `BYPASS_CODES` from Convex env)
- Stripe webhook as Convex `httpAction` verifying signature with `STRIPE_WEBHOOK_SECRET`
- Map `client_reference_id` → Convex `users` id (must be the Convex user id in the Payment Link)

### You (browser)
1. Convex dashboard → copy HTTP Actions base URL.
2. Stripe Dashboard → Webhooks → add endpoint to Convex path.
3. Set `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PAYMENT_LINK`, `BYPASS_CODES` in Convex / Next env as appropriate.
4. Fix Payment Link so `client_reference_id` is the **Convex user id** (agent will change `getPaymentLink`).

### You verify
- [ ] With paywall enabled, unpaid user sees paywall
- [ ] Bypass code grants access
- [ ] Test-mode Stripe checkout grants access via webhook

---

## Phase 8 — Cover images + cleanup wiring (AGENT)

- Move cover refresh to Convex action (Pexels key in Convex env) **or** keep Next route but authorize via Convex user token
- Ensure owner-only refresh
- Landing / Mara unchanged

### You verify
- [ ] New trip gets a cover (or manual refresh works)
- [ ] Attribution fields still show

---

## Phase 9 — Remove Supabase (AGENT)

Only after Phases 4–8 pass locally.

### Delete / stop using
- `lib/supabase/**`
- `supabase/schema.sql` (archive under `docs/legacy/` if you want history)
- `app/auth/callback/route.ts` (if unused)
- `app/api/dev/auth`, `app/api/access/bypass`, `app/api/webhooks/stripe`, cover route (if moved)
- `@supabase/ssr`, `@supabase/supabase-js` from `package.json`
- Supabase env vars from `.env.local` / `.env.example` (replace with Convex docs)

### You verify
- [ ] Cold start: `pnpm install && pnpm dev` + `npx convex dev`
- [ ] Full happy path: login → create → invite partner → plan → pack → notes → Mara apply
- [ ] No `supabase` imports left (`rg supabase`)

---

## Phase 10 — Hardening (optional before prod)

- [ ] Rate-limit `joinTrip` (Convex rate limiter component or simple backoff)
- [ ] Production Google redirect + Resend domain
- [ ] Production Convex deploy (`npx convex deploy` — **prod only**)
- [ ] Vercel env: `NEXT_PUBLIC_CONVEX_URL` + auth-related public vars
- [ ] Decide magic-link: port or drop from marketing copy
- [ ] Export script from Supabase if you ever need old trip data (optional)

---

## Local runbook (every session)

```bash
# Terminal A — Convex backend
pnpm dev:convex

# Terminal B — Next.js always on 59316
pnpm dev
```

Or one shot: `pnpm dev:all`

Open **http://localhost:59316**. Keep Convex dashboard Data + Logs open while testing.

Convex `SITE_URL` must stay `http://localhost:59316` in local/dev (already set). Google OAuth **Authorized JavaScript origins** should include `http://localhost:59316`.

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Google redirect mismatch | Exact `*.convex.site/api/auth/callback/google`; separate client from Supabase until cutover |
| Email OTP not arriving | Resend logs; use account email; verify API key in Convex env |
| Invite join authz hole | Only `joinTrip` may query by invite code; never public trip list |
| Stripe `client_reference_id` still Supabase UUID | Update paywall to pass Convex user id before enabling webhook |
| Giant `trip-calendar-app.tsx` | Port by feature vertical; avoid big-bang rewrite of unrelated UI |
| Next 16 middleware/`proxy.ts` + Convex Auth quirks | Follow current Convex Auth Next.js docs; verify session on hard refresh early |
| Free-tier bandwidth | Index trip-scoped queries; avoid `.collect()` on unbounded tables |

---

## What “done” means

1. No Supabase dependency in runtime code.
2. Google + email OTP + sign-out work on localhost.
3. Create / join trip, calendar, notes, packing all live-sync across two sessions.
4. Paywall optional but working when env enabled.
5. Cover + Mara still usable.
6. `.env.example` documents Convex + auth + Stripe + Pexels + AI only.

---

## Progress log

| Date | Phase | Status |
|------|-------|--------|
| 2026-09-10 | 0 Convex project | Done — [determined-anaconda-212](https://dashboard.convex.dev/t/connor-barrett/travelcalendar/determined-anaconda-212) |
| 2026-09-10 | 1 Scaffold | Done — branch `cb/convex-migration`, packages, linked deployment, JWT + SITE_URL set |
| 2026-09-10 | 2 Schema + helpers | Done — auth tables + trip schema pushed; `lib/auth`, `customFunctions`, `health.ping` |
| 2026-09-10 | 3 Providers | Done — Convex Auth Next.js providers + proxy composition (Supabase still refreshed during migration) |
| 2026-09-10 | 0 Google env | Done — AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET on deployment |
| 2026-09-10 | 4–5 Auth + trips | Done — `ConvexTripCalendarApp` on `/` with Google + OTP UI + Convex trip CRUD |
| | 0 Resend | Optional for email OTP — `npx convex env set AUTH_RESEND_KEY` |
| 2026-09-10 | 9 Cutover | Done — Supabase packages/routes/clients removed; Convex-only app |
| 2026-09-10 | Agent API | Done — `GET /agent/v1/trips` + bundle; MCP sketch under `mcp/travel-calendar/` |

**HTTP Actions URL (Google redirect):** `https://determined-anaconda-212.convex.site/api/auth/callback/google`

**Local SITE_URL set to:** `http://localhost:59316`

Agent API docs: [docs/agent-api.md](./agent-api.md)


---

## How we’ll execute (working agreement)

1. You finish **Phase 0** checklist (or say what’s done).
2. Agent starts **Phase 1–2** on a migration branch.
3. After each phase, you run the **You verify** list and reply pass/fail.
4. We do not delete Supabase until Phase 9.

---

## Open questions (answer when ready)

1. **Resend vs another email OTP provider?** → **Skip for now** (no sending domain yet). Google-only sign-in.
2. **Keep magic link in v1 Convex auth?** → No / deferred with email OTP.
3. **Any production trip data you must migrate**, or fresh Convex data is OK?
4. **Preferred local port?** → **59316 always** (`pnpm dev` / `pnpm start`).
