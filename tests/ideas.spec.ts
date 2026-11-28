import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

async function ready(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.uiReady === "true")
}

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

test("add offers stay, travel, and activity, and an idea can land on a day", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/review?screen=trip&party=5", { waitUntil: "domcontentloaded" })
  await ready(page)

  const add = page.getByRole("button", { name: "Add to the trip" })
  await add.click()
  const addDialog = page.getByRole("dialog", { name: /Add an activity/ })
  await expect(addDialog.getByRole("radio", { name: "Stay" })).toBeVisible()
  await expect(addDialog.getByRole("radio", { name: "Travel" })).toBeVisible()
  await expect(addDialog.getByRole("radio", { name: "Activity" })).toBeVisible()
  await expect(addDialog.getByRole("radio", { name: "Note" })).toHaveCount(0)
  await page.keyboard.press("Escape")
  await expect(addDialog).toBeHidden()

  const ideas = page.getByRole("button", { name: "Ideas, 0 open" })
  await ideas.focus()
  await ideas.press("Enter")
  const sheet = page.getByRole("dialog", { name: "Ideas" })
  await expect(sheet).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(sheet).toBeHidden()
  await expect(ideas).toBeFocused()

  await ideas.click()
  await sheet.getByRole("textbox", { name: "Add an idea" }).fill("Ha Long overnight cruise")
  await sheet.getByRole("button", { name: "Add", exact: true }).click()
  const card = sheet.getByRole("listitem").filter({ hasText: "Ha Long overnight cruise" })
  await expect(card).toBeVisible()
  await expect(card.getByText("Connor suggested")).toBeVisible()
  await expect(card.getByText(/\d/)).toHaveCount(0)

  await card.getByRole("button", { name: "I'd go", exact: true }).click()
  await expect(card.getByRole("button", { name: "I'd go. Connor", exact: true })).toBeVisible()
  await sheet.getByLabel("Acting as").selectOption({ label: "Caitlin" })
  await card.getByRole("button", { name: "I'd go. Connor", exact: true }).click()
  await expect(card.getByRole("button", { name: "I'd go. Connor, Caitlin", exact: true })).toBeVisible()

  await card.getByRole("button", { name: "Put on a day" }).click()
  const plan = page.getByRole("dialog", { name: "Add an activity" })
  await expect(plan.getByRole("radio", { name: "Activity" })).toHaveAttribute("aria-checked", "true")
  await expect(plan.getByRole("button", { name: "CConnor, included, toggle" })).toHaveAttribute("aria-pressed", "true")
  await expect(plan.getByRole("button", { name: "CCaitlin, included, toggle" })).toHaveAttribute("aria-pressed", "true")
  await expect(plan.getByRole("button", { name: "AAlex, not included, toggle" })).toHaveAttribute("aria-pressed", "false")
  await plan.getByRole("button", { name: "Add activity" }).click()
  await expect(plan).toBeHidden()
  await expect(page.getByRole("button", { name: "Ideas, 0 open" })).toBeVisible()
  await expect(page.getByRole("button", { name: /Activity: Ha Long overnight cruise/ })).toBeVisible()

  await page.getByRole("button", { name: "Month", exact: true }).click()
  await expect(page.getByRole("button", { name: "Ideas, 0 open" })).toBeVisible()
  const grid = page.locator("[data-month-view]")
  await expect(grid).toBeVisible()
  await expect(grid.getByText("Add an idea")).toHaveCount(0)
  await expect(grid.getByRole("list", { name: "Ideas" })).toHaveCount(0)
})

test("ideas stay on screen at 200% text and 400% zoom", async ({ page }, testInfo) => {
  test.skip(
    !["chromium", "mobile-webkit", "android-chrome"].includes(testInfo.project.name),
    "Text and zoom run on desktop Chromium, iPhone, and Pixel",
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/review?screen=trip&party=5", { waitUntil: "domcontentloaded" })
  await ready(page)
  await page.addStyleTag({ content: "html { font-size: 32px !important; }" })
  const ideas = page.getByRole("button", { name: "Ideas, 0 open" })
  await expect(ideas).toBeVisible()
  expect(await overflow(page)).toBeLessThanOrEqual(1)
  await ideas.click()
  const sheet = page.getByRole("dialog", { name: "Ideas" })
  await expect(sheet.getByRole("textbox", { name: "Add an idea" })).toBeVisible()
  const dialogOverflow = await sheet.evaluate((node) => node.getBoundingClientRect().right - document.documentElement.clientWidth)
  expect(dialogOverflow).toBeLessThanOrEqual(1)
  await page.keyboard.press("Escape")

  await page.evaluate(() => {
    document.documentElement.style.fontSize = "16px"
    document.documentElement.style.zoom = "4"
  })
  await expect(page.getByRole("button", { name: "Ideas, 0 open" })).toBeVisible()
  const zoomed = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(zoomed).toBeLessThanOrEqual(1)
})

test("the ideas sheet keeps contrast", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "firefox", "axe-core crashes Firefox 159")
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/review?screen=trip&party=5", { waitUntil: "domcontentloaded" })
  await ready(page)
  await page.getByRole("button", { name: "Ideas, 0 open" }).click()
  const sheet = page.getByRole("dialog", { name: "Ideas" })
  await expect(sheet).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
  const serious = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")
  expect(serious).toEqual([])
})
