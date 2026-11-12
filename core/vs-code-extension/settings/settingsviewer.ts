// ============================================================================
// File Name: settingsviewer.ts
// Purpose: Side-panel settings management for documentation directories and themes.
// ============================================================================

import * as vscode from 'vscode';
import { EngineClient } from '../client';
import { calculateThemePalette, CustomThemeInput } from './themecalculator';

/**
 * Settings panel manager rendering directory controls and theme selection.
 */
export class SettingsViewer {
    private panel: vscode.WebviewPanel | undefined = undefined;
    private context: vscode.ExtensionContext;
    private engineClient: EngineClient | undefined;
    private onThemeChangedCallback?: (theme: string, customTheme?: CustomThemeInput) => void;

    constructor(
        context: vscode.ExtensionContext,
        engineClient?: EngineClient,
        onThemeChanged?: (theme: string, customTheme?: CustomThemeInput) => void
    ) {
        this.context = context;
        this.engineClient = engineClient;
        this.onThemeChangedCallback = onThemeChanged;
    }

    public setEngineClient(client: EngineClient): void {
        this.engineClient = client;
    }

    public setOnThemeChanged(callback: (theme: string, customTheme?: CustomThemeInput) => void): void {
        this.onThemeChangedCallback = callback;
    }

    public async openSettings(): Promise<void> {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside, false);
            await this.postCurrentState();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'contextGlance.settings',
            'Context Glance: Settings',
            { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.panel.webview.html = this.buildWebviewHtml();

        this.panel.webview.onDidReceiveMessage(async (message) => {
            if (!message || !message.command) return;

            switch (message.command) {
                case 'getInitialState': {
                    await this.postCurrentState();
                    break;
                }

                case 'addDirectory': {
                    const folders = await vscode.window.showOpenDialog({
                        canSelectFiles: false,
                        canSelectFolders: true,
                        canSelectMany: true,
                        openLabel: 'Add to Context Glance'
                    });

                    if (folders && folders.length > 0) {
                        for (const f of folders) {
                            if (this.engineClient) {
                                await this.engineClient.addDirectory(f.fsPath);
                            }
                        }
                        if (this.engineClient) {
                            const updated = await this.engineClient.getDirectories();
                            const config = vscode.workspace.getConfiguration('contextGlance');
                            await config.update('scanDirectories', updated, vscode.ConfigurationTarget.Global);
                            await this.engineClient.rescan();
                        }
                        vscode.window.showInformationMessage(`Added ${folders.length} folder(s) to Context Glance.`);
                        await this.postCurrentState();
                    }
                    break;
                }

                case 'removeDirectory': {
                    const dirPath = message.dirPath;
                    if (dirPath && this.engineClient) {
                        await this.engineClient.removeDirectory(dirPath);
                        const updated = await this.engineClient.getDirectories();
                        const config = vscode.workspace.getConfiguration('contextGlance');
                        await config.update('scanDirectories', updated, vscode.ConfigurationTarget.Global);
                        await this.engineClient.rescan();
                        vscode.window.showInformationMessage(`Removed directory: ${dirPath}`);
                        await this.postCurrentState();
                    }
                    break;
                }

                case 'rescan': {
                    if (this.engineClient) {
                        try {
                            const stats = await this.engineClient.rescan();
                            vscode.window.showInformationMessage(
                                `Rescan complete: ${stats.updated} updated, ${stats.unchanged} unchanged, ${stats.total} total indexed.`
                            );
                        } catch (err) {
                            vscode.window.showErrorMessage(`Rescan failed: ${(err as Error).message}`);
                        }
                        await this.postCurrentState();
                    }
                    break;
                }

                case 'saveTheme': {
                    const selectedTheme = message.theme;
                    const customColors = message.customColors as CustomThemeInput | undefined;
                    const config = vscode.workspace.getConfiguration('contextGlance');

                    await config.update('theme', selectedTheme, vscode.ConfigurationTarget.Global);
                    if (customColors) {
                        await config.update('customTheme', customColors, vscode.ConfigurationTarget.Global);
                    }

                    if (this.onThemeChangedCallback) {
                        this.onThemeChangedCallback(selectedTheme, customColors);
                    }

                    vscode.window.showInformationMessage(`Theme set to ${selectedTheme.toUpperCase()}`);
                    await this.postCurrentState();
                    break;
                }

                case 'openTab': {
                    await vscode.commands.executeCommand('context-glance.openTab');
                    break;
                }
            }
        });

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });

        await this.postCurrentState();
    }

    public async refresh(): Promise<void> {
        if (this.panel) {
            await this.postCurrentState();
        }
    }

    private async postCurrentState(): Promise<void> {
        if (!this.panel) return;

        let directories: string[] = [];
        if (this.engineClient) {
            try {
                directories = await this.engineClient.getDirectories();
            } catch {}
        }

        const config = vscode.workspace.getConfiguration('contextGlance');
        const theme = config.get<string>('theme', 'dark');
        const customTheme = config.get<CustomThemeInput>('customTheme', {
            background: '#121012',
            foreground: '#C7BEAF',
            accent: '#FF2A4D'
        });

        this.panel.webview.postMessage({
            command: 'stateUpdate',
            directories,
            theme,
            customTheme
        });
    }

    private buildWebviewHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Context Glance: Settings</title>
    <style>
        :root {
            --theme-red: #FF2A4D;
            --bg-color: #121012;
            --text-color: #C7BEAF;
            --header-color: #F6EFE2;
            --code-bg: #181518;
            --border-color: #282228;
            --hints-color: #7d756d;
        }

        * {
            box-sizing: border-box;
            box-shadow: none !important;
            text-shadow: none !important;
            filter: none !important;
        }

        body {
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
            font-size: var(--vscode-font-size, 13px);
            line-height: 1.5;
            color: var(--text-color);
            background-color: var(--bg-color);
            margin: 0;
            padding: 20px 24px 60px 24px;
            user-select: none;
        }

        h1, h2, h3 {
            color: var(--header-color);
            font-weight: 600;
            margin-top: 0;
        }

        h1 {
            font-size: 1.4rem;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 8px;
            margin-bottom: 16px;
            letter-spacing: 0.3px;
        }

        h2 {
            font-size: 1.15rem;
            margin-top: 24px;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .subtitle {
            font-size: 11.5px;
            color: var(--hints-color);
            margin-bottom: 14px;
        }

        /* --- DIRECTORIES SECTION --- */
        .dir-list {
            border: 1px solid var(--border-color);
            margin-bottom: 14px;
            background: var(--code-bg);
        }

        .dir-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            border-bottom: 1px solid var(--border-color);
            font-size: 12px;
            font-family: var(--vscode-editor-font-family, monospace);
        }

        .dir-item:last-child {
            border-bottom: none;
        }

        .dir-path {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: var(--header-color);
            flex: 1;
            margin-right: 12px;
        }

        .dir-empty {
            padding: 16px;
            text-align: center;
            color: var(--hints-color);
            font-size: 12px;
        }

        /* --- BUTTONS --- */
        .btn-group {
            display: flex;
            gap: 8px;
            margin-bottom: 24px;
        }

        button {
            background-color: transparent;
            color: var(--header-color);
            border: 1px solid var(--border-color);
            padding: 6px 12px;
            font-size: 12px;
            font-family: inherit;
            cursor: pointer;
            transition: border-color 0.1s ease, color 0.1s ease, background-color 0.1s ease;
        }

        button:hover {
            border-color: var(--theme-red);
            color: var(--theme-red);
        }

        button.btn-primary {
            background-color: var(--theme-red);
            color: #ffffff;
            border-color: var(--theme-red);
            font-weight: 600;
        }

        button.btn-primary:hover {
            background-color: #e02242;
            color: #ffffff;
        }

        button.btn-remove {
            color: #e06c75;
            border: 1px solid transparent;
            padding: 2px 8px;
            font-size: 11px;
        }

        button.btn-remove:hover {
            border-color: #e06c75;
            background-color: rgba(224, 108, 117, 0.08);
        }

        /* --- THEME SECTION --- */
        .theme-options {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-bottom: 18px;
        }

        .theme-card {
            border: 1px solid var(--border-color);
            padding: 10px;
            cursor: pointer;
            background: var(--code-bg);
            transition: border-color 0.1s ease;
            text-align: center;
        }

        .theme-card:hover {
            border-color: var(--header-color);
        }

        .theme-card.active {
            border: 1px solid var(--theme-red);
            background: rgba(255, 42, 77, 0.06);
        }

        .theme-name {
            font-weight: 600;
            font-size: 12px;
            color: var(--header-color);
            margin-bottom: 4px;
        }

        .theme-desc {
            font-size: 10.5px;
            color: var(--hints-color);
        }

        /* --- CUSTOM THEME COLOR PICKERS --- */
        .custom-form {
            border: 1px solid var(--border-color);
            padding: 14px;
            background: var(--code-bg);
            margin-bottom: 18px;
            display: none;
        }

        .custom-form.visible {
            display: block;
        }

        .form-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 12px;
        }

        .color-picker-wrapper {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            user-select: none;
            flex: 1;
        }

        .color-label {
            color: var(--header-color);
            font-size: 12px;
            font-weight: 500;
        }

        input[type="color"] {
            -webkit-appearance: none;
            border: 1px solid var(--border-color);
            width: 30px;
            height: 26px;
            padding: 0;
            background: transparent;
            cursor: pointer;
            flex-shrink: 0;
            outline: none;
        }

        input[type="color"]::-webkit-color-swatch-wrapper {
            padding: 0;
        }

        input[type="color"]::-webkit-color-swatch {
            border: none;
        }

        input[type="color"]:hover {
            border-color: var(--theme-red);
        }

        input[type="text"] {
            border: 1px solid var(--border-color);
            background: var(--bg-color);
            color: var(--header-color);
            padding: 4px 8px;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 11.5px;
            width: 82px;
            text-transform: uppercase;
            text-align: center;
        }

        input[type="text"]:focus {
            border-color: var(--theme-red);
            outline: none;
        }

        .presets-section {
            margin-top: 14px;
            margin-bottom: 10px;
        }

        .presets-title {
            font-size: 11px;
            color: var(--hints-color);
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .preset-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        .preset-chip {
            padding: 3px 8px;
            font-size: 11px;
            background: transparent;
            border: 1px solid var(--border-color);
            color: var(--text-color);
            cursor: pointer;
            transition: all 0.1s ease;
        }

        .preset-chip:hover {
            border-color: var(--theme-red);
            color: var(--header-color);
            background: rgba(255, 42, 77, 0.05);
        }

        /* --- PREVIEW BOX --- */
        .preview-box {
            border: 1px solid var(--border-color);
            padding: 12px;
            margin-top: 14px;
            margin-bottom: 14px;
            transition: all 0.15s ease;
        }

        .preview-header {
            font-weight: 600;
            font-size: 13px;
            margin-bottom: 6px;
            border-bottom: 1px solid;
            padding-bottom: 4px;
        }

        .preview-body {
            font-size: 12px;
            margin-bottom: 8px;
            line-height: 1.4;
        }

        .preview-code {
            padding: 6px 8px;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 11px;
            border: 1px solid;
            margin-bottom: 8px;
        }

        .preview-accent-line {
            height: 2px;
            margin-bottom: 6px;
        }

        .section-divider {
            border: none;
            border-top: 1px solid var(--border-color);
            margin: 24px 0;
        }

        .info-pill {
            display: inline-block;
            font-size: 10px;
            border: 1px solid var(--border-color);
            padding: 1px 6px;
            color: var(--hints-color);
            font-family: var(--vscode-editor-font-family, monospace);
        }
    </style>
</head>
<body>
    <h1>Context Glance: Settings</h1>

    <!-- 1. DIRECTORY CONFIGURATION -->
    <h2>
        <span>Documentation Directories</span>
        <span id="dir-count-pill" class="info-pill">0 folders</span>
    </h2>
    <div class="subtitle">Folders crawled and indexed for BM25 and fuzzy search retrieval.</div>

    <div id="dir-list" class="dir-list">
        <div class="dir-empty">Loading configured directories...</div>
    </div>

    <div class="btn-group">
        <button id="btn-add-dir" class="btn-primary">+ Add Directory...</button>
        <button id="btn-rescan">↻ Rescan All</button>
    </div>

    <hr class="section-divider" />

    <!-- 2. THEME CONFIGURATION -->
    <h2>Theme & Palette</h2>
    <div class="subtitle">Select a built-in pre-configured theme or calculate a custom palette from base shades.</div>

    <div class="theme-options">
        <div id="card-dark" class="theme-card" data-theme="dark">
            <div class="theme-name">Dark Theme</div>
            <div class="theme-desc">#121012 & #FF2A4D</div>
        </div>
        <div id="card-light" class="theme-card" data-theme="light">
            <div class="theme-name">Light Theme</div>
            <div class="theme-desc">#F6EFE2 & #A81A32</div>
        </div>
        <div id="card-custom" class="theme-card" data-theme="custom">
            <div class="theme-name">Custom Theme</div>
            <div class="theme-desc">Custom Calculator</div>
        </div>
    </div>

    <!-- Custom Theme Form (Shown when custom is selected) -->
    <div id="custom-form" class="custom-form">
        <div class="form-row">
            <label class="color-picker-wrapper" for="color-bg">
                <input id="color-bg" type="color" value="#121012" title="Click to choose Background Color">
                <span class="color-label">Background Color</span>
            </label>
            <input id="text-bg" type="text" value="#121012" maxlength="7" spellcheck="false" placeholder="#121012">
        </div>
        <div class="form-row">
            <label class="color-picker-wrapper" for="color-fg">
                <input id="color-fg" type="color" value="#C7BEAF" title="Click to choose Foreground / Text Color">
                <span class="color-label">Foreground / Text Color</span>
            </label>
            <input id="text-fg" type="text" value="#C7BEAF" maxlength="7" spellcheck="false" placeholder="#C7BEAF">
        </div>
        <div class="form-row">
            <label class="color-picker-wrapper" for="color-accent">
                <input id="color-accent" type="color" value="#FF2A4D" title="Click to choose Accent Color">
                <span class="color-label">Accent Color</span>
            </label>
            <input id="text-accent" type="text" value="#FF2A4D" maxlength="7" spellcheck="false" placeholder="#FF2A4D">
        </div>

        <!-- Quick Palette Presets -->
        <div class="presets-section">
            <div class="presets-title">Popular Presets:</div>
            <div class="preset-chips">
                <button type="button" class="preset-chip" data-bg="#1E1E2E" data-fg="#CDD6F4" data-accent="#F38BA8">Catppuccin</button>
                <button type="button" class="preset-chip" data-bg="#2E3440" data-fg="#D8DEE9" data-accent="#88C0D0">Nord</button>
                <button type="button" class="preset-chip" data-bg="#282A36" data-fg="#F8F8F2" data-accent="#BD93F9">Dracula</button>
                <button type="button" class="preset-chip" data-bg="#1A1B26" data-fg="#A9B1D6" data-accent="#7AA2F7">Tokyo Night</button>
                <button type="button" class="preset-chip" data-bg="#282828" data-fg="#EBDBB2" data-accent="#FE8019">Gruvbox</button>
                <button type="button" class="preset-chip" data-bg="#0D1117" data-fg="#C9D1D9" data-accent="#58A6FF">GitHub Dark</button>
            </div>
        </div>

        <!-- Real-Time Calculated Palette Preview Box -->
        <div id="preview-box" class="preview-box">
            <div id="preview-accent" class="preview-accent-line"></div>
            <div id="preview-header" class="preview-header">Custom Theme Preview</div>
            <div id="preview-body" class="preview-body">This preview demonstrates the automatically calculated shades, borders, and high-contrast text.</div>
            <div id="preview-code" class="preview-code">const engine = new SearchIndex();</div>
        </div>

        <button id="btn-apply-custom" class="btn-primary" style="width: 100%;">Save & Apply Custom Theme</button>
    </div>

    <hr class="section-divider" />

    <!-- 3. ACTIONS & SHORTCUTS -->
    <h2>Quick Actions</h2>
    <div class="btn-group">
        <button id="btn-open-tab">Open Documentation Tab (Ctrl+Alt+G)</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        let currentDirectories = [];
        let currentTheme = 'dark';
        let customColors = {
            background: '#121012',
            foreground: '#C7BEAF',
            accent: '#FF2A4D'
        };

        // Color Math Helper for Webview Preview
        function parseHex(hex) {
            let clean = hex.trim().replace(/^#/, '');
            if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
            if (clean.length !== 6) return { r: 18, g: 16, b: 18 };
            const num = parseInt(clean, 16);
            return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
        }

        function toHex(r, g, b) {
            const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
            return '#' + ((clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).padStart(6, '0');
        }

        function mix(hex1, hex2, w) {
            const c1 = parseHex(hex1);
            const c2 = parseHex(hex2);
            return toHex(
                c1.r * (1 - w) + c2.r * w,
                c1.g * (1 - w) + c2.g * w,
                c1.b * (1 - w) + c2.b * w
            );
        }

        function getLum(hex) {
            const { r, g, b } = parseHex(hex);
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }

        function updateCustomPreview() {
            const bg = document.getElementById('text-bg').value;
            const fg = document.getElementById('text-fg').value;
            const accent = document.getElementById('text-accent').value;

            const isDark = getLum(bg) < 128;
            const headerColor = isDark ? mix(fg, '#FFFFFF', 0.25) : mix(fg, '#000000', 0.35);
            const codeBg = isDark ? mix(bg, fg, 0.08) : mix(bg, fg, 0.07);
            const borderColor = isDark ? mix(bg, fg, 0.20) : mix(bg, fg, 0.22);

            const box = document.getElementById('preview-box');
            const pAccent = document.getElementById('preview-accent');
            const pHeader = document.getElementById('preview-header');
            const pBody = document.getElementById('preview-body');
            const pCode = document.getElementById('preview-code');

            box.style.backgroundColor = bg;
            box.style.borderColor = borderColor;

            pAccent.style.backgroundColor = accent;
            pHeader.style.color = headerColor;
            pHeader.style.borderColor = borderColor;
            pBody.style.color = fg;
            pCode.style.backgroundColor = codeBg;
            pCode.style.borderColor = borderColor;
            pCode.style.color = fg;
        }

        function syncColorInputs(colorElId, textElId) {
            const colorEl = document.getElementById(colorElId);
            const textEl = document.getElementById(textElId);

            colorEl.addEventListener('input', (e) => {
                textEl.value = e.target.value.toUpperCase();
                updateCustomPreview();
            });

            textEl.addEventListener('input', (e) => {
                let val = e.target.value.trim();
                if (!val.startsWith('#') && (val.length === 3 || val.length === 6)) {
                    val = '#' + val;
                }
                if (/^#[0-9A-Fa-f]{3}$/.test(val)) {
                    const expanded = '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3];
                    colorEl.value = expanded;
                } else if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                    colorEl.value = val;
                }
                updateCustomPreview();
            });
        }

        syncColorInputs('color-bg', 'text-bg');
        syncColorInputs('color-fg', 'text-fg');
        syncColorInputs('color-accent', 'text-accent');

        // Preset chips listener
        document.querySelectorAll('.preset-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const bg = chip.getAttribute('data-bg');
                const fg = chip.getAttribute('data-fg');
                const accent = chip.getAttribute('data-accent');

                document.getElementById('color-bg').value = bg;
                document.getElementById('text-bg').value = bg;
                document.getElementById('color-fg').value = fg;
                document.getElementById('text-fg').value = fg;
                document.getElementById('color-accent').value = accent;
                document.getElementById('text-accent').value = accent;

                updateCustomPreview();
            });
        });

        // Render Directory List
        function renderDirectories() {
            const listEl = document.getElementById('dir-list');
            const countPill = document.getElementById('dir-count-pill');
            countPill.textContent = currentDirectories.length + (currentDirectories.length === 1 ? ' folder' : ' folders');

            if (currentDirectories.length === 0) {
                listEl.innerHTML = '<div class="dir-empty">No directories configured. Click "+ Add Directory..." to monitor folders.</div>';
                return;
            }

            listEl.innerHTML = currentDirectories.map(dir => {
                return '<div class="dir-item">' +
                    '<span class="dir-path" title="' + dir + '">' + dir + '</span>' +
                    '<button class="btn-remove" data-remove-path="' + dir + '">Remove</button>' +
                '</div>';
            }).join('');
        }

        // Delegate Directory Removal
        document.getElementById('dir-list').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-remove-path]');
            if (btn) {
                const p = btn.getAttribute('data-remove-path');
                if (p) {
                    vscode.postMessage({ command: 'removeDirectory', dirPath: p });
                }
            }
        });

        // Add Directory Button
        document.getElementById('btn-add-dir').addEventListener('click', () => {
            vscode.postMessage({ command: 'addDirectory' });
        });

        // Rescan Button
        document.getElementById('btn-rescan').addEventListener('click', () => {
            vscode.postMessage({ command: 'rescan' });
        });

        // Open Tab Button
        document.getElementById('btn-open-tab').addEventListener('click', () => {
            vscode.postMessage({ command: 'openTab' });
        });

        // Theme Cards Selection
        function updateThemeUI(themeName) {
            currentTheme = themeName;
            document.querySelectorAll('.theme-card').forEach(card => {
                if (card.getAttribute('data-theme') === themeName) {
                    card.classList.add('active');
                } else {
                    card.classList.remove('active');
                }
            });

            const customForm = document.getElementById('custom-form');
            if (themeName === 'custom') {
                customForm.classList.add('visible');
                updateCustomPreview();
            } else {
                customForm.classList.remove('visible');
            }
        }

        document.querySelectorAll('.theme-card').forEach(card => {
            card.addEventListener('click', () => {
                const themeName = card.getAttribute('data-theme');
                updateThemeUI(themeName);
                if (themeName !== 'custom') {
                    vscode.postMessage({ command: 'saveTheme', theme: themeName });
                }
            });
        });

        // Apply Custom Theme Button
        document.getElementById('btn-apply-custom').addEventListener('click', () => {
            const bg = document.getElementById('text-bg').value;
            const fg = document.getElementById('text-fg').value;
            const accent = document.getElementById('text-accent').value;

            customColors = {
                background: bg,
                foreground: fg,
                accent: accent
            };

            vscode.postMessage({
                command: 'saveTheme',
                theme: 'custom',
                customColors: customColors
            });
        });

        // Message Listener from Extension Host
        window.addEventListener('message', (event) => {
            const msg = event.data;
            if (!msg || !msg.command) return;

            if (msg.command === 'stateUpdate') {
                currentDirectories = msg.directories || [];
                renderDirectories();

                if (msg.theme) {
                    updateThemeUI(msg.theme);
                }

                if (msg.customTheme) {
                    customColors = msg.customTheme;
                    document.getElementById('color-bg').value = customColors.background;
                    document.getElementById('text-bg').value = customColors.background;
                    document.getElementById('color-fg').value = customColors.foreground;
                    document.getElementById('text-fg').value = customColors.foreground;
                    document.getElementById('color-accent').value = customColors.accent;
                    document.getElementById('text-accent').value = customColors.accent;
                    updateCustomPreview();
                }
            }
        });

        // Ask for Initial State
        vscode.postMessage({ command: 'getInitialState' });
    </script>
</body>
</html>`;
    }
}
