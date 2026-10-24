# Travel Calendar Roadmap

Updated: 2026-10-24 · Owner: Travel Calendar · North star: The easiest shared travel calendar to customize by intent, an agent-native system of record for couples that meets each partner wherever they talk to their AI.

Say "what's good near X," book it, and it lands on the trip both people see. This is the system of record for every trip a couple takes, built for how travel planning works with robots in 2035. Humans set intent. Agents read and write the shared calendar as the source of truth. It is not a chat product. Distribution meets both people wherever they already talk to their AI, including Meta Muse, Messenger-style AI surfaces, ChatGPT, Claude, and MCP hosts, so either partner can change the same trip from their preferred agent.

## Open (ranked)

1. **Standing live discovery on https://www.travelcalendar.space.** Before other product work, run a signed-in pass and a signed-out pass on the live app, file each failure as an Open item, and verify that same path after the fix. Check: on https://www.travelcalendar.space, signed out, the landing shows Continue with Google, and a completed Google sign-in returns the browser to https://www.travelcalendar.space.
2. **Auth email OTP from a travelcalendar.space sender.** `convex/ResendOTP.ts` sends from `onboarding@resend.dev`, and the login screen is mounted with `emailAuthEnabled={false}`. Check: a fresh email OTP arrives from an address at travelcalendar.space.
3. **Partner invite and join.** The other person can open the shared trip without a support loop. The invite link is `/?join=<code>`. Check: that link, or the invite code on the login screen, lands the partner on the shared trip while signed in.
4. **Trip create, edit, and share stay consistent.** Both people see the same dates and places after a change. Check: create a trip, edit the dates or the place, and a second account or a reload shows the same values.
5. **Stripe paywall matches the UI.** Access is required only when `STRIPE_PAYMENT_LINK` is set on Convex. The paywall is the lifetime screen ($9.99 once) when access is required and not granted. Check: when the UI says paid or unlocked, the server allows the gated action, and when the UI says locked, the server does not.

## Shipped

- **CI, auto-merge, Dependabot, AGENTS.md, Playwright smoke, and Convex deploy.** 2026-10-23. [PR #5](https://github.com/bytesofconnor/travel-calendar/pull/5), [2546d92](https://github.com/bytesofconnor/travel-calendar/commit/2546d92a920d8f0ea9396fb4d62a29b0cc42be74).
- **Canonical domain www.travelcalendar.space.** 2026-10-23, same pull request. `vercel.json` 308-redirects `ourcalendar.space` and `www.ourcalendar.space` to https://www.travelcalendar.space and keeps the path and query. Apex `travelcalendar.space` redirects to www. `v0-travel-calendar.vercel.app` still serves this deployment. `heymara.app` is not a host redirect in this repo.
- **Next 16.4.3, ESLint 10, and TypeScript 6.** 2026-10-23. [PR #10](https://github.com/bytesofconnor/travel-calendar/pull/10), [ae206f3](https://github.com/bytesofconnor/travel-calendar/commit/ae206f38ebcf9fae0807a8a9163bc7ce3c321f26). Also on main: Zod 4 in [PR #7](https://github.com/bytesofconnor/travel-calendar/pull/7), PostCSS 8.5.23 in [PR #6](https://github.com/bytesofconnor/travel-calendar/pull/6), and the MCP SDK bump in [PR #12](https://github.com/bytesofconnor/travel-calendar/pull/12).

## Later

- First-class agent surfaces, including MCP, Meta Muse, and other AI hosts, so nearby, then reserve, then add to the trip works from either partner's assistant.
- Further React majors, and the next TypeScript major, stay deferred while the Open checks are still open. TypeScript 6 is already on main.
- Growth bets and a feature wishlist wait until those checks are green.

## Not doing

- A different-backend rewrite. The current Convex app is the product.
- A multi-trip team product before couple and partner flows work.
