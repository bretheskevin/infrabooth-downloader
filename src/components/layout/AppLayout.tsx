import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "./Header";
import { UpdateBanner } from "@/features/update";
import { useIsExpandedBarVisible } from "@/features/player/hooks/useIsExpandedBarVisible";
import { EXPANDED_BAR_HEIGHT } from "@/features/player/components/ExpandedBar";
import { useIsDownloadEnabled } from "@/features/settings";
import { useIsWidescreen } from "@/hooks/useIsWidescreen";
import { Sidebar } from "./Sidebar";

export type AppPage = "download" | "library" | "search";

interface AppLayoutProps {
  children: React.ReactNode;
  activePage: AppPage;
  onPageChange: (page: AppPage) => void;
  isSignedIn: boolean;
  hideTabs?: boolean;
}

interface PageNavProps {
  activePage: AppPage;
  onPageChange: (page: AppPage) => void;
  isSignedIn: boolean;
}

function PageNav({ activePage, onPageChange, isSignedIn }: PageNavProps) {
  const { t } = useTranslation();
  const isDownloadEnabled = useIsDownloadEnabled();

  const tabs: { key: AppPage; label: string; locked: boolean }[] = [
    {
      key: "download",
      label: isDownloadEnabled
        ? t("library.pasteUrlTab")
        : t("library.discoverTab"),
      locked: false,
    },
    { key: "library", label: t("library.tabLabel"), locked: !isSignedIn },
    { key: "search", label: t("search.tabLabel"), locked: false },
  ];

  return (
    <Tabs value={activePage} onValueChange={(v) => onPageChange(v as AppPage)}>
      <TabsList className="w-full mb-4">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.key}
            value={tab.key}
            disabled={tab.locked}
            className="flex-1 gap-1.5"
          >
            {tab.locked && <Lock className="h-3 w-3" />}
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function AppLayout({
  children,
  activePage,
  onPageChange,
  isSignedIn,
  hideTabs,
}: AppLayoutProps) {
  const expandedBarVisible = useIsExpandedBarVisible();
  const isWidescreen = useIsWidescreen();

  if (isWidescreen) {
    return (
      <div className="flex flex-col h-screen overflow-hidden gradient-subtle">
        <UpdateBanner />
        <div className="flex flex-1 min-h-0">
          <Sidebar
            activePage={activePage}
            onPageChange={onPageChange}
            isSignedIn={isSignedIn}
          />
          <div className="flex flex-1 flex-col min-h-0">
            <main className="flex-1 flex flex-col min-h-0 overflow-y-auto px-6 py-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden gradient-subtle">
      <UpdateBanner />
      <Header />
      <main
        className="flex-1 flex flex-col min-h-0 overflow-y-auto px-6 py-6 w-full container mx-auto transition-[padding-bottom] duration-300 ease-in-out"
        style={{
          paddingBottom: expandedBarVisible
            ? EXPANDED_BAR_HEIGHT + 16
            : undefined,
        }}
      >
        {!hideTabs && (
          <PageNav
            activePage={activePage}
            onPageChange={onPageChange}
            isSignedIn={isSignedIn}
          />
        )}
        {children}
      </main>
    </div>
  );
}
