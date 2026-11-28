"use client"

import { forwardRef, useState, type FormEvent, type MutableRefObject, type RefObject } from "react"

import { PeekSheet } from "@/components/peek-sheet"
import { faceInitials } from "@/lib/attendees"
import type { IdeaRecord } from "@/lib/ideas"

export type IdeaMember = {
  userId: string
  displayName: string
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Someone"
}

function shortDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return ""
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date)
}

function safeLink(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    if (url.protocol !== "http:" && url.protocol !== "https:") return ""
    return url.toString()
  } catch {
    return ""
  }
}

export const IdeasLink = forwardRef<HTMLButtonElement, { count: number; onClick: () => void }>(function IdeasLink(
  { count, onClick },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className="trip-tool-link"
      aria-label={`Ideas, ${count} open`}
      onClick={onClick}
    >
      Ideas · {count}
    </button>
  )
})

export function IdeasSheet({
  open,
  onOpenChange,
  ideas,
  members,
  currentUserId,
  reviewActorSwitch = false,
  actors,
  actorId,
  onActor,
  onAdd,
  onToggle,
  onPlace,
  returnFocusRef,
  skipReturnFocusRef,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ideas: readonly IdeaRecord[]
  members: readonly IdeaMember[]
  currentUserId: string
  reviewActorSwitch?: boolean
  actors?: readonly IdeaMember[]
  actorId?: string
  onActor?: (userId: string) => void
  onAdd: (text: string, linkUrl?: string) => void
  onToggle: (idea: IdeaRecord) => void
  onPlace: (idea: IdeaRecord) => void
  returnFocusRef?: RefObject<HTMLButtonElement | null>
  skipReturnFocusRef?: MutableRefObject<boolean>
}) {
  const [text, setText] = useState("")
  const [showLink, setShowLink] = useState(false)
  const [link, setLink] = useState("")
  const [linkError, setLinkError] = useState("")

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = text.trim()
    if (!next) return
    const linkUrl = showLink ? safeLink(link) : ""
    if (showLink && link.trim() && !linkUrl) {
      setLinkError("Use a full link, like https://example.com")
      return
    }
    onAdd(next, linkUrl || undefined)
    setText("")
    setLink("")
    setLinkError("")
    setShowLink(false)
  }

  return (
    <PeekSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Ideas"
      meta="Not on a day yet. Anyone can add one."
      onCloseAutoFocus={(event) => {
        if (skipReturnFocusRef?.current) {
          skipReturnFocusRef.current = false
          event.preventDefault()
          return
        }
        if (!returnFocusRef?.current) return
        event.preventDefault()
        returnFocusRef.current.focus()
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <form className="shrink-0 space-y-2 border-b border-border px-5 py-3" onSubmit={submit}>
          {reviewActorSwitch && actors && actors.length > 0 && onActor ? (
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              Acting as
              <select
                aria-label="Acting as"
                className="h-11 min-h-11 rounded-md border border-foreground bg-background px-2 text-base text-foreground"
                value={actorId}
                onChange={(event) => onActor(event.target.value)}
              >
                {actors.map((actor) => (
                  <option key={actor.userId} value={actor.userId}>
                    {actor.displayName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="idea-text">
              Add an idea
            </label>
            <input
              id="idea-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Add an idea..."
              className="h-11 min-h-11 min-w-0 flex-1 rounded-md border border-foreground bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--together)]"
            />
            <button
              type="submit"
              className="inline-flex h-11 min-h-11 items-center rounded-md bg-foreground px-4 text-sm font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--together)]"
            >
              Add
            </button>
          </div>
          <button
            type="button"
            className="inline-flex h-11 min-h-11 items-center text-sm font-semibold text-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--together)]"
            aria-expanded={showLink}
            onClick={() => {
              setShowLink((current) => !current)
              setLinkError("")
            }}
          >
            Link
          </button>
          {showLink ? (
            <div className="space-y-1">
              <label className="sr-only" htmlFor="idea-link">
                Link
              </label>
              <input
                id="idea-link"
                value={link}
                onChange={(event) => {
                  setLink(event.target.value)
                  setLinkError("")
                }}
                placeholder="https://"
                inputMode="url"
                className="h-11 min-h-11 w-full rounded-md border border-foreground bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--together)]"
              />
              {linkError ? (
                <p className="text-sm font-medium text-destructive" role="alert">
                  {linkError}
                </p>
              ) : null}
            </div>
          ) : null}
        </form>
        <ul aria-label="Ideas" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3">
          {ideas.length === 0 ? (
            <li className="py-6 text-sm font-medium text-foreground">No ideas yet. Add one above.</li>
          ) : (
            ideas.map((idea) => {
              const suggester = members.find((member) => member.userId === idea.suggestedBy)
              const going = idea.goUserIds.flatMap((id) => {
                const member = members.find((entry) => entry.userId === id)
                return member ? [member] : []
              })
              const mine = idea.goUserIds.includes(currentUserId)
              const goLabel = going.length > 0 ? `I'd go. ${going.map((member) => member.displayName).join(", ")}` : "I'd go"
              const when = idea.suggestedDate ? shortDate(idea.suggestedDate) : ""
              return (
                <li key={idea.id} className="rounded-md border border-foreground bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {idea.linkUrl ? (
                        <a
                          href={idea.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-base font-semibold text-foreground underline underline-offset-4"
                        >
                          {idea.text}
                        </a>
                      ) : (
                        <p className="text-base font-semibold text-foreground">{idea.text}</p>
                      )}
                      <p className="mt-0.5 text-sm text-foreground">
                        {firstName(suggester?.displayName ?? "Someone")} suggested
                        {when ? ` · ${when}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className="inline-flex h-11 min-h-11 items-center gap-2 rounded-full border border-foreground bg-background px-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--together)]"
                      aria-pressed={mine}
                      aria-label={goLabel}
                      onClick={() => onToggle(idea)}
                    >
                      {going.length > 0 ? (
                        <span aria-hidden="true" className="flex items-center">
                          {going.map((member) => (
                            <span
                              key={member.userId}
                              className="-ml-1 flex size-7 items-center justify-center rounded-full border border-foreground bg-foreground text-[11px] font-bold text-background first:ml-0"
                            >
                              {faceInitials(member.displayName)}
                            </span>
                          ))}
                        </span>
                      ) : null}
                      I&apos;d go
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-11 min-h-11 items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--together)]"
                      onClick={() => onPlace(idea)}
                    >
                      Put on a day
                    </button>
                  </div>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </PeekSheet>
  )
}
