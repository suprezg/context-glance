// ============================================================================
// File Name: dispatcher.rs
// Purpose: JSON-RPC request parsing, response serialization, and action execution.
// ============================================================================

use crate::domain::models::{DocumentBlock, ScanStats, SearchResult};
use crate::service::orchestrator::Orchestrator;
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};

/// Incoming JSON-RPC request structure received over stdin.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineRequest {
    pub id: u64,
    pub action: String,
    #[serde(default)]
    pub path: Option<String>,
    #[serde(default)]
    pub query: Option<String>,
    #[serde(default)]
    pub limit: Option<usize>,
    #[serde(default)]
    pub document_id: Option<String>,
    #[serde(default)]
    pub block_id: Option<String>,
    #[serde(default)]
    pub access_mode: Option<String>,
}

/// Outgoing JSON-RPC response envelope returned over stdout.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineResponse<T> {
    pub id: u64,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl<T> EngineResponse<T> {
    /// Constructs a successful response payload.
    pub fn ok(id: u64, data: T) -> Self {
        Self {
            id,
            success: true,
            data: Some(data),
            error: None,
        }
    }

    /// Constructs an error response payload with message.
    pub fn err(id: u64, msg: impl Into<String>) -> Self {
        Self {
            id,
            success: false,
            data: None,
            error: Some(msg.into()),
        }
    }
}

/// Parses an incoming JSON string line into an EngineRequest struct.
pub fn parse_request(line: &str) -> Result<EngineRequest> {
    serde_json::from_str(line).map_err(|e| anyhow!("Malformed JSON request: {}", e))
}

/// Dispatches an action request and serializes the resulting response envelope to JSON.
pub fn dispatch_and_serialize(req: &EngineRequest, orch: &mut Orchestrator) -> String {
    let id = req.id;
    match req.action.as_str() {
        "ping" => serialize_response(&to_response(id, execute_ping())),
        "add_directory" => serialize_response(&to_response(
            id,
            execute_add_directory(req.path.as_deref(), orch),
        )),
        "remove_directory" => serialize_response(&to_response(
            id,
            execute_remove_directory(req.path.as_deref(), orch),
        )),
        "get_directories" => serialize_response(&to_response(id, execute_get_directories(orch))),
        "rescan" => serialize_response(&to_response(id, execute_rescan(orch))),
        "search" => serialize_response(&to_response(
            id,
            execute_search(req.query.as_deref(), req.limit, orch),
        )),
        "get_markdown_content" => serialize_response(&to_response(
            id,
            execute_get_markdown_content(req.document_id.as_deref(), req.path.as_deref(), orch),
        )),
        "get_document_blocks" => serialize_response(&to_response(
            id,
            execute_get_document_blocks(req.document_id.as_deref(), orch),
        )),
        "record_glance" => serialize_response(&to_response(
            id,
            execute_record_glance(req.document_id.as_deref(), req.block_id.as_deref(), orch),
        )),
        other => serialize_response(&EngineResponse::<()>::err(
            id,
            format!("Unknown action: {}", other),
        )),
    }
}

/// Typed execution of the 'ping' command.
pub fn execute_ping() -> Result<String> {
    Ok("pong".to_string())
}

/// Typed execution of the 'add_directory' command.
pub fn execute_add_directory(path_opt: Option<&str>, orch: &mut Orchestrator) -> Result<bool> {
    let path = path_opt.ok_or_else(|| anyhow!("Missing 'path' parameter"))?;
    orch.add_directory(path)
}

/// Typed execution of the 'remove_directory' command.
pub fn execute_remove_directory(path_opt: Option<&str>, orch: &mut Orchestrator) -> Result<bool> {
    let path = path_opt.ok_or_else(|| anyhow!("Missing 'path' parameter"))?;
    orch.remove_directory(path)
}

/// Typed execution of the 'get_directories' command.
pub fn execute_get_directories(orch: &Orchestrator) -> Result<Vec<String>> {
    Ok(orch.get_directories())
}

/// Typed execution of the 'rescan' command.
pub fn execute_rescan(orch: &mut Orchestrator) -> Result<ScanStats> {
    orch.rescan()
}

/// Typed execution of the 'search' command.
pub fn execute_search(
    query_opt: Option<&str>,
    limit_opt: Option<usize>,
    orch: &Orchestrator,
) -> Result<Vec<SearchResult>> {
    let query = query_opt.unwrap_or("");
    let limit = limit_opt.unwrap_or(25);
    orch.search(query, limit)
}

/// Typed execution of the 'get_markdown_content' command.
pub fn execute_get_markdown_content(
    doc_id: Option<&str>,
    path_opt: Option<&str>,
    orch: &Orchestrator,
) -> Result<String> {
    orch.get_markdown_content(doc_id, path_opt)
}

/// Typed execution of the 'get_document_blocks' command.
pub fn execute_get_document_blocks(
    doc_id_opt: Option<&str>,
    orch: &Orchestrator,
) -> Result<Vec<DocumentBlock>> {
    let doc_id = doc_id_opt.unwrap_or("");
    orch.get_document_blocks(doc_id)
}

/// Typed execution of the 'record_glance' command.
pub fn execute_record_glance(
    doc_id_opt: Option<&str>,
    block_id: Option<&str>,
    orch: &Orchestrator,
) -> Result<bool> {
    let doc_id = doc_id_opt.ok_or_else(|| anyhow!("Missing 'document_id'"))?;
    orch.record_glance(doc_id, block_id)
}

/// Converts a typed Result<T> into a standardized EngineResponse<T>.
fn to_response<T>(id: u64, result: Result<T>) -> EngineResponse<T> {
    match result {
        Ok(val) => EngineResponse::ok(id, val),
        Err(e) => EngineResponse::err(id, e.to_string()),
    }
}

/// Serializes any engine response into a JSON string fallback safe.
pub fn serialize_response<T: Serialize>(response: &EngineResponse<T>) -> String {
    serde_json::to_string(response)
        .unwrap_or_else(|_| "{\"id\":0,\"success\":false,\"error\":\"Serialization error\"}".to_string())
}
