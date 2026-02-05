# Story 7.2: Display Unavailable Track Messages

Status: ready-for-dev

## Story

As a **user**,
I want **to understand when a track no longer exists**,
so that **I know why it couldn't be downloaded**.

## Acceptance Criteria (FR17)

1. **Given** a track fails because it was deleted or made private (FR17)
   **When** the failure is detected
   **Then** the track card shows a warning icon
   **And** the status text shows "Track unavailable"

2. **Given** an unavailable track is displayed
   **When** viewing the failure reason
   **Then** the message explains possible causes:
   - "This track may have been removed or made private"
   **And** the tone is factual, not apologetic

3. **Given** the track URL was valid at paste time
   **When** it becomes unavailable during download
   **Then** the error is handled gracefully
   **And** no crash or hang occurs
   **And** the queue continues processing

4. **Given** multiple unavailable tracks
   **When** viewing the track list
   **Then** each failed track shows its specific reason
   **And** reasons are consistent in format and tone

5. **Given** an unavailable track is displayed
   **When** checking accessibility
   **Then** screen readers announce "Track unavailable" status
   **And** the warning icon has appropriate aria-label
   **And** detailed reason is accessible via tooltip

## Tasks / Subtasks

- [ ] Task 1: Extend error handling for DOWNLOAD_FAILED error code (AC: #1, #3)
  - [ ] 1.1 Update `src-tauri/src/models/errors.rs` to include unavailability sub-reason detection
  - [ ] 1.2 Parse yt-dlp stderr for unavailability patterns:
    - "This video is not available"
    - "Video unavailable"
    - "Private video"
    - "This track was removed"
    - "404 Not Found"
    - "does not exist"
  - [ ] 1.3 Map detected patterns to `DOWNLOAD_FAILED` error with reason `unavailable`
  - [ ] 1.4 Ensure error propagates through download queue without interrupting other tracks
  - [ ] 1.5 Add unit tests for pattern detection in Rust

- [ ] Task 2: Create unavailability error message utility (AC: #2, #4)
  - [ ] 2.1 Update `src/lib/errorMessages.ts` to handle unavailability sub-reason
  - [ ] 2.2 Add function to detect unavailability from error payload:
    ```typescript
    export const isUnavailableError = (error: TrackError): boolean => {
      return error.code === 'DOWNLOAD_FAILED' &&
             (error.message?.toLowerCase().includes('unavailable') ||
              error.message?.toLowerCase().includes('private') ||
              error.message?.toLowerCase().includes('removed') ||
              error.message?.toLowerCase().includes('deleted') ||
              error.message?.toLowerCase().includes('404') ||
              error.message?.toLowerCase().includes('not found'));
    };
    ```
  - [ ] 2.3 Return appropriate i18n key for unavailability messages
  - [ ] 2.4 Export as named export
  - [ ] 2.5 Add JSDoc documentation for the utility function

- [ ] Task 3: Update TrackStatusLabel for unavailable tracks (AC: #1, #2, #4)
  - [ ] 3.1 Import unavailability detection utility into TrackStatusLabel
  - [ ] 3.2 When status is `failed` and error matches unavailability pattern:
    - Display "Track unavailable" instead of generic "Failed"
  - [ ] 3.3 Ensure warning color (#F59E0B amber) is used, not error color
  - [ ] 3.4 Use `text-amber-500` Tailwind class for unavailable status
  - [ ] 3.5 Maintain consistent factual tone across all unavailable tracks

- [ ] Task 4: Update TrackStatusIcon for unavailable tracks (AC: #1)
  - [ ] 4.1 Import unavailability detection utility into TrackStatusIcon
  - [ ] 4.2 Use warning triangle icon (not X circle) for unavailable tracks
  - [ ] 4.3 Apply amber color (#F59E0B) to icon
  - [ ] 4.4 Add aria-label: "Track unavailable - external restriction"

- [ ] Task 5: Create UnavailableTrackTooltip component (AC: #2, #5)
  - [ ] 5.1 Create `src/components/features/download/UnavailableTrackTooltip.tsx`
  - [ ] 5.2 Display detailed message: "This track may have been removed or made private"
  - [ ] 5.3 Use Shadcn Tooltip component for hover/focus interaction
  - [ ] 5.4 Ensure tooltip is keyboard accessible (focus trigger)
  - [ ] 5.5 Add aria-describedby for screen reader association
  - [ ] 5.6 Export as named export

- [ ] Task 6: Integrate tooltip with TrackCard (AC: #1, #2, #5)
  - [ ] 6.1 Import UnavailableTrackTooltip into TrackCard
  - [ ] 6.2 Import TooltipProvider from Shadcn at app level if not already done
  - [ ] 6.3 Wrap failed track status badge with tooltip when error is unavailability
  - [ ] 6.4 Tooltip appears on hover or focus of status area
  - [ ] 6.5 Ensure tooltip does not interfere with track list scrolling
  - [ ] 6.6 Ensure tooltip closes on scroll

- [ ] Task 7: Add i18n translation keys (AC: #2, #4)
  - [ ] 7.1 Add unavailability keys to `src/locales/en.json`:
    ```json
    "errors": {
      "trackUnavailable": "Track unavailable",
      "trackUnavailableDetail": "This track may have been removed or made private"
    }
    ```
  - [ ] 7.2 Add corresponding keys to `src/locales/fr.json`:
    ```json
    "errors": {
      "trackUnavailable": "Piste indisponible",
      "trackUnavailableDetail": "Cette piste a peut-etre ete supprimee ou rendue privee"
    }
    ```
  - [ ] 7.3 Update components to use translation keys via `useTranslation` hook
  - [ ] 7.4 Verify interpolation works if needed for dynamic content

- [ ] Task 8: Ensure graceful error handling in download queue (AC: #3)
  - [ ] 8.1 Verify `src-tauri/src/download/queue.rs` continues after unavailable track
  - [ ] 8.2 Confirm track status is set to `failed` in queue store
  - [ ] 8.3 Confirm next track begins downloading immediately after failure
  - [ ] 8.4 Verify no application crash or hang on unavailable track
  - [ ] 8.5 Log unavailability reason for debugging without exposing to user
  - [ ] 8.6 Ensure successfully downloaded files are not affected (NFR9)

- [ ] Task 9: Add accessibility features for unavailable tracks (AC: #5)
  - [ ] 9.1 Ensure screen reader announces "Track unavailable" status via aria-live
  - [ ] 9.2 Make tooltip content accessible via `aria-describedby`
  - [ ] 9.3 Ensure warning icon has appropriate `aria-label`
  - [ ] 9.4 Test with keyboard navigation only (Tab, Enter, Escape)
  - [ ] 9.5 Verify focus is not stolen when status updates to failed

- [ ] Task 10: Write component and integration tests (AC: #1, #2, #3, #4, #5)
  - [ ] 10.1 Create `isUnavailableError.test.ts` - test utility with various error payloads
  - [ ] 10.2 Test TrackStatusLabel renders "Track unavailable" for unavailability errors
  - [ ] 10.3 Test TrackStatusIcon uses warning icon and amber color for unavailability
  - [ ] 10.4 Test UnavailableTrackTooltip renders correct detail message
  - [ ] 10.5 Test TrackCard displays tooltip on hover/focus for unavailable tracks
  - [ ] 10.6 Test download queue continues after unavailable track (integration)
  - [ ] 10.7 Test i18n keys render in both English and French
  - [ ] 10.8 Test accessibility attributes are present

## Dev Notes

### DOWNLOAD_FAILED Error Handling for Unavailable Tracks

The `DOWNLOAD_FAILED` error code from `project-context.md` covers multiple failure scenarios. For unavailable tracks specifically, the error message must be parsed to determine the sub-reason:

```typescript
// Error payload structure for unavailable tracks
interface TrackError {
  code: 'DOWNLOAD_FAILED';
  message: string; // Contains unavailability indicators
}

// Detection patterns in error message
const UNAVAILABILITY_PATTERNS = [
  'unavailable',
  'private',
  'removed',
  'deleted',
  '404',
  'not found',
  'does not exist'
];

// Example detection function
export const isUnavailableError = (error: TrackError): boolean => {
  if (error.code !== 'DOWNLOAD_FAILED') return false;
  const message = error.message?.toLowerCase() || '';
  return UNAVAILABILITY_PATTERNS.some(pattern => message.includes(pattern));
};
```

[Source: project-context.md#Error Codes]

### Distinction from Other Error Types

| Scenario | Error Code | Status Text | Detail Message | Icon | Color |
|----------|------------|-------------|----------------|------|-------|
| Geo-blocked | `GEO_BLOCKED` | "Unavailable in your region" | "Geographic restriction by rights holder" | Warning Triangle | Amber (#F59E0B) |
| Unavailable (this story) | `DOWNLOAD_FAILED` | "Track unavailable" | "This track may have been removed or made private" | Warning Triangle | Amber (#F59E0B) |
| Network error | `NETWORK_ERROR` | "Network error" | "Check your internet connection" | X Circle | Rose (#F43F5E) |
| Conversion failed | `CONVERSION_FAILED` | "Conversion failed" | "Audio processing error" | X Circle | Rose (#F43F5E) |

Both geo-blocked and unavailable use warning color (amber) rather than error color (rose) because the failure is external to the application - this frames the issue as "restriction" rather than "error".

[Source: epics.md#Story 7.1, Story 7.2; ux-design-specification.md#Feedback Patterns]

### Factual Tone Messaging Guidelines

Per UX Design Specification, error messages must follow the "Error Transparency as Trust" principle:

**Do:**
- Be factual, not apologetic
- Use "may have been" to indicate uncertainty
- Blame external factors (track owner, SoundCloud)
- Provide possible causes without certainty
- Keep tone calm and informative

**Don't:**
- Use apologetic language ("Sorry", "Unfortunately")
- Use alarming language ("Error!", "Failed!")
- Blame the application
- Show technical details (HTTP codes, stack traces)

**Good Examples:**
- "Track unavailable"
- "This track may have been removed or made private"

**Bad Examples:**
- "Sorry, we failed to download this track"
- "Error: Track not found (404)"
- "Download failed - please try again"

[Source: ux-design-specification.md#Graceful Failure, Error Transparency as Trust]

### Graceful Error Handling Pattern

The download queue must continue processing after individual failures (FR19, NFR9):

```rust
// In download/queue.rs
for track in playlist.tracks {
    match download_track(&track).await {
        Ok(_) => {
            emit_progress(&track.id, TrackStatus::Complete, 100, None).await;
        }
        Err(e) => {
            // Log error for debugging (not exposed to user)
            log::warn!("Track {} unavailable: {}", track.id, e);

            // Determine if this is an unavailability error
            let error_info = if is_unavailability_error(&e) {
                TrackError {
                    code: "DOWNLOAD_FAILED".to_string(),
                    message: "Track unavailable - may have been removed or made private".to_string(),
                }
            } else {
                e.into()
            };

            // Emit failure status with reason
            emit_progress(&track.id, TrackStatus::Failed, 0, Some(error_info)).await;

            // CRITICAL: Continue to next track - DO NOT break or panic
            continue;
        }
    }
}
```

**Key requirement:** Successfully downloaded files must not be affected by subsequent failures (NFR9).

[Source: project-context.md#IPC Payload Structure; epics.md#NFR9]

### IPC Event Payload for Failed Tracks

```typescript
// download-progress event for unavailable track
{
  trackId: "track_123",
  status: "failed",
  percent: 0,
  error: {
    code: "DOWNLOAD_FAILED",
    message: "Track unavailable - may have been removed or made private"
  }
}
```

This matches the IPC Payload Structure defined in project-context.md.

[Source: project-context.md#IPC Payload Structure]

### Component Structure

```
src/components/features/download/
├── TrackCard.tsx              # Parent card (from Story 5.1) - UPDATE
├── TrackStatusIcon.tsx        # Icon component (from Story 5.2) - UPDATE
├── TrackStatusLabel.tsx       # Text label (from Story 5.2) - UPDATE
├── TrackStatusBadge.tsx       # Icon + Label (from Story 5.2)
└── UnavailableTrackTooltip.tsx # NEW - Detail message tooltip

src/lib/
└── errorMessages.ts           # Error message utilities - UPDATE with isUnavailableError
```

[Source: architecture/project-structure-boundaries.md#Component Organization]

### Error Detection in Rust Backend

Parse yt-dlp stderr output to detect unavailability:

```rust
// In src-tauri/src/download/track.rs

const UNAVAILABILITY_PATTERNS: &[&str] = &[
    "video unavailable",
    "this video is not available",
    "private video",
    "this track was removed",
    "404 not found",
    "does not exist",
    "video is unavailable",
    "content is not available",
];

fn detect_unavailability(stderr: &str) -> Option<String> {
    let stderr_lower = stderr.to_lowercase();

    for pattern in UNAVAILABILITY_PATTERNS {
        if stderr_lower.contains(pattern) {
            return Some("Track unavailable - may have been removed or made private".to_string());
        }
    }
    None
}

// Usage in download logic
pub async fn download_track(track: &Track, auth_token: &str) -> Result<PathBuf, DownloadError> {
    let output = Command::new_sidecar("yt-dlp")
        .args(&[/* ... */])
        .output()
        .await?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);

        if let Some(unavailable_reason) = detect_unavailability(&stderr) {
            return Err(DownloadError::Unavailable(unavailable_reason));
        }

        return Err(DownloadError::Failed(stderr.to_string()));
    }

    // ... continue with successful download
}
```

[Source: architecture/technical-approach-implementation-strategy.md#Error Handling]

### i18n Key Structure

Following project conventions for error messages:

```json
// src/locales/en.json
{
  "errors": {
    "geoBlocked": "Unavailable in your region",
    "geoBlockedDetail": "Geographic restriction by rights holder",
    "trackUnavailable": "Track unavailable",
    "trackUnavailableDetail": "This track may have been removed or made private",
    "downloadFailed": "Download failed",
    "conversionFailed": "Conversion failed",
    "networkError": "Network error",
    "rateLimited": "Rate limited - will retry"
  }
}

// src/locales/fr.json
{
  "errors": {
    "geoBlocked": "Indisponible dans votre region",
    "geoBlockedDetail": "Restriction geographique par le detenteur des droits",
    "trackUnavailable": "Piste indisponible",
    "trackUnavailableDetail": "Cette piste a peut-etre ete supprimee ou rendue privee",
    "downloadFailed": "Echec du telechargement",
    "conversionFailed": "Echec de la conversion",
    "networkError": "Erreur reseau",
    "rateLimited": "Limite de debit - nouvelle tentative"
  }
}
```

[Source: project-context.md#react-i18next; architecture/implementation-patterns-consistency-rules.md#Localization Patterns]

### Shadcn/ui Components to Use

**Tooltip component for detail message:**

```typescript
// Search Shadcn registry for Tooltip before implementation
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// UnavailableTrackTooltip.tsx
export function UnavailableTrackTooltip({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent>
        <p>{t('errors.trackUnavailableDetail')}</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

**Note:** Ensure `TooltipProvider` is added at app root level (in App.tsx or main.tsx).

[Source: project-context.md#Shadcn/ui Requirement]

### Accessibility Implementation

```typescript
// TrackStatusBadge with unavailable error
<div
  role="status"
  aria-live="polite"
  aria-label={t('errors.trackUnavailable')}
>
  <UnavailableTrackTooltip>
    <div className="flex items-center gap-2">
      <TrackStatusIcon status="failed" error={error} />
      <TrackStatusLabel status="failed" error={error} />
    </div>
  </UnavailableTrackTooltip>
</div>

// UnavailableTrackTooltip with accessibility
<Tooltip>
  <TooltipTrigger asChild>
    <button
      type="button"
      aria-describedby="unavailable-tooltip"
      className="cursor-help"
    >
      {children}
    </button>
  </TooltipTrigger>
  <TooltipContent id="unavailable-tooltip">
    <p>{t('errors.trackUnavailableDetail')}</p>
  </TooltipContent>
</Tooltip>
```

[Source: ux-design-specification.md#Accessibility; epics.md#UX-13, UX-14]

### Anti-Patterns to Avoid

1. **Do NOT use apologetic language** - "Sorry", "We couldn't", "Unfortunately" are forbidden
2. **Do NOT create custom error codes** - Use `DOWNLOAD_FAILED` with message parsing, not new codes
3. **Do NOT crash or halt queue** - Continue processing after unavailable tracks
4. **Do NOT use error color (rose) for external failures** - Use warning color (amber)
5. **Do NOT hardcode error messages** - Use i18n translation keys
6. **Do NOT log sensitive information** - Don't expose why track was removed
7. **Do NOT show technical details to users** - No stack traces, HTTP codes, or raw yt-dlp output
8. **Do NOT use default exports** - Use named exports only
9. **Do NOT block UI during error detection** - Keep async operations non-blocking
10. **Do NOT steal focus on status updates** - Use aria-live instead

[Source: project-context.md#Anti-Patterns to Avoid]

### Testing Checklist

**Unit Tests:**
- [ ] `isUnavailableError` returns true for DOWNLOAD_FAILED with "unavailable" in message
- [ ] `isUnavailableError` returns true for DOWNLOAD_FAILED with "private" in message
- [ ] `isUnavailableError` returns true for DOWNLOAD_FAILED with "removed" in message
- [ ] `isUnavailableError` returns true for DOWNLOAD_FAILED with "deleted" in message
- [ ] `isUnavailableError` returns true for DOWNLOAD_FAILED with "404" in message
- [ ] `isUnavailableError` returns true for DOWNLOAD_FAILED with "not found" in message
- [ ] `isUnavailableError` returns false for GEO_BLOCKED errors
- [ ] `isUnavailableError` returns false for NETWORK_ERROR
- [ ] `isUnavailableError` returns false for CONVERSION_FAILED
- [ ] `isUnavailableError` handles null/undefined error gracefully

**Component Tests:**
- [ ] TrackStatusLabel shows "Track unavailable" for unavailability errors
- [ ] TrackStatusLabel uses amber/warning color class for unavailability
- [ ] TrackStatusIcon uses warning triangle icon for unavailability
- [ ] TrackStatusIcon uses amber color for unavailability
- [ ] UnavailableTrackTooltip renders detail message from i18n
- [ ] UnavailableTrackTooltip is keyboard accessible
- [ ] TrackCard shows tooltip on hover for unavailable tracks
- [ ] TrackCard shows tooltip on focus for unavailable tracks

**Integration Tests:**
- [ ] Download queue continues after unavailable track
- [ ] Next track starts immediately after failure (no delay)
- [ ] No application crash on unavailable track
- [ ] Successfully downloaded files are unaffected by later failures

**Accessibility Tests:**
- [ ] Screen reader announces "Track unavailable" status
- [ ] Warning icon has aria-label
- [ ] Tooltip content accessible via keyboard
- [ ] Focus is not stolen on status update

**i18n Tests:**
- [ ] English translations render correctly
- [ ] French translations render correctly
- [ ] Translation keys exist in both locale files

**Manual Testing:**
- [ ] Test with actual unavailable SoundCloud track URL
- [ ] Test with private track URL (if accessible)
- [ ] Test partial failure scenario (some tracks unavailable in playlist)
- [ ] Verify factual tone in UI

### Dependencies

**This story depends on:**
- Story 5.1: Create Track List Component (TrackCard exists)
- Story 5.2: Implement Per-Track Status Display (TrackStatusLabel, TrackStatusIcon, TrackStatusBadge exist)
- Story 4.3: Implement Track Download Command (download error handling exists)
- Story 4.6: Implement Download Queue Processing (queue continuation logic exists)
- Story 1.5: Configure react-i18next Foundation (i18n setup exists)

**This story is related to:**
- Story 7.1: Display Geo-Block Error Messages (similar pattern, different error type)
- Story 7.3: Create Error Panel Component (aggregates all failed tracks including unavailable)

**This story enables:**
- Story 7.3: Create Error Panel Component (needs unavailable track detection)

### References

- [Source: ux-design-specification.md#Graceful Failure]
- [Source: ux-design-specification.md#Error Transparency as Trust]
- [Source: ux-design-specification.md#Feedback Patterns]
- [Source: ux-design-specification.md#Accessibility]
- [Source: project-context.md#Error Codes]
- [Source: project-context.md#IPC Payload Structure]
- [Source: project-context.md#Anti-Patterns to Avoid]
- [Source: project-context.md#react-i18next]
- [Source: project-context.md#Shadcn/ui Requirement]
- [Source: epics.md#Story 7.2]
- [Source: epics.md#FR17 - User can see specific failure reason for unavailable tracks]
- [Source: epics.md#FR19 - System can continue downloading remaining tracks after individual failures]
- [Source: epics.md#NFR9 - Partial download failures do not corrupt successfully downloaded files]
- [Source: architecture/project-structure-boundaries.md#Component Organization]
- [Source: architecture/technical-approach-implementation-strategy.md#Error Handling]
- [Source: architecture/implementation-patterns-consistency-rules.md#Localization Patterns]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### Change Log

### File List
