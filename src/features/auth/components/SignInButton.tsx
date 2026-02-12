import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { startOAuth } from '@/features/auth/api';
import { Spinner } from '@/components/ui/spinner';

const OAUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function SignInButton() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await startOAuth();
    } catch (error) {
      console.error('OAuth start failed:', error);
      setIsLoading(false);
    }
  };

  // Reset loading state after timeout (user may have cancelled)
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        setIsLoading(false);
      }, OAUTH_TIMEOUT_MS);
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  // Reset loading state when window regains focus (user may have cancelled)
  useEffect(() => {
    const handleFocus = () => {
      // Small delay to allow auth completion to process first
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    };

    if (isLoading) {
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [isLoading]);

  return (
    <Button
      onClick={handleSignIn}
      disabled={isLoading}
      className="bg-primary hover:bg-primary/90 text-primary-foreground"
    >
      {isLoading ? (
        <>
          <Spinner className="mr-2 h-4 w-4" />
          {t('auth.openingBrowser')}
        </>
      ) : (
        t('auth.signIn')
      )}
    </Button>
  );
}
