/* Enemy.js - data-driven enemies (see data/enemies.json for the type registry).
 * Behaviors: 'patrol' (walks back and forth within [spawnX-range, spawnX+range],
 * flipping at the edges) and 'hop' (stationary, periodic vertical hop).
 * All enemies are stompable from above (see GameScene's stomp overlap check).
 */
(function () {
  function col(hex) { return Phaser.Display.Color.HexStringToColor(hex).color; }

  var Enemy = function (scene, x, y, typeId, range) {
    Phaser.GameObjects.Container.call(this, scene, x, y);
    var cfg = DataStore.enemies.types[typeId];
    this.scene = scene;
    this.typeId = typeId;
    this.cfg = cfg;
    this.spawnX = x;
    this.range = range || 120;
    this.dir = -1;
    this.dead = false;
    this.hopTimer = cfg.hopInterval ? Phaser.Math.Between(0, cfg.hopInterval) : 0;
    this.walkPhase = 0;

    this.gfx = scene.add.graphics();
    this.add(this.gfx);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(cfg.width, cfg.height);
    this.body.setOffset(-cfg.width / 2, -cfg.height / 2);
    this.body.setCollideWorldBounds(false);
    this.setDepth(15);

    this.draw();

    if (cfg.behavior === 'patrol') {
      this.body.setVelocityX(cfg.speed * this.dir);
    }
  };

  Enemy.prototype = Object.create(Phaser.GameObjects.Container.prototype);
  Enemy.prototype.constructor = Enemy;

  Enemy.prototype.draw = function () {
    var cfg = this.cfg;
    var g = this.gfx;
    var w = cfg.width, h = cfg.height;
    var bob = Math.sin(this.walkPhase) * 3;
    g.clear();
    g.lineStyle(4, col(cfg.outline || '#1a1a1a'), 1);
    g.fillStyle(col(cfg.color), 1);
    g.fillRoundedRect(-w / 2, -h / 2 + bob, w, h, 10);
    g.strokeRoundedRect(-w / 2, -h / 2 + bob, w, h, 10);
    g.fillStyle(col(cfg.colorShade || cfg.color), 1);
    g.fillRoundedRect(-w / 2, h / 2 - 8 + bob, w, 8, 4);
    // eyes
    var eyeDir = this.dir >= 0 ? 1 : -1;
    g.fillStyle(0xffffff, 1);
    g.fillCircle(eyeDir * 6, -h / 2 + 14 + bob, 6);
    g.fillCircle(eyeDir * 6 - eyeDir * 14, -h / 2 + 14 + bob, 5);
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(eyeDir * 6 + eyeDir * 2, -h / 2 + 14 + bob, 3);
    g.fillCircle(eyeDir * 6 - eyeDir * 14 + eyeDir * 2, -h / 2 + 14 + bob, 2.5);
    // angry brows for charger
    if (this.typeId === 'charger') {
      g.lineStyle(3, 0x1a1a1a, 1);
      g.lineBetween(eyeDir * 14, -h / 2 + 4 + bob, eyeDir * 2, -h / 2 + 9 + bob);
    }
  };

  Enemy.prototype.update = function (dt) {
    if (this.dead) return;
    var cfg = this.cfg;
    this.walkPhase += dt * 0.01;

    if (cfg.behavior === 'patrol') {
      if (this.x < this.spawnX - this.range) { this.dir = 1; this.body.setVelocityX(cfg.speed * this.dir); }
      else if (this.x > this.spawnX + this.range) { this.dir = -1; this.body.setVelocityX(cfg.speed * this.dir); }
      else if (this.body.blocked && this.body.blocked.left) { this.dir = 1; this.body.setVelocityX(cfg.speed * this.dir); }
      else if (this.body.blocked && this.body.blocked.right) { this.dir = -1; this.body.setVelocityX(cfg.speed * this.dir); }
    } else if (cfg.behavior === 'hop') {
      this.hopTimer -= dt;
      if (this.hopTimer <= 0 && (this.body.blocked.down || this.body.touching.down)) {
        this.body.setVelocityY(-cfg.hopVelocity);
        this.hopTimer = cfg.hopInterval;
      }
    }
    this.draw();
  };

  Enemy.prototype.stomp = function () {
    if (this.dead) return this.cfg.points;
    this.dead = true;
    this.body.enable = false;
    this.scene.tweens.add({
      targets: this,
      scaleY: 0.15,
      scaleX: 1.15,
      y: this.y + this.cfg.height / 2,
      alpha: 0,
      duration: 220,
      onComplete: function (t, targets) { targets[0].destroy(); },
    });
    return this.cfg.points;
  };

  window.Enemy = Enemy;
})();
