#pragma once

#include <stddef.h>
#include <stdint.h>

inline uint32_t micros() {
    static uint32_t tick = 0;
    return ++tick;
}
