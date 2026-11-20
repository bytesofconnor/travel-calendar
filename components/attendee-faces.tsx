"use client"

import { Check, Minus } from "lucide-react"

import {
  attendanceLabel,
  attendanceSummary,
  faceInitials,
  resolveAttendance,
  toggleMember,
} from "@/lib/attendees"

export type AttendeeMember = {
  userId: string
  displayName: string
  image?: string | null
}

function portraitStyle(image: string | null | undefined): { backgroundImage: string } | undefined {
  if (!image || !/^https:\/\/[^\s"'()\\]+$/.test(image)) return undefined
  return { backgroundImage: `url("${image.replaceAll('"', "")}")` }
}

function Face({ member }: { member: AttendeeMember }) {
  const photo = portraitStyle(member.image)
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center rounded-full bg-cover bg-center"
      style={photo}
    >
      {photo ? null : faceInitials(member.displayName)}
    </span>
  )
}

export function visibleFaceLabel(
  attendeeIds: readonly string[] | undefined,
  members: readonly AttendeeMember[],
): string {
  if (!whoLine(attendeeIds, members)) return ""
  const attendance = resolveAttendance(
    attendeeIds,
    members.map((member) => member.userId),
  )
  const people = attendance.includedIds.flatMap((id) => {
    const member = members.find((entry) => entry.userId === id)
    return member ? [member] : []
  })
  const shown = people.slice(0, 5)
  const extra = people.length - shown.length
  const parts = shown.map((member) => faceInitials(member.displayName))
  if (extra > 0) parts.push(`+${extra}`)
  return parts.join(" ")
}

export function whoLine(attendeeIds: readonly string[] | undefined, members: readonly AttendeeMember[]): string {
  if (members.length === 0) return ""
  const attendance = resolveAttendance(
    attendeeIds,
    members.map((member) => member.userId),
  )
  if (attendance.everyone) return ""
  const names = attendance.includedIds.flatMap((id) => {
    const member = members.find((entry) => entry.userId === id)
    return member ? [member.displayName] : []
  })
  return names.length > 0 ? attendanceLabel(names, false) : ""
}

export function AttendeeStack({
  attendeeIds,
  members,
}: {
  attendeeIds?: readonly string[]
  members: readonly AttendeeMember[]
}) {
  const line = whoLine(attendeeIds, members)
  if (!line) return null
  const attendance = resolveAttendance(
    attendeeIds,
    members.map((member) => member.userId),
  )
  const people = attendance.includedIds.flatMap((id) => {
    const member = members.find((entry) => entry.userId === id)
    return member ? [member] : []
  })
  const shown = people.slice(0, 5)
  const extra = people.length - shown.length

  return (
    <span className="mt-2 flex items-center" aria-hidden="true">
      {shown.map((member, index) => (
        <span
          key={member.userId}
          className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-card bg-foreground text-[10px] font-semibold leading-none text-background"
          style={{ marginLeft: index === 0 ? 0 : "-0.4rem" }}
        >
          <Face member={member} />
          {"\u200B"}
        </span>
      ))}
      {extra > 0 ? (
        <span className="ml-1.5 text-xs font-semibold text-foreground">
          +{extra}
          {"\u200B"}
        </span>
      ) : null}
    </span>
  )
}

export function AttendeeToggles({
  members,
  attendeeIds,
  onChange,
}: {
  members: readonly AttendeeMember[]
  attendeeIds?: readonly string[]
  onChange: (next: string[] | undefined) => void
}) {
  if (members.length === 0) return null
  const memberIds = members.map((member) => member.userId)
  const attendance = resolveAttendance(attendeeIds, memberIds)
  const summary = attendanceSummary(members, attendeeIds)

  return (
    <div role="group" aria-labelledby="plan-who-label" data-who="in" className="space-y-2">
      <p id="plan-who-label" className="text-sm font-medium text-foreground">
        Who&apos;s in
      </p>
      <p id="plan-who-status" aria-live="polite" className="text-sm font-medium text-foreground">
        {summary}
      </p>
      <div className="flex flex-wrap gap-2">
        {members.map((member) => {
          const included = attendance.includedIds.includes(member.userId)
          return (
            <button
              key={member.userId}
              type="button"
              aria-pressed={included}
              title={member.displayName}
              aria-label={`${member.displayName}, ${included ? "included" : "not included"}`}
              onClick={() => onChange(toggleMember(attendeeIds, memberIds, member.userId))}
              className={`relative inline-flex size-[44px] shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                included
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground bg-background text-foreground"
              }`}
            >
              <Face member={member} />
              <span className="absolute -right-0.5 -bottom-0.5 flex size-[16px] items-center justify-center rounded-full border border-foreground bg-background text-foreground">
                {included ? <Check className="size-[10px]" strokeWidth={3} aria-hidden="true" /> : <Minus className="size-[10px]" strokeWidth={3} aria-hidden="true" />}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
