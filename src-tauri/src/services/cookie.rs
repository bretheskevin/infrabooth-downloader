use log::{info, warn};
use std::path::{Path, PathBuf};

pub const WARNING_APPBOUND_ENCRYPTION: &str = "appbound_encryption";

/// A single browser cookie, flattened for replay into an in-app WebView.
#[derive(Clone)]
pub struct RawCookie {
    pub name: String,
    pub value: String,
    pub domain: String,
    pub path: String,
    pub secure: bool,
    pub http_only: bool,
}

impl std::fmt::Debug for RawCookie {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("RawCookie")
            .field("name", &self.name)
            .field("value", &"[redacted]")
            .field("domain", &self.domain)
            .field("path", &self.path)
            .field("secure", &self.secure)
            .field("http_only", &self.http_only)
            .finish()
    }
}

// ── Public profile types ──────────────────────────────────────────────────────

pub struct ProfileToken {
    pub key: String,
    pub browser: String,
    pub profile: String,
    pub oauth_token: String,
    pub datadome: Option<String>,
    pub soundcloud_cookie_count: usize,
}

impl std::fmt::Debug for ProfileToken {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ProfileToken")
            .field("key", &self.key)
            .field("browser", &self.browser)
            .field("profile", &self.profile)
            .field("oauth_token", &"[redacted]")
            .field("datadome", &"[redacted]")
            .field("soundcloud_cookie_count", &self.soundcloud_cookie_count)
            .finish()
    }
}

pub struct ProfileScan {
    pub profiles: Vec<ProfileToken>,
    pub standalone_datadome: Option<String>,
    pub warning: Option<String>,
}

// ── Internal types ────────────────────────────────────────────────────────────

struct CandidateProfile {
    browser: &'static str,
    browser_order: u8,
    label: String,
    cookie_db: PathBuf,
    key_path: Option<PathBuf>,
}

struct ProfileCookies {
    browser: &'static str,
    browser_order: u8,
    label: String,
    cookies: Vec<rookie::enums::Cookie>,
}

// ── Domain / cookie helpers ───────────────────────────────────────────────────

fn soundcloud_domains() -> Option<Vec<String>> {
    Some(vec!["soundcloud.com".to_string(), ".soundcloud.com".to_string()])
}

fn soundcloud_cookie_count(cookies: &[rookie::enums::Cookie]) -> usize {
    cookies
        .iter()
        .filter(|c| {
            let d = c.domain.trim_start_matches('.');
            d == "soundcloud.com" || d.ends_with(".soundcloud.com")
        })
        .count()
}

fn has_nonempty_oauth_token(cookies: &[rookie::enums::Cookie]) -> bool {
    cookies.iter().any(|c| c.name == "oauth_token" && !c.value.is_empty())
}

fn find_datadome(cookies: &[rookie::enums::Cookie]) -> Option<String> {
    cookies.iter().find(|c| c.name == "datadome" && !c.value.is_empty()).map(|c| c.value.clone())
}

fn find_best_oauth_token(cookies: &[rookie::enums::Cookie]) -> Option<&rookie::enums::Cookie> {
    // Prefer exact soundcloud.com over subdomains (e.g. artists.soundcloud.com)
    cookies.iter().filter(|c| c.name == "oauth_token" && !c.value.is_empty()).min_by_key(|c| {
        if c.domain.trim_start_matches('.') == "soundcloud.com" {
            0
        } else {
            1
        }
    })
}

// ── Profile selection (pure, testable) ───────────────────────────────────────

/// Among profiles that contain a non-empty oauth_token, return the one with the
/// most soundcloud.com cookies. Stable tiebreak: lower browser_order wins
/// (Firefox=0 before Chrome=1 before Brave=2, …).
fn select_best_profile(candidates: Vec<ProfileCookies>) -> Option<ProfileCookies> {
    candidates
        .into_iter()
        .filter(|p| has_nonempty_oauth_token(&p.cookies))
        .max_by(|a, b| soundcloud_cookie_count(&a.cookies).cmp(&soundcloud_cookie_count(&b.cookies)).then(b.browser_order.cmp(&a.browser_order)))
}

// ── Profile enumeration helpers ───────────────────────────────────────────────

fn chromium_cookie_db(profile_dir: &Path) -> Option<PathBuf> {
    let network = profile_dir.join("Network").join("Cookies");
    if network.exists() {
        return Some(network);
    }
    let direct = profile_dir.join("Cookies");
    if direct.exists() {
        Some(direct)
    } else {
        None
    }
}

fn chromium_profile_dirs(user_data: &Path) -> Vec<(String, PathBuf)> {
    let mut result = Vec::new();
    let default_dir = user_data.join("Default");
    if default_dir.is_dir() {
        result.push(("Default".to_string(), default_dir));
    }
    let Ok(entries) = std::fs::read_dir(user_data) else { return result };
    let mut profiles: Vec<_> =
        entries.flatten().filter(|e| e.file_name().to_string_lossy().starts_with("Profile ") && e.file_type().map(|t| t.is_dir()).unwrap_or(false)).collect();
    profiles.sort_by_key(|e| e.file_name());
    for entry in profiles {
        result.push((entry.file_name().to_string_lossy().into_owned(), entry.path()));
    }
    result
}

fn add_chromium_browser(candidates: &mut Vec<CandidateProfile>, browser: &'static str, order: u8, user_data: &Path, key_path: Option<PathBuf>) {
    for (label, profile_dir) in chromium_profile_dirs(user_data) {
        if let Some(cookie_db) = chromium_cookie_db(&profile_dir) {
            candidates.push(CandidateProfile { browser, browser_order: order, label, cookie_db, key_path: key_path.clone() });
        }
    }
}

fn add_firefox_profiles(candidates: &mut Vec<CandidateProfile>, order: u8, firefox_base: &Path) {
    let profiles_dir = firefox_base.join("Profiles");
    let Ok(entries) = std::fs::read_dir(&profiles_dir) else { return };
    for entry in entries.flatten() {
        if !entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
            continue;
        }
        let db = entry.path().join("cookies.sqlite");
        if db.exists() {
            candidates.push(CandidateProfile {
                browser: "Firefox",
                browser_order: order,
                label: entry.file_name().to_string_lossy().into_owned(),
                cookie_db: db,
                key_path: None,
            });
        }
    }
}

// ── Platform-specific profile enumeration ────────────────────────────────────

#[cfg(target_os = "macos")]
fn candidate_profiles() -> Vec<CandidateProfile> {
    let Some(data) = dirs::data_dir() else { return vec![] };
    let mut c = Vec::new();
    add_firefox_profiles(&mut c, 0, &data.join("Firefox"));
    add_chromium_browser(&mut c, "Chrome", 1, &data.join("Google/Chrome"), None);
    add_chromium_browser(&mut c, "Brave", 2, &data.join("BraveSoftware/Brave-Browser"), None);
    add_chromium_browser(&mut c, "Edge", 3, &data.join("Microsoft Edge"), None);
    let opera = data.join("com.operasoftware.Opera");
    if let Some(db) = chromium_cookie_db(&opera) {
        c.push(CandidateProfile { browser: "Opera", browser_order: 4, label: "Default".to_string(), cookie_db: db, key_path: None });
    }
    add_chromium_browser(&mut c, "Vivaldi", 5, &data.join("Vivaldi"), None);
    add_chromium_browser(&mut c, "Chromium", 6, &data.join("Chromium"), None);
    add_chromium_browser(&mut c, "Arc", 7, &data.join("Arc/User Data"), None);
    c
}

#[cfg(target_os = "windows")]
fn candidate_profiles() -> Vec<CandidateProfile> {
    let (Some(local), Some(roaming)) = (dirs::data_local_dir(), dirs::data_dir()) else { return vec![] };
    let mut c = Vec::new();
    add_firefox_profiles(&mut c, 0, &roaming.join("Mozilla/Firefox"));
    let chrome = local.join("Google/Chrome/User Data");
    add_chromium_browser(&mut c, "Chrome", 1, &chrome, Some(chrome.join("Local State")));
    let brave = local.join("BraveSoftware/Brave-Browser/User Data");
    add_chromium_browser(&mut c, "Brave", 2, &brave, Some(brave.join("Local State")));
    let edge = local.join("Microsoft/Edge/User Data");
    add_chromium_browser(&mut c, "Edge", 3, &edge, Some(edge.join("Local State")));
    let opera = roaming.join("Opera Software/Opera Stable");
    if let Some(db) = chromium_cookie_db(&opera) {
        c.push(CandidateProfile { browser: "Opera", browser_order: 4, label: "Default".to_string(), cookie_db: db, key_path: Some(opera.join("Local State")) });
    }
    let vivaldi = local.join("Vivaldi/User Data");
    add_chromium_browser(&mut c, "Vivaldi", 5, &vivaldi, Some(vivaldi.join("Local State")));
    let chromium = local.join("Chromium/User Data");
    add_chromium_browser(&mut c, "Chromium", 6, &chromium, Some(chromium.join("Local State")));
    c
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn candidate_profiles() -> Vec<CandidateProfile> {
    vec![]
}

// ── Cookie reading ────────────────────────────────────────────────────────────

fn read_profile_cookies(candidate: &CandidateProfile, domains: Option<Vec<String>>) -> Result<Vec<rookie::enums::Cookie>, String> {
    let path_str = candidate.cookie_db.to_str().ok_or_else(|| "non-UTF8 path".to_string())?;
    let key_str = candidate.key_path.as_deref().and_then(|p| p.to_str());
    rookie::any_browser(path_str, domains, key_str).map_err(|e| e.to_string())
}

fn gather_profiles(domains: Option<Vec<String>>) -> (Vec<ProfileCookies>, bool, Option<String>) {
    let mut profiles = Vec::new();
    let mut appbound_hit = false;
    let mut standalone_datadome: Option<String> = None;

    for candidate in candidate_profiles() {
        match read_profile_cookies(&candidate, domains.clone()) {
            Ok(cookies) => {
                let empty_count = cookies.iter().filter(|c| c.name == "oauth_token" && c.value.is_empty()).count();
                if empty_count > 0 {
                    warn!(
                        "Found {} empty oauth_token in {}/{} — Chromium v130+ App-Bound Encryption. \
                         Use Firefox to sign in instead",
                        empty_count, candidate.browser, candidate.label
                    );
                    appbound_hit = true;
                }
                if standalone_datadome.is_none() {
                    standalone_datadome = find_datadome(&cookies);
                }
                profiles.push(ProfileCookies { browser: candidate.browser, browser_order: candidate.browser_order, label: candidate.label, cookies });
            }
            Err(err_msg) => {
                warn!("Failed to read cookies from {}/{}: {}", candidate.browser, candidate.label, err_msg);
                let lower = err_msg.to_lowercase();
                if lower.contains("appbound") || lower.contains("app-bound") || lower.contains("app_bound") {
                    appbound_hit = true;
                }
            }
        }
    }

    (profiles, appbound_hit, standalone_datadome)
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Enumerate all browser profiles that have a non-empty SoundCloud oauth_token.
/// Sorted best-first (most soundcloud cookies descending, browser_order ascending tiebreak).
/// Cookie I/O only — no /me verification calls.
pub fn enumerate_profile_tokens() -> ProfileScan {
    let domains = soundcloud_domains();
    let (profiles, appbound_hit, standalone_datadome) = gather_profiles(domains);

    // Best-first: most soundcloud cookies desc, browser_order asc tiebreak —
    // consistent with select_best_profile and the documented ordering.
    let mut profiles = profiles;
    profiles.sort_by(|a, b| soundcloud_cookie_count(&b.cookies).cmp(&soundcloud_cookie_count(&a.cookies)).then(a.browser_order.cmp(&b.browser_order)));

    let tokens: Vec<ProfileToken> = profiles
        .into_iter()
        .filter(|p| has_nonempty_oauth_token(&p.cookies))
        .filter_map(|p| {
            let oauth = find_best_oauth_token(&p.cookies)?;
            let oauth_value = oauth.value.clone();
            let dd = find_datadome(&p.cookies);
            let sc_count = soundcloud_cookie_count(&p.cookies);
            Some(ProfileToken {
                key: format!("{}:{}", p.browser, p.label),
                browser: p.browser.to_string(),
                profile: p.label,
                oauth_token: oauth_value,
                datadome: dd,
                soundcloud_cookie_count: sc_count,
            })
        })
        .collect();

    ProfileScan { profiles: tokens, standalone_datadome, warning: if appbound_hit { Some(WARNING_APPBOUND_ENCRYPTION.to_string()) } else { None } }
}

/// Collect every soundcloud.com cookie for a specific profile by key.
/// `Some(key)` returns that profile's cookies; `None` falls back to best-profile behavior.
pub fn soundcloud_session_cookies_for(key: Option<&str>) -> Vec<RawCookie> {
    let (profiles, _, _) = gather_profiles(soundcloud_domains());

    let winner = match key {
        Some(k) => {
            let found = profiles.into_iter().filter(|p| has_nonempty_oauth_token(&p.cookies)).find(|p| format!("{}:{}", p.browser, p.label) == k);
            if found.is_none() {
                warn!("Profile key '{}' not found, falling back to empty cookies", k);
            }
            found
        }
        None => select_best_profile(profiles),
    };

    let Some(winner) = winner else { return Vec::new() };
    info!("Replaying {} soundcloud cookies from {}:{}", winner.cookies.len(), winner.browser, winner.label);
    winner
        .cookies
        .into_iter()
        .filter(|c| !c.value.is_empty())
        .map(|c| RawCookie { name: c.name, value: c.value, domain: c.domain, path: c.path, secure: c.secure, http_only: c.http_only })
        .collect()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_cookie(name: &str, value: &str, domain: &str) -> rookie::enums::Cookie {
        rookie::enums::Cookie {
            name: name.to_string(),
            value: value.to_string(),
            domain: domain.to_string(),
            path: "/".to_string(),
            secure: false,
            expires: None,
            http_only: false,
            same_site: 0,
        }
    }

    fn make_profile(browser: &'static str, order: u8, label: &str, cookies: Vec<rookie::enums::Cookie>) -> ProfileCookies {
        ProfileCookies { browser, browser_order: order, label: label.to_string(), cookies }
    }

    // ── soundcloud_cookie_count ───────────────────────────────────────────────

    #[test]
    fn test_soundcloud_cookie_count_matches_all_soundcloud_domains() {
        let cookies = vec![
            make_cookie("a", "v", "soundcloud.com"),
            make_cookie("b", "v", ".soundcloud.com"),
            make_cookie("c", "v", "artists.soundcloud.com"),
            make_cookie("d", "v", "google.com"),
        ];
        assert_eq!(soundcloud_cookie_count(&cookies), 3);
    }

    // ── select_best_profile ───────────────────────────────────────────────────

    #[test]
    fn test_select_best_profile_picks_most_soundcloud_cookies() {
        let small =
            make_profile("Chrome", 1, "Default", vec![make_cookie("oauth_token", "t1", "soundcloud.com"), make_cookie("datadome", "dd", ".soundcloud.com")]);
        let large = make_profile(
            "Chrome",
            1,
            "Profile 1",
            vec![
                make_cookie("oauth_token", "t2", "soundcloud.com"),
                make_cookie("datadome", "dd", ".soundcloud.com"),
                make_cookie("sc_anonymous_id", "id", ".soundcloud.com"),
            ],
        );
        let winner = select_best_profile(vec![small, large]).unwrap();
        assert_eq!(winner.label, "Profile 1");
    }

    #[test]
    fn test_select_best_profile_ignores_profiles_without_oauth_token() {
        let no_auth = make_profile(
            "Firefox",
            0,
            "default-release",
            vec![
                make_cookie("datadome", "dd", ".soundcloud.com"),
                make_cookie("datadome", "dd2", ".soundcloud.com"),
                make_cookie("foo", "bar", ".soundcloud.com"),
            ],
        );
        let with_auth = make_profile("Chrome", 1, "Profile 1", vec![make_cookie("oauth_token", "token", "soundcloud.com")]);
        let winner = select_best_profile(vec![no_auth, with_auth]).unwrap();
        assert_eq!(winner.label, "Profile 1");
    }

    #[test]
    fn test_select_best_profile_tiebreak_by_browser_order() {
        let firefox = make_profile(
            "Firefox",
            0,
            "default-release",
            vec![make_cookie("oauth_token", "t1", "soundcloud.com"), make_cookie("datadome", "dd", ".soundcloud.com")],
        );
        let chrome =
            make_profile("Chrome", 1, "Default", vec![make_cookie("oauth_token", "t2", "soundcloud.com"), make_cookie("datadome", "dd", ".soundcloud.com")]);
        // Equal cookie counts → Firefox (order=0) should win
        let winner = select_best_profile(vec![chrome, firefox]).unwrap();
        assert_eq!(winner.browser, "Firefox");
    }

    #[test]
    fn test_select_best_profile_empty_oauth_token_is_not_selected() {
        let appbound =
            make_profile("Chrome", 1, "Default", vec![make_cookie("oauth_token", "", "soundcloud.com"), make_cookie("datadome", "dd", ".soundcloud.com")]);
        assert!(select_best_profile(vec![appbound]).is_none());
    }

    #[test]
    fn test_select_best_profile_returns_none_when_no_candidates() {
        assert!(select_best_profile(vec![]).is_none());
    }

    // ── enumerate_profile_tokens helpers (unit-testable via ProfileToken) ─────

    #[test]
    fn test_profile_token_key_format() {
        let _profile = make_profile("Chrome", 1, "Profile 1", vec![make_cookie("oauth_token", "tok", "soundcloud.com")]);
        // Simulate the key construction logic
        let key = format!("{}:{}", "Chrome", "Profile 1");
        assert_eq!(key, "Chrome:Profile 1");
    }

    #[test]
    fn test_profile_token_debug_redacts_secrets() {
        let token = ProfileToken {
            key: "Chrome:Default".to_string(),
            browser: "Chrome".to_string(),
            profile: "Default".to_string(),
            oauth_token: "super_secret_token".to_string(),
            datadome: Some("secret_datadome".to_string()),
            soundcloud_cookie_count: 5,
        };
        let debug = format!("{:?}", token);
        assert!(!debug.contains("super_secret_token"));
        assert!(!debug.contains("secret_datadome"));
        assert!(debug.contains("[redacted]"));
        assert!(debug.contains("Chrome:Default"));
    }
}
