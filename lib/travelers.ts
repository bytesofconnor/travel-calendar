import { attendanceLabel, resolveAttendance } from "./attendees.ts"

export type TravelerName = {
  userId: string
  displayName: string
}

const FACE_LIMIT = 4

export function firstName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts[0] || "Someone"
}

export function orderTravelers<T extends TravelerName>(members: readonly T[], currentUserId?: string): T[] {
  if (!currentUserId) return [...members]
  const you = members.find((member) => member.userId === currentUserId)
  if (!you) return [...members]
  return [you, ...members.filter((member) => member.userId !== currentUserId)]
}

export function travelerLabel(members: readonly TravelerName[], currentUserId?: string): string {
  const ordered = orderTravelers(members, currentUserId)
  if (ordered.length <= 1) return "Just you"
  const youIsFirst = Boolean(currentUserId) && ordered[0]?.userId === currentUserId
  const others = (youIsFirst ? ordered.slice(1) : ordered).map((member) => firstName(member.displayName))
  if (!youIsFirst) {
    if (others.length === 2) return `${others[0]} & ${others[1]}`
    if (others.length === 3) return `${others[0]} & ${others[1]} & ${others[2]}`
    return `${others[0]} + ${others.length - 1} others`
  }
  if (ordered.length === 2) return `you & ${others[0]}`
  if (ordered.length === 3) return `you & ${others[0]} & ${others[1]}`
  return `you + ${others.length} others`
}

export function travelerAccessibleName(members: readonly TravelerName[], currentUserId?: string): string {
  const ordered = orderTravelers(members, currentUserId)
  const count = Math.max(ordered.length, 1)
  const youIsFirst = Boolean(currentUserId) && ordered[0]?.userId === currentUserId
  const names = ordered.map((member, index) =>
    youIsFirst && index === 0 ? "you" : firstName(member.displayName),
  )
  const listed = names.length > 0 ? names.join(", ") : "you"
  const noun = count === 1 ? "traveler" : "travelers"
  return `${count} ${noun}: ${listed}`
}

export function travelerFaces<T extends TravelerName>(
  members: readonly T[],
  currentUserId?: string,
): { shown: T[]; extra: number } {
  const ordered = orderTravelers(members, currentUserId)
  const shown = ordered.slice(0, FACE_LIMIT)
  return { shown, extra: Math.max(0, ordered.length - shown.length) }
}

export function addPlanTitle(
  attendeeIds: readonly string[] | undefined,
  members: readonly TravelerName[],
): string {
  if (members.length === 0) return "Add for everyone"
  const attendance = resolveAttendance(
    attendeeIds,
    members.map((member) => member.userId),
  )
  if (attendance.everyone) return "Add for everyone"
  const names = attendance.includedIds.flatMap((id) => {
    const member = members.find((entry) => entry.userId === id)
    return member ? [member.displayName.trim() || "Someone"] : []
  })
  return `Add for ${attendanceLabel(names, false)}`
}

export function addedPlanMessage(
  attendeeIds: readonly string[] | undefined,
  members: readonly TravelerName[],
): string {
  return `${addPlanTitle(attendeeIds, members).replace(/^Add /, "Added ")}.`
}

export function inviteCopy(
  tripName: string,
  members: readonly TravelerName[],
  currentUserId?: string,
): { title: string; description: string } {
  const others = orderTravelers(members, currentUserId).filter((member) => member.userId !== currentUserId)
  if (members.length <= 1 || others.length === 0) {
    return {
      title: "Invite the people you're traveling with",
      description: `Share ${tripName}. Everyone you invite sees each plan as soon as it's added.`,
    }
  }
  const names = others.map((member) => firstName(member.displayName))
  const already =
    names.length === 1
      ? `${names[0]} is already on this trip`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are already on this trip`
        : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]} are already on this trip`
  return {
    title: "Invite someone else",
    description: `${already}. Send the link and they can join ${tripName}.`,
  }
}
