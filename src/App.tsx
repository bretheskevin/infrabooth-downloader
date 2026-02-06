import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguageSync, useAuthStateListener, useOAuthFlow } from '@/hooks';

export function App() {
  useLanguageSync();
  useAuthStateListener();
  useOAuthFlow();

  return (
    <AppLayout>
      <p>Welcome to InfraBooth Downloader</p>
    </AppLayout>
  );
}
