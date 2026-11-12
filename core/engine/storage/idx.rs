// ============================================================================
// File Name: idx.rs
// Purpose: Full-text indexing and BM25/fuzzy search powered by Tantivy.
// ============================================================================

use crate::domain::models::{DocumentBlock, SearchResult};
use crate::domain::traits::SearchIndex;
use crate::service::snippet::create_snippet;
use anyhow::{anyhow, Result};
use std::path::Path;
use std::sync::{Arc, RwLock};
use tantivy::collector::TopDocs;
use tantivy::query::{BooleanQuery, FuzzyTermQuery, Occur, Query, QueryParser};
use tantivy::schema::*;
use tantivy::{Index, IndexReader, IndexWriter, ReloadPolicy, Term};

/// Full-text search indexer managing Tantivy index, writer, and searchers.
pub struct Indexer {
    index: Index,
    reader: IndexReader,
    writer: Arc<RwLock<IndexWriter>>,
    doc_id_field: Field,
    path_field: Field,
    block_order_field: Field,
    title_field: Field,
    block_content_field: Field,
}

/// Architectural alias for Tantivy implementation of SearchIndex.
pub type TantivyIndex = Indexer;

impl Indexer {
    /// Creates a new Indexer instance backed by directory storage or memory.
    pub fn new(index_dir: Option<&Path>) -> Result<Self> {
        let mut schema_builder = Schema::builder();
        let doc_id_field = schema_builder.add_text_field("doc_id", STRING | STORED);
        let path_field = schema_builder.add_text_field("path", STRING | STORED);
        let block_order_field = schema_builder.add_u64_field("block_order", STORED | INDEXED);
        let title_field = schema_builder.add_text_field("title", TEXT | STORED);
        let block_content_field = schema_builder.add_text_field("block_content", TEXT | STORED);
        let schema = schema_builder.build();

        let index = match index_dir {
            Some(dir) => {
                std::fs::create_dir_all(dir)?;
                Index::open_or_create(tantivy::directory::MmapDirectory::open(dir)?, schema.clone())?
            }
            None => Index::create_in_ram(schema.clone()),
        };

        let writer = index.writer(50_000_000)?;
        let reader = index
            .reader_builder()
            .reload_policy(ReloadPolicy::OnCommitWithDelay)
            .try_into()?;

        Ok(Self {
            index,
            reader,
            writer: Arc::new(RwLock::new(writer)),
            doc_id_field,
            path_field,
            block_order_field,
            title_field,
            block_content_field,
        })
    }

    /// Extracts a string reference from a Tantivy document field.
    fn get_field_str<'a>(&self, doc: &'a TantivyDocument, field: Field) -> &'a str {
        doc.get_first(field)
            .and_then(|v| v.as_str())
            .unwrap_or("")
    }

    /// Converts a retrieved Tantivy document into a domain SearchResult.
    fn to_search_result(
        &self,
        doc: &TantivyDocument,
        score: f32,
        query: &str,
        source: &str,
    ) -> SearchResult {
        let content = self.get_field_str(doc, self.block_content_field);
        let title_str = self.get_field_str(doc, self.title_field);
        let document_title = if title_str.is_empty() {
            "Untitled".to_string()
        } else {
            title_str.to_string()
        };

        let path = self.get_field_str(doc, self.path_field).to_string();
        let block_order = doc
            .get_first(self.block_order_field)
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as usize;

        let relative_path = Path::new(&path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| path.clone());

        SearchResult {
            document_id: self.get_field_str(doc, self.doc_id_field).to_string(),
            relative_path,
            absolute_path: path,
            document_title,
            block_id: None,
            block_type: None,
            heading: None,
            snippet: create_snippet(content, query),
            line_number: block_order + 1,
            block_order,
            score,
            match_source: source.to_string(),
        }
    }
}

impl SearchIndex for Indexer {
    /// Deletes all indexed documents matching the provided document ID.
    fn delete_document(&self, doc_id: &str) -> Result<()> {
        let term = Term::from_field_text(self.doc_id_field, doc_id);
        let writer = self
            .writer
            .write()
            .map_err(|e| anyhow!("Failed to acquire write lock: {}", e))?;

        writer.delete_term(term);
        Ok(())
    }

    /// Indexes a document and its parsed blocks into Tantivy.
    fn index_document(
        &self,
        doc_id: &str,
        path: &str,
        title: &str,
        blocks: &[DocumentBlock],
    ) -> Result<()> {
        let writer = self
            .writer
            .write()
            .map_err(|e| anyhow!("Failed to acquire write lock: {}", e))?;

        // Purge previous index entries for document
        let term = Term::from_field_text(self.doc_id_field, doc_id);
        writer.delete_term(term);

        // Index document-level entry
        let mut doc_entry = TantivyDocument::default();
        doc_entry.add_text(self.doc_id_field, doc_id);
        doc_entry.add_text(self.path_field, path);
        doc_entry.add_u64(self.block_order_field, 0);
        doc_entry.add_text(self.title_field, title);
        doc_entry.add_text(self.block_content_field, title);
        writer.add_document(doc_entry)?;

        // Index block-level entries
        for block in blocks {
            let mut block_entry = TantivyDocument::default();
            block_entry.add_text(self.doc_id_field, doc_id);
            block_entry.add_text(self.path_field, path);
            block_entry.add_u64(self.block_order_field, block.order_number as u64);
            block_entry.add_text(self.title_field, title);

            let content_text = block.block_text.as_deref().unwrap_or(&block.block_content);
            block_entry.add_text(self.block_content_field, content_text);
            writer.add_document(block_entry)?;
        }

        Ok(())
    }

    /// Commits active write operations and reloads search readers.
    fn commit(&self) -> Result<()> {
        let mut writer = self
            .writer
            .write()
            .map_err(|e| anyhow!("Failed to acquire write lock: {}", e))?;

        writer.commit()?;
        self.reader.reload()?;
        Ok(())
    }

    /// Executes BM25 search across title and block content with fuzzy fallback.
    fn search(&self, query_str: &str, limit: usize) -> Result<Vec<SearchResult>> {
        let searcher = self.reader.searcher();
        let query_clean = query_str.trim();
        if query_clean.is_empty() {
            return Ok(Vec::new());
        }

        let mut parser = QueryParser::for_index(
            &self.index,
            vec![self.title_field, self.block_content_field],
        );
        parser.set_field_boost(self.title_field, 3.0);
        parser.set_field_boost(self.block_content_field, 1.0);

        let parsed_query = parser.parse_query(query_clean);
        let mut results = Vec::new();

        if let Ok(q) = parsed_query {
            let top_collector = TopDocs::with_limit(limit).order_by_score();
            let top_docs = searcher.search(&q, &top_collector)?;
            for (score, doc_address) in top_docs {
                let retrieved: TantivyDocument = searcher.doc(doc_address)?;
                results.push(self.to_search_result(&retrieved, score, query_clean, "tantivy_bm25"));
            }
        }

        // Fall back to fuzzy search on title and block content if BM25 yielded no matches
        if results.is_empty() {
            let words: Vec<&str> = query_clean.split_whitespace().collect();
            let mut subqueries: Vec<(Occur, Box<dyn Query>)> = Vec::new();

            for word in words {
                let lower = word.to_lowercase();
                subqueries.push((
                    Occur::Should,
                    Box::new(FuzzyTermQuery::new_prefix(
                        Term::from_field_text(self.title_field, &lower),
                        1,
                        true,
                    )),
                ));
                subqueries.push((
                    Occur::Should,
                    Box::new(FuzzyTermQuery::new_prefix(
                        Term::from_field_text(self.block_content_field, &lower),
                        1,
                        true,
                    )),
                ));
            }

            if !subqueries.is_empty() {
                let boolean_query = BooleanQuery::new(subqueries);
                let top_collector = TopDocs::with_limit(limit).order_by_score();
                let top_docs = searcher.search(&boolean_query, &top_collector)?;
                for (score, doc_address) in top_docs {
                    let retrieved: TantivyDocument = searcher.doc(doc_address)?;
                    results.push(self.to_search_result(
                        &retrieved,
                        score,
                        query_clean,
                        "tantivy_fuzzy",
                    ));
                }
            }
        }

        Ok(results)
    }
}
