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
    bgDimPercent: 40
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

  function adjustHexBrightness(hex, percent) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
    const amt = Math.round(2.55 * percent);
    const r = Math.min(255, Math.max(0, (num >> 16) + amt));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
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
      const scale = Math.max(W / img.width, H / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.drawImage(img, CX - drawW / 2, CY - drawH / 2, drawW, drawH);

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
    clearBackgroundImage() { state.customBgImage = null; },
    resetBackground() { state.overrideBgColor = null; state.customBgImage = null; },
    getSettings() { return {overrideBgColor:state.overrideBgColor,sunburstEnabled:state.sunburstEnabled,vignetteEnabled:state.vignetteEnabled,customBgImage:state.customBgImage,bgDimPercent:state.bgDimPercent}; }
  });

})();
