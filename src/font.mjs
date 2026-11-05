import { readFileSync } from 'node:fs';

/**
 * The silkscreen font: JetBrains Mono 400 (SIL OFL 1.1), cut down to printable ASCII and the middle
 * dot (tools/subset-font.py). GitHub's image proxy loads no web font, so each SVG carries it as a
 * data URI; without it, the stack falls back to the system monospace fonts.
 */
export const FONT_URL = new URL('../assets/fonts/jetbrains-mono-silk.woff2', import.meta.url);

/** Every character the font covers: what the SVGs may print. Keep in step with tools/subset-font.py. */
export const CHARSET = new Set([...Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCharCode(0x20 + i)), '·']);

export const FONT_STACK = '"JetBrains Mono", ui-monospace, Consolas, monospace';

let cached;

/** The @font-face rule that embeds the font, or an empty string with `embed: false` (a preview of the fallbacks). */
export function fontFace({ embed = true } = {}) {
  if (!embed) return '';
  cached ??= readFileSync(FONT_URL).toString('base64');
  return `@font-face{font-family:"JetBrains Mono";font-weight:400;src:url(data:font/woff2;base64,${cached}) format("woff2")}`;
}
