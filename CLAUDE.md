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

## Conventions

- Use existing shadcn/ui components from `src/components/ui/`
- Zustand stores follow pattern: state + actions in single file
- Translations in `src/locales/{en,fr}.json`, use `useTranslation()` hook
- Tests colocated in `__test__/` directories
- Rust errors use custom types in `src-tauri/src/models/error.rs`
- **Never use `console.log/warn/error` in frontend code.** Use `logger` from `@/lib/logger` (backed by `@tauri-apps/plugin-log`) which routes logs to the Tauri logging system. Logger methods are async — use `void logger.info(...)` for fire-and-forget calls.

## Serena MCP — Required for All Codebase Interaction

This project uses **Serena MCP** for semantic code analysis and editing. All agents (including subagents dispatched by superpowers skills) **MUST** use Serena MCP tools instead of basic Read/Grep/Glob/Edit for codebase interaction.

### When dispatching subagents (Agent tool), ALWAYS include this block in the prompt:

```
## MANDATORY: Use Serena MCP Tools

This project uses Serena MCP for all codebase interaction. You MUST use these tools:

**Reading/exploring code:**
- `mcp__plugin_serena_serena__get_symbols_overview` — Get high-level view of symbols in a file (start here for new files)
- `mcp__plugin_serena_serena__find_symbol` — Find symbols by name path, optionally include body/info
- `mcp__plugin_serena_serena__find_referencing_symbols` — Find references to a symbol
- `mcp__plugin_serena_serena__search_for_pattern` — Regex search across codebase (flexible file filtering)
- `mcp__plugin_serena_serena__list_dir` — List directory contents
- `mcp__plugin_serena_serena__find_file` — Find files by name/mask
- `mcp__plugin_serena_serena__read_file` — Read file contents (use sparingly, prefer symbolic tools)

**Editing code:**
- `mcp__plugin_serena_serena__replace_symbol_body` — Replace an entire symbol's body
- `mcp__plugin_serena_serena__insert_after_symbol` — Insert code after a symbol
- `mcp__plugin_serena_serena__insert_before_symbol` — Insert code before a symbol
- `mcp__plugin_serena_serena__replace_content` — Regex-based content replacement in files
- `mcp__plugin_serena_serena__rename_symbol` — Rename a symbol across the codebase
- `mcp__plugin_serena_serena__create_text_file` — Create new files

**DO NOT use basic Read/Grep/Glob/Edit tools for code interaction. Use Serena MCP equivalents.**
```

### Serena workflow principles:
- Use `get_symbols_overview` first when exploring a new file
- Use `find_symbol` with `include_body=True` only for symbols you need to understand
- Use `replace_symbol_body` for whole-symbol edits, `replace_content` with regex for partial edits
- Use `find_referencing_symbols` before renaming/modifying to check impact
- Pass `relative_path` to restrict searches to specific files/directories

## System Requirements

| Platform | Minimum Version |
|----------|-----------------|
| macOS    | 10.15 (Catalina) |
| Windows  | 10 |
