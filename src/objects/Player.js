/* Player.js
 * A data-driven playable character. There are no hand-drawn sprite sheets for
 * the cast (each character is just a real cropped head photo + a JSON color
 * palette), so the body is a procedurally drawn pixel-art rig (Graphics,
 * flat colors + thick outlines) whose pose changes with player state
 * (idle/run/jump/fall/hit/win). This means adding a brand new playable
 * character only requires a head image + a colors/stats block in
 * data/characters.json - no spriting required. See README.md.
 */
(function () {
  function col(hex) { return Phaser.Display.Color.HexStringToColor(hex).color; }

  function makeHeadTexture(scene, headKey, outKey, size) {
    if (scene.textures.exists(outKey)) return;
    var srcImg = scene.textures.get(headKey).getSourceImage();
    var canvasTex = scene.textures.createCanvas(outKey, size, size);
    var ctx = canvasTex.getContext();
    var r = size / 2 - 4;
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(srcImg, 0, 0, size, size);
    ctx.restore();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#1a1a1aff';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    ctx.stroke();
    canvasTex.refresh();
  }

  var Player = function (scene, x, y, characterData) {
    Phaser.GameObjects.Container.call(this, scene, x, y);
    this.scene = scene;
    this.characterData = characterData;
    this.state = 'idle';
    this.facing = 1;
    this.isBig = false;
    this.invulnerable = false;
    this.invulnTimer = 0;
    this.hitTimer = 0;
    this.winPose = false;
    this.dead = false;
    this.usedDoubleJump = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.walkPhase = 0;
    var ability = characterData.ability || { type: 'none' };
    this.ability = ability;
    this.canDoubleJump = ability.type === 'doubleJump';
    this.canTeleport = ability.type === 'teleport';
    this.speedBoost = ability.type === 'speedBoost' ? ability.value : 1;

    var headKey = 'headCircle_' + characterData.id;
    makeHeadTexture(scene, 'head_' + characterData.id, headKey, 128);

    // Soft contact shadow keeps the character readable against the scenery.
    this.shadow = scene.add.ellipse(0, 50, 46, 12, 0x000000, 0.25);
    this.add(this.shadow);

    this.bodyGfx = scene.add.graphics();
    this.add(this.bodyGfx);

    this.headImage = scene.add.image(0, -30, headKey);
    this.headImage.setDisplaySize(44, 44);
    this.add(this.headImage);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(34, 96);
    this.body.setOffset(-17, -48);
    this.body.setMaxVelocity(460, 1200);
    // Horizontal acceleration and friction are applied by hand in update() so
    // input response stays snappy; Arcade drag would fight the input curve.
    this.body.setDragX(0);
    this.setDepth(20);

    this.redraw();
  };

  Player.prototype = Object.create(Phaser.GameObjects.Container.prototype);
  Player.prototype.constructor = Player;

  Player.prototype.redraw = function () {
    var c = this.characterData.colors || {};
    var shirt = col(c.shirt || '#3a6fd8');
    var shirtShade = col(c.shirtShade || '#274d9e');
    var pants = col(c.pants || '#2b2b2b');
    var pantsShade = col(c.pantsShade || '#161616');
    var g = this.bodyGfx;
    g.clear();

    var facing = this.facing;
    var legSwing = Math.sin(this.walkPhase) * 14;
    var armSwing = Math.sin(this.walkPhase) * 12;
    var pose = this.state;

    var legOffsetL = 0, legOffsetR = 0, armAngle = 0, torsoY = -6, torsoTilt = 0;

    if (pose === 'run') {
      legOffsetL = legSwing;
      legOffsetR = -legSwing;
      armAngle = -armSwing;
    } else if (pose === 'jump') {
      legOffsetL = -8; legOffsetR = 8; armAngle = -28;
    } else if (pose === 'fall') {
      legOffsetL = 6; legOffsetR = -6; armAngle = 18;
    } else if (pose === 'hit') {
      torsoTilt = facing * 8;
    } else if (pose === 'win') {
      armAngle = -50;
    }

    g.lineStyle(4, 0x1a1a1a, 1);

    // legs
    var legW = 12, legH = 30, legY = 16;
    g.fillStyle(pantsShade, 1);
    g.fillRoundedRect(-14 + legOffsetL * 0.2, legY + Math.abs(legOffsetL) * 0.15, legW, legH, 3);
    g.strokeRoundedRect(-14 + legOffsetL * 0.2, legY + Math.abs(legOffsetL) * 0.15, legW, legH, 3);
    g.fillStyle(pantsShade, 1);
    g.fillRoundedRect(2 + legOffsetR * 0.2, legY + Math.abs(legOffsetR) * 0.15, legW, legH, 3);
    g.strokeRoundedRect(2 + legOffsetR * 0.2, legY + Math.abs(legOffsetR) * 0.15, legW, legH, 3);

    // torso / overalls
    g.fillStyle(shirt, 1);
    g.fillRoundedRect(-16, torsoY, 32, 24, 6);
    g.strokeRoundedRect(-16, torsoY, 32, 24, 6);
    g.fillStyle(pants, 1);
    g.fillRoundedRect(-16, torsoY + 12, 32, 14, 4);
    g.strokeRoundedRect(-16, torsoY + 12, 32, 14, 4);
    g.fillStyle(shirtShade, 1);
    g.fillRect(-16, torsoY + 12, 32, 3);

    // arms
    var armX = facing * 15;
    g.fillStyle(shirt, 1);
    g.fillRoundedRect(armX - 5, torsoY + 2 + armAngle * 0.3, 10, 20, 4);
    g.strokeRoundedRect(armX - 5, torsoY + 2 + armAngle * 0.3, 10, 20, 4);

    this.setRotation(pose === 'hit' ? Phaser.Math.DegToRad(torsoTilt) : 0);
    this.headImage.setFlipX(facing < 0);
  };

  /* Kvantna teleportacija: blink forward, but only to a spot that is actually
   * free - an Arcade body dropped inside static geometry is never pushed back
   * out and would fall through the world.
   */
  Player.prototype.teleport = function (distance) {
    var physics = this.scene.physics;
    var bounds = physics.world.bounds;
    var halfW = this.body.halfWidth;
    var halfH = this.body.halfHeight;
    for (var d = distance; d >= 60; d -= 25) {
      var tx = this.x + this.facing * d;
      if (tx < halfW + 4 || tx > bounds.width - halfW - 4) continue;
      var hits = physics.overlapRect(tx - halfW, this.y - halfH, halfW * 2, halfH * 2, false, true);
      if (hits && hits.length > 0) continue;

      var vx = this.body.velocity.x;
      var vy = this.body.velocity.y;
      var fromX = this.x;
      this.body.reset(tx, this.y);
      this.body.setVelocity(vx, vy);
      this.spawnTeleportTrail(fromX, tx);
      return true;
    }
    return false;
  };

  Player.prototype.spawnTeleportTrail = function (fromX, toX) {
    var g = this.scene.add.graphics();
    g.setDepth(19);
    g.fillStyle(0x8fd0ff, 0.55);
    g.lineStyle(3, 0xffffff, 0.8);
    var left = Math.min(fromX, toX);
    var width = Math.abs(toX - fromX);
    g.fillRoundedRect(left, this.y - 44, width, 88, 18);
    g.strokeRoundedRect(left, this.y - 44, width, 88, 18);
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 260,
      onComplete: function () { g.destroy(); },
    });
    this.setAlpha(0.35);
    this.scene.tweens.add({ targets: this, alpha: 1, duration: 220 });
  };

  Player.prototype.bounce = function (power) {
    this.body.setVelocityY(power || -480);
  };

  Player.prototype.takeHit = function () {
    if (this.invulnerable || this.dead) return false;
    if (this.isBig) {
      this.isBig = false;
      this.setScale(1);
      this.body.setSize(34, 96);
      this.body.setOffset(-17, -48);
      this.invulnerable = true;
      this.invulnTimer = 1500;
      this.hitTimer = 300;
      this.state = 'hit';
      return false;
    }
    return true; // signals death
  };

  Player.prototype.grow = function () {
    if (this.isBig) return;
    this.isBig = true;
    this.setScale(1.25);
    this.body.setSize(42, 120);
    this.body.setOffset(-21, -60);
  };

  Player.prototype.playWin = function () {
    this.winPose = true;
    this.state = 'win';
    this.body.setVelocityX(0);
    this.body.setAllowGravity(true);
  };

  Player.prototype.update = function (input, dt) {
    if (this.dead || this.winPose) {
      this.redraw();
      return;
    }
    var stats = this.characterData.stats;
    var onGround = this.body.blocked.down || this.body.touching.down;

    if (onGround) {
      this.coyoteTimer = 120;
      this.usedDoubleJump = false;
    } else {
      this.coyoteTimer -= dt;
    }

    var runHeld = input.run;
    var maxSpeed = (runHeld ? stats.runSpeed : stats.walkSpeed) * this.speedBoost;
    var step = dt / 1000;
    var accel = (onGround ? 2600 : 2600 * stats.airControl) * step;
    var friction = (onGround ? 2600 : 500) * step;

    var moveDir = 0;
    if (input.left) moveDir = -1;
    if (input.right) moveDir = 1;

    var vx = this.body.velocity.x;
    if (moveDir !== 0) {
      this.facing = moveDir;
      var targetVX = moveDir * maxSpeed;
      if (moveDir > 0) vx = Math.min(targetVX, vx + accel);
      else vx = Math.max(targetVX, vx - accel);
      this.walkPhase += dt * 0.02 * (runHeld ? 1.6 : 1);
    } else {
      if (vx > 0) vx = Math.max(0, vx - friction);
      else if (vx < 0) vx = Math.min(0, vx + friction);
      this.walkPhase = 0;
    }
    this.body.setVelocityX(vx);

    if (input.jumpPressed) this.jumpBufferTimer = 150; else this.jumpBufferTimer -= dt;

    if (this.jumpBufferTimer > 0 && (onGround || this.coyoteTimer > 0)) {
      this.body.setVelocityY(-stats.jumpVelocity);
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.usedDoubleJump = false;
    } else if (this.jumpBufferTimer > 0 && this.canDoubleJump && !this.usedDoubleJump && !onGround) {
      this.body.setVelocityY(-stats.jumpVelocity * 0.85);
      this.usedDoubleJump = true;
      this.jumpBufferTimer = 0;
    } else if (this.jumpBufferTimer > 0 && this.canTeleport && !this.usedDoubleJump && !onGround) {
      if (this.teleport(this.ability.value || 200)) this.usedDoubleJump = true;
      this.jumpBufferTimer = 0;
    }

    if (this.invulnerable) {
      this.invulnTimer -= dt;
      this.alpha = Math.floor(this.invulnTimer / 100) % 2 === 0 ? 0.4 : 1;
      if (this.invulnTimer <= 0) { this.invulnerable = false; this.alpha = 1; }
    }

    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
      this.state = 'hit';
    } else if (!onGround) {
      this.state = this.body.velocity.y < 0 ? 'jump' : 'fall';
    } else if (Math.abs(this.body.velocity.x) > 12) {
      this.state = 'run';
    } else {
      this.state = 'idle';
    }

    this.redraw();
  };

  /* Exposed so menus can render the same circular head portraits. */
  Player.makeHeadTexture = makeHeadTexture;

  window.Player = Player;
})();
