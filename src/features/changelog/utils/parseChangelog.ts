export interface ChangelogSection {
  category: 'added' | 'changed' | 'fixed' | 'removed';
  items: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string | null;
  sections: ChangelogSection[];
}

const VERSION_HEADING = /^## \[(\d+\.\d+\.\d+)\](?:\s*-\s*(.+))?$/m;
const SECTION_HEADING = /^### (Added|Changed|Fixed|Removed)$/im;
const LINK_REF = /^\[.*\]:\s*https?:\/\/.*$/gm;

export function parseChangelog(markdown: string): ChangelogEntry[] {
  // Strip link reference definitions
  const cleaned = markdown.replace(LINK_REF, '').trim();
  if (!cleaned) return [];

  const entries: ChangelogEntry[] = [];
  const lines = cleaned.split('\n');

  let currentEntry: ChangelogEntry | null = null;
  let currentBlock: string[] = [];

  for (const line of lines) {
    const versionMatch = line.match(VERSION_HEADING);
    if (versionMatch) {
      // Save previous entry
      if (currentEntry) {
        currentEntry.sections = parseVersionEntry(currentBlock.join('\n'));
        entries.push(currentEntry);
      }
      currentEntry = {
        version: versionMatch[1]!,
        date: versionMatch[2]?.trim() ?? null,
        sections: [],
      };
      currentBlock = [];
      continue;
    }

    // Skip Unreleased heading
    if (/^## \[Unreleased\]/i.test(line)) {
      if (currentEntry) {
        currentEntry.sections = parseVersionEntry(currentBlock.join('\n'));
        entries.push(currentEntry);
      }
      currentEntry = null;
      currentBlock = [];
      continue;
    }

    if (currentEntry) {
      currentBlock.push(line);
    }
  }

  // Save last entry
  if (currentEntry) {
    currentEntry.sections = parseVersionEntry(currentBlock.join('\n'));
    entries.push(currentEntry);
  }

  return entries;
}

export function parseVersionEntry(markdown: string): ChangelogSection[] {
  const sections: ChangelogSection[] = [];
  const lines = markdown.split('\n');

  let currentCategory: ChangelogSection['category'] | null = null;
  let currentItems: string[] = [];

  for (const line of lines) {
    const sectionMatch = line.match(SECTION_HEADING);
    if (sectionMatch) {
      if (currentCategory && currentItems.length > 0) {
        sections.push({ category: currentCategory, items: currentItems });
      }
      currentCategory = sectionMatch[1]!.toLowerCase() as ChangelogSection['category'];
      currentItems = [];
      continue;
    }

    if (!currentCategory) continue;

    // Bullet item
    const bulletMatch = line.match(/^- (.+)/);
    if (bulletMatch) {
      currentItems.push(bulletMatch[1]!.trim());
      continue;
    }

    // Continuation line (indented, belongs to previous item)
    const continuationMatch = line.match(/^\s{2,}(.+)/);
    if (continuationMatch && currentItems.length > 0) {
      currentItems[currentItems.length - 1] += ' ' + continuationMatch[1]!.trim();
    }
  }

  // Save last section
  if (currentCategory && currentItems.length > 0) {
    sections.push({ category: currentCategory, items: currentItems });
  }

  return sections;
}

/** Compare two semver strings numerically. Returns positive if a > b, negative if a < b, 0 if equal. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
