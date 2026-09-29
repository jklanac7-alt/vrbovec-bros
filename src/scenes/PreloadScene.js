/* PreloadScene.js - loads every JSON config first, then loads the assets those
 * configs reference (character head images, level files, thumbnails). New
 * characters/levels added to /data are picked up automatically here.
 */
window.PreloadScene = class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    this.load.on('progress', function (value) {
      var el = document.getElementById('boot-bar-fill');
      if (el) el.style.width = Math.round(value * 70) + '%';
    });

    this.load.json('characters', 'data/characters.json');
    this.load.json('levels', 'data/levels.json');
    this.load.json('enemies', 'data/enemies.json');
    this.load.json('items', 'data/items.json');
    this.load.json('tilesets', 'data/tilesets.json');
    this.load.json('landmarks', 'data/landmarks.json');
    this.load.image('bgVrbovec', 'assets/backgrounds/vrbovec-square.jpg');
    // Mirrored copy of the same photo: it tiles seamlessly as a parallax layer.
    this.load.image('bgVrbovecTile', 'assets/backgrounds/vrbovec-square-tile.jpg');
  }

  create() {
    DataStore.characters = this.cache.json.get('characters');
    DataStore.levels = this.cache.json.get('levels');
    DataStore.enemies = this.cache.json.get('enemies');
    DataStore.items = this.cache.json.get('items');
    DataStore.tilesets = this.cache.json.get('tilesets');
    DataStore.landmarks = this.cache.json.get('landmarks');

    var self = this;
    var characters = DataStore.getCharacterList();
    var levels = DataStore.getLevelList();

    characters.forEach(function (c) {
      self.load.image('head_' + c.id, c.head);
    });
    levels.forEach(function (l) {
      self.load.json('level_' + l.id, l.file);
      if (l.thumbnail) self.load.image('thumb_' + l.id, l.thumbnail);
    });

    this.load.on('progress', function (value) {
      var el = document.getElementById('boot-bar-fill');
      if (el) el.style.width = Math.round(70 + value * 30) + '%';
    });

    this.load.once('complete', function () {
      levels.forEach(function (l) {
        DataStore.levelCache[l.id] = self.cache.json.get('level_' + l.id);
      });
      var overlay = document.getElementById('boot-loading');
      if (overlay) overlay.classList.add('hidden');
      self.scene.start('MainMenu');
    });

    this.load.start();
  }
};
