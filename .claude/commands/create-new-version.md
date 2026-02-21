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
7. Generate a user-friendly changelog entry (not technical, written for end users who don't know the code)
8. Show the detected version bump and changelog, ask user to confirm before proceeding
9. Update version in:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
10. Update `CHANGELOG.md` with the new entry under `## [Unreleased]`
11. Run `cargo check` in src-tauri to update Cargo.lock
12. Create a commit with message `chore: release vX.Y.Z`
13. Create the git tag `vX.Y.Z`
14. Tell the user to run `git push origin main --tags` to trigger the release

## Arguments (Optional)

$ARGUMENTS - Override the auto-detected version: `patch`, `minor`, `major`, or a specific version like `1.2.3`. If not provided, version is auto-detected from code changes.

## Example Usage

- `/create-new-version` - Auto-detect version bump from code changes
- `/create-new-version patch` - Force patch bump
- `/create-new-version 2.0.0` - Set specific version
