import { Header } from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen gradient-subtle">
      <Header />
      <main className="flex-1 px-6 py-6 w-full max-w-3xl mx-auto">
        {children}
      </main>
    </div>
  );
}
