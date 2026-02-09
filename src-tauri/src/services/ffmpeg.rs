use tauri_plugin_shell::{process::CommandEvent, ShellExt};

use crate::models::error::FfmpegError;

fn bytes_to_string(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes).to_string()
}

/// Get the FFmpeg version.
pub async fn get_version<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> Result<String, FfmpegError> {
    let shell = app.shell();
    let (mut rx, _child) = shell
        .sidecar("ffmpeg")
        .map_err(|_| FfmpegError::BinaryNotFound)?
        .args(["-version"])
        .spawn()
        .map_err(|_| FfmpegError::BinaryNotFound)?;

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
                    return Err(FfmpegError::BinaryNotFound);
                }
            }
            _ => {}
        }
    }

    if version.is_empty() {
        return Err(FfmpegError::BinaryNotFound);
    }

    Ok(version)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bytes_to_string_valid_utf8() {
        let bytes = b"ffmpeg version 6.1";
        assert_eq!(bytes_to_string(bytes), "ffmpeg version 6.1");
    }

    #[test]
    fn test_bytes_to_string_with_newline() {
        let bytes = b"progress=continue\n";
        assert_eq!(bytes_to_string(bytes), "progress=continue\n");
    }
}
