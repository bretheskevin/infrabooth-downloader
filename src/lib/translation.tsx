import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

type TFunction = (key: string) => string;

const TranslationContext = createContext<TFunction | null>(null);

interface TranslationProviderProps {
  t: TFunction;
  children: ReactNode;
}

export function TranslationProvider({ t, children }: TranslationProviderProps) {
  return <TranslationContext.Provider value={t}>{children}</TranslationContext.Provider>;
}

export function useT(): TFunction {
  const t = useContext(TranslationContext);
  if (t === null) {
    throw new Error('useT must be used within a TranslationProvider');
  }
  return t;
}
