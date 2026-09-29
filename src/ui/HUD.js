/* HUD.js - lives / score / coins / timer overlay, pinned to the camera. */
(function () {
  window.HUD = function (scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0);
    this.root.setScrollFactor(0);
    this.root.setDepth(100);

    var panel = scene.add.graphics();
    panel.fillStyle(0x1b2a4a, 0.55);
    panel.fillRoundedRect(14, 12, 470, 58, 12);
    panel.lineStyle(4, 0x1a1a1a, 0.9);
    panel.strokeRoundedRect(14, 12, 470, 58, 12);
    this.root.add(panel);

    var style = {
      fontFamily: UIKit.FONT,
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#1a1a1a',
      strokeThickness: 4,
    };

    this.livesText = scene.add.text(32, 28, '', style);
    this.coinsText = scene.add.text(170, 28, '', style);
    this.scoreText = scene.add.text(300, 28, '', style);
    this.timeText = scene.add.text(scene.scale.width - 32, 28, '', style);
    this.timeText.setOrigin(1, 0);

    this.root.add(this.livesText);
    this.root.add(this.coinsText);
    this.root.add(this.scoreText);

    var timePanel = scene.add.graphics();
    timePanel.fillStyle(0x1b2a4a, 0.55);
    timePanel.fillRoundedRect(scene.scale.width - 190, 12, 176, 58, 12);
    timePanel.lineStyle(4, 0x1a1a1a, 0.9);
    timePanel.strokeRoundedRect(scene.scale.width - 190, 12, 176, 58, 12);
    this.root.add(timePanel);
    this.root.add(this.timeText);

    this.checkpointText = scene.add.text(scene.scale.width / 2, 120, '', {
      fontFamily: UIKit.FONT,
      fontSize: '30px',
      color: '#ffe45c',
      fontStyle: 'bold',
      stroke: '#1a1a1a',
      strokeThickness: 6,
    });
    this.checkpointText.setOrigin(0.5);
    this.checkpointText.setAlpha(0);
    this.root.add(this.checkpointText);
  };

  window.HUD.prototype.update = function (s) {
    this.livesText.setText('x ' + s.lives + '  ♥');
    this.coinsText.setText('● ' + s.coins);
    this.scoreText.setText('BODOVI ' + s.score);
    var t = Math.max(0, Math.ceil(s.timeLeft));
    this.timeText.setText('VRIJEME ' + t);
    this.timeText.setColor(t <= 20 ? '#ff6b5c' : '#ffffff');
  };

  window.HUD.prototype.flash = function (message) {
    var self = this;
    this.checkpointText.setText(message);
    this.checkpointText.setAlpha(1);
    this.scene.tweens.add({
      targets: this.checkpointText,
      alpha: 0,
      delay: 900,
      duration: 500,
      onComplete: function () { self.checkpointText.setText(''); },
    });
  };

  window.HUD.prototype.destroy = function () {
    this.root.destroy(true);
  };
})();
