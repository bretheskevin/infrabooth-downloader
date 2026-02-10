import React from 'react';
import ReactDOM from 'react-dom/client';
import './lib/i18n';
import { App } from './App';
import './index.css';

// Disable context menu in production
if (import.meta.env.PROD) {
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
