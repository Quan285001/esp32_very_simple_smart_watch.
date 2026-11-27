const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compatibility = require('../../web/device-compatibility.js');
global.window = global;
const presets = require('../../web/watch-face-catalog.js');
const originalFaceCatalog = global.WfsTemplateFaces;
const extendedFaceCatalog = global.WfsExtendedTemplateFaces;

const root = path.resolve(__dirname, '../..');
const studioHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const templateStudioSource = fs.readFileSync(path.join(root, 'web/template-studio.js'), 'utf8');
assert.match(studioHtml, /32 thiết kế mặt đồng hồ/);
assert.match(studioHtml, /Tất cả · 32/);
assert.match(templateStudioSource, /counts=\{all:all\.length/);
assert.match(templateStudioSource, /pointerdown/);
assert.match(templateStudioSource, /updateDraggedBackground/);
assert.match(templateStudioSource, /setBackgroundPosition\(bg\.offsetX,bg\.offsetY\)/);

const appSource = fs.readFileSync(path.join(root, 'web/app.js'), 'utf8');
const packageBuilder = appSource.slice(
  appSource.indexOf('async function buildWfsPackage'),
  appSource.indexOf('async function sendWfsChunkWithRetry')
);
assert.match(packageBuilder, /globalThis\.WfsDeviceCompatibility/,
  'the browser package builder must invoke the shared firmware compatibility preflight');
assert.match(packageBuilder, /typeof compatibilityModule\.errors!==\x27function\x27/,
  'package creation must fail closed when the shared compatibility module is unavailable');

const unifiedFaceIds = [
  ...originalFaceCatalog.faces.map(face => face.id),
  ...extendedFaceCatalog.faces.map(face => face.id),
  ...presets.SPECS.filter(face => face.id.startsWith('ref-')).map(face => face.id)
];
assert.equal(unifiedFaceIds.length, 32, 'the unified catalog must expose exactly 32 face designs');
assert.equal(new Set(unifiedFaceIds).size, 32, 'the unified catalog must not duplicate face IDs');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(indexSource, /web\/watch-face-catalog\.js/,
  'the app must load the unified watch-face catalog');
assert.doesNotMatch(indexSource, /(?:template-face-renderers|extended-template-face-renderers|watch-face-presets)\.js/,
  'the app must not load the retired split catalog scripts');
const studioSource = fs.readFileSync(path.join(root, 'web/template-studio.js'), 'utf8');
assert.match(studioSource, /filter\(spec=>spec\.id\.startsWith\('ref-'\)\)/,
  'the four reference presets must be included in the visible Template Studio gallery');

const fixture = JSON.parse(fs.readFileSync(
  path.join(root, 'shared/schemas/examples/minimal-watch-face-v1.json'), 'utf8'));
const profile = JSON.parse(fs.readFileSync(
  path.join(root, 'shared/capabilities/esp32-c3-gc9a01-240.json'), 'utf8'));

const capabilities = {
  upload: 1,
  obj: profile.nominalLimits.maxObjects,
  json: 16384,
  stage: 128 * 1024,
  img: 1,
  el: 't,dc,ac,d,w,s,i',
  wc: 1
};

function errorsFor(design, assetIds = []) {
  return compatibility.errors(design, capabilities, new Set(assetIds));
}

assert.deepEqual(errorsFor(fixture), [],
  'committed minimal fixture must be accepted by the device compatibility preflight');

const negotiatedProfileCaps = { ...capabilities, pid: 'test-320-rect', cw: 320, ch: 200, cs: 'rectangle' };
const negotiatedProfileDesign = structuredClone(fixture);
negotiatedProfileDesign.deviceProfileId = 'test-320-rect';
negotiatedProfileDesign.canvas.width = 320;
negotiatedProfileDesign.canvas.height = 200;
negotiatedProfileDesign.canvas.shape = 'rectangle';
assert.deepEqual(compatibility.errors(negotiatedProfileDesign, negotiatedProfileCaps, []), [],
  'shared validator must honor the display profile advertised by connected firmware');

assert.match(appSource, /id:'mono',name:'Monochrome'[^}]*weight:600/,
  'the built-in Monochrome template must use a renderer-supported font weight');

const templateStart = appSource.indexOf('const templates=');
const templateEnd = appSource.indexOf('\nfunction toast', templateStart);
assert.ok(templateStart >= 0 && templateEnd > templateStart,
  'built-in templates must remain extractable for compatibility checks');
const templateContext = {};
let templateObjectId = 0;
templateContext.uid = () => 'template-object-' + (++templateObjectId);
vm.runInNewContext(appSource.slice(templateStart, templateEnd) +
  '\nglobalThis.templates = templates; globalThis.fromTemplate = fromTemplate;', templateContext);
const supportedTemplateTypes = new Set([
  'text', 'digital-clock', 'analog-clock', 'date', 'weather', 'shape', 'image'
]);
for (const template of templateContext.templates) {
  const generatedDesign = templateContext.fromTemplate(template);
  assert.deepEqual(errorsFor(generatedDesign), [],
    template.name + ': generated built-in design must pass device compatibility preflight');
  for (const object of template.objects) {
    assert.ok(supportedTemplateTypes.has(object.type),
      template.name + ': unsupported built-in element type ' + object.type);
    if (typeof object.text === 'string') {
      assert.ok(/^[\x20-\x7E]*$/.test(object.text),
        template.name + ': built-in static text must use printable ASCII');
    }
    if (object.weight !== undefined) {
      assert.ok(object.weight === 400 || object.weight === 600,
        template.name + ': font weight must match the firmware renderer');
    }
  }
}


const referencePresets = presets.SPECS.filter(template => template.id.startsWith('ref-'));
assert.deepEqual(referencePresets.map(template => template.id).sort(), [
  'ref-classic-12', 'ref-chronometer-gmt', 'ref-minimal-arc', 'ref-split-dual-digit'
].sort(), 'the four reference-aligned templates must be registered in the shared preset catalog');
for (const template of referencePresets) {
  const assetId = 'preset_art_' + template.id;
  const generatedDesign = structuredClone(fixture);
  generatedDesign.name = template.name;
  generatedDesign.objects = presets.createObjects(template, assetId);
  assert.deepEqual(errorsFor(generatedDesign, [assetId]), [],
    template.name + ': generated WFS v1 preset must pass ESP32-C3 compatibility preflight');
  assert.ok(generatedDesign.objects.length <= profile.nominalLimits.maxObjects,
    template.name + ': generated object count must fit the device profile');
  for (const object of generatedDesign.objects) {
    assert.equal(object.transform.opacity, 1, template.name + ': object opacity must be fully opaque');
    assert.equal(object.transform.rotation, 0, template.name + ': object rotation must be zero');
    if (object.textStyle) {
      assert.equal(object.textStyle.fontFamily, 'system-ui',
        template.name + ': text must use the device-safe system font');
      assert.ok([400, 600].includes(object.textStyle.fontWeight),
        template.name + ': text weight must be supported by the firmware renderer');
      assert.ok(!Object.hasOwn(object.textStyle, 'align'),
        template.name + ': text alignment must use the schema textAlign property');
    }
  }
}
assert.match(appSource, /presetModule\.renderThumbnail\(t\)/,
  'template cards must render preset-specific thumbnail artwork');
assert.match(fs.readFileSync(path.join(root, 'web/styles.css'), 'utf8'), /\.template-thumb-image/,
  'template cards must style the preset thumbnail image');
assert.match(appSource, /async function pruneUnusedPresetAssets/,
  'switching presets must retain reference-aware cleanup of unused artwork assets');

const badCanvas = structuredClone(fixture);
badCanvas.canvas.width = 320;
assert.ok(errorsFor(badCanvas).some(error => error.includes('240 × 240')),
  'non-device canvas dimensions must be rejected');

const unsupportedType = structuredClone(fixture);
unsupportedType.objects.push({
  id: 'unsupported-background', type: 'background', name: 'Background',
  transform: { x: 0, y: 0, width: 240, height: 240 }
});
assert.ok(errorsFor(unsupportedType).some(error => error.includes('not supported')),
  'schema-valid but firmware-unsupported element types must be rejected');

const unsupportedWeather = structuredClone(fixture);
unsupportedWeather.objects.push({
  id: 'wind', type: 'weather', name: 'Wind',
  transform: { x: 0, y: 0, width: 80, height: 20 },
  dataBinding: { source: 'temperature' },
  weatherFields: ['wind-speed']
});
assert.ok(errorsFor(unsupportedWeather).some(error => error.includes('weather fields')),
  'unsupported weather fields must be rejected before packaging');

const conditionWithoutCapability = structuredClone(fixture);
conditionWithoutCapability.objects[0].type = 'weather';
conditionWithoutCapability.objects[0].dataBinding = { source: 'temperature' };
conditionWithoutCapability.objects[0].weatherFields = ['condition'];
delete conditionWithoutCapability.objects[0].clockMode;
delete conditionWithoutCapability.objects[0].timeFormat;
delete conditionWithoutCapability.objects[0].showSeconds;
delete conditionWithoutCapability.objects[0].showAmPm;
assert.ok(compatibility.errors(conditionWithoutCapability, { ...capabilities, wc: 0 }, [])
  .some(error => error.includes('weather-condition rendering')),
  'condition weather fields must be rejected when the device does not advertise them');
assert.ok(errorsFor(conditionWithoutCapability).length === 0,
  'condition weather fields must be accepted when the device advertises support');

const unsupportedWeight = structuredClone(fixture);
unsupportedWeight.objects[0].textStyle.fontWeight = 700;
assert.ok(errorsFor(unsupportedWeight).some(error => error.includes('fontWeight') || error.includes('weights only')),
  'unsupported renderer font weights must be rejected');

const missingImage = structuredClone(fixture);
missingImage.objects.push({
  id: 'logo', type: 'image', name: 'Logo', assetId: 'not-in-browser',
  transform: { x: 10, y: 10, width: 32, height: 32 }
});
assert.ok(errorsFor(missingImage).some(error => error.includes('source image asset')),
  'image references without a browser asset must be rejected');

const tooMany = structuredClone(fixture);
tooMany.objects = Array.from({ length: 17 }, (_, index) => ({
  id: 'text-' + index, type: 'text', name: 'Text ' + index,
  transform: { x: 0, y: 0, width: 10, height: 10 }, text: 'x'
}));
assert.ok(errorsFor(tooMany).some(error => error.includes('at most')),
  'object-count limit must match the firmware capability');

const uploadDisabled = compatibility.errors(fixture, { ...capabilities, upload: 0 }, []);
assert.ok(uploadDisabled.some(error => error.includes('does not currently accept')),
  'a device that does not advertise upload must be rejected');

// Regression cases: schema-valid fields placed on the wrong firmware element.
function withObjectField(field, value, base = fixture) {
  const design = structuredClone(base);
  design.objects[0][field] = value;
  return design;
}
assert.ok(errorsFor(withObjectField('shape', 'circle')).some(error => error.includes('only valid on shape')),
  'shape metadata on a digital clock must be rejected');
assert.ok(errorsFor(withObjectField('weatherFields', ['temperature'])).some(error => error.includes('only valid on weather')),
  'weatherFields on a digital clock must be rejected');
assert.ok(errorsFor(withObjectField('showSeconds', true)).some(error => error.includes('only valid on digital clocks')) === false,
  'showSeconds remains valid on digital clocks');

const legacyTextFill = structuredClone(fixture);
delete legacyTextFill.objects[0].textStyle.fill;
legacyTextFill.objects[0].style = { fill: '#ff0000' };
assert.ok(errorsFor(legacyTextFill).some(error => error.includes('use textStyle.fill')),
  'text preview color fallbacks must not silently diverge from firmware text color');
const unsupportedTextStroke = withObjectField('style', { stroke: '#ff0000', strokeWidth: 1 });
assert.ok(errorsFor(unsupportedTextStroke).some(error => error.includes('only rendered for shape elements')),
  'non-shape borders must be rejected because the firmware renderer ignores them');

const analogFace = structuredClone(fixture);
analogFace.objects[0].type = 'analog-clock';
delete analogFace.objects[0].dataBinding;
delete analogFace.objects[0].timeFormat;
delete analogFace.objects[0].showSeconds;
delete analogFace.objects[0].showAmPm;
delete analogFace.objects[0].clockMode;
assert.ok(errorsFor(withObjectField('showSeconds', true, analogFace)).some(error => error.includes('only valid on digital clocks')),
  'showSeconds on an analog clock must be rejected');
assert.ok(errorsFor(withObjectField('showAmPm', false, analogFace)).some(error => error.includes('only valid on digital clocks')),
  'showAmPm on an analog clock must be rejected');
const configuredAnalogFace = structuredClone(analogFace);
configuredAnalogFace.objects[0].handConfig = {
  hour: { length: 42, width: 6, color: '#123456', tail: 7, visible: true },
  minute: { length: 78, width: 3, color: '#abcdef', tail: 4, visible: false },
  second: { length: 90, width: 1.5, color: '#ff0000', tail: 18, visible: true },
  centerColor: '#00ff00',
  centerRadius: 4
};
assert.deepEqual(errorsFor(configuredAnalogFace), [],
  'custom analog hand appearance must be accepted for firmware upload');
const badAnalogHand = structuredClone(configuredAnalogFace);
badAnalogHand.objects[0].handConfig.hour.width = 25;
assert.ok(errorsFor(badAnalogHand).some(error => error.includes('hour hand width')),
  'out-of-range analog hand widths must be rejected before packaging');
const handConfigOnText = withObjectField('handConfig', { hour: { length: 50 } }, fixture);
assert.ok(errorsFor(handConfigOnText).some(error => error.includes('only valid on analog clocks')),
  'analog hand configuration must be rejected on non-analog objects');

assert.ok(errorsFor(withObjectField('clockMode', '', fixture)).some(error => error.includes('clock mode')),
  'an explicitly empty clockMode must be rejected');
assert.ok(errorsFor(withObjectField('showAmPm', true, fixture)).some(error => error.includes('AM/PM can only be enabled')),
  'AM/PM cannot be enabled in 24-hour mode');

const nonAsciiText = structuredClone(fixture);
nonAsciiText.objects.push({
  id: 'label', type: 'text', name: 'Unicode label',
  transform: { x: 0, y: 0, width: 80, height: 20 }, text: 'Xin chào'
});
assert.ok(errorsFor(nonAsciiText).some(error => error.includes('printable ASCII')),
  'non-ASCII text must be rejected before firmware parsing');

const nestedChildren = structuredClone(fixture);
nestedChildren.objects[0].children = [{
  id: 'child', type: 'text', name: 'Child',
  transform: { x: 0, y: 0, width: 10, height: 10 }, text: 'x'
}];
assert.ok(errorsFor(nestedChildren).some(error => error.includes('nested children')),
  'non-empty nested children must be rejected before firmware parsing');


const opacityAboveRange = structuredClone(fixture);
opacityAboveRange.objects[0].transform.opacity = 1.2;
assert.ok(errorsFor(opacityAboveRange).some(error => error.includes('opacity must be numeric')),
  'opacity above one must be rejected before the firmware parser rejects it');

const stringOpacity = structuredClone(fixture);
stringOpacity.objects[0].transform.opacity = '1';
assert.ok(errorsFor(stringOpacity).some(error => error.includes('opacity must be numeric')),
  'string opacity must not be coerced into a number');

const nearlyOpaque = structuredClone(fixture);
nearlyOpaque.objects[0].transform.opacity = 0.9995;
assert.ok(errorsFor(nearlyOpaque).some(error => error.includes('fully opaque')),
  'opacity below one must be rejected because the firmware renderer has no alpha blending');

const rendererSource = fs.readFileSync(path.join(root, 'src/watchface/face_renderer.cpp'), 'utf8');
assert.match(rendererSource, /object\.transform\.opacity < 1\.0f/,
  'firmware renderer preflight must enforce the same fully opaque contract');

const stringWeight = structuredClone(fixture);
stringWeight.objects[0].textStyle.fontWeight = '400';
assert.ok(errorsFor(stringWeight).some(error => error.includes('fontWeight must be numeric')),
  'string font weights must be rejected before firmware parsing');

const stringLetterSpacing = structuredClone(fixture);
stringLetterSpacing.objects[0].textStyle.letterSpacing = '0';
assert.ok(errorsFor(stringLetterSpacing).some(error => error.includes('letterSpacing must be numeric')),
  'string letter spacing must not be coerced into a number');

const nullGlyphOpacity = structuredClone(fixture);
nullGlyphOpacity.objects[0].textStyle.opacity = null;
assert.ok(errorsFor(nullGlyphOpacity).some(error => error.includes('advanced glyph styling')),
  'null glyph opacity must not be treated as the default value');

const fractionalCornerRadius = structuredClone(fixture);
fractionalCornerRadius.objects[0].type = 'shape';
fractionalCornerRadius.objects[0].shape = 'rounded-rect';
fractionalCornerRadius.objects[0].style = { cornerRadius: 1.5 };
assert.ok(errorsFor(fractionalCornerRadius).some(error => error.includes('cornerRadius must be an integer')),
  'fractional corner radii must be rejected before firmware truncates them');

const oversizedCornerRadius = structuredClone(fractionalCornerRadius);
oversizedCornerRadius.objects[0].style.cornerRadius = 256;
assert.ok(errorsFor(oversizedCornerRadius).some(error => error.includes('cornerRadius must be an integer')),
  'corner radii outside the firmware uint8 range must be rejected');

const misplacedCornerRadius = structuredClone(fixture);
misplacedCornerRadius.objects[0].style = { cornerRadius: 8 };
assert.ok(errorsFor(misplacedCornerRadius).some(error => error.includes('rendered only for rounded-rectangle')),
  'corner radius on a non-shape element must be rejected');

const validRoundedCornerRadius = structuredClone(fixture);
validRoundedCornerRadius.objects = [{
  id: 'rounded', type: 'shape', name: 'Rounded',
  transform: { x: 0, y: 0, width: 40, height: 40 },
  shape: 'rounded-rect', style: { fill: '#ffffff', cornerRadius: 8 }
}];
assert.deepEqual(errorsFor(validRoundedCornerRadius), [],
  'integer corner radius on a rounded rectangle must remain supported');

const stringStrokeWidth = structuredClone(fixture);
stringStrokeWidth.objects.push({
  id: 'outline', type: 'shape', name: 'Outline',
  transform: { x: 10, y: 10, width: 40, height: 40 },
  style: { fill: '#ffffff', strokeWidth: '1' }
});
assert.ok(errorsFor(stringStrokeWidth).some(error => error.includes('strokeWidth must be an integer')),
  'string shape stroke widths must be rejected before firmware parsing');


const supportedWideStroke = structuredClone(fixture);
supportedWideStroke.objects = [{
  id: 'wide-outline', type: 'shape', name: 'Wide outline',
  transform: { x: 10, y: 10, width: 40, height: 40 },
  shape: 'rounded-rect', style: { fill: '#ffffff', stroke: '#ff0000', strokeWidth: 4, cornerRadius: 8 }
}];
assert.deepEqual(errorsFor(supportedWideStroke), [],
  'integer shape outlines up to the supported width must pass preflight');
const excessiveStroke = structuredClone(supportedWideStroke);
excessiveStroke.objects[0].style.strokeWidth = 33;
assert.ok(errorsFor(excessiveStroke).some(error => error.includes('strokeWidth must be an integer')),
  'shape outlines above the firmware limit must be rejected before packaging');

console.log('WFS device compatibility preflight tests passed.');
