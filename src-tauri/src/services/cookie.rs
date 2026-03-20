use log::{info, warn};

/// Result of a browser cookie scan.
#[derive(Debug, Clone)]
pub struct BrowserCookie {
    pub value: String,
    pub browser: String,
    /// DataDome client ID cookie for bot protection bypass
    pub datadome: Option<String>,
}

/// Scan browsers for the SoundCloud `oauth_token` cookie.
///
/// Firefox first (no Keychain/admin friction on macOS), then Chromium browsers.
/// Safari excluded (requires Full Disk Access).
///
/// Returns `Some(BrowserCookie)` if a non-empty token is found, `None` otherwise.
pub fn scan_browser_cookies() -> Option<BrowserCookie> {
    let domains = Some(vec![
        "soundcloud.com".to_string(),
        ".soundcloud.com".to_string(),
    ]);

    // Each entry: (display name, extraction function)
    // rookie browser functions all share the signature:
    //   fn(Option<Vec<String>>) -> eyre::Result<Vec<rookie::enums::Cookie>>
    let mut browsers: Vec<(
        &str,
        fn(Option<Vec<String>>) -> rookie::Result<Vec<rookie::enums::Cookie>>,
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
                // Filter to oauth_token cookies only, preferring the main
                // soundcloud.com domain over subdomains (e.g. artists.soundcloud.com)
                let token_cookie = cookies
                    .iter()
                    .filter(|c| c.name == "oauth_token" && !c.value.is_empty())
                    .min_by_key(|c| {
                        // Exact "soundcloud.com" or ".soundcloud.com" gets priority 0,
                        // subdomains get priority 1
                        let domain = c.domain.trim_start_matches('.');
                        if domain == "soundcloud.com" { 0 } else { 1 }
                    });

                if let Some(token_cookie) = token_cookie {
                    info!("Found oauth_token in {} (domain: {})", name, token_cookie.domain);
                    // Also look for datadome cookie
                    let datadome = cookies
                        .iter()
                        .find(|c| c.name == "datadome" && !c.value.is_empty())
                        .map(|c| {
                            info!("Found datadome cookie in {}", name);
                            c.value.clone()
                        });
                    return Some(BrowserCookie {
                        value: token_cookie.value.clone(),
                        browser: name.to_string(),
                        datadome,
                    });
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
            datadome: Some("datadome_value".to_string()),
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
            datadome: None,
        };
        let debug_str = format!("{:?}", cookie);
        assert!(debug_str.contains("Chrome"));
        assert!(debug_str.contains("token"));
    }
}
