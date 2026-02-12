import { AppLayout } from '@/components/layout/AppLayout';
import { DownloadSection } from '@/features/download/components/DownloadSection';
import { useLanguageSync, useAuthStateListener, useOAuthFlow, useStartupAuth, useInitializeSettings } from '@/hooks';

export function App() {
  useLanguageSync();
  useAuthStateListener();
  useOAuthFlow();
  useStartupAuth();
  useInitializeSettings();

  return (
    <AppLayout>
      <DownloadSection />
    </AppLayout>
  );
}
