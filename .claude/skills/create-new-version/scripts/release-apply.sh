#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT_DIR"

# --- Arguments ---
NEW_VERSION="${1:?Usage: release-apply.sh <version> <en_changelog_file> <fr_changelog_file>}"
EN_FILE="${2:?Missing English changelog file}"
FR_FILE="${3:?Missing French changelog file}"

echo "Applying release v${NEW_VERSION}..."

# --- 1. Bump version in all config files ---
echo "  Updating package.json..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
pkg.version = '${NEW_VERSION}';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

echo "  Updating tauri.conf.json..."
node -e "
const fs = require('fs');
const conf = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf-8'));
conf.version = '${NEW_VERSION}';
fs.writeFileSync('src-tauri/tauri.conf.json', JSON.stringify(conf, null, 2) + '\n');
"

echo "  Updating Cargo.toml..."
sed -i '' "s/^version = \".*\"/version = \"${NEW_VERSION}\"/" src-tauri/Cargo.toml

# --- 2. Insert changelog entries after ## [Unreleased] ---
# sed 'r' reads a file after the matched line — handles multiline content reliably
echo "  Updating CHANGELOG.md..."
sed -i '' "/^## \[Unreleased\]/r ${EN_FILE}" CHANGELOG.md

echo "  Updating CHANGELOG.fr.md..."
sed -i '' "/^## \[Unreleased\]/r ${FR_FILE}" CHANGELOG.fr.md

# --- 3. Update lock files ---
echo "  Updating package-lock.json..."
npm install --package-lock-only --silent 2>/dev/null

echo "  Updating Cargo.lock..."
cargo check --manifest-path src-tauri/Cargo.toml 2>/dev/null || true

# --- 4. Git commit + tag ---
echo "  Staging files..."
git add package.json package-lock.json \
  src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock \
  CHANGELOG.md CHANGELOG.fr.md

echo "  Creating commit..."
git commit -m "chore: release v${NEW_VERSION}"

echo "  Creating tag v${NEW_VERSION}..."
git tag "v${NEW_VERSION}"

# --- 5. Push ---
echo "  Pushing commit and tag..."
git push origin main "v${NEW_VERSION}"

# --- 6. Cleanup temp files ---
rm -f "$EN_FILE" "$FR_FILE"

echo ""
echo "Done! Release v${NEW_VERSION} published."
