import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import { AuthProvider } from './context/AuthContext';
import Router from './pages/Router';
import * as serviceWorker from './serviceWorker';

import './assets/css/main.css';
import './assets/css/design-system.css';

const app = (
  <AuthProvider>
    <Router />
  </AuthProvider>
);

ReactDOM.render(app, document.getElementById('root'));

serviceWorker.unregister();
