//! Licensing: a trial of three client binders, then a one-time Lemon Squeezy license.
//!
//! - Activation needs the network once. After that the app works offline for good.
//! - Revalidation is tried at most every 14 days, only to notice refunded or disabled
//!   keys. A network failure, timeout or server error never counts as invalid.
//! - The activation lives in the OS keychain. Only the key, the instance id and the
//!   product/variant names are kept: no customer name or email.
//! - The trial count is kept in both the keychain and the settings table and the
//!   larger is used, so deleting local history doesn't reset it.

use crate::net::{self, NetError};
use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const TRIAL_BINDERS: usize = 3;
pub const REVALIDATE_EVERY_SECS: i64 = 14 * 24 * 60 * 60;
const KEYCHAIN_SERVICE: &str = "com.binderready.desktop";

/// The store and products this build accepts keys for, set at build time by the
/// release workflow (`BINDERREADY_LS_STORE_ID`, `BINDERREADY_LS_PRODUCT_IDS`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoreConfig {
    pub store_id: u64,
    pub product_ids: Vec<u64>,
}

impl StoreConfig {
    pub fn parse(store_id: Option<&str>, product_ids: Option<&str>) -> Option<Self> {
        let store_id = store_id?.trim().parse().ok()?;
        let product_ids: Vec<u64> = product_ids?.split(',').filter_map(|p| p.trim().parse().ok()).collect();
        if product_ids.is_empty() { None } else { Some(Self { store_id, product_ids }) }
    }

    pub fn from_build() -> Option<Self> {
        Self::parse(option_env!("BINDERREADY_LS_STORE_ID"), option_env!("BINDERREADY_LS_PRODUCT_IDS"))
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Activation {
    pub key: String,
    pub instance_id: String,
    pub product_name: String,
    pub variant_name: String,
    /// Unix seconds.
    pub activated_at: i64,
    pub last_validated: i64,
}

/// What the Settings page and the export gate need.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseStatus {
    pub licensed: bool,
    pub key_masked: Option<String>,
    pub product_name: Option<String>,
    pub variant_name: Option<String>,
    pub activated_at: Option<i64>,
    pub last_validated: Option<i64>,
    pub trial_used: usize,
    pub trial_limit: usize,
    /// False in builds without store settings: activation is unavailable.
    pub store_configured: bool,
    /// The build has a store page to open ("Buy a license").
    pub can_buy: bool,
}

/// The license server. `LemonSqueezy` in the app; a fake in tests.
pub trait Api {
    fn call(&self, action: &str, form: &[(&str, &str)]) -> Result<(u16, Value), NetError>;
}

pub struct LemonSqueezy;

impl Api for LemonSqueezy {
    fn call(&self, action: &str, form: &[(&str, &str)]) -> Result<(u16, Value), NetError> {
        net::post_form(&format!("https://{}/v1/licenses/{action}", net::LICENSE_HOST), form)
    }
}

/// Where secrets live. The OS keychain in the app; memory in tests.
pub trait Vault {
    fn load(&self, name: &str) -> Option<String>;
    fn save(&self, name: &str, value: &str) -> Result<(), String>;
    fn clear(&self, name: &str) -> Result<(), String>;
}

pub struct Keychain;

impl Vault for Keychain {
    fn load(&self, name: &str) -> Option<String> {
        keyring::Entry::new(KEYCHAIN_SERVICE, name).ok()?.get_password().ok()
    }
    fn save(&self, name: &str, value: &str) -> Result<(), String> {
        keyring::Entry::new(KEYCHAIN_SERVICE, name)
            .and_then(|e| e.set_password(value))
            .map_err(|_| "The license couldn’t be saved to this computer’s keychain.".to_string())
    }
    fn clear(&self, name: &str) -> Result<(), String> {
        match keyring::Entry::new(KEYCHAIN_SERVICE, name).and_then(|e| e.delete_credential()) {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(_) => Err("The license couldn’t be removed from this computer’s keychain.".into()),
        }
    }
}

const ACTIVATION: &str = "license";
const TRIAL: &str = "trial-binders";

pub fn load_activation(vault: &dyn Vault) -> Option<Activation> {
    serde_json::from_str(&vault.load(ACTIVATION)?).ok()
}

fn save_activation(vault: &dyn Vault, a: &Activation) -> Result<(), String> {
    vault.save(ACTIVATION, &serde_json::to_string(a).map_err(|e| e.to_string())?)
}

/// "••••-••••-••••-1A2B": enough to recognize a key, not to use it.
pub fn mask(key: &str) -> String {
    let tail: String = key.chars().rev().take(4).collect::<Vec<_>>().into_iter().rev().collect();
    format!("••••-••••-••••-{tail}")
}

const OFFLINE: &str = "Couldn’t reach the license server. Check your internet connection and try again. Activation needs a connection once; after that the app works offline.";

fn text<'a>(v: &'a Value, path: &[&str]) -> Option<&'a str> {
    path.iter().try_fold(v, |v, k| v.get(k))?.as_str()
}

fn number(v: &Value, path: &[&str]) -> Option<u64> {
    path.iter().try_fold(v, |v, k| v.get(k))?.as_u64()
}

/// The response is for this store and one of its products.
fn ours(body: &Value, store: &StoreConfig) -> bool {
    number(body, &["meta", "store_id"]) == Some(store.store_id)
        && number(body, &["meta", "product_id"]).is_some_and(|p| store.product_ids.contains(&p))
}

/// Activates `key` on this computer and stores the activation in the vault.
pub fn activate(api: &dyn Api, vault: &dyn Vault, store: Option<&StoreConfig>, key: &str, instance_name: &str, now: i64) -> Result<Activation, String> {
    let store = store.ok_or("This build isn’t connected to a store, so it can’t activate licenses.")?;
    let key = key.trim();
    if key.is_empty() || key.len() > 100 {
        return Err("Paste the license key from your purchase email.".into());
    }
    let (status, body) = match api.call("activate", &[("license_key", key), ("instance_name", instance_name)]) {
        Ok(r) => r,
        Err(NetError::NotAllowed(e)) => return Err(e),
        Err(_) => return Err(OFFLINE.into()),
    };
    if status >= 500 {
        return Err(OFFLINE.into());
    }
    if body.get("activated").and_then(Value::as_bool) != Some(true) {
        let limit = number(&body, &["license_key", "activation_limit"]);
        let usage = number(&body, &["license_key", "activation_usage"]);
        return Err(match (limit, usage, text(&body, &["license_key", "status"])) {
            (_, _, Some("disabled")) => "This license key has been disabled. If that seems wrong, contact support.".into(),
            (_, _, Some("expired")) => "This license key has expired.".into(),
            (Some(limit), Some(usage), _) if usage >= limit => {
                format!("This key has reached its {limit}-device limit. Deactivate it on another computer from Settings → License.")
            }
            _ if status == 404 => "That license key wasn’t recognized. Check it against your purchase email.".into(),
            _ => text(&body, &["error"]).map_or_else(|| "The license server didn’t accept this key.".to_string(), |e| format!("The license server didn’t accept this key: {e}")),
        });
    }
    let instance_id = text(&body, &["instance", "id"]).ok_or("The license server’s answer was incomplete. Try again.")?.to_string();
    if !ours(&body, store) {
        // Free the seat this created, then refuse.
        let _ = api.call("deactivate", &[("license_key", key), ("instance_id", &instance_id)]);
        return Err("This key is for a different product.".into());
    }
    let activation = Activation {
        key: key.to_string(),
        instance_id,
        product_name: text(&body, &["meta", "product_name"]).unwrap_or_default().to_string(),
        variant_name: text(&body, &["meta", "variant_name"]).unwrap_or_default().to_string(),
        activated_at: now,
        last_validated: now,
    };
    save_activation(vault, &activation)?;
    Ok(activation)
}

/// Frees this computer's seat. Needs the network; on failure the computer stays activated.
pub fn deactivate(api: &dyn Api, vault: &dyn Vault) -> Result<(), String> {
    let Some(a) = load_activation(vault) else { return Ok(()) };
    match api.call("deactivate", &[("license_key", &a.key), ("instance_id", &a.instance_id)]) {
        // 404: the seat is already gone on the server; forget it here too.
        Ok((status, body)) if body.get("deactivated").and_then(Value::as_bool) == Some(true) || status == 404 => vault.clear(ACTIVATION),
        Ok((_, body)) => Err(text(&body, &["error"]).map_or_else(|| "The license server didn’t deactivate this computer.".to_string(), |e| format!("The license server didn’t deactivate this computer: {e}"))),
        Err(_) => Err("Couldn’t reach the license server, so this computer is still activated. Try again when you’re online.".into()),
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum Revalidation {
    NotLicensed,
    NotDue,
    Valid,
    /// Offline or the server failed: nothing changes.
    Unreachable,
    /// The server says the key is disabled, refunded or this seat was removed.
    Revoked(String),
}

/// At most every 14 days, and only an explicit "not valid" answer removes the license.
pub fn revalidate(api: &dyn Api, vault: &dyn Vault, store: Option<&StoreConfig>, now: i64) -> Revalidation {
    let Some(mut a) = load_activation(vault) else { return Revalidation::NotLicensed };
    if now - a.last_validated < REVALIDATE_EVERY_SECS {
        return Revalidation::NotDue;
    }
    let (status, body) = match api.call("validate", &[("license_key", &a.key), ("instance_id", &a.instance_id)]) {
        Ok(r) if r.0 < 500 && (r.0 == 200 || r.0 == 400 || r.0 == 404) => r,
        _ => return Revalidation::Unreachable,
    };
    let valid = body.get("valid").and_then(Value::as_bool) == Some(true);
    let wrong_store = valid && store.is_some_and(|s| !ours(&body, s));
    if valid && !wrong_store {
        a.last_validated = now;
        // Keeping the old timestamp only means checking again next launch.
        let _ = save_activation(vault, &a);
        return Revalidation::Valid;
    }
    let reason = match (status, text(&body, &["license_key", "status"])) {
        (404, _) => "Your license key is no longer recognized (for example after a refund).",
        (_, Some("disabled")) => "Your license key was disabled.",
        (_, Some("expired")) => "Your license key has expired.",
        _ if wrong_store => "Your license key is for a different product.",
        _ => "This computer’s activation was removed.",
    };
    let _ = vault.clear(ACTIVATION);
    Revalidation::Revoked(reason.to_string())
}

/// Trial binders used: "client:year" keys, from the keychain and the settings table.
pub fn trial_used(vault: &dyn Vault, settings: Option<&str>) -> Vec<String> {
    let parse = |s: Option<String>| -> Vec<String> { s.and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default() };
    let mut used = parse(vault.load(TRIAL));
    for key in parse(settings.map(str::to_string)) {
        if !used.contains(&key) {
            used.push(key);
        }
    }
    used
}

pub fn binder_key(client_id: i64, tax_year: i64) -> String {
    format!("{client_id}:{tax_year}")
}

/// Whether a binder may be exported, and whether it's a trial export. Re-exporting a
/// binder already counted doesn't use another one.
pub fn export_allowed(licensed: bool, used: &[String], key: &str) -> Result<bool, String> {
    if licensed {
        return Ok(false);
    }
    if used.iter().any(|k| k == key) || used.len() < TRIAL_BINDERS {
        return Ok(true);
    }
    Err(format!(
        "The trial includes {TRIAL_BINDERS} client binders, and they’ve been used. Buy a license, then activate it in Settings → License to keep exporting."
    ))
}

/// Records a trial export in the keychain; returns the JSON for the settings copy.
pub fn record_trial(vault: &dyn Vault, settings: Option<&str>, key: &str) -> String {
    let mut used = trial_used(vault, settings);
    if !used.iter().any(|k| k == key) {
        used.push(key.to_string());
    }
    let json = serde_json::to_string(&used).unwrap_or_else(|_| "[]".into());
    let _ = vault.save(TRIAL, &json);
    json
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;
    use std::collections::HashMap;

    #[derive(Default)]
    struct Memory(RefCell<HashMap<String, String>>);
    impl Vault for Memory {
        fn load(&self, name: &str) -> Option<String> {
            self.0.borrow().get(name).cloned()
        }
        fn save(&self, name: &str, value: &str) -> Result<(), String> {
            self.0.borrow_mut().insert(name.into(), value.into());
            Ok(())
        }
        fn clear(&self, name: &str) -> Result<(), String> {
            self.0.borrow_mut().remove(name);
            Ok(())
        }
    }

    /// A canned answer, or `Err(())` for "no network".
    type Answer = Result<(u16, Value), ()>;

    /// Answers each action with a canned response; records the calls.
    struct Fake {
        answers: HashMap<&'static str, Answer>,
        calls: RefCell<Vec<String>>,
    }
    impl Api for Fake {
        fn call(&self, action: &str, _form: &[(&str, &str)]) -> Result<(u16, Value), NetError> {
            self.calls.borrow_mut().push(action.into());
            match self.answers.get(action) {
                Some(Ok(r)) => Ok(r.clone()),
                _ => Err(NetError::Unreachable("offline".into())),
            }
        }
    }
    fn fake(answers: Vec<(&'static str, Answer)>) -> Fake {
        Fake { answers: answers.into_iter().collect(), calls: RefCell::default() }
    }

    fn store() -> StoreConfig {
        StoreConfig { store_id: 11, product_ids: vec![22, 23] }
    }

    fn activated(store_id: u64, product_id: u64) -> Value {
        serde_json::json!({
            "activated": true, "error": null,
            "license_key": { "status": "active", "activation_limit": 2, "activation_usage": 1 },
            "instance": { "id": "inst-1", "name": "BinderReady – macos" },
            "meta": { "store_id": store_id, "product_id": product_id, "product_name": "BinderReady", "variant_name": "Solo",
                      "customer_name": "Jane Sample", "customer_email": "jane@example.com" }
        })
    }

    #[test]
    fn activates_and_keeps_only_what_it_needs() {
        let vault = Memory::default();
        let api = fake(vec![("activate", Ok((200, activated(11, 22))))]);
        let a = activate(&api, &vault, Some(&store()), " ABCD-1234 ", "BinderReady – macos", 100).expect("activates");
        assert_eq!((a.key.as_str(), a.instance_id.as_str(), a.variant_name.as_str()), ("ABCD-1234", "inst-1", "Solo"));
        let stored = vault.load("license").expect("stored");
        assert!(!stored.contains("jane"), "customer details must not be stored: {stored}");
        assert_eq!(mask(&a.key), "••••-••••-••••-1234");
    }

    #[test]
    fn explains_refusals_in_plain_words() {
        let vault = Memory::default();
        let limit = serde_json::json!({ "activated": false, "error": "This license key has reached the activation limit.",
            "license_key": { "status": "active", "activation_limit": 2, "activation_usage": 2 } });
        let err = activate(&fake(vec![("activate", Ok((400, limit)))]), &vault, Some(&store()), "K", "x", 0).unwrap_err();
        assert_eq!(err, "This key has reached its 2-device limit. Deactivate it on another computer from Settings → License.");
        let missing = serde_json::json!({ "activated": false, "error": "license_key not found." });
        let err = activate(&fake(vec![("activate", Ok((404, missing)))]), &vault, Some(&store()), "K", "x", 0).unwrap_err();
        assert!(err.starts_with("That license key wasn’t recognized"));
        let err = activate(&fake(vec![]), &vault, Some(&store()), "K", "x", 0).unwrap_err();
        assert!(err.starts_with("Couldn’t reach the license server"));
        assert!(activate(&fake(vec![]), &vault, None, "K", "x", 0).unwrap_err().contains("isn’t connected to a store"));
        assert!(load_activation(&vault).is_none());
    }

    #[test]
    fn refuses_keys_from_other_stores_and_frees_the_seat() {
        let vault = Memory::default();
        let api = fake(vec![("activate", Ok((200, activated(99, 22)))), ("deactivate", Ok((200, serde_json::json!({ "deactivated": true }))))]);
        assert_eq!(activate(&api, &vault, Some(&store()), "K", "x", 0).unwrap_err(), "This key is for a different product.");
        assert_eq!(*api.calls.borrow(), vec!["activate", "deactivate"]);
        assert!(load_activation(&vault).is_none());
    }

    fn licensed_vault(last_validated: i64) -> Memory {
        let vault = Memory::default();
        let a = Activation { key: "K".into(), instance_id: "i".into(), product_name: "P".into(), variant_name: "Solo".into(), activated_at: 0, last_validated };
        save_activation(&vault, &a).expect("save");
        vault
    }

    #[test]
    fn revalidates_at_most_every_14_days_and_never_fails_offline() {
        let day = 24 * 60 * 60;
        let vault = licensed_vault(0);
        let offline = fake(vec![]);
        assert_eq!(revalidate(&offline, &vault, Some(&store()), 13 * day), Revalidation::NotDue);
        assert!(offline.calls.borrow().is_empty());
        assert_eq!(revalidate(&offline, &vault, Some(&store()), 15 * day), Revalidation::Unreachable);
        let server_error = fake(vec![("validate", Ok((503, serde_json::json!({}))))]);
        assert_eq!(revalidate(&server_error, &vault, Some(&store()), 400 * day), Revalidation::Unreachable);
        assert!(load_activation(&vault).is_some(), "offline for a year: still licensed");

        let ok = fake(vec![("validate", Ok((200, serde_json::json!({ "valid": true, "meta": { "store_id": 11, "product_id": 23 } }))))]);
        assert_eq!(revalidate(&ok, &vault, Some(&store()), 400 * day), Revalidation::Valid);
        assert_eq!(load_activation(&vault).expect("kept").last_validated, 400 * day);
    }

    #[test]
    fn only_an_explicit_answer_revokes() {
        let disabled = serde_json::json!({ "valid": false, "license_key": { "status": "disabled" } });
        let vault = licensed_vault(0);
        let api = fake(vec![("validate", Ok((200, disabled)))]);
        assert_eq!(revalidate(&api, &vault, Some(&store()), REVALIDATE_EVERY_SECS), Revalidation::Revoked("Your license key was disabled.".into()));
        assert!(load_activation(&vault).is_none());
    }

    #[test]
    fn deactivation_needs_the_server_and_keeps_the_license_offline() {
        let vault = licensed_vault(0);
        assert!(deactivate(&fake(vec![]), &vault).is_err());
        assert!(load_activation(&vault).is_some());
        let ok = fake(vec![("deactivate", Ok((200, serde_json::json!({ "deactivated": true }))))]);
        deactivate(&ok, &vault).expect("deactivates");
        assert!(load_activation(&vault).is_none());
    }

    #[test]
    fn trial_allows_three_binders_and_survives_a_settings_reset() {
        let vault = Memory::default();
        let mut settings = String::from("[]");
        for (client, year) in [(1, 2025), (2, 2025), (3, 2025)] {
            let key = binder_key(client, year);
            assert_eq!(export_allowed(false, &trial_used(&vault, Some(&settings)), &key), Ok(true));
            settings = record_trial(&vault, Some(&settings), &key);
        }
        // Re-exporting a counted binder is fine; a fourth isn't, even with settings wiped.
        assert_eq!(export_allowed(false, &trial_used(&vault, None), &binder_key(2, 2025)), Ok(true));
        assert!(export_allowed(false, &trial_used(&vault, None), &binder_key(4, 2025)).is_err());
        assert_eq!(export_allowed(true, &trial_used(&vault, None), &binder_key(4, 2025)), Ok(false));
    }

    #[test]
    fn store_settings_come_from_the_build() {
        assert_eq!(StoreConfig::parse(Some("11"), Some("22, 23")), Some(store()));
        assert_eq!(StoreConfig::parse(Some("11"), Some("")), None);
        assert_eq!(StoreConfig::parse(None, Some("22")), None);
    }
}
