# Firmware Rebuild Execution Review

**Branch:** `rebuild/firmware-from-wfs`  
**Reviewed baseline:** `f5531ca7b3a8e740749845d959921504450a2181`  
**Review type:** repository/source audit; not physical hardware validation.

## Executive decision

The branch baseline is not an empty/legacy firmware requiring a complete new WFS engine. It already contains the complete main WFS v1 vertical slice: fixed-capacity model, parser, renderer, package validator, RGB565 asset path, BLE transfer manager and transactional storage. The implementation-status document records that the stack passed host tests and PlatformIO CI at its prior verified code baseline.

A clean-slate replacement would be an unnecessary rewrite. Continue by verifying this exact branch, fixing only reproducible defects and keeping the existing known-good modules unless tests demonstrate a reason to replace them.

## Frontend-to-firmware contract

| Layer | Canonical representation | Device rule |
|---|---|---|
| Design root | schema v1 JSON | `designId`, `deviceProfileId`, 240×240 circular canvas |
| Device object array | schema `objects[]` | max 16 objects; deterministic z-order |
| Supported element types | text, digital-clock, analog-clock, date, weather, shape, image, wave | Other schema vocabulary is not automatically device-supported |
| Wave | `type: wave`, bounded `waveConfig` | 2–12 lines, 4–24 segments, 100–1000 ms update interval; finite bounded speed/amplitude/phase; no script |
| Image | `assetId` resolved to manifest asset | RGB565 little-endian, max 240×240, exact 2 bytes/pixel |
| Package | WFS1 `.wface` | 64-byte LE header; manifest + layout + ordered asset bytes; CRC32 header and SHA-256 payload/layout/assets |
| Storage | inactive SPIFFS slot | preserve active slot during receive; Verify before commit; Apply is separate |
| BLE transfer | WFS v1 Control/Data characteristics | stop-and-wait chunks; 216-byte maximum data chunk; Verify and Apply acknowledgements |

### Capability alignment

The current firmware capability response advertises the compact element codes `t,dc,ac,d,w,s,i,v`, including `v` for Wave. The Web compatibility module maps `v` to `wave`; the package builder declares `wave.parametric`; the package validator recognizes and requires that capability for Wave objects.

The static device profile declares `wave.parametric`. This alignment must remain covered by `scripts/validate_wfs_web_firmware_contract.py`.

### Deliberately unsupported schema features

The schema contains a broader vocabulary than the current device renderer. Elements such as background, moon, sunrise-sunset, gauge, progress-ring and group must not be treated as supported just because the JSON schema allows them. Device compatibility preflight must reject them before transfer. Likewise, rotation, transparency, arbitrary fonts, alpha compositing and compressed image decoding remain unsupported unless a separately tested implementation is added.

## Source-level implementation inventory

| Responsibility | Existing implementation | Decision |
|---|---|---|
| Face model | `src/watchface/face_model.*` | Reuse |
| JSON parsing | `src/watchface/face_parser.*` | Reuse; retain strict rejection and parser tests |
| Rendering | `src/watchface/face_renderer.*` | Reuse; Wave and overlap regression tests already exist |
| WFS1 integrity | `src/watchface/package_validator.*` | Reuse; verify against generated packages |
| BLE protocol/session | `src/communication/protocol.*`, `ble_manager.*` | Reuse; preserve legacy service compatibility |
| Transfer lifecycle | `src/communication/transfer_manager.*` | Reuse; Verify and Apply are distinct |
| Atomic storage | `src/storage/face_storage.*` | Reuse; physical power-loss tests remain pending |
| Retained UI | `src/face/face_menu.cpp`, `face_weather.cpp`, `boot_terminal.cpp` | Keep |
| Weather/time/Wi-Fi | `src/services/**` | Keep and preserve service ownership |
| Runtime glue | `src/app/**`, `src/main.cpp` | Refactor only if a verified integration defect requires it |
| Display HAL | `src/display/**`, TFT_eSPI | Keep physical driver; one display owner |

## Wave transfer diagnosis boundary

The source contains positive parser and renderer tests for parametric Wave, including invalid ranges, cadence throttling and redraw-overlap regressions. The BLE capability response includes Wave. This proves those software paths exist; it does **not** prove that the exact Water design currently selected in the Web editor serializes to a package accepted by the firmware.

When upload reaches 100%, the next operation is Verify (message `0x24` → `0x25`), followed by Apply (`0x26` → `0x27`). Therefore, 100% is not evidence of a DATA-channel failure. The current Web uploader reports a Verify error as `Package verification failed: ...` and an Apply error separately. Capture the complete exact error and serial output before changing parser, validator or storage code.

The highest-value additional regression is a real Web-generated Wave WFS1 package passed through the same package validator, rather than changing Wave rendering based on a generic symptom. The current repository already has parser/renderer Wave coverage and a Web↔firmware static contract check, but the physical end-to-end transfer remains a board test.

## Verification record and outstanding gates

Existing workflow `.github/workflows/platformio-build.yml` runs schema validation, Web contract checks, device compatibility checks, display-canvas tests, Web syntax/assets, host protocol/transfer tests, PlatformIO build, font parity validation, parser tests and renderer tests.

This rebuild branch must be included in the workflow's push trigger so its current tree is tested independently. A successful run will establish software/CI status only.

Still requires physical ESP32-C3:
- cold boot and boot-terminal handoff;
- Bluetooth remains off until explicitly enabled;
- menu navigation and weather/NTP/Wi-Fi;
- WFS connection, Wave and non-Wave upload, Verify, Apply and reboot persistence;
- disconnect/cancel/retry and invalid package behavior;
- SPIFFS capacity, interrupted transfer and power-loss recovery;
- rendering quality, heap fragmentation and sleep/wake.

## Safety decision

Do not delete the existing communication/watchface/storage trees in this branch. Do not touch frontend files. Do not change the menu redraw interval. Do not claim hardware testing. A focused fix backed by the actual Verify/Apply error is safer and more likely to resolve the current report than replacing a tested subsystem wholesale.
