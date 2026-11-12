// ============================================================================
// File Name: mod.rs
// Purpose: Root module for storage subsystem exposing database, indexer, and tables.
// ============================================================================

pub mod db;
pub mod idx;
pub mod queries;
pub mod schema;
pub mod tb;

pub use db::Database;
pub use idx::{Indexer, TantivyIndex};
pub use queries::QUERIES;
pub use schema::SCHEMA;
pub use tb::{DirectoryTable, DocumentTable};
