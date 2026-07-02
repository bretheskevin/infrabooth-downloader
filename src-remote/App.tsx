import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRemoteSocket } from './useRemoteSocket';
import { t } from './dict';
import NowPlaying from './components/NowPlaying';
import Transport from './components/Transport';
import QueuePanel from './components/QueuePanel';
import MiniBar from './components/MiniBar';
import SearchTab from './components/SearchTab';

type Tab = 'now-playing' | 'search';

interface RemoteAppProps {
  host: string;
  token: string;
}

function RemoteApp({ host, token }: RemoteAppProps) {
  const { state, connected, send } = useRemoteSocket(host, token);
  const [tab, setTab] = useState<Tab>('now-playing');
  const [queueOpen, setQueueOpen] = useState(false);
  const language = state?.language ?? 'en';

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
    if (next !== 'now-playing') setQueueOpen(false);
  }

  return (
    <div className="h-dvh flex flex-col">
      <div className="flex-1 overflow-y-auto relative">
        {tab === 'now-playing' && (
          <div className="flex flex-col h-full">
            <NowPlaying state={state} language={language} onCommand={send} />
            {state?.currentTrack && (
              <Transport
                state={state}
                send={send}
                language={language}
                queueOpen={queueOpen}
                onToggleQueue={() => setQueueOpen((open) => !open)}
              />
            )}
            {queueOpen && <QueuePanel state={state} send={send} language={language} onClose={() => setQueueOpen(false)} />}
          </div>
        )}
        <div className={tab === 'search' ? '' : 'hidden'}>
          <SearchTab host={host} token={token} send={send} language={language} state={state} />
        </div>
      </div>
      {tab !== 'now-playing' && <MiniBar state={state} send={send} />}
      <nav className="flex border-t border-border bg-card">
        {(['now-playing', 'search'] as Tab[]).map((tabName) => (
          <button
            key={tabName}
            onClick={() => selectTab(tabName)}
            className={`flex-1 py-3 text-sm font-medium ${tab === tabName ? 'text-primary' : 'text-muted-foreground'}`}
          >
            {t(tabName === 'now-playing' ? 'nowPlaying' : tabName, language)}
          </button>
        ))}
      </nav>
    </div>
  );
}

function InvalidLink() {
  return (
    <div className="h-dvh flex items-center justify-center">
      <p className="text-muted-foreground">{t('invalidLink', 'en')}</p>
    </div>
  );
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('t');
  const host = window.location.host;

  if (!token) return <InvalidLink />;

  return <RemoteApp host={host} token={token} />;
}
