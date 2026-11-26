#pragma once

#include "../face_model.h"
#include <stdint.h>

struct ImageRenderPassStats {
    uint32_t drawCalls;
    uint32_t tileCount;
    uint32_t handMaskPixels;
    uint32_t imageOverlapPixels;
    uint32_t rowsRead;
    uint32_t bytesRead;
    uint32_t fileOpens;
    uint32_t fileOpenUs;
    uint32_t seekUs;
    uint32_t readUs;
    uint32_t decodeUs;
    uint32_t tileCacheHits;
    uint32_t tileCacheMisses;
};

void beginImageRenderPass();
void endImageRenderPass();
void takeImageRenderPassStats(ImageRenderPassStats& stats);
void setImageRenderPassCoverage(uint32_t handPixels, uint32_t imageOverlapPixels);
void recordImageRenderPassTile();
bool drawImageElement(const FaceModel& face, const FaceObject& object);
bool drawImageElementMasked(const FaceModel& face, const FaceObject& object,
                            const uint8_t* pixelMask, uint16_t maskWidth,
                            uint16_t maskHeight);
