import { test, expect } from "@playwright/test";

import { Backstage } from "../lib/playwright/Backstage";
import { addNetworkListeners } from "../lib/playwright/network-stats";
import { setupNetworkThrottling } from "../lib/playwright/network-throttling";

const loops = Number(process.env.LOOPS || 1);

for (let i = 1; i <= loops; i++) {
  test(`run ${i} of ${loops}`, async ({ context, page }) => {
    const backstage = new Backstage(page);

    const allSteps = async () => {
      await test.step('login', async () => {
        await page.goto("/");
        await expect(page.getByRole("button", { name: "Enter" })).toBeVisible();
      });
      
      await test.step('home', async () => {
        // Do the login
        await page.getByRole("button", { name: "Enter" }).click();

        await expect(backstage.globalHeader).toBeVisible();
        await expect(backstage.sidebarItem("Home")).toBeVisible();

        // Home header/content
        await expect(backstage.header.getByText("Welcome back!").or(
          backstage.content.getByRole("heading", {
            name: "No widgets added. Start by clicking the 'Add widget' button.",
          }),
        )).toBeVisible();
      })

      await test.step('catalog', async () => {
        await backstage.sidebarItem("Catalog").click();
        await expect(backstage.header.getByText("Catalog")).toBeVisible();
        await expect(
          backstage.content.getByText("All Components (1000)"),
        ).toBeVisible();
        await expect(
          backstage.content.getByRole("link", { name: "Component 1", exact: true }),
        ).toBeVisible();
      });

      await test.step('component', async () => {
        await backstage.content
          .getByRole("link", { name: "Component 1", exact: true })
          .click();
        await expect(backstage.header.getByText("Component 1")).toBeVisible();
        await expect(
          backstage.content.getByText("About", { exact: true }).first(),
        ).toBeVisible();
        await expect(
          backstage.content.getByText("Group 1", { exact: true }).first(),
        ).toBeVisible();
        await expect(
          backstage.content.getByText("System 1", { exact: true }).first(),
        ).toBeVisible();

        await expect(backstage.tabItem("Catalog Tab 1")).toBeVisible();
      });

      await test.step('catalog-tab-n', async () => {
        await backstage.tabItem("Catalog Tab 1").click();
        await expect(backstage.header.getByText("Component 1")).toBeVisible();
        await expect(
          backstage.content.getByText("Example User List"),
        ).toBeVisible();
      });

      await test.step('page-n', async () => {
        await backstage.sidebarItem("Page 1").click();
        await expect(backstage.header.getByText("Welcome to Page 1!")).toBeVisible();
        await expect(
          backstage.content.getByText("Information card"),
        ).toBeVisible();
        await expect(
          backstage.content.getByText("Example User List"),
        ).toBeVisible();
      });

    };

    const logout = async () => {
      await expect(backstage.globalHeader).toBeVisible();
      await backstage.globalHeader.getByRole('button').filter({ hasText: 'Guest' }).click();
      await page.getByRole('menuitem', { name: 'Sign out' }).click();
    };

    // Test setup
    await setupNetworkThrottling(context, page);

    const networkListeners = await addNetworkListeners(page);

    await test.step('cold', allSteps);
    await test.step('logout', logout);
    await test.step('warm', allSteps);

    await networkListeners.logStatsAndErrors();
  });
}
