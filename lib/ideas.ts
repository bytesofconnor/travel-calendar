export type IdeaStatus = "open" | "placed"

export type IdeaRecord = {
  id: string
  text: string
  linkUrl?: string
  suggestedBy: string
  goUserIds: string[]
  status: IdeaStatus
  suggestedDate?: string
  sourceItemId?: string
  derived?: boolean
}

export type NotePlanSource = {
  id: string
  title: string
  linkUrl?: string
  createdBy: string
  startDate: string
  planType?: string
}

export function ideaFromNote(item: NotePlanSource): IdeaRecord | null {
  const text = item.title.trim()
  if (item.planType !== "note" || !text) return null
  return {
    id: `note:${item.id}`,
    text,
    ...(item.linkUrl?.trim() ? { linkUrl: item.linkUrl.trim() } : {}),
    suggestedBy: item.createdBy,
    goUserIds: [],
    status: "open",
    ...(item.startDate ? { suggestedDate: item.startDate } : {}),
    sourceItemId: item.id,
    derived: true,
  }
}

export function openIdeas(stored: readonly IdeaRecord[], notes: readonly NotePlanSource[]): IdeaRecord[] {
  const sourced = new Set(stored.flatMap((idea) => (idea.sourceItemId ? [idea.sourceItemId] : [])))
  const derived = notes.flatMap((item) => {
    if (sourced.has(item.id)) return []
    const idea = ideaFromNote(item)
    return idea ? [idea] : []
  })
  return [...stored.filter((idea) => idea.status === "open"), ...derived]
}

export function goIdsForDay(
  goUserIds: readonly string[],
  currentUserId: string,
  memberIds: readonly string[],
): string[] {
  const members = new Set(memberIds)
  const ids: string[] = []
  const seen = new Set<string>()
  for (const id of [...goUserIds, currentUserId]) {
    if (!id || !members.has(id) || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

export function plansWithoutNotes<T extends { planType?: string }>(items: readonly T[]): T[] {
  return items.filter((item) => item.planType !== "note")
}
