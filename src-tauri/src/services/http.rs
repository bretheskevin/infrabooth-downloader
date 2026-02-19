use serde::de::DeserializeOwned;

pub async fn handle_json_response<T, E>(
    response: reqwest::Response,
    error_constructor: impl FnOnce(String) -> E,
) -> Result<T, E>
where
    T: DeserializeOwned,
    E: From<reqwest::Error>,
{
    if response.status().is_success() {
        Ok(response.json().await?)
    } else {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        Err(error_constructor(format!("HTTP {}: {}", status, body)))
    }
}
