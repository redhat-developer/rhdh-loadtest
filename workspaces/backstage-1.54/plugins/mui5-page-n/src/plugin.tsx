import {
  createFrontendPlugin,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import Looks5Icon from '@mui/icons-material/Looks5';

import { rootRouteRef } from './routes';

export const page = PageBlueprint.make({
  params: {
    path: '/mui5-page-n',
    title: 'MUI5 Page N',
    icon: <Looks5Icon />,
    routeRef: rootRouteRef,
    loader: () => import('./components/TodoPage').then(m => <m.TodoPage />),
  },
});

export const mui5PageNPlugin = createFrontendPlugin({
  pluginId: 'mui5-page-n',
  extensions: [page],
  routes: {
    root: rootRouteRef,
  },
});
