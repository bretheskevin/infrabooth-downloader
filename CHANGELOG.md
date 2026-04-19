# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.22.1] - 2026-04-19

### Fixed

- Update checks failed on Windows

## [1.22.0] - 2026-04-19

### Added

- Export playlists to Rekordbox
- Playlist search on artist profiles
- Actions menu on artist profile banner
- Report Bug and Suggest Feature from settings

## [1.21.1] - 2026-04-16

### Fixed

- Windows app updates could not install from the app

## [1.21.0] - 2026-04-16

### Added

- Direct messaging with other SoundCloud users
- Shuffle playback button in track lists

### Changed

- Notifications refresh automatically on new activity

## [1.20.0] - 2026-04-15

### Added

- Switch between card and list view for playlists and releases
- Clickable artist links on playlists
- SoundCloud activity notifications (follows, likes, reposts, comments)

### Changed

- New releases now appear before reposts in the carousel

### Fixed

- Tracks did not appear until the whole playlist loaded

## [1.19.0] - 2026-04-10

### Added

- Right-click "Show in folder" for downloaded tracks
- Context menu on artist profile banner

### Fixed

- Some features required login unnecessarily
- Large playlists could fail to load

## [1.18.0] - 2026-04-10

### Added

- Artist playlists in profiles
- Profile description links are now clickable
- Support for SoundCloud short links

### Fixed

- Queue synchronization issues during playback

## [1.17.1] - 2026-04-08

### Fixed

- Artist profiles required sign-in to browse

## [1.17.0] - 2026-04-07

### Added

- New albums and playlists from followed artists
- Follow and unfollow artists from profiles
- Shortcuts to application folders

### Fixed

- Duplicate tracks appeared in activity streams

## [1.16.1] - 2026-04-03

### Changed

- Cleaner artist profile view with hidden navigation tabs
- Wider "What's New" dialog for better readability

### Fixed

- Download all button was visible in streaming-only mode

## [1.16.0] - 2026-03-31

### Added

- Artist search in search tab
- Clickable @mentions and links in artist profiles

### Changed

- Redesigned search navigation tabs

### Fixed

- Some tracks could not be played due to blocked CDN domain

## [1.15.0] - 2026-03-30

### Added

- Artist profile pages with track listing
- Autoplay station with related tracks
- "Add to queue" action in track menus
- Space bar shortcut to play/pause
- SoundCloud URL support in search
- Hide reposts toggle in new tracks

### Fixed

- "What's New" dialog appeared even when app was not up to date

## [1.14.0] - 2026-03-26

### Added

- Browse followed artists and their recent tracks

### Changed

- Smoother audio crossfade transitions

## [1.13.0] - 2026-03-25

### Added

- Track actions menu in the expanded player bar
- Curated picks section on the home page

### Fixed

- Audio sometimes failed to play on track switch

## [1.12.1] - 2026-03-23

### Changed

- Selected mix persists across tab switches

### Fixed

- Crossfade broke after reordering the queue
- Streaming URLs expired during long listening sessions
- Downloads couldn't be cancelled during original file fetch
- Media controls position was stale during crossfade

## [1.12.0] - 2026-03-23

### Added

- Personalized mix discovery on download page
- Support for SoundCloud discover/chart playlist URLs

## [1.11.0] - 2026-03-22

### Added

- Crossfade between tracks with adjustable duration

### Fixed

- Update progress bar showed incorrect values
- App couldn't restart after installing an update

## [1.10.0] - 2026-03-20

### Added

- Right-click context menu on tracks (copy link, open in browser, add/remove from playlist)
- Shuffle mode in audio player
- Waveform visualization in expanded player
- Direct file download with MP3 320kbps conversion for tracks that support it
- Stream-only mode to hide download UI
- Open folder button in progress panel

### Changed

- Settings redesigned as dialog with sidebar navigation
- Smoother playback transitions between tracks

### Fixed

- Downloaded tracks were not auto-deselected
- Select-all shown when all tracks already downloaded

## [1.9.2] - 2026-03-18

### Changed

- Download progress displayed in MB during updates
- Restart link after update installation

### Fixed

- Audio playback was broken in production builds

## [1.9.1] - 2026-03-18

### Fixed

- Audio playback was blocked due to missing CDN permissions

## [1.9.0] - 2026-03-18

### Added

- OS media controls (play, pause, skip from system UI)

### Changed

- Faster audio loading

### Fixed

- Duplicate media controls were appearing on macOS
- Library view and scroll position were lost when switching tabs
- Search input was cleared when switching tabs

## [1.8.0] - 2026-03-17

### Added

- Built-in audio player with queue and playback controls
- Play/pause on tracks in library and search views

### Changed

- Select all toggle shows contextual label in library

### Fixed

- Track download state not resetting on path change
- Refresh animation triggering on unrelated actions

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
