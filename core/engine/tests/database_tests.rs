// ============================================================================
// File Name: database_tests.rs
// Purpose: In-depth integration tests for SQLite Database and DocumentStore trait.
// ============================================================================

use context_glance_engine::domain::models::Document;
use context_glance_engine::domain::traits::DocumentStore;
use context_glance_engine::storage::Database;

/// Tests in-memory database connection lifecycle and uninitialized access errors.
#[test]
fn test_database_connection_lifecycle() {
    let uninit_db = Database::new();

    // Verify uninitialized access returns error
    let access_err = uninit_db.get_all_directories();
    assert!(access_err.is_err(), "Accessing uninitialized DB must fail");

    // Open in-memory database
    let mut db = Database::new();
    let open_res = db.open_in_memory();
    assert!(open_res.is_ok(), "Opening in-memory DB must succeed");

    // Verify subsequent operation succeeds
    let dirs = db.get_all_directories().unwrap();
    assert!(dirs.is_empty(), "Fresh database must have no directories");
}

/// Tests directory addition, idempotent insertion, ordering, and deletion.
#[test]
fn test_directory_operations() {
    let mut db = Database::new();
    db.open_in_memory().unwrap();

    // 1. Add directories
    assert!(db.add_directory("/workspace/project_b").unwrap());
    assert!(db.add_directory("/workspace/project_a").unwrap());

    // 2. Test idempotence (adding duplicate path)
    assert!(db.add_directory("/workspace/project_a").unwrap());

    // 3. Verify alphabetical ordering
    let dirs = db.get_all_directories().unwrap();
    assert_eq!(dirs.len(), 2);
    assert_eq!(dirs[0], "/workspace/project_a");
    assert_eq!(dirs[1], "/workspace/project_b");

    // 4. Remove directory
    assert!(db.remove_directory("/workspace/project_a").unwrap());
    let dirs_after = db.get_all_directories().unwrap();
    assert_eq!(dirs_after.len(), 1);
    assert_eq!(dirs_after[0], "/workspace/project_b");

    // 5. Remove remaining directory
    assert!(db.remove_directory("/workspace/project_b").unwrap());
    assert!(db.get_all_directories().unwrap().is_empty());
}

/// Tests document CRUD operations, mtime updates, and queries.
#[test]
fn test_document_operations() {
    let mut db = Database::new();
    db.open_in_memory().unwrap();

    let doc1 = Document {
        id: "doc_auth".to_string(),
        path: "/docs/auth.md".to_string(),
        mtime: 1700000000,
    };

    let doc2 = Document {
        id: "doc_api".to_string(),
        path: "/docs/api.md".to_string(),
        mtime: 1700005000,
    };

    // 1. Insert documents
    assert!(db.insert_document(&doc1).unwrap());
    assert!(db.insert_document(&doc2).unwrap());

    // 2. Retrieve document by ID
    let fetched = db.get_document_by_id("doc_auth").unwrap().unwrap();
    assert_eq!(fetched.id, "doc_auth");
    assert_eq!(fetched.path, "/docs/auth.md");
    assert_eq!(fetched.mtime, 1700000000);

    // 3. Retrieve non-existent document
    let non_existent = db.get_document_by_id("doc_missing").unwrap();
    assert!(non_existent.is_none());

    // 4. Update document mtime via insert replacement
    let updated_doc1 = Document {
        id: "doc_auth".to_string(),
        path: "/docs/auth.md".to_string(),
        mtime: 1700099999,
    };
    assert!(db.insert_document(&updated_doc1).unwrap());
    let fetched_updated = db.get_document_by_id("doc_auth").unwrap().unwrap();
    assert_eq!(fetched_updated.mtime, 1700099999);

    // 5. Retrieve all documents
    let all_docs = db.get_all_documents().unwrap();
    assert_eq!(all_docs.len(), 2);

    // 6. Delete document
    assert!(db.delete_document("doc_auth").unwrap());
    assert!(db.get_document_by_id("doc_auth").unwrap().is_none());
    assert_eq!(db.get_all_documents().unwrap().len(), 1);
}

/// Tests disk-based SQLite creation, directory parent auto-generation, and reconnecting.
#[test]
fn test_disk_database_persistence() {
    let tmp = tempfile::tempdir().unwrap();
    let db_path = tmp.path().join("subfolder").join("test_persist.db");

    // 1. Open database in non-existent subfolder (should auto-create directory)
    {
        let mut db = Database::new();
        db.open(&db_path).unwrap();
        db.add_directory("/data/source").unwrap();
        db.insert_document(&Document {
            id: "doc_disk".to_string(),
            path: "/data/source/guide.md".to_string(),
            mtime: 42,
        })
        .unwrap();
    }

    // 2. Re-open existing database and verify data persisted
    {
        let mut db = Database::new();
        db.open(&db_path).unwrap();
        let dirs = db.get_all_directories().unwrap();
        assert_eq!(dirs, vec!["/data/source".to_string()]);

        let doc = db.get_document_by_id("doc_disk").unwrap().unwrap();
        assert_eq!(doc.id, "doc_disk");
        assert_eq!(doc.mtime, 42);
    }
}
