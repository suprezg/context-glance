// ============================================================================
// File Name: indexer_tests.rs
// Purpose: In-depth integration tests for Tantivy Indexer and SearchIndex trait.
// ============================================================================

use context_glance_engine::domain::models::{BlockType, DocumentBlock};
use context_glance_engine::domain::traits::SearchIndex;
use context_glance_engine::storage::Indexer;

/// Helper constructing test document blocks.
fn make_blocks(doc_id: &str, items: &[(&str, BlockType)]) -> Vec<DocumentBlock> {
    items
        .iter()
        .enumerate()
        .map(|(i, (content, btype))| {
            DocumentBlock::new(
                doc_id,
                i,
                btype.clone(),
                content.to_string(),
                Some(content.to_string()),
            )
        })
        .collect()
}

/// Tests in-memory Tantivy index creation and basic BM25 search.
#[test]
fn test_in_memory_indexing_and_bm25_search() {
    let indexer = Indexer::new(None).unwrap();

    let blocks1 = make_blocks(
        "doc_oauth",
        &[
            ("# Authentication Architecture", BlockType::Heading),
            ("This service issues JSON Web Tokens and verifies PKCE signatures.", BlockType::Paragraph),
        ],
    );

    let blocks2 = make_blocks(
        "doc_vector",
        &[
            ("# Vector Search Engine", BlockType::Heading),
            ("Calculates cosine similarity and builds HNSW graph indexes.", BlockType::Paragraph),
        ],
    );

    // Index both documents and commit
    indexer
        .index_document("doc_oauth", "/docs/auth.md", "Authentication Architecture", &blocks1)
        .unwrap();
    indexer
        .index_document("doc_vector", "/docs/vector.md", "Vector Search Engine", &blocks2)
        .unwrap();
    indexer.commit().unwrap();

    // 1. Search for OAuth keyword
    let results_auth = indexer.search("Tokens", 10).unwrap();
    assert!(!results_auth.is_empty(), "Expected results for 'Tokens'");
    assert_eq!(results_auth[0].document_id, "doc_oauth");
    assert_eq!(results_auth[0].document_title, "Authentication Architecture");

    // 2. Search for Vector keyword
    let results_vec = indexer.search("cosine similarity", 10).unwrap();
    assert!(!results_vec.is_empty(), "Expected results for 'cosine similarity'");
    assert_eq!(results_vec[0].document_id, "doc_vector");
    assert_eq!(results_vec[0].document_title, "Vector Search Engine");

    // 3. Search non-existent term
    let results_none = indexer.search("cryptocurrency blockchain", 10).unwrap();
    assert!(results_none.is_empty(), "Unrelated terms must return empty");

    // 4. Empty query
    let results_empty = indexer.search("", 10).unwrap();
    assert!(results_empty.is_empty(), "Empty query must return empty");
}

/// Tests typo-tolerant fuzzy search fallback mechanism.
#[test]
fn test_fuzzy_search_typo_tolerance() {
    let indexer = Indexer::new(None).unwrap();

    let blocks = make_blocks(
        "doc_auth",
        &[
            ("# Authentication Microservice", BlockType::Heading),
            ("Provides cryptographic authorization.", BlockType::Paragraph),
        ],
    );

    indexer
        .index_document("doc_auth", "/docs/auth.md", "Authentication Microservice", &blocks)
        .unwrap();
    indexer.commit().unwrap();

    // Typo 1: 'autentication' (missing h)
    let res1 = indexer.search("autentication", 10).unwrap();
    assert!(!res1.is_empty(), "Fuzzy search must match 'autentication'");
    assert_eq!(res1[0].document_title, "Authentication Microservice");
    assert_eq!(res1[0].match_source, "tantivy_fuzzy");

    // Typo 2: 'microservise' (s instead of c)
    let res2 = indexer.search("microservise", 10).unwrap();
    assert!(!res2.is_empty(), "Fuzzy search must match 'microservise'");
    assert_eq!(res2[0].document_id, "doc_auth");
}

/// Tests document deletion from Tantivy index and verification.
#[test]
fn test_document_deletion_from_index() {
    let indexer = Indexer::new(None).unwrap();

    let blocks = make_blocks(
        "doc_delete_me",
        &[("Ephemeral content regarding secret algorithms.", BlockType::Paragraph)],
    );

    indexer
        .index_document("doc_delete_me", "/docs/secret.md", "Secret Algorithms", &blocks)
        .unwrap();
    indexer.commit().unwrap();

    // Verify searchable before deletion
    let before = indexer.search("Algorithms", 10).unwrap();
    assert!(!before.is_empty(), "Document should be indexed before deletion");
    assert!(before.iter().all(|r| r.document_id == "doc_delete_me"));

    // Delete document and commit
    indexer.delete_document("doc_delete_me").unwrap();
    indexer.commit().unwrap();

    // Verify completely purged from search
    let after = indexer.search("Algorithms", 10).unwrap();
    assert!(after.is_empty(), "Deleted document must return 0 search hits");
}

/// Tests re-indexing an existing document updates content and discards stale terms.
#[test]
fn test_document_reindexing_and_updates() {
    let indexer = Indexer::new(None).unwrap();

    // Initial version
    let blocks_v1 = make_blocks("doc_mutable", &[("Original Apple Fruit documentation", BlockType::Paragraph)]);
    indexer
        .index_document("doc_mutable", "/docs/item.md", "Apple Fruit", &blocks_v1)
        .unwrap();
    indexer.commit().unwrap();

    assert!(!indexer.search("Apple", 10).unwrap().is_empty());

    // Updated version replacing Apple with Banana
    let blocks_v2 = make_blocks("doc_mutable", &[("Revised Banana Tropical Fruit documentation", BlockType::Paragraph)]);
    indexer
        .index_document("doc_mutable", "/docs/item.md", "Banana Tropical", &blocks_v2)
        .unwrap();
    indexer.commit().unwrap();

    // Verify new term matches
    let res_banana = indexer.search("Banana", 10).unwrap();
    assert!(!res_banana.is_empty(), "Banana query should find updated document");
    assert_eq!(res_banana[0].document_title, "Banana Tropical");
    assert!(res_banana.iter().all(|r| r.document_id == "doc_mutable"));

    // Verify old term is purged
    let res_apple = indexer.search("Apple", 10).unwrap();
    assert!(res_apple.is_empty(), "Old terms from replaced document must not match");
}

/// Tests result limit clamping.
#[test]
fn test_search_result_limit() {
    let indexer = Indexer::new(None).unwrap();

    for i in 1..=5 {
        let id = format!("doc_{}", i);
        let blocks = make_blocks(&id, &[("Common shared documentation text", BlockType::Paragraph)]);
        indexer
            .index_document(&id, &format!("/docs/{}.md", i), "Common Doc", &blocks)
            .unwrap();
    }
    indexer.commit().unwrap();

    // Request limit of 2
    let results = indexer.search("Common", 2).unwrap();
    assert_eq!(results.len(), 2, "Limit must strictly cap result count");
}
