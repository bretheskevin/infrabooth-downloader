import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguageSync, useAuthStateListener, useOAuthFlow, useStartupAuth } from '@/hooks';

export function App() {
  useLanguageSync();
  useAuthStateListener();
  useOAuthFlow();
  useStartupAuth();

  return (
    <AppLayout>
      <p>Welcome to InfraBooth Downloader</p>
    </AppLayout>
  );
}
