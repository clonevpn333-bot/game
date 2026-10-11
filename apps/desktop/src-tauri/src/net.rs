//! The only way this app talks to the network. Two hosts, HTTPS only, no redirects:
//! the Lemon Squeezy license API and the update manifest host. Documents never leave
//! the computer; nothing else is sent anywhere. `tests::allowlist_matches_csp` keeps
//! this list and the webview's Content Security Policy identical.

use std::time::Duration;

/// Every host the app may contact.
pub const ALLOWED_HOSTS: [&str; 2] = [LICENSE_HOST, UPDATE_HOST];
/// Lemon Squeezy License API (activate, validate, deactivate).
pub const LICENSE_HOST: &str = "api.lemonsqueezy.com";
/// Update manifests are served from GitHub Releases.
pub const UPDATE_HOST: &str = "github.com";

#[derive(Debug, thiserror::Error)]
pub enum NetError {
    #[error("{0} is not an allowed host")]
    NotAllowed(String),
    /// No answer: offline, DNS, TLS or timeout. Never treated as "invalid".
    #[error("network unavailable: {0}")]
    Unreachable(String),
    #[error("unexpected response: {0}")]
    BadResponse(String),
}

/// Host of an https:// URL, or None for anything else.
pub fn https_host(url: &str) -> Option<&str> {
    let rest = url.strip_prefix("https://")?;
    let host = rest.split(['/', '?', '#']).next()?;
    if host.contains('@') || host.contains(':') || host.is_empty() {
        return None;
    }
    Some(host)
}

pub fn check_allowed(url: &str) -> Result<(), NetError> {
    match https_host(url) {
        Some(host) if ALLOWED_HOSTS.contains(&host) => Ok(()),
        _ => Err(NetError::NotAllowed(url.to_string())),
    }
}

/// POSTs a form and returns the status and JSON body (error statuses included: the
/// license API explains refusals in the body).
pub fn post_form(url: &str, form: &[(&str, &str)]) -> Result<(u16, serde_json::Value), NetError> {
    check_allowed(url)?;
    let agent: ureq::Agent = ureq::Agent::config_builder()
        .max_redirects(0)
        .http_status_as_error(false)
        .timeout_global(Some(Duration::from_secs(20)))
        .user_agent(concat!("BinderReady/", env!("CARGO_PKG_VERSION")))
        .build()
        .into();
    let mut response = agent
        .post(url)
        .header("Accept", "application/json")
        .send_form(form.iter().copied())
        .map_err(|e| NetError::Unreachable(e.to_string()))?;
    let status = response.status().as_u16();
    let text = response.body_mut().read_to_string().map_err(|e| NetError::BadResponse(e.to_string()))?;
    let body = serde_json::from_str(&text).map_err(|e| NetError::BadResponse(e.to_string()))?;
    Ok((status, body))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_https_to_allowed_hosts() {
        assert!(check_allowed("https://api.lemonsqueezy.com/v1/licenses/activate").is_ok());
        assert!(check_allowed("https://github.com/owner/repo/releases/latest/download/latest.json").is_ok());
        assert!(check_allowed("http://api.lemonsqueezy.com/v1/licenses/activate").is_err());
        assert!(check_allowed("https://api.lemonsqueezy.com.evil.example/x").is_err());
        assert!(check_allowed("https://user@api.lemonsqueezy.com/x").is_err());
        assert!(check_allowed("https://api.lemonsqueezy.com:8443/x").is_err());
        assert!(check_allowed("https://example.com/").is_err());
    }

    /// The webview may connect to exactly the same hosts as the Rust side, and to
    /// nothing else: every CSP directive is checked for external origins.
    #[test]
    fn allowlist_matches_csp() {
        let config: serde_json::Value = serde_json::from_str(include_str!("../tauri.conf.json")).expect("tauri.conf.json");
        let csp = config["app"]["security"]["csp"].as_object().expect("CSP directives");
        let mut connect = Vec::new();
        for (name, value) in csp {
            let sources: Vec<&str> = value.as_str().unwrap_or_default().split_whitespace().collect();
            let external: Vec<&str> = sources.iter().copied().filter(|s| s.contains("://")).collect();
            if name == "connect-src" {
                // Tauri's own IPC endpoint is local.
                connect = external.into_iter().filter(|s| *s != "http://ipc.localhost").collect();
            } else {
                assert!(external.iter().all(|s| *s == "http://asset.localhost"), "{name} allows external origins: {external:?}");
            }
        }
        let mut hosts: Vec<&str> = connect.iter().filter_map(|s| https_host(s)).collect();
        hosts.sort_unstable();
        let mut allowed = ALLOWED_HOSTS.to_vec();
        allowed.sort_unstable();
        assert_eq!(hosts, allowed, "CSP connect-src and net::ALLOWED_HOSTS differ");
        assert_eq!(connect.len(), hosts.len(), "connect-src has non-https external sources: {connect:?}");
    }
}
