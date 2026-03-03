# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- Auto-updater for seamless updates
- macOS (Intel & Apple Silicon) and Windows support
- English and French translations
