(function(){
'use strict';

  const LOGICAL_SIZE = 240;
  const RENDER_SCALE = 2;
  const W = LOGICAL_SIZE * RENDER_SCALE; // 480
  const H = LOGICAL_SIZE * RENDER_SCALE; // 480
  const CX = W / 2; // 240
  const CY = H / 2; // 240
  const R = W / 2;  // 240

  const state = {
    filter: 'all',
    overrideBgColor: null,
    sunburstEnabled: true,
    vignetteEnabled: true,
    customBgImage: null,
    bgDimPercent: 40
  };

  function adjustHexBrightness(hex, percent) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
    const amt = Math.round(2.55 * percent);
    const r = Math.min(255, Math.max(0, (num >> 16) + amt));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  function isLightColor(hex) {
    const clean = (hex || '#08101e').replace('#', '');
    const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.62;
  }

  function drawDialBase(ctx, defaultColor, customPainter = null) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.clip();

    if (state.customBgImage) {
      const img = state.customBgImage;
      const scale = Math.max(W / img.width, H / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.drawImage(img, CX - drawW / 2, CY - drawH / 2, drawW, drawH);

      ctx.fillStyle = `rgba(0, 0, 0, ${state.bgDimPercent / 100})`;
      ctx.fillRect(0, 0, W, H);
    } else if (typeof customPainter === 'function' && !state.overrideBgColor) {
      customPainter(ctx);
      if (state.vignetteEnabled) {
        const vig = ctx.createRadialGradient(CX, CY, R * 0.3, CX, CY, R);
        vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vig.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
      }
    } else {
      const baseHex = state.overrideBgColor || defaultColor;
      ctx.fillStyle = baseHex;
      ctx.fillRect(0, 0, W, H);

      if (state.sunburstEnabled) {
        const conic = ctx.createConicGradient(0, CX, CY);
        const light = adjustHexBrightness(baseHex, 24);
        const dark = adjustHexBrightness(baseHex, -14);
        conic.addColorStop(0.00, dark);
        conic.addColorStop(0.16, light);
        conic.addColorStop(0.34, dark);
        conic.addColorStop(0.54, light);
        conic.addColorStop(0.74, dark);
        conic.addColorStop(0.90, light);
        conic.addColorStop(1.00, dark);
        ctx.fillStyle = conic;
        ctx.fillRect(0, 0, W, H);
      }

      if (state.vignetteEnabled) {
        const vig = ctx.createRadialGradient(CX, CY, R * 0.25, CX, CY, R);
        vig.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
        vig.addColorStop(0.75, 'rgba(0, 0, 0, 0.14)');
        vig.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
      }
    }

    ctx.restore();
  }

  // Shared hand helpers
  function drawSimpleHand(ctx, angle, len, tail, width, color, capRadius = 0) {
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(angle);
    ctx.lineCap = capRadius > 0 ? 'round' : 'butt';
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(-tail, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();
    if (capRadius > 0) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, capRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTaperedHand(ctx, angle, len, tail, baseW, tipW, color) {
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-tail, -tipW * 0.6);
    ctx.quadraticCurveTo(18, -baseW, len, -tipW * 0.5);
    ctx.lineTo(len, tipW * 0.5);
    ctx.quadraticCurveTo(18, baseW, -tail, tipW * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawDiamondFrameHand(ctx, angle, len, tail, color) {
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-tail, 0);
    ctx.lineTo(len * 0.35, -11);
    ctx.lineTo(len * 0.68, 0);
    ctx.lineTo(len * 0.35, 11);
    ctx.closePath();
    ctx.moveTo(len * 0.68, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawSkeletonLeafHand(ctx, angle, len, tail, color) {
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-tail, 0);
    ctx.quadraticCurveTo(len * 0.42, -16, len, 0);
    ctx.quadraticCurveTo(len * 0.42, 16, -tail, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawPointedContrastHand(ctx, angle, len, tail, lightColor, darkColor) {
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(angle);

    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.moveTo(-tail * 0.6, 0);
    ctx.lineTo(28, -9);
    ctx.lineTo(len, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.moveTo(-tail * 0.6, 0);
    ctx.lineTo(28, 9);
    ctx.lineTo(len, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 1. Digital Bold Slim (09 07)
  function renderM01DigitalBoldSlim(ctx, t, opts = {}) {
    const accent = opts.accent || '#a3e635';
    drawDialBase(ctx, '#060709');
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 22px "Inter", sans-serif';
    ctx.fillText(`${t.monthShort} ${t.day} · ${t.year}`, CX, 78);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 3.2;
    ctx.font = '300 124px "Inter", sans-serif';
    ctx.strokeText(t.hh, 142, 244);
    ctx.strokeText(t.mm, 340, 244);

    ctx.fillStyle = accent;
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.fillText(`${t.weekdayShort.toUpperCase()} · :${t.ss}`, CX, 376);
    ctx.restore();
  }

  // 2. Gradient Minimal Analog
  function renderM02GradientMinimal(ctx, t, opts = {}) {
    const secColor = opts.secColor || '#ef4444';
    drawDialBase(ctx, '#4f46e5', (c) => {
      const g = c.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#5b5ce6');
      g.addColorStop(0.55, '#4b83c8');
      g.addColorStop(1, '#3da5b8');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    });

    for (let i = 0; i < 60; i++) {
      const a = (i * 6 - 90) * Math.PI / 180;
      const isHour = i % 5 === 0;
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(a);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(R - (isHour ? 18 : 12), -1.3, isHour ? 12 : 7, 2.6);
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '500 26px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const evenNums = [12, 2, 4, 6, 8, 10];
    evenNums.forEach((num, idx) => {
      const rad = ((idx * 60) - 90) * Math.PI / 180;
      ctx.fillText(String(num), CX + Math.cos(rad) * (R - 58), CY + Math.sin(rad) * (R - 58));
    });
    ctx.restore();

    drawSimpleHand(ctx, t.hAngle, 118, 22, 8, '#ffffff', 10);
    drawSimpleHand(ctx, t.mAngle, 168, 26, 6, '#ffffff', 8);
    drawSimpleHand(ctx, t.sAngle, 198, 36, 3, secColor, 6);
  }

  // 3. Dark High-Contrast Minimal
  function renderM03DarkHighContrast(ctx, t, opts = {}) {
    const secColor = opts.secColor || '#ef4444';
    drawDialBase(ctx, '#050608');

    for (let i = 0; i < 60; i++) {
      const a = (i * 6 - 90) * Math.PI / 180;
      const isCardinal = i % 15 === 0;
      const isHour = i % 5 === 0;
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(a);
      ctx.fillStyle = isCardinal ? '#f8fafc' : (isHour ? '#cbd5e1' : 'rgba(148,163,184,0.45)');
      ctx.fillRect(R - (isCardinal ? 38 : 16), -1.5, isCardinal ? 34 : (isHour ? 12 : 6), 3);
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 22px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${t.weekdayShort.toUpperCase()}, ${t.monthShort.toUpperCase()} ${t.day}`, CX, CY + 96);
    ctx.restore();

    drawSimpleHand(ctx, t.hAngle, 116, 18, 8, '#f8fafc', 8);
    drawSimpleHand(ctx, t.mAngle, 174, 22, 6.5, '#f8fafc', 7);
    drawSimpleHand(ctx, t.sAngle, 204, 38, 2.8, secColor, 5);
  }

  // 4. Minimal Tick & Line
  function renderM04MinimalTickLine(ctx, t, opts = {}) {
    const accent = opts.accent || '#ef4444';
    drawDialBase(ctx, '#060709');

    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(CX, CY, R - 6, 0, Math.PI * 2);
    ctx.stroke();

    for (let h = 0; h < 12; h++) {
      const a = (h * 30 - 90) * Math.PI / 180;
      const isCard = h % 3 === 0;
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(a);
      ctx.fillStyle = isCard ? '#94a3b8' : '#475569';
      ctx.fillRect(R - 46, -2, isCard ? 34 : 24, 4);
      ctx.restore();
    }
    ctx.restore();

    drawSimpleHand(ctx, t.hAngle, 114, 14, 5.5, '#f8fafc', 6);
    drawSimpleHand(ctx, t.mAngle, 168, 18, 4, '#e2e8f0', 5);
    drawSimpleHand(ctx, t.sAngle, 188, 24, 2.2, accent, 4);
  }

  // 5. Tapered Hand & Orange Second
  function renderM05TaperedOrangeSecond(ctx, t, opts = {}) {
    const accent = opts.accent || '#ea580c';
    drawDialBase(ctx, '#050608');

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '700 25px "Inter", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(t.weekdayShort.toUpperCase(), 316, CY + 4);
    ctx.fillStyle = accent;
    ctx.fillText(String(t.day).padStart(2, '0'), 376, CY + 4);
    ctx.restore();

    drawTaperedHand(ctx, t.hAngle, 126, 18, 13, 5, '#e2e8f0');
    drawTaperedHand(ctx, t.mAngle, 182, 22, 11, 4, '#f8fafc');
    drawSimpleHand(ctx, t.sAngle, 206, 36, 3.2, accent, 8);
  }

  // 6. Field / Diamond Hand Hybrid
  function renderM06DiamondHandHybrid(ctx, t, opts = {}) {
    const accent = opts.accent || '#cbd5e1';
    drawDialBase(ctx, '#050608');

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 22px "Inter", sans-serif';
    for (let h = 1; h <= 12; h++) {
      const a = (h * 30 - 90) * Math.PI / 180;
      ctx.fillText(String(h), CX + Math.cos(a) * (R - 22), CY + Math.sin(a) * (R - 22));
    }

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 26px "Inter", sans-serif';
    ctx.fillText(`${t.weekdayShort.toUpperCase()} ${t.day}`, CX, 134);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.fillText(`${t.hh}:${t.mm}`, CX, 166);
    ctx.restore();

    drawDiamondFrameHand(ctx, t.hAngle, 124, 18, accent);
    drawDiamondFrameHand(ctx, t.mAngle, 172, 22, '#f8fafc');
    drawSimpleHand(ctx, t.sAngle, 186, 34, 2.2, '#e2e8f0', 6);
  }

  // 7. Dress Date & Moon Accent
  function renderM07DressMoonAccent(ctx, t, opts = {}) {
    const moonColor = opts.moonColor || '#e2e8f0';
    drawDialBase(ctx, '#060709');

    for (let i = 0; i < 60; i++) {
      const a = (i * 6 - 90) * Math.PI / 180;
      const isCard = i % 15 === 0;
      const isHour = i % 5 === 0;
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(a);
      ctx.fillStyle = isCard ? '#cbd5e1' : (isHour ? '#64748b' : 'rgba(100,116,139,0.35)');
      ctx.fillRect(R - (isCard ? 28 : 14), -1.5, isCard ? 24 : 8, 3);
      ctx.restore();
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '400 26px "Inter", sans-serif';
    ctx.fillText(`${t.weekdayLong} ${t.day}`, CX, 124);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '500 25px "Inter", sans-serif';
    ctx.fillText(`${t.hh12}:${t.mm} ${t.ampm}`, CX, 158);

    // Moon phase emblem
    ctx.save();
    ctx.translate(CX, 344);
    ctx.strokeStyle = moonColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = moonColor;
    ctx.beginPath();
    ctx.arc(0, 0, 34, -Math.PI / 2, Math.PI / 2);
    ctx.ellipse(0, 0, 14, 34, 0, Math.PI / 2, -Math.PI / 2, true);
    ctx.fill();
    ctx.restore();
    ctx.restore();

    drawPointedContrastHand(ctx, t.hAngle, 118, 18, '#f8fafc', '#1e293b');
    drawPointedContrastHand(ctx, t.mAngle, 174, 22, '#f8fafc', '#1e293b');
    drawSimpleHand(ctx, t.sAngle, 202, 42, 2.5, '#e2e8f0', 7);
  }

  // 8. Violet Second & Offset Index
  function renderM08VioletOffsetIndex(ctx, t, opts = {}) {
    const accent = opts.accent || '#a855f7';
    drawDialBase(ctx, '#050608');

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accent;
    ctx.font = '700 56px "Inter", sans-serif';
    ctx.fillText(`- ${t.day}`, 368, CY + 6);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 28px "Inter", sans-serif';
    ctx.fillText(`${t.hh}:${t.mm}`, CX, 314);
    ctx.restore();

    drawSimpleHand(ctx, t.hAngle, 108, 22, 6, '#f8fafc', 0);
    drawSimpleHand(ctx, t.mAngle, 162, 26, 5, '#f8fafc', 0);
    drawSimpleHand(ctx, t.sAngle, 212, 46, 5.5, accent, 10);

    ctx.save();
    ctx.fillStyle = '#050608';
    ctx.beginPath();
    ctx.arc(CX, CY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 9. Blue Notch & Round Badge
  function renderM09BlueNotchBadge(ctx, t, opts = {}) {
    const accent = opts.accent || '#38bdf8';
    drawDialBase(ctx, '#050608');

    for (let h = 0; h < 12; h++) {
      const a = (h * 30 - 90) * Math.PI / 180;
      const isCard = h % 3 === 0;
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(a);
      ctx.fillStyle = isCard ? accent : '#94a3b8';
      ctx.fillRect(R - 18, -2, 16, 4);
      ctx.restore();
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#64748b';
    ctx.font = '400 32px "Inter", sans-serif';
    ctx.fillText('9', 48, CY + 2);
    ctx.fillText('3', W - 48, CY + 2);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 24px "Inter", sans-serif';
    ctx.fillText(`${t.hh}:${t.mm}`, CX, 68);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '500 26px "Inter", sans-serif';
    ctx.fillText(String(t.day), CX, 106);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 24px "Inter", sans-serif';
    ctx.fillText(t.weekdayShort, CX, 174);

    // Lower circular badge
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(CX, 358, 66, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = '500 24px "Inter", sans-serif';
    ctx.fillText(`${t.monthShort.toUpperCase()} ${t.year}`, CX, 342);
    ctx.font = '700 20px "JetBrains Mono", monospace';
    ctx.fillText(`${t.ss}s`, CX, 376);
    ctx.restore();

    drawSimpleHand(ctx, t.hAngle, 114, 16, 9, '#f8fafc', 7);
    drawSimpleHand(ctx, t.mAngle, 168, 20, 5, '#f8fafc', 5);
  }

  // 10. Minute Track & Pill Date
  function renderM10MinuteTrackPill(ctx, t, opts = {}) {
    const pillColor = opts.pillColor || '#93a5f8';
    drawDialBase(ctx, '#050608');

    for (let i = 0; i < 60; i++) {
      const a = (i * 6 - 90) * Math.PI / 180;
      const isHour = i % 5 === 0;
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(a);
      ctx.fillStyle = isHour ? '#cbd5e1' : '#64748b';
      ctx.fillRect(R - (isHour ? 24 : 16), -1.5, isHour ? 12 : 8, 3);
      ctx.restore();
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 18px "Inter", sans-serif';
    for (let m = 5; m <= 60; m += 5) {
      const deg = m * 6;
      const rad = (deg - 90) * Math.PI / 180;
      ctx.save();
      ctx.translate(CX + Math.cos(rad) * (R - 44), CY + Math.sin(rad) * (R - 44));
      ctx.rotate(deg * Math.PI / 180);
      ctx.fillStyle = m % 15 === 0 ? pillColor : '#e2e8f0';
      ctx.fillText(String(m), 0, 0);
      ctx.restore();
    }

    // Pill date badge
    ctx.fillStyle = pillColor;
    ctx.beginPath();
    ctx.roundRect(CX - 34, 96, 68, 38, 19);
    ctx.fill();

    ctx.fillStyle = '#090d16';
    ctx.font = '700 24px "Inter", sans-serif';
    ctx.fillText(String(t.day).padStart(2, '0'), CX, 116);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 24px "Inter", sans-serif';
    ctx.fillText(t.weekdayShort, CX, 158);

    // Large HH:MM
    ctx.fillStyle = '#f8fafc';
    ctx.font = '400 112px "Inter", sans-serif';
    ctx.fillText(`${t.hh}:${t.mm}`, CX, 254);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 20px "JetBrains Mono", monospace';
    ctx.fillText(`${t.monthShort.toUpperCase()} ${t.year} · :${t.ss}`, CX, 336);
    ctx.restore();
  }

  // 11. Elements Water (Guilloché & Metal Batons)
  function renderM11ElementsWater(ctx, t) {
    drawDialBase(ctx, '#091826', (c) => {
      const g = c.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#0a1929');
      g.addColorStop(0.5, '#132a42');
      g.addColorStop(1, '#08131f');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);

      c.strokeStyle = 'rgba(125, 211, 252, 0.08)';
      c.lineWidth = 3;
      for (let y = 30; y < H - 20; y += 16) {
        c.beginPath();
        for (let x = 20; x <= W - 20; x += 20) {
          const wy = y + Math.sin((x + y) * 0.035) * 7;
          if (x === 20) c.moveTo(x, wy);
          else c.lineTo(x, wy);
        }
        c.stroke();
      }
    });

    for (let h = 0; h < 12; h++) {
      const a = (h * 30 - 90) * Math.PI / 180;
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(a);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(R - 54, -5, 28, 10);
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(CX - 114, CY + 12, 42, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(CX, CY + 122, 54, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(248, 250, 252, 0.65)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(CX + 114, CY - 22, 66, 44, 10);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 24px "Inter", sans-serif';
    ctx.fillText(String(t.day), CX + 147, CY + 1);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.fillText(`${t.monthShort.toUpperCase()} ${t.year}`, CX, CY - 92);
    ctx.fillText(t.weekdayShort.toUpperCase(), CX - 114, CY + 13);
    ctx.fillText(`${t.hh}:${t.mm}:${t.ss}`, CX, CY + 124);
    ctx.restore();

    drawSwordHand(ctx, t.hAngle, 120, 20, 12, '#f1f5f9', '#94a3b8');
    drawSwordHand(ctx, t.mAngle, 174, 24, 9.5, '#f8fafc', '#cbd5e1');
    drawSimpleHand(ctx, t.sAngle, 198, 36, 2.5, '#e2e8f0', 6);
  }

  // 12. Elements Air (Mother-of-Pearl & Blued Steel)
  function renderM12ElementsAir(ctx, t) {
    drawDialBase(ctx, '#e8e6e1', (c) => {
      const g = c.createRadialGradient(CX - 60, CY - 60, 20, CX, CY, R);
      g.addColorStop(0, '#faf8f5');
      g.addColorStop(0.55, '#e7e3dc');
      g.addColorStop(1, '#cfc9be');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    });

    for (let h = 0; h < 12; h++) {
      const a = (h * 30 - 90) * Math.PI / 180;
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(a);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(R - 54, -5, 28, 10);
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(30, 58, 138, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(CX - 114, CY + 12, 42, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(CX, CY + 122, 54, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(30, 58, 138, 0.55)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(CX + 114, CY - 22, 66, 44, 10);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1e3a8a';
    ctx.font = '700 24px "Inter", sans-serif';
    ctx.fillText(String(t.day), CX + 147, CY + 1);
    ctx.fillStyle = '#334155';
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.fillText(`${t.monthShort.toUpperCase()} ${t.year}`, CX, CY - 92);
    ctx.fillText(t.weekdayShort.toUpperCase(), CX - 114, CY + 13);
    ctx.fillText(`${t.hh}:${t.mm}:${t.ss}`, CX, CY + 124);
    ctx.restore();

    drawSwordHand(ctx, t.hAngle, 120, 20, 12, '#1e3a8a', '#3b82f6');
    drawSwordHand(ctx, t.mAngle, 174, 24, 9.5, '#1e3a8a', '#60a5fa');
    drawSimpleHand(ctx, t.sAngle, 198, 36, 2.5, '#1d4ed8', 6);
  }

  // 13. Clean Large Digital (10:00)
  function renderM13CleanLargeDigital(ctx, t, opts = {}) {
    const accent = opts.accent || '#38bdf8';
    drawDialBase(ctx, '#050608');

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 24px "Inter", sans-serif';
    ctx.fillText(`${t.weekdayShort.toUpperCase()} ${t.day} ${t.monthShort.toUpperCase()}`, CX, 138);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '400 108px "Inter", sans-serif';
    ctx.fillText(`${t.hh}:${t.mm}`, CX, 242);

    ctx.fillStyle = accent;
    ctx.font = '600 24px "JetBrains Mono", monospace';
    ctx.fillText(`${t.year} · :${t.ss}`, CX, 336);
    ctx.restore();
  }

  // 14. Tall 12 & Red Dot Second
  function renderM14Tall12RedDot(ctx, t, opts = {}) {
    const dotColor = opts.dotColor || '#ef4444';
    drawDialBase(ctx, '#050608');

    for (let h = 0; h < 12; h++) {
      if (h === 0) continue;
      const a = (h * 30 - 90) * Math.PI / 180;
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(a);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(R - 64, -1.5, 14, 3);
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '200 78px "Oswald", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('12', CX, 114);
    ctx.restore();

    drawSimpleHand(ctx, t.hAngle, 114, 24, 3, '#cbd5e1', 0);
    drawSimpleHand(ctx, t.mAngle, 174, 30, 3, '#f8fafc', 0);

    // Second hand with dot near tip
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(t.sAngle);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-42, 0);
    ctx.lineTo(192, 0);
    ctx.stroke();

    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(154, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 15. Amber Sweep & Side Readouts
  function renderM15AmberSweepSide(ctx, t, opts = {}) {
    const accent = opts.accent || '#d97706';
    drawDialBase(ctx, '#2b2d30');

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(CX, CY, R - 10, -0.35, 0.55);
    ctx.stroke();

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(CX, CY, R - 10, 0.15, 0.55);
    ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 22px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${t.weekdayShort}, ${t.monthShort} ${t.day}`, 74, CY + 2);

    ctx.textAlign = 'right';
    ctx.fillText(`${t.hh12}:${t.mm} ${t.ampm}`, W - 74, CY + 2);
    ctx.restore();

    drawSimpleHand(ctx, t.hAngle, 118, 16, 7, '#f8fafc', 0);
    drawSimpleHand(ctx, t.mAngle, 174, 20, 6, '#f8fafc', 0);

    // Amber second hand with tail ring
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(t.sAngle);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-42, 0);
    ctx.lineTo(206, 0);
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-52, 0, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 16. Crimson Night Digital (10:12)
  function renderM16CrimsonNightDigital(ctx, t, opts = {}) {
    const red = opts.red || '#ef4444';
    drawDialBase(ctx, '#050608');

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = red;
    ctx.font = '700 62px "Inter", sans-serif';
    ctx.fillText(`${t.hh}:${t.mm}`, CX, 112);

    ctx.font = '700 32px "Inter", sans-serif';
    ctx.fillText(`${t.day} ${t.monthShort.toUpperCase()}`, CX, 166);
    ctx.restore();

    drawSimpleHand(ctx, t.hAngle, 128, 28, 6, '#e2e8f0', 0);
    drawSimpleHand(ctx, t.mAngle, 184, 34, 6, '#f8fafc', 0);

    ctx.save();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(CX, CY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(CX, CY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 17. Light Cream & Rust Second
  function renderM17LightCreamRust(ctx, t, opts = {}) {
    const rust = opts.rust || '#c25928';
    drawDialBase(ctx, '#f6f3ec');

    ctx.save();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CX, CY, R - 34, 0, Math.PI * 2);
    ctx.stroke();

    const dots = [
      [CX, 40],
      [CX, H - 40],
      [40, CY],
      [W - 40, CY]
    ];
    ctx.fillStyle = '#0f172a';
    dots.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#475569';
    ctx.font = '500 24px "Inter", sans-serif';
    ctx.fillText(`${t.hh}:${t.mm}`, 326, CY - 14);
    ctx.fillStyle = '#b45309';
    ctx.font = '500 19px "Inter", sans-serif';
    ctx.fillText(`${t.monthShort} ${t.day}`, 326, CY + 16);
    ctx.restore();

    drawSimpleHand(ctx, t.hAngle, 118, 22, 10, '#18181b', 0);
    drawSimpleHand(ctx, t.mAngle, 178, 26, 7, '#18181b', 0);
    drawSimpleHand(ctx, t.sAngle, 202, 46, 3.2, rust, 5);
  }

  // 18. Lime Sweep Minimal
  function renderM18LimeSweepMinimal(ctx, t, opts = {}) {
    const lime = opts.lime || '#a3e635';
    drawDialBase(ctx, '#050608');

    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CX, CY, R - 36, 0, Math.PI * 2);
    ctx.stroke();

    for (let h = 0; h < 12; h++) {
      const a = (h * 30 - 90) * Math.PI / 180;
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(CX + Math.cos(a) * (R - 36), CY + Math.sin(a) * (R - 36), 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 24px "Inter", sans-serif';
    ctx.fillText(`${t.hh}:${t.mm}`, CX, 316);
    ctx.restore();

    drawSimpleHand(ctx, t.hAngle, 122, 22, 12, '#f8fafc', 6);
    drawSimpleHand(ctx, t.mAngle, 176, 26, 8, '#f8fafc', 5);

    // Lime second hand with two dots
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(t.sAngle);
    ctx.strokeStyle = lime;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-42, 0);
    ctx.lineTo(204, 0);
    ctx.stroke();

    ctx.fillStyle = lime;
    ctx.beginPath();
    ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
    ctx.arc(-36, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 19. Skeleton Leaf Hands & Orange Sweep
  function renderM19SkeletonLeafOrange(ctx, t, opts = {}) {
    const orange = opts.orange || '#ea580c';
    drawDialBase(ctx, '#18191b');

    for (let h = 0; h < 12; h++) {
      const a = (h * 30 - 90) * Math.PI / 180;
      const isCard = h % 3 === 0;
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(a);
      ctx.fillStyle = isCard ? '#94a3b8' : '#475569';
      ctx.fillRect(R - (isCard ? 26 : 16), -2, isCard ? 20 : 10, 4);
      ctx.restore();
    }

    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 24px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(t.day), 86, CY + 2);
    ctx.textAlign = 'right';
    ctx.fillText(t.weekdayShort, W - 86, CY + 2);
    ctx.restore();

    drawSkeletonLeafHand(ctx, t.hAngle, 122, 18, '#e2e8f0');
    drawSkeletonLeafHand(ctx, t.mAngle, 178, 22, '#f1f5f9');

    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(t.sAngle);
    ctx.strokeStyle = orange;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-42, 0);
    ctx.lineTo(188, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(198, 0, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 20. Giant 10 & Amber Arc
  function renderM20Giant10AmberArc(ctx, t, opts = {}) {
    const amber = opts.amber || '#f59e0b';
    drawDialBase(ctx, '#141517');

    ctx.save();
    // Outer track
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(CX, CY, R - 18, 0, Math.PI * 2);
    ctx.stroke();

    // Amber arc (progress based on seconds)
    const progress = (t.secFloat / 60) * Math.PI * 2;
    ctx.strokeStyle = amber;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(CX, CY, R - 18, -Math.PI / 2, -Math.PI / 2 + progress);
    ctx.stroke();

    // Marker label "50" & white dot
    const dotAngle = (-Math.PI / 2) + progress;
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(CX + Math.cos(dotAngle) * (R - 18), CY + Math.sin(dotAngle) * (R - 18), 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = amber;
    ctx.font = '600 26px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(t.ss), 78, 144);

    // Giant HH in center
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '400 184px "Inter", sans-serif';
    ctx.fillText(t.hh, CX, CY + 8);

    // Subtle date & MM footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.fillText(`${t.weekdayShort.toUpperCase()} ${t.day} ${t.monthShort.toUpperCase()} · :${t.mm}`, CX, 388);
    ctx.restore();
  }

  function drawSwordHand(ctx, angle, len, tail, wid, bodyColor, lumeColor) {
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(angle);
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-tail, -wid * 0.45);
    ctx.lineTo(len * 0.72, -wid * 0.7);
    ctx.lineTo(len, 0);
    ctx.lineTo(len * 0.72, wid * 0.7);
    ctx.lineTo(-tail, wid * 0.45);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = lumeColor;
    ctx.beginPath();
    ctx.roundRect(14, -wid * 0.22, len * 0.58, wid * 0.44, 3);
    ctx.fill();
    ctx.restore();
  }

  const WATCH_FACES = [
    { id: 'm01', category: 'digital', title: '01. Digital Bold Slim', subtitle: 'Outline HH MM · Date & Sec', defaultBg: '#060709', render: renderM01DigitalBoldSlim },
    { id: 'm02', category: 'analog',  title: '02. Gradient Minimal', subtitle: 'Blue-Violet Dial · Red Sec', defaultBg: '#4f46e5', render: renderM02GradientMinimal },
    { id: 'm03', category: 'analog',  title: '03. Dark High-Contrast', subtitle: 'Cardinal Batons · Date', defaultBg: '#050608', render: renderM03DarkHighContrast },
    { id: 'm04', category: 'analog',  title: '04. Minimal Tick & Line', subtitle: 'Slim Hands · Clean Ticks', defaultBg: '#060709', render: renderM04MinimalTickLine },
    { id: 'm05', category: 'analog',  title: '05. Tapered Orange Sec', subtitle: 'Tapered Hands · Day Date', defaultBg: '#050608', render: renderM05TaperedOrangeSecond },
    { id: 'm06', category: 'analog',  title: '06. Diamond Hand Hybrid', subtitle: '1-12 Ring · Day & HH:MM', defaultBg: '#050608', render: renderM06DiamondHandHybrid },
    { id: 'm07', category: 'analog',  title: '07. Dress & Moon Accent', subtitle: 'Date & 12H · Moon Phase', defaultBg: '#060709', render: renderM07DressMoonAccent },
    { id: 'm08', category: 'analog',  title: '08. Violet Sweep & Offset', subtitle: 'Violet Hand · Day & HH:MM', defaultBg: '#050608', render: renderM08VioletOffsetIndex },
    { id: 'm09', category: 'analog',  title: '09. Blue Notch & Badge', subtitle: 'Blue Notches · Date Badge', defaultBg: '#050608', render: renderM09BlueNotchBadge },
    { id: 'm10', category: 'digital', title: '10. Minute Track & Pill', subtitle: '5-60 Track · Pill Day · HH:MM', defaultBg: '#050608', render: renderM10MinuteTrackPill },
    { id: 'm11', category: 'analog',  title: '11. Elements Water', subtitle: 'Wave Guilloché · Metal Batons', defaultBg: '#091826', render: renderM11ElementsWater },
    { id: 'm12', category: 'analog',  title: '12. Elements Air', subtitle: 'Pearl Dial · Blued Steel', defaultBg: '#e8e6e1', render: renderM12ElementsAir },
    { id: 'm13', category: 'digital', title: '13. Clean Large Digital', subtitle: 'Large HH:MM · Date & Year', defaultBg: '#050608', render: renderM13CleanLargeDigital },
    { id: 'm14', category: 'analog',  title: '14. Tall 12 & Red Dot', subtitle: 'Tall 12 · Red Dot Second', defaultBg: '#050608', render: renderM14Tall12RedDot },
    { id: 'm15', category: 'analog',  title: '15. Amber Sweep & Side', subtitle: 'Amber Ring Sec · Side Date/Time', defaultBg: '#2b2d30', render: renderM15AmberSweepSide },
    { id: 'm16', category: 'digital', title: '16. Crimson Night Digital', subtitle: 'Red HH:MM & Date · Analog', defaultBg: '#050608', render: renderM16CrimsonNightDigital },
    { id: 'm17', category: 'analog',  title: '17. Light Cream & Rust', subtitle: 'Ivory Dial · Rust Second', defaultBg: '#f6f3ec', render: renderM17LightCreamRust },
    { id: 'm18', category: 'analog',  title: '18. Lime Sweep Minimal', subtitle: 'Lime Second · Bottom HH:MM', defaultBg: '#050608', render: renderM18LimeSweepMinimal },
    { id: 'm19', category: 'analog',  title: '19. Skeleton Leaf Hands', subtitle: 'Leaf Frame · Orange Loop Sec', defaultBg: '#18191b', render: renderM19SkeletonLeafOrange },
    { id: 'm20', category: 'digital', title: '20. Giant HH & Amber Arc', subtitle: 'Big Hour · Live Sec Arc', defaultBg: '#141517', render: renderM20Giant10AmberArc }
  ];

  const contextsById = {};

  function buildWatchGrid() {
    const grid = document.getElementById('watchFacesGrid');
    grid.innerHTML = '';

    WATCH_FACES.forEach((face) => {
      const card = document.createElement('article');
      card.className = 'watch-card flex flex-col items-center gap-3.5';
      card.dataset.category = face.category;
      card.dataset.id = face.id;

      const bezel = document.createElement('div');
      bezel.className = 'watch-bezel';

      const canvas = document.createElement('canvas');
      canvas.id = `canvas-${face.id}`;
      canvas.className = 'watch-dial';
      canvas.width = W;
      canvas.height = H;
      canvas.setAttribute('aria-label', face.title);

      bezel.appendChild(canvas);

      const meta = document.createElement('div');
      meta.className = 'text-center space-y-0.5';

      const nameEl = document.createElement('div');
      nameEl.className = 'text-sm font-semibold tracking-wide text-slate-100';
      nameEl.textContent = face.title;

      const subEl = document.createElement('div');
      subEl.className = 'text-[11px] font-mono text-slate-400';
      subEl.textContent = face.subtitle;

      meta.appendChild(nameEl);
      meta.appendChild(subEl);

      card.appendChild(bezel);
      card.appendChild(meta);
      grid.appendChild(card);

      contextsById[face.id] = canvas.getContext('2d');
    });

    applyCategoryVisibility();
  }

  function setCategoryFilter(filterKey) {
    state.filter = filterKey;
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      const active = btn.dataset.filter === filterKey;
      btn.setAttribute('aria-selected', String(active));
      if (active) {
        btn.className = 'tab-btn px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer bg-sky-500 text-slate-950 shadow';
      } else {
        btn.className = 'tab-btn px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-slate-300 hover:text-white hover:bg-white/5';
      }
    });
    applyCategoryVisibility();
  }

  function applyCategoryVisibility() {
    document.querySelectorAll('.watch-card').forEach((card) => {
      const match = state.filter === 'all' || card.dataset.category === state.filter;
      card.classList.toggle('hidden', !match);
    });
  }

  function applyBgColor(hex) {
    state.overrideBgColor = hex;
    document.getElementById('bgColorPicker').value = hex;
  }

  function toggleSunburst() {
    state.sunburstEnabled = !state.sunburstEnabled;
    const btn = document.getElementById('sunburstToggleBtn');
    btn.textContent = `Sunburst: ${state.sunburstEnabled ? 'ON' : 'OFF'}`;
    btn.className = state.sunburstEnabled
      ? 'px-2.5 py-1.5 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-300 font-medium transition-colors cursor-pointer'
      : 'px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-white/10 text-slate-400 font-medium transition-colors cursor-pointer';
  }

  function toggleVignette() {
    state.vignetteEnabled = !state.vignetteEnabled;
    const btn = document.getElementById('vignetteToggleBtn');
    btn.textContent = `Vignette: ${state.vignetteEnabled ? 'ON' : 'OFF'}`;
    btn.className = state.vignetteEnabled
      ? 'px-2.5 py-1.5 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-300 font-medium transition-colors cursor-pointer'
      : 'px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-white/10 text-slate-400 font-medium transition-colors cursor-pointer';
  }

  function handleImageUpload(event) {
    try {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          state.customBgImage = img;
          document.getElementById('imageDimWrap').classList.remove('hidden');
          document.getElementById('imageDimWrap').classList.add('flex');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to load background image:', err);
    }
  }

  function updateDimValue(val) {
    state.bgDimPercent = Number(val);
    document.getElementById('dimValueText').textContent = `${state.bgDimPercent}%`;
  }

  function clearUploadedImage() {
    state.customBgImage = null;
    document.getElementById('bgImageUpload').value = '';
    const wrap = document.getElementById('imageDimWrap');
    wrap.classList.add('hidden');
    wrap.classList.remove('flex');
  }

  function resetAllBackgrounds() {
    state.overrideBgColor = null;
    clearUploadedImage();
  }

  function getFormattedTimeAndDate(now) {
    const hours24 = now.getHours();
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const millis = now.getMilliseconds();

    const secFloat = seconds + millis / 1000;
    const minFloat = minutes + secFloat / 60;
    const hourFloat = (hours24 % 12) + minFloat / 60;

    const pad2 = (n) => String(Math.floor(n)).padStart(2, '0');

    const weekdaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekdaysLong = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const day = now.getDate();
    const monthIdx = now.getMonth();
    const year = now.getFullYear();

    return {
      rawDate: now,
      hh: pad2(hours24),
      hh12: pad2(hours12),
      mm: pad2(minutes),
      ss: pad2(seconds),
      ampm: hours24 >= 12 ? 'PM' : 'AM',
      secFloat,
      hAngle: (hourFloat * 30 - 90) * Math.PI / 180,
      mAngle: (minFloat * 6 - 90) * Math.PI / 180,
      sAngle: (secFloat * 6 - 90) * Math.PI / 180,
      day,
      month2: pad2(monthIdx + 1),
      monthShort: monthsShort[monthIdx],
      weekdayShort: weekdaysShort[now.getDay()],
      weekdayLong: weekdaysLong[now.getDay()],
      year
    };
  }

  function animateLoop() {
    try {
      const timeData = getFormattedTimeAndDate(new Date());
      WATCH_FACES.forEach((face) => {
        const ctx = contextsById[face.id];
        if (!ctx) return;
        ctx.clearRect(0, 0, W, H);
        face.render(ctx, timeData);
      });
    } catch (err) {
      console.error('Animation loop error:', err);
    }
    requestAnimationFrame(animateLoop);
  }

  

  function renderFaceToCanvas(id, canvas, now) {
    const face = WATCH_FACES.find((item) => item.id === id);
    if (!face || !canvas) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.clearRect(0, 0, W, H);
    face.render(ctx, getFormattedTimeAndDate(now instanceof Date ? now : new Date()));
    return true;
  }

  function setBackgroundColor(hex) { state.overrideBgColor = hex || null; }
  function setSunburst(enabled) { state.sunburstEnabled = !!enabled; }
  function setVignette(enabled) { state.vignetteEnabled = !!enabled; }
  function setDim(value) { state.bgDimPercent = Math.max(0, Math.min(85, Number(value) || 0)); }
  function setBackgroundImage(image) { state.customBgImage = image || null; }

  window.WfsExtendedTemplateFaces = Object.freeze({
    faces: WATCH_FACES.map(({ id, category, title, subtitle, defaultBg }) =>
      Object.freeze({ id, category, title, subtitle, defaultBg })),
    renderFace: renderFaceToCanvas,
    setBackgroundColor,
    setSunburst,
    setVignette,
    setDim,
    setBackgroundImage
  });

})();
