// ============================================================================
// File Name: extension.ts
// Purpose: Context Glance extension activation, command wiring, and lifecycle.
// ============================================================================

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { registerTabView } from './tab';
import { SettingsViewer } from './settings';
import { EngineClient } from './client';

let engineClientInstance: EngineClient | null = null;

/**
 * Activates the Context Glance Visual Studio Code extension.
 */
export function activate(context: vscode.ExtensionContext) {
    // 1. Initialize native Rust engine client
    const dataDir = context.globalStorageUri?.fsPath || path.join(context.extensionPath, '.glance-data');
    const engineClient = new EngineClient(context.extensionPath, dataDir);
    engineClientInstance = engineClient;

    // 2. Register Tab View immediately and synchronously
    const tabViewer = registerTabView(context, engineClient);

    // 3. Register Settings Viewer panel
    const settingsViewer = new SettingsViewer(context, engineClient, (theme, customTheme) => {
        tabViewer.setTheme(theme, customTheme);
    });

    // 4. Command handlers
    const openTabHandler = async () => {
        const editor = vscode.window.activeTextEditor;
        const selectedText = (editor && !editor.selection.isEmpty)
            ? editor.document.getText(editor.selection).trim()
            : undefined;

        await tabViewer.openDedicatedTab({
            autoSearch: true,
            initialQuery: selectedText
        });
    };

    // 5. Register VS Code commands
    context.subscriptions.push(
        vscode.commands.registerCommand('context-glance.openTab', openTabHandler),
        vscode.commands.registerCommand('context-glance.searchAndGlance', openTabHandler),
        vscode.commands.registerCommand('context-glance.closeTab', () => {
            tabViewer.closeTab();
        }),
        vscode.commands.registerCommand('context-glance.settings', async () => {
            await settingsViewer.openSettings();
        })
    );

    // 6. Start engine and configure initial directories in background
    (async () => {
        try {
            await engineClient.start();

            const config = vscode.workspace.getConfiguration('contextGlance');
            let scanDirs: string[] = config.get<string[]>('scanDirectories', []);

            if (scanDirs.length === 0) {
                scanDirs = [];
                const candidateExamples = [
                    path.resolve(context.extensionPath, '../examples'),
                    path.resolve(context.extensionPath, 'examples'),
                    path.resolve(context.extensionPath, '../../examples')
                ];
                for (const ex of candidateExamples) {
                    if (fs.existsSync(ex)) {
                        scanDirs.push(ex);
                        break;
                    }
                }
            }

            for (const dir of scanDirs) {
                if (fs.existsSync(dir)) {
                    await engineClient.addDirectory(dir);
                }
            }

            await engineClient.rescan();
        } catch (err) {
            console.error('[Context Glance] Engine startup/indexing error:', err);
        }
    })();
}

/**
 * Deactivates extension and cleans up engine client process.
 */
export function deactivate() {
    if (engineClientInstance) {
        engineClientInstance.dispose();
        engineClientInstance = null;
    }
}
