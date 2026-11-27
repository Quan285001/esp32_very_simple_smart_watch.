const fs = require('fs');
const path = require('path');
const assert = require('assert');

const source = fs.readFileSync(path.join(__dirname, '../../web/watch-face-catalog.js'), 'utf8');

for (const name of [
  'buildWatchGrid', 'setCategoryFilter', 'applyCategoryVisibility',
  'applyBgColor', 'toggleSunburst', 'toggleVignette', 'handleImageUpload',
  'updateDimValue', 'clearUploadedImage', 'resetAllBackgrounds', 'animateLoop'
]) {
  assert(!new RegExp('function\\s+' + name + '\\s*\\(').test(source),
    name + ' must not remain as an unused legacy catalog helper');
}

assert(source.includes('window.WfsTemplateFaces'));
assert(source.includes('window.WfsExtendedTemplateFaces'));
assert(source.includes('root.WfsWatchFacePresets'));
assert(source.includes('function getFormattedTimeAndDate('));
assert.strictEqual((source.match(/function drawSwordHand\s*\(/g) || []).length, 2,
  'the two renderer-specific sword-hand implementations must remain distinct');

const faceBlocks = [...source.matchAll(/const WATCH_FACES = \[([\s\S]*?)\n  \];/g)];
assert.strictEqual(faceBlocks.length, 2, 'original and extended face lists must remain present');
const faceCounts = faceBlocks.map((match) => (match[1].match(/\bid:\s*'[^']+'/g) || []).length);
assert.deepStrictEqual(faceCounts, [8, 20],
  'all 8 original and 20 extended preview templates must remain present');

const presetBlock = source.match(/const SPECS=\[([\s\S]*?)\];/);
assert(presetBlock, 'WFS1 preset list must remain present');
assert.strictEqual((presetBlock[1].match(/\bid:'[^']+'/g) || []).length, 12,
  'all 8 original and 4 reference WFS1 presets must remain present');

console.log('Watch-face catalog cleanup checks passed.');
