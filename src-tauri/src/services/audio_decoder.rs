use std::io::{Cursor, Read, Seek, SeekFrom};
use std::time::Duration;

use symphonia::core::{
    audio::SampleBuffer,
    codecs::{DecoderOptions, CODEC_TYPE_NULL},
    errors::Error as SymphoniaError,
    formats::FormatOptions,
    io::{MediaSource, MediaSourceStream},
    meta::MetadataOptions,
    probe::Hint,
    units::Time,
};

use rodio::Source;

const MAX_DECODE_RETRIES: usize = 3;

/// A `MediaSource` backed by in-memory bytes with correct `byte_len()`.
struct BytesMediaSource {
    cursor: Cursor<Vec<u8>>,
    len: u64,
}

impl BytesMediaSource {
    fn new(data: Vec<u8>) -> Self {
        let len = data.len() as u64;
        Self {
            cursor: Cursor::new(data),
            len,
        }
    }
}

impl Read for BytesMediaSource {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        self.cursor.read(buf)
    }
}

impl Seek for BytesMediaSource {
    fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
        self.cursor.seek(pos)
    }
}

impl MediaSource for BytesMediaSource {
    fn is_seekable(&self) -> bool {
        true
    }

    fn byte_len(&self) -> Option<u64> {
        Some(self.len)
    }
}

/// Symphonia-based audio decoder that properly reports byte length.
/// Mirrors rodio's internal `SymphoniaDecoder` but uses `BytesMediaSource`
/// instead of rodio's `ReadSeekSource` (which returns `byte_len() = None`).
pub struct AudioDecoder {
    decoder: Box<dyn symphonia::core::codecs::Decoder>,
    format: Box<dyn symphonia::core::formats::FormatReader>,
    buffer: SampleBuffer<i16>,
    spec: symphonia::core::audio::SignalSpec,
    current_frame_offset: usize,
    total_duration: Option<Time>,
    track_id: u32,
}

impl AudioDecoder {
    pub fn new_m4a(data: Vec<u8>) -> Result<Self, String> {
        Self::new_with_hint(data, "m4a")
    }

    pub fn new_mp3(data: Vec<u8>) -> Result<Self, String> {
        Self::new_with_hint(data, "mp3")
    }

    pub fn new_opus(data: Vec<u8>) -> Result<Self, String> {
        Self::new_auto(data)
    }

    pub fn new_auto(data: Vec<u8>) -> Result<Self, String> {
        Self::new_inner(data, None)
    }

    fn new_with_hint(data: Vec<u8>, ext: &str) -> Result<Self, String> {
        Self::new_inner(data, Some(ext))
    }

    fn new_inner(data: Vec<u8>, extension: Option<&str>) -> Result<Self, String> {
        let source = BytesMediaSource::new(data);
        let mss = MediaSourceStream::new(Box::new(source), Default::default());

        let mut hint = Hint::new();
        if let Some(ext) = extension {
            hint.with_extension(ext);
        }

        let format_opts = FormatOptions {
            enable_gapless: true,
            ..Default::default()
        };

        let probed = symphonia::default::get_probe()
            .format(&hint, mss, &format_opts, &MetadataOptions::default())
            .map_err(|e| format!("Format probe failed: {}", e))?;

        let mut format = probed.format;

        let track = format
            .tracks()
            .iter()
            .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
            .ok_or("No supported audio track found")?;

        let track_id = track.id;
        let total_duration = track
            .codec_params
            .time_base
            .zip(track.codec_params.n_frames)
            .map(|(base, frames)| base.calc_time(frames));

        let mut decoder = symphonia::default::get_codecs()
            .make(&track.codec_params, &DecoderOptions::default())
            .map_err(|e| format!("Codec init failed: {}", e))?;

        // Decode first frame to initialize buffer and spec
        let mut decode_errors: usize = 0;
        let decoded = loop {
            let packet = match format.next_packet() {
                Ok(p) => p,
                Err(SymphoniaError::IoError(e)) => {
                    return Err(format!("IO error reading first packet: {}", e))
                }
                Err(e) => return Err(format!("Read error: {}", e)),
            };
            if packet.track_id() != track_id {
                continue;
            }
            match decoder.decode(&packet) {
                Ok(decoded) => break decoded,
                Err(SymphoniaError::DecodeError(_)) => {
                    decode_errors += 1;
                    if decode_errors > MAX_DECODE_RETRIES {
                        return Err("Too many decode errors".into());
                    }
                    continue;
                }
                Err(e) => return Err(format!("Decode error: {}", e)),
            }
        };

        let spec = *decoded.spec();
        let duration = symphonia::core::units::Duration::from(decoded.capacity() as u64);
        let mut buffer = SampleBuffer::<i16>::new(duration, spec);
        buffer.copy_interleaved_ref(decoded);

        Ok(Self {
            decoder,
            format,
            buffer,
            spec,
            current_frame_offset: 0,
            total_duration,
            track_id,
        })
    }
}

impl Iterator for AudioDecoder {
    type Item = i16;

    #[inline]
    fn next(&mut self) -> Option<i16> {
        if self.current_frame_offset >= self.buffer.len() {
            let mut decode_errors: usize = 0;
            loop {
                let packet = self.format.next_packet().ok()?;
                if packet.track_id() != self.track_id {
                    continue;
                }
                match self.decoder.decode(&packet) {
                    Ok(decoded) => {
                        let capacity = decoded.capacity() as u64;
                        if capacity > self.buffer.capacity() as u64 {
                            let duration =
                                symphonia::core::units::Duration::from(capacity);
                            self.buffer = SampleBuffer::<i16>::new(duration, self.spec);
                        }
                        self.buffer.copy_interleaved_ref(decoded);
                        self.current_frame_offset = 0;
                        break;
                    }
                    Err(SymphoniaError::DecodeError(_)) => {
                        decode_errors += 1;
                        if decode_errors > MAX_DECODE_RETRIES {
                            return None;
                        }
                        continue;
                    }
                    Err(_) => return None,
                }
            }
        }

        let sample = *self.buffer.samples().get(self.current_frame_offset)?;
        self.current_frame_offset += 1;
        Some(sample)
    }
}

impl Source for AudioDecoder {
    #[inline]
    fn current_frame_len(&self) -> Option<usize> {
        Some(self.buffer.samples().len() - self.current_frame_offset)
    }

    #[inline]
    fn channels(&self) -> u16 {
        self.spec.channels.count() as u16
    }

    #[inline]
    fn sample_rate(&self) -> u32 {
        self.spec.rate
    }

    #[inline]
    fn total_duration(&self) -> Option<Duration> {
        self.total_duration.map(|Time { seconds, frac }| {
            Duration::new(seconds, (frac * 1_000_000_000.0) as u32)
        })
    }

    /// Seeking is not currently supported. The UI seek bar will have no effect
    /// for streams decoded through this path. Implementing seek would require
    /// calling `self.format.seek()` via Symphonia's `FormatReader`.
    fn try_seek(&mut self, _pos: Duration) -> Result<(), rodio::source::SeekError> {
        Err(rodio::source::SeekError::NotSupported {
            underlying_source: "AudioDecoder",
        })
    }
}
