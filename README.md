# Travel Calendar

Shared trip calendar for couples and travel partners — **one trip, two people, always in sync.**

Backend is **Convex** only (Auth + database + realtime).

Product niche and trip-workspace IA: [docs/together-story-spec.md](docs/together-story-spec.md) (§0 Niche brief).

## Local development

Always use this URL:

**http://localhost:59316**

```bash
# Terminal A — Convex
pnpm dev:convex

# Terminal B — Next.js (port 59316 is fixed in package.json)
pnpm dev
```

Or both: `pnpm dev:all`

Do not use port 3000. Google OAuth, Convex `SITE_URL`, and local scripts all assume **59316**.

See [docs/convex-migration-plan.md](docs/convex-migration-plan.md) for cutover history and prior stack notes.

## Design system

Authenticated UI uses the light paper/ink system documented in [docs/design-system.md](docs/design-system.md) (`components/ui` + `components/ds`).

## Agent / MCP (read-only sketch)

HTTP + MCP tools to list trips and load a trip bundle. See [docs/agent-api.md](docs/agent-api.md) and [mcp/travel-calendar/README.md](mcp/travel-calendar/README.md).
