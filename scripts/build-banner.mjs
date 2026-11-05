#!/usr/bin/env node
/**
 * Writes the banner of the README into assets/: banner-{light,dark}.svg, and their still versions
 * banner-{light,dark}-still.svg (for reduced motion), from src/banner.mjs and assets/avatar.png.
 * Run it after a change to either: a test checks the files are in step.
 *
 *   node scripts/build-banner.mjs [--out <dir>] [--no-font]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { renderBanner } from '../src/banner.mjs';
import { THEMES } from '../src/palette.mjs';
import { checkSvg } from '../src/xml.mjs';

const { values: opt } = parseArgs({
  options: {
    out: { type: 'string', default: fileURLToPath(new URL('../assets', import.meta.url)) },
    'no-font': { type: 'boolean', default: false },
  },
});

mkdirSync(opt.out, { recursive: true });
for (const theme of Object.values(THEMES)) {
  for (const motion of [true, false]) {
    const name = `banner-${theme.name}${motion ? '' : '-still'}.svg`;
    const svg = renderBanner(theme, { embedFont: !opt['no-font'], motion });
    const problems = checkSvg(svg);
    if (problems.length) throw new Error(`${name}: ${problems.join('; ')}`);
    writeFileSync(join(opt.out, name), svg);
    console.log(`${name}  ${Buffer.byteLength(svg)} B`);
  }
}
