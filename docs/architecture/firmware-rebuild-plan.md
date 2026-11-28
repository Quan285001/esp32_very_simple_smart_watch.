# Firmware Rebuild Plan — Frontend-First

**Working branch:** `rebuild/firmware-from-wfs`  
**Baseline:** `f5531ca7b3a8e740749845d959921504450a2181`  
**Target:** ESP32-C3 DevKitM-1 + GC9A01 240×240, Arduino / PlatformIO  
**Frontend policy:** frozen; no changes to `index.html` or `web/**` unless the owner explicitly approves a contract correction.

## 1. Revised implementation decision

The source audit shows that this baseline already contains a substantial, integrated WFS v1 implementation: bounded `FaceModel`, JSON parser, renderer, WFS1 package validator, RGB565 image path, two-slot storage, BLE session/transfer state machine, and host regression tests. Therefore, a destructive clean-slate rewrite would duplicate working code and create unnecessary regression risk.

The correct frontend-first rebuild strategy is to **reuse and verify the existing implementation, then change only proven contract defects**. Do not delete the current WFS engine or retained UI merely to make the branch look like a rewrite. This decision supersedes the initial assumption that all of `src/communication/**` and `src/watchface/**` must be replaced.

## 2. User-approved retention scope

Keep unchanged:
- `index.html` and all `web/**` frontend files.
- Existing menu UI: `src/face/face_menu.cpp`.
- Existing weather UI/services: `src/face/face_weather.cpp`, `src/services/weather_service.*`, `src/services/weather_coordinator.*`, plus required time/Wi-Fi dependencies.
- Boot terminal UI: `src/boot_terminal.cpp`.
- GC9A01/TFT_eSPI physical display configuration and one TFT instance.

Preserve required application state, button input, boot lifecycle, diagnostics and power management. Bluetooth must remain off/uninitialized after the boot terminal completes and start only when explicitly enabled from the menu. Do not change the menu redraw cadence.

## 3. Canonical firmware input contract

The firmware accepts only declarative WFS1 packages. JavaScript, C++, bytecode and other executable user content are never accepted.

Canonical sources:
- `shared/schemas/watch-face.schema.json`
- `shared/capabilities/esp32-c3-gc9a01-240.json`
- `docs/package/wface-v1.md`
- `web/app.js` package builder
- `web/device-compatibility.js` device preflight
- Firmware parser, validator and capability response.

The device runtime supports at most 16 objects and 16 assets, with 240×240 RGB565 bitmap bounds and a 115,200-byte maximum full-frame asset. The schema's 128-object ceiling is an editor/schema ceiling, not the device runtime limit.

## 4. Implementation already present at the baseline

- `src/watchface/face_model.*`: fixed-capacity design and asset model.
- `src/watchface/face_parser.*`: bounded JSON parsing and element/property rejection.
- `src/watchface/face_renderer.*`: z-order rendering, dynamic invalidation and element renderers including parametric Wave.
- `src/watchface/package_validator.*`: WFS1 header, CRC32, SHA-256, manifest/layout/assets and capability validation.
- `src/communication/protocol.*`: framed protocol and CRC16.
- `src/communication/ble_manager.*`, `transfer_manager.*`: BLE queueing, sessions, stop-and-wait chunks, Verify and Apply.
- `src/storage/face_storage.*`: inactive-slot staging and NVS active-slot commit/rollback.
- Host parser, renderer, protocol, transfer, display-canvas and Web contract tests.

The implementation review and test record are in `docs/architecture/firmware-rebuild-execution-review.md`.

## 5. Transfer success definition

A 100% byte counter means only that all package bytes have been acknowledged. Installation is successful only after:
1. TRANSFER_BEGIN reservation succeeds;
2. all DATA chunks are acknowledged with the expected cumulative byte count;
3. TRANSFER_END / Verify returns `ok: true`;
4. explicit APPLY returns `ok: true` (or a lost Apply ACK is reconciled by confirmed active-face status).

The Web error message and device serial log must be used to distinguish Verify from Apply failures. Do not infer a cause from the progress reaching 100%.

## 6. Acceptance gates

- Frontend files remain unchanged.
- Shared schema, device profile, Web preflight and firmware parser/renderer contract checks pass.
- Parser tests cover every supported element, including Wave and malformed Wave configuration.
- Renderer tests cover Wave cadence, clipping, overlap restoration and dynamic invalidation.
- Host protocol/transfer tests pass.
- PlatformIO `c3_clock` build passes.
- GitHub Actions runs on this rebuild branch and passes.
- Physical ESP32-C3 validation is recorded separately; CI is not hardware validation.

## 7. Remaining execution sequence

1. Complete the exact source-to-wire contract audit and resolve only demonstrated mismatches.
2. Run the full existing host and PlatformIO acceptance suite on this branch.
3. Fix any reproducible failures and add focused regression tests.
4. Produce a firmware artifact from the green workflow.
5. Keep the branch isolated and open a reviewable PR; do not merge to `main` without explicit instruction.
6. Perform physical upload, verify/apply, reboot recovery, weather/menu/boot and power regression with the hardware owner.

## 8. Explicit non-goals

- No Web frontend redesign or package format change.
- No switch from TFT_eSPI without measured evidence.
- No arbitrary executable face scripts or generated per-face C++.
- No removal of menu, weather or boot terminal.
- No claim of physical BLE, display, SPIFFS or power validation from host tests alone.
