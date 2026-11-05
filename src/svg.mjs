import { CHARSET } from './font.mjs';

/** Text and attribute values, escaped for XML. */
export function esc(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** A number for a coordinate: at most two decimals, no trailing zeros. */
export const n = (v) => String(Math.round(v * 100) / 100);

/** Silkscreen text: only what the embedded font can print (font.mjs), so a fallback never shows up for one glyph. */
export function text(x, y, value, attrs = '') {
  for (const ch of String(value)) {
    if (!CHARSET.has(ch)) throw new Error(`No glyph for ${JSON.stringify(ch)} in ${JSON.stringify(value)}`);
  }
  return `<text x="${n(x)}" y="${n(y)}"${attrs ? ` ${attrs}` : ''}>${esc(value)}</text>`;
}

/** The outer <svg>, with its accessible name and a description: what a viewer opening the file on its own gets. */
export function svgDoc({ width, height, title, desc, style, body }) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="t d">`,
    `<title id="t">${esc(title)}</title>`,
    `<desc id="d">${esc(desc)}</desc>`,
    `<style>${style}</style>`,
    body,
    '</svg>',
    '',
  ].join('\n');
}

/** The matte grain of the solder mask (the site's grain.svg): fractal noise, 5 % strong. */
export const GRAIN_FILTER =
  '<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .5 0"/></filter>';

/** The board itself: the mask, its routed edge, the grain over it. */
export function board(t, width, height, radius) {
  return [
    `<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="${radius}" fill="${t.mask}" stroke="${t.trace}"/>`,
    `<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="${radius}" filter="url(#grain)" opacity=".05"/>`,
  ].join('\n');
}

/** A plated through hole: a gold ring around a drill. */
export const via = (x, y, r, drill, fill) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${fill}"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(drill)}" class="hole"/>`;
