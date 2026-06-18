import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import ReactDOM from 'react-dom';

import plugin from '../src/alpha';

const app = createApp({
  features: [catalogPlugin, plugin],
});

ReactDOM.render(app.createRoot(), document.getElementById('root'));
