#include "face_renderer.h"
#include "display_canvas.h"
#include "../../src/watchface/elements/image.h"

#include <assert.h>
#include <iostream>
#include <string>
#include <vector>
#include <algorithm>

class TestCanvas final : public DisplayCanvas {
public:
    std::vector<std::string> calls;
    int clipCalls = 0;
    int resetCalls = 0;
    int clipX = -1, clipY = -1, clipW = -1, clipH = -1;
    bool allClipRowsOne = true;
    std::vector<uint16_t> lineColors;
    struct FillRectCall { int x; int y; int w; int h; uint16_t color; };
    std::vector<FillRectCall> fillRectCalls;
    std::vector<int> circleFillRadii;
    std::vector<uint16_t> circleFillColors;

    uint16_t width() const override { return 240; }
    uint16_t height() const override { return 240; }
    void clearScreen(uint16_t) override { calls.push_back("clear"); }
    void fillRect(int x, int y, int w, int h, uint16_t color) override {
        calls.push_back("fill"); fillRectCalls.push_back({x,y,w,h,color});
    }
    void drawRect(int, int, int, int, uint16_t) override { calls.push_back("rect"); }
    void fillRoundRect(int, int, int, int, int, uint16_t) override { calls.push_back("round-fill"); }
    void drawRoundRect(int, int, int, int, int, uint16_t) override { calls.push_back("round"); }
    void fillCircle(int, int, int radius, uint16_t color) override {
        calls.push_back("circle-fill"); circleFillRadii.push_back(radius); circleFillColors.push_back(color);
    }
    void drawCircle(int, int, int, uint16_t) override { calls.push_back("circle"); }
    void drawLine(int, int, int, int, uint16_t color) override {
        calls.push_back("line"); lineColors.push_back(color);
    }
    void pushRgb565Row(int, int, uint16_t, const uint16_t*) override { calls.push_back("image-row"); }
    void setClipRect(int x, int y, int w, int h) override {
        ++clipCalls; clipX=x; clipY=y; clipW=w; clipH=h;
        if (h != 1) allClipRowsOne = false;
        calls.push_back("clip");
    }
    void resetClip() override { ++resetCalls; calls.push_back("reset-clip"); }
    void drawText(const char* text, int, int, int, int, uint16_t, float, float, float,
                  uint16_t, float, CanvasTextAlignment) override {
        calls.push_back(std::string("text:") + text);
    }
    void reset() { calls.clear(); clipCalls=0; resetCalls=0; clipX=clipY=clipW=clipH=-1; allClipRowsOne=true; lineColors.clear(); fillRectCalls.clear(); circleFillRadii.clear(); circleFillColors.clear(); }
};

static TestCanvas canvas;
static bool imageDrawSucceeds = true;
DisplayCanvas& getDisplayCanvas() { return canvas; }
bool drawImageElement(const FaceModel&, const FaceObject&) {
    canvas.calls.push_back("image");
    return imageDrawSucceeds;
}
bool drawImageElementMasked(const FaceModel&, const FaceObject&, const uint8_t*,
                            uint16_t, uint16_t) {
    canvas.calls.push_back("image-mask");
    return imageDrawSucceeds;
}

// Renderer host tests do not link the filesystem-backed image element module.
// These no-op hooks satisfy the render-pass lifecycle calls; image drawing
// itself is already represented by the deterministic stubs above.
void beginImageRenderPass() {}
void endImageRenderPass() {}
void takeImageRenderPassStats(ImageRenderPassStats& stats) { stats = {}; }
void setImageRenderPassCoverage(uint32_t, uint32_t) {}
void recordImageRenderPassTile() {}

static FaceObject baseObject(FaceElementType type, const char* id) {
    FaceObject object{};
    object.type=type;
    object.visible=true;
    object.transform.x=20;
    object.transform.y=20;
    object.transform.width=100;
    object.transform.height=30;
    object.transform.opacity=1.0f;
    object.fontSize=16.0f;
    object.glyphScaleX=1.0f;
    object.glyphScaleY=1.0f;
    object.fontWeight=400;
    object.textColor=0xFFFF;
    object.analogHands[0]={48.0f,5.0f,4.0f,0xFFFF,true};
    object.analogHands[1]={72.0f,3.0f,5.0f,0xFFFF,true};
    object.analogHands[2]={86.0f,1.5f,18.0f,0xF800,true};
    object.analogCenterRadius=3.0f;
    object.analogCenterColor=0xFFFF;
    object.analogShowOuterRing=true;
    object.analogShowHourTicks=true;
    object.fillColor=0x07E0;
    object.shapeKind=0;
    object.textAlign=FaceTextAlign::Center;
    for (size_t i=0; id[i] && i+1<sizeof(object.id); ++i) object.id[i]=id[i];
    return object;
}

static FaceModel baseFace() {
    FaceModel face{};
    face.canvasWidth=240;
    face.canvasHeight=240;
    face.backgroundColor=0x0000;
    return face;
}

int main() {
    struct tm timeInfo{};
    timeInfo.tm_hour=13; timeInfo.tm_min=5; timeInfo.tm_sec=9;
    timeInfo.tm_wday=0; timeInfo.tm_mday=8; timeInfo.tm_mon=10; timeInfo.tm_year=126;
    WeatherData weather{};

    FaceModel face=baseFace();
    face.objectCount=1;
    face.objects[0]=baseObject(FaceElementType::DigitalClock,"clock");
    face.objects[0].dataFormat[0]='H'; face.objects[0].dataFormat[1]='H';
    face.objects[0].dataFormat[2]=':'; face.objects[0].dataFormat[3]='m';
    face.objects[0].dataFormat[4]='m'; face.objects[0].dataFormat[5]='\0';
    face.objects[0].timeFormat[0]='1'; face.objects[0].timeFormat[1]='2';
    face.objects[0].timeFormat[2]='h'; face.objects[0].timeFormat[3]='\0';
    face.objects[0].showSeconds=true;
    canvas.reset();
    assert(renderWatchFace(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(canvas.calls.size()==2 && canvas.calls[0]=="clear" && canvas.calls[1]=="text:01:05:09 PM");
    canvas.reset();
    assert(renderWatchFaceDynamic(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(canvas.calls.empty()); // the initial full render already seeded the text cache

    face.objects[0]=baseObject(FaceElementType::Date,"date");
    const char* dateFormat="ddd, DD MMM YYYY";
    for(size_t i=0;dateFormat[i]&&i+1<sizeof(face.objects[0].dataFormat);++i)face.objects[0].dataFormat[i]=dateFormat[i];
    canvas.reset();
    assert(renderWatchFace(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(canvas.calls.back()=="text:SUN, 08 NOV 2026");

    face=baseFace(); face.objectCount=2;
    face.objects[0]=baseObject(FaceElementType::Shape,"top");
    face.objects[0].transform.zIndex=10;
    face.objects[1]=baseObject(FaceElementType::Text,"bottom");
    for(size_t i=0;i<5;++i)face.objects[1].text[i]="Hello"[i];
    canvas.reset();
    assert(renderWatchFace(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(canvas.calls.size()==3);
    assert(canvas.calls[0]=="clear" && canvas.calls[1]=="text:Hello" && canvas.calls[2]=="fill");

    face.objects[1].transform.opacity=0.5f;
    assert(validateFaceModelForRenderer(face)==FaceRenderStatus::UnsupportedTransform);
    face.objects[1].transform.opacity=1.0f;
    face.objects[1].transform.rotation=90.0f;
    assert(validateFaceModelForRenderer(face)==FaceRenderStatus::UnsupportedTransform);
    face.objects[1].transform.rotation=0.0f;
    face.objects[1].fontFamily[0]='C'; face.objects[1].fontFamily[1]='o';
    face.objects[1].fontFamily[2]='m'; face.objects[1].fontFamily[3]='i';
    face.objects[1].fontFamily[4]='c'; face.objects[1].fontFamily[5]='\0';
    assert(validateFaceModelForRenderer(face)==FaceRenderStatus::UnsupportedFont);

    face=baseFace(); face.objectCount=3;
    face.objects[0]=baseObject(FaceElementType::Shape,"overlap");
    face.objects[0].transform.x=55; face.objects[0].transform.y=55;
    face.objects[0].transform.width=20; face.objects[0].transform.height=20;
    face.objects[0].transform.zIndex=0;
    face.objects[1]=baseObject(FaceElementType::DigitalClock,"dynamic");
    face.objects[1].transform.x=50; face.objects[1].transform.y=50;
    face.objects[1].transform.width=100; face.objects[1].transform.height=30;
    face.objects[1].transform.zIndex=1;
    face.objects[1].dataFormat[0]='H'; face.objects[1].dataFormat[1]='H';
    face.objects[1].dataFormat[2]=':'; face.objects[1].dataFormat[3]='m';
    face.objects[1].dataFormat[4]='m';
    face.objects[1].showSeconds=true;
    face.objects[2]=baseObject(FaceElementType::Shape,"outside");
    face.objects[2].transform.x=0; face.objects[2].transform.y=0;
    face.objects[2].transform.width=10; face.objects[2].transform.height=10;
    canvas.reset();
    assert(renderWatchFaceDynamic(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(canvas.clipCalls==1 && canvas.resetCalls==1);
    assert(canvas.calls.size()==5);
    assert(canvas.calls[0]=="clip" && canvas.calls[1]=="fill" &&
           canvas.calls[2]=="fill" && canvas.calls[3]=="text:13:05:09" && canvas.calls[4]=="reset-clip");
    assert(canvas.clipX==50 && canvas.clipY==50 && canvas.clipW==100 && canvas.clipH==30);

    // An unchanged minute-only clock must not clear/repaint its region.
    canvas.reset();
    assert(renderWatchFaceDynamic(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(canvas.calls.empty());

    // A seconds tick should redraw only the changed second digits, not the
    // entire 100-pixel-wide digital clock region.
    timeInfo.tm_sec=10;
    canvas.reset();
    assert(renderWatchFaceDynamic(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(canvas.clipCalls==1 && canvas.clipW>0 && canvas.clipW<100);
    assert(canvas.clipX>50 && canvas.clipX<150);
    assert(canvas.calls.size()==4 && canvas.calls[2]=="text:13:05:10");
    timeInfo.tm_sec=9;

    // Dynamic redraw must restore intersecting layers above the changing element.
    assert(renderWatchFace(face,timeInfo,0,weather)==FaceRenderStatus::Ok); // invalidate cache for the next face
    face=baseFace(); face.objectCount=3;
    face.objects[0]=baseObject(FaceElementType::Shape,"lower");
    face.objects[0].transform.x=50; face.objects[0].transform.y=50;
    face.objects[0].transform.width=100; face.objects[0].transform.height=30;
    face.objects[0].transform.zIndex=0;
    face.objects[1]=baseObject(FaceElementType::DigitalClock,"dynamic");
    face.objects[1].transform.x=50; face.objects[1].transform.y=50;
    face.objects[1].transform.width=100; face.objects[1].transform.height=30;
    face.objects[1].transform.zIndex=1;
    face.objects[1].dataFormat[0]='H'; face.objects[1].dataFormat[1]='H';
    face.objects[1].dataFormat[2]=':'; face.objects[1].dataFormat[3]='m';
    face.objects[1].dataFormat[4]='m';
    face.objects[2]=baseObject(FaceElementType::Text,"upper");
    face.objects[2].transform.x=50; face.objects[2].transform.y=50;
    face.objects[2].transform.width=100; face.objects[2].transform.height=30;
    face.objects[2].transform.zIndex=2;
    face.objects[2].text[0]='T'; face.objects[2].text[1]='o';
    face.objects[2].text[2]='p';
    canvas.reset();
    assert(renderWatchFaceDynamic(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(canvas.calls.size()==6);
    assert(canvas.calls[0]=="clip" && canvas.calls[1]=="fill" &&
           canvas.calls[2]=="fill" && canvas.calls[3]=="text:13:05" &&
           canvas.calls[4]=="text:Top" && canvas.calls[5]=="reset-clip");

    // A failed clipped redraw must not commit the dynamic text cache.
    // The image layer overlaps the clock and deliberately fails once; the
    // same timestamp must be retried instead of being treated as already drawn.
    face=baseFace(); face.objectCount=2; face.assetCount=1;
    face.objects[0]=baseObject(FaceElementType::DigitalClock,"retry-clock");
    face.objects[0].transform.x=50; face.objects[0].transform.y=50;
    face.objects[0].transform.width=100; face.objects[0].transform.height=30;
    face.objects[0].dataFormat[0]='H'; face.objects[0].dataFormat[1]='H';
    face.objects[0].dataFormat[2]=':'; face.objects[0].dataFormat[3]='m';
    face.objects[0].dataFormat[4]='m';
    face.objects[0].showSeconds=true;
    face.objects[0].transform.zIndex=0;
    face.objects[1]=baseObject(FaceElementType::Image,"overlay-image");
    face.objects[1].transform.x=50; face.objects[1].transform.y=50;
    face.objects[1].transform.width=100; face.objects[1].transform.height=30;
    face.objects[1].transform.zIndex=1;
    for(size_t i=0;i<10;++i)face.objects[1].assetId[i]="test-image"[i];
    for(size_t i=0;i<10;++i)face.assets[0].id[i]="test-image"[i];
    face.assets[0].width=100; face.assets[0].height=30;
    timeInfo.tm_hour=13; timeInfo.tm_min=5; timeInfo.tm_sec=9;
    imageDrawSucceeds=true;
    canvas.reset();
    assert(renderWatchFace(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    timeInfo.tm_sec=10;
    imageDrawSucceeds=false;
    canvas.reset();
    assert(renderWatchFaceDynamic(face,timeInfo,0,weather)==FaceRenderStatus::AssetReadFailed);
    imageDrawSucceeds=true;
    canvas.reset();
    assert(renderWatchFaceDynamic(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(canvas.calls.size()>=4 && canvas.calls.front()=="clip" &&
           canvas.calls.back()=="reset-clip");
    canvas.reset();
    assert(renderWatchFaceDynamic(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(canvas.calls.empty());
    timeInfo.tm_sec=9;

    // Analog clock updates should repaint only the union of old/new hand bounds.
    face=baseFace(); face.objectCount=1;
    face.objects[0]=baseObject(FaceElementType::AnalogClock,"analog");
    face.objects[0].transform.x=70; face.objects[0].transform.y=70;
    face.objects[0].transform.width=100; face.objects[0].transform.height=100;
    timeInfo.tm_hour=13; timeInfo.tm_min=5; timeInfo.tm_sec=9;
    canvas.reset();
    assert(renderWatchFace(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    canvas.reset();
    assert(renderWatchFaceDynamic(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(canvas.calls.empty()); // no hand movement, no redraw
    timeInfo.tm_sec=10;
    canvas.reset();
    assert(renderWatchFaceDynamic(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(canvas.clipCalls>1 && canvas.clipCalls==canvas.resetCalls);
    assert(canvas.allClipRowsOne);
    assert(canvas.calls.front()=="fill" && canvas.calls.back()=="reset-clip");
    timeInfo.tm_sec=9;

    // Custom analog hand settings must control visibility, colors, stroke
    // thickness, tails and the center cap in the actual firmware renderer.
    face=baseFace(); face.objectCount=1;
    face.objects[0]=baseObject(FaceElementType::AnalogClock,"analog-custom");
    face.objects[0].transform.x=70; face.objects[0].transform.y=70;
    face.objects[0].transform.width=100; face.objects[0].transform.height=100;
    face.objects[0].analogHands[0]={40.0f,6.0f,8.0f,0x1234,true};
    face.objects[0].analogHands[1]={70.0f,3.0f,5.0f,0x4567,false};
    face.objects[0].analogHands[2]={90.0f,1.5f,20.0f,0xF800,true};
    face.objects[0].analogCenterRadius=4.0f;
    face.objects[0].analogCenterColor=0x07E0;
    canvas.reset();
    assert(renderWatchFace(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    // Two visible hand strokes plus the 12 dial ticks; the hidden minute
    // hand must not generate a stroke.
    assert(canvas.lineColors.size()==14);
    assert(canvas.lineColors[12]==0x1234);
    assert(canvas.lineColors.back()==0xF800);
    assert(!canvas.circleFillRadii.empty());
    assert(canvas.circleFillRadii.back()==4);
    assert(canvas.circleFillColors.back()==0x07E0);
    assert(canvas.circleFillRadii.size()>10); // thick strokes are rasterized

    // Artwork-backed faces can suppress both generic bezel marks while
    // retaining the live hour, minute and second hands.
    face.objects[0].analogShowOuterRing=false;
    face.objects[0].analogShowHourTicks=false;
    canvas.reset();
    assert(renderWatchFace(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(canvas.lineColors.size()==2);
    assert(std::count(canvas.calls.begin(),canvas.calls.end(),"circle")==0);

    // The two controls are independent: keep hour ticks without the outer ring.
    face.objects[0].analogShowHourTicks=true;
    canvas.reset();
    assert(renderWatchFace(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(canvas.lineColors.size()==14);
    assert(std::count(canvas.calls.begin(),canvas.calls.end(),"circle")==0);

    // An analog redraw that fails in a later overlapping layer must remain
    // retryable. The next successful frame must redraw the clock region and
    // then seed the hand cache only after all intersecting layers succeed.
    face=baseFace(); face.objectCount=2; face.assetCount=1;
    face.objects[0]=baseObject(FaceElementType::AnalogClock,"analog-retry");
    face.objects[0].transform.x=70; face.objects[0].transform.y=70;
    face.objects[0].transform.width=100; face.objects[0].transform.height=100;
    face.objects[0].transform.zIndex=0;
    face.objects[1]=baseObject(FaceElementType::Image,"analog-overlay");
    face.objects[1].transform.x=70; face.objects[1].transform.y=70;
    face.objects[1].transform.width=100; face.objects[1].transform.height=100;
    face.objects[1].transform.zIndex=1;
    for(size_t i=0;i<10;++i)face.objects[1].assetId[i]="test-image"[i];
    for(size_t i=0;i<10;++i)face.assets[0].id[i]="test-image"[i];
    face.assets[0].width=100; face.assets[0].height=100;
    timeInfo.tm_hour=13; timeInfo.tm_min=5; timeInfo.tm_sec=9;
    imageDrawSucceeds=true;
    canvas.reset();
    assert(renderWatchFace(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    timeInfo.tm_sec=10;
    imageDrawSucceeds=false;
    canvas.reset();
    assert(renderWatchFaceDynamic(face,timeInfo,0,weather)==FaceRenderStatus::AssetReadFailed);
    imageDrawSucceeds=true;
    canvas.reset();
    assert(renderWatchFaceDynamic(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(canvas.clipCalls>1 && canvas.clipCalls==canvas.resetCalls);
    assert(canvas.allClipRowsOne);
    assert(std::find(canvas.calls.begin(), canvas.calls.end(), "image-mask") != canvas.calls.end());
    canvas.reset();
    assert(renderWatchFaceDynamic(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(canvas.calls.empty());
    timeInfo.tm_sec=9;

    // Shape outline width is rendered as multiple nested strokes, not
    // silently collapsed to the DisplayCanvas one-pixel primitive.
    face=baseFace(); face.objectCount=1;
    face.objects[0]=baseObject(FaceElementType::Shape,"wide-outline");
    face.objects[0].transform.x=40; face.objects[0].transform.y=40;
    face.objects[0].transform.width=80; face.objects[0].transform.height=60;
    face.objects[0].shapeKind=0;
    face.objects[0].strokeWidth=4;
    face.objects[0].strokeColor=0xF800;
    canvas.reset();
    assert(renderWatchFace(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(std::count(canvas.calls.begin(),canvas.calls.end(),"rect")==4);

    face.objects[0].shapeKind=1;
    canvas.reset();
    assert(renderWatchFace(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(std::count(canvas.calls.begin(),canvas.calls.end(),"circle")==4);

    face.objects[0].shapeKind=2;
    canvas.reset();
    assert(renderWatchFace(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(std::count(canvas.calls.begin(),canvas.calls.end(),"round")==4);

    face.objects[0].shapeKind=3;
    face.objects[0].transform.x=20;
    face.objects[0].transform.y=30;
    face.objects[0].transform.width=90;
    face.objects[0].transform.height=5;
    canvas.reset();
    assert(renderWatchFace(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(std::count(canvas.calls.begin(),canvas.calls.end(),"line")==0);
    assert(canvas.fillRectCalls.size()==1);
    assert(canvas.fillRectCalls[0].x==20 && canvas.fillRectCalls[0].y==30);
    assert(canvas.fillRectCalls[0].w==91 && canvas.fillRectCalls[0].h==5);
    assert(canvas.fillRectCalls[0].color==face.objects[0].fillColor);

    // -------------------- PARAMETRIC WAVE RENDERER TESTS --------------------
    face=baseFace(); face.objectCount=1;
    face.objects[0]=baseObject(FaceElementType::Wave,"water-wave");
    face.objects[0].transform.x=18; face.objects[0].transform.y=64;
    face.objects[0].transform.width=204; face.objects[0].transform.height=112;
    face.objects[0].transform.zIndex=1;
    face.objects[0].wave={6,12,0.8f,0.75f,0.0f,0x126C,0x3B8F,160,true};
    canvas.reset();
    assert(validateFaceModelForRenderer(face)==FaceRenderStatus::Ok);
    assert(renderWatchFace(face,timeInfo,0,weather)==FaceRenderStatus::Ok);
    assert(std::count(canvas.calls.begin(),canvas.calls.end(),"line")==72);

    // The wave object is dynamic, but its own updateMs gate avoids repainting
    // the complete wave grid on every 40 ms clock interpolation pass.
    canvas.reset();
    assert(renderWatchFaceDynamic(face,timeInfo,80,weather)==FaceRenderStatus::Ok);
    assert(canvas.calls.empty());
    canvas.reset();
    assert(renderWatchFaceDynamic(face,timeInfo,160,weather)==FaceRenderStatus::Ok);
    assert(std::count(canvas.calls.begin(),canvas.calls.end(),"line")==72);

    // Invalid in-memory models are rejected even if they bypass the JSON parser.
    face.objects[0].wave.segments=25;
    assert(validateFaceModelForRenderer(face)==FaceRenderStatus::UnsupportedTransform);
    std::cout << "WFS Face renderer host tests passed.\n";
    return 0;
}
