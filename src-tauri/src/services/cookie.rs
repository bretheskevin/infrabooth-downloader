use log::{info, warn};

/// Result of a browser cookie scan.
#[derive(Debug, Clone)]
pub struct BrowserCookie {
    pub value: String,
    pub browser: String,
}

/// Scan browsers for the SoundCloud `oauth_token` cookie.
///
/// Firefox first (no Keychain/admin friction on macOS), then Chromium browsers.
/// Safari excluded (requires Full Disk Access).
///
/// Returns `Some(BrowserCookie)` if a non-empty token is found, `None` otherwise.
pub fn scan_browser_cookies() -> Option<BrowserCookie> {
    let domains = Some(vec![".soundcloud.com".to_string()]);

    // Each entry: (display name, extraction function)
    // rookie browser functions all share the signature:
    //   fn(Option<Vec<String>>) -> eyre::Result<Vec<rookie::Cookie>>
    let mut browsers: Vec<(
        &str,
        fn(Option<Vec<String>>) -> rookie::Result<Vec<rookie::Cookie>>,
    )> = vec![
        ("Firefox", rookie::firefox),
        ("Chrome", rookie::chrome),
        ("Brave", rookie::brave),
        ("Edge", rookie::edge),
        ("Opera", rookie::opera),
        ("Vivaldi", rookie::vivaldi),
    ];

    #[cfg(target_os = "macos")]
    browsers.push(("Arc", rookie::arc));

    for (name, extract_fn) in &browsers {
        match extract_fn(domains.clone()) {
            Ok(cookies) => {
                if let Some(token_cookie) = cookies.iter().find(|c| c.name == "oauth_token") {
                    if !token_cookie.value.is_empty() {
                        info!("Found oauth_token in {}", name);
                        return Some(BrowserCookie {
                            value: token_cookie.value.clone(),
                            browser: name.to_string(),
                        });
                    }
                }
            }
            Err(e) => {
                warn!("Failed to read cookies from {}: {}", name, e);
            }
        }
    }

    info!("No SoundCloud oauth_token found in any browser");
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_browser_cookie_clone() {
        let cookie = BrowserCookie {
            value: "test_token".to_string(),
            browser: "Firefox".to_string(),
        };
        let cloned = cookie.clone();
        assert_eq!(cloned.value, "test_token");
        assert_eq!(cloned.browser, "Firefox");
    }

    #[test]
    fn test_browser_cookie_debug() {
        let cookie = BrowserCookie {
            value: "token".to_string(),
            browser: "Chrome".to_string(),
        };
        let debug_str = format!("{:?}", cookie);
        assert!(debug_str.contains("Chrome"));
        assert!(debug_str.contains("token"));
    }
}
