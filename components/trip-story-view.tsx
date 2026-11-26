"use client"

import { Moon } from "lucide-react"

import { AttendeeStack, whoLine, type AttendeeMember } from "@/components/attendee-faces"
import { PlanWhen } from "@/components/plan-when"
import { cn } from "@/lib/utils"
import type { TripItem } from "@/lib/kanban-store"
import { describePlanWhen, groupItemsByDay } from "@/lib/plan-when"
import { todayBrief, type NextLeg } from "@/lib/trip-glance"
import {
  dayIndexInTrip,
  formatChapterDate,
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

export interface TripStoryViewProps {
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
  filterName?: string
  className?: string
  onShowTrip?: () => void
  onShowToday?: () => void
  pinnedDate?: string | null
}

function nextCopy(leg: NextLeg, today: string): string {
  const route = [leg.from, leg.to].filter(Boolean).join(" → ")
  const date = leg.date !== today ? ` · ${formatChapterDate(leg.date)}` : ""
  return [`Next`, leg.title, leg.timeLabel, route].filter(Boolean).join(" · ") + date
}

function TodaySwitch({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="today-switch" onClick={onClick}>
      {label}
    </button>
  )
}

function PlanCard({
  item,
  day,
  dayItems,
  kind,
  members,
  emphasize,
  onClick,
}: {
  item: TripItem
  day: string
  dayItems: readonly TripItem[]
  kind: PlanKind
  members: readonly AttendeeMember[]
  emphasize?: boolean
  onClick: () => void
}) {
  const meta = itemMetaLine(item, kind)
  const label = shownLabel(item)
  const mode = shownMode(item)
  const described = describePlanWhen(item, day, dayItems)
  const who = whoLine(item.attendeeIds, members)
  const word = "\u200B"
  const raw = [
    `${label}${word}`,
    item.authorName ? `${item.authorName}${word}` : "",
    item.confirmLine ? `${item.confirmLine}${word}` : "",
    `${item.title}${word}`,
    described.parts.map((part) => `${part.text}${word}`).join(""),
    meta ? `${meta}${word}` : "",
  ].join("")
  const detail = `${label}: ${item.title}${meta ? `. ${meta}` : ""}. ${described.label}${who ? `. ${who}` : ""}${item.confirmLine ? `. ${item.confirmLine}` : ""}`
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${raw}. ${detail}`}
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
        <PlanWhen item={item} day={day} dayItems={dayItems} />
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
  filterName,
  className,
  onShowTrip,
  onShowToday,
  pinnedDate,
}: TripStoryViewProps) {
  const chapters = groupItemsByDay(items)
  const brief = todayBrief(items, today, tripStart, tripEnd)
  const todayItems = brief.plans
  const tomorrowHint = chapters.find((chapter) => chapter.date > today)

  if (mode === "today") {
    const place = brief.sleep?.city || todayItems[0]?.location || "Today"

    return (
      <div className={cn("flex min-h-full flex-col", className)} data-today-screen="">
        <header className="pb-3 pt-5">
          <div className="today-toolbar">
            <p className="story-kicker">
              {formatChapterDate(today)} · Day {dayIndexInTrip(today, tripStart)}
            </p>
            {onShowTrip ? <TodaySwitch label="Full trip" onClick={onShowTrip} /> : null}
          </div>
          <h2 className="story-chapter__place mt-2">{place}</h2>
          {weather ? <DayWeather date={today} readings={weather.readings} units={weather.units} /> : null}
          <div className="today-facts">
            {brief.sleep ? (
              <p className="today-facts__line">
                <span className="plan-when__tag">
                  <Moon className="plan-when__icon" aria-hidden="true" />
                  <span>
                    Sleep here tonight
                    {brief.sleep.city ? ` · ${brief.sleep.city}` : ""}
                    {` · ${brief.sleep.title}`}
                  </span>
                </span>
              </p>
            ) : (
              <p className="today-facts__line">
                <span className="today-missing">No stay booked tonight</span>
              </p>
            )}
            {brief.nextLeg ? (
              <p className="today-facts__line">
                <span className="plan-when__tag">
                  <span>{nextCopy(brief.nextLeg, today)}</span>
                </span>
              </p>
            ) : null}
          </div>
          <p className="story-lede mt-2.5">
            {todayItems.length === 0
              ? filterName
                ? `No plans for ${filterName} today.`
                : "Nothing planned yet — add what’s happening."
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
                  day={today}
                  dayItems={todayItems}
                  kind={kind}
                  members={members}
                  emphasize={index === 0 || item.id === emphasizeItemId}
                  onClick={() => onEditItem(item)}
                />
              </div>
            )
          })}
        </div>

        {tomorrowHint && !brief.nextLeg ? (
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

  if (items.length === 0 && filterName) {
    return (
      <div className={cn("flex flex-col gap-3 py-6", className)}>
        {onShowToday ? <TodaySwitch label="Today" onClick={onShowToday} /> : null}
        <p className="story-lede" role="status">
          No plans for {filterName}.
        </p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className={cn("flex min-h-full flex-col pb-6 pt-5", className)}>
        {onShowToday ? <TodaySwitch label="Today" onClick={onShowToday} /> : null}
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

  const shown = [...chapters]
  if (pinnedDate && !shown.some((chapter) => chapter.date === pinnedDate)) {
    shown.push({ date: pinnedDate, items: [] })
    shown.sort((left, right) => left.date.localeCompare(right.date))
  }

  return (
    <div className={cn("flex min-h-full flex-col", className)}>
      <div className="pt-2">
        {onShowToday ? <TodaySwitch label="Today" onClick={onShowToday} /> : null}
        <LiveWhisper items={items} currentUserId={currentUserId} />
      </div>

      {shown.map((chapter) => {
        const stay = chapter.items.find((item) => inferPlanKind(item) === "stay")
        const place = chapter.items.length === 0 ? "Nothing planned" : stay?.location || chapter.items[0]?.location || "—"
        const note = stay && stay.startDate === chapter.date ? stay.notes?.trim() || undefined : undefined
        return (
          <section
            key={chapter.date}
            className="pb-1"
            aria-labelledby={`chapter-date-${chapter.date} chapter-${chapter.date}`}
          >
            <header className="pb-3 pt-6">
              <p id={`chapter-date-${chapter.date}`} className="story-chapter__date">
                {formatChapterDate(chapter.date)}
              </p>
              <h2 id={`chapter-${chapter.date}`} tabIndex={-1} className="story-chapter__place mt-1.5">
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
                      day={chapter.date}
                      dayItems={chapter.items}
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
