// ============================================================================
// File Name: tb.rs
// Purpose: SQLite implementations of DocumentStore and table traits.
// ============================================================================

use crate::domain::models::Document;
use crate::domain::traits::DocumentStore;
use crate::storage::db::Database;
use crate::storage::queries;
use anyhow::{anyhow, Result};
use rusqlite::params;

/// Legacy trait defining database operations on the directories table.
pub trait DirectoryTable {
    fn add_directory(&self, path: &str) -> Result<bool>;
    fn remove_directory(&self, path: &str) -> Result<bool>;
    fn get_all_directories(&self) -> Result<Vec<String>>;
}

/// Legacy trait defining database operations on the documents table.
pub trait DocumentTable {
    fn insert_document(&self, doc: &Document) -> Result<bool>;
    fn delete_document(&self, id: &str) -> Result<bool>;
    fn get_document_by_id(&self, id: &str) -> Result<Option<Document>>;
    fn get_all_documents(&self) -> Result<Vec<Document>>;
}

impl DocumentStore for Database {
    /// Adds a directory path to the directories table.
    fn add_directory(&self, path: &str) -> Result<bool> {
        let conn = self.connection()?;
        conn.execute(queries::ADD_DIRECTORY, params![path])
            .map_err(|e| anyhow!("Failed to add directory '{}': {}", path, e))?;
        Ok(true)
    }

    /// Removes a directory path from the directories table.
    fn remove_directory(&self, path: &str) -> Result<bool> {
        let conn = self.connection()?;
        conn.execute(queries::REMOVE_DIRECTORY, params![path])
            .map_err(|e| anyhow!("Failed to remove directory '{}': {}", path, e))?;
        Ok(true)
    }

    /// Retrieves all registered directory paths ordered alphabetically.
    fn get_all_directories(&self) -> Result<Vec<String>> {
        let conn = self.connection()?;
        let mut statement = conn
            .prepare(queries::GET_ALL_DIRECTORIES)
            .map_err(|e| anyhow!("Failed to prepare get_all_directories query: {}", e))?;
        let rows = statement
            .query_map([], |row| row.get(0))
            .map_err(|e| anyhow!("Failed to query directories: {}", e))?;

        let mut directories = Vec::new();
        for dir in rows {
            directories.push(dir.map_err(|e| anyhow!("Failed to read directory row: {}", e))?);
        }
        Ok(directories)
    }

    /// Inserts or replaces a document entry with id, path, and mtime.
    fn insert_document(&self, doc: &Document) -> Result<bool> {
        let conn = self.connection()?;
        conn.execute(
            queries::INSERT_DOCUMENT,
            params![&doc.id, &doc.path, doc.mtime],
        )
        .map_err(|e| anyhow!("Failed to insert document '{}': {}", doc.id, e))?;
        Ok(true)
    }

    /// Deletes a document by its unique identifier from the documents table.
    fn delete_document(&self, id: &str) -> Result<bool> {
        let conn = self.connection()?;
        conn.execute(queries::DELETE_DOCUMENT, params![id])
            .map_err(|e| anyhow!("Failed to delete document '{}': {}", id, e))?;
        Ok(true)
    }

    /// Retrieves a document by its unique identifier.
    fn get_document_by_id(&self, id: &str) -> Result<Option<Document>> {
        let conn = self.connection()?;
        let mut statement = conn
            .prepare(queries::GET_DOCUMENT_BY_ID)
            .map_err(|e| anyhow!("Failed to prepare get_document_by_id query: {}", e))?;
        let mut rows = statement
            .query(params![id])
            .map_err(|e| anyhow!("Failed to execute get_document_by_id query: {}", e))?;

        if let Some(row) = rows
            .next()
            .map_err(|e| anyhow!("Failed to read document row: {}", e))?
        {
            Ok(Some(Document {
                id: row.get(0)?,
                path: row.get(1)?,
                mtime: row.get(2)?,
            }))
        } else {
            Ok(None)
        }
    }

    /// Retrieves all documents stored in the database.
    fn get_all_documents(&self) -> Result<Vec<Document>> {
        let conn = self.connection()?;
        let mut statement = conn
            .prepare(queries::GET_ALL_DOCUMENTS)
            .map_err(|e| anyhow!("Failed to prepare get_all_documents query: {}", e))?;
        let rows = statement
            .query_map([], |row| {
                Ok(Document {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    mtime: row.get(2)?,
                })
            })
            .map_err(|e| anyhow!("Failed to execute get_all_documents query: {}", e))?;

        let mut documents = Vec::new();
        for doc in rows {
            documents.push(doc.map_err(|e| anyhow!("Failed to read document item: {}", e))?);
        }
        Ok(documents)
    }
}

impl DirectoryTable for Database {
    fn add_directory(&self, path: &str) -> Result<bool> {
        DocumentStore::add_directory(self, path)
    }

    fn remove_directory(&self, path: &str) -> Result<bool> {
        DocumentStore::remove_directory(self, path)
    }

    fn get_all_directories(&self) -> Result<Vec<String>> {
        DocumentStore::get_all_directories(self)
    }
}

impl DocumentTable for Database {
    fn insert_document(&self, doc: &Document) -> Result<bool> {
        DocumentStore::insert_document(self, doc)
    }

    fn delete_document(&self, id: &str) -> Result<bool> {
        DocumentStore::delete_document(self, id)
    }

    fn get_document_by_id(&self, id: &str) -> Result<Option<Document>> {
        DocumentStore::get_document_by_id(self, id)
    }

    fn get_all_documents(&self) -> Result<Vec<Document>> {
        DocumentStore::get_all_documents(self)
    }
}
