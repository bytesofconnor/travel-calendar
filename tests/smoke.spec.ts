import { expect, test } from "@playwright/test"

const CANONICAL_ORIGIN = "https://www.travelcalendar.space"

const pages = [
  {
    path: "/",
    heading: "Plan the trip together",
    login: true,
  },
  {
    path: "/privacy",
    heading: "Privacy Policy",
    login: false,
  },
  {
    path: "/terms",
    heading: "Terms of Service",
    login: false,
  },
] as const

for (const pageDef of pages) {
  test(`${pageDef.path} returns 200 and renders ${pageDef.heading}`, async ({
    page,
  }) => {
    const response = await page.goto(pageDef.path, {
      waitUntil: "domcontentloaded",
    })

    expect(response, `expected a response for ${pageDef.path}`).toBeTruthy()
    expect(response!.status(), `${pageDef.path} HTTP status`).toBe(200)

    await expect(
      page.getByRole("heading", { name: pageDef.heading, level: 1 }),
    ).toBeVisible()

    if (pageDef.login) {
      await expect(
        page.getByRole("button", { name: "Continue with Google" }),
      ).toBeVisible()
    }

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`^${CANONICAL_ORIGIN}/?$`),
    )
  })
}

test("invite link keeps join on the login screen", async ({ page }) => {
  const response = await page.goto("/?join=ab12cd34ef56", {
    waitUntil: "domcontentloaded",
  })

  expect(response?.status()).toBe(200)
  await expect(
    page.getByRole("heading", { name: "Plan the trip together", level: 1 }),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible()
  await expect(page).toHaveURL(/[?&]join=ab12cd34ef56(?:&|$)/)
})

test("robots and sitemap use the canonical host", async ({ request }) => {
  const robots = await request.get("/robots.txt")
  expect(robots.status()).toBe(200)
  const robotsText = await robots.text()
  expect(robotsText).toContain(`${CANONICAL_ORIGIN}/sitemap.xml`)
  expect(robotsText).toContain(`Host: ${CANONICAL_ORIGIN}`)
  expect(robotsText).not.toContain("https://travelcalendar.space")
  expect(robotsText).not.toContain("ourcalendar.space")

  const sitemap = await request.get("/sitemap.xml")
  expect(sitemap.status()).toBe(200)
  const xml = await sitemap.text()
  expect(xml).toContain(`${CANONICAL_ORIGIN}</loc>`)
  expect(xml).toContain(`${CANONICAL_ORIGIN}/privacy`)
  expect(xml).toContain(`${CANONICAL_ORIGIN}/terms`)
  expect(xml).not.toContain("https://travelcalendar.space")
  expect(xml).not.toContain("ourcalendar.space")
})
