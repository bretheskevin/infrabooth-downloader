# Functional Requirements

## Authentication

- **FR1:** User can initiate SoundCloud authentication via browser popup
- **FR2:** User can see their SoundCloud username displayed after successful authentication
- **FR3:** User can remain authenticated across app sessions (token persistence)
- **FR4:** User can sign out and re-authenticate with a different account

## Content Download

- **FR5:** User can paste a SoundCloud playlist URL to initiate download
- **FR6:** User can paste a SoundCloud track URL to initiate download
- **FR7:** System can extract all tracks from a playlist URL
- **FR8:** System can download audio at source quality (256kbps AAC for Go+ subscribers)
- **FR9:** System can convert downloaded audio to MP3 format
- **FR10:** System can embed metadata (artist, title, album, artwork) into downloaded files

## Progress & Status

- **FR11:** User can see overall download progress (X of Y tracks)
- **FR12:** User can see individual track status (pending, downloading, complete, failed)
- **FR13:** User can see visual confirmation of completion (check icon per track)
- **FR14:** User can see rate limit status when throttling occurs ("Waiting...")

## Error Handling

- **FR15:** User can see clear error message for invalid URLs (non-track/playlist)
- **FR16:** User can see specific failure reason for geo-blocked tracks
- **FR17:** User can see specific failure reason for unavailable tracks
- **FR18:** User can review all failed tracks in an error panel
- **FR19:** System can continue downloading remaining tracks after individual failures

## File Management

- **FR20:** User can select download destination folder via native OS dialog
- **FR21:** System can save downloaded files to user-specified location
- **FR22:** System can generate filenames from track metadata (artist - title.mp3)

## Application Lifecycle

- **FR23:** System can check for application updates on launch
- **FR24:** User can see update available notification (non-blocking banner)
- **FR25:** User can continue using outdated version after dismissing update notice
- **FR26:** User can access settings panel
- **FR27:** Application can launch and display UI without internet connection

## Localization

- **FR28:** User can view application interface in English
- **FR29:** User can view application interface in French
- **FR30:** User can switch between supported languages in settings
