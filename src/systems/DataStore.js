/* DataStore.js - in-memory registry of every JSON config the game loaded.
 * Everything that is content (characters, levels, enemies, items, tiles,
 * landmarks) lives in /data or /levels and is read through here, so adding
 * content never requires touching game code.
 */
(function () {
  window.DataStore = {
    characters: null,
    levels: null,
    enemies: null,
    items: null,
    tilesets: null,
    landmarks: null,
    levelCache: {},

    getCharacter: function (id) {
      if (!this.characters) return null;
      var list = this.characters.characters;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) return list[i];
      }
      return null;
    },

    getCharacterList: function () {
      return (this.characters && this.characters.characters) || [];
    },

    getLevelList: function () {
      var list = (this.levels && this.levels.levels) || [];
      return list.slice().sort(function (a, b) { return a.unlockOrder - b.unlockOrder; });
    },

    getLevelConfig: function (id) {
      var list = this.getLevelList();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) return list[i];
      }
      return null;
    },

    getLevelData: function (id) {
      return this.levelCache[id] || null;
    },

    getDefaultCharacterId: function () {
      var saved = SaveManager.getSelectedCharacter();
      if (saved && this.getCharacter(saved)) return saved;
      var list = this.getCharacterList();
      return list.length ? list[0].id : null;
    },
  };
})();
