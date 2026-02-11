use tauri_plugin_shell::{process::CommandEvent, ShellExt};

pub fn bytes_to_string(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes).to_string()
}

pub async fn get_sidecar_version<R: tauri::Runtime, E>(
    app: &tauri::AppHandle<R>,
    sidecar_name: &str,
    version_arg: &str,
    not_found_err: impl Fn() -> E,
) -> Result<String, E> {
    let shell = app.shell();
    let (mut rx, _child) = shell
        .sidecar(sidecar_name)
        .map_err(|_| not_found_err())?
        .args([version_arg])
        .spawn()
        .map_err(|_| not_found_err())?;

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
