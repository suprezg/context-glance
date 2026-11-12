// ============================================================================
// File Name: queries.rs
// Purpose: Compile-time static SQL statements for SQLite database operations.
// ============================================================================

use std::collections::HashMap;
use std::sync::LazyLock;

// Compile-time static SQL query definitions
pub const ADD_DIRECTORY: &str = "INSERT OR IGNORE INTO directories (path) VALUES (?);";
pub const REMOVE_DIRECTORY: &str = "DELETE FROM directories WHERE path = ?;";
pub const GET_ALL_DIRECTORIES: &str = "SELECT path FROM directories ORDER BY path ASC;";

pub const INSERT_DOCUMENT: &str =
    "INSERT OR REPLACE INTO documents (id, path, mtime) VALUES (?, ?, ?);";
pub const DELETE_DOCUMENT: &str = "DELETE FROM documents WHERE id = ?;";
pub const GET_DOCUMENT_BY_ID: &str =
    "SELECT id, path, mtime FROM documents WHERE id = ? LIMIT 1;";
pub const GET_ALL_DOCUMENTS: &str = "SELECT id, path, mtime FROM documents ORDER BY path ASC;";

/// Static registry of named SQL queries maintained for external compatibility.
pub static QUERIES: LazyLock<HashMap<String, String>> = LazyLock::new(|| {
    let mut map = HashMap::new();
    map.insert("add_directory".to_string(), ADD_DIRECTORY.to_string());
    map.insert(
        "remove_directory".to_string(),
        REMOVE_DIRECTORY.to_string(),
    );
    map.insert(
        "get_all_directories".to_string(),
        GET_ALL_DIRECTORIES.to_string(),
    );
    map.insert(
        "insert_document".to_string(),
        INSERT_DOCUMENT.to_string(),
    );
    map.insert(
        "delete_document".to_string(),
        DELETE_DOCUMENT.to_string(),
    );
    map.insert(
        "get_document_by_id".to_string(),
        GET_DOCUMENT_BY_ID.to_string(),
    );
    map.insert(
        "get_all_documents".to_string(),
        GET_ALL_DOCUMENTS.to_string(),
    );
    map
});
