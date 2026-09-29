const CACHE_NAME = 'vrbovec-bros-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './lib/phaser.min.js',
  './src/main.js',
  './src/systems/SaveManager.js',
  './src/systems/DataStore.js',
  './src/systems/InputManager.js',
  './src/objects/Landmarks.js',
  './src/objects/TileRenderer.js',
  './src/objects/Player.js',
  './src/objects/Enemy.js',
  './src/objects/Collectibles.js',
  './src/ui/UIKit.js',
  './src/ui/HUD.js',
  './src/ui/Background.js',
  './src/scenes/BootScene.js',
  './src/scenes/PreloadScene.js',
  './src/scenes/MainMenuScene.js',
  './src/scenes/CharacterSelectScene.js',
  './src/scenes/LevelSelectScene.js',
  './src/scenes/GameScene.js',
  './src/scenes/PauseScene.js',
  './src/scenes/GameOverScene.js',
  './src/scenes/LevelCompleteScene.js',
  './data/characters.json',
  './data/levels.json',
  './data/enemies.json',
  './data/items.json',
  './data/tilesets.json',
  './data/landmarks.json',
  './levels/vrbovec-centar.json',
  './assets/heads/head1.png',
  './assets/heads/head2.png',
  './assets/heads/head3.png',
  './assets/backgrounds/vrbovec-square.jpg',
  './assets/backgrounds/vrbovec-square-tile.jpg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
