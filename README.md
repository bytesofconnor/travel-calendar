# Travel Calendar

Shared trip calendar for couples and travel partners. One trip, two people, always in sync.

Production: **https://www.travelcalendar.space**

Backend is Convex (Auth, database, and realtime). The package manager is pnpm.

## Local development

Node.js 22. Dev server: **http://localhost:59316** (do not use port 3000).

```bash
pnpm install
pnpm dev:convex   # terminal A
pnpm dev          # terminal B
```

Or both: `pnpm dev:all`.

Copy [`.env.example`](.env.example) to `.env.local` and set `NEXT_PUBLIC_CONVEX_URL` (and `NEXT_PUBLIC_CONVEX_SITE_URL`) from `npx convex dev`. Convex deployment env, not Next env, holds `SITE_URL`, Google OAuth, and the Resend OTP key. Local `SITE_URL` is `http://localhost:59316`. Production `SITE_URL` is `https://www.travelcalendar.space`.

## Checks

`pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test:smoke`.

Pull requests use `.github/pull_request_template.md` (**Summary**, **Verification**, **Blast Radius**). CI job `checks` runs those commands plus a frozen `pnpm install` at the repo root and in `mcp/travel-calendar`. Same-repo PRs squash-merge after `checks` passes. Forks stay manual.

## Deploy

Convex production deploys from `main` when `convex/**` changes (`.github/workflows/convex-deploy.yml`, secret `CONVEX_DEPLOY_KEY`).

Vercel project `travelcalendar.space` builds the Next app. `scripts/vercel-ignore-build.sh` skips preview builds for `dependabot/` and `cursor/` branches, and skips a build when the commit does not change the app. `ourcalendar.space` and `www.ourcalendar.space` 308 to https://www.travelcalendar.space and keep the path and query.

## MCP

Trip and item tools live in [`mcp/travel-calendar`](mcp/travel-calendar/README.md). Every call sends `host` as `X-Travel-Calendar-Host`. `create_trip`, `update_trip`, and the item write tools propose a change. A different person confirms it before it becomes the shared plan. `trips_join` and `trips_set_theme_pack` write immediately. `confirm_pending` returns a glance link. `trips_search` filters by date, place, or status. A propose-only key cannot confirm.

Tools: `check_access`, `list_trips`, `trips_get`, `trips_search`, `trips_join`, `trips_set_theme_pack`, `create_trip`, `update_trip`, `trips_archive`, `trips_propose`, `trips_confirm`, `trips_reject`, `items_list`, `items_get`, `items_add`, `items_update`, `items_remove`, `items_propose`, `items_confirm`, `confirm_pending`, `get_trip_bundle`.

That package pins the same pnpm as the root (`packageManager`) and has its own lockfile.
