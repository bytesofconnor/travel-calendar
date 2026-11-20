import { expect, test } from "@playwright/test"

test.use({ video: "on" })

test("typing, picking, and closing does not jump", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "One desktop recording")
  await page.goto("/review?screen=add&party=5", { waitUntil: "domcontentloaded" })
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("radio", { name: "Flight" }).click()
  const to = dialog.getByRole("combobox", { name: "To" })
  await to.evaluate((el) => {
    const scroller = el.closest(".overflow-y-auto")
    if (!(scroller instanceof HTMLElement)) return
    const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top
    scroller.scrollTop += top - 12
  })
  await to.pressSequentially("DC", { delay: 40 })
  const list = dialog.getByRole("listbox", { name: "To suggestions" })
  await expect(list.getByRole("option").first()).toContainText("Washington, D.C.")
  await page.keyboard.press("Enter")
  await expect(to).toHaveValue("Washington, D.C.")
  await expect(list).toBeHidden()
  await page.waitForTimeout(400)
  const video = page.video()
  await page.close()
  await video?.saveAs("/opt/cursor/artifacts/place-picker-typing.webm")
})
