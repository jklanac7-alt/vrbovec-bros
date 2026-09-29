/* SaveManager.js - progress persistence in localStorage.
 * Stores: selected character, unlocked levels, per-level high scores.
 */
(function () {
  var KEY = 'vrbovecBrosSave_v1';

  function defaultSave() {
    return {
      selectedCharacter: null,
      unlockedLevels: [],
      highScores: {},
      lives: 3,
    };
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return defaultSave();
      var parsed = JSON.parse(raw);
      var base = defaultSave();
      for (var k in base) {
        if (Object.prototype.hasOwnProperty.call(parsed, k)) base[k] = parsed[k];
      }
      return base;
    } catch (e) {
      return defaultSave();
    }
  }

  var state = load();

  function persist() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) { /* storage unavailable (private mode) - game still runs */ }
  }

  window.SaveManager = {
    get: function () { return state; },

    getSelectedCharacter: function () { return state.selectedCharacter; },

    setSelectedCharacter: function (id) {
      state.selectedCharacter = id;
      persist();
    },

    /* The first level (lowest unlockOrder) is always unlocked. */
    isUnlocked: function (levelCfg) {
      if (!levelCfg) return false;
      if (levelCfg.unlockOrder <= 1) return true;
      return state.unlockedLevels.indexOf(levelCfg.id) !== -1;
    },

    unlockLevel: function (levelId) {
      if (levelId && state.unlockedLevels.indexOf(levelId) === -1) {
        state.unlockedLevels.push(levelId);
        persist();
      }
    },

    unlockNextAfter: function (levelCfg, allLevels) {
      var next = null;
      for (var i = 0; i < allLevels.length; i++) {
        var l = allLevels[i];
        if (l.unlockOrder === levelCfg.unlockOrder + 1) next = l;
      }
      if (next) this.unlockLevel(next.id);
      return next;
    },

    getHighScore: function (levelId) { return state.highScores[levelId] || null; },

    recordResult: function (levelId, result) {
      var cur = state.highScores[levelId];
      if (!cur || result.score > cur.score) {
        state.highScores[levelId] = {
          score: result.score,
          coins: result.coins,
          timeLeft: result.timeLeft,
        };
        persist();
      }
    },

    resetProgress: function () {
      state = defaultSave();
      persist();
    },
  };
})();
