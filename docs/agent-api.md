# Agent API

HTTP surface for agents and MCP. Auth is a personal API key (`tc_…`).

Every `/agent/v1` route except `OPTIONS` requires `X-Travel-Calendar-Host`. Trim, lowercase, 1 to 64 characters, matching `/^[a-z0-9][a-z0-9._-]{0,63}$/`. Missing or illegal is `400` `{ "error": "host_required" }`. The header is not a JSON field. `POST /agent/v1/trips` and `PUT /agent/v1/trips/:tripId` keep their locked bodies.

`Access-Control-Allow-Methods` is `GET, POST, PUT, OPTIONS`. `Access-Control-Allow-Headers` includes `Authorization`, `Content-Type`, and `X-Travel-Calendar-Host`.

**Lifetime access ($9.99 once)** is required to propose a trip or item, to confirm or reject, and to read trip data. `PUT /agent/v1/trips/:tripId` does not check lifetime access. The API key's user must own the trip when a name, date, or archive proposal is applied. Reads and paywalled writes return `402` with a Stripe `paymentUrl` when the user has not paid.

A new key has `confirmEnabled: false`. Absent or false is propose-only. `POST /agent/v1/confirm` then returns `403` `{ "error": "propose_scope" }`. The website confirm buttons do not use the key.

Agent writes insert a pending proposal. They do not insert or patch the trip or item. A second propose inserts a second pending row. The shared plan changes when a different person confirms. Confirm and reject of a row that is already confirmed or rejected return that row and do not apply it again.

Base URL: `https://<deployment>.convex.site`

## Auth

```http
Authorization: Bearer tc_…
X-Travel-Calendar-Host: grok
```

Create a key (CLI bootstrap; allowed before payment so agents can discover checkout):

```bash
npx convex run agentKeys:createForUser '{"userId":"<users._id>","name":"mcp"}'
```

## Access and payment

### `GET /agent/v1/access`

Requires the host header. Does not check lifetime access. Returns:

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
4. Retry trip reads and propose calls

### Paywalled routes return 402 when unpaid

```json
{
  "error": "payment_required",
  "message": "Lifetime access required ($9.99 once).",
  "paymentUrl": "https://buy.stripe.com/…?client_reference_id=…"
}
```

`PUT /agent/v1/trips/:tripId` does not return this body when the user has not paid.

## Write response

Propose, confirm, and reject return this object. `glance_url` is set only while `status` is `pending`. It is `https://www.travelcalendar.space/?confirm=<proposalId>`. `pending_for` is the other member who can confirm, or `null` when no partner is named yet. `confirmed_by` is `null` until the row is confirmed. `scope_used` is `propose` on propose, `confirm` on an agent confirm, and `member` on a website confirm or reject.

```json
{
  "proposalId": "<proposals._id>",
  "status": "pending",
  "target": "trip",
  "op": "add",
  "host": "grok",
  "scope_used": "propose",
  "tripId": null,
  "itemId": null,
  "glance_url": "https://www.travelcalendar.space/?confirm=<proposals._id>",
  "summary": "Add Lisbon · 2026-05-01 to 2026-05-08",
  "proposed_by": { "userId": "<users._id>", "displayName": "Ada" },
  "confirmed_by": null,
  "pending_for": null
}
```

`host` on this object is the host stored on the proposal.

## Endpoints

### `GET /agent/v1/trips`

Returns `{ trips: Trip[] }` for the key owner (requires access). Archived trips are omitted. A trip includes `proposedBy` and `confirmedBy` when a confirmed proposal set them.

### `GET /agent/v1/trips/:tripId`

Returns the trip **bundle** if the key owner is a member, including an archived trip; otherwise `404` `{ "error": "Trip not found" }`. The trip and each item include `proposedBy` and `confirmedBy` when present.

### `GET /agent/v1/trip/:tripId`

Returns one trip for a member, including an archived trip. Same `404` when the trip is missing or the caller is not a member.

### `GET /agent/v1/search/trips`

Query `date`, `place`, and `status`. Requires access. `date` is `YYYY-MM-DD` and matches a trip or an item whose range includes that day. `place` matches `location` or `locationTo`, case-insensitive. `status` is `active` or `archived`. Omitted `status` means `active`. No `date`, `place`, or `status` returns `{ "trips": [] }`. Several filters AND. `status=pending` is `400` `{ "error": "status_is_trip_status" }`. A bad date is `400` `{ "error": "Invalid search." }`. Pending proposals are not in the results.

### `POST /agent/v1/trips`

Proposes a new trip for the API key's user. Requires lifetime access. Does not insert the trip.

The body is exactly these strings:

```json
{
  "name": "Lisbon",
  "startDate": "2026-05-01",
  "endDate": "2026-05-08",
  "displayName": "Ada"
}
```

`displayName` is stored for the owner membership and is required again when a different person confirms. Dates are stored as given. The website date field sends `YYYY-MM-DD`. The API does not reject an end date before the start date.

Success is `200` and the write response. A second call inserts a second pending row.

Errors:

- Missing or illegal host is `400` `{ "error": "host_required" }`.
- Invalid JSON is `400` `{ "error": "Invalid JSON." }`.
- An extra key, including `userId` or `host`, a missing field, or a non-string value is `400` `{ "error": "Invalid trip fields." }`.
- An empty trimmed name or display name is `400` `{ "error": "Trip name and display name are required." }`.
- An unpaid user gets the `402` body above.

### `PUT /agent/v1/trips/:tripId`

Proposes replacing the trip name, start date, and end date. Send all three. The API key's user must be an owner when the proposal is applied. This route does not check lifetime access. The trip stays unchanged until a different person confirms.

The trip id is the last segment of the path. The body is exactly these strings:

```json
{
  "name": "Porto",
  "startDate": "2026-06-01",
  "endDate": "2026-06-04"
}
```

Success is `200` and the write response. A second call inserts a second pending row.

Errors:

- Missing or illegal host is `400` `{ "error": "host_required" }`.
- A missing id in the path is `400` `{ "error": "tripId required" }`.
- Invalid JSON is `400` `{ "error": "Invalid JSON." }`.
- An extra key, including `tripId`, `userId`, or `host`, a missing field, or a non-string value is `400` `{ "error": "Invalid trip fields." }`.
- An empty trimmed name is `400` `{ "error": "Trip name is required." }`.
- An editor, at propose or at apply, is `403` `{ "error": "Owner access required" }`. Apply leaves the proposal pending.
- A missing trip or a non-member is `404` `{ "error": "Trip not found" }`.

### `POST /agent/v1/archive`

Proposes archiving a trip. Requires access. Body is exactly `{ "tripId": "<trips._id>" }`. Success is the write response. The trip stays active until a different person confirms.

Errors include `400` `{ "error": "Invalid trip fields." }` for a bad body, `403` `{ "error": "Owner access required" }`, and `404` `{ "error": "Trip not found" }`.

### `POST /agent/v1/items`

Proposes an item add, update, or remove. Requires access. `op` is required.

Add:

```json
{
  "op": "add",
  "tripId": "<trips._id>",
  "title": "Dinner",
  "startDate": "2026-05-02",
  "endDate": "2026-05-02",
  "location": "Lisbon"
}
```

Optional strings on add and update: `notes`, `linkLabel`, `linkUrl`, `locationTo`. Update requires `op`, `itemId`, and the same content fields, and does not take `tripId`. Remove is exactly `{ "op": "remove", "tripId": "<trips._id>", "itemId": "<tripItems._id>" }`.

An extra key, including `itinerary`, is `400` `{ "error": "Invalid item fields." }`. Success is the write response. A second call inserts a second pending row.

### `GET /agent/v1/items?tripId=`

Returns `{ items: Item[] }` for a member. `400` `{ "error": "tripId required" }` when `tripId` is missing. `404` `{ "error": "Trip not found" }` otherwise.

### `GET /agent/v1/item/:itemId`

Returns one item when the caller is a member of its trip. `404` `{ "error": "Item not found" }` otherwise.

### `GET /agent/v1/confirm/pending`

Returns pending proposals this user can see: rows on trips they belong to, rows they proposed, and pending trip adds that have no trip yet. Each row has `proposalId`, `row_text`, `glance_url`, `proposed_by`, `confirmed_by` (`null`), and `pending_for`.

```json
{
  "proposals": [
    {
      "proposalId": "<proposals._id>",
      "row_text": "Ada proposed Add Lisbon · 2026-05-01 to 2026-05-08. A partner still owes confirm.",
      "glance_url": "https://www.travelcalendar.space/?confirm=<proposals._id>",
      "proposed_by": { "userId": "<users._id>", "displayName": "Ada" },
      "confirmed_by": null,
      "pending_for": null
    }
  ]
}
```

### `POST /agent/v1/confirm`

Body is `{ "proposalId": "<proposals._id>", "target": "trip" }` or `"item"`, plus optional `displayName`. Trip add requires `displayName`. Requires access and `confirmEnabled: true`.

Success is the write response. Confirming an already confirmed row returns that row and does not insert again.

Errors:

- Propose-only key: `403` `{ "error": "propose_scope" }`.
- The caller proposed the row: `409` `{ "error": "self_confirm" }`. The row stays pending.
- No other member, except trip add: `409` `{ "error": "no_partner" }`.
- The caller is not the partner who owes confirm: `409` `{ "error": "not_pending_for" }`.
- `target` does not match the row: `409` `{ "error": "wrong_tool" }`.
- The item or trip is gone: `409` `{ "error": "target_missing" }`. The row stays pending.
- Trip add without `displayName`: `400` `{ "error": "display_name_required" }`.
- Unknown id: `404` `{ "error": "Proposal not found" }`.
- A bad body is `400` `{ "error": "Invalid confirm fields." }`.

### `POST /agent/v1/reject`

Body is exactly `{ "proposalId": "<proposals._id>" }`. Requires access. A propose-only key can reject. The proposer can withdraw a pending row. The named partner can reject it. Any different person can reject a pending trip add.

Success is the write response. Rejecting a confirmed row returns the confirmed row and does not undo the shared plan. A bad body is `400` `{ "error": "Invalid reject fields." }`.

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

See [mcp/travel-calendar/README.md](../mcp/travel-calendar/README.md). One registry drives list and call. Every tool requires `host` and sends it as `X-Travel-Calendar-Host`.

Tools: `check_access`, `list_trips`, `trips_get`, `trips_search`, `create_trip`, `update_trip`, `trips_archive`, `trips_propose`, `trips_confirm`, `trips_reject`, `items_list`, `items_get`, `items_add`, `items_update`, `items_remove`, `items_propose`, `items_confirm`, `confirm_pending`, `get_trip_bundle`.

`create_trip`, `update_trip`, `trips_archive`, and `trips_propose` call one trip propose function. `items_add`, `items_update`, `items_remove`, and `items_propose` call one item propose function.

## Non-goals

- OAuth for third-party apps
- Agents charging users on your behalf (Connect). An agent pays the Payment Link once per account.
- A grant screen that turns `confirmEnabled` on. A propose-only key stays propose-only until that field is true.
