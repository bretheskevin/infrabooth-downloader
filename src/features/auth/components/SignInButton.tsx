import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { checkAuth } from '@/features/auth/api';

export function SignInButton() {
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      await checkAuth();
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-muted-foreground text-center">
        {t('auth.signInHint')}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCheck}
        disabled={isChecking}
        className="rounded-xl"
      >
        {isChecking ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        {isChecking ? t('auth.checking') : t('auth.checkBrowser')}
      </Button>
    </div>
  );
}
