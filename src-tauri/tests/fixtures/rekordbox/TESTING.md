# Rekordbox Integration — Manual Testing Guide

## Prerequisites

- Rekordbox 6 or 7 installed on your machine
- Rekordbox must be CLOSED during all tests
- At least one track already imported in Rekordbox (so the DB has device/menu data)

## Setup

1. Place MP3 test files in this directory:

```
src-tauri/tests/fixtures/rekordbox/
├── TESTING.md (this file)
├── track1.mp3
├── track2.mp3
└── track3.mp3
```

Files should have proper ID3 tags (title, artist, album).

2. Ensure Rekordbox is closed.

## Running Tests

```bash
# All tests (unit + ignored) via script
src-tauri/tests/fixtures/rekordbox/run_tests.sh
```

### Manual runs

```bash
# Unit tests only (no Rekordbox needed)
cd src-tauri && cargo test -p app --lib services::rekordbox::tests -- --test-threads=1

# Ignored tests only (Rekordbox must be installed & closed)
cd src-tauri && cargo test -p app --lib services::rekordbox::tests -- --ignored --test-threads=1

# Individual module
cd src-tauri && cargo test -p app --lib services::rekordbox::tests::test_export_flow -- --test-threads=1
```

## E2E Verification

After running `test_export_flow`:

1. Open Rekordbox
2. Check the playlist tree for "InfraBooth Downloader" folder
3. Inside it, find the test playlist with your test tracks
4. Verify tracks appear with correct metadata (title, artist, album)
5. Tracks should show as "not analyzed" — Rekordbox will queue them for analysis

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "Rekordbox is running" | Close Rekordbox completely | Quit Rekordbox, wait a few seconds |
| "Database not found" | Rekordbox never opened | Open Rekordbox once, then close it |
| "Decryption failed" | Unsupported Rekordbox version | Check that you have v6 or v7 |
| Tests modify real DB | E2E tests only | A backup is always created first |

## Backup Location

Backups are stored in:
- macOS: `~/Library/Application Support/com.infrabooth.downloader/rekordbox-backups/`
- Windows: `%APPDATA%/com.infrabooth.downloader/rekordbox-backups/`
