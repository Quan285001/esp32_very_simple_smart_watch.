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
assert(source.includes('const hasBackgroundImage = !!('), 'Elements Water must detect an active personal background image');
const waterRendererStart = source.indexOf('_drawFlowingGuilloche(timeSec)');
const waterRendererEnd = source.indexOf('_drawBezelAndIndices()', waterRendererStart);
const waterRenderer = source.slice(waterRendererStart, waterRendererEnd);
assert(waterRenderer.includes('const t = hasBackgroundImage ? 0 : timeSec * this.data.waveSpeed'),
  'Elements Water waves must freeze whenever a personal image is active');
assert(waterRenderer.indexOf('ctx.stroke();') < waterRenderer.indexOf('ctx.drawImage(\n          image,'),
  'Elements Water wave strokes must be composited before the personal image');
assert(waterRenderer.indexOf('ctx.drawImage(\n          image,') < waterRenderer.indexOf('this.data.backgroundDim'),
  'personal image dimming must remain applied after the image layer');

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
assert.strictEqual((presetBlock[1].match(/\bid:'[^']+'/g) || []).length, 32,
  '8 original, 20 extended and 4 reference WFS1 presets must remain present');

console.log('Watch-face catalog and Template Studio regression checks passed.');

const studioSource = fs.readFileSync(path.join(__dirname, '../../web/template-studio.js'), 'utf8');
const studioHtml = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
assert(studioHtml.includes('id="studioImagePanel" hidden'), 'personal image panel starts hidden');
assert(!studioHtml.includes('studioApplyImage'), 'there is no separate apply-image button');
assert(studioSource.includes('bg.image=image'), 'selecting an image immediately applies it to the face');
assert(studioSource.includes('panel.hidden=!bg.image'), 'personal image panel appears as soon as an image is selected and hides when removed');
assert(studioSource.includes('rect.bottom>=0&&rect.top<=window.innerHeight'), 'gallery rendering skips off-screen cards');
assert(studioSource.includes('document.visibilityState'), 'render loop pauses while the document is hidden');
assert(!studioSource.includes('requestAnimationFrame(frameLoop)'), 'unconditional animation-frame loop is retired');


const baseCss = fs.readFileSync(path.join(__dirname, '../../web/styles.css'), 'utf8');
const studioCss = fs.readFileSync(path.join(__dirname, '../../web/template-studio.css'), 'utf8');
const appSource = fs.readFileSync(path.join(__dirname, '../../web/app.js'), 'utf8');
assert(!baseCss.includes('@import url('), 'optional preview fonts must not be eagerly imported by the base stylesheet');
assert(!studioCss.includes('#studioApplyImage'), 'removed apply-image control must not leave stale CSS selectors');
assert.strictEqual(studioHtml.split('href="https://fonts.googleapis.com/css2?').length - 1, 1,
  'Google Fonts stylesheet must be declared once in the document');
assert.strictEqual(studioHtml.split('rel="preconnect" href="https://fonts.googleapis.com"').length - 1, 1,
  'Google Fonts preconnect must be declared once in the document');
for (const family of ['DM+Sans', 'Space+Grotesk', 'Inter', 'JetBrains+Mono', 'Orbitron', 'Oswald']) {
  assert(studioHtml.includes(family), family + ' must remain available for the application shell and templates');
}
assert(appSource.includes('const GOOGLE_PREVIEW_FONTS=new Set(') &&
  appSource.includes('function loadPreviewFont('),
  'optional editor fonts must remain available through on-demand loading');
for (const [name, css] of [['base', baseCss], ['Template Studio', studioCss]]) {
  assert.strictEqual((css.match(/{/g) || []).length, (css.match(/}/g) || []).length,
    name + ' stylesheet must have balanced rule braces');
}

assert(appSource.includes('const TFT_FONT1_GLYPHS='), 'browser GLCD font table must remain available for firmware parity validation');
assert(!appSource.includes('function showTransferInfo('), 'unused transfer wrapper must not remain');
assert(appSource.includes("const studio=$('#templateTransferStatus');if(studio)studio.textContent=message"),
  'WFS status updates must remain visible in Template Studio');
assert(appSource.includes("legacyStatus('Connect to a WFS v1 watch first');toast('Connect to a WFS v1 watch first');return"),
  'WFS1 disconnected preflight must be visible in the persistent status area');
assert(appSource.includes("legacyStatus('This firmware does not currently accept face packages');toast('This firmware does not currently accept face packages');return"),
  'firmware upload capability rejection must be visible in the persistent status area');
assert(studioHtml.includes('id="templateTransferStatus"') && studioHtml.includes('aria-live="polite"'), 'Template Studio must provide a persistent WFS transfer status region');
assert(studioHtml.includes('web/app.js?v=live-analog-hands-1'), 'app.js changes must use a refreshed cache key');
assert(studioHtml.includes('web/watch-face-catalog.js?v=all-32-wfs1-adapters-4'), 'Elements Water renderer changes must use a refreshed cache key');
