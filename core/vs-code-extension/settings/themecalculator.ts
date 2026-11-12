// ============================================================================
// File Name: themecalculator.ts
// Purpose: Color calculation utility for generating harmonious 2D theme palettes.
// ============================================================================

const DEFAULT_BG_HEX = '#121012';
const DEFAULT_FG_HEX = '#C7BEAF';
const DEFAULT_ACCENT_HEX = '#FF2A4D';
const DARK_LUMINANCE_THRESHOLD = 128;

/**
 * Three-color base input for generating a comprehensive custom theme palette.
 */
export interface CustomThemeInput {
    background: string;
    foreground: string;
    accent: string;
}

/**
 * Full CSS variable values for Context Glance 2D theme palette.
 */
export interface ThemePalette {
    bgColor: string;
    textColor: string;
    headerColor: string;
    codeBg: string;
    borderColor: string;
    toastBg: string;
    toastText: string;
    statusBg: string;
    hintsColor: string;
    hintsKey: string;
    inlineCodeColor: string;
    activeBlockBg: string;
    linkColor: string;
    modalBg: string;
    modalInputBg: string;
    searchItemHover: string;
    searchBadgeBg: string;
    searchBadgeText: string;
    themeRed: string;
    isDark: boolean;
}

/**
 * Calculates a complete, accessible 2D palette from user-provided base colors.
 */
export function calculateThemePalette(input: CustomThemeInput): ThemePalette {
    const bg = input.background || DEFAULT_BG_HEX;
    const fg = input.foreground || DEFAULT_FG_HEX;
    const accent = input.accent || DEFAULT_ACCENT_HEX;

    const lum = getLuminance(bg);
    const isDark = lum < DARK_LUMINANCE_THRESHOLD;

    if (isDark) {
        return {
            bgColor: bg,
            textColor: fg,
            headerColor: mixColors(fg, '#FFFFFF', 0.25),
            codeBg: mixColors(bg, fg, 0.08),
            borderColor: mixColors(bg, fg, 0.20),
            toastBg: mixColors(fg, '#FFFFFF', 0.15),
            toastText: bg,
            statusBg: mixColors(bg, '#000000', 0.25),
            hintsColor: mixColors(fg, bg, 0.40),
            hintsKey: mixColors(fg, '#FFFFFF', 0.20),
            inlineCodeColor: mixColors(accent, fg, 0.15),
            activeBlockBg: toRgbaString(accent, 0.08),
            linkColor: mixColors(accent, '#4A9EFF', 0.50),
            modalBg: mixColors(bg, fg, 0.04),
            modalInputBg: mixColors(bg, fg, 0.10),
            searchItemHover: toRgbaString(fg, 0.04),
            searchBadgeBg: 'transparent',
            searchBadgeText: accent,
            themeRed: accent,
            isDark: true
        };
    } else {
        return {
            bgColor: bg,
            textColor: fg,
            headerColor: mixColors(fg, '#000000', 0.35),
            codeBg: mixColors(bg, fg, 0.07),
            borderColor: mixColors(bg, fg, 0.22),
            toastBg: fg,
            toastText: bg,
            statusBg: mixColors(bg, fg, 0.08),
            hintsColor: mixColors(fg, bg, 0.45),
            hintsKey: mixColors(fg, '#000000', 0.25),
            inlineCodeColor: accent,
            activeBlockBg: toRgbaString(accent, 0.08),
            linkColor: mixColors(accent, '#0B66C3', 0.50),
            modalBg: mixColors(bg, '#FFFFFF', 0.45),
            modalInputBg: mixColors(bg, fg, 0.06),
            searchItemHover: toRgbaString('#000000', 0.04),
            searchBadgeBg: 'transparent',
            searchBadgeText: accent,
            themeRed: accent,
            isDark: false
        };
    }
}

/**
 * Calculates standard perceived luminance (0 to 255) of a hexadecimal color.
 */
export function getLuminance(hex: string): number {
    const { r, g, b } = parseHex(hex);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Blends two hex colors by linear interpolation of RGB channels.
 */
export function mixColors(hex1: string, hex2: string, weight: number): string {
    const c1 = parseHex(hex1);
    const c2 = parseHex(hex2);
    const w = Math.max(0, Math.min(1, weight));
    const r = c1.r * (1 - w) + c2.r * w;
    const g = c1.g * (1 - w) + c2.g * w;
    const b = c1.b * (1 - w) + c2.b * w;
    return toHex(r, g, b);
}

/**
 * Converts a hex code to an rgba(...) CSS string.
 */
export function toRgbaString(hex: string, alpha: number): string {
    const { r, g, b } = parseHex(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

/**
 * Parses 3-digit or 6-digit hex color string into integer RGB components.
 */
export function parseHex(hex: string): { r: number; g: number; b: number } {
    let clean = hex.trim().replace(/^#/, '');
    if (clean.length === 3) {
        clean = clean.split('').map(c => c + c).join('');
    }
    if (clean.length !== 6) {
        return { r: 18, g: 16, b: 18 };
    }
    const num = parseInt(clean, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

/**
 * Formats RGB integers into a normalized uppercase hex color string.
 */
export function toHex(r: number, g: number, b: number): string {
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    const h = (clamp(r) << 16) | (clamp(g) << 8) | clamp(b);
    return '#' + h.toString(16).padStart(6, '0');
}
