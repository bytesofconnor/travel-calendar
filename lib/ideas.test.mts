import assert from "node:assert/strict"
import test from "node:test"

import { goIdsForDay, ideaFromNote, openIdeas, plansWithoutNotes } from "./ideas.ts"

const note = {
  id: "item_note",
  title: "Night market",
  linkUrl: "https://example.com/market",
  createdBy: "user_connor",
  startDate: "2027-06-20",
  planType: "note" as const,
}

test("a dated note becomes an open idea and keeps its date", () => {
  const idea = ideaFromNote(note)
  assert.ok(idea)
  assert.equal(idea.status, "open")
  assert.equal(idea.text, "Night market")
  assert.equal(idea.suggestedDate, "2027-06-20")
  assert.equal(idea.suggestedBy, "user_connor")
  assert.equal(idea.linkUrl, "https://example.com/market")
  assert.equal(idea.sourceItemId, "item_note")
  assert.deepEqual(idea.goUserIds, [])
  assert.equal(ideaFromNote({ ...note, planType: "place" }), null)
})

test("open ideas hide a note once it has been copied, and drop placed ideas", () => {
  const stored = [
    {
      id: "idea_open",
      text: "Ha Long overnight cruise",
      suggestedBy: "user_connor",
      goUserIds: ["user_caitlin"],
      status: "open" as const,
    },
    {
      id: "idea_done",
      text: "Cooking class",
      suggestedBy: "user_connor",
      goUserIds: [],
      status: "placed" as const,
      sourceItemId: "item_note",
    },
  ]
  const open = openIdeas(stored, [note])
  assert.deepEqual(
    open.map((idea) => idea.text),
    ["Ha Long overnight cruise"],
  )
})

test("putting an idea on a day checks the people who would go, plus the person placing it", () => {
  const members = ["user_connor", "user_caitlin", "user_alex"]
  assert.deepEqual(goIdsForDay(["user_caitlin"], "user_connor", members), ["user_caitlin", "user_connor"])
  assert.deepEqual(goIdsForDay(["user_caitlin", "user_connor"], "user_caitlin", members), [
    "user_caitlin",
    "user_connor",
  ])
  assert.deepEqual(goIdsForDay(["user_stranger"], "user_connor", members), ["user_connor"])
})

test("note plans leave the calendar list", () => {
  const items = [
    { id: "stay", planType: "stay" },
    { id: "note", planType: "note" },
    { id: "place", planType: "place" },
  ]
  assert.deepEqual(
    plansWithoutNotes(items).map((item) => item.id),
    ["stay", "place"],
  )
})
