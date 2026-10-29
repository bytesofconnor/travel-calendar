import assert from "node:assert/strict"
import test from "node:test"

import { parseArchiveBody, parseConfirmBody, parseItemBody, parseRejectBody } from "./agentProposalBody.ts"

const addValue = {
  op: "add",
  tripId: "trip_lisbon",
  title: "Time Out Market",
  startDate: "2026-05-02",
  endDate: "2026-05-02",
  location: "Lisbon",
}

test("parseItemBody accepts an item add and optional fields", () => {
  assert.deepEqual(parseItemBody(addValue), { ok: true, value: addValue })
  assert.deepEqual(parseItemBody({ ...addValue, notes: "late" }), {
    ok: true,
    value: { ...addValue, notes: "late" },
  })
})

test("parseItemBody rejects an extra key such as itinerary", () => {
  assert.deepEqual(parseItemBody({ ...addValue, itinerary: "walk around" }), {
    ok: false,
    error: "Invalid item fields.",
  })
})

test("parseItemBody keeps update and remove exact", () => {
  const updateValue = {
    op: "update",
    itemId: "item_market",
    title: "Time Out Market",
    startDate: "2026-05-02",
    endDate: "2026-05-02",
    location: "Lisbon",
  }
  assert.deepEqual(parseItemBody(updateValue), { ok: true, value: updateValue })
  assert.deepEqual(parseItemBody({ ...updateValue, tripId: "trip_lisbon" }), {
    ok: false,
    error: "Invalid item fields.",
  })
  const removeValue = { op: "remove", tripId: "trip_lisbon", itemId: "item_market" }
  assert.deepEqual(parseItemBody(removeValue), { ok: true, value: removeValue })
  assert.deepEqual(parseItemBody({ ...removeValue, title: "Time Out Market" }), {
    ok: false,
    error: "Invalid item fields.",
  })
})

test("archive, confirm, and reject bodies stay exact", () => {
  assert.deepEqual(parseArchiveBody({ tripId: "trip_lisbon" }), {
    ok: true,
    value: { tripId: "trip_lisbon" },
  })
  assert.deepEqual(parseArchiveBody({ tripId: "trip_lisbon", host: "grok" }), {
    ok: false,
    error: "Invalid trip fields.",
  })
  assert.deepEqual(parseConfirmBody({ proposalId: "jd7proposal", target: "trip", displayName: "Sam" }), {
    ok: true,
    value: { proposalId: "jd7proposal", target: "trip", displayName: "Sam" },
  })
  assert.deepEqual(parseConfirmBody({ proposalId: "jd7proposal", target: "item" }), {
    ok: true,
    value: { proposalId: "jd7proposal", target: "item" },
  })
  assert.deepEqual(parseConfirmBody({ proposalId: "jd7proposal", target: "note" }), {
    ok: false,
    error: "Invalid confirm fields.",
  })
  assert.deepEqual(parseRejectBody({ proposalId: "jd7item" }), {
    ok: true,
    value: { proposalId: "jd7item" },
  })
  assert.deepEqual(parseRejectBody({ proposalId: "jd7item", target: "item" }), {
    ok: false,
    error: "Invalid reject fields.",
  })
})
