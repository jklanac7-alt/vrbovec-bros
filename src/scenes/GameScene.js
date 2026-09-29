/* GameScene.js - builds a playable level purely from its JSON description
 * (see levels/vrbovec-centar.json) plus the shared configs in /data.
 * Nothing here is specific to one level: ground, platforms, columns,
 * question blocks, coins, enemies, landmarks, checkpoints and the goal flag
 * are all read from data.
 */
window.GameScene = class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.levelId = data.levelId || DataStore.getLevelList()[0].id;
    this.characterId = data.characterId || DataStore.getDefaultCharacterId();
    this.lives = data.lives === undefined ? 3 : data.lives;
    this.score = data.score || 0;
    this.coinCount = data.coins || 0;
    this.respawnPoint = data.respawnPoint || null;
    this.checkpointIndex = data.checkpointIndex === undefined ? -1 : data.checkpointIndex;
    this.justRespawned = !!data.justRespawned;
    this.levelComplete = false;
    this.playerDying = false;
  }

  create() {
    var self = this;
    this.levelCfg = DataStore.getLevelConfig(this.levelId);
    this.level = DataStore.getLevelData(this.levelId);
    var level = this.level;
    var charData = DataStore.getCharacter(this.characterId);

    this.timeLeft = level.timeLimit || 200;

    this.physics.world.gravity.y = level.gravity || 1400;
    this.physics.world.setBounds(0, 0, level.width, level.height + 600);
    this.cameras.main.setBounds(0, 0, level.width, level.height);
    this.cameras.main.setBackgroundColor('#62a8ff');

    BackgroundRenderer.create(this, level.background, level.width, level.height);

    this.buildLandmarks(level);

    this.solids = this.physics.add.staticGroup();
    this.questionBlocks = [];

    (level.ground || []).forEach(function (seg) {
      TileRenderer.createGround(self, self.solids, seg, DataStore.tilesets);
    });
    (level.platforms || []).forEach(function (p) {
      TileRenderer.createPlatform(self, self.solids, p, DataStore.tilesets);
    });
    (level.columns || []).forEach(function (c) {
      TileRenderer.createColumn(self, self.solids, c, DataStore.tilesets);
    });
    (level.questionBlocks || []).forEach(function (qb) {
      self.questionBlocks.push(TileRenderer.createQuestionBlock(self, self.solids, qb, DataStore.tilesets));
    });

    this.drawCheckpoints(level);

    this.coinGroup = this.add.group();
    (level.coins || []).forEach(function (c) {
      self.coinGroup.add(Collectibles.createCoin(self, c.x, c.y));
    });

    this.itemGroup = this.add.group();

    this.buildObstacles(level);

    // Flyers ignore terrain, so they are kept out of the group that collides
    // with the solids - otherwise a crow would be separated out of the air
    // and pinned against the first platform it crossed.
    this.enemyGroup = this.add.group();
    this.groundEnemyGroup = this.add.group();
    (level.enemies || []).forEach(function (e) {
      var enemy = new Enemy(self, e.x, e.y, e.type, e.range);
      self.enemyGroup.add(enemy);
      if (enemy.cfg.behavior !== 'fly') self.groundEnemyGroup.add(enemy);
    });

    this.goal = TileRenderer.createFlag(this, level.flag);

    var start = this.respawnPoint || level.playerStart;
    this.player = new Player(this, start.x, start.y, charData);
    this.player.body.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, this.solids, function (player, zone) {
      self.onSolidCollision(player, zone);
    });
    this.physics.add.collider(this.groundEnemyGroup, this.solids);
    this.physics.add.collider(this.itemGroup, this.solids);

    // Trick platforms are solid for the player, enemies and loose power-ups alike.
    [this.movingGroup, this.fallingGroup].forEach(function (group) {
      self.physics.add.collider(self.groundEnemyGroup, group);
      self.physics.add.collider(self.itemGroup, group);
    });
    this.physics.add.collider(this.player, this.movingGroup);
    this.physics.add.collider(this.player, this.fallingGroup, function (player, plat) {
      if (plat.body.enable && player.body.bottom <= plat.body.top + 14) plat.trigger();
    });
    this.physics.add.overlap(this.player, this.springGroup, function (player, spring) {
      self.onSpring(player, spring);
    });
    this.physics.add.overlap(this.player, this.hazardGroup, function (player, hazard) {
      self.onHazard(player, hazard);
    });
    this.physics.add.overlap(this.player, this.coinGroup, function (player, coin) {
      self.onCoin(coin);
    });
    this.physics.add.overlap(this.player, this.itemGroup, function (player, item) {
      self.onItem(item);
    });
    this.physics.add.overlap(this.player, this.enemyGroup, function (player, enemy) {
      self.onEnemyTouch(player, enemy);
    });
    this.physics.add.overlap(this.player, this.goal.sensor, function () {
      self.onReachGoal();
    });

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, 90);

    this.hud = new HUD(this);
    this.hud.update({ lives: this.lives, coins: this.coinCount, score: this.score, timeLeft: this.timeLeft });

    this.inputManager = new InputManager(this);
    this.inputManager.create();

    // Touch buttons are torn down while paused so they cannot overlap the
    // pause menu, and rebuilt when play resumes.
    var onResume = function () {
      if (!self.inputManager) {
        self.inputManager = new InputManager(self);
        self.inputManager.create();
      }
    };
    this.events.on('resume', onResume);

    this.events.once('shutdown', function () {
      if (self.inputManager) self.inputManager.destroy();
      // Scene shutdown does not clear ordinary scene listeners, so without this
      // the resume handler stacked up one copy per death/restart.
      self.events.off('resume', onResume);
    });

    /* A moment of grace after respawning. A checkpoint that happens to sit
     * near a patrol route or a spike strip otherwise kills the player again
     * the instant the level restarts, which burns every remaining life in a
     * couple of seconds with nothing the player can do about it.
     */
    if (this.justRespawned) {
      this.player.invulnerable = true;
      this.player.invulnTimer = 1600;
    }

    if (this.checkpointIndex >= 0) {
      this.hud.flash('KONTROLNA TOČKA');
    }
  }

  /* Every hazard and trick platform in the level JSON, in one place.
   * Empty sections are fine - a level that declares none simply gets none.
   */
  buildObstacles(level) {
    var self = this;
    this.movingPlatforms = [];
    this.fallingPlatforms = [];
    this.springs = [];
    this.movingGroup = this.add.group();
    this.fallingGroup = this.add.group();
    this.springGroup = this.add.group();
    this.hazardGroup = this.add.group();

    (level.movingPlatforms || []).forEach(function (cfg) {
      var p = new MovingPlatform(self, cfg);
      self.movingPlatforms.push(p);
      self.movingGroup.add(p);
    });
    (level.fallingPlatforms || []).forEach(function (cfg) {
      var p = new FallingPlatform(self, cfg);
      self.fallingPlatforms.push(p);
      self.fallingGroup.add(p);
    });
    (level.springs || []).forEach(function (cfg) {
      var s = new Spring(self, cfg);
      self.springs.push(s);
      self.springGroup.add(s);
    });
    (level.hazards || []).forEach(function (cfg) {
      self.hazardGroup.add(new Hazard(self, cfg));
    });
  }

  /* Bodies of level geometry (ground, platforms, columns, blocks, moving and
   * crumbling platforms) overlapping the given rectangle - and nothing else.
   * Used for ledge/wall/headroom probes and for checking a teleport landing
   * spot, all of which must ignore actors, coins and power-ups.
   */
  solidBoxesIn(x, y, w, h) {
    var bodies = this.physics.overlapRect(x, y, w, h, true, true) || [];
    var out = [];
    for (var i = 0; i < bodies.length; i++) {
      var go = bodies[i].gameObject;
      if (go && go.isLevelSolid && bodies[i].enable) out.push(bodies[i]);
    }
    return out;
  }

  /* Arcade does not transfer an immovable body's motion to whatever stands on
   * it, so the platform's velocity is added on top of the rider's own. Nudging
   * the rider's position instead does not survive the physics step, which is
   * why the player used to slide straight off a moving platform.
   *
   * Must run AFTER the actors have set their velocities for this frame, or
   * their own update would simply overwrite the carry.
   */
  /* Works out, for each actor, which moving platform it is riding and how much
   * speed that platform lends it this frame. Runs BEFORE the actors update, so
   * they fold the loan into the velocity they set themselves; an actor that is
   * not riding anything gets 0, which is what keeps the value from stacking up
   * frame after frame and firing the rider off the front of the platform.
   */
  /* Horizontal carrying is NOT done here on purpose.
   *
   * Arcade already rides actors along a moving platform: when it separates a
   * body that landed on another, it shifts the rider by the lower body's own
   * displacement, scaled by that body's friction.x (which defaults to 1). Any
   * carry added on top of that - by velocity or by position - is applied twice,
   * and the rider then slides off the front of the platform at exactly double
   * speed. All this pass does is remember who is riding what, so the descent
   * assist below knows where to look.
   */
  assignPlatformCarry() {
    var self = this;
    var riders = [this.player].concat(this.enemyGroup.getChildren());
    riders.forEach(function (actor) {
      if (actor && actor.body) actor.ridingPlatform = null;
    });
    this.movingPlatforms.forEach(function (plat) {
      if (!plat.active || !plat.body || !plat.body.enable) return;
      riders.forEach(function (actor) {
        if (!actor || !actor.active || !actor.body || !actor.body.enable || actor.dead) return;
        if (self.isStandingOn(actor, plat)) actor.ridingPlatform = plat;
      });
    });
  }

  /* A platform travelling downwards outruns a rider who is only just starting
   * to fall, so riders are pulled down with it. Setting (rather than adding)
   * the velocity means this cannot accumulate either.
   */
  carryRidersDown() {
    var self = this;
    var riders = [this.player].concat(this.enemyGroup.getChildren());
    riders.forEach(function (actor) {
      if (!actor || !actor.active || !actor.body || !actor.body.enable || actor.dead) return;
      var plat = actor.ridingPlatform;
      if (!plat || !plat.active || !plat.body) return;
      if (!self.isStandingOn(actor, plat)) { actor.ridingPlatform = null; return; }
      var pvy = plat.body.velocity.y;
      if (pvy > 0) actor.body.velocity.y = Math.max(actor.body.velocity.y, pvy);
    });
  }

  /* Deliberately geometric rather than based on body.touching/blocked: Arcade
   * only raises those flags on frames where it actually had to separate the
   * two bodies, so an actor resting cleanly on a platform reads as "not
   * touching" every other frame and would be dropped by the carry.
   */
  isStandingOn(actor, plat) {
    var ab = actor.body;
    var pb = plat.body;
    if (ab.velocity.y < -10) return false; // on the way up, not riding
    return ab.bottom >= pb.top - 6 && ab.bottom <= pb.top + 24 &&
      ab.right > pb.left + 2 && ab.left < pb.right - 2;
  }

  onSpring(player, spring) {
    if (this.playerDying || this.levelComplete || player.dead) return;
    // Only from above, and only while not already shooting upwards.
    if (player.body.velocity.y < -20) return;
    if (player.body.bottom > spring.body.center.y + 14) return;
    if (!spring.fire()) return;
    player.bounce(-spring.power);
    player.usedDoubleJump = false;
    this.hud.flash('HOOOP!');
  }

  onHazard(player, hazard) {
    if (this.playerDying || this.levelComplete || player.dead) return;
    if (player.invincible || player.invulnerable) return;
    var fatal = player.takeHit();
    if (fatal) {
      this.killPlayer();
    } else {
      player.bounce(-430); // pop him back out of the spikes
      this.hud.flash('AUČ!');
    }
  }

  buildLandmarks(level) {
    var self = this;
    var halfView = this.scale.width / 2;
    (level.landmarks || []).forEach(function (lm) {
      var cfg = DataStore.landmarks ? DataStore.landmarks[lm.type] : null;
      var scrollFactor = lm.scrollFactor === undefined ? 1 : lm.scrollFactor;
      // Compensate for parallax so the landmark shows up on screen while the
      // player is standing near its intended world position.
      var placeX = halfView + (lm.x - halfView) * scrollFactor;
      var opts = { scale: lm.scale || 1, config: cfg };
      var container = LandmarkRenderer.create(self, lm.type, placeX, lm.y, opts);
      if (container) {
        container.setScrollFactor(scrollFactor, 1);
        container.setDepth(lm.depth === undefined ? -10 : lm.depth);
      }
      var solid = lm.solid === undefined ? (cfg && cfg.solid) : lm.solid;
      if (solid && scrollFactor === 1) {
        var boxes = LandmarkRenderer.getCollisionBoxes(lm.type, lm.x, lm.y, opts) || [];
        boxes.forEach(function (b) {
          var zone = self.add.rectangle(b.x + b.w / 2, b.y + b.h / 2, b.w, b.h, 0x000000, 0);
          zone.setVisible(false);
          self.physics.add.existing(zone, true);
          zone.isLevelSolid = true;
          self.solids.add(zone);
        });
      }
    });
  }

  drawCheckpoints(level) {
    var self = this;
    this.checkpointMarkers = [];
    (level.checkpoints || []).forEach(function (cp, i) {
      var g = self.add.graphics();
      g.setDepth(4);
      g.lineStyle(5, 0x1a1a1a, 1);
      g.fillStyle(0xd8d8d8, 1);
      g.fillRect(cp.x - 4, cp.y - 120, 8, 120);
      g.strokeRect(cp.x - 4, cp.y - 120, 8, 120);
      var reached = i <= self.checkpointIndex;
      g.fillStyle(reached ? 0x3ad86b : 0xbbbbbb, 1);
      g.fillTriangle(cp.x + 4, cp.y - 116, cp.x + 54, cp.y - 96, cp.x + 4, cp.y - 76);
      g.lineStyle(3, 0x1a1a1a, 1);
      g.strokeTriangle(cp.x + 4, cp.y - 116, cp.x + 54, cp.y - 96, cp.x + 4, cp.y - 76);
      self.checkpointMarkers.push({ cfg: cp, gfx: g, index: i });
    });
  }

  onSolidCollision(player, zone) {
    var block = zone.parentBlock;
    if (!block || block.used) return;
    if (!player.body.blocked.up && !player.body.touching.up) return;
    block.used = true;
    block.redraw(true);
    this.tweens.add({ targets: block, y: block.y - 12, duration: 90, yoyo: true });

    var item = Collectibles.spawnItemFromBlock(this, block.x, block.y - 40, block.itemType);
    if (block.itemType === 'coin') {
      this.addScore(DataStore.items.coin.points);
      this.coinCount += 1;
    } else {
      this.itemGroup.add(item);
    }
  }

  onCoin(coin) {
    if (!coin.body || !coin.body.enable) return;
    var pts = Collectibles.collectCoin(this, coin);
    this.coinCount += 1;
    this.addScore(pts);
  }

  onItem(item) {
    if (!item.body || !item.body.enable) return;
    item.body.enable = false;
    if (item.itemEffect === 'grow') {
      this.player.grow();
      this.addScore(200);
      this.hud.flash('VEĆI SI!');
    } else if (item.itemEffect === 'life') {
      this.lives += 1;
      this.hud.flash('+1 ŽIVOT');
    } else if (item.itemEffect === 'invincible') {
      this.player.setInvincible(DataStore.items.rakija && DataStore.items.rakija.duration);
      this.addScore(300);
      this.hud.flash('NEUNIŠTIV!');
    }
    item.destroy();
  }

  onEnemyTouch(player, enemy) {
    if (enemy.dead || this.playerDying || this.levelComplete) return;
    if (player.invincible) {
      var blasted = enemy.blastAway();
      this.addScore(blasted);
      this.hud.flash('+' + blasted);
      return;
    }
    var playerBottom = player.y + player.body.halfHeight;
    var falling = player.body.velocity.y > 60;
    var fromAbove = playerBottom < enemy.y + enemy.cfg.height * 0.4;
    if (falling && fromAbove) {
      var pts = enemy.stomp();
      this.addScore(pts);
      player.bounce(-460);
      this.hud.flash('+' + pts);
      return;
    }
    if (player.invulnerable) return;
    var fatal = player.takeHit();
    if (fatal) this.killPlayer();
  }

  onReachGoal() {
    if (this.levelComplete) return;
    this.levelComplete = true;
    var self = this;
    this.player.playWin();
    this.addScore(Math.ceil(this.timeLeft) * 10);
    this.hud.flash('CILJ!');
    this.cameras.main.stopFollow();
    this.time.delayedCall(1400, function () {
      // Capture the old best first: recordResult only writes on a strictly
      // higher score, so comparing against the stored value afterwards showed
      // "NOVI REKORD!" for merely matching your previous best.
      var previousBest = SaveManager.getHighScore(self.levelId);
      var isNewRecord = !previousBest || self.score > previousBest.score;
      SaveManager.recordResult(self.levelId, {
        score: self.score,
        coins: self.coinCount,
        timeLeft: Math.ceil(self.timeLeft),
      });
      var next = SaveManager.unlockNextAfter(self.levelCfg, DataStore.getLevelList());
      if (self.inputManager) self.inputManager.destroy();
      self.scene.start('LevelComplete', {
        levelId: self.levelId,
        characterId: self.characterId,
        score: self.score,
        coins: self.coinCount,
        timeLeft: Math.ceil(self.timeLeft),
        lives: self.lives,
        nextLevelId: next ? next.id : null,
        newRecord: isNewRecord,
      });
    });
  }

  /* "Magnet za kune": coins inside the ability radius fly to the player. */
  applyCoinMagnet() {
    var ability = this.player.ability;
    if (!ability || ability.type !== 'magnet' || this.playerDying) return;
    var radius = ability.value || 220;
    var self = this;
    this.coinGroup.getChildren().forEach(function (coin) {
      if (!coin.body || !coin.body.enable) return;
      var dx = self.player.x - coin.x;
      var dy = self.player.y - coin.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius || dist < 1) {
        if (coin.magnetised) coin.body.setVelocity(0, 0);
        return;
      }
      if (!coin.magnetised) {
        coin.magnetised = true;
        self.tweens.killTweensOf(coin);
      }
      var speed = 260 + (1 - dist / radius) * 420;
      coin.body.setVelocity((dx / dist) * speed, (dy / dist) * speed);
    });
  }

  addScore(points) {
    this.score += points;
  }

  killPlayer() {
    if (this.playerDying) return;
    this.playerDying = true;
    var self = this;
    var player = this.player;
    player.dead = true;
    player.state = 'hit';
    player.body.setVelocity(0, -480);
    player.body.checkCollision.none = true;
    this.cameras.main.stopFollow();

    this.time.delayedCall(1200, function () {
      self.lives -= 1;
      if (self.inputManager) self.inputManager.destroy();
      if (self.lives <= 0) {
        self.scene.start('GameOver', {
          levelId: self.levelId,
          characterId: self.characterId,
          score: self.score,
          coins: self.coinCount,
        });
      } else {
        self.scene.restart({
          levelId: self.levelId,
          characterId: self.characterId,
          lives: self.lives,
          score: self.score,
          coins: self.coinCount,
          respawnPoint: self.respawnPoint,
          checkpointIndex: self.checkpointIndex,
          justRespawned: true,
        });
      }
    });
  }

  update(time, delta) {
    if (!this.player) return;
    var dt = Math.min(delta, 50);
    var input = this.inputManager ? this.inputManager.getState() : {
      left: false, right: false, run: false, jumpDown: false, jumpPressed: false, pausePressed: false,
    };

    if (input.pausePressed && !this.levelComplete && !this.playerDying) {
      if (this.inputManager) {
        this.inputManager.destroy();
        this.inputManager = null;
      }
      this.scene.pause();
      this.scene.launch('Pause', { levelId: this.levelId, characterId: this.characterId });
      return;
    }

    this.movingPlatforms.forEach(function (plat) { plat.preMove(dt); });
    this.springs.forEach(function (spring) { spring.update(dt); });
    this.assignPlatformCarry();

    this.player.update(input, dt);
    this.applyCoinMagnet();

    var floor = this.level.height + 400;
    // getChildren() hands back the group's live array, and destroy() splices
    // out of it, so both lists are copied before they are walked.
    this.enemyGroup.getChildren().slice().forEach(function (enemy) {
      if (enemy.update) enemy.update(dt);
      // Anything that slipped off the world is removed rather than left to
      // fall forever, eating a body and a draw call per frame.
      if (!enemy.dead && enemy.y > floor) enemy.destroy();
    });
    this.itemGroup.getChildren().slice().forEach(function (item) {
      if (item.y > floor) item.destroy();
      else if (item.body && item.body.enable && item.itemEffect) {
        // Loose power-ups turn around at walls instead of grinding into them.
        if (item.body.blocked.left) item.body.setVelocityX(Math.abs(item.body.velocity.x) || 80);
        else if (item.body.blocked.right) item.body.setVelocityX(-(Math.abs(item.body.velocity.x) || 80));
      }
    });

    // After every actor has chosen its velocity for this frame.
    this.carryRidersDown();

    if (!this.levelComplete && !this.playerDying) {
      this.timeLeft -= dt / 1000;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.killPlayer();
      }
      this.checkCheckpoints();
      // Backstop for the goal. The overlap alone can be skipped: Kvantna
      // teleportacija moves the player 210px in a single frame, straight over
      // the sensor, and the level could then never be finished.
      if (this.player.x >= this.level.flag.x) {
        this.onReachGoal();
      }
      if (this.player.y > this.level.height + 120) {
        this.killPlayer();
      }
    }

    this.hud.update({
      lives: this.lives,
      coins: this.coinCount,
      score: this.score,
      timeLeft: this.timeLeft,
    });
  }

  checkCheckpoints() {
    var self = this;
    this.checkpointMarkers.forEach(function (marker) {
      if (marker.index <= self.checkpointIndex) return;
      if (self.player.x >= marker.cfg.x) {
        self.checkpointIndex = marker.index;
        // Respawn clearly above the surface: an Arcade body that starts
        // embedded in a static body is not pushed out and falls through.
        self.respawnPoint = { x: marker.cfg.x, y: marker.cfg.y - 110 };
        marker.gfx.clear();
        marker.gfx.lineStyle(5, 0x1a1a1a, 1);
        marker.gfx.fillStyle(0xd8d8d8, 1);
        marker.gfx.fillRect(marker.cfg.x - 4, marker.cfg.y - 120, 8, 120);
        marker.gfx.strokeRect(marker.cfg.x - 4, marker.cfg.y - 120, 8, 120);
        marker.gfx.fillStyle(0x3ad86b, 1);
        marker.gfx.fillTriangle(marker.cfg.x + 4, marker.cfg.y - 116, marker.cfg.x + 54, marker.cfg.y - 96, marker.cfg.x + 4, marker.cfg.y - 76);
        marker.gfx.lineStyle(3, 0x1a1a1a, 1);
        marker.gfx.strokeTriangle(marker.cfg.x + 4, marker.cfg.y - 116, marker.cfg.x + 54, marker.cfg.y - 96, marker.cfg.x + 4, marker.cfg.y - 76);
        self.hud.flash('KONTROLNA TOČKA!');
        self.addScore(100);
      }
    });
  }
};
