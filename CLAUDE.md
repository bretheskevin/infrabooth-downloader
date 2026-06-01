# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

InfraBooth Downloader is a Tauri-based desktop application for downloading audio from SoundCloud. It features OAuth authentication, batch downloading, format conversion via FFmpeg, and ID3 metadata embedding.

**Tech Stack:**
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Backend: Rust + Tauri 2.x
- State: Zustand stores (auth, queue, settings)
- Data fetching: TanStack React Query
- i18n: i18next (English, French)
- Type-safe IPC: tauri-specta generates `src/bindings.ts`

## Commands

```bash
# Development
npm run dev              # Start Vite dev server (frontend only)
npm run tauri dev        # Full Tauri dev mode with Rust backend

# Build
npm run build            # Build frontend
npm run tauri build      # Build complete app bundle

# Testing
npm test                 # Run Vitest once
npm run test:watch       # Vitest watch mode

# Type checking
npm run typecheck        # TypeScript check (no emit)
cargo check              # Rust type checking (run from src-tauri/)
```

## Architecture

### Feature-Based Module Organization
Each feature in `src/features/` is self-contained:
```
feature/
├── components/     # UI components
├── hooks/          # Custom React hooks
├── api/            # React Query mutations/queries
├── store.ts        # Zustand state
├── types/          # TypeScript definitions
├── utils/          # Business logic
└── __test__/       # Tests
```

Features: `auth`, `url-input`, `queue`, `progress`, `completion`, `settings`

### Tauri Command Flow
1. Rust commands in `src-tauri/src/commands/` are exported via `#[tauri::command]`
2. tauri-specta generates TypeScript bindings in `src/bindings.ts`
3. Frontend calls commands through type-safe generated functions

### Download Pipeline (`src-tauri/src/services/pipeline.rs`)
1. URL validation → SoundCloud API v2 playlist/track fetch
2. Stream resolution: select best transcoding → resolve CDN URL (`stream.rs`)
3. FFmpeg sidecar downloads and converts audio to MP3 320kbps (`downloader.rs`)
4. ID3 metadata embedded with id3 crate
5. Progress events streamed to frontend via Tauri events

### Sidecar Binaries
Bundled in `src-tauri/binaries/`:
- ffmpeg (download + conversion)

Platform-specific naming: `ffmpeg-aarch64-apple-darwin`, `ffmpeg-x86_64-pc-windows-msvc.exe`, etc.

## Key Files

| File | Purpose |
|------|---------|
| `src/pages/DownloadPage.tsx` | Main UI orchestrating all features |
| `src-tauri/src/lib.rs` | Tauri setup, command registration, plugins |
| `src-tauri/src/services/pipeline.rs` | Core download pipeline |
| `src-tauri/src/services/stream.rs` | SoundCloud stream URL resolution |
| `src-tauri/src/services/downloader.rs` | FFmpeg-based audio downloader |
| `src-tauri/src/services/cookie.rs` | Browser cookie extraction via rookie |
| `src-tauri/src/services/storage.rs` | In-memory auth state cache |
| `src-tauri/src/services/oauth.rs` | Cookie token verification via SoundCloud API |
| `src/bindings.ts` | Auto-generated IPC types (do not edit) |
| `tauri.conf.json` | App config, bundling |

## Git Policy

**NEVER commit unless explicitly asked to.** Do not commit as part of implementation workflows, subagent tasks, or skill processes. All commits require explicit user approval. This applies to all agents and subagents — include this instruction in every subagent prompt.

**NEVER use git worktrees.** Always work directly on the current branch. Since we never auto-commit, worktree isolation is unnecessary even if I ask for it.

**When executing plans in batches, do NOT stop between batches to ask for feedback.** Execute all batches continuously until the plan is complete. Only stop if blocked.

**When writing superpowers design docs or specs, NEVER ask for confirmation.** Write the document directly without prompting the user to approve the content first.

**Use Claude Opus for all agents.** All subagents (coders, reviewers, explorers) use `claude-opus-4-6` as set in the kb plugin config. Do not override with `model: "sonnet"` or any other model.

## Conventions

- Use existing shadcn/ui components from `src/components/ui/`
- Zustand stores follow pattern: state + actions in single file
- Translations in `src/locales/{en,fr}.json`, use `useTranslation()` hook
- Tests colocated in `__test__/` directories
- Rust errors use custom types in `src-tauri/src/models/error.rs`
- **Never use `console.log/warn/error` in frontend code.** Use `logger` from `@/lib/logger` (backed by `@tauri-apps/plugin-log`) which routes logs to the Tauri logging system. Logger methods are async — use `void logger.info(...)` for fire-and-forget calls.
- **Never write comments unless necessary.** Code should be self-documenting. Only add comments when the logic is genuinely non-obvious and cannot be clarified through better naming or structure.

## React Hooks Rules

- **No `useEffect` for derived state.** Compute during render or use `useMemo` for expensive derivations. Never `setState` inside `useEffect` watching another state.
- **No `useState` + `useEffect` for fetched data.** Use TanStack Query — it handles caching, loading, errors, and race conditions.
- **No reflexive `useCallback`/`useMemo`.** Only memoize when: (1) prop goes to a `React.memo`-wrapped child, (2) value is a dependency of another hook, or (3) computation is genuinely expensive (profile first).
- **No `useCallback` on DOM element handlers.** `<button onClick={useCallback(fn)}>` achieves nothing — DOM elements always re-render with parent.
- **No `useEffect` for event-specific logic.** If code runs because the user *did something*, it belongs in the event handler, not an Effect.
- **No `useEffect` to notify parent of state changes.** Call parent callback in the same event handler that updates state — both batch in one render.
- **Prefer `key` prop over `useEffect` state reset.** Instead of `useEffect(() => setState(''), [id])`, put `key={id}` on the component to remount with fresh state.

## Code Complexity

- **Function length**: Keep functions under ~50 lines. Extract helpers for longer functions.
- **Component length**: React components should generally be under ~150 lines. Extract sub-components for complex UI.
- **Nesting depth**: Avoid more than 3 levels of nesting. Use early returns or extract helper functions.
- **Single responsibility**: Each function/component should do one thing well. If you need "and" to describe it, split it.

## Type & Parameter Patterns

### Prefer generated bindings
- Import types from `src/bindings.ts` instead of manually defining duplicates
- Event payloads, error types, and request/response types should come from Rust via tauri-specta
- Use `tauri_specta::Event` derive macro for event types to auto-generate TS bindings

### Consolidate repeated fields with composition
- When multiple structs share the same fields (e.g., `trackId`, `title`, `artist`), extract a shared `Core` type
- Rust: Use `#[serde(flatten)]` to embed the shared type
- TypeScript: Use intersection types (`CoreType & { extraField: string }`)
- Example: `TrackCore` is embedded in `QueueItem`, `DownloadRequest` via flatten

### Bundle related parameters
- Functions with 4+ parameters of the same "kind" should use a parameter object
- Look for `Option<X>, Option<Y>, Option<Z>` that always travel together
- Example: `CancellationHandles` bundles `cancel_rx`, `active_child`, `active_pid`
- Example: `PipelineConfig` bundles download configuration

### Type aliases for semantic clarity
- Use `pub type QueueItemRequest = TrackCore;` when types are identical but have different semantic meanings
- Avoids duplication while preserving API clarity

## System Requirements

| Platform | Minimum Version |
|----------|-----------------|
| macOS    | 10.15 (Catalina) |
| Windows  | 10 |

**Desktop only**: This app targets laptop/PC users exclusively. Touch device considerations (mobile, tablet) do not apply.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
