import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';

function useTlsWarning() {
  const queryClient = useQueryClient();
  const { data: isDisabled } = useQuery({
    queryKey: ['tls-verify-disabled'],
    queryFn: api.isTlsVerifyDisabled,
    staleTime: Infinity,
  });

  const { mutate: enableTls } = useMutation({
    mutationFn: api.enableTlsVerify,
    onSuccess: () => queryClient.setQueryData(['tls-verify-disabled'], false),
    onError: (err) => void logger.error(`Failed to enable TLS verify: ${err}`),
  });

  return { isDisabled: !!isDisabled, enableTls };
}

export function TlsWarningBadge() {
  const { t } = useTranslation();
  const { isDisabled, enableTls } = useTlsWarning();

  if (!isDisabled) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => enableTls()}
          aria-label={t('security.tlsDisabled')}
          className="text-destructive hover:bg-destructive/10"
        >
          <ShieldOff className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="font-medium">{t('security.tlsDisabled')}</p>
        <p className="text-xs opacity-80">{t('security.tlsDisabledTooltip')}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function TlsWarningSidebarItem({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { isDisabled, enableTls } = useTlsWarning();

  if (!isDisabled) return null;

  return (
    <Button variant="ghost" onClick={() => enableTls()} className={className}>
      <ShieldOff className="size-4 text-destructive" />
      <span className="text-destructive">{t('security.tlsDisabled')}</span>
    </Button>
  );
}
