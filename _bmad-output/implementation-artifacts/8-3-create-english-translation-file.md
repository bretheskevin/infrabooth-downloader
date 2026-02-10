# Story 8.3: Create English Translation File

Status: review

## Story

As a **developer**,
I want **a complete English translation file**,
so that **all UI strings are externalized and translatable**.

## Acceptance Criteria

1. **Given** the i18n framework from Epic 1
   **When** populating `/src/locales/en.json`
   **Then** all UI strings are included with semantic keys

2. **Given** the English translation file
   **When** examining its structure
   **Then** keys are organized by feature/section:
   ```json
   {
     "app": { "title": "InfraBooth Downloader" },
     "auth": { "signIn": "Sign in with SoundCloud", "signOut": "Sign out", ... },
     "download": { "button": "Download", "progress": "{{current}} of {{total}} tracks", ... },
     "errors": { "geoBlocked": "Unavailable in your region", ... },
     "settings": { "title": "Settings", "language": "Language", ... }
   }
   ```

3. **Given** dynamic values are needed
   **When** using interpolation
   **Then** placeholders use i18next syntax: `{{variable}}`
   **And** pluralization is handled where needed

4. **Given** all components use translations
   **When** no hardcoded strings exist
   **Then** every user-visible string comes from the translation file
   **And** developer-only strings (console logs) may remain in English

5. **Given** the translation file is complete
   **When** the app loads with English locale
   **Then** all UI elements display correctly in English
   **And** no missing key warnings appear in development mode

## Tasks / Subtasks

- [x] Task 1: Audit existing components for UI strings (AC: #1, #4)
  - [x] 1.1 Review all components in `src/components/features/` for hardcoded strings
  - [x] 1.2 Review all components in `src/components/layout/` for hardcoded strings
  - [x] 1.3 Document all strings that need translation keys
  - [x] 1.4 Identify strings requiring interpolation (dynamic values)
  - [x] 1.5 Identify strings requiring pluralization

- [x] Task 2: Create comprehensive en.json file structure (AC: #1, #2)
  - [x] 2.1 Create or update `/src/locales/en.json`
  - [x] 2.2 Organize keys into namespaces: `app`, `auth`, `download`, `errors`, `settings`, `quality`
  - [x] 2.3 Follow camelCase key naming convention
  - [x] 2.4 Add all app-level strings
  - [x] 2.5 Add all auth-related strings
  - [x] 2.6 Add all download-related strings
  - [x] 2.7 Add all error messages
  - [x] 2.8 Add all settings strings
  - [x] 2.9 Add all quality/subscription strings

- [x] Task 3: Implement interpolation patterns (AC: #3)
  - [x] 3.1 Use `{{variable}}` syntax for all dynamic values
  - [x] 3.2 Add progress interpolation: `{{current}} of {{total}} tracks`
  - [x] 3.3 Add username interpolation: `Signed in as {{username}}`
  - [x] 3.4 Add track count interpolation for completion messages
  - [x] 3.5 Add failed tracks count interpolation

- [x] Task 4: Implement pluralization rules (AC: #3)
  - [x] 4.1 Add singular form for track count: `{{count}} track`
  - [x] 4.2 Add plural form for track count: `{{count}} tracks`
  - [x] 4.3 Add singular/plural for failed tracks
  - [x] 4.4 Verify i18next pluralization configuration in `src/lib/i18n.ts`

- [x] Task 5: Add completion namespace strings (AC: #1, #2)
  - [x] 5.1 Add completion title variations (full success vs partial)
  - [x] 5.2 Add "Open Folder" button text
  - [x] 5.3 Add "Download Another" button text
  - [x] 5.4 Add failed tracks summary messages

- [x] Task 6: Add update notification strings (AC: #1, #2)
  - [x] 6.1 Add update available banner text
  - [x] 6.2 Add update action button text
  - [x] 6.3 Add dismiss/later option text

- [x] Task 7: Verify complete coverage (AC: #4, #5)
  - [x] 7.1 Run app in development mode with English locale
  - [x] 7.2 Navigate through all UI states and screens
  - [x] 7.3 Check console for missing key warnings
  - [x] 7.4 Verify all visible text comes from translation file
  - [x] 7.5 Fix any discovered missing keys

- [x] Task 8: Add TypeScript type safety (AC: #5)
  - [x] 8.1 Update `src/types/i18n.d.ts` to reflect complete key structure
  - [x] 8.2 Ensure TypeScript autocomplete works for translation keys
  - [x] 8.3 Verify no TypeScript errors in components using translations

## Dev Notes

### Complete en.json Structure

The following is the complete structure for `/src/locales/en.json` covering all UI strings from all stories:

```json
{
  "app": {
    "title": "InfraBooth Downloader"
  },

  "auth": {
    "signIn": "Sign in with SoundCloud",
    "signOut": "Sign out",
    "signedInAs": "Signed in as {{username}}",
    "openingBrowser": "Opening browser...",
    "signInToDownload": "Sign in with SoundCloud Go+ to download at full quality"
  },

  "download": {
    "button": "Download",
    "pasteUrl": "Paste a SoundCloud playlist or track URL",
    "signInRequired": "Sign in to download",
    "progress": "{{current}} of {{total}} tracks",
    "pending": "Pending",
    "downloading": "Downloading...",
    "converting": "Converting...",
    "complete": "Complete",
    "failed": "Failed",
    "trackCount": "{{count}} track",
    "trackCount_plural": "{{count}} tracks",
    "fetchingPlaylist": "Loading playlist...",
    "rateLimitMessage": "Brief pause - SoundCloud rate limit (this is normal)",
    "rateLimitStatus": "Waiting...",
    "resumingSoon": "Resuming soon...",
    "qualityBadge": "256kbps AAC - MP3"
  },

  "completion": {
    "title": "Download complete!",
    "titlePartial": "Download finished",
    "tracksDownloaded": "{{completed}} of {{total}} tracks downloaded",
    "allTracksDownloaded": "All {{total}} tracks downloaded",
    "openFolder": "Open Folder",
    "downloadAnother": "Download Another",
    "failedTracks": "{{count}} tracks couldn't be downloaded",
    "failedTracks_one": "1 track couldn't be downloaded",
    "viewFailed": "View details"
  },

  "errors": {
    "invalidUrl": "Not a SoundCloud URL",
    "invalidUrlHint": "Paste a link from soundcloud.com",
    "notTrackOrPlaylist": "This is a profile, not a playlist or track",
    "notTrackOrPlaylistHint": "Try pasting a playlist or track link",
    "invalidUrlFormat": "Invalid URL format",
    "geoBlocked": "Unavailable in your region",
    "geoBlockedDetail": "Geographic restriction by rights holder",
    "geoBlockedNoRetry": "This track will not retry automatically",
    "trackUnavailable": "Track unavailable",
    "trackUnavailableDetail": "This track may have been removed or made private",
    "rateLimited": "Brief pause - SoundCloud rate limit (this is normal)",
    "networkError": "No internet connection",
    "downloadFailed": "Download failed",
    "conversionFailed": "Conversion failed",
    "showDetails": "Show details",
    "folderNotFound": "Download folder not found",
    "folderNotWritable": "Cannot write to selected folder"
  },

  "settings": {
    "title": "Settings",
    "language": "Language",
    "languageEnglish": "English",
    "languageFrench": "Francais",
    "downloadLocation": "Download location",
    "selectFolder": "Select folder",
    "currentFolder": "Current: {{path}}"
  },

  "quality": {
    "badge": "Go+ 256kbps",
    "description": "Downloading at Go+ quality (256kbps AAC)"
  },

  "update": {
    "available": "Update available: v{{version}}",
    "download": "Download",
    "learnMore": "Learn more",
    "later": "Later",
    "whatsNew": "What's new"
  },

  "accessibility": {
    "signInButton": "Sign in with SoundCloud to enable downloads",
    "urlInput": "Enter SoundCloud playlist or track URL",
    "downloadButton": "Start download",
    "trackStatus": "Track status: {{status}}",
    "progressAnnouncement": "Downloaded {{current}} of {{total}} tracks",
    "completionAnnouncement": "Download complete, {{completed}} of {{total}} tracks",
    "rateLimitAnnouncement": "Download paused due to rate limit, will resume shortly",
    "errorAnnouncement": "Error: {{message}}"
  }
}
```

### i18n Key Naming Conventions

**From Architecture/Project Context:**

| Convention | Example | Description |
|------------|---------|-------------|
| Namespace | `auth`, `download`, `errors` | Top-level grouping by feature |
| Section | `auth.signIn`, `errors.geoBlocked` | Second level groups related strings |
| Element | `completion.openFolder` | Specific UI element |
| Case | camelCase | All keys use camelCase |

**Key Naming Rules:**
- Use descriptive, semantic names: `signInRequired` not `msg1`
- Group by feature/screen, not by component
- Keep hierarchy flat when possible (max 2 levels preferred)
- Use consistent action verbs: `sign`, `download`, `open`, `select`

[Source: project-context.md#react-i18next]

### Interpolation Patterns

**From react-i18next documentation:**

```typescript
// Simple interpolation
t('auth.signedInAs', { username: 'Marcus' })
// Result: "Signed in as Marcus"

// Multiple interpolations
t('download.progress', { current: 12, total: 47 })
// Result: "12 of 47 tracks"

// Conditional interpolation (in component)
t(completed === total ? 'completion.allTracksDownloaded' : 'completion.tracksDownloaded', { completed, total })
```

**Interpolation Syntax:**
- Use double braces: `{{variable}}`
- Variable names should be camelCase
- Keep variables minimal and descriptive

[Source: architecture/implementation-patterns-consistency-rules.md#Localization Patterns]

### Pluralization Patterns

**i18next pluralization for English:**

```json
{
  "trackCount": "{{count}} track",
  "trackCount_plural": "{{count}} tracks"
}
```

**Usage in components:**
```typescript
// Automatically selects correct form based on count
t('download.trackCount', { count: 1 })  // "1 track"
t('download.trackCount', { count: 47 }) // "47 tracks"
```

**Key suffixes for English:**
- `_zero` - for zero items (optional)
- `_one` - for exactly 1 (can use base key)
- `_plural` - for 2+ items

**Note:** French uses different pluralization rules and will need different suffixes in fr.json.

### UI Strings by Feature (Source Mapping)

**App Shell (Story 1.3, 1.5):**
- `app.title`: "InfraBooth Downloader"

**Authentication (Stories 2.3, 2.4, 2.6):**
- `auth.signIn`: "Sign in with SoundCloud"
- `auth.signOut`: "Sign out"
- `auth.signedInAs`: "Signed in as {{username}}"
- `auth.openingBrowser`: "Opening browser..."
- `auth.signInToDownload`: Pre-login value proposition

**URL Input & Validation (Stories 3.1, 3.2, 3.3):**
- `download.pasteUrl`: Input placeholder
- `download.signInRequired`: Auth prompt overlay
- `errors.invalidUrl`: Non-SoundCloud URL
- `errors.notTrackOrPlaylist`: Profile URL error
- `errors.invalidUrlFormat`: Malformed URL

**Playlist Preview (Stories 3.4, 3.5):**
- `download.trackCount`: Track count with pluralization
- `download.fetchingPlaylist`: Loading state
- `download.button`: Download action
- `download.qualityBadge`: Quality indicator

**Progress & Status (Stories 5.1, 5.2, 5.3, 5.4):**
- `download.progress`: Overall progress counter
- `download.pending`: Pending track status
- `download.downloading`: Active download status
- `download.converting`: Conversion status
- `download.complete`: Completed status
- `download.failed`: Failed status
- `download.rateLimitMessage`: Rate limit banner
- `download.rateLimitStatus`: Track waiting status

**Completion (Story 6.4):**
- `completion.title`: Full success title
- `completion.titlePartial`: Partial success title
- `completion.tracksDownloaded`: Partial count
- `completion.allTracksDownloaded`: Full count
- `completion.openFolder`: Open folder action
- `completion.downloadAnother`: Reset action
- `completion.failedTracks`: Failed count with pluralization

**Error Handling (Stories 7.1, 7.2, 7.3):**
- `errors.geoBlocked`: Geo-restriction status
- `errors.geoBlockedDetail`: Geo-restriction explanation
- `errors.geoBlockedNoRetry`: No retry message
- `errors.trackUnavailable`: Unavailable track status
- `errors.trackUnavailableDetail`: Unavailable explanation
- `errors.showDetails`: Expand details action

**Settings (Stories 8.1, 8.2):**
- `settings.title`: Settings panel title
- `settings.language`: Language selector label
- `settings.languageEnglish`: English option
- `settings.languageFrench`: French option
- `settings.downloadLocation`: Folder selector label
- `settings.selectFolder`: Folder action
- `settings.currentFolder`: Current path display

**Quality Badge (Story 2.4):**
- `quality.badge`: "Go+ 256kbps"
- `quality.description`: Quality explanation

**Update Notifications (Stories 9.4, 9.5):**
- `update.available`: Update banner message
- `update.download`: Download action
- `update.later`: Dismiss action

### File Location

```
src/
└── locales/
    ├── en.json    # This file - Complete English translations
    └── fr.json    # French translations (Story 8.4)
```

[Source: architecture/project-structure-boundaries.md#Localization]

### Usage Pattern in Components

```typescript
import { useTranslation } from 'react-i18next';

export function SignInButton() {
  const { t } = useTranslation();

  return (
    <Button onClick={handleSignIn}>
      {isLoading ? t('auth.openingBrowser') : t('auth.signIn')}
    </Button>
  );
}

// With interpolation
export function ProgressCounter({ current, total }: Props) {
  const { t } = useTranslation();

  return (
    <span>{t('download.progress', { current, total })}</span>
  );
}

// With pluralization
export function TrackCount({ count }: Props) {
  const { t } = useTranslation();

  return (
    <span>{t('download.trackCount', { count })}</span>
  );
}
```

[Source: project-context.md#react-i18next]

### TypeScript Type Safety

Create or update type definitions for autocomplete support:

```typescript
// src/types/i18n.d.ts
import 'i18next';
import en from '../locales/en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
  }
}
```

This enables:
- TypeScript autocomplete for translation keys
- Compile-time errors for invalid keys
- IDE support for refactoring

### Accessibility Strings

The `accessibility` namespace contains strings specifically for screen readers and ARIA labels that may not be visible in the UI but are essential for accessibility compliance:

```json
{
  "accessibility": {
    "signInButton": "Sign in with SoundCloud to enable downloads",
    "urlInput": "Enter SoundCloud playlist or track URL",
    "downloadButton": "Start download",
    "trackStatus": "Track status: {{status}}",
    "progressAnnouncement": "Downloaded {{current}} of {{total}} tracks",
    "completionAnnouncement": "Download complete, {{completed}} of {{total}} tracks",
    "rateLimitAnnouncement": "Download paused due to rate limit, will resume shortly",
    "errorAnnouncement": "Error: {{message}}"
  }
}
```

**Usage with aria-label:**
```typescript
<Button aria-label={t('accessibility.downloadButton')}>
  {t('download.button')}
</Button>
```

**Usage with aria-live regions:**
```typescript
<div role="status" aria-live="polite">
  {t('accessibility.progressAnnouncement', { current, total })}
</div>
```

[Source: ux-design-specification.md#Screen Reader Support]

### Anti-Patterns to Avoid

1. **Do NOT hardcode any user-visible strings** - All strings must go through i18n
2. **Do NOT use complex nesting** - Keep structure flat (max 2 levels)
3. **Do NOT use abbreviations in keys** - Use full words: `downloadLocation` not `dlLoc`
4. **Do NOT duplicate strings** - Reuse existing keys where meaning is identical
5. **Do NOT include HTML in translations** - Handle formatting in components
6. **Do NOT translate console.log messages** - Developer logs stay in English
7. **Do NOT use template literals for keys** - Use static strings for type safety
8. **Do NOT skip pluralization** - Always provide plural forms for countable items
9. **Do NOT hardcode number/date formats** - Use i18next formatting or Intl API
10. **Do NOT create keys for single-use tooltip text** - Group with parent feature

[Source: project-context.md#Anti-Patterns to Avoid]

### Testing Checklist

**Structure Verification:**
- [ ] All namespaces present: `app`, `auth`, `download`, `completion`, `errors`, `settings`, `quality`, `update`, `accessibility`
- [ ] All keys use camelCase
- [ ] No duplicate keys within namespaces
- [ ] Valid JSON syntax (no trailing commas, proper escaping)

**Interpolation Testing:**
- [ ] `auth.signedInAs` displays correctly with username
- [ ] `download.progress` displays correctly with current/total
- [ ] `completion.tracksDownloaded` displays correctly with completed/total
- [ ] `completion.failedTracks` displays correctly with count
- [ ] `settings.currentFolder` displays correctly with path

**Pluralization Testing:**
- [ ] `download.trackCount` with count=1 shows "1 track"
- [ ] `download.trackCount` with count=47 shows "47 tracks"
- [ ] `completion.failedTracks` singular form works
- [ ] `completion.failedTracks` plural form works

**Coverage Verification:**
- [ ] Run app with `debug: true` in i18n config
- [ ] Navigate through all screens and states
- [ ] No missing key warnings in console
- [ ] All visible text comes from en.json

**TypeScript Verification:**
- [ ] No TypeScript errors in i18n.d.ts
- [ ] Autocomplete works in components using `t()`
- [ ] Invalid keys produce TypeScript errors

**Accessibility Verification:**
- [ ] Screen reader announcements use accessibility namespace
- [ ] ARIA labels translate correctly
- [ ] Status announcements include necessary context

### Dependencies

**This story depends on:**
- Story 1.5: Configure react-i18next Foundation (i18n setup exists)
- Story 8.1: Create Settings Panel UI (settings strings defined)
- Story 8.2: Implement Language Selector (language switching works)

**This story enables:**
- Story 8.4: Create French Translation File (uses en.json as template)
- Story 8.5: Persist Language Preference (uses complete translation files)

**Related stories providing UI strings:**
- Stories 2.3, 2.4, 2.6: Authentication UI
- Stories 3.1-3.5: URL Input and Validation
- Stories 5.1-5.4: Progress and Status Display
- Story 6.4: Completion Panel
- Stories 7.1-7.3: Error Handling
- Stories 9.4, 9.5: Update Notifications

### References

- [Source: epics.md#Story 8.3: Create English Translation File]
- [Source: project-context.md#react-i18next]
- [Source: architecture/implementation-patterns-consistency-rules.md#Localization Patterns]
- [Source: architecture/project-structure-boundaries.md#Localization (FR28-30)]
- [Source: ux-design-specification.md#Screen Reader Support]
- [Source: prd/functional-requirements.md#FR28 - User can view application interface in English]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- Audited all 67 components in `src/components/features/` and `src/components/layout/` for hardcoded strings
- Found existing en.json already had comprehensive coverage for most UI strings
- Added 3 missing namespaces: `quality`, `update`, `accessibility` per AC #2 structure
- Confirmed language labels (English/Français) intentionally shown in native language (UX standard)
- Confirmed technical specs (256kbps AAC → MP3) intentionally universal
- Created TypeScript type definitions (`src/types/i18n.d.ts`) with permissive typing to support dynamic key lookups
- All 700 tests pass
- Frontend build successful (426.24 kB bundle)
- TypeScript type check passes

### Change Log

- 2026-02-10: Added quality, update, and accessibility namespaces to en.json
- 2026-02-10: Created src/types/i18n.d.ts for TypeScript type definitions

### File List

- src/locales/en.json (modified - added quality, update, accessibility namespaces)
- src/types/i18n.d.ts (created - TypeScript type definitions for i18n)
