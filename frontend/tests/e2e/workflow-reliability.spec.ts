import { expect, test } from "@playwright/test";

async function choose(page: import("@playwright/test").Page, name: RegExp) {
  await page.goto("/login");
  const identity = page.getByRole("button", { name });
  await expect(identity).toHaveAttribute("data-ready", "true");
  await identity.click();
  await expect(page).toHaveURL(/\/portal\//);
}

test("admin confirms technician assignment and can cancel it", async ({ page }) => {
  await choose(page, /Nadia/);
  await page.goto("/portal/orders/order-1234");
  const assignment = page.getByLabel("Assign technician");

  await assignment.selectOption("tech-john");
  const dialog = page.getByRole("alertdialog", { name: "Assign to John?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(assignment).toHaveValue("tech-ali");

  await assignment.selectOption("tech-john");
  await dialog.getByRole("button", { name: "Confirm assignment" }).click();
  await expect(assignment).toHaveValue("tech-john");
  await expect(page.getByText("Technician assigned")).toBeVisible();
});

test("checklist errors stay recoverable and postponement reaches manager", async ({ page }) => {
  const runtimeErrors: Error[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error));
  await choose(page, /John/);
  await page.goto("/portal/orders/order-1237");

  const firstItem = page.locator("[data-checklist-state]").first();
  await expect(firstItem.getByText("Required", { exact: true })).toBeVisible();
  await expect(firstItem).toHaveAttribute("data-checklist-state", "incomplete");
  await firstItem.locator('input[type="file"]').setInputFiles({
    name: "proof.png",
    mimeType: "image/png",
    buffer: Buffer.from("small-image-proof"),
  });
  await expect(firstItem.getByText("Proof: proof.png")).toBeVisible();
  await firstItem.getByRole("button", { name: /^Complete / }).click();
  await firstItem.getByRole("button", { name: "Save item" }).click();
  await expect(firstItem).toHaveAttribute("data-checklist-state", "completed");
  await expect(firstItem.getByText("Done", { exact: true })).toBeVisible();

  await page.getByLabel("Work done").fill("Checked the unit");
  await page.getByRole("button", { name: "Mark job done" }).click();
  await expect(page.getByText(/Complete all checklist items first/)).toBeVisible();
  expect(runtimeErrors).toEqual([]);

  await page.getByRole("button", { name: "Need to reschedule instead?" }).click();
  const future = await page.evaluate(() => {
    const date = new Date(Date.now() + 2 * 86_400_000);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  });
  await page.locator('input[name="time"]').fill(future);
  await page.getByPlaceholder("Reason for postponement").fill("Replacement part is unavailable");
  await page.getByRole("button", { name: "Save new schedule" }).click();
  await expect(page.getByText("Visit rescheduled")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();

  await choose(page, /Farah/);
  await page.getByRole("link", { name: "Notifications" }).first().click();
  await expect(page.getByText("Job postponed — manager attention")).toBeVisible();
  await expect(page.getByText(/Replacement part is unavailable/)).toBeVisible();
  await expect(page.getByText(/Previous:.*New:/)).toBeVisible();
});
