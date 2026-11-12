// ============================================================================
// File Name: tabviewer.ts
// Purpose: Tab-based documentation viewport orchestrator and WebviewPanel lifecycle.
// ============================================================================

import * as path from 'path';
import * as vscode from 'vscode';
import { EngineClient } from '../client';
import { renderMarkdown } from '../renderer';
import { calculateThemePalette, CustomThemeInput } from '../settings';
import { buildTabHtml } from './tabtemplate';

const DEFAULT_THEME = 'dark';
const DEFAULT_TITLE = 'Reference Guide';
const FALLBACK_BG = '#121012';
const FALLBACK_FG = '#C7BEAF';
const FALLBACK_ACCENT = '#FF2A4D';

/**
 * Options for opening or revealing the dedicated documentation tab.
 */
export interface OpenTabOptions {
    autoSearch?: boolean;
    initialQuery?: string;
    customTitle?: string;
    customMarkdown?: string;
    initialBlockIndex?: number;
}

/**
 * Registers the tab view listener with the extension context subscriptions.
 */
export function registerTabView(context: vscode.ExtensionContext, engineClient?: EngineClient): TabViewer {
    const viewer = new TabViewer(context, engineClient);

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('contextGlance.theme') || e.affectsConfiguration('contextGlance.customTheme')) {
                const config = vscode.workspace.getConfiguration('contextGlance');
                const newTheme = config.get<string>('theme', DEFAULT_THEME) || DEFAULT_THEME;
                const customTheme = config.get<CustomThemeInput>('customTheme');
                viewer.setTheme(newTheme, customTheme);
            }
        })
    );

    return viewer;
}

/**
 * Orchestrates the persistent multi-document WebviewPanel and handles bidirectional IPC.
 */
export class TabViewer {
    private currentPanel: vscode.WebviewPanel | undefined = undefined;
    private lastActiveEditor: vscode.TextEditor | undefined = undefined;
    private lastCursorPosition: vscode.Position | undefined = undefined;
    private engineClient: EngineClient | undefined;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext, engineClient?: EngineClient) {
        this.context = context;
        this.engineClient = engineClient;
    }

    public setEngineClient(client: EngineClient): void {
        this.engineClient = client;
    }

    /**
     * Opens or reveals the dedicated tab Webview panel.
     */
    public async openDedicatedTab(
        optionsOrTitle?: OpenTabOptions | string,
        customMarkdownParam?: string,
        initialBlockIndexParam: number = 0
    ): Promise<void> {
        let options: OpenTabOptions = {};
        if (typeof optionsOrTitle === 'string') {
            options = {
                customTitle: optionsOrTitle,
                customMarkdown: customMarkdownParam,
                initialBlockIndex: initialBlockIndexParam
            };
        } else if (optionsOrTitle) {
            options = optionsOrTitle;
        }

        if (vscode.window.activeTextEditor) {
            this.lastActiveEditor = vscode.window.activeTextEditor;
            this.lastCursorPosition = vscode.window.activeTextEditor.selection.active;
        }

        const column = this.currentPanel?.viewColumn ?? vscode.ViewColumn.Active;
        const title = options.customTitle || 'Context Glance';
        const currentTheme = vscode.workspace.getConfiguration('contextGlance').get<string>('theme', DEFAULT_THEME) || DEFAULT_THEME;
        const customTheme = vscode.workspace.getConfiguration('contextGlance').get<CustomThemeInput>('customTheme');

        if (this.currentPanel) {
            this.currentPanel.reveal(this.currentPanel.viewColumn, false);
            if (options.autoSearch) {
                this.currentPanel.webview.postMessage({
                    command: 'triggerSearch',
                    query: options.initialQuery || ''
                });
            } else if (options.customMarkdown) {
                const rendered = await renderMarkdown(options.customMarkdown);
                this.currentPanel.webview.postMessage({
                    command: 'openDocument',
                    documentId: 'custom_' + Date.now(),
                    title: title,
                    relativePath: title,
                    renderedHtml: rendered,
                    targetBlockIdx: options.initialBlockIndex || 0
                });
            }
            return;
        }

        let renderedContent = '';
        let hasInitialDoc = false;
        if (options.customMarkdown) {
            renderedContent = await renderMarkdown(options.customMarkdown);
            hasInitialDoc = true;
        }

        this.currentPanel = vscode.window.createWebviewPanel(
            'contextGlance.dedicatedTab',
            'Context Glance',
            { viewColumn: column, preserveFocus: false },
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(this.context.extensionPath)
                ]
            }
        );

        const mermaidUri = this.currentPanel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'))
        );
        const katexCssUri = this.currentPanel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'node_modules', 'katex', 'dist', 'katex.min.css'))
        );

        this.currentPanel.webview.html = this.buildWebviewHtml(
            renderedContent,
            currentTheme,
            customTheme,
            options.initialBlockIndex || 0,
            title,
            hasInitialDoc,
            options.autoSearch || false,
            options.initialQuery || '',
            mermaidUri,
            katexCssUri
        );

        this.currentPanel.reveal(column, false);

        if (options.autoSearch) {
            setTimeout(() => {
                this.currentPanel?.webview.postMessage({
                    command: 'triggerSearch',
                    query: options.initialQuery || ''
                });
            }, 180);
        }

        this.setupMessageListener();

        this.currentPanel.onDidDispose(() => {
            this.currentPanel = undefined;
        }, null);
    }

    /**
     * Disposes the current Webview tab panel if one is open.
     */
    public closeTab(): void {
        if (this.currentPanel) {
            this.currentPanel.dispose();
            this.currentPanel = undefined;
        }
    }

    /**
     * Broadcasts theme updates to the tab Webview runtime.
     */
    public setTheme(theme: string, customTheme?: CustomThemeInput): void {
        if (this.currentPanel) {
            const configCustom = customTheme || vscode.workspace.getConfiguration('contextGlance').get<CustomThemeInput>('customTheme');
            const palette = configCustom ? calculateThemePalette(configCustom) : undefined;
            this.currentPanel.webview.postMessage({
                command: 'setTheme',
                theme,
                customTheme: palette
            });
        }
    }

    /**
     * Delegates HTML skeleton and stylesheet generation to tabtemplate module.
     */
    public buildWebviewHtml(
        renderedBody: string,
        theme: string = DEFAULT_THEME,
        customTheme?: CustomThemeInput,
        initialBlockIndex: number = 0,
        title: string = DEFAULT_TITLE,
        hasInitialDoc: boolean = false,
        autoSearch: boolean = false,
        initialQuery: string = '',
        mermaidUri?: vscode.Uri,
        katexCssUri?: vscode.Uri
    ): string {
        const palette = calculateThemePalette(customTheme || {
            background: FALLBACK_BG,
            foreground: FALLBACK_FG,
            accent: FALLBACK_ACCENT
        });

        return buildTabHtml({
            renderedBody,
            theme,
            palette,
            initialBlockIndex,
            title,
            hasInitialDoc,
            autoSearch,
            initialQuery,
            mermaidUri,
            katexCssUri
        });
    }

    /**
     * Configures IPC message dispatching for events emitted from the Webview.
     */
    private setupMessageListener(): void {
        if (!this.currentPanel) return;

        this.currentPanel.webview.onDidReceiveMessage(async (message) => {
            if (!message || !message.command) return;

            switch (message.command) {
                case 'search':
                    await this.handleSearchMessage(message.query);
                    break;
                case 'selectDocument':
                    await this.handleSelectDocumentMessage(message.result);
                    break;
                case 'yank':
                    await this.handleYankMessage(message.text, message.blockType);
                    break;
                case 'quit':
                    await this.handleQuitMessage();
                    break;
                default:
                    break;
            }
        });
    }

    private async handleSearchMessage(rawQuery?: string): Promise<void> {
        const query = (rawQuery || '').trim();
        try {
            const results = this.engineClient ? await this.engineClient.search(query, 30) : [];
            this.currentPanel?.webview.postMessage({
                command: 'searchResults',
                query: rawQuery,
                results
            });
        } catch (err) {
            console.error('[TabViewer] Search error:', err);
            this.currentPanel?.webview.postMessage({
                command: 'searchResults',
                query: rawQuery,
                results: []
            });
        }
    }

    private async handleSelectDocumentMessage(res: any): Promise<void> {
        if (!res) return;
        try {
            let content = '';
            if (this.engineClient) {
                content = await this.engineClient.getMarkdownContent(res.document_id, res.absolute_path);
                await this.engineClient.recordGlance(res.document_id, res.block_id || undefined, 'tab');
            }

            const renderedHtml = await renderMarkdown(content);
            let targetBlockIdx = 0;
            if (res.block_id && this.engineClient) {
                try {
                    const blocks = await this.engineClient.getDocumentBlocks(res.document_id);
                    const idx = blocks.findIndex((b) => b.id === res.block_id);
                    if (idx !== -1) targetBlockIdx = idx;
                } catch {
                    // Fall back to default block index
                }
            }

            this.currentPanel?.webview.postMessage({
                command: 'openDocument',
                documentId: res.document_id,
                title: res.document_title,
                relativePath: res.relative_path,
                renderedHtml,
                targetBlockIdx
            });
        } catch (err) {
            vscode.window.showErrorMessage(`Context Glance: Failed to load document: ${(err as Error).message}`);
        }
    }

    private async handleYankMessage(text?: string, blockType?: string): Promise<void> {
        if (!text) return;

        await vscode.env.clipboard.writeText(text);
        if (this.lastActiveEditor) {
            const editor = this.lastActiveEditor;
            const insertPos = this.lastCursorPosition ?? editor.selection.active;
            const success = await editor.edit((editBuilder) => {
                editBuilder.insert(insertPos, text);
            });
            if (success) {
                const label = blockType === 'math' ? 'math formula' : 'code block';
                vscode.window.showInformationMessage(`Yanked ${label} to clipboard and inserted at cursor!`);
            } else {
                vscode.window.showInformationMessage('Yanked to clipboard!');
            }
        } else {
            vscode.window.showInformationMessage('Yanked to clipboard!');
        }
    }

    private async handleQuitMessage(): Promise<void> {
        this.currentPanel?.dispose();
        if (this.lastActiveEditor && !this.lastActiveEditor.document.isClosed) {
            try {
                const editor = await vscode.window.showTextDocument(
                    this.lastActiveEditor.document,
                    this.lastActiveEditor.viewColumn || vscode.ViewColumn.One,
                    false
                );
                if (this.lastCursorPosition) {
                    editor.selection = new vscode.Selection(this.lastCursorPosition, this.lastCursorPosition);
                    editor.revealRange(
                        new vscode.Range(this.lastCursorPosition, this.lastCursorPosition),
                        vscode.TextEditorRevealType.InCenterIfOutsideViewport
                    );
                }
            } catch {
                // Ignore editor refocus errors
            }
        }
    }
}
