# Story 8.5: Persist Language Preference

Status: ready-for-dev

## Story

As a **user**,
I want **the app to remember my language choice**,
so that **it opens in my preferred language every time without needing to reconfigure**.

## Acceptance Criteria

1. **Given** the user selects a language (from Story 8.2)
   **When** the selection is made
   **Then** the preference is saved to the settings store
   **And** the preference is persisted to disk via Zustand persist middleware
   **And** the persistence happens automatically (no explicit save action required)

2. **Given** the app launches
   **When** loading preferences
   **Then** the saved language preference is restored from localStorage
   **And** i18next is initialized with the saved language BEFORE first render
   **And** the UI renders in the correct language from the start

3. **Given** no language preference is saved (first launch)
   **When** launching for the first time
   **Then** the default language is English (`'en'`)
   **And** the user can change it in settings (Story 8.2)
   **And** the default is persisted for future sessions

4. **Given** the app launches with a saved language
   **When** the UI appears
   **Then** there is NO flash of wrong language
   **And** the correct language is shown immediately
   **And** application launches to interactive state within 3 seconds (NFR1 compliance)

5. **Given** the settings store uses persist middleware
   **When** the `language` value changes
   **Then** localStorage is updated synchronously
   **And** i18next language changes reactively via `useLanguageSync` hook
   **And** the document `lang` attribute updates to match

## Tasks / Subtasks

- [ ] Task 1: Verify Zustand persist middleware for language (AC: #1, #5)
  - [ ] 1.1 Confirm `settingsStore.ts` has persist middleware configured (from Story 1.4)
  - [ ] 1.2 Verify `language` field is included in persisted state (not excluded)
  - [ ] 1.3 Confirm storage key is `'sc-downloader-settings'`
  - [ ] 1.4 Test that language value persists to localStorage on change

- [ ] Task 2: Initialize i18next with persisted language BEFORE render (AC: #2, #4)
  - [ ] 2.1 Update `/src/lib/i18n.ts` to read initial language from localStorage
  - [ ] 2.2 Parse `'sc-downloader-settings'` from localStorage before i18n init
  - [ ] 2.3 Use parsed language or fallback to `'en'` if not found
  - [ ] 2.4 Ensure i18n initialization is synchronous and completes before React renders

- [ ] Task 3: Prevent flash of wrong language (AC: #4)
  - [ ] 3.1 Ensure i18n import is at TOP of `main.tsx` (before App import)
  - [ ] 3.2 Verify i18n.init() is called synchronously with correct language
  - [ ] 3.3 Test that first render shows correct language (no flicker)
  - [ ] 3.4 Measure startup time to ensure NFR1 compliance (<3 seconds)

- [ ] Task 4: Update document lang attribute (AC: #5)
  - [ ] 4.1 Update `useLanguageSync` hook to set `document.documentElement.lang`
  - [ ] 4.2 Set lang attribute on initial load in i18n.ts
  - [ ] 4.3 Update lang attribute whenever language changes
  - [ ] 4.4 Verify screen readers detect language change

- [ ] Task 5: Handle edge cases (AC: #2, #3)
  - [ ] 5.1 Handle corrupted localStorage (invalid JSON)
  - [ ] 5.2 Handle invalid language value in storage (not 'en' or 'fr')
  - [ ] 5.3 Handle localStorage being unavailable (private browsing)
  - [ ] 5.4 Fallback to English in all error cases

- [ ] Task 6: Testing and Verification (AC: #1-5)
  - [ ] 6.1 Test language persists across app restarts
  - [ ] 6.2 Test first-launch defaults to English
  - [ ] 6.3 Test no flash of wrong language on startup
  - [ ] 6.4 Test switching language updates i18next and persists
  - [ ] 6.5 Test document lang attribute updates correctly
  - [ ] 6.6 Measure and verify NFR1 compliance (launch < 3 seconds)

## Dev Notes

### Zustand Persist for Language (Already Configured in Story 1.4)

The `settingsStore` from Story 1.4 already includes language persistence:

```typescript
// src/stores/settingsStore.ts (from Story 1.4)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  downloadPath: string;
  language: 'en' | 'fr';
  // ... actions
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      downloadPath: '',
      language: 'en',  // Default language
      setLanguage: (lang) => set({ language: lang }),
      // ...
    }),
    {
      name: 'sc-downloader-settings',  // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

**Key point:** The `language` field is ALREADY persisted. This story focuses on:
1. Ensuring i18next reads this value BEFORE first render
2. Preventing any flash of wrong language
3. Keeping document `lang` attribute in sync

[Source: Story 1.4 - Configure Zustand Store Structure]

### Critical: i18n Initialization Order

**The Problem:** By default, i18next initializes with `'en'` before Zustand hydrates, causing a flash of English text if the user's saved preference is French.

**The Solution:** Read localStorage directly in `i18n.ts` BEFORE calling `i18n.init()`:

```typescript
// src/lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import fr from '../locales/fr.json';

// Read persisted language BEFORE i18n initialization
function getInitialLanguage(): 'en' | 'fr' {
  try {
    const stored = localStorage.getItem('sc-downloader-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      const lang = parsed?.state?.language;
      if (lang === 'en' || lang === 'fr') {
        return lang;
      }
    }
  } catch (error) {
    console.warn('Failed to read language preference:', error);
  }
  return 'en'; // Default fallback
}

const initialLanguage = getInitialLanguage();

// Set document lang attribute immediately
document.documentElement.lang = initialLanguage;

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    lng: initialLanguage,  // Use persisted language
    fallbackLng: 'en',
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

**CRITICAL:** This MUST be imported at the TOP of `main.tsx`, before any component imports:

```typescript
// src/main.tsx
import './lib/i18n';  // FIRST - initializes i18n with persisted language
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

[Source: Story 1.5 - Configure react-i18next Foundation]

### Zustand Persist Storage Format

Zustand persist middleware stores data in this format:

```json
{
  "state": {
    "downloadPath": "/Users/user/Downloads",
    "language": "fr"
  },
  "version": 0
}
```

The `getInitialLanguage()` function must parse this structure correctly:
- Access `parsed.state.language` (not just `parsed.language`)
- Handle missing or malformed data gracefully
- Always return a valid language ('en' or 'fr')

[Source: Zustand persist middleware documentation]

### useLanguageSync Hook Update

The existing `useLanguageSync` hook from Story 1.5 needs to update the document lang attribute:

```typescript
// src/hooks/useLanguageSync.ts
import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import i18n from '../lib/i18n';

export function useLanguageSync() {
  const language = useSettingsStore((state) => state.language);

  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
    // Update document lang attribute for accessibility
    document.documentElement.lang = language;
  }, [language]);
}
```

**Why update document.lang?**
- Screen readers use this to determine pronunciation
- Search engines use it for language detection
- WCAG accessibility requirement
- Required for proper French accented character pronunciation

[Source: UX-13 - Screen reader announcements]

### NFR1 Compliance: 3-Second Launch Target

**NFR1 states:** "Application launches to interactive state within 3 seconds"

This story must NOT add latency to startup. Key optimizations:

1. **Synchronous localStorage read** - No async operations before render
2. **No network calls for language** - Use persisted value only
3. **No waiting for Zustand hydration** - Read localStorage directly

**Verification approach:**
```typescript
// Add to main.tsx for development measurement
if (import.meta.env.DEV) {
  const startTime = performance.now();
  window.addEventListener('load', () => {
    const loadTime = performance.now() - startTime;
    console.log(`App load time: ${loadTime.toFixed(2)}ms`);
    if (loadTime > 3000) {
      console.warn('WARNING: Load time exceeds NFR1 target of 3 seconds');
    }
  });
}
```

[Source: prd/non-functional-requirements.md - NFR1]

### Edge Case Handling

**Corrupted localStorage:**
```typescript
function getInitialLanguage(): 'en' | 'fr' {
  try {
    const stored = localStorage.getItem('sc-downloader-settings');
    if (stored) {
      const parsed = JSON.parse(stored);  // May throw SyntaxError
      // ...
    }
  } catch (error) {
    // JSON.parse failed - corrupted data
    console.warn('Failed to read language preference:', error);
    // Optionally clear corrupted storage
    // localStorage.removeItem('sc-downloader-settings');
  }
  return 'en';
}
```

**Invalid language value:**
```typescript
const lang = parsed?.state?.language;
if (lang === 'en' || lang === 'fr') {
  return lang;  // Only accept valid values
}
// Invalid value (e.g., 'de', null, undefined) falls through to default
return 'en';
```

**localStorage unavailable (private browsing):**
```typescript
function getInitialLanguage(): 'en' | 'fr' {
  try {
    // localStorage.getItem may throw in private browsing mode
    const stored = localStorage.getItem('sc-downloader-settings');
    // ...
  } catch (error) {
    // localStorage not available
    console.warn('localStorage unavailable:', error);
  }
  return 'en';
}
```

[Source: project-context.md - Error handling patterns]

### File Structure After This Story

```
src/
├── lib/
│   └── i18n.ts              # UPDATE - Read persisted language before init
├── hooks/
│   └── useLanguageSync.ts   # UPDATE - Set document.lang attribute
├── stores/
│   └── settingsStore.ts     # NO CHANGE - Already has persist (Story 1.4)
└── main.tsx                 # VERIFY - i18n import is first
```

### Sequence Diagram: App Startup with Persisted Language

```
1. Browser loads main.tsx
2. i18n.ts imported (FIRST import)
3. i18n.ts reads localStorage synchronously
4. i18n.ts extracts language from persisted settings
5. i18n.init() called with correct language
6. document.documentElement.lang set
7. React imports and renders
8. First render shows correct language (no flash)
9. Zustand hydrates (background, no visible effect)
10. useLanguageSync ensures ongoing sync
```

[Source: Architecture - Application lifecycle]

### Anti-Patterns to Avoid

1. **DON'T** wait for Zustand hydration before setting i18n language:
   ```typescript
   // WRONG - causes flash of wrong language
   useEffect(() => {
     if (isHydrated) {
       i18n.changeLanguage(language);
     }
   }, [isHydrated, language]);

   // RIGHT - set language in i18n.ts before React renders
   const initialLanguage = getInitialLanguage();
   i18n.init({ lng: initialLanguage });
   ```

2. **DON'T** use async localStorage operations:
   ```typescript
   // WRONG - introduces race condition
   async function getLanguage() {
     return await someAsyncStorage.get('language');
   }

   // RIGHT - synchronous read
   const stored = localStorage.getItem('sc-downloader-settings');
   ```

3. **DON'T** import i18n after App component:
   ```typescript
   // WRONG - i18n not initialized before first render
   import App from './App';
   import './lib/i18n';

   // RIGHT - i18n first
   import './lib/i18n';
   import App from './App';
   ```

4. **DON'T** create separate language persistence:
   ```typescript
   // WRONG - duplicate storage, out of sync
   localStorage.setItem('user-language', language);

   // RIGHT - use Zustand persist (single source of truth)
   setLanguage(language); // Automatically persisted
   ```

5. **DON'T** forget to update document.lang:
   ```typescript
   // WRONG - accessibility issue
   i18n.changeLanguage(language);

   // RIGHT - update document lang for screen readers
   i18n.changeLanguage(language);
   document.documentElement.lang = language;
   ```

[Source: project-context.md - Anti-Patterns to Avoid]

### Testing Checklist

**Persistence Tests:**
- [ ] Language persists to localStorage after change
- [ ] Language loads correctly on app restart
- [ ] Storage key is `'sc-downloader-settings'`
- [ ] Language is stored under `state.language` path

**First Launch Tests:**
- [ ] First launch defaults to English ('en')
- [ ] Default language is persisted after first launch
- [ ] No error shown on first launch

**No Flash Tests:**
- [ ] French user sees French immediately on launch (no English flash)
- [ ] English user sees English immediately (baseline)
- [ ] Language is correct on FIRST rendered frame
- [ ] No visible text change after initial render

**NFR1 Compliance Tests:**
- [ ] App launches to interactive state < 3 seconds
- [ ] Language detection does not add perceptible latency
- [ ] No blocking network calls during language init

**i18next Integration Tests:**
- [ ] i18n.language matches persisted value on startup
- [ ] useTranslation hook returns correct translations
- [ ] Language change via settings updates i18n
- [ ] Fallback to 'en' works for missing translations

**Document Lang Tests:**
- [ ] document.documentElement.lang set on initial load
- [ ] document.lang updates when language changes
- [ ] Screen readers detect correct language

**Edge Case Tests:**
- [ ] Corrupted localStorage handled gracefully
- [ ] Invalid language value falls back to 'en'
- [ ] Missing settings key falls back to 'en'
- [ ] Private browsing mode works (no localStorage)

### Dependencies

**Depends on:**
- Story 1.4: Configure Zustand Store Structure (settingsStore with persist)
- Story 1.5: Configure react-i18next Foundation (i18n setup, useLanguageSync)
- Story 8.2: Implement Language Selector (setLanguage action usage)

**Blocks:**
- None (this is a leaf story in Epic 8)

**Related:**
- Story 8.3: Create English Translation File
- Story 8.4: Create French Translation File

### Functional Requirements Covered

| FR | Description | How This Story Addresses |
|----|-------------|-------------------------|
| FR28 | User can view application interface in English | Default language, persists correctly |
| FR29 | User can view application interface in French | French preference persists and loads |
| FR30 | User can switch between supported languages | Language switch persists across sessions |

### Non-Functional Requirements Covered

| NFR | Description | How This Story Addresses |
|-----|-------------|-------------------------|
| NFR1 | Application launches to interactive state within 3 seconds | Synchronous language detection, no blocking operations |
| NFR10 | Application state persists across unexpected termination | Zustand persist saves language to localStorage |

### Accessibility Considerations

- **WCAG 2.1 - Language of Page (3.1.1):** Document `lang` attribute must reflect current language
- **Screen Reader Support (UX-13):** Language attribute enables correct pronunciation
- **French Accented Characters:** Proper `lang="fr"` ensures correct TTS pronunciation of accents

[Source: ux-design-specification.md - Accessibility Requirements]

### References

- [Source: epics.md - Story 8.5 Acceptance Criteria]
- [Source: epics.md - FR28-30: Localization requirements]
- [Source: epics.md - NFR1: 3-second launch target]
- [Source: epics.md - NFR10: State persistence]
- [Source: Story 1.4 - Configure Zustand Store Structure]
- [Source: Story 1.5 - Configure react-i18next Foundation]
- [Source: Story 8.2 - Implement Language Selector]
- [Source: project-context.md - react-i18next rules]
- [Source: project-context.md - Zustand rules]
- [Source: project-context.md - Anti-Patterns to Avoid]
- [Source: ux-design-specification.md - Accessibility Requirements]
- [Zustand Persist Middleware](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)
- [i18next Documentation](https://www.i18next.com/)
- [WCAG 2.1 - Language of Page](https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### Change Log

### File List

