use sha2::{Digest, Sha256};
use std::io::Read;
use std::path::{Path, PathBuf};
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

pub fn bytes_to_string(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes).to_string()
}

pub async fn get_sidecar_version<R: tauri::Runtime, E>(
    app: &tauri::AppHandle<R>, sidecar_name: &str, version_arg: &str, not_found_err: impl Fn() -> E,
) -> Result<String, E> {
    let shell = app.shell();
    let (mut rx, _child) = shell.sidecar(sidecar_name).map_err(|_| not_found_err())?.args([version_arg]).spawn().map_err(|_| not_found_err())?;

    let mut version = String::new();

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
                let line = bytes_to_string(&line_bytes);
                if version.is_empty() {
                    version = line.trim().to_string();
                }
            }
            CommandEvent::Terminated(payload) => {
                if payload.code != Some(0) {
                    return Err(not_found_err());
                }
            }
            _ => {}
        }
    }

    if version.is_empty() {
        return Err(not_found_err());
    }

    Ok(version)
}

pub fn resolve_sidecar_path(binary_name: &str) -> Result<PathBuf, std::io::Error> {
    let exe_dir =
        std::env::current_exe()?.parent().ok_or_else(|| std::io::Error::new(std::io::ErrorKind::Other, "Cannot resolve executable directory"))?.to_path_buf();
    Ok(exe_dir.join(binary_name))
}

pub fn compute_sha256(path: &Path) -> Result<String, std::io::Error> {
    let mut file = std::fs::File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];

    loop {
        let n = file.read(&mut buffer)?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
    }

    Ok(format!("{:x}", hasher.finalize()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bytes_to_string_valid_utf8() {
        let bytes = b"Hello, World!";
        assert_eq!(bytes_to_string(bytes), "Hello, World!");
    }

    #[test]
    fn test_bytes_to_string_with_newline() {
        let bytes = b"progress=continue\n";
        assert_eq!(bytes_to_string(bytes), "progress=continue\n");
    }
}
