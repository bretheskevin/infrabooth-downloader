//! Replay a DataDome-blocked API write through an in-app WebView with a real
//! SoundCloud session.
//!
//! SoundCloud's write endpoints sit behind DataDome, which ties trust to the
//! browser fingerprint that solved its JS challenge. A write replayed from the
//! native HTTP client (a different fingerprint) is always challenged, so it
//! can't be sent directly. Instead we open a WebView pointed at soundcloud.com,
//! inject the user's oauth_token cookie, and issue the request from inside that
//! page via `fetch` — carrying the cookie *and* the fingerprint DataDome
//! trusts. If DataDome still challenges, the challenge (captcha or
//! interstitial) is rendered inline from the blocked response's URL; the fetch
//! is retried once it passes.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::webview::PageLoadEvent;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

use crate::services::cookie::RawCookie;
use crate::services::events::emit_webview_send_status;
use crate::services::http::ANTIBOT_BLOCKED;

/// Serializes sends: a second send would otherwise close the first one's window
/// mid-flight (same label), failing a write that may already be on the wire.
static SEND_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

const SENDER_LABEL: &str = "sc-dm-sender";
const RESULT_HOST: &str = "sc-dm-result.tauri";
const SEND_TIMEOUT: Duration = Duration::from_secs(180);
/// How long to stay hidden waiting for a headless (no-captcha) send before revealing
/// the window so the user can solve a DataDome challenge.
const REVEAL_AFTER: Duration = Duration::from_secs(6);
/// Response bodies larger than this are not shipped back through the sentinel URL.
const MAX_RESULT_BODY: usize = 60_000;

/// An API write to replay inside the WebView.
pub struct WebviewRequest {
    pub method: &'static str,
    pub url: String,
    pub content_type: Option<&'static str>,
    pub body: Option<String>,
}

impl WebviewRequest {
    /// A request with no payload — method and URL only.
    pub fn bare(method: &'static str, url: String) -> Self {
        Self { method, url, content_type: None, body: None }
    }
}

/// Whether an error is a DataDome block. Every service embeds the sanitized
/// [`ANTIBOT_BLOCKED`] marker in its error message, so a string check covers
/// all error types.
pub fn is_antibot(err: &impl std::fmt::Display) -> bool {
    err.to_string().contains(ANTIBOT_BLOCKED)
}

/// If the direct API write was blocked by DataDome, replay it through the
/// WebView; otherwise pass the result through.
pub async fn retry_if_antibot<E: std::fmt::Display>(
    app: &tauri::AppHandle, oauth_token: &str, operation: &str, result: Result<(), E>, request: impl FnOnce() -> Result<WebviewRequest, String>,
) -> Result<(), String> {
    match result {
        Err(e) if is_antibot(&e) => {
            send_via_webview(app, oauth_token, operation, request()?).await?;
            Ok(())
        }
        other => other.map_err(|e| e.to_string()),
    }
}

/// Build the script injected into the SoundCloud page. It replays the request
/// via `fetch` and reports the outcome — plus the response body when small
/// enough — by navigating to a sentinel URL that Rust intercepts. When the
/// request is blocked, the challenge URL from the response body is rendered in
/// an iframe (DataDome's SDK-less flow); the fresh datadome cookie arrives via
/// postMessage and the request is retried. A `sessionStorage` guard prevents a
/// second send if the page happens to navigate before the first attempt
/// resolves.
fn build_init_script(oauth_token: &str, req: &WebviewRequest) -> String {
    let api_url = serde_json::to_string(&req.url).unwrap_or_else(|_| "\"\"".to_string());
    let method = serde_json::to_string(req.method).unwrap_or_else(|_| "\"\"".to_string());
    let content_type = req.content_type.and_then(|ct| serde_json::to_string(ct).ok()).unwrap_or_else(|| "null".to_string());
    let body = req.body.as_deref().and_then(|b| serde_json::to_string(b).ok()).unwrap_or_else(|| "null".to_string());
    let token = serde_json::to_string(oauth_token).unwrap_or_else(|_| "\"\"".to_string());

    format!(
        r#"
(function() {{
  if (location.hostname !== 'soundcloud.com' && !location.hostname.endsWith('.soundcloud.com')) return;
  if (window.__scDmSenderInit) return;
  window.__scDmSenderInit = true;

  function log(m) {{ try {{ console.log('[sc-dm]', m); }} catch (e) {{}} }}
  log('script active on ' + location.href);

  var API_URL = {api_url};
  var METHOD = {method};
  var CONTENT_TYPE = {content_type};
  var BODY = {body};
  var TOKEN = {token};
  var RESULT = 'https://{host}/?status=';
  var MAX_BODY = {max_body};
  var MAX_ATTEMPTS = 5;

  var done = false;
  var attempts = 0;
  var retryArmed = false;

  function finish(status, responseBody) {{
    if (done) return;
    done = true;
    log('finish ' + status);
    try {{ sessionStorage.setItem('scDmDone', '1'); }} catch (e) {{}}
    var url = RESULT + encodeURIComponent(status);
    if (responseBody && responseBody.length < MAX_BODY) {{ url += '&body=' + encodeURIComponent(responseBody); }}
    try {{ window.location.replace(url); }} catch (e) {{}}
  }}

  function armRetry() {{
    if (retryArmed) return;
    retryArmed = true;
    log('blocked; waiting for the DataDome challenge to pass');
    var h = function() {{
      window.removeEventListener('dd_response_passed', h);
      retryArmed = false;
      log('challenge passed; retrying');
      attempt();
    }};
    window.addEventListener('dd_response_passed', h);
  }}

  // Render the challenge from a blocked response ourselves (DataDome's
  // SDK-less flow): show the challenge URL in an iframe, then catch the
  // postMessage carrying the fresh datadome cookie once it passes.
  function showChallenge(url) {{
    if (document.getElementById('sc-dm-challenge')) return;
    log('displaying challenge: ' + url.split('?')[0]);
    var frame = document.createElement('iframe');
    frame.id = 'sc-dm-challenge';
    frame.src = url;
    frame.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:0;z-index:2147483647;background:#fff;';
    document.documentElement.appendChild(frame);
    var onMsg = function(ev) {{
      var origin = ev.origin || '';
      if (origin.indexOf('captcha-delivery.com') === -1 && origin.indexOf('soundcloud.com') === -1) return;
      var data;
      try {{ data = JSON.parse(ev.data); }} catch (e) {{ return; }}
      if (!data || !data.cookie) return;
      window.removeEventListener('message', onMsg);
      try {{ document.cookie = data.cookie; }} catch (e) {{}}
      try {{ frame.remove(); }} catch (e) {{}}
      log('challenge solved; cookie refreshed');
      try {{ window.dispatchEvent(new Event('dd_response_passed')); }} catch (e) {{}}
    }};
    window.addEventListener('message', onMsg);
  }}

  function handleBlocked(res) {{
    armRetry();
    res.text().then(function(t) {{
      var url = null;
      try {{ url = JSON.parse(t).url || null; }} catch (e) {{}}
      if (url && url.indexOf('captcha-delivery.com') !== -1) {{ showChallenge(url); }}
      else {{ log('403 without a challenge url; relying on the page tag'); }}
    }}, function() {{}});
  }}

  function attempt() {{
    if (done) return;
    if (attempts >= MAX_ATTEMPTS) {{ finish('blocked', ''); return; }}
    attempts++;
    log(METHOD + ' ' + API_URL + ' (attempt ' + attempts + ')');
    var opts = {{ method: METHOD, credentials: 'include', headers: {{ 'Authorization': 'OAuth ' + TOKEN }} }};
    if (CONTENT_TYPE !== null) {{ opts.headers['Content-Type'] = CONTENT_TYPE; }}
    if (BODY !== null) {{ opts.body = BODY; }}
    fetch(API_URL, opts).then(function(res) {{
      log('response ' + res.status);
      if (res.ok) {{ res.text().then(function(t) {{ finish('ok', t); }}, function() {{ finish('ok', ''); }}); return; }}
      if (res.status === 403) {{ handleBlocked(res); return; }}
      finish('http_' + res.status, '');
    }}).catch(function(err) {{ log('fetch error ' + err); armRetry(); }});
  }}

  function start() {{
    try {{ if (sessionStorage.getItem('scDmDone') === '1') {{ log('already sent'); return; }} }} catch (e) {{}}
    setTimeout(attempt, 1500);
  }}

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
}})();
"#,
        api_url = api_url,
        method = method,
        content_type = content_type,
        body = body,
        token = token,
        host = RESULT_HOST,
        max_body = MAX_RESULT_BODY,
    )
}

/// Replay the browser's soundcloud.com cookie jar into the WebView so it loads as
/// the logged-in session. Falls back to just the oauth_token if the jar is empty.
fn set_session_cookies(window: &tauri::WebviewWindow, cookies: &[RawCookie], oauth_token: &str) {
    if cookies.is_empty() {
        let cookie = tauri::webview::Cookie::build(("oauth_token", oauth_token)).domain(".soundcloud.com").path("/").secure(true).http_only(true).build();
        if let Err(e) = window.set_cookie(cookie) {
            log::warn!("[webview_send] failed to set fallback oauth cookie: {}", e);
        }
        return;
    }

    let mut set = 0;
    for rc in cookies {
        // Skip datadome: the WebView earns its own fingerprint-trusted datadome by
        // solving the captcha once, and it persists across sends. Injecting the
        // browser's (differently-fingerprinted) one would force a challenge every time.
        if rc.name == "datadome" {
            continue;
        }
        let domain = if rc.domain.is_empty() { ".soundcloud.com".to_string() } else { rc.domain.clone() };
        let path = if rc.path.is_empty() { "/".to_string() } else { rc.path.clone() };
        let cookie =
            tauri::webview::Cookie::build((rc.name.clone(), rc.value.clone())).domain(domain).path(path).secure(rc.secure).http_only(rc.http_only).build();
        match window.set_cookie(cookie) {
            Ok(()) => set += 1,
            Err(e) => log::warn!("[webview_send] failed to set cookie {}: {}", rc.name, e),
        }
    }
    log::info!("[webview_send] injected {}/{} soundcloud cookies", set, cookies.len());
}

/// Parse the sentinel `status`/`body` query into a result.
fn interpret_status(url: &tauri::Url) -> Result<Option<String>, String> {
    let mut status = None;
    let mut body = None;
    for (k, v) in url.query_pairs() {
        match k.as_ref() {
            "status" => status = Some(v.into_owned()),
            "body" => body = Some(v.into_owned()),
            _ => {}
        }
    }
    match status {
        Some(s) if s == "ok" => Ok(body.filter(|b| !b.is_empty())),
        Some(s) => Err(format!("send failed ({})", s)),
        None => Err("send failed (no status)".to_string()),
    }
}

/// Open the WebView, replay the request from inside it, and resolve once the
/// page reports the outcome (or the window is closed / times out). Returns the
/// response body when the page could ship it back. Emits a status event around
/// the send so the frontend can show progress feedback.
pub async fn send_via_webview(app: &tauri::AppHandle, oauth_token: &str, operation: &str, req: WebviewRequest) -> Result<Option<String>, String> {
    let _send_guard = SEND_LOCK.lock().await;

    emit_webview_send_status(app, operation, true);
    let outcome = run_webview_send(app, oauth_token, req).await;
    emit_webview_send_status(app, operation, false);
    outcome
}

async fn run_webview_send(app: &tauri::AppHandle, oauth_token: &str, req: WebviewRequest) -> Result<Option<String>, String> {
    if let Some(existing) = app.get_webview_window(SENDER_LABEL) {
        let _ = existing.close();
    }

    let profile_key = app.state::<crate::services::storage::AuthState>().get_profile_key();
    let session_cookies = tokio::task::spawn_blocking(move || crate::services::cookie::soundcloud_session_cookies_for(profile_key.as_deref()))
        .await
        .map_err(|e| e.to_string())?;

    let script = build_init_script(oauth_token, &req);
    let oauth = oauth_token.to_string();

    let (result_tx, result_rx) = tokio::sync::oneshot::channel::<Result<Option<String>, String>>();
    let result_tx = Mutex::new(Some(result_tx));

    let (build_tx, build_rx) = tokio::sync::oneshot::channel::<Result<(), String>>();
    let app_handle = app.clone();
    let script_for_load = script.clone();
    let injected = Arc::new(AtomicBool::new(false));

    app.run_on_main_thread(move || {
        let built = (|| {
            let window = WebviewWindowBuilder::new(
                &app_handle,
                SENDER_LABEL,
                WebviewUrl::External("about:blank".parse().map_err(|e| format!("Failed to parse initial URL: {}", e))?),
            )
            .title("SoundCloud")
            .inner_size(480.0, 660.0)
            .center()
            .visible(false)
            .initialization_script(script)
            .on_page_load(move |webview, payload| {
                if payload.event() != PageLoadEvent::Finished {
                    return;
                }
                log::info!("[webview_send] page loaded: {}", payload.url());
                if payload.url().host_str() == Some("soundcloud.com") && !injected.swap(true, Ordering::SeqCst) {
                    log::info!("[webview_send] injecting send script via eval");
                    let _ = webview.eval(script_for_load.clone());
                }
            })
            .on_navigation(move |url| {
                if url.host_str() == Some(RESULT_HOST) {
                    if let Ok(mut tx) = result_tx.lock() {
                        if let Some(tx) = tx.take() {
                            let _ = tx.send(interpret_status(url));
                        }
                    }
                    return false;
                }
                // The injected script carries the OAuth token; keep the window on
                // SoundCloud (plus DataDome's challenge domain, which the script
                // guards against by hostname) so it can never execute elsewhere.
                url.scheme() == "about"
                    || matches!(url.host_str(), Some(h) if h == "soundcloud.com"
                            || h.ends_with(".soundcloud.com")
                            || h == "captcha-delivery.com"
                            || h.ends_with(".captcha-delivery.com"))
            })
            .build()
            .map_err(|e| format!("Failed to open sender window: {}", e))?;

            set_session_cookies(&window, &session_cookies, &oauth);
            log::info!("[webview_send] sender window built and session cookies set");
            Ok::<(), String>(())
        })();
        let _ = build_tx.send(built);
    })
    .map_err(|e| format!("Failed to schedule sender window: {}", e))?;

    build_rx.await.map_err(|_| "sender window setup dropped".to_string())??;

    // The WebKit cookie store commits asynchronously; navigating immediately races
    // the write and loads SoundCloud logged-out. Let the cookie settle first.
    tokio::time::sleep(Duration::from_millis(700)).await;

    match app.get_webview_window(SENDER_LABEL) {
        Some(window) => {
            let sc_url: tauri::Url = "https://soundcloud.com/discover".parse().map_err(|e| format!("Failed to parse SoundCloud URL: {}", e))?;
            let has_oauth = window.cookies_for_url(sc_url.clone()).map(|cookies| cookies.iter().any(|c| c.name() == "oauth_token")).unwrap_or(false);
            log::info!("[webview_send] oauth cookie present in webview store before navigation: {}", has_oauth);
            window.navigate(sc_url).map_err(|e| format!("Failed to navigate: {}", e))?;
        }
        None => return Err("sender window closed before navigation".to_string()),
    }

    // Stay hidden while the fetch runs. If it resolves quickly the send was headless;
    // if nothing comes back within the reveal window, a captcha is almost certainly
    // waiting — show the window so the user can solve it.
    let mut result_rx = result_rx;
    let outcome = tokio::select! {
        biased;
        received = &mut result_rx => received.unwrap_or_else(|_| Err(ANTIBOT_BLOCKED.to_string())),
        _ = tokio::time::sleep(REVEAL_AFTER) => {
            if let Some(window) = app.get_webview_window(SENDER_LABEL) {
                let _ = window.show();
                let _ = window.set_focus();
                log::info!("[webview_send] no fast result; revealing window for captcha");
            }
            match tokio::time::timeout(SEND_TIMEOUT, result_rx).await {
                Ok(Ok(result)) => result,
                Ok(Err(_)) => Err(ANTIBOT_BLOCKED.to_string()),
                Err(_) => Err("timed out waiting for SoundCloud".to_string()),
            }
        }
    };
    log::info!("[webview_send] outcome: {:?}", outcome.as_ref().map(|b| b.as_deref().map(str::len)));

    if let Some(window) = app.get_webview_window(SENDER_LABEL) {
        let _ = window.close();
    }

    outcome
}

#[cfg(test)]
mod tests {
    use super::*;

    fn result_url(query: &str) -> tauri::Url {
        format!("https://{}/{}", RESULT_HOST, query).parse().unwrap()
    }

    #[test]
    fn test_interpret_status_ok_without_body() {
        assert_eq!(interpret_status(&result_url("?status=ok")), Ok(None));
    }

    #[test]
    fn test_interpret_status_ok_with_body() {
        assert_eq!(interpret_status(&result_url("?status=ok&body=%7B%22id%22%3A1%7D")), Ok(Some("{\"id\":1}".to_string())));
    }

    #[test]
    fn test_interpret_status_failure() {
        assert_eq!(interpret_status(&result_url("?status=http_403")), Err("send failed (http_403)".to_string()));
    }

    #[test]
    fn test_interpret_status_missing() {
        assert_eq!(interpret_status(&result_url("")), Err("send failed (no status)".to_string()));
    }
}
