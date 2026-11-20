import { mkdirSync } from "node:fs"

import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

mkdirSync("/opt/cursor/artifacts", { recursive: true })

const themes = [
  { query: "", scheme: "light" as const },
  { query: "", scheme: "dark" as const },
  { query: "&theme=golden-hour", scheme: "light" as const },
  { query: "&theme=dusk-rose", scheme: "light" as const },
  { query: "&theme=coastal-infra", scheme: "light" as const },
  { query: "&theme=sage-coast", scheme: "light" as const },
]

async function scrollBelowSticky(chip: ReturnType<Page["locator"]>) {
  await chip.evaluate((el) => {
    const scroller = el.closest(".story-scroll")
    if (!(scroller instanceof HTMLElement)) {
      el.scrollIntoView({ block: "center" })
      return
    }
    const sticky = scroller.querySelector(".story-chrome-sticky")
    const overlays = sticky instanceof HTMLElement && getComputedStyle(sticky).position === "sticky"
    const reserved = overlays ? sticky.getBoundingClientRect().height : 0
    const chipHeight = el.getBoundingClientRect().height
    const room = Math.max(0, scroller.clientHeight - reserved - chipHeight)
    const delta = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - reserved - room / 2
    scroller.scrollTop += delta
  })
}

async function mockPlaces(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("weather-units", "f")
  })
  await page.route("**/api/places**", async (route) => {
    const url = new URL(route.request().url())
    const query = url.searchParams.get("q")?.toLowerCase() ?? ""
    const places = query.includes("hanoi")
      ? [
          {
            name: "Hanoi",
            lat: 21.0278,
            lng: 105.8342,
            country: "VN",
            timeZone: "Asia/Ho_Chi_Minh",
          },
        ]
      : []
    await route.fulfill({ json: { places, attribution: "Cities by Open-Meteo." } })
  })
  await page.route("**/api/weather**", async (route) => {
    const body = route.request().postDataJSON() as { days?: Array<{ date?: string; name?: string }> }
    const day = body.days?.[0]
    await route.fulfill({
      json: {
        days: [
          {
            date: day?.date ?? "2026-11-19",
            name: day?.name ?? "Hanoi",
            high: 91,
            low: 79,
            precip: 60,
            condition: "Rain",
            typical: true,
            units: "f",
          },
        ],
      },
    })
  })
}

test("each type shows its own fields and the flight toggle is gone", async ({ page }) => {
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  await page.getByRole("button", { name: "Add Stay" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("heading", { name: "Add a stay" })).toBeVisible()
  await expect(dialog.getByLabel("Where are you staying?")).toBeVisible()
  await expect(dialog.getByLabel("Check-in")).toBeVisible()
  await expect(dialog.getByLabel("Check-out")).toBeVisible()
  await expect(dialog.getByLabel("From")).toHaveCount(0)
  await expect(dialog.getByRole("button", { name: "Mark as flight / transit" })).toHaveCount(0)
  await expect(dialog.getByText("Saving as")).toHaveCount(0)

  await dialog.getByRole("radio", { name: "Flight" }).click()
  await expect(dialog.getByRole("heading", { name: "Add a flight" })).toBeVisible()
  await expect(dialog.getByLabel("From")).toBeVisible()
  await expect(dialog.getByLabel("To")).toBeVisible()
  await expect(dialog.getByLabel("Where are you staying?")).toHaveCount(0)

  await dialog.getByRole("radio", { name: "Note" }).click()
  await expect(dialog.getByLabel("Note")).toBeVisible()
  await expect(dialog.getByLabel("From")).toHaveCount(0)
  await expect(dialog.getByLabel("Check-in")).toHaveCount(0)
})

test("a typed route becomes a flight and a legacy flight opens as a flight", async ({ page }) => {
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  const capture = page.getByRole("textbox", { name: "Add to the trip…" })
  await capture.fill("Fly DC to Hanoi")
  await capture.press("Enter")
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("radio", { name: "Flight" })).toHaveAttribute("aria-checked", "true")
  await expect(dialog.getByLabel("From")).toHaveValue("DC")
  await expect(dialog.getByLabel("To")).toHaveValue("Hanoi")
  await expect(dialog.getByLabel("Title")).toHaveAttribute("placeholder", "Fly DC to Hanoi")
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: /Flight: TAP to Lisbon/ }).click()
  await expect(dialog.getByRole("heading", { name: "Edit flight" })).toBeVisible()
  await expect(dialog.getByLabel("From")).toHaveValue("SFO")
  await expect(dialog.getByLabel("To")).toHaveValue("LIS")
  await expect(dialog.locator("#plan-title")).toHaveValue("TAP to Lisbon")
})

test("the save button stays enabled and names the missing field", async ({ page }) => {
  await page.goto("/review?screen=add", { waitUntil: "domcontentloaded" })
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("radio", { name: "Stay" }).click()
  const save = dialog.getByRole("button", { name: "Add stay" })
  await expect(save).toBeEnabled()
  await save.click()
  await expect(dialog.locator("#plan-location-error")).toHaveText("Add where you're staying.")
  await expect(save).toBeEnabled()
  await expect(dialog.getByLabel("Where are you staying?")).toBeFocused()
})

test("a stay title fills in from the place and can be overridden", async ({ page }) => {
  await page.goto("/review?screen=add&party=5", { waitUntil: "domcontentloaded" })
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("radio", { name: "Stay" }).click()
  const where = dialog.getByLabel("Where are you staying?")
  await expect(where).toHaveAttribute("placeholder", "Airbnb in Hanoi Old Quarter")
  await where.fill("Airbnb in Hanoi Old Quarter")
  await expect(dialog.getByLabel("Title")).toHaveAttribute("placeholder", "Stay · Airbnb in Hanoi Old Quarter")
})

test("the type control is a keyboard radiogroup and escape returns focus", async ({ page }) => {
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  const opener = page.getByRole("button", { name: "Add Stay" })
  await opener.focus()
  await opener.press("Enter")
  const dialog = page.getByRole("dialog")
  const stay = dialog.getByRole("radio", { name: "Stay" })
  await expect(stay).toBeFocused()
  await page.keyboard.press("ArrowRight")
  await expect(dialog.getByRole("radio", { name: "Flight" })).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
})

test("the plan dialog keeps contrast in every theme", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "firefox", "axe-core crashes Firefox 159")
  for (const theme of themes) {
    await page.emulateMedia({ colorScheme: theme.scheme, reducedMotion: "reduce" })
    await page.goto(`/review?screen=add${theme.query}`, { waitUntil: "domcontentloaded" })
    if (theme.scheme === "dark") {
      await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 5000 })
    }
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("radiogroup", { name: "Plan type" })).toBeVisible()
    const results = await new AxeBuilder({ page }).include("[role=dialog]").analyze()
    expect(results.violations).toEqual([])
  }
})

test("a picked Hanoi stay is on screen at phone, large text, and desktop", async ({ page }, testInfo) => {
  test.skip(!["chromium", "mobile-webkit", "mobile-se"].includes(testInfo.project.name), "Screenshots run on three viewports")
  await mockPlaces(page)
  await page.goto("/review?screen=add&party=5", { waitUntil: "domcontentloaded" })
  if (testInfo.project.name === "mobile-se") {
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px"
    })
  }
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("radio", { name: "Stay" }).click()
  const where = dialog.getByLabel("Where are you staying?")
  await where.fill("Hanoi")
  await dialog.getByRole("option", { name: "Hanoi" }).click()
  await expect(where).toHaveValue("Hanoi")
  await expect(dialog.getByText("Typical 91°/79° · 60% rain")).toBeVisible()
  const chip = dialog.locator(".weather-chip")
  await expect(chip).toHaveAccessibleName(
        "Hanoi, Nov 19: typical high 91, low 79, 60 percent chance of rain. Typical 91°/79° · 60% rain",
      )
  await where.evaluate((el) => {
    const scroller = el.closest(".overflow-y-auto")
    const target = el.parentElement ?? el
    if (!(scroller instanceof HTMLElement)) return
    const close = document.querySelector("[data-slot=dialog-close]")
    const clearance = close instanceof HTMLElement
      ? Math.max(0, close.getBoundingClientRect().bottom - scroller.getBoundingClientRect().top + 8)
      : 8
    scroller.scrollTop += target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - clearance
  })
  await page.screenshot({
    path: `/opt/cursor/artifacts/stay-hanoi-${testInfo.project.name}.png`,
    fullPage: true,
  })
})

test("weather sits in the day list and the month panel, not the phone day cell", async ({ page }, testInfo) => {
  test.skip(!["chromium", "mobile-webkit", "mobile-se"].includes(testInfo.project.name), "Screenshots run on three viewports")
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  if (testInfo.project.name === "mobile-se") {
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px"
    })
  }
  const chip = page.locator(".weather-chip").first()
  await expect(chip).toBeVisible()
  await expect(chip).toHaveAccessibleName(/Alfama, Lisbon/)
  await scrollBelowSticky(chip)
  await page.screenshot({
    path: `/opt/cursor/artifacts/weather-list-${testInfo.project.name}.png`,
    fullPage: true,
  })

  await page.getByRole("button", { name: "Month", exact: true }).click()
  const agenda = page.locator(".month-agenda")
  if (await agenda.isVisible()) {
    const day = agenda.locator(".month-agenda__day", { hasText: "Wednesday November 18" })
    await expect(day.locator(".weather-chip")).toBeVisible()
    await scrollBelowSticky(day.locator(".weather-chip"))
  } else {
    const cell = page.getByRole("gridcell", { name: /November 18/ }).first()
    await expect(cell.locator(".weather-chip")).toHaveCount(0)
    await cell.evaluate((el) => {
      el.scrollIntoView({ block: "nearest" })
      if (el instanceof HTMLButtonElement) el.click()
    })
    const detail = page.locator(".month-detail")
    await expect(detail.locator(".weather-chip")).toBeVisible()
    await scrollBelowSticky(detail.locator(".weather-chip"))
  }
  await page.screenshot({
    path: `/opt/cursor/artifacts/weather-month-${testInfo.project.name}.png`,
    fullPage: true,
  })
})
