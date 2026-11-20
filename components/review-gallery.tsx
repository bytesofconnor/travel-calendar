"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Calendar, Ellipsis } from "lucide-react"

import type { Id } from "@/convex/_generated/dataModel"
import { CaptureDock, type CaptureKind } from "@/components/capture-dock"
import { useDayWeather } from "@/components/day-weather"
import { ConfirmQueue } from "@/components/confirm-queue"
import { CreateJoinScreen } from "@/components/create-join-screen"
import { EditTripDialog } from "@/components/edit-trip-dialog"
import { ItemDialog } from "@/components/item-dialog"
import { PaywallScreen } from "@/components/paywall-screen"
import { ShareTripDialog } from "@/components/share-trip-dialog"
import { ThemePackPickerMenuItems } from "@/components/theme-pack-menu"
import { TripCover, SpectrumHairline } from "@/components/trip-cover"
import { TripHome } from "@/components/trip-home"
import { TripMonthView } from "@/components/trip-month-view"
import { TripStoryView } from "@/components/trip-story-view"
import { TripsSheet } from "@/components/trips-sheet"
import { useTripThemePack } from "@/components/use-trip-theme-pack"
import { AddToCalendarSheet } from "@/components/add-to-calendar-sheet"
import { Button } from "@/components/ui/button"
import { StoryChrome } from "@/components/story-chrome"
import { travelerLabel } from "@/lib/travelers"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Trip, TripItem, TripItemInput, TripMember } from "@/lib/kanban-store"
import { defaultPlanDate, guessPlanType } from "@/lib/plan-form"
import type { PlanType } from "@/lib/plan-types"
import { buildTripHome, type GapAction } from "@/lib/trip-home/detect"
import type { WeatherReading } from "@/lib/weather"
import { parseThemePack, type ThemePackId } from "@/lib/theme-packs"

const TRIP_ID = "trip_lisbon"
const USER_ID = "user_connor"
const REVIEW_TRIP_ID = "trips_review" as Id<"trips">
const REVIEW_CALENDAR_TOKEN = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const REVIEW_CALENDAR_TOKEN_RESET = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

const members: TripMember[] = [
  { tripId: TRIP_ID, userId: USER_ID, role: "owner", displayName: "Connor" },
  { tripId: TRIP_ID, userId: "user_alex", role: "editor", displayName: "Alex" },
  { tripId: TRIP_ID, userId: "user_mom", role: "editor", displayName: "Mom" },
  { tripId: TRIP_ID, userId: "user_dad", role: "editor", displayName: "Dad" },
]

const trips: Trip[] = [
  {
    id: TRIP_ID,
    name: "Lisbon with you",
    inviteCode: "ab12cd34ef56",
    startDate: "2026-11-18",
    endDate: "2026-11-24",
    createdBy: USER_ID,
    createdAt: "2026-11-01T12:00:00.000Z",
    themePack: null,
  },
  {
    id: "trip_kyoto",
    name: "Kyoto in spring",
    inviteCode: "ky0t0spring1",
    startDate: "2027-03-28",
    endDate: "2027-04-04",
    createdBy: USER_ID,
    createdAt: "2026-10-02T12:00:00.000Z",
    themePack: "dusk-rose",
  },
]

const items: TripItem[] = [
  {
    id: "item_flight",
    tripId: TRIP_ID,
    title: "TAP to Lisbon",
    notes: "Aisle seats together",
    startDate: "2026-11-18",
    endDate: "2026-11-18",
    location: "SFO",
    locationTo: "LIS",
    createdBy: USER_ID,
    createdAt: "2026-11-02T12:00:00.000Z",
    updatedAt: "2026-11-02T12:00:00.000Z",
    authorName: "Connor",
    confirmLine: "Connor proposed · Alex confirmed",
  },
  {
    id: "item_stay",
    tripId: TRIP_ID,
    title: "Alfama apartment",
    notes: "Keys in the lockbox",
    startDate: "2026-11-18",
    endDate: "2026-11-24",
    location: "Alfama, Lisbon",
    planType: "stay",
    place: {
      name: "Alfama, Lisbon",
      lat: 38.712,
      lng: -9.13,
      country: "PT",
      timeZone: "Europe/Lisbon",
    },
    createdBy: "user_alex",
    createdAt: "2026-11-02T13:00:00.000Z",
    updatedAt: "2026-11-02T13:00:00.000Z",
    authorName: "Alex",
    confirmLine: "Alex proposed · Connor confirmed",
  },
  {
    id: "item_place",
    tripId: TRIP_ID,
    title: "Time Out Market",
    startDate: "2026-11-19",
    endDate: "2026-11-19",
    location: "Cais do Sodré",
    createdBy: "user_alex",
    createdAt: "2026-11-03T12:00:00.000Z",
    updatedAt: "2026-11-03T12:00:00.000Z",
    authorName: "Alex",
    confirmLine: "Alex proposed · waiting on Connor",
    attendeeIds: [USER_ID, "user_alex"],
  },
]

const editItem = items[2]

const coveredItems: TripItem[] = [
  {
    id: "item_place_only",
    tripId: TRIP_ID,
    title: "Time Out Market",
    startDate: "2026-11-18",
    endDate: "2026-11-18",
    location: "Cais do Sodré",
    createdBy: "user_alex",
    createdAt: "2026-11-03T12:00:00.000Z",
    updatedAt: "2026-11-03T12:00:00.000Z",
    authorName: "Alex",
  },
]

const monthItems: TripItem[] = [
  ...items,
  {
    id: "item_tram",
    tripId: TRIP_ID,
    title: "Tram 28",
    startDate: "2026-11-18",
    endDate: "2026-11-18",
    location: "Alfama",
    createdBy: USER_ID,
    createdAt: "2026-11-03T14:00:00.000Z",
    updatedAt: "2026-11-03T14:00:00.000Z",
  },
  {
    id: "item_dinner",
    tripId: TRIP_ID,
    title: "Dinner",
    startDate: "2026-11-18",
    endDate: "2026-11-18",
    location: "Baixa",
    createdBy: "user_alex",
    createdAt: "2026-11-03T15:00:00.000Z",
    updatedAt: "2026-11-03T15:00:00.000Z",
  },
]

const REVIEW_NOW = { instant: "2026-11-17T18:00:00.000Z", timeZone: "America/Los_Angeles" }

const REVIEW_WEATHER: Record<string, WeatherReading> = Object.fromEntries(
  ["2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23"].map((date) => [
    date,
    {
      date,
      name: "Alfama, Lisbon",
      high: 64,
      low: 54,
      precip: 40,
      condition: "Rain",
      typical: true,
      units: "f" as const,
    },
  ]),
)

function TripFrame({
  screen,
  view,
  onViewChange,
  showCover,
  captureHint,
  themePack,
  travelers,
  meta,
  tripName,
  onOpenMembers,
  onCapture,
  children,
}: {
  screen: string
  view: "list" | "month"
  onViewChange: (view: "list" | "month") => void
  showCover: boolean
  captureHint: string
  themePack: ThemePackId | null
  travelers: TripMember[]
  meta: string
  tripName: string
  onOpenMembers: () => void
  onCapture?: (kind?: CaptureKind, text?: string) => void
  children: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(screen === "theme")
  const [calendarOpen, setCalendarOpen] = useState(screen === "calendar")
  const [calendarToken, setCalendarToken] = useState(REVIEW_CALENDAR_TOKEN)

  return (
    <main
      id="main-content"
      data-review-ready="true"
      data-screen={screen}
      className="together-story relative z-10 flex h-dvh flex-col overflow-hidden"
    >
      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
          <div className="story-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {showCover ? (
              <TripCover
                className="trip-cover--compact"
                tripName={tripName}
                meta={meta}
                showHairline={false}
              />
            ) : null}
            <div className="story-chrome-sticky z-20">
              <SpectrumHairline />
              <header className="border-b border-border/80 bg-background">
                <div className="story-shell">
                  <StoryChrome
                    mode={view}
                    onModeChange={onViewChange}
                    onOpenTrips={() => {}}
                    onInvite={onOpenMembers}
                    travelers={travelers}
                    currentUserId={USER_ID}
                    onOpenMembers={onOpenMembers}
                    menu={
                      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-lg"
                            className="story-chrome__hit text-muted-foreground hover:text-foreground"
                            aria-label="More actions"
                          >
                            <Ellipsis className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" collisionPadding={8} className="w-60">
                          <DropdownMenuItem>All trips</DropdownMenuItem>
                          <DropdownMenuItem>New or join</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <ThemePackPickerMenuItems
                            tripId={REVIEW_TRIP_ID}
                            themePack={themePack}
                            onError={() => {}}
                          />
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => setCalendarOpen(true)}>
                            <Calendar className="h-4 w-4" />
                            Add to calendar
                          </DropdownMenuItem>
                          <DropdownMenuItem>Edit trip</DropdownMenuItem>
                          <DropdownMenuItem>Sign out</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    }
                  />
                </div>
              </header>
            </div>
            {screen === "confirm" ? (
              <ConfirmQueue
                rows={[
                  {
                    proposalId: "prop_market",
                    text: "Alex proposed Time Out Market on Nov 19.",
                    glanceUrl: "https://www.travelcalendar.space/?confirm=prop_market",
                  },
                  {
                    proposalId: "prop_checkin",
                    text: "Move the Alfama check-in to the afternoon so the flight lands first.",
                    glanceUrl: "https://www.travelcalendar.space/?confirm=prop_checkin",
                  },
                ]}
                highlightedId="prop_market"
                onConfirm={() => {}}
                onReject={() => {}}
              />
            ) : null}
            {children}
          </div>
          <CaptureDock hint={captureHint} onCapture={onCapture ?? (() => {})} />
        </div>
      </div>
      <AddToCalendarSheet
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        tripName="Lisbon with you"
        token={calendarToken}
        origin="https://www.travelcalendar.space"
        onReset={() => {
          setCalendarToken((current) =>
            current === REVIEW_CALENDAR_TOKEN ? REVIEW_CALENDAR_TOKEN_RESET : REVIEW_CALENDAR_TOKEN,
          )
        }}
      />
    </main>
  )
}

const PARTY: TripMember[] = [
  { tripId: TRIP_ID, userId: USER_ID, role: "owner", displayName: "Connor" },
  { tripId: TRIP_ID, userId: "user_caitlin", role: "editor", displayName: "Caitlin" },
  { tripId: TRIP_ID, userId: "user_alex", role: "editor", displayName: "Alex" },
  { tripId: TRIP_ID, userId: "user_sam", role: "editor", displayName: "Sam" },
  { tripId: TRIP_ID, userId: "user_jordan", role: "editor", displayName: "Jordan" },
]

function partyMembers(party: number | null): TripMember[] {
  if (!party) return members
  return PARTY.slice(0, Math.min(PARTY.length, Math.max(1, party)))
}

export function ReviewGallery({
  screen,
  theme,
  party = null,
}: {
  screen: string
  theme: string | null
  party?: number | null
}) {
  const themePack = parseThemePack(theme)
  useTripThemePack(themePack)
  const [tripName, setTripName] = useState("Lisbon with you")
  const [tripStart, setTripStart] = useState("2026-11-18")
  const [tripEnd, setTripEnd] = useState("2026-11-24")
  const [displayName, setDisplayName] = useState("Alex")
  const [joinInput, setJoinInput] = useState("ab12cd34ef56")
  const [createName, setCreateName] = useState("")
  const [plans, setPlans] = useState(items)
  const showHome = screen === "trip" || screen === "covered"
  const homeItems = screen === "covered" ? coveredItems : plans
  const tripStartDate = "2026-11-18"
  const tripEndDate = screen === "covered" ? "2026-11-18" : "2026-11-24"
  const home = useMemo(
    () =>
      buildTripHome({
        trip: { startDate: tripStartDate, endDate: tripEndDate },
        plans: homeItems,
        now: REVIEW_NOW,
      }),
    [homeItems, tripEndDate],
  )
  const [claims, setClaims] = useState<Array<{ gapId: string; userId: string; displayName: string }>>([])
  const [planOpen, setPlanOpen] = useState(screen === "add" || screen === "edit")
  const [planSeed, setPlanSeed] = useState<Partial<TripItemInput> | null>(null)
  const [planEdit, setPlanEdit] = useState<TripItem | null>(screen === "edit" ? editItem : null)
  const [initialType, setInitialType] = useState<PlanType | null>(screen === "add" ? "place" : null)
  const weather = useDayWeather(homeItems, { start: tripStartDate, end: tripEndDate }, REVIEW_WEATHER)
  const [view, setView] = useState<"list" | "month">(screen === "month" ? "month" : "list")
  const [shareOpen, setShareOpen] = useState(screen === "invite")
  const roster = partyMembers(party)
  const tripTitle = party === 5 ? "Vietnam '27" : "Lisbon with you"
  const coverMeta = `Nov 18 – 24 · 7 days · ${travelerLabel(roster, USER_ID)} · Connor proposed · Alex confirmed`

  if (screen === "join" || screen === "create") {
    const mode = screen === "join" ? "join" : "create"
    return (
      <div data-review-ready="true" data-screen={screen}>
        <CreateJoinScreen
          mode={mode}
          onModeChange={() => {}}
          displayName={displayName}
          onDisplayNameChange={setDisplayName}
          tripName={mode === "create" ? createName : "Lisbon with you"}
          onTripNameChange={setCreateName}
          tripStart={tripStart}
          onTripStartChange={setTripStart}
          tripEnd={tripEnd}
          onTripEndChange={setTripEnd}
          joinInput={joinInput}
          onJoinInputChange={setJoinInput}
          isMutating={false}
          errorMessage=""
          hasTrips
          onCreate={() => {}}
          onJoin={() => {}}
          onBackToTrips={() => {}}
          onSignOut={() => {}}
        />
      </div>
    )
  }

  if (screen === "paywall") {
    return (
      <div data-review-ready="true" data-screen={screen}>
        <PaywallScreen userId={USER_ID} paymentLink={null} onAccessGranted={() => {}} />
      </div>
    )
  }

  const story = screen === "today" ? "today" : "trip"
  const showCover = view === "list" && story === "trip"
  const captureHint = story === "today" && view === "list" ? "What’s happening today?" : "Add to the trip…"

  function openPlan(item: TripItem | null, date?: string) {
    if (item) {
      setPlanSeed(null)
      setPlanEdit(item)
      setInitialType(null)
      setPlanOpen(true)
      return
    }
    setPlanEdit(null)
    setInitialType("place")
    setPlanSeed(date ? { startDate: date, endDate: date } : null)
    setPlanOpen(true)
  }

  function openAction(action: GapAction) {
    if (action.itemId) {
      const item = homeItems.find((entry) => entry.id === action.itemId)
      if (item) {
        setPlanEdit(item)
        setPlanSeed(null)
        setInitialType(null)
        setPlanOpen(true)
        return
      }
    }
    setPlanEdit(null)
    setInitialType(action.flow === "stay" ? "stay" : action.flow === "place" ? "place" : "flight")
    setPlanSeed({
      title: action.title,
      startDate: action.startDate,
      endDate: action.endDate,
      location: action.location,
      locationTo: action.locationTo,
    })
    setPlanOpen(true)
  }

  return (
    <>
      <TripFrame
        screen={screen}
        view={view}
        onViewChange={setView}
        showCover={showCover}
        captureHint={captureHint}
        themePack={themePack}
        travelers={roster}
        meta={coverMeta}
        tripName={tripTitle}
        onOpenMembers={() => setShareOpen(true)}
        onCapture={(kind, text) => {
          setPlanEdit(null)
          setInitialType(kind ?? (text?.trim() ? guessPlanType(text) : "place"))
          setPlanSeed({
            title: text?.trim() ?? "",
            startDate: tripStartDate,
            endDate: tripStartDate,
          })
          setPlanOpen(true)
        }}
      >
        {view === "month" ? (
          <TripMonthView
            className="story-shell"
            items={screen === "month" ? monthItems : homeItems}
            tripStart={tripStartDate}
            tripEnd={tripEndDate}
            today="2026-11-18"
            onEditItem={(item) => openPlan(item)}
            onAddItem={(date) => openPlan(null, date)}
            weather={weather}
          />
        ) : (
          <>
            {showHome ? (
              <TripHome
                className="story-shell"
                model={home}
                members={roster}
                claims={claims}
                currentUserId={USER_ID}
                onClaim={(gapId, claimed) => {
                  setClaims((current) => {
                    const rest = current.filter((claim) => claim.gapId !== gapId)
                    if (!claimed) return rest
                    return [...rest, { gapId, userId: USER_ID, displayName: "Connor" }]
                  })
                }}
                onAction={openAction}
                onOpenItem={(id) => {
                  const item = homeItems.find((entry) => entry.id === id)
                  if (item) openPlan(item)
                }}
                weather={weather}
              />
            ) : null}
            <TripStoryView
              className="story-shell"
              mode={story}
              items={homeItems}
              today="2026-11-18"
              tripStart={tripStartDate}
              tripEnd={tripEndDate}
              dayNumber={1}
              currentUserId={USER_ID}
              members={roster}
              packingChecked={2}
              packingTotal={6}
              notesCount={1}
              onEditItem={(item) => openPlan(item)}
              onStartFlight={() => {}}
              onStartStay={() => {}}
              onStartPlace={() => {}}
              onInvite={() => setShareOpen(true)}
              onOpenPacking={() => {}}
              onOpenNotes={() => {}}
              onOpenAsk={() => {}}
              weather={weather}
            />
          </>
        )}
      </TripFrame>
      <TripsSheet
        open={screen === "trips"}
        onOpenChange={() => {}}
        trips={trips}
        activeTripId={TRIP_ID}
        onSelectTrip={() => {}}
        onCreateTrip={() => {}}
        onJoinTrip={() => {}}
      />
      <ItemDialog
        open={planOpen}
        onOpenChange={setPlanOpen}
        defaultDate={
          planSeed?.startDate ??
          defaultPlanDate({
            tripStart: tripStartDate,
            tripEnd: tripEndDate,
            plans: homeItems,
            today: "2026-11-18",
          })
        }
        editItem={planEdit}
        initialInput={planSeed}
        initialType={initialType}
        placeHint={party === 5 ? "Vietnam" : "Lisbon"}
        units={weather.units}
        currentUserName="Connor"
        members={roster}
        onSave={(input, existing) => {
          if (!existing) return
          const nextIds = input.attendeeIds && input.attendeeIds.length > 0 ? input.attendeeIds : undefined
          setPlans((current) =>
            current.map((item) => (item.id === existing.id ? { ...item, attendeeIds: nextIds } : item)),
          )
          setPlanEdit((current) => (current && current.id === existing.id ? { ...current, attendeeIds: nextIds } : current))
        }}
        onDelete={() => {}}
      />
      <ShareTripDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        tripName={tripTitle}
        inviteCode="ab12cd34ef56"
        inviteUrl="https://www.travelcalendar.space/?join=ab12cd34ef56"
        members={roster}
        currentUserId={USER_ID}
      />
      <EditTripDialog
        open={screen === "edit-trip"}
        onOpenChange={() => {}}
        tripName={tripName}
        onTripNameChange={setTripName}
        tripStart={tripStart}
        onTripStartChange={(value) => {
          setTripStart(value)
          if (!tripEnd || value > tripEnd) setTripEnd(value)
        }}
        tripEnd={tripEnd}
        onTripEndChange={setTripEnd}
        onCancel={() => {}}
        onSave={() => {}}
        saveDisabled={false}
        isSaving={false}
      />
    </>
  )
}
