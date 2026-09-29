/* LevelSelectScene.js - lists every level from data/levels.json with its
 * lock state (first level always unlocked, later ones unlock on completion).
 */
window.LevelSelectScene = class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  create() {
    var w = this.scale.width;
    var h = this.scale.height;
    var self = this;

    this.add.image(w / 2, h / 2, 'bgVrbovec').setDisplaySize(w, h).setAlpha(0.4).setTint(0x99bbff).setDepth(-10);
    var dim = this.add.graphics();
    dim.fillStyle(0x0d1c38, 0.5);
    dim.fillRect(0, 0, w, h);
    dim.setDepth(-9);

    UIKit.title(this, w / 2, 76, 'ODABERI LEVEL', 48);

    var charId = DataStore.getDefaultCharacterId();
    var charData = DataStore.getCharacter(charId);
    if (charData) {
      var headKey = 'headCircle_' + charData.id;
      Player.makeHeadTexture(this, 'head_' + charData.id, headKey, 128);
      this.add.image(90, 84, headKey).setDisplaySize(74, 74);
      UIKit.label(this, 90, 140, charData.name, 18, '#ffe45c');
    }

    var levels = DataStore.getLevelList();
    var cardW = 320;
    var cardH = 300;
    var gap = 40;
    var perRow = Math.max(1, Math.floor((w - 120) / (cardW + gap)));
    var startX = w / 2 - (Math.min(levels.length, perRow) * (cardW + gap) - gap) / 2 + cardW / 2;

    levels.forEach(function (levelCfg, i) {
      var rx = startX + (i % perRow) * (cardW + gap);
      var ry = 320 + Math.floor(i / perRow) * (cardH + 30);
      self.buildLevelCard(levelCfg, rx, ry, cardW, cardH);
    });

    UIKit.button(this, 140, h - 60, 'NATRAG', function () {
      self.scene.start('MainMenu');
    }, { width: 200, height: 52, fontSize: 20, fill: 0x8fd0ff, fillDown: 0x6aaee0 });
  }

  buildLevelCard(levelCfg, cx, cy, cardW, cardH) {
    var self = this;
    var unlocked = SaveManager.isUnlocked(levelCfg);
    var container = this.add.container(cx, cy);

    var bg = this.add.graphics();
    bg.fillStyle(unlocked ? 0x1b2a4a : 0x2a2a2a, 0.92);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    bg.lineStyle(5, 0x1a1a1a, 1);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    container.add(bg);

    var thumbKey = 'thumb_' + levelCfg.id;
    if (this.textures.exists(thumbKey)) {
      var thumb = this.add.image(0, -60, thumbKey);
      thumb.setDisplaySize(cardW - 34, 140);
      if (!unlocked) thumb.setTint(0x555555);
      container.add(thumb);
      var frame = this.add.graphics();
      frame.lineStyle(4, 0x1a1a1a, 1);
      frame.strokeRect(-(cardW - 34) / 2, -130, cardW - 34, 140);
      container.add(frame);
    }

    var title = this.add.text(0, 40, levelCfg.name, {
      fontFamily: UIKit.FONT, fontSize: '26px', color: unlocked ? '#ffffff' : '#999999',
      fontStyle: 'bold', stroke: '#1a1a1a', strokeThickness: 5,
    });
    title.setOrigin(0.5);
    container.add(title);

    var hs = SaveManager.getHighScore(levelCfg.id);
    var sub = unlocked
      ? (hs ? 'Rekord: ' + hs.score + ' bodova • ' + hs.coins + ' novčića' : 'Još neodigrano')
      : 'Zaključano';
    var subText = this.add.text(0, 78, sub, {
      fontFamily: UIKit.FONT, fontSize: '17px', color: unlocked ? '#dff0ff' : '#aaaaaa',
    });
    subText.setOrigin(0.5);
    container.add(subText);

    if (unlocked) {
      UIKit.button(this, cx, cy + 118, 'IGRAJ', function () {
        self.scene.start('Game', { levelId: levelCfg.id, characterId: DataStore.getDefaultCharacterId() });
      }, { width: 180, height: 50, fontSize: 22 });
    } else {
      var lock = this.add.text(0, 118, '🔒 ZAKLJUČANO', {
        fontFamily: UIKit.FONT, fontSize: '20px', color: '#cccccc', fontStyle: 'bold',
      });
      lock.setOrigin(0.5);
      container.add(lock);
    }

    return container;
  }
};
