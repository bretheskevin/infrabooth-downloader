import { AppLayout } from '@/components/layout/AppLayout';
import { DownloadPage } from '@/pages/DownloadPage';
import { AuthChoiceDialog } from '@/features/auth/components/AuthChoiceDialog';
import { useAuthChoiceDialog } from '@/features/auth/hooks/useAuthChoiceDialog';
import { useUpdateStore } from '@/features/update';
import { useLanguageSync, useThemeSync, useAuthStateListener, useOAuthFlow, useStartupAuth, useInitializeSettings } from '@/hooks';
import { useEffect } from 'react';

export function App() {
  useLanguageSync();
  useThemeSync();
  useAuthStateListener();
  useOAuthFlow();
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

  return (
    <AppLayout>
      <DownloadPage />
      <AuthChoiceDialog
        open={authChoiceOpen}
        onReAuthenticate={handleReAuthenticate}
        onContinueStandard={handleContinueStandard}
      />
    </AppLayout>
  );
}
