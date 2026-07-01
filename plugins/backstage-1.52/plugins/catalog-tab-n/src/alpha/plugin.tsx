import { createFrontendPlugin } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';

const PLUGIN_ID = 'catalog-tab-n';

function catalogTabDisplayTitle(pluginId: string): string {
  const suffix = pluginId.replace(/^catalog-tab-/, '');
  return `Catalog Tab ${suffix === 'n' ? 'N' : suffix}`;
}

export const EntityCatalogCard: any = EntityContentBlueprint.make({
  name: 'EntityCatalogCard',
  params: {
    path: PLUGIN_ID,
    title: catalogTabDisplayTitle(PLUGIN_ID),
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
