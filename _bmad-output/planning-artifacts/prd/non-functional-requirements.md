# Non-Functional Requirements

## Performance

- **NFR1:** Application launches to interactive state within 3 seconds
- **NFR2:** UI responds to user input within 100ms during downloads
- **NFR3:** Progress updates display within 500ms of status change

## Security

- **NFR4:** OAuth tokens encrypted at rest using machine-bound key
- **NFR5:** No credentials stored in plaintext
- **NFR6:** HTTPS only for all network communication
- **NFR7:** No telemetry or data collection

## Reliability

- **NFR8:** Application does not crash during playlist downloads of up to 100 tracks, rate limit recovery, or error panel interactions
- **NFR9:** Partial download failures do not corrupt successfully downloaded files
- **NFR10:** Application state persists across unexpected termination (token, settings)

## Integration

- **NFR11:** Bundled yt-dlp version pinned and verified via checksum
- **NFR12:** Bundled FFmpeg version pinned and verified via checksum
- **NFR13:** Binary updates can be deployed without full app reinstall (future consideration)
