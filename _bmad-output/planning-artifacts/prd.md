---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
workflowCompleted: true
completedAt: '2026-02-05'
inputDocuments:
  - '_bmad-output/brainstorming/brainstorming-session-2026-02-04.md'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 0
workflowType: 'prd'
projectType: 'greenfield'
classification:
  projectType: 'desktop_app'
  domain: 'general_consumer_media'
  complexity: 'low'
  projectContext: 'greenfield'
---

# Product Requirements Document - sc-downloader

**Author:** Kandid
**Date:** 2026-02-05

## Executive Summary

**Product:** InfraBooth Downloader

**Vision:** Enable SoundCloud Go+ subscribers to download their playlists with full metadata - "Get what you paid for."

**Target Users:** SoundCloud Go+ subscribers who want their music as portable files, not locked in an app.

**Differentiator:** Authenticated access to 256kbps AAC quality that web scrapers cannot provide. Clean, trustworthy desktop app vs sketchy web tools.

**Tech Stack:** Tauri (Rust + TypeScript) wrapping yt-dlp and FFmpeg.

**Platforms:** Windows 10+, macOS 11+

## Success Criteria

### User Success

- **Completion confidence:** User sees check icon next to each track title and 100% progress bar - no need to verify files manually
- **Graceful degradation:** Partial failures (geo-restrictions, licensing) display as warnings, not errors - session still feels successful
- **Zero-config experience:** Smart defaults work out of the box; power-user options available but not required
- **Portable output:** Downloaded files play anywhere with embedded artwork and metadata

### Business Success

- **Brand recognition:** InfraBooth Downloader establishes InfraBooth as a name associated with quality developer tools
- **No monetization pressure:** Free tool, success measured by reputation not revenue
- **Ecosystem foundation:** Creates recognition for future InfraBooth tools

### Technical Success

- **OAuth reliability:** Browser popup flow completes without user confusion
- **Download integrity:** yt-dlp extracts at source quality (256kbps AAC for Go+)
- **Conversion accuracy:** FFmpeg preserves metadata through MP3 conversion
- **Rate limit resilience:** Fibonacci backoff handles SoundCloud throttling transparently

### Measurable Outcomes

| Metric | Target |
|--------|--------|
| Successful playlist download | 95%+ tracks complete per session |
| OAuth completion rate | >99% (browser flow, no token complexity) |
| User intervention required | Zero for happy path |
| Time to first download | <60 seconds from app launch |

## Product Scope

### MVP - Minimum Viable Product

1. OAuth login (browser popup)
2. Playlist URL → download with full metadata
3. Select download location (native folder picker)
4. Progress UI with track status icons
5. Error panel with warnings for failed tracks

### Growth Features (v1.1)

- Code signing (MSI/DMG)
- Format choice toggle (MP3/AAC)
- Playlist order numbering prefix
- Full documentation site
- "What's new" after updates

### Vision (Future)

- Additional InfraBooth ecosystem tools
- Potential expansion to other platforms/services
- Community-driven feature requests

## User Journeys

### Journey 1: Marcus - The Frustrated Subscriber (Happy Path)

**Who:** Marcus, 28, pays €9.99/month for SoundCloud Go+. He's got 12 playlists he's curated over years - underground electronic, obscure remixes, stuff that's not on Spotify.

**Opening Scene:** Marcus is packing for a camping trip. No cell service for 3 days. He opens SoundCloud mobile, realizes offline mode is clunky, limited, and tied to the app. He can't just drop the files into his old MP3 player or his car's USB. He's been paying for Go+ for 2 years. Where's *his* music?

**Rising Action:**
1. Googles "download soundcloud playlist" → sketchy web tools that max out at 128kbps and can't handle Go+ tracks
2. Finds InfraBooth Downloader → downloads, installs
3. Clicks "Sign in with SoundCloud" → browser popup, authorizes
4. Pastes his 47-track playlist URL → picks his Music folder → hits Download

**Climax:** Progress bar fills. Check marks appear next to each track. 47/47 complete. He opens the folder - every file has artwork embedded, proper artist/title tags.

**Resolution:** Marcus drags the folder to his MP3 player. His music. His way. No app required.

### Journey 2: Marcus - The Interrupted Download (Edge Case)

**Opening Scene:** Marcus pastes his 47-track playlist. Download starts. Around track 19, things slow down. SoundCloud is throttling.

**Rising Action:**
1. Progress bar shows "Track 19 of 47" but speed drops
2. App shows subtle "Rate limited - waiting..." status (Fibonacci backoff kicks in)
3. Two tracks fail completely - geo-blocked in his region
4. Warning icon appears next to those tracks: "Unavailable in your region"

**Climax:** Download completes. 45/47 successful. 2 show warning icons with clear "Geo-blocked" labels - not mystery failures.

**Resolution:** Marcus knows exactly what happened. No guessing. He got what was available, and understands why 2 tracks didn't make it. He's not frustrated at the app - he's frustrated at the restriction, which is the right target.

### Journey 3: Sarah - OAuth Trust Moment (First-Time User)

**Who:** Sarah, 34, found InfraBooth Downloader via Reddit. She's skeptical of "download tools."

**Opening Scene:** Sarah downloads the app. Sees clean UI. Wonders "is this going to steal my password?"

**Rising Action:**
1. Clicks "Sign in with SoundCloud"
2. Browser opens - she sees it's *actual SoundCloud's* login page, not some fake form
3. SoundCloud asks "Allow InfraBooth Downloader to access your account?"
4. She clicks Authorize - browser closes, app shows "Signed in as sarah_music"

**Climax:** Realizes she never typed her password into the app itself. OAuth did its job.

**Resolution:** Trust established. She pastes her first playlist URL.

### Journey 4: Invalid URL Error

**Who:** Marcus again, this time pastes his profile URL instead of a playlist

**Scene:** Pastes `soundcloud.com/marcus-beats` (profile, not playlist/track)

**Response:** App shows clear error: "This URL doesn't point to a track or playlist. Please paste a track or playlist URL."

**Resolution:** Marcus copies the right URL. No confusion.

### Journey Requirements Summary

| Journey | Reveals Requirements For |
|---------|-------------------------|
| Marcus - Success | Core download flow, progress UI, metadata embedding, track URL support |
| Marcus - Interrupted | Rate limit handling (Fibonacci backoff), geo-block messaging, partial success states, warning icons |
| Sarah - OAuth | Browser popup flow, trust signals, signed-in state display |
| Invalid URL | URL validation, clear error messaging for non-track/playlist URLs |

## Desktop App Specific Requirements

### Platform Support

| Platform | Version | Status |
|----------|---------|--------|
| Windows | 10+ | Supported |
| macOS | 11+ (Big Sur) | Supported |
| Linux | — | Not supported |

**Packaging:**
- Windows: MSI installer
- macOS: DMG with drag-to-Applications

### System Integration

| Integration | Implementation |
|-------------|----------------|
| OAuth | Browser popup (system default browser) |
| File picker | Native OS dialog |
| Bundled binaries | yt-dlp, FFmpeg in app resources |
| System tray | None |
| Startup on boot | None |
| File associations | None |

**Design principle:** Zero system footprint beyond the app itself. No background processes, no registry pollution, no login items.

### Update Strategy

- **Check frequency:** On app launch
- **Notification:** Undismissable warning banner (non-blocking)
- **User choice:** Can continue using outdated version
- **Mechanism:** Tauri built-in updater
- **Distribution:** GitHub Releases

### Offline Capabilities

| Scenario | Behavior |
|----------|----------|
| App launch (no internet) | Works - UI loads, settings accessible |
| Download attempt (no internet) | Error: "No internet connection" |
| OAuth (no internet) | Error: "Cannot reach SoundCloud" |
| Previously downloaded files | Fully accessible (local files) |

**No server dependency:** App is self-contained. No telemetry, no license checks, no backend.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP
- Single question: "Can I download my Go+ playlists with proper metadata?"
- Binary success: it works or it doesn't
- No partial value - the core flow must complete end-to-end

**Resource Requirements:** Solo developer
- Leverages Tauri framework (Rust + TypeScript)
- Delegates complexity to proven tools (yt-dlp, FFmpeg)
- Minimal custom code surface area

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Marcus - Happy path (full playlist download)
- Marcus - Edge case (rate limits, geo-blocks)
- Sarah - OAuth trust moment
- Invalid URL error handling

**Must-Have Capabilities:**
1. OAuth login via browser popup
2. Playlist/track URL parsing and validation
3. Sequential download with yt-dlp
4. MP3 conversion with metadata via FFmpeg
5. Progress UI with per-track status icons
6. Error panel with clear failure reasons (geo-block, rate limit, invalid URL)
7. Native folder picker for download location

### Post-MVP Features

**Phase 2 (v1.1 - Growth):**
- Code signing (MSI/DMG) for trust
- Format choice toggle (MP3/AAC)
- Playlist order numbering prefix option
- Full documentation site
- "What's new" changelog after updates

**Phase 3 (Vision - Expansion):**
- Additional InfraBooth ecosystem tools
- Potential expansion to other platforms/services
- Community-driven feature requests

### Risk Mitigation Strategy

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| yt-dlp breaks with SC changes | Medium | High | Pin version, monitor upstream, quick binary update |
| OAuth flow confusion | Low | Medium | Browser popup only, clear "Signed in as X" confirmation |
| SoundCloud blocks OAuth entirely | Low | Critical | **Accepted risk** - product becomes impossible, move on |
| Rate limiting disrupts UX | High | Low | Fibonacci backoff, clear "waiting" status, partial success is success |

## Functional Requirements

### Authentication

- **FR1:** User can initiate SoundCloud authentication via browser popup
- **FR2:** User can see their SoundCloud username displayed after successful authentication
- **FR3:** User can remain authenticated across app sessions (token persistence)
- **FR4:** User can sign out and re-authenticate with a different account

### Content Download

- **FR5:** User can paste a SoundCloud playlist URL to initiate download
- **FR6:** User can paste a SoundCloud track URL to initiate download
- **FR7:** System can extract all tracks from a playlist URL
- **FR8:** System can download audio at source quality (256kbps AAC for Go+ subscribers)
- **FR9:** System can convert downloaded audio to MP3 format
- **FR10:** System can embed metadata (artist, title, album, artwork) into downloaded files

### Progress & Status

- **FR11:** User can see overall download progress (X of Y tracks)
- **FR12:** User can see individual track status (pending, downloading, complete, failed)
- **FR13:** User can see visual confirmation of completion (check icon per track)
- **FR14:** User can see rate limit status when throttling occurs ("Waiting...")

### Error Handling

- **FR15:** User can see clear error message for invalid URLs (non-track/playlist)
- **FR16:** User can see specific failure reason for geo-blocked tracks
- **FR17:** User can see specific failure reason for unavailable tracks
- **FR18:** User can review all failed tracks in an error panel
- **FR19:** System can continue downloading remaining tracks after individual failures

### File Management

- **FR20:** User can select download destination folder via native OS dialog
- **FR21:** System can save downloaded files to user-specified location
- **FR22:** System can generate filenames from track metadata (artist - title.mp3)

### Application Lifecycle

- **FR23:** System can check for application updates on launch
- **FR24:** User can see update available notification (non-blocking banner)
- **FR25:** User can continue using outdated version after dismissing update notice
- **FR26:** User can access settings panel
- **FR27:** Application can launch and display UI without internet connection

### Localization

- **FR28:** User can view application interface in English
- **FR29:** User can view application interface in French
- **FR30:** User can switch between supported languages in settings

## Non-Functional Requirements

### Performance

- **NFR1:** Application launches to interactive state within 3 seconds
- **NFR2:** UI responds to user input within 100ms during downloads
- **NFR3:** Progress updates display within 500ms of status change

### Security

- **NFR4:** OAuth tokens encrypted at rest using machine-bound key
- **NFR5:** No credentials stored in plaintext
- **NFR6:** HTTPS only for all network communication
- **NFR7:** No telemetry or data collection

### Reliability

- **NFR8:** Application does not crash during playlist downloads of up to 100 tracks, rate limit recovery, or error panel interactions
- **NFR9:** Partial download failures do not corrupt successfully downloaded files
- **NFR10:** Application state persists across unexpected termination (token, settings)

### Integration

- **NFR11:** Bundled yt-dlp version pinned and verified via checksum
- **NFR12:** Bundled FFmpeg version pinned and verified via checksum
- **NFR13:** Binary updates can be deployed without full app reinstall (future consideration)
