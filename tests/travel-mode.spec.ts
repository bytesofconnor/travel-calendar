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

async function openTravel(page: Page) {
  await page.goto("/review?screen=add", { waitUntil: "domcontentloaded" })
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("radio", { name: "Travel" }).click()
  await expect(dialog.getByRole("radiogroup", { name: "Travel mode" })).toBeVisible()
  return dialog
}

test("travel modes change the fields and write the title", async ({ page }) => {
  const dialog = await openTravel(page)
  await dialog.getByRole("button", { name: "Details" }).click()
  await expect(dialog.getByRole("heading", { name: "Add a flight" })).toBeVisible()
  await expect(dialog.getByRole("radio", { name: "Flight" })).toHaveAttribute("aria-checked", "true")
  await expect(dialog.getByLabel("Airline or flight number")).toBeVisible()
  await expect(dialog.getByLabel("Depart", { exact: true })).toBeVisible()
  await expect(dialog.getByLabel("Arrive", { exact: true })).toBeVisible()

  const flight = dialog.getByRole("radio", { name: "Flight" })
  await flight.focus()
  await page.keyboard.press("ArrowRight")
  const train = dialog.getByRole("radio", { name: "Train" })
  await expect(train).toBeFocused()
  await expect(train).toHaveAttribute("aria-checked", "true")
  await expect(dialog.getByRole("heading", { name: "Add a train" })).toBeVisible()
  await expect(dialog.getByLabel("From")).toHaveAttribute("placeholder", "Station or city")
  await expect(dialog.getByLabel("Carrier or number")).toBeVisible()
  await dialog.getByLabel("From", { exact: true }).fill("Hanoi")
  await dialog.getByLabel("To", { exact: true }).fill("Lao Cai")
  await expect(dialog.getByLabel("Title")).toHaveAttribute("placeholder", "Train Hanoi → Lao Cai")
  await expect(dialog.getByRole("button", { name: "Add train" })).toBeVisible()

  await train.focus()
  await page.keyboard.press("ArrowRight")
  await expect(dialog.getByRole("radio", { name: "Bus" })).toBeFocused()
  await page.keyboard.press("ArrowRight")
  await expect(dialog.getByRole("radio", { name: "Shuttle" })).toBeFocused()
  await expect(dialog.getByLabel("Depart", { exact: true })).toHaveCount(0)
  await expect(dialog.getByLabel("Date")).toBeVisible()
  await expect(dialog.getByLabel("End time")).toBeVisible()

  await dialog.getByRole("radio", { name: "Taxi/Rideshare" }).click()
  await expect(dialog.getByRole("heading", { name: "Add a taxi" })).toBeVisible()
  await dialog.getByLabel("From", { exact: true }).fill("Noi Bai")
  await dialog.getByLabel("To", { exact: true }).fill("hotel")
  await dialog.getByLabel("Carrier").fill("Grab")
  await expect(dialog.getByLabel("Title")).toHaveAttribute("placeholder", "Grab to hotel")
  await expect(dialog.getByLabel("Arrive", { exact: true })).toHaveCount(0)

  await dialog.getByRole("radio", { name: "Walk" }).click()
  await expect(dialog.getByLabel("Carrier")).toHaveCount(0)
  await dialog.getByLabel("To", { exact: true }).fill("Old Quarter")
  await expect(dialog.getByLabel("Title")).toHaveAttribute("placeholder", "Walk to Old Quarter")
  await expect(dialog.getByRole("button", { name: "Add walk" })).toBeEnabled()
})

test("an existing flight still opens as a flight", async ({ page }) => {
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  await page.getByRole("button", { name: /Flight: TAP to Lisbon/ }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("heading", { name: "Edit flight" })).toBeVisible()
  await expect(dialog.getByRole("radio", { name: "Flight" })).toHaveAttribute("aria-checked", "true")
  await expect(dialog.getByLabel("From")).toHaveValue("SFO")
  const details = dialog.getByRole("button", { name: /details/i })
  if ((await details.getAttribute("aria-expanded")) !== "true") await details.click()
  await expect(dialog.getByLabel("Airline or flight number")).toBeVisible()
})

test("a train and a Grab ride show an icon and a word on the list", async ({ page }) => {
  await page.goto("/review?screen=travel", { waitUntil: "domcontentloaded" })
  const train = page.getByRole("button", { name: /Train: Train Hanoi/ }).first()
  const grab = page.getByRole("button", { name: /Taxi: Grab to hotel/ }).first()
  await expect(train).toBeVisible()
  await expect(grab).toBeVisible()
  await expect(train.locator(".plan-card__kind svg")).toBeVisible()
  await expect(grab.locator(".plan-card__kind svg")).toBeVisible()
  await expect(train.locator(".plan-card__kind")).toContainText("Train")
  await expect(grab.locator(".plan-card__kind")).toContainText("Taxi")
})

test("travel modes keep contrast, a 44px target, and large text", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "firefox", "axe-core crashes Firefox 159")
  for (const theme of themes) {
    await page.emulateMedia({ colorScheme: theme.scheme, reducedMotion: "reduce" })
    await page.goto(`/review?screen=add${theme.query}`, { waitUntil: "domcontentloaded" })
    if (theme.scheme === "dark") {
      await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 5000 })
    }
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("radio", { name: "Travel" }).click()
    const results = await new AxeBuilder({ page }).include("[role=dialog]").analyze()
    expect(results.violations).toEqual([])
  }

  await page.setViewportSize({ width: 390, height: 844 })
  const dialog = await openTravel(page)
  for (const name of ["Flight", "Train", "Bus", "Shuttle", "Taxi/Rideshare", "Walk"]) {
    const box = await dialog.getByRole("radio", { name }).boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  }

  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px"
  })
  await expect(dialog.getByRole("radio", { name: "Taxi/Rideshare" })).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)

  await page.setViewportSize({ width: 320, height: 640 })
  await page.evaluate(() => {
    document.documentElement.style.zoom = "1"
    document.documentElement.style.fontSize = "32px"
  })
  await expect(dialog.getByRole("radiogroup", { name: "Travel mode" })).toBeVisible()
  const reflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(reflow).toBeLessThanOrEqual(1)
})

test("mode picker and list screenshots at phone and desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Screenshots run once")
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    const dialog = await openTravel(page)
    await dialog.getByRole("radio", { name: "Train" }).click()
    await dialog.getByLabel("From", { exact: true }).fill("Hanoi")
    await dialog.getByLabel("To", { exact: true }).fill("Lao Cai")
    await dialog.getByRole("radiogroup", { name: "Travel mode" }).evaluate((el) => {
      const scroller = el.closest(".overflow-y-auto")
      if (scroller instanceof HTMLElement) scroller.scrollTop = 0
    })
    const fromBox = await dialog.getByLabel("From").boundingBox()
    expect(fromBox?.height ?? 0).toBeGreaterThan(20)
    expect(fromBox?.y ?? -1).toBeGreaterThan(0)
    expect(fromBox?.y ?? 9999).toBeLessThan(width === 390 ? 800 : 860)
    await page.screenshot({
      path: `/opt/cursor/artifacts/travel-mode-${width}.png`,
      fullPage: true,
    })
    await page.goto("/review?screen=travel", { waitUntil: "domcontentloaded" })
    const card = page.getByRole("button", { name: /Train: Train Hanoi/ }).first()
    await expect(card).toBeVisible()
    await card.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: `/opt/cursor/artifacts/travel-list-${width}.png`,
      fullPage: true,
    })
  }
})
