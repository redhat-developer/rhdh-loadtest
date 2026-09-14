import { createDevApp } from '@backstage/dev-utils';
import { pagePlugin, Page } from '../src/plugin';

createDevApp()
  .registerPlugin(pagePlugin)
  .addPage({
    element: <Page />,
    title: 'Root Page',
    path: '/page-n',
  })
  .render();
