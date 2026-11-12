// ============================================================================
// File Name: mod.rs
// Purpose: Root module for service subsystem coordinating orchestrator, scanner, and IPC.
// ============================================================================

pub mod dispatcher;
pub mod models;
pub mod orchestrator;
pub mod scanner;
pub mod snippet;

pub use dispatcher::{EngineRequest, EngineResponse};
pub use models::*;
pub use orchestrator::{Engine, Orchestrator};
pub use scanner::{parse_markdown, scan_markdown, PulldownScanner};
pub use snippet::create_snippet;
