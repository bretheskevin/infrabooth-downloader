# Smart Encoding Strategy — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the fixed MP3 320kbps encoding with codec-aware encoding that stream-copies MP3 sources and transcodes AAC/Opus at appropriate bitrates.

**Architecture:** Add a public `StreamCodec` enum to `stream.rs`, populate it from the selected transcoding's mime_type, and use it in `downloader.rs` to build codec-aware ffmpeg arguments and progress estimation.

**Tech Stack:** Rust, Tauri sidecar (ffmpeg)

**Design doc:** `docs/plans/2026-03-05-smart-encoding-design.md`

---

### Task 1: Add `StreamCodec` enum and update `StreamInfo`

**Files:**
- Modify: `src-tauri/src/services/stream.rs:35-40` (StreamInfo struct)
- Modify: `src-tauri/src/services/stream.rs:62-69` (Codec enum area)

**Step 1: Add public `StreamCodec` enum**

Add this right before the existing private `Codec` enum (line 62):

```rust
/// Source codec type exposed to consumers (e.g. downloader).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StreamCodec {
    Mp3,
    Aac,
    Opus,
    Unknown,
}
```

**Step 2: Add a conversion from private `Codec` to public `StreamCodec`**

Add an `impl From<Codec> for StreamCodec` after the `StreamCodec` enum:

```rust
impl From<Codec> for StreamCodec {
    fn from(c: Codec) -> Self {
        match c {
            Codec::Mp3 => StreamCodec::Mp3,
            Codec::Aac => StreamCodec::Aac,
            Codec::Opus => StreamCodec::Opus,
            Codec::Unknown => StreamCodec::Unknown,
        }
    }
}
```

**Step 3: Add `codec` field to `StreamInfo`**

Update the `StreamInfo` struct (line 35-40) to:

```rust
/// Resolved stream info ready for ffmpeg.
#[derive(Debug, Clone)]
pub struct StreamInfo {
    pub url: String,
    pub is_hls: bool,
    pub codec: StreamCodec,
}
```

**Step 4: Populate `codec` in `resolve_stream_url`**

In `resolve_stream_url` (around line 380), update the `StreamInfo` construction to extract the codec from the selected transcoding. Add this line before the `return Ok(StreamInfo { ... })`:

```rust
let codec: StreamCodec = extract_codec(&transcoding.format.mime_type).into();
```

And update the return to:

```rust
return Ok(StreamInfo {
    url: cdn_url,
    is_hls,
    codec,
});
```

**Step 5: Verify compilation**

Run: `cd src-tauri && cargo check`
Expected: PASS (no errors)

---

### Task 2: Write tests for `StreamCodec` population

**Files:**
- Modify: `src-tauri/src/services/stream.rs` (tests module, ~line 575+)

**Step 1: Write tests for `StreamCodec` conversion**

Add these tests inside the existing `tests` module at the end of `stream.rs`:

```rust
#[test]
fn test_stream_codec_from_codec() {
    assert_eq!(StreamCodec::from(Codec::Aac), StreamCodec::Aac);
    assert_eq!(StreamCodec::from(Codec::Opus), StreamCodec::Opus);
    assert_eq!(StreamCodec::from(Codec::Mp3), StreamCodec::Mp3);
    assert_eq!(StreamCodec::from(Codec::Unknown), StreamCodec::Unknown);
}
```

**Step 2: Run tests to verify they pass**

Run: `cd src-tauri && cargo test --lib services::stream::tests`
Expected: All tests PASS including the new one

---

### Task 3: Codec-aware ffmpeg args in downloader

**Files:**
- Modify: `src-tauri/src/services/downloader.rs:19-20` (imports)
- Modify: `src-tauri/src/services/downloader.rs:263-276` (ffmpeg args section)

**Step 1: Update import to include `StreamCodec`**

Change line 17 from:

```rust
use crate::services::stream;
```

To:

```rust
use crate::services::stream::{self, StreamCodec};
```

**Step 2: Replace hardcoded codec/bitrate args with codec-aware logic**

Replace the current codec args block (lines 271-276):

```rust
// Output codec and quality
args.extend_from_slice(&[
    "-codec:a".to_string(),
    "libmp3lame".to_string(),
    "-b:a".to_string(),
    "320k".to_string(),
]);
```

With:

```rust
// Output codec and quality — codec-aware encoding
match stream_info.codec {
    StreamCodec::Mp3 => {
        // Source is already MP3: stream-copy (no re-encoding, no quality loss)
        args.extend_from_slice(&["-codec:a".to_string(), "copy".to_string()]);
    }
    StreamCodec::Aac | StreamCodec::Unknown => {
        // AAC 256kbps source or unknown: transcode to MP3 256kbps
        args.extend_from_slice(&[
            "-codec:a".to_string(),
            "libmp3lame".to_string(),
            "-b:a".to_string(),
            "256k".to_string(),
        ]);
    }
    StreamCodec::Opus => {
        // Opus ~64kbps: transcode to MP3 128kbps (2x for perceptual parity)
        args.extend_from_slice(&[
            "-codec:a".to_string(),
            "libmp3lame".to_string(),
            "-b:a".to_string(),
            "128k".to_string(),
        ]);
    }
}
```

**Step 3: Log the encoding strategy**

Add a log line after the stream URL resolution log (after line 250):

```rust
log::info!(
    "[downloader] Encoding strategy for track {}: codec={:?}",
    config.track_id,
    stream_info.codec
);
```

**Step 4: Verify compilation**

Run: `cd src-tauri && cargo check`
Expected: PASS

---

### Task 4: Update progress estimation to be codec-aware

**Files:**
- Modify: `src-tauri/src/services/downloader.rs:19-20` (constant area)
- Modify: `src-tauri/src/services/downloader.rs:316` (estimated_total_bytes calculation)

**Step 1: Replace the constant with a function**

Replace the constant (line 19-20):

```rust
/// 320kbps MP3 ≈ 40 bytes per millisecond (320_000 bits/s ÷ 8 ÷ 1000).
const MP3_320KBPS_BYTES_PER_MS: u64 = 40;
```

With:

```rust
/// Estimate bytes per millisecond for the output MP3 based on source codec.
fn output_bytes_per_ms(codec: &StreamCodec) -> u64 {
    match codec {
        StreamCodec::Mp3 => 16,      // ~128kbps (SC serves MP3 at 128k), stream-copied
        StreamCodec::Aac => 32,      // 256kbps target output
        StreamCodec::Opus => 16,     // 128kbps target output
        StreamCodec::Unknown => 32,  // 256kbps fallback
    }
}
```

**Step 2: Update the estimation usage**

Replace line 316:

```rust
Some(config.duration_ms * MP3_320KBPS_BYTES_PER_MS)
```

With:

```rust
Some(config.duration_ms * output_bytes_per_ms(&stream_info.codec))
```

**Step 3: Verify compilation**

Run: `cd src-tauri && cargo check`
Expected: PASS

---

### Task 5: Write tests for codec-aware logic in downloader

**Files:**
- Modify: `src-tauri/src/services/downloader.rs` (tests module)

**Step 1: Add tests for `output_bytes_per_ms`**

Add inside the existing `tests` module:

```rust
// output_bytes_per_ms tests

#[test]
fn test_output_bytes_per_ms_mp3() {
    assert_eq!(output_bytes_per_ms(&StreamCodec::Mp3), 16);
}

#[test]
fn test_output_bytes_per_ms_aac() {
    assert_eq!(output_bytes_per_ms(&StreamCodec::Aac), 32);
}

#[test]
fn test_output_bytes_per_ms_opus() {
    assert_eq!(output_bytes_per_ms(&StreamCodec::Opus), 16);
}

#[test]
fn test_output_bytes_per_ms_unknown() {
    assert_eq!(output_bytes_per_ms(&StreamCodec::Unknown), 32);
}
```

**Step 2: Update import in tests module**

Add `use crate::services::stream::StreamCodec;` at the top of the tests module (or it may already be in scope from the parent module's import).

**Step 3: Run all tests**

Run: `cd src-tauri && cargo test --lib services::downloader::tests`
Expected: All tests PASS

---

### Task 6: Run full test suite and verify

**Step 1: Run all Rust tests**

Run: `cd src-tauri && cargo test`
Expected: All tests PASS

**Step 2: Run cargo clippy**

Run: `cd src-tauri && cargo clippy -- -D warnings`
Expected: No warnings

**Step 3: Run frontend tests (ensure bindings still work)**

Run: `npm test`
Expected: All tests PASS
