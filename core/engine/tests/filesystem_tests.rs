// ============================================================================
// File Name: filesystem_tests.rs
// Purpose: Integration tests for LocalFileSystem and FileSystem trait abstraction.
// ============================================================================

use context_glance_engine::domain::traits::FileSystem;
use context_glance_engine::io::LocalFileSystem;
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use tempfile::tempdir;

/// Tests discovering markdown files with exclusion of build and hidden folders.
#[test]
fn test_discover_markdown_files_and_exclusions() {
    let temp_dir = tempdir().unwrap();
    let root = temp_dir.path();

    // Create valid markdown files in root and nested directories
    fs::write(root.join("root_doc.md"), "# Root Document").unwrap();
    let sub_dir = root.join("subfolder");
    fs::create_dir_all(&sub_dir).unwrap();
    fs::write(sub_dir.join("sub_doc.MD"), "## Sub Document").unwrap();

    // Create non-markdown file in valid folder
    fs::write(root.join("notes.txt"), "plain text").unwrap();

    // Create markdown files in folders that must be ignored
    let node_modules = root.join("node_modules");
    fs::create_dir_all(&node_modules).unwrap();
    fs::write(node_modules.join("package.md"), "# Package Readme").unwrap();

    let target_dir = root.join("target");
    fs::create_dir_all(&target_dir).unwrap();
    fs::write(target_dir.join("build.md"), "# Build Log").unwrap();

    let hidden_dir = root.join(".git");
    fs::create_dir_all(&hidden_dir).unwrap();
    fs::write(hidden_dir.join("config.md"), "# Git Config").unwrap();

    let fs_adapter = LocalFileSystem::new();
    let mut dirs = HashSet::new();
    dirs.insert(root.to_path_buf());

    let discovered = fs_adapter.discover_markdown_files(&dirs);

    // Only root_doc.md and sub_doc.MD should be discovered (case-insensitive extension)
    assert_eq!(discovered.len(), 2, "Discovered files count mismatch");
    let file_names: Vec<String> = discovered
        .iter()
        .map(|p| p.file_name().unwrap().to_string_lossy().to_string())
        .collect();

    assert!(file_names.contains(&"root_doc.md".to_string()));
    assert!(file_names.contains(&"sub_doc.MD".to_string()));
}

/// Tests verifying path boundary confinement within configured directories.
#[test]
fn test_path_in_configured_directories() {
    let fs_adapter = LocalFileSystem::new();
    let base1 = PathBuf::from("/workspace/project1");
    let base2 = PathBuf::from("/workspace/docs");

    let mut configured = HashSet::new();
    configured.insert(base1.clone());
    configured.insert(base2.clone());

    // Valid paths within configured directories
    let valid_child1 = PathBuf::from("/workspace/project1/src/readme.md");
    let valid_child2 = PathBuf::from("/workspace/docs/guide.md");
    assert!(fs_adapter.is_path_in_configured_directories(&valid_child1, &configured));
    assert!(fs_adapter.is_path_in_configured_directories(&valid_child2, &configured));

    // Outside paths
    let outside_path1 = PathBuf::from("/workspace/project2/src/readme.md");
    let outside_path2 = PathBuf::from("/etc/passwd");
    assert!(!fs_adapter.is_path_in_configured_directories(&outside_path1, &configured));
    assert!(!fs_adapter.is_path_in_configured_directories(&outside_path2, &configured));
}

/// Tests reading file contents and obtaining modification timestamp.
#[test]
fn test_read_file_to_string_and_mtime() {
    let temp_dir = tempdir().unwrap();
    let file_path = temp_dir.path().join("sample.md");
    let expected_content = "# Architecture\n\nModular design with inverted dependencies.";

    fs::write(&file_path, expected_content).unwrap();

    let fs_adapter = LocalFileSystem::new();

    // Verify reading valid file content
    let content = fs_adapter.read_file_to_string(&file_path).unwrap();
    assert_eq!(content, expected_content);

    // Verify mtime retrieval
    let mtime = fs_adapter.get_mtime(&file_path).unwrap();
    assert!(mtime > 0, "mtime must be a positive unix millisecond timestamp");

    // Verify non-existent file reading returns an error
    let non_existent = temp_dir.path().join("does_not_exist.md");
    assert!(fs_adapter.read_file_to_string(&non_existent).is_err());
    assert!(fs_adapter.get_mtime(&non_existent).is_err());
}

/// Tests canonicalizing existing and non-existing paths.
#[test]
fn test_canonicalize() {
    let temp_dir = tempdir().unwrap();
    let file_path = temp_dir.path().join("real.md");
    fs::write(&file_path, "content").unwrap();

    let fs_adapter = LocalFileSystem::new();

    // Canonicalize existing path
    let canonical = fs_adapter.canonicalize(file_path.to_str().unwrap()).unwrap();
    assert!(canonical.exists(), "Canonicalized path must exist");

    // Canonicalize non-existing path falls back gracefully without panicking
    let fake_path = "/non/existent/path/for/sure/doc.md";
    let fallback = fs_adapter.canonicalize(fake_path).unwrap();
    assert_eq!(fallback, PathBuf::from(fake_path));
}
