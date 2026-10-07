import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getVersion } from '@tauri-apps/api/app';
import { logger } from '@/lib/logger';
import { useChangelogStore } from '../store';
import { compareVersions, getMissedEntries, parseChangelog } from '../utils/parseChangelog';
import type { ChangelogEntry } from '../utils/parseChangelog';
import { CHANGELOGS, changelogEn } from '../utils/changelogs';

function resolveMissedEntries(currentVersion: string, lastSeenVersion: string | null, language: string): ChangelogEntry[] {
  void logger.info(`[Changelog] Version check: current=${currentVersion}, lastSeen=${lastSeenVersion ?? 'none'}, language=${language}`);
  const { setLastSeenVersion } = useChangelogStore.getState();

  if (lastSeenVersion === null) {
    void logger.info(`[Changelog] Fresh install, storing ${currentVersion} without showing What's New`);
    setLastSeenVersion(currentVersion);
    return [];
  }
  if (lastSeenVersion === currentVersion) {
    void logger.debug(`[Changelog] Version unchanged (${currentVersion}), nothing to show`);
    return [];
  }
  if (compareVersions(lastSeenVersion, currentVersion) > 0) {
    void logger.warn(`[Changelog] Downgrade detected (${lastSeenVersion} -> ${currentVersion}), skipping What's New and keeping lastSeen`);
    return [];
  }

  const missed = getMissedEntries(parseChangelog(CHANGELOGS[language] ?? changelogEn), lastSeenVersion, currentVersion);
  if (missed.length === 0) {
    void logger.info(`[Changelog] No release notes between ${lastSeenVersion} and ${currentVersion}, storing ${currentVersion} silently`);
    setLastSeenVersion(currentVersion);
    return [];
  }

  void logger.info(`[Changelog] Showing What's New for ${missed.length} version(s): ${missed.map((e) => e.version).join(', ')}`);
  return missed;
}

export function useChangelogCheck() {
  const { i18n } = useTranslation();
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [version, setVersion] = useState('');
  const [previousVersion, setPreviousVersion] = useState<string | null>(null);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);

  const hasHydrated = useChangelogStore((s) => s._hasHydrated);
  const lastSeenVersion = useChangelogStore((s) => s.lastSeenVersion);

  useEffect(() => {
    if (!hasHydrated) return;

    getVersion()
      .then((currentVersion) => {
        setVersion(currentVersion);
        const missed = resolveMissedEntries(currentVersion, lastSeenVersion, i18n.language);
        if (missed.length === 0) return;

        setEntries(missed);
        setPreviousVersion(lastSeenVersion);
        setShowWhatsNew(true);
      })
      .catch((err) => {
        void logger.warn(`[Changelog] Failed to get app version: ${err instanceof Error ? err.message : String(err)}`);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- i18n.language is read lazily inside async callback
  }, [hasHydrated, lastSeenVersion]);

  const dismiss = useCallback(() => {
    void logger.info(`[Changelog] What's New dismissed, storing lastSeen=${version || 'unknown'}`);
    setShowWhatsNew(false);
    if (version) {
      useChangelogStore.getState().setLastSeenVersion(version);
    }
  }, [version]);

  return { showWhatsNew, previousVersion, entries, dismiss };
}
