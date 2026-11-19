import assert from "node:assert/strict"
import test from "node:test"

import { parseGapClaimBody } from "./gapClaimBody.ts"

test("a claim body keeps the trip, the gap, and the boolean", () => {
  const parsed = parseGapClaimBody({
    tripId: " trips_lisbon ",
    gapId: "night:2027-04-03",
    claimed: true,
  })
  assert.deepEqual(parsed, {
    ok: true,
    value: { tripId: "trips_lisbon", gapId: "night:2027-04-03", claimed: true },
  })
})

test("extra fields, a missing flag, and a wild gap id are rejected", () => {
  assert.equal(parseGapClaimBody({ tripId: "t", gapId: "night:2027-04-03", claimed: true, extra: 1 }).ok, false)
  assert.equal(parseGapClaimBody({ tripId: "t", gapId: "night:2027-04-03", claimed: "true" }).ok, false)
  assert.equal(parseGapClaimBody({ tripId: "t", gapId: "night 3", claimed: true }).ok, false)
  assert.equal(parseGapClaimBody(null).ok, false)
})
