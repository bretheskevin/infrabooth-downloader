# Story 8.4: Create French Translation File

Status: review

## Story

As a **French-speaking user**,
I want **the app fully translated to French**,
so that **I can use it comfortably in my native language**.

## Acceptance Criteria (FR29)

1. **Given** the English translation file exists
   **When** creating `/src/locales/fr.json`
   **Then** all keys from en.json are present in fr.json
   **And** all values are properly translated to French

2. **Given** the French translation
   **When** reviewing the translations
   **Then** translations are natural French (not literal)
   **And** technical terms use appropriate French equivalents
   **And** tone matches the English version

3. **Given** the French translation file
   **When** examining specific translations
   **Then** key examples include:
   - "Sign in with SoundCloud" -> "Se connecter avec SoundCloud"
   - "Download" -> "Telecharger"
   - "{{current}} of {{total}} tracks" -> "{{current}} sur {{total}} pistes"
   - "Settings" -> "Parametres"

4. **Given** pluralization rules differ
   **When** French requires different plural forms
   **Then** i18next plural syntax is used correctly
   **And** French grammar rules are respected

5. **Given** the app is set to French language
   **When** viewing any UI element
   **Then** no English text appears (except brand names like SoundCloud)
   **And** accented characters display correctly (e, e, a, o, u, c)

## Tasks / Subtasks

- [ ] Task 1: Audit existing en.json for complete key inventory (AC: #1)
  - [ ] 1.1 Read current `/src/locales/en.json` to identify all translation keys
  - [ ] 1.2 Document any keys added in subsequent stories (Epic 2-7)
  - [ ] 1.3 Create master key list ensuring no keys are missed

- [ ] Task 2: Create base fr.json structure (AC: #1)
  - [ ] 2.1 Create `/src/locales/fr.json` if not exists
  - [ ] 2.2 Copy en.json structure exactly (all keys, nested structure)
  - [ ] 2.3 Verify JSON is valid with no syntax errors

- [ ] Task 3: Translate app namespace (AC: #2, #3)
  - [ ] 3.1 Translate `app.title` - keep "InfraBooth Downloader" (brand name)
  - [ ] 3.2 Verify app namespace completeness

- [ ] Task 4: Translate auth namespace (AC: #2, #3)
  - [ ] 4.1 Translate `auth.signIn` -> "Se connecter avec SoundCloud"
  - [ ] 4.2 Translate `auth.signOut` -> "Se deconnecter"
  - [ ] 4.3 Translate `auth.signedInAs` -> "Connecte en tant que {{username}}"
  - [ ] 4.4 Translate `auth.openingBrowser` -> "Ouverture du navigateur..."
  - [ ] 4.5 Translate `auth.authError` -> "Erreur d'authentification"
  - [ ] 4.6 Translate `auth.sessionExpired` -> "Session expiree, veuillez vous reconnecter"

- [ ] Task 5: Translate download namespace (AC: #2, #3, #4)
  - [ ] 5.1 Translate `download.button` -> "Telecharger"
  - [ ] 5.2 Translate `download.progress` -> "{{current}} sur {{total}} pistes"
  - [ ] 5.3 Translate `download.pending` -> "En attente"
  - [ ] 5.4 Translate `download.downloading` -> "Telechargement..."
  - [ ] 5.5 Translate `download.converting` -> "Conversion..."
  - [ ] 5.6 Translate `download.complete` -> "Termine"
  - [ ] 5.7 Translate `download.failed` -> "Echec"
  - [ ] 5.8 Translate `download.waiting` -> "Pause..."
  - [ ] 5.9 Translate `download.pasteUrl` -> "Collez une URL de playlist ou de piste SoundCloud"
  - [ ] 5.10 Add plural forms for track counts where needed

- [ ] Task 6: Translate errors namespace (AC: #2, #3)
  - [ ] 6.1 Translate `errors.invalidUrl` -> "Ce n'est pas une URL SoundCloud"
  - [ ] 6.2 Translate `errors.notTrackOrPlaylist` -> "Ceci est un profil, pas une playlist ou un morceau"
  - [ ] 6.3 Translate `errors.geoBlocked` -> "Indisponible dans votre region"
  - [ ] 6.4 Translate `errors.trackUnavailable` -> "Piste indisponible"
  - [ ] 6.5 Translate `errors.trackUnavailableDetail` -> "Cette piste a peut-etre ete supprimee ou rendue privee"
  - [ ] 6.6 Translate `errors.rateLimited` -> "Breve pause - limite de debit SoundCloud (c'est normal)"
  - [ ] 6.7 Translate `errors.networkError` -> "Pas de connexion internet"
  - [ ] 6.8 Translate `errors.downloadFailed` -> "Echec du telechargement"
  - [ ] 6.9 Translate `errors.conversionFailed` -> "Echec de la conversion"
  - [ ] 6.10 Translate `errors.panelTitle` -> "Telechargements echoues"
  - [ ] 6.11 Translate `errors.tracksFailed` -> "{{count}} piste echouee"
  - [ ] 6.12 Translate `errors.tracksFailed_plural` -> "{{count}} pistes echouees"
  - [ ] 6.13 Translate `errors.closePanel` -> "Fermer le panneau d'erreurs"
  - [ ] 6.14 Translate `errors.groupGeoBlocked` -> "Indisponible dans votre region"
  - [ ] 6.15 Translate `errors.groupUnavailable` -> "Piste supprimee ou privee"
  - [ ] 6.16 Translate `errors.groupNetwork` -> "Erreurs reseau"
  - [ ] 6.17 Translate `errors.groupOther` -> "Autres erreurs"
  - [ ] 6.18 Translate `errors.urlHint` -> "Collez un lien depuis soundcloud.com"
  - [ ] 6.19 Translate `errors.tryPlaylistHint` -> "Essayez de coller un lien de playlist ou de morceau"

- [ ] Task 7: Translate settings namespace (AC: #2, #3)
  - [ ] 7.1 Translate `settings.title` -> "Parametres"
  - [ ] 7.2 Translate `settings.language` -> "Langue"
  - [ ] 7.3 Translate `settings.downloadLocation` -> "Emplacement de telechargement"
  - [ ] 7.4 Translate `settings.selectFolder` -> "Selectionner un dossier"
  - [ ] 7.5 Translate `settings.currentFolder` -> "Dossier actuel"
  - [ ] 7.6 Translate `settings.changeFolder` -> "Changer de dossier"
  - [ ] 7.7 Translate `settings.folderNotWritable` -> "Ce dossier n'est pas accessible en ecriture"
  - [ ] 7.8 Translate `settings.folderNotFound` -> "Ce dossier n'existe plus"

- [ ] Task 8: Translate quality namespace (AC: #2)
  - [ ] 8.1 Keep `quality.badge` -> "Go+ 256kbps" (technical term, no translation)

- [ ] Task 9: Translate completion namespace (AC: #2, #3, #4)
  - [ ] 9.1 Translate `completion.title` -> "Telechargement termine !"
  - [ ] 9.2 Translate `completion.success` -> "{{completed}} sur {{total}} pistes telechargees"
  - [ ] 9.3 Translate `completion.partialSuccess` -> "{{completed}} sur {{total}} pistes telechargees"
  - [ ] 9.4 Translate `completion.openFolder` -> "Ouvrir le dossier"
  - [ ] 9.5 Translate `completion.downloadAnother` -> "Telecharger autre chose"
  - [ ] 9.6 Add singular form `completion.track` -> "piste"
  - [ ] 9.7 Add plural form `completion.track_plural` -> "pistes"

- [ ] Task 10: Translate preview namespace (AC: #2, #3, #4)
  - [ ] 10.1 Translate `preview.tracks` -> "{{count}} piste"
  - [ ] 10.2 Translate `preview.tracks_plural` -> "{{count}} pistes"
  - [ ] 10.3 Translate `preview.qualityIndicator` -> "256kbps AAC -> MP3"
  - [ ] 10.4 Translate `preview.loadingPlaylist` -> "Chargement de la playlist..."
  - [ ] 10.5 Translate `preview.loadingTrack` -> "Chargement de la piste..."

- [ ] Task 11: Translate validation namespace (AC: #2, #3)
  - [ ] 11.1 Translate `validation.validating` -> "Validation..."
  - [ ] 11.2 Translate `validation.valid` -> "URL valide"
  - [ ] 11.3 Translate `validation.invalid` -> "URL invalide"
  - [ ] 11.4 Translate `validation.playlist` -> "Playlist detectee"
  - [ ] 11.5 Translate `validation.track` -> "Piste detectee"

- [ ] Task 12: Translate accessibility labels (AC: #2)
  - [ ] 12.1 Translate `a11y.progressBar` -> "Progression du telechargement"
  - [ ] 12.2 Translate `a11y.trackList` -> "Liste des pistes"
  - [ ] 12.3 Translate `a11y.currentTrack` -> "Piste en cours"
  - [ ] 12.4 Translate `a11y.completedTrack` -> "Piste terminee"
  - [ ] 12.5 Translate `a11y.failedTrack` -> "Piste echouee"
  - [ ] 12.6 Translate `a11y.settingsButton` -> "Ouvrir les parametres"
  - [ ] 12.7 Translate `a11y.closeSettings` -> "Fermer les parametres"
  - [ ] 12.8 Translate `a11y.signOutButton` -> "Se deconnecter de SoundCloud"

- [ ] Task 13: Verify key parity with en.json (AC: #1)
  - [ ] 13.1 Compare fr.json keys against en.json
  - [ ] 13.2 Ensure no missing keys in fr.json
  - [ ] 13.3 Ensure no extra keys in fr.json
  - [ ] 13.4 Validate JSON syntax

- [ ] Task 14: Test French translations in app (AC: #5)
  - [ ] 14.1 Switch language to French in settings
  - [ ] 14.2 Navigate through all UI screens
  - [ ] 14.3 Verify accented characters render correctly
  - [ ] 14.4 Verify no English text appears (except SoundCloud brand)
  - [ ] 14.5 Test pluralization with 0, 1, and multiple items
  - [ ] 14.6 Test interpolation variables display correctly

## Dev Notes

### Complete fr.json Structure

This is the complete French translation file that mirrors en.json. All keys must be present and properly translated.

```json
{
  "app": {
    "title": "InfraBooth Downloader"
  },
  "auth": {
    "signIn": "Se connecter avec SoundCloud",
    "signOut": "Se deconnecter",
    "signedInAs": "Connecte en tant que {{username}}",
    "openingBrowser": "Ouverture du navigateur...",
    "authError": "Erreur d'authentification",
    "sessionExpired": "Session expiree, veuillez vous reconnecter"
  },
  "download": {
    "button": "Telecharger",
    "progress": "{{current}} sur {{total}} pistes",
    "pending": "En attente",
    "downloading": "Telechargement...",
    "converting": "Conversion...",
    "complete": "Termine",
    "failed": "Echec",
    "waiting": "Pause...",
    "pasteUrl": "Collez une URL de playlist ou de piste SoundCloud"
  },
  "errors": {
    "invalidUrl": "Ce n'est pas une URL SoundCloud",
    "notTrackOrPlaylist": "Ceci est un profil, pas une playlist ou un morceau",
    "geoBlocked": "Indisponible dans votre region",
    "trackUnavailable": "Piste indisponible",
    "trackUnavailableDetail": "Cette piste a peut-etre ete supprimee ou rendue privee",
    "rateLimited": "Breve pause - limite de debit SoundCloud (c'est normal)",
    "networkError": "Pas de connexion internet",
    "downloadFailed": "Echec du telechargement",
    "conversionFailed": "Echec de la conversion",
    "panelTitle": "Telechargements echoues",
    "tracksFailed": "{{count}} piste echouee",
    "tracksFailed_plural": "{{count}} pistes echouees",
    "closePanel": "Fermer le panneau d'erreurs",
    "groupGeoBlocked": "Indisponible dans votre region",
    "groupUnavailable": "Piste supprimee ou privee",
    "groupNetwork": "Erreurs reseau",
    "groupOther": "Autres erreurs",
    "urlHint": "Collez un lien depuis soundcloud.com",
    "tryPlaylistHint": "Essayez de coller un lien de playlist ou de morceau"
  },
  "settings": {
    "title": "Parametres",
    "language": "Langue",
    "downloadLocation": "Emplacement de telechargement",
    "selectFolder": "Selectionner un dossier",
    "currentFolder": "Dossier actuel",
    "changeFolder": "Changer de dossier",
    "folderNotWritable": "Ce dossier n'est pas accessible en ecriture",
    "folderNotFound": "Ce dossier n'existe plus"
  },
  "quality": {
    "badge": "Go+ 256kbps"
  },
  "completion": {
    "title": "Telechargement termine !",
    "success": "{{completed}} sur {{total}} pistes telechargees",
    "partialSuccess": "{{completed}} sur {{total}} pistes telechargees",
    "openFolder": "Ouvrir le dossier",
    "downloadAnother": "Telecharger autre chose",
    "track": "piste",
    "track_plural": "pistes"
  },
  "preview": {
    "tracks": "{{count}} piste",
    "tracks_plural": "{{count}} pistes",
    "qualityIndicator": "256kbps AAC -> MP3",
    "loadingPlaylist": "Chargement de la playlist...",
    "loadingTrack": "Chargement de la piste..."
  },
  "validation": {
    "validating": "Validation...",
    "valid": "URL valide",
    "invalid": "URL invalide",
    "playlist": "Playlist detectee",
    "track": "Piste detectee"
  },
  "a11y": {
    "progressBar": "Progression du telechargement",
    "trackList": "Liste des pistes",
    "currentTrack": "Piste en cours",
    "completedTrack": "Piste terminee",
    "failedTrack": "Piste echouee",
    "settingsButton": "Ouvrir les parametres",
    "closeSettings": "Fermer les parametres",
    "signOutButton": "Se deconnecter de SoundCloud"
  }
}
```

[Source: epics.md#Story 8.3, Story 8.4]

### French Translation Guidelines

#### Natural vs. Literal Translation

| English | Literal (Avoid) | Natural (Use) |
|---------|-----------------|---------------|
| "Sign in with SoundCloud" | "Signer avec SoundCloud" | "Se connecter avec SoundCloud" |
| "Download failed" | "Telechargement echoue" | "Echec du telechargement" |
| "Unavailable in your region" | "Indisponible dans votre region" | "Indisponible dans votre region" (same) |
| "Brief pause" | "Breve pause" | "Breve pause" (same) |
| "This is normal" | "C'est normal" | "c'est normal" (lowercase in context) |
| "Opening browser..." | "Ouverture navigateur..." | "Ouverture du navigateur..." |
| "Signed in as" | "Signe en tant que" | "Connecte en tant que" |

#### Technical Terms - Keep or Translate

| Term | Treatment | Reason |
|------|-----------|--------|
| SoundCloud | Keep | Brand name |
| Go+ | Keep | SoundCloud product name |
| 256kbps | Keep | Technical specification |
| AAC | Keep | Technical format |
| MP3 | Keep | Technical format |
| URL | Keep or "lien" | Common in French tech contexts |
| playlist | "playlist" | Commonly used in French |

[Source: ux-design-specification.md#Tone & Voice]

### French Pluralization Rules

French has two plural forms: singular (count = 0 or 1) and plural (count >= 2).

**i18next Configuration:**
```json
{
  "key": "singular form",
  "key_plural": "plural form (count >= 2)"
}
```

**Usage Examples:**

```tsx
// English pluralization (0 = plural, 1 = singular, 2+ = plural)
// French pluralization (0 = singular, 1 = singular, 2+ = plural)

// In component
const { t } = useTranslation();
t('preview.tracks', { count: 1 }); // "1 piste"
t('preview.tracks', { count: 5 }); // "5 pistes"
t('preview.tracks', { count: 0 }); // "0 piste" (French treats 0 as singular)

t('errors.tracksFailed', { count: 1 }); // "1 piste echouee"
t('errors.tracksFailed', { count: 3 }); // "3 pistes echouees"
```

**Important:** In French, zero uses singular form (unlike English). i18next handles this automatically when the language is set to French.

[Source: project-context.md#react-i18next]

### Accented Character Reference

Ensure all accented characters are properly encoded in JSON:

| Character | Usage Example |
|-----------|---------------|
| e (e-acute) | Telecharger, Termine, echoue |
| e (e-grave) | Parametres, Breve |
| a (a-grave) | deja, la |
| i (i-circumflex) | peut-etre |
| o (o-circumflex) | controler |
| u (u-circumflex) | sur |
| c (c-cedilla) | ca, recu |

JSON files should use UTF-8 encoding. Modern editors and bundlers handle this automatically, but verify no mojibake appears in the rendered UI.

### Translation Quality Checklist

When reviewing each translation, verify:

1. **Grammatical correctness**
   - Gender agreement (le/la, un/une)
   - Plural agreement (piste/pistes, echoue/echoues)
   - Verb conjugation for infinitive forms

2. **Natural phrasing**
   - Read it aloud - does it sound like natural French?
   - Would a native speaker say it this way?

3. **Tone consistency**
   - Informal "tu" vs formal "vous" - use informal for friendly app feel
   - Actually, for this app: use impersonal forms where possible
   - Keep technical but approachable tone

4. **Context appropriateness**
   - UI labels should be concise
   - Error messages should be helpful, not alarming
   - Success messages should feel satisfying

5. **Variable placement**
   - French word order may differ from English
   - Example: "{{count}} tracks" -> "{{count}} pistes" (same order)
   - Example: "Track {{number}}" -> "Piste {{number}}" (same order)

[Source: ux-design-specification.md#Tone & Voice]

### Specific Translation Notes

#### "Se connecter" vs "S'identifier"
Use "Se connecter" for sign in - it's more common in modern French apps. "S'identifier" is more formal/administrative.

#### "Telecharger" vs "Downloader"
Always use "Telecharger" - French has a perfectly good word for download. Avoid anglicisms.

#### "Echec" vs "Erreur"
- "Echec" = failure (something didn't work)
- "Erreur" = error (something went wrong)
Use "Echec" for download/conversion failures, "Erreur" for system errors.

#### "Piste" vs "Morceau" vs "Titre"
- "Piste" = track (most common for audio tracks)
- "Morceau" = piece/track (also acceptable, slightly more casual)
- "Titre" = title (more formal, refers to the name)
Use "Piste" consistently throughout the app.

#### "Dossier" vs "Repertoire" vs "Fichier"
- "Dossier" = folder (use this)
- "Repertoire" = directory (more technical)
- "Fichier" = file
Use "Dossier" for folder selection UI.

### Anti-Patterns to Avoid

- Do NOT use Google Translate verbatim - always review for natural phrasing
- Do NOT mix formal "vous" and informal "tu" - stay consistent
- Do NOT translate brand names (SoundCloud, Go+)
- Do NOT translate technical specifications (256kbps, AAC, MP3)
- Do NOT forget to update plural forms - French pluralization differs
- Do NOT add extra keys not present in en.json - maintain parity
- Do NOT omit keys from en.json - all keys must be translated
- Do NOT use accented characters inconsistently (e vs e')
- Do NOT assume English word order works in French

[Source: project-context.md#Anti-Patterns to Avoid]

### File Location and Naming

```
src/
└── locales/
    ├── en.json    # English (reference)
    └── fr.json    # French (this story)
```

**CRITICAL:** The file must be named exactly `fr.json` (lowercase) to match i18next configuration from Story 1.5.

[Source: architecture/project-structure-boundaries.md#Localization]

### Validation Script (Optional)

Create a simple validation to ensure key parity:

```typescript
// scripts/validate-locales.ts
import en from '../src/locales/en.json';
import fr from '../src/locales/fr.json';

const getKeys = (obj: object, prefix = ''): string[] => {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      return getKeys(value, path);
    }
    return [path];
  });
};

const enKeys = new Set(getKeys(en));
const frKeys = new Set(getKeys(fr));

const missingInFr = [...enKeys].filter(k => !frKeys.has(k));
const extraInFr = [...frKeys].filter(k => !enKeys.has(k));

if (missingInFr.length > 0) {
  console.error('Missing in fr.json:', missingInFr);
}
if (extraInFr.length > 0) {
  console.error('Extra in fr.json:', extraInFr);
}

if (missingInFr.length === 0 && extraInFr.length === 0) {
  console.log('Locale files have matching keys');
}
```

### Testing Checklist

- [ ] fr.json is valid JSON (no syntax errors)
- [ ] All keys from en.json exist in fr.json
- [ ] No extra keys in fr.json that aren't in en.json
- [ ] All translations are in French (no untranslated English)
- [ ] Accented characters display correctly (e, e, a, c)
- [ ] Pluralization works: 1 piste, 2 pistes
- [ ] Pluralization with zero: 0 piste (French singular for zero)
- [ ] Interpolation variables work: {{username}}, {{count}}, {{current}}, {{total}}
- [ ] Brand names remain untranslated (SoundCloud, Go+)
- [ ] Technical terms remain as-is (256kbps, AAC, MP3)
- [ ] UI reads naturally in French
- [ ] Error messages are helpful, not alarming
- [ ] Success messages feel satisfying
- [ ] Settings panel labels are clear
- [ ] All accessibility labels are translated
- [ ] Language switch updates all visible text immediately

### Dependencies

This story depends on:
- Story 1.5: Configure react-i18next Foundation (i18n setup, initial locale files)
- Story 8.2: Implement Language Selector (ability to switch to French)
- Story 8.3: Create English Translation File (en.json structure to mirror)

This story enables:
- FR29: User can view application interface in French
- Complete French localization of the entire application

### Functional Requirements Covered

| FR | Description | How This Story Addresses |
|----|-------------|-------------------------|
| FR29 | User can view application interface in French | Creates complete fr.json with all UI strings translated |

### References

- [Source: epics.md#Story 8.4]
- [Source: epics.md#Story 8.3]
- [Source: prd/functional-requirements.md#Localization]
- [Source: project-context.md#react-i18next]
- [Source: architecture/project-structure-boundaries.md#Localization]
- [Source: ux-design-specification.md#Accessibility]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- fr.json already existed with comprehensive French translations for most namespaces
- Added 3 missing namespaces to match en.json: `quality`, `update`, `accessibility`
- Key parity verified: 104 keys in both files
- All 700 tests pass
- TypeScript check passes
- JSON syntax validated

### Change Log

- 2026-02-10: Added quality, update, and accessibility namespaces to fr.json

### File List

- src/locales/fr.json (modified - added quality, update, accessibility namespaces)

