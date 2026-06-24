import React from 'react';
import ReactDOM from 'react-dom';
import { AuthProvider } from './context/AuthContext';
import Router from './pages/Router';
import * as serviceWorker from './serviceWorker';

// CSS loading order: reset/base → design tokens → overrides
import './assets/css/main.css';
import './assets/css/bulma-minimal.css';
import './assets/css/design-system.css';
import './assets/css/exam-layout.scss';
import './index.scss';

const app = (
  <AuthProvider>
    <Router />
  </AuthProvider>
);

ReactDOM.render(app, document.getElementById('root'));

serviceWorker.register();
