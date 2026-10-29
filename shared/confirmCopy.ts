export const GLANCE_ORIGIN = "https://www.travelcalendar.space"

export type QueueStatus = "pending" | "confirmed" | "rejected"

export type ConfirmQueueRow = {
  proposalId: string
  glanceUrl: string
  text: string
  summary: string
  proposedByName: string
  pendingForName: string | null
  highlighted: boolean
}

export function glanceUrl(proposalId: string): string {
  return `${GLANCE_ORIGIN}/?confirm=${encodeURIComponent(proposalId)}`
}

export function proposalSummary(input: {
  target: "trip" | "item"
  op: "add" | "update" | "remove" | "archive"
  name?: string
  title?: string
  location?: string
  startDate?: string
  endDate?: string
}): string {
  const verb = { add: "Add", update: "Update", archive: "Archive", remove: "Remove" }[input.op]
  if (input.target === "trip") {
    const name = input.name?.trim() || "trip"
    if (input.op === "archive" || !input.startDate || !input.endDate) {
      return `${verb} ${name}`
    }
    return `${verb} ${name} · ${input.startDate} to ${input.endDate}`
  }
  const title = input.title?.trim() || "item"
  const place = input.location?.trim()
  if (!place) {
    return `${verb} ${title}`
  }
  return `${verb} ${title} · ${place}`
}

export function confirmRowText(input: {
  summary: string
  status: QueueStatus
  proposedByName: string
  pendingForName: string | null
  confirmedByName: string | null
  gate: "named" | "any_other_user" | "blocked"
}): string {
  const proposed = `${input.proposedByName} proposed ${input.summary}.`
  if (input.status === "confirmed") {
    const who = input.confirmedByName?.trim() || "A partner"
    return `${proposed} ${who} confirmed.`
  }
  if (input.status === "rejected") {
    return `${proposed} Rejected.`
  }
  if (input.gate === "named" && input.pendingForName?.trim()) {
    return `${proposed} ${input.pendingForName.trim()} still owes confirm.`
  }
  return `${proposed} A partner still owes confirm.`
}
