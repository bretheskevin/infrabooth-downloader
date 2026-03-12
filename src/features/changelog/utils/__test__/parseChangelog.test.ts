import { describe, it, expect } from 'vitest';
import { parseChangelog, parseVersionEntry, compareVersions } from '../parseChangelog';

const SAMPLE_CHANGELOG = `# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.6.0] - 2026-03-11

### Added

- Browse tracks inside any library playlist
- Select individual tracks from a playlist

### Changed

- Playlist detail header is now more compact

## [1.5.0] - 2026-03-11

### Added

- Already-downloaded tracks are now automatically skipped

### Fixed

- Library playlist selection now properly resets the download state
- Fixed downloads failing on tracks that only offer HLS Opus streams
`;

describe('parseChangelog', () => {
  it('should parse multiple version entries', () => {
    const entries = parseChangelog(SAMPLE_CHANGELOG);
    expect(entries).toHaveLength(2);
    expect(entries[0]!.version).toBe('1.6.0');
    expect(entries[1]!.version).toBe('1.5.0');
  });

  it('should parse version dates', () => {
    const entries = parseChangelog(SAMPLE_CHANGELOG);
    expect(entries[0]!.date).toBe('2026-03-11');
    expect(entries[1]!.date).toBe('2026-03-11');
  });

  it('should skip Unreleased section', () => {
    const entries = parseChangelog(SAMPLE_CHANGELOG);
    const versions = entries.map((e) => e.version);
    expect(versions).not.toContain('Unreleased');
  });

  it('should parse sections within a version', () => {
    const entries = parseChangelog(SAMPLE_CHANGELOG);
    const v160 = entries[0]!;
    expect(v160.sections).toHaveLength(2);
    expect(v160.sections[0]!.category).toBe('added');
    expect(v160.sections[1]!.category).toBe('changed');
  });

  it('should parse items within sections', () => {
    const entries = parseChangelog(SAMPLE_CHANGELOG);
    const v160 = entries[0]!;
    expect(v160.sections[0]!.items).toHaveLength(2);
    expect(v160.sections[0]!.items[0]).toBe('Browse tracks inside any library playlist');
  });

  it('should handle empty input', () => {
    const entries = parseChangelog('');
    expect(entries).toEqual([]);
  });

  it('should handle input with no version entries', () => {
    const entries = parseChangelog('# Changelog\n\nSome text without versions.');
    expect(entries).toEqual([]);
  });

  it('should strip link reference definitions', () => {
    const withLinks = SAMPLE_CHANGELOG + '\n[1.6.0]: https://github.com/example/compare/v1.5.0...v1.6.0\n[1.5.0]: https://github.com/example/compare/v1.4.0...v1.5.0';
    const entries = parseChangelog(withLinks);
    expect(entries).toHaveLength(2);
    // Items should not contain link references
    for (const entry of entries) {
      for (const section of entry.sections) {
        for (const item of section.items) {
          expect(item).not.toMatch(/^\[.*\]:/);
        }
      }
    }
  });
});

describe('parseVersionEntry', () => {
  it('should parse a single version block into sections', () => {
    const block = `### Added

- Feature one
- Feature two

### Fixed

- Bug fix one
`;
    const sections = parseVersionEntry(block);
    expect(sections).toHaveLength(2);
    expect(sections[0]).toEqual({ category: 'added', items: ['Feature one', 'Feature two'] });
    expect(sections[1]).toEqual({ category: 'fixed', items: ['Bug fix one'] });
  });

  it('should handle all four categories', () => {
    const block = `### Added

- New thing

### Changed

- Updated thing

### Fixed

- Fixed thing

### Removed

- Old thing
`;
    const sections = parseVersionEntry(block);
    expect(sections).toHaveLength(4);
    expect(sections.map((s) => s.category)).toEqual(['added', 'changed', 'fixed', 'removed']);
  });

  it('should return empty array for unparseable content', () => {
    const sections = parseVersionEntry('Just some random text without headings');
    expect(sections).toEqual([]);
  });

  it('should handle multiline items (continuation lines)', () => {
    const block = `### Added

- Feature one with a very long description
  that continues on the next line
- Feature two
`;
    const sections = parseVersionEntry(block);
    expect(sections[0]!.items).toHaveLength(2);
    expect(sections[0]!.items[0]).toBe('Feature one with a very long description that continues on the next line');
  });
});

describe('compareVersions', () => {
  it('should return 0 for equal versions', () => {
    expect(compareVersions('1.6.0', '1.6.0')).toBe(0);
  });

  it('should return positive when first version is greater', () => {
    expect(compareVersions('1.6.0', '1.5.0')).toBeGreaterThan(0);
  });

  it('should return negative when first version is smaller', () => {
    expect(compareVersions('1.5.0', '1.6.0')).toBeLessThan(0);
  });

  it('should compare numerically, not lexicographically', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
  });

  it('should compare major versions', () => {
    expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0);
  });

  it('should compare patch versions', () => {
    expect(compareVersions('1.0.2', '1.0.1')).toBeGreaterThan(0);
  });
});
