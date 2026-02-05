---
project_name: 'sc-downloader'
user_name: 'Kandid'
date: '2026-02-05'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality', 'workflow_rules', 'critical_rules']
status: 'complete'
rule_count: 109
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

| Technology | Version | Purpose |
|------------|---------|---------|
| Tauri | 2.0 | Desktop framework (Rust + web frontend) |
| React | latest | UI framework |
| TypeScript | strict mode | Type-safe frontend |
| Vite | latest | Build tooling with HMR |
| Rust | stable | Tauri backend |
| Tailwind CSS | latest | Utility-first styling |
| Shadcn/ui | 3.8.3 | Component library (copy-paste pattern) |
| Zustand | latest | State management |
| react-i18next | latest | Localization (EN/FR) |
| yt-dlp | pinned | Audio extraction sidecar |
| FFmpeg | pinned | Audio conversion sidecar |

**Version Constraints:**
- yt-dlp and FFmpeg must be pinned versions with checksum verification (NFR11/12)
- Tauri 2.0 required — do not use Tauri 1.x patterns
- TypeScript strict mode is mandatory

---

## Critical Implementation Rules

### Language-Specific Rules

**TypeScript:**
- Strict mode is mandatory — no `any` types allowed
- Use `interface` for object shapes, `type` for unions/intersections
- Prefer `const` over `let`; never use `var`
- Async functions must handle errors with try/catch or .catch()

**Rust:**
- All Tauri commands must return `Result<T, E>` for proper error handling
- Use `thiserror` for error type definitions
- Serde derives required for IPC types: `#[derive(Serialize, Deserialize)]`

**Cross-Language Type Safety:**
- TypeScript types in `src/types/` MUST mirror Rust structs in `src-tauri/src/models/`
- When modifying an IPC payload, update BOTH TypeScript and Rust definitions
- Event payload types: `src/types/events.ts` ↔ `src-tauri/src/models/events.rs`

### Framework-Specific Rules

**Tauri IPC:**
- Commands initiate actions: `invoke('startDownload', { url })`
- Events stream updates: `listen('download-progress', handler)`
- Command names: snake_case in Rust, camelCase in JS invoke
- Event names: always kebab-case (`download-progress`, `auth-state-changed`)

**React:**
- Functional components only — no class components
- Custom hooks for Tauri event subscriptions (e.g., `useDownloadProgress`)
- Components organized by feature: `src/components/features/{feature}/`
- Shadcn/ui base components in `src/components/ui/`

**Zustand:**
- One store per domain: `authStore.ts`, `queueStore.ts`, `settingsStore.ts`
- Action naming prefixes:
  - `set` — replace value (`setTracks`)
  - `update` — partial update (`updateTrackStatus`)
  - `add` — add to collection (`addTrack`)
  - `remove` — remove from collection (`removeTrack`)
  - `clear` — reset to empty (`clearQueue`)

**react-i18next:**
- Key structure: `{namespace}.{section}.{element}`
- Namespaces: `auth`, `download`, `errors`, `settings`
- Keys use camelCase: `auth.signedInAs`
- Interpolation: `{{variable}}`

### Testing Rules

**Test Organization:**
- Unit tests: co-located with source as `ComponentName.test.ts`
- E2E tests: placed in `/tests/e2e/`
- Rust unit tests: inline `#[cfg(test)]` modules in same file

**Test Naming:**
- Test files: `{SourceFile}.test.ts` (e.g., `TrackCard.test.ts`)
- Test descriptions: "should {expected behavior} when {condition}"

**Mocking:**
- Mock Tauri APIs using `@tauri-apps/api` test utilities
- Mock Zustand stores for component isolation
- Never mock internal implementation details

**Coverage Expectations:**
- Critical paths (auth, download flow) require tests
- Utility functions require unit tests
- UI components: test user interactions, not implementation

### Code Quality & Style Rules

**File Naming:**
- React components: `PascalCase.tsx` (e.g., `TrackCard.tsx`)
- Hooks: `camelCase.ts` (e.g., `useDownloadProgress.ts`)
- Utilities: `camelCase.ts` (e.g., `formatDuration.ts`)
- Rust modules: `snake_case.rs` (e.g., `download.rs`)

**Component Naming:**
- Components: PascalCase (`TrackCard`, `UrlInput`)
- Hooks: camelCase with `use` prefix (`useAuthState`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_RETRIES`)
- Variables: camelCase (`trackList`, `isLoading`)

**Code Organization:**
- One component per file
- Export component as named export, not default
- Group imports: external → internal → types → styles

**Formatting:**
- Use Prettier for consistent formatting
- Use ESLint for code quality
- Run `npm run lint` before committing

**Comments:**
- Only add comments for non-obvious logic
- Use JSDoc for public utility functions
- Rust: use `///` for public API documentation

### Development Workflow Rules

**Branch Naming:**
- Feature: `feat/{short-description}`
- Bugfix: `fix/{short-description}`
- Chore: `chore/{short-description}`

**Commit Messages:**
- Follow Conventional Commits: `type(scope): description`
- Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`
- Scope: optional, indicates affected area (e.g., `auth`, `download`)

**CI/CD Pipeline:**
- Push to main triggers build workflow
- Windows + macOS builds run in parallel
- Binary checksums verified before release
- Releases created via GitHub Releases with Tauri updater manifest

**Before Committing:**
1. Run `npm run lint` — fix any errors
2. Run `npm run typecheck` — ensure no TypeScript errors
3. Run `cargo check` — verify Rust compiles
4. Run tests if modifying critical paths

### Critical Don't-Miss Rules

**Error Codes (use these exactly):**

| Code | Meaning |
|------|---------|
| `INVALID_URL` | Not a valid SoundCloud track/playlist URL |
| `GEO_BLOCKED` | Track unavailable in user's region |
| `RATE_LIMITED` | SoundCloud throttling (will auto-retry) |
| `NETWORK_ERROR` | No internet connection |
| `DOWNLOAD_FAILED` | yt-dlp extraction failed |
| `CONVERSION_FAILED` | FFmpeg processing failed |

**Authentication Behavior:**
- Auth is **optional** — app works without sign-in
- Signed-in users get higher quality audio from SoundCloud
- UI should encourage sign-in but not block functionality

**IPC Payload Structure (must match exactly):**

```typescript
// Command response
{ success: true, data: T }
{ success: false, error: { code: string, message: string } }

// download-progress event
{ trackId: string, status: 'pending' | 'downloading' | 'converting' | 'complete' | 'failed', percent: number, error?: { code: string, message: string } }
```

**Anti-Patterns to Avoid:**
- Don't create custom error codes — use the defined codes above
- Don't use default exports — use named exports
- Don't store tokens in plain text — use machine-bound encryption
- Don't use Tauri 1.x patterns — this is Tauri 2.0
- Don't make network calls without HTTPS
- Don't skip checksum verification for sidecar binaries
- Don't block features for unauthenticated users — auth is optional

**Security Rules:**
- All network requests must use HTTPS
- OAuth tokens encrypted at rest with machine-bound keys (if user signs in)
- No telemetry or analytics collection
- Sanitize filenames before writing to filesystem

**Shadcn/ui Requirement:**
- **Use Shadcn MCP server** when creating components or writing stories
- Search the registry to identify available components before implementation
- Stories must reference correct Shadcn component names and patterns

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

---

_Last Updated: 2026-02-05_

