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
- Per-playlist download folder selection

### Changed

- Playlist header shows download count and save folder
- Improved performance on large playlists
- Sign-in hint moved to a tooltip

## [1.6.0] - 2026-03-11

### Added

- Browse tracks inside any library playlist — click a playlist to see all its tracks with artwork and details
- Select individual tracks from a playlist and download just the ones you want
- Search and filter tracks within a playlist by title or artist
- Sort playlist tracks by title or artist (ascending/descending)
- Download conflict dialog — if a download is already running, you can choose to cancel it and start a new one

### Changed

- Playlist detail header is now more compact, showing more tracks at a glance

## [1.5.0] - 2026-03-11

### Added

- Already-downloaded tracks are now automatically skipped — the app scans your download folder before starting and skips tracks it already has
- Updates can now be installed directly from the app — the update banner includes an "Install" button with progress feedback

### Changed

- Improved FFmpeg error handling — recoverable audio warnings no longer cancel the entire download

### Fixed

- Library playlist selection now properly resets the download state
- Search bar in library no longer triggers autocorrect suggestions
- Fixed downloads failing on tracks that only offer HLS Opus streams (incompatible with bundled FFmpeg)

## [1.4.0] - 2026-03-10

### Added

- Library browser to browse and download your SoundCloud playlists directly from the app

### Changed

- Playlist order toggle is now also accessible from the settings panel
- Settings panel reorganized with scroll shadow indicators for better navigation

## [1.3.0] - 2026-03-09

### Added

- Download multiple tracks simultaneously with configurable parallel downloads (1-10 concurrent)
- Support for SoundCloud short links (on.soundcloud.com)

### Changed

- Authentication now uses browser cookies — sign in to SoundCloud in your browser and the app detects your session automatically
- Downloads now use SoundCloud's native API instead of yt-dlp, resulting in faster and more reliable downloads
- When rate-limited by SoundCloud, an interactive dialog lets you choose how to proceed instead of automatic backoff
- Playlist track numbering is now optional via a toggle on the playlist preview
- App size significantly reduced by removing bundled yt-dlp and ffprobe binaries

### Fixed

- Improved handling of concurrent authentication refreshes

## [1.2.0] - 2026-03-03

### Added

- The app now silently checks for updates when launched — if a new version is available, a non-intrusive banner appears at the top of the window
- The update banner includes a "Learn more" link to the GitHub release page and can be dismissed for the current session

### Changed

- Update checks no longer show error messages when the network is unavailable — the app continues normally

## [1.1.0] - 2026-02-22

### Changed

- Download progress now shows file size (e.g., "5.2 MB / 12.4 MB") for better visibility

### Fixed

- Partial download files (.part, .ytdl) are now automatically cleaned up when a download is canceled

## [1.0.1] - 2026-02-20

### Fixed

- Sign in with SoundCloud now works correctly

### Changed

- New app icon

## [1.0.0] - 2026-02-20

### Added

- OAuth authentication with SoundCloud
- Download SoundCloud tracks at high quality (premium quality with Go+ subscription)
- ID3 metadata embedding (title, artist, artwork)
- macOS (Intel & Apple Silicon) and Windows support
- English and French translations
