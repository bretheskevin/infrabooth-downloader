use serde::Serialize;
use specta::Type;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum PlayerEngineState {
    Idle,
    Loading,
    Playing,
    Paused,
}

#[derive(Debug, Clone, PartialEq)]
pub enum PlayerEvent {
    StateChanged(PlayerEngineState),
    Progress { position_ms: u64, duration_ms: u64 },
    Ended,
    Error(String),
    FullyBuffered,
    CrossfadeComplete,
    UrlExpired { position_ms: u64 },
}

pub trait PlayerEventSink: Send {
    fn emit(&self, load_generation: u32, event: PlayerEvent);
}

pub struct TauriEventSink {
    app: tauri::AppHandle,
}

impl TauriEventSink {
    pub fn new(app: tauri::AppHandle) -> Self {
        Self { app }
    }
}

impl PlayerEventSink for TauriEventSink {
    fn emit(&self, load_generation: u32, event: PlayerEvent) {
        super::media_controls::on_player_event(&self.app, &event);
        crate::services::events::emit_player_event(&self.app, load_generation, event);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn engine_state_serializes_lowercase() {
        assert_eq!(serde_json::to_string(&PlayerEngineState::Playing).unwrap(), "\"playing\"");
        assert_eq!(serde_json::to_string(&PlayerEngineState::Idle).unwrap(), "\"idle\"");
    }
}
