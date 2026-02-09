# Story 3.1: Create URL Input Component

Status: review

## Story

As a **user**,
I want **a prominent input field to paste SoundCloud URLs**,
so that **I can easily start downloading my playlists or tracks**.

## Acceptance Criteria

1. **Given** the user is signed in
   **When** viewing the main interface
   **Then** a URL input field is prominently displayed below the header
   **And** the input has placeholder text: "Paste a SoundCloud playlist or track URL"
   **And** the input uses the full available width (flex layout)

2. **Given** the URL input is displayed
   **When** the user focuses the field
   **Then** a visible focus ring appears (UX-11)
   **And** the focus state is clear and accessible

3. **Given** the URL input exists
   **When** the user pastes content
   **Then** the paste event is captured immediately
   **And** validation is triggered automatically (no manual "submit" needed)

4. **Given** the input field
   **When** navigating with keyboard
   **Then** Tab moves focus to/from the input correctly
   **And** the input supports standard text editing shortcuts (Ctrl+V, Cmd+V)

5. **Given** the user is not signed in
   **When** viewing the main interface
   **Then** the URL input is visible but shows a hint to sign in
   **And** the input may be disabled or show overlay prompt

## Tasks / Subtasks

- [x] Task 1: Create UrlInput component (AC: #1, #2)
  - [x] 1.1 Create `src/components/features/download/UrlInput.tsx`:
    ```typescript
    import { useState, useCallback } from 'react';
    import { useTranslation } from 'react-i18next';
    import { Input } from '@/components/ui/input';
    import { cn } from '@/lib/utils';

    interface UrlInputProps {
      onUrlChange: (url: string) => void;
      disabled?: boolean;
      className?: string;
    }

    export function UrlInput({ onUrlChange, disabled, className }: UrlInputProps) {
      const { t } = useTranslation();
      const [value, setValue] = useState('');

      const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        onUrlChange(newValue);
      }, [onUrlChange]);

      const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
        // Let the change event handle it, but we can add analytics here
        const pastedText = e.clipboardData.getData('text');
        // Validation will be triggered by onChange
      }, []);

      return (
        <Input
          type="url"
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder={t('download.pasteUrl')}
          disabled={disabled}
          className={cn(
            'h-12 text-base',
            'focus-visible:ring-2 focus-visible:ring-indigo-500',
            className
          )}
          aria-label={t('download.pasteUrl')}
        />
      );
    }
    ```
  - [x] 1.2 Ensure Shadcn Input component exists (from Story 1.2)

- [x] Task 2: Create DownloadSection container (AC: #1)
  - [x] 2.1 Create `src/components/features/download/DownloadSection.tsx`:
    ```typescript
    import { useState, useCallback } from 'react';
    import { useAuthStore } from '@/stores/authStore';
    import { UrlInput } from './UrlInput';
    import { AuthPrompt } from './AuthPrompt';

    export function DownloadSection() {
      const isSignedIn = useAuthStore((state) => state.isSignedIn);
      const [url, setUrl] = useState('');

      const handleUrlChange = useCallback((newUrl: string) => {
        setUrl(newUrl);
        // Validation will be added in Story 3.2
      }, []);

      return (
        <section className="space-y-4">
          <div className="relative">
            <UrlInput
              onUrlChange={handleUrlChange}
              disabled={!isSignedIn}
            />
            {!isSignedIn && <AuthPrompt />}
          </div>
          {/* Preview and progress will be added in later stories */}
        </section>
      );
    }
    ```

- [x] Task 3: Create AuthPrompt overlay (AC: #5)
  - [x] 3.1 Create `src/components/features/download/AuthPrompt.tsx`:
    ```typescript
    import { useTranslation } from 'react-i18next';

    export function AuthPrompt() {
      const { t } = useTranslation();

      return (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
          <p className="text-sm text-muted-foreground">
            {t('download.signInRequired')}
          </p>
        </div>
      );
    }
    ```
  - [x] 3.2 Add translation key: `"signInRequired": "Sign in to download"`

- [x] Task 4: Update App layout to include DownloadSection (AC: #1)
  - [x] 4.1 Update `App.tsx`:
    ```typescript
    import { AppLayout } from '@/components/layout/AppLayout';
    import { DownloadSection } from '@/components/features/download/DownloadSection';

    export function App() {
      // ... hooks

      return (
        <AppLayout>
          <DownloadSection />
        </AppLayout>
      );
    }
    ```

- [x] Task 5: Style input for prominence (AC: #1, #2)
  - [x] 5.1 Apply larger height: `h-12` (48px)
  - [x] 5.2 Apply larger text: `text-base` (16px)
  - [x] 5.3 Apply visible focus ring: `focus-visible:ring-2 focus-visible:ring-indigo-500`
  - [x] 5.4 Full width via flex parent

- [x] Task 6: Add accessibility attributes (AC: #2, #4)
  - [x] 6.1 Add `aria-label` for screen readers
  - [x] 6.2 Ensure `type="url"` for semantic correctness
  - [x] 6.3 Test Tab navigation order
  - [x] 6.4 Test with screen reader

- [x] Task 7: Add translation keys (AC: #1, #5)
  - [x] 7.1 Add to `en.json`:
    ```json
    "download": {
      "pasteUrl": "Paste a SoundCloud playlist or track URL",
      "signInRequired": "Sign in to download"
    }
    ```
  - [x] 7.2 Add to `fr.json`:
    ```json
    "download": {
      "pasteUrl": "Collez une URL de playlist ou de piste SoundCloud",
      "signInRequired": "Connectez-vous pour télécharger"
    }
    ```

## Dev Notes

### Core Experience

This is the **primary interaction point** of the app. The URL input must feel:
- Prominent (large, centered)
- Responsive (instant feedback on paste)
- Trustworthy (clear, accessible)

"Paste URL → Download → Own your music" is the core experience.
[Source: ux-design-specification.md#Defining Experience]

### Input Styling

| Property | Value | Rationale |
|----------|-------|-----------|
| Height | 48px (`h-12`) | Prominent, easy to target |
| Font size | 16px (`text-base`) | Readable, prevents iOS zoom |
| Width | Full available | Flex layout, prominent |
| Focus ring | Indigo, 2px | Visible, matches brand |

[Source: ux-design-specification.md#Effortless Interactions]

### Layout Position

```
┌─────────────────────────────────────┐
│ Header                              │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Paste a SoundCloud playlist...  │ │  ← URL Input (prominent)
│ └─────────────────────────────────┘ │
│                                     │
│ (Preview will appear here)          │
│                                     │
└─────────────────────────────────────┘
```

[Source: ux-design-specification.md#Layout Structure]

### Paste Detection

The component captures paste via:
1. `onPaste` event for immediate detection
2. `onChange` event for the actual value

Validation is triggered on change, not on a separate "submit" action. This provides the instant feedback users expect.
[Source: ux-design-specification.md#UX Pattern Analysis]

### Auth-Gated Input

Per the UX spec and NFRs, authentication is **optional** but encouraged:
- Input visible when signed out (builds trust)
- Overlay prompts sign-in
- Input disabled when signed out (prevents confusion)

Alternative: Input enabled but validation returns "sign in required" error.
[Source: project-context.md#Authentication Behavior]

### File Structure After This Story

```
src/
├── components/
│   ├── features/
│   │   └── download/
│   │       ├── UrlInput.tsx        # URL input field
│   │       ├── DownloadSection.tsx # Container component
│   │       └── AuthPrompt.tsx      # Sign-in overlay
│   └── ui/
│       └── input.tsx               # Shadcn input (should exist)
```

### Accessibility Requirements

- Focus ring visible (UX-11)
- Full keyboard navigation (UX-12)
- Screen reader announces placeholder
- `type="url"` for semantic HTML
- `aria-label` matches placeholder

[Source: ux-design-specification.md#Accessibility]

### What This Story Does NOT Include

- URL validation logic (Story 3.2)
- Validation feedback display (Story 3.3)
- Playlist preview (Story 3.4)
- Download button (Story 3.4)

This story creates the input component only; validation and feedback come next.

### Anti-Patterns to Avoid

- Do NOT require "Enter" or button click to validate — auto-validate on change
- Do NOT use small input — make it prominent
- Do NOT hide input when signed out — show with prompt
- Do NOT use default exports — use named exports

### Testing the Result

After completing all tasks:
1. URL input visible below header
2. Placeholder text displays correctly
3. Focus ring visible when focused
4. Paste triggers onChange callback
5. Tab navigation works correctly
6. When signed out, overlay prompts sign-in
7. Screen reader announces input purpose

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1]
- [Source: ux-design-specification.md#Defining Experience]
- [Source: ux-design-specification.md#Effortless Interactions]
- [Source: ux-design-specification.md#Accessibility]
- [Source: project-context.md#Authentication Behavior]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5)

### Debug Log References

None

### Completion Notes List

- Implemented UrlInput component with prominent styling (h-12, text-base, indigo focus ring)
- Created DownloadSection container with auth-gated functionality
- Created AuthPrompt overlay for signed-out users
- Installed Shadcn Input component via CLI
- Added signInRequired translation key to en.json and fr.json
- Updated App.tsx to render DownloadSection
- Updated App.test.tsx to verify URL input presence
- All 22 component tests passing
- Full test suite: 181 tests passing
- TypeScript strict mode: clean
- Frontend build: successful

### File List

- src/components/features/download/UrlInput.tsx (new)
- src/components/features/download/UrlInput.test.tsx (new)
- src/components/features/download/DownloadSection.tsx (new)
- src/components/features/download/DownloadSection.test.tsx (new)
- src/components/features/download/AuthPrompt.tsx (new)
- src/components/features/download/AuthPrompt.test.tsx (new)
- src/components/ui/input.tsx (new - Shadcn)
- src/locales/en.json (modified)
- src/locales/fr.json (modified)
- src/App.tsx (modified)
- src/App.test.tsx (modified)

## Change Log

- 2026-02-09: Story 3.1 implemented - URL input component with auth overlay and i18n support

