import { expect, test, type Page } from "@playwright/test"

async function addPlan(
  page: Page,
  kind: "Stay" | "Flight" | "Activity",
  fields: { title: string; start?: string; end?: string; where?: string; from?: string; to?: string },
) {
  await page.getByRole("button", { name: "Add to the trip" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("radio", { name: kind === "Flight" ? "Travel" : kind }).click()
  if (kind === "Stay") {
    await dialog.getByLabel("Where are you staying?").fill(fields.where ?? "")
    await dialog.getByLabel("Title").fill(fields.title)
    if (fields.start) await dialog.getByLabel("Check-in").fill(fields.start)
    if (fields.end) await dialog.getByLabel("Check-out").fill(fields.end)
    await dialog.getByRole("button", { name: "Add stay" }).click()
  } else if (kind === "Flight") {
    if (fields.from) await dialog.getByLabel("From").fill(fields.from)
    if (fields.to) await dialog.getByLabel("To", { exact: true }).fill(fields.to)
    await dialog.getByLabel("Title").fill(fields.title)
    await dialog.getByRole("button", { name: "Add flight" }).click()
  } else {
    await dialog.getByLabel("What are you doing?").fill(fields.title)
    if (fields.where) await dialog.getByLabel("Where").fill(fields.where)
    if (fields.start) await dialog.getByLabel("Date").fill(fields.start)
    await dialog.getByRole("button", { name: "Add activity" }).click()
  }
  await expect(dialog).toBeHidden()
}

test("member B sees member A's trip edits live and after reload", async ({ browser, request }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "two-member trip consistency runs once on desktop chromium")
  test.setTimeout(60_000)

  const seeded = await request.post("/api/review-pair", { data: { action: "seed" } })
  expect(seeded.ok()).toBeTruthy()
  const { roomId } = (await seeded.json()) as { roomId: string }

  const ownerContext = await browser.newContext()
  const partnerContext = await browser.newContext()
  const owner = await ownerContext.newPage()
  const partner = await partnerContext.newPage()

  try {
    await owner.goto(`/review?screen=pair&room=${roomId}&member=owner`)
    await partner.goto(`/review?screen=pair&room=${roomId}&member=partner`)
    await expect(owner.getByRole("heading", { name: "Lisbon with you" })).toBeVisible()
    await expect(partner.getByRole("heading", { name: "Lisbon with you" })).toBeVisible()
    await expect(owner.getByTestId("trip-dates")).toHaveAttribute("data-end", "2026-05-20")
    await expect(partner.getByTestId("trip-dates")).toHaveAttribute("data-end", "2026-05-20")

    await addPlan(owner, "Stay", {
      title: "Alfama apartment",
      start: "2026-05-10",
      end: "2026-05-18",
      where: "Alfama",
    })
    await expect(partner.getByRole("button", { name: /Stay: Alfama apartment/ }).first()).toBeVisible()

    await addPlan(owner, "Flight", { title: "TAP", from: "SFO", to: "LIS" })
    await expect(partner.getByRole("button", { name: /Flight: TAP/ })).toBeVisible()

    await addPlan(owner, "Activity", {
      title: "Time Out Market",
      start: "2026-05-12",
      end: "2026-05-12",
      where: "Cais do Sodre",
    })
    await expect(partner.getByRole("button", { name: /Activity: Time Out Market/ })).toBeVisible()

    await owner.getByRole("button", { name: /Activity: Time Out Market/ }).click()
    const editPlan = owner.getByRole("dialog")
    await editPlan.getByLabel("Where").fill("Market hall")
    await editPlan.getByRole("button", { name: "Save", exact: true }).click()
    await expect(editPlan).toBeHidden()
    await expect(partner.getByRole("button", { name: /Activity: Time Out Market\. Market hall/ })).toBeVisible()

    await owner.getByRole("button", { name: "Edit trip" }).click()
    const editTrip = owner.getByRole("dialog", { name: "Edit trip details" })
    await editTrip.locator('input[type="date"]').nth(1).fill("2026-05-08")
    await editTrip.getByRole("button", { name: "Save", exact: true }).click()
    await expect(editTrip).toBeHidden()

    await expect(partner.getByTestId("trip-dates")).toHaveAttribute("data-end", "2026-05-08")
    await expect(partner.getByTestId("trip-dates")).toContainText("May 8, 2026")
    await expect(partner.getByRole("button", { name: /Stay: Alfama apartment/ }).first()).toBeVisible()
    await expect(partner.getByRole("button", { name: /Flight: TAP/ })).toBeVisible()
    await expect(partner.getByRole("button", { name: /Activity: Time Out Market/ })).toBeVisible()

    await owner.getByRole("button", { name: /Activity: Time Out Market/ }).click()
    const deleting = owner.getByRole("dialog")
    await deleting.getByRole("button", { name: "Delete" }).click()
    await expect(deleting).toBeHidden()
    await expect(partner.getByRole("button", { name: /Activity: Time Out Market/ })).toHaveCount(0)
    await expect(partner.getByRole("button", { name: /Stay: Alfama apartment/ }).first()).toBeVisible()

    await owner.getByLabel("Shared planning notes").fill("Meet at the lockbox")
    await expect(partner.getByRole("status", { name: "Shared note" })).toHaveText("Meet at the lockbox")

    await partner.reload()
    await expect(partner.getByRole("heading", { name: "Lisbon with you" })).toBeVisible()
    await expect(partner.getByTestId("trip-dates")).toHaveAttribute("data-start", "2026-05-01")
    await expect(partner.getByTestId("trip-dates")).toHaveAttribute("data-end", "2026-05-08")
    await expect(partner.getByTestId("trip-dates")).toContainText("May 8, 2026")
    await expect(partner.getByRole("button", { name: /Stay: Alfama apartment/ }).first()).toBeVisible()
    await expect(partner.getByRole("button", { name: /Flight: TAP/ })).toBeVisible()
    await expect(partner.getByRole("button", { name: /Activity: Time Out Market/ })).toHaveCount(0)
    await expect(partner.getByRole("status", { name: "Shared note" })).toHaveText("Meet at the lockbox")
  } finally {
    await ownerContext.close()
    await partnerContext.close()
  }
})
