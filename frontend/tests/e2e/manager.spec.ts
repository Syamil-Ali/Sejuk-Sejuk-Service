import { test, expect } from "@playwright/test";

test("manager sees review, KPI, notification and assistant surfaces",async({page})=>{
  await page.goto("/login"); const farah=page.getByRole("button",{name:/Farah/}); await expect(farah).toHaveAttribute("data-ready","true"); await farah.click(); await expect(page.getByRole("heading",{name:"Performance overview"})).toBeVisible();
  await expect(page.getByText("Completed jobs")).toBeVisible(); await page.getByRole("link",{name:"Reviews"}).first().click(); await expect(page.getByRole("heading",{name:"Job review"})).toBeVisible();
  await page.getByRole("link",{name:"Ops assistant"}).first().click(); await page.getByRole("button",{name:/How many jobs were completed today/}).click(); await expect(page.getByText("How many jobs were completed today?",{exact:true})).toBeVisible(); await expect(page.getByText(/Checking authorized sources/)).toBeHidden({timeout:20_000});
});
