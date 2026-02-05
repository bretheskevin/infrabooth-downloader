# Project Structure & Boundaries

## Complete Project Directory Structure

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

## Architectural Boundaries

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

## Requirements to Structure Mapping

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

## Integration Points

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
