import { glanceUrl } from "../../shared/confirmCopy.ts"

export type UserId = string & { readonly brand: "UserId" }
export type TripId = string & { readonly brand: "TripId" }
export type ItemId = string & { readonly brand: "ItemId" }
export type ProposalId = string & { readonly brand: "ProposalId" }
export type Host = string & { readonly brand: "Host" }

const HOST_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/

export function asUserId(id: string): UserId {
  return id as UserId
}

export function asTripId(id: string): TripId {
  return id as TripId
}

export function asItemId(id: string): ItemId {
  return id as ItemId
}

export function asProposalId(id: string): ProposalId {
  return id as ProposalId
}

export function asHost(id: string): Host {
  return id as Host
}

export function parseHost(raw: string): Host | null {
  const host = raw.trim().toLowerCase()
  if (!HOST_PATTERN.test(host)) {
    return null
  }
  return asHost(host)
}

export type ItemFields = {
  title: string
  notes?: string
  linkLabel?: string
  linkUrl?: string
  startDate: string
  endDate: string
  location: string
  locationTo?: string
}

export type TripSchedule = {
  name: string
  startDate: string
  endDate: string
}

export type ProposalBody =
  | {
      target: "trip"
      op: "add"
      tripId: null
      itemId: null
      schedule: TripSchedule
      ownerDisplayName: string
    }
  | { target: "trip"; op: "update"; tripId: TripId; itemId: null; schedule: TripSchedule }
  | { target: "trip"; op: "archive"; tripId: TripId; itemId: null }
  | { target: "item"; op: "add"; tripId: TripId; itemId: null; fields: ItemFields }
  | { target: "item"; op: "update"; tripId: TripId; itemId: ItemId; fields: ItemFields }
  | { target: "item"; op: "remove"; tripId: TripId; itemId: ItemId }

type ProposalBase = ProposalBody & {
  proposalId: ProposalId
  proposedBy: UserId
  host: Host
  summary: string
}

export type PendingProposal = ProposalBase & {
  status: "pending"
  confirmedBy: null
  appliedTripId: null
  appliedItemId: null
}

export type ConfirmedProposal = ProposalBase & {
  status: "confirmed"
  confirmedBy: UserId
  appliedTripId: TripId | null
  appliedItemId: ItemId | null
}

export type RejectedProposal = ProposalBase & {
  status: "rejected"
  confirmedBy: null
  appliedTripId: null
  appliedItemId: null
}

export type Proposal = PendingProposal | ConfirmedProposal | RejectedProposal

export type Member = {
  userId: UserId
  role: "owner" | "editor"
  displayName: string
  joinedAt: number
}

/** Propose-only keys are not members of this union. */
export type ConfirmActor =
  | { kind: "member"; userId: UserId }
  | { kind: "agent"; userId: UserId; host: Host; confirmEnabled: true }

export type RejectActor =
  | { kind: "member"; userId: UserId }
  | { kind: "agent"; userId: UserId; host: Host; confirmEnabled: boolean }

export type AgentPrincipal = {
  kind: "agent"
  userId: UserId
  host: Host
  confirmEnabled: boolean
}

export type PartnerGate =
  | { kind: "named"; userId: UserId }
  | { kind: "any_other_user" }
  | { kind: "blocked" }

export type ApplyEffect =
  | {
      op: "trip.add"
      proposerId: UserId
      schedule: TripSchedule
      ownerDisplayName: string
      confirmer: { userId: UserId; displayName: string }
    }
  | { op: "trip.update"; proposerId: UserId; tripId: TripId; schedule: TripSchedule }
  | { op: "trip.archive"; proposerId: UserId; tripId: TripId }
  | { op: "item.add"; proposerId: UserId; tripId: TripId; fields: ItemFields }
  | { op: "item.update"; itemId: ItemId; fields: ItemFields }
  | { op: "item.remove"; itemId: ItemId }

export type DenyError =
  | "self_confirm"
  | "no_partner"
  | "not_pending_for"
  | "wrong_tool"
  | "not_owner"
  | "display_name_required"
  | "target_missing"

export type DecideResult =
  | { kind: "deny"; error: DenyError; proposal: PendingProposal }
  | { kind: "unchanged"; proposal: ConfirmedProposal | RejectedProposal }
  | { kind: "reject"; proposal: RejectedProposal }
  | { kind: "apply"; effect: ApplyEffect; confirmedBy: UserId }

export type PersonRef = { userId: UserId; displayName: string }

export type WriteResponse = {
  proposalId: ProposalId
  status: Proposal["status"]
  target: Proposal["target"]
  op: Proposal["op"]
  host: Host
  scope_used: "propose" | "confirm" | "member"
  tripId: TripId | null
  itemId: ItemId | null
  glance_url: string | null
  summary: string
  proposed_by: PersonRef
  confirmed_by: PersonRef | null
  pending_for: PersonRef | null
}

export function partnerGate(proposal: PendingProposal, members: readonly Member[]): PartnerGate {
  if (proposal.target === "trip" && proposal.op === "add") {
    return { kind: "any_other_user" }
  }
  const others = members.filter((member) => member.userId !== proposal.proposedBy)
  if (others.length === 0) {
    return { kind: "blocked" }
  }
  const owners = others
    .filter((member) => member.role === "owner")
    .sort((a, b) => a.joinedAt - b.joinedAt)
  const chosen = owners[0] ?? [...others].sort((a, b) => a.joinedAt - b.joinedAt)[0]
  if (!chosen) {
    return { kind: "blocked" }
  }
  return { kind: "named", userId: chosen.userId }
}

export function authorizeConfirm(
  actor: AgentPrincipal | { kind: "member"; userId: UserId },
): { ok: true; actor: ConfirmActor } | { ok: false; error: "propose_scope" } {
  if (actor.kind === "member") {
    return { ok: true, actor }
  }
  if (actor.confirmEnabled !== true) {
    return { ok: false, error: "propose_scope" }
  }
  return {
    ok: true,
    actor: {
      kind: "agent",
      userId: actor.userId,
      host: actor.host,
      confirmEnabled: true,
    },
  }
}

export function pendingFrom(input: {
  proposalId: ProposalId
  proposedBy: UserId
  host: Host
  summary: string
  body: ProposalBody
}): PendingProposal {
  return {
    ...input.body,
    proposalId: input.proposalId,
    proposedBy: input.proposedBy,
    host: input.host,
    summary: input.summary,
    status: "pending",
    confirmedBy: null,
    appliedTripId: null,
    appliedItemId: null,
  }
}

export function markConfirmed(
  proposal: PendingProposal,
  confirmedBy: UserId,
  appliedTripId: TripId | null,
  appliedItemId: ItemId | null,
): ConfirmedProposal {
  return {
    ...proposal,
    status: "confirmed",
    confirmedBy,
    appliedTripId,
    appliedItemId,
  }
}

function asRejected(proposal: PendingProposal): RejectedProposal {
  return {
    ...proposal,
    status: "rejected",
    confirmedBy: null,
    appliedTripId: null,
    appliedItemId: null,
  }
}

function deny(proposal: PendingProposal, error: DenyError): DecideResult {
  return { kind: "deny", error, proposal }
}

function effectFor(proposal: PendingProposal, actor: ConfirmActor, displayName: string): ApplyEffect {
  if (proposal.target === "trip" && proposal.op === "add") {
    return {
      op: "trip.add",
      proposerId: proposal.proposedBy,
      schedule: proposal.schedule,
      ownerDisplayName: proposal.ownerDisplayName,
      confirmer: { userId: actor.userId, displayName },
    }
  }
  if (proposal.target === "trip" && proposal.op === "update") {
    return {
      op: "trip.update",
      proposerId: proposal.proposedBy,
      tripId: proposal.tripId,
      schedule: proposal.schedule,
    }
  }
  if (proposal.target === "trip" && proposal.op === "archive") {
    return {
      op: "trip.archive",
      proposerId: proposal.proposedBy,
      tripId: proposal.tripId,
    }
  }
  if (proposal.target === "item" && proposal.op === "add") {
    return {
      op: "item.add",
      proposerId: proposal.proposedBy,
      tripId: proposal.tripId,
      fields: proposal.fields,
    }
  }
  if (proposal.target === "item" && proposal.op === "update") {
    return {
      op: "item.update",
      itemId: proposal.itemId,
      fields: proposal.fields,
    }
  }
  return { op: "item.remove", itemId: proposal.itemId }
}

export function decideConfirm(
  proposal: Proposal,
  actor: ConfirmActor,
  expected: "trip" | "item",
  members: readonly Member[],
  targetExists: boolean,
  proposerStillOwner: boolean,
  confirmerDisplayName: string | null,
): DecideResult {
  if (proposal.status !== "pending") {
    return { kind: "unchanged", proposal }
  }
  if (actor.userId === proposal.proposedBy) {
    return deny(proposal, "self_confirm")
  }
  if (proposal.target !== expected) {
    return deny(proposal, "wrong_tool")
  }
  const gate = partnerGate(proposal, members)
  if (gate.kind === "blocked") {
    return deny(proposal, "no_partner")
  }
  if (gate.kind === "named" && gate.userId !== actor.userId) {
    return deny(proposal, "not_pending_for")
  }
  if (proposal.target === "trip" && proposal.op === "add") {
    const displayName = confirmerDisplayName?.trim() ?? ""
    if (!displayName) {
      return deny(proposal, "display_name_required")
    }
    return {
      kind: "apply",
      effect: effectFor(proposal, actor, displayName),
      confirmedBy: actor.userId,
    }
  }
  if (!targetExists) {
    return deny(proposal, "target_missing")
  }
  if ((proposal.op === "update" || proposal.op === "archive") && proposal.target === "trip") {
    if (!proposerStillOwner) {
      return deny(proposal, "not_owner")
    }
  }
  return {
    kind: "apply",
    effect: effectFor(proposal, actor, confirmerDisplayName?.trim() ?? ""),
    confirmedBy: actor.userId,
  }
}

export function decideReject(
  proposal: Proposal,
  actor: RejectActor,
  members: readonly Member[],
):
  | { kind: "deny"; error: "not_pending_for"; proposal: PendingProposal }
  | { kind: "unchanged"; proposal: ConfirmedProposal | RejectedProposal }
  | { kind: "reject"; proposal: RejectedProposal } {
  if (proposal.status !== "pending") {
    return { kind: "unchanged", proposal }
  }
  if (actor.userId === proposal.proposedBy) {
    return { kind: "reject", proposal: asRejected(proposal) }
  }
  if (proposal.target === "trip" && proposal.op === "add") {
    return { kind: "reject", proposal: asRejected(proposal) }
  }
  const gate = partnerGate(proposal, members)
  if (gate.kind === "named" && gate.userId === actor.userId) {
    return { kind: "reject", proposal: asRejected(proposal) }
  }
  return { kind: "deny", error: "not_pending_for", proposal }
}

function nameFor(userId: UserId, members: readonly Member[], fallback: string | null): string {
  return members.find((member) => member.userId === userId)?.displayName ?? fallback ?? ""
}

export function toWriteResponse(
  proposal: Proposal,
  members: readonly Member[],
  scopeUsed: WriteResponse["scope_used"],
): WriteResponse {
  const proposerFallback =
    proposal.target === "trip" && proposal.op === "add" ? proposal.ownerDisplayName : null
  const pending =
    proposal.status === "pending" ? partnerGate(proposal, members) : { kind: "blocked" as const }
  const pendingFor =
    proposal.status === "pending" && pending.kind === "named"
      ? {
          userId: pending.userId,
          displayName: nameFor(pending.userId, members, null),
        }
      : null
  return {
    proposalId: proposal.proposalId,
    status: proposal.status,
    target: proposal.target,
    op: proposal.op,
    host: proposal.host,
    scope_used: scopeUsed,
    tripId: proposal.status === "confirmed" ? proposal.appliedTripId : proposal.tripId,
    itemId: proposal.status === "confirmed" ? proposal.appliedItemId : proposal.itemId,
    glance_url: proposal.status === "pending" ? glanceUrl(proposal.proposalId) : null,
    summary: proposal.summary,
    proposed_by: {
      userId: proposal.proposedBy,
      displayName: nameFor(proposal.proposedBy, members, proposerFallback),
    },
    confirmed_by:
      proposal.status === "confirmed"
        ? {
            userId: proposal.confirmedBy,
            displayName: nameFor(proposal.confirmedBy, members, null),
          }
        : null,
    pending_for: pendingFor,
  }
}
