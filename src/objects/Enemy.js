/* Enemy.js - data-driven enemies (see data/enemies.json for the type registry).
 *
 * Behaviors:
 *   'patrol' - walks back and forth within [spawnX-range, spawnX+range] and
 *              turns at ledges and walls before it can wedge itself into them.
 *   'hop'    - stationary, periodic vertical hop, clamped to the headroom it
 *              actually has so it cannot bonk a ceiling every single jump.
 *   'fly'    - ignores gravity, drifts horizontally and bobs on a sine.
 *
 * All enemies are stompable from above (see GameScene's stomp overlap check).
 *
 * Enemies used to visibly jitter and get wedged: they were spawned from level
 * JSON at a fixed y and several of them started overlapping a brick platform,
 * so Arcade shoved them sideways out of the geometry on the very first frame
 * and they then ground along its underside. settleOnSpawn() now lifts any
 * enemy that starts inside solid geometry onto the surface below it, and the
 * ledge/wall probes stop them from walking into terrain in the first place.
 */
(function () {
  function col(hex) { return Phaser.Display.Color.HexStringToColor(hex).color; }

  var Enemy = function (scene, x, y, typeId, range) {
    Phaser.GameObjects.Container.call(this, scene, x, y);
    var cfg = DataStore.enemies.types[typeId];
    if (!cfg) {
      // A level referencing a type that is not in data/enemies.json used to
      // take the whole scene down inside create(); fall back instead.
      console.warn('Nepoznat tip neprijatelja: ' + typeId);
      cfg = DataStore.enemies.types[Object.keys(DataStore.enemies.types)[0]];
      typeId = null;
    }
    this.scene = scene;
    this.typeId = typeId;
    this.cfg = cfg;
    this.spawnX = x;
    this.range = range || 120;
    this.dir = -1;
    this.dead = false;
    this.hopTimer = cfg.hopInterval ? Phaser.Math.Between(0, cfg.hopInterval) : 0;
    this.walkPhase = 0;
    this.flyPhase = Math.random() * Math.PI * 2;
    this.turnCooldown = 0;

    this.gfx = scene.add.graphics();
    this.add(this.gfx);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(cfg.width, cfg.height);
    this.body.setOffset(-cfg.width / 2, -cfg.height / 2);
    this.body.setCollideWorldBounds(false);
    this.setDepth(15);

    if (cfg.behavior === 'fly') {
      this.body.setAllowGravity(false);
      this.baseY = y;
    } else {
      this.settleOnSpawn();
      this.spawnX = this.x;
    }

    this.draw();

    if (cfg.behavior === 'patrol') {
      this.body.setVelocityX(cfg.speed * this.dir);
    } else if (cfg.behavior === 'fly') {
      this.body.setVelocityX(cfg.speed * this.dir);
    }
  };

  Enemy.prototype = Object.create(Phaser.GameObjects.Container.prototype);
  Enemy.prototype.constructor = Enemy;

  /* An Arcade body that begins its life overlapping a static body is separated
   * along whichever axis is cheapest, which for an enemy standing half inside a
   * brick means being flung sideways. Walk upwards out of the geometry instead,
   * then drop onto whatever is below.
   */
  Enemy.prototype.settleOnSpawn = function () {
    var scene = this.scene;
    if (!scene.solidBoxesIn) return;
    for (var lift = 0; lift <= 240; lift += 8) {
      var y = this.y - lift;
      if (scene.solidBoxesIn(this.x - this.body.halfWidth + 2, y - this.body.halfHeight + 2,
        this.body.width - 4, this.body.height - 4).length === 0) {
        if (lift > 0) {
          this.y = y;
          this.body.position.y = y - this.body.halfHeight;
          this.body.updateCenter();
        }
        return;
      }
    }
  };

  /* True when solid ground continues in front of the enemy's leading edge. */
  Enemy.prototype.hasGroundAhead = function () {
    var scene = this.scene;
    if (!scene.solidBoxesIn) return true;
    var probeX = this.dir > 0
      ? this.body.right + 2
      : this.body.left - 10;
    return scene.solidBoxesIn(probeX, this.body.bottom + 2, 8, 22).length > 0;
  };

  /* True when something solid blocks the enemy's path at body height. */
  Enemy.prototype.hasWallAhead = function () {
    var scene = this.scene;
    if (!scene.solidBoxesIn) return false;
    var probeX = this.dir > 0 ? this.body.right + 1 : this.body.left - 7;
    return scene.solidBoxesIn(probeX, this.body.top + 4, 6, this.body.height - 8).length > 0;
  };

  /* A short lock-out after every change of direction. Without it an enemy
   * standing in a slot narrower than its patrol range sees a wall on both
   * sides and flips direction every single frame, which is exactly the
   * twitching-in-place the enemies used to do.
   */
  Enemy.prototype.turn = function (dir) {
    if (dir !== this.dir) {
      if (this.turnCooldown > 0) return;
      this.turnCooldown = 140;
      this.dir = dir;
    }
    this.body.setVelocityX(this.cfg.speed * dir);
  };

  Enemy.prototype.draw = function () {
    var cfg = this.cfg;
    var g = this.gfx;
    var w = cfg.width, h = cfg.height;
    var bob = Math.sin(this.walkPhase) * 3;
    g.clear();
    g.lineStyle(4, col(cfg.outline || '#1a1a1a'), 1);
    g.fillStyle(col(cfg.color), 1);

    if (cfg.behavior === 'fly') {
      // wings beat opposite the bob so the sprite reads as flying, not floating
      var flap = Math.sin(this.walkPhase * 2.2) * 10;
      g.fillStyle(col(cfg.colorShade || cfg.color), 1);
      g.fillTriangle(-w / 2 + 2, bob, -w / 2 - 22, bob - 12 - flap, -w / 2 - 6, bob + 12);
      g.fillTriangle(w / 2 - 2, bob, w / 2 + 22, bob - 12 - flap, w / 2 + 6, bob + 12);
      g.strokeTriangle(-w / 2 + 2, bob, -w / 2 - 22, bob - 12 - flap, -w / 2 - 6, bob + 12);
      g.strokeTriangle(w / 2 - 2, bob, w / 2 + 22, bob - 12 - flap, w / 2 + 6, bob + 12);
      g.fillStyle(col(cfg.color), 1);
    }

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
    if (this.turnCooldown > 0) this.turnCooldown -= dt;

    if (cfg.behavior === 'patrol') {
      var onGround = this.body.blocked.down || this.body.touching.down;
      if (this.x < this.spawnX - this.range) this.turn(1);
      else if (this.x > this.spawnX + this.range) this.turn(-1);
      else if (this.body.blocked.left) this.turn(1);
      else if (this.body.blocked.right) this.turn(-1);
      else if (onGround && this.hasWallAhead()) this.turn(-this.dir);
      else if (onGround && !this.hasGroundAhead()) this.turn(-this.dir);
      else if (Math.abs(this.body.velocity.x) < 1) this.turn(this.dir); // re-arm after a shove
    } else if (cfg.behavior === 'hop') {
      this.hopTimer -= dt;
      if (this.hopTimer <= 0 && (this.body.blocked.down || this.body.touching.down)) {
        this.body.setVelocityY(-this.hopPower());
        this.hopTimer = cfg.hopInterval;
      }
    } else if (cfg.behavior === 'fly') {
      this.flyPhase += dt * 0.004;
      // Steer at the point on the sine rather than at its derivative, so the
      // path cannot drift downwards over a long level.
      var targetY = this.baseY + Math.sin(this.flyPhase) * (cfg.bobRange || 90);
      this.body.setVelocityY((targetY - this.y) * (1000 / Math.max(1, dt)));
      if (this.x < this.spawnX - this.range) this.turn(1);
      else if (this.x > this.spawnX + this.range) this.turn(-1);
      else if (Math.abs(this.body.velocity.x) < 1) this.turn(this.dir);
    }

    // Driven from the current direction every frame rather than only on a
    // turn, so a shove from a collision cannot leave an enemy coasting.
    if (cfg.behavior === 'patrol' || cfg.behavior === 'fly') {
      this.body.setVelocityX(cfg.speed * this.dir);
    }

    this.draw();
  };

  /* Hop only as high as the ceiling above actually allows, so a hopper standing
   * under a platform bounces politely in place instead of hammering into it.
   */
  Enemy.prototype.hopPower = function () {
    var full = this.cfg.hopVelocity || 420;
    var scene = this.scene;
    if (!scene.solidBoxesIn) return full;
    var gravity = scene.physics.world.gravity.y || 1400;
    var wanted = (full * full) / (2 * gravity);
    var headroom = 0;
    for (var d = 8; d <= wanted + 16; d += 8) {
      if (scene.solidBoxesIn(this.body.left + 2, this.body.top - d, this.body.width - 4, 8).length > 0) break;
      headroom = d;
    }
    if (headroom >= wanted) return full;
    return Math.sqrt(Math.max(0, 2 * gravity * Math.max(0, headroom - 10)));
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

  /* Killed outright (stomp-free): invincible player, or falling out of the
   * world. Spins away instead of squashing so the two read differently.
   */
  Enemy.prototype.blastAway = function () {
    if (this.dead) return this.cfg.points;
    this.dead = true;
    this.body.enable = false;
    this.scene.tweens.add({
      targets: this,
      y: this.y - 120,
      angle: 320,
      alpha: 0,
      duration: 520,
      ease: 'Quad.easeOut',
      onComplete: function (t, targets) { targets[0].destroy(); },
    });
    return this.cfg.points;
  };

  window.Enemy = Enemy;
})();
