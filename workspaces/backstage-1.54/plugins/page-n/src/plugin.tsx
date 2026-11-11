import {
  createFrontendPlugin,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

import { rootRouteRef } from './routes';

const Null = () => null;

export const page = PageBlueprint.make({
  params: {
    path: '/page-n',
    title: 'Page N',
    icon: <Null />,
    routeRef: rootRouteRef,
    loader: () =>
      import('./components/ExampleComponent').then(m => <m.ExampleComponent />),
  },
});

export const pageNPlugin = createFrontendPlugin({
  pluginId: 'page-n',
  extensions: [page],
  routes: {
    root: rootRouteRef,
  },
});
