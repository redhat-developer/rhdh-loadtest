import { createApp } from '@backstage/frontend-defaults';
import ReactDOM from 'react-dom';

import plugin from '../src/alpha';

const app = createApp({
  features: [plugin],
});

ReactDOM.render(app.createRoot(), document.getElementById('root'));
