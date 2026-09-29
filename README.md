# Vrbovec Bros

2D side-scrolling platformer u stilu klasičnog Super Marija, smješten u Vrbovcu.
Trčiš, skačeš, gaziš neprijatelje, skupljaš novčiće i stigneš do zastave na kraju levela.
Radi u pregledniku na mobitelu i na računalu, instalira se kao PWA i radi offline.

Tehnologija: HTML5 Canvas + Phaser 3 (lokalna kopija, bez CDN-a), čisti JavaScript,
bez backenda i bez build koraka — samo statične datoteke.

---

## Pokretanje

Igra mora ići preko HTTP-a (ne `file://`), jer učitava JSON konfiguracije.

**Windows, bez ikakvih instalacija:**

```powershell
powershell -ExecutionPolicy Bypass -File devtools\serve.ps1
# pa otvori http://localhost:8123/
```

**Bilo koji drugi statični server radi jednako dobro** (`npx serve`, `python -m http.server`, Live Server u VS Codeu…).

**Deploy:** cijeli folder je statičan — prebaci ga na Netlify, Vercel, GitHub Pages
ili vlastiti server. Ništa se ne kompajlira.

---

## Kontrole

| Radnja | Tipkovnica | Mobitel |
|---|---|---|
| Kretanje | ← → ili A / D | tipke ◀ ▶ dolje lijevo |
| Skok | Space, W ili ↑ | velika tipka dolje desno |
| Trčanje | Shift (drži) | tipka ⚡ dolje desno |
| Pauza | P ili Esc | tipka II gore desno |

U portretnom načinu na mobitelu prikazuje se poruka da se uređaj okrene.

---

## Struktura projekta

```
index.html              ulazna točka, učitava sve skripte redom
manifest.json           PWA manifest
service-worker.js       offline cache (popis datoteka za cache)
lib/phaser.min.js       Phaser 3.80 (lokalno, radi offline)

data/                   SVE konfiguracije sadržaja (JSON)
  characters.json       likovi koji se nude na ekranu odabira
  levels.json           popis levela i redoslijed otključavanja
  enemies.json          tipovi neprijatelja
  items.json            novčić, gljiva, extra život
  tilesets.json         boje tla / platformi / stupova
  landmarks.json        vrbovečke znamenitosti (dimenzije, boje, kolizija)

levels/
  vrbovec-centar.json   kompletan level (geometrija, neprijatelji, novčići…)

assets/
  heads/                izrezane glave likova (kvadratne slike)
  backgrounds/          fotografija Vrbovca (pozadina + thumbnail)
  icons/                PWA ikone

src/
  main.js               Phaser konfiguracija i popis scena
  systems/
    DataStore.js        registar svih učitanih JSON konfiguracija
    SaveManager.js      spremanje napretka u localStorage
    InputManager.js     tipkovnica + touch tipke + rotate-overlay
  objects/
    Player.js           igrač (fizika, stanja, crtanje tijela)
    Enemy.js            neprijatelji i njihova ponašanja
    Collectibles.js     novčići i power-upovi
    TileRenderer.js     crtanje tla/platformi/stupova + kolizijska tijela
    Landmarks.js        crtanje 5 vrbovečkih građevina
  ui/
    UIKit.js            gumbi, paneli, naslovi
    HUD.js              životi / novčići / bodovi / vrijeme
    Background.js       parallax slojevi (nebo, fotka, brda, oblaci, drveće)
  scenes/
    BootScene, PreloadScene, MainMenuScene, CharacterSelectScene,
    LevelSelectScene, GameScene, PauseScene, GameOverScene, LevelCompleteScene

devtools/               alati za razvoj (ne ulaze u igru)
  serve.ps1             lokalni server
  selftest.html         automatska provjera igre
  run-selftest.ps1      pokreće provjeru u headless Chromeu
  screenshot.html       stranica koja renderira jedan ekran igre
  snap.ps1              spremi sliku tog ekrana u PNG
```

---

## Kako dodati NOVOG LIKA

Za novog lika **ne treba se dirati kod** — dovoljna je slika glave i unos u JSON.

1. **Pripremi sliku glave.** Kvadratna slika (npr. 512×512 px), lice otprilike
   u sredini. Igra sama izrezuje krug i dodaje crni obrub, pa pozadina oko lica
   nije problem. Spremi je u `assets/heads/`, npr. `assets/heads/head4.png`.

2. **Dodaj unos u `data/characters.json`**, u polje `characters`:

```json
{
  "id": "ana",
  "name": "Ana",
  "head": "assets/heads/head4.png",
  "description": "Kratki opis koji se vidi na kartici lika.",
  "colors": {
    "shirt": "#b23ad8", "shirtShade": "#7a2394",
    "pants": "#2b2b2b", "pantsShade": "#161616",
    "shoe": "#4a2f1f"
  },
  "stats": {
    "walkSpeed": 205,
    "runSpeed": 340,
    "jumpVelocity": 630,
    "airControl": 0.85
  },
  "ability": {
    "type": "doubleJump",
    "value": 1,
    "label": "Dvostruki skok",
    "hint": "U zraku pritisni skok još jednom"
  }
}
```

3. **Gotovo.** Lik se automatski pojavi na ekranu odabira.

**Značenje polja:**

- `walkSpeed` / `runSpeed` — px/s pri hodanju i trčanju (Shift).
- `jumpVelocity` — početna brzina skoka. Visina skoka = `jumpVelocity² / (2 × gravity)`;
  uz standardnu gravitaciju 1400 to je npr. 620 → ~137 px. **Ne idi ispod ~590**,
  jer level `vrbovec-centar` očekuje skok od barem ~129 px.
- `airControl` — 0–1, koliko se lik može zaustavljati/ubrzavati u zraku.
- `description` — tekst na kartici u odabiru lika (prelama se sam).
- `ability.label` / `ability.hint` — naziv moći i kratka uputa na kartici.
- `ability.type` — jedna od:

| tip | što radi | `value` |
|---|---|---|
| `none` | bez posebne moći | — |
| `doubleJump` | drugi skok u zraku | — |
| `speedBoost` | trajno brži | množitelj, npr. `1.15` |
| `teleport` | u zraku skok = bljesak naprijed (samo na slobodno mjesto) | domet u px, npr. `210` |
| `magnet` | novčići u blizini sami dolete do lika | radijus u px, npr. `230` |

Trenutna postava: **Lisica** (teleportacija), **Dve kune** (magnet za kune),
**Faš** (bez moći, ali najbrži).

> **Zašto nema sprite sheetova?** Likovi su stvarne fotografije glava na
> proceduralno nacrtanom pixel-art tijelu. Tijelo se crta kodom i mijenja pozu
> po stanju (`idle`, `run`, `jump`, `fall`, `hit`, `win`), pa za novog lika
> treba samo slika glave i paleta boja — nitko ne mora crtati animacije.

---

## Kako dodati NOVI LEVEL

1. **Napravi datoteku** `levels/moj-level.json` (najlakše: kopiraj
   `levels/vrbovec-centar.json` i mijenjaj brojeve).

2. **Registriraj ga u `data/levels.json`:**

```json
{
  "id": "moj-level",
  "name": "Moj Level",
  "file": "levels/moj-level.json",
  "thumbnail": "assets/backgrounds/vrbovec-square.jpg",
  "background": "vrbovec_day",
  "music": null,
  "unlockOrder": 2,
  "parTime": 150
}
```

`unlockOrder: 1` je uvijek otključan; svaki sljedeći se otključa kad igrač
završi level s prethodnim brojem.

3. **Dodaj nove datoteke u `service-worker.js`** (polje `CORE_ASSETS`) da bi
   radile i offline, i podigni `CACHE_NAME` na npr. `vrbovec-bros-v2`.

### Format level datoteke

Koordinate su u pikselima. Ishodište je gore-lijevo, `y` raste prema dolje.
Visina ekrana je 720 px, površina tla je obično `y = 656`.

```jsonc
{
  "width": 6400,            // ukupna širina levela
  "height": 720,            // visina (= visina ekrana)
  "gravity": 1400,
  "timeLimit": 200,         // sekunde
  "background": "vrbovec_day",
  "playerStart": { "x": 120, "y": 560 },

  "checkpoints": [ { "x": 3060, "y": 656 } ],

  // tlo: sve između dva segmenta je rupa u koju se pada
  "ground":    [ { "x": 0, "y": 656, "width": 1600, "height": 64, "type": "grass" } ],

  "platforms": [ { "x": 620, "y": 550, "width": 192, "height": 32, "type": "brick" } ],
  "columns":   [ { "x": 1300, "y": 546, "width": 80, "height": 110, "type": "stoneColumn" } ],

  // udara se odozdo; item: "coin" | "mushroom" | "extraLife"
  "questionBlocks": [ { "x": 480, "y": 486, "item": "coin" } ],

  "coins":   [ { "x": 300, "y": 600 } ],

  // type mora postojati u data/enemies.json; range = polovica šetnje
  "enemies": [ { "type": "patroller", "x": 900, "y": 600, "range": 180 } ],

  // znamenitosti kao kulise; x je mjesto gdje ih igrač vidi ispred sebe
  "landmarks": [
    { "type": "kula", "x": 2050, "y": 620, "scale": 0.8, "scrollFactor": 0.6, "solid": false }
  ],

  "flag": { "x": 6280, "y": 656, "height": 320 }
}
```

### Pravila da level ostane prohodan

Provjerava ih i automatski test (`devtools/selftest.html`), ali dobro je znati:

- **Rupe** ne šire od ~170 px (najslabiji lik doskače ~180 px hodanjem).
- **Platforme** ne više od ~110 px iznad površine s koje se skače.
- **Upitnik-blokovi** postavi ~170 px iznad tla ispod njih (npr. tlo 656 → blok 486).
  Preblizu tlu → igrač se zaglavi u njih; previsoko → ne može ih udariti.
- **Neprijatelji** moraju cijelim rasponom (`x ± range`) biti iznad tla, inače padnu u rupu.

### Znamenitosti (`landmarks`)

Raspoloživi tipovi (definirani u `data/landmarks.json`): `kula` (Kula Petra
Zrinskog), `crkva` (Crkva sv. Vida), `dvorac` (Dvorac Patačić), `lovrecina`
(Lovrečina Grad), `mauzolej` (De Piennes mauzolej).

- `scrollFactor` < 1 znači da su u daljini i sporije se pomiču (parallax).
  Igra sama preračuna poziciju tako da se pojave kad igrač dođe do zadanog `x`.
- `solid: true` uključuje koliziju iz `data/landmarks.json` (građevina postaje
  platforma). To radi **samo uz `scrollFactor: 1`** — inače bi se nevidljiva
  kolizija i slika razišle. U isporučenom levelu su sve kulise (`solid: false`).

---

## Automatska provjera (self-test)

U projektu je regresijski test koji stvarno pokrene igru, odsimulira potez po
potez i provjeri 46 stvari: učitavanje JSON-a, geometriju levela (rupe, dohvatljivost
platformi, visine blokova, neprijatelje nad rupama), gravitaciju, hodanje,
trčanje, visinu skoka, novčiće, upitnik-blokove, gljivu, gaženje neprijatelja,
gubitak power-upa, kontrolne točke, smrt u rupi, respawn, pauzu, cilj, kraj igre,
posebne moći (teleportacija, magnet) te stvaranje i uklanjanje touch tipki na mobitelu.

```powershell
# terminal 1
powershell -ExecutionPolicy Bypass -File devtools\serve.ps1
# terminal 2
powershell -ExecutionPolicy Bypass -File devtools\run-selftest.ps1
```

Ispisuje `PASS`/`FAIL` po provjeri i vraća izlazni kod ≠ 0 ako nešto padne,
pa se može staviti i u CI. Test se može otvoriti i ručno u pregledniku:
`http://localhost:8123/devtools/selftest.html`.

Slika bilo kojeg ekrana (korisno za brzu vizualnu provjeru):

```powershell
powershell -ExecutionPolicy Bypass -File devtools\snap.ps1 -Shot game -X 2100
# ekrani: menu, chars, levels, game, pause, complete
```

---

## Bodovanje

| Akcija | Bodovi |
|---|---|
| Novčić | 10 |
| Gaženje neprijatelja | 100 / 150 / 200 (ovisno o tipu) |
| Gljiva | 200 |
| Kontrolna točka | 100 |
| Preostalo vrijeme na cilju | × 10 |

Napredak (otključani leveli, rekordi, odabrani lik) čuva se u `localStorage`
pod ključem `vrbovecBrosSave_v1`. Gumb "OBRIŠI NAPREDAK" u glavnom izborniku ga briše.

---

## Poznata ograničenja

- Nema zvuka ni glazbe (`music` polje u `levels.json` postoji, ali audio datoteke
  nisu isporučene).
- Isporučen je jedan kompletan level (`Vrbovec Centar`) kao primjer.
- Znamenitosti se koriste kao kulise; kolizija za njih postoji u podacima,
  ali se u ovom levelu ne koristi (vidi gore).
