// ============================================================================
// File Name: traits.rs
// Purpose: Inverted dependency interfaces for storage, search, scanning, and IO.
// ============================================================================

use crate::domain::models::{Document, DocumentBlock, SearchResult};
use anyhow::Result;
use std::collections::HashSet;
use std::path::{Path, PathBuf};

/// Unified storage interface for persisting configured directories and document metadata.
pub trait DocumentStore: Send {
    fn add_directory(&self, path: &str) -> Result<bool>;
    fn remove_directory(&self, path: &str) -> Result<bool>;
    fn get_all_directories(&self) -> Result<Vec<String>>;
    fn insert_document(&self, doc: &Document) -> Result<bool>;
    fn delete_document(&self, id: &str) -> Result<bool>;
    fn get_document_by_id(&self, id: &str) -> Result<Option<Document>>;
    fn get_all_documents(&self) -> Result<Vec<Document>>;
}

/// Inverted interface for full-text indexing, deletion, commit, and search queries.
pub trait SearchIndex: Send {
    fn index_document(
        &self,
        doc_id: &str,
        path: &str,
        title: &str,
        blocks: &[DocumentBlock],
    ) -> Result<()>;
    fn delete_document(&self, doc_id: &str) -> Result<()>;
    fn commit(&self) -> Result<()>;
    fn search(&self, query_str: &str, limit: usize) -> Result<Vec<SearchResult>>;
}

/// Inverted interface for filesystem crawling, metadata extraction, and boundary security.
pub trait FileSystem: Send {
    fn is_path_in_configured_directories(
        &self,
        path: &Path,
        directories: &HashSet<PathBuf>,
    ) -> bool;
    fn canonicalize(&self, path: &str) -> Result<PathBuf>;
    fn discover_markdown_files(&self, directories: &HashSet<PathBuf>) -> Vec<PathBuf>;
    fn read_file_to_string(&self, path: &Path) -> Result<String>;
    fn get_mtime(&self, path: &Path) -> Result<i64>;
}

/// Inverted interface for parsing markdown content into document title and blocks.
pub trait ContentScanner: Send {
    fn scan(&self, doc_id: &str, content: &str) -> (String, Vec<DocumentBlock>);
}
