#pragma once

namespace BootCoordinator {

// Starts the ordered Wi-Fi, NTP, weather and lunar startup task.
// Returns false if the FreeRTOS task could not be created; startup still
// completes in offline mode and BLE remains uninitialized until requested.
// Restores storage, location, clock, power settings and cached weather.
void restorePersistentState();

bool begin();

// True while the network task is running or startup completion is pending.
bool isBusy();

// Consumes the one-shot request for the main loop to finish startup.
bool takeStartupReadyRequest();

} // namespace BootCoordinator
