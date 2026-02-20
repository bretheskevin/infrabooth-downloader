# InfraBooth Downloader

A desktop application for downloading audio from SoundCloud with OAuth authentication, batch downloading, format conversion, and ID3 metadata embedding.

## System Requirements

| Platform | Minimum Version |
|----------|-----------------|
| macOS | 10.15 (Catalina) |
| Windows | 10 |

## Third-Party Software

This application bundles the following third-party binaries:

| Software | License | Purpose |
|----------|---------|---------|
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | [Unlicense](https://github.com/yt-dlp/yt-dlp/blob/master/LICENSE) | Audio download from SoundCloud |
| [FFmpeg](https://ffmpeg.org/) | [LGPL v2.1+](https://ffmpeg.org/legal.html) | Audio format conversion |
| [FFprobe](https://ffmpeg.org/) | [LGPL v2.1+](https://ffmpeg.org/legal.html) | Media file inspection |

### License Compliance

- **yt-dlp** is released under the Unlicense, a public domain dedication.
- **FFmpeg** and **FFprobe** are licensed under LGPL v2.1 or later. The binaries bundled with this application are dynamically linked and unmodified. Source code is available at [ffmpeg.org](https://ffmpeg.org/download.html).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
