'use strict';
const assert = require('node:assert/strict');
const { packGlyphBitmaps } = require('../../web/glyph-atlas.js');

function glyph(codePoint, width, height, pixels, advance) {
  return { codePoint, width, height, pixels: Uint8Array.from(pixels), advance, offsetX: 0, offsetY: -height };
}

const atlas = packGlyphBitmaps([
  glyph(58, 1, 2, [10, 20], 2),
  glyph(48, 2, 2, [1, 2, 3, 4], 3),
  glyph(32, 0, 0, [], 2)
], { maxWidth: 4, maxHeight: 8, padding: 1 });

assert.equal(atlas.format, 'wfs-glyph-atlas-alpha8-v1');
assert.equal(atlas.width, 4);
assert.equal(atlas.height, 2);
assert.deepEqual(atlas.glyphs.map(item => item.codePoint), [32, 48, 58]);
assert.deepEqual(atlas.glyphs[1], {
  codePoint: 48, x: 0, y: 0, width: 2, height: 2,
  advance: 3, offsetX: 0, offsetY: -2
});
assert.deepEqual(atlas.glyphs[2], {
  codePoint: 58, x: 3, y: 0, width: 1, height: 2,
  advance: 2, offsetX: 0, offsetY: -2
});
assert.deepEqual(Array.from(atlas.pixels), [1, 2, 0, 10, 3, 4, 0, 20]);

assert.throws(() => packGlyphBitmaps([glyph(65, 1, 1, [1], 1), glyph(65, 1, 1, [2], 1)]), /Duplicate/);
assert.throws(() => packGlyphBitmaps([glyph(65, 2, 2, [1], 1)]), /bitmap length/);
assert.throws(() => packGlyphBitmaps([glyph(65, 3, 3, Array(9).fill(1), 3)], {
  maxWidth: 3, maxHeight: 2
}), /height/);
assert.throws(() => packGlyphBitmaps([glyph(0x110000, 1, 1, [1], 1)]), /code point/);
assert.throws(() => packGlyphBitmaps([glyph(65, 1, 1, [1], -1)]), /advance/);

const empty = packGlyphBitmaps([glyph(32, 0, 0, [], 4)]);
assert.equal(empty.width, 1);
assert.equal(empty.height, 1);
assert.equal(empty.glyphs[0].advance, 4);

console.log('WFS alpha8 glyph atlas packing tests passed.');
