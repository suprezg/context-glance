// ============================================================================
// File Name: themecalculator.test.ts
// Purpose: Unit tests for theme color calculation and palette generation.
// ============================================================================

import * as assert from 'assert';
import {
    calculateThemePalette,
    getLuminance,
    mixColors,
    parseHex,
    toHex,
    toRgbaString
} from '../settings/themecalculator';

/**
 * Executes unit test suite for theme calculator.
 */
export async function runThemeCalculatorTests(): Promise<void> {
    console.log('----------------------------------------------------');
    console.log('Testing Theme Calculator Subsystem');
    console.log('----------------------------------------------------');

    // Test 1: parseHex standard 6-digit hex
    const rgb1 = parseHex('#FF2A4D');
    assert.strictEqual(rgb1.r, 255);
    assert.strictEqual(rgb1.g, 42);
    assert.strictEqual(rgb1.b, 77);
    console.log('✓ parseHex 6-digit hex parsed correctly.');

    // Test 2: parseHex 3-digit shorthand
    const rgb2 = parseHex('#FFF');
    assert.strictEqual(rgb2.r, 255);
    assert.strictEqual(rgb2.g, 255);
    assert.strictEqual(rgb2.b, 255);
    console.log('✓ parseHex 3-digit shorthand expanded and parsed correctly.');

    // Test 3: parseHex invalid hex fallback
    const rgb3 = parseHex('not-a-color');
    assert.strictEqual(rgb3.r, 18);
    assert.strictEqual(rgb3.g, 16);
    assert.strictEqual(rgb3.b, 18);
    console.log('✓ parseHex invalid string yields fallback color.');

    // Test 4: toHex round trip
    const hex = toHex(255, 42, 77);
    assert.strictEqual(hex.toLowerCase(), '#ff2a4d');
    console.log('✓ toHex formats RGB into normalized hex.');

    // Test 5: getLuminance calculation
    const darkLum = getLuminance('#121012');
    const lightLum = getLuminance('#F6EFE2');
    assert.ok(darkLum < 50, 'Dark background luminance should be low');
    assert.ok(lightLum > 200, 'Light background luminance should be high');
    assert.ok(darkLum < lightLum, 'Dark luminance must be lower than light luminance');
    console.log('✓ getLuminance computes perceived luminance correctly.');

    // Test 6: mixColors interpolation
    const mixed50 = mixColors('#000000', '#ffffff', 0.5);
    const mixedRgb = parseHex(mixed50);
    assert.ok(Math.abs(mixedRgb.r - 128) <= 1, '50% black/white blend should be near 128');
    console.log('✓ mixColors correctly interpolates between two colors.');

    // Test 7: toRgbaString
    const rgba = toRgbaString('#ff0000', 0.5);
    assert.strictEqual(rgba, 'rgba(255, 0, 0, 0.50)');
    console.log('✓ toRgbaString formats valid CSS rgba declaration.');

    // Test 8: calculateThemePalette for dark theme
    const darkPalette = calculateThemePalette({
        background: '#121012',
        foreground: '#C7BEAF',
        accent: '#FF2A4D'
    });
    assert.strictEqual(darkPalette.isDark, true);
    assert.strictEqual(darkPalette.bgColor, '#121012');
    assert.strictEqual(darkPalette.themeRed, '#FF2A4D');
    assert.ok(darkPalette.headerColor.startsWith('#'));
    assert.ok(darkPalette.activeBlockBg.startsWith('rgba('));
    console.log('✓ calculateThemePalette produces comprehensive dark palette.');

    // Test 9: calculateThemePalette for light theme
    const lightPalette = calculateThemePalette({
        background: '#F6EFE2',
        foreground: '#2E2A27',
        accent: '#FF2A4D'
    });
    assert.strictEqual(lightPalette.isDark, false);
    assert.strictEqual(lightPalette.bgColor, '#F6EFE2');
    assert.strictEqual(lightPalette.themeRed, '#FF2A4D');
    console.log('✓ calculateThemePalette produces comprehensive light palette.');

    console.log('✓ All Theme Calculator tests passed successfully!\n');
}

if (require.main === module) {
    runThemeCalculatorTests().catch((err) => {
        console.error('Theme Calculator Tests Failed:', err);
        process.exit(1);
    });
}
