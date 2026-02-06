use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use url::Url;

const AUTH_CALLBACK_EVENT: &str = "auth-callback";
const DEV_SERVER_PORT: u16 = 19878;

const SUCCESS_HTML: &str = r#"<!DOCTYPE html>
<html>
<head><title>Authentication Successful</title></head>
<body style="font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1a1a2e; color: #e0e0e0;">
<div style="text-align: center;">
<h1 style="color: #4ade80;">&#10003; Signed in successfully</h1>
<p>You can close this tab and return to InfraBooth Downloader.</p>
</div>
</body>
</html>"#;

const ERROR_HTML: &str = r#"<!DOCTYPE html>
<html>
<head><title>Authentication Failed</title></head>
<body style="font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1a1a2e; color: #e0e0e0;">
<div style="text-align: center;">
<h1 style="color: #f87171;">&#10007; Authentication failed</h1>
<p>No authorization code received. Please try again.</p>
</div>
</body>
</html>"#;

pub async fn start_dev_callback_server(app: AppHandle) -> Result<u16, String> {
    let listener = TcpListener::bind(format!("127.0.0.1:{}", DEV_SERVER_PORT))
        .await
        .map_err(|e| format!("Failed to bind dev callback server on port {}: {}", DEV_SERVER_PORT, e))?;

    let port = DEV_SERVER_PORT;

    log::info!("[dev-server] Started OAuth callback server on port {}", port);

    tokio::spawn(async move {
        match listener.accept().await {
            Ok((mut stream, _)) => {
                let mut buf = vec![0u8; 4096];
                let n = stream.read(&mut buf).await.unwrap_or(0);
                let request = String::from_utf8_lossy(&buf[..n]);

                let code = extract_code_from_request(&request);
                let (status, html) = if code.is_some() {
                    log::info!("[dev-server] Extracted auth code from callback");
                    ("200 OK", SUCCESS_HTML)
                } else {
                    log::warn!("[dev-server] No auth code found in callback request");
                    ("400 Bad Request", ERROR_HTML)
                };

                let response = format!(
                    "HTTP/1.1 {}\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    status,
                    html.len(),
                    html
                );
                let _ = stream.write_all(response.as_bytes()).await;
                let _ = stream.shutdown().await;

                if let Some(code) = code {
                    match app.emit(AUTH_CALLBACK_EVENT, code) {
                        Ok(_) => log::info!("[dev-server] Emitted auth-callback event"),
                        Err(e) => log::error!("[dev-server] Failed to emit auth-callback: {}", e),
                    }
                }
            }
            Err(e) => {
                log::error!("[dev-server] Failed to accept connection: {}", e);
            }
        }
        log::info!("[dev-server] Callback server shut down");
    });

    Ok(port)
}

fn extract_code_from_request(request: &str) -> Option<String> {
    let path = request.lines().next()?.split_whitespace().nth(1)?;
    let full_url = format!("http://localhost{}", path);
    let url = Url::parse(&full_url).ok()?;
    url.query_pairs()
        .find(|(k, _)| k == "code")
        .map(|(_, v)| v.to_string())
        .filter(|v| !v.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_code_from_request() {
        let request = "GET /callback?code=abc123 HTTP/1.1\r\nHost: localhost\r\n\r\n";
        assert_eq!(
            extract_code_from_request(request),
            Some("abc123".to_string())
        );
    }

    #[test]
    fn test_extract_code_with_extra_params() {
        let request = "GET /callback?code=xyz789&state=foo HTTP/1.1\r\nHost: localhost\r\n\r\n";
        assert_eq!(
            extract_code_from_request(request),
            Some("xyz789".to_string())
        );
    }

    #[test]
    fn test_extract_code_missing() {
        let request = "GET /callback?state=foo HTTP/1.1\r\nHost: localhost\r\n\r\n";
        assert_eq!(extract_code_from_request(request), None);
    }

    #[test]
    fn test_extract_code_empty() {
        let request = "GET /callback?code= HTTP/1.1\r\nHost: localhost\r\n\r\n";
        assert_eq!(extract_code_from_request(request), None);
    }
}
