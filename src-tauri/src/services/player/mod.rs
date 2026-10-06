pub mod crossfade;
pub mod crypto;
pub mod decoder;
pub mod dock_menu;
#[cfg(target_os = "macos")]
mod dock_menu_macos;
pub mod emitter;
pub mod engine;
#[cfg(test)]
mod engine_tests;
pub mod feed;
pub mod fetch;
pub mod head;
pub mod hls;
pub mod media_controls;
pub mod media_state;
pub mod messages;
pub mod output;
pub mod part_store;
pub mod pipeline;
pub mod playlist;
pub mod ports;
pub mod preload;
pub mod progressive;
pub mod runner;
pub mod segment_cache;
pub mod watchdog;

use std::sync::mpsc::{self, Sender};

use crate::models::error::PlayerError;
use messages::EngineMsg;

pub struct PlayerHandle {
    tx: Sender<EngineMsg>,
}

impl PlayerHandle {
    pub fn spawn(app: tauri::AppHandle) -> Self {
        let (tx, rx) = mpsc::channel();
        runner::start(app, tx.clone(), rx);
        Self { tx }
    }

    pub fn send(&self, msg: EngineMsg) -> Result<(), PlayerError> {
        self.tx.send(msg).map_err(|_| {
            log::error!("[player] Engine thread is gone; command dropped");
            PlayerError::EngineUnavailable
        })
    }
}

pub(crate) fn url_prefix(url: &str) -> &str {
    match url.char_indices().nth(80) {
        Some((index, _)) => &url[..index],
        None => url,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn url_prefix_truncates_to_80_chars() {
        let long = "a".repeat(200);
        assert_eq!(url_prefix(&long).len(), 80);
        assert_eq!(url_prefix("https://short"), "https://short");
    }

    #[test]
    fn send_fails_when_engine_thread_is_gone() {
        let (tx, rx) = mpsc::channel();
        drop(rx);
        let handle = PlayerHandle { tx };
        assert_eq!(handle.send(EngineMsg::Play), Err(PlayerError::EngineUnavailable));
    }
}
