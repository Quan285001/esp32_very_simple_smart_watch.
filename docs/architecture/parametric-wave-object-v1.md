# Parametric Wave Object — WFS v1 extension

## Purpose

Add one declarative wave object that both renderers can consume. The browser preview and ESP32 firmware receive the same `waveConfig`; neither side receives executable source code.

## Data contract

An object uses `type: "wave"` and a required `waveConfig` object:

```json
{
  "id": "water-wave",
  "type": "wave",
  "name": "Flowing water",
  "visible": true,
  "transform": {
    "x": 18, "y": 64, "width": 204, "height": 112,
    "rotation": 0, "opacity": 1, "zIndex": 1
  },
  "waveConfig": {
    "lineCount": 8,
    "segments": 18,
    "speed": 0.8,
    "amplitude": 0.75,
    "phase": 0,
    "color": "#164E63",
    "highlightColor": "#3B82F6",
    "updateMs": 160,
    "animate": true
  }
}
```

### Bounds enforced by schema, compatibility preflight and firmware parser

| Field | Default | Allowed range |
|---|---:|---:|
| `lineCount` | 8 | integer 2–12 |
| `segments` | 18 | integer 4–24 |
| `speed` | 0.8 | 0–4 |
| `amplitude` | 0.75 | 0–2 |
| `phase` | 0 | -6.2832–6.2832 radians |
| `color` | `#164E63` | `#RRGGBB` |
| `highlightColor` | `#3B82F6` | `#RRGGBB` |
| `updateMs` | 160 | integer 100–1000 ms |
| `animate` | true | boolean |

## Rendering contract

- Both renderers use the same bounded row/segment sampling model and the same time base: seconds since local midnight plus sub-second interpolation.
- The ESP renderer uses `DisplayCanvas::drawLine`; it does not allocate a framebuffer or heap buffers for the wave.
- The renderer clamps samples to the object's rectangular bounds and rejects line segments outside the circular dial.
- Wave updates are throttled by `updateMs`; the existing 40 ms clock interpolation loop is not changed.
- If a visible image object overlaps the wave and has a higher `zIndex`, the wave freezes at its initial phase. The image remains a separate layer and transparent pixels can reveal the static wave beneath it.
- The wave object is independent of the background artwork bitmap. Elements Water's exported static artwork omits its wave lines; WFS1 carries those lines as `waveConfig`.

## Files implementing the contract

- `shared/schemas/watch-face.schema.json` — declarative schema and bounds.
- `shared/capabilities/esp32-c3-gc9a01-240.json` — advertised `wave.parametric` capability.
- `web/watch-face-catalog.js` — Elements Water preset definition, artwork separation and preview renderer.
- `web/app.js` — editor-layer preview and animation scheduling.
- `web/device-compatibility.js` — BLE upload preflight and parameter validation.
- `src/watchface/face_model.h` — fixed-size `FaceWaveConfig` model.
- `src/watchface/face_parser.cpp` — strict JSON parsing and bounds validation.
- `src/watchface/face_renderer.cpp` — native wave drawing and per-object update cadence.
- `src/communication/ble_manager.cpp` — compact `v` element capability code.

## Verification

- Parser host tests cover valid wave configuration, out-of-range line counts, fractional segment counts and misplaced `waveConfig`.
- Renderer host tests cover wave line drawing, update throttling and invalid in-memory model rejection.
- Web compatibility tests cover the advertised wave capability and reject sampling budgets outside firmware limits.
- CI PlatformIO compilation checks firmware integration. Physical GC9A01 timing, visual parity and power draw still require testing on the actual watch.