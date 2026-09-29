// Landmarks.js
// Self-contained cartoon pixel-art renderer for the Vrbovec landmark set-pieces
// (Kula Petra Zrinskog, Crkva sv. Vida, Dvorac Patačić, Lovrečina Grad, De Piennes mauzolej).
//
// Plain browser global, no bundler/ES-modules. Include AFTER phaser.min.js and BEFORE any
// scene that uses window.LandmarkRenderer:
//   <script src="lib/phaser.min.js"></script>
//   <script src="src/objects/Landmarks.js"></script>
//   <script src="src/scenes/YourScene.js"></script>
//
// Data-loading strategy (see task contract): this module does NOT fetch data/landmarks.json
// itself. Callers that already loaded that file (e.g. via scene.cache.json / fetch) should pass
// the parsed per-type entry in as `options.config`. If `options.config` is omitted, this module
// falls back to the FALLBACK_CONFIG table below, which mirrors data/landmarks.json exactly, so
// the renderer also works completely standalone.
//
// Coordinate system used internally for drawing AND for collisionBoxes (both in
// data/landmarks.json and in the FALLBACK_CONFIG below): a "local box space" with the origin at
// the TOP-LEFT of the building's bounding box, x increasing right, y increasing DOWN toward the
// ground (y === baseHeight is the ground line). This matches the collisionBoxes shape given in
// the task ({x, y, w, h} with y = top of box).
//
// create(scene, type, x, y, options) is handed the BOTTOM-LEFT world anchor (x, y). Internally a
// single Graphics child is added to the container and shifted up by -baseHeight * scale, then
// scaled by `scale`, so drawing code can just use plain local-box-space coordinates
// (0..baseWidth, 0..baseHeight) without worrying about the anchor conversion.
(function () {
  'use strict';

  // ---------------------------------------------------------------------
  // Fallback data (mirrors data/landmarks.json)
  // ---------------------------------------------------------------------
  var FALLBACK_CONFIG = {
    kula: {
      id: 'kula',
      name: 'Kula Petra Zrinskog',
      baseWidth: 160,
      baseHeight: 260,
      colors: {
        wall: '#f5efe1', roof: '#c1523a', roofDark: '#8a2a20', outline: '#1a1a1a',
        window: '#3a2a1a', trim: '#d8cdb0', door: '#3a2a1a', base: '#a8a196'
      },
      role: 'platform',
      solid: true,
      collisionBoxes: [
        { x: 5, y: 180, w: 150, h: 80 },
        { x: 20, y: 90, w: 120, h: 90 },
        { x: 35, y: 55, w: 90, h: 35 }
      ]
    },
    crkva: {
      id: 'crkva',
      name: 'Crkva sv. Vida',
      baseWidth: 220,
      baseHeight: 420,
      colors: {
        wall: '#eab438', roof: '#c1622f', roofDark: '#262a24', outline: '#1a1a1a',
        window: '#3a2a1a', trim: '#f7f2e3', clockFace: '#f7f2e3', clockHands: '#1a1a1a',
        accent: '#d4af37'
      },
      role: 'background',
      solid: false,
      collisionBoxes: []
    },
    dvorac: {
      id: 'dvorac',
      name: 'Dvorac Patačić',
      baseWidth: 320,
      baseHeight: 180,
      colors: {
        wall: '#d99a35', roof: '#8b3a2a', roofDark: '#5c2419', outline: '#1a1a1a',
        window: '#3a2a1a', trim: '#f7f2e3', door: '#4a2e1a', base: '#9a9086'
      },
      role: 'background',
      solid: false,
      collisionBoxes: []
    },
    lovrecina: {
      id: 'lovrecina',
      name: 'Lovrečina Grad',
      baseWidth: 360,
      baseHeight: 280,
      colors: {
        wall: '#e0d3ae', roof: '#8b4a35', roofDark: '#3a4a3a', outline: '#1a1a1a',
        window: '#3a2a1a', trim: '#f7f2e3', turretRoof: '#3a4a3a', base: '#9a9086'
      },
      role: 'platform',
      solid: true,
      collisionBoxes: [
        { x: 20, y: 200, w: 320, h: 80 },
        { x: 0, y: 90, w: 90, h: 110 },
        { x: 10, y: 60, w: 70, h: 30 },
        { x: 280, y: 120, w: 70, h: 80 }
      ]
    },
    mauzolej: {
      id: 'mauzolej',
      name: 'De Piennes mauzolej',
      baseWidth: 140,
      baseHeight: 150,
      colors: {
        wall: '#232323', roof: '#1c1c1c', roofDark: '#141414', outline: '#0a0a0a',
        window: '#0a0a0a', trim: '#b8b8b0', accent: '#d4af37', column: '#3a3a3a', door: '#0a0a0a'
      },
      role: 'background',
      solid: true,
      collisionBoxes: [
        { x: 0, y: 40, w: 140, h: 110 }
      ]
    }
  };

  var OUTLINE_WIDTH = 4;

  // ---------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------
  function hexToNum(hex, fallback) {
    if (!hex) return fallback;
    var s = String(hex).replace('#', '');
    var n = parseInt(s, 16);
    return isNaN(n) ? fallback : n;
  }

  function getConfig(type, options) {
    if (options && options.config) return options.config;
    return FALLBACK_CONFIG[type];
  }

  // Filled rect with a thick outline (flat cartoon pixel-art look: fill first, stroke on top).
  function fillRect(g, x, y, w, h, fillColor, outlineColor, lineWidth) {
    g.fillStyle(fillColor, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(lineWidth || OUTLINE_WIDTH, outlineColor, 1);
    g.strokeRect(x, y, w, h);
  }

  // Rounded rect, radius can be a number or {tl,tr,bl,br}.
  function fillRoundedRect(g, x, y, w, h, radius, fillColor, outlineColor, lineWidth) {
    g.fillStyle(fillColor, 1);
    g.fillRoundedRect(x, y, w, h, radius);
    g.lineStyle(lineWidth || OUTLINE_WIDTH, outlineColor, 1);
    g.strokeRoundedRect(x, y, w, h, radius);
  }

  function fillTri(g, x1, y1, x2, y2, x3, y3, fillColor, outlineColor, lineWidth) {
    g.fillStyle(fillColor, 1);
    g.fillTriangle(x1, y1, x2, y2, x3, y3);
    g.lineStyle(lineWidth || OUTLINE_WIDTH, outlineColor, 1);
    g.strokeTriangle(x1, y1, x2, y2, x3, y3);
  }

  function fillCirc(g, cx, cy, r, fillColor, outlineColor, lineWidth) {
    g.fillStyle(fillColor, 1);
    g.fillCircle(cx, cy, r);
    g.lineStyle(lineWidth || OUTLINE_WIDTH, outlineColor, 1);
    g.strokeCircle(cx, cy, r);
  }

  function fillEllip(g, cx, cy, w, h, fillColor, outlineColor, lineWidth) {
    g.fillStyle(fillColor, 1);
    g.fillEllipse(cx, cy, w, h);
    g.lineStyle(lineWidth || OUTLINE_WIDTH, outlineColor, 1);
    g.strokeEllipse(cx, cy, w, h);
  }

  function line(g, x1, y1, x2, y2, color, lineWidth) {
    g.lineStyle(lineWidth || OUTLINE_WIDTH, color, 1);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();
  }

  // ---------------------------------------------------------------------
  // Building drawers. Each receives (g, colors, W, H) and draws entirely in
  // local-box-space (0,0 = top-left of bounding box, y = H is the ground line).
  // ---------------------------------------------------------------------

  function drawKula(g, c, W, H) {
    var wall = hexToNum(c.wall, 0xf5efe1);
    var roof = hexToNum(c.roof, 0xc1523a);
    var roofDark = hexToNum(c.roofDark, 0x8a2a20);
    var outline = hexToNum(c.outline, 0x1a1a1a);
    var win = hexToNum(c.window, 0x3a2a1a);
    var trim = hexToNum(c.trim, 0xd8cdb0);
    var door = hexToNum(c.door || c.window, 0x3a2a1a);
    var base = hexToNum(c.base || c.trim, 0xa8a196);

    var eaveY = H * 0.30;
    var shaftTopY = H * 0.35;
    var baseBandY = H * 0.95;

    // Conical roof
    fillTri(g, W * 0.5, 0, W * 0.14, eaveY, W * 0.86, eaveY, roof, outline);
    // Eave shadow ring
    fillEllip(g, W * 0.5, eaveY, W * 0.78, H * 0.05, roofDark, outline);
    // Round tower shaft (rounded top corners to read as cylindrical)
    fillRoundedRect(g, W * 0.14, shaftTopY, W * 0.72, baseBandY - shaftTopY,
      { tl: W * 0.34, tr: W * 0.34, bl: 0, br: 0 }, wall, outline);
    // Stone base band
    fillRect(g, W * 0.08, baseBandY, W * 0.84, H - baseBandY, base, outline);
    // Windows (small shuttered openings)
    fillRect(g, W * 0.41, H * 0.48, W * 0.18, H * 0.12, trim, outline, 2);
    fillRect(g, W * 0.43, H * 0.5, W * 0.14, H * 0.08, win, outline, 2);
    fillRect(g, W * 0.41, H * 0.66, W * 0.18, H * 0.12, trim, outline, 2);
    fillRect(g, W * 0.43, H * 0.68, W * 0.14, H * 0.08, win, outline, 2);
    // Door
    fillRect(g, W * 0.39, H * 0.82, W * 0.22, H * 0.13, door, outline);
  }

  function drawCrkva(g, c, W, H) {
    var wall = hexToNum(c.wall, 0xeab438);
    var roof = hexToNum(c.roof, 0xc1622f);
    var roofDark = hexToNum(c.roofDark, 0x262a24);
    var outline = hexToNum(c.outline, 0x1a1a1a);
    var win = hexToNum(c.window, 0x3a2a1a);
    var trim = hexToNum(c.trim, 0xf7f2e3);
    var clockFace = hexToNum(c.clockFace || c.trim, 0xf7f2e3);
    var clockHands = hexToNum(c.clockHands || c.outline, 0x1a1a1a);
    var accent = hexToNum(c.accent, 0xd4af37);

    var towerX0 = W * 0.06;
    var towerW = W * 0.38;
    var towerX1 = towerX0 + towerW;
    var towerCx = towerX0 + towerW / 2;

    var spireBaseY = H * 0.12;
    var shaftTopY = H * 0.16;
    var shaftBottomY = H * 0.87;

    var naveTopY = H * 0.55;
    var naveBottomY = H * 0.91;
    var naveX0 = towerX1 - W * 0.02;
    var naveX1 = W * 0.97;

    // Nave roof (drawn first, behind tower)
    fillTri(g, naveX0 - W * 0.02, naveTopY, naveX1, naveTopY, (naveX0 + naveX1) / 2, H * 0.42, roof, outline);
    // Nave body
    fillRect(g, naveX0, naveTopY, naveX1 - naveX0, naveBottomY - naveTopY, wall, outline);
    // Nave trim corner + windows
    fillRect(g, naveX0 + (naveX1 - naveX0) * 0.15, naveTopY + (naveBottomY - naveTopY) * 0.35,
      (naveX1 - naveX0) * 0.18, (naveBottomY - naveTopY) * 0.4, win, outline, 2);
    fillRect(g, naveX0 + (naveX1 - naveX0) * 0.6, naveTopY + (naveBottomY - naveTopY) * 0.35,
      (naveX1 - naveX0) * 0.18, (naveBottomY - naveTopY) * 0.4, win, outline, 2);

    // Tower spire (dark pointed roof)
    fillTri(g, towerCx, 0, towerX0 - W * 0.02, spireBaseY, towerX1 + W * 0.02, spireBaseY, roofDark, outline);
    // Small hip shoulder under spire
    fillTri(g, towerCx, spireBaseY - H * 0.02, towerX0, shaftTopY, towerX1, shaftTopY, roofDark, outline);
    // Cross finial
    line(g, towerCx, -H * 0.02, towerCx, H * 0.03, accent, 3);
    line(g, towerCx - W * 0.03, H * 0.005, towerCx + W * 0.03, H * 0.005, accent, 3);

    // Tower shaft
    fillRect(g, towerX0, shaftTopY, towerW, shaftBottomY - shaftTopY, wall, outline);
    // White corner quoin stripes
    fillRect(g, towerX0, shaftTopY, W * 0.03, shaftBottomY - shaftTopY, trim, outline, 2);
    fillRect(g, towerX1 - W * 0.03, shaftTopY, W * 0.03, shaftBottomY - shaftTopY, trim, outline, 2);
    // Clock face
    fillCirc(g, towerCx, H * 0.32, W * 0.09, clockFace, outline);
    line(g, towerCx, H * 0.32, towerCx, H * 0.32 - W * 0.06, clockHands, 2);
    line(g, towerCx, H * 0.32, towerCx + W * 0.045, H * 0.32, clockHands, 2);
    // Belfry openings
    fillRect(g, towerX0 + towerW * 0.2, H * 0.2, towerW * 0.22, H * 0.07, roofDark, outline, 2);
    fillRect(g, towerX0 + towerW * 0.58, H * 0.2, towerW * 0.22, H * 0.07, roofDark, outline, 2);
    // Base trim band
    fillRect(g, towerX0 - W * 0.02, shaftBottomY - H * 0.03, towerW + W * 0.04, H * 0.03, trim, outline, 2);

    // Shared ground foundation strip
    fillRect(g, 0, H * 0.94, W, H * 0.06, trim, outline, 2);
  }

  function drawDvorac(g, c, W, H) {
    var wall = hexToNum(c.wall, 0xd99a35);
    var roof = hexToNum(c.roof, 0x8b3a2a);
    var outline = hexToNum(c.outline, 0x1a1a1a);
    var win = hexToNum(c.window, 0x3a2a1a);
    var trim = hexToNum(c.trim, 0xf7f2e3);
    var door = hexToNum(c.door || c.window, 0x4a2e1a);
    var base = hexToNum(c.base || c.trim, 0x9a9086);

    var wallTopY = H * 0.22;
    var wallBottomY = H * 0.94;

    // Roof fascia (slight overhang)
    fillRect(g, -W * 0.02, H * 0.10, W * 1.04, H * 0.14, roof, outline);
    // Main wall block
    fillRect(g, 0, wallTopY, W, wallBottomY - wallTopY, wall, outline);
    // Floor divider trim band
    fillRect(g, 0, H * 0.58, W, H * 0.045, trim, outline, 2);

    // Top row windows
    var i;
    var topCount = 5;
    for (i = 0; i < topCount; i++) {
      var wx = W * (0.08 + i * 0.21);
      fillRect(g, wx - W * 0.015, H * 0.28, W * 0.075, H * 0.17, trim, outline, 2);
      fillRect(g, wx, H * 0.30, W * 0.045, H * 0.12, win, outline, 2);
    }
    // Bottom row windows (skip the centre bay for the door)
    var bottomPositions = [0.08, 0.29, 0.71, 0.92];
    for (i = 0; i < bottomPositions.length; i++) {
      var bx = W * bottomPositions[i];
      fillRect(g, bx - W * 0.015, H * 0.68, W * 0.075, H * 0.17, trim, outline, 2);
      fillRect(g, bx, H * 0.70, W * 0.045, H * 0.12, win, outline, 2);
    }
    // Door
    fillRect(g, W * 0.465, H * 0.72, W * 0.07, H * 0.22, door, outline);
    fillRect(g, W * 0.44, H * 0.70, W * 0.12, H * 0.03, trim, outline, 2);

    // Foundation
    fillRect(g, 0, H * 0.94, W, H * 0.06, base, outline);
  }

  function drawLovrecina(g, c, W, H) {
    var wall = hexToNum(c.wall, 0xe0d3ae);
    var roof = hexToNum(c.roof, 0x8b4a35);
    var outline = hexToNum(c.outline, 0x1a1a1a);
    var win = hexToNum(c.window, 0x3a2a1a);
    var trim = hexToNum(c.trim, 0xf7f2e3);
    var turretRoof = hexToNum(c.turretRoof || c.roofDark, 0x3a4a3a);
    var base = hexToNum(c.base || c.trim, 0x9a9086);

    // Right (background) turret, drawn first so the main wing overlaps it slightly
    var rtX0 = W * 0.78, rtW = W * 0.20;
    fillRoundedRect(g, rtX0, H * 0.32, rtW, H * 0.64 - H * 0.32,
      { tl: rtW * 0.5, tr: rtW * 0.5, bl: 0, br: 0 }, wall, outline);
    fillTri(g, rtX0 + rtW / 2, H * 0.14, rtX0 - W * 0.01, H * 0.32, rtX0 + rtW + W * 0.01, H * 0.32, turretRoof, outline);

    // Main wing roof band
    fillRect(g, W * 0.08, H * 0.43, W * 0.84, H * 0.09, roof, outline);
    // Main wing wall
    fillRect(g, W * 0.11, H * 0.5, W * 0.78, H * 0.46, wall, outline);
    // Windows row on main wing
    var i;
    for (i = 0; i < 4; i++) {
      var wx = W * (0.18 + i * 0.16);
      fillRect(g, wx, H * 0.6, W * 0.07, H * 0.2, win, outline, 2);
    }
    // Main door
    fillRect(g, W * 0.47, H * 0.78, W * 0.08, H * 0.18, win, outline);

    // Left (foreground) turret - taller, climbable
    var ltX0 = 0, ltW = W * 0.25;
    fillRoundedRect(g, ltX0, H * 0.21, ltW, H * 0.71 - H * 0.21,
      { tl: ltW * 0.5, tr: ltW * 0.5, bl: 0, br: 0 }, wall, outline);
    // Decorative trim ring just under the roof
    fillRect(g, ltX0 + ltW * 0.05, H * 0.19, ltW * 0.9, H * 0.025, trim, outline, 2);
    // Left turret conical roof
    fillTri(g, ltX0 + ltW / 2, H * 0.02, ltX0 - W * 0.01, H * 0.21, ltX0 + ltW + W * 0.01, H * 0.21, turretRoof, outline);
    // Small turret window
    fillRect(g, ltX0 + ltW * 0.38, H * 0.35, ltW * 0.24, H * 0.12, win, outline, 2);

    // Shared foundation
    fillRect(g, 0, H * 0.96, W, H * 0.04, base, outline);
  }

  function drawMauzolej(g, c, W, H) {
    var wall = hexToNum(c.wall, 0x232323);
    var roofDark = hexToNum(c.roofDark, 0x141414);
    var outline = hexToNum(c.outline, 0x0a0a0a);
    var trim = hexToNum(c.trim, 0xb8b8b0);
    var accent = hexToNum(c.accent, 0xd4af37);
    var column = hexToNum(c.column, 0x3a3a3a);
    var door = hexToNum(c.door || c.window, 0x0a0a0a);

    // Front steps / platform
    fillRect(g, -W * 0.05, H * 0.965, W * 1.1, H * 0.035, trim, outline, 2);
    // Main granite block
    fillRect(g, W * 0.07, H * 0.4, W * 0.86, H * 0.565, wall, outline);
    // Stepped pyramid roof (3 tiers, narrowing upward)
    fillRect(g, W * 0.11, H * 0.267, W * 0.78, H * 0.133, roofDark, outline);
    fillRect(g, W * 0.21, H * 0.133, W * 0.58, H * 0.133, roofDark, outline);
    fillRect(g, W * 0.32, H * 0.033, W * 0.36, H * 0.10, roofDark, outline);
    // Cross finial
    line(g, W * 0.5, -H * 0.02, W * 0.5, H * 0.033, accent, 3);
    line(g, W * 0.5 - W * 0.05, H * 0.0, W * 0.5 + W * 0.05, H * 0.0, accent, 3);
    // Flanking columns
    fillRect(g, W * 0.25, H * 0.6, W * 0.07, H * 0.4, column, outline, 2);
    fillRect(g, W * 0.68, H * 0.6, W * 0.07, H * 0.4, column, outline, 2);
    // Doorway
    fillRect(g, W * 0.39, H * 0.667, W * 0.22, H * 0.333, door, outline);
    // Gold engraved plaque
    fillRect(g, W * 0.36, H * 0.5, W * 0.28, H * 0.08, accent, outline, 2);
  }

  var BUILDERS = {
    kula: drawKula,
    crkva: drawCrkva,
    dvorac: drawDvorac,
    lovrecina: drawLovrecina,
    mauzolej: drawMauzolej
  };

  // ---------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------
  function create(scene, type, x, y, options) {
    options = options || {};
    var cfg = getConfig(type, options);
    if (!cfg) {
      throw new Error('LandmarkRenderer.create: unknown landmark type "' + type + '"');
    }
    var builder = BUILDERS[type];
    if (!builder) {
      throw new Error('LandmarkRenderer.create: no renderer registered for type "' + type + '"');
    }

    var scale = options.scale || 1;
    var W = cfg.baseWidth;
    var H = cfg.baseHeight;

    var container = scene.add.container(x, y);

    var g = scene.add.graphics();
    // Shift the graphics up by the full (scaled) height and scale it, so that local drawing
    // coordinates (0,0)=top-left .. (W,H)=bottom-right/ground line map correctly onto a
    // container anchored at the building's bottom-left corner.
    g.setPosition(0, -H * scale);
    g.setScale(scale);

    builder(g, cfg.colors || {}, W, H);

    container.add(g);
    return container;
  }

  function getCollisionBoxes(type, x, y, options) {
    options = options || {};
    var cfg = getConfig(type, options);
    if (!cfg) {
      throw new Error('LandmarkRenderer.getCollisionBoxes: unknown landmark type "' + type + '"');
    }
    var scale = options.scale || 1;
    var H = cfg.baseHeight;
    var boxes = cfg.collisionBoxes || [];
    var topY = y - H * scale;

    return boxes.map(function (b) {
      return {
        x: x + b.x * scale,
        y: topY + b.y * scale,
        w: b.w * scale,
        h: b.h * scale
      };
    });
  }

  window.LandmarkRenderer = {
    create: create,
    getCollisionBoxes: getCollisionBoxes
  };
})();
