import { test as base, expect } from "@playwright/test";

import { Backstage } from "./Backstage";

const test = base.extend<{ backstage: Backstage }>({
  backstage: ({ page }, use) => use(new Backstage(page)),
});

const loops = Number(process.env.LOOPS ?? 1);

for (let i = 1; i <= loops; i++) {
  test(`run ${i} of ${loops}`, { tag: '@nfs' }, async ({ backstage, page }) => {
    await test.step("login", async () => {
      await page.goto("/");
      await expect(page.getByRole("button", { name: "Enter" })).toBeVisible();
    });

    await test.step("home", async () => {
      await page.getByRole("button", { name: "Enter" }).click();
      await backstage.sidebarItem("Home").click();
      await expect(
        page.getByRole("heading", {
          name: "No widgets added. Start by clicking the 'Add widget' button.",
        }),
      ).toBeVisible();
    });

    await test.step("catalog", async () => {
      await backstage.sidebarItem("Catalog").click();
      await expect(backstage.pluginHeader.getByText("Catalog")).toBeVisible();
      await expect(
        backstage.content.getByText("All Components (1000)"),
      ).toBeVisible();
      await expect(
        backstage.content.getByText("Component 1", { exact: true }),
      ).toBeVisible();
    });

    await test.step("component", async () => {
      await backstage.content.getByText("Component 1", { exact: true }).click();
      await expect(backstage.header.getByText("Component 1")).toBeVisible();
      await expect(backstage.content.getByText("About")).toBeVisible();
      await expect(backstage.content.getByText("Group 1")).toBeVisible();
      await expect(backstage.content.getByText("System 1")).toBeVisible();
      await expect(
        backstage.tabs.getByText("Catalog Tab 1", { exact: true }),
      ).toBeVisible();
    });

    await test.step("catalog-tab-n", async () => {
      await backstage.tabs.getByText("Catalog Tab 1", { exact: true }).click();
      await expect(backstage.header.getByText("Component 1")).toBeVisible();
      await expect(
        backstage.content.getByText("Example User List"),
      ).toBeVisible();
    });

    await test.step("page-n", async () => {
      await backstage.sidebarItem("Page 1").click();
      await expect(
        backstage.header.getByText("Welcome to Page 1!"),
      ).toBeVisible();
      await expect(
        backstage.content.getByText("Information card"),
      ).toBeVisible();
      await expect(
        backstage.content.getByText("Example User List"),
      ).toBeVisible();
    });
  });
}
