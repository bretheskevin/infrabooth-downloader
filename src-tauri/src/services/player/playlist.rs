use std::collections::HashMap;

use url::Url;

use super::crypto::parse_hex_iv;
use crate::models::error::PlayerError;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct KeyInfo {
    pub uri: String,
    pub iv: Option<[u8; 16]>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InitSection {
    pub url: String,
    pub key: Option<KeyInfo>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Segment {
    pub url: String,
    pub start_ms: u64,
    pub end_ms: u64,
    pub sequence: u64,
    pub key: Option<KeyInfo>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MediaPlaylist {
    pub segments: Vec<Segment>,
    pub init: Option<InitSection>,
    pub media_sequence: u64,
    pub total_ms: u64,
}

impl MediaPlaylist {
    pub fn segment_index_at(&self, ms: u64) -> Option<usize> {
        self.segments.iter().position(|s| ms >= s.start_ms && ms < s.end_ms)
    }

    pub fn start_index_for(&self, ms: u64) -> usize {
        self.segment_index_at(ms).unwrap_or(if ms >= self.total_ms { self.segments.len().saturating_sub(1) } else { 0 })
    }

    pub fn is_encrypted(&self) -> bool {
        self.segments.iter().any(|s| s.key.is_some())
    }
}

struct ParseState {
    base: Url,
    media_sequence: u64,
    key: Option<KeyInfo>,
    init: Option<InitSection>,
    pending_duration_s: Option<f64>,
    acc_ms: f64,
    segments: Vec<Segment>,
}

pub fn parse_media_playlist(text: &str, base_url: &str) -> Result<MediaPlaylist, PlayerError> {
    let base = Url::parse(base_url).map_err(|e| {
        log::error!("[player::playlist] bad playlist base url: {e}");
        PlayerError::InvalidStream(format!("bad playlist url: {e}"))
    })?;
    if !text.trim_start_matches('\u{feff}').trim_start().starts_with("#EXTM3U") {
        log::error!("[player::playlist] missing #EXTM3U header ({} bytes)", text.len());
        return Err(PlayerError::InvalidStream("missing #EXTM3U header".into()));
    }
    let mut state = ParseState { base, media_sequence: 0, key: None, init: None, pending_duration_s: None, acc_ms: 0.0, segments: Vec::new() };
    for line in text.lines().map(str::trim).filter(|l| !l.is_empty()) {
        state.consume(line)?;
    }
    if state.segments.is_empty() {
        log::error!("[player::playlist] playlist has no segments");
        return Err(PlayerError::InvalidStream("playlist has no segments".into()));
    }
    let total_ms = state.segments.last().map_or(0, |s| s.end_ms);
    let playlist = MediaPlaylist { segments: state.segments, init: state.init, media_sequence: state.media_sequence, total_ms };
    log::info!(
        "[player::playlist] parsed {} segments, total_ms={}, media_sequence={}, encrypted={}, init={}",
        playlist.segments.len(),
        playlist.total_ms,
        playlist.media_sequence,
        playlist.is_encrypted(),
        playlist.init.is_some()
    );
    Ok(playlist)
}

impl ParseState {
    fn consume(&mut self, line: &str) -> Result<(), PlayerError> {
        if let Some(value) = line.strip_prefix("#EXT-X-MEDIA-SEQUENCE:") {
            self.media_sequence = value.trim().parse().unwrap_or(0);
        } else if let Some(value) = line.strip_prefix("#EXTINF:") {
            self.pending_duration_s = value.split(',').next().and_then(|d| d.trim().parse().ok());
        } else if let Some(value) = line.strip_prefix("#EXT-X-KEY:") {
            self.key = self.parse_key(value)?;
        } else if let Some(value) = line.strip_prefix("#EXT-X-MAP:") {
            self.init = Some(self.parse_map(value)?);
        } else if !line.starts_with('#') {
            self.push_segment(line)?;
        }
        Ok(())
    }

    fn push_segment(&mut self, uri: &str) -> Result<(), PlayerError> {
        let Some(duration_s) = self.pending_duration_s.take() else {
            log::debug!("[player::playlist] skipping uri without preceding EXTINF");
            return Ok(());
        };
        let url = self.resolve(uri)?;
        let start_ms = self.acc_ms.round() as u64;
        self.acc_ms += duration_s * 1000.0;
        let sequence = self.media_sequence + self.segments.len() as u64;
        self.segments.push(Segment { url, start_ms, end_ms: self.acc_ms.round() as u64, sequence, key: self.key.clone() });
        Ok(())
    }

    fn parse_key(&self, raw: &str) -> Result<Option<KeyInfo>, PlayerError> {
        let attrs = parse_attributes(raw);
        match attrs.get("METHOD").map(String::as_str) {
            None | Some("NONE") => Ok(None),
            Some("AES-128") => {
                let uri = attrs.get("URI").ok_or_else(|| PlayerError::InvalidStream("EXT-X-KEY without URI".into()))?;
                let iv = match attrs.get("IV") {
                    Some(raw_iv) => Some(parse_hex_iv(raw_iv).ok_or_else(|| PlayerError::InvalidStream(format!("bad IV {raw_iv}")))?),
                    None => None,
                };
                Ok(Some(KeyInfo { uri: self.resolve(uri)?, iv }))
            }
            Some(other) => {
                log::error!("[player::playlist] unsupported HLS encryption method {other}");
                Err(PlayerError::UnsupportedCodec(format!("HLS encryption method {other}")))
            }
        }
    }

    fn parse_map(&self, raw: &str) -> Result<InitSection, PlayerError> {
        let attrs = parse_attributes(raw);
        let uri = attrs.get("URI").ok_or_else(|| PlayerError::InvalidStream("EXT-X-MAP without URI".into()))?;
        Ok(InitSection { url: self.resolve(uri)?, key: self.key.clone() })
    }

    fn resolve(&self, uri: &str) -> Result<String, PlayerError> {
        if uri.starts_with("https://") || uri.starts_with("http://") {
            return Ok(uri.to_string());
        }
        self.base.join(uri).map(|u| u.to_string()).map_err(|e| PlayerError::InvalidStream(format!("bad uri {uri}: {e}")))
    }
}

pub fn parse_attributes(input: &str) -> HashMap<String, String> {
    let mut out = HashMap::new();
    let mut rest = input.trim();
    while let Some(eq) = rest.find('=') {
        let key = rest[..eq].trim().to_string();
        let after = &rest[eq + 1..];
        let (value, remaining) = match after.strip_prefix('"') {
            Some(quoted) => {
                let end = quoted.find('"').unwrap_or(quoted.len());
                (&quoted[..end], quoted.get(end + 1..).unwrap_or(""))
            }
            None => {
                let end = after.find(',').unwrap_or(after.len());
                (&after[..end], &after[end..])
            }
        };
        out.insert(key, value.to_string());
        rest = remaining.trim_start_matches(',').trim_start();
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    const BASE: &str = "https://cdn.example.com/media/playlist.m3u8?Policy=abc";
    const MANIFEST: &str = "#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10.0,\nhttps://cdn.example.com/seg0.mp3\n#EXTINF:10.0,\nseg1.mp3\n#EXTINF:5.0,\nhttps://cdn.example.com/seg2.mp3\n#EXT-X-ENDLIST\n";

    #[test]
    fn parses_segment_timing_and_relative_urls() {
        let pl = parse_media_playlist(MANIFEST, BASE).unwrap();
        assert_eq!(pl.segments.len(), 3);
        assert_eq!((pl.segments[1].start_ms, pl.segments[1].end_ms), (10_000, 20_000));
        assert_eq!(pl.segments[1].url, "https://cdn.example.com/media/seg1.mp3");
        assert_eq!(pl.segments[0].url, "https://cdn.example.com/seg0.mp3");
        assert_eq!(pl.total_ms, 25_000);
        assert!(pl.init.is_none());
        assert!(!pl.is_encrypted());
    }

    #[test]
    fn segment_lookup_by_time() {
        let pl = parse_media_playlist(MANIFEST, BASE).unwrap();
        assert_eq!(pl.segment_index_at(12_000), Some(1));
        assert_eq!(pl.segment_index_at(0), Some(0));
        assert_eq!(pl.segment_index_at(30_000), None);
        assert_eq!(pl.start_index_for(30_000), 2);
        assert_eq!(pl.start_index_for(24_999), 2);
    }

    #[test]
    fn parses_aes_key_with_and_without_iv_and_media_sequence() {
        let text = "#EXTM3U\n#EXT-X-MEDIA-SEQUENCE:7\n#EXT-X-KEY:METHOD=AES-128,URI=\"https://keys.example.com/k?x=1,2\",IV=0x000102030405060708090a0b0c0d0e0f\n#EXTINF:4.0,\na.ts\n#EXT-X-KEY:METHOD=AES-128,URI=\"key2\"\n#EXTINF:4.0,\nb.ts\n#EXT-X-KEY:METHOD=NONE\n#EXTINF:4.0,\nc.ts\n";
        let pl = parse_media_playlist(text, BASE).unwrap();
        let first = pl.segments[0].key.as_ref().unwrap();
        assert_eq!(first.uri, "https://keys.example.com/k?x=1,2");
        assert_eq!(first.iv.unwrap()[15], 15);
        let second = pl.segments[1].key.as_ref().unwrap();
        assert_eq!(second.uri, "https://cdn.example.com/media/key2");
        assert!(second.iv.is_none());
        assert!(pl.segments[2].key.is_none());
        assert_eq!(pl.segments[0].sequence, 7);
        assert_eq!(pl.segments[2].sequence, 9);
        assert!(pl.is_encrypted());
    }

    #[test]
    fn parses_init_section() {
        let text = "#EXTM3U\n#EXT-X-MAP:URI=\"init.mp4\"\n#EXTINF:2.0,\nseg0.m4s\n";
        let pl = parse_media_playlist(text, BASE).unwrap();
        assert_eq!(pl.init.unwrap().url, "https://cdn.example.com/media/init.mp4");
    }

    #[test]
    fn rejects_invalid_playlists() {
        assert!(parse_media_playlist("not a playlist", BASE).is_err());
        assert!(parse_media_playlist("#EXTM3U\n", BASE).is_err());
        assert!(matches!(
            parse_media_playlist("#EXTM3U\n#EXT-X-KEY:METHOD=SAMPLE-AES,URI=\"k\"\n#EXTINF:1,\na\n", BASE),
            Err(PlayerError::UnsupportedCodec(_))
        ));
    }

    #[test]
    fn attribute_parser_handles_quoted_commas() {
        let attrs = parse_attributes("METHOD=AES-128,URI=\"a,b\",IV=0x01");
        assert_eq!(attrs.get("URI").unwrap(), "a,b");
        assert_eq!(attrs.get("IV").unwrap(), "0x01");
    }
}
