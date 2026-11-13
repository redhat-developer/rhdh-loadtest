import type { Page } from '@playwright/test';

export class Backstage {
  constructor(public readonly page: Page) {}

  get globalHeader() {
    return this.page.locator('nav#global-header');
  }

  get sidebar() {
    // Prefer the main sidebar; plain `nav` also matches the global header and
    // resolves multiple "Home" links (icon + label), which breaks click().
    return this.page.locator('nav[aria-label="sidebar nav"]');
  }

  get header() {
    return this.page.locator(
      'header, .bui-PluginHeader, .bui-Header, .bui-HeaderPage, .bui-HeaderTop, .bui-HeaderContent',
    );
  }

  get pluginHeader() {
    return this.page.locator('.bui-PluginHeader');
  }

  get tabs() {
    // Legacy OFS uses tablist; NFS / new frontend uses content nav links.
    return this.page.locator(
      '[role=tablist], div[class*=BackstageHeaderTabs-tabsWrapper], nav[aria-label="Content navigation"]',
    );
  }

  tabItem(name: string) {
    const tabs = this.tabs;
    // exact: true — "Catalog Tab 1" must not match "Catalog Tab 10" / "100".
    return tabs
      .getByRole("tab", { name, exact: true })
      .or(tabs.getByRole("link", { name, exact: true }));
  }

  get content() {
    // OFS wraps page body in <article>. NFS places page body as siblings of
    // .bui-PluginHeader (HeaderTop/Content/Bottom + main container).
    return this.page.locator(
      'article, .bui-PluginHeader ~ *, .bui-Header + *, .bui-HeaderPage + *',
    );
  }

  sidebarItem(name: string) {
    // Sidebar items often have both an icon-only link and a labeled link with
    // the same accessible name; prefer the visible text label.
    return this.sidebar
      .getByRole('link', { name, exact: true })
      .filter({ hasText: name });
  }
}
