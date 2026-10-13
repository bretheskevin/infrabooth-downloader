use std::io;
use std::path::{Path, PathBuf};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tokio::net::TcpListener;

use crate::services::private_file;

const LINK_FILE_NAME: &str = "remote-link.json";
const ANY_PORT: u16 = 0;
const BIND_ATTEMPTS: u32 = 10;
const BIND_RETRY_DELAY: Duration = Duration::from_millis(100);

#[derive(Clone, PartialEq, Serialize, Deserialize)]
pub struct RemoteLink {
    pub port: u16,
    pub token: String,
}

impl std::fmt::Debug for RemoteLink {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("RemoteLink").field("port", &self.port).field("token", &"<redacted>").finish()
    }
}

impl RemoteLink {
    pub fn fresh() -> Self {
        Self { port: ANY_PORT, token: generate_token() }
    }
}

pub(crate) fn generate_token() -> String {
    use rand::Rng;
    let mut bytes = [0u8; 16];
    rand::rng().fill_bytes(&mut bytes);
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

pub fn save(dir: &Path, link: &RemoteLink) -> io::Result<PathBuf> {
    let json = serde_json::to_vec(link).map_err(io::Error::other)?;
    private_file::write_atomic_private(dir, LINK_FILE_NAME, &json)
}

fn load(dir: &Path) -> Option<RemoteLink> {
    let path = dir.join(LINK_FILE_NAME);
    let raw = match std::fs::read_to_string(&path) {
        Ok(raw) => raw,
        Err(e) if e.kind() == io::ErrorKind::NotFound => {
            log::info!("[remote] no saved link at {}, generating a new one", path.display());
            return None;
        }
        Err(e) => {
            log::error!("[remote] saved link unreadable at {}: {}", path.display(), private_file::describe_io_error(&e));
            return None;
        }
    };
    match serde_json::from_str::<RemoteLink>(&raw) {
        Ok(link) if !link.token.is_empty() => {
            log::info!("[remote] loaded saved link from {} (port {})", path.display(), link.port);
            Some(link)
        }
        Ok(_) => {
            log::warn!("[remote] saved link at {} has an empty token, generating a new one", path.display());
            None
        }
        Err(e) => {
            log::warn!("[remote] saved link at {} is corrupt, generating a new one: {e}", path.display());
            None
        }
    }
}

pub fn load_or_fresh(dir: &Path) -> RemoteLink {
    load(dir).unwrap_or_else(RemoteLink::fresh)
}

async fn bind_with_retry(port: u16, attempts: u32, delay: Duration) -> io::Result<TcpListener> {
    let mut attempt = 1;
    loop {
        match TcpListener::bind(("0.0.0.0", port)).await {
            Err(e) if e.kind() == io::ErrorKind::AddrInUse && attempt < attempts => {
                log::debug!("[remote] port {port} busy (attempt {attempt}/{attempts}), retrying");
                attempt += 1;
                tokio::time::sleep(delay).await;
            }
            result => return result,
        }
    }
}

async fn bind_preferring(port: u16, attempts: u32, delay: Duration) -> io::Result<TcpListener> {
    if port != ANY_PORT {
        match bind_with_retry(port, attempts, delay).await {
            Ok(listener) => return Ok(listener),
            Err(e) => log::warn!("[remote] saved port {port} unavailable, falling back to a random port: {}", private_file::describe_io_error(&e)),
        }
    }
    bind_with_retry(ANY_PORT, 1, delay).await
}

pub async fn bind_lan(port: u16) -> io::Result<TcpListener> {
    bind_preferring(port, BIND_ATTEMPTS, BIND_RETRY_DELAY).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    type TestResult<T = ()> = Result<T, Box<dyn std::error::Error>>;

    const NO_DELAY: Duration = Duration::from_millis(1);

    #[test]
    fn save_then_load_round_trips() -> TestResult {
        let dir = tempdir()?;
        let link = RemoteLink { port: 4242, token: "secret".to_string() };
        save(dir.path(), &link)?;
        assert_eq!(load_or_fresh(dir.path()), link);
        Ok(())
    }

    #[test]
    fn missing_file_yields_fresh_link_with_random_port() -> TestResult {
        let dir = tempdir()?;
        let link = load_or_fresh(dir.path());
        assert_eq!(link.port, ANY_PORT);
        assert_eq!(link.token.len(), 32);
        Ok(())
    }

    #[test]
    fn corrupt_file_yields_fresh_link() -> TestResult {
        let dir = tempdir()?;
        std::fs::write(dir.path().join(LINK_FILE_NAME), "{not json")?;
        let link = load_or_fresh(dir.path());
        assert_eq!(link.port, ANY_PORT);
        assert_eq!(link.token.len(), 32);
        Ok(())
    }

    #[test]
    fn empty_token_is_rejected() -> TestResult {
        let dir = tempdir()?;
        save(dir.path(), &RemoteLink { port: 4242, token: String::new() })?;
        assert_ne!(load_or_fresh(dir.path()).token, "");
        Ok(())
    }

    #[test]
    fn fresh_links_have_distinct_tokens() {
        assert_ne!(RemoteLink::fresh().token, RemoteLink::fresh().token);
    }

    #[test]
    fn saved_link_is_reused_across_loads() -> TestResult {
        let dir = tempdir()?;
        let first = load_or_fresh(dir.path());
        save(dir.path(), &RemoteLink { port: 5000, token: first.token.clone() })?;
        assert_eq!(load_or_fresh(dir.path()), load_or_fresh(dir.path()));
        assert_eq!(load_or_fresh(dir.path()).token, first.token);
        Ok(())
    }

    #[tokio::test]
    async fn binds_the_preferred_port_when_free() -> TestResult {
        let probe = TcpListener::bind(("0.0.0.0", 0)).await?;
        let free_port = probe.local_addr()?.port();
        drop(probe);
        let listener = bind_preferring(free_port, 1, NO_DELAY).await?;
        assert_eq!(listener.local_addr()?.port(), free_port);
        Ok(())
    }

    #[tokio::test]
    async fn falls_back_to_a_random_port_when_preferred_is_busy() -> TestResult {
        let occupied = TcpListener::bind(("0.0.0.0", 0)).await?;
        let busy_port = occupied.local_addr()?.port();
        let listener = bind_preferring(busy_port, 2, NO_DELAY).await?;
        assert_ne!(listener.local_addr()?.port(), busy_port);
        Ok(())
    }

    #[tokio::test]
    async fn retries_until_the_port_is_released() -> TestResult {
        let occupied = TcpListener::bind(("0.0.0.0", 0)).await?;
        let port = occupied.local_addr()?.port();
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(30)).await;
            drop(occupied);
        });
        let listener = bind_preferring(port, 50, Duration::from_millis(10)).await?;
        assert_eq!(listener.local_addr()?.port(), port);
        Ok(())
    }
}
