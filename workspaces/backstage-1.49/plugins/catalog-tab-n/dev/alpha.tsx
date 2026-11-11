import { createDevApp } from '@backstage/frontend-dev-utils';
import catalogPlugin from '@backstage/plugin-catalog/alpha';

import plugin from '../src/alpha';

createDevApp({
  features: [catalogPlugin, plugin],
});
