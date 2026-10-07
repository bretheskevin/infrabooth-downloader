use std::ops::RangeInclusive;
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

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DockMenuLabels {
    pub play: String,
    pub pause: String,
    pub next: String,
    pub previous: String,
    pub shuffle: String,
    pub not_playing: String,
    pub settings_menu: String,
    pub crossfade: String,
    pub crossfade_duration: String,
    pub crossfade_seconds: Vec<String>,
    pub parallel_downloads: String,
    pub sequential: String,
}

impl Default for DockMenuLabels {
    fn default() -> Self {
        Self {
            play: "Play".into(),
            pause: "Pause".into(),
            next: "Next".into(),
            previous: "Previous".into(),
            shuffle: "Shuffle".into(),
            not_playing: "Not Playing".into(),
            settings_menu: "Settings".into(),
            crossfade: "Crossfade".into(),
            crossfade_duration: "Crossfade duration".into(),
            crossfade_seconds: CROSSFADE_DURATION_RANGE.map(|seconds| format!("{seconds}s")).collect(),
            parallel_downloads: "Parallel downloads".into(),
            sequential: "Sequential".into(),
        }
    }
}

pub(super) const CROSSFADE_DURATION_RANGE: RangeInclusive<u8> = 1..=12;
pub(super) const PARALLEL_RANGE: RangeInclusive<u8> = 1..=10;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DockMenuSettings {
    pub crossfade_enabled: bool,
    pub crossfade_duration: u8,
    pub max_concurrent_downloads: u8,
}

impl Default for DockMenuSettings {
    fn default() -> Self {
        Self { crossfade_enabled: false, crossfade_duration: 5, max_concurrent_downloads: 3 }
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DockMenuState {
    pub title: Option<String>,
    pub is_playing: bool,
    pub has_track: bool,
    pub shuffle: bool,
    pub settings: DockMenuSettings,
    pub labels: DockMenuLabels,
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

    #[test]
    fn dock_settings_defaults_fall_within_their_menu_ranges() {
        let defaults = DockMenuSettings::default();
        assert!(CROSSFADE_DURATION_RANGE.contains(&defaults.crossfade_duration));
        assert!(PARALLEL_RANGE.contains(&defaults.max_concurrent_downloads));
    }

    #[test]
    fn dock_menu_state_deserializes_from_camel_case() {
        let json = r#"{"title":"T — A","isPlaying":true,"hasTrack":true,"shuffle":false,
            "settings":{"crossfadeEnabled":true,"crossfadeDuration":7,"maxConcurrentDownloads":1},
            "labels":{"play":"Play","pause":"Pause","next":"Next","previous":"Previous","shuffle":"Shuffle","notPlaying":"Not Playing",
            "settingsMenu":"Settings","crossfade":"Crossfade","crossfadeDuration":"Crossfade duration",
            "crossfadeSeconds":["1s","2s","3s","4s","5s","6s","7s","8s","9s","10s","11s","12s"],
            "parallelDownloads":"Parallel downloads","sequential":"Sequential"}}"#;
        let state: DockMenuState = serde_json::from_str(json).unwrap();
        assert_eq!(
            state,
            DockMenuState {
                title: Some("T — A".into()),
                is_playing: true,
                has_track: true,
                shuffle: false,
                settings: DockMenuSettings { crossfade_enabled: true, crossfade_duration: 7, max_concurrent_downloads: 1 },
                labels: DockMenuLabels::default(),
            }
        );
    }
}
