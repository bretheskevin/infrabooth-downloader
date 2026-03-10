import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { Header } from './Header';
import { UpdateBanner } from '@/features/update';

export type AppPage = 'download' | 'library';

interface AppLayoutProps {
  children: React.ReactNode;
  activePage: AppPage;
  onPageChange: (page: AppPage) => void;
  isLibraryLocked: boolean;
}

interface PageNavProps {
  activePage: AppPage;
  onPageChange: (page: AppPage) => void;
  isLibraryLocked: boolean;
}

function PageNav({ activePage, onPageChange, isLibraryLocked }: PageNavProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-1 rounded-lg bg-secondary/50 p-1 mb-4">
      <button
        type="button"
        className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          activePage === 'download'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => onPageChange('download')}
      >
        {t('library.pasteUrlTab')}
      </button>
      <button
        type="button"
        className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
          activePage === 'library'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        } ${isLibraryLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => onPageChange('library')}
        disabled={isLibraryLocked}
      >
        {isLibraryLocked && <Lock className="h-3 w-3" />}
        {t('library.tabLabel')}
      </button>
    </div>
  );
}

export function AppLayout({ children, activePage, onPageChange, isLibraryLocked }: AppLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen gradient-subtle">
      <UpdateBanner />
      <Header />
      <main className="flex-1 px-6 py-6 w-full max-w-3xl mx-auto">
        <PageNav activePage={activePage} onPageChange={onPageChange} isLibraryLocked={isLibraryLocked} />
        {children}
      </main>
    </div>
  );
}
