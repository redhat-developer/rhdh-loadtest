import {
  createFrontendPlugin,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

import { rootRouteRef } from './routes';

const Null = () => null;

export const page = PageBlueprint.make({
  params: {
    path: '/bcc-page-n',
    title: 'BCC Page N',
    icon: <Null />,
    routeRef: rootRouteRef,
    loader: () => import('./components/TodoPage').then(m => <m.TodoPage />),
  },
});

export const bccPageNPlugin = createFrontendPlugin({
  pluginId: 'bcc-page-n',
  extensions: [page],
  routes: {
    root: rootRouteRef,
  },
});
