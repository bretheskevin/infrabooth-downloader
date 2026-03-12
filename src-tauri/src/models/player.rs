use serde::{Deserialize, Serialize};
use specta::Type;

/// A track in the playback queue.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PlaybackItem {
    pub track_id: u64,
    pub track_url: String,
    pub title: String,
    pub artist: String,
    pub artwork_url: Option<String>,
    pub duration_ms: u64,
}

/// Playback state enum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum PlaybackState {
    Stopped,
    Loading,
    Playing,
    Paused,
}

impl Default for PlaybackState {
    fn default() -> Self {
        Self::Stopped
    }
}

/// Full state snapshot returned by `player_get_state`.
#[derive(Debug, Clone, Serialize, Type)]
pub struct PlayerStateSnapshot {
    pub state: PlaybackState,
    pub current_track: Option<PlaybackItem>,
    pub queue: Vec<PlaybackItem>,
    pub cursor: usize,
    pub position_ms: u64,
    pub duration_ms: u64,
    pub volume: f32,
}

/// Commands sent from Tauri command handlers to the audio thread.
#[derive(Debug)]
pub enum PlayerCommand {
    Play {
        queue: Vec<PlaybackItem>,
        index: usize,
    },
    Pause,
    Resume,
    Stop,
    Seek {
        position_ms: u64,
    },
    SetVolume {
        volume: f32,
    },
    Next,
    Previous,
    Reorder {
        from_index: usize,
        to_index: usize,
    },
    Remove {
        index: usize,
    },
}

/// Event payloads emitted to the frontend.
#[derive(Debug, Clone, Serialize, Type)]
pub struct PlayerStateChangedPayload {
    pub state: PlaybackState,
    pub track_id: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Type)]
pub struct PlayerProgressPayload {
    pub position_ms: u64,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Type)]
pub struct PlayerTrackChangedPayload {
    pub track_id: u64,
    pub cursor: usize,
    pub queue_length: usize,
}

#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum QueueAction {
    Reorder,
    Remove,
}

#[derive(Debug, Clone, Serialize, Type)]
pub struct PlayerQueueUpdatedPayload {
    pub action: QueueAction,
    pub cursor: usize,
    pub queue_length: usize,
}

#[derive(Debug, Clone, Serialize, Type)]
pub struct PlayerErrorPayload {
    pub track_id: Option<u64>,
    pub message: String,
}

/// Player-specific error type.
#[derive(Debug, thiserror::Error)]
pub enum PlayerError {
    #[error("Stream resolution failed: {0}")]
    StreamResolution(String),
    #[error("Playback error: {0}")]
    Playback(String),
    #[error("Invalid operation: {0}")]
    InvalidOperation(String),
    #[error("Audio thread unavailable")]
    AudioThreadUnavailable,
}

impl crate::models::error::HasErrorCode for PlayerError {
    fn code(&self) -> &'static str {
        match self {
            PlayerError::StreamResolution(_) => "STREAM_RESOLUTION",
            PlayerError::Playback(_) => "PLAYBACK_ERROR",
            PlayerError::InvalidOperation(_) => "INVALID_OPERATION",
            PlayerError::AudioThreadUnavailable => "AUDIO_THREAD_UNAVAILABLE",
        }
    }
}
