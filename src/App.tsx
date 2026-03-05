import { AppLayout } from '@/components/layout/AppLayout';
import { DownloadPage } from '@/pages/DownloadPage';
import { AuthChoiceDialog } from '@/features/auth/components/AuthChoiceDialog';
import { useAuthChoiceDialog } from '@/features/auth/hooks/useAuthChoiceDialog';
import { RateLimitDialog } from '@/features/queue/components/RateLimitDialog';
import { useRateLimitDialog } from '@/features/queue/hooks/useRateLimitDialog';
import { useUpdateStore } from '@/features/update';
import { useLanguageSync, useThemeSync, useAuthStateListener, useStartupAuth, useInitializeSettings } from '@/hooks';
import { useEffect } from 'react';

export function App() {
  useLanguageSync();
  useThemeSync();
  useAuthStateListener();
  useStartupAuth();
  useInitializeSettings();
  useEffect(() => {
    useUpdateStore.getState().checkForUpdates();
  }, []);

  const {
    isOpen: authChoiceOpen,
    handleReAuthenticate,
    handleContinueStandard,
  } = useAuthChoiceDialog();

  const {
    isOpen: rateLimitOpen,
    handleRetry: handleRateLimitRetry,
    handleStop: handleRateLimitStop,
  } = useRateLimitDialog();

  return (
    <AppLayout>
      <DownloadPage />
      <AuthChoiceDialog
        open={authChoiceOpen}
        onReAuthenticate={handleReAuthenticate}
        onContinueStandard={handleContinueStandard}
      />
      <RateLimitDialog
        open={rateLimitOpen}
        onRetry={handleRateLimitRetry}
        onStop={handleRateLimitStop}
      />
    </AppLayout>
  );
}
