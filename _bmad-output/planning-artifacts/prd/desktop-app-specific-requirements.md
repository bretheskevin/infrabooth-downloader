# Desktop App Specific Requirements

## Platform Support

| Platform | Version | Status |
|----------|---------|--------|
| Windows | 10+ | Supported |
| macOS | 11+ (Big Sur) | Supported |
| Linux | — | Not supported |

**Packaging:**
- Windows: MSI installer
- macOS: DMG with drag-to-Applications

## System Integration

| Integration | Implementation |
|-------------|----------------|
| OAuth | Browser popup (system default browser) |
| File picker | Native OS dialog |
| Bundled binaries | yt-dlp, FFmpeg in app resources |
| System tray | None |
| Startup on boot | None |
| File associations | None |

**Design principle:** Zero system footprint beyond the app itself. No background processes, no registry pollution, no login items.

## Update Strategy

- **Check frequency:** On app launch
- **Notification:** Undismissable warning banner (non-blocking)
- **User choice:** Can continue using outdated version
- **Mechanism:** Tauri built-in updater
- **Distribution:** GitHub Releases

## Offline Capabilities

| Scenario | Behavior |
|----------|----------|
| App launch (no internet) | Works - UI loads, settings accessible |
| Download attempt (no internet) | Error: "No internet connection" |
| OAuth (no internet) | Error: "Cannot reach SoundCloud" |
| Previously downloaded files | Fully accessible (local files) |

**No server dependency:** App is self-contained. No telemetry, no license checks, no backend.
