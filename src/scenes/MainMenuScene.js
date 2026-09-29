window.MainMenuScene = class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    var w = this.scale.width;
    var h = this.scale.height;
    var self = this;

    this.add.image(w / 2, h / 2, 'bgVrbovec')
      .setDisplaySize(w, h)
      .setAlpha(0.55)
      .setTint(0x99bbff)
      .setDepth(-10);

    var sky = this.add.graphics();
    sky.fillStyle(0x1b2a4a, 0.35);
    sky.fillRect(0, 0, w, h);
    sky.setDepth(-9);

    UIKit.title(this, w / 2, 120, 'VRBOVEC BROS', 72);
    UIKit.label(this, w / 2, 182, 'Platformer po vrbovečkim znamenitostima', 22, '#ffffff');

    UIKit.button(this, w / 2, 300, 'IGRAJ', function () {
      self.scene.start('CharacterSelect');
    }, { width: 340, height: 76, fontSize: 30 });

    UIKit.button(this, w / 2, 396, 'ODABIR LIKA', function () {
      self.scene.start('CharacterSelect');
    }, { width: 340, height: 64, fill: 0x8fd0ff, fillDown: 0x6aaee0 });

    UIKit.button(this, w / 2, 478, 'ODABIR LEVELA', function () {
      self.scene.start('LevelSelect');
    }, { width: 340, height: 64, fill: 0x8fd0ff, fillDown: 0x6aaee0 });

    UIKit.button(this, w / 2, 566, 'OBRIŠI NAPREDAK', function () {
      SaveManager.resetProgress();
      self.scene.restart();
    }, { width: 280, height: 52, fontSize: 20, fill: 0xf08a7a, fillDown: 0xc46a5c });

    UIKit.label(this, w / 2, h - 40,
      'Tipkovnica: ←/→ ili A/D  •  Space/W skok  •  Shift trčanje  •  P/Esc pauza', 18, '#e8f2ff');
  }
};
