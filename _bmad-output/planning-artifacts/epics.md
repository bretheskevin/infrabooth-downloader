---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories"]
inputDocuments:
  - "_bmad-output/planning-artifacts/prd/index.md (sharded)"
  - "_bmad-output/planning-artifacts/architecture/index.md (sharded)"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
  - "SoundCloud API Guide (https://developers.soundcloud.com/docs/api/guide)"
---

# sc-downloader - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for sc-downloader, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**Authentication**
- FR1: User can initiate SoundCloud authentication via browser popup
- FR2: User can see their SoundCloud username displayed after successful authentication
- FR3: User can remain authenticated across app sessions (token persistence)
- FR4: User can sign out and re-authenticate with a different account

**Content Download**
- FR5: User can paste a SoundCloud playlist URL to initiate download
- FR6: User can paste a SoundCloud track URL to initiate download
- FR7: System can extract all tracks from a playlist URL
- FR8: System can download audio at source quality (256kbps AAC for Go+ subscribers)
- FR9: System can convert downloaded audio to MP3 format
- FR10: System can embed metadata (artist, title, album, artwork) into downloaded files

**Progress & Status**
- FR11: User can see overall download progress (X of Y tracks)
- FR12: User can see individual track status (pending, downloading, complete, failed)
- FR13: User can see visual confirmation of completion (check icon per track)
- FR14: User can see rate limit status when throttling occurs ("Waiting...")

**Error Handling**
- FR15: User can see clear error message for invalid URLs (non-track/playlist)
- FR16: User can see specific failure reason for geo-blocked tracks
- FR17: User can see specific failure reason for unavailable tracks
- FR18: User can review all failed tracks in an error panel
- FR19: System can continue downloading remaining tracks after individual failures

**File Management**
- FR20: User can select download destination folder via native OS dialog
- FR21: System can save downloaded files to user-specified location
- FR22: System can generate filenames from track metadata (artist - title.mp3)

**Application Lifecycle**
- FR23: System can check for application updates on launch
- FR24: User can see update available notification (non-blocking banner)
- FR25: User can continue using outdated version after dismissing update notice
- FR26: User can access settings panel
- FR27: Application can launch and display UI without internet connection

**Localization**
- FR28: User can view application interface in English
- FR29: User can view application interface in French
- FR30: User can switch between supported languages in settings

### NonFunctional Requirements

**Performance**
- NFR1: Application launches to interactive state within 3 seconds
- NFR2: UI responds to user input within 100ms during downloads
- NFR3: Progress updates display within 500ms of status change

**Security**
- NFR4: OAuth tokens encrypted at rest using machine-bound key
- NFR5: No credentials stored in plaintext
- NFR6: HTTPS only for all network communication
- NFR7: No telemetry or data collection

**Reliability**
- NFR8: Application does not crash during playlist downloads of up to 100 tracks, rate limit recovery, or error panel interactions
- NFR9: Partial download failures do not corrupt successfully downloaded files
- NFR10: Application state persists across unexpected termination (token, settings)

**Integration**
- NFR11: Bundled yt-dlp version pinned and verified via checksum
- NFR12: Bundled FFmpeg version pinned and verified via checksum
- NFR13: Binary updates can be deployed without full app reinstall (future consideration)

### Additional Requirements

**From Architecture - Starter Template & Stack**
- ARCH-1: Initialize project using official `create-tauri-app` with React + TypeScript + Vite
- ARCH-2: Configure Tailwind CSS for styling
- ARCH-3: Initialize Shadcn/ui component library
- ARCH-4: Set up Zustand for state management
- ARCH-5: Configure react-i18next for localization framework
- ARCH-6: Configure Tauri Sidecar for yt-dlp and FFmpeg binaries (pinned versions, checksum verified)

**From Architecture - IPC & Communication**
- ARCH-7: Implement Tauri Commands pattern for React → Rust communication
- ARCH-8: Implement Tauri Events pattern for Rust → React progress streaming
- ARCH-9: Define structured error types mapped to user-friendly messages

**From Architecture - CI/CD & Deployment**
- ARCH-10: Set up GitHub Actions CI workflow (lint, type-check, test)
- ARCH-11: Set up GitHub Actions release workflow for cross-platform builds
- ARCH-12: Configure Windows (MSI) and macOS (DMG) build targets
- ARCH-13: Integrate Tauri updater with GitHub Releases for update manifest

**From UX Design - Interaction Requirements**
- UX-1: URL validation must complete within 500ms of paste
- UX-2: All user actions must receive immediate visual feedback
- UX-3: Rate limit pauses display reassuring message: "Brief pause — SoundCloud rate limit (this is normal)"
- UX-4: "Open Folder" button appears at download completion
- UX-5: Partial completion (e.g., 45/47) framed as success with context, not failure

**From UX Design - Visual & Layout Requirements**
- UX-6: Minimum window size: 400×500px
- UX-7: Default window size: 600×700px
- UX-8: Stacked track list layout with per-track status (Transmit-inspired)
- UX-9: Header shows username + "Go+ 256kbps" quality badge when authenticated

**From UX Design - Accessibility Requirements**
- UX-10: WCAG 2.1 AA compliance (4.5:1 contrast minimum)
- UX-11: Visible focus rings on all interactive elements
- UX-12: Full keyboard navigation support (Tab, Shift+Tab, Enter, Escape)
- UX-13: Screen reader announcements for auth, validation, completion, errors
- UX-14: Status conveyed through icons + text, not color alone

**From SoundCloud API**
- API-1: Implement OAuth 2.1 with PKCE (required by SoundCloud)
- API-2: Use custom protocol redirect URI: `sc-downloader://auth/callback`
- API-3: Register Tauri deep link handler for `sc-downloader://` protocol
- API-4: Implement token refresh flow (access tokens expire ~1 hour)
- API-5: Handle rate limiting (50 tokens per 12 hours per app, 30 tokens per hour per IP)
- API-6: Store Client ID: `4CHDCUOhHIdSxBv4XN0msyZXuIXbB5wv` in configuration
- API-7: Client Secret to be configured securely (env/keychain, not in code)

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 2 | OAuth browser popup |
| FR2 | Epic 2 | Username display |
| FR3 | Epic 2 | Session persistence |
| FR4 | Epic 2 | Sign out |
| FR5 | Epic 3 | Playlist URL paste |
| FR6 | Epic 3 | Track URL paste |
| FR7 | Epic 3 | Track extraction |
| FR8 | Epic 4 | 256kbps AAC quality |
| FR9 | Epic 4 | MP3 conversion |
| FR10 | Epic 4 | Metadata embedding |
| FR11 | Epic 5 | Overall progress |
| FR12 | Epic 5 | Per-track status |
| FR13 | Epic 5 | Completion checkmarks |
| FR14 | Epic 5 | Rate limit display |
| FR15 | Epic 3 | Invalid URL errors |
| FR16 | Epic 7 | Geo-block reasons |
| FR17 | Epic 7 | Unavailable reasons |
| FR18 | Epic 7 | Error panel |
| FR19 | Epic 4 | Continue on failure |
| FR20 | Epic 6 | Folder selection |
| FR21 | Epic 6 | Save to location |
| FR22 | Epic 6 | Filename generation |
| FR23 | Epic 9 | Update check |
| FR24 | Epic 9 | Update banner |
| FR25 | Epic 9 | Dismiss update |
| FR26 | Epic 8 | Settings panel |
| FR27 | Epic 1 | Offline UI launch |
| FR28 | Epic 8 | English UI |
| FR29 | Epic 8 | French UI |
| FR30 | Epic 8 | Language switching |

## Epic List

### Epic 1: Project Foundation & App Shell
User can launch the app and see a professional, functional interface.

**FRs covered:** FR27
**Additional:** ARCH-1, ARCH-2, ARCH-3, ARCH-4, ARCH-5, UX-6, UX-7

---

### Epic 2: SoundCloud Authentication
User can securely sign in with SoundCloud and see their identity + Go+ quality badge.

**FRs covered:** FR1, FR2, FR3, FR4
**Additional:** API-1, API-2, API-3, API-4, API-5, API-6, API-7, UX-9

---

### Epic 3: URL Validation & Playlist Preview
User can paste a SoundCloud URL and instantly see a preview of what they'll download.

**FRs covered:** FR5, FR6, FR7, FR15
**Additional:** UX-1, UX-2

---

### Epic 4: Download & Media Processing Engine
User can download tracks at full quality, converted to MP3 with embedded metadata.

**FRs covered:** FR8, FR9, FR10, FR19
**Additional:** ARCH-6, ARCH-7, ARCH-8, ARCH-9, NFR11, NFR12

---

### Epic 5: Progress & Real-time Status
User can watch downloads progress with per-track status and overall completion.

**FRs covered:** FR11, FR12, FR13, FR14
**Additional:** UX-3, UX-8, NFR3

---

### Epic 6: File Management & Completion
User can choose where files go and immediately access them when done.

**FRs covered:** FR20, FR21, FR22
**Additional:** UX-4, UX-5

---

### Epic 7: Error Handling & Transparency
User understands exactly what failed and why, with clear recovery paths.

**FRs covered:** FR16, FR17, FR18

---

### Epic 8: Settings & Localization
User can customize the app and use it in English or French.

**FRs covered:** FR26, FR28, FR29, FR30

---

### Epic 9: Application Updates & Distribution
User knows when updates exist and can choose to update (or not).

**FRs covered:** FR23, FR24, FR25
**Additional:** ARCH-10, ARCH-11, ARCH-12, ARCH-13

---

**Accessibility (UX-10 through UX-14):** Woven throughout all epics as implementation standards.

---

## Epic 1: Project Foundation & App Shell

User can launch the app and see a professional, functional interface.

### Story 1.1: Initialize Tauri Project with React + TypeScript

**As a** developer,
**I want** a properly initialized Tauri 2.0 project with React and TypeScript,
**So that** I have a working foundation to build the application.

**Acceptance Criteria:**

**Given** no existing project structure
**When** the initialization commands are run
**Then** a new Tauri project is created with:
- React frontend with TypeScript
- Vite as the build tool
- Bundle identifier: `com.infrabooth.downloader`
- Project compiles without errors
**And** `npm run tauri dev` launches a window with the default React template
**And** the project structure matches Architecture specification

---

### Story 1.2: Configure Tailwind CSS & Shadcn/ui

**As a** developer,
**I want** Tailwind CSS and Shadcn/ui configured in the project,
**So that** I can build UI components with a consistent, professional design system.

**Acceptance Criteria:**

**Given** the initialized Tauri project from Story 1.1
**When** Tailwind CSS is installed and configured
**Then** Tailwind utility classes work in React components
**And** `tailwind.config.js` includes proper content paths for `/src/**/*.{ts,tsx}`
**And** `postcss.config.js` is properly configured

**Given** Tailwind is configured
**When** Shadcn/ui is initialized
**Then** `components.json` is created with project settings
**And** the `/src/components/ui/` directory is created
**And** base Shadcn components can be added via `npx shadcn@latest add [component]`

---

### Story 1.3: Create App Shell Layout

**As a** user,
**I want** to see a clean, professional app interface when I launch the application,
**So that** I feel confident using the tool.

**Acceptance Criteria:**

**Given** the app is launched
**When** the window opens
**Then** the window has a default size of 600×700 pixels (UX-7)
**And** the window has a minimum size of 400×500 pixels (UX-6)
**And** the window cannot be resized smaller than the minimum

**Given** the app window is displayed
**When** the user views the interface
**Then** a header area is visible at the top
**And** a main content area is visible below the header
**And** the layout uses proper spacing rhythm (8px multiples per UX spec)
**And** the UI displays without requiring an internet connection (FR27)

**Given** the app shell is rendered
**When** inspecting the component structure
**Then** the layout uses Shadcn/ui components where appropriate
**And** Tailwind classes are used for styling
**And** the layout is accessible with proper semantic HTML

---

### Story 1.4: Configure Zustand Store Structure

**As a** developer,
**I want** Zustand state management configured with the core store structure,
**So that** application state can be managed consistently across components.

**Acceptance Criteria:**

**Given** the project with React configured
**When** Zustand is installed and configured
**Then** the following store files are created:
- `/src/stores/authStore.ts` — Auth state skeleton
- `/src/stores/queueStore.ts` — Download queue state skeleton
- `/src/stores/settingsStore.ts` — User preferences skeleton

**Given** the stores are created
**When** examining each store
**Then** each store has TypeScript interfaces for its state shape
**And** each store exports a typed hook (e.g., `useAuthStore`)
**And** stores follow the pattern from Architecture spec

**Given** the settings store exists
**When** the app launches
**Then** the settings store initializes with default values:
- `downloadPath`: system default downloads folder
- `language`: `'en'`

---

### Story 1.5: Configure react-i18next Foundation

**As a** developer,
**I want** react-i18next configured with the localization structure,
**So that** the app is ready for multi-language support.

**Acceptance Criteria:**

**Given** the project with React configured
**When** react-i18next is installed and configured
**Then** `/src/lib/i18n.ts` is created with i18next initialization
**And** `/src/locales/en.json` is created with placeholder structure
**And** `/src/locales/fr.json` is created with placeholder structure

**Given** i18n is configured
**When** the app initializes
**Then** the default language is English (`en`)
**And** the language setting is read from the settings store

**Given** a component uses the `useTranslation` hook
**When** rendering translated text
**Then** the correct translation key is resolved
**And** missing keys fall back to the key name (for development visibility)

**Given** the locale files exist
**When** examining their structure
**Then** they contain at minimum:
```json
{
  "app": {
    "title": "InfraBooth Downloader"
  }
}
```

---

## Epic 2: SoundCloud Authentication

User can securely sign in with SoundCloud and see their identity + Go+ quality badge.

### Story 2.1: Register Deep Link Protocol Handler

**As a** developer,
**I want** Tauri configured to handle the `sc-downloader://` custom protocol,
**So that** OAuth redirects can return to the app after browser authorization.

**Acceptance Criteria:**

**Given** the Tauri project from Epic 1
**When** the deep link plugin is configured
**Then** `tauri.conf.json` registers `sc-downloader` as a custom protocol
**And** the app can receive URLs matching `sc-downloader://auth/callback*`

**Given** the protocol handler is registered
**When** a URL like `sc-downloader://auth/callback?code=abc123` is opened
**Then** the app receives the URL and can extract query parameters
**And** if the app is not running, it launches and receives the URL

**Given** the protocol is registered on macOS
**When** checking the app bundle
**Then** the `Info.plist` includes the URL scheme registration

**Given** the protocol is registered on Windows
**When** the app is installed
**Then** the registry entries for the protocol are created

---

### Story 2.2: Implement OAuth 2.1 Flow with PKCE

**As a** user,
**I want** secure authentication with SoundCloud,
**So that** my credentials are never exposed to the app directly.

**Acceptance Criteria:**

**Given** the deep link handler from Story 2.1
**When** the OAuth flow is initiated
**Then** a PKCE code verifier (random string) is generated
**And** a code challenge is derived using SHA-256
**And** both are stored temporarily in memory

**Given** PKCE parameters are generated
**When** constructing the authorization URL
**Then** the URL includes:
- `client_id`: `4CHDCUOhHIdSxBv4XN0msyZXuIXbB5wv`
- `redirect_uri`: `sc-downloader://auth/callback`
- `response_type`: `code`
- `code_challenge`: the generated challenge
- `code_challenge_method`: `S256`

**Given** the user authorizes in the browser
**When** the callback URL is received with an authorization code
**Then** a token exchange request is made to SoundCloud's token endpoint
**And** the request includes the code verifier for PKCE validation
**And** the Client Secret is read from secure configuration (API-7)

**Given** the token exchange succeeds
**When** tokens are received
**Then** both access_token and refresh_token are captured
**And** the token expiry time is recorded
**And** an auth success event is emitted to the frontend

**Given** the token exchange fails
**When** an error response is received
**Then** a user-friendly error message is returned
**And** the PKCE state is cleared

---

### Story 2.3: Create Sign-In UI Component

**As a** user,
**I want** a clear "Sign in with SoundCloud" button,
**So that** I can authenticate to access my Go+ subscription benefits.

**Acceptance Criteria:**

**Given** the app is launched and user is not authenticated
**When** viewing the main interface
**Then** a "Sign in with SoundCloud" button is prominently displayed
**And** the button uses the primary button style (solid indigo per UX spec)

**Given** the sign-in button is displayed
**When** the user clicks it
**Then** "Opening browser..." feedback is shown immediately
**And** the system default browser opens to SoundCloud's authorization page
**And** the button enters a loading state

**Given** the browser opens
**When** the user views the authorization page
**Then** they see the real SoundCloud domain (trust signal)
**And** they can authorize or cancel

**Given** the user cancels authorization
**When** returning to the app
**Then** the sign-in button returns to its default state
**And** no error message is shown (user-initiated cancel)

---

### Story 2.4: Display Authenticated User Identity

**As a** user,
**I want** to see my SoundCloud username displayed after signing in,
**So that** I know authentication succeeded and which account I'm using.

**Acceptance Criteria:**

**Given** the OAuth flow completes successfully
**When** the app receives valid tokens
**Then** a request is made to fetch the user's profile
**And** the username is extracted from the response

**Given** the username is fetched
**When** the UI updates
**Then** "Signed in as [username]" is displayed in the header (FR2)
**And** a "Go+ 256kbps" quality badge is shown alongside (UX-9)
**And** the sign-in button is replaced with the user identity display

**Given** the user identity is displayed
**When** viewing the header
**Then** the username and badge meet WCAG AA contrast requirements
**And** the display includes a subtle user icon or avatar placeholder

**Given** authentication completes
**When** screen readers announce the change
**Then** "Signed in as [username], Go+ quality enabled" is announced (UX-13)

---

### Story 2.5: Implement Token Persistence & Refresh

**As a** user,
**I want** to stay signed in across app sessions,
**So that** I don't have to re-authenticate every time I open the app.

**Acceptance Criteria:**

**Given** valid tokens are received from OAuth
**When** storing tokens
**Then** tokens are encrypted using a machine-bound key (NFR4)
**And** tokens are stored in a secure location (OS keychain or encrypted file)
**And** no credentials are stored in plaintext (NFR5)

**Given** the app launches
**When** checking for existing tokens
**Then** encrypted tokens are loaded if they exist
**And** the auth store is populated with the decrypted values
**And** the user appears signed in without re-authenticating (FR3)

**Given** tokens are loaded on app launch
**When** the access token is expired or near expiry
**Then** a token refresh request is made automatically
**And** the new access token replaces the old one
**And** the new refresh token is stored (refresh tokens are single-use)

**Given** a token refresh fails
**When** the refresh token is invalid or expired
**Then** the user is signed out gracefully
**And** a message indicates re-authentication is needed

**Given** the app terminates unexpectedly
**When** relaunching
**Then** token state persists and is recoverable (NFR10)

---

### Story 2.6: Implement Sign-Out Functionality

**As a** user,
**I want** to sign out of my SoundCloud account,
**So that** I can switch accounts or revoke the app's access.

**Acceptance Criteria:**

**Given** the user is signed in
**When** viewing the user identity display
**Then** a sign-out option is accessible (dropdown, button, or menu item)

**Given** the user initiates sign-out
**When** the action is confirmed
**Then** stored tokens are securely deleted
**And** the auth store is reset to unauthenticated state
**And** the UI updates to show the sign-in button again (FR4)

**Given** sign-out completes
**When** the UI updates
**Then** the transition is smooth (no flash or jarring change)
**And** the URL input field remains visible but indicates sign-in is needed

**Given** sign-out completes
**When** the user signs in again
**Then** they can authenticate with a different account if desired

---

## Epic 3: URL Validation & Playlist Preview

User can paste a SoundCloud URL and instantly see a preview of what they'll download.

### Story 3.1: Create URL Input Component

**As a** user,
**I want** a prominent input field to paste SoundCloud URLs,
**So that** I can easily start downloading my playlists or tracks.

**Acceptance Criteria:**

**Given** the user is signed in
**When** viewing the main interface
**Then** a URL input field is prominently displayed below the header
**And** the input has placeholder text: "Paste a SoundCloud playlist or track URL"
**And** the input uses the full available width (flex layout)

**Given** the URL input is displayed
**When** the user focuses the field
**Then** a visible focus ring appears (UX-11)
**And** the focus state is clear and accessible

**Given** the URL input exists
**When** the user pastes content
**Then** the paste event is captured immediately
**And** validation is triggered automatically (no manual "submit" needed)

**Given** the input field
**When** navigating with keyboard
**Then** Tab moves focus to/from the input correctly
**And** the input supports standard text editing shortcuts (Ctrl+V, Cmd+V)

---

### Story 3.2: Implement URL Validation Logic

**As a** developer,
**I want** backend URL validation for SoundCloud URLs,
**So that** only valid track and playlist URLs are accepted.

**Acceptance Criteria:**

**Given** a URL is pasted
**When** the validation command is invoked
**Then** the URL is checked against SoundCloud URL patterns
**And** validation completes within 500ms (UX-1)

**Given** a valid playlist URL (e.g., `soundcloud.com/user/sets/playlist-name`)
**When** validated
**Then** the URL is recognized as type "playlist"
**And** a success response is returned with the URL type

**Given** a valid track URL (e.g., `soundcloud.com/user/track-name`)
**When** validated
**Then** the URL is recognized as type "track"
**And** a success response is returned with the URL type

**Given** a SoundCloud profile URL (e.g., `soundcloud.com/user`)
**When** validated
**Then** validation fails with error: "This is a profile, not a playlist or track"
**And** a hint is included: "Try pasting a playlist or track link"

**Given** a non-SoundCloud URL
**When** validated
**Then** validation fails with error: "Not a SoundCloud URL"
**And** a hint is included: "Paste a link from soundcloud.com"

**Given** malformed or empty input
**When** validated
**Then** validation fails with error: "Invalid URL format"

---

### Story 3.3: Display Validation Feedback

**As a** user,
**I want** instant feedback when I paste a URL,
**So that** I know immediately if the URL is valid.

**Acceptance Criteria:**

**Given** a URL is pasted
**When** validation is in progress
**Then** a subtle loading indicator appears (spinner or pulse)
**And** the input border indicates processing state

**Given** validation succeeds
**When** the result is received
**Then** the input border briefly shows green (success)
**And** the loading indicator is replaced with a checkmark
**And** the feedback appears within 500ms of paste (UX-1)

**Given** validation fails
**When** the error is received
**Then** the input border shows red (error)
**And** an error message appears below the input (inline, not modal)
**And** the error includes the specific reason (FR15)
**And** a hint for recovery is shown

**Given** an error is displayed
**When** the user clears the input or pastes a new URL
**Then** the error message clears immediately
**And** the input returns to neutral state

**Given** validation feedback is shown
**When** using a screen reader
**Then** the validation result is announced (UX-13)

---

### Story 3.4: Fetch and Display Playlist Preview

**As a** user,
**I want** to see a preview of the playlist I'm about to download,
**So that** I can confirm it's the right content before starting.

**Acceptance Criteria:**

**Given** a valid playlist URL is detected
**When** validation succeeds
**Then** a request is made to fetch playlist metadata
**And** the request uses the authenticated user's token

**Given** playlist metadata is fetched
**When** the response is received
**Then** a preview card appears below the URL input showing:
- Playlist thumbnail (64×64 per UX spec)
- Playlist title
- Track count (e.g., "47 tracks")
- Creator name

**Given** the preview is displayed
**When** viewing the card
**Then** a "Download" button is prominently shown
**And** the button uses primary style (solid indigo)
**And** the preview indicates quality: "256kbps AAC → MP3"

**Given** the playlist has tracks (FR7)
**When** the metadata is processed
**Then** the track list is extracted and stored in the queue store
**And** the track count accurately reflects extractable tracks

**Given** the preview is displayed
**When** the user pastes a different URL
**Then** the preview clears and validation restarts
**And** the old preview is replaced with new results

---

### Story 3.5: Handle Single Track URLs

**As a** user,
**I want** to download individual tracks, not just playlists,
**So that** I can grab specific songs I want.

**Acceptance Criteria:**

**Given** a valid single track URL is detected (FR6)
**When** validation succeeds
**Then** a request is made to fetch track metadata

**Given** track metadata is fetched
**When** the response is received
**Then** a preview card appears showing:
- Track artwork (64×64)
- Track title
- Artist name
- Duration
- "1 track" indicator

**Given** a single track preview is displayed
**When** viewing the card
**Then** the same "Download" button appears
**And** the flow is identical to playlist downloads
**And** quality indicator shows "256kbps AAC → MP3"

**Given** a track is unavailable or geo-blocked
**When** fetching metadata
**Then** an appropriate error is shown immediately
**And** the user understands why before attempting download

---

## Epic 4: Download & Media Processing Engine

User can download tracks at full quality, converted to MP3 with embedded metadata.

### Story 4.1: Configure yt-dlp Sidecar Binary

**As a** developer,
**I want** yt-dlp bundled as a Tauri sidecar binary,
**So that** the app can extract audio from SoundCloud without external dependencies.

**Acceptance Criteria:**

**Given** the Tauri project
**When** configuring sidecar binaries
**Then** yt-dlp binaries are placed in `/src-tauri/binaries/` with platform suffixes:
- `yt-dlp-x86_64-pc-windows-msvc.exe`
- `yt-dlp-aarch64-apple-darwin`
- `yt-dlp-x86_64-apple-darwin`

**Given** sidecar binaries are configured
**When** examining `tauri.conf.json`
**Then** the sidecar configuration references yt-dlp
**And** the correct binary is selected based on target platform

**Given** yt-dlp is bundled (NFR11)
**When** verifying the binary
**Then** the version is pinned (documented in project)
**And** a checksum verification can be performed
**And** the binary is not downloaded at runtime

**Given** the sidecar is configured
**When** invoking yt-dlp from Rust
**Then** the `Command::new_sidecar("yt-dlp")` API works
**And** the binary executes with provided arguments
**And** stdout/stderr are capturable

---

### Story 4.2: Configure FFmpeg Sidecar Binary

**As a** developer,
**I want** FFmpeg bundled as a Tauri sidecar binary,
**So that** the app can convert audio formats without external dependencies.

**Acceptance Criteria:**

**Given** the Tauri project
**When** configuring sidecar binaries
**Then** FFmpeg binaries are placed in `/src-tauri/binaries/` with platform suffixes:
- `ffmpeg-x86_64-pc-windows-msvc.exe`
- `ffmpeg-aarch64-apple-darwin`
- `ffmpeg-x86_64-apple-darwin`

**Given** sidecar binaries are configured
**When** examining `tauri.conf.json`
**Then** the sidecar configuration references ffmpeg
**And** the correct binary is selected based on target platform

**Given** FFmpeg is bundled (NFR12)
**When** verifying the binary
**Then** the version is pinned (documented in project)
**And** a checksum verification can be performed
**And** the binary is not downloaded at runtime

**Given** the sidecar is configured
**When** invoking FFmpeg from Rust
**Then** the `Command::new_sidecar("ffmpeg")` API works
**And** the binary executes with provided arguments
**And** conversion operations complete successfully

---

### Story 4.3: Implement Track Download Command

**As a** user,
**I want** tracks downloaded at the highest quality my subscription allows,
**So that** I get the full value of my Go+ subscription.

**Acceptance Criteria:**

**Given** yt-dlp is configured from Story 4.1
**When** a download command is invoked for a track
**Then** yt-dlp is called with the track URL
**And** authentication cookies/tokens are passed to yt-dlp
**And** the best available audio quality is requested (FR8: 256kbps AAC for Go+)

**Given** yt-dlp downloads a track
**When** the download completes
**Then** the audio file is saved to a temporary location
**And** the original format is preserved (typically AAC)
**And** the file path is returned for further processing

**Given** a download is in progress
**When** yt-dlp outputs progress information
**Then** the progress is parsed from stdout
**And** progress events are emitted to the frontend (ARCH-8)

**Given** a download fails
**When** yt-dlp returns an error
**Then** the error is captured and categorized
**And** a structured error is returned (ARCH-9)
**And** the failure does not crash the application

---

### Story 4.4: Implement MP3 Conversion Pipeline

**As a** user,
**I want** my downloaded tracks converted to MP3,
**So that** they're compatible with all my devices and players.

**Acceptance Criteria:**

**Given** FFmpeg is configured from Story 4.2
**When** an AAC file needs conversion (FR9)
**Then** FFmpeg is invoked with appropriate arguments
**And** the output format is MP3
**And** quality is preserved (high bitrate encoding)

**Given** FFmpeg converts a file
**When** the conversion completes
**Then** the MP3 file is created in the output location
**And** the temporary AAC file is cleaned up
**And** the conversion maintains audio quality

**Given** conversion is in progress
**When** FFmpeg outputs progress
**Then** progress can be parsed (if needed for long files)
**And** the UI can indicate conversion status

**Given** conversion fails
**When** FFmpeg returns an error
**Then** the error is logged with details
**And** the original file is preserved if possible
**And** a user-friendly error is returned

---

### Story 4.5: Implement Metadata Embedding

**As a** user,
**I want** downloaded files to have proper metadata,
**So that** my music library shows correct artist, title, and artwork.

**Acceptance Criteria:**

**Given** a track has been converted to MP3
**When** metadata embedding is triggered (FR10)
**Then** ID3 tags are written to the file including:
- Title (track name)
- Artist (creator name)
- Album (playlist name, if from playlist)
- Track number (position in playlist, if applicable)

**Given** the track has artwork available
**When** embedding metadata
**Then** the artwork is downloaded (if URL provided)
**And** the artwork is embedded as album art in the MP3
**And** artwork is resized if needed (reasonable file size)

**Given** metadata embedding completes
**When** opening the file in a music player
**Then** all metadata fields display correctly
**And** artwork appears as album cover

**Given** metadata is unavailable or partial
**When** embedding
**Then** available fields are written
**And** missing fields are left empty (not error state)
**And** the file is still valid and playable

---

### Story 4.6: Implement Download Queue Processing

**As a** user,
**I want** all tracks in my playlist to download automatically,
**So that** I can start the download and walk away.

**Acceptance Criteria:**

**Given** a playlist with multiple tracks
**When** the user clicks "Download"
**Then** all tracks are added to the download queue
**And** processing begins with the first track
**And** tracks are processed sequentially (one at a time)

**Given** a track completes successfully
**When** moving to the next track
**Then** the next track begins downloading immediately
**And** the queue index advances
**And** progress is tracked per-track and overall

**Given** a track fails (FR19)
**When** processing the queue
**Then** the failure is recorded for that track
**And** the queue continues to the next track
**And** successfully downloaded files are not affected (NFR9)

**Given** the queue is processing
**When** a rate limit is encountered (API-5)
**Then** the queue pauses with backoff
**And** processing resumes when the limit clears
**And** the current track retries (not skipped)

**Given** all tracks are processed
**When** the queue completes
**Then** a completion event is emitted
**And** the queue state shows final status for all tracks

---

## Epic 5: Progress & Real-time Status

User can watch downloads progress with per-track status and overall completion.

### Story 5.1: Create Track List Component

**As a** user,
**I want** to see all tracks in my download queue,
**So that** I know exactly what's being downloaded.

**Acceptance Criteria:**

**Given** a playlist has been validated and Download clicked
**When** the progress section appears
**Then** a stacked list of track cards is displayed (UX-8)
**And** each card shows: artwork placeholder (48×48), title, artist
**And** the list is scrollable if tracks exceed visible area

**Given** the track list is displayed
**When** viewing the layout
**Then** the list follows the Transmit-inspired design
**And** cards are visually distinct with consistent spacing
**And** the currently downloading track is highlighted

**Given** the window is resized
**When** the height changes
**Then** more or fewer tracks are visible accordingly
**And** the list remains scrollable
**And** no horizontal scrollbar appears

**Given** a single track download (not playlist)
**When** the progress section appears
**Then** a single track card is displayed
**And** the layout remains consistent

---

### Story 5.2: Implement Per-Track Status Display

**As a** user,
**I want** to see the status of each track individually,
**So that** I know which tracks are done and which are still processing.

**Acceptance Criteria:**

**Given** a track is in the queue
**When** it hasn't started downloading yet
**Then** status shows "Pending" with a neutral icon
**And** the card has default styling (no highlight)

**Given** a track is currently downloading (FR12)
**When** viewing its card
**Then** status shows "Downloading..." with a spinner icon
**And** the card has highlighted background (current track indicator)
**And** the icon uses the loading color (#6366F1)

**Given** a track completes successfully (FR13)
**When** viewing its card
**Then** status shows a green checkmark icon
**And** the status text changes to "Complete"
**And** the success color is #10B981

**Given** a track fails
**When** viewing its card
**Then** status shows a warning/error icon
**And** brief failure reason is visible (e.g., "Geo-blocked")
**And** the warning color is #F59E0B or error #F43F5E

**Given** status icons are displayed
**When** checking accessibility
**Then** status is conveyed via icon + text, not color alone (UX-14)
**And** screen readers announce status changes

---

### Story 5.3: Implement Overall Progress Bar

**As a** user,
**I want** to see overall download progress,
**So that** I know how much of my playlist is complete.

**Acceptance Criteria:**

**Given** a download is in progress (FR11)
**When** viewing the progress section
**Then** an overall progress bar is displayed above the track list
**And** a counter shows "X of Y tracks" (e.g., "12 of 47 tracks")

**Given** tracks complete
**When** the counter updates
**Then** the "X" value increments in real-time
**And** the progress bar fills proportionally
**And** updates appear within 500ms of status change (NFR3)

**Given** some tracks fail
**When** viewing the counter
**Then** completed tracks are counted (not failed)
**And** the final state shows accurate completion (e.g., "45 of 47 tracks")

**Given** the progress bar is displayed
**When** checking accessibility
**Then** the progress has an aria-label describing completion
**And** screen readers can announce progress updates

---

### Story 5.4: Display Rate Limit Status

**As a** user,
**I want** to understand why downloads pause sometimes,
**So that** I don't think the app is broken.

**Acceptance Criteria:**

**Given** the download queue encounters a rate limit (FR14)
**When** the pause begins
**Then** an inline banner appears: "Brief pause — SoundCloud rate limit (this is normal)" (UX-3)
**And** the banner uses warning color (#F59E0B) with amber background
**And** the current track shows "Waiting..." status

**Given** the rate limit banner is displayed
**When** the user views it
**Then** the message frames the pause as expected behavior
**And** no alarm or panic-inducing language is used
**And** optional: a small timer or "resuming soon" indicator

**Given** the rate limit clears
**When** downloads resume
**Then** the banner auto-dismisses
**And** the track status returns to "Downloading..."
**And** the transition is smooth (no jarring UI change)

**Given** multiple rate limits occur
**When** pauses happen repeatedly
**Then** the banner reappears each time
**And** the messaging remains consistent and calm

---

### Story 5.5: Subscribe to Backend Progress Events

**As a** developer,
**I want** React components to receive real-time progress updates,
**So that** the UI reflects backend state accurately.

**Acceptance Criteria:**

**Given** the Tauri event system from Epic 4
**When** a custom hook `useDownloadProgress` is created
**Then** it subscribes to `download-progress` events from Rust
**And** it returns current queue state to consuming components

**Given** the hook is mounted
**When** progress events are emitted from backend
**Then** the hook updates the queue store with new status
**And** connected components re-render with fresh data
**And** updates are processed within 500ms (NFR3)

**Given** the event payload structure
**When** an event is received
**Then** it includes: track_id, status, percent (if applicable), error (if failed)
**And** the payload matches TypeScript types in `/src/types/events.ts`

**Given** the component unmounts
**When** the hook cleans up
**Then** the event listener is properly unsubscribed
**And** no memory leaks occur

**Given** multiple events arrive rapidly
**When** processing updates
**Then** the UI remains responsive (NFR2: <100ms input response)
**And** state updates are batched appropriately

---

## Epic 6: File Management & Completion

User can choose where files go and immediately access them when done.

### Story 6.1: Implement Folder Selection Dialog

**As a** user,
**I want** to choose where my downloaded files are saved,
**So that** I can organize my music library my way.

**Acceptance Criteria:**

**Given** the user wants to change download location (FR20)
**When** they access the folder selection option
**Then** a native OS file dialog opens (Tauri dialog API)
**And** the dialog is a folder picker (not file picker)
**And** the dialog starts at the current download path

**Given** the folder dialog is open
**When** the user selects a folder
**Then** the selected path is captured
**And** the settings store is updated with the new path
**And** the dialog closes and returns to the app

**Given** the folder dialog is open
**When** the user cancels
**Then** the previous download path is retained
**And** no error is shown (user-initiated cancel)

**Given** a folder is selected
**When** checking write permissions
**Then** the app verifies it can write to the location
**And** if not writable, an error message is shown
**And** the user is prompted to select a different folder

---

### Story 6.2: Persist Download Path Preference

**As a** user,
**I want** the app to remember my download folder,
**So that** I don't have to set it every time.

**Acceptance Criteria:**

**Given** the user has selected a download folder
**When** the app closes
**Then** the download path is persisted to settings storage

**Given** the app launches
**When** loading settings
**Then** the previously saved download path is restored
**And** the settings store reflects the saved path

**Given** no download path has been set
**When** the app launches for the first time
**Then** the default is the system Downloads folder
**And** this default is used until the user changes it

**Given** a saved path no longer exists (e.g., external drive removed)
**When** attempting to use it
**Then** the app detects the invalid path
**And** prompts the user to select a new location
**And** does not crash or fail silently

---

### Story 6.3: Generate Filenames from Metadata

**As a** user,
**I want** my downloaded files to have proper filenames,
**So that** I can identify songs without opening them.

**Acceptance Criteria:**

**Given** a track has been downloaded and converted (FR22)
**When** saving the final file
**Then** the filename format is: `Artist - Title.mp3`
**And** the file is saved to the user's chosen download path (FR21)

**Given** track metadata includes special characters
**When** generating the filename
**Then** invalid filesystem characters are sanitized (e.g., `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`)
**And** the filename remains readable and meaningful

**Given** a file with the same name already exists
**When** saving the new file
**Then** a number suffix is added: `Artist - Title (2).mp3`
**And** existing files are not overwritten

**Given** the artist or title is missing
**When** generating the filename
**Then** fallback to track ID or URL slug
**And** the file is still saved with a valid name

**Given** a playlist download
**When** generating filenames
**Then** optionally prefix with track number: `01 - Artist - Title.mp3`
**And** numbering preserves playlist order

---

### Story 6.4: Display Completion Panel

**As a** user,
**I want** to know when my download is complete and access my files immediately,
**So that** I can enjoy my music right away.

**Acceptance Criteria:**

**Given** all tracks in the queue have been processed
**When** the queue completes
**Then** a completion panel appears prominently
**And** the panel shows success message (e.g., "Download complete!")

**Given** all tracks succeeded
**When** viewing the completion panel
**Then** it shows "47/47 tracks downloaded" (full success)
**And** the message conveys satisfaction/accomplishment

**Given** some tracks failed (UX-5)
**When** viewing the completion panel
**Then** it shows "45/47 tracks downloaded" (partial success)
**And** the message frames this as success with context, not failure
**And** a link/button to view failed tracks is available

**Given** the completion panel is displayed (UX-4)
**When** viewing available actions
**Then** an "Open Folder" button is prominently shown
**And** the button uses secondary style (outline)
**And** optionally: "Download Another" button to reset UI

**Given** the user clicks "Open Folder"
**When** the action is triggered
**Then** the system file browser opens to the download location
**And** the downloaded files are visible
**And** the app remains open in the background

**Given** completion is announced
**When** using a screen reader (UX-13)
**Then** "Download complete, X of Y tracks" is announced
**And** available actions are discoverable via keyboard

---

## Epic 7: Error Handling & Transparency

User understands exactly what failed and why, with clear recovery paths.

### Story 7.1: Display Geo-Block Error Messages

**As a** user,
**I want** to understand when a track is blocked in my region,
**So that** I know it's a SoundCloud restriction, not an app problem.

**Acceptance Criteria:**

**Given** a track fails due to geographic restrictions (FR16)
**When** the failure is detected
**Then** the track card shows a warning icon (not error icon)
**And** the status text shows "Unavailable in your region"

**Given** a geo-blocked track is displayed
**When** viewing the failure reason
**Then** the message blames the restriction, not the app
**And** the tone is informative, not alarming
**And** example: "This track isn't available in your country"

**Given** the user hovers or clicks the failed track
**When** viewing additional details
**Then** a tooltip or expandable section shows:
- "Geographic restriction by rights holder"
- The track will not retry automatically

**Given** geo-block errors occur
**When** the download continues
**Then** subsequent tracks still download normally (FR19)
**And** the geo-blocked track is marked and skipped

---

### Story 7.2: Display Unavailable Track Messages

**As a** user,
**I want** to understand when a track no longer exists,
**So that** I know why it couldn't be downloaded.

**Acceptance Criteria:**

**Given** a track fails because it was deleted or made private (FR17)
**When** the failure is detected
**Then** the track card shows a warning icon
**And** the status text shows "Track unavailable"

**Given** an unavailable track is displayed
**When** viewing the failure reason
**Then** the message explains possible causes:
- "This track may have been removed or made private"
**And** the tone is factual, not apologetic

**Given** the track URL was valid at paste time
**When** it becomes unavailable during download
**Then** the error is handled gracefully
**And** no crash or hang occurs
**And** the queue continues processing

**Given** multiple unavailable tracks
**When** viewing the track list
**Then** each failed track shows its specific reason
**And** reasons are consistent in format and tone

---

### Story 7.3: Create Error Panel Component

**As a** user,
**I want** to review all failed tracks in one place,
**So that** I can understand what didn't download and why.

**Acceptance Criteria:**

**Given** one or more tracks failed during download (FR18)
**When** the download completes
**Then** an "X tracks failed" indicator is visible
**And** the indicator is clickable/expandable

**Given** the user expands the error panel
**When** viewing the contents
**Then** a list of all failed tracks is shown
**And** each entry shows: track title, artist, failure reason

**Given** the error panel is displayed
**When** viewing individual failures
**Then** failures are grouped or sorted by reason type
**And** the panel is scrollable if many failures exist

**Given** the error panel exists
**When** checking accessibility
**Then** the panel is keyboard navigable
**And** screen readers can traverse the failure list
**And** each failure reason is announced

**Given** no tracks failed
**When** download completes
**Then** no error panel or indicator is shown
**And** only the success completion panel appears

**Given** the error panel is expanded
**When** the user wants to dismiss it
**Then** a close button or collapse action is available
**And** the panel can be reopened if needed

---

## Epic 8: Settings & Localization

User can customize the app and use it in English or French.

### Story 8.1: Create Settings Panel UI

**As a** user,
**I want** to access app settings easily,
**So that** I can customize my experience.

**Acceptance Criteria:**

**Given** the user is in the app (FR26)
**When** they want to access settings
**Then** a settings icon/button is visible in the header
**And** clicking it opens a settings panel or modal

**Given** the settings panel is open
**When** viewing the contents
**Then** settings are organized into logical sections:
- Language
- Download location
- (Future: other preferences)

**Given** the settings panel is displayed
**When** viewing the layout
**Then** each setting has a clear label
**And** current values are visible
**And** the panel follows the app's design system (Shadcn/ui)

**Given** the settings panel is open
**When** navigating with keyboard (UX-12)
**Then** Tab moves between settings controls
**And** Escape closes the panel
**And** focus is trapped within the panel while open

**Given** settings are changed
**When** closing the panel
**Then** changes are saved automatically (no explicit "Save" button needed)
**And** the panel closes smoothly

---

### Story 8.2: Implement Language Selector

**As a** user,
**I want** to switch the app language,
**So that** I can use the app in my preferred language.

**Acceptance Criteria:**

**Given** the settings panel is open (FR30)
**When** viewing the Language section
**Then** a dropdown/select shows current language
**And** available options are: English, Français

**Given** the language dropdown is displayed
**When** selecting a different language
**Then** the UI updates immediately to the new language
**And** all visible text switches to the selected language
**And** no page reload is required

**Given** English is selected (FR28)
**When** viewing the UI
**Then** all interface text is in English
**And** date/number formats follow English conventions

**Given** French is selected (FR29)
**When** viewing the UI
**Then** all interface text is in French
**And** date/number formats follow French conventions

**Given** the language changes
**When** using a screen reader
**Then** the language change is announced
**And** the document lang attribute updates

---

### Story 8.3: Create English Translation File

**As a** developer,
**I want** a complete English translation file,
**So that** all UI strings are externalized and translatable.

**Acceptance Criteria:**

**Given** the i18n framework from Epic 1
**When** populating `/src/locales/en.json`
**Then** all UI strings are included with semantic keys

**Given** the English translation file
**When** examining its structure
**Then** keys are organized by feature/section:
```json
{
  "app": { "title": "InfraBooth Downloader" },
  "auth": { "signIn": "Sign in with SoundCloud", "signOut": "Sign out", ... },
  "download": { "button": "Download", "progress": "{{current}} of {{total}} tracks", ... },
  "errors": { "geoBlocked": "Unavailable in your region", ... },
  "settings": { "title": "Settings", "language": "Language", ... }
}
```

**Given** dynamic values are needed
**When** using interpolation
**Then** placeholders use i18next syntax: `{{variable}}`
**And** pluralization is handled where needed

**Given** all components use translations
**When** no hardcoded strings exist
**Then** every user-visible string comes from the translation file
**And** developer-only strings (console logs) may remain in English

---

### Story 8.4: Create French Translation File

**As a** French-speaking user,
**I want** the app fully translated to French,
**So that** I can use it comfortably in my native language.

**Acceptance Criteria:**

**Given** the English translation file exists
**When** creating `/src/locales/fr.json`
**Then** all keys from en.json are present in fr.json
**And** all values are properly translated to French

**Given** the French translation
**When** reviewing the translations
**Then** translations are natural French (not literal)
**And** technical terms use appropriate French equivalents
**And** tone matches the English version

**Given** the French translation file
**When** examining specific translations
**Then** key examples include:
- "Sign in with SoundCloud" → "Se connecter avec SoundCloud"
- "Download" → "Télécharger"
- "{{current}} of {{total}} tracks" → "{{current}} sur {{total}} pistes"
- "Settings" → "Paramètres"

**Given** pluralization rules differ
**When** French requires different plural forms
**Then** i18next plural syntax is used correctly
**And** French grammar rules are respected

---

### Story 8.5: Persist Language Preference

**As a** user,
**I want** the app to remember my language choice,
**So that** it opens in my preferred language every time.

**Acceptance Criteria:**

**Given** the user selects a language
**When** the selection is made
**Then** the preference is saved to the settings store
**And** the preference is persisted to disk

**Given** the app launches
**When** loading preferences
**Then** the saved language preference is restored
**And** i18next is initialized with the saved language
**And** the UI renders in the correct language from the start

**Given** no language preference is saved
**When** launching for the first time
**Then** the default language is English
**And** the user can change it in settings

**Given** the app launches with a saved language
**When** the UI appears
**Then** there is no flash of wrong language
**And** the correct language is shown immediately (NFR1 compliance)

---

## Epic 9: Application Updates & Distribution

User knows when updates exist and can choose to update (or not).

### Story 9.1: Set Up GitHub Actions CI Workflow

**As a** developer,
**I want** automated CI checks on every push,
**So that** code quality is maintained and regressions are caught early.

**Acceptance Criteria:**

**Given** the GitHub repository (ARCH-10)
**When** code is pushed to any branch
**Then** a CI workflow runs automatically

**Given** the CI workflow runs
**When** examining the steps
**Then** the following checks execute:
- Install dependencies (npm ci)
- TypeScript type checking (tsc --noEmit)
- Linting (ESLint)
- Rust formatting check (cargo fmt --check)
- Rust linting (cargo clippy)

**Given** all checks pass
**When** viewing the workflow result
**Then** the workflow shows green/success status

**Given** any check fails
**When** viewing the workflow result
**Then** the workflow shows red/failure status
**And** the specific failing step is identifiable
**And** error details are visible in logs

**Given** the workflow file
**When** examining `.github/workflows/ci.yml`
**Then** the workflow is clearly structured
**And** caching is used for faster runs (node_modules, cargo)

---

### Story 9.2: Set Up Release Build Workflow

**As a** developer,
**I want** automated cross-platform builds on release,
**So that** distributable binaries are created consistently.

**Acceptance Criteria:**

**Given** a GitHub release is created or tag is pushed (ARCH-11)
**When** the release workflow triggers
**Then** builds run for both Windows and macOS

**Given** the Windows build runs (ARCH-12)
**When** the build completes
**Then** an MSI installer is produced
**And** the installer is named with version (e.g., `infrabooth-downloader_1.0.0_x64.msi`)

**Given** the macOS build runs (ARCH-12)
**When** the build completes
**Then** a DMG disk image is produced
**And** builds are created for both Intel (x64) and Apple Silicon (arm64)
**And** the DMG is named with version and architecture

**Given** builds complete successfully
**When** examining the release
**Then** all artifacts are attached to the GitHub Release
**And** checksums are generated for verification

**Given** the workflow uses tauri-action
**When** examining `.github/workflows/release.yml`
**Then** the official `tauri-apps/tauri-action` is used
**And** sidecar binaries (yt-dlp, FFmpeg) are included in builds

---

### Story 9.3: Configure Tauri Updater Integration

**As a** developer,
**I want** Tauri's updater to work with GitHub Releases,
**So that** users can receive updates automatically.

**Acceptance Criteria:**

**Given** the release workflow completes (ARCH-13)
**When** artifacts are published
**Then** an update manifest JSON is auto-generated
**And** the manifest includes version, notes, and download URLs

**Given** `tauri.conf.json` is configured
**When** examining the updater section
**Then** the updater endpoint points to GitHub Releases
**And** the pubkey for signature verification is configured

**Given** the updater is configured
**When** a new release is published
**Then** the manifest is accessible at the configured endpoint
**And** the app can fetch and parse the manifest

**Given** release artifacts are signed
**When** the updater downloads an update
**Then** signature verification passes
**And** tampered updates are rejected

---

### Story 9.4: Implement Update Check on Launch

**As a** user,
**I want** the app to check for updates when I open it,
**So that** I know when new versions are available.

**Acceptance Criteria:**

**Given** the app launches (FR23)
**When** initialization completes
**Then** an update check is triggered in the background
**And** the check does not block app usage
**And** the UI is interactive during the check

**Given** an update check runs
**When** the manifest is fetched
**Then** the current version is compared to the latest
**And** if newer version exists, update info is captured

**Given** the update check succeeds with no update
**When** the check completes
**Then** no notification is shown
**And** the app continues normally

**Given** the update check fails (network error)
**When** the check times out
**Then** no error is shown to the user
**And** the app continues normally
**And** the failure is logged for debugging

**Given** the app has no internet
**When** attempting update check
**Then** the check fails silently
**And** the app remains fully functional (FR27)

---

### Story 9.5: Display Update Available Banner

**As a** user,
**I want** to know when updates are available without being forced to update,
**So that** I can choose when to update on my own terms.

**Acceptance Criteria:**

**Given** an update is available (FR24)
**When** the update check completes
**Then** a non-blocking banner appears at the top of the app
**And** the banner shows: "Update available: v1.2.0"
**And** the banner does not interrupt current activity

**Given** the update banner is displayed
**When** viewing the banner
**Then** it includes a brief description or "What's new" link
**And** a "Download" or "Learn more" button is available
**And** the banner uses info styling (not alarming)

**Given** the user clicks the update action
**When** they want to update
**Then** the browser opens to the GitHub Releases page
**Or** the in-app updater begins the download (if implemented)

**Given** the user wants to dismiss the banner (FR25)
**When** they click the dismiss/close button
**Then** the banner disappears
**And** the app continues normally
**And** the user is not re-prompted during this session

**Given** the user dismissed an update
**When** launching the app again later
**Then** the update banner may reappear (gentle reminder)
**And** the user can dismiss again without penalty

**Given** the update banner appears
**When** checking accessibility
**Then** the banner is announced by screen readers
**And** dismiss action is keyboard accessible
