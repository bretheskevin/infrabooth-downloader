use log::{info, warn};

pub const WARNING_APPBOUND_ENCRYPTION: &str = "appbound_encryption";

#[derive(Clone)]
pub struct BrowserCookie {
    pub value: String,
    pub browser: String,
    pub datadome: Option<String>,
}

impl std::fmt::Debug for BrowserCookie {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("BrowserCookie").field("value", &"[redacted]").field("browser", &self.browser).field("datadome", &self.datadome).finish()
    }
}

/// Result of scanning all browsers for cookies.
#[derive(Debug, Clone)]
pub struct CookieScanResult {
    pub cookie: Option<BrowserCookie>,
    /// Datadome cookie found in any browser, even without an oauth_token.
    /// Required by SoundCloud's API for all requests (authenticated or not).
    pub datadome: Option<String>,
    /// A warning key for the frontend (e.g. "appbound_encryption") when cookies
    /// could not be read due to a platform-specific restriction.
    pub warning: Option<String>,
}

pub fn scan_browser_cookies() -> CookieScanResult {
    let domains = Some(vec!["soundcloud.com".to_string(), ".soundcloud.com".to_string()]);

    // Each entry: (display name, extraction function)
    // rookie browser functions all share the signature:
    //   fn(Option<Vec<String>>) -> eyre::Result<Vec<rookie::enums::Cookie>>
    let mut browsers: Vec<(&str, fn(Option<Vec<String>>) -> rookie::Result<Vec<rookie::enums::Cookie>>)> = vec![
        ("Firefox", rookie::firefox),
        ("Chrome", rookie::chrome),
        ("Brave", rookie::brave),
        ("Edge", rookie::edge),
        ("Opera", rookie::opera),
        ("Vivaldi", rookie::vivaldi),
    ];

    #[cfg(target_os = "macos")]
    browsers.push(("Arc", rookie::arc));

    let mut appbound_hit = false;
    let mut standalone_datadome: Option<String> = None;

    for (name, extract_fn) in &browsers {
        match extract_fn(domains.clone()) {
            Ok(cookies) => {
                if standalone_datadome.is_none() {
                    if let Some(dd) = cookies.iter().find(|c| c.name == "datadome" && !c.value.is_empty()) {
                        info!("Found datadome cookie in {}", name);
                        standalone_datadome = Some(dd.value.clone());
                    }
                }

                // Filter to oauth_token cookies only, preferring the main
                // soundcloud.com domain over subdomains (e.g. artists.soundcloud.com)
                let token_cookie = cookies.iter().filter(|c| c.name == "oauth_token" && !c.value.is_empty()).min_by_key(|c| {
                    // Exact "soundcloud.com" or ".soundcloud.com" gets priority 0,
                    // subdomains get priority 1
                    let domain = c.domain.trim_start_matches('.');
                    if domain == "soundcloud.com" {
                        0
                    } else {
                        1
                    }
                });

                if let Some(token_cookie) = token_cookie {
                    info!("Found oauth_token in {} (domain: {})", name, token_cookie.domain);
                    return CookieScanResult {
                        cookie: Some(BrowserCookie { value: token_cookie.value.clone(), browser: name.to_string(), datadome: standalone_datadome.clone() }),
                        datadome: standalone_datadome,
                        warning: None,
                    };
                }

                // Detect cookies with names but empty values (Chrome App-Bound Encryption on Windows)
                let empty_token_count = cookies.iter().filter(|c| c.name == "oauth_token" && c.value.is_empty()).count();
                if empty_token_count > 0 {
                    warn!(
                        "Found {} oauth_token cookie(s) in {} but value is empty — \
                         Chromium browsers (v130+) use App-Bound Encryption on Windows. \
                         Use Firefox to sign in instead",
                        empty_token_count, name
                    );
                    appbound_hit = true;
                }
            }
            Err(e) => {
                let err_msg = e.to_string();
                warn!("Failed to read cookies from {}: {}", name, err_msg);
                let lower = err_msg.to_lowercase();
                if lower.contains("appbound") || lower.contains("app-bound") || lower.contains("app_bound") {
                    appbound_hit = true;
                }
            }
        }
    }

    info!("No SoundCloud oauth_token found in any browser");
    CookieScanResult { cookie: None, datadome: standalone_datadome, warning: if appbound_hit { Some(WARNING_APPBOUND_ENCRYPTION.to_string()) } else { None } }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_browser_cookie_clone() {
        let cookie = BrowserCookie { value: "test_token".to_string(), browser: "Firefox".to_string(), datadome: Some("datadome_value".to_string()) };
        let cloned = cookie.clone();
        assert_eq!(cloned.value, "test_token");
        assert_eq!(cloned.browser, "Firefox");
    }

    #[test]
    fn test_browser_cookie_debug_redacts_value() {
        let cookie = BrowserCookie { value: "secret_oauth_token".to_string(), browser: "Chrome".to_string(), datadome: None };
        let debug_str = format!("{:?}", cookie);
        assert!(debug_str.contains("Chrome"));
        assert!(debug_str.contains("[redacted]"));
        assert!(!debug_str.contains("secret_oauth_token"));
    }
}
