use serde::{Deserialize, Serialize};
use specta::Type;
use tokio::sync::watch;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "snake_case")]
pub enum RateLimitChoice {
    Retry,
    Stop,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DownloadRateLimitedEvent {
    pub track_id: String,
    pub track_title: String,
    pub reset_time: Option<String>,
}

pub struct ChoiceState<T: Clone + Send + Sync> {
    sender: watch::Sender<Option<T>>,
    receiver: watch::Receiver<Option<T>>,
}

impl<T: Clone + Send + Sync> ChoiceState<T> {
    pub fn new() -> Self {
        let (sender, receiver) = watch::channel(None);
        Self { sender, receiver }
    }

    pub fn subscribe(&self) -> watch::Receiver<Option<T>> {
        self.receiver.clone()
    }

    pub fn send_choice(&self, choice: T) {
        let _ = self.sender.send(Some(choice));
    }

    pub fn reset(&self) {
        let _ = self.sender.send(None);
    }
}

impl<T: Clone + Send + Sync> Default for ChoiceState<T> {
    fn default() -> Self {
        Self::new()
    }
}

pub struct RateLimitChoiceState {
    inner: ChoiceState<RateLimitChoice>,
}

impl RateLimitChoiceState {
    pub fn new() -> Self {
        Self {
            inner: ChoiceState::new(),
        }
    }

    pub fn subscribe(&self) -> watch::Receiver<Option<RateLimitChoice>> {
        self.inner.subscribe()
    }

    pub fn send_choice(&self, choice: RateLimitChoice) {
        self.inner.send_choice(choice);
    }

    pub fn reset(&self) {
        self.inner.reset();
    }
}

impl Default for RateLimitChoiceState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_limit_choice_serialize() {
        let choice = RateLimitChoice::Retry;
        let json = serde_json::to_string(&choice).unwrap();
        assert_eq!(json, "\"retry\"");

        let choice = RateLimitChoice::Stop;
        let json = serde_json::to_string(&choice).unwrap();
        assert_eq!(json, "\"stop\"");
    }

    #[test]
    fn test_rate_limit_event_serialize() {
        let event = DownloadRateLimitedEvent {
            track_id: "123".to_string(),
            track_title: "Test Track".to_string(),
            reset_time: Some("2026/03/05 14:00:00 +0000".to_string()),
        };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"trackId\":\"123\""));
        assert!(json.contains("\"trackTitle\":\"Test Track\""));
        assert!(json.contains("\"resetTime\""));
    }
}
