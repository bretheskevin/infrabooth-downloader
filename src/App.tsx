import { AppLayout } from '@/components/layout/AppLayout';
import { DownloadSection } from '@/components/features/download/DownloadSection';
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
