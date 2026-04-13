use serde::{Deserialize, Serialize};
use specta::Type;
use std::sync::atomic::{AtomicBool, Ordering};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "snake_case")]
pub enum AuthChoice {
    ReAuthenticated,
    ContinueStandard,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DownloadAuthNeededEvent {
    pub track_id: String,
    pub track_title: String,
}

pub struct AuthChoiceState {
    skip_auth: AtomicBool,
}

impl AuthChoiceState {
    pub fn new() -> Self {
        Self {
            skip_auth: AtomicBool::new(false),
        }
    }

    pub fn should_skip_auth(&self) -> bool {
        self.skip_auth.load(Ordering::SeqCst)
    }

    pub fn set_skip_auth(&self, skip: bool) {
        self.skip_auth.store(skip, Ordering::SeqCst);
    }
}

impl Default for AuthChoiceState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auth_choice_serialize() {
        let choice = AuthChoice::ReAuthenticated;
        let json = serde_json::to_string(&choice).unwrap();
        assert_eq!(json, "\"re_authenticated\"");

        let choice = AuthChoice::ContinueStandard;
        let json = serde_json::to_string(&choice).unwrap();
        assert_eq!(json, "\"continue_standard\"");
    }

    #[test]
    fn test_auth_choice_state_new() {
        let state = AuthChoiceState::new();
        assert!(!state.should_skip_auth());
    }

    #[test]
    fn test_auth_choice_state_skip_auth() {
        let state = AuthChoiceState::new();
        state.set_skip_auth(true);
        assert!(state.should_skip_auth());
        state.set_skip_auth(false);
        assert!(!state.should_skip_auth());
    }

    #[test]
    fn test_download_auth_needed_event_serialize() {
        let event = DownloadAuthNeededEvent {
            track_id: "123".to_string(),
            track_title: "Test Track".to_string(),
        };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"trackId\":\"123\""));
        assert!(json.contains("\"trackTitle\":\"Test Track\""));
    }
}
