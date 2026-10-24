<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

For non-trivial tasks, work under `/poteto-mode` and use the model mapping in `.cursor/rules/pstack-models.mdc`.

## App

Travel Calendar is Next.js 16, React 19, TypeScript, Tailwind 4, and shadcn. The package manager is pnpm 10. Local dev is http://localhost:59316 (`pnpm dev`). Do not use port 3000. Convex is auth, database, and realtime (`pnpm dev:convex`, or both with `pnpm dev:all`). Google OAuth, Convex `SITE_URL`, and local scripts assume **59316**.

The canonical production origin is https://www.travelcalendar.space. Apex `travelcalendar.space` redirects to www. `ourcalendar.space` and `www.ourcalendar.space` 308-redirect to https://www.travelcalendar.space and keep the path and query (`vercel.json` host redirects; `www.ourcalendar.space` is also a Vercel domain redirect). `v0-travel-calendar.vercel.app` still serves this deployment.

Convex Auth (Google OAuth and Resend email OTP) returns the browser to the Convex deployment's `SITE_URL`. Production `SITE_URL` must be `https://www.travelcalendar.space`. Local `SITE_URL` stays `http://localhost:59316`. The Google redirect URI stays on the Convex HTTP actions host (`https://<deployment>.convex.site/api/auth/callback/google`), not on the app domain. Email OTP is a code, not a link; the Resend sender domain is the apex `travelcalendar.space`.

## CI and pull requests

PRs against `main` use `.github/pull_request_template.md` (**Summary**, **Verification**, and **Blast Radius**). PR bodies need those headings (checked in CI; Dependabot exempt). Mark `CI / checks` required: lint (`eslint .`), `pnpm typecheck`, `pnpm build`, and Playwright smoke on `/` (login screen), `/privacy`, and `/terms` at 1280×800 and 390×844. Do not skip tests or disable lint to go green. Same-repo PRs squash-merge after `CI / checks`. That includes Cursor `cursor/*` branches, bot and cloud-agent PRs, every Dependabot update (patch, minor, major, and GitHub Actions), and PRs that change `.github/**`, `.cursor/rules/**`, or `AGENTS.md`. Forks stay manual. Convex deploys from `main` when `convex/**` changes (`CONVEX_DEPLOY_KEY`), including after a `GITHUB_TOKEN` squash. Those merges do not start `push` workflows.

## Vercel builds

Hobby builds are limited. `vercel.json` runs `bash scripts/vercel-ignore-build.sh` from the repository root. Exit 0 skips the build. Exit 1 runs it.

Skip preview builds whose branch starts with `dependabot/` or `cursor/`. A production build still runs, including on those branch names, when the commit changes the app. Skip the build when the commit does not change the app root. If the parent commit is missing, the build runs.

Dependabot opens one grouped npm pull request covering `/` and `/mcp/travel-calendar`, and one GitHub Actions pull request, each week. Those groups include major updates. Root and `mcp/travel-calendar` both pin `packageManager` to pnpm 10.32.1 so Dependabot rewrites each lockfile with that pnpm. A Dependabot branch that is behind `main` can still text-merge `pnpm-lock.yaml` into duplicated mapping keys without a git conflict; rebase it instead of merging the stale lockfile.

## Roadmap

Before product work, read `ROADMAP.md`.

The same pull request that ships, starts, or drops a roadmap item updates that file. Bump `Updated`. When an item ships, move it from Open to Shipped with the date and the pull request link. When an item is dropped, move it to Not doing with a one-line reason. Renumber Open so the ranks stay contiguous from 1.

A chat or a wording change that changes priority also lands in a pull request. It squash-merges when `checks` passes.

Dependabot, and a pure infra or docs pull request that does not change product direction, leave the Open list alone. Bump `Updated` only when that pull request edits `ROADMAP.md`.

Mark an item Shipped only when its check is met. Do not invent progress.
