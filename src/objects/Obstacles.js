/* Obstacles.js - the level hazards and trick platforms.
 *
 * Everything here is created straight from the level JSON (see
 * levels/*.json -> movingPlatforms / fallingPlatforms / springs / hazards)
 * and, like TileRenderer, keeps the drawn shape and the physics body as two
 * separate objects so collision stays exact no matter how the art changes.
 *
 * Collidable boxes are tagged `isLevelSolid` so ground/wall probes elsewhere
 * (Enemy ledge detection, Player.teleport) treat them as terrain.
 */
(function () {
  function col(hex) { return Phaser.Display.Color.HexStringToColor(hex).color; }

  /* ---------------------------------------------------------------- moving */
  /* A platform that slides along a line. The body is dynamic + immovable and
   * is driven by velocity rather than by teleporting its position, so Arcade
   * separates the player against it properly instead of letting him sink in.
   * Riders need no code of their own: when Arcade separates a body that landed
   * on this one it already shifts the rider by this platform's displacement
   * (scaled by body.friction.x, which defaults to 1).
   */
  var MovingPlatform = function (scene, cfg) {
    var w = cfg.width || 128;
    var h = cfg.height || 28;
    Phaser.GameObjects.Container.call(this, scene, cfg.x + w / 2, cfg.y + h / 2);
    this.scene = scene;
    this.halfW = w / 2;
    this.halfH = h / 2;
    this.pathX = this.x;
    this.pathY = this.y;
    this.rangeX = cfg.rangeX || 0;
    this.rangeY = cfg.rangeY || 0;
    // A full there-and-back cycle takes `period` ms.
    this.omega = (Math.PI * 2) / Math.max(400, cfg.period || 3000);
    this.phase = (cfg.phase || 0) * Math.PI * 2;

    var g = scene.add.graphics();
    var pal = (DataStore.tilesets.platform && DataStore.tilesets.platform[cfg.type])
      || DataStore.tilesets.platform.moving
      || DataStore.tilesets.platform.brick;
    g.fillStyle(col(pal.color), 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    g.fillStyle(col(pal.colorDark || pal.color), 1);
    g.fillRect(-w / 2 + 4, h / 2 - 8, w - 8, 5);
    g.lineStyle(4, col(pal.outline || '#1a1a1a'), 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    // bolts, so the motion reads even against a busy background
    g.fillStyle(col(pal.outline || '#1a1a1a'), 1);
    g.fillCircle(-w / 2 + 12, 0, 3);
    g.fillCircle(w / 2 - 12, 0, 3);
    this.add(g);
    this.setDepth(6);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(w, h);
    this.body.setOffset(-w / 2, -h / 2);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.isLevelSolid = true;
    this.isRideable = true;
  };
  MovingPlatform.prototype = Object.create(Phaser.GameObjects.Container.prototype);
  MovingPlatform.prototype.constructor = MovingPlatform;

  MovingPlatform.prototype.preMove = function (dt) {
    this.phase += this.omega * dt;

    /* Velocity is the analytic derivative of the path, plus a weak spring that
     * pulls the platform back onto it.
     *
     * Steering straight at the target point instead (error / dt) looks exact
     * but is a feedback loop with a gain of 60: whenever the physics step does
     * not consume exactly one frame's worth of motion the correction
     * overshoots, and the platform ends up juddering thousands of pixels per
     * second back and forth. The spring below is gentle enough to stay stable
     * while still stopping any slow drift off the rail.
     */
    var cos = Math.cos(this.phase);
    var targetX = this.pathX + Math.sin(this.phase) * this.rangeX;
    var targetY = this.pathY + Math.sin(this.phase) * this.rangeY;
    this.body.setVelocity(
      this.rangeX * this.omega * 1000 * cos + (targetX - this.x) * 2,
      this.rangeY * this.omega * 1000 * cos + (targetY - this.y) * 2
    );
  };

  /* --------------------------------------------------------------- falling */
  /* Crumbles a moment after it is stepped on, then comes back so the level is
   * never permanently unwinnable (important when a checkpoint sits past it).
   */
  var FallingPlatform = function (scene, cfg) {
    var w = cfg.width || 112;
    var h = cfg.height || 26;
    Phaser.GameObjects.Container.call(this, scene, cfg.x + w / 2, cfg.y + h / 2);
    this.scene = scene;
    this.homeX = this.x;
    this.homeY = this.y;
    this.triggered = false;
    this.delay = cfg.delay === undefined ? 520 : cfg.delay;
    this.respawn = cfg.respawn === undefined ? 3200 : cfg.respawn;

    var pal = DataStore.tilesets.platform.crumble || DataStore.tilesets.platform.brick;
    var g = scene.add.graphics();
    g.fillStyle(col(pal.color), 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 4);
    g.lineStyle(4, col(pal.outline || '#1a1a1a'), 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 4);
    // planks + cracks so it reads as "this one will not hold"
    g.lineStyle(2, col(pal.colorDark || '#1a1a1a'), 0.8);
    g.lineBetween(-w / 6, -h / 2 + 3, -w / 6, h / 2 - 3);
    g.lineBetween(w / 6, -h / 2 + 3, w / 6, h / 2 - 3);
    g.lineBetween(-w / 2 + 8, -2, -w / 6 - 6, 4);
    g.lineBetween(w / 6 + 6, -4, w / 2 - 8, 3);
    this.add(g);
    this.setDepth(6);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(w, h);
    this.body.setOffset(-w / 2, -h / 2);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.isLevelSolid = true;
    this.isRideable = true;
  };
  FallingPlatform.prototype = Object.create(Phaser.GameObjects.Container.prototype);
  FallingPlatform.prototype.constructor = FallingPlatform;

  FallingPlatform.prototype.trigger = function () {
    if (this.triggered) return;
    this.triggered = true;
    var self = this;
    var scene = this.scene;
    scene.tweens.add({
      targets: this,
      x: this.homeX + 3,
      duration: 55,
      yoyo: true,
      repeat: Math.max(1, Math.round(this.delay / 110)),
      onComplete: function () {
        self.x = self.homeX;
        self.body.enable = false;
        self.isLevelSolid = false;
        scene.tweens.add({
          targets: self,
          y: self.homeY + 260,
          alpha: 0,
          angle: 12,
          duration: 620,
          ease: 'Quad.easeIn',
          onComplete: function () { self.reset(); },
        });
      },
    });
  };

  FallingPlatform.prototype.reset = function () {
    var self = this;
    this.scene.time.delayedCall(this.respawn, function () {
      if (!self.scene || !self.active) return;
      self.setPosition(self.homeX, self.homeY);
      self.setAngle(0);
      self.setAlpha(0);
      self.body.enable = true;
      self.isLevelSolid = true;
      self.triggered = false;
      self.scene.tweens.add({ targets: self, alpha: 1, duration: 260 });
    });
  };

  /* ---------------------------------------------------------------- spring */
  /* Launches the player far higher than a normal jump. Detection is an overlap
   * (not a collision) from above so it can never block horizontal movement.
   */
  var Spring = function (scene, cfg) {
    var w = 52;
    var h = 34;
    Phaser.GameObjects.Container.call(this, scene, cfg.x, cfg.y - h / 2);
    this.scene = scene;
    this.power = cfg.power || 1020;
    this.cooldown = 0;

    this.gfx = scene.add.graphics();
    this.add(this.gfx);
    this.compress = 0;
    this.drawSpring();
    this.setDepth(7);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(w, h);
    this.body.setOffset(-w / 2, -h / 2);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
  };
  Spring.prototype = Object.create(Phaser.GameObjects.Container.prototype);
  Spring.prototype.constructor = Spring;

  Spring.prototype.drawSpring = function () {
    var g = this.gfx;
    var squash = this.compress;
    var h = 34 - squash * 16;
    var top = 17 - h;
    g.clear();
    g.lineStyle(4, 0x1a1a1a, 1);
    // coil
    g.fillStyle(0xd8d8d8, 1);
    for (var i = 0; i < 3; i++) {
      var y = 17 - (i + 1) * (h / 4);
      g.fillRect(-18, y, 36, h / 8 + 3);
      g.strokeRect(-18, y, 36, h / 8 + 3);
    }
    // base + cap
    g.fillStyle(0x8a5a2e, 1);
    g.fillRect(-26, 11, 52, 8);
    g.strokeRect(-26, 11, 52, 8);
    g.fillStyle(0xe0472e, 1);
    g.fillRoundedRect(-26, top, 52, 12, 4);
    g.strokeRoundedRect(-26, top, 52, 12, 4);
  };

  Spring.prototype.fire = function () {
    if (this.cooldown > 0) return false;
    this.cooldown = 260;
    var self = this;
    this.compress = 1;
    this.drawSpring();
    this.scene.tweens.add({
      targets: this,
      compress: 0,
      duration: 200,
      ease: 'Back.easeOut',
      onUpdate: function () { self.drawSpring(); },
    });
    return true;
  };

  Spring.prototype.update = function (dt) {
    if (this.cooldown > 0) this.cooldown -= dt;
  };

  /* ---------------------------------------------------------------- hazard */
  /* Spikes / mud. Overlap only: touching costs the power-up, or a life if the
   * player is already small - same rule as an enemy hit, so it stays readable.
   */
  var Hazard = function (scene, cfg) {
    var w = cfg.width || 128;
    var h = cfg.height || 28;
    Phaser.GameObjects.Container.call(this, scene, cfg.x + w / 2, cfg.y + h / 2);
    this.scene = scene;
    this.kind = cfg.type || 'spikes';

    var g = scene.add.graphics();
    if (this.kind === 'mud') {
      g.fillStyle(0x4a3620, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
      g.lineStyle(4, 0x1a1a1a, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
      g.fillStyle(0x6b4a2a, 1);
      for (var bx = -w / 2 + 16; bx < w / 2 - 8; bx += 34) {
        g.fillCircle(bx, -h / 2 + 7, 5);
      }
    } else {
      // row of triangular spikes sitting on a dark rail
      g.fillStyle(0x6e7681, 1);
      g.lineStyle(3, 0x1a1a1a, 1);
      var step = 26;
      for (var sx = -w / 2; sx < w / 2 - 2; sx += step) {
        var tw = Math.min(step, w / 2 - sx);
        g.fillTriangle(sx, h / 2, sx + tw / 2, -h / 2, sx + tw, h / 2);
        g.strokeTriangle(sx, h / 2, sx + tw / 2, -h / 2, sx + tw, h / 2);
      }
      g.fillStyle(0x3d444d, 1);
      g.fillRect(-w / 2, h / 2 - 6, w, 8);
      g.lineStyle(3, 0x1a1a1a, 1);
      g.strokeRect(-w / 2, h / 2 - 6, w, 8);
    }
    this.add(g);
    /* Above the foreground trees (depth 30) on purpose. A hazard that kills on
     * contact must never be hidden behind scenery - the spike strip at x=6760
     * sat squarely behind a tree canopy.
     */
    this.setDepth(31);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    // Slightly forgiving hitbox - the visual tips should not kill on a graze.
    this.body.setSize(w - 8, h - 10);
    this.body.setOffset(-(w - 8) / 2, -(h - 10) / 2 + 5);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
  };
  Hazard.prototype = Object.create(Phaser.GameObjects.Container.prototype);
  Hazard.prototype.constructor = Hazard;

  window.MovingPlatform = MovingPlatform;
  window.FallingPlatform = FallingPlatform;
  window.Spring = Spring;
  window.Hazard = Hazard;
})();
