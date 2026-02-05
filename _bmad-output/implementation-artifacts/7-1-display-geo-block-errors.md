# Story 7.1: Display Geo-Block Error Messages

Status: ready-for-dev

## Story

As a **user**,
I want **to understand when a track is blocked in my region**,
so that **I know it's a SoundCloud restriction, not an app problem**.

## Acceptance Criteria (FR16, FR19)

1. **Given** a track fails due to geographic restrictions (FR16)
   **When** the failure is detected
   **Then** the track card shows a warning icon (not error icon)
   **And** the status text shows "Unavailable in your region"

2. **Given** a geo-blocked track is displayed
   **When** viewing the failure reason
   **Then** the message blames the restriction, not the app
   **And** the tone is informative, not alarming
   **And** example: "This track isn't available in your country"

3. **Given** the user hovers or clicks the failed track
   **When** viewing additional details
   **Then** a tooltip or expandable section shows:
   - "Geographic restriction by rights holder"
   - The track will not retry automatically

4. **Given** geo-block errors occur
   **When** the download continues
   **Then** subsequent tracks still download normally (FR19)
   **And** the geo-blocked track is marked and skipped

## Tasks / Subtasks

- [ ] Task 1: Implement GEO_BLOCKED error detection in Rust backend (AC: #1, #4)
  - [ ] 1.1 Update `src-tauri/src/models/errors.rs` to define `GEO_BLOCKED` error variant
  - [ ] 1.2 Parse yt-dlp stderr for geo-restriction patterns:
    - "is not available in your country"
    - "geo restricted"
    - "not available in your region"
    - "blocked in your country"
    - "This content is not available in your location"
  - [ ] 1.3 Create error detection function in `src-tauri/src/download/track.rs`:
    ```rust
    fn detect_geo_block(stderr: &str) -> Option<String> {
        let patterns = [
            "not available in your country",
            "geo restricted",
            "not available in your region",
            "blocked in your country",
            "not available in your location",
        ];

        for pattern in patterns {
            if stderr.to_lowercase().contains(&pattern.to_lowercase()) {
                return Some("Geographic restriction by rights holder".to_string());
            }
        }
        None
    }
    ```
  - [ ] 1.4 Map detected patterns to `GEO_BLOCKED` error code
  - [ ] 1.5 Ensure error propagates through download queue without interrupting other tracks

- [ ] Task 2: Create geo-block error message utility (AC: #2)
  - [ ] 2.1 Create or update `src/lib/errorMessages.ts`
  - [ ] 2.2 Add function to detect geo-block errors:
    ```typescript
    export const isGeoBlockedError = (error: TrackError): boolean => {
      return error.code === 'GEO_BLOCKED';
    };
    ```
  - [ ] 2.3 Add function to get user-friendly message:
    ```typescript
    export const getGeoBlockMessage = (t: TFunction): string => {
      return t('errors.geoBlocked');
    };

    export const getGeoBlockDetail = (t: TFunction): string => {
      return t('errors.geoBlockedDetail');
    };
    ```
  - [ ] 2.4 Export all functions as named exports

- [ ] Task 3: Update TrackStatusIcon for geo-blocked state (AC: #1)
  - [ ] 3.1 Import geo-block detection utility into TrackStatusIcon
  - [ ] 3.2 When status is `failed` and error code is `GEO_BLOCKED`:
    - Use warning icon (AlertTriangle from Lucide React)
    - Apply amber/warning color (#F59E0B / `text-amber-500`)
  - [ ] 3.3 Add appropriate aria-label: "Geographic restriction"
  - [ ] 3.4 Ensure warning icon is distinct from error icon (X Circle)

- [ ] Task 4: Update TrackStatusLabel for geo-blocked tracks (AC: #1, #2)
  - [ ] 4.1 Import geo-block detection utility into TrackStatusLabel
  - [ ] 4.2 When status is `failed` and error code is `GEO_BLOCKED`:
    - Display "Unavailable in your region" instead of generic "Failed"
  - [ ] 4.3 Apply amber/warning color (#F59E0B / `text-amber-500`)
  - [ ] 4.4 Maintain informative, non-alarming tone

- [ ] Task 5: Create GeoBlockTooltip component (AC: #3)
  - [ ] 5.1 Create `src/components/features/download/GeoBlockTooltip.tsx`
  - [ ] 5.2 Use Shadcn Tooltip component for hover/focus interaction:
    ```typescript
    import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

    export const GeoBlockTooltip = ({ children }: { children: React.ReactNode }) => {
      const { t } = useTranslation();

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {children}
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('errors.geoBlockedDetail')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('errors.geoBlockedNoRetry')}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    };
    ```
  - [ ] 5.3 Display detailed message: "Geographic restriction by rights holder"
  - [ ] 5.4 Display no-retry note: "This track will not retry automatically"
  - [ ] 5.5 Ensure tooltip is keyboard accessible (focus trigger)
  - [ ] 5.6 Export as named export

- [ ] Task 6: Create expandable GeoBlockDetails component (AC: #3)
  - [ ] 6.1 Create `src/components/features/download/GeoBlockDetails.tsx`
  - [ ] 6.2 Implement collapsible details using Shadcn Collapsible or custom implementation:
    ```typescript
    import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

    export const GeoBlockDetails = () => {
      const { t } = useTranslation();
      const [isOpen, setIsOpen] = useState(false);

      return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="text-xs text-amber-600 hover:underline">
            {t('errors.showDetails')}
          </CollapsibleTrigger>
          <CollapsibleContent className="text-xs text-muted-foreground mt-1">
            <p>{t('errors.geoBlockedDetail')}</p>
            <p>{t('errors.geoBlockedNoRetry')}</p>
          </CollapsibleContent>
        </Collapsible>
      );
    };
    ```
  - [ ] 6.3 Provide alternative to tooltip for touch devices
  - [ ] 6.4 Export as named export

- [ ] Task 7: Integrate tooltip/details with TrackCard (AC: #1, #3)
  - [ ] 7.1 Import GeoBlockTooltip into TrackCard
  - [ ] 7.2 Wrap TrackStatusBadge with GeoBlockTooltip when error is geo-blocked
  - [ ] 7.3 Tooltip appears on hover or focus of status area
  - [ ] 7.4 On mobile/touch, show expandable details instead of tooltip
  - [ ] 7.5 Ensure interaction does not interfere with track list scrolling

- [ ] Task 8: Add i18n translation keys (AC: #2, #3)
  - [ ] 8.1 Add geo-block keys to `src/locales/en.json`:
    ```json
    "errors": {
      "geoBlocked": "Unavailable in your region",
      "geoBlockedDetail": "Geographic restriction by rights holder",
      "geoBlockedNoRetry": "This track will not retry automatically",
      "showDetails": "Show details"
    }
    ```
  - [ ] 8.2 Add corresponding keys to `src/locales/fr.json`:
    ```json
    "errors": {
      "geoBlocked": "Indisponible dans votre region",
      "geoBlockedDetail": "Restriction geographique par le detenteur des droits",
      "geoBlockedNoRetry": "Cette piste ne sera pas reessayee automatiquement",
      "showDetails": "Afficher les details"
    }
    ```
  - [ ] 8.3 Update all components to use translation keys via `useTranslation` hook

- [ ] Task 9: Ensure graceful error handling in download queue (AC: #4)
  - [ ] 9.1 Verify `src-tauri/src/download/queue.rs` continues after geo-blocked track
  - [ ] 9.2 Confirm track status is set to `failed` with `GEO_BLOCKED` code in queue store
  - [ ] 9.3 Confirm next track begins downloading immediately after geo-block
  - [ ] 9.4 Verify no application crash or hang on geo-blocked track
  - [ ] 9.5 Log geo-block detection for debugging without exposing to user:
    ```rust
    log::info!("Track {} geo-blocked in region", track.id);
    ```

- [ ] Task 10: Emit proper IPC event for geo-blocked tracks (AC: #1, #4)
  - [ ] 10.1 Update download progress event emission in Rust:
    ```rust
    // In download/queue.rs
    emit_event("download-progress", DownloadProgress {
        track_id: track.id.clone(),
        status: "failed".to_string(),
        percent: 0,
        error: Some(ErrorPayload {
            code: "GEO_BLOCKED".to_string(),
            message: "Geographic restriction by rights holder".to_string(),
        }),
    })?;
    ```
  - [ ] 10.2 Ensure TypeScript types match Rust payload
  - [ ] 10.3 Update `src/types/events.ts` if needed

- [ ] Task 11: Add accessibility features for geo-blocked tracks (AC: #1, #3)
  - [ ] 11.1 Ensure screen reader announces "Unavailable in your region" status
  - [ ] 11.2 Make tooltip content accessible via `aria-describedby`
  - [ ] 11.3 Ensure warning icon has appropriate `aria-label`: "Geographic restriction warning"
  - [ ] 11.4 Test with keyboard navigation only
  - [ ] 11.5 Ensure focus trap is not created by tooltip

- [ ] Task 12: Write component and integration tests (AC: #1, #2, #3, #4)
  - [ ] 12.1 Test `isGeoBlockedError` utility returns true for GEO_BLOCKED code
  - [ ] 12.2 Test `isGeoBlockedError` utility returns false for other error codes
  - [ ] 12.3 Test TrackStatusIcon renders warning icon for geo-blocked status
  - [ ] 12.4 Test TrackStatusIcon uses amber color for geo-blocked status
  - [ ] 12.5 Test TrackStatusLabel renders "Unavailable in your region" for geo-blocked
  - [ ] 12.6 Test GeoBlockTooltip renders correct detail messages
  - [ ] 12.7 Test GeoBlockTooltip is keyboard accessible
  - [ ] 12.8 Test TrackCard displays tooltip on hover for geo-blocked tracks
  - [ ] 12.9 Test download queue continues after geo-blocked track (integration)
  - [ ] 12.10 Test i18n keys render in both English and French
  - [ ] 12.11 Test screen reader announces geo-block status

## Dev Notes

### GEO_BLOCKED Error Code

The `GEO_BLOCKED` error code is one of the predefined error codes. Use it exactly as specified:

```typescript
// Error payload structure for geo-blocked tracks
interface TrackError {
  code: 'GEO_BLOCKED';
  message: string; // "Geographic restriction by rights holder"
}
```

[Source: project-context.md#Error Codes]

### Distinction from Unavailable Tracks (Story 7.2)

| Scenario | Error Code | Status Text | Detail Message | Icon | Color |
|----------|------------|-------------|----------------|------|-------|
| Geo-blocked | `GEO_BLOCKED` | "Unavailable in your region" | "Geographic restriction by rights holder" | AlertTriangle | Amber (#F59E0B) |
| Unavailable | `DOWNLOAD_FAILED` | "Track unavailable" | "This track may have been removed or made private" | AlertTriangle | Amber (#F59E0B) |

Both use warning icon and warning color (amber) because the failure is external to the application - the user should not blame the app.

[Source: epics.md#Story 7.1, Story 7.2]

### User-Friendly Messaging Guidelines

Per UX Design Specification, geo-block messages must:
- Blame the restriction, not the app
- Be informative, not alarming
- Direct frustration at rights holders/SoundCloud, not InfraBooth
- Never apologize (no "Sorry, we couldn't...")

**Good examples:**
- "Unavailable in your region"
- "Geographic restriction by rights holder"
- "This track isn't available in your country"

**Bad examples:**
- "Sorry, we failed to download this track"
- "Error: Track blocked"
- "Download error: geo-restriction"

[Source: ux-design-specification.md#Graceful Failure, Error Transparency as Trust]

### Graceful Error Handling Pattern (FR19)

The download queue MUST continue processing after individual failures:

```rust
// In download/queue.rs (pseudo-code)
for track in playlist.tracks {
    match download_track(&track).await {
        Ok(_) => emit_status(&track.id, "complete"),
        Err(e) if e.is_geo_blocked() => {
            // Log for debugging
            log::info!("Track {} geo-blocked", track.id);

            // Emit failure status with GEO_BLOCKED code
            emit_status(&track.id, "failed", Some(GeoBlockedError));

            // Continue to next track - DO NOT break or panic
            continue;
        }
        Err(e) => {
            emit_status(&track.id, "failed", Some(e.into()));
            continue;
        }
    }
}
```

[Source: project-context.md#IPC Payload Structure, epics.md#FR19, NFR9]

### IPC Event Payload for Geo-Blocked Tracks

```typescript
// download-progress event for geo-blocked track
{
  trackId: "track_123",
  status: "failed",
  percent: 0,
  error: {
    code: "GEO_BLOCKED",
    message: "Geographic restriction by rights holder"
  }
}
```

[Source: project-context.md#IPC Payload Structure]

### Warning Icon Usage

Use warning icon (AlertTriangle) for geo-blocked tracks, NOT error icon (XCircle):

```typescript
import { AlertTriangle, XCircle, CheckCircle, Loader2, Clock } from 'lucide-react';

const getStatusIcon = (status: TrackStatus, error?: TrackError) => {
  if (status === 'failed') {
    // Use warning icon for external failures (geo-block, rate limit)
    if (error?.code === 'GEO_BLOCKED' || error?.code === 'RATE_LIMITED') {
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
    // Use error icon for app-related failures
    return <XCircle className="h-4 w-4 text-rose-500" />;
  }
  // ... other status icons
};
```

[Source: ux-design-specification.md#Feedback Patterns]

### Tooltip vs Expandable Details

Provide both interaction patterns for accessibility:

1. **Tooltip** - For desktop users with hover capability
2. **Expandable details** - For touch devices and keyboard users

Detection approach:
```typescript
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// In TrackCard
{isGeoBlockedError(error) && (
  isTouchDevice
    ? <GeoBlockDetails />
    : <GeoBlockTooltip><TrackStatusBadge {...props} /></GeoBlockTooltip>
)}
```

[Source: ux-design-specification.md#Accessibility]

### Component Structure

```
src/components/features/download/
├── TrackCard.tsx              # Parent card (from Story 5.1) - UPDATE
├── TrackStatusIcon.tsx        # Icon component (from Story 5.2) - UPDATE
├── TrackStatusLabel.tsx       # Text label (from Story 5.2) - UPDATE
├── TrackStatusBadge.tsx       # Icon + Label (from Story 5.2)
├── GeoBlockTooltip.tsx        # NEW - Tooltip for geo-block details
└── GeoBlockDetails.tsx        # NEW - Expandable details for touch

src/lib/
└── errorMessages.ts           # Error message utilities - UPDATE
```

[Source: architecture/project-structure-boundaries.md#Component Organization]

### i18n Key Structure

Following project conventions for error messages:

```json
{
  "errors": {
    "geoBlocked": "Unavailable in your region",
    "geoBlockedDetail": "Geographic restriction by rights holder",
    "geoBlockedNoRetry": "This track will not retry automatically",
    "trackUnavailable": "Track unavailable",
    "trackUnavailableDetail": "This track may have been removed or made private",
    "downloadFailed": "Download failed",
    "conversionFailed": "Conversion failed",
    "networkError": "Network error",
    "rateLimited": "Rate limited - will retry",
    "showDetails": "Show details"
  }
}
```

[Source: project-context.md#react-i18next, architecture/implementation-patterns-consistency-rules.md]

### Shadcn/ui Components to Use

Search Shadcn registry for these components before implementation:

- `Tooltip` - For displaying geo-block detail message on hover
- `TooltipTrigger` - Wraps the status badge
- `TooltipContent` - Contains the detail message
- `TooltipProvider` - Required wrapper for tooltip functionality
- `Collapsible` - For expandable details on touch devices
- `CollapsibleTrigger` - Toggle for expanding
- `CollapsibleContent` - Contains expanded details

[Source: project-context.md#Shadcn/ui Requirement]

### Anti-Patterns to Avoid

- Do NOT use apologetic language ("Sorry", "We couldn't", "Unfortunately")
- Do NOT blame the app for geo-restrictions - blame rights holders/SoundCloud
- Do NOT create custom error codes - use `GEO_BLOCKED` exactly
- Do NOT crash or halt queue on geo-blocked tracks - continue processing (FR19)
- Do NOT use error color (rose) for geo-block - use warning color (amber)
- Do NOT hardcode error messages - use i18n translation keys
- Do NOT show technical error details to users (HTTP codes, raw yt-dlp output)
- Do NOT use default exports - use named exports
- Do NOT use alarming language or exclamation marks in error messages

[Source: project-context.md#Anti-Patterns to Avoid]

### Geo-Block Detection in Rust Backend

Parse yt-dlp stderr output to detect geo-restrictions:

```rust
// In download/track.rs
fn detect_geo_block(stderr: &str) -> bool {
    let patterns = [
        "not available in your country",
        "geo restricted",
        "geo-restricted",
        "not available in your region",
        "blocked in your country",
        "not available in your location",
        "is not available for playback",
    ];

    let stderr_lower = stderr.to_lowercase();
    patterns.iter().any(|p| stderr_lower.contains(p))
}

// Usage in download flow
match download_track(&track).await {
    Err(e) => {
        let is_geo_blocked = detect_geo_block(&e.stderr);
        let error_code = if is_geo_blocked { "GEO_BLOCKED" } else { "DOWNLOAD_FAILED" };
        // ... emit error with appropriate code
    }
}
```

[Source: architecture/technical-approach-implementation-strategy.md#Error Handling]

### Testing Checklist

- [ ] `isGeoBlockedError` returns true for error with code `GEO_BLOCKED`
- [ ] `isGeoBlockedError` returns false for error with code `DOWNLOAD_FAILED`
- [ ] `isGeoBlockedError` returns false for error with code `NETWORK_ERROR`
- [ ] `isGeoBlockedError` returns false for undefined error
- [ ] TrackStatusIcon renders AlertTriangle icon for geo-blocked status
- [ ] TrackStatusIcon uses `text-amber-500` class for geo-blocked status
- [ ] TrackStatusIcon has aria-label "Geographic restriction warning"
- [ ] TrackStatusLabel shows "Unavailable in your region" for geo-blocked
- [ ] TrackStatusLabel uses amber text color for geo-blocked
- [ ] GeoBlockTooltip renders "Geographic restriction by rights holder"
- [ ] GeoBlockTooltip renders "This track will not retry automatically"
- [ ] GeoBlockTooltip is keyboard accessible (appears on focus)
- [ ] GeoBlockDetails expands/collapses on click
- [ ] GeoBlockDetails is keyboard accessible
- [ ] TrackCard shows tooltip on hover for geo-blocked tracks (desktop)
- [ ] TrackCard shows expandable details for geo-blocked tracks (touch)
- [ ] Download queue continues after geo-blocked track
- [ ] Next track starts immediately after geo-block failure
- [ ] No application crash on geo-blocked track
- [ ] No application hang on geo-blocked track
- [ ] Screen reader announces "Unavailable in your region" status
- [ ] English translations render correctly
- [ ] French translations render correctly
- [ ] Multiple geo-blocked tracks display consistently
- [ ] Rust backend correctly detects geo-block from yt-dlp stderr
- [ ] IPC event contains correct GEO_BLOCKED error code

### Dependencies

This story depends on:
- Story 5.1: Create Track List Component (TrackCard exists)
- Story 5.2: Implement Per-Track Status Display (TrackStatusIcon, TrackStatusLabel, TrackStatusBadge exist)
- Story 4.3: Implement Track Download Command (download error handling exists)
- Story 4.6: Implement Download Queue Processing (queue continuation logic exists)
- Story 1.5: Configure react-i18next Foundation (i18n setup exists)

This story is related to:
- Story 7.2: Display Unavailable Track Messages (similar pattern, different error type)
- Story 7.3: Create Error Panel Component (aggregates all failed tracks including geo-blocked)

### References

- [Source: ux-design-specification.md#Graceful Failure]
- [Source: ux-design-specification.md#Error Transparency as Trust]
- [Source: ux-design-specification.md#Feedback Patterns]
- [Source: ux-design-specification.md#Accessibility]
- [Source: project-context.md#Error Codes]
- [Source: project-context.md#IPC Payload Structure]
- [Source: project-context.md#Anti-Patterns to Avoid]
- [Source: epics.md#Story 7.1]
- [Source: prd/functional-requirements.md#FR16]
- [Source: prd/functional-requirements.md#FR19]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

