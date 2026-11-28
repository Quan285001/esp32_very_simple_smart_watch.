# Retained Firmware Dependency Map

**Branch:** `rebuild/firmware-from-wfs`  
**Baseline:** `f5531ca7b3a8e740749845d959921504450a2181`

This document records direct source-level dependencies discovered while preparing the frontend-first rebuild. It is not a claim that these modules have already been rebuilt or hardware-tested.

## Retained UI files and required dependencies

### Boot terminal
- `src/boot_terminal.cpp`
- Requires the single global `TFT_eSPI tft` instance and Arduino/ESP diagnostics.
- Public entry points: `showBootTerminal()`, `bootTerminalLog(...)`, `stopBootTerminalDisplay()`.
- Keep this file unchanged. Its caller/lifecycle can be replaced only if all three entry points remain compatible.

### Menu UI
- `src/face/face_menu.cpp`
- Direct dependencies: `TFT_eSPI`, `src/app/app_state.h`, global `tft`, `isBLEConnected()`, `isBLEEnabled()`.
- Public entry points include `drawMenuScreen(...)` and `resetMenuScreen()`.
- `app_state.h` and the state enums/constants in `config.h` are therefore retained initially.
- Menu actions are currently orchestrated by `src/app/app_controller.cpp`; the menu renderer itself must not be coupled to the new WFS parser or BLE transfer implementation.

### Weather UI
- `src/face/face_weather.cpp`
- Direct dependencies: `TFT_eSPI`, `icons.h`, `config.h`, global `tft`, `getWeatherRefreshCountdownSeconds()`, and the `WeatherData` definition.
- Public entry points: `drawWeatherFaceData(...)`, `advanceWeatherForecast(...)`, `toggleWeatherDetails(...)`, `scrollWeatherDetails(...)`, `updateWeatherFaceAnimation(...)`.
- Retain the weather data model and service implementation; isolate the UI from WFS renderer state.

### Weather services
- `src/services/weather_service.*`: network/API retrieval, cached weather snapshot, location coordinates and weather data.
- `src/services/weather_coordinator.*`: single-flight scheduling, refresh policy, cooldown and runtime notifications.
- `src/services/time_service.*`: time persistence, timezone and local-time access required by weather and clock bindings.
- `src/services/wifi_service.*`: Wi-Fi state, saved credentials, scan and connection monitoring.
- Keep these services initially; only change their public interfaces if the replacement runtime requires a narrow adapter and tests cover it.

## Transitional glue that cannot simply be deleted

### Application state and input
- `src/app/app_state.*`, `src/config.h`, `src/input/button_manager.*` support menu navigation, current screen and weather validity.
- Retain their minimal state/input contract. Avoid carrying old Watch Face-specific fields into the new design engine unless still required by retained screens.

### Current application controller/runtime
- `src/app/app_controller.*` currently owns screen navigation and dispatches drawing to menu, weather and legacy analog-clock functions. It also references the old `FaceManager`.
- `src/app/app_runtime.*` currently schedules BLE command handling, boot completion, weather/UI refresh, sleep, display and old Watch Face functions.
- These are not protected as-is. Replace or refactor them after the new runtime interface is defined, preserving menu/weather/boot behavior and the required Bluetooth-off-after-boot policy.
- `src/main.cpp` is currently a large compatibility facade with direct dependencies on old coordinators and managers. Rebuild it as a thin composition root after the new modules compile.

## Firmware areas scheduled for replacement

- `src/communication/**`: replace protocol/session/transfer coupling with a transport-independent session state machine plus a BLE adapter.
- `src/watchface/**`: replace old model/parser/renderer/validator with implementations driven directly by the canonical shared schema, profile and WFS1 package specification.
- `src/storage/face_storage.*`: retain two-slot transactional semantics only if revalidated; redesign staging/verify/commit/rollback boundaries.
- `src/display/**`: retain physical TFT_eSPI ownership and GC9A01 configuration. Replace abstractions only when the new renderer contract requires it.
- `src/system/**`: inspect each system/power/diagnostic responsibility; retain only platform lifecycle functions needed by the rebuilt runtime.

## Dependency boundary rules

1. Retained UI files may depend on stable platform/UI interfaces, never on WFS parser internals.
2. Weather service data is supplied to renderers through snapshots; renderers do not perform HTTP or Wi-Fi work.
3. BLE callbacks only enqueue bounded packets. They do not parse JSON packages, access SPIFFS, or draw.
4. Package validation completes before the active slot changes.
5. Apply is reported successful only after durable activation and runtime confirmation.
6. Keep one TFT instance and serialize all physical display access.
