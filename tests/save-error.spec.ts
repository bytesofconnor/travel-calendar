import { expect, test } from "@playwright/test"

test("a failed save tells you what happened and offers retry", async ({ page }) => {
  await page.goto("/review?screen=save-error", { waitUntil: "domcontentloaded" })
  const alert = page.getByRole("alert").filter({ hasText: "Couldn't save that plan" })
  await expect(alert).toBeVisible()
  await expect(alert).toContainText("Couldn't save that plan. Try again.")
  await expect(alert).not.toContainText("CONVEX")
  await expect(alert).not.toContainText("Request ID")
  const retry = alert.getByRole("button", { name: "Retry" })
  await expect(retry).toBeEnabled()
  await retry.focus()
  await expect(retry).toBeFocused()
  await retry.click()
  await expect(alert).toHaveCount(0)
})
