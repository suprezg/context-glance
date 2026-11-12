// ============================================================================
// File Name: markdownrenderer.test.ts
// Purpose: Unit tests for Markdown rendering with Shiki highlighting and KaTeX.
// ============================================================================

import * as assert from 'assert';
import { renderMarkdown } from '../renderer/markdownrenderer';

/**
 * Executes unit test suite for Markdown renderer.
 */
export async function runMarkdownRendererTests(): Promise<void> {
    console.log('----------------------------------------------------');
    console.log('Testing Markdown Renderer Subsystem');
    console.log('----------------------------------------------------');

    // Test 1: Basic markdown headers and paragraphs
    const basicMd = '# Context Glance Title\n\nThis is a simple paragraph.';
    const basicHtml = await renderMarkdown(basicMd);
    assert.ok(basicHtml.includes('<h1'), 'Output must include <h1> tag');
    assert.ok(basicHtml.includes('Context Glance Title'), 'Output must include heading text');
    assert.ok(basicHtml.includes('<p>This is a simple paragraph.</p>'), 'Output must include paragraph');
    console.log('✓ Basic markdown headers and paragraphs rendered.');

    // Test 2: Code block with Shiki syntax highlighting and raw code data attribute
    const codeMd = '```typescript\nconst greeting: string = "hello world";\n```';
    const codeHtml = await renderMarkdown(codeMd);
    assert.ok(codeHtml.includes('code-block-wrapper'), 'Must wrap code block in code-block-wrapper');
    assert.ok(codeHtml.includes('code-block-target'), 'Must tag code block as navigation/yank target');
    assert.ok(codeHtml.includes('data-raw-code='), 'Must store raw code data attribute for clipboard yank');
    assert.ok(codeHtml.includes('shiki'), 'Must use Shiki syntax highlighting class');
    console.log('✓ Code block rendered with Shiki syntax highlighting and yank attribute.');

    // Test 3: Inline KaTeX math
    const inlineMathMd = 'Here is an inline formula: $E = mc^2$.';
    const inlineMathHtml = await renderMarkdown(inlineMathMd);
    assert.ok(inlineMathHtml.includes('katex'), 'Must contain KaTeX rendered math class');
    console.log('✓ Inline KaTeX math rendered correctly.');

    // Test 4: Display KaTeX math block
    const blockMathMd = '$$\n\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}\n$$';
    const blockMathHtml = await renderMarkdown(blockMathMd);
    assert.ok(blockMathHtml.includes('katex-display'), 'Must contain katex-display class');
    assert.ok(blockMathHtml.includes('math-block-target'), 'Must tag math block as navigation/yank target');
    assert.ok(blockMathHtml.includes('data-raw-math='), 'Must store raw math formula data attribute for yank');
    console.log('✓ Display KaTeX math block rendered with math-block-target.');

    // Test 5: Mermaid diagrams block
    const mermaidMd = '```mermaid\ngraph TD;\n    A-->B;\n```';
    const mermaidHtml = await renderMarkdown(mermaidMd);
    assert.ok(mermaidHtml.includes('class="mermaid code-block-target"'), 'Must output class="mermaid code-block-target"');
    console.log('✓ Mermaid diagram fence rendered correctly.');

    // Test 6: HTML tags like details and summary
    const detailsMd = '<details><summary>Click to view</summary>\n\nHidden details content\n</details>';
    const detailsHtml = await renderMarkdown(detailsMd);
    assert.ok(detailsHtml.includes('<details>'), 'Must preserve <details> HTML tag');
    assert.ok(detailsHtml.includes('<summary>Click to view</summary>'), 'Must preserve <summary> tag');
    console.log('✓ Details and summary tags preserved and rendered.');

    console.log('✓ All Markdown Renderer tests passed successfully!\n');
}

if (require.main === module) {
    runMarkdownRendererTests().catch((err) => {
        console.error('Markdown Renderer Tests Failed:', err);
        process.exit(1);
    });
}
