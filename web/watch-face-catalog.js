/* Unified Watch Face Catalog: 8 original + 20 extended + 4 reference-aligned faces. */
/* WFS1 export coverage: all 32 catalog entries have native object adapters. */

/* Shared merge helpers for targeted template refinements. */
(function(root){
 'use strict';
 const HOUR_SCALE_FACTOR=1.75;
 const DIAL_SIZE=240;
 const ART_SIZE=480;
 const ART_CENTER=ART_SIZE/2;
 function scaleHourFontSize(baseSize,factor=HOUR_SCALE_FACTOR,maxSize=64){
  const n=Number(baseSize);
  if(!Number.isFinite(n)||n<=0)return baseSize;
  return Math.min(maxSize,Math.round(n*factor));
 }
 function scaleTransformAroundCenter(transform,factor=HOUR_SCALE_FACTOR,canvasSize=DIAL_SIZE){
  const t=transform||{};
  const w=Number(t.width)||0,h=Number(t.height)||0;
  const cx=(Number(t.x)||0)+w/2,cy=(Number(t.y)||0)+h/2;
  const nextW=Math.max(4,Math.min(canvasSize,Math.round(w*factor*10)/10));
  const nextH=Math.max(4,Math.min(canvasSize,Math.round(h*factor*10)/10));
  return Object.assign({},t,{
   x:Math.round((cx-nextW/2)*10)/10,
   y:Math.round((cy-nextH/2)*10)/10,
   width:nextW,height:nextH,rotation:0,opacity:1
  });
 }
 function drawSyncedGiantHhSeconds(ctx,options={}){
  const cx=Number.isFinite(options.cx)?options.cx:ART_CENTER;
  const cy=Number.isFinite(options.cy)?options.cy:ART_CENTER;
  const dotRadius=Number.isFinite(options.dotRadius)?options.dotRadius:188;
  const secOrbitRadius=Number.isFinite(options.secOrbitRadius)?options.secOrbitRadius:148;
  let sec=options.secondValue;
  if(!Number.isFinite(sec)){const now=new Date();sec=now.getSeconds()+now.getMilliseconds()/1000}
  const normSec=((sec%60)+60)%60;
  const angleRad=(normSec*6-90)*Math.PI/180;
  const dotX=cx+Math.cos(angleRad)*dotRadius,dotY=cy+Math.sin(angleRad)*dotRadius;
  const secX=cx+Math.cos(angleRad)*secOrbitRadius,secY=cy+Math.sin(angleRad)*secOrbitRadius;
  const secText=String(Math.floor(normSec)%60).padStart(2,'0');
  ctx.save();
  ctx.beginPath();ctx.arc(cx,cy,dotRadius,0,Math.PI*2);
  ctx.strokeStyle='rgba(245,158,11,0.22)';ctx.lineWidth=12;ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,dotRadius,-Math.PI/2,angleRad,false);
  ctx.strokeStyle='#f59e0b';ctx.lineWidth=12;ctx.lineCap='round';ctx.stroke();
  ctx.beginPath();ctx.arc(dotX,dotY,11,0,Math.PI*2);
  ctx.fillStyle='#ffffff';ctx.fill();
  ctx.font='700 28px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#fbbf24';ctx.fillText(secText,secX,secY);
  ctx.restore();
  return {seconds:normSec,label240:{x:Math.round((secX/2-12)*10)/10,y:Math.round((secY/2-12)*10)/10,width:24,height:24}};
 }
 root.WfsMergePatch=Object.freeze({HOUR_SCALE_FACTOR,scaleHourFontSize,scaleTransformAroundCenter,drawSyncedGiantHhSeconds});
})(typeof globalThis!=='undefined'?globalThis:this);


/* Source sections are kept in isolated IIFEs to preserve their existing renderer APIs. */

/* === Original 8 template renderers === */

(function () {
'use strict';
/**
   * Logical watch dial is 240x240, rendered at 2x (480x480) on each canvas
   * for crisp anti-aliased lines, numerals, and hands on high-DPI displays.
   */
  const LOGICAL_SIZE = 240;
  const RENDER_SCALE = 2;
  const W = LOGICAL_SIZE * RENDER_SCALE; // 480
  const H = LOGICAL_SIZE * RENDER_SCALE; // 480
  const CX = W / 2; // 240
  const CY = H / 2; // 240
  const R = W / 2;  // 240

  // Shared customization state
  const state = {
    filter: 'all',
    overrideBgColor: null,
    sunburstEnabled: true,
    vignetteEnabled: true,
    customBgImage: null,
    bgDimPercent: 40,
    bgOffsetX: 0,
    bgOffsetY: 0,
    bgImageScale: 1
  };

  // Watch Face Catalog: 3 Analog Dials + 5 Filtered Digital Faces
  const WATCH_FACES = [
    {
      id: 'motorsport',
      category: 'analog',
      title: '1. Motorsport M-Sport',
      subtitle: 'Sword Hands · 3D Batons',
      defaultBg: '#08101e',
      render: renderMotorsportWatch
    },
    {
      id: 'gmt24',
      category: 'analog',
      title: '2. Tactical GMT 24H',
      subtitle: 'Arrow Hands · 24H Scale',
      defaultBg: '#08090c',
      render: renderTacticalGmtWatch
    },
    {
      id: 'rosegold',
      category: 'analog',
      title: '3. Classic Rose Gold',
      subtitle: 'Dauphine Hands · Faceted Gold',
      defaultBg: '#0b0b0d',
      render: renderClassicGoldWatch
    },
    {
      id: 'stacked-split',
      category: 'digital',
      title: '4. Stacked Split (12 / 00)',
      subtitle: 'Stacked HH/MM · Date · SS + AM/PM',
      defaultBg: '#06070a',
      render: renderStackedSplitDigital
    },
    {
      id: 'dual-tone',
      category: 'digital',
      title: '5. Dual-Tone Bold Blocks',
      subtitle: 'Cream HH / Amber MM · Date & Year',
      defaultBg: '#0c0806',
      render: renderDualToneBlocksDigital
    },
    {
      id: 'tall-vertical',
      category: 'digital',
      title: '6. Tall Vertical Split (:MM)',
      subtitle: 'Condensed Tall HH & :MM · Date',
      defaultBg: '#120714',
      render: renderTallVerticalSplitDigital
    },
    {
      id: 'thin-outline',
      category: 'digital',
      title: '7. Thin Outline Wide (09 07)',
      subtitle: 'Wide Light Outline HH MM · Date & Sec',
      defaultBg: '#070a08',
      render: renderThinOutlineWideDigital
    },
    {
      id: 'angled-tech',
      category: 'digital',
      title: '8. Angled Tech Strip',
      subtitle: 'Slanted HH:MM:SS · Week/Day Strip',
      defaultBg: '#07080c',
      render: renderAngledTechStripDigital
    }
  ];

  function adjustHexBrightness(hex, percent) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
    const amt = Math.round(2.55 * percent);
    const r = Math.min(255, Math.max(0, (num >> 16) + amt));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  /**
   * Draws the circular dial base: custom uploaded photo (with dim overlay)
   * or solid/sunburst color with optional radial vignette.
   */
  function drawDialBase(ctx, defaultColor) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.clip();

    if (state.customBgImage) {
      const img = state.customBgImage;
      const scale = Math.max(W / img.width, H / img.height) * state.bgImageScale;
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.fillStyle = state.overrideBgColor || defaultColor;
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, CX - drawW / 2 + state.bgOffsetX, CY - drawH / 2 + state.bgOffsetY, drawW, drawH);

      ctx.fillStyle = `rgba(0, 0, 0, ${state.bgDimPercent / 100})`;
      ctx.fillRect(0, 0, W, H);
    } else {
      const baseHex = state.overrideBgColor || defaultColor;
      ctx.fillStyle = baseHex;
      ctx.fillRect(0, 0, W, H);

      if (state.sunburstEnabled) {
        const conic = ctx.createConicGradient(0, CX, CY);
        const light = adjustHexBrightness(baseHex, 26);
        const dark = adjustHexBrightness(baseHex, -14);
        conic.addColorStop(0.00, dark);
        conic.addColorStop(0.14, light);
        conic.addColorStop(0.28, dark);
        conic.addColorStop(0.50, light);
        conic.addColorStop(0.66, dark);
        conic.addColorStop(0.84, light);
        conic.addColorStop(1.00, dark);
        ctx.fillStyle = conic;
        ctx.fillRect(0, 0, W, H);
      }

      if (state.vignetteEnabled) {
        const vig = ctx.createRadialGradient(CX, CY, R * 0.25, CX, CY, R);
        vig.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
        vig.addColorStop(0.72, 'rgba(0, 0, 0, 0.16)');
        vig.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
      }
    }

    ctx.restore();
  }

  /* =========================================================================
   * ANALOG FACE 1: MOTORSPORT M-SPORT
   * ========================================================================= */
  function renderMotorsportWatch(ctx, ctxTime) {
    drawDialBase(ctx, '#08101e');
    const { hAngle, mAngle, sAngle } = ctxTime;

    // Red (12h-3h) & Blue (3h-6h) outer arc segments
    ctx.save();
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(CX, CY, R - 10, -Math.PI / 2, 0);
    ctx.strokeStyle = 'rgba(185, 28, 28, 0.82)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(CX, CY, R - 10, 0, Math.PI / 2);
    ctx.strokeStyle = 'rgba(29, 78, 216, 0.82)';
    ctx.stroke();
    ctx.restore();

    // 60 minute ticks
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const angle = (i * 6 - 90) * Math.PI / 180;
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(angle);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(R - 21, -1.5, 9, 3);
      ctx.restore();
    }

    // 3D metallic hour batons
    for (let h = 0; h < 12; h++) {
      const angle = (h * 30 - 90) * Math.PI / 180;
      const isCardinal = h % 3 === 0;
      const len = isCardinal ? 22 : 34;
      const wid = isCardinal ? 11 : 10;
      const startX = R - (isCardinal ? 26 : 44);

      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(angle);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(startX - 2, -wid / 2 + 3, len, wid);

      const grad = ctx.createLinearGradient(startX, -wid / 2, startX, wid / 2);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, '#cbd5e1');
      grad.addColorStop(1, '#64748b');
      ctx.fillStyle = grad;
      ctx.fillRect(startX, -wid / 2, len, wid);

      if (h === 0 || h === 6) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(startX, -1.5, len, 3);
      }
      ctx.restore();
    }

    // Numerals 12, 3, 6, 9
    ctx.save();
    ctx.font = '700 34px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f1f5f9';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    ctx.fillText('12', CX, CY - R + 68);
    ctx.fillText('6', CX, CY + R - 68);
    ctx.fillText('3', CX + R - 66, CY + 2);
    ctx.fillText('9', CX - R + 66, CY + 2);
    ctx.restore();

    // Circular badge + tri-color M stripes
    ctx.save();
    const logoY = CY - 82;
    ctx.beginPath();
    ctx.arc(CX, logoY, 21, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();

    const quadrants = [
      [Math.PI, 1.5 * Math.PI, '#0284c7'],
      [0, 0.5 * Math.PI, '#0284c7'],
      [1.5 * Math.PI, 2 * Math.PI, '#ffffff'],
      [0.5 * Math.PI, Math.PI, '#ffffff']
    ];
    quadrants.forEach(([sA, eA, col]) => {
      ctx.beginPath();
      ctx.moveTo(CX, logoY);
      ctx.arc(CX, logoY, 12.5, sA, eA);
      ctx.fillStyle = col;
      ctx.fill();
    });

    const stripeY = logoY + 33;
    ['#38bdf8', '#1d4ed8', '#ef4444'].forEach((col, idx) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(CX - 23 + idx * 10, stripeY + 12);
      ctx.lineTo(CX - 15 + idx * 10, stripeY - 4);
      ctx.lineTo(CX - 8 + idx * 10, stripeY - 4);
      ctx.lineTo(CX - 16 + idx * 10, stripeY + 12);
      ctx.closePath();
      ctx.fill();
    });
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '700 18px "Orbitron", sans-serif';
    ctx.fillText('M', CX + 16, stripeY + 11);
    ctx.restore();

    drawSwordHand(ctx, hAngle, 126, 24, 14, '#f8fafc', '#38bdf8');
    drawSwordHand(ctx, mAngle, 182, 28, 10.5, '#f8fafc', '#38bdf8');
    drawSecondHand(ctx, sAngle, 206, 40, '#ef4444');
    drawCenterPin(ctx, '#e2e8f0', '#ef4444');
  }

  /* =========================================================================
   * ANALOG FACE 2: TACTICAL GMT 24H
   * ========================================================================= */
  function renderTacticalGmtWatch(ctx, ctxTime) {
    drawDialBase(ctx, '#08090c');
    const { hAngle, mAngle, sAngle } = ctxTime;

    // Subtle crimson X cross
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(153, 27, 27, 0.25)';
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.moveTo(35, 35);
    ctx.lineTo(W - 35, H - 35);
    ctx.moveTo(W - 35, 35);
    ctx.lineTo(35, H - 35);
    ctx.stroke();
    ctx.restore();

    // 60 ticks
    for (let i = 0; i < 60; i++) {
      const angle = (i * 6 - 90) * Math.PI / 180;
      const isMajor = i % 5 === 0;
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(angle);
      ctx.fillStyle = isMajor ? '#ffffff' : 'rgba(255, 255, 255, 0.78)';
      ctx.fillRect(R - (isMajor ? 34 : 30), isMajor ? -2 : -1.2, isMajor ? 18 : 14, isMajor ? 4 : 2.4);
      ctx.restore();
    }

    // 24-hour even markers (2..24) + red triangle pointers
    ctx.save();
    ctx.font = '600 23px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let h = 2; h <= 24; h += 2) {
      const angle = ((h % 24) * 15 - 90) * Math.PI / 180;
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(String(h), CX + Math.cos(angle) * (R - 62), CY + Math.sin(angle) * (R - 62));

      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(angle);
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.moveTo(R - 98, 0);
      ctx.lineTo(R - 84, -8);
      ctx.lineTo(R - 84, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Tactical GMT text & depth rating label
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 18px Georgia, serif';
    ctx.fillText('TACTICAL', CX, CY - 84);
    ctx.fillStyle = '#dc2626';
    ctx.font = '700 16px "Orbitron", sans-serif';
    ctx.fillText('GMT', CX, CY - 64);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillText('WATER RESISTANT', CX, CY + 102);
    ctx.fillText('660ft - 200m', CX, CY + 115);
    ctx.restore();

    drawArrowHand(ctx, hAngle, 122, 22, 12, '#ffffff', '#dc2626');
    drawArrowHand(ctx, mAngle, 178, 26, 9.5, '#ffffff', '#dc2626');
    drawSecondHand(ctx, sAngle, 204, 38, '#dc2626');
    drawCenterPin(ctx, '#ffffff', '#dc2626');
  }

  /* =========================================================================
   * ANALOG FACE 3: CLASSIC ROSE GOLD
   * ========================================================================= */
  function renderClassicGoldWatch(ctx, ctxTime) {
    drawDialBase(ctx, '#0b0b0d');
    const { hAngle, mAngle, sAngle } = ctxTime;

    // Outer chapter ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, R - 14, 0, Math.PI * 2);
    ctx.lineWidth = 26;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(CX, CY, R - 2, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.stroke();
    ctx.restore();

    // Minute track ticks
    for (let i = 0; i < 60; i++) {
      const angle = (i * 6 - 90) * Math.PI / 180;
      const isMajor = i % 5 === 0;
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(angle);
      if (i === 0) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(R - 22, -5, 13, 3.5);
        ctx.fillRect(R - 22, 1.5, 13, 3.5);
      } else {
        ctx.fillStyle = isMajor ? '#f1f5f9' : 'rgba(226, 232, 240, 0.65)';
        ctx.fillRect(R - (isMajor ? 22 : 19), isMajor ? -2 : -1, isMajor ? 13 : 8, isMajor ? 4 : 2);
      }
      ctx.restore();
    }

    // Rose gold 3D wedge hour markers (1..11)
    for (let h = 1; h < 12; h++) {
      const angle = (h * 30 - 90) * Math.PI / 180;
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(angle);

      const goldGrad = ctx.createLinearGradient(R - 54, -7, R - 34, 7);
      goldGrad.addColorStop(0, '#f3d193');
      goldGrad.addColorStop(0.5, '#d49b4b');
      goldGrad.addColorStop(1, '#8c5d1e');
      ctx.fillStyle = goldGrad;

      ctx.beginPath();
      ctx.moveTo(R - 54, -4);
      ctx.lineTo(R - 34, -7);
      ctx.lineTo(R - 34, 7);
      ctx.lineTo(R - 54, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Numeral 12
    ctx.save();
    ctx.font = '700 32px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e5b869';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 5;
    ctx.fillText('12', CX, CY - R + 54);
    ctx.restore();

    drawDauphineHand(ctx, hAngle, 120, 22, 13, '#e5b869');
    drawDauphineHand(ctx, mAngle, 178, 26, 10, '#e5b869');
    drawSecondHand(ctx, sAngle, 204, 38, '#f3d193');
    drawCenterPin(ctx, '#e5b869', '#8c5d1e');
  }

  /* =========================================================================
   * SHARED ANALOG HAND HELPERS
   * ========================================================================= */
  function drawSwordHand(ctx, angle, len, tail, wid, bodyColor, lumeColor) {
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-tail, -wid * 0.45);
    ctx.lineTo(len * 0.72, -wid * 0.7);
    ctx.lineTo(len, 0);
    ctx.lineTo(len * 0.72, wid * 0.7);
    ctx.lineTo(-tail, wid * 0.45);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = lumeColor;
    ctx.beginPath();
    ctx.roundRect(14, -wid * 0.24, len * 0.6, wid * 0.48, 3);
    ctx.fill();
    ctx.restore();
  }

  function drawArrowHand(ctx, angle, len, tail, wid, bodyColor, tipColor) {
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = bodyColor;
    ctx.fillRect(-tail, -wid * 0.4, len * 0.76, wid * 0.8);
    ctx.beginPath();
    ctx.moveTo(len * 0.72, -wid * 1.15);
    ctx.lineTo(len, 0);
    ctx.lineTo(len * 0.72, wid * 1.15);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = tipColor;
    ctx.beginPath();
    ctx.moveTo(len * 0.75, -wid * 0.68);
    ctx.lineTo(len - 4, 0);
    ctx.lineTo(len * 0.75, wid * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawDauphineHand(ctx, angle, len, tail, wid, bodyColor) {
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-tail, 0);
    ctx.lineTo(18, -wid * 0.75);
    ctx.lineTo(len, 0);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = adjustHexBrightness(bodyColor, -28);
    ctx.beginPath();
    ctx.moveTo(-tail, 0);
    ctx.lineTo(18, wid * 0.75);
    ctx.lineTo(len, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawSecondHand(ctx, angle, len, tail, color) {
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    ctx.fillStyle = color;
    ctx.fillRect(-tail, -1.6, len + tail, 3.2);
    ctx.beginPath();
    ctx.arc(-tail * 0.65, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCenterPin(ctx, outerColor, innerColor) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, 11, 0, Math.PI * 2);
    ctx.fillStyle = outerColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(CX, CY, 6, 0, Math.PI * 2);
    ctx.fillStyle = innerColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(CX, CY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.restore();
  }

  /* =========================================================================
   * DIGITAL FACE 4: STACKED SPLIT (12 / 00)
   * Pure time (HH top, MM bottom, SS pill + AM/PM) & date/year.
   * Zero steps, battery, heart rate, or weather.
   * ========================================================================= */
  function renderStackedSplitDigital(ctx, t) {
    drawDialBase(ctx, '#06070a');

    // Subtle perimeter minute/second ticks
    for (let i = 0; i < 60; i++) {
      const a = (i * 6 - 90) * Math.PI / 180;
      const maj = i % 5 === 0;
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(a);
      ctx.fillStyle = maj ? 'rgba(248, 250, 252, 0.55)' : 'rgba(148, 163, 184, 0.22)';
      ctx.fillRect(R - (maj ? 14 : 10), -1, maj ? 7 : 4, 2);
      ctx.restore();
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Top date & year header
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 22px "Inter", sans-serif';
    ctx.fillText(t.shortDateWithYear, CX, 66);

    // Large stacked Hour (top) & Minute (bottom)
    ctx.fillStyle = '#f8fafc';
    ctx.font = '400 104px "Oswald", sans-serif';
    ctx.fillText(t.hh, CX, 178);
    ctx.fillText(t.mm, CX, 286);

    // Right-side AM/PM + pill seconds badge
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 18px "JetBrains Mono", monospace';
    ctx.fillText(t.ampm, 342, 232);

    ctx.strokeStyle = 'rgba(248, 250, 252, 0.65)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(374, 210, 56, 44, 22);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.fillText(t.ss, 402, 233);

    // Subtle year/time footer
    ctx.fillStyle = '#64748b';
    ctx.font = '500 16px "JetBrains Mono", monospace';
    ctx.fillText(`${t.hh}:${t.mm}:${t.ss}`, CX, 384);

    ctx.restore();
  }

  /* =========================================================================
   * DIGITAL FACE 5: DUAL-TONE BOLD BLOCKS
   * Warm cream HH block above warm amber-orange MM block + date/year.
   * Zero steps, charge %, heart rate, or messages.
   * ========================================================================= */
  function renderDualToneBlocksDigital(ctx, t) {
    drawDialBase(ctx, '#0c0806');

    // Segmented outer arc ticks
    for (let i = 0; i < 48; i++) {
      const a = (i * 7.5 - 90) * Math.PI / 180;
      const activeProgress = i / 48 <= (t.secFloat / 60);
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(a);
      ctx.fillStyle = activeProgress ? '#f59e0b' : 'rgba(245, 158, 11, 0.22)';
      ctx.fillRect(R - 20, -4, 11, 8);
      ctx.restore();
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Date & year header
    ctx.fillStyle = '#e7b887';
    ctx.font = '600 23px "Inter", sans-serif';
    ctx.fillText(`${t.weekdayShort} ${t.day} ${t.monthShort} ${t.year}`, CX, 76);

    // Chunky Cream Hour block
    ctx.fillStyle = '#f7dfb8';
    ctx.font = '700 124px "Oswald", sans-serif';
    ctx.fillText(t.hh, CX, 184);

    // Chunky Burnt-Orange Minute block
    ctx.fillStyle = '#e07a38';
    ctx.font = '700 124px "Oswald", sans-serif';
    ctx.fillText(t.mm, CX, 304);

    // Clean seconds readout below
    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 20px "JetBrains Mono", monospace';
    ctx.fillText(`SEC ${t.ss}`, CX, 392);

    ctx.restore();
  }

  /* =========================================================================
   * DIGITAL FACE 6: TALL VERTICAL SPLIT (:MM)
   * Tall bold numerals split into HH on top and :MM below + date/seconds.
   * ========================================================================= */
  function renderTallVerticalSplitDigital(ctx, t) {
    drawDialBase(ctx, '#120714');

    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.clip();

    // Top date & year pill label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '700 18px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${t.day}/${t.month2}/${t.year} · ${t.ss}s`, CX, 46);

    // Tall bold Hour & :MM
    ctx.fillStyle = '#f9a8d4';
    ctx.font = '700 168px "Oswald", sans-serif';
    ctx.fillText(t.hh, CX + 34, 178);
    ctx.fillText(`:${t.mm}`, CX + 14, 342);

    ctx.restore();
  }

  /* =========================================================================
   * DIGITAL FACE 7: THIN OUTLINE WIDE (09 07)
   * Wide-spaced light-stroke large HH MM digits + date/year & seconds.
   * Zero steps, battery, heart rate, weather, or alarms.
   * ========================================================================= */
  function renderThinOutlineWideDigital(ctx, t) {
    drawDialBase(ctx, '#070a08');

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Top date & year
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 24px "Inter", sans-serif';
    ctx.fillText(`${t.monthShort} ${t.day}, ${t.year}`, CX, 96);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 17px "JetBrains Mono", monospace';
    ctx.fillText(t.weekdayLong.toUpperCase(), CX, 128);

    // Wide-spaced thin-outline HH and MM
    ctx.strokeStyle = '#a3e635';
    ctx.lineWidth = 3.2;
    ctx.font = '400 112px "Inter", sans-serif';

    ctx.strokeText(t.hh, 146, 244);
    ctx.strokeText(t.mm, 338, 244);

    // Clean seconds readout below
    ctx.fillStyle = '#bef264';
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.fillText(`:${t.ss}`, CX, 352);

    ctx.restore();
  }

  /* =========================================================================
   * DIGITAL FACE 8: ANGLED TECH STRIP
   * Slanted technical HH:MM:SS + angled calendar strip (days/dates & active day) + year.
   * Zero battery % or sensor widgets.
   * ========================================================================= */
  function renderAngledTechStripDigital(ctx, t) {
    drawDialBase(ctx, '#07080c');

    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.clip();

    // Geometric tech lines
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(64, 420);
    ctx.lineTo(64, 56);
    ctx.lineTo(445, 275);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(118, 126);
    ctx.lineTo(450, 315);
    ctx.stroke();

    // Left circular striped emblem accent
    ctx.save();
    ctx.beginPath();
    ctx.arc(76, 206, 28, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#07080c';
    ctx.lineWidth = 4.5;
    [-10, 0, 10].forEach((dy) => {
      ctx.beginPath();
      ctx.moveTo(46, 206 + dy);
      ctx.lineTo(106, 206 + dy);
      ctx.stroke();
    });
    ctx.restore();

    // Angled calendar strip across top-right (7 days centered around today)
    ctx.save();
    ctx.translate(274, 102);
    ctx.rotate(29 * Math.PI / 180);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const baseDate = new Date(t.rawDate);
    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + offset);
      const xPos = offset * 36;
      const isToday = offset === 0;

      ctx.fillStyle = isToday ? '#f43f5e' : '#f1f5f9';
      ctx.font = '700 20px "Orbitron", sans-serif';
      ctx.fillText(String(d.getDate()).padStart(2, '0'), xPos, -18);

      ctx.fillStyle = isToday ? '#fda4af' : '#cbd5e1';
      ctx.font = '700 18px "Orbitron", sans-serif';
      ctx.fillText(dayLetters[d.getDay()], xPos, 10);

      if (isToday) {
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(xPos - 15, 24, 30, 5);
      }
    }
    ctx.restore();

    // Slanted HH:MM:SS main readout
    ctx.save();
    ctx.translate(286, 266);
    ctx.rotate(29 * Math.PI / 180);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 54px "Orbitron", sans-serif';
    ctx.fillText(`${t.hh}:${t.mm}`, 0, -14);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.fillText(`SEC ${t.ss} · ${t.monthShort.toUpperCase()} ${t.year}`, 0, 26);
    ctx.restore();

    ctx.restore();
  }

  /* =========================================================================
   * TIME & DATE FORMATTER
   * ========================================================================= */
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
    const weekdayShort = weekdaysShort[now.getDay()];
    const weekdayLong = weekdaysLong[now.getDay()];
    const monthShort = monthsShort[monthIdx];

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
      monthShort,
      weekdayShort,
      weekdayLong,
      year,
      shortDateWithYear: `${weekdayShort}, ${monthShort} ${day} · ${year}`
    };
  }

  function renderFaceToCanvas(faceId, canvas, now) {
    const face = WATCH_FACES.find((item) => item.id === faceId);
    if (!face || !canvas) throw new Error('Unknown watch face: ' + faceId);
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is unavailable');
    ctx.clearRect(0, 0, W, H);
    face.render(ctx, getFormattedTimeAndDate(now instanceof Date ? now : new Date()));
    return ctx;
  }
  window.WfsTemplateFaces = Object.freeze({
    faces: WATCH_FACES.map((face) => ({id:face.id,category:face.category,title:face.title,subtitle:face.subtitle,defaultBg:face.defaultBg})),
    renderFace: renderFaceToCanvas,
    setBackgroundColor(hex) { state.overrideBgColor = hex || null; },
    setSunburst(enabled) { state.sunburstEnabled = !!enabled; },
    setVignette(enabled) { state.vignetteEnabled = !!enabled; },
    setDim(value) { state.bgDimPercent = Math.max(0, Math.min(85, Number(value) || 0)); },
    setBackgroundImage(image) { state.customBgImage = image || null; },
    setBackgroundPosition(x, y) { state.bgOffsetX = Math.max(-180, Math.min(180, Number(x) || 0)); state.bgOffsetY = Math.max(-180, Math.min(180, Number(y) || 0)); },
    setBackgroundScale(value) { state.bgImageScale = Math.max(0.5, Math.min(3, Number(value) || 1)); },
    clearBackgroundImage() { state.customBgImage = null; },
    resetBackground() { state.overrideBgColor = null; state.customBgImage = null; },
    getSettings() { return {overrideBgColor:state.overrideBgColor,sunburstEnabled:state.sunburstEnabled,vignetteEnabled:state.vignetteEnabled,customBgImage:state.customBgImage,bgDimPercent:state.bgDimPercent}; }
  });

})();


/* === Extended 20 template renderers === */

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
    bgDimPercent: 40,
    bgOffsetX: 0,
    bgOffsetY: 0,
    bgImageScale: 1
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
      const scale = Math.max(W / img.width, H / img.height) * state.bgImageScale;
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.fillStyle = state.overrideBgColor || defaultColor;
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, CX - drawW / 2 + state.bgOffsetX, CY - drawH / 2 + state.bgOffsetY, drawW, drawH);

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

  // Elements Water is a self-contained renderer. Template Studio drives it from
  // its existing preview scheduler; start()/stop() remain available to standalone callers.
  class ElementsWaterWatchFace {
    constructor(canvasOrId, options = {}) {
      this.canvas = typeof canvasOrId === 'string'
        ? document.getElementById(canvasOrId)
        : canvasOrId;
      if (!this.canvas) throw new Error('ElementsWaterWatchFace: canvas not found.');
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) throw new Error('ElementsWaterWatchFace: 2D context unavailable.');

      this.baseSize = 600;
      this.CX = 300;
      this.CY = 300;
      this.R = 300;
      this.waveCanvas = document.createElement('canvas');
      this.waveCanvas.width = this.baseSize;
      this.waveCanvas.height = this.baseSize;
      this.wctx = this.waveCanvas.getContext('2d');
      if (!this.wctx) throw new Error('ElementsWaterWatchFace: offscreen 2D context unavailable.');

      this.data = {
        tempText: options.tempText ?? '75/55°',
        leftValue: options.leftValue ?? '20',
        leftProgress: options.leftProgress ?? 0.25,
        bottomValue: options.bottomValue ?? '82',
        dateValue: options.dateValue ?? null,
        waveSpeed: options.waveSpeed ?? 1,
        waveAmplitude: options.waveAmplitude ?? 1,
        backgroundImage: options.backgroundImage ?? null,
        backgroundColor: options.backgroundColor ?? null,
        backgroundDim: options.backgroundDim ?? 0,
        backgroundOffsetX: options.backgroundOffsetX ?? 0,
        backgroundOffsetY: options.backgroundOffsetY ?? 0,
        backgroundScale: options.backgroundScale ?? 1,
        backgroundSunburst: options.backgroundSunburst ?? true,
        backgroundVignette: options.backgroundVignette ?? true
      };
      this.setData(this.data);
      this._rafId = null;
      this._running = false;
      this._loop = this._loop.bind(this);
    }

    setData(newData = {}) {
      if (!newData || typeof newData !== 'object') return;
      for (const key of ['tempText', 'leftValue', 'bottomValue']) {
        if (Object.prototype.hasOwnProperty.call(newData, key)) this.data[key] = String(newData[key]);
      }
      if (Object.prototype.hasOwnProperty.call(newData, 'dateValue')) {
        this.data.dateValue = newData.dateValue == null ? null : String(newData.dateValue);
      }
      if (Object.prototype.hasOwnProperty.call(newData, 'leftProgress')) {
        const value = Number(newData.leftProgress);
        this.data.leftProgress = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
      }
      if (Object.prototype.hasOwnProperty.call(newData, 'waveSpeed')) {
        const value = Number(newData.waveSpeed);
        this.data.waveSpeed = Number.isFinite(value) ? Math.max(0, Math.min(4, value)) : 1;
      }
      if (Object.prototype.hasOwnProperty.call(newData, 'waveAmplitude')) {
        const value = Number(newData.waveAmplitude);
        this.data.waveAmplitude = Number.isFinite(value) ? Math.max(0, Math.min(2, value)) : 1;
      }
      if (Object.prototype.hasOwnProperty.call(newData, 'backgroundImage')) {
        this.data.backgroundImage = newData.backgroundImage || null;
      }
      if (Object.prototype.hasOwnProperty.call(newData, 'backgroundColor')) {
        this.data.backgroundColor = /^#[0-9a-f]{6}$/i.test(newData.backgroundColor || '')
          ? newData.backgroundColor : null;
      }
      if (Object.prototype.hasOwnProperty.call(newData, 'backgroundDim')) {
        const value = Number(newData.backgroundDim);
        this.data.backgroundDim = Number.isFinite(value) ? Math.max(0, Math.min(85, value)) : 0;
      }
      for (const key of ['backgroundOffsetX', 'backgroundOffsetY']) {
        if (Object.prototype.hasOwnProperty.call(newData, key)) {
          const value = Number(newData[key]);
          this.data[key] = Number.isFinite(value) ? Math.max(-180, Math.min(180, value)) : 0;
        }
      }
      if (Object.prototype.hasOwnProperty.call(newData, 'backgroundScale')) {
        const value = Number(newData.backgroundScale);
        this.data.backgroundScale = Number.isFinite(value) ? Math.max(0.5, Math.min(3, value)) : 1;
      }
      if (Object.prototype.hasOwnProperty.call(newData, 'backgroundSunburst')) {
        this.data.backgroundSunburst = !!newData.backgroundSunburst;
      }
      if (Object.prototype.hasOwnProperty.call(newData, 'backgroundVignette')) {
        this.data.backgroundVignette = !!newData.backgroundVignette;
      }
    }

    start() {
      if (this._running) return;
      if (typeof requestAnimationFrame !== 'function') {
        throw new Error('ElementsWaterWatchFace: requestAnimationFrame is unavailable.');
      }
      this._running = true;
      this._rafId = requestAnimationFrame(this._loop);
    }

    stop() {
      this._running = false;
      if (this._rafId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this._rafId);
      }
      this._rafId = null;
    }

    _loop(timestamp) {
      if (!this._running) return;
      this.renderFrame(new Date(), timestamp * 0.001);
      this._rafId = requestAnimationFrame(this._loop);
    }

    renderFrame(now = new Date(), timeSec = Date.now() * 0.001, overrideData = null) {
      if (overrideData) this.setData(overrideData);
      if (!(now instanceof Date) || !Number.isFinite(now.getTime())) now = new Date();
      const ctx = this.ctx;
      const width = this.canvas.width;
      const height = this.canvas.height;
      const scale = Math.min(width, height) / this.baseSize;
      ctx.save();
      ctx.clearRect(0, 0, width, height);
      ctx.translate((width - this.baseSize * scale) / 2, (height - this.baseSize * scale) / 2);
      ctx.scale(scale, scale);
      ctx.beginPath();
      ctx.arc(this.CX, this.CY, this.R, 0, Math.PI * 2);
      ctx.clip();
      this._drawFlowingGuilloche(Number.isFinite(timeSec) ? timeSec : 0);
      ctx.drawImage(this.waveCanvas, 0, 0);
      this._drawBezelAndIndices();
      this._drawComplications(now);
      this._drawHands(now);
      ctx.restore();
    }

    _drawFlowingGuilloche(timeSec) {
      const ctx = this.wctx;
      const { CX, CY, R, baseSize: size } = this;
      const image = this.data.backgroundImage;
      const hasBackgroundImage = !!(
        image && image.complete !== false && (image.naturalWidth || image.width)
      );
      // A selected photo freezes the water pattern. It remains a real lower
      // layer, so transparent pixels in the photo can still reveal the waves.
      const t = hasBackgroundImage ? 0 : timeSec * this.data.waveSpeed;
      const amp = this.data.waveAmplitude;

      // Paint the dial base first; the Guilloche is composited above it.
      if (this.data.backgroundColor) {
        ctx.fillStyle = this.data.backgroundColor;
        ctx.fillRect(0, 0, size, size);
        if (this.data.backgroundSunburst && typeof ctx.createConicGradient === 'function') {
          const burst = ctx.createConicGradient(0, CX, CY);
          const light = adjustHexBrightness(this.data.backgroundColor, 18);
          const dark = adjustHexBrightness(this.data.backgroundColor, -12);
          [[0, dark], [0.14, light], [0.28, dark], [0.5, light], [0.66, dark], [0.84, light], [1, dark]]
            .forEach(([stop, color]) => burst.addColorStop(stop, color));
          ctx.fillStyle = burst;
          ctx.fillRect(0, 0, size, size);
        }
      } else {
        const gradient = ctx.createRadialGradient(CX, CY * 0.85, 20, CX, CY, R);
        gradient.addColorStop(0, '#0e2236');
        gradient.addColorStop(0.55, '#081421');
        gradient.addColorStop(0.88, '#040a12');
        gradient.addColorStop(1, '#020509');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(CX, CY, R - 18, 0, Math.PI * 2);
      ctx.clip();
      const strips = 54;
      for (let i = -4; i <= strips + 4; i++) {
        const ratio = i / strips;
        const baseY = ratio * size;
        const verticalBob = (
          Math.sin(t * 1.45 + i * 0.42) * 7.5 +
          Math.cos(t * 0.85 - i * 0.25) * 4
        ) * amp;
        const shimmer = 0.5 + 0.5 * Math.sin(i * 0.68 + t * 1.6) * Math.cos(i * 0.23 - t * 0.9);
        ctx.beginPath();
        for (let x = 0; x <= size; x += 6) {
          const nx = x / size;
          const wave1 = Math.sin(nx * Math.PI * 3.1 + t * 1.35 + i * 0.32) * 14 * amp;
          const wave2 = Math.sin(nx * Math.PI * 5.6 - t * 1.05 + i * 0.58) * 6.5 * amp;
          const wave3 = Math.cos(nx * Math.PI * 1.8 + t * 0.75 - i * 0.19) * 9 * amp;
          const curve = Math.sin(nx * Math.PI) * -8;
          const y = baseY + verticalBob + wave1 + wave2 + wave3 + curve;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineWidth = 5.5;
        ctx.strokeStyle = 'rgba(3, 9, 16, ' + (0.42 + (1 - shimmer) * 0.28) + ')';
        ctx.stroke();
        ctx.lineWidth = 2.6;
        const red = Math.round(22 + shimmer * 34);
        const green = Math.round(52 + shimmer * 64);
        const blue = Math.round(82 + shimmer * 86);
        ctx.strokeStyle = 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + (0.24 + shimmer * 0.36) + ')';
        ctx.stroke();
        if (shimmer > 0.52) {
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(115, 168, 212, ' + ((shimmer - 0.52) * 0.55) + ')';
          ctx.stroke();
        }
      }

      // The personal image is deliberately composited after the waves. Opaque
      // pixels cover them; transparent areas retain the static wave layer below.
      if (hasBackgroundImage) {
        const imageWidth = image.naturalWidth || image.width;
        const imageHeight = image.naturalHeight || image.height;
        const imageScale = Math.max(size / imageWidth, size / imageHeight) * this.data.backgroundScale;
        const drawWidth = imageWidth * imageScale;
        const drawHeight = imageHeight * imageScale;
        ctx.drawImage(
          image,
          (size - drawWidth) / 2 + this.data.backgroundOffsetX * (size / 480),
          (size - drawHeight) / 2 + this.data.backgroundOffsetY * (size / 480),
          drawWidth,
          drawHeight
        );
        if (this.data.backgroundDim > 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, ' + (this.data.backgroundDim / 100) + ')';
          ctx.fillRect(0, 0, size, size);
        }
      }

      if (this.data.backgroundVignette) {
        const vignette = ctx.createRadialGradient(CX, CY, R * 0.48, CX, CY, R - 16);
        vignette.addColorStop(0, 'rgba(6, 15, 26, 0)');
        vignette.addColorStop(0.75, 'rgba(4, 10, 18, 0.35)');
        vignette.addColorStop(1, 'rgba(2, 5, 10, 0.85)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, size, size);
      }
      ctx.restore();
    }

    _drawBezelAndIndices() {
      const { ctx, CX, CY, R } = this;
      ctx.save();
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.arc(CX, CY, R - 26, 0, Math.PI * 2, true);
      ctx.fillStyle = '#04080d';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(CX, CY, R - 26, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(130, 155, 180, 0.25)';
      ctx.stroke();

      for (let minute = 0; minute < 60; minute++) {
        const angle = (minute * Math.PI) / 30 - Math.PI / 2;
        const isHour = minute % 5 === 0;
        const inner = isHour ? R - 21 : R - 16;
        const outer = R - 7;
        ctx.beginPath();
        ctx.moveTo(CX + Math.cos(angle) * inner, CY + Math.sin(angle) * inner);
        ctx.lineTo(CX + Math.cos(angle) * outer, CY + Math.sin(angle) * outer);
        ctx.lineWidth = isHour ? 2.2 : 1.1;
        ctx.strokeStyle = isHour ? 'rgba(195, 210, 225, 0.65)' : 'rgba(140, 160, 180, 0.32)';
        ctx.stroke();
      }

      for (let hour = 0; hour < 12; hour++) {
        const angle = (hour * Math.PI) / 6 - Math.PI / 2;
        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(angle);
        const drawMarker = (offsetY, length, width) => {
          const startX = R - 74;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
          ctx.beginPath();
          ctx.roundRect(startX + 2, offsetY - width / 2 + 3, length, width, 2);
          ctx.fill();
          const gradient = ctx.createLinearGradient(startX, offsetY - width / 2, startX, offsetY + width / 2);
          gradient.addColorStop(0, '#f4f8fc');
          gradient.addColorStop(0.45, '#cfd9e3');
          gradient.addColorStop(0.55, '#8f9eab');
          gradient.addColorStop(1, '#dce5ee');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(startX, offsetY - width / 2, length, width, 1.8);
          ctx.fill();
          ctx.lineWidth = 0.8;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.stroke();
        };
        if (hour === 0) {
          drawMarker(-8.5, 42, 6.5);
          drawMarker(8.5, 42, 6.5);
        } else {
          drawMarker(0, hour === 3 || hour === 6 || hour === 9 ? 38 : 40, 7);
        }
        ctx.restore();
      }
      ctx.restore();
    }

    _drawComplications(now) {
      const { ctx, CX, CY, data } = this;
      ctx.save();
      ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#e8eff6';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 4;
      ctx.fillText(String(data.tempText), CX, CY - 118);
      ctx.shadowBlur = 0;

      const leftX = CX - 138;
      const leftY = CY;
      const leftRadius = 48;
      ctx.beginPath();
      ctx.arc(leftX, leftY, leftRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6, 13, 22, 0.62)';
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(185, 202, 218, 0.65)';
      ctx.stroke();
      const startArc = Math.PI * 0.72;
      const totalArc = Math.PI * 1.56;
      const progress = Math.max(0, Math.min(1, Number(data.leftProgress) || 0));
      ctx.beginPath();
      ctx.arc(leftX, leftY, leftRadius - 11, startArc, startArc + totalArc);
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(130, 150, 170, 0.25)';
      ctx.stroke();
      if (progress > 0) {
        ctx.beginPath();
        ctx.arc(leftX, leftY, leftRadius - 11, startArc, startArc + totalArc * progress);
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#e6eef6';
        ctx.stroke();
      }
      ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#eef4fa';
      ctx.fillText(String(data.leftValue), leftX, leftY + 1);

      const dayText = data.dateValue !== null && data.dateValue !== undefined
        ? String(data.dateValue)
        : String(now.getDate()).padStart(2, '0');
      const boxWidth = 68;
      const boxHeight = 44;
      const boxX = CX + 138 - boxWidth / 2;
      const boxY = CY - boxHeight / 2;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
      ctx.fillStyle = 'rgba(5, 11, 18, 0.78)';
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(185, 202, 218, 0.7)';
      ctx.stroke();
      ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#f0f5fa';
      ctx.fillText(dayText, CX + 138, CY + 1);

      const bottomX = CX;
      const bottomY = CY + 132;
      const bottomRadius = 64;
      ctx.beginPath();
      ctx.arc(bottomX, bottomY, bottomRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6, 13, 22, 0.58)';
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(185, 202, 218, 0.65)';
      ctx.stroke();
      for (let tick = 0; tick < 12; tick++) {
        const angle = (tick * Math.PI) / 6;
        const inner = bottomRadius - 7;
        const outer = bottomRadius - 2;
        ctx.beginPath();
        ctx.moveTo(bottomX + Math.cos(angle) * inner, bottomY + Math.sin(angle) * inner);
        ctx.lineTo(bottomX + Math.cos(angle) * outer, bottomY + Math.sin(angle) * outer);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(190, 208, 225, 0.55)';
        ctx.stroke();
      }
      ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#eef4fa';
      ctx.fillText(String(data.bottomValue), bottomX, bottomY - 4);
      const moonX = bottomX;
      const moonY = bottomY + 26;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 8.5, 0.35 * Math.PI, 1.65 * Math.PI, false);
      ctx.arc(moonX + 4.5, moonY - 1.5, 7, 1.55 * Math.PI, 0.45 * Math.PI, true);
      ctx.closePath();
      ctx.fillStyle = '#e8eff6';
      ctx.fill();
      ctx.restore();
    }

    _drawHands(now) {
      const { ctx, CX, CY } = this;
      const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
      const minutes = now.getMinutes() + seconds / 60;
      const hours = (now.getHours() % 12) + minutes / 60;
      const hourAngle = (hours * Math.PI) / 6 - Math.PI / 2;
      const minuteAngle = (minutes * Math.PI) / 30 - Math.PI / 2;
      const secondAngle = (seconds * Math.PI) / 30 - Math.PI / 2;
      const drawDauphineHand = (angle, length, tail, halfWidth) => {
        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(angle);
        ctx.save();
        ctx.translate(4, 6);
        ctx.beginPath();
        ctx.moveTo(-tail, 0);
        ctx.lineTo(14, -halfWidth);
        ctx.lineTo(length, 0);
        ctx.lineTo(14, halfWidth);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        ctx.moveTo(-tail, 0);
        ctx.lineTo(14, -halfWidth);
        ctx.lineTo(length, 0);
        ctx.closePath();
        ctx.fillStyle = '#f3f7fb';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-tail, 0);
        ctx.lineTo(14, halfWidth);
        ctx.lineTo(length, 0);
        ctx.closePath();
        ctx.fillStyle = '#9aa8b6';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-tail, 0);
        ctx.lineTo(14, -halfWidth);
        ctx.lineTo(length, 0);
        ctx.lineTo(14, halfWidth);
        ctx.closePath();
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.stroke();
        ctx.restore();
      };
      drawDauphineHand(hourAngle, 148, 22, 10.5);
      drawDauphineHand(minuteAngle, 218, 28, 8.5);

      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(secondAngle);
      ctx.beginPath();
      ctx.moveTo(-58, 4);
      ctx.lineTo(242, 4);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-58, 0);
      ctx.lineTo(242, 0);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#dce5ee';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
      ctx.fillStyle = '#d8e2ec';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#5a6875';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#6f7e8c';
      ctx.fill();
      ctx.restore();
    }
  }

  let elementsWaterRenderer = null;
  function getElementsWaterRenderer() {
    if (!elementsWaterRenderer) {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      elementsWaterRenderer = new ElementsWaterWatchFace(canvas);
    }
    return elementsWaterRenderer;
  }

  function renderM11ElementsWater(ctx, t) {
    const renderer = getElementsWaterRenderer();
    renderer.setData({
      backgroundImage: state.customBgImage,
      backgroundColor: state.overrideBgColor,
      backgroundDim: state.bgDimPercent,
      backgroundOffsetX: state.bgOffsetX,
      backgroundOffsetY: state.bgOffsetY,
      backgroundScale: state.bgImageScale,
      backgroundSunburst: state.sunburstEnabled,
      backgroundVignette: state.vignetteEnabled
    });
    renderer.renderFrame(t.rawDate, t.rawDate.getTime() * 0.001);
    ctx.drawImage(renderer.canvas, 0, 0, W, H);
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

    // Seconds label follows the same angular position as the white dot.
    WfsMergePatch.drawSyncedGiantHhSeconds(ctx, {
      cx: CX, cy: CY, dotRadius: R - 18, secOrbitRadius: 190, secondValue: t.secFloat
    });

    ctx.save();
    // Giant HH in center
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '400 184px "Inter", sans-serif';
    ctx.fillText(t.hh, CX, CY);

    // Keep the live date and minute readout on one centered footer line.
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.fillText(`${t.weekdayShort.toUpperCase()} ${t.day} ${t.monthShort.toUpperCase()} · :${t.mm}`, CX, 346);
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
  function setBackgroundPosition(x, y) { state.bgOffsetX = Math.max(-180, Math.min(180, Number(x) || 0)); state.bgOffsetY = Math.max(-180, Math.min(180, Number(y) || 0)); }
  function setBackgroundScale(value) { state.bgImageScale = Math.max(0.5, Math.min(3, Number(value) || 1)); }

  window.WfsExtendedTemplateFaces = Object.freeze({
    faces: WATCH_FACES.map(({ id, category, title, subtitle, defaultBg }) =>
      Object.freeze({ id, category, title, subtitle, defaultBg })),
    renderFace: renderFaceToCanvas,
    setBackgroundColor,
    setSunburst,
    setVignette,
    setDim,
    setBackgroundImage,
    setBackgroundPosition,
    setBackgroundScale,
    setElementsWaterData(data) { getElementsWaterRenderer().setData(data); },
    ElementsWaterWatchFace
  });

})();


/* === WFS v1 preset artwork and package adapters (8 shared + 4 reference faces) === */

/* Watch Face Studio hybrid presets.
 * Decorative artwork is rendered to a 480x480 browser bitmap; live time/date
 * remain native WFS elements so the watch never displays a frozen clock.
 * Water guilloche and the amber seconds arc are static artwork; live hands/readouts remain native.
 */
(function(root){
'use strict';
const SPECS=[
{id:'motorsport',category:'analog',name:'Motorsport M-Sport',bg:'#08101e',accent:'#38bdf8',secondary:'#ef4444',style:'racing'},
{id:'gmt24',category:'analog',name:'Tactical GMT 24H',bg:'#08090c',accent:'#dc2626',secondary:'#f8fafc',style:'tactical'},
{id:'rosegold',category:'analog',name:'Classic Rose Gold',bg:'#0b0b0d',accent:'#e5b869',secondary:'#f3d193',style:'gold'},
{id:'stacked-split',category:'digital',name:'Stacked Split (12 / 00)',bg:'#06070a',accent:'#e2e8f0',secondary:'#94a3b8',style:'stacked'},
{id:'dual-tone',category:'digital',name:'Dual-Tone Bold Blocks',bg:'#0c0806',accent:'#f59e0b',secondary:'#e07a38',style:'dual'},
{id:'tall-vertical',category:'digital',name:'Tall Vertical Split (:MM)',bg:'#120714',accent:'#f9a8d4',secondary:'#fda4af',style:'tall'},
{id:'thin-outline',category:'digital',name:'Thin Outline Wide (09 07)',bg:'#070a08',accent:'#a3e635',secondary:'#bef264',style:'outline'},
{id:'angled-tech',category:'digital',name:'Angled Tech Strip',bg:'#07080c',accent:'#38bdf8',secondary:'#f43f5e',style:'angled'},
{id:'m13',category:'digital',name:'Clean Large Digital',bg:'#050608',accent:'#38bdf8',secondary:'#94a3b8',style:'clean-digital'},
{id:'m01',category:'digital',name:'Digital Bold Slim',bg:'#060709',accent:'#a3e635',secondary:'#cbd5e1',style:'m01-native'},
{id:'m10',category:'digital',name:'Minute Track & Pill',bg:'#050608',accent:'#93a5f8',secondary:'#cbd5e1',style:'m10-native'},
{id:'m16',category:'digital',name:'Crimson Night Digital',bg:'#050608',accent:'#ef4444',secondary:'#f8fafc',style:'m16-native'},
{id:'m02',category:'analog',name:'Gradient Minimal',bg:'#4f46e5',accent:'#ef4444',secondary:'#ffffff',style:'m02-native'},
{id:'m03',category:'analog',name:'Dark High-Contrast',bg:'#050608',accent:'#ef4444',secondary:'#f8fafc',style:'m03-native'},
{id:'m04',category:'analog',name:'Minimal Tick & Line',bg:'#060709',accent:'#ef4444',secondary:'#f8fafc',style:'m04-native'},
{id:'m05',category:'analog',name:'Tapered Orange Second',bg:'#050608',accent:'#ea580c',secondary:'#e2e8f0',style:'m05-native'},
{id:'m06',category:'analog',name:'Field Diamond Hybrid',bg:'#050608',accent:'#cbd5e1',secondary:'#f8fafc',style:'m06-native'},
{id:'m07',category:'analog',name:'Dress Moon Accent',bg:'#060709',accent:'#e2e8f0',secondary:'#e5b869',style:'m07-native'},
{id:'m08',category:'analog',name:'Violet Sweep Offset',bg:'#050608',accent:'#8b5cf6',secondary:'#e2e8f0',style:'m08-native'},
{id:'m09',category:'analog',name:'Blue Notch Badge',bg:'#050608',accent:'#38bdf8',secondary:'#e2e8f0',style:'m09-native'},
{id:'m11',category:'analog',name:'Elements Water',bg:'#091826',accent:'#38bdf8',secondary:'#cbd5e1',style:'m11-native'},
{id:'m12',category:'analog',name:'Elements Air',bg:'#e8e6e1',accent:'#1e3a8a',secondary:'#334155',style:'m12-native'},
{id:'m14',category:'analog',name:'Tall 12 Red Dot',bg:'#050608',accent:'#ef4444',secondary:'#e2e8f0',style:'m14-native'},
{id:'m15',category:'analog',name:'Amber Sweep Side Readouts',bg:'#2b2d30',accent:'#d97706',secondary:'#f8fafc',style:'m15-native'},
{id:'m17',category:'analog',name:'Light Cream Rust Second',bg:'#f6f3ec',accent:'#c25928',secondary:'#18181b',style:'m17-native'},
{id:'m18',category:'analog',name:'Lime Sweep Minimal',bg:'#050608',accent:'#a3e635',secondary:'#f8fafc',style:'m18-native'},
{id:'m19',category:'analog',name:'Skeleton Leaf Orange',bg:'#18191b',accent:'#ea580c',secondary:'#e2e8f0',style:'m19-native'},
{id:'m20',category:'digital',name:'Giant HH & Amber Arc',bg:'#141517',accent:'#f59e0b',secondary:'#f1f5f9',style:'m20-native'}
,{id:'ref-classic-12',category:'analog',name:'Classic Baton 12',description:'Fine chapter ring · Warm hour batons · 12 marker',bg:'#060709',accent:'#d9a452',secondary:'#e2e8f0',style:'reference-classic-12'},
{id:'ref-chronometer-gmt',category:'analog',name:'Chronometer Ring GMT',description:'Metallic bezel · Minute track · Arrowhead indices',bg:'#07080a',accent:'#cbd5e1',secondary:'#d4af6a',style:'reference-chronometer-gmt'},
{id:'ref-split-dual-digit',category:'digital',name:'Split Dual Digital',description:'Bold hours · Light minutes · Bottom readouts',bg:'#04141c',accent:'#f8fafc',secondary:'#cbd5e1',style:'reference-split-dual-digit'},
{id:'ref-minimal-arc',category:'analog',name:'Minimal Arc Gauge',description:'Radial markers · Date · Bottom arc gauge',bg:'#051521',accent:'#e2e8f0',secondary:'#94a3b8',style:'reference-minimal-arc'}];

function referenceRadialDial(ctx,inner,mid,outer,options={}){
 ctx.save();ctx.beginPath();ctx.arc(240,240,240,0,Math.PI*2);ctx.clip();
 if(options.image&&options.image.complete&&options.image.naturalWidth){
  const scale=Math.max(480/options.image.naturalWidth,480/options.image.naturalHeight)*Math.max(.5,Math.min(3,Number(options.scale)||1)),dw=options.image.naturalWidth*scale,dh=options.image.naturalHeight*scale;
  ctx.fillStyle=options.color||outer;ctx.fillRect(0,0,480,480);
  ctx.drawImage(options.image,(480-dw)/2+(Number(options.offsetX)||0),(480-dh)/2+(Number(options.offsetY)||0),dw,dh);
  ctx.fillStyle='rgba(0,0,0,'+(Math.max(0,Math.min(85,Number(options.dim)||0))/100)+')';ctx.fillRect(0,0,480,480);
 }else{
  const grad=ctx.createRadialGradient(240,222,12,240,240,240);
  grad.addColorStop(0,inner);grad.addColorStop(.58,mid);grad.addColorStop(1,outer);
  ctx.fillStyle=grad;ctx.fillRect(0,0,480,480);
 }
 ctx.restore();
}
function renderReferenceArtworkCanvas(spec,options={}){
 const canvas=document.createElement('canvas');canvas.width=480;canvas.height=480;const c=canvas.getContext('2d');
 const line=(x1,y1,x2,y2,color,w)=>{c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()};
 const txt=(value,x,y,size,color,weight=600)=>{c.font=weight+' '+size+'px system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(value,x,y)};
 const ring=(r,color,w)=>{c.beginPath();c.arc(240,240,r,0,Math.PI*2);c.lineWidth=w;c.strokeStyle=color;c.stroke()};
 const radial=(h,r)=>{const a=(h*30-90)*Math.PI/180;return [240+Math.cos(a)*r,240+Math.sin(a)*r]};
 referenceRadialDial(c,spec.style==='reference-split-dual-digit'?'#0a3a4a':spec.style==='reference-minimal-arc'?'#123952':'#11141a',spec.style==='reference-split-dual-digit'?'#061d26':spec.style==='reference-minimal-arc'?'#091f30':'#07080b',spec.bg,options);
 c.save();c.beginPath();c.arc(240,240,240,0,Math.PI*2);c.clip();
 if(spec.style==='reference-classic-12'){
  ring(230,'rgba(255,255,255,.06)',18);ring(220,'rgba(255,255,255,.16)',2);
  for(let i=0;i<60;i++){const a=(i*6-90)*Math.PI/180;c.save();c.translate(240,240);c.rotate(a);const major=i%5===0;c.fillStyle=i===0?'#e2e8f0':major?'#e2e8f0':'rgba(203,213,225,.45)';if(i===0){c.fillRect(220,-5.5,11,3.5);c.fillRect(220,2,11,3.5)}else c.fillRect(220-(major?0:-2),major?-2:-1,major?11:7,major?4:2);c.restore()}
  for(let h=1;h<12;h++){const a=(h*30-90)*Math.PI/180;c.save();c.translate(240,240);c.rotate(a);const g=c.createLinearGradient(186,-6,206,6);g.addColorStop(0,'#f0c97d');g.addColorStop(1,'#9c6c28');c.fillStyle=g;c.beginPath();c.moveTo(186,-3.5);c.lineTo(206,-6.5);c.lineTo(206,6.5);c.lineTo(186,3.5);c.closePath();c.fill();c.restore()}
  txt('12',240,54,WfsMergePatch.scaleHourFontSize(32),spec.accent,700);
 }else if(spec.style==='reference-chronometer-gmt'){
  ring(229,'rgba(203,213,225,.14)',22);ring(214,'rgba(226,232,240,.22)',2);
  for(let i=0;i<60;i++){const a=(i*6-90)*Math.PI/180;c.save();c.translate(240,240);c.rotate(a);const major=i%5===0;if(i===0){c.fillStyle='#f8fafc';c.fillRect(219,-5,13,3.5);c.fillRect(219,1.5,13,3.5)}else if(major){c.fillStyle='#e2e8f0';c.fillRect(219,-2,13,4)}c.fillStyle=major?'rgba(248,250,252,.85)':'rgba(203,213,225,.45)';c.fillRect(205,major?-1.8:-1,major?9:6,major?3.6:2);c.restore()}
  for(let h=1;h<12;h++){if(h%3===0)continue;const a=(h*30-90)*Math.PI/180;c.save();c.translate(240,240);c.rotate(a);c.fillStyle=spec.secondary;c.beginPath();c.moveTo(176,0);c.lineTo(194,-7);c.lineTo(189,0);c.lineTo(194,7);c.closePath();c.fill();c.restore()}
  txt('12',240,64,WfsMergePatch.scaleHourFontSize(32),spec.secondary);txt('3',416,242,WfsMergePatch.scaleHourFontSize(32),spec.secondary);txt('6',240,416,WfsMergePatch.scaleHourFontSize(32),spec.secondary);txt('9',64,242,WfsMergePatch.scaleHourFontSize(32),spec.secondary);
 }else if(spec.style==='reference-minimal-arc'){
  for(let h=0;h<12;h++){const a=(h*30-90)*Math.PI/180;c.save();c.translate(240,240);c.rotate(a);c.fillStyle='rgba(241,245,249,.85)';if(h===0){c.fillRect(204,-6.5,24,4);c.fillRect(204,2.5,24,4)}else c.fillRect(206,-2,22,4);c.restore();const d=(h*30+15-90)*Math.PI/180;c.beginPath();c.arc(240+Math.cos(d)*226,240+Math.sin(d)*226,2.6,0,Math.PI*2);c.fillStyle='rgba(203,213,225,.55)';c.fill()}
  const gcx=240,gcy=342,gr=54,start=135*Math.PI/180,end=405*Math.PI/180,progress=295*Math.PI/180;c.lineCap='round';c.lineWidth=8;c.strokeStyle='rgba(148,163,184,.28)';c.beginPath();c.arc(gcx,gcy,gr,start,end);c.stroke();c.strokeStyle='rgba(226,232,240,.72)';c.beginPath();c.arc(gcx,gcy,gr,start,progress);c.stroke();c.beginPath();c.arc(gcx+Math.cos(progress)*gr,gcy+Math.sin(progress)*gr,5,0,Math.PI*2);c.fillStyle='#f8fafc';c.fill();
 }
 c.restore();return canvas;
}

function renderArtworkCanvas(spec,options={}){
 if(String(spec.style||'').startsWith('reference-'))return renderReferenceArtworkCanvas(spec,options);
 const canvas=document.createElement('canvas');canvas.width=480;canvas.height=480;
 const c=canvas.getContext('2d');const {bg,accent,secondary,style}=spec;
 const baseHex=/^#[0-9a-f]{6}$/i.test(options.color||'')?options.color:bg;

 // Elements Water has one decorative renderer: use the same Guilloche implementation
 // as the live template preview when creating the WFS1 artwork snapshot. The watch
 // receives these exact RGB565 pixels; live hands remain native WFS objects.
 if(style==='m11-native'){
  const WaterRenderer=root.WfsExtendedTemplateFaces&&root.WfsExtendedTemplateFaces.ElementsWaterWatchFace;
  if(typeof WaterRenderer!=='function')throw new Error('Elements Water renderer is unavailable');
  const waterCanvas=document.createElement('canvas');waterCanvas.width=600;waterCanvas.height=600;
  const water=new WaterRenderer(waterCanvas);
  water.setData({
   backgroundImage:options.image||null,
   backgroundColor:baseHex,
   backgroundDim:options.dim??0,
   backgroundOffsetX:options.offsetX??0,
   backgroundOffsetY:options.offsetY??0,
   backgroundScale:options.scale??1,
   backgroundSunburst:options.sunburst!==false,
   backgroundVignette:options.vignette!==false
  });
  water._drawFlowingGuilloche(0);
  water.ctx.save();
  water.ctx.beginPath();water.ctx.arc(water.CX,water.CY,water.R,0,Math.PI*2);water.ctx.clip();
  water.ctx.drawImage(water.waveCanvas,0,0);
  water._drawBezelAndIndices();
  water.ctx.restore();
  c.drawImage(waterCanvas,0,0,480,480);
  return canvas;
 }
 if(options.image&&options.image.complete&&options.image.naturalWidth){
  const scale=Math.max(480/options.image.naturalWidth,480/options.image.naturalHeight)*Math.max(.5,Math.min(3,Number(options.scale)||1)),dw=options.image.naturalWidth*scale,dh=options.image.naturalHeight*scale;
  c.fillStyle=baseHex;c.fillRect(0,0,480,480);
  c.drawImage(options.image,(480-dw)/2+(Number(options.offsetX)||0),(480-dh)/2+(Number(options.offsetY)||0),dw,dh);
  c.fillStyle='rgba(0,0,0,'+(Math.max(0,Math.min(85,Number(options.dim)||0))/100)+')';c.fillRect(0,0,480,480);
 }else{
  c.fillStyle=baseHex;c.fillRect(0,0,480,480);
  if(options.sunburst!==false){const conic=c.createConicGradient(0,240,240),light=lighten(baseHex,26),dark=lighten(baseHex,-14);[[0,dark],[.14,light],[.28,dark],[.5,light],[.66,dark],[.84,light],[1,dark]].forEach(([stop,color])=>conic.addColorStop(stop,color));c.fillStyle=conic;c.fillRect(0,0,480,480)}
  if(options.vignette!==false){const vignette=c.createRadialGradient(240,240,60,240,240,240);vignette.addColorStop(0,'rgba(255,255,255,.04)');vignette.addColorStop(.72,'rgba(0,0,0,.16)');vignette.addColorStop(1,'rgba(0,0,0,.72)');c.fillStyle=vignette;c.fillRect(0,0,480,480)}
 }
 c.save();c.beginPath();c.arc(240,240,232,0,Math.PI*2);c.clip();
 const line=(x1,y1,x2,y2,color=accent,w=2)=>{c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()};
 const ring=(r,color,w)=>{c.beginPath();c.arc(240,240,r,0,Math.PI*2);c.strokeStyle=color;c.lineWidth=w;c.stroke()};
 const txt=(s,x,y,size,color,weight=600,font='Arial')=>{c.font=weight+' '+size+'px '+font;c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(s,x,y)};
 if(['racing','tactical','gold'].includes(style)){
  ring(452/2,style==='gold'?'rgba(229,184,105,.25)':'rgba(255,255,255,.12)',8);
  for(let i=0;i<60;i++){const a=(i*6-90)*Math.PI/180,major=i%5===0;const r1=style==='racing'?206:205,r2=r1-(major?18:9);line(240+Math.cos(a)*r1,240+Math.sin(a)*r1,240+Math.cos(a)*r2,240+Math.sin(a)*r2,major?'rgba(255,255,255,.8)':'rgba(255,255,255,.3)',major?4:2)}
 }
 if(style==='racing'){
  c.lineWidth=22;c.strokeStyle='rgba(185,28,28,.75)';c.beginPath();c.arc(240,240,218,-Math.PI/2,0);c.stroke();c.strokeStyle='rgba(29,78,216,.75)';c.beginPath();c.arc(240,240,218,0,Math.PI/2);c.stroke();
  for(let i=0;i<12;i++){const a=(i*30-90)*Math.PI/180; c.save();c.translate(240,240);c.rotate(a);c.fillStyle='#cbd5e1';c.fillRect(190,-8,22,16);c.restore()}
  txt('12',240,62,36,'#f1f5f9',700);txt('6',240,418,36,'#f1f5f9',700);txt('3',418,242,30,'#f1f5f9',700);txt('9',62,242,30,'#f1f5f9',700);
  c.beginPath();c.arc(240,145,24,0,Math.PI*2);c.fillStyle='#0f172a';c.fill();c.strokeStyle='#e2e8f0';c.lineWidth=3;c.stroke();txt('M',240,145,22,'#38bdf8',700);
  txt('MOTORSPORT',240,185,13,'#94a3b8',700);
 }else if(style==='tactical'){
  line(54,54,426,426,'rgba(153,27,27,.18)',26);line(426,54,54,426,'rgba(153,27,27,.18)',26);
  for(let h=2;h<=24;h+=2){const a=((h%24)*15-90)*Math.PI/180;txt(String(h),240+Math.cos(a)*150,240+Math.sin(a)*150,22,'#f8fafc',600)}
  txt('TACTICAL',240,156,22,'#f8fafc',700);txt('GMT',240,184,18,'#dc2626',700);txt('WATER RESISTANT',240,378,12,'#cbd5e1',600);txt('660ft - 200m',240,402,12,'#cbd5e1',600);
 }else if(style==='gold'){
  ring(212,'rgba(255,255,255,.12)',26);ring(230,'rgba(255,255,255,.2)',3);
  for(let h=0;h<12;h++){const a=(h*30-90)*Math.PI/180;const r=184;line(240+Math.cos(a)*r,240+Math.sin(a)*r,240+Math.cos(a)*(r-18),240+Math.sin(a)*(r-18),'#d49b4b',7)}
  txt('12',240,66,36,'#e5b869',700);
 }else if(style==='stacked'){
  for(let i=0;i<60;i++){const a=(i*6-90)*Math.PI/180;line(240+Math.cos(a)*218,240+Math.sin(a)*218,240+Math.cos(a)*207,240+Math.sin(a)*207,i%5===0?'rgba(248,250,252,.55)':'rgba(148,163,184,.22)',2)}
  c.strokeStyle='rgba(148,163,184,.55)';c.lineWidth=3;c.strokeRect(310,210,96,44);
 }else if(style==='dual'){
  for(let i=0;i<48;i++){const a=(i*7.5-90)*Math.PI/180;line(240+Math.cos(a)*216,240+Math.sin(a)*216,240+Math.cos(a)*198,240+Math.sin(a)*198,'rgba(245,158,11,.28)',7)}

 }else if(style==='tall'){
  line(52,80,428,80,'rgba(249,168,212,.28)',2);line(52,400,428,400,'rgba(249,168,212,.28)',2);

 }else if(style==='outline'){
  ring(220,'rgba(163,230,53,.22)',2);
 }else if(style==='m01-native'){
  ring(218,'rgba(163,230,53,.24)',2);line(44,352,436,352,'rgba(163,230,53,.24)',2);
 }else if(style==='m10-native'){
  for(let i=0;i<60;i++){const a=(i*6-90)*Math.PI/180,major=i%5===0;line(240+Math.cos(a)*218,240+Math.sin(a)*218,240+Math.cos(a)*(major?196:205),240+Math.sin(a)*(major?196:205),major?'#cbd5e1':'#64748b',major?3:2)}
  for(let m=5;m<=60;m+=5){const a=(m*6-90)*Math.PI/180;txt(String(m),240+Math.cos(a)*176,240+Math.sin(a)*176,17,m%15===0?'#93a5f8':'#e2e8f0',600)}
  c.fillStyle='#93a5f8';c.beginPath();c.roundRect(206,80,68,38,19);c.fill();
 }else if(style==='m16-native'){
  ring(216,'rgba(239,68,68,.22)',2);line(80,240,400,240,'rgba(148,163,184,.12)',1);

 }else if(style==='m20-native'){
  ring(220,'rgba(245,158,11,.22)',12);c.beginPath();c.arc(240,240,220,-Math.PI/2,Math.PI*1.42);c.strokeStyle='#f59e0b';c.lineWidth=12;c.lineCap='round';c.stroke();c.beginPath();c.arc(240,20,10,0,Math.PI*2);c.fillStyle='#ffffff';c.fill();
 }else if(/^m(02|03|04|05|06|07|08|09|11|12|14|15|17|18|19)-native$/.test(style)){
  const light=['m12-native','m17-native'].includes(style),ink=light?'#334155':'#e2e8f0',muted=light?'rgba(51,65,85,.35)':'rgba(203,213,225,.35)';
  ring(226,light?'rgba(51,65,85,.18)':'rgba(226,232,240,.14)',style==='m04-native'?4:2);
  for(let i=0;i<60;i++){const a=(i*6-90)*Math.PI/180,major=i%5===0;c.save();c.translate(240,240);c.rotate(a);c.fillStyle=major?ink:muted;c.fillRect(216,major?-2.2:-1,major?12:6,major?4.4:2);c.restore()}
  if(style==='m02-native'){for(let h=0;h<6;h++){const a=(h*60-90)*Math.PI/180;txt(String([12,2,4,6,8,10][h]),240+Math.cos(a)*174,240+Math.sin(a)*174,24,'#ffffff',600)}ring(150,'rgba(255,255,255,.18)',2)}
  else if(style==='m03-native'){[0,3,6,9].forEach(h=>{const a=(h*30-90)*Math.PI/180;txt(String(h||12),240+Math.cos(a)*172,240+Math.sin(a)*172,25,'#f8fafc',700)});line(78,344,402,344,'rgba(148,163,184,.18)',2)}
  else if(style==='m04-native'){ring(188,'rgba(148,163,184,.25)',2);for(let h=0;h<12;h++){const a=(h*30-90)*Math.PI/180;line(240+Math.cos(a)*190,240+Math.sin(a)*190,240+Math.cos(a)*164,240+Math.sin(a)*164,h%3===0?'#94a3b8':'#475569',h%3===0?5:3)}}
  else if(style==='m05-native'){for(let h=0;h<12;h++){const a=(h*30-90)*Math.PI/180;c.save();c.translate(240,240);c.rotate(a);c.fillStyle='#e2e8f0';c.beginPath();c.moveTo(178,-3);c.lineTo(204,-7);c.lineTo(204,7);c.lineTo(178,3);c.closePath();c.fill();c.restore()}txt('DAY / DATE',240,356,14,'#ea580c',700)}
  else if(style==='m06-native'){for(let h=1;h<=12;h++){const a=(h*30-90)*Math.PI/180;txt(String(h),240+Math.cos(a)*184,240+Math.sin(a)*184,20,ink,600)}ring(144,'rgba(148,163,184,.2)',2)}
  else if(style==='m07-native'){ring(190,'rgba(226,232,240,.16)',3);c.beginPath();c.arc(240,240,30,-Math.PI/2,Math.PI/2);c.fillStyle='#e5e7eb';c.fill();c.beginPath();c.arc(254,232,28,0,Math.PI*2);c.fillStyle='#060709';c.fill();txt('12',240,64,36,'#e5b869',700)}
  else if(style==='m08-native'){ring(204,'rgba(139,92,246,.35)',3);for(let h=0;h<12;h++){const a=(h*30-90)*Math.PI/180;line(240+Math.cos(a)*200,240+Math.sin(a)*200,240+Math.cos(a)*176,240+Math.sin(a)*176,'#8b5cf6',4)}txt('VIOLET',240,356,13,'#8b5cf6',700)}
  else if(style==='m09-native'){for(let h=0;h<12;h++){const a=(h*30-90)*Math.PI/180;c.save();c.translate(240,240);c.rotate(a);c.fillStyle='#38bdf8';c.fillRect(190,-5,24,10);c.restore()}c.fillStyle='#0b2233';c.beginPath();c.roundRect(170,330,140,48,12);c.fill();c.strokeStyle='#38bdf8';c.lineWidth=2;c.stroke()}
  else if(style==='m12-native'){for(let h=0;h<12;h++){const a=(h*30-90)*Math.PI/180;line(240+Math.cos(a)*190,240+Math.sin(a)*190,240+Math.cos(a)*164,240+Math.sin(a)*164,'#94a3b8',10)}ring(132,'rgba(30,58,138,.3)',3);ring(76,'rgba(30,58,138,.22)',3);txt('PEARL',240,74,14,'#1e3a8a',700)}
  else if(style==='m14-native'){txt('12',240,104,72,'#e2e8f0',200);for(let h=1;h<12;h++){const a=(h*30-90)*Math.PI/180;line(240+Math.cos(a)*194,240+Math.sin(a)*194,240+Math.cos(a)*178,240+Math.sin(a)*178,'#64748b',3)}}
  else if(style==='m15-native'){c.beginPath();c.arc(240,240,218,-.35,.55);c.strokeStyle='rgba(255,255,255,.28)';c.lineWidth=10;c.stroke();c.beginPath();c.arc(240,240,218,.15,.55);c.strokeStyle='#f8fafc';c.lineWidth=10;c.stroke()}
  else if(style==='m17-native'){ring(204,'rgba(15,23,42,.16)',2);[[240,44],[240,436],[44,240],[436,240]].forEach(([x,y])=>{c.beginPath();c.arc(x,y,7,0,Math.PI*2);c.fillStyle='#0f172a';c.fill()})}
  else if(style==='m18-native'){ring(204,'rgba(148,163,184,.28)',2);for(let h=0;h<12;h++){const a=(h*30-90)*Math.PI/180;c.beginPath();c.arc(240+Math.cos(a)*204,240+Math.sin(a)*204,5,0,Math.PI*2);c.fillStyle='#a3e635';c.fill()}}
  else if(style==='m19-native'){for(let h=0;h<12;h++){const a=(h*30-90)*Math.PI/180;line(240+Math.cos(a)*202,240+Math.sin(a)*202,240+Math.cos(a)*178,240+Math.sin(a)*178,h%3===0?'#94a3b8':'#475569',5)}ring(150,'rgba(234,88,12,.18)',2)}
 }else if(style==='angled'){
  line(64,420,64,56,'rgba(248,250,252,.35)',3);line(64,56,445,275,'rgba(248,250,252,.35)',3);line(118,126,450,315,'rgba(248,250,252,.35)',3);
  c.save();c.translate(286,236);c.rotate(29*Math.PI/180);c.fillStyle='rgba(15,23,42,.82)';c.fillRect(-126,-24,252,48);c.strokeStyle='rgba(248,250,252,.45)';c.lineWidth=2;c.strokeRect(-126,-24,252,48);
  const days=['M','T','W','T','F','S','S'];days.forEach((day,index)=>{c.font='700 22px Arial';c.textAlign='center';c.textBaseline='middle';c.fillStyle=index===4?'#38bdf8':'#f1f5f9';c.fillText(day,-96+index*32,0)});c.restore();
 }
 c.restore();return canvas;
}
function renderBackground(spec,options){return renderArtworkCanvas(spec,options||{}).toDataURL('image/png')}
function renderThumbnail(spec,options={}){
 const canvas=renderArtworkCanvas(spec,options),c=canvas.getContext('2d');
 const text=(value,x,y,size,color,weight=600)=>{c.font=weight+' '+size+'px system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(value,x,y)};
 if(String(spec.style||'').startsWith('reference-')){
 
  if(spec.style==='reference-split-dual-digit'){text('10',222,150,126,'#f8fafc');text('AM',320,174,25,'#f8fafc');c.font='400 116px system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.strokeStyle='#f1f5f9';c.lineWidth=4;c.strokeText('08',246,268);c.fillStyle='rgba(248,250,252,.18)';c.fillText('08',246,268);text('18:49',252,366,22,'#e2e8f0');text('86%',252,404,18,'#e2e8f0');return canvas.toDataURL('image/png')}
  const hand=(angle,length,width,color)=>{c.save();c.translate(240,240);c.rotate(angle);c.fillStyle=color;c.beginPath();c.moveTo(-12,-width*.45);c.lineTo(length,-1.5);c.lineTo(length,1.5);c.lineTo(-12,width*.45);c.closePath();c.fill();c.restore()};
  const h=-Math.PI/2-.42,m=-Math.PI/2+.9,sec=-Math.PI/2+1.65;
  if(spec.style==='reference-minimal-arc'){text('17 JUL',240,126,22,'#f8fafc');text('31',240,336,44,'#f8fafc');text('26  31',240,370,18,'#cbd5e1')}
  hand(h,116,10,'#f1f5f9');hand(m,151,8,'#f8fafc');hand(sec,166,3,spec.style==='reference-classic-12'?'#d9a452':'#e2e8f0');c.beginPath();c.arc(240,240,7,0,Math.PI*2);c.fillStyle=spec.style==='reference-classic-12'?'#d9a452':'#f8fafc';c.fill();
  return canvas.toDataURL('image/png');
 }
 


 if(spec.style==='m01-native'){
  text('NOV 28 · 2026',240,118,24,'#cbd5e1',600);text('09',142,250,116,'#a3e635',300);text('42',338,250,116,'#a3e635',300);text('SAT · :15',240,374,23,'#a3e635',600);
 }else if(spec.style==='m10-native'){
  text('28',240,116,25,'#090d16',700);text('SAT',240,160,25,'#f8fafc',600);text('09:42',240,250,92,'#f8fafc',400);text('NOV 2026 · :15',240,340,20,'#94a3b8',600);
 }else if(spec.style==='m16-native'){
  text('09:42',240,110,62,'#ef4444',700);text('28 NOV',240,166,30,'#ef4444',700);
 }else if(spec.style==='m20-native'){
  text('09',240,224,150,'#f1f5f9',400);text('SAT 28 NOV · :42',240,354,20,'#f59e0b',600);
 }else if(spec.style==='clean-digital'){
  text('SAT 28 NOV',240,138,24,'#94a3b8',600);
  text('09:42',240,242,108,'#f8fafc',400);
  text('2026 | :15',240,336,24,'#38bdf8',600);
 }else if(spec.category==='analog'){
  const colors=spec.style==='gold'?['#e5b869','#e5b869','#f3d193']:spec.style==='tactical'?['#ffffff','#ffffff','#dc2626']:['#f8fafc','#f8fafc','#ef4444'];
  const angles=[-Math.PI/2-0.42,-Math.PI/2+0.9,-Math.PI/2+1.65],lengths=[116,151,166],widths=[9,6,3];
  for(let i=0;i<3;i++){const x=240+Math.cos(angles[i])*lengths[i],y=240+Math.sin(angles[i])*lengths[i];c.strokeStyle=colors[i];c.lineWidth=widths[i];c.lineCap='round';c.beginPath();c.moveTo(240,240);c.lineTo(x,y);c.stroke()}
  c.fillStyle=colors[2];c.beginPath();c.arc(240,240,7,0,Math.PI*2);c.fill();
 }else{
  const style=spec.style;
  if(style==='stacked'){text('12',240,190,100,'#f8fafc',600);text('00',240,292,100,'#f8fafc',600);text('38',358,232,27,'#94a3b8',600)}
  if(style==='dual'){text('12',240,200,112,'#f7dfb8',600);text('00',240,314,112,'#e07a38',600);text('38',240,388,25,'#fbbf24',600)}
  if(style==='tall'){text('12',240,222,132,'#f9a8d4',600);text(':00',240,350,118,'#f9a8d4',600)}
  if(style==='outline'){text('09',142,260,92,'#bef264',400);text('07',338,260,92,'#bef264',400);text('38',240,350,30,'#bef264',600)}
  if(style==='angled'){text('09:07',286,265,64,'#f8fafc',600);text('38',340,328,28,'#38bdf8',600);text('FRI, 07 NOV',240,392,20,'#cbd5e1',600)}
  if(style==='clean-digital'){text('SAT 28 NOV',240,138,24,'#94a3b8',600);text('09:42',240,242,108,'#f8fafc',400);text('2026 | :15',240,336,24,'#38bdf8',600)}
  if(!['angled','clean-digital'].includes(style))text('FRI, 07 NOV',240,414,19,style==='dual'?'#e7b887':'#cbd5e1',600);
 }
 return canvas.toDataURL('image/png');
}
const livePreviewBaseCache=new WeakMap();
function renderLivePreview(spec,targetCanvas,now=new Date(),options={}){
 if(!spec||!targetCanvas||typeof targetCanvas.getContext!=='function')return;
 const ctx=targetCanvas.getContext('2d');if(!ctx)return;
 const image=options.image||null;
 const key=[spec.id,options.color||spec.bg,options.dim??0,options.sunburst!==false,options.vignette!==false,options.offsetX??0,options.offsetY??0,options.scale??1].join('|');
 let cached=livePreviewBaseCache.get(targetCanvas);
 if(!cached||cached.key!==key||cached.image!==image){
  cached={key,image,base:renderArtworkCanvas(spec,options)};
  livePreviewBaseCache.set(targetCanvas,cached);
 }
 ctx.clearRect(0,0,targetCanvas.width,targetCanvas.height);
 ctx.drawImage(cached.base,0,0,targetCanvas.width,targetCanvas.height);
 const stamp=now instanceof Date&&Number.isFinite(now.getTime())?now:new Date();
 const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
 const seconds=stamp.getSeconds()+stamp.getMilliseconds()/1000;
 const minutes=stamp.getMinutes()+seconds/60;
 const hours24=stamp.getHours(),hours12=hours24%12||12;
 const hourAngle=((hours24%12)+minutes/60)*30-90;
 const minuteAngle=minutes*6-90;
 const secondAngle=seconds*6-90;
 ctx.save();
 ctx.scale(targetCanvas.width/480,targetCanvas.height/480);
 const text=(value,x,y,size,color,weight=600)=>{
  ctx.font=weight+' '+size+'px system-ui, sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(value,x,y);
 };
 const hand=(angle,length,width,color,tail=12)=>{
  ctx.save();ctx.translate(240,240);ctx.rotate(angle*Math.PI/180);
  ctx.fillStyle=color;ctx.beginPath();
  ctx.moveTo(-tail,-width*.45);ctx.lineTo(length*.78,-width*.65);
  ctx.lineTo(length,0);ctx.lineTo(length*.78,width*.65);ctx.lineTo(-tail,width*.45);
  ctx.closePath();ctx.fill();ctx.restore();
 };
 if(spec.style==='m01-native'){
  text(months[stamp.getMonth()]+' '+String(stamp.getDate()).padStart(2,'0')+' · '+stamp.getFullYear(),240,118,24,'#cbd5e1',600);
  text(String(stamp.getHours()).padStart(2,'0'),142,250,116,'#a3e635',300);text(String(stamp.getMinutes()).padStart(2,'0'),338,250,116,'#a3e635',300);
  text(['SUN','MON','TUE','WED','THU','FRI','SAT'][stamp.getDay()]+' · :'+String(stamp.getSeconds()).padStart(2,'0'),240,374,23,'#a3e635',600);
 }else if(spec.style==='m10-native'){
  text(String(stamp.getDate()).padStart(2,'0'),240,116,25,'#090d16',700);text(['SUN','MON','TUE','WED','THU','FRI','SAT'][stamp.getDay()],240,160,25,'#f8fafc',600);
  text(String(stamp.getHours()).padStart(2,'0')+':'+String(stamp.getMinutes()).padStart(2,'0'),240,250,92,'#f8fafc',400);
  text(months[stamp.getMonth()]+' '+stamp.getFullYear()+' · :'+String(stamp.getSeconds()).padStart(2,'0'),240,340,20,'#94a3b8',600);
 }else if(spec.style==='m16-native'){
  text(String(stamp.getHours()).padStart(2,'0')+':'+String(stamp.getMinutes()).padStart(2,'0'),240,110,62,'#ef4444',700);
  text(String(stamp.getDate()).padStart(2,'0')+' '+months[stamp.getMonth()],240,166,30,'#ef4444',700);
 }else if(spec.style==='m20-native'){
  text(String(hours24).padStart(2,'0'),240,224,150,'#f1f5f9',400);text(['SUN','MON','TUE','WED','THU','FRI','SAT'][stamp.getDay()]+' '+String(stamp.getDate()).padStart(2,'0')+' '+months[stamp.getMonth()]+' · :'+String(stamp.getMinutes()).padStart(2,'0'),240,354,20,'#f59e0b',600);
  const a=secondAngle*Math.PI/180;ctx.beginPath();ctx.arc(240,240,222,-Math.PI/2,a,false);ctx.strokeStyle='#f59e0b';ctx.lineWidth=12;ctx.lineCap='round';ctx.stroke();ctx.beginPath();ctx.arc(240+Math.cos(a)*222,240+Math.sin(a)*222,9,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
 }else if(spec.style==='reference-split-dual-digit'){
  text(String(hours12).padStart(2,'0'),222,150,126,'#f8fafc',400);
  text(hours24>=12?'PM':'AM',320,174,25,'#f8fafc',600);
  ctx.font='400 116px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.strokeStyle='#f1f5f9';ctx.lineWidth=4;
  ctx.strokeText(String(stamp.getMinutes()).padStart(2,'0'),246,268);
  ctx.fillStyle='rgba(248,252,255,.18)';
  ctx.fillText(String(stamp.getMinutes()).padStart(2,'0'),246,268);
  text(String(hours12).padStart(2,'0')+':'+String(stamp.getMinutes()).padStart(2,'0')+':'+String(stamp.getSeconds()).padStart(2,'0'),252,366,22,'#e2e8f0',500);
  text('86%',252,404,18,'#e2e8f0',600);
 }else{
  const classic=spec.style==='reference-classic-12';
  const minimal=spec.style==='reference-minimal-arc';
  const hourColor=classic?'#f1f5f9':'#f8fafc';
  const minuteColor=classic?'#f8fafc':'#f1f5f9';
  const secondColor=classic?'#d9a452':minimal?'#e2e8f0':'#e2e8f0';
  hand(hourAngle,minimal?104:116,10,hourColor,14);
  hand(minuteAngle,minimal?145:151,7,minuteColor,14);
  hand(secondAngle,minimal?166:166,3,secondColor,18);
  ctx.beginPath();ctx.arc(240,240,7,0,Math.PI*2);
  ctx.fillStyle=classic?'#d9a452':'#f8fafc';ctx.fill();
  if(minimal){
   const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
   text(String(stamp.getDate()).padStart(2,'0')+' '+months[stamp.getMonth()],240,126,22,'#f8fafc',600);
   text('31',240,336,44,'#f8fafc',600);
   text('26  31',240,370,18,'#cbd5e1',500);
  }
 }
 ctx.restore();
}

function lighten(hex,delta){const n=parseInt(hex.slice(1),16);const f=v=>Math.max(0,Math.min(255,v+delta));return '#'+[f(n>>16),f((n>>8)&255),f(n&255)].map(v=>v.toString(16).padStart(2,'0')).join('')}
function createReferenceObjects(spec,assetId){
 const objects=[{id:'preset_bg_'+spec.id,type:'image',name:spec.name+' artwork',assetId,visible:true,locked:true,transform:{x:0,y:0,width:240,height:240,anchor:'top-left',opacity:1,rotation:0,zIndex:0}}];
 const add=(type,name,x,y,w,h,extra,z)=>{const object={id:'preset_'+spec.id+'_'+z,type,name,visible:true,locked:false,transform:{x,y,width:w,height:h,anchor:'top-left',opacity:1,rotation:0,zIndex:z},...extra};objects.push(object);return object};
 const textStyle=(fontSize,fontWeight,fill,textAlign='center')=>({fontSize,fontWeight,fill,fontFamily:'system-ui',textAlign});
 const digital=(name,x,y,w,h,format,size,color,z,timeFormat='24h',weight=600)=>add('digital-clock',name,x,y,w,h,{clockMode:'digital',timeFormat,dataBinding:{source:'time',format},textStyle:textStyle(size,weight,color)},z);
 const staticText=(name,value,x,y,w,h,size,color,z,weight=600)=>add('text',name,x,y,w,h,{text:value,textStyle:textStyle(size,weight,color)},z);
 const date=(x,y,w,h,size,color,z)=>add('date','Date',x,y,w,h,{dataBinding:{source:'date',format:'DD MMM'},textStyle:textStyle(size,400,color)},z);
 const analog=(hour,minute,second,centerColor,centerRadius,z)=>{const object=add('analog-clock','Live analog hands',16,16,208,208,{clockMode:'analog',handConfig:{hour:{length:hour.length,width:hour.width,tail:hour.tail,color:hour.color},minute:{length:minute.length,width:minute.width,tail:minute.tail,color:minute.color},second:{length:second.length,width:second.width,tail:second.tail,color:second.color},centerColor,centerRadius,showOuterRing:false,showHourTicks:false}},z);if(spec.style==='reference-classic-12'||spec.style==='reference-chronometer-gmt')object.transform=WfsMergePatch.scaleTransformAroundCenter(object.transform,1.75,240);return object};
 if(spec.style==='reference-classic-12'){
  analog({length:50,width:5,tail:8,color:'#f1f5f9'},{length:76,width:3.8,tail:10,color:'#f8fafc'},{length:88,width:1.5,tail:15,color:'#d9a452'},'#d9a452',3.5,1);
 }else if(spec.style==='reference-chronometer-gmt'){
  analog({length:52,width:5.5,tail:9,color:'#f8fafc'},{length:78,width:4,tail:11,color:'#f8fafc'},{length:90,width:1.5,tail:15,color:'#e2e8f0'},'#f8fafc',3.5,1);
 }else if(spec.style==='reference-split-dual-digit'){
  // Firmware appends AM/PM for 12h clocks, so keep the period in the same live HH field.
  digital('Hours',32,38,176,52,'HH',42,'#f8fafc',1,'12h',600);
  digital('Minutes',56,92,128,58,'mm',52,'#f1f5f9',2,'24h',400);
  digital('Sub time',64,168,112,18,'HH:mm:ss',11,'#e2e8f0',3);
  staticText('Status','86%',64,188,112,18,11,'#e2e8f0',4);
 }else if(spec.style==='reference-minimal-arc'){
  date(72,48,96,20,11,'#f8fafc',1);
  analog({length:48,width:4,tail:10,color:'#e2e8f0'},{length:76,width:3,tail:12,color:'#f1f5f9'},{length:88,width:1.5,tail:15,color:'#e2e8f0'},'#f8fafc',3,2);
  staticText('Arc value','31',88,152,64,24,20,'#f8fafc',3);
  staticText('Arc range','26  31',80,176,80,16,9,'#cbd5e1',4,400);
 }
 return objects;
}

function createObjects(spec,assetId){
 if(String(spec.style||'').startsWith('reference-'))return createReferenceObjects(spec,assetId);
 const objects=[{id:'preset_bg_'+spec.id,type:'image',name:'Preset artwork',assetId,visible:true,locked:true,transform:{x:0,y:0,width:240,height:240,anchor:'top-left',rotation:0,opacity:1,zIndex:0}}];
 const add=(type,name,x,y,w,h,extra,z)=>{const object={id:'preset_'+spec.id+'_'+z,type,name,visible:true,locked:false,transform:{x,y,width:w,height:h,anchor:'top-left',rotation:0,opacity:1,zIndex:z},...extra};objects.push(object);return object};
 if(spec.style==='m01-native'){
  add('date','Date',28,48,184,18,{dataBinding:{source:'date',format:'ddd DD MMM YYYY'},textStyle:{fontSize:12,fontWeight:600,fill:'#cbd5e1',fontFamily:'system-ui',textAlign:'center'}},1);
  add('digital-clock','Hours',24,91,92,72,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH'},textStyle:{fontSize:48,fontWeight:400,fill:'#a3e635',fontFamily:'system-ui',textAlign:'center'}},2);
  add('digital-clock','Minutes',124,91,92,72,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'mm'},textStyle:{fontSize:48,fontWeight:400,fill:'#a3e635',fontFamily:'system-ui',textAlign:'center'}},3);
  add('digital-clock','Seconds',72,174,96,20,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'ss'},textStyle:{fontSize:12,fontWeight:600,fill:'#a3e635',fontFamily:'system-ui',textAlign:'center'}},4);
 }else if(spec.style==='m10-native'){
  add('date','Day of month',102,38,36,20,{dataBinding:{source:'date',format:'DD'},textStyle:{fontSize:17,fontWeight:600,fill:'#090d16',fontFamily:'system-ui',textAlign:'center'}},1);
  add('date','Weekday',82,76,76,20,{dataBinding:{source:'date',format:'ddd'},textStyle:{fontSize:13,fontWeight:600,fill:'#f8fafc',fontFamily:'system-ui',textAlign:'center'}},2);
  add('digital-clock','Time',22,99,196,58,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH:mm'},textStyle:{fontSize:43,fontWeight:400,fill:'#f8fafc',fontFamily:'system-ui',textAlign:'center'}},3);
  add('date','Month and year',46,164,148,20,{dataBinding:{source:'date',format:'MMM YYYY'},textStyle:{fontSize:11,fontWeight:600,fill:'#94a3b8',fontFamily:'system-ui',textAlign:'center'}},4);
  add('digital-clock','Seconds',94,185,52,16,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'ss'},textStyle:{fontSize:10,fontWeight:600,fill:'#93a5f8',fontFamily:'system-ui',textAlign:'center'}},5);
 }else if(spec.style==='m16-native'){
  add('digital-clock','Digital time',48,30,144,34,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH:mm'},textStyle:{fontSize:27,fontWeight:600,fill:'#ef4444',fontFamily:'system-ui',textAlign:'center'}},1);
  add('date','Date',76,58,88,22,{dataBinding:{source:'date',format:'DD MMM'},textStyle:{fontSize:14,fontWeight:600,fill:'#ef4444',fontFamily:'system-ui',textAlign:'center'}},2);
  add('analog-clock','Live analog hands',16,16,208,208,{clockMode:'analog',textStyle:{fontSize:12,fontWeight:400,fill:'#f8fafc',fontFamily:'system-ui'},handConfig:{hour:{length:54,width:4,tail:10,color:'#e2e8f0'},minute:{length:78,width:3,tail:12,color:'#f8fafc'},second:{length:0,width:0.25,tail:0,color:'#ef4444'},centerColor:'#1e293b',centerRadius:3,showOuterRing:false,showHourTicks:false}},3);
 }else if(spec.style==='m20-native'){
  add('digital-clock','Giant hour',12,48,216,106,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH'},textStyle:{fontSize:88,fontWeight:400,fill:'#f1f5f9',fontFamily:'system-ui',textAlign:'center'}},1);
  add('date','Date and weekday',18,164,150,20,{dataBinding:{source:'date',format:'ddd DD MMM'},textStyle:{fontSize:10,fontWeight:600,fill:'#94a3b8',fontFamily:'system-ui',textAlign:'center'}},2);
  add('digital-clock','Minutes',160,164,54,20,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'mm'},textStyle:{fontSize:13,fontWeight:600,fill:'#f59e0b',fontFamily:'system-ui',textAlign:'center'}},3);
  add('analog-clock','Live amber seconds sweep',16,16,208,208,{clockMode:'analog',textStyle:{fontSize:12,fontWeight:400,fill:'#f59e0b',fontFamily:'system-ui'},handConfig:{hour:{length:0,width:0.25,tail:0,color:'#f59e0b',visible:false},minute:{length:0,width:0.25,tail:0,color:'#f59e0b',visible:false},second:{length:94,width:2,tail:0,color:'#f59e0b'},centerColor:'#f59e0b',centerRadius:2,showOuterRing:false,showHourTicks:false}},4);
 }else if(spec.style==='clean-digital'){
  add('date','Weekday and date',30,58,180,20,{dataBinding:{source:'date',format:'ddd DD MMM'},textStyle:{fontSize:12,fontWeight:600,fill:'#94a3b8',fontFamily:'system-ui',textAlign:'center'}},1);
  add('digital-clock','Time',18,91,204,64,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH:mm'},textStyle:{fontSize:54,fontWeight:400,fill:'#f8fafc',fontFamily:'system-ui',textAlign:'center'}},2);
  add('date','Year',70,158,42,16,{dataBinding:{source:'date',format:'YYYY'},textStyle:{fontSize:11,fontWeight:600,fill:spec.accent,fontFamily:'system-ui',textAlign:'center'}},3);
  add('text','Date separator',112,158,14,16,{text:'|',textStyle:{fontSize:11,fontWeight:600,fill:spec.accent,fontFamily:'system-ui',textAlign:'center'}},4);
  add('digital-clock','Seconds',126,158,44,16,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'ss'},textStyle:{fontSize:11,fontWeight:600,fill:spec.accent,fontFamily:'system-ui',textAlign:'center'}},5);
 }else if(spec.category==='analog'){
  const colors={hour:spec.secondary||'#f8fafc',minute:spec.secondary||'#f8fafc',second:spec.accent||'#ef4444'};
  add('analog-clock','Live analog hands',16,16,208,208,{clockMode:'analog',textStyle:{fontSize:12,fontWeight:400,fill:colors.hour,fontFamily:'system-ui'},handConfig:{hour:{length:58,width:5,tail:5,color:colors.hour},minute:{length:82,width:3,tail:6,color:colors.minute},second:{length:92,width:1.5,tail:18,color:colors.second},centerColor:colors.second,centerRadius:3,showOuterRing:false,showHourTicks:false}},1);
  const center={fontFamily:'system-ui',textAlign:'center'};
  if(spec.style==='m03-native')add('date','Date',28,166,184,18,{dataBinding:{source:'date',format:'ddd DD MMM'},textStyle:{...center,fontSize:11,fontWeight:600,fill:'#cbd5e1'}},2);
  if(spec.style==='m05-native')add('date','Weekday and day',146,103,76,24,{dataBinding:{source:'date',format:'ddd DD'},textStyle:{...center,fontSize:12,fontWeight:600,fill:spec.accent}},2);
  if(spec.style==='m06-native'){add('date','Weekday and day',64,54,112,18,{dataBinding:{source:'date',format:'ddd DD'},textStyle:{...center,fontSize:11,fontWeight:600,fill:'#e2e8f0'}},2);add('digital-clock','Time',72,78,96,22,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH:mm'},textStyle:{...center,fontSize:13,fontWeight:600,fill:'#94a3b8'}},3)}
  if(spec.style==='m07-native')add('date','Date',66,168,108,18,{dataBinding:{source:'date',format:'DD MMM'},textStyle:{...center,fontSize:12,fontWeight:600,fill:'#e5b869'}},2);
  if(spec.style==='m08-native'){add('date','Date',34,162,172,18,{dataBinding:{source:'date',format:'ddd DD MMM'},textStyle:{...center,fontSize:11,fontWeight:600,fill:'#cbd5e1'}},2);add('digital-clock','Time',68,184,104,18,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH:mm'},textStyle:{...center,fontSize:12,fontWeight:600,fill:'#8b5cf6'}},3)}
  if(spec.style==='m09-native')add('date','Date badge',76,166,88,22,{dataBinding:{source:'date',format:'DD MMM'},textStyle:{...center,fontSize:12,fontWeight:600,fill:'#38bdf8'}},2);
  if(spec.style==='m12-native'){add('date','Month and year',58,28,124,18,{dataBinding:{source:'date',format:'MMM YYYY'},textStyle:{...center,fontSize:11,fontWeight:600,fill:'#1e3a8a'}},2);add('date','Weekday',22,108,66,18,{dataBinding:{source:'date',format:'ddd'},textStyle:{...center,fontSize:10,fontWeight:600,fill:'#334155'}},3);add('digital-clock','Time readout',76,178,88,18,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH:mm:ss'},textStyle:{...center,fontSize:11,fontWeight:600,fill:'#1e3a8a'}},4)}
  if(spec.style==='m15-native'){add('date','Side date',8,104,104,24,{dataBinding:{source:'date',format:'ddd, MMM DD'},textStyle:{...center,fontSize:10,fontWeight:600,fill:'#f8fafc'}},2);add('digital-clock','Side time',128,104,104,24,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH:mm'},textStyle:{...center,fontSize:11,fontWeight:600,fill:'#f8fafc'}},3)}
  if(spec.style==='m17-native'){add('digital-clock','Side time',152,96,80,22,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH:mm'},textStyle:{...center,fontSize:12,fontWeight:400,fill:'#475569'}},2);add('date','Side date',152,120,80,18,{dataBinding:{source:'date',format:'MMM DD'},textStyle:{...center,fontSize:10,fontWeight:400,fill:'#b45309'}},3)}
  if(spec.style==='m18-native')add('digital-clock','Bottom time',68,166,104,22,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH:mm'},textStyle:{...center,fontSize:13,fontWeight:600,fill:'#94a3b8'}},2);
  if(spec.style==='m19-native'){add('date','Day',24,104,80,24,{dataBinding:{source:'date',format:'DD'},textStyle:{...center,fontSize:15,fontWeight:600,fill:'#e2e8f0'}},2);add('date','Weekday',136,104,80,24,{dataBinding:{source:'date',format:'ddd'},textStyle:{...center,fontSize:13,fontWeight:600,fill:'#e2e8f0'}},3)}

 }else{
  const style=spec.style;
  if(style==='stacked'){add('digital-clock','Hours',52,68,136,52,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH'},textStyle:{fontSize:49,fontWeight:600,fill:'#f8fafc',fontFamily:'system-ui'}},1);add('digital-clock','Minutes',52,119,136,52,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'mm'},textStyle:{fontSize:49,fontWeight:600,fill:'#f8fafc',fontFamily:'system-ui'}},2);add('digital-clock','Seconds',155,105,48,22,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'ss'},textStyle:{fontSize:13,fontWeight:600,fill:'#94a3b8',fontFamily:'system-ui'}},3)}
  if(style==='dual'){add('digital-clock','Hours',30,70,180,60,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH'},textStyle:{fontSize:58,fontWeight:600,fill:'#f7dfb8',fontFamily:'system-ui'}},1);add('digital-clock','Minutes',30,127,180,60,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'mm'},textStyle:{fontSize:58,fontWeight:600,fill:'#e07a38',fontFamily:'system-ui'}},2);add('digital-clock','Seconds',76,183,88,20,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'ss'},textStyle:{fontSize:12,fontWeight:600,fill:'#fbbf24',fontFamily:'system-ui'}},3)}
  if(style==='tall'){add('digital-clock','Hours',38,76,164,75,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH'},textStyle:{fontSize:76,fontWeight:600,fill:'#f9a8d4',fontFamily:'system-ui'}},1);add('digital-clock','Minutes',48,145,154,75,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:':mm'},textStyle:{fontSize:68,fontWeight:600,fill:'#f9a8d4',fontFamily:'system-ui'}},2)}
  if(style==='outline'){add('digital-clock','Hours',26,90,92,76,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH'},textStyle:{fontSize:48,fontWeight:400,fill:'#bef264',fontFamily:'system-ui'}},1);add('digital-clock','Minutes',122,90,92,76,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'mm'},textStyle:{fontSize:48,fontWeight:400,fill:'#bef264',fontFamily:'system-ui'}},2);add('digital-clock','Seconds',78,158,84,25,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'ss'},textStyle:{fontSize:15,fontWeight:600,fill:'#bef264',fontFamily:'system-ui'}},3)}
  if(style==='angled'){/* The 252×48 strip rotates 29° around (143,118) in logical 240px coordinates; vertical bounds are approximately y=77..159. */add('digital-clock','Time',82,34,116,40,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH:mm'},textStyle:{fontSize:31,fontWeight:600,fill:'#f8fafc',fontFamily:'system-ui'}},1);add('digital-clock','Seconds',132,164,76,20,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'ss'},textStyle:{fontSize:13,fontWeight:600,fill:'#38bdf8',fontFamily:'system-ui'}},2)}
  const dateY=style==='tall'?220:style==='dual'?207:190;
  const dateSize=style==='tall'||style==='dual'?8:10;
  add('date','Date',45,dateY,150,style==='tall'||style==='dual'?12:18,{dataBinding:{source:'date',format:'ddd, DD MMM YYYY'},textStyle:{fontSize:dateSize,fontWeight:400,fill:spec.style==='dual'?'#e7b887':'#cbd5e1',fontFamily:'system-ui'}},4);
 }
 return objects;
}
root.WfsWatchFacePresets=Object.freeze({SPECS,renderBackground,renderThumbnail,renderLivePreview,createObjects});
if(typeof module==='object'&&module.exports)module.exports=root.WfsWatchFacePresets;
})(typeof globalThis!=='undefined'?globalThis:this);
