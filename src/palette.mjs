/**
 * The two boards of k0t3i.github.io (its src/styles/tokens.css): the green one for a light page,
 * the matte black one for a dark page. Only the mask, the traces and the dim silkscreen change;
 * the gold, the silkscreen, the drills and DISP1 are the same on both.
 */

const COMMON = {
  gold: '#c9a45c',
  padLit: '#dcb872',
  silk: '#e8e4da',
  hole: '#050506',
  led: '#ffb062',
  module: '#0f1012',
  glass: '#030405',
  bodyEdge: '#2a2c31',
  shadow: '#000000',
};

export const THEMES = {
  light: { name: 'light', ...COMMON, mask: '#0f372a', trace: '#174a39', silkDim: '#b3b8a6', page: '#eceae3' },
  dark: { name: 'dark', ...COMMON, mask: '#0c0d0f', trace: '#17191d', silkDim: '#a29e95', page: '#08090a' },
};

/** `a` mixed into `b` at `share` (0 to 1), like CSS color-mix(in srgb, a share, b). */
export function mix(a, share, b) {
  const ca = rgb(a);
  const cb = rgb(b);
  const out = ca.map((v, i) => Math.round(v * share + cb[i] * (1 - share)));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function rgb(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Not a #rrggbb colour: ${hex}`);
  return [0, 2, 4].map((i) => Number.parseInt(m[1].slice(i, i + 2), 16));
}

/** The silkscreen outlines of the parts: the silk over the mask at 35 % (tokens.css --silk-line). */
export const silkLine = (t) => mix(t.silk, 0.35, t.mask);
