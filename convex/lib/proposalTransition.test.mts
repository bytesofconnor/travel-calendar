import assert from "node:assert/strict"
import test from "node:test"

import {
  asHost,
  asItemId,
  asProposalId,
  asTripId,
  asUserId,
  authorizeConfirm,
  decideConfirm,
  decideReject,
  isUnmemberedTripAdd,
  markConfirmed,
  parseHost,
  pendingFrom,
  toWriteResponse,
  type ConfirmActor,
  type ItemFields,
  type Member,
  type PendingProposal,
} from "./proposalTransition.ts"

const ada = asUserId("user_ada")
const sam = asUserId("user_sam")
const jo = asUserId("user_jo")
const host = asHost("grok")
const tripId = asTripId("trip_lisbon")
const itemId = asItemId("item_market")
const proposalId = asProposalId("jd7proposal")

const dinner: ItemFields = {
  title: "Time Out Market",
  startDate: "2026-05-02",
  endDate: "2026-05-02",
  location: "Lisbon",
}

function member(userId: typeof ada, role: Member["role"], displayName: string, joinedAt: number): Member {
  return { userId, role, displayName, joinedAt }
}

function tripAdd(): PendingProposal {
  return pendingFrom({
    proposalId,
    proposedBy: ada,
    host,
    summary: "Add Lisbon · 2026-05-01 to 2026-05-08",
    body: {
      target: "trip",
      op: "add",
      tripId: null,
      itemId: null,
      schedule: { name: "Lisbon", startDate: "2026-05-01", endDate: "2026-05-08" },
      ownerDisplayName: "Ada",
    },
  })
}

function itemAdd(): PendingProposal {
  return pendingFrom({
    proposalId: asProposalId("jd7item"),
    proposedBy: ada,
    host,
    summary: "Add Time Out Market · Lisbon",
    body: {
      target: "item",
      op: "add",
      tripId,
      itemId: null,
      fields: dinner,
    },
  })
}

function confirmActor(userId: typeof ada): ConfirmActor {
  const authorized = authorizeConfirm({
    kind: "agent",
    userId,
    host: asHost("claude"),
    confirmEnabled: true,
  })
  assert.equal(authorized.ok, true)
  if (!authorized.ok) {
    throw new Error("expected a confirm actor")
  }
  return authorized.actor
}

test("a propose-only key is not a confirm actor", () => {
  const denied = authorizeConfirm({
    kind: "agent",
    userId: sam,
    host,
    confirmEnabled: false,
  })
  assert.deepEqual(denied, { ok: false, error: "propose_scope" })
  const missing = authorizeConfirm({
    kind: "agent",
    userId: sam,
    host,
    confirmEnabled: false,
  })
  assert.equal(missing.ok, false)
  assert.equal(authorizeConfirm({ kind: "member", userId: sam }).ok, true)
})

test("self-confirm leaves the row pending", () => {
  const pending = tripAdd()
  const result = decideConfirm(pending, confirmActor(ada), "trip", [], true, true, "Ada")
  assert.equal(result.kind, "deny")
  if (result.kind !== "deny") {
    return
  }
  assert.equal(result.error, "self_confirm")
  assert.equal(result.proposal.status, "pending")
  assert.equal(result.proposal.proposalId, pending.proposalId)
  assert.equal("effect" in result, false)
})

test("trip add applies for a different confirm actor and requires a display name", () => {
  const pending = tripAdd()
  const missing = decideConfirm(pending, confirmActor(sam), "trip", [], false, false, "  ")
  assert.equal(missing.kind, "deny")
  if (missing.kind === "deny") {
    assert.equal(missing.error, "display_name_required")
    assert.equal(missing.proposal.status, "pending")
  }
  const result = decideConfirm(pending, confirmActor(sam), "trip", [], false, false, " Sam ")
  assert.equal(result.kind, "apply")
  if (result.kind !== "apply") {
    return
  }
  assert.deepEqual(result.effect, {
    op: "trip.add",
    proposerId: ada,
    schedule: { name: "Lisbon", startDate: "2026-05-01", endDate: "2026-05-08" },
    ownerDisplayName: "Ada",
    confirmer: { userId: sam, displayName: "Sam" },
  })
  assert.equal(result.confirmedBy, sam)
})

test("a solo item stays pending with no_partner", () => {
  const pending = itemAdd()
  const members = [member(ada, "owner", "Ada", 1)]
  const result = decideConfirm(pending, confirmActor(sam), "item", members, true, true, null)
  assert.equal(result.kind, "deny")
  if (result.kind !== "deny") {
    return
  }
  assert.equal(result.error, "no_partner")
  assert.equal(result.proposal.status, "pending")
  const response = toWriteResponse(result.proposal, members, "propose")
  assert.equal(response.pending_for, null)
  assert.equal(response.tripId, tripId)
})

test("confirm twice returns the same confirmed id and no second effect", () => {
  const confirmed = markConfirmed(tripAdd(), sam, asTripId("jd7trip"), null)
  const result = decideConfirm(confirmed, confirmActor(sam), "trip", [], true, true, "Sam")
  assert.equal(result.kind, "unchanged")
  if (result.kind !== "unchanged") {
    return
  }
  assert.equal(result.proposal.proposalId, confirmed.proposalId)
  assert.equal(result.proposal.status, "confirmed")
  assert.equal(result.proposal.appliedTripId, asTripId("jd7trip"))
  assert.equal("effect" in result, false)
})

test("reject has no effect field and reject after confirm stays confirmed", () => {
  const pending = itemAdd()
  const members = [member(ada, "owner", "Ada", 1), member(sam, "editor", "Sam", 2)]
  const rejected = decideReject(
    pending,
    { kind: "agent", userId: sam, host, confirmEnabled: false },
    members,
  )
  assert.equal(rejected.kind, "reject")
  assert.equal(Object.hasOwn(rejected, "effect"), false)
  if (rejected.kind === "reject") {
    assert.equal(rejected.proposal.status, "rejected")
  }

  const confirmed = markConfirmed(pending, sam, tripId, itemId)
  const again = decideReject(
    confirmed,
    { kind: "member", userId: sam },
    members,
  )
  assert.equal(again.kind, "unchanged")
  assert.equal(Object.hasOwn(again, "effect"), false)
  if (again.kind === "unchanged") {
    assert.equal(again.proposal.status, "confirmed")
    assert.equal(again.proposal.proposalId, confirmed.proposalId)
    assert.equal(again.proposal.appliedItemId, itemId)
  }
})

test("confirm guards keep the row pending", () => {
  const item = itemAdd()
  const members = [member(ada, "owner", "Ada", 1), member(sam, "editor", "Sam", 2), member(jo, "editor", "Jo", 3)]
  const wrongTool = decideConfirm(item, confirmActor(sam), "trip", members, true, true, null)
  assert.equal(wrongTool.kind, "deny")
  if (wrongTool.kind === "deny") {
    assert.equal(wrongTool.error, "wrong_tool")
    assert.equal(wrongTool.proposal.status, "pending")
  }

  const notNamed = decideConfirm(item, confirmActor(jo), "item", members, true, true, null)
  assert.equal(notNamed.kind, "deny")
  if (notNamed.kind === "deny") {
    assert.equal(notNamed.error, "not_pending_for")
  }

  const update = pendingFrom({
    proposalId: asProposalId("jd7update"),
    proposedBy: ada,
    host,
    summary: "Update Lisbon · 2026-06-01 to 2026-06-04",
    body: {
      target: "trip",
      op: "update",
      tripId,
      itemId: null,
      schedule: { name: "Lisbon", startDate: "2026-06-01", endDate: "2026-06-04" },
    },
  })
  const notOwner = decideConfirm(update, confirmActor(sam), "trip", members, true, false, null)
  assert.equal(notOwner.kind, "deny")
  if (notOwner.kind === "deny") {
    assert.equal(notOwner.error, "not_owner")
    assert.equal(notOwner.proposal.status, "pending")
  }

  const remove = pendingFrom({
    proposalId: asProposalId("jd7remove"),
    proposedBy: ada,
    host,
    summary: "Remove Time Out Market · Lisbon",
    body: { target: "item", op: "remove", tripId, itemId },
  })
  const missing = decideConfirm(remove, confirmActor(sam), "item", members, false, true, null)
  assert.equal(missing.kind, "deny")
  if (missing.kind === "deny") {
    assert.equal(missing.error, "target_missing")
    assert.equal(missing.proposal.status, "pending")
  }

  const third = decideReject(item, { kind: "member", userId: jo }, members)
  assert.equal(third.kind, "deny")
  if (third.kind === "deny") {
    assert.equal(third.error, "not_pending_for")
  }
})

test("the other owner is pending_for ahead of an earlier editor", () => {
  const pending = itemAdd()
  const members = [
    member(sam, "editor", "Sam", 1),
    member(ada, "editor", "Ada", 2),
    member(jo, "owner", "Jo", 3),
  ]
  const response = toWriteResponse(pending, members, "propose")
  assert.deepEqual(response.pending_for, { userId: jo, displayName: "Jo" })
  assert.equal(response.glance_url, "https://www.travelcalendar.space/?confirm=jd7item")
  assert.equal(response.confirmed_by, null)
  assert.equal(response.scope_used, "propose")
})

test("only a pending trip add with no trip is visible from a glance link", () => {
  assert.equal(isUnmemberedTripAdd(tripAdd()), true)
  assert.equal(isUnmemberedTripAdd({ status: "pending", target: "trip", op: "add" }), true)
  assert.equal(isUnmemberedTripAdd(itemAdd()), false)
  assert.equal(isUnmemberedTripAdd({ status: "confirmed", target: "trip", op: "add", tripId: null }), false)
  assert.equal(isUnmemberedTripAdd({ status: "rejected", target: "trip", op: "add" }), false)
  assert.equal(isUnmemberedTripAdd({ status: "pending", target: "trip", op: "update", tripId }), false)
  assert.equal(isUnmemberedTripAdd({ status: "pending", target: "item", op: "add", tripId }), false)
  assert.equal(isUnmemberedTripAdd({ status: "pending", target: "trip", op: "add", tripId }), false)
})

test("parseHost trims, lowercases, and rejects an illegal name", () => {
  assert.equal(parseHost(" Grok.Host-1 "), "grok.host-1")
  assert.equal(parseHost("a".repeat(64)), "a".repeat(64))
  assert.equal(parseHost("a".repeat(65)), null)
  assert.equal(parseHost(".grok"), null)
  assert.equal(parseHost(""), null)
  assert.equal(parseHost("bad host"), null)
})
