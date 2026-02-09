# Story 0.1: Refactor Download Section with Custom Hooks

Status: review

## Story

As a **developer**,
I want **the download flow logic extracted into custom hooks**,
so that **components are thin, logic is reusable, and the codebase is easier to maintain**.

## Acceptance Criteria

1. **Given** the current `DownloadSection` component
   **When** refactored
   **Then** all data fetching logic moves to `useMediaFetch` hook

2. **Given** URL validation logic
   **When** refactored
   **Then** debouncing and validation moves to `useUrlValidation` hook

3. **Given** queue synchronization logic
   **When** refactored
   **Then** transform + push logic moves to `useSyncToQueue` hook

4. **Given** the new hooks
   **When** composed together
   **Then** `useDownloadFlow` orchestrator provides a clean API

5. **Given** the refactored `DownloadSection`
   **When** reviewing the component
   **Then** it contains only UI rendering and hook calls (< 30 lines of logic)

6. **Given** all existing tests
   **When** running the test suite
   **Then** all tests pass without modification to assertions

## Tasks / Subtasks

- [x] Task 1: Create transform utilities (AC: #3)
  - [x] 1.1 Create `src/lib/transforms.ts`:
    ```typescript
    import type { TrackInfo, PlaylistInfo } from '@/types/playlist';
    import type { Track } from '@/types/track';

    /**
     * Convert a single TrackInfo to a queue Track
     */
    export function trackInfoToQueueTrack(track: TrackInfo): Track {
      return {
        id: String(track.id),
        title: track.title,
        artist: track.user.username,
        artworkUrl: track.artwork_url,
        status: 'pending',
      };
    }

    /**
     * Convert playlist tracks to queue tracks
     */
    export function playlistTracksToQueueTracks(tracks: TrackInfo[]): Track[] {
      return tracks.map(trackInfoToQueueTrack);
    }
    ```
  - [x] 1.2 Create `src/lib/transforms.test.ts` with unit tests

- [x] Task 2: Create useUrlValidation hook (AC: #2)
  - [x] 2.1 Create `src/hooks/download/useUrlValidation.ts`:
    ```typescript
    import { useState, useEffect } from 'react';
    import { useDebounce } from '@/hooks';
    import { validateUrl } from '@/lib/validation';
    import type { ValidationResult } from '@/types/url';

    interface UseUrlValidationReturn {
      result: ValidationResult | null;
      isValidating: boolean;
    }

    export function useUrlValidation(url: string): UseUrlValidationReturn {
      const [result, setResult] = useState<ValidationResult | null>(null);
      const [isValidating, setIsValidating] = useState(false);
      const debouncedUrl = useDebounce(url, 300);

      useEffect(() => {
        if (!debouncedUrl) {
          setResult(null);
          return;
        }

        setIsValidating(true);
        validateUrl(debouncedUrl)
          .then(setResult)
          .finally(() => setIsValidating(false));
      }, [debouncedUrl]);

      return { result, isValidating };
    }
    ```
  - [x] 2.2 Create `src/hooks/download/useUrlValidation.test.ts`

- [x] Task 3: Create useMediaFetch hook (AC: #1)
  - [x] 3.1 Create `src/hooks/download/useMediaFetch.ts`:
    ```typescript
    import { useState, useEffect, useCallback } from 'react';
    import { useTranslation } from 'react-i18next';
    import { fetchPlaylistInfo, fetchTrackInfo } from '@/lib/playlist';
    import type { PlaylistInfo, TrackInfo } from '@/types/playlist';
    import type { UrlType, ValidationResult } from '@/types/url';

    export interface FetchError {
      code: string;
      message: string;
      hint?: string;
    }

    interface UseMediaFetchReturn {
      data: PlaylistInfo | TrackInfo | null;
      isLoading: boolean;
      error: FetchError | null;
    }

    export function useMediaFetch(
      url: string,
      validation: ValidationResult | null
    ): UseMediaFetchReturn {
      const { t } = useTranslation();
      const [data, setData] = useState<PlaylistInfo | TrackInfo | null>(null);
      const [isLoading, setIsLoading] = useState(false);
      const [error, setError] = useState<FetchError | null>(null);

      useEffect(() => {
        if (!validation?.valid) {
          setData(null);
          setError(null);
          return;
        }

        setIsLoading(true);
        setError(null);

        const fetchFn = validation.urlType === 'playlist'
          ? fetchPlaylistInfo
          : fetchTrackInfo;

        fetchFn(url)
          .then((result) => {
            setData(result);
          })
          .catch((err: Error) => {
            const message = err.message;
            if (message.includes('not found') || message.includes('Track not found')) {
              setError({
                code: 'INVALID_URL',
                message: t('errors.trackNotFound'),
                hint: t('errors.trackNotFoundHint'),
              });
            } else if (message.includes('region') || message.includes('GeoBlocked')) {
              setError({
                code: 'GEO_BLOCKED',
                message: t('errors.geoBlocked'),
              });
            } else {
              setError({
                code: 'FETCH_FAILED',
                message: t('errors.fetchFailed'),
              });
            }
            setData(null);
          })
          .finally(() => setIsLoading(false));
      }, [url, validation, t]);

      return { data, isLoading, error };
    }
    ```
  - [x] 3.2 Create `src/hooks/download/useMediaFetch.test.ts`

- [x] Task 4: Create useSyncToQueue hook (AC: #3)
  - [x] 4.1 Create `src/hooks/download/useSyncToQueue.ts`:
    ```typescript
    import { useEffect } from 'react';
    import { useQueueStore } from '@/stores/queueStore';
    import { trackInfoToQueueTrack, playlistTracksToQueueTracks } from '@/lib/transforms';
    import type { PlaylistInfo, TrackInfo } from '@/types/playlist';

    function isPlaylist(media: PlaylistInfo | TrackInfo): media is PlaylistInfo {
      return 'tracks' in media;
    }

    /**
     * Domain reaction: "media loaded → feed queue"
     * This is NOT fetch logic — it's a domain event handler.
     */
    export function useSyncToQueue(media: PlaylistInfo | TrackInfo | null): void {
      const enqueueTracks = useQueueStore((state) => state.enqueueTracks);

      useEffect(() => {
        if (!media) return;

        // Domain reaction: playlist/track loaded → enqueue for download
        if (isPlaylist(media)) {
          enqueueTracks(playlistTracksToQueueTracks(media.tracks));
        } else {
          enqueueTracks([trackInfoToQueueTrack(media)]);
        }
      }, [media, enqueueTracks]);
    }
    ```
  - [x] 4.2 Create `src/hooks/download/useSyncToQueue.test.ts`
  - [x] 4.3 Update `queueStore.ts` to rename `setTracks` → `enqueueTracks` (domain action naming)

- [x] Task 5: Create useDownloadFlow orchestrator (AC: #4)
  - [x] 5.1 Create `src/hooks/download/useDownloadFlow.ts`:
    ```typescript
    import { useState, useCallback, useMemo } from 'react';
    import { useUrlValidation } from './useUrlValidation';
    import { useMediaFetch, type FetchError } from './useMediaFetch';
    import { useSyncToQueue } from './useSyncToQueue';
    import type { ValidationResult } from '@/types/url';
    import type { PlaylistInfo, TrackInfo } from '@/types/playlist';

    interface UseDownloadFlowReturn {
      url: string;
      setUrl: (url: string) => void;
      validation: ValidationResult | null;
      isValidating: boolean;
      media: PlaylistInfo | TrackInfo | null;
      isLoading: boolean;
      error: FetchError | null;
      handleDownload: () => void;
    }

    export function useDownloadFlow(): UseDownloadFlowReturn {
      const [url, setUrl] = useState('');

      const { result: validation, isValidating } = useUrlValidation(url);
      const { data: media, isLoading, error } = useMediaFetch(url, validation);

      // Sync to queue whenever media changes
      useSyncToQueue(media);

      const handleDownload = useCallback(() => {
        // Will be implemented in Epic 4
        console.log('Starting download...');
      }, []);

      return {
        url,
        setUrl,
        validation,
        isValidating,
        media,
        isLoading,
        error,
        handleDownload,
      };
    }
    ```
  - [x] 5.2 Create `src/hooks/download/useDownloadFlow.test.ts`
  - [x] 5.3 Create `src/hooks/download/index.ts` barrel export:
    ```typescript
    export { useUrlValidation } from './useUrlValidation';
    export { useMediaFetch, type FetchError } from './useMediaFetch';
    export { useSyncToQueue } from './useSyncToQueue';
    export { useDownloadFlow } from './useDownloadFlow';
    ```
  - [x] 5.4 Update `src/hooks/index.ts` to re-export download hooks

- [x] Task 6: Refactor DownloadSection component (AC: #5)
  - [x] 6.1 Update `src/components/features/download/DownloadSection.tsx`:
    ```typescript
    import { useState, useEffect } from 'react';
    import { useTranslation } from 'react-i18next';
    import { Loader2 } from 'lucide-react';
    import { useAuthStore } from '@/stores/authStore';
    import { useDownloadFlow } from '@/hooks/download';
    import type { PlaylistInfo, TrackInfo } from '@/types/playlist';
    import { UrlInput } from './UrlInput';
    import { AuthPrompt } from './AuthPrompt';
    import { ValidationFeedback } from './ValidationFeedback';
    import { PlaylistPreview } from './PlaylistPreview';
    import { TrackPreview } from './TrackPreview';

    function isPlaylist(media: PlaylistInfo | TrackInfo): media is PlaylistInfo {
      return 'tracks' in media;
    }

    export function DownloadSection() {
      const { t } = useTranslation();
      const isSignedIn = useAuthStore((state) => state.isSignedIn);

      const {
        url,
        setUrl,
        validation,
        isValidating,
        media,
        isLoading,
        error,
        handleDownload,
      } = useDownloadFlow();

      // Success border auto-dismiss
      const [showSuccess, setShowSuccess] = useState(false);
      useEffect(() => {
        if (validation?.valid) {
          setShowSuccess(true);
          const timer = setTimeout(() => setShowSuccess(false), 2000);
          return () => clearTimeout(timer);
        }
        setShowSuccess(false);
      }, [validation]);

      // Display result for border (success fades, errors persist)
      const displayResult = validation?.valid
        ? (showSuccess ? validation : null)
        : (error ? { valid: false, error } : validation);

      return (
        <section className="space-y-4">
          <div className="relative">
            <UrlInput
              onUrlChange={setUrl}
              disabled={!isSignedIn}
              isValidating={isValidating}
              validationResult={displayResult}
            />
            {!isSignedIn && <AuthPrompt />}
          </div>
          <ValidationFeedback
            result={error ? { valid: false, error } : validation}
            isValidating={isValidating}
          />
          {isLoading && (
            <div
              className="flex items-center gap-2 text-sm text-muted-foreground mt-4"
              data-testid="playlist-loading"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('download.fetchingPlaylist')}
            </div>
          )}
          {media && !isLoading && isPlaylist(media) && (
            <PlaylistPreview playlist={media} onDownload={handleDownload} />
          )}
          {media && !isLoading && !isPlaylist(media) && (
            <TrackPreview track={media} onDownload={handleDownload} />
          )}
        </section>
      );
    }
    ```

- [x] Task 7: Update tests (AC: #6)
  - [x] 7.1 Update `src/components/features/download/DownloadSection.test.tsx`:
    - Mock `useDownloadFlow` instead of individual invoke calls
    - Keep all existing test assertions
    - Simplify mocking by controlling hook return values
  - [x] 7.2 Run full test suite to verify no regressions

## Dev Notes

### Why This Refactor?

The original `DownloadSection` had 5 responsibilities:
1. Calling Rust backend (`invoke`)
2. Managing loading states
3. Transforming backend data
4. Storing server state
5. Syncing to queue store

This violates Single Responsibility Principle and makes the component hard to test and maintain.

### Hook Dependency Graph

```
useDownloadFlow (orchestrator)
├── useUrlValidation
│   └── useDebounce
├── useMediaFetch
│   └── fetchPlaylistInfo / fetchTrackInfo
└── useSyncToQueue
    └── useQueueStore
```

### Testing Strategy

**Unit Tests (hooks):**
- `useUrlValidation.test.ts` - Mock `validateUrl`, test debounce
- `useMediaFetch.test.ts` - Mock `fetchPlaylistInfo`/`fetchTrackInfo`, test error mapping
- `useSyncToQueue.test.ts` - Mock `useQueueStore`, verify transforms
- `useDownloadFlow.test.ts` - Integration test of composed hooks

**Component Tests:**
- Mock `useDownloadFlow` at module level
- Control return values to test all UI states
- Simpler, more focused tests

### Migration Notes

After this refactor:
- All future download-related features use `useDownloadFlow`
- New fetching logic goes in `useMediaFetch`
- New transforms go in `src/lib/transforms.ts`
- Components stay thin (< 30 lines of logic)

### File Structure After This Story

```
src/
├── hooks/
│   ├── download/
│   │   ├── useUrlValidation.ts
│   │   ├── useUrlValidation.test.ts
│   │   ├── useMediaFetch.ts
│   │   ├── useMediaFetch.test.ts
│   │   ├── useSyncToQueue.ts
│   │   ├── useSyncToQueue.test.ts
│   │   ├── useDownloadFlow.ts
│   │   ├── useDownloadFlow.test.ts
│   │   └── index.ts
│   └── index.ts (updated)
├── lib/
│   ├── transforms.ts (new)
│   └── transforms.test.ts (new)
└── components/features/download/
    ├── DownloadSection.tsx (refactored)
    └── DownloadSection.test.tsx (updated)
```

### Domain Actions vs CRUD Actions

**Key insight:** `useSyncToQueue` is a **domain reaction**, not fetch logic.

```typescript
// ❌ CRUD action - unclear intent
setTracks(tracks);

// ✅ Domain action - expresses business intent
enqueueTracks(tracks);  // "media loaded → feed queue"
```

The effect in `useSyncToQueue` is correct use of `useEffect` because:
1. It's a **domain reaction**: "playlist loaded → feed queue"
2. The transform is a **pure function** outside the effect
3. The action name expresses **business intent**

This prevents sync bugs when requirements change (e.g., "append to queue" vs "replace queue").

### Anti-Patterns to Avoid

- Do NOT call `invoke()` directly in components
- Do NOT manage `isLoading` state in components
- Do NOT transform data inline in JSX
- Do NOT duplicate validation logic across hooks

### References

- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Custom Hook Patterns]
- [Source: Story 3.4, 3.5 - Original implementation]

## File List

### New Files
- `src/lib/transforms.ts` - Transform utilities for converting API types to queue types
- `src/lib/transforms.test.ts` - Unit tests for transform utilities (8 tests)
- `src/hooks/download/useUrlValidation.ts` - Hook for URL validation with debouncing
- `src/hooks/download/useUrlValidation.test.ts` - Tests for useUrlValidation (8 tests)
- `src/hooks/download/useMediaFetch.ts` - Hook for fetching playlist/track info
- `src/hooks/download/useMediaFetch.test.ts` - Tests for useMediaFetch (9 tests)
- `src/hooks/download/useSyncToQueue.ts` - Domain reaction hook for queue sync
- `src/hooks/download/useSyncToQueue.test.ts` - Tests for useSyncToQueue (6 tests)
- `src/hooks/download/useDownloadFlow.ts` - Orchestrator hook composing all download hooks
- `src/hooks/download/useDownloadFlow.test.ts` - Tests for useDownloadFlow (11 tests)
- `src/hooks/download/index.ts` - Barrel export for download hooks

### Modified Files
- `src/hooks/index.ts` - Added re-export from download hooks
- `src/stores/queueStore.ts` - Renamed `setTracks` → `enqueueTracks`
- `src/stores/queueStore.test.ts` - Updated tests for renamed action
- `src/components/features/download/DownloadSection.tsx` - Refactored to use useDownloadFlow
- `src/components/features/download/DownloadSection.test.tsx` - Rewritten to mock useDownloadFlow

## Dev Agent Record

**Story completed:** 2026-02-09

**Summary:**
Successfully refactored the monolithic `DownloadSection` component (185 lines) into composable custom hooks following the Single Responsibility Principle. The component now contains only ~30 lines of UI logic while all data fetching, validation, and queue synchronization have been extracted into dedicated hooks.

**Key implementation decisions:**
1. Used `useRef` pattern in `useMediaFetch` to avoid infinite loops from `useTranslation`'s `t` function reference changes
2. Renamed `setTracks` → `enqueueTracks` for domain-driven action naming
3. Created stable object references in tests to prevent infinite re-renders
4. Extracted pure transform functions to `src/lib/transforms.ts` for better testability

**Test results:**
- All 313 tests pass
- No regressions in existing functionality
- Frontend build succeeds

**Technical debt addressed:**
- Eliminated direct `invoke()` calls in components
- Centralized loading state management in hooks
- Separated data transformation from UI rendering
