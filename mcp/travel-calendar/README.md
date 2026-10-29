# Travel Calendar MCP

MCP server for the Travel Calendar agent HTTP API. One tool list drives list and call. Every tool takes `host`. The server sends it as `X-Travel-Calendar-Host` and does not put it in the JSON body.

- `check_access`
- `list_trips`
- `trips_get`
- `trips_search`
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
- `get_trip_bundle`

`create_trip`, `update_trip`, `trips_archive`, and `trips_propose` propose a trip change. They do not insert the trip. A second call inserts a second pending row. The trip changes after a different person confirms. `items_add`, `items_update`, `items_remove`, and `items_propose` do the same for items. `confirm_pending` returns each pending row with `row_text` and `glance_url`. `trips_search` filters by date, place, or status (`active` or `archived`). A key with `confirmEnabled` false cannot confirm. `update_trip` does not check lifetime access. The other tools that read or write do.

## 1. Create an API key

In the Convex dashboard, copy your `users` document `_id`, then:

```bash
npx convex run agentKeys:createForUser '{"userId":"YOUR_USER_ID","name":"cursor-mcp"}'
```

Save the returned `key` (`tc_…`). It is shown only once.

## Access

Lifetime access ($9.99 once) is required for reads, proposes other than `update_trip`, confirm, and reject. `update_trip` does not check it. Use `check_access` first. If the user has not paid, complete the returned Stripe `paymentUrl`, then retry. A new key is propose-only.

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
