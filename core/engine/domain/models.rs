// ============================================================================
// File Name: models.rs
// Purpose: Core domain data models for documents, blocks, search, and stats.
// ============================================================================

use serde::{Deserialize, Serialize};

/// Enumeration representing the structural classification of a document block.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum BlockType {
    Heading,
    Paragraph,
    Code,
    Math,
    HtmlDetails,
    Table,
    List,
}

impl BlockType {
    /// Returns the static string representation of the block type.
    pub fn as_str(&self) -> &'static str {
        match self {
            BlockType::Heading => "heading",
            BlockType::Paragraph => "paragraph",
            BlockType::Code => "code",
            BlockType::Math => "math",
            BlockType::HtmlDetails => "html_details",
            BlockType::Table => "table",
            BlockType::List => "list",
        }
    }

    /// Converts a string identifier into its corresponding BlockType variant.
    pub fn from_str(s: &str) -> Self {
        match s {
            "heading" => BlockType::Heading,
            "code" => BlockType::Code,
            "math" => BlockType::Math,
            "html_details" => BlockType::HtmlDetails,
            "table" => BlockType::Table,
            "list" => BlockType::List,
            _ => BlockType::Paragraph,
        }
    }
}

/// Represents an indexed document record stored for incremental mtime scanning.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: String,
    #[serde(alias = "absolute_path")]
    pub path: String,
    #[serde(alias = "file_mtime")]
    pub mtime: i64,
}

/// Represents a single structural block inside a parsed markdown document.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentBlock {
    pub id: String,
    pub document_id: String,
    pub block_type: BlockType,
    #[serde(default)]
    pub block_text: Option<String>,
    #[serde(alias = "content_text")]
    pub block_content: String,
    #[serde(alias = "sort_order")]
    pub order_number: usize,
}

impl DocumentBlock {
    /// Creates a new document block instance with deterministic ID.
    pub fn new(
        document_id: &str,
        order_number: usize,
        block_type: BlockType,
        block_content: String,
        block_text: Option<String>,
    ) -> Self {
        Self {
            id: format!("{}_blk_{}", document_id, order_number),
            document_id: document_id.to_string(),
            block_type,
            block_text,
            block_content,
            order_number,
        }
    }
}

/// Search result item returned across search layers to clients.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub document_id: String,
    pub relative_path: String,
    pub absolute_path: String,
    pub document_title: String,
    #[serde(default)]
    pub block_id: Option<String>,
    #[serde(default)]
    pub block_type: Option<String>,
    #[serde(default)]
    pub heading: Option<String>,
    pub snippet: String,
    pub line_number: usize,
    pub block_order: usize,
    pub score: f32,
    pub match_source: String,
}

/// Aggregated statistics generated from a directory scanning run.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanStats {
    pub updated: usize,
    pub unchanged: usize,
    pub deleted: usize,
    pub total: usize,
}
