import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Locator, type Page } from "@playwright/test"

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

async function toolbarBox(page: Page) {
  return page.locator("[data-trip-toolbar]").evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
  })
}

function chapter(page: Page, iso: string) {
  return page.locator("section").filter({ has: page.locator(`#chapter-${iso}`) })
}

async function expectStayWords(card: Locator, words: string[]) {
  for (const word of words) {
    await expect(card.locator(".plan-when__tag", { hasText: word })).toBeVisible()
  }
  await expect(card).toHaveAccessibleName(new RegExp(words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s\\S]*")))
  const tags = card.locator(".plan-when__tag")
  const count = await tags.count()
  for (let index = 0; index < count; index += 1) {
    const tag = tags.nth(index)
    const icon = tag.locator("svg")
    if ((await icon.count()) > 0) {
      await expect(icon).toHaveAttribute("aria-hidden", "true")
      await expect(tag.locator("span")).not.toHaveText("")
    }
    const whiteSpace = await tag.evaluate((element) => getComputedStyle(element).whiteSpace)
    expect(whiteSpace).not.toBe("nowrap")
  }
}

test("a range of uncovered nights is one claim, and the claim says who is handling it", async ({ page }) => {
  await page.goto("/review?screen=vietnam", { waitUntil: "domcontentloaded" })
  await page.getByRole("button", { name: "List", exact: true }).click()
  const gap = "No stay in Hanoi · Jun 19–22 · 4 nights"
  await expect(page.getByText(gap)).toBeVisible()
  await expect(page.getByText("I'll handle it means you're taking this on.")).toBeVisible()
  await page.getByRole("button", { name: `I'll handle it: ${gap}` }).click()
  await expect(page.getByText("You're handling this").first()).toBeVisible()
  await expect(page.getByRole("button", { name: `Undo handling ${gap}` })).toBeVisible()
  await expect(page.getByRole("button", { name: /I'll take it/ })).toHaveCount(0)
})

test("a header face filters list and month without moving the toolbar", async ({ page }) => {
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: "Lisbon with you" })).toBeVisible()
  const before = await toolbarBox(page)
  const mom = page.getByRole("button", { name: "Mom, show their plans" })
  await mom.focus()
  await page.keyboard.press("Enter")
  const showingMom = page.getByRole("button", { name: "Mom, showing their plans" })
  await expect(showingMom).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByText("Showing Mom's plans")).toBeVisible()
  await expect(page.getByText("2 of 3")).toBeVisible()
  await expect(page).toHaveURL(/who=user_mom/)
  await expect(page.getByRole("button", { name: /Place: Time Out Market/ })).toHaveCount(0)
  await expect(page.getByRole("button", { name: /Stay: Alfama apartment/ }).first()).toBeVisible()
  expect(await toolbarBox(page)).toEqual(before)

  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.getByRole("button", { name: "Mom, showing their plans" })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByText("Showing Mom's plans")).toBeVisible()

  await page.getByRole("button", { name: "Month", exact: true }).click()
  await expect(page.getByRole("grid", { name: /2026/ })).toBeVisible()
  await expect(page.getByText("Showing Mom's plans")).toBeVisible()
  expect(await toolbarBox(page)).toEqual(before)
  await page.getByRole("button", { name: "Show everyone" }).click()
  await expect(page.getByText("Showing Mom's plans")).toHaveCount(0)
  await expect(page).not.toHaveURL(/who=/)
  await expect(page.getByRole("button", { name: "Mom, show their plans" })).toHaveAttribute("aria-pressed", "false")
})

test("the fifth traveler is a filter behind the extra faces", async ({ page }) => {
  await page.goto("/review?screen=trip&party=5", { waitUntil: "domcontentloaded" })
  await expect(page.locator("[data-traveler-face]")).toHaveCount(4)
  await page.getByRole("button", { name: "1 more traveler" }).click()
  const jordan = page.getByRole("button", { name: "Jordan, show their plans" })
  await expect(jordan).toBeVisible()
  await jordan.click()
  await expect(page.getByText("Showing Jordan's plans")).toBeVisible()
  await expect(page.getByText("2 of 3")).toBeVisible()
  await expect(page).toHaveURL(/who=user_jordan/)
})

test("Jun 11 sleeps in DC after the flight, and later days say wake up", async ({ page }) => {
  await page.goto("/review?screen=timing", { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: "DC weekend" })).toBeVisible()

  const arrival = chapter(page, "2027-06-11")
  const arrivalCards = arrival.getByRole("listitem").getByRole("button")
  await expect(arrivalCards).toHaveCount(2)
  await expect(arrivalCards.nth(0)).toHaveAccessibleName(/Flight: MN to DC/)
  await expect(arrivalCards.nth(0)).toHaveAccessibleName(/9:40 AM → 1:15 PM/)
  await expect(arrivalCards.nth(0)).toHaveAccessibleName(/Arrive DC/)
  await expectStayWords(arrivalCards.nth(1), ["Sleep here tonight", "Check-in after arrival"])
  const flightBox = await arrivalCards.nth(0).boundingBox()
  const stayBox = await arrivalCards.nth(1).boundingBox()
  expect(flightBox && stayBox && flightBox.y < stayBox.y).toBe(true)

  const middle = chapter(page, "2027-06-12")
  const middleCards = middle.getByRole("listitem").getByRole("button")
  await expect(middleCards).toHaveCount(3)
  await expectStayWords(middleCards.nth(0), ["Wake up here", "Sleep here tonight", "Night 2 of 3"])
  await expect(middleCards.nth(1)).toHaveAccessibleName(/12:30 PM/)
  await expect(middleCards.nth(2)).toHaveAccessibleName(/All day/)

  const departure = chapter(page, "2027-06-14")
  const departureCards = departure.getByRole("listitem").getByRole("button")
  await expect(departureCards).toHaveCount(2)
  await expectStayWords(departureCards.nth(0), ["Wake up here", "Check-out"])
  await expect(departureCards.nth(1)).toHaveAccessibleName(/4:00 PM → 6:10 PM/)
  await expect(departureCards.nth(1)).toHaveAccessibleName(/Depart DC/)
  const wakeBox = await departureCards.nth(0).boundingBox()
  const leaveBox = await departureCards.nth(1).boundingBox()
  expect(wakeBox && leaveBox && wakeBox.y < leaveBox.y).toBe(true)
})

test("the month day panel and the phone agenda keep the same stay order", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Month timing sweep runs once on Chromium")
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/review?screen=timing", { waitUntil: "domcontentloaded" })
  await page.getByRole("button", { name: "Month", exact: true }).click()
  await page.getByRole("gridcell", { name: /Friday June 11/ }).click()
  const detail = page.locator(".month-detail")
  const detailCards = detail.locator(".month-detail__list").getByRole("button")
  await expect(detailCards.nth(0)).toHaveAccessibleName(/MN to DC/)
  await expect(detailCards.nth(0)).toHaveAccessibleName(/Arrive DC/)
  await expectStayWords(detailCards.nth(1), ["Sleep here tonight", "Check-in after arrival"])

  await page.setViewportSize({ width: 390, height: 844 })
  await page.addStyleTag({ content: "html { font-size: 32px !important; }" })
  await expect(page.locator(".month-agenda")).toBeVisible()
  const agendaDay = page.locator(".month-agenda__day", { hasText: "Friday June 11" })
  const agendaCards = agendaDay.locator(".month-agenda__list").getByRole("button")
  await expect(agendaCards.nth(0)).toHaveAccessibleName(/Arrive DC/)
  await expectStayWords(agendaCards.nth(1), ["Sleep here tonight", "Check-in after arrival"])
  const tag = agendaCards.nth(1).locator(".plan-when__tag", { hasText: "Sleep here tonight" })
  const edges = await tag.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { right: rect.right, width: document.documentElement.clientWidth }
  })
  expect(edges.right).toBeLessThanOrEqual(edges.width + 1)
  expect(await overflow(page)).toBeLessThanOrEqual(1)
})

test("stay words stay on the screen at 390 and 1440, including 200% text", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Width sweep runs once on Chromium")
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.goto("/review?screen=timing", { waitUntil: "domcontentloaded" })
    await expect(page.getByText("Sleep here tonight").first()).toBeVisible()
    await expect(page.getByText("Wake up here").first()).toBeVisible()
    expect(await overflow(page)).toBeLessThanOrEqual(1)
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/review?screen=timing", { waitUntil: "domcontentloaded" })
  await page.addStyleTag({ content: "html { font-size: 32px !important; }" })
  await expect(page.getByText("Night 2 of 3")).toBeVisible()
  await expect(page.getByText("Check-out")).toBeVisible()
  expect(await overflow(page)).toBeLessThanOrEqual(1)
})

test("leaving someone out is named, struck through, and not only a color", async ({ page }) => {
  await page.goto("/review?screen=edit", { waitUntil: "domcontentloaded" })
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByText("Tap a face to leave someone out")).toBeVisible()
  await expect(dialog.getByText("2 of 4 · not Mom or Dad")).toBeVisible()
  const mom = dialog.getByRole("button", { name: "Mom, not included, toggle" })
  await expect(mom).toHaveAttribute("aria-pressed", "false")
  await expect(mom.locator(".who-face__mark--out")).toBeVisible()
  await expect(mom.locator(".who-face__mark--in")).toHaveCount(0)
  const struck = await mom.locator(".who-face__name").evaluate((element) => getComputedStyle(element).textDecorationLine)
  expect(struck).toContain("line-through")
})

test("the new trip controls keep contrast in light, dark, and each theme pack", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "firefox", "axe-core crashes Firefox 159")
  const themes = [
    { path: "/review?screen=timing", scheme: "light" as const },
    { path: "/review?screen=timing", scheme: "dark" as const },
    { path: "/review?screen=timing&theme=golden-hour", scheme: "light" as const },
    { path: "/review?screen=timing&theme=dusk-rose", scheme: "light" as const },
    { path: "/review?screen=timing&theme=coastal-infra", scheme: "light" as const },
    { path: "/review?screen=timing&theme=sage-coast", scheme: "light" as const },
    { path: "/review?screen=vietnam", scheme: "light" as const },
    { path: "/review?screen=edit", scheme: "dark" as const },
  ]
  for (const theme of themes) {
    await page.emulateMedia({ colorScheme: theme.scheme })
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
