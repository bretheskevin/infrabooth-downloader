# Story 2.6: Implement Sign-Out Functionality

Status: ready-for-dev

## Story

As a **user**,
I want **to sign out of my SoundCloud account**,
so that **I can switch accounts or revoke the app's access**.

## Acceptance Criteria

1. **Given** the user is signed in
   **When** viewing the user identity display
   **Then** a sign-out option is accessible (dropdown, button, or menu item)

2. **Given** the user initiates sign-out
   **When** the action is confirmed
   **Then** stored tokens are securely deleted
   **And** the auth store is reset to unauthenticated state
   **And** the UI updates to show the sign-in button again (FR4)

3. **Given** sign-out completes
   **When** the UI updates
   **Then** the transition is smooth (no flash or jarring change)
   **And** the URL input field remains visible but indicates sign-in is needed

4. **Given** sign-out completes
   **When** the user signs in again
   **Then** they can authenticate with a different account if desired

## Tasks / Subtasks

- [ ] Task 1: Create sign-out Tauri command (AC: #2)
  - [ ] 1.1 Add to `src-tauri/src/commands/auth.rs`:
    ```rust
    #[tauri::command]
    pub async fn sign_out(app: AppHandle) -> Result<(), String> {
        // Delete stored tokens
        delete_tokens().map_err(|e| e.to_string())?;

        // Clear any in-memory OAuth state
        // (PKCE verifier should already be cleared, but be safe)

        // Emit signed out state
        app.emit("auth-state-changed", serde_json::json!({
            "isSignedIn": false,
            "username": null
        })).map_err(|e| e.to_string())?;

        Ok(())
    }
    ```
  - [ ] 1.2 Register command in lib.rs

- [ ] Task 2: Create TypeScript sign-out function (AC: #2)
  - [ ] 2.1 Add to `src/lib/auth.ts`:
    ```typescript
    export async function signOut(): Promise<void> {
      await invoke('sign_out');
    }
    ```

- [ ] Task 3: Create UserMenu component with sign-out (AC: #1)
  - [ ] 3.1 Add Shadcn dropdown: `npx shadcn@latest add dropdown-menu`
  - [ ] 3.2 Create `src/components/features/auth/UserMenu.tsx`:
    ```typescript
    import { useTranslation } from 'react-i18next';
    import { useAuthStore } from '@/stores/authStore';
    import { signOut } from '@/lib/auth';
    import {
      DropdownMenu,
      DropdownMenuContent,
      DropdownMenuItem,
      DropdownMenuTrigger,
    } from '@/components/ui/dropdown-menu';
    import { Button } from '@/components/ui/button';
    import { Badge } from '@/components/ui/badge';
    import { User, LogOut, ChevronDown } from 'lucide-react';

    export function UserMenu() {
      const { t } = useTranslation();
      const username = useAuthStore((state) => state.username);

      const handleSignOut = async () => {
        await signOut();
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="text-sm">{username}</span>
              <Badge variant="secondary" className="bg-sky-100 text-sky-700">
                Go+ 256kbps
              </Badge>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              {t('auth.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    ```

- [ ] Task 4: Update AuthContainer to use UserMenu (AC: #1)
  - [ ] 4.1 Update `src/components/features/auth/AuthContainer.tsx`:
    ```typescript
    import { useAuthStore } from '@/stores/authStore';
    import { SignInButton } from './SignInButton';
    import { UserMenu } from './UserMenu';

    export function AuthContainer() {
      const isSignedIn = useAuthStore((state) => state.isSignedIn);

      return isSignedIn ? <UserMenu /> : <SignInButton />;
    }
    ```

- [ ] Task 5: Update auth store clearAuth action (AC: #2)
  - [ ] 5.1 Ensure `authStore.clearAuth()` properly resets state:
    ```typescript
    clearAuth: () => set({ isSignedIn: false, username: null }),
    ```

- [ ] Task 6: Add smooth transition styling (AC: #3)
  - [ ] 6.1 Add transition classes to AuthContainer:
    ```typescript
    export function AuthContainer() {
      const isSignedIn = useAuthStore((state) => state.isSignedIn);

      return (
        <div className="transition-opacity duration-200">
          {isSignedIn ? <UserMenu /> : <SignInButton />}
        </div>
      );
    }
    ```

- [ ] Task 7: Update translations (AC: #1)
  - [ ] 7.1 Verify `en.json` has:
    ```json
    "auth": {
      "signOut": "Sign out"
    }
    ```
  - [ ] 7.2 Verify `fr.json` has:
    ```json
    "auth": {
      "signOut": "Se déconnecter"
    }
    ```

- [ ] Task 8: Test account switching (AC: #4)
  - [ ] 8.1 Sign out should clear all tokens
  - [ ] 8.2 New sign-in should start fresh OAuth flow
  - [ ] 8.3 No cached credentials should affect new sign-in

## Dev Notes

### Sign-Out Flow

```
User clicks Sign Out (dropdown)
    ↓
signOut() → Tauri command
    ↓
delete_tokens() → Remove from OS keychain
    ↓
auth-state-changed event { isSignedIn: false, username: null }
    ↓
authStore.setAuth(false, null)
    ↓
AuthContainer renders SignInButton
```

### UI Pattern: Dropdown Menu

Using a dropdown menu for the user area provides:
- Clean UI without dedicated sign-out button
- Room for future options (settings shortcut, etc.)
- Standard desktop app pattern

The trigger shows: `[👤 username] [Go+ badge] [▼]`
[Source: ux-design-specification.md#Button Hierarchy]

### Visual Transition

The switch between UserMenu and SignInButton should be smooth:
- Use `transition-opacity` or `transition-all`
- Duration: 200ms (fast enough to feel responsive)
- No layout shift (both components similar height)

[Source: _bmad-output/planning-artifacts/epics.md#Story 2.6 - smooth transition]

### Dropdown Menu Accessibility

Shadcn DropdownMenu is built on Radix UI:
- Full keyboard support (Enter to open, Arrow keys to navigate)
- Escape to close
- Focus management
- ARIA attributes

[Source: ux-design-specification.md#Keyboard Navigation]

### File Structure After This Story

```
src/
├── components/
│   ├── features/
│   │   └── auth/
│   │       ├── SignInButton.tsx
│   │       ├── AuthContainer.tsx   # Updated
│   │       ├── UserBadge.tsx       # Can be removed or kept
│   │       └── UserMenu.tsx        # New - dropdown with sign-out
│   └── ui/
│       └── dropdown-menu.tsx       # Added via shadcn
├── lib/
│   └── auth.ts                     # + signOut function
```

### Token Deletion

When signing out:
1. Delete from OS keychain via `delete_tokens()`
2. Clear any in-memory state
3. Emit event to update frontend

No need to revoke tokens on SoundCloud's side (API doesn't support it).
[Source: _bmad-output/planning-artifacts/epics.md#Story 2.6]

### What This Story Does NOT Include

- Confirmation dialog for sign-out (not needed per UX)
- Token revocation on SoundCloud (not available)
- "Remember me" option (always remember for convenience)

### URL Input Visibility

Per AC #3, the URL input should remain visible after sign-out but indicate authentication is needed. This will be implemented in Epic 3 (URL Validation) where the input exists.

For now, the main content area just shows placeholder content.

### Anti-Patterns to Avoid

- Do NOT require confirmation for sign-out — make it easy
- Do NOT leave tokens in keychain after sign-out
- Do NOT cause jarring UI flash on state change
- Do NOT block sign-out on network errors — local state is authoritative

### Testing the Result

After completing all tasks:
1. Signed-in state shows dropdown with username
2. Clicking dropdown reveals "Sign out" option
3. Clicking "Sign out" immediately updates UI to sign-in button
4. Tokens removed from OS keychain (verify via system tools)
5. Can sign in again with same or different account
6. Transition is smooth, no flash

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.6]
- [Source: _bmad-output/planning-artifacts/epics.md#FR4]
- [Source: ux-design-specification.md#Button Hierarchy]
- [Source: ux-design-specification.md#Keyboard Navigation]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

