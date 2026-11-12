// ============================================================================
// File Name: scanner.rs
// Purpose: Pulldown-cmark based Markdown scanner and block extraction service.
// ============================================================================

use crate::domain::models::{BlockType, DocumentBlock};
use crate::domain::traits::ContentScanner;
use pulldown_cmark::{Event, Options, Parser, Tag};
use regex::Regex;
use std::ops::Range;
use std::sync::LazyLock;

/// Static regular expression matching HTML tags for text cleanup.
static RE_HTML_TAGS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"</?[a-zA-Z0-9_-]+(\s+[^>]*)?>").unwrap());

/// Concrete scanner implementation wrapping pulldown-cmark.
pub struct PulldownScanner;

impl PulldownScanner {
    /// Creates a new PulldownScanner instance.
    pub fn new() -> Self {
        Self
    }
}

impl Default for PulldownScanner {
    fn default() -> Self {
        Self::new()
    }
}

impl ContentScanner for PulldownScanner {
    /// Parses a markdown string into a title and list of typed document blocks.
    fn scan(&self, doc_id: &str, content: &str) -> (String, Vec<DocumentBlock>) {
        scan_markdown(doc_id, content)
    }
}

/// Parses a markdown string into a title and list of typed document blocks.
pub fn scan_markdown(doc_id: &str, content: &str) -> (String, Vec<DocumentBlock>) {
    // Prohibit and skip files containing script tags
    let lower_content = content.to_lowercase();
    if lower_content.contains("<script") {
        return (String::new(), Vec::new());
    }

    // Configure pulldown-cmark options (excluding footnotes, smart punctuation, heading attributes, metadata, wikilinks)
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_MATH);

    let parser = Parser::new_ext(content, options);
    let mut ctx = ScanContext::new(doc_id);

    // Iterate through markdown events with dedicated per-event handlers
    for (event, range) in parser.into_offset_iter() {
        match event {
            Event::Start(tag) => handle_start_event(tag, range.start, &mut ctx),
            Event::End(_) => handle_end_event(range.end, content, &mut ctx),
            Event::Text(cow_str) => handle_text_event(&cow_str, &mut ctx),
            Event::Code(cow_str) => handle_code_event(&cow_str, &mut ctx),
            Event::InlineMath(cow_str) | Event::DisplayMath(cow_str) => {
                handle_math_event(&cow_str, range, &mut ctx)
            }
            Event::Html(cow_str) | Event::InlineHtml(cow_str) => {
                handle_html_event(&cow_str, &mut ctx)
            }
            Event::SoftBreak | Event::HardBreak => handle_break_event(&mut ctx),
            _ => {}
        }
    }

    // Determine final title fallback
    let title = ctx.document_title.unwrap_or_else(|| "Untitled".to_string());
    (title, ctx.blocks)
}

/// Backward-compatible alias for scan_markdown.
pub use scan_markdown as parse_markdown;

/// Internal state tracker maintained during event iteration.
struct ScanContext {
    doc_id: String,
    document_title: Option<String>,
    blocks: Vec<DocumentBlock>,
    order_number: usize,
    current_block_type: BlockType,
    current_start: usize,
    current_text: String,
    depth: usize,
    in_block: bool,
}

impl ScanContext {
    /// Creates a new ScanContext for the specified document identifier.
    fn new(doc_id: &str) -> Self {
        Self {
            doc_id: doc_id.to_string(),
            document_title: None,
            blocks: Vec::new(),
            order_number: 0,
            current_block_type: BlockType::Paragraph,
            current_start: 0,
            current_text: String::new(),
            depth: 0,
            in_block: false,
        }
    }
}

/// Handles the start of a block or inline tag.
fn handle_start_event(tag: Tag, start_offset: usize, ctx: &mut ScanContext) {
    if ctx.depth == 0 {
        ctx.current_start = start_offset;
        ctx.current_text.clear();
        ctx.in_block = true;
        ctx.current_block_type = match tag {
            Tag::Heading { .. } => BlockType::Heading,
            Tag::CodeBlock(_) => BlockType::Code,
            Tag::Table(_) => BlockType::Table,
            Tag::List(_) => BlockType::List,
            Tag::HtmlBlock => BlockType::HtmlDetails,
            _ => BlockType::Paragraph,
        };
    }
    ctx.depth += 1;
}

/// Handles the end of a block or tag, finalizing top-level blocks.
fn handle_end_event(end_offset: usize, content: &str, ctx: &mut ScanContext) {
    if ctx.depth == 0 {
        return;
    }
    ctx.depth -= 1;

    // Finalize block when returning to root depth
    if ctx.depth == 0 {
        let clamped_end = end_offset.min(content.len());
        let raw_content = content[ctx.current_start..clamped_end].trim().to_string();

        if !raw_content.is_empty() {
            let text_clean = clean_text(&ctx.current_text);

            // Classify block type based on tag and raw content
            let final_type = if raw_content.to_lowercase().contains("<details") {
                BlockType::HtmlDetails
            } else if ctx.current_block_type == BlockType::Paragraph
                && (raw_content.starts_with("$$") || raw_content.ends_with("$$"))
            {
                BlockType::Math
            } else {
                ctx.current_block_type.clone()
            };

            // Set document title from the first heading
            if final_type == BlockType::Heading && ctx.document_title.is_none() {
                ctx.document_title = Some(text_clean.clone());
            }

            ctx.blocks.push(DocumentBlock::new(
                &ctx.doc_id,
                ctx.order_number,
                final_type,
                raw_content,
                Some(text_clean),
            ));
            ctx.order_number += 1;
        }

        ctx.in_block = false;
        ctx.current_text.clear();
    }
}

/// Handles plain text content within an active block.
fn handle_text_event(text: &str, ctx: &mut ScanContext) {
    if ctx.in_block {
        ctx.current_text.push_str(text);
        ctx.current_text.push(' ');
    }
}

/// Handles inline code content within an active block.
fn handle_code_event(code: &str, ctx: &mut ScanContext) {
    if ctx.in_block {
        ctx.current_text.push_str(code);
        ctx.current_text.push(' ');
    }
}

/// Handles math formulas either as standalone blocks or inline math text.
fn handle_math_event(math: &str, _range: Range<usize>, ctx: &mut ScanContext) {
    if ctx.depth == 0 {
        let raw = format!("$${}$$", math);
        let text = math.to_string();
        ctx.blocks.push(DocumentBlock::new(
            &ctx.doc_id,
            ctx.order_number,
            BlockType::Math,
            raw,
            Some(text),
        ));
        ctx.order_number += 1;
    } else {
        ctx.current_text.push_str(math);
        ctx.current_text.push(' ');
    }
}

/// Handles HTML content, separating top-level blocks from inline tags.
fn handle_html_event(html: &str, ctx: &mut ScanContext) {
    let html_str = html.trim();
    if ctx.depth == 0 {
        if !html_str.is_empty() {
            let is_details = html_str.to_lowercase().contains("<details");
            let block_type = if is_details {
                BlockType::HtmlDetails
            } else {
                BlockType::Paragraph
            };
            let text_clean = clean_html_text(html_str);
            ctx.blocks.push(DocumentBlock::new(
                &ctx.doc_id,
                ctx.order_number,
                block_type,
                html_str.to_string(),
                Some(text_clean),
            ));
            ctx.order_number += 1;
        }
    } else {
        let cleaned_inline = clean_html_text(html);
        if !cleaned_inline.is_empty() {
            ctx.current_text.push_str(&cleaned_inline);
            ctx.current_text.push(' ');
        }
    }
}

/// Handles line breaks and soft breaks by adding word separators.
fn handle_break_event(ctx: &mut ScanContext) {
    if ctx.in_block {
        ctx.current_text.push(' ');
    }
}

/// Normalizes whitespace in accumulated text content.
fn clean_text(raw: &str) -> String {
    raw.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Strips HTML tags and normalizes whitespace for search text.
fn clean_html_text(raw_html: &str) -> String {
    let with_breaks = raw_html
        .replace("<br>", " ")
        .replace("<br/>", " ")
        .replace("<br />", " ");
    let stripped = RE_HTML_TAGS.replace_all(&with_breaks, " ");
    stripped.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_script_tag_skipped() {
        let content = "# Header\n\n<script>alert('pwned');</script>\n\nParagraph.";
        let (title, blocks) = scan_markdown("doc_1", content);
        assert!(title.is_empty());
        assert!(blocks.is_empty());
    }

    #[test]
    fn test_headings_and_title() {
        let content = "# Main Heading\n\nSome introductory text.\n\n## Subheading\n";
        let (title, blocks) = scan_markdown("doc_2", content);
        assert_eq!(title, "Main Heading");
        assert_eq!(blocks.len(), 3);
        assert_eq!(blocks[0].block_type, BlockType::Heading);
        assert_eq!(blocks[1].block_type, BlockType::Paragraph);
        assert_eq!(blocks[2].block_type, BlockType::Heading);
    }

    #[test]
    fn test_code_block() {
        let content = "```rust\nfn main() {}\n```";
        let (_, blocks) = scan_markdown("doc_3", content);
        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0].block_type, BlockType::Code);
    }

    #[test]
    fn test_table() {
        let content = "| Col 1 | Col 2 |\n|---|---|\n| Val 1 | Val 2 |";
        let (_, blocks) = scan_markdown("doc_4", content);
        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0].block_type, BlockType::Table);
    }

    #[test]
    fn test_list() {
        let content = "- Item 1\n- Item 2\n- Item 3";
        let (_, blocks) = scan_markdown("doc_5", content);
        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0].block_type, BlockType::List);
    }

    #[test]
    fn test_html_details_and_tags() {
        let content = "<details>\n<summary><b>Details Title</b></summary>\n<br><span>Details Body</span>\n</details>";
        let (_, blocks) = scan_markdown("doc_6", content);
        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0].block_type, BlockType::HtmlDetails);
        let text = blocks[0].block_text.as_ref().unwrap();
        assert!(text.contains("Details Title"));
        assert!(text.contains("Details Body"));
    }
}
