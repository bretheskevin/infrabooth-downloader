# InfraBooth Downloader

A desktop application for downloading SoundCloud tracks at high quality. Connect with your SoundCloud account to access premium audio quality available with Go+ subscriptions.

## Features

- **OAuth Authentication** - Securely connect your SoundCloud account
- **High-Quality Downloads** - Access the best available audio quality (Go+ subscribers get premium quality)
- **ID3 Metadata** - Automatically embeds track info, artist, and artwork into downloaded files
- **Auto-Updates** - Built-in updater keeps the app current

## System Requirements

| Platform | Minimum Version |
|----------|-----------------|
| macOS    | 10.15 (Catalina) |
| Windows  | 10 |

## Third-Party Software

This application bundles the following third-party binaries:

| Software | License | Purpose |
|----------|---------|---------|
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | [Unlicense](https://github.com/yt-dlp/yt-dlp/blob/master/LICENSE) | Audio download from SoundCloud |
| [FFmpeg](https://ffmpeg.org/) | [LGPL v2.1+](https://ffmpeg.org/legal.html) | Audio processing |
| [FFprobe](https://ffmpeg.org/) | [LGPL v2.1+](https://ffmpeg.org/legal.html) | Media file inspection |

### License Compliance

- **yt-dlp** is released under the Unlicense, a public domain dedication.
- **FFmpeg** and **FFprobe** are licensed under LGPL v2.1 or later. The binaries bundled with this application are dynamically linked and unmodified. Source code is available at [ffmpeg.org](https://ffmpeg.org/download.html).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
