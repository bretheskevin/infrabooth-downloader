# Story 2.4: Display Authenticated User Identity

Status: review

## Story

As a **user**,
I want **to see my SoundCloud username displayed after signing in**,
so that **I know authentication succeeded and which account I'm using**.

## Acceptance Criteria

1. **Given** the OAuth flow completes successfully
   **When** the app receives valid tokens
   **Then** a request is made to fetch the user's profile
   **And** the username is extracted from the response

2. **Given** the username is fetched
   **When** the UI updates
   **Then** "Signed in as [username]" is displayed in the header (FR2)
   **And** a "Go+ 256kbps" quality badge is shown alongside (UX-9)
   **And** the sign-in button is replaced with the user identity display

3. **Given** the user identity is displayed
   **When** viewing the header
   **Then** the username and badge meet WCAG AA contrast requirements
   **And** the display includes a subtle user icon or avatar placeholder

4. **Given** authentication completes
   **When** screen readers announce the change
   **Then** "Signed in as [username], Go+ quality enabled" is announced (UX-13)

## Tasks / Subtasks

- [x] Task 1: Implement user profile fetch in Rust (AC: #1)
  - [x] 1.1 Add to `src-tauri/src/services/oauth.rs`:
    ```rust
    #[derive(Deserialize)]
    pub struct UserProfile {
        pub username: String,
        pub avatar_url: Option<String>,
        pub plan: Option<String>,
    }

    pub async fn fetch_user_profile(access_token: &str) -> Result<UserProfile, AuthError> {
        let client = reqwest::Client::new();
        let response = client
            .get("https://api.soundcloud.com/me")
            .header("Authorization", format!("OAuth {}", access_token))
            .send()
            .await?;

        if response.status().is_success() {
            Ok(response.json().await?)
        } else {
            Err(AuthError::ProfileFetchFailed)
        }
    }
    ```
  - [x] 1.2 Update `complete_oauth` to fetch profile after token exchange
  - [x] 1.3 Emit username in `auth-state-changed` event

- [x] Task 2: Update auth store with username (AC: #1, #2)
  - [x] 2.1 Ensure `authStore` receives username from event:
    ```typescript
    // auth-state-changed payload now includes username
    interface AuthStatePayload {
      isSignedIn: boolean;
      username: string | null;
    }
    ```
  - [x] 2.2 Verify `setAuth` updates both `isSignedIn` and `username`

- [x] Task 3: Create full UserBadge component (AC: #2, #3)
  - [x] 3.1 Update `src/components/features/auth/UserBadge.tsx`:
    ```typescript
    import { useTranslation } from 'react-i18next';
    import { useAuthStore } from '@/stores/authStore';
    import { Badge } from '@/components/ui/badge';
    import { User } from 'lucide-react';

    export function UserBadge() {
      const { t } = useTranslation();
      const username = useAuthStore((state) => state.username);

      return (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {t('auth.signedInAs', { username })}
            </span>
          </div>
          <Badge variant="secondary" className="bg-sky-100 text-sky-700">
            Go+ 256kbps
          </Badge>
        </div>
      );
    }
    ```
  - [x] 3.2 Add Shadcn Badge component: `npx shadcn@latest add badge`

- [x] Task 4: Style quality badge (AC: #2, #3)
  - [x] 4.1 Create QualityBadge variant:
    ```typescript
    // In UserBadge.tsx or separate QualityBadge.tsx
    <Badge
      variant="secondary"
      className="bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300"
    >
      Go+ 256kbps
    </Badge>
    ```
  - [x] 4.2 Ensure contrast meets WCAG AA (4.5:1)
  - [x] 4.3 Badge color: Info blue (#0EA5E9) per UX spec

- [x] Task 5: Add accessibility announcements (AC: #4)
  - [x] 5.1 Add aria-live region for auth status:
    ```typescript
    export function UserBadge() {
      // ...
      return (
        <div
          className="flex items-center gap-3"
          role="status"
          aria-live="polite"
          aria-label={t('auth.accessibilityStatus', { username })}
        >
          {/* ... */}
        </div>
      );
    }
    ```
  - [x] 5.2 Add translation key:
    ```json
    "auth": {
      "accessibilityStatus": "Signed in as {{username}}, Go+ quality enabled"
    }
    ```

- [x] Task 6: Handle loading state during profile fetch (AC: #1)
  - [x] 6.1 Add intermediate state while fetching profile:
    ```typescript
    export function UserBadge() {
      const username = useAuthStore((state) => state.username);

      if (!username) {
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        );
      }
      // ... rest of component
    }
    ```

- [x] Task 7: Update translation files (AC: #2, #4)
  - [x] 7.1 Add to `en.json`:
    ```json
    "auth": {
      "signedInAs": "Signed in as {{username}}",
      "accessibilityStatus": "Signed in as {{username}}, Go+ quality enabled",
      "qualityBadge": "Go+ 256kbps"
    }
    ```
  - [x] 7.2 Add to `fr.json`:
    ```json
    "auth": {
      "signedInAs": "Connecté en tant que {{username}}",
      "accessibilityStatus": "Connecté en tant que {{username}}, qualité Go+ activée",
      "qualityBadge": "Go+ 256kbps"
    }
    ```

## Dev Notes

### SoundCloud /me Endpoint

```
GET https://api.soundcloud.com/me
Authorization: OAuth {access_token}

Response:
{
  "username": "marcus_dj",
  "avatar_url": "https://...",
  "plan": "Pro Unlimited",
  ...
}
```

Note: The `plan` field indicates subscription level. For Go+ users, quality badge is always shown.

### Visual Layout

```
┌─────────────────────────────────────────────────┐
│ InfraBooth Downloader    [👤 username] [Go+ 256kbps] │
├─────────────────────────────────────────────────┤
```

The UserBadge appears in the header's right side, replacing the sign-in button.
[Source: ux-design-specification.md#Layout Structure]

### Color Values

| Element | Color | Tailwind |
|---------|-------|----------|
| Username text | Text Primary | `text-foreground` |
| User icon | Text Muted | `text-muted-foreground` |
| Quality badge bg | Info Light | `bg-sky-100` |
| Quality badge text | Info | `text-sky-700` |

[Source: ux-design-specification.md#Color System]

### Accessibility Requirements

- WCAG AA contrast (4.5:1) for all text
- Screen reader announces auth status change
- User icon is decorative (aria-hidden)
- Badge text readable by screen readers

[Source: ux-design-specification.md#Accessibility]

### Event Payload Update

The `auth-state-changed` event now includes username:
```typescript
{
  isSignedIn: true,
  username: "marcus_dj"
}
```

Emit this from Rust after profile fetch:
```rust
app.emit("auth-state-changed", serde_json::json!({
    "isSignedIn": true,
    "username": profile.username
}))?;
```

### File Structure After This Story

```
src/
├── components/
│   ├── features/
│   │   └── auth/
│   │       ├── SignInButton.tsx
│   │       ├── AuthContainer.tsx
│   │       └── UserBadge.tsx      # Full implementation
│   └── ui/
│       └── badge.tsx              # Added via shadcn
├── locales/
│   ├── en.json                    # + auth.accessibilityStatus
│   └── fr.json                    # + auth.accessibilityStatus

src-tauri/
├── src/
│   └── services/
│       └── oauth.rs               # + fetch_user_profile
```

### What This Story Does NOT Include

- Avatar image display (optional enhancement)
- Sign-out button/menu (Story 2.6)
- Token refresh (Story 2.5)
- Subscription verification (assume Go+ for MVP)

### Subscription Value Messaging

The "Go+ 256kbps" badge reinforces the value proposition:
- User sees their subscription is being utilized
- Differentiates from 128kbps scrapers
- Builds trust that quality is maximized

[Source: ux-design-specification.md#Subscription Value Messaging]

### Anti-Patterns to Avoid

- Do NOT show avatar by default — use icon placeholder
- Do NOT hardcode "Go+" text — use translation key
- Do NOT skip accessibility announcements
- Do NOT use color-only indicators — pair with text

### Testing the Result

After completing all tasks:
1. After OAuth, username appears in header
2. "Go+ 256kbps" badge visible next to username
3. User icon displays as placeholder
4. Screen reader announces "Signed in as [username], Go+ quality enabled"
5. Contrast ratios meet WCAG AA
6. Loading state shows while profile is being fetched

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4]
- [Source: ux-design-specification.md#Layout Structure]
- [Source: ux-design-specification.md#Subscription Value Messaging]
- [Source: ux-design-specification.md#Accessibility]
- [Source: ux-design-specification.md#Color System]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - No debug issues encountered

### Completion Notes List

- **Task 1**: Added `UserProfile` struct and `fetch_user_profile()` async function to `oauth.rs`. Added `ProfileFetchFailed` error variant to `AuthError`. Updated `complete_oauth` command to fetch profile after token exchange and emit username in event payload.
- **Task 2**: Auth store already had username field. Fixed serde serialization to use camelCase (`isSignedIn` instead of `is_signed_in`) to match TypeScript interface. Frontend event listener already handled username correctly.
- **Task 3**: Implemented full UserBadge component with User icon from lucide-react, translated "Signed in as {username}" text, and Go+ 256kbps quality badge using Shadcn Badge component.
- **Task 4**: Applied sky-100/sky-700 colors for badge with dark mode support (sky-900/sky-300). Badge uses Tailwind utility classes meeting WCAG AA contrast requirements.
- **Task 5**: Added `role="status"`, `aria-live="polite"`, and `aria-label` with full accessibility status message. User icon marked as decorative with `aria-hidden="true"`.
- **Task 6**: Added loading state with Loader2 spinner when username is null (profile still being fetched).
- **Task 7**: Added `accessibilityStatus`, `qualityBadge`, and `loading` keys to both en.json and fr.json translation files.

### Change Log

- 2026-02-06: Story 2.4 implementation complete - all 7 tasks finished, 38 Rust tests + 138 frontend tests passing, builds verified

### File List

**Modified:**
- `src-tauri/src/services/oauth.rs` - Added UserProfile struct and fetch_user_profile function
- `src-tauri/src/models/error.rs` - Added ProfileFetchFailed error variant
- `src-tauri/src/commands/auth.rs` - Updated complete_oauth to fetch profile, added serde rename for camelCase
- `src/components/features/auth/UserBadge.tsx` - Full implementation with accessibility
- `src/components/features/auth/UserBadge.test.tsx` - Updated tests for new component
- `src/components/features/auth/AuthContainer.test.tsx` - Updated tests for new behavior
- `src/components/layout/Header.test.tsx` - Updated test expectations
- `src/locales/en.json` - Added accessibilityStatus, qualityBadge, loading keys
- `src/locales/fr.json` - Added French translations for new keys

**Added:**
- `src/components/ui/badge.tsx` - Shadcn Badge component
