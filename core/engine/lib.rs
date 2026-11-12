// ============================================================================
// File Name: lib.rs
// Purpose: Library root exposing domain, storage, io, and service subsystems.
// ============================================================================

pub mod domain;
pub mod io;
pub mod service;
pub mod storage;

pub use domain::*;
pub use io::*;
pub use service::{
    create_snippet, dispatcher, orchestrator, parse_markdown, scan_markdown, scanner, snippet,
    Engine, Orchestrator, PulldownScanner,
};
pub use storage::*;
