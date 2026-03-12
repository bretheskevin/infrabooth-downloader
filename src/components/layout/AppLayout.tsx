import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { Header } from './Header';
import { UpdateBanner } from '@/features/update';

export type AppPage = 'download' | 'library' | 'search';

interface AppLayoutProps {
  children: React.ReactNode;
  activePage: AppPage;
  onPageChange: (page: AppPage) => void;
  isSignedIn: boolean;
}

interface PageNavProps {
  activePage: AppPage;
  onPageChange: (page: AppPage) => void;
  isSignedIn: boolean;
}

function PageNav({ activePage, onPageChange, isSignedIn }: PageNavProps) {
  const { t } = useTranslation();

  const tabs: { key: AppPage; label: string; locked: boolean }[] = [
    { key: 'download', label: t('library.pasteUrlTab'), locked: false },
    { key: 'library', label: t('library.tabLabel'), locked: !isSignedIn },
    { key: 'search', label: t('search.tabLabel'), locked: !isSignedIn },
  ];

  return (
    <div className="flex gap-1 rounded-lg bg-secondary/50 p-1 mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            activePage === tab.key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          } ${tab.locked ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => onPageChange(tab.key)}
          disabled={tab.locked}
        >
          {tab.locked && <Lock className="h-3 w-3" />}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function AppLayout({ children, activePage, onPageChange, isSignedIn }: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden gradient-subtle">
      <UpdateBanner />
      <Header />
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto px-6 py-6 w-full max-w-3xl mx-auto">
        <PageNav activePage={activePage} onPageChange={onPageChange} isSignedIn={isSignedIn} />
        {children}
      </main>
    </div>
  );
}
