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
6. Read the actual code changes (`git diff <tag>..HEAD`) to understand what was done
7. Generate a user-friendly changelog entry following these writing rules:
   - **Ultra-concise**: each item must be a short fragment (5-12 words max). No full sentences, no explanations, no dashes or parenthetical details. Think app store release notes, not documentation. Bad: "The app now silently checks for updates when launched — if a new version is available, a non-intrusive banner appears at the top of the window". Good: "Automatic update checks at startup".
   - **Written for end users** — no component names, file paths, or internal jargon
   - **Lead with the feature/change**, not how it works
   - **Group related small changes** into a single line
   - **Hide implementation details**: Never expose technical internals (protocols, caching strategies, preloading mechanisms, rendering techniques, etc.) in changelog entries. Describe what the user *experiences*, not how it works under the hood. Bad: "HLS preloading for smoother playback". Good: "Smoother audio playback". For new features, these details are just expected quality — only mention performance/UX improvements as "Changed" items when they improve an *existing* feature.
   - **Fixed items are bug-oriented**: Describe the bug the user experienced, not the fix. Use past tense. Bad: "Search cleared when switching tabs". Good: "Search was cleared when switching tabs".
   - **Collapse fixes into their parent feature**: If a feature was added since the last release and subsequent commits fix bugs in that feature, do NOT list those fixes separately — the user never saw the broken version. Only mention the feature as "Added". Similarly, if a "Changed" item was later fixed, just describe the final working behavior. Only list a "Fixed" item if it fixes something that existed in the *previous release*.
8. Show the detected version bump, the English changelog, AND the French translation side by side for user review. Ask user to confirm before proceeding. If the user requests changes, apply them and show the updated versions for confirmation again. Do NOT proceed until the user explicitly confirms both English and French entries.
9. Update version in:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
10. Update `CHANGELOG.md` (English) with the new entry under `## [Unreleased]`
11. Update `CHANGELOG.fr.md` (French) with the translated entry under `## [Unreleased]` — translate all changelog items to French, keeping the same structure (### Added, ### Changed, ### Fixed, ### Removed headings stay in English as they are parsed by the app). The French translation must sound natural and idiomatic — write it as a native French speaker would phrase a changelog, not as a literal translation from English. Prefer nominal forms (e.g. "Amélioration des performances" not "Meilleures performances"). For **Fixed** items, describe the bug from the user's perspective using "On ne pouvait pas..." / "Il était impossible de..." / "L'application ne..." phrasing (e.g. "On ne pouvait pas consulter la page d'un artiste sans être connecté" not "La consultation des profils d'artistes nécessitait une connexion").
12. Run `cargo check` in src-tauri to update Cargo.lock
13. Create a commit with message `chore: release vX.Y.Z`
14. Create the git tag `vX.Y.Z`
15. Push the commit and tag: `git push origin main --tags`

## Arguments (Optional)

$ARGUMENTS - Override the auto-detected version: `patch`, `minor`, `major`, or a specific version like `1.2.3`. If not provided, version is auto-detected from code changes.

## Example Usage

- `/create-new-version` - Auto-detect version bump from code changes
- `/create-new-version patch` - Force patch bump
- `/create-new-version 2.0.0` - Set specific version
