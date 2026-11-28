import { expect, test, type Page } from "@playwright/test"

async function ready(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.uiReady === "true")
}

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

test("the add button opens Add with the input focused and escape returns", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  await ready(page)
  const opener = page.getByRole("button", { name: "Add to the trip" })
  await opener.focus()
  await opener.press("Enter")
  const dialog = page.getByRole("dialog", { name: /Add an activity/ })
  const input = dialog.getByRole("textbox", { name: "Add to the trip…" })
  await expect(input).toBeFocused()
  await expect(dialog.getByRole("radio", { name: "Stay" })).toBeVisible()
  await expect(dialog.getByRole("radio", { name: "Travel" })).toBeVisible()
  await expect(dialog.getByRole("radio", { name: "Activity" })).toBeVisible()
  await expect(dialog.getByRole("radio", { name: "Note" })).toHaveCount(0)
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
})

test("the trip name lists your trips and opens the one you pick", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  await ready(page)
  await page.getByRole("button", { name: "More actions" }).click()
  await expect(page.getByRole("menuitem", { name: "All trips" })).toHaveCount(0)
  await expect(page.getByRole("menuitem", { name: "New or join" })).toHaveCount(0)
  await expect(page.getByRole("menuitem", { name: "Edit trip" })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("button", { name: "More actions" })).toBeFocused()
  const switcher = page.getByRole("button", { name: /Lisbon with you/ })
  await switcher.focus()
  await switcher.press("Enter")
  const dialog = page.getByRole("dialog", { name: "Your trips" })
  await expect(dialog.getByRole("button", { name: /Lisbon with you/ })).toBeVisible()
  await expect(dialog.getByRole("button", { name: /Kyoto in spring/ })).toBeVisible()
  await expect(dialog.getByRole("button", { name: "New trip" })).toBeVisible()
  await dialog.getByRole("button", { name: /Kyoto in spring/ }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole("button", { name: /Kyoto in spring/ })).toBeVisible()
  await expect(page.locator(".trip-cover__title")).toHaveText("Kyoto in spring")
})

test("the add button does not cover the last plan at 390px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "firefox", "Layout check runs on Chromium and WebKit")
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/review?screen=trip&today=2026-10-01", { waitUntil: "domcontentloaded" })
  await ready(page)
  await page.evaluate(() => {
    const scroller = document.querySelector("[data-trip-scroll]")
    if (scroller instanceof HTMLElement) scroller.scrollTop = scroller.scrollHeight
  })
  const overlap = await page.evaluate(() => {
    const button = document.querySelector(".add-trip")
    const cards = [...document.querySelectorAll(".plan-card")]
    if (!(button instanceof HTMLElement) || cards.length === 0) return null
    const buttonRect = button.getBoundingClientRect()
    const last = cards[cards.length - 1]!.getBoundingClientRect()
    const horizontal = Math.min(last.right, buttonRect.right) - Math.max(last.left, buttonRect.left)
    const vertical = Math.min(last.bottom, buttonRect.bottom) - Math.max(last.top, buttonRect.top)
    return { horizontal, vertical, lastBottom: last.bottom, buttonTop: buttonRect.top }
  })
  expect(overlap).not.toBeNull()
  expect(overlap!.vertical).toBeLessThanOrEqual(1)
  expect(overlap!.lastBottom).toBeLessThanOrEqual(overlap!.buttonTop + 1)
})

test("add and the trip switcher stay on screen at 200% text and 400% zoom", async ({ page }, testInfo) => {
  test.skip(
    !["chromium", "mobile-webkit", "android-chrome"].includes(testInfo.project.name),
    "Text and zoom run on desktop Chromium, iPhone, and Pixel",
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  await ready(page)
  await page.addStyleTag({ content: "html { font-size: 32px !important; }" })
  await expect(page.getByRole("button", { name: "Add to the trip" })).toBeVisible()
  await expect(page.getByRole("button", { name: /Switch trip/ })).toBeVisible()
  expect(await overflow(page)).toBeLessThanOrEqual(1)
  await page.getByRole("button", { name: "Add to the trip" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("textbox", { name: "Add to the trip…" })).toBeVisible()
  await expect(dialog.getByRole("radio", { name: "Activity" })).toBeVisible()
  const dialogOverflow = await dialog.evaluate((node) => {
    const box = node.getBoundingClientRect()
    return box.right - document.documentElement.clientWidth
  })
  expect(dialogOverflow).toBeLessThanOrEqual(1)
  await page.keyboard.press("Escape")

  await page.evaluate(() => {
    document.documentElement.style.fontSize = "16px"
    document.documentElement.style.zoom = "4"
  })
  await expect(page.getByRole("button", { name: "Add to the trip" })).toBeVisible()
  await expect(page.getByRole("button", { name: /Switch trip/ })).toBeVisible()
  const zoomed = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(zoomed).toBeLessThanOrEqual(1)
})
