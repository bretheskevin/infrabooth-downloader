# Create New Version

Create a new release version for InfraBooth Downloader.

## Instructions

1. Get the current version from `package.json`
2. Get the last git tag
3. Analyze commits since the last tag using `git log`
4. Parse conventional commits and categorize them:
   - `feat:` → Added
   - `fix:` → Fixed
   - `perf:`, `refactor:` → Changed
   - Skip `ci:`, `chore:`, `test:`, `build:` commits
5. Generate a user-friendly changelog entry (not technical)
6. Ask the user to confirm the changelog content before proceeding
7. Update version in:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
8. Update `CHANGELOG.md` with the new entry under `## [Unreleased]`
9. Run `cargo check` in src-tauri to update Cargo.lock
10. Create a commit with message `chore: release vX.Y.Z`
11. Create the git tag `vX.Y.Z`
12. Tell the user to run `git push origin main --tags` to trigger the release

## Arguments

$ARGUMENTS - The version bump type: `patch`, `minor`, `major`, or a specific version like `1.2.3`

## Example Usage

- `/create-new-version patch` - Bump patch version (1.0.1 → 1.0.2)
- `/create-new-version minor` - Bump minor version (1.0.1 → 1.1.0)
- `/create-new-version major` - Bump major version (1.0.1 → 2.0.0)
- `/create-new-version 2.0.0` - Set specific version
