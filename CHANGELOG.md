# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.7.0] - 2026-03-12

### Added

- Search tab to find and download individual tracks
- "What's New" dialog after each update
- Downloaded track indicator in playlists
- Per-playlist folder selection

### Changed

- Playlist header shows download count and save folder
- Improved performance on large playlists
- Sign-in hint moved to a tooltip

## [1.6.0] - 2026-03-11

### Added

- Browse and view tracks inside any playlist
- Select and download individual tracks from a playlist
- Search and filter tracks by title or artist
- Sort tracks by title or artist
- Download conflict dialog when a download is already running

### Changed

- More compact playlist detail header

## [1.5.0] - 2026-03-11

### Added

- Auto-skip already-downloaded tracks
- In-app update installation with progress

### Changed

- Recoverable FFmpeg warnings no longer cancel downloads

### Fixed

- Playlist selection now resets download state properly
- Library search no longer triggers autocorrect
- Fixed downloads on HLS Opus-only tracks

## [1.4.0] - 2026-03-10

### Added

- Library browser for your SoundCloud playlists

### Changed

- Track numbering toggle also in settings
- Reorganized settings panel with scroll indicators

## [1.3.0] - 2026-03-09

### Added

- Parallel downloads (1-10 concurrent)
- Support for SoundCloud short links

### Changed

- Authentication via browser cookies instead of manual login
- Native SoundCloud API replaces yt-dlp for faster downloads
- Interactive dialog on rate limit instead of auto-backoff
- Optional track numbering via playlist preview toggle
- Smaller app size (removed yt-dlp and ffprobe)

### Fixed

- Better handling of concurrent auth refreshes

## [1.2.0] - 2026-03-03

### Added

- Automatic update checks at startup
- Dismissable update banner with release link

### Changed

- No error shown when update check has no network

## [1.1.0] - 2026-02-22

### Changed

- Download progress shows file size (e.g. "5.2 MB / 12.4 MB")

### Fixed

- Partial download files cleaned up on cancel

## [1.0.1] - 2026-02-20

### Fixed

- SoundCloud sign-in now works correctly

### Changed

- New app icon

## [1.0.0] - 2026-02-20

### Added

- OAuth authentication with SoundCloud
- High-quality track downloads (premium with Go+)
- ID3 metadata embedding (title, artist, artwork)
- macOS (Intel & Apple Silicon) and Windows support
- English and French translations
