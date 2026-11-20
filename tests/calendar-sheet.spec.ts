import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

import { preferredCalendar } from "../lib/calendar/links.ts"

const actions = ["Apple Calendar", "Google Calendar", "Outlook", "Copy link", "Reset link"] as const

test("add to calendar sheet subscribes, copies, and resets", async ({ page }) => {
  await page.goto("/review?screen=trip", { waitUntil: "domcontentloaded" })
  await page.waitForFunction(() => document.documentElement.dataset.uiReady === "true")
  await page.getByRole("button", { name: "More actions" }).click()
  await page.getByRole("menuitem", { name: "Add to calendar" }).click()

  const dialog = page.getByRole("dialog", { name: "Add to your calendar" })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText("Changes sync on their own. Google can take a few hours to catch up.")).toBeVisible()

  const platform = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  }))
  await expect(dialog.locator("[data-calendar]").first()).toHaveAttribute(
    "data-calendar",
    preferredCalendar(platform),
  )

  await expect(dialog.getByRole("link", { name: "Apple Calendar" })).toHaveAttribute("href", /^webcal:\/\//)
  await expect(dialog.getByRole("link", { name: "Google Calendar" })).toHaveAttribute(
    "href",
    /calendar\.google\.com\/calendar\/r\?cid=webcal%3A/,
  )
  await expect(dialog.getByRole("link", { name: "Outlook" })).toHaveAttribute(
    "href",
    /outlook\.office\.com\/calendar\/0\/addfromweb\?url=/,
  )

  for (const name of actions) {
    const control =
      name === "Copy link" || name === "Reset link"
        ? dialog.getByRole("button", { name })
        : dialog.getByRole("link", { name })
    await control.scrollIntoViewIfNeeded()
    const box = await control.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
  }

  const overflow = await dialog.evaluate((node) => node.scrollWidth > node.clientWidth + 1)
  expect(overflow).toBe(false)

  // axe-core crashes Firefox 159 while auditing this dialog. Chromium and WebKit still run the check.
  if (test.info().project.name !== "firefox") {
    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
    expect(results.violations).toEqual([])
  }

  await dialog.getByRole("button", { name: "Copy link" }).click()
  await expect(page.getByText("Copied", { exact: true })).toBeVisible()

  await dialog.getByRole("link", { name: "Google Calendar" }).evaluate((link) => {
    link.addEventListener("click", (event) => event.preventDefault())
  })
  await dialog.getByRole("link", { name: "Google Calendar" }).click()
  await expect(dialog.getByText("Subscribed? Confirm the prompt in your calendar app.")).toBeVisible()

  const firstHref = await dialog.getByRole("link", { name: "Apple Calendar" }).getAttribute("href")
  await dialog.getByRole("button", { name: "Reset link" }).click()
  await expect(page.getByText("New link ready")).toBeVisible()
  await expect(dialog.getByRole("link", { name: "Apple Calendar" })).not.toHaveAttribute("href", firstHref ?? "")
})
