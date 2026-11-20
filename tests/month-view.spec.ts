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
  await page.getByRole("button", { name: "Flight TAP to Lisbon", exact: true }).click()
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

test("narrow phones show dots and stay inside the screen", async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 })
    await openMonth(page)
    const day = page.getByRole("gridcell", { name: /Wednesday November 18, today, 4 events/ })
    await expect(day.locator(".month-chip").first()).toBeHidden()
    await expect(day.locator(".month-dot")).toHaveCount(3)
    await expect(day.locator(".month-dot").first()).toBeVisible()
    await expect(day.getByText("+1 more")).toBeVisible()
    const box = await day.boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    expect(await pageOverflow(page)).toBeLessThanOrEqual(1)
  }

  await page.setViewportSize({ width: 1280, height: 800 })
  await openMonth(page)
  const wide = page.getByRole("gridcell", { name: /Wednesday November 18, today, 4 events/ })
  await expect(wide.locator(".month-chip").first()).toBeVisible()
  await expect(wide.getByText("+2 more")).toBeVisible()
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1)
})

test("month view stays readable at large text and 200% zoom", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Text scaling runs once on Chromium")
  await page.setViewportSize({ width: 320, height: 568 })
  await page.addInitScript(() => {
    document.documentElement.style.fontSize = "32px"
  })
  await openMonth(page)
  await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible()
  expect(await pageOverflow(page)).toBeLessThanOrEqual(1)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "16px"
    document.documentElement.style.zoom = "2"
  })
  await expect(page.getByRole("grid", { name: "November 2026" })).toBeVisible()
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

test("month view does not animate when motion is reduced", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openMonth(page)
  const motion = await page.locator("[data-month-view]").evaluate((element) => {
    const style = getComputedStyle(element)
    return { name: style.animationName, duration: style.animationDuration }
  })
  expect(motion.name === "none" || motion.duration === "0s" || motion.duration.startsWith("0.01")).toBe(true)
})
