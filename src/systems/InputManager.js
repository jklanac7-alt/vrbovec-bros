// InputManager.js
// Self-contained input handling for a Phaser 3 (global, non-module) side-scrolling platformer.
// Handles: desktop keyboard, on-screen touch controls (per-scene), and a page-level
// orientation-lock overlay (persistent singleton, independent of scene lifecycle).
//
// Usage:
//   const input = new InputManager(scene);
//   input.create();
//   // in update():
//   const state = input.getState();
//   // on scene shutdown:
//   input.destroy();

(function () {
  'use strict';

  var STYLE_ID = 'input-manager-styles';
  var OVERLAY_ID = 'orientation-overlay';
  var TOUCH_ROOT_ID = 'touch-controls-root';

  function hasTouchSupport() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
  }

  function injectStylesOnce() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#' + TOUCH_ROOT_ID + ' {',
      '  position: fixed;',
      '  inset: 0;',
      '  z-index: 500;',
      '  pointer-events: none;',
      '  touch-action: none;',
      '  user-select: none;',
      '  -webkit-user-select: none;',
      '}',
      '.im-btn {',
      '  position: absolute;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  border-radius: 50%;',
      '  background: rgba(255, 255, 255, 0.18);',
      '  border: 2px solid rgba(255, 255, 255, 0.45);',
      '  color: rgba(255, 255, 255, 0.9);',
      '  font-family: sans-serif;',
      '  font-weight: bold;',
      '  -webkit-user-select: none;',
      '  user-select: none;',
      '  touch-action: none;',
      '  pointer-events: auto;',
      '  -webkit-tap-highlight-color: transparent;',
      '}',
      '.im-btn:active, .im-btn.im-active {',
      '  background: rgba(255, 255, 255, 0.38);',
      '}',
      '.im-btn-left, .im-btn-right {',
      '  width: 72px;',
      '  height: 72px;',
      '  font-size: 30px;',
      '  bottom: calc(24px + env(safe-area-inset-bottom, 0px));',
      '}',
      '.im-btn-left { left: calc(20px + env(safe-area-inset-left, 0px)); }',
      '.im-btn-right { left: calc(104px + env(safe-area-inset-left, 0px)); }',
      '.im-btn-jump {',
      '  width: 80px;',
      '  height: 80px;',
      '  font-size: 30px;',
      '  right: calc(24px + env(safe-area-inset-right, 0px));',
      '  bottom: calc(24px + env(safe-area-inset-bottom, 0px));',
      '}',
      '.im-btn-run {',
      '  width: 60px;',
      '  height: 60px;',
      '  font-size: 18px;',
      '  right: calc(112px + env(safe-area-inset-right, 0px));',
      '  bottom: calc(40px + env(safe-area-inset-bottom, 0px));',
      '}',
      '.im-btn-pause {',
      '  width: 48px;',
      '  height: 48px;',
      '  font-size: 20px;',
      '  border-radius: 10px;',
      '  right: calc(16px + env(safe-area-inset-right, 0px));',
      '  top: calc(16px + env(safe-area-inset-top, 0px));',
      '}',
      '#' + OVERLAY_ID + ' {',
      '  position: fixed;',
      '  inset: 0;',
      '  z-index: 9999;',
      '  background: #000;',
      '  color: #fff;',
      '  display: none;',
      '  flex-direction: column;',
      '  align-items: center;',
      '  justify-content: center;',
      '  text-align: center;',
      '  font-family: sans-serif;',
      '  padding: 24px;',
      '  touch-action: none;',
      '  pointer-events: auto;',
      '}',
      '#' + OVERLAY_ID + '.im-visible { display: flex; }',
      '#' + OVERLAY_ID + ' .im-rotate-icon {',
      '  font-size: 48px;',
      '  margin-bottom: 16px;',
      '  animation: im-rotate-spin 1.8s ease-in-out infinite;',
      '}',
      '#' + OVERLAY_ID + ' .im-line-primary {',
      '  font-size: 22px;',
      '  font-weight: bold;',
      '  margin: 4px 0;',
      '}',
      '#' + OVERLAY_ID + ' .im-line-secondary {',
      '  font-size: 14px;',
      '  opacity: 0.7;',
      '  margin: 4px 0;',
      '}',
      '@keyframes im-rotate-spin {',
      '  0%, 100% { transform: rotate(0deg); }',
      '  50% { transform: rotate(90deg); }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // Orientation overlay is a page-level singleton: created once and reused across scenes/instances
  // so it never flickers on scene transitions. Each InputManager instance just wires listeners to it.
  function ensureOrientationOverlay() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.innerHTML =
      '<div class="im-rotate-icon">&#8635;</div>' +
      '<div class="im-line-primary">Okreni uređaj</div>' +
      '<div class="im-line-secondary">Rotate your device</div>';

    var container = document.getElementById('game-container') || document.body;
    container.appendChild(overlay);
    return overlay;
  }

  function isPortrait() {
    return window.innerHeight > window.innerWidth;
  }

  function updateOrientationOverlayVisibility() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    var shouldShow = hasTouchSupport() && isPortrait();
    if (shouldShow) {
      overlay.classList.add('im-visible');
    } else {
      overlay.classList.remove('im-visible');
    }
  }

  window.InputManager = class InputManager {
    /**
     * @param {Phaser.Scene} scene - the active scene (needs scene.input.keyboard)
     */
    constructor(scene) {
      this.scene = scene;

      // Keyboard key objects
      this._cursors = null;
      this._keyA = null;
      this._keyD = null;
      this._keyW = null;
      this._keySpace = null;
      this._keyShiftL = null; // Phaser's SHIFT keycode fires for either physical shift key
      this._keyP = null;
      this._keyEsc = null;

      // Touch button held state
      this._touch = {
        left: false,
        right: false,
        run: false,
        jump: false,
        jumpPressedFlag: false, // set true on press, consumed on next getState()
        pausePressedFlag: false // set true on tap, consumed on next getState()
      };

      // Edge-detection memory
      this._prevJumpDown = false;
      this._prevTouchPause = false;

      this._domRoot = null;
      this._pointerHandlers = []; // {el, type, fn} for cleanup
      this._orientationHandlerBound = null;

      this._destroyed = false;
    }

    create() {
      injectStylesOnce();

      var keyboard = this.scene && this.scene.input && this.scene.input.keyboard;
      if (keyboard) {
        this._cursors = keyboard.createCursorKeys();
        this._keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this._keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this._keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this._keySpace = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this._keyShiftL = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this._keyP = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this._keyEsc = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      }

      // Orientation overlay: page-level singleton, and so are its listeners.
      // They used to be registered per InputManager, but addEventListener
      // de-duplicates identical (type, listener) pairs, so every instance
      // shared ONE registration and the first destroy() removed it for all of
      // them. After that nothing listened for rotation any more: a player who
      // died in portrait was left staring at an un-dismissable "rotate your
      // device" overlay with no way out but reloading the page.
      ensureOrientationOverlay();
      if (!window.__vbOrientationBound) {
        window.__vbOrientationBound = true;
        window.addEventListener('resize', updateOrientationOverlayVisibility);
        window.addEventListener('orientationchange', updateOrientationOverlayVisibility);
      }
      updateOrientationOverlayVisibility();

      // Touch controls: created per-scene (destroyed in destroy()), only injected on touch devices.
      if (hasTouchSupport()) {
        this._createTouchControls();
      }

      return this;
    }

    _createTouchControls() {
      var container = document.getElementById('game-container') || document.body;

      // Remove any stale root left by a previous instance that failed to clean up.
      var stale = document.getElementById(TOUCH_ROOT_ID);
      if (stale && stale.parentNode) stale.parentNode.removeChild(stale);

      var root = document.createElement('div');
      root.id = TOUCH_ROOT_ID;

      var btnLeft = this._makeButton('im-btn im-btn-left', '&#9664;');
      var btnRight = this._makeButton('im-btn im-btn-right', '&#9654;');
      var btnJump = this._makeButton('im-btn im-btn-jump', 'A');
      var btnRun = this._makeButton('im-btn im-btn-run', '&#9889;');
      var btnPause = this._makeButton('im-btn im-btn-pause', 'II');

      root.appendChild(btnLeft);
      root.appendChild(btnRight);
      root.appendChild(btnJump);
      root.appendChild(btnRun);
      root.appendChild(btnPause);
      container.appendChild(root);
      this._domRoot = root;

      var self = this;

      this._bindHold(btnLeft, function (v) { self._touch.left = v; });
      this._bindHold(btnRight, function (v) { self._touch.right = v; });
      this._bindHold(btnRun, function (v) { self._touch.run = v; });
      // Jump latches on press. Sampling the held flag once per frame lost any
      // tap that started and ended between two getState() calls, which on a
      // dropped frame silently ate the jump.
      this._bindHold(btnJump, function (v) {
        if (v && !self._touch.jump) self._touch.jumpPressedFlag = true;
        self._touch.jump = v;
      });

      // Pause is a tap (edge-triggered), not a hold.
      this._bindTap(btnPause, function () {
        self._touch.pausePressedFlag = true;
      });
    }

    _makeButton(className, html) {
      var el = document.createElement('div');
      el.className = className;
      el.innerHTML = html;
      return el;
    }

    _addPointerListener(el, type, fn) {
      var opts = { passive: false };
      el.addEventListener(type, fn, opts);
      this._pointerHandlers.push({ el: el, type: type, fn: fn });
    }

    _bindHold(el, setter) {
      var down = function (e) {
        e.preventDefault();
        el.classList.add('im-active');
        setter(true);
      };
      var up = function (e) {
        if (e) e.preventDefault();
        el.classList.remove('im-active');
        setter(false);
      };
      this._addPointerListener(el, 'pointerdown', down);
      this._addPointerListener(el, 'pointerup', up);
      this._addPointerListener(el, 'pointercancel', up);
      this._addPointerListener(el, 'pointerleave', up);
      // touch fallbacks in case pointer events are unavailable in some webview
      this._addPointerListener(el, 'touchstart', down);
      this._addPointerListener(el, 'touchend', up);
      this._addPointerListener(el, 'touchcancel', up);
    }

    _bindTap(el, onTap) {
      // pointerup and touchend both fire for a single touch on devices that
      // support Pointer Events, so the tap is de-duplicated by timestamp
      // rather than delivered twice.
      var lastTap = 0;
      var down = function (e) {
        e.preventDefault();
        el.classList.add('im-active');
      };
      var up = function (e) {
        e.preventDefault();
        el.classList.remove('im-active');
        var now = (e && e.timeStamp) || Date.now();
        if (now - lastTap < 60) return;
        lastTap = now;
        onTap();
      };
      this._addPointerListener(el, 'pointerdown', down);
      this._addPointerListener(el, 'pointerup', up);
      this._addPointerListener(el, 'touchstart', down);
      this._addPointerListener(el, 'touchend', up);
    }

    /**
     * Safe to call from any scene (menu/UI included) - never throws even without
     * gamepad-relevant context. Returns the current frame's input state.
     */
    getState() {
      var left = false;
      var right = false;
      var run = false;
      var jumpDown = false;
      var jumpJustDown = false;
      var pauseJustDown = false;

      if (this._cursors) {
        left = this._cursors.left.isDown;
        right = this._cursors.right.isDown;
        jumpDown = this._cursors.up.isDown;
      }
      if (this._keyA && this._keyA.isDown) left = true;
      if (this._keyD && this._keyD.isDown) right = true;
      if (this._keyW && this._keyW.isDown) jumpDown = true;
      if (this._keySpace && this._keySpace.isDown) jumpDown = true;
      if (this._keyShiftL && this._keyShiftL.isDown) run = true;

      // Keyboard edge detection for jump
      if (this._keySpace && Phaser.Input.Keyboard.JustDown(this._keySpace)) jumpJustDown = true;
      if (this._keyW && Phaser.Input.Keyboard.JustDown(this._keyW)) jumpJustDown = true;
      if (this._cursors && this._cursors.up && Phaser.Input.Keyboard.JustDown(this._cursors.up)) jumpJustDown = true;

      // Keyboard edge detection for pause
      var keyboardPauseJustDown = false;
      if (this._keyP && Phaser.Input.Keyboard.JustDown(this._keyP)) keyboardPauseJustDown = true;
      if (this._keyEsc && Phaser.Input.Keyboard.JustDown(this._keyEsc)) keyboardPauseJustDown = true;

      // Merge touch state
      if (this._touch.left) left = true;
      if (this._touch.right) right = true;
      if (this._touch.run) run = true;
      if (this._touch.jump) jumpDown = true;

      // Touch jump edge detection: the latch set on pointerdown is authoritative,
      // the held-state comparison only backs it up.
      var touchJumpJustDown = this._touch.jumpPressedFlag || (this._touch.jump && !this._prevJumpDown);
      this._touch.jumpPressedFlag = false;
      this._prevJumpDown = this._touch.jump;

      var combinedJumpDown = jumpDown;
      jumpJustDown = jumpJustDown || touchJumpJustDown;

      // Touch pause edge detection (tap flag consumed once)
      var touchPauseJustDown = this._touch.pausePressedFlag;
      this._touch.pausePressedFlag = false;

      pauseJustDown = keyboardPauseJustDown || touchPauseJustDown;

      return {
        left: left,
        right: right,
        run: run,
        jumpDown: combinedJumpDown,
        jumpPressed: jumpJustDown,
        pausePressed: pauseJustDown
      };
    }

    /**
     * Removes keyboard listeners and per-scene DOM touch controls. The orientation overlay
     * is intentionally left in place (page-level singleton) so it doesn't flicker across
     * scene transitions - only its resize/orientationchange listeners tied to THIS instance
     * are removed here to avoid leaking duplicate listeners.
     */
    destroy() {
      if (this._destroyed) return;
      this._destroyed = true;

      var keyboard = this.scene && this.scene.input && this.scene.input.keyboard;
      if (keyboard) {
        if (this._keyA) keyboard.removeKey(this._keyA);
        if (this._keyD) keyboard.removeKey(this._keyD);
        if (this._keyW) keyboard.removeKey(this._keyW);
        if (this._keySpace) keyboard.removeKey(this._keySpace);
        if (this._keyShiftL) keyboard.removeKey(this._keyShiftL);
        if (this._keyP) keyboard.removeKey(this._keyP);
        if (this._keyEsc) keyboard.removeKey(this._keyEsc);
      }
      this._cursors = null;
      this._keyA = this._keyD = this._keyW = this._keySpace = this._keyShiftL = this._keyP = this._keyEsc = null;

      // Remove DOM pointer/touch listeners
      for (var i = 0; i < this._pointerHandlers.length; i++) {
        var h = this._pointerHandlers[i];
        h.el.removeEventListener(h.type, h.fn);
      }
      this._pointerHandlers = [];

      // Remove per-scene touch control DOM
      if (this._domRoot && this._domRoot.parentNode) {
        this._domRoot.parentNode.removeChild(this._domRoot);
      }
      this._domRoot = null;

      // The overlay and its listeners are page-level and deliberately outlive
      // every InputManager - see create(). Re-evaluate it once here so a scene
      // change never leaves a stale overlay covering the screen.
      this._orientationHandlerBound = null;
      updateOrientationOverlayVisibility();
    }
  };
})();
