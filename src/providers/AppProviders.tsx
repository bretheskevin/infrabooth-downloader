import { useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useUpdateStore } from '@/features/update';
import { useLanguageSync } from '@/features/settings/hooks/useLanguageSync';
import { useThemeSync } from '@/features/settings/hooks/useThemeSync';
import { useAuthStateListener } from '@/features/auth/hooks/useAuthStateListener';
import { useStartupAuth } from '@/features/auth/hooks/useStartupAuth';
import { useInitializeSettings } from '@/features/settings/hooks/useInitializeSettings';
import { useLikedTracks } from '@/features/library/hooks/useLikedTracks';
import { useIsSignedIn } from '@/features/auth/store';

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

  useEffect(() => {
    useUpdateStore.getState().checkForUpdates();
  }, []);

  return null;
}

/**
 * App-level providers and initialization.
 * Wraps the entire application with necessary context providers.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <TooltipProvider>
      <AppInitializer />
      {children}
    </TooltipProvider>
  );
}
