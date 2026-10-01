import {
  createFrontendPlugin,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import { RiRemixiconFill } from '@remixicon/react';

import { rootRouteRef } from './routes';

export const page = PageBlueprint.make({
  params: {
    path: '/bui-page-n',
    title: 'BUI Page N',
    icon: <RiRemixiconFill />,
    routeRef: rootRouteRef,
    loader: () => import('./components/TodoPage').then(m => <m.TodoPage />),
  },
});

export const buiPageNPlugin = createFrontendPlugin({
  pluginId: 'bui-page-n',
  extensions: [page],
  routes: {
    root: rootRouteRef,
  },
});
