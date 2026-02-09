# Binary Versions

This file documents the pinned versions of sidecar binaries bundled with the application.

## yt-dlp

- **Version:** 2026.02.04
- **Source:** https://github.com/yt-dlp/yt-dlp/releases/tag/2026.02.04
- **Checksums:** See `src-tauri/binaries/checksums.txt`

### Platform Binaries

| Platform | Binary Name | Source File |
|----------|-------------|-------------|
| Windows x64 | `yt-dlp-x86_64-pc-windows-msvc.exe` | `yt-dlp.exe` |
| macOS Intel | `yt-dlp-x86_64-apple-darwin` | `yt-dlp_macos` (universal) |
| macOS ARM | `yt-dlp-aarch64-apple-darwin` | `yt-dlp_macos` (universal) |

### Verification

To verify checksums:

```bash
cd src-tauri/binaries
shasum -a 256 -c checksums.txt
```

### Updating yt-dlp

1. Download new binaries from the yt-dlp releases page
2. Rename with Tauri target triple suffixes
3. Update checksums.txt with new SHA256 hashes
4. Update this file with the new version
5. Test sidecar execution in dev mode

## FFmpeg

- **Version:** N-122656-g00b4d67812 (snapshot)
- **Sources:**
  - macOS: https://ffmpeg.martin-riedl.de/
  - Windows: https://www.gyan.dev/ffmpeg/builds/ (essentials build 8.0.1)
- **Checksums:** See `src-tauri/binaries/checksums.txt`

### Platform Binaries

| Platform | Binary Name | Source |
|----------|-------------|--------|
| Windows x64 | `ffmpeg-x86_64-pc-windows-msvc.exe` | gyan.dev essentials |
| macOS Intel | `ffmpeg-x86_64-apple-darwin` | martin-riedl.de |
| macOS ARM | `ffmpeg-aarch64-apple-darwin` | martin-riedl.de |

### Updating FFmpeg

1. Download new binaries from the source URLs above
2. Rename with Tauri target triple suffixes
3. Update checksums.txt with new SHA256 hashes
4. Update this file with the new version
5. Test sidecar execution in dev mode
