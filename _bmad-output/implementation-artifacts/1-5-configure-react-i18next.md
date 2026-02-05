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

5. **Given** the i18n system is configured
   **When** the language changes in settings store
   **Then** the i18n language updates reactively

## Tasks / Subtasks

- [ ] Task 1: Install i18n dependencies (AC: #1)
  - [ ] 1.1 Run `npm install react-i18next i18next`
  - [ ] 1.2 Create `/src/locales/` directory

- [ ] Task 2: Create i18n configuration (AC: #1, #2)
  - [ ] 2.1 Create `src/lib/i18n.ts`:
    ```typescript
    import i18n from 'i18next';
    import { initReactI18next } from 'react-i18next';
    import en from '@/locales/en.json';
    import fr from '@/locales/fr.json';

    i18n
      .use(initReactI18next)
      .init({
        resources: {
          en: { translation: en },
          fr: { translation: fr },
        },
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
          escapeValue: false,
        },
      });

    export default i18n;
    ```
  - [ ] 2.2 Import i18n in `main.tsx` before App render

- [ ] Task 3: Create English translation file (AC: #1, #4)
  - [ ] 3.1 Create `src/locales/en.json` with initial structure:
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
        "complete": "Download complete!",
        "pasteUrl": "Paste a SoundCloud playlist or track URL"
      },
      "errors": {
        "invalidUrl": "Not a SoundCloud URL",
        "geoBlocked": "Unavailable in your region",
        "rateLimited": "Brief pause — SoundCloud rate limit (this is normal)",
        "networkError": "No internet connection",
        "downloadFailed": "Download failed",
        "conversionFailed": "Conversion failed"
      },
      "settings": {
        "title": "Settings",
        "language": "Language",
        "downloadPath": "Download location"
      },
      "completion": {
        "openFolder": "Open Folder",
        "downloadAnother": "Download Another"
      }
    }
    ```

- [ ] Task 4: Create French translation file (AC: #1, #4)
  - [ ] 4.1 Create `src/locales/fr.json` with same structure:
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
        "complete": "Téléchargement terminé !",
        "pasteUrl": "Collez une URL de playlist ou de piste SoundCloud"
      },
      "errors": {
        "invalidUrl": "Ce n'est pas une URL SoundCloud",
        "geoBlocked": "Indisponible dans votre région",
        "rateLimited": "Courte pause — limite SoundCloud (c'est normal)",
        "networkError": "Pas de connexion internet",
        "downloadFailed": "Échec du téléchargement",
        "conversionFailed": "Échec de la conversion"
      },
      "settings": {
        "title": "Paramètres",
        "language": "Langue",
        "downloadPath": "Emplacement de téléchargement"
      },
      "completion": {
        "openFolder": "Ouvrir le dossier",
        "downloadAnother": "Télécharger autre chose"
      }
    }
    ```

- [ ] Task 5: Integrate with settings store (AC: #2, #5)
  - [ ] 5.1 Create `src/hooks/useLanguageSync.ts`:
    ```typescript
    import { useEffect } from 'react';
    import { useTranslation } from 'react-i18next';
    import { useSettingsStore } from '@/stores/settingsStore';

    export function useLanguageSync() {
      const { i18n } = useTranslation();
      const language = useSettingsStore((state) => state.language);

      useEffect(() => {
        if (i18n.language !== language) {
          i18n.changeLanguage(language);
        }
      }, [language, i18n]);
    }
    ```
  - [ ] 5.2 Call `useLanguageSync()` in App.tsx

- [ ] Task 6: Update Header to use translation (AC: #3)
  - [ ] 6.1 Update `Header.tsx` to use `useTranslation`:
    ```typescript
    import { useTranslation } from 'react-i18next';

    export function Header() {
      const { t } = useTranslation();
      return (
        <header className="...">
          <h1>{t('app.title')}</h1>
        </header>
      );
    }
    ```
  - [ ] 6.2 Verify translation displays correctly

- [ ] Task 7: Verify configuration (AC: #3)
  - [ ] 7.1 Test `useTranslation` hook in a component
  - [ ] 7.2 Verify interpolation works: `t('auth.signedInAs', { username: 'Test' })`
  - [ ] 7.3 Verify missing keys show key name in development

## Dev Notes

### i18n Key Structure

**Pattern:** `{namespace}.{section}.{element}`

| Namespace | Purpose |
|-----------|---------|
| `app` | Application-wide strings |
| `auth` | Authentication UI |
| `download` | Download flow UI |
| `errors` | Error messages |
| `settings` | Settings panel |
| `completion` | Completion panel |

**Rules:**
- Keys use camelCase: `signedInAs`, not `signed_in_as`
- Interpolation uses `{{variable}}` syntax
- Group by feature/screen
[Source: project-context.md#react-i18next Rules]

### Interpolation Examples

```typescript
// Simple key
t('app.title') // "InfraBooth Downloader"

// With interpolation
t('auth.signedInAs', { username: 'Marcus' }) // "Signed in as Marcus"

// With count (pluralization)
t('download.progress', { current: 5, total: 47 }) // "5 of 47 tracks"
```
[Source: architecture/implementation-patterns-consistency-rules.md#Localization Patterns]

### File Structure After This Story

```
src/
├── lib/
│   ├── i18n.ts           # i18next configuration
│   └── utils.ts          # Existing utils (from 1.2)
├── locales/
│   ├── en.json           # English translations
│   └── fr.json           # French translations
├── hooks/
│   └── useLanguageSync.ts  # Sync i18n with settings store
└── ...
```
[Source: architecture/project-structure-boundaries.md]

### Integration with Settings Store

The language preference is stored in `settingsStore` (from Story 1.4). The `useLanguageSync` hook bridges i18next with Zustand:

```
settingsStore.language → useLanguageSync → i18n.changeLanguage()
```

This ensures language changes in settings immediately update the UI.
[Source: architecture/core-architectural-decisions.md#Cross-Component Dependencies]

### Error Message Consistency

Error messages in translation files MUST match the tone from UX spec:
- **Informative, not alarming**
- **Blames restrictions, not app**
- **Includes guidance where appropriate**

Example: "Brief pause — SoundCloud rate limit (this is normal)" frames the pause as expected behavior.
[Source: ux-design-specification.md#Error Transparency as Trust]

### French Translation Quality

French translations should be:
- Natural French (not literal translation)
- Consistent tone with English
- Proper grammar and accents (é, è, ê, etc.)

Example corrections applied:
- "Télécharger" not "Download" (avoid franglais)
- "Connecté en tant que" not "Signé en tant que"
[Source: _bmad-output/planning-artifacts/epics.md#Story 8.4]

### What This Story Does NOT Include

- Language selector UI (Epic 8: Story 8.2)
- Persisting language preference (handled by settingsStore from Story 1.4)
- Full translation coverage (more strings added as features are built)
- RTL support (not needed for EN/FR)

### Fallback Behavior

Configure i18next to show the key name when translation is missing:
```typescript
{
  fallbackLng: 'en',
  // Missing keys will show the key itself in dev
  saveMissing: false,
  missingKeyHandler: (lng, ns, key) => {
    console.warn(`Missing translation: ${key}`);
  }
}
```

This makes it obvious during development when a translation is needed.

### Anti-Patterns to Avoid

- Do NOT hardcode UI strings — always use `t()` function
- Do NOT use string concatenation for translated text — use interpolation
- Do NOT translate developer-only strings (console logs, error codes)
- Do NOT use default exports for hooks — use named exports

[Source: project-context.md#Anti-Patterns to Avoid]

### Testing the Result

After completing all tasks:
1. App displays "InfraBooth Downloader" from translation
2. `useTranslation` hook works in components
3. Interpolation works: `{{username}}` replaced correctly
4. Language syncs with settings store
5. No TypeScript errors

### References

- [Source: architecture/core-architectural-decisions.md#Frontend Architecture]
- [Source: architecture/implementation-patterns-consistency-rules.md#Localization Patterns]
- [Source: project-context.md#react-i18next Rules]
- [Source: ux-design-specification.md#Error Transparency as Trust]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 8.3 & 8.4]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

