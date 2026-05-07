use tokio::sync::OnceCell;

use crate::models::error::FfmpegError;
use crate::services::sidecar::{compute_sha256, get_sidecar_version, resolve_sidecar_path};

const CHECKSUMS: &str = include_str!("../../binaries/checksums.txt");

#[cfg(all(target_arch = "aarch64", target_os = "macos"))]
const BINARY_NAME: &str = "ffmpeg-aarch64-apple-darwin";

#[cfg(all(target_arch = "x86_64", target_os = "macos"))]
const BINARY_NAME: &str = "ffmpeg-x86_64-apple-darwin";

#[cfg(all(target_arch = "x86_64", target_os = "windows", target_env = "msvc"))]
const BINARY_NAME: &str = "ffmpeg-x86_64-pc-windows-msvc.exe";

static INTEGRITY_VERIFIED: OnceCell<bool> = OnceCell::const_new();

fn expected_hash() -> Option<&'static str> {
    CHECKSUMS.lines().find_map(|line| {
        let (hash, name) = line.split_once("  ")?;
        (name == BINARY_NAME).then_some(hash)
    })
}

fn do_verify() -> bool {
    let expected = match expected_hash() {
        Some(h) => h,
        None => {
            log::error!("[ffmpeg] No expected hash found for {}", BINARY_NAME);
            return false;
        }
    };

    let path = match resolve_sidecar_path(BINARY_NAME) {
        Ok(p) => p,
        Err(e) => {
            log::error!("[ffmpeg] Failed to resolve sidecar path: {}", e);
            return false;
        }
    };

    let actual = match compute_sha256(&path) {
        Ok(h) => h,
        Err(e) => {
            log::error!("[ffmpeg] Failed to compute hash for {:?}: {}", path, e);
            return false;
        }
    };

    if actual != expected {
        log::error!("[ffmpeg] Integrity check FAILED for {:?} — expected {} but got {}", path, expected, actual);
        return false;
    }

    log::info!("[ffmpeg] Integrity check passed for {:?}", path);
    true
}

pub async fn verify_integrity() -> Result<(), FfmpegError> {
    let passed = *INTEGRITY_VERIFIED.get_or_init(|| async { tokio::task::spawn_blocking(do_verify).await.unwrap_or(false) }).await;
    if passed {
        Ok(())
    } else {
        Err(FfmpegError::IntegrityCheckFailed)
    }
}

pub async fn get_version<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<String, FfmpegError> {
    verify_integrity().await?;
    get_sidecar_version(app, "ffmpeg", "-version", || FfmpegError::BinaryNotFound).await
}
