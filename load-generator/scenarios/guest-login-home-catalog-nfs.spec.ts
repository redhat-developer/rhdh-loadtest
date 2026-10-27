import { test, expect, type BrowserContext, type Page } from "@playwright/test";

import { Backstage } from "./Backstage";
import { addNetworkListeners } from "./network-stats";
import { setupNetworkThrottling } from "./network-throttling";
import { requestedCacheModes, setupCacheMode, type CacheMode } from "./cache-mode";

const loops = Number(process.env.LOOPS || 1);
const cacheModes = requestedCacheModes();

const homeReady = (page: Page) =>
  page.getByText("Welcome back!").or(
    page.getByRole("heading", {
      name: "No widgets added. Start by clicking the 'Add widget' button.",
    }),
  );

async function runJourney(
  mode: CacheMode,
  page: Page,
  backstage: Backstage,
  opts: { logStats?: boolean } = {},
) {
  const networkListeners = await addNetworkListeners(page);

  await test.step(`${mode}/login`, async () => {
    await page.goto("/");
    const enter = page.getByRole("button", { name: "Enter" });
    // Warm repeats are already authenticated, so / may skip the guest card.
    await expect(enter.or(homeReady(page))).toBeVisible();
  });

  await test.step(`${mode}/home`, async () => {
    const enter = page.getByRole("button", { name: "Enter" });
    if (await enter.isVisible()) {
      await enter.click();
    }
    await backstage.sidebarItem("Home").click();
    // 2.1 NFS default widgets vs 1.10 NFS empty customizable home.
    await expect(homeReady(page)).toBeVisible();
  });

  await test.step(`${mode}/catalog`, async () => {
    await backstage.sidebarItem("Catalog").click();
    await expect(page.getByRole("heading", { name: "Catalog" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "All Components (1000)", level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Component 1", exact: true }),
    ).toBeVisible();
  });

  await test.step(`${mode}/component`, async () => {
    await page.getByRole("link", { name: "Component 1", exact: true }).click();
    await expect(backstage.header.getByText("Component 1")).toBeVisible();
    await expect(page.getByText("About", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Group 1", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("System 1", { exact: true }).first()).toBeVisible();
    // 1.10 NFS: MUI tab; 2.1 NFS: content-nav link. Labels may be uppercase.
    await expect(
      backstage.tabs
        .getByRole("tab", { name: /^Catalog Tab 1$/i })
        .or(backstage.tabs.getByRole("link", { name: /^Catalog Tab 1$/i })),
    ).toBeVisible();
  });

  await test.step(`${mode}/catalog-tab-n`, async () => {
    const catalogTab = backstage.tabs
      .getByRole("tab", { name: /^Catalog Tab 1$/i })
      .or(backstage.tabs.getByRole("link", { name: /^Catalog Tab 1$/i }));
    await catalogTab.click();
    await expect(backstage.header.getByText("Component 1")).toBeVisible();
    await expect(page.getByText("Example User List")).toBeVisible();
  });

  await test.step(`${mode}/page-n`, async () => {
    await backstage.sidebarItem("Page 1").click();
    await expect(backstage.header.getByText("Welcome to Page 1!")).toBeVisible();
    await expect(page.getByText("Information card")).toBeVisible();
    await expect(page.getByText("Example User List")).toBeVisible();
  });

    if (opts.logStats !== false) {
      await networkListeners.logStatsAndErrors();
    }
}

async function instrumentPage(
  context: BrowserContext,
  mode: CacheMode,
): Promise<{ page: Page; backstage: Backstage }> {
  const page = await context.newPage();
  await setupCacheMode(context, page, mode);
  await setupNetworkThrottling(context, page);
  return { page, backstage: new Backstage(page) };
}

async function closeQuietly(target: { close: () => Promise<unknown> }) {
  try {
    await target.close();
  } catch {
    // Browser may already be gone after a test timeout.
  }
}

const perJourneyTimeoutMs = Number(
  process.env.PLAYWRIGHT_TEST_TIMEOUT ?? 300_000,
);

if (cacheModes.includes("cold")) {
  for (let i = 1; i <= loops; i++) {
    test(`cold run ${i} of ${loops}`, { tag: "@nfs" }, async ({ browser }) => {
      // New context each loop so HTTP cache cannot leak between cold runs.
      const context = await browser.newContext();
      try {
        const { page, backstage } = await instrumentPage(context, "cold");
        await runJourney("cold", page, backstage);
      } finally {
        await closeQuietly(context);
      }
    });
  }
}

if (cacheModes.includes("warm")) {
  test(`warm ${loops} run(s)`, { tag: "@nfs" }, async ({ browser }) => {
    // Prime + measured loops; each NFS journey can take several minutes.
    test.setTimeout(perJourneyTimeoutMs * (loops + 1));
    const context = await browser.newContext();
    try {
      await test.step("warm/prime", async () => {
        const { page, backstage } = await instrumentPage(context, "warm");
        try {
          await runJourney("warm", page, backstage, { logStats: false });
        } finally {
          await closeQuietly(page);
        }
      });
      for (let i = 1; i <= loops; i++) {
        console.log(`Starting warm measured run ${i} of ${loops}`);
        const { page, backstage } = await instrumentPage(context, "warm");
        try {
          await runJourney("warm", page, backstage);
        } finally {
          await closeQuietly(page);
        }
        console.log(`Finished warm measured run ${i} of ${loops}`);
      }
    } finally {
      await closeQuietly(context);
    }
  });
}
