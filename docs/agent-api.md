# Agent API

HTTP surface for agents and MCP. Auth is a personal API key (`tc_…`).

**Lifetime access ($9.99 once)** is required to create a trip and to read trip data. An update does not check lifetime access. The API key's user must own the trip. Create and trip reads return `402` with a Stripe `paymentUrl` when the user has not paid.

Base URL: `https://<deployment>.convex.site`

`Access-Control-Allow-Methods` is `GET, OPTIONS`.

## Auth

```http
Authorization: Bearer tc_…
```

Create a key (CLI bootstrap; allowed before payment so agents can discover checkout):

```bash
npx convex run agentKeys:createForUser '{"userId":"<users._id>","name":"mcp"}'
```

## Access and payment

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

1. Call `check_access` or `GET /agent/v1/access`
2. If `granted: false`, open or complete `paymentUrl` (Payment Link; `client_reference_id` is the Convex user id)
3. Stripe webhook `POST /stripe/webhook` grants access on `checkout.session.completed`
4. Retry trip reads and `POST /agent/v1/trips`

### Create and trip reads return 402 when unpaid

```json
{
  "error": "payment_required",
  "message": "Lifetime access required ($9.99 once).",
  "paymentUrl": "https://buy.stripe.com/…?client_reference_id=…"
}
```

`PUT /agent/v1/trips/:tripId` does not return this body when the user has not paid.

## Endpoints

### `GET /agent/v1/trips`

Returns `{ trips: Trip[] }` for the key owner (requires access).

### `GET /agent/v1/trips/:tripId`

Returns the trip **bundle** if the key owner is a member; otherwise `404`.

### `POST /agent/v1/trips`

Creates a trip for the API key's user. Requires lifetime access.

The body is exactly these strings:

```json
{
  "name": "Lisbon",
  "startDate": "2026-05-01",
  "endDate": "2026-05-08",
  "displayName": "Ada"
}
```

`displayName` is stored on the owner membership. Dates are stored as given. The website date field sends `YYYY-MM-DD`. The API does not reject an end date before the start date.

Success is `200`:

```json
{ "tripId": "<trips._id>" }
```

A second call creates a second trip. Read it with `GET /agent/v1/trips/:tripId`. A partner who has joined sees that trip on reload and in the bundle.

Errors:

- Invalid JSON is `400` `{ "error": "Invalid JSON." }`.
- An extra key, including `userId`, a missing field, or a non-string value is `400` `{ "error": "Invalid trip fields." }`.
- An empty trimmed name or display name is `400` `{ "error": "Trip name and display name are required." }`.
- An unpaid user gets the `402` body above.

### `PUT /agent/v1/trips/:tripId`

Replaces the trip name, start date, and end date. Send all three. The API key's user must be the owner. This route does not check lifetime access.

The trip id is the last segment of the path. The body is exactly these strings:

```json
{
  "name": "Porto",
  "startDate": "2026-06-01",
  "endDate": "2026-06-04"
}
```

Success is `200` `{ "ok": true }`. The same values twice leave the same name and dates. Both members see the change on reload and in `GET /agent/v1/trips/:tripId`.

Errors:

- A missing id in the path is `400` `{ "error": "tripId required" }`.
- Invalid JSON is `400` `{ "error": "Invalid JSON." }`.
- An extra key, including `tripId` or `userId`, a missing field, or a non-string value is `400` `{ "error": "Invalid trip fields." }`.
- An empty trimmed name is `400` `{ "error": "Trip name is required." }`.
- An editor is `403` `{ "error": "Owner access required" }`.
- A missing trip or a non-member is `404` `{ "error": "Trip not found" }`.

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

See [mcp/travel-calendar/README.md](../mcp/travel-calendar/README.md). Tools are `check_access`, `list_trips`, `get_trip_bundle`, `create_trip`, and `update_trip`.

## Non-goals

- OAuth for third-party apps
- Agents charging users on your behalf (Connect). An agent pays the Payment Link once per account.
