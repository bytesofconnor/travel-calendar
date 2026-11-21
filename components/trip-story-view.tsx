"use client"

import { AttendeeStack, visibleFaceLabel, whoLine, type AttendeeMember } from "@/components/attendee-faces"
import { cn } from "@/lib/utils"
import type { TripItem } from "@/lib/kanban-store"
import {
  formatChapterDate,
  groupItemsByStartDate,
  inferPlanKind,
  itemMetaLine,
  shownLabel,
  shownMode,
  type PlanKind,
} from "@/lib/trip-kind"
import { TravelMark } from "@/components/travel-mark"
import { KindChip } from "@/components/capture-dock"
import { LiveWhisper } from "@/components/live-whisper"
import { DayWeather, type DayWeatherState } from "@/components/weather-chip"

interface TripStoryViewProps {
  mode: "trip" | "today"
  items: TripItem[]
  today: string
  tripStart: string
  tripEnd: string
  dayNumber?: number
  currentUserId?: string
  members?: readonly AttendeeMember[]
  emphasizeItemId?: string | null
  packingChecked: number
  packingTotal: number
  notesCount: number
  onEditItem: (item: TripItem) => void
  onStartFlight: () => void
  onStartStay: () => void
  onStartPlace: () => void
  onInvite: () => void
  onOpenPacking: () => void
  onOpenNotes: () => void
  onOpenAsk: () => void
  weather?: DayWeatherState
  className?: string
}

function PlanCard({
  item,
  kind,
  members,
  emphasize,
  onClick,
}: {
  item: TripItem
  kind: PlanKind
  members: readonly AttendeeMember[]
  emphasize?: boolean
  onClick: () => void
}) {
  const meta = itemMetaLine(item, kind)
  const label = shownLabel(item)
  const mode = shownMode(item)
  const who = whoLine(item.attendeeIds, members)
  const faces = visibleFaceLabel(item.attendeeIds, members)
  const visible = [label, item.authorName, item.confirmLine, item.title, meta, faces]
    .filter((part) => part && part.trim())
    .join(" ")
  const detail = `${label}: ${item.title}${meta ? `. ${meta}` : ""}${who ? `. ${who}` : ""}${item.confirmLine ? `. ${item.confirmLine}` : ""}`
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${visible}. ${detail}`}
      className={cn(
        "plan-card w-full",
        `plan-card--${kind}`,
        emphasize && "plan-card--emphasize",
      )}
    >
      <span className="plan-card__rail" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {/* Zero-width spaces keep adjacent text as separate words in the accessible name. */}
          <span className="plan-card__kind">
            {mode ? <TravelMark mode={mode} label={label} /> : label}
            {"\u200B"}
          </span>
          {item.authorName ? (
            <span className="ml-auto truncate text-[11px] text-muted-foreground">
              {item.authorName}{"\u200B"}
            </span>
          ) : null}
        </span>
        {item.confirmLine ? (
          <span className="mt-0.5 block truncate text-right text-[11px] text-muted-foreground">
            {item.confirmLine}{"\u200B"}
          </span>
        ) : null}
        <span className="plan-card__title">{item.title}{"\u200B"}</span>
        {meta ? <span className="plan-card__meta">{meta}{"\u200B"}</span> : null}
        <AttendeeStack attendeeIds={item.attendeeIds} members={members} />
      </span>
    </button>
  )
}

function SecondaryPeeks({
  packingChecked,
  packingTotal,
  notesCount,
  onOpenPacking,
  onOpenNotes,
  onOpenAsk,
}: {
  packingChecked: number
  packingTotal: number
  notesCount: number
  onOpenPacking: () => void
  onOpenNotes: () => void
  onOpenAsk: () => void
}) {
  return (
    <nav className="story-secondary" aria-label="Trip tools">
      <KindChip
        kind="note"
        label={`Packing ${packingChecked}/${Math.max(packingTotal, 0)}`}
        onClick={onOpenPacking}
      />
      <KindChip
        kind="note"
        label={notesCount > 0 ? `${notesCount} notes` : "Notes"}
        onClick={onOpenNotes}
      />
      <KindChip kind="ask" label="Ask" onClick={onOpenAsk} />
    </nav>
  )
}

export function TripStoryView({
  mode,
  items,
  today,
  tripStart,
  tripEnd,
  dayNumber = 1,
  currentUserId,
  members = [],
  emphasizeItemId,
  packingChecked,
  packingTotal,
  notesCount,
  onEditItem,
  onStartFlight,
  onStartStay,
  onStartPlace: _onStartPlace,
  onInvite,
  onOpenPacking,
  onOpenNotes,
  onOpenAsk,
  weather,
  className,
}: TripStoryViewProps) {
  const chapters = groupItemsByStartDate(items)
  const todayItems = items.filter(
    (item) => item.startDate <= today && item.endDate >= today,
  )
  const tomorrowHint = chapters.find((chapter) => chapter.date > today)

  if (mode === "today") {
    const place =
      todayItems.find((item) => inferPlanKind(item) === "stay")?.location ||
      todayItems[0]?.location ||
      "Today"

    return (
      <div className={cn("flex min-h-full flex-col", className)}>
        <header className="pb-3 pt-5">
          <p className="story-kicker text-[var(--live)]">
            {formatChapterDate(today)} · Day {dayNumber}
          </p>
          <h2 className="story-chapter__place mt-2">{place}</h2>
          {weather ? <DayWeather date={today} readings={weather.readings} units={weather.units} /> : null}
          <p className="story-lede mt-2.5">
            {todayItems.length === 0
              ? "Nothing planned yet — add what’s happening."
              : "Here’s what’s on for today."}
          </p>
        </header>

        <LiveWhisper items={items} currentUserId={currentUserId} />

        <div className="flex flex-col gap-2.5 pb-4" role="list">
          {todayItems.map((item, index) => {
            const kind = index === 0 ? ("now" as const) : inferPlanKind(item)
            return (
              <div key={item.id} role="listitem">
                <PlanCard
                  item={item}
                  kind={kind}
                  members={members}
                  emphasize={index === 0 || item.id === emphasizeItemId}
                  onClick={() => onEditItem(item)}
                />
              </div>
            )
          })}
        </div>

        {tomorrowHint ? (
          <p className="pb-4 text-[0.8125rem] text-muted-foreground">
            Tomorrow · {tomorrowHint.items[0]?.title ?? formatChapterDate(tomorrowHint.date)}
          </p>
        ) : null}

        <div className="mt-auto pb-6">
          <SecondaryPeeks
            packingChecked={packingChecked}
            packingTotal={packingTotal}
            notesCount={notesCount}
            onOpenPacking={onOpenPacking}
            onOpenNotes={onOpenNotes}
            onOpenAsk={onOpenAsk}
          />
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className={cn("flex min-h-full flex-col pb-6 pt-5", className)}>
        <header>
          <p className="create-join__eyebrow create-join__eyebrow--ink">
            <span className="create-join__eyebrow-dot" aria-hidden="true" />
            Together
          </p>
          <h2 className="story-display story-display--arrive mt-2">Start the story</h2>
          <p className="story-lede mt-3">
            Flights and stays first — then fill the days between.
          </p>
        </header>

        <ul className="arrive-list mt-6" aria-label="Ways to start">
          <li>
            <button type="button" onClick={onStartFlight} className="arrive-row arrive-row--flight">
              <span className="arrive-row__kind">Flight</span>
              <span className="arrive-row__copy">
                <span className="arrive-row__title">Add your flights</span>
                <span className="arrive-row__meta">Anchors the trip</span>
              </span>
              <span className="arrive-row__go" aria-hidden="true">
                →
              </span>
            </button>
          </li>
          <li>
            <button type="button" onClick={onStartStay} className="arrive-row arrive-row--stay">
              <span className="arrive-row__kind">Stay</span>
              <span className="arrive-row__copy">
                <span className="arrive-row__title">Add where you&apos;re staying</span>
                <span className="arrive-row__meta">Home base for each city</span>
              </span>
              <span className="arrive-row__go" aria-hidden="true">
                →
              </span>
            </button>
          </li>
        </ul>

        <div className="mt-auto space-y-4 pt-8">
          <button type="button" onClick={onInvite} className="create-join__submit">
            <span>Invite people</span>
            <span className="create-join__submit-arrow" aria-hidden="true">
              →
            </span>
          </button>
          <SecondaryPeeks
            packingChecked={packingChecked}
            packingTotal={packingTotal}
            notesCount={notesCount}
            onOpenPacking={onOpenPacking}
            onOpenNotes={onOpenNotes}
            onOpenAsk={onOpenAsk}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex min-h-full flex-col", className)}>
      <div className="pt-2">
        <LiveWhisper items={items} currentUserId={currentUserId} />
      </div>

      {chapters.map((chapter) => {
        const stay = chapter.items.find((item) => inferPlanKind(item) === "stay")
        const place = stay?.location || chapter.items[0]?.location || "—"
        const note = stay?.notes?.trim() || undefined
        return (
          <section key={chapter.date} className="pb-1" aria-labelledby={`chapter-${chapter.date}`}>
            <header className="pb-3 pt-6">
              <p className="story-chapter__date">{formatChapterDate(chapter.date)}</p>
              <h2 id={`chapter-${chapter.date}`} className="story-chapter__place mt-1.5">
                {place}
              </h2>
              {weather ? (
                <DayWeather date={chapter.date} readings={weather.readings} units={weather.units} />
              ) : null}
              {note ? <p className="story-chapter__note">{note}</p> : null}
            </header>
            <div className="flex flex-col gap-2.5" role="list">
              {chapter.items.map((item) => {
                const kind = inferPlanKind(item)
                return (
                  <div key={item.id} role="listitem">
                    <PlanCard
                      item={item}
                      kind={kind}
                      members={members}
                      emphasize={item.id === emphasizeItemId}
                      onClick={() => onEditItem(item)}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      <div className="mt-auto pb-8 pt-4">
        <SecondaryPeeks
          packingChecked={packingChecked}
          packingTotal={packingTotal}
          notesCount={notesCount}
          onOpenPacking={onOpenPacking}
          onOpenNotes={onOpenNotes}
          onOpenAsk={onOpenAsk}
        />
      </div>

      <p className="sr-only">
        Trip runs {tripStart} to {tripEnd}
      </p>
    </div>
  )
}
