#pragma once

#include "../face_model.h"
#include <stdint.h>

struct ImageRenderPassStats {
    uint32_t drawCalls;
    uint32_t rowsRead;
    uint32_t bytesRead;
    uint32_t fileOpens;
    uint32_t fileOpenUs;
    uint32_t seekUs;
    uint32_t readUs;
    uint32_t decodeUs;
};

void beginImageRenderPass();
void endImageRenderPass();
void takeImageRenderPassStats(ImageRenderPassStats& stats);
bool drawImageElement(const FaceModel& face, const FaceObject& object);
bool drawImageElementMasked(const FaceModel& face, const FaceObject& object,
                            const uint8_t* pixelMask, uint16_t maskWidth,
                            uint16_t maskHeight);
