use std::any::Any;
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::sync::mpsc::{Receiver, RecvTimeoutError, Sender};
use std::sync::Arc;
use std::time::Instant;

use super::emitter::TauriEventSink;
use super::engine::{Engine, TICK};
use super::messages::EngineMsg;
use super::output::RodioOutput;
use super::pipeline::StreamPipelineFactory;
use super::preload;
use super::segment_cache::SegmentCache;

pub fn start(app: tauri::AppHandle, tx: Sender<EngineMsg>, rx: Receiver<EngineMsg>) {
    let spawned = std::thread::Builder::new().name("player-engine".into()).spawn(move || run(app, tx, rx));
    match spawned {
        Ok(_) => log::info!("[player::runner] Engine thread started"),
        Err(e) => log::error!("[player::runner] Failed to spawn engine thread: {} (kind={:?})", e, e.kind()),
    }
}

fn run(app: tauri::AppHandle, tx: Sender<EngineMsg>, rx: Receiver<EngineMsg>) {
    let cache = Arc::new(SegmentCache::default());
    let mut engine = Engine::new(Box::new(TauriEventSink::new(app)), Box::new(RodioOutput::default()), Box::new(StreamPipelineFactory::new(cache.clone())), tx);
    let mut last_tick = Instant::now();
    loop {
        match rx.recv_timeout(TICK.saturating_sub(last_tick.elapsed())) {
            Ok(msg) => dispatch(&mut engine, &cache, msg),
            Err(RecvTimeoutError::Timeout) => {}
            Err(RecvTimeoutError::Disconnected) => {
                log::info!("[player::runner] Command channel closed; engine thread exiting");
                return;
            }
        }
        if last_tick.elapsed() >= TICK {
            guarded(&mut engine, |e| e.tick(Instant::now()));
            last_tick = Instant::now();
        }
    }
}

fn dispatch(engine: &mut Engine, cache: &Arc<SegmentCache>, msg: EngineMsg) {
    match msg {
        EngineMsg::PreloadSegments { tracks } => {
            log::debug!("[player::runner] Intercepted PreloadSegments ({} tracks)", tracks.len());
            preload::spawn_preload_tracks(cache.clone(), tracks);
        }
        EngineMsg::PurgeCache { keep_track_ids } => {
            log::debug!("[player::runner] Intercepted PurgeCache (keep {} tracks)", keep_track_ids.len());
            preload::purge(cache, keep_track_ids);
        }
        other => guarded(engine, |e| e.handle(other, Instant::now())),
    }
}

pub(super) fn panic_message(payload: &(dyn Any + Send)) -> String {
    payload.downcast_ref::<&str>().map(|s| s.to_string()).or_else(|| payload.downcast_ref::<String>().cloned()).unwrap_or_else(|| "unknown panic".into())
}

fn guarded(engine: &mut Engine, f: impl FnOnce(&mut Engine)) {
    let Err(payload) = catch_unwind(AssertUnwindSafe(|| f(engine))) else {
        return;
    };
    log::error!("[player::runner] Engine panicked: {}; resetting engine", panic_message(payload.as_ref()));
    if catch_unwind(AssertUnwindSafe(|| engine.recover_from_panic(Instant::now()))).is_err() {
        log::error!("[player::runner] Engine recovery also panicked");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn panic_message_extracts_str_and_string() {
        let boxed: Box<dyn std::any::Any + Send> = Box::new("boom");
        assert_eq!(panic_message(boxed.as_ref()), "boom");
        let boxed: Box<dyn std::any::Any + Send> = Box::new(String::from("bang"));
        assert_eq!(panic_message(boxed.as_ref()), "bang");
        let boxed: Box<dyn std::any::Any + Send> = Box::new(5u8);
        assert_eq!(panic_message(boxed.as_ref()), "unknown panic");
    }
}
