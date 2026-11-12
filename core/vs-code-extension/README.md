# Context Glance

<p align="center">
    <img src="../../assets/banner.png" alt="Context Glance Banner">
    <br />
    <br />
    <img src="https://img.shields.io/badge/VS_Code_Extension-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white" alt="VS Code Extension">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Rust_Engine-Tantivy_Search-dea584?style=for-the-badge&logo=rust&logoColor=white" alt="Rust Engine & Tantivy">
    <img src="https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite 3">
    <img src="https://img.shields.io/badge/LaTeX-KaTeX-11a880?style=for-the-badge&logo=latex&logoColor=white" alt="KaTeX Math">
    <img src="https://img.shields.io/badge/Diagrams-Mermaid-ff3670?style=for-the-badge&logo=mermaid&logoColor=white" alt="Mermaid Diagrams">
    <br />
    <br />
    <i>In-Editor Technical Knowledge Navigator — A tab-based, keyboard-first documentation glance, rich media reference, and code snippet injection engine for Visual Studio Code.</i>
</p>

> [!NOTE]
> **Active Development:** This project is currently a work in progress and is being actively built.

## Abstract

**Context Glance** is a high-performance, keyboard-centric Visual Studio Code extension engineered to eliminate context switching and streamline technical reference workflows. It allows developers to browse project documentation, runbooks, architectural specifications, and personal knowledge bases (e.g., Obsidian, Foam, Logseq) directly alongside their code in an integrated tab view.

The system is architected around a native compiled **Rust background engine** (`core/engine`) communicating with the VS Code extension host over a JSON-RPC stdio transport. The engine utilizes **Tantivy** for high-speed BM25 full-text indexing and typo-tolerant fuzzy search, backed by an embedded **SQLite** database for directory tracking and document synchronization. Markdown files are parsed into semantic structural blocks using `pulldown-cmark`, filtering out untrusted scripts while preserving safe formatting and inline HTML tags (`<br>`, `<b>`, `<code>`, `<details>`, `<summary>`).

Context Glance operates through a **Dedicated Tab View** with multi-document tab management. Developers can switch documents with `a`/`d`, close tabs with `x`, navigate blocks with Vim homerow bindings (`j`, `k`, `t`, `b`), jump between code and math blocks with `n`/`p`, and yank (`y`) code snippets or LaTeX equations directly into the active editor cursor with pristine indentation. With a distraction-free, 2D minimalist interface and built-in offline rendering for **Mermaid diagrams**, **LaTeX/KaTeX math formulas**, and syntax-highlighted code blocks, Context Glance keeps your technical knowledge readily accessible without ever leaving the keyboard.

## Objective

Context Glance aims to solve three fundamental friction points in the modern developer experience:

1. **Integrated In-Editor Reference (Tab-Based Workflow)**: Eliminates the jarring context switch to external web browsers or second screens. Context Glance opens reference guides directly in a native tab beside your code, allowing seamless `Ctrl+Tab` cycling or Vim-style tab switching (`a`/`d`) within your existing workspace.
2. **Blazing-Fast Hybrid Retrieval**: Navigating large directory trees with naive text searches is slow and noisy. Context Glance leverages a native Rust search pipeline combining Tantivy BM25 relevance scoring across document titles and block content with an automatic fuzzy fallback for typo tolerance.
3. **100% Keyboard Ergonomics & Snippet Yanking**: Developers should never have to reach for a mouse to search, navigate, or copy documentation. Context Glance provides a complete hands-on-keyboard experience: search with `s`, navigate blocks with `j`/`k`, hop between code/math blocks with `n`/`p`, and yank (`y`) code snippets or LaTeX equations directly into the active editor at the exact cursor position.

## Features

### Functional

- **Tab-Based Multi-Document Viewport**: Dedicated tab interface supporting multiple concurrently open documents, a sleek tab bar, and instant tab switching (`a`/`d` to navigate tabs, `x` to close).
- **Native Rust Search Engine**: High-performance Tantivy indexer providing BM25 relevance ranking across document titles and block content, with automated typo-tolerant fuzzy search fallback.
- **In-Tab Search Modal (`s`)**: Fast search modal overlay inside the tab view with keyword highlighting, score previews, arrow navigation, and instant document selection.
- **Vim Homerow Navigation**: Keyboard-driven block navigation: `j` (next block), `k` (previous block), `t` (jump to top block), `b` (jump to bottom block), `n` (next code/math block), `p` (prev code/math block).
- **One-Key Code & Math Yanking (`y`)**: Extract code blocks or LaTeX equations and instantly inject them into your active editor at your exact cursor position.
- **Rich Media & Formula Rendering**: Hardware-accelerated offline rendering for Mermaid diagrams, KaTeX mathematical formulas, Shiki syntax-highlighted code blocks, and collapsible `<details>/<summary>` sections.
- **Incremental MTime Synchronization**: Fast recursive directory crawler that inspects file modification timestamps (`mtime`) and cryptographic hashes to only re-index changed files.
- **Multi-Directory Configuration**: Manage documentation directories, add/remove monitored folders, and trigger manual rescans via the Settings side-panel (`Context Glance: Settings`).
- **2D Minimalist Aesthetic & Custom Theme Engine**: Flat, decluttered, 2D user interface with zero drop shadows, pre-configured Dark and Light themes, and an automated custom theme palette calculator based on background, foreground, and accent colors.

### Non Functional

- **Decoupled Architecture (DIP)**: Rust engine built with the Dependency Inversion Principle, decoupling domain logic from concrete SQLite storage, Tantivy indexer, and OS filesystem adapters behind domain traits.
- **Sub-10ms Retrieval Latency**: Tantivy full-text index and SQLite metadata store deliver sub-10ms search queries across thousands of markdown documents.
- **Zero UI Thread Blocking**: All directory crawling, markdown parsing, and indexing run asynchronously in an isolated native daemon process, keeping the VS Code UI completely responsive at 60 FPS.
- **Strict Directory Scoping**: Security-first path validation guaranteeing the engine only reads and exposes files located strictly within user-configured directories.
- **Lightweight Memory Footprint**: Compact Tantivy segment structures and SQLite caching maintain low background RAM usage.
- **Completely Offline & Private**: 100% local execution—zero network calls, zero telemetry, zero external dependencies required at runtime.

## Keyboard Shortcuts Quick Reference

| Key / Shortcut | Context | Action |
| :--- | :--- | :--- |
| `Ctrl+Alt+G` / `Cmd+Alt+G` | Global (VS Code) | Open Context Glance tab & search |
| `Ctrl+Alt+U` / `Cmd+Alt+U` | Global / In-Tab | Close Context Glance tab |
| `j` / `↓` | In-Tab | Next Content Block |
| `k` / `↑` | In-Tab | Previous Content Block |
| `t` | In-Tab | First Content Block |
| `b` | In-Tab | Last Content Block |
| `n` | In-Tab | Next Code/Math Block |
| `p` | In-Tab | Previous Code/Math Block |
| `y` | In-Tab | Yank Code/Math to Clipboard |
| `Space` | In-Tab | Toggle Details/Summary Block |
| `s` | In-Tab | Search Documentation |
| `d` | In-Tab | Next Document Tab |
| `a` | In-Tab | Previous Document Tab |
| `x` | In-Tab | Close Current Document Tab |
| `h` | In-Tab | Toggle keyboard shortcuts help overlay |
| `Esc` | Search / Help Modal | Close search or help modal |

## Prerequisites

### Requirements

- **Visual Studio Code**: Version `^1.90.0` or higher (also compatible with VSCodium).
- **Node.js Runtime**: Node.js `v18.x` or `v20.x+` (LTS recommended) for local extension compilation.
- **Rust Toolchain**: Rust 1.75+ (`cargo` and `rustc`) for building the native background engine.
- **Operating System**: Linux (x86_64 / arm64), macOS (Intel / Apple Silicon), or Windows 10/11.

### Dependencies

- **Local Documentation**: One or more local directories containing Markdown files (`.md`, `.markdown`).

## Getting Started

Installation and usage guidelines are documented in [docs/begin.md](../../docs/begin.md).
