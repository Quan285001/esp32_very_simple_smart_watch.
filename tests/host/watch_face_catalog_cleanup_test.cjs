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

const extendedBlock = source.match(/const WATCH_FACES = \[([\s\S]*?)\n  \];/);
assert(extendedBlock, 'extended face list must remain present');
assert.strictEqual((extendedBlock[1].match(/\bid:\s*'[^']+'/g) || []).length, 20,
  'all 20 extended templates must remain present');

const presetBlock = source.match(/const SPECS=\[([\s\S]*?)\];/);
assert(presetBlock, 'WFS1 preset list must remain present');
assert.strictEqual((presetBlock[1].match(/\bid:'[^']+'/g) || []).length, 12,
  'all 8 original and 4 reference WFS1 presets must remain present');

console.log('Watch-face catalog cleanup checks passed.');
