# Story 3.2: Implement URL Validation Logic

Status: review

## Story

As a **developer**,
I want **backend URL validation for SoundCloud URLs**,
so that **only valid track and playlist URLs are accepted**.

## Acceptance Criteria

1. **Given** a URL is pasted
   **When** the validation command is invoked
   **Then** the URL is checked against SoundCloud URL patterns
   **And** validation completes within 500ms (UX-1)

2. **Given** a valid playlist URL (e.g., `soundcloud.com/user/sets/playlist-name`)
   **When** validated
   **Then** the URL is recognized as type "playlist"
   **And** a success response is returned with the URL type

3. **Given** a valid track URL (e.g., `soundcloud.com/user/track-name`)
   **When** validated
   **Then** the URL is recognized as type "track"
   **And** a success response is returned with the URL type

4. **Given** a SoundCloud profile URL (e.g., `soundcloud.com/user`)
   **When** validated
   **Then** validation fails with error: "This is a profile, not a playlist or track"
   **And** a hint is included: "Try pasting a playlist or track link"

5. **Given** a non-SoundCloud URL
   **When** validated
   **Then** validation fails with error: "Not a SoundCloud URL"
   **And** a hint is included: "Paste a link from soundcloud.com"

6. **Given** malformed or empty input
   **When** validated
   **Then** validation fails with error: "Invalid URL format"

## Tasks / Subtasks

- [x] Task 1: Create URL validation types (AC: #1, #2, #3)
  - [x] 1.1 Create `src-tauri/src/models/url.rs`:
    ```rust
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Clone, Serialize, Deserialize)]
    #[serde(rename_all = "lowercase")]
    pub enum UrlType {
        Playlist,
        Track,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct ValidationResult {
        pub valid: bool,
        pub url_type: Option<UrlType>,
        pub error: Option<ValidationError>,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct ValidationError {
        pub code: String,
        pub message: String,
        pub hint: Option<String>,
    }
    ```
  - [x] 1.2 Add to `src-tauri/src/models/mod.rs`

- [x] Task 2: Implement URL pattern matching (AC: #2, #3, #4, #5, #6)
  - [x] 2.1 Create `src-tauri/src/services/url_validator.rs`:
    ```rust
    use regex::Regex;
    use url::Url;
    use crate::models::url::{UrlType, ValidationResult, ValidationError};

    // URL patterns
    const SOUNDCLOUD_HOSTS: [&str; 2] = ["soundcloud.com", "www.soundcloud.com"];

    pub fn validate_url(input: &str) -> ValidationResult {
        // Check if input is empty
        if input.trim().is_empty() {
            return ValidationResult {
                valid: false,
                url_type: None,
                error: Some(ValidationError {
                    code: "INVALID_URL".to_string(),
                    message: "Invalid URL format".to_string(),
                    hint: None,
                }),
            };
        }

        // Parse URL
        let url = match Url::parse(input) {
            Ok(u) => u,
            Err(_) => {
                // Try adding https:// prefix
                match Url::parse(&format!("https://{}", input)) {
                    Ok(u) => u,
                    Err(_) => return invalid_format_error(),
                }
            }
        };

        // Check if SoundCloud domain
        let host = url.host_str().unwrap_or("");
        if !SOUNDCLOUD_HOSTS.contains(&host) {
            return ValidationResult {
                valid: false,
                url_type: None,
                error: Some(ValidationError {
                    code: "INVALID_URL".to_string(),
                    message: "Not a SoundCloud URL".to_string(),
                    hint: Some("Paste a link from soundcloud.com".to_string()),
                }),
            };
        }

        // Parse path segments
        let path = url.path();
        let segments: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();

        match segments.as_slice() {
            // Playlist: /user/sets/playlist-name
            [_user, "sets", _playlist] => ValidationResult {
                valid: true,
                url_type: Some(UrlType::Playlist),
                error: None,
            },
            // Track: /user/track-name (2 segments, not "sets")
            [_user, track] if *track != "sets" => ValidationResult {
                valid: true,
                url_type: Some(UrlType::Track),
                error: None,
            },
            // Profile: /user (1 segment only)
            [_user] => ValidationResult {
                valid: false,
                url_type: None,
                error: Some(ValidationError {
                    code: "INVALID_URL".to_string(),
                    message: "This is a profile, not a playlist or track".to_string(),
                    hint: Some("Try pasting a playlist or track link".to_string()),
                }),
            },
            // Other patterns
            _ => invalid_format_error(),
        }
    }

    fn invalid_format_error() -> ValidationResult {
        ValidationResult {
            valid: false,
            url_type: None,
            error: Some(ValidationError {
                code: "INVALID_URL".to_string(),
                message: "Invalid URL format".to_string(),
                hint: None,
            }),
        }
    }
    ```
  - [x] 2.2 Add `regex` crate to Cargo.toml: `regex = "1"`

- [x] Task 3: Create Tauri validate command (AC: #1)
  - [x] 3.1 Create `src-tauri/src/commands/playlist.rs`:
    ```rust
    use tauri::command;
    use crate::services::url_validator::validate_url;
    use crate::models::url::ValidationResult;

    #[command]
    pub fn validate_soundcloud_url(url: String) -> ValidationResult {
        validate_url(&url)
    }
    ```
  - [x] 3.2 Register command in `lib.rs`

- [x] Task 4: Create TypeScript types and function (AC: #1)
  - [x] 4.1 Create `src/types/url.ts`:
    ```typescript
    export type UrlType = 'playlist' | 'track';

    export interface ValidationError {
      code: string;
      message: string;
      hint?: string;
    }

    export interface ValidationResult {
      valid: boolean;
      urlType?: UrlType;
      error?: ValidationError;
    }
    ```
  - [x] 4.2 Create `src/lib/validation.ts`:
    ```typescript
    import { invoke } from '@tauri-apps/api/core';
    import type { ValidationResult } from '@/types/url';

    export async function validateUrl(url: string): Promise<ValidationResult> {
      return invoke<ValidationResult>('validate_soundcloud_url', { url });
    }
    ```

- [x] Task 5: Implement debounced validation in DownloadSection (AC: #1)
  - [x] 5.1 Create `src/hooks/useDebounce.ts`:
    ```typescript
    import { useState, useEffect } from 'react';

    export function useDebounce<T>(value: T, delay: number): T {
      const [debouncedValue, setDebouncedValue] = useState<T>(value);

      useEffect(() => {
        const handler = setTimeout(() => {
          setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(handler);
      }, [value, delay]);

      return debouncedValue;
    }
    ```
  - [x] 5.2 Update `DownloadSection.tsx` to use debounced validation:
    ```typescript
    const [url, setUrl] = useState('');
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [isValidating, setIsValidating] = useState(false);

    const debouncedUrl = useDebounce(url, 300);

    useEffect(() => {
      if (!debouncedUrl) {
        setValidationResult(null);
        return;
      }

      setIsValidating(true);
      validateUrl(debouncedUrl)
        .then(setValidationResult)
        .finally(() => setIsValidating(false));
    }, [debouncedUrl]);
    ```

- [x] Task 6: Add unit tests for URL validation (AC: #2-#6)
  - [x] 6.1 Create `src-tauri/src/services/url_validator.test.rs`:
    ```rust
    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn test_valid_playlist_url() {
            let result = validate_url("https://soundcloud.com/user/sets/my-playlist");
            assert!(result.valid);
            assert_eq!(result.url_type, Some(UrlType::Playlist));
        }

        #[test]
        fn test_valid_track_url() {
            let result = validate_url("https://soundcloud.com/artist/track-name");
            assert!(result.valid);
            assert_eq!(result.url_type, Some(UrlType::Track));
        }

        #[test]
        fn test_profile_url_rejected() {
            let result = validate_url("https://soundcloud.com/user");
            assert!(!result.valid);
            assert!(result.error.unwrap().message.contains("profile"));
        }

        #[test]
        fn test_non_soundcloud_url() {
            let result = validate_url("https://spotify.com/track/123");
            assert!(!result.valid);
            assert!(result.error.unwrap().message.contains("Not a SoundCloud"));
        }

        #[test]
        fn test_empty_input() {
            let result = validate_url("");
            assert!(!result.valid);
        }
    }
    ```

## Dev Notes

### SoundCloud URL Patterns

| Pattern | Type | Example |
|---------|------|---------|
| `/user/sets/name` | Playlist | `soundcloud.com/edm-lover/sets/summer-2024` |
| `/user/track` | Track | `soundcloud.com/artist/my-song` |
| `/user` | Profile (invalid) | `soundcloud.com/edm-lover` |
| `/discover` | Page (invalid) | `soundcloud.com/discover` |

### Validation Speed Requirement

Validation must complete within 500ms (UX-1). The local pattern matching is instant; this constraint applies to the full round-trip including IPC.

Use debouncing (300ms) to avoid excessive validation calls during typing.
[Source: ux-design-specification.md#Effortless Interactions]

### Error Codes

Use the defined `INVALID_URL` error code for all URL validation failures:
```rust
code: "INVALID_URL".to_string()
```
[Source: project-context.md#Error Codes]

### URL Normalization

The validator handles:
- Missing protocol (adds `https://`)
- www vs non-www (both accepted)
- Query strings (ignored for validation)
- Trailing slashes (handled by path parsing)

### File Structure After This Story

```
src-tauri/
├── src/
│   ├── commands/
│   │   ├── mod.rs
│   │   └── playlist.rs      # validate_soundcloud_url
│   ├── services/
│   │   ├── mod.rs
│   │   └── url_validator.rs # URL pattern matching
│   └── models/
│       ├── mod.rs
│       └── url.rs           # UrlType, ValidationResult

src/
├── types/
│   └── url.ts               # TypeScript types
├── lib/
│   └── validation.ts        # validateUrl function
├── hooks/
│   └── useDebounce.ts       # Debounce hook
```

### Cross-Language Type Safety

TypeScript types in `src/types/url.ts` MUST match Rust structs:
- `UrlType` = `'playlist' | 'track'`
- `ValidationResult` = `{ valid, urlType?, error? }`
- `ValidationError` = `{ code, message, hint? }`

[Source: project-context.md#Cross-Language Type Safety]

### What This Story Does NOT Include

- Visual feedback for validation (Story 3.3)
- API calls to fetch playlist metadata (Story 3.4)
- Actual download functionality (Epic 4)

This story implements pattern-based validation only.

### Anti-Patterns to Avoid

- Do NOT make API calls for validation — pattern matching only
- Do NOT block UI during validation — use async/debounce
- Do NOT create custom error codes — use `INVALID_URL`
- Do NOT validate on every keystroke — debounce 300ms

### Testing the Result

After completing all tasks:
1. Playlist URL returns `{ valid: true, urlType: 'playlist' }`
2. Track URL returns `{ valid: true, urlType: 'track' }`
3. Profile URL returns error with hint
4. Non-SoundCloud URL returns "Not a SoundCloud URL"
5. Empty input returns "Invalid URL format"
6. Validation completes in <500ms
7. Rust unit tests pass

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2]
- [Source: ux-design-specification.md#Effortless Interactions]
- [Source: project-context.md#Error Codes]
- [Source: project-context.md#Cross-Language Type Safety]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None required - implementation completed without issues.

### Completion Notes List

- **Task 1:** Created Rust types for URL validation (`UrlType`, `ValidationResult`, `ValidationError`) with proper serde derives for IPC serialization. Added `#[serde(rename_all = "camelCase")]` to match TypeScript naming conventions.
- **Task 2:** Implemented URL pattern matching in `url_validator.rs`. Handles:
  - Playlist URLs (`/user/sets/playlist-name`)
  - Track URLs (`/user/track-name`)
  - Profile URL rejection with helpful hint
  - Non-SoundCloud URL rejection
  - Empty/malformed input handling
  - URL normalization (missing protocol, www prefix, query strings, trailing slashes)
- **Task 3:** Created Tauri command `validate_soundcloud_url` and registered in `lib.rs` invoke handler.
- **Task 4:** Created TypeScript types mirroring Rust structs and `validateUrl()` function using Tauri invoke.
- **Task 5:** Implemented `useDebounce` hook (300ms delay) and integrated validation into `DownloadSection.tsx`. Updated `UrlInput` props interface to accept validation state (visual feedback deferred to Story 3.3).
- **Task 6:** Added comprehensive unit tests:
  - 13 Rust unit tests in `url_validator.rs` (all edge cases covered)
  - 6 frontend tests for `validation.ts` (invoke mocking)
  - 5 frontend tests for `useDebounce.ts` (timing verification)

### File List

**New Files:**
- `src-tauri/src/models/url.rs` - URL validation types
- `src-tauri/src/services/url_validator.rs` - URL pattern matching + 13 tests
- `src-tauri/src/commands/playlist.rs` - Tauri validate command
- `src/types/url.ts` - TypeScript URL types
- `src/lib/validation.ts` - validateUrl function
- `src/lib/validation.test.ts` - 6 validation tests
- `src/hooks/useDebounce.ts` - Debounce hook
- `src/hooks/useDebounce.test.ts` - 5 debounce tests

**Modified Files:**
- `src-tauri/Cargo.toml` - Added regex crate
- `src-tauri/src/models/mod.rs` - Export url module
- `src-tauri/src/services/mod.rs` - Export url_validator module
- `src-tauri/src/commands/mod.rs` - Export playlist command
- `src-tauri/src/lib.rs` - Register validate_soundcloud_url command
- `src/hooks/index.ts` - Export useDebounce
- `src/components/features/download/DownloadSection.tsx` - Add debounced validation
- `src/components/features/download/UrlInput.tsx` - Accept validation props

### Change Log

- 2026-02-09: Story 3.2 implemented - URL validation logic with 24 total tests (13 Rust + 11 TS)

