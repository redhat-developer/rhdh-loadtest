import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import notificationsPlugin from '@backstage/plugin-notifications/alpha';
import scaffolderPlugin from '@backstage/plugin-scaffolder/alpha';
import searchPlugin from '@backstage/plugin-search/alpha';
import userSettingsPlugin from '@backstage/plugin-user-settings/alpha';
import catalogTabNPlugin from '@internal/backstage-plugin-catalog-tab-n/alpha';
import pageNPlugin from '@internal/backstage-plugin-page-n/alpha';
import { navModule } from './modules/nav';

export default createApp({
  features: [
    catalogPlugin,
    scaffolderPlugin,
    searchPlugin,
    notificationsPlugin,
    userSettingsPlugin,
    pageNPlugin,
    catalogTabNPlugin,
    navModule,
  ],
});
