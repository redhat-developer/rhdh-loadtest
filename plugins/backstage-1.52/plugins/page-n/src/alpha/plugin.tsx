import {
  createFrontendPlugin,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import ExtensionIcon from '@material-ui/icons/Extension';

import { rootRouteRef } from './routes';

export const page: any = PageBlueprint.make({
  params: {
    path: `/page-n`,
    routeRef: rootRouteRef,
    title: 'Page N',
    icon: <ExtensionIcon />,
    loader: () =>
      import('../components/ExampleComponent').then(m => <m.ExampleComponent />),
  },
});

export const pagePlugin = createFrontendPlugin({
  pluginId: 'page-n',
  extensions: [page],
});
