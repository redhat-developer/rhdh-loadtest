import { createDevApp } from '@backstage/dev-utils';
import { catalogTabPlugin, EntityCatalogCard } from '../src/plugin';

createDevApp()
  .registerPlugin(catalogTabPlugin)
  .addPage({
    element: <EntityCatalogCard />,
    title: 'Root Page',
    path: '/catalog-tab-n',
  })
  .render();
