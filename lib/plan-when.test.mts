import assert from "node:assert/strict"
import test from "node:test"

import { describePlanWhen, groupItemsByDay, orderDay, type WhenPlan } from "./plan-when.ts"

function plan(partial: WhenPlan): WhenPlan {
  return partial
}

const flight = plan({
  id: "flight",
  title: "MN to DC",
  startDate: "2027-06-11",
  endDate: "2027-06-11",
  location: "MSP",
  locationTo: "DC",
  planType: "flight",
  startTime: "09:40",
  endTime: "13:15",
})

const stay = plan({
  id: "stay",
  title: "Airbnb",
  startDate: "2027-06-11",
  endDate: "2027-06-14",
  location: "Washington DC",
  planType: "stay",
})

const back = plan({
  id: "back",
  title: "DC to MN",
  startDate: "2027-06-14",
  endDate: "2027-06-14",
  location: "DC",
  locationTo: "MSP",
  planType: "flight",
  startTime: "16:00",
  endTime: "18:10",
})

const lunch = plan({
  id: "lunch",
  title: "Lunch",
  startDate: "2027-06-12",
  endDate: "2027-06-12",
  location: "Washington DC",
  planType: "place",
  startTime: "12:30",
})

const museum = plan({
  id: "museum",
  title: "Museum",
  startDate: "2027-06-12",
  endDate: "2027-06-12",
  location: "Washington DC",
  planType: "place",
})

test("Jun 11 puts the MSP to DC flight before the Washington stay", () => {
  const day = [stay, flight]
  const ordered = orderDay(day, "2027-06-11")
  assert.deepEqual(ordered.map((item) => item.title), ["MN to DC", "Airbnb"])
  assert.equal(describePlanWhen(flight, "2027-06-11", day).label, "9:40 AM → 1:15 PM · Arrive DC")
  assert.equal(
    describePlanWhen(stay, "2027-06-11", day).label,
    "Sleep here tonight · Check-in after arrival",
  )
})

test("a middle night is context at the top and names wake up and sleep", () => {
  const day = [museum, stay, lunch]
  const ordered = orderDay(day, "2027-06-12")
  assert.deepEqual(ordered.map((item) => item.title), ["Airbnb", "Lunch", "Museum"])
  const when = describePlanWhen(stay, "2027-06-12", day)
  assert.equal(when.label, "Wake up here · Sleep here tonight · Night 2 of 3")
  assert.deepEqual(when.parts.map((part) => part.icon ?? "none"), ["sunrise", "moon", "none"])
  assert.equal(describePlanWhen(lunch, "2027-06-12", day).label, "12:30 PM")
  assert.equal(describePlanWhen(museum, "2027-06-12", day).label, "All day")
})

test("a check-in with no arrival that day still says sleep here tonight", () => {
  const alone = [stay]
  assert.equal(describePlanWhen(stay, "2027-06-11", alone).label, "Sleep here tonight · Check-in")
  assert.deepEqual(
    describePlanWhen(stay, "2027-06-14", alone).parts.map((part) => part.icon ?? "none"),
    ["sunrise", "none"],
  )
})

test("check-out is first and the departing flight follows it", () => {
  const day = [back, stay]
  const ordered = orderDay(day, "2027-06-14")
  assert.deepEqual(ordered.map((item) => item.title), ["Airbnb", "DC to MN"])
  assert.equal(describePlanWhen(stay, "2027-06-14", day).label, "Wake up here · Check-out")
  assert.equal(describePlanWhen(back, "2027-06-14", day).label, "4:00 PM → 6:10 PM · Depart DC")
})

test("the list shows the stay on every day it covers", () => {
  const chapters = groupItemsByDay([flight, stay, back])
  assert.deepEqual(chapters.map((chapter) => chapter.date), [
    "2027-06-11",
    "2027-06-12",
    "2027-06-13",
    "2027-06-14",
  ])
  assert.deepEqual(chapters[0]?.items.map((item) => item.id), ["flight", "stay"])
  assert.equal(describePlanWhen(stay, "2027-06-13", chapters[2]?.items ?? []).label, "Wake up here · Sleep here tonight · Night 3 of 3")
  assert.deepEqual(chapters[3]?.items.map((item) => item.id), ["stay", "back"])
})
