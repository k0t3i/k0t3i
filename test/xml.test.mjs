import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkSvg } from '../src/xml.mjs';

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">${body}</svg>\n`;

test('a well-formed SVG passes', () => {
  assert.deepEqual(checkSvg(svg('<!-- a note --><g><rect width="1" height="1"/><text>a &amp; b &#183;</text></g>')), []);
});

test('the checker catches what would break an image', () => {
  assert.notDeepEqual(checkSvg(svg('<g><rect/>')), []);
  assert.notDeepEqual(checkSvg(svg('<g></text>')), []);
  assert.notDeepEqual(checkSvg(svg('<text>a & b</text>')), []);
  assert.notDeepEqual(checkSvg(svg('<rect width=1/>')), []);
  assert.notDeepEqual(checkSvg(svg('<rect x="1" x="2"/>')), []);
  assert.notDeepEqual(checkSvg('<svg viewBox="0 0 1 1"></svg>'), []);
  assert.notDeepEqual(checkSvg(`${svg('')}<svg xmlns="http://www.w3.org/2000/svg"></svg>`), []);
  assert.notDeepEqual(checkSvg('<html xmlns="http://www.w3.org/2000/svg"></html>'), []);
});
