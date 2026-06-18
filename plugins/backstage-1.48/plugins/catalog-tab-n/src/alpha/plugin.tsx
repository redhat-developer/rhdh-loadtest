import { createFrontendPlugin } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';

const PLUGIN_ID = 'catalog-tab-n';

export const EntityCatalogCard: any = EntityContentBlueprint.make({
  name: 'EntityCatalogCard',
  params: {
    path: PLUGIN_ID,
    title: 'Catalog Tab N',
    loader: () =>
      import('../components/ExampleComponent').then(m => (
        <m.ExampleComponent />
      )),
  },
});

export const catalogTabPlugin = createFrontendPlugin({
  pluginId: PLUGIN_ID,
  extensions: [EntityCatalogCard],
});
