#include "image.h"
#include "image_rgb565.h"

#include <Arduino.h>
#include <math.h>
#include <string.h>

#include "../../display/display_canvas.h"
#include "../../storage/face_storage.h"
#include "../../display/display_profile.h"

namespace {
fs::File imageRenderPassFile;
bool imageRenderPassActive = false;
uint8_t imageRenderPassSlot = FaceStorage::INVALID_SLOT;
size_t imageRenderPassFileSize = 0;
ImageRenderPassStats activeImageRenderPassStats = {};
ImageRenderPassStats completedImageRenderPassStats = {};

constexpr uint16_t IMAGE_TILE_CACHE_EDGE = 64;
struct ImageTileCache {
    uint16_t pixels[IMAGE_TILE_CACHE_EDGE * IMAGE_TILE_CACHE_EDGE];
    uint8_t slot;
    uint16_t assetWidth;
    uint16_t assetHeight;
    uint16_t sourceLeft;
    uint16_t sourceTop;
    uint16_t width;
    uint16_t height;
    int16_t screenX;
    int16_t screenY;
    size_t packageOffset;
    bool valid;
};
ImageTileCache imageTileCache = {};
}

void beginImageRenderPass() {
    if (imageRenderPassActive) endImageRenderPass();
    imageRenderPassActive = true;
    imageRenderPassSlot = FaceStorage::INVALID_SLOT;
    imageRenderPassFileSize = 0;
    activeImageRenderPassStats = {};
}

void endImageRenderPass() {
    if (imageRenderPassFile) imageRenderPassFile.close();
    imageRenderPassActive = false;
    imageRenderPassSlot = FaceStorage::INVALID_SLOT;
    imageRenderPassFileSize = 0;
    completedImageRenderPassStats = activeImageRenderPassStats;
    activeImageRenderPassStats = {};
}

void takeImageRenderPassStats(ImageRenderPassStats& stats) {
    stats = completedImageRenderPassStats;
    completedImageRenderPassStats = {};
}

void setImageRenderPassCoverage(uint32_t handPixels, uint32_t imageOverlapPixels) {
    if (!imageRenderPassActive) return;
    activeImageRenderPassStats.handMaskPixels = handPixels;
    activeImageRenderPassStats.imageOverlapPixels = imageOverlapPixels;
}

void recordImageRenderPassTile() {
    if (imageRenderPassActive) ++activeImageRenderPassStats.tileCount;
}

bool drawImageElement(const FaceModel& face, const FaceObject& object) {
    const FaceAsset* asset = nullptr;
    for (uint8_t i = 0; i < face.assetCount; ++i) {
        if (strcmp(face.assets[i].id, object.assetId) == 0) {
            asset = &face.assets[i];
            break;
        }
    }
    if (asset == nullptr || asset->width == 0 || asset->width > DisplayProfileConfig::MAX_BITMAP_WIDTH ||
        asset->height == 0 || asset->height > DisplayProfileConfig::MAX_BITMAP_HEIGHT ||
        asset->byteLength != static_cast<size_t>(asset->width) * asset->height * sizeof(uint16_t)) return false;

    const int x = static_cast<int>(lroundf(object.transform.x));
    const int y = static_cast<int>(lroundf(object.transform.y));
    const size_t rowBytes = static_cast<size_t>(asset->width) * 2U;
    int clipX = 0, clipY = 0, clipW = 0, clipH = 0;
    int sourceLeft = 0, sourceTop = 0;
    int sourceRight = asset->width, sourceBottom = asset->height;
    if (getDisplayCanvas().getOffscreenBounds(clipX, clipY, clipW, clipH)) {
        sourceLeft = clipX > x ? clipX - x : 0;
        sourceTop = clipY > y ? clipY - y : 0;
        sourceRight = clipX + clipW < x + asset->width
            ? clipX + clipW - x : asset->width;
        sourceBottom = clipY + clipH < y + asset->height
            ? clipY + clipH - y : asset->height;
        // Avoid opening or seeking the storage file when this image does not
        // intersect the current composition tile.
        if (sourceRight <= sourceLeft || sourceBottom <= sourceTop) return true;
    }

    const uint8_t slot = FaceStorage::activeSlot();
    if (slot > 1) return false;

    fs::File localFile;
    fs::File* file = nullptr;
    size_t fileSize = 0;
    if (imageRenderPassActive) {
        ++activeImageRenderPassStats.drawCalls;
        if (!imageRenderPassFile) {
            const uint32_t openStartedUs = micros();
            imageRenderPassFile = FaceStorage::openSlot(slot, "r");
            activeImageRenderPassStats.fileOpenUs += micros() - openStartedUs;
            if (!imageRenderPassFile) return false;
            ++activeImageRenderPassStats.fileOpens;
            imageRenderPassSlot = slot;
            imageRenderPassFileSize = imageRenderPassFile.size();
        } else if (imageRenderPassSlot != slot) {
            return false;
        }
        file = &imageRenderPassFile;
        fileSize = imageRenderPassFileSize;
    } else {
        localFile = FaceStorage::openSlot(slot, "r");
        if (!localFile) return false;
        file = &localFile;
        fileSize = localFile.size();
    }

    if (asset->packageOffset > fileSize ||
        asset->byteLength > fileSize - asset->packageOffset) {
        if (!imageRenderPassActive) file->close();
        return false;
    }

    const size_t segmentPixels = static_cast<size_t>(sourceRight - sourceLeft);
    const size_t segmentRows = static_cast<size_t>(sourceBottom - sourceTop);
    const bool tileCacheable = clipW > 0 && clipH > 0 &&
        segmentPixels <= IMAGE_TILE_CACHE_EDGE && segmentRows <= IMAGE_TILE_CACHE_EDGE;
    const bool tileCacheHit = tileCacheable && imageTileCache.valid &&
        imageTileCache.slot == slot &&
        imageTileCache.packageOffset == asset->packageOffset &&
        imageTileCache.assetWidth == asset->width &&
        imageTileCache.assetHeight == asset->height &&
        imageTileCache.sourceLeft == sourceLeft &&
        imageTileCache.sourceTop == sourceTop &&
        imageTileCache.width == segmentPixels &&
        imageTileCache.height == segmentRows &&
        imageTileCache.screenX == x + sourceLeft &&
        imageTileCache.screenY == y + sourceTop;
    if (imageRenderPassActive) {
        ++activeImageRenderPassStats.drawCalls;
        if (tileCacheHit) {
            ++activeImageRenderPassStats.tileCacheHits;
            for (size_t rowIndex = 0; rowIndex < segmentRows; ++rowIndex) {
                getDisplayCanvas().pushRgb565Row(
                    x + sourceLeft, y + sourceTop + static_cast<int>(rowIndex),
                    static_cast<uint16_t>(segmentPixels),
                    imageTileCache.pixels + rowIndex * IMAGE_TILE_CACHE_EDGE);
            }
            return true;
        }
        if (tileCacheable) ++activeImageRenderPassStats.tileCacheMisses;
    }
    const size_t segmentBytes = segmentPixels * 2U;
    if (tileCacheable) {
        imageTileCache.valid = false;
        imageTileCache.slot = slot;
        imageTileCache.packageOffset = asset->packageOffset;
        imageTileCache.assetWidth = asset->width;
        imageTileCache.assetHeight = asset->height;
        imageTileCache.sourceLeft = static_cast<uint16_t>(sourceLeft);
        imageTileCache.sourceTop = static_cast<uint16_t>(sourceTop);
        imageTileCache.width = static_cast<uint16_t>(segmentPixels);
        imageTileCache.height = static_cast<uint16_t>(segmentRows);
        imageTileCache.screenX = static_cast<int16_t>(x + sourceLeft);
        imageTileCache.screenY = static_cast<int16_t>(y + sourceTop);
    }
    uint8_t encodedRow[DisplayProfileConfig::MAX_BITMAP_WIDTH * 2] = {};
    uint16_t row[DisplayProfileConfig::MAX_BITMAP_WIDTH] = {};
    // Seek once to the first required source row, then stream complete rows
    // sequentially. Re-seeking for every row is expensive on SPI flash filesystems.
    const size_t firstRowOffset = asset->packageOffset +
                                  static_cast<size_t>(sourceTop) * rowBytes;
    const uint32_t seekStartedUs = imageRenderPassActive ? micros() : 0;
    const bool seekSucceeded = file->seek(firstRowOffset, fs::SeekSet);
    if (imageRenderPassActive) {
        activeImageRenderPassStats.seekUs += micros() - seekStartedUs;
    }
    if (!seekSucceeded) {
        if (!imageRenderPassActive) file->close();
        return false;
    }

    for (int rowIndex = sourceTop; rowIndex < sourceBottom; ++rowIndex) {
        const uint32_t readStartedUs = imageRenderPassActive ? micros() : 0;
        const size_t bytesRead = file->read(encodedRow, rowBytes);
        if (imageRenderPassActive) {
            activeImageRenderPassStats.readUs += micros() - readStartedUs;
        }
        if (bytesRead != rowBytes) {
            if (!imageRenderPassActive) file->close();
            return false;
        }
        if (imageRenderPassActive) {
            ++activeImageRenderPassStats.rowsRead;
            activeImageRenderPassStats.bytesRead += static_cast<uint32_t>(bytesRead);
        }
        const uint32_t decodeStartedUs = imageRenderPassActive ? micros() : 0;
        const bool decodeSucceeded = decodeRgb565LittleEndianRow(
            encodedRow + static_cast<size_t>(sourceLeft) * 2U,
            segmentBytes, row, segmentPixels);
        if (imageRenderPassActive) {
            activeImageRenderPassStats.decodeUs += micros() - decodeStartedUs;
        }
        if (!decodeSucceeded) {
            if (!imageRenderPassActive) file->close();
            return false;
        }
        if (tileCacheable) {
            memcpy(imageTileCache.pixels +
                       static_cast<size_t>(rowIndex - sourceTop) * IMAGE_TILE_CACHE_EDGE,
                   row, segmentBytes);
        }
        getDisplayCanvas().pushRgb565Row(x + sourceLeft, y + rowIndex,
            static_cast<uint16_t>(segmentPixels), row);
    }
    if (!imageRenderPassActive) file->close();
    if (tileCacheable) imageTileCache.valid = true;
    return true;
}

bool drawImageElementMasked(const FaceModel& face, const FaceObject& object,
                            const uint8_t* pixelMask, uint16_t maskWidth,
                            uint16_t maskHeight) {
    if (pixelMask == nullptr || maskWidth == 0 || maskHeight == 0) return false;
    const FaceAsset* asset = nullptr;
    for (uint8_t i = 0; i < face.assetCount; ++i) {
        if (strcmp(face.assets[i].id, object.assetId) == 0) { asset = &face.assets[i]; break; }
    }
    if (asset == nullptr || asset->width == 0 || asset->width > DisplayProfileConfig::MAX_BITMAP_WIDTH ||
        asset->height == 0 || asset->height > DisplayProfileConfig::MAX_BITMAP_HEIGHT ||
        asset->byteLength != static_cast<size_t>(asset->width) * asset->height * sizeof(uint16_t)) return false;

    const int x = static_cast<int>(lroundf(object.transform.x));
    const int y = static_cast<int>(lroundf(object.transform.y));
    const int left = x < 0 ? 0 : x;
    const int top = y < 0 ? 0 : y;
    const int right = x + asset->width > maskWidth ? maskWidth : x + asset->width;
    const int bottom = y + asset->height > maskHeight ? maskHeight : y + asset->height;
    if (right <= left || bottom <= top) return true;

    const uint8_t slot = FaceStorage::activeSlot();
    if (slot > 1) return false;
    fs::File file = FaceStorage::openSlot(slot, "r");
    if (!file) return false;
    const size_t fileSize = file.size();
    if (asset->packageOffset > fileSize ||
        asset->byteLength > fileSize - asset->packageOffset) {
        file.close();
        return false;
    }

    const size_t rowBytes = static_cast<size_t>(asset->width) * 2U;
    uint8_t encodedRow[DisplayProfileConfig::MAX_BITMAP_WIDTH * 2] = {};
    uint16_t decodedRow[DisplayProfileConfig::MAX_BITMAP_WIDTH] = {};
    const size_t maskStride = (static_cast<size_t>(maskWidth) + 7U) / 8U;
    for (int screenY = top; screenY < bottom; ++screenY) {
        const int assetY = screenY - y;
        bool rowHasPixels = false;
        for (int screenX = left; screenX < right; ++screenX) {
            const size_t index = static_cast<size_t>(screenY) * maskStride +
                                 static_cast<size_t>(screenX >> 3);
            if ((pixelMask[index] & static_cast<uint8_t>(1U << (screenX & 7))) != 0) {
                rowHasPixels = true;
                break;
            }
        }
        if (!rowHasPixels) continue;

        const size_t offset = asset->packageOffset +
                              static_cast<size_t>(assetY) * rowBytes;
        if (!file.seek(offset, fs::SeekSet) || file.read(encodedRow, rowBytes) != rowBytes ||
            !decodeRgb565LittleEndianRow(encodedRow, rowBytes, decodedRow, asset->width)) {
            file.close();
            return false;
        }

        int screenX = left;
        while (screenX < right) {
            auto isMarked = [&](int px) {
                const size_t index = static_cast<size_t>(screenY) * maskStride +
                                     static_cast<size_t>(px >> 3);
                return (pixelMask[index] & static_cast<uint8_t>(1U << (px & 7))) != 0;
            };
            while (screenX < right && !isMarked(screenX)) ++screenX;
            const int runStart = screenX;
            while (screenX < right && isMarked(screenX)) ++screenX;
            if (screenX > runStart) {
                const int sourceX = runStart - x;
                getDisplayCanvas().pushRgb565Row(runStart, screenY,
                    static_cast<uint16_t>(screenX - runStart), decodedRow + sourceX);
            }
        }
    }
    file.close();
    return true;
}
