import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { realpathSync } from "node:fs"
import test from "node:test"

import { oauthRedirectTo } from "./oauth-redirect.ts"

const SITE = "https://www.travelcalendar.space"
const INVITE = "ab12cd34ef56"
const INVITE_URL = `${SITE}/?join=${INVITE}`

type Redirects = {
  redirectAbsoluteUrl: (
    config: object,
    params: { redirectTo?: string },
  ) => Promise<string>
  setURLSearchParam: (absoluteUrl: string, param: string, value: string) => string
}

type RedirectCookie = {
  name: string
  value: string
  options: object
}

type Cookies = {
  redirectToParamCookie: (providerId: string, redirectTo: string) => RedirectCookie
}

type CookieLib = {
  parse: (header: string) => Record<string, string | undefined>
  serialize: (name: string, value: string, options?: object) => string
}

const require = createRequire(
  realpathSync(new URL("../node_modules/@convex-dev/auth/dist/server/cookies.js", import.meta.url)),
)

async function returnUrlAfterGoogle(redirectTo: string | undefined) {
  const previousSite = process.env.SITE_URL
  const previousConvexSite = process.env.CONVEX_SITE_URL
  process.env.SITE_URL = SITE
  process.env.CONVEX_SITE_URL = "https://bright-mouse-917.convex.site"
  try {
    const redirects = (await import(
      new URL("../node_modules/@convex-dev/auth/dist/server/implementation/redirects.js", import.meta.url).href
    )) as Redirects
    let carried = redirectTo
    if (redirectTo !== undefined) {
      const signin = new URL("https://bright-mouse-917.convex.site/api/auth/signin/google")
      signin.searchParams.set("redirectTo", redirectTo)
      const fromQuery = signin.searchParams.get("redirectTo")
      assert.equal(fromQuery, redirectTo)
      const cookies = (await import(
        new URL("../node_modules/@convex-dev/auth/dist/server/cookies.js", import.meta.url).href
      )) as Cookies
      const baked = cookies.redirectToParamCookie("google", fromQuery ?? "")
      const cookie = require("cookie") as CookieLib
      const pair = cookie.serialize(baked.name, baked.value, baked.options).split(";")[0] ?? ""
      carried = cookie.parse(pair)[baked.name]
    }
    const destination = await redirects.redirectAbsoluteUrl({}, { redirectTo: carried })
    const withCode = redirects.setURLSearchParam(destination, "code", "verifier")
    const back = new URL(withCode)
    back.searchParams.delete("code")
    return back
  } finally {
    if (previousSite === undefined) delete process.env.SITE_URL
    else process.env.SITE_URL = previousSite
    if (previousConvexSite === undefined) delete process.env.CONVEX_SITE_URL
    else process.env.CONVEX_SITE_URL = previousConvexSite
  }
}

test("an invite link returns to SITE_URL with join after Google", async () => {
  const back = await returnUrlAfterGoogle(oauthRedirectTo(INVITE_URL))
  assert.equal(back.origin, SITE)
  assert.equal(back.pathname, "/")
  assert.equal(back.searchParams.get("join"), INVITE)
  assert.equal(back.searchParams.get("code"), null)
})

test("oauthRedirectTo keeps join and drops a stale auth code", () => {
  assert.equal(
    oauthRedirectTo(`${INVITE_URL}&code=stale`),
    `/?join=${INVITE}`,
  )
})

test("a sign-in with no redirectTo drops join", async () => {
  const back = await returnUrlAfterGoogle(undefined)
  assert.equal(back.searchParams.get("join"), null)
})
