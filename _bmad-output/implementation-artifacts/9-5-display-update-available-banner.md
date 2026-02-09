# Story 9.5: Display Update Available Banner

Status: ready-for-dev

## Story

As a **user**,
I want **to know when updates are available without being forced to update**,
so that **I can choose when to update on my own terms**.

## Acceptance Criteria (FR24, FR25)

1. **Given** an update is available (FR24)
   **When** the update check completes
   **Then** a non-blocking banner appears at the top of the app
   **And** the banner shows: "Update available: v1.2.0"
   **And** the banner does not interrupt current activity

2. **Given** the update banner is displayed
   **When** viewing the banner
   **Then** it includes a brief description or "What's new" link
   **And** a "Download" or "Learn more" button is available
   **And** the banner uses info styling (not alarming)

3. **Given** the user clicks the update action
   **When** they want to update
   **Then** the browser opens to the GitHub Releases page
   **Or** the in-app updater begins the download (if implemented)

4. **Given** the user wants to dismiss the banner (FR25)
   **When** they click the dismiss/close button
   **Then** the banner disappears
   **And** the app continues normally
   **And** the user is not re-prompted during this session

5. **Given** the user dismissed an update
   **When** launching the app again later
   **Then** the update banner may reappear (gentle reminder)
   **And** the user can dismiss again without penalty

6. **Given** the update banner appears
   **When** checking accessibility
   **Then** the banner is announced by screen readers
   **And** dismiss action is keyboard accessible

## Tasks / Subtasks

- [ ] Task 1: Extend app store for update state (AC: #1, #4, #5)
  - [ ] 1.1 Create `src/stores/updateStore.ts` with TypeScript interfaces
  - [ ] 1.2 Add `updateAvailable: boolean` state
  - [ ] 1.3 Add `latestVersion: string | null` state
  - [ ] 1.4 Add `releaseNotes: string | null` state (optional summary)
  - [ ] 1.5 Add `releaseUrl: string | null` for GitHub Releases link
  - [ ] 1.6 Add `dismissedThisSession: boolean` state (not persisted)
  - [ ] 1.7 Add `setUpdateInfo: (info: UpdateInfo) => void` action
  - [ ] 1.8 Add `dismissUpdate: () => void` action (sets dismissedThisSession to true)
  - [ ] 1.9 Add `resetDismiss: () => void` action (for new sessions)
  - [ ] 1.10 Export selectors and typed hook `useUpdateStore`

- [ ] Task 2: Create UpdateBanner component (AC: #1, #2, #6)
  - [ ] 2.1 Create `src/components/features/update/UpdateBanner.tsx`
  - [ ] 2.2 Use Shadcn Alert component as base (search registry first)
  - [ ] 2.3 Style with info color (#0EA5E9) and light blue background
  - [ ] 2.4 Display message: "Update available: v{{version}}"
  - [ ] 2.5 Add Info or Sparkles icon from lucide-react
  - [ ] 2.6 Add "Learn more" button linking to GitHub Releases
  - [ ] 2.7 Add dismiss/close button (X icon)
  - [ ] 2.8 Ensure all text uses i18n keys

- [ ] Task 3: Add i18n translations for update banner (AC: #1, #2)
  - [ ] 3.1 Add to `src/locales/en.json`:
    ```json
    "update": {
      "available": "Update available: v{{version}}",
      "learnMore": "Learn more",
      "dismiss": "Dismiss",
      "whatsNew": "See what's new"
    }
    ```
  - [ ] 3.2 Add to `src/locales/fr.json`:
    ```json
    "update": {
      "available": "Mise a jour disponible : v{{version}}",
      "learnMore": "En savoir plus",
      "dismiss": "Ignorer",
      "whatsNew": "Voir les nouveautes"
    }
    ```

- [ ] Task 4: Connect to update check results (AC: #1)
  - [ ] 4.1 Modify existing update check logic (from Story 9.4) to populate update store
  - [ ] 4.2 Store version number, release URL, and optional release notes
  - [ ] 4.3 Handle case where update check fails silently (no banner shown)
  - [ ] 4.4 Handle case where no update available (banner not shown)

- [ ] Task 5: Implement "Learn more" button action (AC: #3)
  - [ ] 5.1 Use Tauri shell plugin to open external URL
  - [ ] 5.2 Construct GitHub Releases URL: `https://github.com/[owner]/[repo]/releases/tag/v{{version}}`
  - [ ] 5.3 Fallback to releases page if specific tag URL fails
  - [ ] 5.4 Handle potential errors gracefully (log, don't crash)

- [ ] Task 6: Implement dismiss button behavior (AC: #4)
  - [ ] 6.1 Dismiss button calls `dismissUpdate()` from update store
  - [ ] 6.2 Banner hides when `dismissedThisSession === true`
  - [ ] 6.3 Add CSS transition for smooth disappear (fade out)
  - [ ] 6.4 Ensure no layout shift when banner disappears

- [ ] Task 7: Implement session-based dismiss tracking (AC: #4, #5)
  - [ ] 7.1 `dismissedThisSession` is in-memory only (not persisted to storage)
  - [ ] 7.2 Resets to `false` on app launch (fresh session)
  - [ ] 7.3 Stays `true` throughout current app session
  - [ ] 7.4 Dismissed state does NOT persist across app restarts
  - [ ] 7.5 User sees banner again on next app launch (gentle reminder)

- [ ] Task 8: Position banner in app layout (AC: #1)
  - [ ] 8.1 Add UpdateBanner to main App layout, above header
  - [ ] 8.2 Banner appears at top of window (not floating/overlay)
  - [ ] 8.3 Banner does not block or obscure main UI
  - [ ] 8.4 Content area adjusts when banner is shown/hidden
  - [ ] 8.5 Banner visibility controlled by update store state

- [ ] Task 9: Implement keyboard accessibility (AC: #6)
  - [ ] 9.1 Dismiss button focusable via Tab key
  - [ ] 9.2 "Learn more" button focusable via Tab key
  - [ ] 9.3 Both buttons activatable with Enter/Space
  - [ ] 9.4 Visible focus rings on both buttons (UX-11)
  - [ ] 9.5 Tab order: "Learn more" first, then dismiss button

- [ ] Task 10: Implement screen reader accessibility (AC: #6)
  - [ ] 10.1 Add `role="status"` to banner container
  - [ ] 10.2 Add `aria-live="polite"` for non-intrusive announcement
  - [ ] 10.3 Dismiss button has `aria-label="Dismiss update notification"`
  - [ ] 10.4 Ensure version number is announced with message
  - [ ] 10.5 Test with VoiceOver (macOS) and NVDA (Windows)

- [ ] Task 11: Style and polish (AC: #2)
  - [ ] 11.1 Use info color scheme (blue tones, not alarming)
  - [ ] 11.2 Apply consistent spacing (12-16px padding)
  - [ ] 11.3 Ensure text contrast meets WCAG AA (4.5:1)
  - [ ] 11.4 Icon + text pairing for accessibility (UX-14)
  - [ ] 11.5 Add subtle animation for banner appearance

- [ ] Task 12: Write tests (AC: #1-6)
  - [ ] 12.1 Unit test: UpdateBanner renders correct version
  - [ ] 12.2 Unit test: UpdateBanner uses correct styling
  - [ ] 12.3 Unit test: "Learn more" button triggers URL open
  - [ ] 12.4 Unit test: Dismiss button hides banner
  - [ ] 12.5 Unit test: Banner shows when `updateAvailable && !dismissedThisSession`
  - [ ] 12.6 Unit test: Banner hidden when `dismissedThisSession === true`
  - [ ] 12.7 Integration test: Update check populates store correctly
  - [ ] 12.8 Accessibility test: ARIA attributes present

## Dev Notes

### Frontend Architecture (Post-Refactor)

**Prerequisite:** Story 0.1 (Refactor Download Hooks) must be completed first.

This story creates a **presentation-only component**:
- `UpdateBanner` receives update info as props from `useUpdateChecker` hook (Story 9.4)
- Component renders UI based on props — no direct update logic
- Parent component calls hook and passes data down

**Integration pattern:**
```typescript
function App() {
  const { updateAvailable, updateInfo, installUpdate } = useUpdateChecker();

  return (
    <>
      {updateAvailable && (
        <UpdateBanner updateInfo={updateInfo} onInstall={installUpdate} />
      )}
      {/* rest of app */}
    </>
  );
}
```

[Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Custom Hook Patterns]

### UpdateBanner Component Design

**From UX Specification:**
The update banner should be non-blocking and use info styling (not alarming). It appears at the top of the app and can be dismissed by the user.

**Visual Design:**
- Info color: `#0EA5E9` (blue)
- Background: Light blue (`bg-sky-50` or `bg-blue-50`)
- Border: Blue accent (`border-sky-200` or `border-blue-200`)
- Icon: Info, Sparkles, or Download icon in blue
- Text: Dark blue or neutral for contrast

**Component Structure:**
```tsx
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUpdateStore } from '@/stores/updateStore';
import { open } from '@tauri-apps/plugin-shell';

export function UpdateBanner() {
  const { t } = useTranslation();
  const {
    updateAvailable,
    latestVersion,
    releaseUrl,
    dismissedThisSession,
    dismissUpdate
  } = useUpdateStore();

  // Don't render if no update or dismissed this session
  if (!updateAvailable || dismissedThisSession) {
    return null;
  }

  const handleLearnMore = async () => {
    if (releaseUrl) {
      await open(releaseUrl);
    }
  };

  return (
    <Alert
      className="bg-sky-50 border-sky-200 rounded-none border-x-0 border-t-0"
      role="status"
      aria-live="polite"
    >
      <Info className="h-4 w-4 text-sky-600" />
      <AlertDescription className="flex items-center justify-between flex-1 text-sky-800">
        <span>
          {t('update.available', { version: latestVersion })}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="link"
            size="sm"
            onClick={handleLearnMore}
            className="text-sky-700 hover:text-sky-900"
          >
            {t('update.learnMore')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={dismissUpdate}
            aria-label={t('update.dismiss')}
            className="h-6 w-6 text-sky-600 hover:text-sky-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
```

[Source: ux-design-specification.md - Semantic Colors]

### Info Color (#0EA5E9) Usage

**From UX Specification Color System:**
| Role | Hex | Purpose |
|------|-----|---------|
| Info | #0EA5E9 | Quality badges, helpful hints |

**Tailwind Classes:**
- Background: `bg-sky-50` (light) or `bg-blue-50`
- Border: `border-sky-200` or `border-blue-200`
- Icon: `text-sky-600`
- Text: `text-sky-800` (dark for contrast)
- Links: `text-sky-700 hover:text-sky-900`

The banner should feel informational and helpful, not alarming or urgent. Users should feel informed, not pressured.

[Source: ux-design-specification.md - Semantic Colors]

### Version Display Format

**Display Pattern:**
- English: "Update available: v1.2.0"
- French: "Mise a jour disponible : v1.2.0"

**i18n Interpolation:**
```json
{
  "update": {
    "available": "Update available: v{{version}}"
  }
}
```

**Usage:**
```tsx
{t('update.available', { version: latestVersion })}
// Outputs: "Update available: v1.2.0"
```

[Source: project-context.md - react-i18next]

### "Learn More" Link to GitHub Releases

**Implementation:**
```typescript
import { open } from '@tauri-apps/plugin-shell';

const handleLearnMore = async () => {
  // Use the release URL from update check
  // Format: https://github.com/owner/repo/releases/tag/v1.2.0
  if (releaseUrl) {
    await open(releaseUrl);
  }
};
```

**Fallback URL Pattern:**
If specific tag URL is not available, fall back to releases list:
```typescript
const fallbackUrl = 'https://github.com/owner/repo/releases';
```

**Note:** The actual repository owner/name should be configured in the app. For this project, it will be determined during Epic 9 setup.

[Source: architecture/index.md - ARCH-13: GitHub Releases integration]

### Session-Based Dismiss Tracking

**Key Behavior:**
- Dismiss state is **in-memory only** (not persisted to disk)
- Resets to `false` when app launches
- Persists `true` throughout current session
- User sees banner again on next app launch

**Why Session-Based (Not Persistent):**
1. Users may want to be reminded later
2. Avoids permanently hiding important updates
3. Respects user choice in the moment without long-term consequences
4. Gentle reminder pattern on next launch

**Store Implementation:**
```typescript
// src/stores/updateStore.ts
import { create } from 'zustand';

interface UpdateState {
  updateAvailable: boolean;
  latestVersion: string | null;
  releaseUrl: string | null;
  releaseNotes: string | null;
  dismissedThisSession: boolean;  // NOT persisted

  setUpdateInfo: (info: UpdateInfo) => void;
  dismissUpdate: () => void;
  clearUpdate: () => void;
}

interface UpdateInfo {
  version: string;
  releaseUrl: string;
  releaseNotes?: string;
}

export const useUpdateStore = create<UpdateState>((set) => ({
  updateAvailable: false,
  latestVersion: null,
  releaseUrl: null,
  releaseNotes: null,
  dismissedThisSession: false,  // Resets on app launch

  setUpdateInfo: (info) => set({
    updateAvailable: true,
    latestVersion: info.version,
    releaseUrl: info.releaseUrl,
    releaseNotes: info.releaseNotes ?? null,
  }),

  dismissUpdate: () => set({ dismissedThisSession: true }),

  clearUpdate: () => set({
    updateAvailable: false,
    latestVersion: null,
    releaseUrl: null,
    releaseNotes: null,
    // Note: dismissedThisSession stays as-is
  }),
}));
```

**Important:** Do NOT use Zustand's `persist` middleware for this store. The dismiss state must reset on each app launch.

[Source: epics.md - FR25: User can continue using outdated version]

### Non-Blocking Info Styling

**From UX Specification:**
The banner must be non-blocking and use info styling (not alarming).

**Non-Blocking Principles:**
1. Banner appears at top of window but doesn't overlay content
2. Main UI remains fully interactive
3. No modal, no required action
4. User can ignore and continue working
5. Content area shifts down when banner shows, shifts back when dismissed

**Visual Tone:**
- Use blue (info) colors, not red (error) or yellow (warning)
- Friendly, helpful tone in copy
- "Learn more" (invitation) not "Update now" (command)
- Small dismiss button, not prominent

**Anti-Pattern - Alarming Styling:**
```tsx
// WRONG - Too alarming
<Alert className="bg-red-50 border-red-500">
  <AlertTriangle className="text-red-600" />
  Update required immediately!
</Alert>

// CORRECT - Informational
<Alert className="bg-sky-50 border-sky-200">
  <Info className="text-sky-600" />
  Update available: v1.2.0
</Alert>
```

[Source: ux-design-specification.md - Emotional Design Principles]

### Keyboard Accessibility

**Required Keyboard Support (UX-12):**

| Key | Action |
|-----|--------|
| Tab | Move focus to "Learn more" button, then dismiss button |
| Shift+Tab | Move focus backward |
| Enter | Activate focused button |
| Space | Activate focused button |

**Focus Order:**
1. "Learn more" button (primary action)
2. Dismiss button (X icon)

**Implementation:**
```tsx
<div className="flex items-center gap-2">
  {/* Primary action first in tab order */}
  <Button
    variant="link"
    size="sm"
    onClick={handleLearnMore}
    className="focus-visible:ring-2 focus-visible:ring-sky-500"
  >
    {t('update.learnMore')}
  </Button>

  {/* Dismiss button second */}
  <Button
    variant="ghost"
    size="icon"
    onClick={dismissUpdate}
    aria-label={t('update.dismiss')}
    className="focus-visible:ring-2 focus-visible:ring-sky-500"
  >
    <X className="h-4 w-4" />
  </Button>
</div>
```

[Source: ux-design-specification.md - Keyboard Navigation]

### Banner Positioning in Layout

**App Layout Structure:**
```tsx
// src/App.tsx or main layout component
function App() {
  return (
    <div className="flex flex-col h-screen">
      {/* Update banner at very top */}
      <UpdateBanner />

      {/* Header below banner */}
      <Header />

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* App content */}
      </main>
    </div>
  );
}
```

**Styling for Top Position:**
```tsx
// Banner styles - no rounded corners on sides, integrated with app edge
<Alert className="
  bg-sky-50
  border-sky-200
  rounded-none
  border-x-0
  border-t-0
">
```

**Layout Shift Handling:**
The banner naturally pushes content down when visible. When dismissed, the flex layout adjusts automatically. Use CSS transitions for smooth height changes if needed:

```tsx
<div className={cn(
  "transition-all duration-200 ease-in-out",
  updateAvailable && !dismissedThisSession
    ? "max-h-16 opacity-100"
    : "max-h-0 opacity-0 overflow-hidden"
)}>
  <UpdateBanner />
</div>
```

[Source: ux-design-specification.md - Layout Structure]

### Integration with Story 9.4 (Update Check)

**Dependency:** This story assumes Story 9.4 (Implement Update Check on Launch) provides update information. The update check should:

1. Compare current version to latest available
2. If newer version exists, call `setUpdateInfo()` with:
   - `version`: The new version string (e.g., "1.2.0")
   - `releaseUrl`: URL to GitHub Releases page for this version
   - `releaseNotes`: Optional summary of changes

**In update check logic (from Story 9.4):**
```typescript
// After fetching update manifest
import { useUpdateStore } from '@/stores/updateStore';

// In the update check function
const checkForUpdates = async () => {
  try {
    const updateInfo = await checkUpdater();

    if (updateInfo.shouldUpdate) {
      useUpdateStore.getState().setUpdateInfo({
        version: updateInfo.manifest.version,
        releaseUrl: `https://github.com/owner/repo/releases/tag/v${updateInfo.manifest.version}`,
        releaseNotes: updateInfo.manifest.notes,
      });
    }
  } catch (error) {
    // Silent failure - don't show banner, don't show error
    console.error('Update check failed:', error);
  }
};
```

[Source: epics.md - Story 9.4: Implement Update Check on Launch]

### Anti-Patterns to Avoid

1. **Do NOT use alarming language** - "CRITICAL UPDATE", "UPDATE NOW", "You must update" are wrong
2. **Do NOT use error/warning colors** - Use info (blue), not error (red) or warning (amber)
3. **Do NOT persist dismiss state** - Session-only, resets on app restart
4. **Do NOT block the UI** - Banner is informational, not modal
5. **Do NOT auto-dismiss on timer** - User controls dismissal
6. **Do NOT hide version number** - Always show which version is available
7. **Do NOT use custom URL opening** - Use `@tauri-apps/plugin-shell` open()
8. **Do NOT forget ARIA attributes** - Screen reader accessibility required
9. **Do NOT use default exports** - Use named exports per project convention
10. **Do NOT use `any` type** - Properly type all state and props

[Source: project-context.md - Anti-Patterns to Avoid]

### i18n Key Structure

**Namespace:** `update`

**Keys:**
```json
{
  "update": {
    "available": "Update available: v{{version}}",
    "learnMore": "Learn more",
    "dismiss": "Dismiss",
    "whatsNew": "See what's new",
    "newVersion": "A new version of InfraBooth Downloader is available"
  }
}
```

**French Translation:**
```json
{
  "update": {
    "available": "Mise a jour disponible : v{{version}}",
    "learnMore": "En savoir plus",
    "dismiss": "Ignorer",
    "whatsNew": "Voir les nouveautes",
    "newVersion": "Une nouvelle version d'InfraBooth Downloader est disponible"
  }
}
```

[Source: project-context.md - react-i18next]

### Testing Checklist

**Unit Tests:**
- [ ] UpdateBanner renders when `updateAvailable === true`
- [ ] UpdateBanner does not render when `updateAvailable === false`
- [ ] UpdateBanner does not render when `dismissedThisSession === true`
- [ ] UpdateBanner displays correct version number
- [ ] UpdateBanner uses info color scheme (blue tones)
- [ ] "Learn more" button calls shell.open with correct URL
- [ ] Dismiss button calls `dismissUpdate()`
- [ ] UpdateBanner has correct ARIA attributes
- [ ] Store actions work correctly

**Integration Tests:**
- [ ] Update check result shows banner
- [ ] Dismiss button hides banner for session
- [ ] Banner reappears on simulated app restart
- [ ] "Learn more" opens browser to GitHub Releases

**Accessibility Tests:**
- [ ] Screen reader announces update availability
- [ ] Tab navigates through banner buttons
- [ ] Enter/Space activates buttons
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Focus ring visible on buttons

**Manual Testing:**
- [ ] Banner appears at top of window
- [ ] Banner does not block main UI
- [ ] Content area adjusts when banner appears/disappears
- [ ] "Learn more" opens GitHub Releases in browser
- [ ] Dismiss hides banner
- [ ] Banner stays hidden during session
- [ ] Banner reappears after app restart

### File Structure After This Story

```
src/
├── components/
│   └── features/
│       └── update/
│           ├── UpdateBanner.tsx    # NEW
│           └── index.ts            # NEW (exports)
├── stores/
│   └── updateStore.ts              # NEW
├── locales/
│   ├── en.json                     # MODIFIED (add update keys)
│   └── fr.json                     # MODIFIED (add update keys)
├── App.tsx                         # MODIFIED (add UpdateBanner)
└── ...
```

### Dependencies on Other Stories

**Requires Completion:**
- Story 9.4: Implement Update Check on Launch (provides update info)
- Story 1.2: Configure Tailwind CSS & Shadcn/ui (Shadcn available)
- Story 1.4: Configure Zustand Store Structure (store pattern established)
- Story 1.5: Configure react-i18next Foundation (i18n available)

**Blocked By:**
- Story 9.4 must be complete for real update data; otherwise, can mock update info for testing

**Note:** If Story 9.4 is not complete, this story can still be implemented with mock data. The banner component and store can be fully developed and tested with simulated update info.

### Shadcn Component Check

**Required Components:**
- Alert (for banner) - verify via Shadcn registry: `@shadcn/alert`
- Button (for actions) - verify via Shadcn registry: `@shadcn/button`

**Before Implementation:**
1. Check if Alert is installed: `ls src/components/ui/alert.tsx`
2. If not installed: `npx shadcn@latest add alert`
3. Check if Button is installed: `ls src/components/ui/button.tsx`
4. If not installed: `npx shadcn@latest add button`

### References

- [Source: epics.md - Story 9.5: Display Update Available Banner]
- [Source: epics.md - FR24: User can see update available notification (non-blocking banner)]
- [Source: epics.md - FR25: User can continue using outdated version after dismissing update notice]
- [Source: ux-design-specification.md - Semantic Colors - Info]
- [Source: ux-design-specification.md - Keyboard Navigation]
- [Source: ux-design-specification.md - Accessibility Requirements]
- [Source: project-context.md - Zustand Store Patterns]
- [Source: project-context.md - react-i18next Rules]
- [Source: architecture/index.md - ARCH-13: Tauri updater with GitHub Releases]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### Change Log

### File List

