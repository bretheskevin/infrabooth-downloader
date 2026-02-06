# Story 2.3: Create Sign-In UI Component

Status: review

## Story

As a **user**,
I want **a clear "Sign in with SoundCloud" button**,
so that **I can authenticate to access my Go+ subscription benefits**.

## Acceptance Criteria

1. **Given** the app is launched and user is not authenticated
   **When** viewing the main interface
   **Then** a "Sign in with SoundCloud" button is prominently displayed
   **And** the button uses the primary button style (solid indigo per UX spec)

2. **Given** the sign-in button is displayed
   **When** the user clicks it
   **Then** "Opening browser..." feedback is shown immediately
   **And** the system default browser opens to SoundCloud's authorization page
   **And** the button enters a loading state

3. **Given** the browser opens
   **When** the user views the authorization page
   **Then** they see the real SoundCloud domain (trust signal)
   **And** they can authorize or cancel

4. **Given** the user cancels authorization
   **When** returning to the app
   **Then** the sign-in button returns to its default state
   **And** no error message is shown (user-initiated cancel)

5. **Given** authentication succeeds
   **When** the app receives the callback
   **Then** the sign-in button is replaced with the user identity display
   **And** the transition is smooth (no flash or jarring change)

## Tasks / Subtasks

- [x] Task 1: Create SignInButton component (AC: #1, #2)
  - [x] 1.1 Create `src/components/features/auth/SignInButton.tsx`:
    ```typescript
    import { useState } from 'react';
    import { useTranslation } from 'react-i18next';
    import { Button } from '@/components/ui/button';
    import { startOAuth } from '@/lib/auth';
    import { Loader2 } from 'lucide-react';

    export function SignInButton() {
      const { t } = useTranslation();
      const [isLoading, setIsLoading] = useState(false);

      const handleSignIn = async () => {
        setIsLoading(true);
        try {
          await startOAuth();
        } catch (error) {
          console.error('OAuth start failed:', error);
          setIsLoading(false);
        }
      };

      return (
        <Button
          onClick={handleSignIn}
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('auth.openingBrowser')}
            </>
          ) : (
            t('auth.signIn')
          )}
        </Button>
      );
    }
    ```
  - [x] 1.2 Add lucide-react for icons: `npm install lucide-react`

- [x] Task 2: Create AuthContainer component (AC: #1, #5)
  - [x] 2.1 Create `src/components/features/auth/AuthContainer.tsx`:
    ```typescript
    import { useAuthStore } from '@/stores/authStore';
    import { SignInButton } from './SignInButton';
    import { UserBadge } from './UserBadge';

    export function AuthContainer() {
      const isSignedIn = useAuthStore((state) => state.isSignedIn);

      return isSignedIn ? <UserBadge /> : <SignInButton />;
    }
    ```
  - [x] 2.2 This switches between sign-in button and user badge

- [x] Task 3: Implement auth state listener (AC: #4, #5)
  - [x] 3.1 Create `src/hooks/useAuthStateListener.ts`:
    ```typescript
    import { useEffect } from 'react';
    import { listen } from '@tauri-apps/api/event';
    import { useAuthStore } from '@/stores/authStore';

    interface AuthStatePayload {
      isSignedIn: boolean;
      username: string | null;
    }

    export function useAuthStateListener() {
      const setAuth = useAuthStore((state) => state.setAuth);

      useEffect(() => {
        const unlisten = listen<AuthStatePayload>('auth-state-changed', (event) => {
          setAuth(event.payload.isSignedIn, event.payload.username);
        });

        return () => {
          unlisten.then((fn) => fn());
        };
      }, [setAuth]);
    }
    ```
  - [x] 3.2 Call `useAuthStateListener()` in App.tsx

- [x] Task 4: Wire up deep link to OAuth completion (AC: #5)
  - [x] 4.1 Update `src/hooks/useAuthCallback.ts` to call `completeOAuth`:
    ```typescript
    import { useCallback } from 'react';
    import { completeOAuth } from '@/lib/auth';
    import { useAuthCallback as useDeepLinkCallback } from './useAuthCallback';

    export function useOAuthFlow() {
      const handleCallback = useCallback(async (code: string) => {
        try {
          await completeOAuth(code);
        } catch (error) {
          console.error('OAuth completion failed:', error);
        }
      }, []);

      useDeepLinkCallback(handleCallback);
    }
    ```
  - [x] 4.2 Call `useOAuthFlow()` in App.tsx

- [x] Task 5: Handle cancel/timeout (AC: #4)
  - [x] 5.1 Add timeout handling (reset loading after 5 minutes):
    ```typescript
    useEffect(() => {
      if (isLoading) {
        const timeout = setTimeout(() => {
          setIsLoading(false);
        }, 5 * 60 * 1000); // 5 minutes
        return () => clearTimeout(timeout);
      }
    }, [isLoading]);
    ```
  - [x] 5.2 Listen for window focus to reset state if user cancels

- [x] Task 6: Update Header to include AuthContainer (AC: #1)
  - [x] 6.1 Update `src/components/layout/Header.tsx`:
    ```typescript
    import { AuthContainer } from '@/components/features/auth/AuthContainer';

    export function Header() {
      const { t } = useTranslation();
      return (
        <header className="flex items-center justify-between px-4 py-3 border-b">
          <h1 className="text-lg font-semibold">{t('app.title')}</h1>
          <AuthContainer />
        </header>
      );
    }
    ```

- [x] Task 7: Create placeholder UserBadge (AC: #5)
  - [x] 7.1 Create `src/components/features/auth/UserBadge.tsx` (placeholder):
    ```typescript
    import { useAuthStore } from '@/stores/authStore';

    export function UserBadge() {
      const username = useAuthStore((state) => state.username);
      return (
        <div className="text-sm text-muted-foreground">
          {username ?? 'Signed in'}
        </div>
      );
    }
    ```
  - [x] 7.2 Full implementation in Story 2.4

## Dev Notes

### Button Styling

**Primary button style per UX spec:**
- Background: `#6366F1` (indigo-600)
- Hover: `#4F46E5` (indigo-700)
- Text: White
- Tailwind: `bg-indigo-600 hover:bg-indigo-700 text-white`

[Source: ux-design-specification.md#Button Hierarchy]

### Loading State UX

Per UX spec, the sign-in flow feedback:
1. Click button → "Opening browser..." with spinner
2. Browser opens to real SoundCloud domain
3. User authorizes (or cancels)
4. Return to app → smooth transition

The loading state should feel responsive, not stuck.
[Source: ux-design-specification.md#Experience Mechanics]

### Trust Moment

This is the **defining experience** of the app. Users see:
- Real SoundCloud domain (not embedded webview)
- Standard browser security indicators
- Their password never enters the app

This builds trust before any download happens.
[Source: ux-design-specification.md#The Trust Moment]

### Event Flow

```
User clicks "Sign in"
    ↓
startOAuth() → Tauri command
    ↓
Browser opens to SoundCloud
    ↓
User authorizes
    ↓
SoundCloud redirects to sc-downloader://auth/callback?code=...
    ↓
Deep link handler → auth-callback event
    ↓
completeOAuth(code) → token exchange
    ↓
auth-state-changed event
    ↓
AuthContainer switches to UserBadge
```

### File Structure After This Story

```
src/
├── components/
│   ├── features/
│   │   └── auth/
│   │       ├── SignInButton.tsx   # Sign-in button with loading
│   │       ├── AuthContainer.tsx  # Switches button/badge
│   │       └── UserBadge.tsx      # Placeholder (full in 2.4)
│   └── layout/
│       └── Header.tsx             # Updated with AuthContainer
├── hooks/
│   ├── useAuthCallback.ts         # From 2.1
│   ├── useAuthStateListener.ts    # Listen for auth changes
│   └── useOAuthFlow.ts            # Wire callback to completion
```

### Icon Library

Use `lucide-react` for icons (Shadcn/ui's default):
```typescript
import { Loader2 } from 'lucide-react';
// Spinner: <Loader2 className="animate-spin" />
```

### Accessibility

- Button must be keyboard accessible (Tab + Enter)
- Loading state announced to screen readers
- Focus visible on button
- Disabled state prevents double-clicks

[Source: ux-design-specification.md#Accessibility]

### What This Story Does NOT Include

- Full UserBadge with username + Go+ badge (Story 2.4)
- Token persistence (Story 2.5)
- Sign-out functionality (Story 2.6)
- Error display for auth failures (handled silently for now)

### Translation Keys Used

```json
{
  "auth": {
    "signIn": "Sign in with SoundCloud",
    "openingBrowser": "Opening browser..."
  }
}
```
These were added in Story 1.5.

### Anti-Patterns to Avoid

- Do NOT use embedded webview — use system browser
- Do NOT show error on user-initiated cancel
- Do NOT block UI during OAuth — loading state only on button
- Do NOT use default exports — use named exports

### Testing the Result

After completing all tasks:
1. Sign-in button visible when not authenticated
2. Clicking button shows "Opening browser..." with spinner
3. Browser opens to SoundCloud authorization page
4. After authorization, button transitions to UserBadge
5. Cancel/timeout resets button to default state
6. Keyboard navigation works (Tab to button, Enter to activate)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3]
- [Source: ux-design-specification.md#The Trust Moment]
- [Source: ux-design-specification.md#Button Hierarchy]
- [Source: ux-design-specification.md#Experience Mechanics]
- [Source: architecture/project-structure-boundaries.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None - implementation completed without issues.

### Completion Notes List

- Task 1: Created SignInButton with loading state, timeout handling (5min), and window focus reset. 8 unit tests covering click behavior, loading states, styling, accessibility, and error handling.
- Task 2: Created AuthContainer that switches between SignInButton and UserBadge based on auth state. 4 unit tests.
- Task 3: Created useAuthStateListener hook that subscribes to 'auth-state-changed' Tauri events and updates the auth store. 4 unit tests.
- Task 4: Created useOAuthFlow hook that wires useAuthCallback to completeOAuth for token exchange. 3 unit tests.
- Task 5: Timeout and window focus reset integrated into SignInButton component.
- Task 6: Updated Header to include AuthContainer. Added 2 new tests for auth states in Header.
- Task 7: Created placeholder UserBadge that displays username or fallback text. 3 unit tests.
- lucide-react was already installed (v0.563.0).
- All 133 tests pass. TypeScript typecheck passes. Frontend build succeeds.

### File List

**New Files:**
- src/components/features/auth/SignInButton.tsx
- src/components/features/auth/SignInButton.test.tsx
- src/components/features/auth/AuthContainer.tsx
- src/components/features/auth/AuthContainer.test.tsx
- src/components/features/auth/UserBadge.tsx
- src/components/features/auth/UserBadge.test.tsx
- src/hooks/useAuthStateListener.ts
- src/hooks/useAuthStateListener.test.ts
- src/hooks/useOAuthFlow.ts
- src/hooks/useOAuthFlow.test.ts

**Modified Files:**
- src/App.tsx
- src/App.test.tsx
- src/components/layout/Header.tsx
- src/components/layout/Header.test.tsx
- src/hooks/index.ts

## Change Log

- 2026-02-06: Story 2.3 implementation complete - Sign-in UI with loading states, auth state listener, OAuth flow wiring, and Header integration

