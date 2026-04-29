---
name: create-new-version
description: Create new GitHub release and generate Changelog
---

# Create New Version

Create a new release version for InfraBooth Downloader.

This skill uses helper scripts in `scripts/` to minimize tool calls:
- `scripts/release-context.sh` — gathers all release context in one shot
- `scripts/release-apply.sh` — applies version bump, changelogs, commit, and tag mechanically

## Instructions

### Phase 1: Gather context (1 tool call)

Run `bash .claude/skills/create-new-version/scripts/release-context.sh` to get:
- Current version, last tag, today's date
- File changes (name-status), diff stats, commit log, full diff

### Phase 2: Analyze and decide (LLM work)

1. **Auto-detect version bump** from the context output:
   - **major**: Public API removed, commands deleted, major architectural changes
   - **minor**: New features (new Tauri commands in `src-tauri/src/commands/`, new React components/pages in `src/`, new user-facing functionality)
   - **patch**: Everything else (bug fixes, dependency updates, CI/config changes, refactoring)
   - User can override with argument if provided

2. **Write changelog entries** from the diff analysis. Categorize into:
   - **Added**: New files, new features, new UI elements
   - **Changed**: Modified behavior, updated UI, improved performance
   - **Fixed**: Bug fixes
   - **Removed**: Deleted features (user-facing only)
   - Skip internal changes: CI, tests, configs, refactoring

3. **Writing rules for changelog entries:**
   - **Ultra-concise**: 5-12 words max per item. No full sentences, no dashes or parenthetical details. Think app store release notes.
   - **Written for end users** — no component names, file paths, or internal jargon
   - **Lead with the feature/change**, not how it works
   - **Group related small changes** into a single line
   - **Hide implementation details**: Describe what the user *experiences*, not how it works under the hood
   - **Fixed items are bug-oriented**: Describe the bug the user experienced in past tense
   - **Collapse fixes into their parent feature**: If a feature was added since last release and later fixed, only list the feature as "Added"

4. **French translation rules:**
   - Must sound natural and idiomatic — not a literal translation
   - Prefer nominal forms (e.g. "Amélioration des performances" not "Meilleures performances")
   - **Fixed** items: use "On ne pouvait pas..." / "Il était impossible de..." / "L'application ne..." phrasing

### Phase 3: User confirmation

Present the version bump and changelog in a **3-column Markdown table** with columns `Section` | `English` | `French`, and **one row per bullet item** (not one row per section). Repeat the section label for every bullet belonging to it.

```markdown
## Version 1.20.0 (minor)

| Section | English | French |
|---------|---------|--------|
| **Added** | Export playlists to Rekordbox | Export des playlists vers Rekordbox |
| **Added** | Switch between card and list view | Basculement entre l'affichage en grille et en liste |
| **Fixed** | Tracks did not appear until fully loaded | Les morceaux ne s'affichaient qu'une fois toutes chargées |
```

Ask the user to confirm. If they request changes, apply and re-show the table. Do NOT proceed until explicitly confirmed.

### Phase 4: Apply release (1 tool call + push confirmation)

1. Compute the new version string from current version + bump type.

2. Generate the changelog blocks as they should appear in the files. Format for each language:

   ```
   ## [X.Y.Z] - YYYY-MM-DD

   ### Added

   - Item one
   - Item two

   ### Fixed

   - Item three
   ```

3. Write the English block to a temp file and the French block to another temp file:
   ```bash
   cat > /tmp/release-en.md << 'CHANGELOG_EOF'
   <english changelog block>
   CHANGELOG_EOF

   cat > /tmp/release-fr.md << 'CHANGELOG_EOF'
   <french changelog block>
   CHANGELOG_EOF
   ```

4. Run the apply script:
   ```bash
   bash .claude/skills/create-new-version/scripts/release-apply.sh <version> /tmp/release-en.md /tmp/release-fr.md
   ```

   This script handles: version bump in 3 files, changelog insertion, npm install, cargo check, git commit, git tag.

5. **Update Serena memories** (if changes are significant, not patch-level):
   - Analyze what changed since last tag
   - Update relevant architecture/conventions/project memories
   - Use `list_memories` → `read_memory` → `write_memory`/`edit_memory`

6. Ask the user to confirm before pushing, then run:
   ```bash
   git push origin main v<VERSION>
   ```

## Arguments (Optional)

$ARGUMENTS - Override the auto-detected version: `patch`, `minor`, `major`, or a specific version like `1.2.3`. If not provided, version is auto-detected from code changes.

## Example Usage

- `/create-new-version` - Auto-detect version bump from code changes
- `/create-new-version patch` - Force patch bump
- `/create-new-version 2.0.0` - Set specific version
