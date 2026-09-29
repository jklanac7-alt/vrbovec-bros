/* UIKit.js - shared chunky pixel-art UI widgets used by every menu screen. */
(function () {
  var FONT = 'Verdana, "Segoe UI", Arial, sans-serif';

  function textStyle(size, color) {
    return {
      fontFamily: FONT,
      fontSize: size + 'px',
      color: color || '#ffffff',
      fontStyle: 'bold',
      stroke: '#1a1a1a',
      strokeThickness: Math.max(4, Math.round(size / 6)),
    };
  }

  window.UIKit = {
    FONT: FONT,
    textStyle: textStyle,

    title: function (scene, x, y, label, size) {
      var t = scene.add.text(x, y, label, textStyle(size || 64, '#ffe45c'));
      t.setOrigin(0.5);
      t.setShadow(4, 4, '#00000055', 0, true, true);
      return t;
    },

    label: function (scene, x, y, label, size, color) {
      var t = scene.add.text(x, y, label, textStyle(size || 24, color || '#ffffff'));
      t.setOrigin(0.5);
      return t;
    },

    panel: function (scene, x, y, w, h, fill, alpha) {
      var g = scene.add.graphics();
      g.fillStyle(fill === undefined ? 0x1b2a4a : fill, alpha === undefined ? 0.85 : alpha);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
      g.lineStyle(5, 0x1a1a1a, 1);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);
      g.setDepth(-4);
      return g;
    },

    button: function (scene, x, y, label, onClick, opts) {
      opts = opts || {};
      var w = opts.width || 320;
      var h = opts.height || 68;
      var fill = opts.fill === undefined ? 0xf4c430 : opts.fill;
      var fillDown = opts.fillDown === undefined ? 0xc99a1f : opts.fillDown;
      var disabled = !!opts.disabled;

      var container = scene.add.container(x, y);
      var g = scene.add.graphics();
      container.add(g);

      function paint(color) {
        g.clear();
        g.fillStyle(disabled ? 0x6a6a6a : color, 1);
        g.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
        g.lineStyle(5, 0x1a1a1a, 1);
        g.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
        g.fillStyle(0xffffff, disabled ? 0.08 : 0.22);
        g.fillRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h * 0.33, 8);
      }
      paint(fill);

      var t = scene.add.text(0, 0, label, {
        fontFamily: FONT,
        fontSize: (opts.fontSize || 26) + 'px',
        color: disabled ? '#cccccc' : '#1a1a1a',
        fontStyle: 'bold',
      });
      t.setOrigin(0.5);
      container.add(t);
      container.labelText = t;

      container.setSize(w, h);
      container.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);

      if (!disabled) {
        container.on('pointerover', function () { paint(fillDown); container.setScale(1.03); });
        container.on('pointerout', function () { paint(fill); container.setScale(1); });
        container.on('pointerdown', function () { paint(fillDown); container.setScale(0.97); });
        container.on('pointerup', function () {
          paint(fill);
          container.setScale(1);
          if (onClick) onClick();
        });
      }

      container.setDepth(opts.depth === undefined ? 100 : opts.depth);
      container.repaint = paint;
      return container;
    },

    /* A dimmed full-screen backdrop for overlay scenes (pause / game over). */
    scrim: function (scene, alpha) {
      var g = scene.add.graphics();
      g.fillStyle(0x000000, alpha === undefined ? 0.6 : alpha);
      g.fillRect(0, 0, scene.scale.width, scene.scale.height);
      g.setScrollFactor(0);
      // Backdrop for this scene's own UI; the paused scene underneath is a
      // separate scene and is dimmed regardless of depth.
      g.setDepth(-5);
      return g;
    },
  };
})();
