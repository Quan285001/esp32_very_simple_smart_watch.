#include <Arduino.h>
#include <WiFi.h>
#include <time.h>
#include <TFT_eSPI.h>

#include "app_runtime.h"
#include "app_state.h"
#include "app_controller.h"
#include "boot_coordinator.h"
#include "../config.h"
#include "../input/button_manager.h"
#include "../services/time_service.h"
#include "../services/weather_service.h"
#include "../services/weather_coordinator.h"
#include "../services/wifi_service.h"
#include "../services/ble_service.h"
#include "../system/diagnostics.h"
#include "../system/system_manager.h"
#include "../display/display_manager.h"
#include "../display/display_canvas.h"
#include "../watchface/face_manager.h"
#include "../watchface/elements/image.h"
#include "../communication/transfer_manager.h"

extern void handleBLECommands();
extern void stopBootTerminalDisplay();
extern void bootTerminalLog(const char* msg, uint16_t color);

extern void invalidateAnalogClockFace();

extern void drawAnalogClockFace(
    struct tm timeinfo,
    int millisValue,
    int heartRate,
    int steps
);

extern void drawMenuScreen(
    int selectedIndex,
    MenuLevel level,
    bool wifiStatus,
    bool wifiConnected
);

extern void drawWeatherFaceData(const WeatherData& weather);
extern void updateWeatherFaceAnimation(const WeatherData& weather);

namespace {
uint32_t lastClockDrawMs = 0;
uint32_t lastMenuFrameMs = 0;
uint32_t lastWeatherFrameMs = 0;
bool weatherFaceInitialized = false;
bool bootUiReady = false;
uint32_t facePerfWindowStartedMs = 0;
uint32_t facePerfFrameCount = 0;
uint32_t facePerfTotalRenderUs = 0;
uint32_t facePerfMaxRenderUs = 0;
uint32_t facePerfImageDrawCalls = 0;
uint32_t facePerfImageTileCount = 0;
uint32_t facePerfHandMaskPixels = 0;
uint32_t facePerfImageOverlapPixels = 0;
uint32_t facePerfImageRows = 0;
uint32_t facePerfImageBytes = 0;
uint32_t facePerfImageFileOpens = 0;
uint32_t facePerfImageFileOpenUs = 0;
uint32_t facePerfImageSeekUs = 0;
uint32_t facePerfImageReadUs = 0;
uint32_t facePerfImageDecodeUs = 0;
}

void loop() {
    // During startup, the boot task owns the display. Do not run normal UI,
    // button, or periodic services until network work and BLE initialization
    // have both reached their terminal state.
    if (!bootUiReady) {
        if (BootCoordinator::takeBleInitRequest()) {
            bootTerminalLog("[BLE] Initializing Bluetooth", TFT_YELLOW);
            beginBLE();
            if (isBLEEnabled()) {
                toggleBLE();
            }
            SystemDiagnostics::logMemory("after BLE init");
            WiFi.disconnect(false, false);
            WiFi.mode(WIFI_OFF);
            wifiEnabled = false;
            WifiService::resetConnectionMonitor(millis());

            bootTerminalLog("[OK] Bluetooth initialized; radios idle", TFT_GREEN);
            bootTerminalLog("[BOOT] Startup complete", TFT_GREEN);
            delay(350);

            tft.fillScreen(TFT_BLACK);
            stopBootTerminalDisplay();
            drawCurrentScreen(true);
            bootUiReady = true;
            SystemManager::resetAutoSleepActivity(
                millis(), getLastButtonActivityMs(), isBLEConnected());
            Serial.println("[BOOT] Clock interface ready.");
        }
        delay(2);
        return;
    }

    const uint32_t now = millis();

    // Bounded diagnostics cadence avoids serial flooding in the UI loop.
    SystemDiagnostics::service();

    serviceTimePersistence();

    // -------------------------------------------------
    // BUTTON INPUT
    // -------------------------------------------------

    updateButtonManager();

    // SystemManager consumes physical button activity for the auto-sleep idle timer.

    handleBLECommands();
    serviceBLE();
    WeatherCoordinator::serviceNotification();
    if (WeatherCoordinator::takeFaceInvalidation()) {
        weatherFaceInitialized = false;
    }
    WifiService::serviceScan();

    // Automatic sleep is deliberately disabled during an active BLE session.
    // Manual Sleep from the menu still bypasses this connection guard.
    const bool backgroundWorkActive =
        BootCoordinator::isBusy() || WeatherCoordinator::isFetchRunning() || WifiService::isScanBusy();
    SystemManager::serviceAutoSleep(
        now, getLastButtonActivityMs(), isBLEConnected(),
        backgroundWorkActive, currentScreen == SCREEN_CLOCK);
    if (SystemManager::sleepRequested()) {
        // Keep the UI loop responsive while HTTPS/TLS work finishes.
        // Sleep is entered on a later loop iteration once radio tasks are idle.
        if (backgroundWorkActive) {
            delay(2);
            return;
        }
        SystemManager::enterLightSleep();
        return;
    }

    // -------------------------------------------------
    // WIFI CONNECTION MONITOR + DIAGNOSTICS
    // -------------------------------------------------

    const WifiService::ConnectionSnapshot wifiLink =
        WifiService::serviceConnectionMonitor(
            now, wifiEnabled, BootCoordinator::isBusy());
    const bool wifiConnected = wifiLink.connected;

    if (wifiLink.justConnected) {
        Serial.printf(
            "[WIFI] Connected. IP: %s, RSSI: %d dBm\n",
            WiFi.localIP().toString().c_str(),
            WiFi.RSSI()
        );

        // Refresh IP-based timezone/location and restart NTP after Wi-Fi reconnect.
        // This also adapts the clock and forecast location when travelling.
        beginTimeService();
        WeatherCoordinator::onWifiConnected(now);
    }

    if (wifiLink.justDisconnected) {
        Serial.println("[WIFI] Connection lost.");
    }

    const bool hasWeatherData = weatherDataValid;
    WeatherCoordinator::service(
        now, wifiEnabled, wifiConnected, hasWeatherData,
        WifiService::isScanBusy(), BootCoordinator::isBusy(),
        TransferManager::isBusy());

    // -------------------------------------------------
    // MENU ANIMATION
    // -------------------------------------------------

    if (
        currentScreen == SCREEN_MENU &&
        now - lastMenuFrameMs >= 40
    ) {
        drawMenuScreen(
            menuIndex,
            currentMenuLevel,
            wifiEnabled,
            wifiConnected
        );

        lastMenuFrameMs = now;
    }

    // -------------------------------------------------
    // ANALOG CLOCK
    // -------------------------------------------------

    if (
        currentScreen == SCREEN_CLOCK &&
        now - lastClockDrawMs >= 40
    ) {
        static int cachedSecond = -1;
        static struct tm cachedTime = {};
        static uint32_t secondStartedAt = 0;
        static bool cachedTimeValid = false;

        struct tm currentTime = {};

        // Accept only a genuinely synchronized calendar time. Some ESP32
        // time reads can briefly return an epoch/default value around radio
        // shutdown or wake; never replace a good clock with 1970.
        if (getLocalTime(&currentTime, 0) &&
            currentTime.tm_year >= (2024 - 1900)) {
            if (!cachedTimeValid || currentTime.tm_sec != cachedSecond) {
                cachedSecond = currentTime.tm_sec;
                cachedTime = currentTime;
                secondStartedAt = now;
                cachedTimeValid = true;
            }
        }

        // Until the first valid NTP time arrives, show a stable placeholder.
        // Once synchronized, preserve the last good time through transient
        // getLocalTime() failures instead of jumping back to a fake time.
        if (!cachedTimeValid) {
            cachedTime.tm_hour = 12;
            cachedTime.tm_min = 0;
            cachedTime.tm_sec = (now / 1000) % 60;
            cachedTime.tm_wday = 0;
            cachedTime.tm_mday = 1;
            secondStartedAt = now - (now % 1000);
        }

        uint32_t elapsed =
            now - secondStartedAt;

        if (elapsed > 999) {
            elapsed = 999;
        }

        if (FaceManager::hasActiveFace()) {
            // Match the 40 ms clock cadence used by the built-in face. Passing
            // elapsed milliseconds lets custom analog hands interpolate their
            // angle instead of advancing only once at each whole second.
            const uint32_t renderStartedUs = micros();
            const FaceRenderStatus status = FaceManager::renderActiveDynamic(
                cachedTime, static_cast<int>(elapsed), getWeatherSnapshot());
            const uint32_t renderDurationUs = micros() - renderStartedUs;
            // Emit only slow frames so normal smooth-frame updates do not
            // flood Serial or perturb the UI loop being measured.
            if (renderDurationUs >= 8000UL) {
                Serial.printf("[PERF] Watch Face render=%lu us\n",
                              static_cast<unsigned long>(renderDurationUs));
            }
            // Aggregate one-second diagnostics so serial output does not
            // dominate the 40 ms render cadence being measured.
            ImageRenderPassStats imageStats{};
            takeImageRenderPassStats(imageStats);
            ++facePerfFrameCount;
            facePerfTotalRenderUs += renderDurationUs;
            if (renderDurationUs > facePerfMaxRenderUs) facePerfMaxRenderUs = renderDurationUs;
            facePerfImageDrawCalls += imageStats.drawCalls;
            facePerfImageTileCount += imageStats.tileCount;
            facePerfHandMaskPixels += imageStats.handMaskPixels;
            facePerfImageOverlapPixels += imageStats.imageOverlapPixels;
            facePerfImageRows += imageStats.rowsRead;
            facePerfImageBytes += imageStats.bytesRead;
            facePerfImageFileOpens += imageStats.fileOpens;
            facePerfImageFileOpenUs += imageStats.fileOpenUs;
            facePerfImageSeekUs += imageStats.seekUs;
            facePerfImageReadUs += imageStats.readUs;
            facePerfImageDecodeUs += imageStats.decodeUs;
            if (facePerfWindowStartedMs == 0) facePerfWindowStartedMs = now;
            if (now - facePerfWindowStartedMs >= 1000UL) {
                const uint32_t windowMs = now - facePerfWindowStartedMs;
                const uint32_t averageRenderUs = facePerfFrameCount
                    ? facePerfTotalRenderUs / facePerfFrameCount : 0;
                Serial.printf(
                    "[FACE_PERF] fps=%lu avg=%luus max=%luus img_tiles=%lu rows=%lu bytes=%lu opens=%lu open=%luus seek=%luus read=%luus decode=%luus\n",
                    static_cast<unsigned long>(facePerfFrameCount * 1000UL / windowMs),
                    static_cast<unsigned long>(averageRenderUs),
                    static_cast<unsigned long>(facePerfMaxRenderUs),
                    static_cast<unsigned long>(facePerfImageTileCount),
                    static_cast<unsigned long>(facePerfImageDrawCalls),
                    static_cast<unsigned long>(facePerfHandMaskPixels),
                    static_cast<unsigned long>(facePerfImageOverlapPixels),
                    static_cast<unsigned long>(facePerfHandMaskPixels
                        ? facePerfImageOverlapPixels * 100UL / facePerfHandMaskPixels : 0UL),
                    static_cast<unsigned long>(facePerfImageRows),
                    static_cast<unsigned long>(facePerfImageBytes),
                    static_cast<unsigned long>(facePerfImageFileOpens),
                    static_cast<unsigned long>(facePerfImageFileOpenUs),
                    static_cast<unsigned long>(facePerfImageSeekUs),
                    static_cast<unsigned long>(facePerfImageReadUs),
                    static_cast<unsigned long>(facePerfImageDecodeUs));
                facePerfWindowStartedMs = now;
                facePerfFrameCount = facePerfTotalRenderUs = facePerfMaxRenderUs = 0;
                facePerfImageDrawCalls = facePerfImageTileCount = 0;
                facePerfHandMaskPixels = facePerfImageOverlapPixels = 0;
                facePerfImageRows = facePerfImageBytes = 0;
                facePerfImageFileOpens = facePerfImageFileOpenUs = 0;
                facePerfImageSeekUs = facePerfImageReadUs = facePerfImageDecodeUs = 0;
            }
            if (status != FaceRenderStatus::Ok) {
                Serial.printf("[FACE] Custom renderer rejected frame (%u); reverting to built-in face.\n",
                              static_cast<unsigned int>(status));
                FaceManager::disableActive();
                // The built-in face cache may predate the custom face.
                // Force a complete tile refresh after switching renderers.
                invalidateAnalogClockFace();
                getDisplayCanvas().clearScreen(0x0000);
                drawAnalogClockFace(cachedTime, static_cast<int>(elapsed), 0, 0);
            }
        } else {
            drawAnalogClockFace(
                cachedTime,
                static_cast<int>(elapsed),
                0,
                0
            );
        }

        lastClockDrawMs = now;
    }

    // -------------------------------------------------
    // WEATHER FACE ANIMATION
    // -------------------------------------------------

    if (currentScreen != SCREEN_WEATHER) {
        weatherFaceInitialized = false;
    } else if (now - lastWeatherFrameMs >= 40) {
        if (!weatherFaceInitialized) {
            // Copy the String-heavy snapshot only once when entering the face.
            // Animation updates use their own captured state and do not need
            // another full WeatherData copy every 40 ms.
            WeatherData weather = getWeatherSnapshot();
            drawWeatherFaceData(weather);
            weatherFaceInitialized = true;
        }

        static const WeatherData unusedAnimationInput{};
        updateWeatherFaceAnimation(unusedAnimationInput);
        lastWeatherFrameMs = now;
    }

    delay(2);
}
