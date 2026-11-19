# Travel Calendar MCP

MCP server for the Travel Calendar agent HTTP API. One tool list drives list and call. Every tool takes `host`. The server sends it as `X-Travel-Calendar-Host` and does not put it in the JSON body.

- `check_access`
- `list_trips`
- `trips_get`
- `trips_search`
- `trips_join`
- `trips_set_theme_pack`
- `create_trip`
- `update_trip`
- `trips_archive`
- `trips_propose`
- `trips_confirm`
- `trips_reject`
- `items_list`
- `items_get`
- `items_add`
- `items_update`
- `items_remove`
- `items_propose`
- `items_confirm`
- `confirm_pending`
- `gaps_list`
- `gaps_claim`
- `get_trip_bundle`

`gaps_list` reads the trip home: what's next, and the holes (uncovered nights, airport rides, conflicts, empty days, stays that miss the flights). `gaps_claim` writes immediately. A member claims a hole or releases one they hold. One member holds each hole. `get_trip_bundle` includes `gapClaims`.

`trips_join` joins a trip with an invite code and writes the membership immediately. A second call keeps the stored role and display name. `trips_set_theme_pack` sets the trip theme pack, or clears it when `themePack` is null. Any member can set it. Zod in `toolInputs.mjs` checks `host`, a non-empty invite code, and the pack id before fetch. An unknown pack throws `Invalid theme pack.` The HTTP route still checks the pack with `parseThemePack`.

`create_trip`, `update_trip`, `trips_archive`, and `trips_propose` propose a trip change. They do not insert the trip. A second call inserts a second pending row. The trip changes after a different person confirms. `items_add`, `items_update`, `items_remove`, and `items_propose` do the same for items. `confirm_pending` returns each pending row with `row_text` and `glance_url`. `trips_search` filters by date, place, or status (`active` or `archived`). A key with `confirmEnabled` false cannot confirm. `update_trip` and `trips_set_theme_pack` do not check lifetime access. `trips_join` checks it only when the paywall is on. The other tools that read or write do the same.

## 1. Create an API key

In the Convex dashboard, copy your `users` document `_id`, then:

```bash
npx convex run agentKeys:createForUser '{"userId":"YOUR_USER_ID","name":"cursor-mcp"}'
```

Save the returned `key` (`tc_…`). It is shown only once.

## Access

The paywall is off unless Convex `PAYWALL_ENABLED` is exactly `true`. While it is off, reads, proposes, confirm, reject, and `trips_join` do not require a payment. When the flag is on, lifetime access ($9.99 once) is required for those calls except `update_trip` and `trips_set_theme_pack`. Use `check_access` first. If `required` is true and `granted` is false, complete the returned Stripe `paymentUrl`, then retry. A new key is propose-only.

```bash
cd mcp/travel-calendar
pnpm install
```

## 3. Cursor config

Add to your MCP config (path absolute):

```json
{
  "mcpServers": {
    "travel-calendar": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/travel-calendar/mcp/travel-calendar/server.mjs"],
      "env": {
        "TRAVEL_CALENDAR_SITE_URL": "https://determined-anaconda-212.convex.site",
        "TRAVEL_CALENDAR_API_KEY": "tc_…"
      }
    }
  }
}
```

`TRAVEL_CALENDAR_SITE_URL` is the Convex **HTTP** site URL (`*.convex.site`), not the `.convex.cloud` client URL.

## 4. Curl smoke test

```bash
curl -sS -H "Authorization: Bearer tc_…" \
  -H "X-Travel-Calendar-Host: grok" \
  https://determined-anaconda-212.convex.site/agent/v1/trips
```

```bash
curl -sS -H "Authorization: Bearer tc_…" \
  -H "X-Travel-Calendar-Host: grok" \
  -H "Content-Type: application/json" \
  -d '{"name":"Lisbon","startDate":"2026-05-01","endDate":"2026-05-08","displayName":"Ada"}' \
  https://determined-anaconda-212.convex.site/agent/v1/trips
```

```bash
curl -sS -X PUT -H "Authorization: Bearer tc_…" \
  -H "X-Travel-Calendar-Host: grok" \
  -H "Content-Type: application/json" \
  -d '{"name":"Porto","startDate":"2026-06-01","endDate":"2026-06-04"}' \
  https://determined-anaconda-212.convex.site/agent/v1/trips/TRIP_ID
```

```bash
curl -sS -H "Authorization: Bearer tc_…" \
  -H "X-Travel-Calendar-Host: grok" \
  https://determined-anaconda-212.convex.site/agent/v1/confirm/pending
```

```bash
curl -sS -H "Authorization: Bearer tc_…" \
  -H "X-Travel-Calendar-Host: grok" \
  -H "Content-Type: application/json" \
  -d '{"inviteCode":"abc","displayName":"Ada"}' \
  https://determined-anaconda-212.convex.site/agent/v1/join
```

```bash
curl -sS -H "Authorization: Bearer tc_…" \
  -H "X-Travel-Calendar-Host: grok" \
  -H "Content-Type: application/json" \
  -d '{"tripId":"TRIP_ID","themePack":"dusk-rose"}' \
  https://determined-anaconda-212.convex.site/agent/v1/theme
```
