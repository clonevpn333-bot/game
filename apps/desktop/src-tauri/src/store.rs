//! Local SQLite store in the app data folder: settings, clients, and (after export)
//! the minimal missing-documents index. Never document images, text, SSNs or amounts.

use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use std::path::Path;

const MIGRATIONS: &[&str] = &[
    "CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY,
        display_name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        output_dir TEXT
     );
     CREATE TABLE IF NOT EXISTS binders (
        id INTEGER PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        tax_year INTEGER NOT NULL,
        exported_at TEXT NOT NULL DEFAULT (datetime('now')),
        documents INTEGER NOT NULL,
        pages INTEGER NOT NULL,
        output_path TEXT NOT NULL,
        trial INTEGER NOT NULL DEFAULT 0
     );
     CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);",
    // Missing-documents check: per client and tax year, only form type + issuer name.
    "CREATE TABLE IF NOT EXISTS client_index (
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        tax_year INTEGER NOT NULL,
        items TEXT NOT NULL,
        PRIMARY KEY (client_id, tax_year)
     );
     CREATE TABLE IF NOT EXISTS missing_dismissals (
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        tax_year INTEGER NOT NULL,
        form_type TEXT NOT NULL,
        issuer_name TEXT NOT NULL,
        PRIMARY KEY (client_id, tax_year, form_type, issuer_name)
     );",
];

/// One line of a client's document index: what arrived, from whom. Nothing else.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct IndexItem {
    pub form_type: String,
    /// Empty when the issuer could not be read.
    pub issuer_name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct YearIndex {
    pub tax_year: i64,
    pub items: Vec<IndexItem>,
}

fn validate_items(items: &[IndexItem]) -> Result<(), StoreError> {
    let ok = items.len() <= 1000
        && items.iter().all(|i| !i.form_type.is_empty() && i.form_type.len() <= 40 && i.issuer_name.chars().count() <= 120);
    if ok { Ok(()) } else { Err(StoreError::Invalid("Invalid document index.".into())) }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Client {
    pub id: i64,
    pub display_name: String,
    pub created_at: String,
    pub output_dir: Option<String>,
    /// Most recent exported tax year, if any.
    pub last_year: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BinderRow {
    pub id: i64,
    pub client_id: i64,
    pub client_name: String,
    pub tax_year: i64,
    pub exported_at: String,
    pub documents: i64,
    pub pages: i64,
    pub output_path: String,
    pub trial: bool,
}

pub struct Store {
    conn: Connection,
}

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("{0}")]
    Sql(#[from] rusqlite::Error),
    #[error("{0}")]
    Invalid(String),
}

impl Serialize for StoreError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

impl Store {
    pub fn open(path: &Path) -> Result<Self, StoreError> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| StoreError::Invalid(e.to_string()))?;
        }
        Self::init(Connection::open(path)?)
    }

    pub fn in_memory() -> Result<Self, StoreError> {
        Self::init(Connection::open_in_memory()?)
    }

    fn init(conn: Connection) -> Result<Self, StoreError> {
        conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")?;
        let version: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
        for (i, sql) in MIGRATIONS.iter().enumerate().skip(version as usize) {
            conn.execute_batch(sql)?;
            conn.execute_batch(&format!("PRAGMA user_version = {}", i + 1))?;
        }
        Ok(Self { conn })
    }

    pub fn list_clients(&self) -> Result<Vec<Client>, StoreError> {
        let mut stmt = self.conn.prepare(
            "SELECT c.id, c.display_name, c.created_at, c.output_dir, MAX(b.tax_year)
             FROM clients c LEFT JOIN binders b ON b.client_id = c.id
             GROUP BY c.id ORDER BY c.display_name COLLATE NOCASE",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(Client { id: r.get(0)?, display_name: r.get(1)?, created_at: r.get(2)?, output_dir: r.get(3)?, last_year: r.get(4)? })
        })?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    pub fn create_client(&self, display_name: &str) -> Result<Client, StoreError> {
        let name = display_name.trim();
        if name.is_empty() || name.chars().count() > 120 {
            return Err(StoreError::Invalid("Enter a client name (up to 120 characters).".into()));
        }
        self.conn.execute("INSERT INTO clients (display_name) VALUES (?1)", params![name])?;
        let id = self.conn.last_insert_rowid();
        self.client(id)?.ok_or_else(|| StoreError::Invalid("Client was not saved.".into()))
    }

    pub fn client(&self, id: i64) -> Result<Option<Client>, StoreError> {
        Ok(self
            .conn
            .query_row(
                "SELECT c.id, c.display_name, c.created_at, c.output_dir, (SELECT MAX(tax_year) FROM binders WHERE client_id = c.id)
                 FROM clients c WHERE c.id = ?1",
                params![id],
                |r| Ok(Client { id: r.get(0)?, display_name: r.get(1)?, created_at: r.get(2)?, output_dir: r.get(3)?, last_year: r.get(4)? }),
            )
            .optional()?)
    }

    pub fn list_binders(&self, limit: i64) -> Result<Vec<BinderRow>, StoreError> {
        let mut stmt = self.conn.prepare(
            "SELECT b.id, b.client_id, c.display_name, b.tax_year, b.exported_at, b.documents, b.pages, b.output_path, b.trial
             FROM binders b JOIN clients c ON c.id = b.client_id ORDER BY b.exported_at DESC, b.id DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit], |r| {
            Ok(BinderRow {
                id: r.get(0)?,
                client_id: r.get(1)?,
                client_name: r.get(2)?,
                tax_year: r.get(3)?,
                exported_at: r.get(4)?,
                documents: r.get(5)?,
                pages: r.get(6)?,
                output_path: r.get(7)?,
                trial: r.get::<_, i64>(8)? != 0,
            })
        })?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, StoreError> {
        Ok(self.conn.query_row("SELECT value FROM settings WHERE key = ?1", params![key], |r| r.get(0)).optional()?)
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), StoreError> {
        self.conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    /// Replaces the index for a client's tax year (re-exporting a binder updates it).
    pub fn record_index(&self, client_id: i64, tax_year: i64, items: &[IndexItem]) -> Result<(), StoreError> {
        validate_items(items)?;
        let json = serde_json::to_string(items).map_err(|e| StoreError::Invalid(e.to_string()))?;
        self.conn.execute(
            "INSERT INTO client_index (client_id, tax_year, items) VALUES (?1, ?2, ?3)
             ON CONFLICT(client_id, tax_year) DO UPDATE SET items = excluded.items",
            params![client_id, tax_year, json],
        )?;
        Ok(())
    }

    /// The most recent index before `tax_year`: what the client sent last time.
    pub fn previous_index(&self, client_id: i64, tax_year: i64) -> Result<Option<YearIndex>, StoreError> {
        let row: Option<(i64, String)> = self
            .conn
            .query_row(
                "SELECT tax_year, items FROM client_index WHERE client_id = ?1 AND tax_year < ?2 ORDER BY tax_year DESC LIMIT 1",
                params![client_id, tax_year],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .optional()?;
        row.map(|(year, json)| {
            let items = serde_json::from_str(&json).map_err(|e| StoreError::Invalid(e.to_string()))?;
            Ok(YearIndex { tax_year: year, items })
        })
        .transpose()
    }

    pub fn dismissed(&self, client_id: i64, tax_year: i64) -> Result<Vec<IndexItem>, StoreError> {
        let mut stmt = self.conn.prepare(
            "SELECT form_type, issuer_name FROM missing_dismissals WHERE client_id = ?1 AND tax_year = ?2 ORDER BY form_type, issuer_name",
        )?;
        let rows = stmt.query_map(params![client_id, tax_year], |r| Ok(IndexItem { form_type: r.get(0)?, issuer_name: r.get(1)? }))?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    /// "Not expected this year" (or undo it).
    pub fn set_dismissed(&self, client_id: i64, tax_year: i64, item: &IndexItem, dismissed: bool) -> Result<(), StoreError> {
        validate_items(std::slice::from_ref(item))?;
        if dismissed {
            self.conn.execute(
                "INSERT OR IGNORE INTO missing_dismissals (client_id, tax_year, form_type, issuer_name) VALUES (?1, ?2, ?3, ?4)",
                params![client_id, tax_year, item.form_type, item.issuer_name],
            )?;
        } else {
            self.conn.execute(
                "DELETE FROM missing_dismissals WHERE client_id = ?1 AND tax_year = ?2 AND form_type = ?3 AND issuer_name = ?4",
                params![client_id, tax_year, item.form_type, item.issuer_name],
            )?;
        }
        Ok(())
    }

    /// Deletes every client, binder record, document index and dismissal, then compacts
    /// the file so the rows are gone from disk too. Settings and the firm profile stay.
    pub fn delete_history(&self) -> Result<(), StoreError> {
        self.conn.execute_batch(
            "DELETE FROM missing_dismissals; DELETE FROM client_index; DELETE FROM binders; DELETE FROM clients; VACUUM;",
        )?;
        Ok(())
    }

    pub fn connection(&self) -> &Connection {
        &self.conn
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_and_lists_clients_alphabetically() {
        let store = Store::in_memory().expect("store");
        store.create_client("  Zed Sample ").expect("create");
        store.create_client("Ann Example").expect("create");
        let names: Vec<_> = store.list_clients().expect("list").into_iter().map(|c| c.display_name).collect();
        assert_eq!(names, vec!["Ann Example", "Zed Sample"]);
    }

    #[test]
    fn rejects_empty_client_names() {
        let store = Store::in_memory().expect("store");
        assert!(store.create_client("   ").is_err());
    }

    #[test]
    fn finds_last_years_index_and_remembers_dismissals() {
        let store = Store::in_memory().expect("store");
        let client = store.create_client("Jane Sample").expect("create").id;
        let item = |f: &str, i: &str| IndexItem { form_type: f.into(), issuer_name: i.into() };
        store.record_index(client, 2023, &[item("w-2", "Old Employer")]).expect("2023");
        store.record_index(client, 2024, &[item("w-2", "Northwind Logistics LLC"), item("1099-int", "")]).expect("2024");
        let previous = store.previous_index(client, 2025).expect("query").expect("found");
        assert_eq!(previous.tax_year, 2024);
        assert_eq!(previous.items.len(), 2);
        assert!(store.previous_index(client, 2023).expect("query").is_none());

        store.set_dismissed(client, 2025, &item("1099-int", ""), true).expect("dismiss");
        store.set_dismissed(client, 2025, &item("1099-int", ""), true).expect("idempotent");
        assert_eq!(store.dismissed(client, 2025).expect("list"), vec![item("1099-int", "")]);
        assert!(store.dismissed(client, 2026).expect("list").is_empty());
        store.set_dismissed(client, 2025, &item("1099-int", ""), false).expect("undo");
        assert!(store.dismissed(client, 2025).expect("list").is_empty());
    }

    #[test]
    fn rejects_anything_but_form_and_issuer_in_the_index() {
        let json = r#"[{"formType":"w-2","issuerName":"X","amount":"52,345.67"}]"#;
        assert!(serde_json::from_str::<Vec<IndexItem>>(json).is_err());
        let store = Store::in_memory().expect("store");
        let client = store.create_client("Jane Sample").expect("create").id;
        let long = IndexItem { form_type: "w-2".into(), issuer_name: "x".repeat(200) };
        assert!(store.record_index(client, 2024, &[long]).is_err());
    }

    #[test]
    fn deletes_history_but_keeps_settings() {
        let store = Store::in_memory().expect("store");
        let client = store.create_client("Jane Sample").expect("create").id;
        store.record_index(client, 2024, &[IndexItem { form_type: "w-2".into(), issuer_name: String::new() }]).expect("index");
        store.set_setting("firm.name", "Example Tax Co").expect("set");
        store.delete_history().expect("delete");
        assert!(store.list_clients().expect("list").is_empty());
        assert!(store.previous_index(client, 2025).expect("query").is_none());
        assert_eq!(store.get_setting("firm.name").expect("get").as_deref(), Some("Example Tax Co"));
    }

    #[test]
    fn stores_settings() {
        let store = Store::in_memory().expect("store");
        store.set_setting("theme", "dark").expect("set");
        store.set_setting("theme", "light").expect("set");
        assert_eq!(store.get_setting("theme").expect("get").as_deref(), Some("light"));
    }
}
