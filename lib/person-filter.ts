import { resolveAttendance } from "./attendees.ts"

export function filterItems<T extends { attendeeIds?: readonly string[] | undefined }>(
  items: readonly T[],
  userId: string | null,
  memberIds: readonly string[],
): T[] {
  if (!userId || !memberIds.includes(userId)) return [...items]
  return items.filter((item) => resolveAttendance(item.attendeeIds, memberIds).includedIds.includes(userId))
}

export function writeWho(userId: string | null) {
  if (typeof window === "undefined") return
  const url = new URL(window.location.href)
  if (userId) url.searchParams.set("who", userId)
  else url.searchParams.delete("who")
  const next = `${url.pathname}${url.search}${url.hash}`
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (next === current) return
  window.history.replaceState(window.history.state, "", next)
}
