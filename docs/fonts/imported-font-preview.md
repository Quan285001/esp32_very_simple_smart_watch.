# Imported fonts in Web Face Studio

## Current behavior

- Web Face Studio can import local `.ttf`, `.otf`, `.woff`, and `.woff2` files up to 2 MiB each.
- Imported font bytes are stored in the browser's IndexedDB font store and restored as browser `FontFace` objects on the next load.
- Imported families are selectable in text, digital-clock, date, and weather previews.
- The font import path is preview-only. WFS1 and the current ESP32 renderer still use the firmware's built-in 6×8 glyph path. Upload preflight remains responsible for rejecting unsupported font families; no custom-font upload is claimed.
- Portable project export explicitly blocks designs using imported fonts rather than silently dropping the font and producing a different preview on another browser.

## Next implementation gate

The device path requires a separately versioned package encoding for monochrome/RGB565 glyph atlases plus bounded glyph metrics, firmware-side storage lookup, clipping and dirty-region integration. WFS1 image assets must not be overloaded with font data.

## Limits

- 12 imported font files per browser profile.
- 2 MiB per font file.
- Font data is local to the browser profile and is not synced to the watch.
