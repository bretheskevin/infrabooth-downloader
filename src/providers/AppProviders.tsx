import { useTranslation } from 'react-i18next';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useUpdateCheck } from '@/features/update';
import { useLanguageSync } from '@/features/settings/hooks/useLanguageSync';
import { useThemeSync } from '@/features/settings/hooks/useThemeSync';
import { useAuthStateListener } from '@/features/auth/hooks/useAuthStateListener';
import { useStartupAuth } from '@/features/auth/hooks/useStartupAuth';
import { useInitializeSettings } from '@/features/settings/hooks/useInitializeSettings';
import { useLikedTracks } from '@/features/library/hooks/useLikedTracks';
import { useIsSignedIn } from '@/features/auth/store';
import { useAutoRefreshFollowedArtists } from '@/hooks/useAutoRefreshFollowedArtists';
import { TranslationProvider } from '@/lib/translation';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Centralized initialization hooks.
 * Extracted from App.tsx for cleaner separation of concerns.
 */
function AppInitializer() {
  const isSignedIn = useIsSignedIn();
  useLanguageSync();
  useThemeSync();
  useAuthStateListener();
  useStartupAuth();
  useInitializeSettings();
  useLikedTracks(isSignedIn);
  useAutoRefreshFollowedArtists(isSignedIn);
  useUpdateCheck();

  return null;
}

function I18nBridge({ children }: AppProvidersProps) {
  const { t } = useTranslation();
  return <TranslationProvider t={t}>{children}</TranslationProvider>;
}

/**
 * App-level providers and initialization.
 * Wraps the entire application with necessary context providers.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <TooltipProvider>
      <AppInitializer />
      <I18nBridge>{children}</I18nBridge>
    </TooltipProvider>
  );
}
