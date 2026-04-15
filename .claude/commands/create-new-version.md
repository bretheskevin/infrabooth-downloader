---
description: Create new GitHub release and generate Changelog
---

# Create New Version

Create a new release version for InfraBooth Downloader.

## Instructions

1. Get the current version from `package.json`
2. Get the last git tag
3. Analyze code changes since the last tag using `git diff --stat <tag>..HEAD` and `git diff --name-status <tag>..HEAD`
4. **Auto-detect version bump** based on actual code changes:
   - **major**: Public API removed, commands deleted, major architectural changes
   - **minor**: New features detected:
     - New Tauri commands added in `src-tauri/src/commands/`
     - New React components/pages added in `src/`
     - New user-facing functionality
   - **patch**: Everything else:
     - Bug fixes (modifications to existing files only)
     - Dependency updates
     - CI/config changes
     - Refactoring without new features
   - User can override with argument if provided
5. Analyze the diff to understand WHAT changed and categorize for changelog:
   - **Added**: New files, new features, new UI elements
   - **Changed**: Modified behavior, updated UI, improved performance
   - **Fixed**: Bug fixes (look for changes that fix issues)
   - **Removed**: Deleted features or files (user-facing only)
   - Skip internal changes: CI, tests, configs, refactoring
   - **Feature flag handling** (inspect `src/config/feature-flags.toml` at both the previous tag and HEAD, plus `src/lib/featureFlags.ts` defaults):
     - If a feature is still gated behind a flag set to `false` at HEAD, the user cannot see it — **exclude it from the changelog entirely** (neither Added nor Changed). The rekordbox flag is the canonical example: while `rekordbox = false`, no rekordbox-related item belongs in the release notes, even if the code landed this cycle.
     - If a flag flipped from `false` → `true` this cycle, OR the flag entry was removed from `feature-flags.toml` and `featureFlags.ts` (meaning the feature now runs unconditionally), the feature just became user-visible — **add it to `### Added`** in this release, regardless of when the underlying code originally landed.
     - Detection: run `git show <tag>:src/config/feature-flags.toml` and compare to the current file. Any key that went from `false` to `true`, or disappeared entirely, is an unflag. Any key still at `false` is a gate — filter its related commits out.
6. Read the actual code changes (`git diff <tag>..HEAD`) to understand what was done
7. Generate a user-friendly changelog entry following these writing rules:
   - **Ultra-concise**: each item must be a short fragment (5-12 words max). No full sentences, no explanations, no dashes or parenthetical details. Think app store release notes, not documentation. Bad: "The app now silently checks for updates when launched — if a new version is available, a non-intrusive banner appears at the top of the window". Good: "Automatic update checks at startup".
   - **Written for end users** — no component names, file paths, or internal jargon
   - **Lead with the feature/change**, not how it works
   - **Group related small changes** into a single line
   - **Hide implementation details**: Never expose technical internals (protocols, caching strategies, preloading mechanisms, rendering techniques, etc.) in changelog entries. Describe what the user *experiences*, not how it works under the hood. Bad: "HLS preloading for smoother playback". Good: "Smoother audio playback". For new features, these details are just expected quality — only mention performance/UX improvements as "Changed" items when they improve an *existing* feature.
   - **Fixed items are bug-oriented**: Describe the bug the user experienced, not the fix. Use past tense. Bad: "Search cleared when switching tabs". Good: "Search was cleared when switching tabs".
   - **Collapse fixes into their parent feature**: If a feature was added since the last release and subsequent commits fix bugs in that feature, do NOT list those fixes separately — the user never saw the broken version. Only mention the feature as "Added". Similarly, if a "Changed" item was later fixed, just describe the final working behavior. Only list a "Fixed" item if it fixes something that existed in the *previous release*.
8. Show the detected version bump and the changelog for user review. **ALWAYS present the English and French entries in a 3-column Markdown table** with columns `Section` | `English` | `French`, and **one table row per bullet item** (not one row per section). Repeat the section label in the `Section` column for every bullet belonging to it. Do NOT use `<br>` tags, bullet lists inside cells, side-by-side code blocks, or separate sections — the terminal renderer collapses multi-line cells into a single line, so each bullet MUST be its own row. Example:

   ```markdown
   ## Version 1.20.0 (minor)

   | Section | English | French |
   |---------|---------|--------|
   | **Added** | Export playlists to Rekordbox | Export des playlists vers Rekordbox |
   | **Added** | Switch between card and list view | Basculement entre l'affichage en grille et en liste |
   | **Fixed** | Tracks did not appear until fully loaded | Les morceaux ne s'affichaient qu'une fois toutes chargées |
   ```

   Ask the user to confirm before proceeding. If the user requests changes, apply them and show the updated table for confirmation again. Do NOT proceed until the user explicitly confirms both English and French entries.
9. Update version in:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
10. Update `CHANGELOG.md` (English) with the new entry under `## [Unreleased]`
11. Update `CHANGELOG.fr.md` (French) with the translated entry under `## [Unreleased]` — translate all changelog items to French, keeping the same structure (### Added, ### Changed, ### Fixed, ### Removed headings stay in English as they are parsed by the app). The French translation must sound natural and idiomatic — write it as a native French speaker would phrase a changelog, not as a literal translation from English. Prefer nominal forms (e.g. "Amélioration des performances" not "Meilleures performances"). For **Fixed** items, describe the bug from the user's perspective using "On ne pouvait pas..." / "Il était impossible de..." / "L'application ne..." phrasing (e.g. "On ne pouvait pas consulter la page d'un artiste sans être connecté" not "La consultation des profils d'artistes nécessitait une connexion").
12. **Update Serena memories**: Analyze what changed since last tag (`git diff --name-status <tag>..HEAD`) and update relevant Serena MCP memories to reflect the current codebase state. Focus on:
    - New/removed features, commands, services, or components → update `architecture/*` memories
    - New conventions or patterns introduced → update `conventions/*` memories
    - Significant structural changes → update `project/overview`
    - Only update memories that are actually affected by the changes. Skip if changes are minor (patch-level bug fixes, config tweaks).
    - Use `list_memories` to see existing memories, `read_memory` to check current content, then `write_memory` or `edit_memory` to update.
13. Run `npm install` to update `package-lock.json` with the new version
14. Run `cargo check` in src-tauri to update `Cargo.lock`
15. Create a commit with message `chore: release vX.Y.Z`
16. Create the git tag `vX.Y.Z`
17. Push the commit and the new tag only: `git push origin main v<VERSION>`

## Arguments (Optional)

$ARGUMENTS - Override the auto-detected version: `patch`, `minor`, `major`, or a specific version like `1.2.3`. If not provided, version is auto-detected from code changes.

## Example Usage

- `/create-new-version` - Auto-detect version bump from code changes
- `/create-new-version patch` - Force patch bump
- `/create-new-version 2.0.0` - Set specific version
