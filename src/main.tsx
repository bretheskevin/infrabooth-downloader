import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { loadFeatureFlags } from './lib/featureFlags';
import './lib/i18n';
import { App } from './App';
import './index.css';

if (import.meta.env.PROD) {
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

loadFeatureFlags().finally(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  );
});
