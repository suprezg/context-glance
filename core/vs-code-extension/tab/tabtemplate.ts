// ============================================================================
// File Name: tabtemplate.ts
// Purpose: HTML skeleton generator for Context Glance 2D tab viewport.
// ============================================================================

import * as vscode from 'vscode';
import { ThemePalette } from '../settings/themecalculator';
import { buildTabStyles } from './tabstyles';
import { buildTabScript } from './tabscript';

/**
 * Configuration options required to render the Webview HTML document.
 */
export interface TabTemplateOptions {
    renderedBody: string;
    theme: string;
    palette: ThemePalette;
    initialBlockIndex: number;
    title: string;
    hasInitialDoc: boolean;
    autoSearch: boolean;
    initialQuery: string;
    mermaidUri?: vscode.Uri;
    katexCssUri?: vscode.Uri;
}

/**
 * Builds the complete HTML string for the Context Glance dedicated tab Webview.
 */
export function buildTabHtml(options: TabTemplateOptions): string {
    const safeTitle = (options.title || 'Reference Guide').replace(/["\\]/g, '\\$&');
    const styles = buildTabStyles(options.palette);
    const script = buildTabScript({
        theme: options.theme,
        safeTitle,
        initialBlockIndex: options.initialBlockIndex,
        hasInitialDoc: options.hasInitialDoc,
        autoSearch: options.autoSearch,
        initialQuery: options.initialQuery
    });

    const katexUrl = options.katexCssUri ? options.katexCssUri.toString() : 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
    const mermaidUrl = options.mermaidUri ? options.mermaidUri.toString() : 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Context Glance</title>
    <link rel="stylesheet" href="${katexUrl}">
    <style>
${styles}
    </style>
</head>
<body tabindex="0" data-theme="${options.theme}">
    <div id="toast" class="toast">Notice</div>

    <!-- Multi-Document Top Tab Bar -->
    <div id="top-tab-bar" class="top-tab-bar"></div>

    <!-- Main Markdown Container -->
    <div id="markdown-container" class="markdown-container">
        ${options.hasInitialDoc ? options.renderedBody : `
        <div class="empty-state">
            <h3>No Open Documents</h3>
            <p>Press <kbd>s</kbd> to search and reference documents.</p>
        </div>
        `}
    </div>

    <!-- Bottom Status Bar -->
    <div class="vim-status-bar">
        <div id="glance-block-badge" class="block-badge">${options.hasInitialDoc ? 'Loading...' : 'No Document'}</div>
        <div id="help-pill-btn" class="help-pill" title="Press 'h' for keyboard shortcuts">
            <kbd>h</kbd> help
        </div>
    </div>

    <!-- Too Small Overlay (renders when viewport < 640px) -->
    <div id="too-small-overlay" class="too-small-overlay">
        <div class="too-small-title">Tab is too small to render</div>
        <div class="too-small-sub">Requires minimum width of 640px. Press <kbd>q</kbd> to close</div>
    </div>

    <!-- In-Tab Notion-Style Search Modal Overlay -->
    <div id="search-modal-backdrop" class="search-modal-backdrop">
        <div class="search-modal" role="dialog" aria-modal="true">
            <div class="search-input-wrapper">
                <input id="search-input" class="search-input" type="text" placeholder="Type to search documentation & code snippets..." autocomplete="off" spellcheck="false" />
                <span class="shortcut-tag">Esc</span>
            </div>
            <div id="search-results-list" class="search-results-list">
                <div class="search-empty">Type keywords above to search docs & code blocks...</div>
            </div>
            <div class="search-modal-footer">
                <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
                <span><kbd>↵</kbd> select</span>
                <span><kbd>esc</kbd> close search</span>
                <span><kbd>ctrl+alt+u</kbd> close tab</span>
            </div>
        </div>
    </div>

    <!-- In-Tab Help Modal Overlay -->
    <div id="help-modal-backdrop" class="help-modal-backdrop">
        <div class="help-modal" role="dialog" aria-modal="true">
            <div class="help-modal-header">
                <span>Keyboard Shortcuts & Navigation</span>
                <span class="shortcut-tag" id="help-close-tag">Esc</span>
            </div>
            <div class="help-modal-body">
                <div class="help-grid">
                    <div class="help-row"><span>Next Content Block</span><span><kbd>j</kbd> / <kbd>↓</kbd></span></div>
                    <div class="help-row"><span>Previous Content Block</span><span><kbd>k</kbd> / <kbd>↑</kbd></span></div>
                    <div class="help-row"><span>First Content Block</span><span><kbd>t</kbd></span></div>
                    <div class="help-row"><span>Last Content Block</span><span><kbd>b</kbd></span></div>
                    <div class="help-row"><span>Next Code/Math Block</span><span><kbd>n</kbd></span></div>
                    <div class="help-row"><span>Previous Code/Math Block</span><span><kbd>p</kbd></span></div>
                    <div class="help-row"><span>Yank Code/Math to Clipboard</span><span><kbd>y</kbd></span></div>
                    <div class="help-row"><span>Toggle Details/Summary Block</span><span><kbd>Space</kbd></span></div>
                    <div class="help-row"><span>Search Documentation</span><span><kbd>s</kbd></span></div>
                    <div class="help-row"><span>Next Document Tab</span><span><kbd>d</kbd></span></div>
                    <div class="help-row"><span>Previous Document Tab</span><span><kbd>a</kbd></span></div>
                    <div class="help-row"><span>Close Current Document Tab</span><span><kbd>x</kbd></span></div>
                    <div class="help-row"><span>Toggle this Help palette</span><span><kbd>h</kbd></span></div>
                    <div class="help-row"><span>Close / dismiss tab</span><span><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>U</kbd></span></div>
                </div>
            </div>
            <div class="help-modal-footer">
                <span><kbd>esc</kbd> close help</span>
            </div>
        </div>
    </div>

    <script src="${mermaidUrl}"></script>
    <script>
${script}
    </script>
</body>
</html>`;
}
