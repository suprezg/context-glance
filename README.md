# Context Glance

<p align="center">
    <img src="./assets/banner.png" alt="Context Glance Banner">
    <br />
    <br />
    <img src="https://img.shields.io/badge/VS_Code_Extension-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white" alt="VS Code Extension">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite 3">
    <img src="https://img.shields.io/badge/Hybrid_Search-MiniSearch-brightgreen?style=for-the-badge" alt="Hybrid Search">
    <img src="https://img.shields.io/badge/LaTeX-KaTeX-11a880?style=for-the-badge&logo=latex&logoColor=white" alt="KaTeX Math">
    <img src="https://img.shields.io/badge/Diagrams-Mermaid-ff3670?style=for-the-badge&logo=mermaid&logoColor=white" alt="Mermaid Diagrams">
    <br />
    <br />
    <i>In-Editor Hybrid Knowledge Navigator — A zero-tab, keyboard-first documentation glance, rich media reference, and code snippet injection engine for Visual Studio Code.</i>
</p>

> [!NOTE]
> **Active Development:** This project is currently a work in progress and is being actively built.


---

## Abstract

**Context Glance** is a high-performance, keyboard-centric Visual Studio Code extension engineered to eliminate the severe context switching and tab clutter associated with referencing technical documentation, runbooks, personal knowledge bases (e.g., Obsidian, Foam, Logseq), and architectural specifications. 

Built using TypeScript and powered by a local embedded SQLite database alongside an in-memory hybrid search index (MiniSearch / FlexSearch), Context Glance ingests both **Markdown (`.md`)** and **HTML (`.html`)** files across single or multiple user-configured directories. Rather than scanning files sequentially or treating entire documents as monolithic strings, the extension uses a background worker thread pipeline to perform semantic paragraph- and block-level chunking. 

Developers can glance at documentation directly beneath their active cursor in a zero-tab **Inline Peek View** or dive deep into long-form guides in a **Dedicated Tab View** equipped with full Vim homerow navigation (`j`, `k`, `gg`, `G`), a sticky Table of Contents overlay, and visual text selection. With built-in hardware-accelerated rendering for **Mermaid diagrams**, **LaTeX/KaTeX formulas**, code syntax highlighting, and collapsible HTML blocks (`<details>`, `<summary>`), Context Glance brings your entire knowledge base into your coding flow without ever requiring your hands to leave the keyboard.

---

## Objective

Context Glance aims to solve three fundamental friction points in the modern developer experience:

1. **Eliminate Context Switching & Tab Clutter**: Traditional note-taking tools, browser windows, and editor tabs disrupt mental focus and fragment IDE window layouts. Context Glance delivers instant documentation access through an inline peek card anchored directly to the active cursor line that can be summoned and dismissed in milliseconds without opening permanent editor tabs.
2. **Deliver Blazing-Fast Hybrid Retrieval**: Navigating large directory trees with naive full-text grep is slow and noisy. Context Glance implements a two-stage hybrid retrieval strategy: an instant O(1) direct index lookup for exact anchor slugs, heading markers, and highlighted symbols, coupled with an automatic fallback to high-speed fuzzy search for natural language queries.
3. **Achieve 100% Keyboard Ergonomics & Seamless Snippet Injection**: Developers should never have to reach for a mouse to read documentation, jump sections, copy code, or even configure directory paths. Context Glance is designed from the ground up to be completely keyboard-driven, including one-key snippet injection that automatically detects cursor indentation and inserts code blocks with pristine structural alignment.

---

## Features

### Functional

- **Multi-Format Support**: Ingests and renders both Markdown (`.md`, `.markdown`) and HTML (`.html`, `.htm`) documents.
- **Multi-Directory Configuration**: Point to a single folder or multiple directory paths with zero-mouse setup via the Command Palette.
- **Dual Viewport Modes**: Zero-tab Inline Peek Mode (`Ctrl+Alt+G`) below the cursor and Dedicated Tab Mode (`Ctrl+Alt+Shift+G`) for deep-dive reading.
- **Vim Homerow Navigation**: Dedicated tabs feature `j`/`k` line scrolling, `gg`/`G` bounds jumping, `t` TOC outline toggle, `v` visual text selection, and `q` quick exit.
- **Rich Media & Math Rendering**: Renders LaTeX/KaTeX equations, Mermaid diagrams, syntax-highlighted code blocks, and collapsible `<details>/<summary>` tags.
- **Block & Paragraph-Level Chunking**: Splits documents into semantic AST blocks (headings, paragraphs, code fences, HTML blocks) for precision section jumping.
- **Hybrid Indexing + Search**: Instant O(1) SQLite lookups for exact anchors/symbols with automatic fallback to in-memory fuzzy search (MiniSearch / FlexSearch).
- **Indentation-Preserving Snippet Injection**: Press `Ctrl+Shift+Enter` in Peek view to extract code snippets and insert them at cursor matching surrounding indentation.
- **Live Incremental File Watching**: Monitors directories in real-time, automatically updating SQLite records and search indexes upon file modifications.

### Non Functional

- **Zero UI Thread Blocking**: All filesystem traversal, AST parsing, and chunking run concurrently on background worker threads.
- **Sub-50ms Hybrid Retrieval**: Delivers sub-5ms direct index lookups and 15–40ms in-memory fuzzy search across thousands of documents.
- **100% Keyboard Ergonomics**: Completely operable without a mouse, including directory configuration, search, navigation, and snippet insertion.
- **Warm-Start Persistence**: Local SQLite database caches metadata and snippets for instant availability on window reload without disk rescans.
- **Zero Editor Tab Sprawl**: Inline peek mode opens and collapses (`Esc`) non-destructively without creating permanent editor tabs.
- **Lightweight Footprint**: Granular chunk indexing and compact search memory structures maintain low idle resource usage (<50MB).

---

## Prerequisites

### Requirements

- **Visual Studio Code**: Version `^1.85.0` or higher (also compatible with VSCodium and other VS Code forks).
- **Node.js Runtime**: Node.js `v18.x` or `v20.x+` (LTS recommended) for local development and compilation.
- **TypeScript**: TypeScript `5.x` compiler toolchain.
- **Operating System**: Cross-platform support for Linux (x86_64 / arm64), macOS (Intel / Apple Silicon), and Windows 10/11.

### Dependencies

- **Visual Studio Code**: Version `^1.85.0` or higher (or compatible forks like VSCodium).
- **Knowledge Base**: One or more local directories containing documentation files formatted as `.md`, `.markdown`, `.html`, or `.htm`.

---

## Getting Started

Installation and usage guidelines are documented in [`docs/begin.md`](./docs/begin.md).
