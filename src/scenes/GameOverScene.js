window.GameOverScene = class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  init(data) {
    this.levelId = data.levelId;
    this.characterId = data.characterId;
    this.score = data.score || 0;
    this.coins = data.coins || 0;
  }

  create() {
    var w = this.scale.width;
    var h = this.scale.height;
    var self = this;

    this.add.image(w / 2, h / 2, 'bgVrbovec').setDisplaySize(w, h).setAlpha(0.35).setTint(0x8899cc).setDepth(-10);
    UIKit.scrim(this, 0.55);
    UIKit.panel(this, w / 2, h / 2, 560, 420);

    UIKit.title(this, w / 2, h / 2 - 150, 'KRAJ IGRE', 56);
    UIKit.label(this, w / 2, h / 2 - 76, 'Bodovi: ' + this.score + '   Novčići: ' + this.coins, 26, '#ffffff');

    var hs = SaveManager.getHighScore(this.levelId);
    if (hs) {
      UIKit.label(this, w / 2, h / 2 - 38, 'Rekord: ' + hs.score, 20, '#ffe45c');
    }

    UIKit.button(this, w / 2, h / 2 + 30, 'POKUŠAJ PONOVO', function () {
      self.scene.start('Game', { levelId: self.levelId, characterId: self.characterId });
    }, { width: 360, height: 66, fontSize: 26 });

    UIKit.button(this, w / 2, h / 2 + 116, 'ODABIR LEVELA', function () {
      self.scene.start('LevelSelect');
    }, { width: 360, height: 60, fontSize: 24, fill: 0x8fd0ff, fillDown: 0x6aaee0 });

    UIKit.button(this, w / 2, h - 60, 'GLAVNI IZBORNIK', function () {
      self.scene.start('MainMenu');
    }, { width: 280, height: 52, fontSize: 20, fill: 0xf08a7a, fillDown: 0xc46a5c });
  }
};
