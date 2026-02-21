# Create New Version

Create a new release version for InfraBooth Downloader.

## Instructions

1. Get the current version from `package.json`
2. Get the last git tag
3. Analyze commits since the last tag using `git log --pretty=format:"%s"`
4. **Auto-detect version bump** based on conventional commits:
   - If any commit contains `BREAKING CHANGE:` in body or `!:` (e.g., `feat!:`) → **major**
   - If any commit starts with `feat:` → **minor**
   - Otherwise (only `fix:`, `perf:`, `refactor:`, etc.) → **patch**
   - User can override with argument if provided
5. Parse and categorize commits for changelog:
   - `feat:` → Added
   - `fix:` → Fixed
   - `perf:`, `refactor:` → Changed
   - Skip `ci:`, `chore:`, `test:`, `build:` commits
6. Generate a user-friendly changelog entry (not technical, written for end users)
7. Show the detected version bump and changelog, ask user to confirm before proceeding
8. Update version in:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
9. Update `CHANGELOG.md` with the new entry under `## [Unreleased]`
10. Run `cargo check` in src-tauri to update Cargo.lock
11. Create a commit with message `chore: release vX.Y.Z`
12. Create the git tag `vX.Y.Z`
13. Tell the user to run `git push origin main --tags` to trigger the release

## Arguments (Optional)

$ARGUMENTS - Override the auto-detected version: `patch`, `minor`, `major`, or a specific version like `1.2.3`. If not provided, version is auto-detected from commits.

## Example Usage

- `/create-new-version` - Auto-detect version bump from commits
- `/create-new-version patch` - Force patch bump
- `/create-new-version 2.0.0` - Set specific version
