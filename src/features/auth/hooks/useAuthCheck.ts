import { useState } from 'react';
import { checkAuth } from '@/features/auth/api';

export function useAuthCheck() {
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
  return { isChecking, handleCheck };
}
