import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, RefreshCw } from 'lucide-react';
import { checkAuth } from '@/features/auth/api';

export function SignInButton() {
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      await checkAuth();
    } catch {
      // Auth check failed — state event handles UI update
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
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
      </TooltipTrigger>
      <TooltipContent className="max-w-xs mr-2">
        <p>{t('auth.signInHint')}</p>
      </TooltipContent>
    </Tooltip>
  );
}
