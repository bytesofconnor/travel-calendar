export type Attendance = {
  everyone: boolean
  includedIds: string[]
}

function unique<T extends string>(ids: readonly T[]): T[] {
  const seen = new Set<T>()
  const list: T[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    list.push(id)
  }
  return list
}

export function resolveAttendance<T extends string>(
  stored: readonly T[] | undefined,
  memberIds: readonly T[],
): { everyone: boolean; includedIds: T[] } {
  const members = unique(memberIds)
  if (!stored || stored.length === 0) {
    return { everyone: true, includedIds: members }
  }
  const allowed = new Set(stored)
  const included = members.filter((id) => allowed.has(id))
  if (included.length === 0 || included.length === members.length) {
    return { everyone: true, includedIds: members }
  }
  return { everyone: false, includedIds: included }
}

export function storedAttendeeIds<T extends string>(
  requested: readonly T[] | undefined,
  memberIds: readonly T[],
): T[] | undefined {
  const attendance = resolveAttendance(requested, memberIds)
  return attendance.everyone ? undefined : attendance.includedIds
}

export function toggleMember<T extends string>(
  stored: readonly T[] | undefined,
  memberIds: readonly T[],
  memberId: T,
): T[] | undefined {
  const members = unique(memberIds)
  if (!members.includes(memberId)) return storedAttendeeIds(stored, members)
  const current = resolveAttendance(stored, members)
  if (current.includedIds.includes(memberId) && current.includedIds.length === 1) {
    return current.includedIds
  }
  const next = current.includedIds.includes(memberId)
    ? current.includedIds.filter((id) => id !== memberId)
    : [...current.includedIds, memberId]
  return storedAttendeeIds(next, members)
}

export function attendanceLabel(names: readonly string[], everyone: boolean): string {
  if (everyone || names.length === 0) return "Everyone"
  if (names.length === 1) return names[0] ?? "Everyone"
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`
}

export function faceInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = parts[0] ?? ""
  if (parts.length === 1) return first.charAt(0).toUpperCase() || "?"
  const second = parts[1] ?? ""
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase()
}
