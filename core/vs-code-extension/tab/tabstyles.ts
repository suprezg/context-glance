// ============================================================================
// File Name: tabstyles.ts
// Purpose: CSS stylesheet generator for Context Glance 2D tab viewport.
// ============================================================================

import { ThemePalette } from '../settings/themecalculator';

/**
 * Builds the complete CSS stylesheet for the Webview documentation tab.
 */
export function buildTabStyles(customPalette: ThemePalette): string {
    return `
        :root {
            --theme-red: #FF2A4D;
        }

        /* DARK THEME */
        body[data-theme="dark"], body:not([data-theme="light"]):not([data-theme="custom"]) {
            --bg-color: #121012;
            --text-color: #C7BEAF;
            --header-color: #F6EFE2;
            --code-bg: #181518;
            --border-color: #282228;
            --toast-bg: #F6EFE2;
            --toast-text: #121012;
            --status-bg: #0f0d0f;
            --hints-color: #7d756d;
            --hints-key: #e6dfd5;
            --inline-code-color: #e06c75;
            --active-block-bg: rgba(255, 42, 77, 0.06);
            --link-color: #4a9eff;
            --modal-bg: #141214;
            --modal-input-bg: #1a171a;
            --search-item-hover: rgba(255, 255, 255, 0.03);
            --search-badge-bg: transparent;
            --search-badge-text: #FF2A4D;
        }

        /* LIGHT THEME */
        body[data-theme="light"] {
            --bg-color: #F6EFE2;
            --text-color: #2E2A27;
            --header-color: #121012;
            --code-bg: #EDE5D7;
            --border-color: #D8CFBF;
            --toast-bg: #121012;
            --toast-text: #F6EFE2;
            --status-bg: #EDE5D7;
            --hints-color: #6e665f;
            --hints-key: #121012;
            --inline-code-color: #A81A32;
            --active-block-bg: rgba(255, 42, 77, 0.06);
            --link-color: #0b66c3;
            --modal-bg: #FAF5EB;
            --modal-input-bg: #EDE5D7;
            --search-item-hover: rgba(0, 0, 0, 0.03);
            --search-badge-bg: transparent;
            --search-badge-text: #A81A32;
        }

        /* CUSTOM THEME */
        body[data-theme="custom"] {
            --bg-color: ${customPalette.bgColor};
            --text-color: ${customPalette.textColor};
            --header-color: ${customPalette.headerColor};
            --code-bg: ${customPalette.codeBg};
            --border-color: ${customPalette.borderColor};
            --toast-bg: ${customPalette.toastBg};
            --toast-text: ${customPalette.toastText};
            --status-bg: ${customPalette.statusBg};
            --hints-color: ${customPalette.hintsColor};
            --hints-key: ${customPalette.hintsKey};
            --inline-code-color: ${customPalette.inlineCodeColor};
            --active-block-bg: ${customPalette.activeBlockBg};
            --link-color: ${customPalette.linkColor};
            --modal-bg: ${customPalette.modalBg};
            --modal-input-bg: ${customPalette.modalInputBg};
            --search-item-hover: ${customPalette.searchItemHover};
            --search-badge-bg: ${customPalette.searchBadgeBg};
            --search-badge-text: ${customPalette.searchBadgeText};
            --theme-red: ${customPalette.themeRed};
        }

        * {
            box-sizing: border-box;
            box-shadow: none !important;
            text-shadow: none !important;
            filter: none !important;
        }

        /* DISABLE ALL SCROLLBARS */
        *::-webkit-scrollbar {
            width: 0 !important;
            height: 0 !important;
            display: none !important;
        }

        html, body, div, pre, code, .top-tab-bar, .markdown-container, .search-results-list, .help-modal-body {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
        }

        body {
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
            font-size: var(--vscode-font-size, 13.5px);
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--bg-color);
            margin: 0;
            padding: 0;
            outline: none;
            user-select: none;
            transition: none;
        }

        body:focus {
            outline: none;
        }

        /* --- STICKY TOP TAB BAR (Clean 2D Flat Tabs) --- */
        .top-tab-bar {
            position: sticky;
            top: 0;
            left: 0;
            right: 0;
            height: 32px;
            background-color: var(--status-bg);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: stretch;
            gap: 0;
            padding: 0;
            overflow-x: auto;
            z-index: 1000;
            user-select: none;
        }

        .tab-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 0 12px;
            height: 100%;
            background-color: transparent;
            border: none;
            border-right: 1px solid var(--border-color);
            border-bottom: 2px solid transparent;
            border-radius: 0;
            font-size: 11.5px;
            font-family: var(--vscode-editor-font-family, monospace);
            color: var(--hints-color);
            cursor: pointer;
            white-space: nowrap;
            transition: color 0.1s ease, border-color 0.1s ease;
        }

        .tab-chip:hover {
            color: var(--text-color);
            background-color: var(--active-block-bg);
        }

        .tab-chip.active {
            background-color: var(--bg-color);
            border-bottom: 2px solid var(--theme-red);
            color: var(--header-color);
            font-weight: 600;
        }

        .tab-title {
            max-width: 180px;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .tab-close {
            font-size: 13px;
            line-height: 1;
            color: var(--hints-color);
            padding: 1px 3px;
            margin-left: 2px;
            opacity: 0.6;
            transition: opacity 0.1s ease, color 0.1s ease;
        }

        .tab-close:hover {
            opacity: 1;
            color: var(--theme-red);
        }

        /* --- CONTENT AREA (Minimal 2D Reading Layout) --- */
        .markdown-container {
            padding: 24px 32px 64px 32px;
            max-width: 760px;
            margin: 0 auto;
        }

        /* --- MERMAID ERROR FALLBACK (Pure 2D Flat Box) --- */
        .mermaid-error-box {
            border: 1px solid var(--theme-red);
            background-color: var(--code-bg);
            border-radius: 0;
            padding: 10px 14px;
            margin: 14px 0;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 12px;
            line-height: 1.5;
        }

        .mermaid-error-header {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 4px;
        }

        .mermaid-error-title {
            color: var(--theme-red);
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .mermaid-error-msg {
            color: var(--text-color);
            margin-bottom: 8px;
            font-size: 12px;
            opacity: 0.9;
            word-break: break-word;
        }

        .mermaid-error-raw {
            background-color: var(--bg-color);
            border: 1px solid var(--border-color);
            border-radius: 0;
            padding: 8px;
            margin: 0;
            overflow-x: auto;
            font-size: 11.5px;
            color: var(--hints-color);
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 50vh;
            color: var(--hints-color);
            text-align: center;
        }

        .empty-state h3 {
            color: var(--header-color);
            margin-top: 0;
            margin-bottom: 6px;
            font-size: 1.15rem;
            font-weight: 600;
            border-bottom: none;
            padding-bottom: 0;
        }

        .empty-state p {
            font-size: 13px;
            margin: 0;
        }

        .empty-state kbd {
            background: var(--code-bg);
            border: 1px solid var(--border-color);
            padding: 1px 5px;
            border-radius: 0;
            color: var(--theme-red);
            font-weight: 600;
            font-family: var(--vscode-editor-font-family, monospace);
        }

        h1, h2, h3, h4, h5, h6 {
            color: var(--header-color);
            margin-top: 22px;
            margin-bottom: 10px;
            font-weight: 600;
        }

        h1 { font-size: 1.55rem; border-bottom: 1px solid var(--border-color); padding-bottom: 6px; }
        h2 { font-size: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 4px; }
        h3 { font-size: 1.08rem; }

        p, li {
            margin-top: 0;
            margin-bottom: 10px;
        }

        hr {
            border: none;
            border-top: 1px solid var(--border-color);
            margin: 20px 0;
        }

        a {
            color: var(--link-color);
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }

        code:not(pre code) {
            background-color: var(--code-bg);
            color: var(--inline-code-color);
            padding: 1px 5px;
            border: 1px solid var(--border-color);
            border-radius: 0;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 0.88em;
        }

        pre.shiki {
            padding: 12px 14px;
            border-radius: 0;
            overflow-x: auto;
            margin: 14px 0;
            border: 1px solid var(--border-color);
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 0.88em;
            line-height: 1.45;
        }

        .mermaid {
            display: flex;
            justify-content: center;
            background-color: var(--code-bg);
            padding: 16px;
            margin: 16px 0;
            border-radius: 0;
            border: 1px solid var(--border-color);
            overflow-x: auto;
        }

        .katex-display {
            margin: 14px 0;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 8px 10px;
            border-radius: 0;
            color: var(--header-color);
        }

        .katex {
            color: var(--header-color);
        }

        details {
            background-color: var(--code-bg);
            border: 1px solid var(--border-color);
            border-radius: 0;
            padding: 8px 12px;
            margin: 12px 0;
        }

        summary {
            cursor: pointer;
            user-select: none;
            color: var(--theme-red);
            font-weight: 600;
            font-size: 13px;
            outline: none;
        }

        summary::-webkit-details-marker {
            color: var(--theme-red);
        }

        table {
            border-collapse: collapse;
            width: 100%;
            margin: 14px 0;
            display: block;
            overflow-x: auto;
            max-width: 100%;
        }

        th, td {
            border: 1px solid var(--border-color);
            padding: 6px 10px;
            text-align: left;
            font-size: 13px;
        }

        th {
            background-color: var(--code-bg);
            color: var(--header-color);
            font-weight: 600;
        }

        /* --- ACTIVE BLOCK INDICATOR (Pure 2D Flat Left Accent) --- */
        .glance-active-block {
            border-left: 2px solid var(--theme-red) !important;
            background-color: var(--active-block-bg) !important;
            border-radius: 0 !important;
            padding-left: 10px !important;
            margin-left: -12px !important;
            position: relative;
        }

        /* --- SLIM 2D STATUS BAR --- */
        .vim-status-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 25px;
            background-color: var(--status-bg);
            border-top: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 12px;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 11px;
            z-index: 1000;
            user-select: none;
        }

        .block-badge {
            font-weight: 600;
            letter-spacing: 0.5px;
            color: var(--theme-red);
            font-size: 11px;
            text-transform: uppercase;
        }

        .help-pill {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            color: var(--hints-color);
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            transition: color 0.1s ease;
        }

        .help-pill:hover {
            color: var(--theme-red);
        }

        .help-pill kbd {
            background: transparent;
            border: 1px solid var(--border-color);
            padding: 0 4px;
            border-radius: 0;
            color: var(--hints-key);
            font-weight: 600;
            font-size: 10px;
        }

        /* --- MINIMAL 2D TOAST --- */
        .toast {
            position: fixed;
            top: 42px;
            right: 16px;
            background-color: var(--toast-bg);
            color: var(--toast-text);
            border: 1px solid var(--border-color);
            border-left: 3px solid var(--theme-red);
            padding: 6px 12px;
            border-radius: 0;
            font-size: 11.5px;
            font-weight: 500;
            opacity: 0;
            transition: opacity 0.15s ease;
            pointer-events: none;
            z-index: 4000;
        }

        .toast.show {
            opacity: 1;
        }

        /* --- MINIMAL 2D SEARCH MODAL --- */
        .search-modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.6);
            display: none;
            justify-content: center;
            align-items: flex-start;
            padding-top: 10vh;
            z-index: 5000;
        }

        .search-modal-backdrop.open {
            display: flex;
        }

        .search-modal {
            width: 90%;
            max-width: 580px;
            max-height: 70vh;
            background-color: var(--modal-bg);
            border: 1px solid var(--border-color);
            border-radius: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: modalIn 0.1s ease-out;
        }

        @keyframes modalIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .search-input-wrapper {
            padding: 10px 14px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            gap: 10px;
            background: var(--modal-input-bg);
        }

        .search-input {
            flex: 1;
            border: none;
            outline: none;
            background: transparent;
            font-family: inherit;
            font-size: 13.5px;
            color: var(--header-color);
        }

        .search-input::placeholder {
            color: var(--hints-color);
        }

        .shortcut-tag {
            font-size: 10px;
            padding: 1px 5px;
            border: 1px solid var(--border-color);
            border-radius: 0;
            background: transparent;
            color: var(--hints-color);
            font-family: var(--vscode-editor-font-family, monospace);
        }

        .search-results-list {
            overflow-y: auto;
            max-height: 48vh;
            padding: 0;
        }

        .search-result-item {
            padding: 8px 12px;
            border-radius: 0;
            cursor: pointer;
            border-left: 2px solid transparent;
            border-bottom: 1px solid var(--border-color);
            transition: background 0.08s ease;
        }

        .search-result-item:last-child {
            border-bottom: none;
        }

        .search-result-item:hover {
            background: var(--search-item-hover);
        }

        .search-result-item.selected {
            background: var(--active-block-bg);
            border-left-color: var(--theme-red);
        }

        .search-item-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-weight: 600;
            font-size: 12.5px;
            color: var(--header-color);
        }

        .search-badge {
            font-size: 10px;
            font-weight: 500;
            padding: 1px 5px;
            border: 1px solid var(--border-color);
            border-radius: 0;
            background: var(--search-badge-bg);
            color: var(--search-badge-text);
            font-family: var(--vscode-editor-font-family, monospace);
        }

        .search-snippet {
            font-size: 11.5px;
            color: var(--text-color);
            margin-top: 4px;
            line-height: 1.4;
            opacity: 0.85;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .search-modal-footer {
            padding: 6px 12px;
            border-top: 1px solid var(--border-color);
            display: flex;
            gap: 14px;
            font-size: 10.5px;
            color: var(--hints-color);
            background: var(--modal-input-bg);
            font-family: var(--vscode-editor-font-family, monospace);
        }

        .search-modal-footer span {
            display: inline-flex;
            align-items: center;
            gap: 3px;
        }

        .search-modal-footer kbd {
            background: transparent;
            border: 1px solid var(--border-color);
            padding: 0 4px;
            border-radius: 0;
            color: var(--hints-key);
        }

        .search-empty {
            padding: 24px;
            text-align: center;
            color: var(--hints-color);
            font-size: 12.5px;
        }

        /* Too Small Overlay */
        .too-small-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: var(--bg-color);
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 20px;
            z-index: 9999;
        }

        .too-small-title {
            font-size: 13.5px;
            font-weight: 600;
            color: var(--header-color);
            margin-bottom: 6px;
        }

        .too-small-sub {
            font-size: 11.5px;
            color: var(--hints-color);
            font-family: var(--vscode-editor-font-family, monospace);
        }

        .too-small-sub kbd {
            background: var(--code-bg);
            border: 1px solid var(--border-color);
            padding: 1px 5px;
            border-radius: 0;
            color: var(--theme-red);
            font-weight: 600;
        }

        /* --- MINIMAL 2D HELP MODAL --- */
        .help-modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.6);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 5500;
        }

        .help-modal-backdrop.open {
            display: flex;
        }

        .help-modal {
            width: 90%;
            max-width: 480px;
            max-height: 80vh;
            background-color: var(--modal-bg);
            border: 1px solid var(--border-color);
            border-radius: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: modalIn 0.1s ease-out;
        }

        .help-modal-header {
            padding: 10px 14px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-weight: 600;
            font-size: 12.5px;
            color: var(--header-color);
            background: var(--modal-input-bg);
        }

        .help-modal-body {
            padding: 12px 14px;
            overflow-y: auto;
        }

        .help-grid {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .help-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            color: var(--text-color);
            padding: 3px 0;
            border-bottom: 1px solid var(--border-color);
        }

        .help-row:last-child {
            border-bottom: none;
        }

        .help-row kbd {
            background: transparent;
            border: 1px solid var(--border-color);
            padding: 1px 5px;
            border-radius: 0;
            color: var(--theme-red);
            font-weight: 600;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 11px;
        }

        .help-modal-footer {
            padding: 6px 14px;
            border-top: 1px solid var(--border-color);
            background: var(--modal-input-bg);
            font-size: 10.5px;
            color: var(--hints-color);
            font-family: var(--vscode-editor-font-family, monospace);
        }
    `;
}
