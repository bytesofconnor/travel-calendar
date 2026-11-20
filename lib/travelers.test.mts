import assert from "node:assert/strict"
import test from "node:test"

import {
  addPlanTitle,
  addedPlanMessage,
  inviteCopy,
  travelerAccessibleName,
  travelerFaces,
  travelerLabel,
} from "./travelers.ts"

const you = { userId: "you", displayName: "Connor" }
const caitlin = { userId: "caitlin", displayName: "Caitlin Nguyen" }
const alex = { userId: "alex", displayName: "Alex" }
const sam = { userId: "sam", displayName: "Sam" }
const jordan = { userId: "jordan", displayName: "Jordan" }

function party(count: number) {
  return [you, caitlin, alex, sam, jordan].slice(0, count)
}

test("the header label fits one person, a pair, three people, and a larger group", () => {
  assert.equal(travelerLabel(party(1), "you"), "Just you")
  assert.equal(travelerLabel(party(2), "you"), "you & Caitlin")
  assert.equal(travelerLabel(party(3), "you"), "you & Caitlin & Alex")
  assert.equal(travelerLabel(party(4), "you"), "you + 3 others")
  assert.equal(travelerLabel(party(5), "you"), "you + 4 others")
})

test("the stack names everyone and keeps four faces", () => {
  assert.equal(travelerAccessibleName(party(1), "you"), "1 traveler: you")
  assert.equal(travelerAccessibleName(party(5), "you"), "5 travelers: you, Caitlin, Alex, Sam, Jordan")
  assert.equal(travelerFaces(party(5), "you").shown.length, 4)
  assert.equal(travelerFaces(party(5), "you").extra, 1)
  assert.equal(travelerFaces(party(3), "you").extra, 0)
})

test("add names everyone, or the people who are in", () => {
  const members = party(4)
  assert.equal(addPlanTitle(undefined, members), "Add for everyone")
  assert.equal(addPlanTitle(["you", "caitlin"], members), "Add for Connor and Caitlin Nguyen")
  assert.equal(addedPlanMessage(["you", "alex"], members), "Added for Connor and Alex.")
  assert.equal(addedPlanMessage(undefined, members), "Added for everyone.")
})

test("invite speaks to a group", () => {
  assert.equal(inviteCopy("Vietnam '27", party(1), "you").title, "Invite the people you're traveling with")
  const group = inviteCopy("Vietnam '27", party(5), "you")
  assert.equal(group.title, "Invite someone else")
  assert.match(group.description, /Caitlin, Alex, Sam, and Jordan are already on this trip/)
  assert.match(group.description, /Vietnam '27/)
  assert.doesNotMatch(`${group.title} ${group.description}`, /partner|heartbeat|both of you/i)
})
