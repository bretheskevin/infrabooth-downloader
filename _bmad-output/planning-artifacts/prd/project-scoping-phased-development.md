# Project Scoping & Phased Development

## MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP
- Single question: "Can I download my Go+ playlists with proper metadata?"
- Binary success: it works or it doesn't
- No partial value - the core flow must complete end-to-end

**Resource Requirements:** Solo developer
- Leverages Tauri framework (Rust + TypeScript)
- Delegates complexity to proven tools (yt-dlp, FFmpeg)
- Minimal custom code surface area

## MVP Feature Set (Phase 1)

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

## Post-MVP Features

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

## Risk Mitigation Strategy

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| yt-dlp breaks with SC changes | Medium | High | Pin version, monitor upstream, quick binary update |
| OAuth flow confusion | Low | Medium | Browser popup only, clear "Signed in as X" confirmation |
| SoundCloud blocks OAuth entirely | Low | Critical | **Accepted risk** - product becomes impossible, move on |
| Rate limiting disrupts UX | High | Low | Fibonacci backoff, clear "waiting" status, partial success is success |
