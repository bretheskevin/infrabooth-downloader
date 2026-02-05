---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'SoundCloud track downloader desktop tool'
session_goals: 'Minimal MVP feature set, technical architecture decisions, free distribution'
selected_approach: 'AI-Recommended Techniques'
techniques_used: ['First Principles Thinking', 'Resource Constraints', 'Morphological Analysis']
ideas_generated: ['12 fundamental truths', 'MVP 3-feature definition', '17 architecture decisions']
context_file: ''
workflow_completed: true
session_active: false
---

# Brainstorming Session Results

**Facilitator:** Kandid
**Date:** 2026-02-04

## Session Overview

**Topic:** SoundCloud track downloader desktop tool (new project, from scratch)

**Goals:**
- Define minimal viable feature set for MVP
- Establish technical architecture
- Free distribution model

### Key Constraints
- MVP-first mindset (minimal, not feature-bloated)
- Free tool (no monetization)
- Desktop application

### Selected Approach
AI-Recommended Techniques - customized suggestions based on MVP + architecture goals

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** SoundCloud track downloader with focus on minimal MVP + architecture

**Recommended Techniques:**

1. **First Principles Thinking:** Strip assumptions about downloaders, rebuild from user fundamentals
2. **Resource Constraints:** Force ruthless MVP prioritization through extreme limitations
3. **Morphological Analysis:** Systematically map all technical architecture choices

**AI Rationale:** MVP-from-scratch projects benefit from first establishing true user needs (not assumed features), then forcing prioritization through constraints, and finally mapping technical decisions systematically.

---

## Technique 1: First Principles Thinking

### Fundamental Truths Discovered

| # | Fundamental | Insight |
|---|-------------|---------|
| 1 | Authenticated downloads | Go+ subscription unlocks 256kbps AAC - web tools can't access this |
| 2 | Playlist as primary unit | Users download playlists, not individual tracks |
| 3 | Local = fast + private | No middleman servers, direct to SoundCloud CDN |
| 4 | AAC 256kbps ceiling | Be honest - no fake FLAC upscaling |
| 5 | MP3 default | Universal compatibility over audio purity |
| 6 | Smart defaults | Power-user options available, but sane defaults |
| 7 | Complete metadata | Artist, title, artwork embedded - non-negotiable |
| 8 | Playlist order optional | Numbered prefix off by default, toggle available |
| 9 | Self-contained files | Embedded artwork, portable anywhere |
| 10 | OAuth2 browser flow | Official SoundCloud auth, no password storage |
| 11 | Detailed progress | Show speed, track count, transparent about rate limits |
| 12 | Graceful failure | Fibonacci retry (3-4x), warn + continue, manual retry button |

### Core Value Proposition
**Not "another downloader" - it's "get what you paid for."** Authenticated access to Go+ quality that web scrapers cannot provide.

---

## Technique 2: Resource Constraints

### Constraint #1: The 3-Feature Rule
**MVP Features (everything else is v2):**
1. OAuth login (browser popup)
2. Playlist URL → download with metadata
3. Select download location

**Killed for v2:** Format choice, playlist ordering toggle, retry button, download speed display

### Constraint #2: One Weekend Build
| Feature | Weekend Implementation |
|---------|------------------------|
| OAuth | Browser popup only, no token refresh |
| Download | Sequential, progress bar, current track name |
| Location | Native folder picker, no memory |

**Killed:** Parallel downloads, token refresh, "remember folder", subfolder creation

### Constraint #3: One Screen UI
```
┌─────────────────────────────────────┐
│  [Sign in with SoundCloud]          │
│  Paste playlist URL: [__________]   │
│  Download to: [Browse...]           │
│  [Download]                         │
│  ┌─────────────────────────────┐   │
│  │ Downloading: Track 3 of 47  │   │
│  │ ████████░░░░░░░░░ 35%       │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### MVP Definition
**Absolute minimum:** OAuth popup + paste URL + pick folder + download with progress + metadata embedded

---

## Technique 3: Morphological Analysis

### Complete Architecture Matrix

| # | Dimension | Decision |
|---|-----------|----------|
| 1 | Framework | Tauri (Rust + Web) |
| 2 | Frontend | React + TypeScript |
| 3 | Download Engine | yt-dlp (bundled) |
| 4 | Audio Processing | FFmpeg (bundled) |
| 5 | Auth Flow | OAuth popup → token to yt-dlp |
| 6 | Token Storage | Encrypted JSON (machine-bound key) |
| 7 | Packaging | Native installers (MSI/DMG) |
| 8 | Platforms | Windows + macOS |
| 9 | Error Handling | Error panel + queue retry + log file |
| 10 | Logging | All levels, app data, size rotation, structured |
| 11 | Config | JSON, app data, simple settings panel |
| 12 | Concurrency | Sequential, Retry-After, Fibonacci fallback |
| 13 | Binaries | Embed at build, checksum verified, pinned versions |
| 14 | Updates | Tauri updater, continuous, undismissable warn |
| 15 | Branding | InfraBooth Downloader, purple/blue, friendly |
| 16 | Security | Machine-bound encryption, HTTPS, signing v1.1 |
| 17 | Documentation | README + arch doc MVP, full docs site v1.1 |

### System Architecture Diagram

```
┌──────────────────────────────────────────────────┐
│  InfraBooth Downloader (Tauri)                   │
│  ┌────────────────┐    ┌──────────────────────┐ │
│  │ UI (React)     │◄──►│ Rust Backend         │ │
│  │ • Login button │    │ ├─ OAuth handler     │ │
│  │ • URL input    │    │ ├─ yt-dlp wrapper    │ │
│  │ • Progress list│    │ ├─ FFmpeg wrapper    │ │
│  │ • Error panel  │    │ ├─ Encrypted storage │ │
│  │ • Settings     │    │ ├─ Logger            │ │
│  └────────────────┘    │ └─ File system I/O   │ │
│                        └──────────────────────┘ │
│  Bundled: yt-dlp binary, FFmpeg binary          │
└──────────────────────────────────────────────────┘
```

### Detailed Decisions

**Error Handling:**
- Dedicated error panel (reviewable history)
- Skip & queue failed tracks
- Batch retry button
- Log file for debugging

**Logging:**
- Levels: Error, Warn, Info, Debug
- Location: OS app data folder
- Rotation: Size-based (10MB, keep 3)
- Format: Structured text (`timestamp=... level=... msg=...`)

**Config:**
- Settings: Output format (MP3/AAC), Keep playlist order (bool)
- Format: JSON
- UI: Simple settings panel with toggles

**Concurrency:**
- Sequential downloads (one at a time)
- Respect Retry-After header
- Fibonacci fallback (1s, 1s, 2s, 3s, 5s...)
- Simple queue in playlist order

**Binaries:**
- Embed at build time
- App resources folder
- Checksum verification in CI
- Pinned versions, official sources only

**Updates:**
- Tauri built-in updater
- Check on launch
- Continuous releases with changelog
- Undismissable warning banner (non-blocking)

**Branding:**
- Name: InfraBooth Downloader
- Colors: Purple/blue gradient (independent)
- Tone: Friendly
- Part of InfraBooth ecosystem

**Security:**
- Token: Encrypted JSON, machine-bound key
- Code signing: v1.1 (MVP unsigned)
- Network: HTTPS only
- Binaries: Verified checksums

**Documentation:**
- MVP: README.md, CHANGELOG.md, Architecture doc
- v1.1: Full docs site
- In-app: Help link, "What's new" after update

---

## Idea Organization and Prioritization

### Thematic Organization

**Theme 1: Core Value Proposition**
- Authenticated downloads unlock Go+ quality (256kbps AAC)
- "Get what you paid for" - not piracy, access to subscription
- Local app = fast + private, no middleman servers
- Playlist as primary unit, not single tracks

**Theme 2: MVP Feature Set (3 Features)**
1. OAuth login (browser popup)
2. Playlist download with full metadata
3. Select download location

**Theme 3: Technical Stack**
- Tauri (Rust + React + TypeScript)
- yt-dlp + FFmpeg bundled
- Windows + macOS installers

**Theme 4: User Experience**
- InfraBooth Downloader branding
- Purple/blue gradient, friendly tone
- Clean UI with help link
- Error panel with batch retry

**Theme 5: Operational**
- Structured logging with rotation
- Sequential downloads, Fibonacci backoff
- Machine-bound token encryption
- Tauri auto-updater

### Prioritization Results

**MVP Must-Haves:**
1. OAuth + yt-dlp integration
2. Playlist download with metadata
3. Progress UI with error handling

**Quick Wins:**
1. Single-screen UI
2. JSON config
3. README + CHANGELOG

**v1.1 Roadmap:**
1. Code signing
2. Full docs site
3. Format choice (MP3/AAC)
4. Playlist order numbering

### Action Plan

**Week 1: Foundation**
- [ ] Initialize Tauri project with React + Vite + TypeScript
- [ ] Set up CI for Windows + macOS builds
- [ ] Implement OAuth browser flow
- [ ] Test yt-dlp integration with SoundCloud

**Week 2: Core Features**
- [ ] Playlist URL parsing
- [ ] Download queue (sequential)
- [ ] FFmpeg MP3 conversion
- [ ] Metadata embedding

**Week 3: UI & Polish**
- [ ] Single-screen UI implementation
- [ ] Progress list with status icons
- [ ] Error panel + retry logic
- [ ] Settings panel

**Week 4: Release Prep**
- [ ] Tauri updater configuration
- [ ] Bundled binaries with checksum verification
- [ ] README, CHANGELOG
- [ ] GitHub Releases setup
- [ ] Beta testing

---

## Session Summary

### Key Achievements
- **12 fundamental truths** defining exactly what users need
- **Ruthless MVP scope** reduced to 3 core features
- **17 architecture decisions** covering every technical dimension
- **Clear v1.0 vs v1.1 boundary** preventing scope creep
- **4-week action plan** with concrete deliverables

### Creative Breakthroughs
- **Reframing:** "Get what you paid for" vs. "downloader tool"
- **Delegation:** yt-dlp + FFmpeg handle the hard parts, Rust orchestrates
- **Pragmatic defaults:** MP3 for compatibility, power users can toggle

### Session Insights
- User has clear technical vision and knows the domain well
- MVP-first mindset consistently applied across all decisions
- InfraBooth ecosystem provides branding context
- v1.1 roadmap captures deferred but valuable features

---

**Session completed: 2026-02-04**
**Facilitator: Claude (AI-Recommended Techniques)**
**Product: InfraBooth Downloader**
