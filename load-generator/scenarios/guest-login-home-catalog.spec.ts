import { test, expect, type BrowserContext, type Page } from "@playwright/test";

import { Backstage } from "./Backstage";
import { addNetworkListeners } from "./network-stats";
import { setupNetworkThrottling } from "./network-throttling";
import {
  requestedCacheModes,
  setupCacheMode,
  type CacheMode,
} from "./cache-mode";

const loops = Number(process.env.LOOPS || 1);
const cacheModes = requestedCacheModes();

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
    // Warm repeats may already be authenticated.
    await expect(
      enter.or(backstage.header.getByText("Welcome back!")),
    ).toBeVisible();
  });

  await test.step(`${mode}/home`, async () => {
    const enter = page.getByRole("button", { name: "Enter" });
    if (await enter.isVisible()) {
      await enter.click();
    }
    await backstage.sidebarItem("Home").click();
    await expect(backstage.header.getByText("Welcome back!")).toBeVisible();
    await expect(backstage.content.getByText("Get started")).toBeVisible();
    await expect(
      backstage.content.getByText("Explore Your Software Catalog"),
    ).toBeVisible();
    await expect(backstage.content.getByText("Explore Templates")).toBeVisible();
  });

  await test.step(`${mode}/catalog`, async () => {
    await backstage.sidebarItem("Catalog").click();
    await expect(backstage.header.getByText("Catalog")).toBeVisible();
    await expect(
      backstage.content.getByText("All Components (1000)"),
    ).toBeVisible();
    await expect(
      backstage.content.getByText("Component 1", { exact: true }),
    ).toBeVisible();
  });

  await test.step(`${mode}/component`, async () => {
    await backstage.content.getByText("Component 1", { exact: true }).click();
    await expect(backstage.header.getByText("Component 1")).toBeVisible();
    await expect(backstage.content.getByText("About")).toBeVisible();
    await expect(backstage.content.getByText("Group 1")).toBeVisible();
    await expect(backstage.content.getByText("System 1")).toBeVisible();
    await expect(
      backstage.tabs.getByText("Catalog Tab 1", { exact: true }),
    ).toBeVisible();
  });

  await test.step(`${mode}/catalog-tab-n`, async () => {
    await backstage.tabs.getByText("Catalog Tab 1", { exact: true }).click();
    await expect(backstage.header.getByText("Component 1")).toBeVisible();
    await expect(backstage.content.getByText("Catalog Tab 1")).toBeVisible();
    await expect(
      backstage.content.getByText("Example User List"),
    ).toBeVisible();
  });

  await test.step(`${mode}/page-n`, async () => {
    await backstage.sidebar.getByText("Page 1", { exact: true }).click();
    await expect(backstage.header.getByText("Welcome to Page 1!")).toBeVisible();
    await expect(backstage.content.getByText("Information card")).toBeVisible();
    await expect(
      backstage.content.getByText("Example User List"),
    ).toBeVisible();
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
  process.env.PLAYWRIGHT_TEST_TIMEOUT ?? 60_000,
);

if (cacheModes.includes("cold")) {
  for (let i = 1; i <= loops; i++) {
    test(`cold run ${i} of ${loops}`, { tag: "@ofs" }, async ({ browser }) => {
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
  test(`warm ${loops} run(s)`, { tag: "@ofs" }, async ({ browser }) => {
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
