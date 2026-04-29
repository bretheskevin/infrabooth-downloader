#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT_DIR"

# Current version from package.json
CURRENT_VERSION=$(node -e "console.log(require('./package.json').version)")

# Last git tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

# Today's date
TODAY=$(date +%Y-%m-%d)

# Range for diffs
if [ -n "$LAST_TAG" ]; then
  RANGE="${LAST_TAG}..HEAD"
else
  RANGE="HEAD"
fi

# Commit count
COMMIT_COUNT=$(git rev-list --count "$RANGE" 2>/dev/null || echo "0")

cat <<EOF
=== RELEASE CONTEXT ===
current_version: ${CURRENT_VERSION}
last_tag: ${LAST_TAG:-none}
today: ${TODAY}
commits_since_tag: ${COMMIT_COUNT}

=== FILE CHANGES (name-status) ===
$(git diff --name-status "$RANGE" 2>/dev/null || echo "(no changes)")

=== DIFF STATS ===
$(git diff --stat "$RANGE" 2>/dev/null || echo "(no changes)")

=== COMMIT LOG ===
$(git log "$RANGE" --pretty=format:"%h %s" 2>/dev/null || echo "(no commits)")

=== FULL DIFF ===
$(git diff "$RANGE" 2>/dev/null || echo "(no diff)")
EOF
