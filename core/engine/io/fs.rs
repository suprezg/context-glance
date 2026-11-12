// ============================================================================
// File Name: fs.rs
// Purpose: Concrete OS filesystem implementation with directory crawling and security.
// ============================================================================

use crate::domain::traits::FileSystem;
use anyhow::{Context, Result};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use walkdir::WalkDir;

/// Standard OS filesystem adapter implementing the FileSystem trait.
pub struct LocalFileSystem;

impl LocalFileSystem {
    /// Creates a new LocalFileSystem instance.
    pub fn new() -> Self {
        Self
    }
}

impl Default for LocalFileSystem {
    fn default() -> Self {
        Self::new()
    }
}

impl FileSystem for LocalFileSystem {
    /// Checks if a file path strictly falls within one of the actively configured directories.
    fn is_path_in_configured_directories(
        &self,
        path: &Path,
        directories: &HashSet<PathBuf>,
    ) -> bool {
        for dir in directories {
            if path.starts_with(dir) {
                return true;
            }
        }
        false
    }

    /// Resolves canonical path or falls back to raw path buffer.
    fn canonicalize(&self, path: &str) -> Result<PathBuf> {
        fs::canonicalize(path).or_else(|_| Ok(PathBuf::from(path)))
    }

    /// Recursively discovers all valid markdown files while filtering ignored folders.
    fn discover_markdown_files(&self, directories: &HashSet<PathBuf>) -> Vec<PathBuf> {
        let mut discovered = Vec::new();

        for base_dir in directories {
            if !base_dir.exists() {
                continue;
            }

            for entry in WalkDir::new(base_dir)
                .follow_links(true)
                .into_iter()
                .filter_entry(|e| {
                    if e.depth() == 0 {
                        return true;
                    }
                    let name = e.file_name().to_string_lossy();
                    !name.starts_with('.')
                        && name != "node_modules"
                        && name != "out"
                        && name != "dist"
                        && name != "target"
                })
                .flatten()
            {
                if entry.file_type().is_file() {
                    let file_path = entry.path();
                    let is_markdown = file_path
                        .extension()
                        .map_or(false, |ext| ext.eq_ignore_ascii_case("md"));

                    if is_markdown {
                        let resolved_path = fs::canonicalize(file_path)
                            .unwrap_or_else(|_| file_path.to_path_buf());
                        discovered.push(resolved_path);
                    }
                }
            }
        }

        discovered
    }

    /// Reads content string from disk with context errors.
    fn read_file_to_string(&self, path: &Path) -> Result<String> {
        fs::read_to_string(path).with_context(|| format!("Failed to read file: {:?}", path))
    }

    /// Extracts file modification timestamp as UNIX epoch milliseconds.
    fn get_mtime(&self, path: &Path) -> Result<i64> {
        let metadata = fs::metadata(path)
            .with_context(|| format!("Failed to read metadata: {:?}", path))?;
        let mtime = metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|duration| duration.as_millis() as i64)
            .unwrap_or(0);
        Ok(mtime)
    }
}
