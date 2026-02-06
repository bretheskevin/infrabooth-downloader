import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguageSync } from '@/hooks/useLanguageSync';

export function App() {
  useLanguageSync();

  return (
    <AppLayout>
      <p>Welcome to InfraBooth Downloader</p>
    </AppLayout>
  );
}
