// ============================================================================
// File Name: db.rs
// Purpose: SQLite database connection management and lifecycle.
// ============================================================================

use crate::storage::schema::SCHEMA;
use anyhow::{anyhow, Result};
use rusqlite::Connection;
use std::path::Path;

/// Primary database container managing SQLite connection lifecycle.
pub struct Database {
    conn: Option<Connection>,
}

impl Database {
    /// Creates a new uninitialized Database instance.
    pub fn new() -> Self {
        Self { conn: None }
    }

    /// Connects to SQLite at the given path, creating and initializing tables if not present.
    pub fn open(&mut self, path: &Path) -> Result<()> {
        // Ensure parent directory exists before attempting to open SQLite file
        if let Some(parent) = path.parent() {
            if !parent.as_os_str().is_empty() && !parent.exists() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| anyhow!("Failed to create parent directory for database: {}", e))?;
            }
        }

        // Establish connection to SQLite database
        let db_existed = path.exists();
        let connection = Connection::open(path)
            .map_err(|e| anyhow!("Failed to connect to database at {:?}: {}", path, e))?;

        // Initialize schema if database was newly created or verify tables
        if !db_existed {
            connection
                .execute_batch(&SCHEMA)
                .map_err(|e| anyhow!("Failed to initialize database schema: {}", e))?;
        } else {
            connection
                .execute_batch(&SCHEMA)
                .map_err(|e| anyhow!("Failed to verify database schema: {}", e))?;
        }

        self.conn = Some(connection);
        Ok(())
    }

    /// Opens an in-memory SQLite database instance for temporary or testing usage.
    pub fn open_in_memory(&mut self) -> Result<()> {
        // Open memory connection and apply schema
        let connection = Connection::open_in_memory()
            .map_err(|e| anyhow!("Failed to open in-memory SQLite database: {}", e))?;
        connection
            .execute_batch(&SCHEMA)
            .map_err(|e| anyhow!("Failed to initialize in-memory schema: {}", e))?;

        self.conn = Some(connection);
        Ok(())
    }

    /// Obtains a reference to the active database connection or returns an error.
    pub fn connection(&self) -> Result<&Connection> {
        self.conn
            .as_ref()
            .ok_or_else(|| anyhow!("Database connection is not open. Call open() first."))
    }
}
