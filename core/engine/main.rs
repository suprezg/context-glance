// ============================================================================
// File Name: main.rs
// Purpose: Main entry point processing JSON-RPC commands via dispatcher.
// ============================================================================

use context_glance_engine::service::dispatcher;
use context_glance_engine::service::orchestrator::Orchestrator;
use std::io::{self, BufRead, Write};
use std::path::PathBuf;

/// Application entry point processing JSON-RPC commands from stdin.
fn main() -> anyhow::Result<()> {
    // Resolve data directory from environment or fallback to in-memory
    let data_dir = std::env::var("CONTEXT_GLANCE_DATA_DIR")
        .ok()
        .map(PathBuf::from);

    // Initialize core orchestrator
    let mut orchestrator = Orchestrator::new(data_dir.as_deref())?;

    let stdin = io::stdin();
    let mut stdout = io::stdout();

    // Process incoming JSON-RPC lines
    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };

        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        // Parse incoming request envelope
        let req = match dispatcher::parse_request(trimmed) {
            Ok(r) => r,
            Err(e) => {
                let err_resp = dispatcher::serialize_response(&dispatcher::EngineResponse::<()>::err(
                    0,
                    e.to_string(),
                ));
                writeln!(stdout, "{}", err_resp)?;
                stdout.flush()?;
                continue;
            }
        };

        // Dispatch action and serialize response
        let response_json = dispatcher::dispatch_and_serialize(&req, &mut orchestrator);
        writeln!(stdout, "{}", response_json)?;
        stdout.flush()?;
    }

    Ok(())
}
