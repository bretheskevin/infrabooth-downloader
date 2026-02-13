import { AppLayout } from '@/components/layout/AppLayout';
import { DownloadPage } from '@/pages/DownloadPage';
import { useLanguageSync, useAuthStateListener, useOAuthFlow, useStartupAuth, useInitializeSettings } from '@/hooks';

export function App() {
  useLanguageSync();
  useAuthStateListener();
  useOAuthFlow();
  useStartupAuth();
  useInitializeSettings();

  return (
    <AppLayout>
      <DownloadPage />
    </AppLayout>
  );
}
