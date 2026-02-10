import 'i18next';

// Type definitions for i18n translation keys
// Note: Full type safety is not enforced to allow dynamic key lookups
// which are used in error message mappings and status label lookups.
// The en.json file serves as the source of truth for available keys.

declare module 'i18next' {
  interface CustomTypeOptions {
    // Allow any string as translation key to support dynamic key lookups
    // TypeScript autocomplete is provided by importing en.json directly in components
    returnNull: false;
  }
}

// Export translation key types for components that want type-safe keys
export type TranslationNamespace =
  | 'app'
  | 'auth'
  | 'download'
  | 'completion'
  | 'errors'
  | 'settings'
  | 'progress'
  | 'quality'
  | 'update'
  | 'accessibility';

