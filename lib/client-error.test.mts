import assert from "node:assert/strict"
import test from "node:test"

import { isConvexClientError, publicError } from "./client-error.ts"

test("raw Convex client errors become the fallback", () => {
  const raw = "[CONVEX M(items:create)] [Request ID: b96871f2522b4f18] Server Error Called by client"
  const shown: string[] = []
  const original = console.error
  console.error = (...args: unknown[]) => {
    shown.push(args.map(String).join(" "))
  }
  try {
    assert.equal(publicError(new Error(raw), "Couldn't save that plan. Try again."), "Couldn't save that plan. Try again.")
  } finally {
    console.error = original
  }
  assert.equal(shown.length, 1)
  assert.match(shown[0] ?? "", /b96871f2522b4f18/)
  assert.equal(isConvexClientError(raw), true)
})

test("app sentences stay visible", () => {
  assert.equal(publicError(new Error("Invite code not found."), "Invite code not found."), "Invite code not found.")
  assert.equal(publicError("nope", "Unable to save notes."), "Unable to save notes.")
})
