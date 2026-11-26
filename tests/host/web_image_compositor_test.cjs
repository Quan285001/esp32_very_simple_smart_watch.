const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('web/app.js', 'utf8');
const start = source.indexOf('async function compositeBottomImageLayers(');
const end = source.indexOf('\nfunction advancedFeatureErrors(', start);
if (start < 0 || end < 0) throw new Error('Bottom image compositor helper is missing or malformed');
const helper = source.slice(start, end);

const drawOrder = [];
let canvasSize = null;
let circleClip = null;
class FakeImage {
  constructor() { this.naturalWidth = 10; this.naturalHeight = 10; this.src = ''; }
  async decode() {}
}
const fakeDocument = {
  createElement(tag) {
    if (tag !== 'canvas') throw new Error('Unexpected element: ' + tag);
    const canvas = { width: 0, height: 0 };
    canvas.getContext = () => ({
      fillStyle: '',
      globalCompositeOperation: 'source-over',
      fillRect() {},
      save() {},
      beginPath() {},
      arc(...args) { circleClip = args; },
      clip() {},
      restore() {},
      drawImage(image, ...args) { drawOrder.push({ src: image.src, args }); },
      getImageData(x, y, width, height) {
        const data = new Uint8ClampedArray(width * height * 4);
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 10; data[i + 1] = 20; data[i + 2] = 30; data[i + 3] = 255;
        }
        return { data };
      },
    });
    Object.defineProperty(canvas, 'width', { get() { return this._width || 0; }, set(v) { this._width = v; } });
    Object.defineProperty(canvas, 'height', { get() { return this._height || 0; }, set(v) { this._height = v; } });
    const originalGetContext = canvas.getContext;
    canvas.getContext = (...args) => { canvasSize = [canvas.width, canvas.height]; return originalGetContext(...args); };
    return canvas;
  },
};
const sandbox = {
  state: {
    images: [
      { id: 'source-a', data: 'data:image/a', name: 'a.png' },
      { id: 'source-b', data: 'data:image/b', name: 'b.png' },
    ],
  },
  Image: FakeImage,
  document: fakeDocument,
  writeRgb888AsRgb565LE(r, g, b, output, offset) {
    output[offset] = 0x34; output[offset + 1] = 0x12;
  },
};
vm.runInNewContext(helper + '\nglobalThis.compose = compositeBottomImageLayers;', sandbox);

const imageA = {
  id: 'image-a', type: 'image', assetId: 'source-a', visible: true,
  transform: { x: 10, y: 20, width: 40, height: 40, zIndex: 0 },
};
const imageB = {
  id: 'image-b', type: 'image', assetId: 'source-b', visible: true,
  transform: { x: 30, y: 30, width: 20, height: 20, zIndex: 1 },
};
const analog = {
  id: 'clock', type: 'analog-clock', visible: true,
  transform: { x: 24, y: 24, width: 192, height: 192, zIndex: 2 },
};
const design = {
  canvas: { backgroundColor: '#112233' },
  objects: [imageA, imageB, analog],
};
(async () => {
  const result = await sandbox.compose(design);
  if (!result) throw new Error('Two consecutive bottom image layers should be composited');
  if (JSON.stringify(result.objectIds) !== JSON.stringify(['image-a', 'image-b'])) {
    throw new Error('Compositor changed stable z-order: ' + JSON.stringify(result.objectIds));
  }
  if (result.objectId !== 'image-a') throw new Error('Compositor must retain the bottom image object identity');
  if (result.converted.x !== 10 || result.converted.y !== 20 ||
      result.converted.width !== 40 || result.converted.height !== 40) {
    throw new Error('Unexpected union crop: ' + JSON.stringify({
      x: result.converted.x, y: result.converted.y,
      width: result.converted.width, height: result.converted.height,
    }));
  }
  if (result.converted.bytes.length !== 40 * 40 * 2) {
    throw new Error('RGB565 byte length does not match composited dimensions');
  }
  if (drawOrder.map(x => x.src).join(',') !== 'data:image/a,data:image/b') {
    throw new Error('Image layers were not drawn in ascending z-order');
  }
  if (!circleClip || circleClip[0] !== 110 || circleClip[1] !== 100 || circleClip[2] !== 120) {
    throw new Error('Compositor did not clip to the circular display aperture');
  }
  if (canvasSize[0] !== 40 || canvasSize[1] !== 40) {
    throw new Error('Compositor allocated an unexpected raster size');
  }
  if (await sandbox.compose({
    canvas: design.canvas,
    objects: [
      { id: 'shape', type: 'shape', visible: true, transform: { zIndex: 0 } },
      imageA, imageB, analog,
    ],
  }) !== null) {
    throw new Error('Compositor must not cross a non-image layer');
  }
  if (await sandbox.compose({ canvas: design.canvas, objects: [imageA, analog] }) !== null) {
    throw new Error('A single image must continue through the existing image pipeline');
  }
  console.log('WFS bottom-image compositing order, crop, RGB565 size and safety-boundary tests passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
