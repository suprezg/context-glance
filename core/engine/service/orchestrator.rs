// ============================================================================
// File Name: orchestrator.rs
// Purpose: Core orchestration coordinating storage, search, scanning, and IO traits.
// ============================================================================

use crate::domain::models::{Document, DocumentBlock, ScanStats, SearchResult};
use crate::domain::traits::{ContentScanner, DocumentStore, FileSystem, SearchIndex};
use crate::io::LocalFileSystem;
use crate::service::scanner::PulldownScanner;
use crate::storage::{Database, Indexer};
use anyhow::{Context, Result};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

/// Core service orchestrator coordinating abstracted storage, indexing, IO, and scanning.
pub struct Orchestrator {
    storage: Box<dyn DocumentStore>,
    indexer: Box<dyn SearchIndex>,
    fs: Box<dyn FileSystem>,
    scanner: Box<dyn ContentScanner>,
    directories: HashSet<PathBuf>,
}

/// Backward-compatible alias for Orchestrator.
pub type Engine = Orchestrator;

impl Orchestrator {
    /// Creates a default Orchestrator instance with standard concrete implementations.
    pub fn new(data_dir: Option<&Path>) -> Result<Self> {
        let (db_path, index_path) = match data_dir {
            Some(dir) => {
                let db_p = dir.join("engine.db");
                let idx_p = dir.join("tantivy_index");
                (Some(db_p), Some(idx_p))
            }
            None => (None, None),
        };

        let mut db = Database::new();
        if let Some(ref path) = db_path {
            db.open(path)?;
        } else {
            db.open_in_memory()?;
        }

        let indexer = Indexer::new(index_path.as_deref())?;
        let fs = LocalFileSystem::new();
        let scanner = PulldownScanner::new();

        Self::with_dependencies(
            Box::new(db),
            Box::new(indexer),
            Box::new(fs),
            Box::new(scanner),
        )
    }

    /// Constructs an Orchestrator with explicitly injected trait implementations for testing.
    pub fn with_dependencies(
        storage: Box<dyn DocumentStore>,
        indexer: Box<dyn SearchIndex>,
        fs: Box<dyn FileSystem>,
        scanner: Box<dyn ContentScanner>,
    ) -> Result<Self> {
        let mut directories = HashSet::new();
        if let Ok(saved_dirs) = storage.get_all_directories() {
            for dir_str in saved_dirs {
                let dir_path = PathBuf::from(dir_str);
                if dir_path.exists() && dir_path.is_dir() {
                    directories.insert(dir_path);
                }
            }
        }

        Ok(Self {
            storage,
            indexer,
            fs,
            scanner,
            directories,
        })
    }

    /// Returns sorted list of all registered directory paths.
    pub fn get_directories(&self) -> Vec<String> {
        let mut dirs: Vec<String> = self
            .directories
            .iter()
            .map(|path| path.to_string_lossy().to_string())
            .collect();
        dirs.sort();
        dirs
    }

    /// Adds a directory path to the orchestrator and registers it in database.
    pub fn add_directory(&mut self, dir_path: &str) -> Result<bool> {
        let canonical_or_raw = self.fs.canonicalize(dir_path)?;

        // Verify directory existence
        if canonical_or_raw.exists() && canonical_or_raw.is_dir() {
            let path_str = canonical_or_raw.to_string_lossy().to_string();
            self.storage.add_directory(&path_str)?;
            let inserted = self.directories.insert(canonical_or_raw);
            return Ok(inserted);
        }
        Ok(false)
    }

    /// Removes a directory path and cleans up orphan documents.
    pub fn remove_directory(&mut self, dir_path: &str) -> Result<bool> {
        let target_path = PathBuf::from(dir_path);
        let removed = self.directories.remove(&target_path)
            || if let Ok(canonical) = self.fs.canonicalize(dir_path) {
                self.directories.remove(&canonical)
            } else {
                false
            };

        // Clean up documents when directory is removed
        if removed {
            let path_str = dir_path.to_string();
            self.storage.remove_directory(&path_str)?;

            let all_docs = self.storage.get_all_documents()?;
            for doc in all_docs {
                let doc_path = PathBuf::from(&doc.path);
                if !self
                    .fs
                    .is_path_in_configured_directories(&doc_path, &self.directories)
                {
                    let _ = self.storage.delete_document(&doc.id);
                    let _ = self.indexer.delete_document(&doc.id);
                }
            }
            let _ = self.indexer.commit();
        }

        Ok(removed)
    }

    /// Rescans all registered directories and updates database and search indexer.
    pub fn rescan(&mut self) -> Result<ScanStats> {
        let mut stats = ScanStats {
            updated: 0,
            unchanged: 0,
            deleted: 0,
            total: 0,
        };

        // Discover markdown files in configured directories via FileSystem trait
        let discovered_files = self.fs.discover_markdown_files(&self.directories);
        let existing_docs = self.storage.get_all_documents()?;
        let mut existing_map: HashMap<String, Document> = HashMap::new();
        for doc in existing_docs {
            existing_map.insert(doc.path.clone(), doc);
        }

        let mut visited_paths = HashSet::new();

        // Process each discovered file
        for file_path in discovered_files {
            let absolute_path_str = file_path.to_string_lossy().to_string();
            visited_paths.insert(absolute_path_str.clone());

            let mtime = match self.fs.get_mtime(&file_path) {
                Ok(time) => time,
                Err(_) => continue,
            };

            // Skip file if mtime is unchanged
            if let Some(existing) = existing_map.get(&absolute_path_str) {
                if existing.mtime == mtime {
                    stats.unchanged += 1;
                    stats.total += 1;
                    continue;
                }
            }

            // Read file content from filesystem abstraction
            let content = match self.fs.read_file_to_string(&file_path) {
                Ok(text) => text,
                Err(_) => continue,
            };

            // Derive deterministic document id
            let doc_id = if let Some(existing) = existing_map.get(&absolute_path_str) {
                existing.id.clone()
            } else {
                let file_stem = file_path
                    .file_stem()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_else(|| "doc".to_string());
                format!("doc_{}_{}", mtime, file_stem)
            };

            // Parse document content using ContentScanner abstraction
            let (title, blocks) = self.scanner.scan(&doc_id, &content);

            let doc = Document {
                id: doc_id.clone(),
                path: absolute_path_str.clone(),
                mtime,
            };

            // Upsert into storage and search indexer abstractions
            self.storage.insert_document(&doc)?;
            self.indexer
                .index_document(&doc.id, &doc.path, &title, &blocks)?;

            stats.updated += 1;
            stats.total += 1;
        }

        // Purge missing documents from database and index
        stats.deleted = self.purge_missing_documents(existing_map, &visited_paths)?;
        self.indexer.commit()?;
        Ok(stats)
    }

    /// Executes search strictly scoped to configured directories.
    pub fn search(&self, query: &str, limit: usize) -> Result<Vec<SearchResult>> {
        let raw_results = self.indexer.search(query, limit * 2)?;

        // Filter results by configured directory scope using FileSystem trait
        let mut filtered = Vec::new();
        for result in raw_results {
            let doc_path = PathBuf::from(&result.absolute_path);
            if self
                .fs
                .is_path_in_configured_directories(&doc_path, &self.directories)
            {
                filtered.push(result);
                if filtered.len() >= limit {
                    break;
                }
            }
        }

        Ok(filtered)
    }

    /// Reads raw markdown content from disk after verifying directory permissions.
    pub fn get_markdown_content(
        &self,
        doc_id: Option<&str>,
        path_opt: Option<&str>,
    ) -> Result<String> {
        let abs_path = if let Some(p) = path_opt {
            PathBuf::from(p)
        } else if let Some(id) = doc_id {
            let doc = self
                .storage
                .get_document_by_id(id)?
                .context("Document not found in database")?;
            PathBuf::from(doc.path)
        } else {
            anyhow::bail!("Neither document_id nor path provided");
        };

        // Validate boundary permissions using FileSystem abstraction
        if !self
            .fs
            .is_path_in_configured_directories(&abs_path, &self.directories)
        {
            anyhow::bail!("Access denied: Path is outside configured documentation directories");
        }

        self.fs.read_file_to_string(&abs_path)
    }

    /// Parses markdown on-demand and returns document blocks.
    pub fn get_document_blocks(&self, doc_id: &str) -> Result<Vec<DocumentBlock>> {
        let doc = self
            .storage
            .get_document_by_id(doc_id)?
            .context("Document not found in database")?;

        let content = self.fs.read_file_to_string(Path::new(&doc.path))?;
        let (_, blocks) = self.scanner.scan(doc_id, &content);
        Ok(blocks)
    }

    /// No-op glance recorder acknowledging client call.
    pub fn record_glance(&self, _doc_id: &str, _block_id: Option<&str>) -> Result<bool> {
        Ok(true)
    }

    /// Checks if a file path strictly falls within one of the actively configured directories.
    pub fn is_path_in_configured_directories(&self, path: &Path) -> bool {
        self.fs
            .is_path_in_configured_directories(path, &self.directories)
    }

    /// Purges files from database and search index that were removed from disk or directories.
    fn purge_missing_documents(
        &self,
        existing_map: HashMap<String, Document>,
        visited_paths: &HashSet<String>,
    ) -> Result<usize> {
        let mut deleted_count = 0;

        for (absolute_path_str, doc) in existing_map {
            let doc_path = PathBuf::from(&absolute_path_str);
            let is_missing = !visited_paths.contains(&absolute_path_str);
            let is_outside = !self
                .fs
                .is_path_in_configured_directories(&doc_path, &self.directories);

            if is_missing || is_outside {
                self.storage.delete_document(&doc.id)?;
                self.indexer.delete_document(&doc.id)?;
                deleted_count += 1;
            }
        }

        Ok(deleted_count)
    }
}
