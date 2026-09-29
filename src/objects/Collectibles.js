/* Collectibles.js - coins, and power-ups popped out of question blocks. */
(function () {
  function col(hex) { return Phaser.Display.Color.HexStringToColor(hex).color; }

  function drawCoin(g, radius, itemsData) {
    var pal = itemsData.coin;
    g.clear();
    g.fillStyle(col(pal.color), 1);
    g.fillCircle(0, 0, radius);
    g.lineStyle(3, 0x1a1a1a, 1);
    g.strokeCircle(0, 0, radius);
    g.fillStyle(col(pal.colorShade), 1);
    g.fillCircle(0, 0, radius * 0.55);
    g.lineStyle(2, 0x1a1a1a, 1);
    g.strokeCircle(0, 0, radius * 0.55);
  }

  var Collectibles = {
    createCoin: function (scene, x, y) {
      var container = scene.add.container(x, y);
      var g = scene.add.graphics();
      drawCoin(g, 14, DataStore.items);
      container.add(g);
      container.setDepth(12);
      scene.physics.add.existing(container);
      container.body.setAllowGravity(false);
      container.body.setSize(28, 28);
      container.body.setOffset(-14, -14);
      container.isCoin = true;
      container.points = DataStore.items.coin.points;
      scene.tweens.add({
        targets: g,
        scaleX: 0.15,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      scene.tweens.add({
        targets: container,
        y: y - 6,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      return container;
    },

    collectCoin: function (scene, coin) {
      coin.body.enable = false;
      scene.tweens.add({
        targets: coin,
        y: coin.y - 40,
        alpha: 0,
        duration: 300,
        onComplete: function () { coin.destroy(); },
      });
      return coin.points;
    },

    spawnItemFromBlock: function (scene, x, y, itemType) {
      var container = scene.add.container(x, y);
      var g = scene.add.graphics();
      container.add(g);
      container.itemType = itemType;
      container.setDepth(12);

      if (itemType === 'coin') {
        drawCoin(g, 14, DataStore.items);
        scene.physics.add.existing(container);
        container.body.setAllowGravity(false);
        container.body.setSize(28, 28);
        container.body.setOffset(-14, -14);
        container.points = DataStore.items.coin.points;
        container.isPopCoin = true;
        scene.tweens.add({
          targets: container,
          y: y - 70,
          alpha: 0,
          duration: 650,
          ease: 'Cubic.easeOut',
          onComplete: function () { container.destroy(); },
        });
        return container;
      }

      var pal = DataStore.items[itemType] || DataStore.items.extraLife;
      if (itemType === 'rakija') {
        // A little bottle: unmistakably not a mushroom at a glance.
        g.fillStyle(col(pal.color), 1);
        g.fillRoundedRect(-11, -6, 22, 24, 5);
        g.fillRect(-5, -18, 10, 14);
        g.lineStyle(3, 0x1a1a1a, 1);
        g.strokeRoundedRect(-11, -6, 22, 24, 5);
        g.strokeRect(-5, -18, 10, 14);
        g.fillStyle(0x8a3f1f, 1);
        g.fillRect(-6, -22, 12, 6);
        g.strokeRect(-6, -22, 12, 6);
        g.fillStyle(col(pal.spotColor || '#ffffff'), 1);
        g.fillRect(-7, 2, 5, 12);
      } else {
        g.fillStyle(col(pal.color), 1);
        g.fillRoundedRect(-16, -10, 32, 22, 8);
        g.fillStyle(col(pal.spotColor || '#ffffff'), 1);
        g.fillCircle(-6, -4, 4);
        g.fillCircle(7, -2, 3.5);
        g.lineStyle(3, 0x1a1a1a, 1);
        g.strokeRoundedRect(-16, -10, 32, 22, 8);
        g.fillStyle(0xffe0c2, 1);
        g.fillRoundedRect(-10, 8, 20, 10, 4);
        g.strokeRoundedRect(-10, 8, 20, 10, 4);
      }

      scene.physics.add.existing(container);
      container.body.setSize(32, 32);
      container.body.setOffset(-16, -16);
      container.body.setVelocityX(80);
      container.body.setCollideWorldBounds(true);
      container.body.setBounce(0, 0);
      container.itemEffect = pal.effect;

      container.y = y;
      scene.tweens.add({
        targets: container,
        y: y - 44,
        duration: 350,
        ease: 'Cubic.easeOut',
      });
      return container;
    },
  };

  window.Collectibles = Collectibles;
})();
