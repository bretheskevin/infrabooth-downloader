# Story 1.5: Configure react-i18next Foundation

Status: ready-for-dev

## Story

As a **developer**,
I want **react-i18next configured with the localization structure**,
so that **the app is ready for multi-language support**.

## Acceptance Criteria

1. **Given** the project with React configured
   **When** react-i18next is installed and configured
   **Then** `/src/lib/i18n.ts` is created with i18next initialization
   **And** `/src/locales/en.json` is created with placeholder structure
   **And** `/src/locales/fr.json` is created with placeholder structure

2. **Given** i18n is configured
   **When** the app initializes
   **Then** the default language is English (`en`)
   **And** the language setting is read from the settings store

3. **Given** a component uses the `useTranslation` hook
   **When** rendering translated text
   **Then** the correct translation key is resolved
   **And** missing keys fall back to the key name (for development visibility)

4. **Given** the locale files exist
   **When** examining their structure
   **Then** they contain at minimum:
   ```json
   {
     "app": {
       "title": "InfraBooth Downloader"
     }
   }
   ```

5. **Given** the settings store has a language value
   **When** the language changes in the store
   **Then** i18next language updates reactively
   **And** the UI re-renders with the new language

## Tasks / Subtasks

- [ ] Task 1: Install i18n dependencies (AC: #1)
  - [ ] 1.1 Run `npm install i18next react-i18next`
  - [ ] 1.2 Verify packages added to `package.json`

- [ ] Task 2: Create i18n configuration file (AC: #1, #2)
  - [ ] 2.1 Create `/src/lib/i18n.ts`
  - [ ] 2.2 Configure i18next with:
    - `fallbackLng: 'en'`
    - `debug: false` (or based on dev mode)
    - `interpolation: { escapeValue: false }` (React handles escaping)
  - [ ] 2.3 Import and initialize in `main.tsx` before React renders

- [ ] Task 3: Create English locale file (AC: #1, #4)
  - [ ] 3.1 Create `/src/locales/en.json`
  - [ ] 3.2 Add namespace structure per Architecture spec:
    ```json
    {
      "app": {
        "title": "InfraBooth Downloader"
      },
      "auth": {
        "signIn": "Sign in with SoundCloud",
        "signOut": "Sign out",
        "signedInAs": "Signed in as {{username}}",
        "openingBrowser": "Opening browser..."
      },
      "download": {
        "button": "Download",
        "progress": "{{current}} of {{total}} tracks",
        "pending": "Pending",
        "downloading": "Downloading...",
        "converting": "Converting...",
        "complete": "Complete",
        "failed": "Failed"
      },
      "errors": {
        "invalidUrl": "Not a SoundCloud URL",
        "notTrackOrPlaylist": "This is a profile, not a playlist or track",
        "geoBlocked": "Unavailable in your region",
        "rateLimited": "Brief pause — SoundCloud rate limit (this is normal)",
        "networkError": "No internet connection",
        "downloadFailed": "Download failed",
        "conversionFailed": "Conversion failed"
      },
      "settings": {
        "title": "Settings",
        "language": "Language",
        "downloadLocation": "Download location",
        "selectFolder": "Select folder"
      },
      "quality": {
        "badge": "Go+ 256kbps"
      }
    }
    ```

- [ ] Task 4: Create French locale file (AC: #1)
  - [ ] 4.1 Create `/src/locales/fr.json`
  - [ ] 4.2 Copy structure from en.json with French translations:
    ```json
    {
      "app": {
        "title": "InfraBooth Downloader"
      },
      "auth": {
        "signIn": "Se connecter avec SoundCloud",
        "signOut": "Se déconnecter",
        "signedInAs": "Connecté en tant que {{username}}",
        "openingBrowser": "Ouverture du navigateur..."
      },
      "download": {
        "button": "Télécharger",
        "progress": "{{current}} sur {{total}} pistes",
        "pending": "En attente",
        "downloading": "Téléchargement...",
        "converting": "Conversion...",
        "complete": "Terminé",
        "failed": "Échec"
      },
      "errors": {
        "invalidUrl": "Ce n'est pas une URL SoundCloud",
        "notTrackOrPlaylist": "Ceci est un profil, pas une playlist ou un morceau",
        "geoBlocked": "Indisponible dans votre région",
        "rateLimited": "Brève pause — limite de débit SoundCloud (c'est normal)",
        "networkError": "Pas de connexion internet",
        "downloadFailed": "Échec du téléchargement",
        "conversionFailed": "Échec de la conversion"
      },
      "settings": {
        "title": "Paramètres",
        "language": "Langue",
        "downloadLocation": "Emplacement de téléchargement",
        "selectFolder": "Sélectionner un dossier"
      },
      "quality": {
        "badge": "Go+ 256kbps"
      }
    }
    ```

- [ ] Task 5: Integrate with settings store (AC: #2, #5)
  - [ ] 5.1 Create `/src/hooks/useLanguageSync.ts` hook
  - [ ] 5.2 Hook subscribes to `useSettingsStore` language changes
  - [ ] 5.3 Hook calls `i18next.changeLanguage()` when language changes
  - [ ] 5.4 Mount hook in App.tsx or root component

- [ ] Task 6: Update App.tsx to use translations (AC: #3)
  - [ ] 6.1 Wrap App with i18n provider (if not auto-detected)
  - [ ] 6.2 Replace any hardcoded app title with `t('app.title')`
  - [ ] 6.3 Verify TypeScript provides autocomplete for `useTranslation`

- [ ] Task 7: Verify integration (AC: #3, #5)
  - [ ] 7.1 Use `useTranslation` hook in a test component
  - [ ] 7.2 Verify language switch updates UI immediately
  - [ ] 7.3 Verify missing keys show the key name in development
  - [ ] 7.4 No TypeScript errors

## Dev Notes

### i18n Configuration Pattern

**From Architecture:**
```typescript
// src/lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import fr from '../locales/fr.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    lng: 'en', // Default language
    fallbackLng: 'en',
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false, // React already handles escaping
    },
  });

export default i18n;
```
[Source: architecture/implementation-patterns-consistency-rules.md#Localization Patterns]

### i18n Key Structure Convention

**CRITICAL - Follow this exactly:**
- Key structure: `{namespace}.{section}.{element}`
- Namespaces: `app`, `auth`, `download`, `errors`, `settings`, `quality`
- Keys use camelCase: `signedInAs`, not `signed_in_as`
- Interpolation: `{{variable}}` (double braces)

[Source: project-context.md#react-i18next]

### Integration with Settings Store

The `settingsStore` from Story 1.4 already defines:
```typescript
interface SettingsState {
  downloadPath: string;
  language: 'en' | 'fr';
  setLanguage: (lang: 'en' | 'fr') => void;
}
```

Create a sync hook to bridge Zustand → i18next:
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
  }, [language]);
}
```

Mount this hook once in `App.tsx`:
```typescript
function App() {
  useLanguageSync();
  // ... rest of app
}
```
[Source: architecture/core-architectural-decisions.md#State Management]

### Project Structure After This Story

```
src/
├── lib/
│   ├── i18n.ts           # i18next configuration (NEW)
│   ├── cn.ts             # Tailwind class merger
│   └── utils.ts          # Utility functions
├── locales/
│   ├── en.json           # English translations (NEW)
│   └── fr.json           # French translations (NEW)
├── hooks/
│   └── useLanguageSync.ts # Zustand → i18next bridge (NEW)
├── stores/
│   ├── authStore.ts
│   ├── queueStore.ts
│   └── settingsStore.ts
└── ...
```
[Source: architecture/project-structure-boundaries.md]

### main.tsx Integration

Import i18n before React renders:
```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './lib/i18n'; // Initialize i18n BEFORE App
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

**CRITICAL:** Import `./lib/i18n` at the top of main.tsx, before the App component import. This ensures i18next is initialized before any component tries to use translations.

### Using Translations in Components

```typescript
import { useTranslation } from 'react-i18next';

export function SignInButton() {
  const { t } = useTranslation();

  return (
    <button>{t('auth.signIn')}</button>
  );
}

// With interpolation:
export function UserBadge({ username }: { username: string }) {
  const { t } = useTranslation();

  return (
    <span>{t('auth.signedInAs', { username })}</span>
  );
}
```
[Source: project-context.md#react-i18next]

### Previous Story Intelligence (Story 1.4)

**From Story 1.4 - Zustand Stores:**
- Settings store already has `language: 'en' | 'fr'` type
- Default language is `'en'`
- `setLanguage` action exists for changing language
- Zustand persist middleware saves language to localStorage

**Key Integration Point:** The i18n system must READ from settingsStore, not maintain its own language state. This ensures:
1. Single source of truth for language preference
2. Language persists across sessions via Zustand persist
3. Settings panel can change language via `setLanguage` action

### TypeScript Type Safety

Create type-safe translation keys (optional but recommended):
```typescript
// src/types/i18n.d.ts
import 'i18next';
import en from '../locales/en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
  }
}
```

This enables TypeScript autocomplete for translation keys.

### Functional Requirements Covered

| FR | Description | How This Story Addresses |
|----|-------------|-------------------------|
| FR28 | English UI | Creates `/src/locales/en.json` with all UI strings |
| FR29 | French UI | Creates `/src/locales/fr.json` with all UI strings |

**Note:** FR30 (language switching in settings) is implemented in Epic 8 (Story 8.2). This story provides the foundation that makes FR30 possible.

### What This Story Does NOT Include

- Language selector UI component (Epic 8: Settings)
- Automatic language detection from system (can be added later)
- Pluralization rules (add when needed for track counts)
- Date/number formatting (add when displaying timestamps)

Create the foundation now; advanced features come in later stories.

### Anti-Patterns to Avoid

- Do NOT import translations inline in components — use `useTranslation` hook
- Do NOT use default exports for locale files — keep them as JSON
- Do NOT hardcode any user-visible strings — ALL strings go through i18n
- Do NOT create duplicate language state — use settingsStore as single source
- Do NOT skip French translations — both files must be complete

[Source: project-context.md#Anti-Patterns to Avoid]

### Testing the Result

After completing all tasks:
1. `npm run dev` starts without errors
2. `useTranslation` hook works in any component
3. Changing `settingsStore.language` switches UI language
4. Missing translation keys show the key name (development mode)
5. No TypeScript strict mode violations
6. Both en.json and fr.json have identical key structures

### References

- [Source: architecture/implementation-patterns-consistency-rules.md#Localization Patterns]
- [Source: architecture/project-structure-boundaries.md#Localization (FR28-30)]
- [Source: project-context.md#react-i18next]
- [Source: prd/functional-requirements.md#Localization]
- [Source: ux-design-specification.md#Accessibility]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

