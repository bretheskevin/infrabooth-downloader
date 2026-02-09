import { AppLayout } from '@/components/layout/AppLayout';
import { DownloadSection } from '@/components/features/download/DownloadSection';
import { useLanguageSync, useAuthStateListener, useOAuthFlow, useStartupAuth } from '@/hooks';

export function App() {
  useLanguageSync();
  useAuthStateListener();
  useOAuthFlow();
  useStartupAuth();

  return (
    <AppLayout>
      <DownloadSection />
    </AppLayout>
  );
}
