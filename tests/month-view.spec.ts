import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

async function pageOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

async function waitUntilInteractive(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.uiReady === "true")
}

async function openMonth(page: Page, path = "/review?screen=month") {
  await page.goto(path, { waitUntil: "domcontentloaded" })
  await waitUntilInteractive(page)
  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible()
  await expect(page.getByRole("grid", { name: "November 2026" })).toBeVisible()
}

test("list and month switcher", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  await waitUntilInteractive(page)
  const list = page.getByRole("button", { name: "List", exact: true })
  const month = page.getByRole("button", { name: "Month", exact: true })
  await expect(list).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("heading", { name: "What's next" })).toBeVisible()

  await month.focus()
  await month.press("Enter")
  await expect(month).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible()
  await expect(page.getByRole("grid", { name: "November 2026" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "What's next" })).toHaveCount(0)

  await list.click()
  await expect(list).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("heading", { name: "What's next" })).toBeVisible()
  await expect(page.getByRole("grid", { name: "November 2026" })).toHaveCount(0)
})

test("previous and next month", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await openMonth(page)
  await page.getByRole("button", { name: "Next month" }).click()
  await expect(page.getByRole("heading", { name: "December 2026" })).toBeVisible()
  await expect(page.getByRole("grid", { name: "December 2026" })).toBeVisible()
  await page.getByRole("button", { name: "Previous month" }).click()
  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible()
})

test("a day opens its plans and an empty day can add that date", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await openMonth(page)

  const tripDay = page.getByRole("gridcell", { name: /Wednesday November 18/ })
  await expect(tripDay).toHaveAttribute("aria-current", "date")
  await tripDay.click()
  await expect(page.getByRole("heading", { name: "Wednesday, November 18" })).toBeVisible()
  await page.getByRole("button", { name: /Flight TAP to Lisbon/ }).click()
  const edit = page.getByRole("dialog")
  await expect(edit).toBeVisible()
  await expect(edit.locator("#plan-title")).toHaveValue("TAP to Lisbon")
  await page.keyboard.press("Escape")
  await expect(edit).toBeHidden()

  await page.getByRole("gridcell", { name: /Monday November 2, no events/ }).click()
  await expect(page.getByRole("heading", { name: "Monday, November 2" })).toBeVisible()
  await page.getByRole("button", { name: "Add something" }).click()
  const add = page.getByRole("dialog")
  await expect(add).toBeVisible()
  await expect(add.locator("#plan-start")).toHaveValue("2026-11-02")
  await expect(add.getByRole("heading", { name: "Add a place" })).toBeVisible()
})

test("arrow keys move between days", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await openMonth(page)
  const start = page.getByRole("gridcell", { name: /Wednesday November 18/ })
  await start.focus()
  const focus = await start.evaluate((element) => {
    const style = getComputedStyle(element)
    return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) }
  })
  expect(focus.style).not.toBe("none")
  expect(focus.width).toBeGreaterThan(0)

  await page.keyboard.press("ArrowRight")
  await expect(page.getByRole("gridcell", { name: /Thursday November 19/ })).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await expect(page.getByRole("gridcell", { name: /Thursday November 26/ })).toBeFocused()
  await page.keyboard.press("ArrowLeft")
  await expect(page.getByRole("gridcell", { name: /Wednesday November 25/ })).toBeFocused()
  await page.keyboard.press("ArrowUp")
  await expect(page.getByRole("gridcell", { name: /Wednesday November 18/ })).toBeFocused()
})

test("narrow phones show count badges and stay inside the screen", async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 })
    await openMonth(page)
    const day = page.getByRole("gridcell", { name: /Wednesday November 18, today, 4 events/ })
    await expect(page.locator(".month-chip").first()).toBeHidden()
    await expect(page.locator(".month-bar").first()).toBeHidden()
    await expect(page.locator(".month-badge", { hasText: "4" }).first()).toBeVisible()
    const box = await day.boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    expect(await pageOverflow(page)).toBeLessThanOrEqual(1)
  }

  await page.setViewportSize({ width: 1280, height: 800 })
  await openMonth(page)
  await expect(page.locator(".month-chip", { hasText: "TAP to Lisbon" }).first()).toBeVisible()
  await expect(page.locator(".month-chip", { hasText: "Flight" }).first()).toBeVisible()
  await expect(page.locator(".month-bar", { hasText: "Alfama apartment" })).toHaveCount(2)
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1)
})

test("month view stays readable at large text and 200% zoom", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Text scaling runs once on Chromium")
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto("/review?screen=month", { waitUntil: "domcontentloaded" })
  await waitUntilInteractive(page)
  await page.addStyleTag({ content: "html { font-size: 32px !important; }" })
  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible()
  await expect(page.locator(".month-agenda")).toBeVisible()
  const agendaTitle = page.locator(".month-agenda__title", { hasText: "Alfama apartment" }).first()
  await expect(agendaTitle).toBeVisible()
  const agendaText = await agendaTitle.evaluate((element) => {
    const style = getComputedStyle(element)
    const box = element.getBoundingClientRect()
    return { whiteSpace: style.whiteSpace, text: element.textContent, right: box.right, width: box.width }
  })
  expect(agendaText.whiteSpace).not.toBe("nowrap")
  expect(agendaText.text).toBe("Alfama apartment")
  expect(agendaText.right).toBeLessThanOrEqual(320)
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/review?screen=month", { waitUntil: "domcontentloaded" })
  await waitUntilInteractive(page)
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2"
  })
  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible()
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1)
})

test("month view keeps contrast in light, dark, and each theme pack", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "firefox", "axe-core crashes Firefox 159")
  const themes = [
    { path: "/review?screen=month", scheme: "light" as const },
    { path: "/review?screen=month", scheme: "dark" as const },
    { path: "/review?screen=month&theme=golden-hour", scheme: "light" as const },
    { path: "/review?screen=month&theme=dusk-rose", scheme: "light" as const },
    { path: "/review?screen=month&theme=coastal-infra", scheme: "light" as const },
    { path: "/review?screen=month&theme=sage-coast", scheme: "light" as const },
  ]
  for (const theme of themes) {
    await page.emulateMedia({ colorScheme: theme.scheme })
    await openMonth(page, theme.path)
    if (theme.scheme === "dark") {
      await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 5000 })
    }
    await page.getByRole("gridcell", { name: /Wednesday November 18/ }).click()
    const results = await new AxeBuilder({ page }).include("[data-month-view]").analyze()
    expect(results.violations).toEqual([])
  }
})

test("home, end, and page keys move through the month", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Key map runs once on Chromium")
  await page.setViewportSize({ width: 1280, height: 800 })
  await openMonth(page)
  const start = page.getByRole("gridcell", { name: /Wednesday November 18/ })
  await start.focus()
  await page.keyboard.press("PageDown")
  await expect(page.getByRole("heading", { name: "December 2026" })).toBeVisible()
  await expect(page.getByRole("gridcell", { name: /Friday December 18/ })).toBeFocused()
  await page.keyboard.press("PageUp")
  await expect(page.getByRole("gridcell", { name: /Wednesday November 18/ })).toBeFocused()
  await page.keyboard.press("Home")
  await expect(page.getByRole("gridcell", { name: /Sunday November 15/ })).toBeFocused()
  await page.keyboard.press("End")
  await expect(page.getByRole("gridcell", { name: /Saturday November 21/ })).toBeFocused()
  await page.keyboard.press("Control+Home")
  await expect(page.getByRole("gridcell", { name: /Sunday November 1, no events/ })).toBeFocused()
  await page.keyboard.press("Control+End")
  await expect(page.getByRole("gridcell", { name: /Monday November 30/ })).toBeFocused()
})

test("the month grid fills the width without horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Width matrix runs once on Chromium")
  for (const width of [320, 390, 768, 1280, 1920, 2560]) {
    await page.setViewportSize({ width, height: 900 })
    await openMonth(page)
    expect(await pageOverflow(page), `overflow at ${width}`).toBeLessThanOrEqual(1)
    const grid = page.locator(".month-grid")
    await expect(grid).toBeVisible()
    const gridBox = await grid.boundingBox()
    const viewBox = await page.locator(".month-view").boundingBox()
    expect(gridBox?.width ?? 0).toBeGreaterThan((viewBox?.width ?? 1) * 0.85)
    if (width >= 768 && width <= 1920) {
      expect(gridBox?.width ?? 0).toBeGreaterThan(width * 0.75)
    }
    if (width >= 1280) {
      expect(gridBox?.height ?? 0).toBeGreaterThan(420)
    }
    if (width === 2560) {
      expect(gridBox?.width ?? 0).toBeGreaterThan(1400)
      expect(gridBox?.width ?? 0).toBeLessThan(2000)
      const left = gridBox?.x ?? 0
      const right = width - ((gridBox?.x ?? 0) + (gridBox?.width ?? 0))
      expect(Math.abs(left - right)).toBeLessThan(48)
    }
  }
})

test("a multi-day stay is one bar that wraps at the week", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/review?screen=vietnam", { waitUntil: "domcontentloaded" })
  await waitUntilInteractive(page)
  await expect(page.getByRole("heading", { name: "June 2027" })).toBeVisible()
  const bars = page.locator(".month-bar", { hasText: "Old Quarter apartment" })
  await expect(bars).toHaveCount(2)
  const first = await bars.nth(0).boundingBox()
  const friday = await page.getByRole("gridcell", { name: /Friday June 11/ }).boundingBox()
  expect(first?.width ?? 0).toBeGreaterThan((friday?.width ?? 0) * 1.5)
  const flight = page.locator(".month-chip", { hasText: "SFO to HAN" })
  await expect(flight).toBeVisible()
  await expect(flight).toContainText("Flight")
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1)
})

test("add something stays above the composer", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Dock clearance runs once on Chromium")
  await page.setViewportSize({ width: 390, height: 700 })
  await openMonth(page)
  await page.getByRole("gridcell", { name: /Wednesday November 18/ }).click()
  const add = page.getByRole("button", { name: "Add something", exact: true })
  await expect(add).toBeVisible()
  const addBox = await add.boundingBox()
  const dock = await page.getByRole("region", { name: "Add to trip" }).boundingBox()
  expect(addBox?.y ?? 0).toBeGreaterThanOrEqual(0)
  expect((addBox?.y ?? 0) + (addBox?.height ?? 0)).toBeLessThanOrEqual((dock?.y ?? 0) + 1)
})

test("text spacing does not overflow the month", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Text spacing runs once on Chromium")
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    const style = document.createElement("style")
    style.textContent = `
      * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
      p { margin-bottom: 2em !important; }
    `
    document.head.appendChild(style)
  })
  await openMonth(page)
  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible()
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1)
})

test("month view does not animate when motion is reduced", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openMonth(page)
  const motion = await page.locator("[data-month-view]").evaluate((element) => {
    const style = getComputedStyle(element)
    return { name: style.animationName, duration: style.animationDuration }
  })
  expect(motion.name === "none" || motion.duration === "0s" || motion.duration.startsWith("0.01")).toBe(true)
})
