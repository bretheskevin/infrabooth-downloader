/// HTTPS enforcement module for security.
/// Validates that external API requests use HTTPS to prevent downgrade attacks.
use url::Url;

/// Validates that a URL uses HTTPS protocol.
///
/// # Arguments
/// * `url_str` - The URL string to validate
///
/// # Returns
/// * `Ok(())` - If URL is HTTPS or localhost
/// * `Err(String)` - If URL is HTTP or invalid
pub fn validate_https(url_str: &str) -> Result<(), String> {
    match Url::parse(url_str) {
        Ok(url) => match url.scheme() {
            "https" => Ok(()),
            "http" => {
                if is_localhost(&url) {
                    Ok(())
                } else {
                    Err(format!("HTTP not allowed for external requests. URL: {}", url_str))
                }
            }
            "file" => Ok(()),
            other => Err(format!("Unsupported scheme: {}", other)),
        },
        Err(e) => Err(format!("Invalid URL: {}", e)),
    }
}

/// Checks if a URL points to localhost.
fn is_localhost(url: &Url) -> bool {
    if let Some(host) = url.host() {
        let host_str = host.to_string();
        host_str == "localhost" || host_str.starts_with("127.") || host_str == "[::1]"
    } else {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_https_valid() {
        assert!(validate_https("https://api.soundcloud.com/v2/me").is_ok());
    }

    #[test]
    fn test_http_external_invalid() {
        assert!(validate_https("http://api.soundcloud.com/v2/me").is_err());
    }

    #[test]
    fn test_http_localhost_valid() {
        assert!(validate_https("http://localhost:8000/api").is_ok());
        assert!(validate_https("http://127.0.0.1:8000/api").is_ok());
    }

    #[test]
    fn test_file_scheme_valid() {
        assert!(validate_https("file:///path/to/file").is_ok());
    }

    #[test]
    fn test_invalid_url() {
        assert!(validate_https("not a url").is_err());
    }
}
