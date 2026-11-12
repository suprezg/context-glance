// ============================================================================
// File Name: run_all_tests.ts
// Purpose: Unified test runner executing unit and integration tests.
// ============================================================================

import { runThemeCalculatorTests } from './themecalculator.test';
import { runMarkdownRendererTests } from './markdownrenderer.test';
import { runTestSuite } from './indexer_search.test';

/**
 * Main test entry point running all test suites sequentially.
 */
async function main(): Promise<void> {
    console.log('====================================================');
    console.log('CONTEXT GLANCE COMPLETE TEST SUITE');
    console.log('====================================================\n');

    try {
        await runThemeCalculatorTests();
        await runMarkdownRendererTests();
        await runTestSuite();

        console.log('====================================================');
        console.log('ALL UNIT AND INTEGRATION TEST SUITES PASSED! ✓');
        console.log('====================================================');
    } catch (err) {
        console.error('\n❌ Test Suite Run Failed:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
