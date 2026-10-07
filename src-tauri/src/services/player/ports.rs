use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::Sender;
use std::sync::{Arc, Mutex};

use super::equalizer::EqualizerSettings;
use super::feed::Feed;
use super::messages::{EngineMsg, PipelineId};
use crate::models::error::PlayerError;

pub struct PipelineRequest {
    pub id: PipelineId,
    pub url: String,
    pub start_ms: u64,
    pub feed: Arc<Feed>,
    pub epoch: u64,
    pub notify: Sender<EngineMsg>,
}

pub trait Pipeline: Send {
    fn cancel(&self);
}

pub trait PipelineFactory: Send {
    fn start(&self, request: PipelineRequest) -> Box<dyn Pipeline>;
}

pub trait SlotSink {
    fn play(&self);
    fn pause(&self);
    fn set_volume(&self, volume: f32);
}

pub trait AudioOutput {
    fn ensure_open(&mut self) -> Result<(), PlayerError>;
    fn is_open(&self) -> bool;
    fn release(&mut self);
    fn create_sink(&mut self, feed: Arc<Feed>) -> Result<Box<dyn SlotSink>, PlayerError>;
    fn default_device_changed(&mut self) -> bool;
    fn set_equalizer(&mut self, settings: EqualizerSettings);
}

pub trait Close: Send + Sync {
    fn close(&self);
}

#[derive(Default)]
pub struct CancelScope {
    cancelled: AtomicBool,
    items: Mutex<Vec<Arc<dyn Close>>>,
}

impl CancelScope {
    pub fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::SeqCst)
    }

    pub fn register(&self, item: Arc<dyn Close>) {
        let mut items = self.items.lock().unwrap_or_else(|p| p.into_inner());
        if self.is_cancelled() {
            item.close();
            return;
        }
        items.push(item);
    }

    pub fn cancel(&self) {
        let items = {
            let mut guard = self.items.lock().unwrap_or_else(|p| p.into_inner());
            self.cancelled.store(true, Ordering::SeqCst);
            std::mem::take(&mut *guard)
        };
        log::debug!("[player::ports] cancel scope closing {} item(s)", items.len());
        for item in items {
            item.close();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::AtomicUsize;

    #[derive(Default)]
    struct Counter(AtomicUsize);
    impl Close for Counter {
        fn close(&self) {
            self.0.fetch_add(1, Ordering::SeqCst);
        }
    }

    #[test]
    fn cancel_closes_registered_items() {
        let scope = CancelScope::default();
        let item = Arc::new(Counter::default());
        scope.register(item.clone());
        assert!(!scope.is_cancelled());
        scope.cancel();
        assert!(scope.is_cancelled());
        assert_eq!(item.0.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn register_after_cancel_closes_immediately() {
        let scope = CancelScope::default();
        scope.cancel();
        let item = Arc::new(Counter::default());
        scope.register(item.clone());
        assert_eq!(item.0.load(Ordering::SeqCst), 1);
    }
}
