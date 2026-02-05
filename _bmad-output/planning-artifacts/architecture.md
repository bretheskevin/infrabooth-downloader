---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/planning-artifacts/prd-validation-report.md'
  - '_bmad-output/brainstorming/brainstorming-session-2026-02-04.md'
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-02-05'
project_name: 'sc-downloader'
user_name: 'Kandid'
date: '2026-02-05'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

| Category | Count | Architectural Implication |
|----------|-------|---------------------------|
| Authentication | 4 | OAuth flow, token persistence, session management |
| Content Download | 6 | yt-dlp integration, FFmpeg pipeline, metadata handling |
| Progress & Status | 4 | IPC streaming, UI state management, real-time updates |
| Error Handling | 5 | Error categorization, graceful degradation, user messaging |
| File Management | 3 | Native dialogs, filesystem writes, filename sanitization |
| Application Lifecycle | 5 | Update system, offline detection, settings persistence |
| Localization | 3 | i18n framework, string extraction, language switching |

**Non-Functional Requirements:**

| Category | Key Constraints |
|----------|-----------------|
| Performance | 3s launch, 100ms UI response, 500ms progress updates |
| Security | Machine-bound encryption, HTTPS only, no telemetry |
| Reliability | 100-track capacity, partial failure isolation, state persistence |
| Integration | Pinned binaries, checksum verification, version control |

**Scale & Complexity:**

- Primary domain: Desktop application (Tauri: Rust + React/TypeScript)
- Complexity level: Low (single-purpose utility)
- Estimated architectural components: 8-10 modules

### Technical Constraints & Dependencies

| Constraint | Impact |
|------------|--------|
| Bundled binaries (yt-dlp, FFmpeg) | Platform-specific build pipelines, binary size ~50MB |
| OAuth browser flow | System browser dependency, callback URL handling |
| Sequential downloads | Simplifies state but requires queue management |
| Offline UI capability | Network state detection, graceful feature degradation |
| Windows 10+ / macOS 11+ | Tauri compatibility, native dialog APIs |

### Cross-Cutting Concerns Identified

| Concern | Affected Components | Strategy Needed |
|---------|---------------------|-----------------|
| Error Handling | All modules | Consistent error types, user-friendly messaging |
| Progress Reporting | Download engine → UI | IPC event streaming, state synchronization |
| Logging | All modules | Structured format, rotation, severity levels |
| Security | Auth, storage, network | Encryption at rest, HTTPS enforcement |
| Localization | All UI strings | i18n framework selection, string management |
| Rate Limiting | Download engine | Fibonacci backoff, transparent status |

## Starter Template Evaluation

### Primary Technology Domain

Desktop Application (Tauri) based on project requirements for a cross-platform SoundCloud downloader.

### Starter Options Considered

| Option | Pros | Cons |
|--------|------|------|
| Official `create-tauri-app` | Official support, latest versions, clean base | Requires manual Tailwind/Shadcn setup |
| Community Tauri+Shadcn templates | Pre-configured stack | May lag Tauri 2.0 updates, unknown maintenance |

### Selected Approach: Official Tauri CLI + Manual Stack Configuration

**Rationale:**
- Official tooling ensures Tauri 2.0 compatibility
- Shadcn/ui is designed to be added to projects, not bundled
- Full control over dependency versions
- No inherited technical debt from community templates

**Initialization Commands:**

```bash
# Create Tauri project (interactive prompts)
npm create tauri-app@latest

# Prompts:
# - Project name: infrabooth-downloader
# - Bundle identifier: com.infrabooth.downloader
# - Frontend language: TypeScript
# - Package manager: npm (or pnpm/yarn/bun)
# - UI template: React
# - Flavor: TypeScript

cd infrabooth-downloader

# Add Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Initialize Shadcn/ui
npx shadcn@latest init
```

**Tauri Configuration (`src-tauri/tauri.conf.json`):**

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  }
}
```

### Architectural Decisions Provided by Starter

**Language & Runtime:**
- TypeScript with strict mode
- Rust for Tauri backend
- Node.js for build tooling

**Styling Solution:**
- Tailwind CSS (utility-first)
- Shadcn/ui components (copy-paste, customizable)
- CSS variables for theming

**Build Tooling:**
- Vite for frontend bundling
- Cargo for Rust compilation
- Tauri CLI for packaging

**Code Organization:**
- `/src` — React frontend code
- `/src-tauri` — Rust backend code
- `/src/components` — UI components (Shadcn)
- `/src/lib` — Utilities and helpers

**Development Experience:**
- Vite HMR for instant frontend updates
- Tauri dev mode with Rust hot-reload
- TypeScript type checking

**Note:** Project initialization should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- IPC pattern for Rust ↔ React communication
- State management for download queue and UI
- Localization framework for EN/FR support

**Important Decisions (Shape Architecture):**
- Binary bundling strategy for yt-dlp/FFmpeg
- CI/CD pipeline for cross-platform builds

**Deferred Decisions (Post-MVP):**
- Code signing (v1.1 per brainstorming)
- Linux support (not in current scope)

### IPC & Communication

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **IPC Pattern** | Tauri Commands + Events | Commands initiate actions, Events stream progress — native Tauri pattern |
| **Progress Streaming** | Tauri event emitter | Rust emits per-track status, React subscribes |
| **Error Communication** | Structured error types | Rust errors mapped to user-friendly messages in React |

**Implementation Pattern:**

```rust
// Rust: Emit progress events
app.emit("download-progress", ProgressPayload { track_id, status, percent });
```

```typescript
// React: Subscribe to events
listen("download-progress", (event) => updateTrackStatus(event.payload));
```

### Frontend Architecture

| Decision | Choice | Version | Rationale |
|----------|--------|---------|-----------|
| **State Management** | Zustand | latest | Lightweight, TypeScript-friendly, handles frequent updates |
| **Localization** | react-i18next | latest | Industry standard, JSON translation files, future-proof |

**State Structure:**

```typescript
interface AppState {
  auth: { isSignedIn: boolean; username: string | null; };
  queue: { tracks: Track[]; currentIndex: number; };
  settings: { downloadPath: string; language: 'en' | 'fr'; };
}
```

### Binary Management

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Bundling Strategy** | Tauri Sidecar | Official pattern, platform-specific binary selection |
| **yt-dlp** | Pinned version, checksum verified | NFR11 compliance |
| **FFmpeg** | Pinned version, checksum verified | NFR12 compliance |
| **Binary Location** | App resources folder | Tauri sidecar default |

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **CI/CD** | GitHub Actions | Free, official Tauri support via tauri-action |
| **Build Targets** | Windows (MSI), macOS (DMG) | Per PRD platform requirements |
| **Release Distribution** | GitHub Releases | Tauri updater integration |
| **Update Manifest** | Auto-generated by tauri-action | Enables in-app update checks |

**Pipeline Structure:**

1. Push to main → Trigger build
2. Build Windows + macOS in parallel
3. Verify binary checksums
4. Create GitHub Release with artifacts
5. Generate updater manifest JSON

### Decision Impact Analysis

**Implementation Sequence:**

1. Project initialization (Tauri + React + Vite)
2. Tailwind + Shadcn/ui setup
3. Zustand store structure
4. react-i18next configuration
5. Tauri sidecar configuration for binaries
6. GitHub Actions workflow

**Cross-Component Dependencies:**

- Zustand store ← Tauri events (progress updates)
- react-i18next ← Settings store (language preference)
- Tauri sidecar ← CI pipeline (binary bundling)

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Addressed:** 5 areas where AI agents could make incompatible choices

### Naming Patterns

**Tauri Commands (Rust ↔ JS):**

| Layer | Convention | Example |
|-------|------------|---------|
| Rust function | snake_case | `fn start_download()` |
| JS invoke | camelCase | `invoke('startDownload')` |

**Tauri Events:**

| Convention | Example |
|------------|---------|
| kebab-case | `download-progress`, `auth-state-changed` |

**React/TypeScript:**

| Element | Convention | Example |
|---------|------------|---------|
| Component files | PascalCase | `TrackCard.tsx` |
| Component names | PascalCase | `export function TrackCard()` |
| Hook files | camelCase | `useDownloadQueue.ts` |
| Utility files | camelCase | `formatDuration.ts` |
| Variables | camelCase | `const trackList` |
| Constants | SCREAMING_SNAKE | `const MAX_RETRIES` |

### Structure Patterns

**Project Organization:**

```
infrabooth-downloader/
├── src/                      # React frontend
│   ├── components/
│   │   ├── ui/               # Shadcn/ui base components
│   │   └── features/         # Feature-specific components
│   ├── hooks/                # Custom React hooks
│   ├── stores/               # Zustand stores
│   ├── lib/                  # Utilities and helpers
│   ├── locales/              # i18n translation files
│   │   ├── en.json
│   │   └── fr.json
│   └── App.tsx
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── commands/         # Tauri command handlers
│   │   ├── services/         # Business logic
│   │   ├── models/           # Data structures
│   │   └── lib.rs
│   └── binaries/             # yt-dlp, FFmpeg sidecars
├── tests/                    # E2E tests
└── .github/workflows/        # CI/CD
```

**Test Location:** Co-located `*.test.ts` for unit tests, `/tests` for E2E

### Format Patterns

**Tauri Command Responses:**

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: string, message: string } }
```

**Event Payloads:**

```typescript
// download-progress
{
  trackId: string;
  status: 'pending' | 'downloading' | 'converting' | 'complete' | 'failed';
  percent: number;
  error?: { code: string; message: string };
}

// auth-state-changed
{
  isSignedIn: boolean;
  username: string | null;
}
```

**Error Codes:**

| Code | Meaning |
|------|---------|
| `AUTH_REQUIRED` | Not signed in |
| `INVALID_URL` | Not a valid SoundCloud track/playlist |
| `GEO_BLOCKED` | Track unavailable in region |
| `RATE_LIMITED` | SoundCloud throttling (will retry) |
| `NETWORK_ERROR` | No internet connection |
| `DOWNLOAD_FAILED` | yt-dlp extraction failed |
| `CONVERSION_FAILED` | FFmpeg processing failed |

### Communication Patterns

**Zustand Store Organization:**

```
src/stores/
├── authStore.ts
├── queueStore.ts
└── settingsStore.ts
```

**Action Naming:**

| Action Type | Prefix | Example |
|-------------|--------|---------|
| Set/replace | `set` | `setTracks`, `setAuth` |
| Update partial | `update` | `updateTrackStatus` |
| Add to collection | `add` | `addTrack` |
| Remove | `remove` | `removeTrack` |
| Clear/reset | `clear` | `clearQueue` |

### Localization Patterns

**i18n Key Structure:** `{namespace}.{section}.{element}`

**Namespaces:**

| Namespace | Purpose |
|-----------|---------|
| `auth` | Authentication UI |
| `download` | Download flow UI |
| `errors` | Error messages |
| `settings` | Settings panel |

**Rules:**
- camelCase for keys (`signedInAs`)
- `{{variable}}` for interpolation
- Group by feature/screen

### Enforcement Guidelines

**All AI Agents MUST:**

1. Follow naming conventions exactly (no variations)
2. Place files in designated directories
3. Use defined error codes (no custom codes without updating this doc)
4. Match IPC payload structures exactly
5. Use established Zustand action prefixes
6. **Use Shadcn MCP server for all frontend-related work** — including when creating epics/stories. Agents must search the Shadcn registry to identify available components before writing stories, ensuring stories reference correct component names and patterns.

**Pattern Verification:**
- TypeScript will enforce interface shapes
- ESLint rules for naming conventions
- PR review checklist includes pattern compliance

## Project Structure & Boundaries

### Complete Project Directory Structure

```
infrabooth-downloader/
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── components.json                 # Shadcn/ui config
├── .env.example
├── .gitignore
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Lint, type-check, test
│       └── release.yml             # Tauri build + GitHub Release
│
├── src/                            # React frontend
│   ├── App.tsx                     # Root component
│   ├── main.tsx                    # Entry point
│   ├── index.css                   # Tailwind imports
│   ├── vite-env.d.ts
│   │
│   ├── components/
│   │   ├── ui/                     # Shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── progress.tsx
│   │   │   └── alert.tsx
│   │   │
│   │   └── features/               # Feature-specific components
│   │       ├── auth/
│   │       │   ├── SignInButton.tsx
│   │       │   └── UserBadge.tsx
│   │       ├── download/
│   │       │   ├── UrlInput.tsx
│   │       │   ├── PlaylistPreview.tsx
│   │       │   ├── DownloadButton.tsx
│   │       │   └── TrackCard.tsx
│   │       ├── progress/
│   │       │   ├── ProgressPanel.tsx
│   │       │   ├── TrackList.tsx
│   │       │   └── CompletionPanel.tsx
│   │       ├── errors/
│   │       │   ├── ErrorPanel.tsx
│   │       │   └── RateLimitBanner.tsx
│   │       ├── settings/
│   │       │   ├── SettingsPanel.tsx
│   │       │   └── LanguageSelector.tsx
│   │       └── update/
│   │           └── UpdateBanner.tsx
│   │
│   ├── hooks/
│   │   ├── useDownloadProgress.ts  # Subscribe to Tauri events
│   │   ├── useAuthState.ts         # Auth event listener
│   │   └── useOnlineStatus.ts      # Network detection
│   │
│   ├── stores/
│   │   ├── authStore.ts            # Auth state + actions
│   │   ├── queueStore.ts           # Download queue state
│   │   └── settingsStore.ts        # User preferences
│   │
│   ├── lib/
│   │   ├── i18n.ts                 # react-i18next config
│   │   ├── tauri.ts                # Tauri invoke/listen wrappers
│   │   ├── utils.ts                # Utility functions
│   │   └── cn.ts                   # Tailwind class merger
│   │
│   ├── locales/
│   │   ├── en.json                 # English translations
│   │   └── fr.json                 # French translations
│   │
│   └── types/
│       ├── track.ts                # Track data types
│       ├── events.ts               # Tauri event payload types
│       └── errors.ts               # Error code types
│
├── src-tauri/                      # Rust backend
│   ├── Cargo.toml
│   ├── Cargo.lock
│   ├── tauri.conf.json             # Tauri configuration
│   ├── build.rs                    # Build script
│   ├── icons/                      # App icons
│   │
│   ├── binaries/                   # Sidecar binaries
│   │   ├── yt-dlp-x86_64-pc-windows-msvc.exe
│   │   ├── yt-dlp-aarch64-apple-darwin
│   │   ├── yt-dlp-x86_64-apple-darwin
│   │   ├── ffmpeg-x86_64-pc-windows-msvc.exe
│   │   ├── ffmpeg-aarch64-apple-darwin
│   │   └── ffmpeg-x86_64-apple-darwin
│   │
│   └── src/
│       ├── lib.rs                  # Tauri app setup
│       ├── main.rs                 # Entry point
│       │
│       ├── commands/               # Tauri command handlers
│       │   ├── mod.rs
│       │   ├── auth.rs             # sign_in, sign_out, get_auth_state
│       │   ├── download.rs         # start_download, cancel_download
│       │   ├── playlist.rs         # validate_url, get_playlist_info
│       │   └── settings.rs         # get_settings, update_settings
│       │
│       ├── services/               # Business logic
│       │   ├── mod.rs
│       │   ├── oauth.rs            # OAuth flow handling
│       │   ├── ytdlp.rs            # yt-dlp wrapper
│       │   ├── ffmpeg.rs           # FFmpeg wrapper
│       │   ├── metadata.rs         # ID3 tag handling
│       │   ├── storage.rs          # Encrypted token storage
│       │   └── filesystem.rs       # File operations
│       │
│       └── models/
│           ├── mod.rs
│           ├── track.rs            # Track data structures
│           ├── playlist.rs         # Playlist data structures
│           ├── error.rs            # Error types and codes
│           ├── config.rs           # App configuration
│           └── events.rs           # Event payload structures
│
└── tests/                          # E2E tests (future)
    └── e2e/
        └── .gitkeep
```

### Architectural Boundaries

**IPC Boundary (React ↔ Rust):**

| Direction | Mechanism | Examples |
|-----------|-----------|----------|
| React → Rust | Tauri Commands | `invoke('startDownload', { url })` |
| Rust → React | Tauri Events | `emit('download-progress', payload)` |

**Service Boundaries (Rust):**

```
commands/ ─────► services/ ─────► External Tools
    │               │
    │               ├── oauth.rs ────► SoundCloud OAuth
    │               ├── ytdlp.rs ────► yt-dlp binary
    │               ├── ffmpeg.rs ───► FFmpeg binary
    │               └── storage.rs ──► Encrypted files
    │
    └──────────────► models/
```

**State Boundaries (React):**

```
Tauri Events ──► hooks/ ──► stores/ ──► components/
                   │           │
                   │           ├── authStore
                   │           ├── queueStore
                   │           └── settingsStore
                   │
                   └── useDownloadProgress, useAuthState
```

### Requirements to Structure Mapping

**Authentication (FR1-4):**
- `src/components/features/auth/` — UI components
- `src/stores/authStore.ts` — Auth state
- `src-tauri/src/commands/auth.rs` — Command handlers
- `src-tauri/src/services/oauth.rs` — OAuth flow
- `src-tauri/src/services/storage.rs` — Token persistence

**Content Download (FR5-10):**
- `src/components/features/download/` — URL input, preview
- `src/stores/queueStore.ts` — Track queue state
- `src-tauri/src/commands/download.rs` — Download commands
- `src-tauri/src/services/ytdlp.rs` — Audio extraction
- `src-tauri/src/services/ffmpeg.rs` — MP3 conversion
- `src-tauri/src/services/metadata.rs` — Tag embedding

**Progress & Status (FR11-14):**
- `src/components/features/progress/` — Progress UI
- `src/hooks/useDownloadProgress.ts` — Event subscription
- `src-tauri/src/models/events.rs` — Event payloads

**Error Handling (FR15-19):**
- `src/components/features/errors/` — Error UI
- `src-tauri/src/models/error.rs` — Error types/codes

**Localization (FR28-30):**
- `src/locales/en.json`, `src/locales/fr.json`
- `src/lib/i18n.ts` — react-i18next setup
- `src/components/features/settings/LanguageSelector.tsx`

### Integration Points

**External Integrations:**

| Service | Integration Point | Purpose |
|---------|-------------------|---------|
| SoundCloud OAuth | `services/oauth.rs` | Authentication |
| SoundCloud API | via yt-dlp | Playlist/track data |
| yt-dlp binary | `services/ytdlp.rs` | Audio extraction |
| FFmpeg binary | `services/ffmpeg.rs` | Audio conversion |
| GitHub Releases | Tauri updater | App updates |

**Data Flow:**

```
URL Input → validate_url (Rust)
         → get_playlist_info (Rust)
         → TrackList (React)
         → start_download (Rust)
         → yt-dlp → FFmpeg → File
         → download-progress events
         → queueStore updates
         → TrackCard status icons
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All technology choices (Tauri 2.0, React, Vite, Zustand, react-i18next) are proven to work together. No version conflicts identified.

**Pattern Consistency:** Naming conventions respect each technology's idioms — snake_case for Rust, camelCase for TypeScript, kebab-case for Tauri events.

**Structure Alignment:** Project structure directly maps to architectural decisions. Boundaries are clear and enforceable.

### Requirements Coverage Validation ✅

**Functional Requirements:** All 30 FRs mapped to specific files/modules:
- Authentication (4 FRs) → auth commands, OAuth service, auth store
- Content Download (6 FRs) → yt-dlp/FFmpeg services, queue store
- Progress & Status (4 FRs) → Tauri events, progress hooks
- Error Handling (5 FRs) → Error models, error codes, error UI
- File Management (3 FRs) → Filesystem service, native dialogs
- Application Lifecycle (5 FRs) → Tauri updater, settings store
- Localization (3 FRs) → react-i18next, locale files

**Non-Functional Requirements:** All 13 NFRs architecturally supported:
- Performance (3) → Vite + Tauri native performance
- Security (4) → Encrypted storage, HTTPS enforcement
- Reliability (3) → Error handling, graceful degradation
- Integration (3) → Sidecar binaries, checksum verification

### Implementation Readiness Validation ✅

**Decision Completeness:** All critical architectural decisions documented with rationale.

**Structure Completeness:** Full project tree with 40+ files/directories specified.

**Pattern Completeness:** 5 conflict areas addressed with naming rules, structure rules, format rules, communication rules, and localization rules.

### Gap Analysis Results

**Critical Gaps:** None identified

**Important Gaps:** None identified

**Nice-to-Have:** Pre-defined TypeScript interfaces in `types/` folder (deferred to implementation phase)

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (Low)
- [x] Technical constraints identified (5 constraints)
- [x] Cross-cutting concerns mapped (6 concerns)

**✅ Architectural Decisions**
- [x] Critical decisions documented (IPC, state, i18n)
- [x] Technology stack fully specified
- [x] Integration patterns defined (Commands + Events)
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established (5 categories)
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented (error codes, payloads)

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** ✅ READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Clear separation between React frontend and Rust backend
- Comprehensive error handling with defined codes
- Consistent patterns that prevent AI agent conflicts
- Complete FR/NFR coverage

**Areas for Future Enhancement:**
- Add unit test patterns when tests are written
- Document CI/CD workflow details during setup
- Consider adding Storybook for component documentation (v1.1)

### Implementation Handoff

**AI Agent Guidelines:**
1. Follow all architectural decisions exactly as documented
2. Use implementation patterns consistently across all components
3. Respect project structure and boundaries
4. **Use Shadcn MCP for all frontend component work**
5. Refer to this document for all architectural questions

**First Implementation Priority:**

```bash
npm create tauri-app@latest
# Select: infrabooth-downloader, React, TypeScript
```

