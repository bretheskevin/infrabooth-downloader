import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getVersion } from '@tauri-apps/api/app';
import { logger } from '@/lib/logger';
import { useChangelogStore } from '../store';
import { parseChangelog } from '../utils/parseChangelog';
import type { ChangelogSection } from '../utils/parseChangelog';
import { CHANGELOGS, changelogEn } from '../utils/changelogs';

export function useChangelogCheck() {
  const { i18n } = useTranslation();
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [version, setVersion] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [sections, setSections] = useState<ChangelogSection[]>([]);

  const hasHydrated = useChangelogStore((s) => s._hasHydrated);
  const lastSeenVersion = useChangelogStore((s) => s.lastSeenVersion);

  useEffect(() => {
    if (!hasHydrated) return;

    getVersion().then((currentVersion) => {
      setVersion(currentVersion);

      // First install — silently set version, no dialog
      if (lastSeenVersion === null) {
        useChangelogStore.getState().setLastSeenVersion(currentVersion);
        return;
      }

      // Same version — nothing to show
      if (lastSeenVersion === currentVersion) return;

      // Version changed — resolve changelog from bundled files (locale-aware)
      const entries = parseChangelog(CHANGELOGS[i18n.language] ?? changelogEn);
      const entry = entries.find((e) => e.version === currentVersion);

      setSections(entry?.sections ?? []);
      setDate(entry?.date ?? null);
      setShowWhatsNew(true);
    }).catch((err) => {
      void logger.warn(`[Changelog] Failed to get app version: ${err instanceof Error ? err.message : String(err)}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- i18n.language is read lazily inside async callback
  }, [hasHydrated, lastSeenVersion]);

  const dismiss = useCallback(() => {
    setShowWhatsNew(false);
    if (version) {
      useChangelogStore.getState().setLastSeenVersion(version);
    }
  }, [version]);

  return { showWhatsNew, version, date, sections, dismiss };
}
