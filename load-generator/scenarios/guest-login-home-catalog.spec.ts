import { test as base, expect } from '@playwright/test';

import { Backstage } from './Backstage';

const test = base.extend<{ backstage: Backstage }>({
  backstage: ({ page }, use) => use(new Backstage(page)),
});

const loops = Number(process.env.LOOPS ?? 1);

for (let i = 1; i <= loops; i++) {
  test(`run ${i} of ${loops}`, { tag: '@ofs' }, async ({ backstage, page }) => {
    await test.step('login', async () => {
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Enter' })).toBeVisible();
    });

    await test.step('home', async () => {
      await page.getByRole('button', { name: 'Enter' }).click();
      await expect(backstage.header.getByText('Welcome back!')).toBeVisible();
      await expect(backstage.content.getByText('Get started')).toBeVisible();
      await expect(backstage.content.getByText('Explore Your Software Catalog')).toBeVisible();
      await expect(backstage.content.getByText('Explore Templates')).toBeVisible();
    });

    await test.step('catalog', async () => {
      await backstage.sidebarItem('Catalog').click();
      await expect(backstage.header.getByText('Catalog')).toBeVisible();
      await expect(backstage.content.getByText('All Components (1000)')).toBeVisible();
      await expect(backstage.content.getByText('Component 1', { exact: true })).toBeVisible();
    });

    await test.step('component', async () => {
      await backstage.content.getByText('Component 1', { exact: true }).click();
      await expect(backstage.header.getByText('Component 1')).toBeVisible();
      await expect(backstage.content.getByText('About')).toBeVisible();
      await expect(backstage.content.getByText('Group 1')).toBeVisible();
      await expect(backstage.content.getByText('System 1')).toBeVisible();
      await expect(backstage.tabs.getByText('Catalog Tab 1', { exact: true })).toBeVisible();
    });

    await test.step('catalog-tab-n', async () => {
      await backstage.tabs.getByText('Catalog Tab 1', { exact: true }).click();
      await expect(backstage.header.getByText('Component 1')).toBeVisible();
      await expect(backstage.content.getByText('Catalog Tab 1')).toBeVisible();
      await expect(backstage.content.getByText('Example User List')).toBeVisible();
    });

    await test.step('page-n', async () => {
      await backstage.sidebar.getByText('Page 1', { exact: true }).click();
      await expect(backstage.header.getByText('Welcome to Page 1!')).toBeVisible();
      await expect(backstage.content.getByText('Information card')).toBeVisible();
      await expect(backstage.content.getByText('Example User List')).toBeVisible();
    });
  });
}
