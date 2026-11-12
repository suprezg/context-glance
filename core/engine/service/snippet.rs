// ============================================================================
// File Name: snippet.rs
// Purpose: Text excerpt extraction and ellipsis snippet formatting utility.
// ============================================================================

/// Creates an ellipsis-delimited text snippet around matched search terms.
pub fn create_snippet(text: &str, term: &str) -> String {
    let clean = text
        .replace('\n', " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    let lower = clean.to_lowercase();
    let term_lower = term.to_lowercase();

    if let Some(pos) = lower.find(&term_lower) {
        let start = if pos > 40 { pos - 40 } else { 0 };
        let end = (pos + term.len() + 80).min(clean.len());
        let mut s = clean[start..end].to_string();
        if start > 0 {
            s = format!("...{}", s);
        }
        if end < clean.len() {
            s = format!("{}...", s);
        }
        s
    } else {
        if clean.len() > 120 {
            format!("{}...", &clean[..120])
        } else {
            clean
        }
    }
}
