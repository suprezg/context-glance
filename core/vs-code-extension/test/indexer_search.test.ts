// ============================================================================
// File Name: indexer_search.test.ts
// Purpose: Integration test suite validating Rust engine JSON-RPC search and scoping.
// ============================================================================

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { EngineClient } from '../client';

/**
 * Executes full end-to-end integration tests on native search engine.
 */
async function runTestSuite() {
    console.log('====================================================');
    console.log('Context Glance: Running Rust Engine & Search Tests');
    console.log('====================================================');

    const extensionRoot = path.resolve(__dirname, '..', '..');
    const projectRoot = path.resolve(extensionRoot, '..', '..');
    const examplesDir = path.resolve(projectRoot, 'examples');
    const tempTestDir = path.resolve(extensionRoot, '.test-glance-data');

    // Clean any previous test data
    if (fs.existsSync(tempTestDir)) {
        fs.rmSync(tempTestDir, { recursive: true, force: true });
    }

    const client = new EngineClient(extensionRoot, tempTestDir);

    try {
        console.log('[Test 1] Starting Engine and Ping...');
        await client.start();
        const pingResp = await client.ping();
        assert.strictEqual(pingResp, 'pong', 'Ping must respond with "pong"');
        console.log('✓ Test 1 Passed: Rust Engine alive and responding to JSON-RPC.');

        console.log('\n[Test 2] Adding configured directory (examples/)...');
        assert.ok(fs.existsSync(examplesDir), `Examples dir must exist at: ${examplesDir}`);
        const addResp = await client.addDirectory(examplesDir);
        assert.ok(addResp, 'addDirectory must return true');

        const dirs = await client.getDirectories();
        assert.ok(dirs.includes(examplesDir), 'Directories list must include examplesDir');
        console.log('✓ Test 2 Passed: Directory added to engine.');

        console.log('\n[Test 3] Rescanning examples directory...');
        const stats = await client.rescan();
        console.log(`Scan stats: updated=${stats.updated}, unchanged=${stats.unchanged}, total=${stats.total}`);
        assert.strictEqual(stats.updated, 8, 'Should index exactly 8 example markdown files');
        assert.strictEqual(stats.total, 8, 'Total files should be 8');
        console.log('✓ Test 3 Passed: Initial rescan indexed 8 example documents.');

        console.log('\n[Test 4] Incremental rescan (MTime validation)...');
        const stats2 = await client.rescan();
        assert.strictEqual(stats2.updated, 0, 'No files changed, updated should be 0');
        assert.strictEqual(stats2.unchanged, 8, 'All 8 files should be unchanged');
        console.log('✓ Test 4 Passed: Incremental mtime avoids redundant re-indexing.');

        console.log('\n[Test 5] BM25 Search (Authentication & JWT)...');
        const authResults = await client.search('JWT OAuth', 5);
        assert.ok(authResults.length > 0, 'Search for JWT OAuth should return results');
        assert.strictEqual(authResults[0].relative_path, 'auth-api.md');
        assert.ok(authResults[0].snippet.includes('JWT') || authResults[0].snippet.includes('OAuth'));
        console.log(`✓ Test 5 Passed: BM25 matched auth-api.md (top score: ${authResults[0].score.toFixed(2)})`);

        console.log('\n[Test 6] BM25 Search (Vector Engine & Math/Similarity)...');
        const vectorResults = await client.search('cosine similarity HNSW', 5);
        assert.ok(vectorResults.length > 0, 'Search for cosine similarity should return results');
        assert.strictEqual(vectorResults[0].relative_path, 'vector-engine.md');
        console.log(`✓ Test 6 Passed: BM25 matched vector-engine.md (top score: ${vectorResults[0].score.toFixed(2)})`);

        console.log('\n[Test 7] Tantivy Fuzzy Search with Typos...');
        const typoResults = await client.search('autentication', 5);
        assert.ok(typoResults.length > 0, 'Fuzzy search should match despite typo');
        assert.strictEqual(typoResults[0].relative_path, 'auth-api.md');
        console.log(`✓ Test 7 Passed: Fuzzy query 'autentication' found auth-api.md (${typoResults[0].match_source})`);

        console.log('\n[Test 8] Strict Scoping & Outside Directory Isolation...');
        const outsideDir = path.resolve(extensionRoot, '.outside-test-secret');
        fs.mkdirSync(outsideDir, { recursive: true });
        const secretFile = path.join(outsideDir, 'secrets.md');
        fs.writeFileSync(secretFile, '# TOP SECRET CLASSIFIED\nTOKEN_SECRET_999888\n');

        const secretResults = await client.search('TOKEN_SECRET_999888', 5);
        assert.strictEqual(secretResults.length, 0, 'CRITICAL: Search returned results from outside directory!');

        let readFailed = false;
        try {
            await client.getMarkdownContent(undefined, secretFile);
        } catch {
            readFailed = true;
        }
        assert.ok(readFailed, 'Access to files outside configured directories must be rejected');
        fs.rmSync(outsideDir, { recursive: true, force: true });
        console.log('✓ Test 8 Passed: Strict scoping rejects outside directories.');

        console.log('\n[Test 9] Document blocks extraction and glance recording...');
        const blocks = await client.getDocumentBlocks(authResults[0].document_id);
        assert.ok(blocks.length > 0, 'Blocks should be populated in SQLite');
        const glanceRecorded = await client.recordGlance(authResults[0].document_id, blocks[0].id, 'tab');
        assert.ok(glanceRecorded, 'recordGlance should succeed');
        console.log(`✓ Test 9 Passed: Extracted ${blocks.length} blocks and recorded glance.`);

        console.log('\n====================================================');
        console.log('ALL 9 TESTS PASSED SUCCESSFULLY! ✓');
        console.log('====================================================');
    } finally {
        client.dispose();
        if (fs.existsSync(tempTestDir)) {
            try {
                fs.rmSync(tempTestDir, { recursive: true, force: true });
            } catch {}
        }
    }
}

if (require.main === module) {
    runTestSuite().catch((err) => {
        console.error('Test Suite Failed:', err);
        process.exit(1);
    });
}

export { runTestSuite };
