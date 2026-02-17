use serde::{Deserialize, Serialize};
use specta::Type;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::sync::{watch, Mutex};

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
    choice_sender: watch::Sender<Option<AuthChoice>>,
    choice_receiver: watch::Receiver<Option<AuthChoice>>,
    skip_auth: AtomicBool,
    pending: Mutex<bool>,
}

impl AuthChoiceState {
    pub fn new() -> Self {
        let (sender, receiver) = watch::channel(None);
        Self {
            choice_sender: sender,
            choice_receiver: receiver,
            skip_auth: AtomicBool::new(false),
            pending: Mutex::new(false),
        }
    }

    pub fn subscribe(&self) -> watch::Receiver<Option<AuthChoice>> {
        self.choice_receiver.clone()
    }

    pub fn should_skip_auth(&self) -> bool {
        self.skip_auth.load(Ordering::SeqCst)
    }

    pub fn set_skip_auth(&self, skip: bool) {
        self.skip_auth.store(skip, Ordering::SeqCst);
    }

    pub async fn set_pending(&self, pending: bool) {
        let mut guard = self.pending.lock().await;
        *guard = pending;
    }

    pub async fn is_pending(&self) -> bool {
        let guard = self.pending.lock().await;
        *guard
    }

    pub fn send_choice(&self, choice: AuthChoice) {
        let _ = self.choice_sender.send(Some(choice));
    }

    pub fn reset(&self) {
        let _ = self.choice_sender.send(None);
        self.skip_auth.store(false, Ordering::SeqCst);
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
