/* Background.js - parallax background layers for a level theme.
 * Depth order: sky -30, hazy photo of the real town -25, haze blend -24,
 * far hills -21, near hills -20, clouds -18, park trees behind play -12,
 * landmarks -10 (placed by GameScene), terrain 5, actors 12-20,
 * foreground trees 30, HUD 100.
 * Everything stays low on the screen so the play area reads clearly.
 */
(function () {
  var THEMES = {
    vrbovec_day: {
      skyTop: 0x4d9bf5,
      skyBottom: 0xc6e6ff,
      hillFar: 0x9ad18f,
      hillNear: 0x62ab5c,
      hillOutline: 0x2f5c31,
      treeTrunk: 0x6b431f,
      treeLeaf: 0x3f8f43,
      treeLeafDark: 0x2c6a30,
      photoKey: 'bgVrbovecTile',
      photoAlpha: 0.3,
      photoTint: 0xbcd8ff,
    },
  };

  function drawCloud(g, x, y, s) {
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(x, y, 24 * s);
    g.fillCircle(x + 30 * s, y - 12 * s, 30 * s);
    g.fillCircle(x + 64 * s, y + 2 * s, 22 * s);
    g.fillRect(x - 24 * s, y, 112 * s, 22 * s);
    g.fillStyle(0xdceeff, 0.9);
    g.fillRect(x - 24 * s, y + 14 * s, 112 * s, 8 * s);
  }

  function drawTree(g, x, groundY, s, theme, outlineAlpha) {
    var trunkH = 74 * s;
    g.lineStyle(4, 0x1a1a1a, outlineAlpha);
    g.fillStyle(theme.treeTrunk, 1);
    g.fillRect(x - 10 * s, groundY - trunkH, 20 * s, trunkH);
    g.strokeRect(x - 10 * s, groundY - trunkH, 20 * s, trunkH);
    g.fillStyle(theme.treeLeaf, 1);
    g.fillCircle(x, groundY - trunkH - 26 * s, 42 * s);
    g.fillCircle(x - 34 * s, groundY - trunkH - 4 * s, 30 * s);
    g.fillCircle(x + 34 * s, groundY - trunkH - 6 * s, 28 * s);
    g.strokeCircle(x, groundY - trunkH - 26 * s, 42 * s);
    g.strokeCircle(x - 34 * s, groundY - trunkH - 4 * s, 30 * s);
    g.strokeCircle(x + 34 * s, groundY - trunkH - 6 * s, 28 * s);
    g.fillStyle(theme.treeLeafDark, 1);
    g.fillCircle(x + 12 * s, groundY - trunkH - 14 * s, 14 * s);
  }

  window.BackgroundRenderer = {
    getTheme: function (name) {
      return THEMES[name] || THEMES.vrbovec_day;
    },

    create: function (scene, themeName, worldWidth, worldHeight) {
      var theme = this.getTheme(themeName);
      var viewW = scene.scale.width;
      var viewH = scene.scale.height;
      var created = { theme: theme };
      var groundLine = worldHeight - 64;

      // How far a layer with a given scroll factor has to reach to stay on
      // screen for the whole level.
      function span(scrollFactor) {
        return scrollFactor * (worldWidth - viewW) + viewW + 240;
      }

      var sky = scene.add.graphics();
      sky.fillGradientStyle(theme.skyTop, theme.skyTop, theme.skyBottom, theme.skyBottom, 1);
      sky.fillRect(0, 0, viewW, viewH);
      sky.setScrollFactor(0);
      sky.setDepth(-30);
      created.sky = sky;

      // A hazy, washed-out strip of the real Vrbovec town square, far away.
      if (scene.textures.exists(theme.photoKey)) {
        var bandBottom = groundLine - 46;
        var bandH = 230;
        var photo = scene.add.tileSprite(0, bandBottom - bandH, span(0.12), bandH, theme.photoKey);
        photo.setOrigin(0, 0);
        var src = scene.textures.get(theme.photoKey).getSourceImage();
        photo.setTileScale(bandH / src.height);
        photo.setAlpha(theme.photoAlpha);
        photo.setTint(theme.photoTint);
        photo.setScrollFactor(0.12);
        photo.setDepth(-25);
        created.photo = photo;

        // Blend its hard top edge into the sky.
        var haze = scene.add.graphics();
        haze.fillGradientStyle(theme.skyBottom, theme.skyBottom, theme.skyBottom, theme.skyBottom, 1, 1, 0, 0);
        haze.fillRect(0, bandBottom - bandH, span(0.12), 90);
        haze.setScrollFactor(0.12);
        haze.setDepth(-24);
        created.haze = haze;
      }

      // Low rolling hills of Prigorje, hugging the horizon.
      var hillsFar = scene.add.graphics();
      hillsFar.setScrollFactor(0.3);
      hillsFar.setDepth(-21);
      hillsFar.fillStyle(theme.hillFar, 1);
      hillsFar.lineStyle(4, theme.hillOutline, 0.7);
      var farSpan = span(0.3);
      for (var hx = -260; hx < farSpan; hx += 430) {
        var w = 620 + ((hx / 430) % 3) * 90;
        hillsFar.fillEllipse(hx, groundLine + 60, w, 180);
        hillsFar.strokeEllipse(hx, groundLine + 60, w, 180);
      }
      created.hillsFar = hillsFar;

      var hillsNear = scene.add.graphics();
      hillsNear.setScrollFactor(0.45);
      hillsNear.setDepth(-20);
      hillsNear.fillStyle(theme.hillNear, 1);
      hillsNear.lineStyle(4, theme.hillOutline, 0.8);
      var nearSpan = span(0.45);
      for (var nx = -160; nx < nearSpan; nx += 520) {
        var nw = 700 + ((nx / 520) % 2) * 140;
        hillsNear.fillEllipse(nx, groundLine + 78, nw, 150);
        hillsNear.strokeEllipse(nx, groundLine + 78, nw, 150);
      }
      created.hillsNear = hillsNear;

      var clouds = scene.add.graphics();
      clouds.setScrollFactor(0.2);
      clouds.setDepth(-18);
      var cloudSpan = span(0.2);
      for (var cx = 140; cx < cloudSpan; cx += 470) {
        drawCloud(clouds, cx, 70 + ((cx / 470) % 3) * 52, 0.75 + ((cx / 470) % 2) * 0.25);
      }
      created.clouds = clouds;

      // Town-park trees standing just behind the playfield.
      var treesBack = scene.add.graphics();
      treesBack.setScrollFactor(0.8);
      treesBack.setDepth(-12);
      var backSpan = span(0.8);
      for (var tx = 240; tx < backSpan; tx += 520) {
        drawTree(treesBack, tx, groundLine + 6, 0.8, theme, 0.55);
      }
      created.treesBack = treesBack;

      // A few big trees in front, kept low so they frame rather than block.
      var treesFront = scene.add.graphics();
      treesFront.setScrollFactor(1.15);
      treesFront.setDepth(30);
      // Kept fairly transparent so they frame the shot without hiding what the
      // player has to react to.
      treesFront.setAlpha(0.7);
      var frontSpan = span(1.15);
      for (var fx = 760; fx < frontSpan; fx += 1750) {
        drawTree(treesFront, fx, worldHeight + 92, 1.35, theme, 1);
      }
      created.treesFront = treesFront;

      return created;
    },
  };
})();
