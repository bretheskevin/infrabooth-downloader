import { useState } from 'react';
import { checkAuth } from '@/features/auth/api';
import { useAuthStore } from '@/features/auth/store';
import { logger } from '@/lib/logger';
import { getErrorString } from '@/lib/utils';

export function useAuthCheck() {
  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      void logger.info('[useAuthCheck] starting auth check');
      const result = await checkAuth();
      void logger.info(`[useAuthCheck] auth check result: ${result}`);
      if (result) {
        useAuthStore.getState().closeConnectHelp();
      } else {
        void logger.info('[useAuthCheck] no session found, opening connect help dialog');
        useAuthStore.getState().openConnectHelp();
      }
      return result;
    } catch (e) {
      void logger.error(`[useAuthCheck] auth check error: ${getErrorString(e)}`);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  return { isChecking, handleCheck };
}
