# Story 8.2: Implement Language Selector

Status: ready-for-dev

## Story

As a **user**,
I want **to switch the app language**,
so that **I can use the app in my preferred language**.

## Acceptance Criteria

### FR28: User can view application interface in English

1. **Given** English is selected
   **When** viewing the UI
   **Then** all interface text is in English
   **And** date/number formats follow English conventions

### FR29: User can view application interface in French

2. **Given** French is selected
   **When** viewing the UI
   **Then** all interface text is in French
   **And** date/number formats follow French conventions

### FR30: User can switch between supported languages in settings

3. **Given** the settings panel is open
   **When** viewing the Language section
   **Then** a dropdown/select shows current language
   **And** available options are: English, Francais

4. **Given** the language dropdown is displayed
   **When** selecting a different language
   **Then** the UI updates immediately to the new language
   **And** all visible text switches to the selected language
   **And** no page reload is required

5. **Given** the language changes
   **When** using a screen reader
   **Then** the language change is announced
   **And** the document `lang` attribute updates

6. **Given** the user changes the language
   **When** they close and reopen the app
   **Then** the selected language persists (via settingsStore)

## Tasks / Subtasks

- [ ] Task 1: Add Shadcn Select component (AC: #3)
  - [ ] 1.1 Run `npx shadcn@latest add select` to install the component
  - [ ] 1.2 Verify Select component files exist in `src/components/ui/`

- [ ] Task 2: Create LanguageSelector component (AC: #3, #4)
  - [ ] 2.1 Create `src/components/features/settings/LanguageSelector.tsx`:
    ```typescript
    import { useTranslation } from 'react-i18next';
    import {
      Select,
      SelectContent,
      SelectItem,
      SelectTrigger,
      SelectValue,
    } from '@/components/ui/select';
    import { useSettingsStore } from '@/stores/settingsStore';

    const SUPPORTED_LANGUAGES = [
      { code: 'en', label: 'English' },
      { code: 'fr', label: 'Francais' },
    ] as const;

    export function LanguageSelector() {
      const { t, i18n } = useTranslation();
      const language = useSettingsStore((state) => state.language);
      const setLanguage = useSettingsStore((state) => state.setLanguage);

      const handleLanguageChange = (newLanguage: string) => {
        setLanguage(newLanguage);
        i18n.changeLanguage(newLanguage);
        document.documentElement.lang = newLanguage;
      };

      return (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="language-select"
            className="text-sm font-medium text-foreground"
          >
            {t('settings.language')}
          </label>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger id="language-select" className="w-[180px]">
              <SelectValue placeholder={t('settings.selectLanguage')} />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    ```
  - [ ] 2.2 Export component from `src/components/features/settings/index.ts`

- [ ] Task 3: Integrate with settingsStore (AC: #4, #6)
  - [ ] 3.1 Verify `settingsStore` has `language` state and `setLanguage` action
  - [ ] 3.2 Ensure `setLanguage` persists to disk (Tauri store or localStorage)
  - [ ] 3.3 Update settingsStore if needed:
    ```typescript
    interface SettingsState {
      language: string;
      downloadPath: string;
      setLanguage: (language: string) => void;
      setDownloadPath: (path: string) => void;
    }

    export const useSettingsStore = create<SettingsState>()(
      persist(
        (set) => ({
          language: 'en',
          downloadPath: '',
          setLanguage: (language) => set({ language }),
          setDownloadPath: (downloadPath) => set({ downloadPath }),
        }),
        {
          name: 'settings-storage',
        }
      )
    );
    ```

- [ ] Task 4: Update document lang attribute on change (AC: #5)
  - [ ] 4.1 In `handleLanguageChange`, set `document.documentElement.lang`
  - [ ] 4.2 On app init, set initial lang attribute from settingsStore:
    ```typescript
    // In App.tsx or useLanguageSync hook
    useEffect(() => {
      document.documentElement.lang = language;
    }, [language]);
    ```

- [ ] Task 5: Ensure immediate UI update without reload (AC: #4)
  - [ ] 5.1 Verify `i18n.changeLanguage()` is called on selection
  - [ ] 5.2 Verify React re-renders all translated strings
  - [ ] 5.3 Test that no page reload or flash occurs

- [ ] Task 6: Add translations for language selector (AC: #3)
  - [ ] 6.1 Update `src/locales/en.json`:
    ```json
    {
      "settings": {
        "language": "Language",
        "selectLanguage": "Select language"
      }
    }
    ```
  - [ ] 6.2 Update `src/locales/fr.json`:
    ```json
    {
      "settings": {
        "language": "Langue",
        "selectLanguage": "Choisir la langue"
      }
    }
    ```

- [ ] Task 7: Implement accessibility features (AC: #5)
  - [ ] 7.1 Add `aria-label` to Select trigger if needed
  - [ ] 7.2 Verify keyboard navigation works (Tab, Arrow keys, Enter, Escape)
  - [ ] 7.3 Add screen reader announcement on language change:
    ```typescript
    const handleLanguageChange = (newLanguage: string) => {
      setLanguage(newLanguage);
      i18n.changeLanguage(newLanguage);
      document.documentElement.lang = newLanguage;

      // Announce to screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = newLanguage === 'en'
        ? 'Language changed to English'
        : 'Langue changee en francais';
      document.body.appendChild(announcement);
      setTimeout(() => announcement.remove(), 1000);
    };
    ```

- [ ] Task 8: Integrate into Settings Panel (AC: #3)
  - [ ] 8.1 Import `LanguageSelector` into Settings panel component
  - [ ] 8.2 Place in Language section of settings:
    ```typescript
    import { LanguageSelector } from '@/components/features/settings/LanguageSelector';

    export function SettingsPanel() {
      return (
        <div className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold mb-4">{t('settings.title')}</h3>
            <LanguageSelector />
          </section>
          {/* Other settings sections */}
        </div>
      );
    }
    ```

- [ ] Task 9: Test and verify (All ACs)
  - [ ] 9.1 Test English selection displays all UI in English
  - [ ] 9.2 Test French selection displays all UI in French
  - [ ] 9.3 Test language persists after app restart
  - [ ] 9.4 Test no page reload on language change
  - [ ] 9.5 Test keyboard navigation through Select
  - [ ] 9.6 Test screen reader announces language change
  - [ ] 9.7 Verify `<html lang="">` attribute updates correctly

## Dev Notes

### LanguageSelector Component Architecture

The `LanguageSelector` component follows the project's component organization pattern:

```
src/components/
  features/
    settings/
      LanguageSelector.tsx    # This component
      index.ts                # Exports
  ui/
    select.tsx               # Shadcn Select (added via CLI)
```

[Source: project-context.md#React Rules - Components organized by feature]

### Shadcn Select Component

Use the Shadcn Select component from the registry. Install with:

```bash
npx shadcn@latest add select
```

The Select component is built on Radix UI and provides:
- Full keyboard navigation (Tab, Arrow keys, Enter, Escape)
- Screen reader support via proper ARIA attributes
- Customizable styling via Tailwind classes

**Component imports:**
```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
```

[Source: Shadcn registry - select component]

### Integration with settingsStore

The language preference is managed by Zustand's `settingsStore`. The flow is:

```
User selects language
    |
    v
setLanguage(lang)          <- Updates Zustand store
    |
    v
i18n.changeLanguage(lang)  <- Updates i18next
    |
    v
document.documentElement.lang = lang  <- Updates HTML attribute
    |
    v
React re-renders with new translations
```

**Zustand action naming convention:**
- `setLanguage` - replaces language value (follows `set` prefix pattern)

[Source: project-context.md#Zustand Rules - Action naming prefixes]

### i18next.changeLanguage Integration

The `i18n.changeLanguage()` method triggers React component re-renders automatically because `react-i18next` subscribes to language changes. No manual state update or page reload needed.

```typescript
import { useTranslation } from 'react-i18next';

// Inside component
const { i18n } = useTranslation();
i18n.changeLanguage('fr'); // Triggers re-render of all t() calls
```

[Source: react-i18next documentation]

### Immediate UI Update Without Reload

Critical requirement: The UI must update instantly when language changes. This is achieved by:

1. **i18next integration**: `react-i18next` automatically re-renders components using `useTranslation` hook
2. **No page state loss**: User stays on same screen with same data
3. **Smooth transition**: Consider adding CSS transition for text changes if desired

**Anti-pattern to avoid:**
```typescript
// DON'T do this - causes page reload
window.location.reload();
```

[Source: UX Design Specification - Instant Feedback principle]

### Document lang Attribute Update

The `<html lang="">` attribute must be updated for:
- Screen reader pronunciation
- Browser translation tools
- SEO (though less relevant for desktop app)

```typescript
document.documentElement.lang = newLanguage; // 'en' or 'fr'
```

Set this:
1. On language selection change
2. On app initialization (read from settingsStore)

[Source: WCAG 2.1 - Language of Page (3.1.1)]

### Accessibility Requirements

**Keyboard Navigation (UX-12):**
- Tab: Focus select trigger
- Space/Enter: Open dropdown
- Arrow Up/Down: Navigate options
- Enter: Select option
- Escape: Close dropdown

**Screen Reader Support (UX-13):**
- Select has accessible label via `htmlFor`/`id` relationship
- Selected value announced
- Language change announced via `aria-live` region

**Focus Management (UX-11):**
- Visible focus ring on Select trigger (Shadcn provides this)
- Focus returns to trigger after selection

[Source: ux-design-specification.md#Accessibility (WCAG 2.1 AA)]

### Language Display Names

Display languages in their native names for better UX:
- `en` -> "English"
- `fr` -> "Francais" (using standard ASCII, no special characters in dropdown)

This follows the common pattern where users can identify their language regardless of current UI language.

### Translation Keys for This Feature

Add to both locale files:

```json
// en.json
{
  "settings": {
    "language": "Language",
    "selectLanguage": "Select language"
  }
}

// fr.json
{
  "settings": {
    "language": "Langue",
    "selectLanguage": "Choisir la langue"
  }
}
```

[Source: project-context.md#react-i18next Rules - Key structure]

### Anti-Patterns to Avoid

| Anti-Pattern | Correct Approach |
|--------------|------------------|
| Hardcoding language strings | Use `t()` function |
| Page reload on language change | Use `i18n.changeLanguage()` |
| Storing language in component state | Use `settingsStore` |
| Default export for component | Use named export `export function LanguageSelector` |
| Missing lang attribute update | Always update `document.documentElement.lang` |
| Color-only status indication | Shadcn Select handles this correctly |

[Source: project-context.md#Anti-Patterns to Avoid]

### Testing Checklist

**Functional Tests:**
- [ ] Select displays current language on initial render
- [ ] Clicking opens dropdown with both language options
- [ ] Selecting English shows all UI in English
- [ ] Selecting French shows all UI in French
- [ ] Language persists after closing/reopening settings
- [ ] Language persists after app restart
- [ ] No page reload occurs on language change

**Accessibility Tests:**
- [ ] Tab focuses the Select trigger
- [ ] Space/Enter opens the dropdown
- [ ] Arrow keys navigate options
- [ ] Enter selects highlighted option
- [ ] Escape closes dropdown without selection
- [ ] Screen reader announces selected value
- [ ] Screen reader announces language change
- [ ] `<html lang="">` updates to correct value

**Visual Tests:**
- [ ] Select matches app design system
- [ ] Focus ring visible on keyboard focus
- [ ] Dropdown positioned correctly
- [ ] Selected option shows checkmark or highlight

### File Structure After This Story

```
src/
  components/
    features/
      settings/
        LanguageSelector.tsx   # NEW - Language selection component
        index.ts               # Export LanguageSelector
    ui/
      select.tsx              # NEW - Shadcn Select component
  stores/
    settingsStore.ts          # UPDATED - Verify language state
  locales/
    en.json                   # UPDATED - Add settings.selectLanguage
    fr.json                   # UPDATED - Add settings.selectLanguage
```

### Dependencies

**Story Dependencies:**
- Story 1.4 (Zustand stores) - settingsStore must exist
- Story 1.5 (react-i18next) - i18n must be configured
- Story 8.1 (Settings Panel UI) - LanguageSelector needs a home

**Package Dependencies:**
- `@radix-ui/react-select` (installed via Shadcn CLI)

### Source References

- [architecture/core-architectural-decisions.md#Frontend Architecture]
- [architecture/implementation-patterns-consistency-rules.md#Localization Patterns]
- [project-context.md#react-i18next Rules]
- [project-context.md#Zustand Rules]
- [project-context.md#Anti-Patterns to Avoid]
- [ux-design-specification.md#Accessibility (WCAG 2.1 AA)]
- [ux-design-specification.md#Keyboard Navigation]
- [epics.md#Story 8.2 - Implement Language Selector]
- [epics.md#FR28, FR29, FR30]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
