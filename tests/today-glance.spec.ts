import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

async function toolbarHeight(page: Page) {
  return page.locator("[data-trip-toolbar]").evaluate((element) => Math.round(element.getBoundingClientRect().height))
}

const themes = [
  { path: "/review?screen=timing&today=2027-06-12", scheme: "light" as const },
  { path: "/review?screen=timing&today=2027-06-12", scheme: "dark" as const },
  { path: "/review?screen=timing&today=2027-06-12&theme=golden-hour", scheme: "light" as const },
  { path: "/review?screen=timing&today=2027-06-12&theme=dusk-rose", scheme: "light" as const },
  { path: "/review?screen=timing&today=2027-06-12&theme=coastal-infra", scheme: "light" as const },
  { path: "/review?screen=timing&today=2027-06-12&theme=sage-coast", scheme: "light" as const },
]

test("today during the trip shows the day in order, the next leg, and where you sleep", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/review?screen=timing&today=2027-06-12", { waitUntil: "domcontentloaded" })
  const today = page.locator("[data-today-screen]")
  await expect(today).toBeVisible()
  await expect(today.getByText(/Day 2/)).toBeVisible()
  await expect(today.getByText("Sleep here tonight · Washington DC · Airbnb")).toBeVisible()
  await expect(today.getByText(/Next · DC to MN · 4:00 PM → 6:10 PM · DC → MSP/)).toBeVisible()
  await expect(today.getByText(/JUN 14/)).toBeVisible()
  await expect(page.locator("[data-trip-toolbar] .trip-nights, [data-trip-mast] .trip-nights")).toHaveCount(0)

  const cards = today.locator(".plan-card")
  await expect(cards).toHaveCount(3)
  await expect(cards.nth(0)).toHaveAccessibleName(/Stay: Airbnb/)
  await expect(cards.nth(0)).toHaveAccessibleName(/Wake up here/)
  await expect(cards.nth(0)).toHaveAccessibleName(/Sleep here tonight/)
  const moon = cards.nth(0).locator(".plan-when__tag", { hasText: "Sleep here tonight" }).locator("svg")
  const sun = cards.nth(0).locator(".plan-when__tag", { hasText: "Wake up here" }).locator("svg")
  await expect(moon).toHaveAttribute("aria-hidden", "true")
  await expect(sun).toHaveAttribute("aria-hidden", "true")
  await expect(cards.nth(1)).toHaveAccessibleName(/12:30 PM/)
  await expect(cards.nth(2).locator(".plan-when__tag", { hasText: "All day" })).toBeVisible()

  const lunch = await cards.nth(1).boundingBox()
  const museum = await cards.nth(2).boundingBox()
  expect(lunch && museum && lunch.y < museum.y).toBe(true)

  await page.getByRole("button", { name: "Full trip", exact: true }).click()
  await expect(page.locator("[data-today-screen]")).toHaveCount(0)
  await expect(page.locator("#chapter-2027-06-14")).toBeVisible()
  await page.getByRole("button", { name: "Today", exact: true }).click()
  await expect(page.locator("[data-today-screen]")).toBeVisible()
})

test("a night in the glance names the gap and jumps to that day", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/review?screen=vietnam&today=2027-06-20", { waitUntil: "domcontentloaded" })
  await expect(page.locator(".trip-nights")).toHaveCount(0)
  await page.getByRole("button", { name: "List", exact: true }).click()
  const gap = page.getByRole("button", { name: "Night 10 of 21, Hội An, no stay booked, new city, today" })
  await expect(gap).toBeVisible()
  await expect(gap).toContainText("No stay")
  await expect(gap).toContainText("New city")
  await gap.focus()
  await page.keyboard.press("Tab")
  await page.keyboard.press("Shift+Tab")
  await expect(gap).toBeFocused()
  const ring = await gap.evaluate((element) => {
    const style = getComputedStyle(element)
    return { outline: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) }
  })
  expect(ring.outline).not.toBe("none")
  expect(ring.width).toBeGreaterThan(0)
  await page.keyboard.press("Enter")
  await expect(page.locator("#chapter-2027-06-20")).toBeFocused()

  const empty = page.getByRole("button", { name: "Night 11 of 21, Hội An, no stay booked" })
  await empty.click()
  await expect(page.locator("#chapter-2027-06-21")).toBeFocused()
  await expect(page.locator("#chapter-2027-06-21")).toHaveText("Nothing planned")
})

test("outside the trip dates the full list stays, with the nights still in the body", async ({ page }) => {
  await page.goto("/review?screen=timing&today=2027-06-01", { waitUntil: "domcontentloaded" })
  await expect(page.locator("[data-today-screen]")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Full trip", exact: true })).toHaveCount(0)
  await expect(page.locator("#chapter-2027-06-11")).toBeVisible()
  await expect(page.getByRole("button", { name: "Night 1 of 3, Washington DC, Airbnb" })).toBeVisible()
  await page.getByRole("button", { name: "Month", exact: true }).click()
  await expect(page.locator(".trip-nights")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Next month" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Previous month" })).toBeVisible()
  await expect(page.getByRole("grid", { name: /June 2027/ })).toBeVisible()
})

test("today respects the person filter", async ({ page }) => {
  await page.goto("/review?screen=trip&today=2026-11-19", { waitUntil: "domcontentloaded" })
  const today = page.locator("[data-today-screen]")
  await expect(today.getByRole("button", { name: /Place: Time Out Market/ })).toBeVisible()
  await expect(today.locator(".plan-when__tag", { hasText: "All day" })).toBeVisible()
  await page.getByRole("button", { name: "Mom, show their plans" }).click()
  await expect(page.getByText("Showing Mom's plans")).toBeVisible()
  await expect(today.getByRole("button", { name: /Place: Time Out Market/ })).toHaveCount(0)
  await expect(today.getByRole("button", { name: /Stay: Alfama apartment/ })).toBeVisible()
  await expect(today.getByText(/Sleep here tonight · Alfama, Lisbon · Alfama apartment/)).toBeVisible()
  await expect(page.locator("[data-trip-toolbar]")).toBeVisible()
})

test("the nights strip fits a phone and a desktop without growing the header", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Width sweep runs once on Chromium")
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.goto("/review?screen=timing&today=2027-06-12", { waitUntil: "domcontentloaded" })
    const listToolbar = await toolbarHeight(page)
    const night = page.getByRole("button", { name: "Night 2 of 3, Washington DC, Airbnb, today" })
    await night.scrollIntoViewIfNeeded()
    const box = await night.boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    const fits = await night.evaluate((element) => {
      const style = getComputedStyle(element)
      const clipped =
        (style.overflowX === "hidden" || style.overflowY === "hidden") &&
        (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)
      const rect = element.getBoundingClientRect()
      return !clipped && rect.width > 0 && rect.height > 0 && rect.right <= document.documentElement.clientWidth + 1
    })
    expect(fits).toBe(true)
    expect(await overflow(page)).toBeLessThanOrEqual(1)
    await page.getByRole("button", { name: "Month", exact: true }).click()
    expect(await toolbarHeight(page)).toBe(listToolbar)
    await expect(page.locator(".trip-nights")).toHaveCount(0)
  }
})

test("today and the nights stay readable at 200% text and 400% zoom", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Zoom sweep runs once on Chromium")
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/review?screen=timing&today=2027-06-12", { waitUntil: "domcontentloaded" })
  await page.addStyleTag({ content: "html { font-size: 32px !important; }" })
  await expect(page.getByText("All day")).toBeVisible()
  await expect(page.getByRole("button", { name: "Full trip", exact: true })).toBeVisible()
  await expect(page.getByText("No stay")).toHaveCount(0)
  const large = await page.locator(".trip-nights__night").first().evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      font: Number.parseFloat(style.fontSize),
      clipped: element.scrollHeight > element.clientHeight + 1 && style.overflowY === "hidden",
    }
  })
  expect(large.font).toBeGreaterThanOrEqual(24)
  expect(large.clipped).toBe(false)
  expect(await overflow(page)).toBeLessThanOrEqual(1)

  await page.setViewportSize({ width: 320, height: 568 })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "16px"
    document.documentElement.style.zoom = "4"
  })
  const zoomed = await page.locator("[data-today-screen]").evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const switcher = element.querySelector(".today-switch")
    const tag = element.querySelector(".plan-when__tag")
    if (!(switcher instanceof HTMLElement) || !(tag instanceof HTMLElement)) return null
    const overlap = (left: HTMLElement, right: HTMLElement) => {
      const a = left.getBoundingClientRect()
      const b = right.getBoundingClientRect()
      const width = Math.min(a.right, b.right) - Math.max(a.left, b.left)
      const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      return width > 1 && height > 1
    }
    return {
      width: rect.width,
      switcher: switcher.getBoundingClientRect().height,
      tagClipped: tag.scrollHeight > tag.clientHeight + 1 && getComputedStyle(tag).overflowY === "hidden",
      overlap: overlap(switcher, tag),
    }
  })
  expect(zoomed).not.toBeNull()
  expect(zoomed!.width).toBeGreaterThan(0)
  expect(zoomed!.switcher).toBeGreaterThanOrEqual(44)
  expect(zoomed!.tagClipped).toBe(false)
  expect(zoomed!.overlap).toBe(false)
  expect(await overflow(page)).toBeLessThanOrEqual(1)
})

test("today and the nights keep contrast in light, dark, and each theme pack", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "firefox", "axe-core crashes Firefox 159")
  for (const theme of themes) {
    await page.emulateMedia({ colorScheme: theme.scheme, reducedMotion: "reduce" })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(theme.path, { waitUntil: "domcontentloaded" })
    await page.waitForFunction(() => document.documentElement.dataset.uiReady === "true")
    if (theme.scheme === "dark") {
      await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 5000 })
    }
    await page.evaluate(() => document.fonts.ready)
    let results = await new AxeBuilder({ page }).include("#main-content").analyze()
    if (results.violations.some((violation) => violation.id === "color-contrast")) {
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      results = await new AxeBuilder({ page }).include("#main-content").analyze()
    }
    expect(results.violations, theme.path).toEqual([])
  }
})
