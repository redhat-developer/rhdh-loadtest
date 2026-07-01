import { test as base, expect, type Page } from '@playwright/test';

import { Backstage } from './Backstage';

const test = base.extend<{ backstage: Backstage }>({
  backstage: ({ page }, use) => use(new Backstage(page)),
});

const loops = Number(process.env.LOOPS ?? 100);
const nfsNavigationTimeout = Number(process.env.NFS_NAVIGATION_TIMEOUT ?? 500_000);

async function isNfsHomeVisible(page: Page): Promise<boolean> {
  const noWidgets = page.getByText(/no widgets added/i);
  const addWidget = page.getByRole('button', { name: 'Add widget' });
  const edit = page.getByRole('button', { name: 'Edit' });

  return (
    (await noWidgets.isVisible()) ||
    (await addWidget.isVisible()) ||
    (await edit.isVisible())
  );
}

async function expectNfsHomeVisible(page: Page) {
  await expect
    .poll(() => isNfsHomeVisible(page), { timeout: nfsNavigationTimeout })
    .toBe(true);
}

for (let i = 1; i <= loops; i++) {
  test(`run ${i} of ${loops}`, async ({ backstage, page }) => {
    await test.step('login', async () => {
      await page.goto('/', { timeout: nfsNavigationTimeout });
      // NFS + many dynamic plugins can take well over 20s on cold load.
      await expect(page.getByRole('button', { name: 'Enter' })).toBeVisible({
        timeout: nfsNavigationTimeout,
      });
    });

    await test.step('home', async () => {
      await page.getByRole('button', { name: 'Enter' }).click();
      await page.waitForURL('/', { timeout: nfsNavigationTimeout });

      if (!(await isNfsHomeVisible(page))) {
        await backstage.sidebarNavItem('Home').click();
      }

      await expectNfsHomeVisible(page);
    });

    await test.step('catalog', async () => {
      await backstage.sidebarItem('Catalog').click();
      await expect(page.getByText('Catalog', { exact: true }).first()).toBeVisible();
      // await expect(backstage.content.getByText('All Components (1001)')).toBeVisible();
      await expect(backstage.content.getByText('All Components (1000)')).toBeVisible();
      await expect(backstage.content.getByText('Component 1', { exact: true })).toBeVisible();
    });

    await test.step('component', async () => {
      await backstage.content.getByText('Component 1', { exact: true }).click();
      await expect(page.getByText('Component 1', { exact: true }).first()).toBeVisible();
      await expect(backstage.content.getByText('About')).toBeVisible();
      await expect(backstage.content.getByText('Group 1')).toBeVisible();
      await expect(backstage.content.getByText('System 1')).toBeVisible();
      await expect(page.getByTestId('header-tab-catalog-tab-1')).toBeVisible();
    });

    await test.step('catalog-tab-n', async () => {
      await page.getByTestId('header-tab-catalog-tab-1').click();
      await expect(page.getByText('Component 1', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Example User List')).toBeVisible({ timeout: 30_000 });
    });

    await test.step('page-n', async () => {
      await backstage.sidebar
        .getByRole('link', { name: /^(Page 1|page-1)$/ })
        .click();
      await expect(page.getByText(/welcome to page-?1!/i)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('Information card')).toBeVisible();
      await expect(page.getByText('Example User List')).toBeVisible();
    });
  });
}
