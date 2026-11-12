// ============================================================================
// File Name: markdownrenderer.ts
// Purpose: Rich media Markdown renderer supporting Shiki, KaTeX math, and Mermaid.
// ============================================================================

import MarkdownIt from 'markdown-it';
import katex from 'katex';
import { createHighlighter, Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

type MarkdownItInstance = InstanceType<typeof MarkdownIt>;

/**
 * Renders raw Markdown into rich HTML with syntax highlighting and LaTeX math.
 */
export async function renderMarkdown(markdown: string): Promise<string> {
    const highlighter = await getHighlighter();
    const md = new MarkdownIt({
        html: true,
        linkify: true,
        typographer: true
    });

    applyMathPlugin(md);
    applyFences(md, highlighter);

    return md.render(markdown);
}

/**
 * Retrieves or initializes singleton Shiki syntax highlighter instance.
 */
function getHighlighter(): Promise<Highlighter> {
    if (!highlighterPromise) {
        highlighterPromise = createHighlighter({
            themes: ['github-dark'],
            langs: [
                'typescript',
                'javascript',
                'python',
                'json',
                'markdown',
                'html',
                'css',
                'bash',
                'sql',
                'yaml',
                'c',
                'cpp',
                'rust',
                'go'
            ]
        });
    }
    return highlighterPromise!;
}

/**
 * Registers KaTeX inline ($...$) and display block ($$...$$) math parsing rules.
 */
function applyMathPlugin(md: MarkdownItInstance): void {
    // Inline math rule: $...$
    md.inline.ruler.after('escape', 'math_inline', (state: any, silent: boolean) => {
        if (state.src.charCodeAt(state.pos) !== 0x24 /* $ */) {
            return false;
        }

        // Inline display math: $$...$$
        if (state.src.charCodeAt(state.pos + 1) === 0x24) {
            const end = state.src.indexOf('$$', state.pos + 2);
            if (end === -1) return false;
            if (!silent) {
                const token = state.push('math_block_inline', 'math', 0);
                token.content = state.src.slice(state.pos + 2, end);
            }
            state.pos = end + 2;
            return true;
        }

        // Inline math: $...$
        let end = state.pos + 1;
        while ((end = state.src.indexOf('$', end)) !== -1) {
            if (state.src.charCodeAt(end - 1) !== 0x5c /* \ */) {
                break;
            }
            end++;
        }
        if (end === -1) return false;
        const content = state.src.slice(state.pos + 1, end);
        if (!silent) {
            const token = state.push('math_inline', 'math', 0);
            token.content = content;
        }
        state.pos = end + 1;
        return true;
    });

    // Block math rule: $$ ... $$
    md.block.ruler.after('blockquote', 'math_block', (state: any, startLine: number, endLine: number, silent: boolean) => {
        const startPos = state.bMarks[startLine] + state.tShift[startLine];
        const maxPos = state.eMarks[startLine];

        if (startPos + 2 > maxPos || state.src.slice(startPos, startPos + 2) !== '$$') {
            return false;
        }

        const restOfFirstLine = state.src.slice(startPos + 2, maxPos).trim();
        if (restOfFirstLine.endsWith('$$') && restOfFirstLine.length >= 2) {
            if (!silent) {
                const token = state.push('math_block', 'math', 0);
                token.block = true;
                token.content = restOfFirstLine.slice(0, -2).trim();
                token.map = [startLine, startLine + 1];
            }
            state.line = startLine + 1;
            return true;
        }

        let nextLine = startLine;
        let found = false;
        while (nextLine < endLine) {
            nextLine++;
            if (nextLine >= endLine) break;
            const pos = state.bMarks[nextLine] + state.tShift[nextLine];
            const max = state.eMarks[nextLine];
            const lineText = state.src.slice(pos, max).trim();
            if (lineText.endsWith('$$')) {
                found = true;
                break;
            }
        }

        if (!found) return false;
        if (!silent) {
            const lines: string[] = [];
            for (let i = startLine; i <= nextLine; i++) {
                const pos = state.bMarks[i] + state.tShift[i];
                const max = state.eMarks[i];
                let lineText = state.src.slice(pos, max);
                if (i === startLine) lineText = lineText.slice(startPos - state.bMarks[startLine] + 2);
                if (i === nextLine) {
                    const endIdx = lineText.lastIndexOf('$$');
                    if (endIdx !== -1) lineText = lineText.slice(0, endIdx);
                }
                lines.push(lineText);
            }
            const token = state.push('math_block', 'math', 0);
            token.block = true;
            token.content = lines.join('\n').trim();
            token.map = [startLine, nextLine + 1];
        }

        state.line = nextLine + 1;
        return true;
    });

    md.renderer.rules.math_inline = (tokens: any[], idx: number) => {
        return katex.renderToString(tokens[idx].content, {
            displayMode: false,
            throwOnError: false
        });
    };

    md.renderer.rules.math_block_inline = (tokens: any[], idx: number) => {
        const raw = tokens[idx].content;
        return `<div class="katex-display math-block-target" data-raw-math="${md.utils.escapeHtml(raw)}">${katex.renderToString(raw, {
            displayMode: true,
            throwOnError: false
        })}</div>`;
    };

    md.renderer.rules.math_block = (tokens: any[], idx: number) => {
        const raw = tokens[idx].content;
        return `<div class="katex-display math-block-target" data-raw-math="${md.utils.escapeHtml(raw)}">${katex.renderToString(raw, {
            displayMode: true,
            throwOnError: false
        })}</div>\n`;
    };
}

/**
 * Registers syntax highlighting rules for fenced code blocks and Mermaid diagrams.
 */
function applyFences(md: MarkdownItInstance, highlighter: Highlighter): void {
    md.renderer.rules.fence = (tokens: any[], idx: number) => {
        const token = tokens[idx];
        const lang = token.info.trim();
        const raw = token.content;

        if (lang === 'mermaid') {
            return `<div class="mermaid code-block-target" data-raw-code="${md.utils.escapeHtml(raw)}">\n${raw}\n</div>\n`;
        }

        if (lang) {
            try {
                const html = highlighter.codeToHtml(raw, {
                    lang: lang,
                    theme: 'github-dark'
                });
                return `<div class="code-block-wrapper code-block-target" data-raw-code="${md.utils.escapeHtml(raw)}">${html}</div>\n`;
            } catch (err) {
                // Fallback to plain code block on unknown language
            }
        }

        return `<div class="code-block-wrapper code-block-target" data-raw-code="${md.utils.escapeHtml(raw)}"><pre class="shiki github-dark" style="background-color:#181518;color:#c7beaf;padding:12px;border:1px solid #282228;overflow-x:auto;"><code>${md.utils.escapeHtml(raw)}</code></pre></div>\n`;
    };
}
