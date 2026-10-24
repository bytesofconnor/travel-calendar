# Travel Calendar Roadmap

Updated: 2026-10-24 · Owner: Travel Calendar · North star: Be the Stripe of travel calendars. The product is calendar memory for agents, built for couples. Two people and their agents share one trusted trip calendar as the system of record. Intent goes in, and one plan comes out. Optional export goes to Google Calendar or Apple Calendar. The engine and MCP come first. The UI comes second. It is not a chat app, not a booking engine, and not another AI itinerary planner.

Say "what's good near X," and add that plan to the shared trip both people see. The object is that calendar, shaped by time. It is not a markdown trip file, and it is not a day-board. Humans set intent. Agents read and write the shared calendar as the source of truth. Personal calendars only receive a copy. Distribution meets both people wherever they already talk to their AI. MCP is the first host. Meta Muse, Messenger-style AI surfaces, ChatGPT, and Claude follow once that contract holds, so either partner can change the same trip from their preferred agent.

## Open (ranked)

1. **Standing live discovery on https://www.travelcalendar.space.** Before other product work, run a signed-in pass and a signed-out pass on the live app, file each failure as an Open item, and verify that same path after the fix. Check: on https://www.travelcalendar.space, signed out, after "Checking sign-in" the landing shows Continue with Google, and a completed Google sign-in returns through `bright-mouse-917.convex.site` to https://www.travelcalendar.space. Do not use `determined-anaconda-212` for this pass. Its callback currently redirects to `http://localhost:59316`.
2. **Auth email OTP from a travelcalendar.space sender.** `convex/ResendOTP.ts` sends from `onboarding@resend.dev`, and the login screen is mounted with `emailAuthEnabled={false}`. Check: a fresh email OTP arrives from an address at travelcalendar.space.
3. **Partner invite and join.** The other person can open the shared trip without a support loop. Invite copies `https://www.travelcalendar.space/?join=<code>`. The signed-out screen does not show that code, and Google sign-in does not keep `join` on the return URL. Check: a second account that is already signed in and has no trips opens that link and lands on the trip. An account that must use Continue with Google from that URL returns without `join`, then joins from Your trips, Join with invite code.
4. **MCP can create or update a shared trip.** `mcp/travel-calendar` is read-only today (`check_access`, `list_trips`, `get_trip_bundle`), and `/agent/v1/trips` has no POST, PUT, or PATCH. Check: an agent using that MCP server creates or updates a trip, and both partners see the same change on reload and in `get_trip_bundle`.
5. **Trip create, edit, and share stay consistent.** Both people see the same dates and places after a change. Trip dates are owner-only under Edit trip. A place is a plan (Place, then Where), not a field on the trip. Check: create a trip, change Start date or End date, add a Place with Where, and a second member or a reload shows the same dates and that plan.
6. **Stripe paywall matches the UI.** Access is required only when `STRIPE_PAYMENT_LINK` is set on Convex. The paywall is the lifetime screen ($9.99 once) when access is required and not granted. `POST https://bright-mouse-917.convex.site/stripe/webhook` returns 503 `Stripe not configured`, so a completed checkout cannot grant on that host. Check: when the UI says paid or unlocked, the server allows the gated action, and when the UI says locked, the server does not.
7. **Theme packs, not one locked palette.** Brand is four named presets that remap the same semantic CSS tokens (`--background`, `--together`, `--kind-*`, Foam, Ink). The couple picks one pack as a trip or couple preference. This is a brand layer on the shared-calendar UI, not a theme marketplace. Check: `app/globals.css` (or a themes CSS file) defines four named maps — Golden Hour (amber + coral), Dusk Rose (muted rose + peach), Coastal Infra (white + sky + one coral), and Sage Coast (foam + sage green + sky blue + sand tan + ink) — selected with `data-theme` (or equivalent). Invite still uses that pack’s `--together`. Kind rails still map flight, stay, and place. `docs/design-system.md` names the four packs.

## Shipped

- **CI, auto-merge, Dependabot, AGENTS.md, Playwright smoke, and Convex deploy.** 2026-10-23. [PR #5](https://github.com/bytesofconnor/travel-calendar/pull/5), [2546d92](https://github.com/bytesofconnor/travel-calendar/commit/2546d92a920d8f0ea9396fb4d62a29b0cc42be74).
- **Canonical domain www.travelcalendar.space.** 2026-10-23, same pull request. `vercel.json` 308-redirects `ourcalendar.space` and `www.ourcalendar.space` to https://www.travelcalendar.space and keeps the path and query. On 2026-10-24, `https://travelcalendar.space/privacy?from=apex` returned 307 to `https://www.travelcalendar.space/privacy?from=apex`. `heymara.app`, `www.heymara.app`, and `v0-travel-calendar.vercel.app` returned 308 to https://www.travelcalendar.space and kept the path and query. Vercel domain settings hold those three redirects.
- **Next 16.4.3, ESLint 10, and TypeScript 6.** 2026-10-23. [PR #10](https://github.com/bytesofconnor/travel-calendar/pull/10), [ae206f3](https://github.com/bytesofconnor/travel-calendar/commit/ae206f38ebcf9fae0807a8a9163bc7ce3c321f26). Also on main: Zod 4 in [PR #7](https://github.com/bytesofconnor/travel-calendar/pull/7), PostCSS 8.5.23 in [PR #6](https://github.com/bytesofconnor/travel-calendar/pull/6), and the MCP SDK bump in [PR #12](https://github.com/bytesofconnor/travel-calendar/pull/12).

## Later

- Meta Muse and other AI hosts, after Open item 4 proves the MCP engine contract. Nearby, then add a plan to the trip, from either partner's assistant.
- Optional Google Calendar and Apple Calendar sync for each partner. The shared trip stays the source of truth. Check when it ships: a trip date or plan appears on the connected personal calendar, and turning sync off stops new writes without deleting the shared trip.
- Further React majors, and the next TypeScript major, stay deferred while the Open checks are still open. TypeScript 6 is already on main.
- Growth bets and a feature wishlist wait until those checks are green.
- Optional warmer or cooler bias on the chosen theme pack, after Open item 7 ships the four presets.

## Not doing

- A different-backend rewrite. The current Convex app is the product.
- A multi-trip team product before couple and partner flows work.
- Booking and reservations for flights, hotels, and restaurant checkout. The product is the shared trip system of record. Users or other agents book elsewhere, and the calendar holds the plan.
- A generic solo itinerary planner, such as LetsPackUp, PlanGoGo, Traveler.md, or aitrips. Those are a markdown trip file or a day-board for one person. The unit here is a couple, and the object is one shared calendar.
- Free-form hex pickers and per-card colors. Couples pick a named theme pack. Agents and partners stay on one shared look.
