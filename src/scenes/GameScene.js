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

    this.enemyGroup = this.add.group();
    (level.enemies || []).forEach(function (e) {
      self.enemyGroup.add(new Enemy(self, e.x, e.y, e.type, e.range));
    });

    this.goal = TileRenderer.createFlag(this, level.flag);

    var start = this.respawnPoint || level.playerStart;
    this.player = new Player(this, start.x, start.y, charData);
    this.player.body.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, this.solids, function (player, zone) {
      self.onSolidCollision(player, zone);
    });
    this.physics.add.collider(this.enemyGroup, this.solids);
    this.physics.add.collider(this.itemGroup, this.solids);
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

    this.events.once('shutdown', function () {
      if (self.inputManager) self.inputManager.destroy();
    });

    // Touch buttons are torn down while paused so they cannot overlap the
    // pause menu, and rebuilt when play resumes.
    this.events.on('resume', function () {
      if (!self.inputManager) {
        self.inputManager = new InputManager(self);
        self.inputManager.create();
      }
    });

    if (this.checkpointIndex >= 0) {
      this.hud.flash('KONTROLNA TOČKA');
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
    }
    item.destroy();
  }

  onEnemyTouch(player, enemy) {
    if (enemy.dead || this.playerDying || this.levelComplete) return;
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

    this.player.update(input, dt);
    this.applyCoinMagnet();

    this.enemyGroup.getChildren().forEach(function (enemy) {
      if (enemy.update) enemy.update(dt);
    });

    if (!this.levelComplete && !this.playerDying) {
      this.timeLeft -= dt / 1000;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.killPlayer();
      }
      this.checkCheckpoints();
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
