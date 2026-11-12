// ============================================================================
// File Name: schema.rs
// Purpose: Static DDL definitions for SQLite table and index initialization.
// ============================================================================

use std::sync::LazyLock;

/// Static SQL statement used to initialize all database tables and indexes.
pub static SCHEMA: LazyLock<String> = LazyLock::new(|| {
    r#"
    CREATE TABLE IF NOT EXISTS directories (
        path TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL UNIQUE,
        mtime INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_docs_path ON documents(path);
    "#
    .trim()
    .to_string()
});
