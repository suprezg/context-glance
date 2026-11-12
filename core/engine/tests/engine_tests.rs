// ============================================================================
// File Name: engine_tests.rs
// Purpose: Integration test suite for orchestrator, storage traits, indexer, and scanner.
// ============================================================================

use context_glance_engine::service::{parse_markdown, BlockType, Document, Orchestrator};
use context_glance_engine::storage::{Database, DirectoryTable, DocumentTable};
use std::fs;

/// Tests directory addition, retrieval, and removal through the Orchestrator interface.
#[test]
fn test_directory_management() {
    let tmp = tempfile::tempdir().unwrap();
    let doc_dir = tmp.path().join("docs");
    fs::create_dir_all(&doc_dir).unwrap();

    let mut engine = Orchestrator::new(None).unwrap();

    // 1. Add directory
    let added = engine.add_directory(&doc_dir.to_string_lossy()).unwrap();
    assert!(added, "Directory should be added successfully");

    let dirs = engine.get_directories();
    assert_eq!(dirs.len(), 1);

    // 2. Remove directory
    let removed = engine.remove_directory(&doc_dir.to_string_lossy()).unwrap();
    assert!(removed, "Directory should be removed successfully");

    let dirs_after = engine.get_directories();
    assert_eq!(dirs_after.len(), 0);
}

/// Tests initial directory scanning and verifies mtime avoids redundant reindexing.
#[test]
fn test_rescan_and_incremental_mtime() {
    let tmp = tempfile::tempdir().unwrap();
    let doc_dir = tmp.path().join("docs");
    fs::create_dir_all(&doc_dir).unwrap();

    let file1 = doc_dir.join("guide.md");
    fs::write(&file1, "# Getting Started\n\nWelcome to Context Glance!\n").unwrap();

    let mut engine = Orchestrator::new(None).unwrap();
    engine.add_directory(&doc_dir.to_string_lossy()).unwrap();

    // First scan: should index 1 file
    let stats1 = engine.rescan().unwrap();
    assert_eq!(stats1.updated, 1);
    assert_eq!(stats1.unchanged, 0);
    assert_eq!(stats1.total, 1);

    // Second scan without modification: should be 0 updated, 1 unchanged
    let stats2 = engine.rescan().unwrap();
    assert_eq!(stats2.updated, 0);
    assert_eq!(stats2.unchanged, 1);
    assert_eq!(stats2.total, 1);

    // Modify file
    std::thread::sleep(std::time::Duration::from_millis(50));
    fs::write(&file1, "# Getting Started\n\nUpdated documentation text!\n").unwrap();

    // Third scan: should update 1 file
    let stats3 = engine.rescan().unwrap();
    assert_eq!(stats3.updated, 1);
    assert_eq!(stats3.unchanged, 0);
}

/// Tests Tantivy BM25 full-text search and fuzzy prefix fallback.
#[test]
fn test_search_and_fuzzy_fallback() {
    let tmp = tempfile::tempdir().unwrap();
    let doc_dir = tmp.path().join("docs");
    fs::create_dir_all(&doc_dir).unwrap();

    let file1 = doc_dir.join("auth.md");
    fs::write(
        &file1,
        "# Authentication Service\n\nUse JSON Web Tokens and OAuth PKCE handshake.\n\n```typescript\nconst token = createJwt();\n```\n",
    )
    .unwrap();

    let mut engine = Orchestrator::new(None).unwrap();
    engine.add_directory(&doc_dir.to_string_lossy()).unwrap();
    engine.rescan().unwrap();

    // Exact BM25 search
    let results = engine.search("OAuth", 10).unwrap();
    assert!(!results.is_empty(), "Expected results for 'OAuth'");
    assert_eq!(results[0].document_title, "Authentication Service");

    // Typo / Fuzzy search
    let fuzzy_results = engine.search("autentication", 10).unwrap();
    assert!(
        !fuzzy_results.is_empty(),
        "Expected fuzzy search results for typo 'autentication'"
    );
    assert_eq!(fuzzy_results[0].document_title, "Authentication Service");
}

/// Tests reading markdown content from disk through the Orchestrator.
#[test]
fn test_get_markdown_content() {
    let tmp = tempfile::tempdir().unwrap();
    let doc_dir = tmp.path().join("docs");
    fs::create_dir_all(&doc_dir).unwrap();

    let file1 = doc_dir.join("api.md");
    let original_content = "# API Overview\n\nSome important API documentation.\n";
    fs::write(&file1, original_content).unwrap();

    let mut engine = Orchestrator::new(None).unwrap();
    engine.add_directory(&doc_dir.to_string_lossy()).unwrap();
    engine.rescan().unwrap();

    let content_by_path = engine
        .get_markdown_content(None, Some(&file1.to_string_lossy()))
        .unwrap();
    assert_eq!(content_by_path, original_content);
}

/// Verifies that paths outside configured directories are rejected.
#[test]
fn test_strictly_scoped_to_configured_directories() {
    let tmp = tempfile::tempdir().unwrap();

    // Directory A: Allowed & configured
    let allowed_dir = tmp.path().join("allowed_docs");
    fs::create_dir_all(&allowed_dir).unwrap();
    let allowed_file = allowed_dir.join("public.md");
    fs::write(
        &allowed_file,
        "# Public Knowledge Base\n\nThis is safe public documentation.\n",
    )
    .unwrap();

    // Directory B: Forbidden / Outside directory
    let outside_dir = tmp.path().join("outside_private");
    fs::create_dir_all(&outside_dir).unwrap();
    let outside_file = outside_dir.join("secrets.md");
    fs::write(
        &outside_file,
        "# Secret Internal Spec\n\nCLASSIFIED_TOKEN_99887766\n",
    )
    .unwrap();

    let mut engine = Orchestrator::new(None).unwrap();
    engine.add_directory(&allowed_dir.to_string_lossy()).unwrap();
    engine.rescan().unwrap();

    // Search for content inside allowed_dir: should find it
    let res_public = engine.search("Public", 10).unwrap();
    assert!(!res_public.is_empty(), "Should find matches inside configured allowed directory");
    assert!(res_public.iter().all(|r| r.document_title == "Public Knowledge Base"));

    // Search for secret token from outside_dir: MUST NEVER BE FOUND!
    let res_secret = engine.search("CLASSIFIED_TOKEN_99887766", 10).unwrap();
    assert!(
        res_secret.is_empty(),
        "CRITICAL: Engine returned matches from outside configured directories!"
    );

    // Attempting to read markdown content outside configured directory must fail
    let read_attempt = engine.get_markdown_content(None, Some(&outside_file.to_string_lossy()));
    assert!(
        read_attempt.is_err(),
        "Reading files outside configured directories must fail"
    );
}

/// Tests SQLite storage operations through DirectoryTable trait.
#[test]
fn test_storage_directory_table() {
    let mut db = Database::new();
    db.open_in_memory().unwrap();

    // Verify adding directory returns true
    let added = db.add_directory("/test/path/docs").unwrap();
    assert!(added);

    // Verify get_all_directories contains added path
    let dirs = db.get_all_directories().unwrap();
    assert_eq!(dirs, vec!["/test/path/docs".to_string()]);

    // Verify remove_directory returns true
    let removed = db.remove_directory("/test/path/docs").unwrap();
    assert!(removed);

    let dirs_after = db.get_all_directories().unwrap();
    assert!(dirs_after.is_empty());
}

/// Tests SQLite storage operations through DocumentTable trait.
#[test]
fn test_storage_document_table() {
    let mut db = Database::new();
    db.open_in_memory().unwrap();

    let doc = Document {
        id: "doc_test_1".to_string(),
        path: "/path/to/doc.md".to_string(),
        mtime: 123456789,
    };

    // Insert document
    let inserted = db.insert_document(&doc).unwrap();
    assert!(inserted);

    // Retrieve document by id
    let fetched = db.get_document_by_id("doc_test_1").unwrap().unwrap();
    assert_eq!(fetched.path, "/path/to/doc.md");
    assert_eq!(fetched.mtime, 123456789);

    // Retrieve all documents
    let all_docs = db.get_all_documents().unwrap();
    assert_eq!(all_docs.len(), 1);

    // Delete document
    let deleted_doc = db.delete_document("doc_test_1").unwrap();
    assert!(deleted_doc);
    assert!(db.get_document_by_id("doc_test_1").unwrap().is_none());
}

/// Tests pulldown-cmark scanner skipping files with script tags and extracting HTML properly.
#[test]
fn test_pulldown_cmark_parser_features() {
    // 1. Script tag rejection
    let with_script = "# Title\n\n<script type=\"text/javascript\">alert(1);</script>\nContent";
    let (t1, b1) = parse_markdown("s1", with_script);
    assert!(t1.is_empty());
    assert!(b1.is_empty());

    // 2. HTML details block extraction
    let with_details = "# Identity API\n\n<details><summary><b>Best Practices</b></summary><br><span>Rotate tokens</span></details>";
    let (t2, b2) = parse_markdown("s2", with_details);
    assert_eq!(t2, "Identity API");
    assert_eq!(b2.len(), 2);
    assert_eq!(b2[1].block_type, BlockType::HtmlDetails);
    let text = b2[1].block_text.as_ref().unwrap();
    assert!(text.contains("Best Practices"));
    assert!(text.contains("Rotate tokens"));
}
