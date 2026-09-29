/* main.js - Phaser bootstrap. Logical resolution is a fixed 1280x720 that is
 * scaled to fit any screen (landscape phones, tablets, desktop).
 */
(function () {
  var config = {
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: '#62a8ff',
    pixelArt: false,
    roundPixels: true,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 1400 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720,
    },
    render: {
      antialias: true,
      powerPreference: 'high-performance',
    },
    fps: {
      target: 60,
      min: 30,
    },
    scene: [
      BootScene,
      PreloadScene,
      MainMenuScene,
      CharacterSelectScene,
      LevelSelectScene,
      GameScene,
      PauseScene,
      GameOverScene,
      LevelCompleteScene,
    ],
  };

  window.game = new Phaser.Game(config);
})();
