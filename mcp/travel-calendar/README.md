# Travel Calendar MCP

MCP server for the Travel Calendar agent HTTP API.

- `check_access`
- `list_trips`
- `get_trip_bundle`
- `create_trip`
- `update_trip`

`create_trip` requires lifetime access and returns `tripId`. `update_trip` replaces the name, start date, and end date. The API key's user must own the trip. Both members see that change on reload and in `get_trip_bundle`.

## 1. Create an API key

In the Convex dashboard, copy your `users` document `_id`, then:

```bash
npx convex run agentKeys:createForUser '{"userId":"YOUR_USER_ID","name":"cursor-mcp"}'
```

Save the returned `key` (`tc_…`). It is shown only once.

## Access

Lifetime access ($9.99 once) is required for `list_trips`, `get_trip_bundle`, and `create_trip`. `update_trip` does not check it. Use `check_access` first. If the user has not paid, complete the returned Stripe `paymentUrl`, then retry.

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
  https://determined-anaconda-212.convex.site/agent/v1/trips
```

```bash
curl -sS -H "Authorization: Bearer tc_…" \
  -H "Content-Type: application/json" \
  -d '{"name":"Lisbon","startDate":"2026-05-01","endDate":"2026-05-08","displayName":"Ada"}' \
  https://determined-anaconda-212.convex.site/agent/v1/trips
```

```bash
curl -sS -X PUT -H "Authorization: Bearer tc_…" \
  -H "Content-Type: application/json" \
  -d '{"name":"Porto","startDate":"2026-06-01","endDate":"2026-06-04"}' \
  https://determined-anaconda-212.convex.site/agent/v1/trips/TRIP_ID
```
