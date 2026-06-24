import {
  createFrontendPlugin,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import ExtensionIcon from '@material-ui/icons/Extension';

import { rootRouteRef } from './routes';

const PLUGIN_ID = 'page-n';

function pageDisplayTitle(pluginId: string): string {
  const suffix = pluginId.replace(/^page-/, '');
  return `Page ${suffix === 'n' ? 'N' : suffix}`;
}

export const page: any = PageBlueprint.make({
  params: {
    path: `/${PLUGIN_ID}`,
    routeRef: rootRouteRef,
    title: pageDisplayTitle(PLUGIN_ID),
    icon: <ExtensionIcon />,
    loader: () =>
      import('../components/ExampleComponent').then(m => (
        <m.ExampleComponent />
      )),
  },
});

export const pagePlugin = createFrontendPlugin({
  pluginId: PLUGIN_ID,
  extensions: [page],
});
