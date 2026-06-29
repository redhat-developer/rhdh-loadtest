import {
  createComponentExtension,
  createPlugin,
} from '@backstage/core-plugin-api';

export const catalogTabPlugin = createPlugin({
  id: 'catalog-tab-n',
});

export const EntityCatalogCard = catalogTabPlugin.provide(
  createComponentExtension({
    name: 'EntityCatalogCard',
    component: {
      lazy: () =>
        import('./components/ExampleComponent').then(m => m.ExampleComponent),
    },
  }),
);
