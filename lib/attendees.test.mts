import assert from "node:assert/strict"
import test from "node:test"

import { attendanceSummary, resolveAttendance, storedAttendeeIds, toggleMember } from "./attendees.ts"

const family = ["mom", "dad", "connor", "alex"] as const

test("a missing or empty list includes everyone", () => {
  assert.deepEqual(resolveAttendance(undefined, family), {
    everyone: true,
    includedIds: [...family],
  })
  assert.deepEqual(resolveAttendance([], family), {
    everyone: true,
    includedIds: [...family],
  })
  assert.equal(storedAttendeeIds(undefined, family), undefined)
  assert.equal(storedAttendeeIds([], family), undefined)
})

test("a subset is those members, in member order", () => {
  assert.deepEqual(resolveAttendance(["alex", "mom", "alex"], family), {
    everyone: false,
    includedIds: ["mom", "alex"],
  })
  assert.deepEqual(storedAttendeeIds(["alex", "mom"], family), ["mom", "alex"])
})

test("listing every member stores nothing, so the plan stays Everyone", () => {
  assert.equal(storedAttendeeIds(["alex", "dad", "connor", "mom"], family), undefined)
  assert.equal(resolveAttendance(["mom", "dad", "connor", "alex"], family).everyone, true)
})

test("ids that are not on the trip are dropped", () => {
  assert.deepEqual(storedAttendeeIds(["mom", "stranger"], family), ["mom"])
  assert.equal(storedAttendeeIds(["stranger"], family), undefined)
  assert.equal(resolveAttendance(["stranger"], family).everyone, true)
})

test("turning one face off keeps the rest, and the last face stays on", () => {
  assert.deepEqual(toggleMember(undefined, family, "dad"), ["mom", "connor", "alex"])
  assert.deepEqual(toggleMember(["mom"], family, "mom"), ["mom"])
  assert.equal(toggleMember(["mom", "dad", "connor"], family, "alex"), undefined)
})

test("the who's in summary names who is out", () => {
  const members = [
    { userId: "mom", displayName: "Mom Barrett" },
    { userId: "dad", displayName: "Dad Barrett" },
    { userId: "connor", displayName: "Connor" },
    { userId: "alex", displayName: "Alex" },
  ]
  assert.equal(attendanceSummary(members, undefined), "Everyone")
  assert.equal(attendanceSummary(members, ["connor", "alex"]), "2 of 4 · not Mom or Dad")
  assert.equal(
    attendanceSummary(
      [
        ...members,
        { userId: "brenda", displayName: "Brenda" },
      ],
      ["mom", "dad", "connor", "alex"],
    ),
    "4 of 5 · not Brenda",
  )
})

test("the same subset saves to the same ids", () => {
  const once = storedAttendeeIds(["connor", "alex"], family)
  const twice = storedAttendeeIds(once, family)
  assert.deepEqual(twice, ["connor", "alex"])
})
