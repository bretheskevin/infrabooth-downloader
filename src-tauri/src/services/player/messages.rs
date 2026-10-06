use std::sync::atomic::{AtomicU64, Ordering};

use serde::Deserialize;
use specta::Type;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct PipelineId(pub u64);

static NEXT_PIPELINE_ID: AtomicU64 = AtomicU64::new(1);

impl PipelineId {
    pub fn next() -> Self {
        Self(NEXT_PIPELINE_ID.fetch_add(1, Ordering::Relaxed))
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NetworkErrorKind {
    NonFatal,
    Fatal,
    Expired,
}

#[derive(Debug, Clone, PartialEq)]
pub enum PipelineEvent {
    Ready { duration_ms: u64 },
    SegmentLoaded,
    FullyBuffered,
    NetworkError { kind: NetworkErrorKind, detail: String },
    DecoderFinished,
    DecoderFailed { message: String },
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PlayerPreloadTrack {
    pub track_id: u64,
    pub url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PlayerMediaMetadata {
    pub title: String,
    pub artist: String,
    pub artwork_url: Option<String>,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, PartialEq)]
pub enum EngineMsg {
    Load { url: String, start_ms: u64, generation: u32 },
    Play,
    Pause,
    Seek { position_ms: u64 },
    SetVolume { volume: f32 },
    Stop { generation: u32 },
    Destroy { generation: u32 },
    PreloadNext { url: String },
    StartCrossfade { duration_ms: u64, target_volume: f32 },
    CancelCrossfade,
    SettleCrossfade,
    PreloadSegments { tracks: Vec<PlayerPreloadTrack> },
    PurgeCache { keep_track_ids: Vec<u64> },
    Pipeline { pipeline_id: PipelineId, event: PipelineEvent },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pipeline_ids_are_unique() {
        assert_ne!(PipelineId::next(), PipelineId::next());
    }

    #[test]
    fn preload_track_deserializes_from_camel_case() {
        let track: PlayerPreloadTrack = serde_json::from_str(r#"{"trackId":7,"url":"https://x"}"#).unwrap();
        assert_eq!(track, PlayerPreloadTrack { track_id: 7, url: "https://x".into() });
    }

    #[test]
    fn media_metadata_deserializes_from_camel_case() {
        let json = r#"{"title":"T","artist":"A","artworkUrl":null,"durationMs":1000}"#;
        let metadata: PlayerMediaMetadata = serde_json::from_str(json).unwrap();
        assert_eq!(metadata, PlayerMediaMetadata { title: "T".into(), artist: "A".into(), artwork_url: None, duration_ms: 1000 });
    }
}
