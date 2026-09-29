window.PauseScene = class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  init(data) {
    this.levelId = data.levelId;
    this.characterId = data.characterId;
  }

  create() {
    var w = this.scale.width;
    var h = this.scale.height;
    var self = this;

    UIKit.scrim(this, 0.62);
    UIKit.panel(this, w / 2, h / 2, 460, 400);
    UIKit.title(this, w / 2, h / 2 - 140, 'PAUZA', 48);

    UIKit.button(this, w / 2, h / 2 - 40, 'NASTAVI', function () { self.resumeGame(); },
      { width: 320, height: 62, fontSize: 24 });

    UIKit.button(this, w / 2, h / 2 + 40, 'IGRAJ PONOVO', function () {
      self.scene.stop();
      self.scene.stop('Game');
      self.scene.start('Game', { levelId: self.levelId, characterId: self.characterId });
    }, { width: 320, height: 62, fontSize: 24, fill: 0x8fd0ff, fillDown: 0x6aaee0 });

    UIKit.button(this, w / 2, h / 2 + 120, 'GLAVNI IZBORNIK', function () {
      self.scene.stop();
      self.scene.stop('Game');
      self.scene.start('MainMenu');
    }, { width: 320, height: 62, fontSize: 24, fill: 0xf08a7a, fillDown: 0xc46a5c });

    this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  resumeGame() {
    this.scene.stop();
    this.scene.resume('Game');
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keyP) || Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      this.resumeGame();
    }
  }
};
