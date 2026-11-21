"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Calendar, Ellipsis } from "lucide-react"

import type { Id } from "@/convex/_generated/dataModel"
import { CaptureDock, type CaptureKind } from "@/components/capture-dock"
import { useDayWeather } from "@/components/day-weather"
import { TripWorkspace } from "@/components/trip-workspace"
import { TemperatureMenuItems } from "@/components/weather-chip"
import { ConfirmQueue } from "@/components/confirm-queue"
import { CreateJoinScreen } from "@/components/create-join-screen"
import { EditTripDialog } from "@/components/edit-trip-dialog"
import { ItemDialog } from "@/components/item-dialog"
import { PaywallScreen } from "@/components/paywall-screen"
import { ShareTripDialog } from "@/components/share-trip-dialog"
import { ThemePackPickerMenuItems } from "@/components/theme-pack-menu"
import { TripHome } from "@/components/trip-home"
import { TripMonthView } from "@/components/trip-month-view"
import { TripStoryView } from "@/components/trip-story-view"
import { TripsSheet } from "@/components/trips-sheet"
import { useTripThemePack } from "@/components/use-trip-theme-pack"
import { AddToCalendarSheet } from "@/components/add-to-calendar-sheet"
import { Button } from "@/components/ui/button"
import { PersonFilter } from "@/components/person-filter"
import { StoryChrome } from "@/components/story-chrome"
import { filterItems, writeWho } from "@/lib/person-filter"
import { firstName, travelerLabel } from "@/lib/travelers"
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
import type { WeatherReading, WeatherUnits } from "@/lib/weather"
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

const vietnamItems: TripItem[] = [
  {
    id: "vn-flight-in",
    tripId: TRIP_ID,
    title: "SFO to HAN",
    startDate: "2027-06-11",
    endDate: "2027-06-11",
    location: "SFO",
    locationTo: "HAN",
    createdBy: USER_ID,
    createdAt: "2027-01-02T12:00:00.000Z",
    updatedAt: "2027-01-02T12:00:00.000Z",
  },
  {
    id: "vn-hanoi",
    tripId: TRIP_ID,
    title: "Old Quarter apartment",
    startDate: "2027-06-11",
    endDate: "2027-06-19",
    location: "Hanoi",
    createdBy: USER_ID,
    createdAt: "2027-01-02T13:00:00.000Z",
    updatedAt: "2027-01-02T13:00:00.000Z",
  },
  {
    id: "vn-train",
    tripId: TRIP_ID,
    title: "Train Street",
    startDate: "2027-06-12",
    endDate: "2027-06-12",
    location: "Hanoi",
    createdBy: "user_alex",
    createdAt: "2027-01-03T12:00:00.000Z",
    updatedAt: "2027-01-03T12:00:00.000Z",
  },
  {
    id: "vn-flight-danang",
    tripId: TRIP_ID,
    title: "HAN to DAD",
    startDate: "2027-06-23",
    endDate: "2027-06-23",
    location: "HAN",
    locationTo: "DAD",
    createdBy: USER_ID,
    createdAt: "2027-01-04T12:00:00.000Z",
    updatedAt: "2027-01-04T12:00:00.000Z",
  },
  {
    id: "vn-hoian",
    tripId: TRIP_ID,
    title: "Hội An house",
    startDate: "2027-06-23",
    endDate: "2027-06-24",
    location: "Hội An",
    createdBy: "user_mom",
    createdAt: "2027-01-04T13:00:00.000Z",
    updatedAt: "2027-01-04T13:00:00.000Z",
  },
  {
    id: "vn-lanterns",
    tripId: TRIP_ID,
    title: "Lantern walk",
    startDate: "2027-06-20",
    endDate: "2027-06-20",
    location: "Hội An",
    createdBy: "user_dad",
    createdAt: "2027-01-05T12:00:00.000Z",
    updatedAt: "2027-01-05T12:00:00.000Z",
  },
  {
    id: "vn-flight-sgn",
    tripId: TRIP_ID,
    title: "DAD to SGN",
    startDate: "2027-06-24",
    endDate: "2027-06-24",
    location: "DAD",
    locationTo: "SGN",
    createdBy: USER_ID,
    createdAt: "2027-01-06T12:00:00.000Z",
    updatedAt: "2027-01-06T12:00:00.000Z",
  },
  {
    id: "vn-saigon",
    tripId: TRIP_ID,
    title: "District 1 loft",
    startDate: "2027-06-24",
    endDate: "2027-07-02",
    location: "Ho Chi Minh City",
    createdBy: USER_ID,
    createdAt: "2027-01-06T13:00:00.000Z",
    updatedAt: "2027-01-06T13:00:00.000Z",
  },
  {
    id: "vn-benthanh",
    tripId: TRIP_ID,
    title: "Ben Thanh Market",
    startDate: "2027-06-26",
    endDate: "2027-06-26",
    location: "Ho Chi Minh City",
    createdBy: "user_alex",
    createdAt: "2027-01-07T12:00:00.000Z",
    updatedAt: "2027-01-07T12:00:00.000Z",
  },
  {
    id: "vn-flight-home",
    tripId: TRIP_ID,
    title: "SGN to SFO",
    startDate: "2027-07-02",
    endDate: "2027-07-02",
    location: "SGN",
    locationTo: "SFO",
    createdBy: USER_ID,
    createdAt: "2027-01-08T12:00:00.000Z",
    updatedAt: "2027-01-08T12:00:00.000Z",
  },
]

const timingItems: TripItem[] = [
  {
    id: "dc-flight",
    tripId: TRIP_ID,
    title: "MN to DC",
    startDate: "2027-06-11",
    endDate: "2027-06-11",
    location: "MSP",
    locationTo: "DC",
    planType: "flight",
    startTime: "09:40",
    endTime: "13:15",
    createdBy: USER_ID,
    createdAt: "2027-01-02T12:00:00.000Z",
    updatedAt: "2027-01-02T12:00:00.000Z",
    authorName: "Connor",
  },
  {
    id: "dc-stay",
    tripId: TRIP_ID,
    title: "Airbnb",
    startDate: "2027-06-11",
    endDate: "2027-06-14",
    location: "Washington DC",
    planType: "stay",
    createdBy: USER_ID,
    createdAt: "2027-01-02T13:00:00.000Z",
    updatedAt: "2027-01-02T13:00:00.000Z",
    authorName: "Connor",
  },
  {
    id: "dc-lunch",
    tripId: TRIP_ID,
    title: "Lunch",
    startDate: "2027-06-12",
    endDate: "2027-06-12",
    location: "Washington DC",
    planType: "place",
    startTime: "12:30",
    createdBy: "user_caitlin",
    createdAt: "2027-01-03T12:00:00.000Z",
    updatedAt: "2027-01-03T12:00:00.000Z",
  },
  {
    id: "dc-museum",
    tripId: TRIP_ID,
    title: "Museum",
    startDate: "2027-06-12",
    endDate: "2027-06-12",
    location: "Washington DC",
    planType: "place",
    createdBy: USER_ID,
    createdAt: "2027-01-03T13:00:00.000Z",
    updatedAt: "2027-01-03T13:00:00.000Z",
  },
  {
    id: "dc-back",
    tripId: TRIP_ID,
    title: "DC to MN",
    startDate: "2027-06-14",
    endDate: "2027-06-14",
    location: "DC",
    locationTo: "MSP",
    planType: "flight",
    startTime: "16:00",
    endTime: "18:10",
    createdBy: USER_ID,
    createdAt: "2027-01-04T12:00:00.000Z",
    updatedAt: "2027-01-04T12:00:00.000Z",
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
const LATER_NOW = { instant: "2027-06-01T12:00:00.000Z", timeZone: "Asia/Ho_Chi_Minh" }

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
  captureHint,
  themePack,
  travelers,
  meta,
  tripName,
  units,
  onUnits,
  onOpenMembers,
  selectedUserId,
  onSelectPerson,
  onCapture,
  children,
}: {
  screen: string
  view: "list" | "month"
  onViewChange: (view: "list" | "month") => void
  captureHint: string
  themePack: ThemePackId | null
  travelers: TripMember[]
  meta: string
  tripName: string
  units: WeatherUnits
  onUnits: (units: WeatherUnits) => void
  onOpenMembers: () => void
  selectedUserId?: string | null
  onSelectPerson?: (userId: string) => void
  onCapture?: (kind?: CaptureKind, text?: string) => void
  children: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(screen === "theme")
  const [calendarOpen, setCalendarOpen] = useState(screen === "calendar")
  const [calendarToken, setCalendarToken] = useState(REVIEW_CALENDAR_TOKEN)

  return (
    <div data-review-ready="true" data-screen={screen} className="contents">
    <TripWorkspace
      mode={view}
      tripName={tripName}
      meta={meta}
      toolbar={
                  <StoryChrome
                    mode={view}
                    onModeChange={onViewChange}
                    onOpenTrips={() => {}}
                    onInvite={onOpenMembers}
                    travelers={travelers}
                    currentUserId={USER_ID}
                    onOpenMembers={onOpenMembers}
                    selectedUserId={selectedUserId}
                    onSelectPerson={onSelectPerson}
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
                          <DropdownMenuSeparator />
                          <TemperatureMenuItems units={units} onChange={onUnits} />
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Edit trip</DropdownMenuItem>
                          <DropdownMenuItem>Sign out</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    }
                  />
      }
      composer={<CaptureDock hint={captureHint} onCapture={onCapture ?? (() => {})} />}
    >
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
    </TripWorkspace>
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
    </div>
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
  who = null,
}: {
  screen: string
  theme: string | null
  party?: number | null
  who?: string | null
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
  const vietnam = screen === "vietnam"
  const timing = screen === "timing"
  const showHome = screen === "trip" || screen === "covered" || vietnam || timing
  const tripStartDate = vietnam || timing ? "2027-06-11" : "2026-11-18"
  const tripEndDate = vietnam ? "2027-07-02" : timing ? "2027-06-14" : screen === "covered" ? "2026-11-18" : "2026-11-24"
  const catalog = vietnam ? vietnamItems : timing ? timingItems : screen === "month" ? monthItems : screen === "covered" ? coveredItems : plans
  const homePlans = vietnam ? vietnamItems : timing ? timingItems : screen === "covered" ? coveredItems : plans
  const homeNow = vietnam || timing ? LATER_NOW : REVIEW_NOW
  const home = useMemo(
    () =>
      buildTripHome({
        trip: { startDate: tripStartDate, endDate: tripEndDate },
        plans: homePlans,
        now: homeNow,
      }),
    [homePlans, homeNow, tripEndDate, tripStartDate],
  )
  const [claims, setClaims] = useState<Array<{ gapId: string; userId: string; displayName: string }>>([])
  const [planOpen, setPlanOpen] = useState(screen === "add" || screen === "edit")
  const [planSeed, setPlanSeed] = useState<Partial<TripItemInput> | null>(null)
  const [planEdit, setPlanEdit] = useState<TripItem | null>(screen === "edit" ? editItem : null)
  const [initialType, setInitialType] = useState<PlanType | null>(screen === "add" ? "place" : null)
  const [personId, setPersonId] = useState<string | null>(who)
  const weather = useDayWeather(homePlans, { start: tripStartDate, end: tripEndDate }, REVIEW_WEATHER)
  const [view, setView] = useState<"list" | "month">(screen === "month" || vietnam ? "month" : "list")
  const [shareOpen, setShareOpen] = useState(screen === "invite")
  const roster = partyMembers(vietnam ? 5 : timing ? 2 : party)
  const activePerson = roster.find((member) => member.userId === personId) ?? null
  const visibleItems = filterItems(catalog, activePerson?.userId ?? null, roster.map((member) => member.userId))
  const tripTitle = timing ? "DC weekend" : vietnam || party === 5 ? "Vietnam '27" : "Lisbon with you"
  const coverMeta = vietnam
    ? `Jun 11 – Jul 2 · 22 days · ${travelerLabel(roster, USER_ID)}`
    : timing
      ? `Jun 11 – 14 · 4 days · ${travelerLabel(roster, USER_ID)}`
      : `Nov 18 – 24 · 7 days · ${travelerLabel(roster, USER_ID)} · Connor proposed · Alex confirmed`

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
      const item = homePlans.find((entry) => entry.id === action.itemId)
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
        captureHint={captureHint}
        themePack={themePack}
        travelers={roster}
        meta={coverMeta}
        tripName={tripTitle}
        units={weather.units}
        onUnits={weather.choose}
        onOpenMembers={() => setShareOpen(true)}
        selectedUserId={activePerson?.userId ?? null}
        onSelectPerson={(userId) => {
          setPersonId((current) => {
            const next = current === userId ? null : userId
            writeWho(next)
            return next
          })
        }}
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
        {activePerson ? (
          <PersonFilter
            name={firstName(activePerson.displayName)}
            count={visibleItems.length}
            total={catalog.length}
            onClear={() => {
              setPersonId(null)
              writeWho(null)
            }}
          />
        ) : null}
        {view === "month" ? (
          <TripMonthView
            items={visibleItems}
            tripStart={tripStartDate}
            tripEnd={tripEndDate}
            today={vietnam ? "2027-06-18" : timing ? "2027-06-11" : "2026-11-18"}
            onEditItem={(item) => openPlan(item)}
            onAddItem={(date) => openPlan(null, date)}
            weather={weather}
          />
        ) : (
          <div className="trip-list">
            {showHome ? (
              <TripHome
                className="trip-list__rail"
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
                  const item = homePlans.find((entry) => entry.id === id)
                  if (item) openPlan(item)
                }}
                weather={weather}
              />
            ) : null}
            <TripStoryView
              className="trip-list__story"
              mode={story}
              items={visibleItems}
              filterName={activePerson ? firstName(activePerson.displayName) : undefined}
              today={timing ? "2027-06-11" : vietnam ? "2027-06-18" : "2026-11-18"}
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
          </div>
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
            plans: homePlans,
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
