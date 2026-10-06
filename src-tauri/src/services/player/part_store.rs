use std::collections::HashMap;
use std::hash::Hash;
use std::io;
use std::sync::{Arc, Condvar, Mutex, MutexGuard};
use std::time::Duration;

use tokio::sync::Notify;

use super::ports::Close;

const STORE_WAIT: Duration = Duration::from_millis(250);

#[derive(Clone, Copy)]
pub struct Retention<K> {
    pub keep: fn(part: &K, reading: &K) -> bool,
    pub only_on_change: bool,
}

struct Inner<K> {
    parts: HashMap<K, Arc<Vec<u8>>>,
    reading: K,
    failed: bool,
    closed: bool,
}

pub struct PartStore<K> {
    inner: Mutex<Inner<K>>,
    ready: Condvar,
    wake: Notify,
    label: &'static str,
    retention: Retention<K>,
}

impl<K: Copy + Eq + Hash + Send> PartStore<K> {
    pub fn new(label: &'static str, reading: K, retention: Retention<K>) -> Self {
        let inner = Inner { parts: HashMap::new(), reading, failed: false, closed: false };
        Self { inner: Mutex::new(inner), ready: Condvar::new(), wake: Notify::new(), label, retention }
    }

    fn lock(&self) -> MutexGuard<'_, Inner<K>> {
        self.inner.lock().unwrap_or_else(|p| p.into_inner())
    }

    pub fn insert(&self, key: K, bytes: Arc<Vec<u8>>) {
        self.lock().parts.insert(key, bytes);
        self.ready.notify_all();
    }

    #[cfg(test)]
    pub fn has(&self, key: K) -> bool {
        self.lock().parts.contains_key(&key)
    }

    pub fn fail(&self) {
        self.lock().failed = true;
        self.ready.notify_all();
    }

    pub fn reading(&self) -> K {
        self.lock().reading
    }

    pub fn set_reading(&self, key: K) {
        let notify = {
            let mut inner = self.lock();
            let changed = inner.reading != key;
            inner.reading = key;
            let apply = changed || !self.retention.only_on_change;
            if apply {
                let keep = self.retention.keep;
                inner.parts.retain(|part, _| keep(part, &key));
            }
            apply
        };
        if notify {
            self.wake.notify_one();
        }
    }

    pub fn first_missing(&self, keys: impl IntoIterator<Item = K>) -> Option<K> {
        let inner = self.lock();
        keys.into_iter().find(|key| !inner.parts.contains_key(key))
    }

    pub fn wait_for(&self, key: K) -> io::Result<Arc<Vec<u8>>> {
        let mut inner = self.lock();
        loop {
            if let Some(bytes) = inner.parts.get(&key) {
                return Ok(bytes.clone());
            }
            if inner.closed {
                return Err(io::Error::other(format!("{} store closed", self.label)));
            }
            if inner.failed {
                return Err(io::Error::other(format!("{} fetch failed", self.label)));
            }
            inner = match self.ready.wait_timeout(inner, STORE_WAIT) {
                Ok((guard, _)) => guard,
                Err(poisoned) => poisoned.into_inner().0,
            };
        }
    }

    pub async fn wait_wake(&self, timeout: Duration) {
        tokio::select! {
            _ = self.wake.notified() => {}
            _ = tokio::time::sleep(timeout) => {}
        }
    }
}

impl<K: Copy + Eq + Hash + Send> Close for PartStore<K> {
    fn close(&self) {
        self.lock().closed = true;
        self.ready.notify_all();
        self.wake.notify_one();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn part(bytes: &[u8]) -> Arc<Vec<u8>> {
        Arc::new(bytes.to_vec())
    }

    fn drop_below(part: &usize, reading: &usize) -> bool {
        part >= reading
    }

    fn store(reading: usize) -> PartStore<usize> {
        PartStore::new("test", reading, Retention { keep: drop_below, only_on_change: false })
    }

    #[test]
    fn set_reading_drops_parts_rejected_by_retention() {
        let store = store(0);
        store.insert(0, part(b"a"));
        store.insert(1, part(b"b"));
        store.insert(3, part(b"d"));
        store.set_reading(3);
        assert_eq!(store.reading(), 3);
        assert!(!store.has(0));
        assert!(!store.has(1));
        assert!(store.has(3));
    }

    #[test]
    fn only_on_change_skips_retention_when_reading_is_unchanged() {
        let store = PartStore::new("test", 2usize, Retention { keep: drop_below, only_on_change: true });
        store.insert(0, part(b"a"));
        store.set_reading(2);
        assert!(store.has(0));
        store.set_reading(3);
        assert!(!store.has(0));
    }

    #[test]
    fn retention_always_applies_when_not_only_on_change() {
        let store = store(2);
        store.insert(0, part(b"a"));
        store.set_reading(2);
        assert!(!store.has(0));
    }

    #[test]
    fn wait_for_errors_when_closed_or_failed() {
        let closed = store(0);
        closed.close();
        assert_eq!(closed.wait_for(0).unwrap_err().to_string(), "test store closed");
        let failed = store(0);
        failed.fail();
        assert_eq!(failed.wait_for(0).unwrap_err().to_string(), "test fetch failed");
    }

    #[test]
    fn wait_for_returns_part_inserted_by_another_thread() {
        let store = Arc::new(store(0));
        let writer = store.clone();
        let handle = std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(30));
            writer.insert(0, part(b"Z"));
        });
        assert_eq!(*store.wait_for(0).unwrap(), b"Z".to_vec());
        handle.join().unwrap();
    }

    #[test]
    fn first_missing_finds_gaps() {
        let store = store(0);
        store.insert(0, part(b"a"));
        store.insert(2, part(b"c"));
        assert_eq!(store.first_missing(0..4), Some(1));
        assert_eq!(store.first_missing(2..3), None);
    }
}
