import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import test from "node:test"

process.env.TRAVEL_CALENDAR_SITE_URL = "https://example.convex.site"
process.env.TRAVEL_CALENDAR_API_KEY = "tc_test"

const { createTrip, updateTrip, confirmPending } = await import("./server.mjs")

const directory = fileURLToPath(new URL(".", import.meta.url))
const originalFetch = globalThis.fetch

function envWithoutCredentials() {
  const env = { ...process.env }
  delete env.TRAVEL_CALENDAR_SITE_URL
  delete env.TRAVEL_CALENDAR_API_KEY
  return env
}

function restoreFetch() {
  globalThis.fetch = originalFetch
}

function isHeaderRecord(headers: HeadersInit | undefined): headers is Record<string, string> {
  return headers !== undefined && !(headers instanceof Headers) && !Array.isArray(headers)
}

function jsonBody(body: BodyInit | null | undefined): unknown {
  if (typeof body !== "string") {
    assert.fail("expected a JSON string body")
  }
  return JSON.parse(body)
}

test("importing server.mjs does not exit when the env is unset", () => {
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", "await import('./server.mjs')"],
    {
      cwd: directory,
      env: envWithoutCredentials(),
      encoding: "utf8",
      timeout: 5000,
    },
  )
  assert.equal(result.status, 0, result.stderr)
})

test("the CLI exits when the env is missing", () => {
  const result = spawnSync(process.execPath, ["server.mjs"], {
    cwd: directory,
    env: envWithoutCredentials(),
    encoding: "utf8",
    timeout: 5000,
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /TRAVEL_CALENDAR_SITE_URL/)
})

test("create_trip POSTs /agent/v1/trips with the bearer token and trip fields", async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify({ tripId: "jd7trip" }), { status: 200 })
  }
  try {
    const result = await createTrip({
      host: "grok",
      name: "Lisbon",
      startDate: "2026-05-01",
      endDate: "2026-05-08",
      displayName: "Ada",
      userId: "user_1",
    })
    assert.deepEqual(result, { tripId: "jd7trip" })
    const call = calls[0]
    assert.ok(call)
    const init = call.init
    assert.ok(init)
    assert.equal(call.url, "https://example.convex.site/agent/v1/trips")
    assert.equal(init.method, "POST")
    assert.ok(isHeaderRecord(init.headers))
    assert.equal(init.headers.Authorization, "Bearer tc_test")
    assert.equal(init.headers.Accept, "application/json")
    assert.equal(init.headers["Content-Type"], "application/json")
    assert.equal(init.headers["X-Travel-Calendar-Host"], "grok")
    const body = jsonBody(init.body)
    assert.deepEqual(body, {
      name: "Lisbon",
      startDate: "2026-05-01",
      endDate: "2026-05-08",
      displayName: "Ada",
    })
    assert.ok(body !== null && typeof body === "object")
    assert.equal(Object.hasOwn(body, "userId"), false)
    assert.equal(Object.hasOwn(body, "host"), false)
  } finally {
    restoreFetch()
  }
})

test("update_trip PUTs the encoded trip id and omits tripId and userId", async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }
  try {
    const result = await updateTrip({
      host: "grok",
      tripId: " jd7/abc ",
      name: "Porto",
      startDate: "2026-06-01",
      endDate: "2026-06-04",
      userId: "user_1",
    })
    assert.deepEqual(result, { ok: true })
    const call = calls[0]
    assert.ok(call)
    const init = call.init
    assert.ok(init)
    assert.equal(call.url, "https://example.convex.site/agent/v1/trips/jd7%2Fabc")
    assert.equal(init.method, "PUT")
    assert.ok(isHeaderRecord(init.headers))
    assert.equal(init.headers.Authorization, "Bearer tc_test")
    assert.equal(init.headers["Content-Type"], "application/json")
    assert.equal(init.headers["X-Travel-Calendar-Host"], "grok")
    const body = jsonBody(init.body)
    assert.deepEqual(body, {
      name: "Porto",
      startDate: "2026-06-01",
      endDate: "2026-06-04",
    })
    assert.ok(body !== null && typeof body === "object")
    assert.equal(Object.hasOwn(body, "tripId"), false)
    assert.equal(Object.hasOwn(body, "userId"), false)
    assert.equal(Object.hasOwn(body, "host"), false)
  } finally {
    restoreFetch()
  }
})

test("a 402 payment_required body throws an error that includes the payment URL", async () => {
  const paymentUrl = "https://buy.stripe.com/test?client_reference_id=user_1"
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: "payment_required",
        message: "Lifetime access required ($9.99 once).",
        paymentUrl,
      }),
      { status: 402 },
    )
  try {
    await assert.rejects(
      () =>
        createTrip({
          host: "grok",
          name: "Lisbon",
          startDate: "2026-05-01",
          endDate: "2026-05-08",
          displayName: "Ada",
        }),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.equal(error.message.includes(paymentUrl), true)
        return true
      },
    )
  } finally {
    restoreFetch()
  }
})

test("create_trip throws host_required before fetch when host is missing", async () => {
  let called = false
  globalThis.fetch = async () => {
    called = true
    return new Response("{}", { status: 200 })
  }
  try {
    await assert.rejects(
      () =>
        createTrip({
          name: "Lisbon",
          startDate: "2026-05-01",
          endDate: "2026-05-08",
          displayName: "Ada",
        }),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.equal(error.message, "host_required")
        return true
      },
    )
    assert.equal(called, false)
  } finally {
    restoreFetch()
  }
})

test("update_trip throws host_required before fetch when host is missing", async () => {
  let called = false
  globalThis.fetch = async () => {
    called = true
    return new Response("{}", { status: 200 })
  }
  try {
    await assert.rejects(
      () =>
        updateTrip({
          tripId: "jd7trip",
          name: "Porto",
          startDate: "2026-06-01",
          endDate: "2026-06-04",
        }),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.equal(error.message, "host_required")
        return true
      },
    )
    assert.equal(called, false)
  } finally {
    restoreFetch()
  }
})

test("confirm_pending GETs /agent/v1/confirm/pending with the host header", async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify({ proposals: [] }), { status: 200 })
  }
  try {
    const result = await confirmPending({ host: "grok", userId: "user_1" })
    assert.deepEqual(result, { proposals: [] })
    const call = calls[0]
    assert.ok(call)
    const init = call.init
    assert.ok(init)
    assert.equal(call.url, "https://example.convex.site/agent/v1/confirm/pending")
    assert.equal(init.method, "GET")
    assert.equal(init.body, undefined)
    assert.ok(isHeaderRecord(init.headers))
    assert.equal(init.headers.Authorization, "Bearer tc_test")
    assert.equal(init.headers["X-Travel-Calendar-Host"], "grok")
    assert.equal(init.headers["Content-Type"], undefined)
  } finally {
    restoreFetch()
  }
})
