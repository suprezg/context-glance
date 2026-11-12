// ============================================================================
// File Name: engineclient.ts
// Purpose: Native Rust engine client managing JSON-RPC process lifecycle and IPC.
// ============================================================================

import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';

const DEFAULT_REQUEST_TIMEOUT_MS = 15000;
const RESCAN_TIMEOUT_MS = 60000;
const SEARCH_TIMEOUT_MS = 8000;
const PING_TIMEOUT_MS = 5000;

/**
 * Scan statistics returned from recursive directory synchronization.
 */
export interface ScanStats {
    updated: number;
    unchanged: number;
    deleted: number;
    total: number;
}

/**
 * BM25 and fuzzy search result item from Tantivy search index.
 */
export interface SearchResult {
    document_id: string;
    relative_path: string;
    absolute_path: string;
    document_title: string;
    block_id: string | null;
    block_type: string | null;
    heading: string | null;
    snippet: string;
    line_number: number;
    score: number;
    match_source: string;
}

/**
 * Parsed document block structure for rich media and cursor yank operations.
 */
export interface DocumentBlock {
    id: string;
    document_id: string;
    block_type: 'heading' | 'paragraph' | 'code' | 'math' | 'html_details' | 'table' | 'list';
    heading_level: number;
    heading_text: string | null;
    anchor_slug: string | null;
    content_text: string;
    raw_markup: string | null;
    line_start: number;
    line_end: number;
    sort_order: number;
    language: string | null;
}

/**
 * JSON-RPC response envelope received from native daemon process.
 */
interface EngineResponse<T> {
    id: number;
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Internal pending promise resolver record.
 */
interface PendingRequest {
    resolve: (data: any) => void;
    reject: (err: Error) => void;
    timer: NodeJS.Timeout;
}

/**
 * Native engine client managing background process communication over stdio.
 */
export class EngineClient {
    private process: cp.ChildProcessWithoutNullStreams | null = null;
    private nextId = 1;
    private pendingRequests = new Map<number, PendingRequest>();
    private dataDir: string;
    private binaryPath: string;
    private isTerminating = false;

    /**
     * Initializes engine client with extension data path and resolved binary.
     */
    constructor(extensionPath: string, dataDir?: string) {
        this.dataDir = dataDir || path.join(extensionPath, '.glance-data');
        this.binaryPath = this.resolveBinary(extensionPath);
    }

    /**
     * Spawns the native Rust engine daemon process and establishes stdio streams.
     */
    public async start(): Promise<void> {
        if (this.process && !this.process.killed) {
            return;
        }

        if (!fs.existsSync(this.binaryPath)) {
            throw new Error(`Context Glance Rust Engine binary not found at: ${this.binaryPath}`);
        }

        try {
            fs.mkdirSync(this.dataDir, { recursive: true });
        } catch {}

        const env = {
            ...process.env,
            CONTEXT_GLANCE_DATA_DIR: this.dataDir
        };

        this.process = cp.spawn(this.binaryPath, [], {
            env,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        const rl = readline.createInterface({
            input: this.process.stdout,
            terminal: false
        });

        // Parse line-delimited JSON-RPC messages from daemon stdout
        rl.on('line', (line) => {
            const trimmed = line.trim();
            if (!trimmed) return;
            try {
                const resp: EngineResponse<any> = JSON.parse(trimmed);
                const pending = this.pendingRequests.get(resp.id);
                if (pending) {
                    clearTimeout(pending.timer);
                    this.pendingRequests.delete(resp.id);
                    if (resp.success) {
                        pending.resolve(resp.data);
                    } else {
                        pending.reject(new Error(resp.error || 'Rust Engine execution failed'));
                    }
                }
            } catch (err) {
                console.error('[EngineClient] Failed to parse engine response JSON:', trimmed, err);
            }
        });

        this.process.stderr.on('data', (data) => {
            console.error('[EngineClient stderr]', data.toString());
        });

        this.process.on('error', (err) => {
            console.error('[EngineClient] Process spawn/runtime error:', err);
        });

        this.process.on('exit', (code, signal) => {
            if (!this.isTerminating) {
                console.warn(`[EngineClient] Rust Engine process exited with code ${code}, signal ${signal}`);
            }
            this.process = null;
            for (const [, req] of this.pendingRequests) {
                clearTimeout(req.timer);
                req.reject(new Error('Engine process terminated unexpectedly'));
            }
            this.pendingRequests.clear();
        });

        await this.ping();
    }

    /**
     * Sends healthcheck ping to verify connection with native background engine.
     */
    public ping(): Promise<string> {
        return this.sendRequest<string>('ping', {}, PING_TIMEOUT_MS);
    }

    /**
     * Adds a directory to the monitored documentation collection.
     */
    public addDirectory(dirPath: string): Promise<boolean> {
        return this.sendRequest<boolean>('add_directory', { path: dirPath });
    }

    /**
     * Removes a directory from the monitored documentation collection.
     */
    public removeDirectory(dirPath: string): Promise<boolean> {
        return this.sendRequest<boolean>('remove_directory', { path: dirPath });
    }

    /**
     * Returns list of all currently configured documentation directories.
     */
    public getDirectories(): Promise<string[]> {
        return this.sendRequest<string[]>('get_directories');
    }

    /**
     * Triggers recursive MTime crawl and indexes modified documentation files.
     */
    public rescan(): Promise<ScanStats> {
        return this.sendRequest<ScanStats>('rescan', {}, RESCAN_TIMEOUT_MS);
    }

    /**
     * Executes Tantivy BM25 full-text search with typo-tolerant fuzzy fallback.
     */
    public search(query: string, limit = 25): Promise<SearchResult[]> {
        return this.sendRequest<SearchResult[]>('search', { query, limit }, SEARCH_TIMEOUT_MS);
    }

    /**
     * Retrieves raw markdown file content for a document ID or path.
     */
    public getMarkdownContent(documentId?: string, filePath?: string): Promise<string> {
        return this.sendRequest<string>('get_markdown_content', {
            document_id: documentId,
            path: filePath
        });
    }

    /**
     * Retrieves parsed structural semantic blocks for a document.
     */
    public getDocumentBlocks(documentId: string): Promise<DocumentBlock[]> {
        return this.sendRequest<DocumentBlock[]>('get_document_blocks', {
            document_id: documentId
        });
    }

    /**
     * Records glance metric for document and active block.
     */
    public recordGlance(documentId: string, blockId?: string, mode = 'tab'): Promise<boolean> {
        return this.sendRequest<boolean>('record_glance', {
            document_id: documentId,
            block_id: blockId,
            access_mode: mode
        });
    }

    /**
     * Terminates child process and cleans up pending request timers.
     */
    public dispose(): void {
        this.isTerminating = true;
        for (const [, req] of this.pendingRequests) {
            clearTimeout(req.timer);
            req.reject(new Error('Engine client disposed'));
        }
        this.pendingRequests.clear();

        if (this.process) {
            try {
                this.process.kill();
            } catch {}
            this.process = null;
        }
    }

    /**
     * Sends line-delimited JSON-RPC request to native engine process with timeout.
     */
    private sendRequest<T>(action: string, payload: Record<string, any> = {}, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS): Promise<T> {
        if (!this.process || this.process.killed) {
            return this.start().then(() => this.sendRequest<T>(action, payload, timeoutMs));
        }

        const id = this.nextId++;
        const requestObj = {
            id,
            action,
            ...payload
        };

        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error(`Rust Engine request '${action}' timed out after ${timeoutMs}ms`));
                }
            }, timeoutMs);

            this.pendingRequests.set(id, { resolve, reject, timer });

            try {
                this.process!.stdin.write(JSON.stringify(requestObj) + '\n');
            } catch (err) {
                clearTimeout(timer);
                this.pendingRequests.delete(id);
                reject(err as Error);
            }
        });
    }

    /**
     * Resolves absolute path to native engine binary across build targets.
     */
    private resolveBinary(extensionPath: string): string {
        const candidates = [
            path.join(extensionPath, 'engine-bin', 'context-glance-engine'),
            path.join(extensionPath, 'src', 'frontend', 'engine-bin', 'context-glance-engine'),
            path.join(extensionPath, '..', 'engine-bin', 'context-glance-engine'),
            path.resolve(extensionPath, '..', 'engine', 'target', 'release', 'context-glance-engine'),
            path.resolve(extensionPath, '..', 'backend', 'target', 'release', 'context-glance-engine'),
            path.resolve(extensionPath, 'src', 'backend', 'target', 'release', 'context-glance-engine'),
            path.resolve(extensionPath, '..', '..', 'backend', 'target', 'release', 'context-glance-engine'),
            path.resolve(extensionPath, '..', 'backend', 'target', 'debug', 'context-glance-engine'),
            path.resolve(extensionPath, 'src', 'backend', 'target', 'debug', 'context-glance-engine'),
            path.resolve(extensionPath, '..', '..', 'backend', 'target', 'debug', 'context-glance-engine'),
            path.join(__dirname, '..', 'engine-bin', 'context-glance-engine'),
            path.join(__dirname, '..', '..', 'engine-bin', 'context-glance-engine'),
            path.join(__dirname, 'engine-bin', 'context-glance-engine'),
            path.join(extensionPath, 'out', 'engine-bin', 'context-glance-engine')
        ];

        for (const c of candidates) {
            if (fs.existsSync(c)) {
                return c;
            }
        }
        return path.join(extensionPath, 'engine-bin', 'context-glance-engine');
    }
}
