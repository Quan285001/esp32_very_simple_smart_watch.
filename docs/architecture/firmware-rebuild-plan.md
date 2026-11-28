# Firmware Rebuild Plan — Frontend-First

**Working branch:** `rebuild/firmware-from-wfs`  
**Baseline commit:** `f5531ca7b3a8e740749845d959921504450a2181`  
**Target:** ESP32-C3 DevKitM-1 + GC9A01 240x240, Arduino / PlatformIO  
**Frontend policy:** frozen; no changes to `index.html` or `web/**` during firmware rebuild unless the owner explicitly approves a contract correction.

## 1. User-approved retention scope

Keep unchanged:
- `index.html` and all `web/**` frontend files.
- Existing menu UI: `src/face/face_menu.cpp`.
- Existing weather UI and weather functionality: `src/face/face_weather.cpp`, `src/services/weather_service.*`, `src/services/weather_coordinator.*`, and the time/Wi-Fi dependencies required by those services.
- Boot terminal UI: `src/boot_terminal.cpp`.

Preserve platform-critical configuration and dependencies where needed:
- `platformio.ini`, `src/config.h`, pin/driver configuration, `scripts/patch_tft_c3.py`.
- Existing TFT_eSPI dependency and one physical TFT instance.
- Button input and app state required by the retained menu.
- Existing boot/service behavior required to start retained weather and menu screens.

The user asked to remove the remaining firmware implementation and rebuild it. Removal is staged: no existing firmware file is deleted until its retained dependants have been mapped and the replacement compiles. The original baseline remains recoverable through Git history and the untouched development branch.

## 2. Frontend contract is authoritative

Canonical inputs to the new firmware:
- `shared/schemas/watch-face.schema.json`
- `shared/capabilities/esp32-c3-gc9a01-240.json`
- `shared/schemas/device-profile.schema.json`
- `docs/package/wface-v1.md`
- Actual serialization and package-building behavior in `web/app.js`
- Device compatibility mapping in `web/device-compatibility.js`

The firmware consumes declarative WFS1 packages only. No JavaScript, C++, bytecode, or executable user-supplied content is accepted as a watch-face definition.

## 3. Target firmware boundaries

1. **Platform / Display HAL** — board, GC9A01, TFT_eSPI ownership, bounded drawing API, input.
2. **Retained device UI and services** — menu, boot terminal, weather, time and Wi-Fi.
3. **WFS transport** — GATT lifecycle, protocol framing, session, chunk ACK/retry, Verify and Apply.
4. **Package and storage** — WFS1 parser, integrity checks, staging, two-slot commit and rollback.
5. **Design model** — bounded representation matching the schema and device profile.
6. **Rendering** — deterministic z-order, clipping, element renderers, dynamic invalidation and resource limits.
7. **Runtime orchestration** — startup, screen ownership, scheduling and power policy.

Each boundary must have explicit ownership; BLE callbacks must not parse full packages, perform flash writes, or draw to the display.

## 4. Initial source inventory

The current tree contains 165 tracked files, including 67 files under `src/` and 9 frontend entry/style/script files. The 67 firmware source files are inventoried in the initial Git tree at the baseline commit.

### Retain as-is initially
- `src/face/face_menu.cpp`
- `src/face/face_weather.cpp`
- `src/boot_terminal.cpp`
- `src/services/weather_service.cpp`, `weather_service.h`
- `src/services/weather_coordinator.cpp`, `weather_coordinator.h`
- The minimum time/Wi-Fi/app-state/input/display dependencies required by the above.
- Board configuration and build scripts.

### Rebuild or replace after dependency mapping
- `src/communication/**` WFS transport implementation.
- `src/watchface/**` parser/model/renderer/manager/package validation.
- `src/storage/face_storage.*` and storage policy where package transaction semantics require it.
- App/runtime glue that currently couples retained UI/services to the old Watch Face stack.
- Display abstractions only where required to provide a stable rendering backend; do not replace TFT_eSPI without measured evidence.

### Not automatically deleted
Tests, shared schemas, capability profiles, documentation, build scripts and frontend validation scripts are not disposable firmware runtime. Keep them as contract/regression assets and update them only when the new implementation is verified against them.

## 5. Contract risks found during initial inspection

- The shared schema permits up to 128 design objects, while the active ESP32-C3 profile declares a runtime limit of 16. The web compatibility preflight must reject designs exceeding the device profile before transfer; firmware must independently enforce the same limit.
- The device profile declares `wave.parametric`; Web compatibility maps `wave` to that capability. Firmware must advertise and validate the same capability.
- The profile declares 16 assets and a maximum asset size of 115,200 bytes. Package validation, transfer admission and storage checks must agree with those limits.
- Browser preview and device rendering are not assumed pixel-identical. Every unsupported property/effect must be rejected or explicitly degraded according to a documented capability rule, never silently ignored.
- A transfer reaching 100% is not success. Success requires successful package verification, durable slot commit and confirmed activation.

## 6. Required acceptance gates

- Frontend file hashes remain unchanged throughout firmware-only implementation.
- Schema/profile/package fixtures are consumed by host tests.
- Every supported element type has positive, malformed, boundary and unsupported-feature tests.
- Transfer tests cover disconnect, duplicate/out-of-order chunk, timeout, retry, Verify failure, Apply failure, power loss and rollback.
- PlatformIO `c3_clock` build succeeds.
- Host tests and CI succeed.
- Physical ESP32-C3 validation is recorded separately; CI is not hardware validation.

## 7. Immediate next steps

1. Complete the dependency graph for the retained menu/weather/boot files.
2. Extract exact Web package-builder fields and compare them with the shared schema and device profile.
3. Define the new firmware interfaces and compile a minimal skeleton while retaining the existing UI/services.
4. Replace the old WFS implementation in isolated layers, adding tests before integration.
5. Only then remove superseded firmware files from this rebuild branch.
