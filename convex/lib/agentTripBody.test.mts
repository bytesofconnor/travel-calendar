import assert from "node:assert/strict"
import test from "node:test"

import { parseCreateBody, parseUpdateBody } from "./agentTripBody.ts"

const createValue = {
  name: "Lisbon",
  startDate: "2026-05-01",
  endDate: "2026-05-08",
  displayName: "Ada",
}

const updateValue = {
  name: "Porto",
  startDate: "2026-06-01",
  endDate: "2026-06-04",
}

const invalid = { ok: false, error: "Invalid trip fields." }

test("parseCreateBody accepts exactly the four strings", () => {
  assert.deepEqual(parseCreateBody(createValue), { ok: true, value: createValue })
})

test("parseCreateBody accepts empty strings", () => {
  const value = { name: "", startDate: "", endDate: "", displayName: "" }
  assert.deepEqual(parseCreateBody(value), { ok: true, value })
})

test("parseCreateBody rejects extra keys, including userId", () => {
  assert.deepEqual(parseCreateBody({ ...createValue, userId: "user_1" }), invalid)
  assert.deepEqual(parseCreateBody({ ...createValue, tripId: "trip_1" }), invalid)
})

test("parseCreateBody rejects missing fields", () => {
  assert.deepEqual(
    parseCreateBody({
      name: createValue.name,
      startDate: createValue.startDate,
      endDate: createValue.endDate,
    }),
    invalid,
  )
  assert.deepEqual(parseCreateBody({}), invalid)
})

test("parseCreateBody rejects non-strings", () => {
  assert.deepEqual(parseCreateBody({ ...createValue, name: 1 }), invalid)
  assert.deepEqual(parseCreateBody({ ...createValue, startDate: null }), invalid)
  assert.deepEqual(parseCreateBody({ ...createValue, displayName: { text: "Ada" } }), invalid)
  assert.deepEqual(parseCreateBody(null), invalid)
  assert.deepEqual(parseCreateBody([createValue]), invalid)
  assert.deepEqual(parseCreateBody("Lisbon"), invalid)
})

test("parseUpdateBody accepts exactly the three strings", () => {
  assert.deepEqual(parseUpdateBody(updateValue), { ok: true, value: updateValue })
})

test("parseUpdateBody accepts empty strings", () => {
  const value = { name: "", startDate: "", endDate: "" }
  assert.deepEqual(parseUpdateBody(value), { ok: true, value })
})

test("parseUpdateBody rejects extra keys, including userId and tripId", () => {
  assert.deepEqual(parseUpdateBody({ ...updateValue, userId: "user_1" }), invalid)
  assert.deepEqual(parseUpdateBody({ ...updateValue, tripId: "trip_1" }), invalid)
  assert.deepEqual(parseUpdateBody({ ...updateValue, displayName: "Ada" }), invalid)
})

test("parseUpdateBody rejects missing fields", () => {
  assert.deepEqual(
    parseUpdateBody({
      name: updateValue.name,
      startDate: updateValue.startDate,
    }),
    invalid,
  )
})

test("parseUpdateBody rejects non-strings", () => {
  assert.deepEqual(parseUpdateBody({ ...updateValue, name: false }), invalid)
  assert.deepEqual(parseUpdateBody({ ...updateValue, endDate: 20260604 }), invalid)
  assert.deepEqual(parseUpdateBody(undefined), invalid)
  assert.deepEqual(parseUpdateBody([]), invalid)
})
