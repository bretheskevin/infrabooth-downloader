#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)/src-tauri"

echo "=== Rekordbox tests (unit + ignored) ==="
echo ""

echo "--- Unit tests (no Rekordbox needed) ---"
cargo test -p app --lib services::rekordbox::tests -- --test-threads=1 2>&1

echo ""
echo "--- Ignored tests (Rekordbox must be installed & closed) ---"
cargo test -p app --lib services::rekordbox::tests -- --ignored --test-threads=1 2>&1

echo ""
echo "=== All rekordbox tests done ==="
