import { test, expect } from "@playwright/test";

async function choose(page: import("@playwright/test").Page, name: RegExp) {
  await page.goto("/login");
  const identity = page.getByRole("button", { name });
  await expect(identity).toHaveAttribute("data-ready", "true");
  await identity.click();
}

test("order moves from Admin assignment through Technician completion to Manager closure", async ({
  page,
}) => {
  await choose(page, /Nadia/);
  await page.getByRole("button", { name: "New order" }).click();
  await page.getByLabel("Customer name").fill("Workflow Customer");
  await page.getByLabel("Phone").fill("0127778899");
  await page
    .getByLabel("Address line 1")
    .fill("Putrajaya, Wilayah Persekutuan");
  await page
    .getByLabel("Problem description")
    .fill("Living room unit has weak airflow");
  await page.getByLabel("Quoted price (RM)").fill("150");
  await page.getByLabel(/Assigned technician/).selectOption("tech-ali");
  await page.getByRole("button", { name: "Create order" }).click();
  await expect(page.getByText("Order saved successfully")).toBeVisible();
  await page.getByRole("button", { name: "Back to orders" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();

  await choose(page, /Ali/);
  await page.getByRole("link", { name: "My jobs" }).click();
  await page.getByRole("link", { name: /Workflow Customer/ }).click();
  await page.getByRole("button", { name: "Start work" }).click();
  while (await page.getByRole("button", { name: /^Complete / }).count()) {
    const item = page.locator("[data-checklist-state='incomplete']").first();
    await item.getByRole("button", { name: /^Complete / }).click();
    await page.locator("button:enabled", { hasText: "Save item" }).click();
  }
  await expect(page.getByText("3 of 3 required steps completed")).toBeVisible();
  await page
    .getByLabel("Work done")
    .fill("Cleaned filter and blower, tested airflow");
  await page.getByLabel("Extra charges (RM)").fill("20");
  await page
    .getByRole("spinbutton", { name: "Amount", exact: true })
    .fill("100");
  await page.getByLabel("Method").selectOption("Cash");
  await page.getByRole("button", { name: "Mark job done" }).click();
  await expect(page.getByText("Completion report")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();

  await choose(page, /Farah/);
  await page.getByRole("link", { name: "Reviews" }).first().click();
  await page.getByRole("link", { name: /Workflow Customer/ }).click();
  await expect(page.getByText(/Final amount is/)).toBeVisible();
  await page.getByRole("button", { name: "Accept review" }).click();
  await page.getByRole("button", { name: "Close order" }).click();
  await expect(page.getByText("Closed", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Payment recorded/ })).toBeVisible();
});
