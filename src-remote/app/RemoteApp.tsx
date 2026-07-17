import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useRemoteSocket } from '@remote/hooks/useRemoteSocket';
import { useRemoteTheme } from '@remote/hooks/useRemoteTheme';
import { t as dictT } from '@remote/lib/i18n';
import { TranslationProvider } from '@/lib/translation';
import MiniBar from '@remote/features/now-playing/components/MiniBar';
import NowPlayingPanel from '@remote/features/now-playing/components/NowPlayingPanel';
import SearchTab from '@remote/features/search/components/SearchTab';
import LibraryTab from '@remote/features/library/components/LibraryTab';

type Tab = 'search' | 'library';

interface Props {
  host: string;
  token: string;
}

export default function RemoteApp({ host, token }: Props) {
  const { state, connected, send } = useRemoteSocket(host, token);
  const [tab, setTab] = useState<Tab>('search');
  const effectiveTab: Tab = tab === 'library' && !state?.isSignedIn ? 'search' : tab;
  const visibleTabs: Tab[] = state?.isSignedIn ? ['search', 'library'] : ['search'];
  const [libraryOpened, setLibraryOpened] = useState(false);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const language = state?.language ?? 'en';
  const t = useCallback((k: string) => dictT(k, language), [language]);
  useRemoteTheme(state?.theme);

  if (!connected) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{dictT('reconnecting', language)}</p>
      </div>
    );
  }

  function selectTab(next: Tab) {
    setTab(next);
    if (next === 'library') setLibraryOpened(true);
  }

  return (
    <TranslationProvider t={t}>
      <div className="h-dvh flex flex-col relative">
        <div className="flex-1 overflow-y-auto relative">
          <div className={effectiveTab === 'search' ? '' : 'hidden'}>
            <SearchTab host={host} token={token} send={send} language={language} state={state} />
          </div>
          {libraryOpened && (
            <div className={effectiveTab === 'library' ? '' : 'hidden'}>
              <LibraryTab host={host} token={token} send={send} language={language} state={state} />
            </div>
          )}
        </div>
        {!nowPlayingOpen && <MiniBar state={state} send={send} onExpand={() => setNowPlayingOpen(true)} />}
        <nav className="flex border-t border-border bg-card">
          {visibleTabs.map((tabName) => (
            <button
              key={tabName}
              onClick={() => selectTab(tabName)}
              className={cn('flex-1 py-3 text-sm font-medium', effectiveTab === tabName ? 'text-primary' : 'text-muted-foreground')}
            >
              {dictT(tabName, language)}
            </button>
          ))}
        </nav>
        {nowPlayingOpen && <NowPlayingPanel state={state} send={send} language={language} onClose={() => setNowPlayingOpen(false)} />}
      </div>
    </TranslationProvider>
  );
}
