# Story 3.3: Display Validation Feedback

Status: review

## Story

As a **user**,
I want **instant feedback when I paste a URL**,
so that **I know immediately if the URL is valid**.

## Acceptance Criteria

1. **Given** a URL is pasted
   **When** validation is in progress
   **Then** a subtle loading indicator appears (spinner or pulse)
   **And** the input border indicates processing state

2. **Given** validation succeeds
   **When** the result is received
   **Then** the input border briefly shows green (success)
   **And** the loading indicator is replaced with a checkmark
   **And** the feedback appears within 500ms of paste (UX-1)

3. **Given** validation fails
   **When** the error is received
   **Then** the input border shows red (error)
   **And** an error message appears below the input (inline, not modal)
   **And** the error includes the specific reason (FR15)
   **And** a hint for recovery is shown

4. **Given** an error is displayed
   **When** the user clears the input or pastes a new URL
   **Then** the error message clears immediately
   **And** the input returns to neutral state

5. **Given** validation feedback is shown
   **When** using a screen reader
   **Then** the validation result is announced (UX-13)

## Tasks / Subtasks

- [x] Task 1: Create ValidationFeedback component (AC: #2, #3)
  - [x] 1.1 Create `src/components/features/download/ValidationFeedback.tsx`:
    ```typescript
    import { useTranslation } from 'react-i18next';
    import { AlertCircle, CheckCircle2 } from 'lucide-react';
    import type { ValidationResult } from '@/types/url';
    import { cn } from '@/lib/utils';

    interface ValidationFeedbackProps {
      result: ValidationResult | null;
      isValidating: boolean;
    }

    export function ValidationFeedback({ result, isValidating }: ValidationFeedbackProps) {
      const { t } = useTranslation();

      if (isValidating) {
        return null; // Loading state is on input border
      }

      if (!result) {
        return null;
      }

      if (result.valid) {
        return (
          <div
            className="flex items-center gap-2 text-sm text-emerald-600 mt-2"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {result.urlType === 'playlist'
                ? t('download.validPlaylist')
                : t('download.validTrack')}
            </span>
          </div>
        );
      }

      // Error state
      return (
        <div
          className="mt-2 space-y-1"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{result.error?.message}</span>
          </div>
          {result.error?.hint && (
            <p className="text-sm text-muted-foreground pl-6">
              {result.error.hint}
            </p>
          )}
        </div>
      );
    }
    ```

- [x] Task 2: Create styled input wrapper with state borders (AC: #1, #2, #3)
  - [x] 2.1 Update `UrlInput.tsx` to accept validation state:
    ```typescript
    interface UrlInputProps {
      onUrlChange: (url: string) => void;
      disabled?: boolean;
      isValidating?: boolean;
      validationResult?: ValidationResult | null;
      className?: string;
    }

    export function UrlInput({
      onUrlChange,
      disabled,
      isValidating,
      validationResult,
      className
    }: UrlInputProps) {
      const { t } = useTranslation();
      const [value, setValue] = useState('');

      const borderClass = useMemo(() => {
        if (isValidating) return 'border-indigo-400 ring-1 ring-indigo-400';
        if (!validationResult) return '';
        if (validationResult.valid) return 'border-emerald-500 ring-1 ring-emerald-500';
        return 'border-red-500 ring-1 ring-red-500';
      }, [isValidating, validationResult]);

      // ... rest of component
      return (
        <div className="relative">
          <Input
            // ... existing props
            className={cn(
              'h-12 text-base transition-colors duration-200',
              borderClass,
              className
            )}
          />
          {isValidating && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            </div>
          )}
        </div>
      );
    }
    ```

- [x] Task 3: Update DownloadSection to pass validation state (AC: #1-#4)
  - [x] 3.1 Update `DownloadSection.tsx`:
    ```typescript
    import { ValidationFeedback } from './ValidationFeedback';

    export function DownloadSection() {
      const isSignedIn = useAuthStore((state) => state.isSignedIn);
      const [url, setUrl] = useState('');
      const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
      const [isValidating, setIsValidating] = useState(false);

      const debouncedUrl = useDebounce(url, 300);

      useEffect(() => {
        if (!debouncedUrl) {
          setValidationResult(null);
          return;
        }

        setIsValidating(true);
        validateUrl(debouncedUrl)
          .then(setValidationResult)
          .finally(() => setIsValidating(false));
      }, [debouncedUrl]);

      const handleUrlChange = useCallback((newUrl: string) => {
        setUrl(newUrl);
        if (!newUrl) {
          setValidationResult(null);
        }
      }, []);

      return (
        <section className="space-y-4">
          <div className="relative">
            <UrlInput
              onUrlChange={handleUrlChange}
              disabled={!isSignedIn}
              isValidating={isValidating}
              validationResult={validationResult}
            />
            {!isSignedIn && <AuthPrompt />}
          </div>
          <ValidationFeedback
            result={validationResult}
            isValidating={isValidating}
          />
          {/* Preview will be added in Story 3.4 */}
        </section>
      );
    }
    ```

- [x] Task 4: Add success state auto-dismiss (AC: #2)
  - [x] 4.1 Success border should fade after 2 seconds:
    ```typescript
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
      if (validationResult?.valid) {
        setShowSuccess(true);
        const timer = setTimeout(() => setShowSuccess(false), 2000);
        return () => clearTimeout(timer);
      }
    }, [validationResult]);
    ```

- [x] Task 5: Add accessibility announcements (AC: #5)
  - [x] 5.1 Use `role="status"` for success
  - [x] 5.2 Use `role="alert"` for errors
  - [x] 5.3 Use `aria-live="polite"` for non-critical updates
  - [x] 5.4 Use `aria-live="assertive"` for errors

- [x] Task 6: Add translation keys (AC: #2, #3)
  - [x] 6.1 Add to `en.json`:
    ```json
    "download": {
      "validPlaylist": "Valid playlist URL",
      "validTrack": "Valid track URL",
      "validating": "Checking URL..."
    }
    ```
  - [x] 6.2 Add to `fr.json`:
    ```json
    "download": {
      "validPlaylist": "URL de playlist valide",
      "validTrack": "URL de piste valide",
      "validating": "Vérification de l'URL..."
    }
    ```

- [x] Task 7: Test visual feedback timing (AC: #2)
  - [x] 7.1 Verify feedback appears within 500ms of paste
  - [x] 7.2 Verify loading indicator shows during validation
  - [x] 7.3 Verify transitions are smooth

## Dev Notes

### Feedback Colors

| State | Border Color | Icon Color | Tailwind |
|-------|--------------|------------|----------|
| Neutral | Default | - | `border-input` |
| Validating | Indigo | Indigo | `border-indigo-400` |
| Success | Emerald | Emerald | `border-emerald-500` |
| Error | Red | Red | `border-red-500` |

[Source: ux-design-specification.md#Feedback Patterns]

### Timing Requirements

- Validation must complete within 500ms (UX-1)
- Debounce: 300ms (to avoid excessive calls)
- Success border fade: 2 seconds
- Transitions: 200ms (`duration-200`)

[Source: ux-design-specification.md#Effortless Interactions]

### Error Display Pattern

Errors display inline below the input, never as modals:
```
┌─────────────────────────────────────┐
│ [Invalid URL here]                  │ ← Red border
└─────────────────────────────────────┘
⚠ Not a SoundCloud URL                  ← Error message
  Paste a link from soundcloud.com      ← Hint (muted)
```

[Source: ux-design-specification.md#Input Validation]

### Screen Reader Announcements

| State | Announcement | ARIA |
|-------|--------------|------|
| Validating | (none) | - |
| Success | "Valid playlist URL" | `role="status"` |
| Error | "Not a SoundCloud URL" | `role="alert"` |

[Source: ux-design-specification.md#Screen Reader Support]

### File Structure After This Story

```
src/
├── components/
│   ├── features/
│   │   └── download/
│   │       ├── UrlInput.tsx          # Updated with state borders
│   │       ├── DownloadSection.tsx   # Updated with validation state
│   │       ├── ValidationFeedback.tsx # New - feedback display
│   │       └── AuthPrompt.tsx
```

### State Flow

```
User pastes URL
    ↓
handleUrlChange(url) → setUrl(url)
    ↓
useDebounce(url, 300) → debouncedUrl
    ↓
useEffect triggers → setIsValidating(true)
    ↓
validateUrl(debouncedUrl)
    ↓
setValidationResult(result) → setIsValidating(false)
    ↓
UrlInput border updates
ValidationFeedback renders
Screen reader announces
```

### What This Story Does NOT Include

- Playlist preview card (Story 3.4)
- Download button (Story 3.4)
- Track metadata display (Story 3.5)

This story provides feedback for validation; preview comes next.

### Anti-Patterns to Avoid

- Do NOT use modals for validation errors — inline only
- Do NOT use color alone for status — include icons
- Do NOT skip screen reader announcements
- Do NOT leave success state indefinitely — auto-fade

### Testing the Result

After completing all tasks:
1. Pasting valid playlist URL shows green border briefly
2. Pasting invalid URL shows red border and error message
3. Error includes hint text below message
4. Clearing input removes error immediately
5. Loading spinner shows during validation
6. Screen reader announces validation results
7. All feedback appears within 500ms

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3]
- [Source: ux-design-specification.md#Input Validation]
- [Source: ux-design-specification.md#Feedback Patterns]
- [Source: ux-design-specification.md#Screen Reader Support]
- [Source: ux-design-specification.md#Effortless Interactions]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None

### Completion Notes List

- Created ValidationFeedback component with success/error states, icons, and accessibility attributes
- Updated UrlInput component with validation state borders (indigo=validating, emerald=success, red=error) and loading spinner
- Integrated ValidationFeedback into DownloadSection with debounced validation
- Implemented success border auto-dismiss after 2 seconds
- Added translation keys for English and French (validPlaylist, validTrack, validating)
- All accessibility requirements met: role="status" + aria-live="polite" for success, role="alert" + aria-live="assertive" for errors
- All 217 tests pass with no regressions
- Frontend build successful

### File List

- src/components/features/download/ValidationFeedback.tsx (new)
- src/components/features/download/ValidationFeedback.test.tsx (new)
- src/components/features/download/UrlInput.tsx (modified)
- src/components/features/download/UrlInput.test.tsx (modified)
- src/components/features/download/DownloadSection.tsx (modified)
- src/components/features/download/DownloadSection.test.tsx (modified)
- src/locales/en.json (modified)
- src/locales/fr.json (modified)

### Change Log

- 2026-02-09: Implemented Story 3.3 - Display Validation Feedback (all 7 tasks complete)

