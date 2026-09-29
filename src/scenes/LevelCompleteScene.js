window.LevelCompleteScene = class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super('LevelComplete');
  }

  init(data) {
    this.levelId = data.levelId;
    this.characterId = data.characterId;
    this.score = data.score || 0;
    this.coins = data.coins || 0;
    this.timeLeft = data.timeLeft || 0;
    this.lives = data.lives || 3;
    this.nextLevelId = data.nextLevelId || null;
    this.newRecord = !!data.newRecord;
  }

  create() {
    var w = this.scale.width;
    var h = this.scale.height;
    var self = this;

    this.add.image(w / 2, h / 2, 'bgVrbovec').setDisplaySize(w, h).setAlpha(0.45).setTint(0xaaccff).setDepth(-10);
    UIKit.scrim(this, 0.45);
    UIKit.panel(this, w / 2, h / 2, 620, 440);

    var levelCfg = DataStore.getLevelConfig(this.levelId);
    UIKit.title(this, w / 2, h / 2 - 160, 'LEVEL RIJEŠEN!', 50);
    UIKit.label(this, w / 2, h / 2 - 108, levelCfg ? levelCfg.name : this.levelId, 24, '#ffffff');

    UIKit.label(this, w / 2, h / 2 - 56, 'Novčići: ' + this.coins, 24, '#ffe45c');
    UIKit.label(this, w / 2, h / 2 - 20, 'Preostalo vrijeme: ' + this.timeLeft + ' (bonus ' + this.timeLeft * 10 + ')', 20, '#dff0ff');
    UIKit.label(this, w / 2, h / 2 + 18, 'UKUPNO: ' + this.score, 30, '#ffffff');

    if (this.newRecord) {
      UIKit.label(this, w / 2, h / 2 + 56, 'NOVI REKORD!', 22, '#3ad86b');
    }

    if (this.nextLevelId) {
      UIKit.button(this, w / 2, h / 2 + 116, 'SLJEDEĆI LEVEL', function () {
        self.scene.start('Game', { levelId: self.nextLevelId, characterId: self.characterId });
      }, { width: 340, height: 64, fontSize: 25 });
    } else {
      UIKit.button(this, w / 2, h / 2 + 116, 'ODABIR LEVELA', function () {
        self.scene.start('LevelSelect');
      }, { width: 340, height: 64, fontSize: 25 });
    }

    UIKit.button(this, w / 2, h - 60, 'GLAVNI IZBORNIK', function () {
      self.scene.start('MainMenu');
    }, { width: 280, height: 52, fontSize: 20, fill: 0x8fd0ff, fillDown: 0x6aaee0 });
  }
};
