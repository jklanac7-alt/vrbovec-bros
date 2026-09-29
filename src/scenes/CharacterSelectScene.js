/* CharacterSelectScene.js - builds itself entirely from data/characters.json,
 * so dropping a new character into that file makes it appear here.
 */
window.CharacterSelectScene = class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelect');
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

    UIKit.title(this, w / 2, 76, 'ODABERI LIKA', 48);

    var characters = DataStore.getCharacterList();
    this.selectedId = DataStore.getDefaultCharacterId();
    this.cards = [];

    var gap = 30;
    var cardW = Math.min(300, Math.floor((w - 120 - gap * (characters.length - 1)) / characters.length));
    var totalW = characters.length * cardW + (characters.length - 1) * gap;
    var startX = w / 2 - totalW / 2 + cardW / 2;

    characters.forEach(function (charData, i) {
      var cx = startX + i * (cardW + gap);
      var cy = 352;
      var card = self.buildCard(charData, cx, cy, cardW);
      self.cards.push(card);
    });

    this.refreshCards();

    UIKit.button(this, w / 2, h - 74, 'POTVRDI I DALJE', function () {
      SaveManager.setSelectedCharacter(self.selectedId);
      self.scene.start('LevelSelect');
    }, { width: 340, height: 68, fontSize: 26 });

    UIKit.button(this, 140, h - 60, 'NATRAG', function () {
      self.scene.start('MainMenu');
    }, { width: 200, height: 52, fontSize: 20, fill: 0x8fd0ff, fillDown: 0x6aaee0 });
  }

  buildCard(charData, cx, cy, cardW) {
    var self = this;
    var cardH = 460;
    var container = this.add.container(cx, cy);

    var bg = this.add.graphics();
    container.add(bg);

    var headKey = 'headCircle_' + charData.id;
    Player.makeHeadTexture(this, 'head_' + charData.id, headKey, 128);
    var head = this.add.image(0, -152, headKey);
    head.setDisplaySize(118, 118);
    container.add(head);

    var name = this.add.text(0, -76, charData.name, {
      fontFamily: UIKit.FONT, fontSize: '28px', color: '#ffffff',
      fontStyle: 'bold', stroke: '#1a1a1a', strokeThickness: 5,
    });
    name.setOrigin(0.5);
    container.add(name);

    var stats = charData.stats;
    var meta = this.add.text(0, -36,
      'Brzina ' + stats.walkSpeed + '  •  Trk ' + stats.runSpeed + '\nSkok ' + stats.jumpVelocity, {
        fontFamily: UIKit.FONT, fontSize: '16px', color: '#dff0ff', align: 'center',
      });
    meta.setOrigin(0.5);
    container.add(meta);

    var abilityCfg = charData.ability || {};
    var abilityLabel = abilityCfg.label || 'Bez posebne moći';
    var ability = this.add.text(0, 24, abilityLabel, {
      fontFamily: UIKit.FONT, fontSize: '18px', color: '#ffe45c',
      fontStyle: 'bold', align: 'center', wordWrap: { width: cardW - 36 },
    });
    ability.setOrigin(0.5);
    container.add(ability);

    if (abilityCfg.hint) {
      var hint = this.add.text(0, 60, abilityCfg.hint, {
        fontFamily: UIKit.FONT, fontSize: '13px', color: '#a9c6e8',
        align: 'center', wordWrap: { width: cardW - 36 },
      });
      hint.setOrigin(0.5);
      container.add(hint);
    }

    if (charData.description) {
      var desc = this.add.text(0, 148, charData.description, {
        fontFamily: UIKit.FONT, fontSize: '14px', color: '#e6eef8',
        align: 'center', lineSpacing: 3, wordWrap: { width: cardW - 34 },
      });
      desc.setOrigin(0.5);
      container.add(desc);
    }

    container.setSize(cardW, cardH);
    container.setInteractive(new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH), Phaser.Geom.Rectangle.Contains);
    container.on('pointerup', function () {
      self.selectedId = charData.id;
      SaveManager.setSelectedCharacter(charData.id);
      self.refreshCards();
    });

    container.paint = function (selected) {
      bg.clear();
      bg.fillStyle(selected ? 0x2c5ca8 : 0x1b2a4a, 0.9);
      bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
      bg.lineStyle(selected ? 7 : 5, selected ? 0xffe45c : 0x1a1a1a, 1);
      bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    };
    container.charId = charData.id;
    return container;
  }

  refreshCards() {
    var self = this;
    this.cards.forEach(function (card) {
      card.paint(card.charId === self.selectedId);
      card.setScale(card.charId === self.selectedId ? 1.04 : 1);
    });
  }
};
