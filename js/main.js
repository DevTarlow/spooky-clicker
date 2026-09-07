/* Spooky Clicker 2026 — boot, screen manager, input, main loop. */
'use strict';

var SC = SC || {};

SC.state = null;
SC.screen = null;
SC.screenName = '';

SC.screens = function () {
  return {
    game: SC.GameScreen,
    collection: SC.CollectionScreen,
    achievements: SC.AchievementsScreen,
    skins: SC.SkinsScreen,
    store: SC.StoreScreen
  };
};

SC.show = function (name) {
  var all = SC.screens();
  SC.screenName = name;
  SC.screen = all[name] || all.game;
  SC.Popups.clear();
  SC.Splash.clear();
  SC.Transition.kick();
  SC.announce(name.charAt(0).toUpperCase() + name.slice(1) + ' screen');
  if (SC.screen.enter) SC.screen.enter();
};

/* Screen-reader announcements for canvas UI changes. */
SC.announce = function (msg) {
  try {
    if (typeof document === 'undefined') return;
    var el = document.getElementById('live');
    if (!el) return;
    el.textContent = '';
    el.textContent = msg;
  } catch (e) {}
};

SC.ASSETS = [
  'assets/bg-game.png', 'assets/bg-other.png',
  'assets/cauldron-basic.png', 'assets/cauldron-ruby.png',
  'assets/cauldron-lapis.png', 'assets/cauldron-emerald.png',
  'assets/cauldron-topaz.png', 'assets/cauldron-amethyst.png',
  'assets/cauldron-pumpkin.png',
  'assets/item-pumpkin.png', 'assets/item-jackolantern.png',
  'assets/item-lolipop.png', 'assets/item-candies.png',
  'assets/item-jackpops.png', 'assets/item-faketeeth.png',
  'assets/item-zombiehand.png', 'assets/item-braincake.png',
  'assets/item-witchhat.png', 'assets/item-treatbag.png',
  'assets/ghost.png', 'assets/eyes.png', 'assets/skull.png',
  'assets/star.png', 'assets/cart.png',
  'assets/bubble.png', 'assets/smoke.png',
  'assets/boom-01.png', 'assets/boom-02.png', 'assets/boom-03.png',
  'assets/boom-04.png', 'assets/boom-05.png', 'assets/boom-06.png',
  'assets/boom-07.png', 'assets/boom-08.png', 'assets/boom-09.png',
  'assets/boom-10.png', 'assets/boom-11.png', 'assets/boom-12.png',
  'assets/boom-13.png', 'assets/boom-14.png', 'assets/boom-15.png',
  'assets/boom-16.png', 'assets/boom-17.png', 'assets/boom-18.png',
  'assets/boom-19.png', 'assets/boom-20.png', 'assets/boom-21.png',
  'assets/boom-22.png', 'assets/boom-23.png', 'assets/boom-24.png',
  'assets/boom-25.png', 'assets/boom-26.png', 'assets/boom-27.png',
  'assets/boom-28.png'
];

SC.boot = function () {
  SC.state = SC.load();
  SC.UI.init('game');
  SC.Audio.init(SC.state.volume, SC.state.mutedMusic);
  if (!SC.state.mutedMusic) SC.Audio.setMusicEnabled(true);

  /* Rule events -> presentation. Achievements stay idempotent in state.js. */
  SC.notify = function (type, data) {
    if (type === 'achievement') {
      SC.Audio.play('achievement');
      SC.haptic(25);
      SC.Banners.push(data.id, data.reward);
      SC.HUDShake.kick();
      var name = '';
      for (var i = 0; i < SC.ACHIEVEMENTS.length; i++) {
        if (SC.ACHIEVEMENTS[i].id === data.id) name = SC.ACHIEVEMENTS[i].name;
      }
      SC.announce('Achievement unlocked: ' + name + ', plus ' + data.reward + ' skulls');
    } else if (type === 'skulls') {
      SC.HUDShake.kick();
    } else if (type === 'sold') {
      SC.announce('Traded for ' + data.count + ' skulls. Total ' + SC.state.skulls);
    } else if (type === 'bought') {
      SC.haptic(20);
      SC.announce('Purchased. ' + SC.state.skulls + ' skulls left');
    } else if (type === 'prestige') {
      SC.announce('Rebirth level ' + data.level);
    }
  };

  var fill = document.getElementById('load-fill');
  var text = document.getElementById('load-text');
  SC.UI.loadImages(SC.ASSETS, function (done, total) {
    if (fill) fill.style.width = Math.round(done / total * 100) + '%';
    if (text) text.textContent = 'Loading… ' + done + '/' + total;
  }, function () {
    var loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
    try {
      if (document.fonts && document.fonts.load) {
        document.fonts.load('30px Spooky').catch(function () {});
      }
    } catch (e) {}
    SC.show('game');
    SC.welcomeBack();
    SC.loop();
  });

  var canvas = SC.UI.canvas;
  var onDown = function (ev) {
    if (ev.cancelable) ev.preventDefault();
    var p = SC.UI.toLogical(ev.clientX, ev.clientY);
    SC.Audio.unlock(SC.state.mutedMusic);
    if (SC.screen && SC.screen.tap) SC.screen.tap(SC.state, p.x, p.y);
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', function (ev) {
    if (SC.screenName === 'game' && SC.GameScreen.settingsOpen && SC.GameScreen.volDrag) {
      var p = SC.UI.toLogical(ev.clientX, ev.clientY);
      SC.GameScreen.dragSettings(SC.state, p.x, p.y);
    }
  });
  var endDrag = function () {
    if (SC.GameScreen) SC.GameScreen.volDrag = false;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('touchstart', function (ev) {
    if (ev.cancelable) ev.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturestart', function (ev) {
    if (ev.cancelable) ev.preventDefault();
  });

  /* Keyboard play: Space/Enter taps, 1-5 switch screens, Esc goes back. */
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Tab') return; /* let focus move freely */
    var k = ev.key;
    if (k === 'Escape') {
      if (SC.screenName === 'game' && SC.GameScreen.settingsOpen) {
        SC.GameScreen.settingsOpen = false;
        SC.GameScreen.volDrag = false;
      } else if (SC.screenName !== 'game') {
        SC.show('game');
      }
      return;
    }
    if (k >= '1' && k <= '6') {
      if (k === '6') {
        if (SC.screenName !== 'game') SC.show('game');
        SC.GameScreen.settingsOpen = true;
        SC.GameScreen.volDrag = false;
        SC.Audio.unlock(SC.state.mutedMusic);
        return;
      }
      var names = ['game', 'collection', 'achievements', 'skins', 'store'];
      if (SC.screenName === 'game' && SC.GameScreen.settingsOpen) {
        SC.GameScreen.settingsOpen = false;
      }
      SC.Audio.unlock(SC.state.mutedMusic);
      SC.show(names[+k - 1]);
      return;
    }
    if ((k === ' ' || k === 'Enter') && SC.screenName === 'game' &&
        !SC.GameScreen.settingsOpen) {
      if (ev.cancelable) ev.preventDefault();
      SC.Audio.unlock(SC.state.mutedMusic);
      SC.GameScreen.tapCauldron(SC.state, 640, 470, false);
    }
  });

  /* Offline-capable install: register the service worker when served over http(s). */
  try {
    if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      });
    }
  } catch (e) {}
};

/* Post-load rewards: offline earnings + daily streak, announced once. */
SC.welcomeBack = function () {
  var st = SC.state;
  var now = (typeof Date !== 'undefined') ? Date.now() : 0;
  var elapsed = st.lastSeen && now > st.lastSeen ? (now - st.lastSeen) / 1000 : 0;
  if (elapsed > 60) {
    var g = SC.applyOffline(st, elapsed);
    if (g.skulls > 0) {
      SC.Banners.announce('Welcome back!',
        '+' + g.skulls + ' skulls while you were away');
      SC.announce('Welcome back. ' + g.skulls + ' skulls earned while away.');
    }
  }
  if (st.clicks > 0 || st.skullsTotal > 0) {
    var d = SC.claimDaily(st);
    if (d.claimed) {
      SC.Banners.announce('Daily reward — day ' + d.streak, '+' + d.reward + ' skulls');
      SC.announce('Daily reward day ' + d.streak + ': ' + d.reward + ' skulls');
    }
  }
  SC.flushSave(st);
};

SC.lastT = 0;

SC.loop = function () {
  var step = function (t) {
    var dt = SC.lastT ? Math.min(0.1, (t - SC.lastT) / 1000) : 0.016;
    SC.lastT = t;
    if (SC.screen) {
      if (SC.screen.update) SC.screen.update(SC.state, dt);
      SC.HUDShake.update(dt);
      SC.UI.update(dt);
      SC.Transition.update(dt);
      SC.Particles.update(dt);
      SC.Popups.update(dt);
      SC.Banners.update(dt);
      SC.Splash.update(dt);
      SC.screen.draw(SC.state);
      SC.Particles.draw();
      SC.Popups.draw();
      SC.Banners.draw();
      if (SC.screen.drawOverlay) SC.screen.drawOverlay(SC.state);
      SC.Splash.draw();
      SC.Transition.draw();
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', SC.boot);
  } else {
    SC.boot();
  }
}
