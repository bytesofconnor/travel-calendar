# Agent API (read-only, paywalled)

Thin HTTP surface for agents / MCP. Auth is a personal API key (`tc_…`).  
**Lifetime access ($9.99 once)** is required for trip data. Unpaid keys get `402` with a Stripe `paymentUrl` agents can complete.

Base URL: `https://<deployment>.convex.site`

## Auth

```http
Authorization: Bearer tc_…
```

Create a key (CLI bootstrap; allowed before payment so agents can discover checkout):

```bash
npx convex run agentKeys:createForUser '{"userId":"<users._id>","name":"mcp"}'
```

## Access / payment

### `GET /agent/v1/access`

Returns:

```json
{
  "required": true,
  "granted": false,
  "paymentUrl": "https://buy.stripe.com/…?client_reference_id=<userId>",
  "price": { "amount": 9.99, "currency": "usd", "interval": "once" }
}
```

Agent flow:

1. Call `check_access` / `GET /agent/v1/access`
2. If `granted: false`, open or complete `paymentUrl` (Payment Link; `client_reference_id` is the Convex user id)
3. Stripe webhook `POST /stripe/webhook` grants access on `checkout.session.completed`
4. Retry trip reads

### Trip reads → `402` when unpaid

```json
{
  "error": "payment_required",
  "message": "Lifetime access required ($9.99 once).",
  "paymentUrl": "https://buy.stripe.com/…?client_reference_id=…"
}
```

## Endpoints

### `GET /agent/v1/trips`

Returns `{ trips: Trip[] }` for the key owner (requires access).

### `GET /agent/v1/trips/:tripId`

Returns the trip **bundle** if the key owner is a member; otherwise `404`.

## Enable paywall (Convex + Next)

```bash
# Same Payment Link base URL (no client_reference_id in the env value)
npx convex env set STRIPE_PAYMENT_LINK "https://buy.stripe.com/…"
npx convex env set STRIPE_WEBHOOK_SECRET "whsec_…"
# optional invite codes
npx convex env set BYPASS_CODES "FRIENDS,BETA"
```

Next `.env.local`:

```
NEXT_PUBLIC_STRIPE_PAYMENT_LINK=https://buy.stripe.com/…
```

Stripe Dashboard webhook endpoint:

`https://<deployment>.convex.site/stripe/webhook`  
Event: `checkout.session.completed`

When `STRIPE_PAYMENT_LINK` is **unset** on Convex, access checks are off (local free mode).

## MCP

See [mcp/travel-calendar/README.md](../mcp/travel-calendar/README.md) — tools include `check_access`, `list_trips`, `get_trip_bundle`.

## Non-goals (this sketch)

- Write / mutate endpoints
- OAuth for third-party apps
- Agents charging users on your behalf (Connect) — agents pay your Payment Link once per account
