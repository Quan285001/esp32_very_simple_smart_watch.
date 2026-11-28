from html.parser import HTMLParser
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

class AssetParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets = []
        self.ids = set()
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag == "script" and attrs.get("src"):
            self.assets.append(attrs["src"].split("?", 1)[0].split("#", 1)[0])
        if tag == "link" and attrs.get("rel") == "stylesheet" and attrs.get("href"):
            self.assets.append(attrs["href"].split("?", 1)[0].split("#", 1)[0])

parser = AssetParser()
parser.feed(INDEX.read_text(encoding="utf-8"))
errors = []
for asset in parser.assets:
    if asset.startswith(("http://", "https://")):
        continue
    if not (ROOT / asset).is_file():
        errors.append(f"Missing frontend asset: {asset}")
required_ids = {"watchCanvas", "quickAddSelect", "quickAddBtn", "objectList", "inspector", "templateGrid", "libraryGrid", "connectBtn", "saveBtn", "exportBtn", "importBtn", "imageInput", "jsonInput", "designName", "bgColor", "toast", "legacyStatus", "syncTimeBtn", "syncWeatherBtn", "sleepWatchBtn", "sendLocationBtn", "scanWifiBtn", "saveWifiBtn", "saveAutoSleepBtn", "templateFilters", "undoBtn", "redoBtn", "themeLight", "themeDark", "themeSystem", "languageSelect", "autoSaveToggle", "deviceProfileDialog", "profilePresetSelect", "profileName", "profileWidth", "profileHeight", "profileShape", "profileRotation", "profileColorFormat", "profileScaleStrategy", "profileCompatibilityStatus", "profileExportBtn", "profileImportBtn", "profileImportInput", "studioFaceGrid", "studioSelectedCanvas", "studioBackBtn", "studioBgColor", "studioSunburst", "studioVignette", "studioImageInput", "studioImageControls", "studioDim", "studioClearImage", "studioResetBg", "templateSaveBtn", "templateUploadBtn", "templateCompatibilityNote", "studioDeviceNav", "studioDeviceMobileNav", "backToStudio"}
missing = sorted(required_ids - parser.ids)
if missing:
    errors.append("Missing required UI ids: " + ", ".join(missing))
if not (ROOT / "shared/schemas/watch-face.schema.json").is_file():
    errors.append("Shared watch-face schema is missing")

catalog_js = (ROOT / "web/watch-face-catalog.js").read_text(encoding="utf-8")
studio_js = (ROOT / "web/template-studio.js").read_text(encoding="utf-8")
original_renderer_js = catalog_js.split("/* === Extended 20 template renderers === */")[0]
extended_renderer_js = catalog_js.split("/* === Extended 20 template renderers === */")[1].split("/* === WFS v1 preset artwork")[0]
preset_js = catalog_js.split("/* === WFS v1 preset artwork")[1]
renderer_ids = re.findall(r"id: '([^']+)',\s*category:", original_renderer_js)
preset_ids = re.findall(r"\{id:'([^']+)',category:", preset_js)
if len(renderer_ids) != 8 or len(set(renderer_ids)) != 8:
    errors.append("Template renderer must define exactly eight unique watch faces")
if set(renderer_ids) != set(preset_ids[:8]) or len(preset_ids) != 13:
    errors.append("The original eight Template renderers must remain aligned with the WFS preset catalog")
reference_preset_ids = [preset_id for preset_id in preset_ids if preset_id.startswith('ref-')]
if set(reference_preset_ids) != {"ref-classic-12", "ref-chronometer-gmt", "ref-split-dual-digit", "ref-minimal-arc"} or len(reference_preset_ids) != 4:
    errors.append("The four reference-aligned WFS presets must be registered exactly once")
if preset_ids.count("m13") != 1:
    errors.append("The Clean Large Digital extended template must have exactly one WFS1 adapter")
extended_ids = re.findall(r"id: '([^']+)',\s*category:", extended_renderer_js)
if len(extended_ids) != 20 or len(set(extended_ids)) != 20 or set(extended_ids) != {f"m{i:02d}" for i in range(1, 21)}:
    errors.append("Extended renderer must define all 20 unique Gemini template ids")
if "window.WfsExtendedTemplateFaces" not in extended_renderer_js or "renderFace: renderFaceToCanvas" not in extended_renderer_js:
    errors.append("Extended Template Face renderer API is missing")
if "window.WfsTemplateFaces" not in original_renderer_js or "renderFace: renderFaceToCanvas" not in original_renderer_js:
    errors.append("Template Face renderer API is missing")
if "window.addEventListener('wfs:ready',init,{once:true})" not in studio_js:
    errors.append("Template Studio must initialize after the shared WFS runtime is ready")
if not any(asset.endswith("watch-face-catalog.js") for asset in parser.assets) or not any(asset.endswith("template-studio.js") for asset in parser.assets) or not any(asset.endswith("template-studio.css") for asset in parser.assets):
    errors.append("Unified Watch Face Catalog and Template Studio assets must be loaded by index.html")

app_js = (ROOT / "web/app.js").read_text(encoding="utf-8")
font_match = re.search(r"const TFT_FONT1_GLYPHS='([0-9a-f]+)'", app_js)
if not font_match or len(font_match.group(1)) != 2560:
    errors.append("Firmware GLCD font table must contain all 256 five-byte glyphs")
if "function setPreviewText(element,text,style,boxSize)" not in app_js:
    errors.append("Web text preview renderer is missing")
if "loadPreviewFont(style.fontFamily||'system-ui')" not in app_js:
    errors.append("Web text preview must load the selected font family")
if "glyph.textContent=String(text??'')" not in app_js:
    errors.append("Web text preview must render the selected text content")
if "fontSize:((Number(style.fontSize)||16)/Math.max(1,Number(state.design?.canvas?.width)||240)*100)+'cqw'" not in app_js:
    errors.append("Web text preview font size must scale against the active canvas width")
if "setPreviewText(el,objectText(o),s,t)" not in app_js:
    errors.append("Text preview must use the firmware-rounded object dimensions")
if "renderWeatherPreview(el,o,s,t)" not in app_js:
    errors.append("Weather preview must use the firmware object geometry")

if "function renderCanvas()" not in app_js or "state.design.canvas.width" not in app_js or "state.design.canvas.height" not in app_js:
    errors.append("Canvas rendering must use the active Device Profile dimensions")
if "roundFirmwarePixel(t.x)/width*100" not in app_js or "roundFirmwarePixel(t.y)/height*100" not in app_js:
    errors.append("Canvas object placement must be normalized against profile width and height")
if "logicalWidth/Math.max(1,canvas.clientWidth)" not in app_js or "logicalHeight/Math.max(1,canvas.clientHeight)" not in app_js:
    errors.append("Pointer dragging must convert screen coordinates using the active canvas dimensions")
if "$('#deviceSettings').onclick=openDeviceProfileDialog" not in app_js:
    errors.append("The Device Profile control must open the profile editor, not show a device identity toast")
if "function applyDeviceProfile()" not in app_js or "WFSDeviceProfile.migrateObjects" not in app_js:
    errors.append("Applying a profile must run the selected coordinate migration strategy")
if not any(asset.endswith("device-profile.js") for asset in parser.assets):
    errors.append("The shared Device Profile editor module must load before the application")

if "const WFS_FIRMWARE_DISPLAY=Object.freeze({width:240,height:240,centerX:120,centerY:120,radius:120})" not in app_js or "WFS_FIRMWARE_DISPLAY;" not in app_js or "cx*cx+cy*cy>=radius*radius" not in app_js:
    errors.append("Upload image raster must be bounded by the circular 240px display aperture")
if "if(px+0.5<drawX||px+0.5>=drawX+drawWidth" not in app_js:
    errors.append("Upload crop must exclude pixels outside the fitted image bounds")
if "return {x:left,y:top,width:outputWidth,height:outputHeight,bytes}" not in app_js:
    errors.append("Upload image asset must use the cropped visible-pixel bounds")

if errors:
    print("\n".join("ERROR: " + e for e in errors))
    sys.exit(1)
print(f"Web smoke check passed: {len(parser.ids)} UI ids and {len(parser.assets)} referenced assets.")
