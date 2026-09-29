/* TileRenderer.js
 * Draws ground / platforms / columns / question-blocks / flag as flat-color,
 * thick-outline pixel-art vector shapes (Phaser Graphics), and creates matching
 * invisible static Arcade Physics bodies for collision. Visuals and collision
 * are kept as separate objects on purpose so level geometry is always solid
 * and predictable regardless of how decorative art (e.g. Landmarks.js) looks.
 */
(function () {
  function addStaticBox(scene, group, x, y, w, h) {
    var zone = scene.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0);
    zone.setVisible(false);
    scene.physics.add.existing(zone, true);
    zone.body.updateFromGameObject();
    group.add(zone);
    return zone;
  }

  function outline(g, color) {
    g.lineStyle(4, color, 1);
  }

  var TileRenderer = {
    createGround: function (scene, group, seg, tilesets) {
      var pal = (tilesets.ground && tilesets.ground[seg.type]) || tilesets.ground.grass;
      var g = scene.add.graphics();
      g.fillStyle(Phaser.Display.Color.HexStringToColor(pal.body).color, 1);
      g.fillRect(seg.x, seg.y, seg.width, seg.height);
      var topH = Math.min(18, seg.height);
      if (pal.top) {
        g.fillStyle(Phaser.Display.Color.HexStringToColor(pal.top).color, 1);
        g.fillRect(seg.x, seg.y, seg.width, topH);
      }
      outline(g, Phaser.Display.Color.HexStringToColor(pal.outline || '#1a1a1a').color);
      g.strokeRect(seg.x, seg.y, seg.width, seg.height);
      // tile seams
      g.lineStyle(2, Phaser.Display.Color.HexStringToColor(pal.bodyDark || pal.outline || '#000000').color, 0.5);
      var tile = 64;
      for (var tx = seg.x + tile; tx < seg.x + seg.width; tx += tile) {
        g.lineBetween(tx, seg.y + topH, tx, seg.y + seg.height);
      }
      g.setDepth(5);
      addStaticBox(scene, group, seg.x, seg.y, seg.width, seg.height);
      return g;
    },

    createPlatform: function (scene, group, plat, tilesets) {
      var pal = (tilesets.platform && tilesets.platform[plat.type]) || tilesets.platform.brick;
      var g = scene.add.graphics();
      g.fillStyle(Phaser.Display.Color.HexStringToColor(pal.color).color, 1);
      g.fillRect(plat.x, plat.y, plat.width, plat.height);
      outline(g, Phaser.Display.Color.HexStringToColor(pal.outline || '#1a1a1a').color);
      g.strokeRect(plat.x, plat.y, plat.width, plat.height);
      g.lineStyle(2, Phaser.Display.Color.HexStringToColor(pal.colorDark || '#000000').color, 0.6);
      var tile = 64;
      for (var tx = plat.x + tile; tx < plat.x + plat.width; tx += tile) {
        g.lineBetween(tx, plat.y, tx, plat.y + plat.height);
      }
      g.setDepth(5);
      addStaticBox(scene, group, plat.x, plat.y, plat.width, plat.height);
      return g;
    },

    createColumn: function (scene, group, col, tilesets) {
      var pal = (tilesets.column && tilesets.column[col.type]) || tilesets.column.stoneColumn;
      var g = scene.add.graphics();
      g.fillStyle(Phaser.Display.Color.HexStringToColor(pal.color).color, 1);
      g.fillRoundedRect(col.x, col.y, col.width, col.height, 8);
      g.fillStyle(Phaser.Display.Color.HexStringToColor(pal.colorDark).color, 1);
      g.fillRect(col.x, col.y, 10, col.height);
      outline(g, Phaser.Display.Color.HexStringToColor(pal.outline || '#1a1a1a').color);
      g.strokeRoundedRect(col.x, col.y, col.width, col.height, 8);
      // cap
      g.fillStyle(Phaser.Display.Color.HexStringToColor(pal.color).color, 1);
      g.fillRoundedRect(col.x - 8, col.y, col.width + 16, 16, 4);
      g.strokeRoundedRect(col.x - 8, col.y, col.width + 16, 16, 4);
      g.setDepth(5);
      addStaticBox(scene, group, col.x, col.y, col.width, col.height);
      return g;
    },

    createQuestionBlock: function (scene, group, qb, tilesets) {
      var pal = tilesets.platform.question;
      var size = 48;
      var container = scene.add.container(qb.x, qb.y);
      var g = scene.add.graphics();
      container.add(g);
      container.itemType = qb.item || 'coin';
      container.used = false;
      container.size = size;

      function draw(used) {
        g.clear();
        var color = used ? pal.usedColor : pal.color;
        g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
        g.fillRect(-size / 2, -size / 2, size, size);
        g.lineStyle(4, Phaser.Display.Color.HexStringToColor(pal.outline || '#1a1a1a').color, 1);
        g.strokeRect(-size / 2, -size / 2, size, size);
        if (!used) {
          g.lineStyle(3, Phaser.Display.Color.HexStringToColor(pal.colorDark || '#1a1a1a').color, 1);
          g.beginPath();
          g.arc(0, -4, 9, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(20), false);
          g.strokePath();
          g.lineBetween(0, 6, 0, 12);
          g.fillStyle(Phaser.Display.Color.HexStringToColor(pal.colorDark || '#1a1a1a').color, 1);
          g.fillCircle(0, 18, 2.5);
        }
      }
      draw(false);
      container.redraw = draw;
      container.setDepth(6);

      var zone = addStaticBox(scene, group, qb.x - size / 2, qb.y - size / 2, size, size);
      zone.parentBlock = container;
      container.zone = zone;
      return container;
    },

    createFlag: function (scene, flagCfg) {
      var poleHeight = flagCfg.height || 320;
      var baseX = flagCfg.x;
      var baseY = flagCfg.y;
      var g = scene.add.graphics();
      g.lineStyle(6, 0x1a1a1a, 1);
      g.lineBetween(baseX, baseY, baseX, baseY - poleHeight);
      g.fillStyle(0xd8d8d8, 1);
      g.fillRect(baseX - 3, baseY - poleHeight, 6, poleHeight);
      g.fillStyle(0xf4c430, 1);
      g.fillCircle(baseX, baseY - poleHeight - 8, 10);
      g.lineStyle(3, 0x1a1a1a, 1);
      g.strokeCircle(baseX, baseY - poleHeight - 8, 10);
      var flagShape = scene.add.graphics();
      flagShape.fillStyle(0x3ad86b, 1);
      flagShape.fillTriangle(
        baseX + 3, baseY - poleHeight + 10,
        baseX + 70, baseY - poleHeight + 34,
        baseX + 3, baseY - poleHeight + 58
      );
      flagShape.lineStyle(3, 0x1a1a1a, 1);
      flagShape.strokeTriangle(
        baseX + 3, baseY - poleHeight + 10,
        baseX + 70, baseY - poleHeight + 34,
        baseX + 3, baseY - poleHeight + 58
      );
      flagShape.setDepth(8);
      g.setDepth(7);
      var sensor = scene.add.rectangle(baseX, baseY - poleHeight / 2, 40, poleHeight);
      sensor.setVisible(false);
      scene.physics.add.existing(sensor, true);
      return { pole: g, flag: flagShape, sensor: sensor, topY: baseY - poleHeight };
    }
  };

  window.TileRenderer = TileRenderer;
})();
