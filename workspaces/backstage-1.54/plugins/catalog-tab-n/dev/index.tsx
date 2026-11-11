import { createDevApp } from '@backstage/frontend-dev-utils';
import catalogPlugin from '@backstage/plugin-catalog/alpha';

import plugin from '../src';

createDevApp({
  features: [catalogPlugin, plugin],
});
