import { test, expect } from "@playwright/test";

test("reviewer can switch among role workspaces",async({page})=>{
  await page.goto("/login"); await expect(page.getByRole("heading",{name:"Continue as a user"})).toBeVisible();
  const nadia=page.getByRole("button",{name:/Nadia/}); await expect(nadia).toHaveAttribute("data-ready","true"); await nadia.click(); await expect(page.getByRole("heading",{name:"Service orders"})).toBeVisible();
  await expect(page.getByRole("button",{name:"New order"})).toBeVisible();
});

test("admin can create and search an assigned order",async({page})=>{
  await page.goto("/login"); const nadia=page.getByRole("button",{name:/Nadia/}); await expect(nadia).toHaveAttribute("data-ready","true"); await nadia.click(); await page.getByRole("button",{name:"New order"}).click();
  await page.getByLabel("Customer name").fill("Nurul Huda"); await page.getByLabel("Phone").fill("012-987 6543"); await page.getByLabel("Address line 1").fill("Cyberjaya, Selangor"); await page.getByLabel("Problem description").fill("Bedroom air conditioner produces warm air"); await page.getByLabel("Quoted price (RM)").fill("190"); await page.getByLabel(/Assigned technician/).selectOption("tech-ali");
  await page.getByRole("button",{name:"Create order"}).click(); await expect(page.getByText("Order saved successfully")).toBeVisible(); await expect(page.getByRole("dialog",{name:"Order created"}).getByText("Assigned",{exact:true})).toBeVisible();
});
