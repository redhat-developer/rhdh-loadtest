import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const pagePlugin = createPlugin({
  id: 'page-n',
  routes: {
    root: rootRouteRef,
  },
});

export const Page = pagePlugin.provide(
  createRoutableExtension({
    name: 'Page',
    component: () =>
      import('./components/ExampleComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);
