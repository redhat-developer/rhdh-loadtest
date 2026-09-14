import { createDevApp } from '@backstage/frontend-dev-utils';

import plugin from '../src/alpha';

createDevApp({ features: [plugin] });
