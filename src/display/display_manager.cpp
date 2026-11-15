#include "display_manager.h"
#include "display_profile.h"

#include <math.h>
#include <string.h>

TFT_eSPI tft = TFT_eSPI();

namespace {
bool displayInitialized = false;
uint8_t activeRotation = 0;

uint8_t fallbackTextScale(float fontSize) {
    int scale = static_cast<int>(lroundf(fontSize / 8.0f));
    if (scale < 1) scale = 1;
    if (scale > 8) scale = 8;
    return static_cast<uint8_t>(scale);
}

class TftDisplayCanvas final : public DisplayCanvas {
    TFT_eSprite regionSprite{&tft};
    bool offscreenActive = false;
    int originX = 0;
    int originY = 0;

    TFT_eSPI& target() {
        return offscreenActive ? static_cast<TFT_eSPI&>(regionSprite) : tft;
    }
public:
    uint16_t width() const override { return static_cast<uint16_t>(tft.width()); }
    uint16_t height() const override { return static_cast<uint16_t>(tft.height()); }
    void clearScreen(uint16_t color) override { target().fillScreen(color); }
    void fillRect(int x, int y, int w, int h, uint16_t color) override { target().fillRect(x - originX, y - originY, w, h, color); }
    void drawRect(int x, int y, int w, int h, uint16_t color) override { target().drawRect(x - originX, y - originY, w, h, color); }
    void fillRoundRect(int x, int y, int w, int h, int radius, uint16_t color) override {
        target().fillRoundRect(x - originX, y - originY, w, h, radius, color);
    }
    void drawRoundRect(int x, int y, int w, int h, int radius, uint16_t color) override {
        target().drawRoundRect(x - originX, y - originY, w, h, radius, color);
    }
    void fillCircle(int x, int y, int radius, uint16_t color) override { target().fillCircle(x - originX, y - originY, radius, color); }
    void drawCircle(int x, int y, int radius, uint16_t color) override { target().drawCircle(x - originX, y - originY, radius, color); }
    void drawLine(int x0, int y0, int x1, int y1, uint16_t color) override {
        target().drawLine(x0 - originX, y0 - originY, x1 - originX, y1 - originY, color);
    }
    void pushRgb565Row(int x, int y, uint16_t count, const uint16_t* pixels) override {
        if (pixels == nullptr || count == 0) return;

        // WFS assets are decoded from RGB565LE bytes into native uint16_t
        // values. Their RAM representation is low-byte first, while the
        // display expects each RGB565 pixel high-byte first on SPI. On the
        // ESP32-C3, swapBytes selects TFT_eSPI's pair-reordering SPI helper.
        // Sprite buffers are different: TFT_eSprite::drawPixel pre-swaps
        // their stored words, which is why pushSprite() explicitly uses false.
         TftDisplayCanvas::target() uses the same RGB565LE conversion for the physical
        // display and the off-screen sprite, so the final pushSprite preserves
        // the backend's normal RGB565 storage semantics.
        TFT_eSPI& drawTarget = target();
        const bool previousSwapBytes = drawTarget.getSwapBytes();
        drawTarget.setSwapBytes(true);
        drawTarget.pushImage(x - originX, y - originY, count, 1, pixels);
        drawTarget.setSwapBytes(previousSwapBytes);
    }
    void setClipRect(int x, int y, int w, int h) override {
        target().setViewport(x - originX, y - originY, w, h, false);
    }
    void resetClip() override { target().resetViewport(); }

    bool beginOffscreen(int x, int y, int w, int h, uint16_t background) override {
        if (offscreenActive || w <= 0 || h <= 0 ||
            x < 0 || y < 0 || x + w > width() || y + h > height()) return false;
        regionSprite.setColorDepth(16);
        if (regionSprite.createSprite(w, h) == nullptr) return false;
        originX = x;
        originY = y;
        offscreenActive = true;
        regionSprite.fillSprite(background);
        regionSprite.setViewport(0, 0, w, h, false);
        return true;
    }

    bool presentOffscreen() override {
        if (!offscreenActive) return false;
        regionSprite.resetViewport();
        regionSprite.pushSprite(originX, originY);
        regionSprite.deleteSprite();
        offscreenActive = false;
        originX = originY = 0;
        return true;
    }

    void cancelOffscreen() override {
        if (offscreenActive) regionSprite.deleteSprite();
        offscreenActive = false;
        originX = originY = 0;
    }

    void drawText(const char* text, int x, int y, int w, int h,
                  uint16_t color, float fontSize, float scaleX, float scaleY,
                  uint16_t fontWeight, float letterSpacing,
                  CanvasTextAlignment alignment) override {
        if (text == nullptr || text[0] == '\0' || w <= 0 || h <= 0) return;
        TFT_eSPI& drawTarget = target();
        x -= originX;
        y -= originY;
        const float glyphScaleX = (fontSize / 8.0f) * scaleX;
        const float glyphScaleY = (fontSize / 8.0f) * scaleY;
        const float advance = 6.0f * glyphScaleX + letterSpacing;
        const float textWidth = strlen(text) * advance - letterSpacing;
        float cursorX = static_cast<float>(x);
        if (alignment == CanvasTextAlignment::Center) cursorX += (w - textWidth) * 0.5f;
        else if (alignment == CanvasTextAlignment::Right) cursorX += w - textWidth;
        const float drawY = y + (h - 8.0f * glyphScaleY) * 0.5f;

        // GC9A01 backend: rasterize one 6x8 glyph at a time to keep scratch
        // memory bounded. Other backends can implement native font rendering.
        static TFT_eSprite glyphScratch(&tft);
        static bool glyphScratchReady = false;
        if (!glyphScratchReady) {
            glyphScratch.setColorDepth(16);
            glyphScratchReady = glyphScratch.createSprite(6, 8) != nullptr;
            if (glyphScratchReady) {
                glyphScratch.setTextSize(1);
                glyphScratch.setTextColor(TFT_WHITE, TFT_BLACK);
                glyphScratch.setTextDatum(TL_DATUM);
            }
        }
        if (!glyphScratchReady) {
            const uint8_t fallbackScale = fallbackTextScale(fontSize);
            drawTarget.setTextSize(fallbackScale);
            drawTarget.setTextColor(color);
            drawTarget.setTextDatum(TL_DATUM);
            drawTarget.drawString(text, x, y + (h - 8 * fallbackScale) / 2, 1);
            drawTarget.setTextSize(1);
            return;
        }

        const uint16_t* glyphPixels = static_cast<const uint16_t*>(glyphScratch.getPointer());
        if (glyphPixels == nullptr) return;
        const int clipLeft = x, clipTop = y, clipRight = x + w, clipBottom = y + h;
        drawTarget.startWrite();
        for (const unsigned char* character = reinterpret_cast<const unsigned char*>(text);
             *character != 0; ++character) {
            glyphScratch.fillSprite(TFT_BLACK);
            glyphScratch.drawChar(static_cast<uint16_t>(*character), 0, 0, 1);
            for (int row = 0; row < 8; ++row) {
                int runStart = -1;
                for (int column = 0; column <= 6; ++column) {
                    const bool pixelOn = column < 6 && glyphPixels[row * 6 + column] != TFT_BLACK;
                    if (pixelOn && runStart < 0) runStart = column;
                    else if (!pixelOn && runStart >= 0) {
                        int left = static_cast<int>(floorf(cursorX + runStart * glyphScaleX));
                        int right = static_cast<int>(ceilf(cursorX + column * glyphScaleX));
                        int top = static_cast<int>(floorf(drawY + row * glyphScaleY));
                        int bottom = static_cast<int>(ceilf(drawY + (row + 1) * glyphScaleY));
                        if (left < clipLeft) left = clipLeft;
                        if (right > clipRight) right = clipRight;
                        if (top < clipTop) top = clipTop;
                        if (bottom > clipBottom) bottom = clipBottom;
                        if (right > left && bottom > top) {
                            drawTarget.fillRect(left, top, right - left, bottom - top, color);
                            if (fontWeight >= 600 && left + 1 < clipRight) {
                                const int boldWidth = right - left;
                                drawTarget.fillRect(left + 1, top,
                                    boldWidth > clipRight - left - 1 ? clipRight - left - 1 : boldWidth,
                                    bottom - top, color);
                            }
                        }
                        runStart = -1;
                    }
                }
            }
            cursorX += advance;
        }
        drawTarget.endWrite();
    }
};

TftDisplayCanvas displayCanvas;
}

DisplayCanvas& getDisplayCanvas() { return displayCanvas; }

bool beginDisplay(uint8_t rotation) {
    if (displayInitialized) {
        if (rotation != activeRotation) {
            tft.setRotation(rotation);
            activeRotation = rotation;
        }
        return true;
    }
    tft.init();
    tft.setRotation(rotation);
    if (tft.width() != DisplayProfileConfig::WIDTH ||
        tft.height() != DisplayProfileConfig::HEIGHT) {
        Serial.printf("[DISPLAY] Profile mismatch: expected %ux%u, driver reports %ux%u.\\n",
                      static_cast<unsigned>(DisplayProfileConfig::WIDTH),
                      static_cast<unsigned>(DisplayProfileConfig::HEIGHT),
                      static_cast<unsigned>(tft.width()), static_cast<unsigned>(tft.height()));
        return false;
    }
    tft.fillScreen(TFT_BLACK);
    activeRotation = rotation;
    displayInitialized = true;
    Serial.printf("[DISPLAY] %s initialized (%ux%u).\\n",
                  DisplayProfileConfig::ID, static_cast<unsigned>(tft.width()),
                  static_cast<unsigned>(tft.height()));
    return true;
}

bool isDisplayInitialized() { return displayInitialized; }
void blankDisplay() { if (displayInitialized) getDisplayCanvas().clearScreen(TFT_BLACK); }
void clearDisplay(uint16_t color) { if (displayInitialized) getDisplayCanvas().clearScreen(color); }
