use once_cell::sync::Lazy;
use std::path::PathBuf;

const APP_IDENTIFIER: &str = "com.infrabooth.downloader";
const DEFAULT_CONFIG: &str = include_str!("../../config.json");

static CONFIG: Lazy<Config> = Lazy::new(Config::load);

struct Config {
    skip_tls_verify: bool,
}

impl Config {
    fn load() -> Self {
        let json = Self::read_config_file();
        let skip_tls_verify = json.get("skip_tls_verify").and_then(|v| v.as_bool()).unwrap_or(false);

        if skip_tls_verify {
            eprintln!("WARNING: TLS certificate verification is DISABLED via config.json");
        }

        Self { skip_tls_verify }
    }

    fn read_config_file() -> serde_json::Value {
        let Some(config_path) = Self::config_path() else {
            return serde_json::from_str(DEFAULT_CONFIG).unwrap_or_default();
        };

        if !config_path.exists() {
            if let Some(parent) = config_path.parent() {
                if std::fs::create_dir_all(parent).is_ok() {
                    let _ = std::fs::write(&config_path, DEFAULT_CONFIG);
                }
            }
        }

        let content = std::fs::read_to_string(&config_path).unwrap_or_else(|_| DEFAULT_CONFIG.to_string());
        serde_json::from_str(&content).unwrap_or_default()
    }

    fn config_path() -> Option<PathBuf> {
        dirs::data_dir().map(|d| d.join(APP_IDENTIFIER).join("config.json"))
    }
}

pub fn skip_tls_verify() -> bool {
    CONFIG.skip_tls_verify
}

pub fn enable_tls_verify() -> Result<(), String> {
    let Some(config_path) = Config::config_path() else {
        return Err("Could not determine config path".to_string());
    };

    let mut json = Config::read_config_file();
    json["skip_tls_verify"] = serde_json::Value::Bool(false);

    let content = serde_json::to_string_pretty(&json).map_err(|e| format!("Failed to serialize config: {}", e))?;
    std::fs::write(&config_path, &content).map_err(|e| format!("Failed to write config: {}", e))?;

    log::info!("[config] TLS verification re-enabled in {:?}", config_path);
    Ok(())
}
