import {
  createFrontendPlugin,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import Looks4Icon from '@material-ui/icons/Looks4';

import { rootRouteRef } from './routes';

export const page = PageBlueprint.make({
  params: {
    path: '/mui4-page-n',
    title: 'MUI4 Page N',
    icon: <Looks4Icon />,
    routeRef: rootRouteRef,
    loader: () => import('./components/TodoPage').then(m => <m.TodoPage />),
  },
});

export const mui4PageNPlugin = createFrontendPlugin({
  pluginId: 'mui4-page-n',
  extensions: [page],
  routes: {
    root: rootRouteRef,
  },
});
