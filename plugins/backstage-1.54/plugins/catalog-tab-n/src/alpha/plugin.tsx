import { createFrontendPlugin } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';

export const EntityCatalogCard: any = EntityContentBlueprint.make({
  name: 'EntityCatalogCard',
  params: {
    path: 'catalog-tab-n',
    title: 'Catalog Tab N',
    loader: () =>
      import('../components/ExampleComponent').then(m => (
        <m.ExampleComponent />
      )),
  },
});

export const catalogTabPlugin = createFrontendPlugin({
  pluginId: 'catalog-tab-n',
  extensions: [EntityCatalogCard],
});
