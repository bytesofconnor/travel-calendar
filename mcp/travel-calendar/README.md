# Travel Calendar MCP (sketch)

Read-only MCP server that wraps the agent HTTP API:

- `list_trips`
- `get_trip_bundle`

## 1. Create an API key

In the Convex dashboard, copy your `users` document `_id`, then:

```bash
npx convex run agentKeys:createForUser '{"userId":"YOUR_USER_ID","name":"cursor-mcp"}'
```

Save the returned `key` (`tc_…`) — it is shown only once.

## Access

Lifetime access ($9.99 once) gates trip tools. Use `check_access` first; if unpaid, complete the returned Stripe `paymentUrl`, then retry.

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

Write tools are intentionally out of scope for this sketch.
