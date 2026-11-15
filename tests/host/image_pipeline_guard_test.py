#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = (ROOT / "src" / "watchface" / "elements" / "image.cpp").read_text(encoding="utf-8")
assert "asset->byteLength != static_cast<size_t>(asset->width) * asset->height * sizeof(uint16_t)" in SOURCE
assert "const size_t fileSize = file.size();" in SOURCE
assert "asset->byteLength > fileSize - asset->packageOffset" in SOURCE
assert "file->seek(firstRowOffset, fs::SeekSet)" in SOURCE
assert "decodeRgb565LittleEndianRow(" in SOURCE
assert "encodedRow + static_cast<size_t>(sourceLeft) * 2U" in SOURCE
assert "file->read(encodedRow, rowBytes)" in SOURCE
assert "getOffscreenBounds(clipX, clipY, clipW, clipH)" in SOURCE
assert "beginImageRenderPass()" in SOURCE
assert "endImageRenderPass()" in SOURCE
assert "imageRenderPassFile = FaceStorage::openSlot(slot, \"r\")" in SOURCE
assert "if (sourceRight <= sourceLeft || sourceBottom <= sourceTop) return true;" in SOURCE

assert "encodedRow + static_cast<size_t>(sourceLeft) * 2U" in SOURCE
assert "file->read(encodedRow, rowBytes)" in SOURCE
assert "uint8_t encodedRow[DisplayProfileConfig::MAX_BITMAP_WIDTH * 2]" in SOURCE

WEB_APP = (ROOT / "web" / "app.js").read_text(encoding="utf-8")
assert "function writeRgb888AsRgb565LE(red,green,blue,output,offset)" in WEB_APP
assert "writeRgb888AsRgb565LE(rgba[i],rgba[i+1],rgba[i+2],bytes,p)" in WEB_APP

DISPLAY_BACKEND = (ROOT / "src" / "display" / "display_manager.cpp").read_text(encoding="utf-8")
assert "const bool previousSwapBytes = tft.getSwapBytes();" in DISPLAY_BACKEND
assert "tft.setSwapBytes(true);" in DISPLAY_BACKEND
assert "tft.pushImage(x, y, count, 1, const_cast<uint16_t*>(pixels));" in DISPLAY_BACKEND
assert "tft.setSwapBytes(previousSwapBytes);" in DISPLAY_BACKEND
assert "regionSprite.pushImage(localX, localY, count, 1," in DISPLAY_BACKEND
assert "regionSprite.setSwapBytes(true);" in DISPLAY_BACKEND
assert "uint16_t* spritePixels = static_cast<uint16_t*>(regionSprite.getPointer());" in DISPLAY_BACKEND
assert "tft.pushImage(originX, originY + row, offscreenWidth, 1," in DISPLAY_BACKEND
assert "tft.resetViewport();" in DISPLAY_BACKEND
assert "regionSprite.drawPixel(localX + i, localY, pixels[i]);" not in DISPLAY_BACKEND
assert "static constexpr int OFFSCREEN_TILE_SIZE = 64;" in DISPLAY_BACKEND

FACE_RENDERER = (ROOT / "src" / "watchface" / "face_renderer.cpp").read_text(encoding="utf-8")
assert "bool tileCompositionSucceeded = true;" in FACE_RENDERER
assert "Compose each dirty tile completely off-screen before presenting it." in FACE_RENDERER
assert "never restore the background image directly to LCD GRAM" in FACE_RENDERER
assert "static_cast<float>(millisValue) / 1000.0f" in FACE_RENDERER
assert "renderWatchFaceDynamic(activeFace, timeInfo, millisValue, weather)" in (ROOT / "src" / "watchface" / "face_manager.cpp").read_text(encoding="utf-8")
assert "cachedTime, static_cast<int>(elapsed), getWeatherSnapshot()" in (ROOT / "src" / "app" / "app_runtime.cpp").read_text(encoding="utf-8")
assert "FaceManager::renderActive(timeinfo, 0, getWeatherSnapshot())" in (ROOT / "src" / "app" / "app_controller.cpp").read_text(encoding="utf-8")
assert "lastCustomFaceSecond" not in (ROOT / "src" / "app" / "app_runtime.cpp").read_text(encoding="utf-8")
assert "bool tileCompositionSucceeded = true;" in FACE_RENDERER


RGB565_HEADER = (ROOT / "src" / "watchface" / "elements" / "image_rgb565.h").read_text(encoding="utf-8")
assert "decodeRgb565LittleEndianRow" in RGB565_HEADER
assert "encodedLength != pixelCount * 2U" in RGB565_HEADER

PACKAGE_VALIDATOR = (ROOT / "src" / "watchface" / "package_validator.cpp").read_text(encoding="utf-8")
assert '#include "../communication/digest.h"' in PACKAGE_VALIDATOR
assert PACKAGE_VALIDATOR.count("WfsDigest::parseSha256Hex(") == 2
assert "hexToBytes(" not in PACKAGE_VALIDATOR
assert "bool isIntegerJsonNumber(JsonVariantConst value)" in PACKAGE_VALIDATOR
for field in ("width", "height", "byteLength", "offset"):
    assert f'isIntegerJsonNumber(asset["{field}"])' in PACKAGE_VALIDATOR, (
        f"package validator must reject non-integer asset metadata: {field}"
    )
print("WFS image reader package-range and RGB565 byte-length guards passed.")

assert "IMAGE_TILE_CACHE_EDGE = 64" in SOURCE
assert "imageTileCache.tileCacheHits" not in SOURCE
assert "tileCacheHits" in (ROOT / "src" / "watchface" / "elements" / "image.h").read_text(encoding="utf-8")
assert "tileCacheMisses" in (ROOT / "src" / "watchface" / "elements" / "image.h").read_text(encoding="utf-8")
