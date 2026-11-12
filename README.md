# Context Glance

<p align="center">
    <img src="assets/banner.png" alt="Context Glance Banner">
    <br />
    <br />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Rust_Engine-dea584?style=for-the-badge&logo=rust&logoColor=white" alt="Rust">
    <br />
    <img src="https://img.shields.io/badge/VS_Code_Extension-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white" alt="VS Code Extension">
    <img src="https://img.shields.io/badge/Tantivy-Search_Engine-ff6600?style=for-the-badge" alt="Tantivy">
    <img src="https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite 3">
    <img src="https://img.shields.io/badge/Diagrams-Mermaid-ff3670?style=for-the-badge&logo=mermaid&logoColor=white" alt="Mermaid Diagrams">
    <img src="https://img.shields.io/badge/LaTeX-KaTeX-11a880?style=for-the-badge&logo=latex&logoColor=white" alt="KaTeX Math">
    <br />
    <br />
    <i>In Editor Keyboard Driven Knowledge Navigator</i>
</p>

## Abstract

Context Glance is a high-performance referencer designed to reference knowledge stored in Markdown files. It enables you to reference your existing personal and team knowledge bases from tools such as Obsidian, Logseq, or Foam directly within your development environment. Whether you are consulting technical documentation, API guides, architecture specifications, or project runbooks, Context Glance keeps your technical knowledge readily accessible alongside your source code.

Context Glance provides keyboard-first, Vim-style navigation that lets you navigate through entire Markdown documents using only the keyboard. It enables you to yank (copy) code blocks and LaTeX mathematical equations directly to your system clipboard with a single keypress. Note that Context Glance yanks content directly to your clipboard rather than inserting it at your editor cursor position, giving you full control over when and where you paste it.

The system features fast and typo-tolerant search powered by an indexed BM25 search mechanism with an automated fuzzy search fallback. It accepts multi-directory configurations with fast background scanning and indexing across multiple knowledge bases. Context Glance presents your documentation in a 2D minimalist interface supporting Mermaid diagrams, LaTeX/KaTeX mathematical formulas, and syntax-highlighted code blocks, equipped with two default pre-configured themes (Dark and Light) and an automated custom theme palette generator.

## Objective

Context Glance is built to achieve two core objectives:

The first objective is seamless in-editor reference. Developers frequently lose focus jumping between editor windows and external web browsers, or managing dozens of open documentation tabs. Context Glance eliminates this friction by bringing reference documentation directly into the editor viewport, allowing you to search, read, and cross-reference technical documentation without switching windows or interrupting your flow.

The second objective is 100% keyboard-driven navigation. Navigating and referencing documentation should never require reaching for a mouse. With Context Glance, every interaction—switching between open documents, scrolling and jumping across content blocks, searching, yanking code and formulas to the clipboard, and closing tabs—is executed entirely through the keyboard. You can switch, reference, navigate, and close any document while staying completely on the keyboard without ever touching the mouse.

## Features

### Functional

- **Multiple Document Viewing Support**: Open and concurrently reference multiple documents inside a single VS Code webview panel, navigated entirely with single-key shortcuts without requiring multi-key chords or complex combinations like `Ctrl+Tab`.
- **100% Keyboard-Driven Vim-Style Navigation**: Complete hands-on-keyboard experience where searching, block navigation, clipboard yanking, tab switching, and closing are all performed through keyboard keys.
- **Multiple Directory Support**: Connect and index multiple documentation folders and knowledge base repositories concurrently.
- **Rich Media Support**: Full Markdown rendering along with safe HTML tags (`<u>`, `<b>`, `<i>`, `<details>`, `<summary>`), offline Mermaid architecture diagrams, LaTeX/KaTeX mathematical equations, tables, blockquotes, and lists.
- **2D Flat Minimal Uncluttered UI**: Clean, distraction-free 2D interface with zero artificial elevations, featuring two pre-configured themes (Dark and Light) alongside an automated custom theme calculator that derives balanced palettes from your chosen base colors.
- **In-Tab Search Modal**: Fast search overlay embedded within the tab view, providing real-time keyword highlighting, keyboard arrow navigation, and instant document selection.

### Non Functional

- **Fast & Typo-Tolerant Search**: High-speed indexed search powered by Tantivy BM25 relevance scoring with an automated fuzzy search fallback for typo tolerance.
- **Decoupled Architecture**: Native background engine decoupled into an independent process communicating over JSON-RPC via standard pipes (`stdio`). The engine handles all background crawling, file parsing, indexing, and search execution, keeping the VS Code main UI thread unblocked and responsive at 60 FPS.
- **Strict Directory Scoping**: Security-first path verification ensuring the engine only searches, reads, and accesses files located strictly within user-configured directories.
- **Complete Offline Operation & Privacy**: 100% local execution with zero network calls, zero telemetry, and zero external runtime dependencies.
- **Fast Incremental MTime Synchronization**: Directory crawler inspects file modification timestamps (`mtime`) to re-index only altered or newly added files, avoiding redundant disk I/O.
- **Low Memory Footprint**: Compact Tantivy segment structures and SQLite cache management maintain a minimal background memory footprint.

## Prerequisites

### Requirements

To compile and build Context Glance from source on your local system:

- Visual Studio Code version `^1.90.0` or higher
- Node.js runtime `v18.x` or `v20.x+` (LTS recommended) and npm
- Rust toolchain 1.75+ (`cargo` and `rustc`)
- Operating system: Linux (x86_64 / arm64), macOS (Apple Silicon / Intel), or Windows 10/11

### Dependencies

To run and use Context Glance directly without building from source:

- Visual Studio Code version `^1.90.0` or higher (or compatible distribution such as VSCodium)
- Local documentation directories containing Markdown files (`.md`, `.markdown`)

## Getting Started

Installation and Usage Guidelines are inside the [docs/begin.md](docs/begin.md).
