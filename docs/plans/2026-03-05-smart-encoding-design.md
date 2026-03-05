# Smart Encoding Strategy

## Problem

The downloader always re-encodes to MP3 320kbps regardless of source codec/bitrate. SoundCloud's best stream is AAC 256kbps, so encoding at 320kbps wastes disk space without quality gain. Transcoding lossy-to-lossy also introduces generational quality loss.

## Decision

- **Always output MP3** (universal compatibility)
- **Stream-copy when source is MP3** (no re-encoding, no quality loss)
- **Codec-aware bitrate mapping** when transcoding:
  - AAC 256kbps → MP3 256kbps
  - Opus ~64kbps → MP3 128kbps (2x multiplier for perceptual parity)
  - Unknown → MP3 256kbps (safe fallback)

## Design

### 1. Enrich `StreamInfo` with source codec

Add a public `StreamCodec` enum to `stream.rs` and populate it from the selected transcoding's `mime_type`:

```rust
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StreamCodec {
    Mp3,
    Aac,
    Opus,
    Unknown,
}

pub struct StreamInfo {
    pub url: String,
    pub is_hls: bool,
    pub codec: StreamCodec,  // NEW
}
```

Derived using the existing `extract_codec` logic in `resolve_stream_url`.

### 2. Codec-aware ffmpeg args in `downloader.rs`

| Source codec | ffmpeg codec args | Rationale |
|---|---|---|
| Mp3 | `-codec:a copy` | No re-encoding needed |
| Aac | `-codec:a libmp3lame -b:a 256k` | Match source bitrate |
| Opus | `-codec:a libmp3lame -b:a 128k` | 2x Opus ~64kbps for perceptual parity |
| Unknown | `-codec:a libmp3lame -b:a 256k` | Safe fallback |

### 3. Update progress estimation

Replace the fixed `MP3_320KBPS_BYTES_PER_MS` constant with a codec-aware function:

```rust
fn bytes_per_ms_for_codec(codec: &StreamCodec) -> u64 {
    match codec {
        StreamCodec::Mp3 => 16,      // ~128kbps (SC serves MP3 at 128k)
        StreamCodec::Aac => 32,      // 256kbps target
        StreamCodec::Opus => 16,     // 128kbps target
        StreamCodec::Unknown => 32,  // 256kbps fallback
    }
}
```

### 4. Data flow

```
resolve_stream_url() → StreamInfo { url, is_hls, codec }
                                          ↓
download_track_to_mp3() reads codec → builds ffmpeg args accordingly
```

`StreamInfo` is already returned inside `download_track_to_mp3`, so codec info flows naturally without changing the pipeline signature.

### 5. Not in scope

- No format detection via ffprobe (codec known from API)
- No user-facing bitrate settings
- No preservation of AAC/Opus output formats
