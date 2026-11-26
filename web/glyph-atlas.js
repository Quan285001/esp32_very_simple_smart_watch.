(function (root) {
  'use strict';

  function packGlyphBitmaps(glyphs, options) {
    const config = options || {};
    const maxWidth = Number.isInteger(config.maxWidth) ? config.maxWidth : 128;
    const maxHeight = Number.isInteger(config.maxHeight) ? config.maxHeight : 128;
    const padding = Number.isInteger(config.padding) ? config.padding : 1;
    if (maxWidth < 1 || maxHeight < 1 || maxWidth > 512 || maxHeight > 512) {
      throw new Error('Glyph atlas bounds must be between 1 and 512 pixels');
    }
    if (padding < 0 || padding > 4) throw new Error('Glyph atlas padding must be between 0 and 4 pixels');
    if (!Array.isArray(glyphs)) throw new Error('Glyphs must be an array');

    const seen = new Set();
    const ordered = glyphs.map((glyph) => {
      if (!glyph || !Number.isInteger(glyph.codePoint) ||
          glyph.codePoint < 0 || glyph.codePoint > 0x10ffff) {
        throw new Error('Every glyph needs a valid Unicode code point');
      }
      if (seen.has(glyph.codePoint)) throw new Error('Duplicate glyph code point: ' + glyph.codePoint);
      seen.add(glyph.codePoint);
      const width = glyph.width;
      const height = glyph.height;
      if (!Number.isInteger(width) || !Number.isInteger(height) ||
          width < 0 || height < 0 || width > maxWidth || height > maxHeight) {
        throw new Error('Glyph dimensions are outside the atlas bounds');
      }
      const pixels = glyph.pixels == null ? new Uint8Array(0) : glyph.pixels;
      if (width * height !== pixels.length) {
        throw new Error('Glyph bitmap length does not match its dimensions');
      }
      const advance = Number(glyph.advance);
      const offsetX = Number(glyph.offsetX || 0);
      const offsetY = Number(glyph.offsetY || 0);
      if (![advance, offsetX, offsetY].every(Number.isFinite) || advance < 0) {
        throw new Error('Glyph advance and offsets must be finite; advance cannot be negative');
      }
      return { codePoint: glyph.codePoint, width, height, pixels,
        advance, offsetX, offsetY };
    }).sort((a, b) => a.codePoint - b.codePoint);

    let x = 0, y = 0, shelfHeight = 0, usedWidth = 0, usedHeight = 0;
    for (const glyph of ordered) {
      if (glyph.width === 0 || glyph.height === 0) {
        glyph.atlasX = 0;
        glyph.atlasY = 0;
        continue;
      }
      if (x + glyph.width > maxWidth) {
        x = 0;
        y += shelfHeight + padding;
        shelfHeight = 0;
      }
      if (y + glyph.height > maxHeight) throw new Error('Glyph atlas exceeds its configured height');
      glyph.atlasX = x;
      glyph.atlasY = y;
      x += glyph.width + padding;
      shelfHeight = Math.max(shelfHeight, glyph.height);
      usedWidth = Math.max(usedWidth, glyph.atlasX + glyph.width);
      usedHeight = Math.max(usedHeight, glyph.atlasY + glyph.height);
    }

    const atlasWidth = Math.max(1, usedWidth);
    const atlasHeight = Math.max(1, usedHeight);
    const pixels = new Uint8Array(atlasWidth * atlasHeight);
    for (const glyph of ordered) {
      if (!glyph.width || !glyph.height) continue;
      for (let row = 0; row < glyph.height; row++) {
        const sourceStart = row * glyph.width;
        const targetStart = (glyph.atlasY + row) * atlasWidth + glyph.atlasX;
        pixels.set(glyph.pixels.subarray
          ? glyph.pixels.subarray(sourceStart, sourceStart + glyph.width)
          : Array.prototype.slice.call(glyph.pixels, sourceStart, sourceStart + glyph.width),
          targetStart);
      }
    }

    return {
      format: 'wfs-glyph-atlas-alpha8-v1',
      width: atlasWidth,
      height: atlasHeight,
      pixels,
      glyphs: ordered.map((glyph) => ({
        codePoint: glyph.codePoint,
        x: glyph.atlasX,
        y: glyph.atlasY,
        width: glyph.width,
        height: glyph.height,
        advance: glyph.advance,
        offsetX: glyph.offsetX,
        offsetY: glyph.offsetY
      }))
    };
  }

  const api = Object.freeze({ packGlyphBitmaps });
  root.WfsGlyphAtlas = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
