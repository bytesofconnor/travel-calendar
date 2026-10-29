import assert from "node:assert/strict"
import test from "node:test"

import { confirmRowText, glanceUrl, proposalSummary } from "./confirmCopy.ts"

test("glanceUrl uses the production origin and the proposal id", () => {
  assert.equal(
    glanceUrl("jd7proposal"),
    "https://www.travelcalendar.space/?confirm=jd7proposal",
  )
})

test("confirmRowText names who proposed and who owes confirm", () => {
  const summary = proposalSummary({
    target: "item",
    op: "add",
    title: "dinner",
    location: "Lisbon",
  })
  assert.equal(summary, "Add dinner · Lisbon")
  assert.equal(
    confirmRowText({
      summary,
      status: "pending",
      proposedByName: "Ada",
      pendingForName: "Sam",
      confirmedByName: null,
      gate: "named",
    }),
    "Ada proposed Add dinner · Lisbon. Sam still owes confirm.",
  )
})

test("a trip add with no partner yet says a partner still owes confirm", () => {
  const summary = proposalSummary({
    target: "trip",
    op: "add",
    name: "Lisbon",
    startDate: "2026-05-01",
    endDate: "2026-05-08",
  })
  assert.equal(summary, "Add Lisbon · 2026-05-01 to 2026-05-08")
  assert.equal(
    confirmRowText({
      summary,
      status: "pending",
      proposedByName: "Ada",
      pendingForName: null,
      confirmedByName: null,
      gate: "any_other_user",
    }),
    "Ada proposed Add Lisbon · 2026-05-01 to 2026-05-08. A partner still owes confirm.",
  )
})
