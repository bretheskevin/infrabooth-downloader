# Implementation Patterns & Consistency Rules

## Pattern Categories Defined

**Critical Conflict Points Addressed:** 5 areas where AI agents could make incompatible choices

## Naming Patterns

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

## Structure Patterns

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

## Format Patterns

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

## Communication Patterns

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
| Set/replace | `set` | `setAuth`, `setDownloadPath` |
| Update partial | `update` | `updateTrackStatus` |
| Add to collection | `add` | `addTrack` |
| Remove | `remove` | `removeTrack` |
| Clear/reset | `clear` | `clearQueue` |
| **Domain actions** | verb | `enqueueTracks`, `startDownload` |

**Prefer domain actions over generic CRUD:**
```typescript
// ❌ Generic - unclear intent
setTracks(tracks);

// ✅ Domain action - expresses intent
enqueueTracks(tracks);  // "media loaded → feed queue"
```

Domain actions make the code self-documenting and prevent sync bugs when requirements change.

## Localization Patterns

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

## Custom Hook Patterns

**Single Responsibility Rule:** Each hook does ONE thing. Components orchestrate hooks, not logic.

**Hook Categories:**

| Category | Purpose | Example |
|----------|---------|---------|
| Data fetching | Call backend, manage loading/error | `useMediaFetch(url, type)` |
| Validation | Validate input, debounce | `useUrlValidation(url)` |
| Side effects | Sync state, push to stores | `useSyncToQueue(media)` |
| Orchestrator | Compose multiple hooks | `useDownloadFlow(url)` |

**Hook File Structure:**

```
src/hooks/
├── download/                    # Feature-specific hooks
│   ├── useUrlValidation.ts      # Debounce + validate
│   ├── useMediaFetch.ts         # Fetch playlist/track
│   ├── useSyncToQueue.ts        # Push to queueStore
│   └── useDownloadFlow.ts       # Orchestrator
├── auth/                        # Auth-related hooks
│   ├── useOAuthFlow.ts
│   └── useAuthCallback.ts
└── index.ts                     # Re-export all
```

**Hook Return Patterns:**

```typescript
// Data fetching hook
interface UseMediaFetchReturn {
  data: PlaylistInfo | TrackInfo | null;
  isLoading: boolean;
  error: Error | null;
}

// Validation hook
interface UseUrlValidationReturn {
  result: ValidationResult | null;
  isValidating: boolean;
}

// Orchestrator hook (composes others)
interface UseDownloadFlowReturn {
  url: string;
  setUrl: (url: string) => void;
  validation: ValidationResult | null;
  media: PlaylistInfo | TrackInfo | null;
  isLoading: boolean;
  error: FetchError | null;
  handleDownload: () => void;
}
```

**Transform Functions:**

Data transformations live in `src/lib/transforms.ts` as pure functions:

```typescript
// src/lib/transforms.ts
export function trackInfoToQueueTrack(track: TrackInfo): Track {
  return {
    id: String(track.id),
    title: track.title,
    artist: track.user.username,
    artworkUrl: track.artwork_url,
    status: 'pending',
  };
}

export function playlistTracksToQueueTracks(tracks: TrackInfo[]): Track[] {
  return tracks.map(trackInfoToQueueTrack);
}
```

**Component Responsibility:**

Components should ONLY:
1. Call hooks
2. Render UI based on hook return values
3. Pass callbacks to children

Components should NEVER:
- Call `invoke()` directly
- Manage loading states with `useState`
- Transform backend data inline
- Have multiple `useEffect` for different concerns

**Anti-Patterns to Avoid:**

```typescript
// ❌ BAD: Component does everything
function DownloadSection() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    invoke('get_playlist_info', { url })
      .then(data => {
        setData(data);
        setTracks(data.tracks.map(t => ({ /* transform */ })));
      })
      .finally(() => setIsLoading(false));
  }, [url]);
}

// ✅ GOOD: Component uses hooks
function DownloadSection() {
  const { validation, media, isLoading, handleDownload } = useDownloadFlow(url);
  return <UI data={media} onDownload={handleDownload} />;
}
```

**Testing Hooks:**

- Use `@testing-library/react` with `renderHook`
- Mock Tauri `invoke` at the module level
- Test loading states, success, and error paths
- Co-locate tests: `useMediaFetch.test.ts`

## Enforcement Guidelines

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
