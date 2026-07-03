import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useRemoteSocket } from '@remote/hooks/useRemoteSocket';
import { useRemoteTheme } from '@remote/hooks/useRemoteTheme';
import { t } from '@remote/lib/i18n';
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
  const [libraryOpened, setLibraryOpened] = useState(false);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const language = state?.language ?? 'en';
  useRemoteTheme(state?.theme);

  if (!connected) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{t('reconnecting', language)}</p>
      </div>
    );
  }

  function selectTab(next: Tab) {
    setTab(next);
    if (next === 'library') setLibraryOpened(true);
  }

  return (
    <div className="h-dvh flex flex-col relative">
      <div className="flex-1 overflow-y-auto relative">
        <div className={tab === 'search' ? '' : 'hidden'}>
          <SearchTab host={host} token={token} send={send} language={language} state={state} />
        </div>
        {libraryOpened && (
          <div className={tab === 'library' ? '' : 'hidden'}>
            <LibraryTab host={host} token={token} send={send} language={language} state={state} />
          </div>
        )}
      </div>
      {!nowPlayingOpen && <MiniBar state={state} send={send} onExpand={() => setNowPlayingOpen(true)} />}
      <nav className="flex border-t border-border bg-card">
        {(['search', 'library'] as Tab[]).map((tabName) => (
          <button
            key={tabName}
            onClick={() => selectTab(tabName)}
            className={cn('flex-1 py-3 text-sm font-medium', tab === tabName ? 'text-primary' : 'text-muted-foreground')}
          >
            {t(tabName, language)}
          </button>
        ))}
      </nav>
      {nowPlayingOpen && <NowPlayingPanel state={state} send={send} language={language} onClose={() => setNowPlayingOpen(false)} />}
    </div>
  );
}
