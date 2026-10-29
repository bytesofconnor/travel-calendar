import { ConvexError, v } from "convex/values"

import { confirmRowText, glanceUrl, proposalSummary } from "../shared/confirmCopy.ts"
import type { Doc, Id } from "./_generated/dataModel"
import { internalMutation, internalQuery, mutation, query } from "./_generated/server"
import type { MutationCtx, QueryCtx } from "./_generated/server"
import { requireAccess, userHasAccess } from "./access"
import { checkOwner, getCurrentUserId, getMembership } from "./lib/auth"
import {
  asHost,
  asItemId,
  asProposalId,
  asTripId,
  asUserId,
  authorizeConfirm,
  decideConfirm,
  decideReject,
  markConfirmed,
  parseHost,
  partnerGate,
  pendingFrom,
  toWriteResponse,
  type ApplyEffect,
  type ConfirmActor,
  type ItemFields,
  type Member,
  type Proposal,
  type ProposalBody,
  type RejectActor,
  type WriteResponse,
} from "./lib/proposalTransition.ts"
import { deleteItem, insertItem, patchItem } from "./items"
import { archiveTrip, insertMember, insertTrip, patchTrip } from "./trips"

const personWire = v.object({
  userId: v.string(),
  displayName: v.string(),
})

const writeValidator = v.object({
  proposalId: v.string(),
  status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("rejected")),
  target: v.union(v.literal("trip"), v.literal("item")),
  op: v.union(v.literal("add"), v.literal("update"), v.literal("archive"), v.literal("remove")),
  host: v.string(),
  scope_used: v.union(v.literal("propose"), v.literal("confirm"), v.literal("member")),
  tripId: v.union(v.string(), v.null()),
  itemId: v.union(v.string(), v.null()),
  glance_url: v.union(v.string(), v.null()),
  summary: v.string(),
  proposed_by: personWire,
  confirmed_by: v.union(personWire, v.null()),
  pending_for: v.union(personWire, v.null()),
})

const shellError = v.union(
  v.literal("host_required"),
  v.literal("propose_scope"),
  v.literal("self_confirm"),
  v.literal("no_partner"),
  v.literal("not_pending_for"),
  v.literal("wrong_tool"),
  v.literal("not_owner"),
  v.literal("display_name_required"),
  v.literal("target_missing"),
  v.literal("trip_not_found"),
  v.literal("item_not_found"),
  v.literal("proposal_not_found"),
  v.literal("name_required"),
  v.literal("trip_name_required"),
  v.literal("title_required"),
  v.literal("payment_required"),
  v.literal("invalid_proposal"),
)

const shellResult = v.union(
  v.object({ ok: v.literal(true), response: writeValidator }),
  v.object({ ok: v.literal(false), error: shellError }),
)

type ShellError =
  | "host_required"
  | "propose_scope"
  | "self_confirm"
  | "no_partner"
  | "not_pending_for"
  | "wrong_tool"
  | "not_owner"
  | "display_name_required"
  | "target_missing"
  | "trip_not_found"
  | "item_not_found"
  | "proposal_not_found"
  | "name_required"
  | "trip_name_required"
  | "title_required"
  | "payment_required"
  | "invalid_proposal"

type ShellResult = { ok: true; response: WriteResponse } | { ok: false; error: ShellError }

type ReadCtx = QueryCtx | MutationCtx

const proposeArgs = {
  userId: v.id("users"),
  host: v.string(),
  target: v.union(v.literal("trip"), v.literal("item")),
  op: v.union(v.literal("add"), v.literal("update"), v.literal("archive"), v.literal("remove")),
  tripId: v.optional(v.string()),
  itemId: v.optional(v.string()),
  name: v.optional(v.string()),
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
  displayName: v.optional(v.string()),
  title: v.optional(v.string()),
  notes: v.optional(v.string()),
  linkLabel: v.optional(v.string()),
  linkUrl: v.optional(v.string()),
  location: v.optional(v.string()),
  locationTo: v.optional(v.string()),
}

const queueRowValidator = v.object({
  proposalId: v.id("proposals"),
  text: v.string(),
  glanceUrl: v.string(),
  summary: v.string(),
  proposedByName: v.string(),
  pendingForName: v.union(v.string(), v.null()),
  status: v.literal("pending"),
})

const agentQueueRow = v.object({
  proposalId: v.string(),
  row_text: v.string(),
  glance_url: v.string(),
  proposed_by: personWire,
  confirmed_by: v.null(),
  pending_for: v.union(personWire, v.null()),
})

function fail(error: ShellError): { ok: false; error: ShellError } {
  return { ok: false, error }
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter((entry) => entry[1] !== undefined)) as T
}

function usersId(id: string): Id<"users"> {
  return id as Id<"users">
}

function tripsId(id: string): Id<"trips"> {
  return id as Id<"trips">
}

function itemsId(id: string): Id<"tripItems"> {
  return id as Id<"tripItems">
}

function fieldsOf(row: Doc<"proposals">): ItemFields {
  return {
    title: row.title ?? "",
    notes: row.notes,
    linkLabel: row.linkLabel,
    linkUrl: row.linkUrl,
    startDate: row.startDate ?? "",
    endDate: row.endDate ?? "",
    location: row.location ?? "",
    locationTo: row.locationTo,
  }
}

function bodyFrom(row: Doc<"proposals">): ProposalBody | null {
  if (row.target === "trip" && row.op === "add") {
    const ownerDisplayName = row.ownerDisplayName ?? row.displayName
    if (row.name === undefined || row.startDate === undefined || row.endDate === undefined || !ownerDisplayName) {
      return null
    }
    return {
      target: "trip",
      op: "add",
      tripId: null,
      itemId: null,
      schedule: { name: row.name, startDate: row.startDate, endDate: row.endDate },
      ownerDisplayName,
    }
  }
  if (row.target === "trip" && row.op === "update") {
    if (!row.tripId || row.name === undefined || row.startDate === undefined || row.endDate === undefined) {
      return null
    }
    return {
      target: "trip",
      op: "update",
      tripId: asTripId(row.tripId),
      itemId: null,
      schedule: { name: row.name, startDate: row.startDate, endDate: row.endDate },
    }
  }
  if (row.target === "trip" && row.op === "archive") {
    if (!row.tripId) {
      return null
    }
    return { target: "trip", op: "archive", tripId: asTripId(row.tripId), itemId: null }
  }
  if (row.target === "item" && row.op === "add") {
    if (!row.tripId || row.title === undefined || row.startDate === undefined || row.endDate === undefined || row.location === undefined) {
      return null
    }
    return { target: "item", op: "add", tripId: asTripId(row.tripId), itemId: null, fields: fieldsOf(row) }
  }
  if (row.target === "item" && row.op === "update") {
    if (!row.tripId || !row.itemId || row.title === undefined || row.startDate === undefined || row.endDate === undefined || row.location === undefined) {
      return null
    }
    return {
      target: "item",
      op: "update",
      tripId: asTripId(row.tripId),
      itemId: asItemId(row.itemId),
      fields: fieldsOf(row),
    }
  }
  if (row.target === "item" && row.op === "remove") {
    if (!row.tripId || !row.itemId) {
      return null
    }
    return { target: "item", op: "remove", tripId: asTripId(row.tripId), itemId: asItemId(row.itemId) }
  }
  return null
}

function toDomain(row: Doc<"proposals">): Proposal | null {
  const body = bodyFrom(row)
  if (!body) {
    return null
  }
  const pending = pendingFrom({
    proposalId: asProposalId(row._id),
    proposedBy: asUserId(row.proposedBy),
    host: asHost(row.host),
    summary: row.summary,
    body,
  })
  if (row.status === "pending") {
    return pending
  }
  if (row.status === "rejected") {
    return { ...pending, status: "rejected", confirmedBy: null, appliedTripId: null, appliedItemId: null }
  }
  if (!row.confirmedBy) {
    return null
  }
  return markConfirmed(
    pending,
    asUserId(row.confirmedBy),
    row.appliedTripId ? asTripId(row.appliedTripId) : null,
    row.appliedItemId ? asItemId(row.appliedItemId) : null,
  )
}

async function loadMembers(ctx: ReadCtx, tripId: Id<"trips"> | undefined): Promise<Member[]> {
  if (!tripId) {
    return []
  }
  const rows = await ctx.db
    .query("tripMembers")
    .withIndex("by_trip", (q) => q.eq("tripId", tripId))
    .collect()
  return rows.map((row) => ({
    userId: asUserId(row.userId),
    role: row.role,
    displayName: row.displayName,
    joinedAt: row._creationTime,
  }))
}

async function respond(
  ctx: ReadCtx,
  row: Doc<"proposals">,
  scope: WriteResponse["scope_used"],
): Promise<ShellResult> {
  const proposal = toDomain(row)
  if (!proposal) {
    return fail("invalid_proposal")
  }
  const tripId =
    proposal.status === "confirmed" && proposal.appliedTripId
      ? tripsId(proposal.appliedTripId)
      : row.tripId
  const members = await loadMembers(ctx, tripId)
  return { ok: true, response: toWriteResponse(proposal, members, scope) }
}

function flatProposal(
  userId: Id<"users">,
  host: string,
  summary: string,
  body: ProposalBody,
  name?: string,
) {
  const base = {
    status: "pending" as const,
    target: body.target,
    op: body.op,
    proposedBy: userId,
    host,
    summary,
  }
  if (body.target === "trip" && body.op === "add") {
    return {
      ...base,
      ownerDisplayName: body.ownerDisplayName,
      displayName: body.ownerDisplayName,
      name: body.schedule.name,
      startDate: body.schedule.startDate,
      endDate: body.schedule.endDate,
    }
  }
  if (body.target === "trip" && body.op === "update") {
    return {
      ...base,
      tripId: tripsId(body.tripId),
      name: body.schedule.name,
      startDate: body.schedule.startDate,
      endDate: body.schedule.endDate,
    }
  }
  if (body.target === "trip" && body.op === "archive") {
    return {
      ...base,
      tripId: tripsId(body.tripId),
      ...(name ? { name } : {}),
    }
  }
  if (body.target === "item" && (body.op === "add" || body.op === "update")) {
    return {
      ...base,
      tripId: tripsId(body.tripId),
      ...(body.op === "update" ? { itemId: itemsId(body.itemId) } : {}),
      title: body.fields.title,
      notes: body.fields.notes,
      linkLabel: body.fields.linkLabel,
      linkUrl: body.fields.linkUrl,
      startDate: body.fields.startDate,
      endDate: body.fields.endDate,
      location: body.fields.location,
      locationTo: body.fields.locationTo,
    }
  }
  if (body.target === "item" && body.op === "remove") {
    return {
      ...base,
      tripId: tripsId(body.tripId),
      itemId: itemsId(body.itemId),
      ...(name ? { title: name } : {}),
    }
  }
  return base
}

async function insertPending(
  ctx: MutationCtx,
  userId: Id<"users">,
  host: string,
  body: ProposalBody,
  summaryInput: Parameters<typeof proposalSummary>[0],
): Promise<ShellResult> {
  const summary = proposalSummary(summaryInput)
  const proposalId = await ctx.db.insert(
    "proposals",
    withoutUndefined(flatProposal(userId, host, summary, body, summaryInput.name ?? summaryInput.title)),
  )
  const row = await ctx.db.get(proposalId)
  if (!row) {
    return fail("invalid_proposal")
  }
  return await respond(ctx, row, "propose")
}

async function targetExists(ctx: MutationCtx, proposal: Proposal): Promise<boolean> {
  if (proposal.target === "trip" && proposal.op === "add") {
    return true
  }
  if (proposal.target === "item" && (proposal.op === "update" || proposal.op === "remove")) {
    const item = await ctx.db.get(itemsId(proposal.itemId))
    return item !== null && item.tripId === tripsId(proposal.tripId)
  }
  if (!proposal.tripId) {
    return false
  }
  const trip = await ctx.db.get(tripsId(proposal.tripId))
  return trip !== null
}

async function proposerIsOwner(ctx: MutationCtx, proposal: Proposal): Promise<boolean> {
  if (proposal.target !== "trip" || (proposal.op !== "update" && proposal.op !== "archive")) {
    return true
  }
  if (!proposal.tripId) {
    return false
  }
  const owner = await checkOwner(ctx, tripsId(proposal.tripId), usersId(proposal.proposedBy))
  return owner.ok
}

async function applyEffect(
  ctx: MutationCtx,
  effect: ApplyEffect,
  proposedBy: Id<"users">,
  confirmedBy: Id<"users">,
): Promise<{ ok: true; tripId: Id<"trips"> | null; itemId: Id<"tripItems"> | null } | { ok: false; error: ShellError }> {
  const attribution = { proposedBy, confirmedBy }
  if (effect.op === "trip.add") {
    const created = await insertTrip(
      ctx,
      proposedBy,
      {
        name: effect.schedule.name,
        startDate: effect.schedule.startDate,
        endDate: effect.schedule.endDate,
        displayName: effect.ownerDisplayName,
      },
      attribution,
    )
    if (!created.ok) {
      return fail(created.error === "payment_required" ? "payment_required" : "name_required")
    }
    const member = await insertMember(ctx, created.tripId, confirmedBy, "editor", effect.confirmer.displayName)
    if (!member.ok) {
      throw new Error("Confirmer name missing after the display name guard.")
    }
    return { ok: true, tripId: created.tripId, itemId: null }
  }
  if (effect.op === "trip.update") {
    const tripId = tripsId(effect.tripId)
    const patched = await patchTrip(
      ctx,
      proposedBy,
      { tripId, name: effect.schedule.name, startDate: effect.schedule.startDate, endDate: effect.schedule.endDate },
      attribution,
    )
    if (!patched.ok) {
      if (patched.error === "not_owner") {
        return fail("not_owner")
      }
      if (patched.error === "name_required") {
        return fail("trip_name_required")
      }
      return fail("trip_not_found")
    }
    return { ok: true, tripId, itemId: null }
  }
  if (effect.op === "trip.archive") {
    const tripId = tripsId(effect.tripId)
    const archived = await archiveTrip(ctx, proposedBy, tripId, attribution)
    if (!archived.ok) {
      return fail(archived.error === "not_owner" ? "not_owner" : "trip_not_found")
    }
    return { ok: true, tripId, itemId: null }
  }
  if (effect.op === "item.add") {
    const tripId = tripsId(effect.tripId)
    const created = await insertItem(ctx, tripId, proposedBy, effect.fields, attribution)
    if (!created.ok) {
      return fail("title_required")
    }
    return { ok: true, tripId, itemId: created.itemId }
  }
  if (effect.op === "item.update") {
    const itemId = itemsId(effect.itemId)
    const patched = await patchItem(ctx, itemId, effect.fields, attribution)
    if (!patched.ok) {
      return fail(patched.error === "title_required" ? "title_required" : "target_missing")
    }
    return { ok: true, tripId: patched.tripId, itemId }
  }
  const itemId = itemsId(effect.itemId)
  const removed = await deleteItem(ctx, itemId)
  if (!removed.ok) {
    return fail("target_missing")
  }
  return { ok: true, tripId: removed.tripId, itemId }
}

async function runConfirm(
  ctx: MutationCtx,
  proposalId: Id<"proposals">,
  actor: ConfirmActor,
  expected: "trip" | "item" | null,
  displayName: string | null,
  scope: WriteResponse["scope_used"],
): Promise<ShellResult> {
  const row = await ctx.db.get(proposalId)
  if (!row) {
    return fail("proposal_not_found")
  }
  const proposal = toDomain(row)
  if (!proposal) {
    return fail("invalid_proposal")
  }
  const members = await loadMembers(ctx, row.tripId)
  const decision = decideConfirm(
    proposal,
    actor,
    expected ?? proposal.target,
    members,
    await targetExists(ctx, proposal),
    await proposerIsOwner(ctx, proposal),
    displayName,
  )
  if (decision.kind === "deny") {
    return fail(decision.error)
  }
  if (decision.kind === "unchanged") {
    return await respond(ctx, row, scope)
  }
  if (decision.kind !== "apply") {
    return await respond(ctx, row, scope)
  }
  const applied = await applyEffect(ctx, decision.effect, row.proposedBy, usersId(actor.userId))
  if (!applied.ok) {
    return applied
  }
  await ctx.db.patch(row._id, {
    status: "confirmed",
    confirmedBy: usersId(actor.userId),
    ...(applied.tripId ? { appliedTripId: applied.tripId } : {}),
    ...(applied.itemId ? { appliedItemId: applied.itemId } : {}),
  })
  const saved = await ctx.db.get(row._id)
  if (!saved) {
    return fail("invalid_proposal")
  }
  return await respond(ctx, saved, scope)
}

async function runReject(
  ctx: MutationCtx,
  proposalId: Id<"proposals">,
  actor: RejectActor,
  scope: WriteResponse["scope_used"],
): Promise<ShellResult> {
  const row = await ctx.db.get(proposalId)
  if (!row) {
    return fail("proposal_not_found")
  }
  const proposal = toDomain(row)
  if (!proposal) {
    return fail("invalid_proposal")
  }
  const members = await loadMembers(ctx, row.tripId)
  const decision = decideReject(proposal, actor, members)
  if (decision.kind === "deny") {
    return fail(decision.error)
  }
  if (decision.kind === "unchanged") {
    return await respond(ctx, row, scope)
  }
  await ctx.db.patch(row._id, { status: "rejected" })
  const saved = await ctx.db.get(row._id)
  if (!saved) {
    return fail("invalid_proposal")
  }
  return await respond(ctx, saved, scope)
}

function itemFields(args: {
  title?: string
  notes?: string
  linkLabel?: string
  linkUrl?: string
  startDate?: string
  endDate?: string
  location?: string
  locationTo?: string
}): ItemFields {
  return {
    title: args.title?.trim() ?? "",
    notes: args.notes,
    linkLabel: args.linkLabel,
    linkUrl: args.linkUrl,
    startDate: args.startDate ?? "",
    endDate: args.endDate ?? "",
    location: args.location ?? "",
    locationTo: args.locationTo,
  }
}

async function propose(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">
    host: string
    target: "trip" | "item"
    op: "add" | "update" | "archive" | "remove"
    tripId?: string
    itemId?: string
    name?: string
    startDate?: string
    endDate?: string
    displayName?: string
    title?: string
    notes?: string
    linkLabel?: string
    linkUrl?: string
    location?: string
    locationTo?: string
  },
): Promise<ShellResult> {
  const host = parseHost(args.host)
  if (!host) {
    return fail("host_required")
  }
  if (args.target === "trip" && args.op === "add") {
    const name = args.name?.trim() ?? ""
    const displayName = args.displayName?.trim() ?? ""
    if (!name || !displayName) {
      return fail("name_required")
    }
    if (!(await userHasAccess(ctx, args.userId))) {
      return fail("payment_required")
    }
    const schedule = { name, startDate: args.startDate ?? "", endDate: args.endDate ?? "" }
    return await insertPending(
      ctx,
      args.userId,
      host,
      { target: "trip", op: "add", tripId: null, itemId: null, schedule, ownerDisplayName: displayName },
      { target: "trip", op: "add", name, startDate: schedule.startDate, endDate: schedule.endDate },
    )
  }
  if (args.target === "trip" && (args.op === "update" || args.op === "archive")) {
    const tripId = args.tripId ? ctx.db.normalizeId("trips", args.tripId) : null
    if (!tripId) {
      return fail("trip_not_found")
    }
    if (args.op === "archive" && !(await userHasAccess(ctx, args.userId))) {
      return fail("payment_required")
    }
    const owner = await checkOwner(ctx, tripId, args.userId)
    if (!owner.ok) {
      return fail(owner.error === "not_owner" ? "not_owner" : "trip_not_found")
    }
    const trip = await ctx.db.get(tripId)
    if (!trip) {
      return fail("trip_not_found")
    }
    if (args.op === "archive") {
      return await insertPending(
        ctx,
        args.userId,
        host,
        { target: "trip", op: "archive", tripId: asTripId(tripId), itemId: null },
        { target: "trip", op: "archive", name: trip.name },
      )
    }
    const name = args.name?.trim() ?? ""
    if (!name) {
      return fail("trip_name_required")
    }
    const schedule = { name, startDate: args.startDate ?? "", endDate: args.endDate ?? "" }
    return await insertPending(
      ctx,
      args.userId,
      host,
      { target: "trip", op: "update", tripId: asTripId(tripId), itemId: null, schedule },
      { target: "trip", op: "update", name, startDate: schedule.startDate, endDate: schedule.endDate },
    )
  }
  if (args.target === "item" && args.op === "add") {
    const tripId = args.tripId ? ctx.db.normalizeId("trips", args.tripId) : null
    if (!tripId) {
      return fail("trip_not_found")
    }
    if (!(await getMembership(ctx, tripId, args.userId))) {
      return fail("trip_not_found")
    }
    if (!(await userHasAccess(ctx, args.userId))) {
      return fail("payment_required")
    }
    const fields = itemFields(args)
    if (!fields.title) {
      return fail("title_required")
    }
    return await insertPending(
      ctx,
      args.userId,
      host,
      { target: "item", op: "add", tripId: asTripId(tripId), itemId: null, fields },
      { target: "item", op: "add", title: fields.title, location: fields.location, startDate: fields.startDate, endDate: fields.endDate },
    )
  }
  if (args.target === "item" && args.op === "update") {
    const itemId = args.itemId ? ctx.db.normalizeId("tripItems", args.itemId) : null
    if (!itemId) {
      return fail("item_not_found")
    }
    const item = await ctx.db.get(itemId)
    if (!item) {
      return fail("item_not_found")
    }
    if (!(await getMembership(ctx, item.tripId, args.userId))) {
      return fail("trip_not_found")
    }
    if (!(await userHasAccess(ctx, args.userId))) {
      return fail("payment_required")
    }
    const fields = itemFields(args)
    if (!fields.title) {
      return fail("title_required")
    }
    return await insertPending(
      ctx,
      args.userId,
      host,
      { target: "item", op: "update", tripId: asTripId(item.tripId), itemId: asItemId(itemId), fields },
      { target: "item", op: "update", title: fields.title, location: fields.location },
    )
  }
  if (args.target === "item" && args.op === "remove") {
    const tripId = args.tripId ? ctx.db.normalizeId("trips", args.tripId) : null
    const itemId = args.itemId ? ctx.db.normalizeId("tripItems", args.itemId) : null
    if (!tripId) {
      return fail("trip_not_found")
    }
    if (!itemId) {
      return fail("item_not_found")
    }
    const item = await ctx.db.get(itemId)
    if (!item || item.tripId !== tripId) {
      return fail("item_not_found")
    }
    if (!(await getMembership(ctx, tripId, args.userId))) {
      return fail("trip_not_found")
    }
    if (!(await userHasAccess(ctx, args.userId))) {
      return fail("payment_required")
    }
    return await insertPending(
      ctx,
      args.userId,
      host,
      { target: "item", op: "remove", tripId: asTripId(tripId), itemId: asItemId(itemId) },
      { target: "item", op: "remove", title: item.title, location: item.location },
    )
  }
  return fail("invalid_proposal")
}

function websiteMessage(error: ShellError) {
  switch (error) {
    case "self_confirm":
      return "You proposed this. Your partner confirms it."
    case "no_partner":
      return "A partner still needs to join before this can be confirmed."
    case "not_pending_for":
      return "Your partner confirms this one."
    case "display_name_required":
      return "Add your name before confirming."
    case "not_owner":
      return "The proposer is no longer the owner."
    case "target_missing":
      return "That plan is already gone. You can reject it."
    case "wrong_tool":
      return "This confirmation does not match the proposal."
    case "proposal_not_found":
    case "invalid_proposal":
      return "That proposal is gone."
    case "payment_required":
      return "Payment required: lifetime access ($9.99 once)"
    default:
      return "Unable to update that proposal."
  }
}

async function visiblePending(ctx: ReadCtx, userId: Id<"users">, confirmId: Id<"proposals"> | null) {
  const seen = new Map<string, Doc<"proposals">>()
  const mine = await ctx.db
    .query("proposals")
    .withIndex("by_proposer_and_status", (q) => q.eq("proposedBy", userId).eq("status", "pending"))
    .collect()
  for (const row of mine) {
    seen.set(row._id, row)
  }
  const memberships = await ctx.db
    .query("tripMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()
  for (const membership of memberships) {
    const rows = await ctx.db
      .query("proposals")
      .withIndex("by_trip_and_status", (q) => q.eq("tripId", membership.tripId).eq("status", "pending"))
      .collect()
    for (const row of rows) {
      seen.set(row._id, row)
    }
  }
  // A new trip has no members yet, so the glance id is the only way the other person can see that one row.
  if (confirmId) {
    const linked = await ctx.db.get(confirmId)
    if (
      linked &&
      linked.status === "pending" &&
      linked.target === "trip" &&
      linked.op === "add" &&
      linked.tripId === undefined
    ) {
      seen.set(linked._id, linked)
    }
  }
  return [...seen.values()].sort((a, b) => b._creationTime - a._creationTime)
}

async function queueRows(ctx: ReadCtx, userId: Id<"users">, confirmId: Id<"proposals"> | null) {
  const rows = await visiblePending(ctx, userId, confirmId)
  const built = []
  for (const row of rows) {
    const proposal = toDomain(row)
    if (!proposal || proposal.status !== "pending") {
      continue
    }
    const members = await loadMembers(ctx, row.tripId)
    const response = toWriteResponse(proposal, members, "propose")
    const gate = partnerGate(proposal, members)
    const proposedByName = response.proposed_by.displayName || "Someone"
    const pendingForName = response.pending_for?.displayName ?? null
    const text = confirmRowText({
      summary: proposal.summary,
      status: "pending",
      proposedByName,
      pendingForName,
      confirmedByName: null,
      gate: gate.kind,
    })
    built.push({
      website: {
        proposalId: row._id,
        text,
        glanceUrl: glanceUrl(row._id),
        summary: proposal.summary,
        proposedByName,
        pendingForName,
        status: "pending" as const,
      },
      agent: {
        proposalId: row._id,
        row_text: text,
        glance_url: response.glance_url ?? glanceUrl(row._id),
        proposed_by: response.proposed_by,
        confirmed_by: null,
        pending_for: response.pending_for,
      },
    })
  }
  return built
}

export const confirm = mutation({
  args: {
    proposalId: v.id("proposals"),
    displayName: v.optional(v.string()),
  },
  returns: writeValidator,
  handler: async (ctx, args) => {
    const userId = await requireAccess(ctx)
    const authorized = authorizeConfirm({ kind: "member", userId: asUserId(userId) })
    if (!authorized.ok) {
      throw new ConvexError(websiteMessage("propose_scope"))
    }
    const result = await runConfirm(ctx, args.proposalId, authorized.actor, null, args.displayName ?? null, "member")
    if (!result.ok) {
      throw new ConvexError(websiteMessage(result.error))
    }
    return result.response
  },
})

export const reject = mutation({
  args: { proposalId: v.id("proposals") },
  returns: writeValidator,
  handler: async (ctx, args) => {
    const userId = await requireAccess(ctx)
    const result = await runReject(ctx, args.proposalId, { kind: "member", userId: asUserId(userId) }, "member")
    if (!result.ok) {
      throw new ConvexError(websiteMessage(result.error))
    }
    return result.response
  },
})

export const pending = query({
  args: { confirmId: v.optional(v.string()) },
  returns: v.array(queueRowValidator),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const confirmId = args.confirmId ? ctx.db.normalizeId("proposals", args.confirmId) : null
    const rows = await queueRows(ctx, userId, confirmId)
    return rows.map((row) => row.website)
  },
})

export const proposeFromAgent = internalMutation({
  args: proposeArgs,
  returns: shellResult,
  handler: async (ctx, args) => {
    return await propose(ctx, args)
  },
})

export const confirmFromAgent = internalMutation({
  args: {
    userId: v.id("users"),
    proposalId: v.id("proposals"),
    expected: v.union(v.literal("trip"), v.literal("item")),
    displayName: v.optional(v.string()),
    host: v.string(),
    confirmEnabled: v.boolean(),
  },
  returns: shellResult,
  handler: async (ctx, args) => {
    if (!(await userHasAccess(ctx, args.userId))) {
      return fail("payment_required")
    }
    const host = parseHost(args.host)
    if (!host) {
      return fail("host_required")
    }
    const authorized = authorizeConfirm({
      kind: "agent",
      userId: asUserId(args.userId),
      host,
      confirmEnabled: args.confirmEnabled,
    })
    if (!authorized.ok) {
      return fail("propose_scope")
    }
    return await runConfirm(
      ctx,
      args.proposalId,
      authorized.actor,
      args.expected,
      args.displayName ?? null,
      "confirm",
    )
  },
})

export const rejectFromAgent = internalMutation({
  args: {
    userId: v.id("users"),
    proposalId: v.id("proposals"),
    host: v.string(),
    confirmEnabled: v.boolean(),
  },
  returns: shellResult,
  handler: async (ctx, args) => {
    if (!(await userHasAccess(ctx, args.userId))) {
      return fail("payment_required")
    }
    const host = parseHost(args.host)
    if (!host) {
      return fail("host_required")
    }
    return await runReject(
      ctx,
      args.proposalId,
      { kind: "agent", userId: asUserId(args.userId), host, confirmEnabled: args.confirmEnabled },
      "propose",
    )
  },
})

export const listPendingForAgent = internalQuery({
  args: { userId: v.id("users") },
  returns: v.object({ proposals: v.array(agentQueueRow) }),
  handler: async (ctx, args) => {
    const rows = await queueRows(ctx, args.userId, null)
    return { proposals: rows.map((row) => row.agent) }
  },
})
