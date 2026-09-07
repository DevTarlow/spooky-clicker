/* Spooky Clicker 2026 — screens. Each screen: enter/draw/update/tap. */
'use strict';

var SC = SC || {};

SC.HUDShake = {
  t: 0,
  kick: function () { this.t = 0.3; },
  update: function (dt) { if (this.t > 0) this.t -= dt; }
};

SC.hud = function (st, opts) {
  opts = opts || {};
  var U = SC.UI;
  var jx = 0;
  if (SC.HUDShake.t > 0 && !U.reduceMotion) {
    jx = Math.sin(SC.HUDShake.t * 90) * 6 * (SC.HUDShake.t / 0.3);
  }
  var skull = U.img('assets/skull.png');
  if (skull) U.ctx.drawImage(skull, 24 + jx, 20, 44, 44);
  U.ctx.textAlign = 'left';
  U.text('Skulls: ' + st.skulls, 78 + jx, 44, 34, '#ffd76a', 'left');
  var clicks = 'Clicks: ' + st.clicks + (opts.cps ? '  (' + opts.cps + '/s)' : '');
  U.text(clicks, 78, 84, 24, '#c9a86a', 'left');
  if (opts.goal) U.text(opts.goal, 78, 112, 20, '#8a7a8a', 'left');
  U.ctx.textAlign = 'center';
};

/* Bottom tab bar: icon + label on every screen. Settings opens the modal. */
SC.TAB_H = 56;

SC.TABS = [
  { id: 'game',         label: 'Brew',     key: '1' },
  { id: 'collection',   label: 'Loot',     key: '2', tone: 'teal' },
  { id: 'achievements', label: 'Goals',    key: '3', tone: 'gold' },
  { id: 'skins',        label: 'Skins',    key: '4', tone: 'red' },
  { id: 'store',        label: 'Store',    key: '5', tone: 'green' },
  { id: 'settings',     label: 'Settings', key: '6' }
];

SC.tabRect = function (i) {
  var w = SC.W / SC.TABS.length;
  return { x: i * w, y: SC.H - SC.TAB_H, w: w, h: SC.TAB_H };
};

/* Tab index under the point, or -1 when above the bar. */
SC.tabsHit = function (x, y) {
  if (y < SC.H - SC.TAB_H) return -1;
  return Math.max(0, Math.min(SC.TABS.length - 1,
    Math.floor(x / (SC.W / SC.TABS.length))));
};

SC.tabIcon = function (id, st) {
  if (id === 'game') return SC.SKINS[st.skin].img;
  if (id === 'collection') return 'assets/item-pumpkin.png';
  if (id === 'achievements') return 'assets/star.png';
  if (id === 'skins') return 'assets/cauldron-ruby.png';
  if (id === 'store') return 'assets/cart.png';
  return null; /* settings draws a gear glyph */
};

/* Navigate from a tab tap. Returns true when a tab was hit. */
SC.openTab = function (st, x, y) {
  var i = SC.tabsHit(x, y);
  if (i < 0) return false;
  var U = SC.UI, tab = SC.TABS[i];
  U.press(SC.tabRect(i));
  SC.Audio.play('ui');
  SC.haptic(10);
  if (tab.id === 'settings') {
    if (SC.screenName !== 'game') SC.show('game');
    SC.GameScreen.settingsOpen = true;
    SC.GameScreen.volDrag = false;
  } else if (tab.id !== SC.screenName) {
    SC.show(tab.id);
  }
  return true;
};

SC.tabShade = function (tone) {
  if (tone === 'teal') return 'rgba(15,90,82,0.55)';
  if (tone === 'gold') return 'rgba(122,90,0,0.55)';
  if (tone === 'red') return 'rgba(122,31,31,0.55)';
  if (tone === 'green') return 'rgba(42,122,56,0.55)';
  return 'rgba(122,46,0,0.55)';
};

SC.drawTabs = function (st, activeId) {
  var U = SC.UI, c = U.ctx;
  var top = SC.H - SC.TAB_H, i, tab, r, cx, img, icon;
  c.fillStyle = 'rgba(10,4,18,0.96)';
  c.fillRect(0, top, SC.W, SC.TAB_H);
  c.fillStyle = '#c9a86a';
  c.fillRect(0, top, SC.W, 3);
  for (i = 0; i < SC.TABS.length; i++) {
    tab = SC.TABS[i];
    r = SC.tabRect(i);
    cx = r.x + r.w / 2;
    if (tab.id === activeId ||
        (tab.id === 'settings' && activeId === 'game' && SC.GameScreen.settingsOpen)) {
      c.fillStyle = SC.tabShade(tab.tone);
      c.fillRect(r.x, top + 3, r.w, SC.TAB_H - 3);
    }
    icon = SC.tabIcon(tab.id, st);
    if (icon) {
      img = U.img(icon);
      if (img) c.drawImage(img, cx - 13, top + 4, 26, 26);
    } else {
      U.text('⚙', cx, top + 17, 24, '#c9a86a');
    }
    U.text(tab.label, cx, top + 44, 17, '#ffe9c4');
    if (!U.touch) U.text(tab.key, r.x + 16, top + 12, 14, '#8a7a8a', 'left');
    if (tab.id === 'collection') {
      var n = SC.lootTotal(st);
      if (n > 0) U.text('x' + n, r.x + r.w - 14, top + 12, 14, '#ffd76a', 'right');
    }
    if (tab.id === 'store' && SC.storeHasAffordable(st)) {
      c.save();
      c.fillStyle = '#ffd76a';
      c.beginPath();
      c.arc(r.x + r.w - 20, top + 43, 6, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }
};

/* ================= GAME SCREEN ================= */

SC.GameScreen = {
  shakeT: 0,
  ghost: null,         /* {x,y} active lucky ghost */
  ghostTimer: 0, ghostArmed: false, ghostDelay: 0,
  eyes: null,          /* {x,y,t} active spooky eyes */
  eyesTimer: 0,
  falling: [],         /* skull-dropper skulls {x,y} */
  skullTimer: 0,
  autoAcc: 0,
  cpsWindow: [],
  combo: 0, comboT: 0, /* manual-tap combo: count + time left */
  critT: 0,            /* crit squash flash timer */
  dropStreak: 0,       /* consecutive dropper skulls caught by hand */
  settingsOpen: false,
  volDrag: false,
  nav: [],

  enter: function () {
    this.combo = 0;
    this.comboT = 0;
    this.dropStreak = 0;
  },

  /* The 32px skins carry 5px of transparent base padding (~40px at 260px),
     so the box extends under the bar: the PAINTED base sits on the black
     wall/floor seam (~y643). Tab taps are tested first, so the overlap
     never steals bar touches. */
  cauldronRect: function () {
    return { x: 640 - 130, y: 554 - 130, w: 260, h: 260 };
  },

  /* auto=true for autoclicker ticks: no crit/combo/tutorial credit. */
  tapCauldron: function (st, x, y, auto) {
    var item = SC.tap(st, undefined, auto);
    SC.Audio.play('tap');
    if (!auto) SC.haptic(12);
    this.shakeT = 0.18;
    var r = this.cauldronRect();
    SC.Particles.spawnSmoke(640, r.y + 40);
    SC.Particles.spawnBubble(640, r.y + 20);
    if (item) {
      SC.Particles.spawnDrop(item, 640, r.y + 60);
      SC.Audio.play('collect');
    }
    if (!auto) {
      /* Combo: manual taps within the window build toward a milestone bonus. */
      this.combo += 1;
      this.comboT = SC.COMBO_WINDOW;
      if (this.combo > (st.bestCombo || 0)) st.bestCombo = this.combo;
      if (this.combo % SC.COMBO_MILESTONE === 0) {
        SC.grantSkulls(st, SC.COMBO_REWARD, 'combo');
        SC.Popups.add('Combo x' + this.combo + '! +' + SC.COMBO_REWARD + ' skulls',
          640, r.y - 60, '#ffd76a', true);
        SC.Audio.play('achievement');
        SC.haptic(25);
      }
      /* Crit: a lucky tap bursts bonus skulls. */
      if (Math.random() < SC.CRIT_CHANCE) {
        this.critT = 0.35;
        SC.grantSkulls(st, SC.CRIT_SKULLS, 'crit');
        SC.Popups.add('CRIT! +' + SC.CRIT_SKULLS + ' skulls', 640, r.y - 110,
          '#ff9a3d', true);
        SC.Audio.play('pop');
        SC.haptic(30);
      }
    }
    this.cpsWindow.push(performance.now());
  },

  /* Bonus actors are removed synchronously: one click can never pay twice. */
  tapGhost: function (st) {
    if (!this.ghost) return false;
    var g = this.ghost;
    this.ghost = null;
    SC.Particles.spawnBlast(g.x, g.y);
    SC.Audio.play('pop');
    SC.haptic(20);
    SC.Popups.add('+20 skulls', g.x, g.y - 40, '#ffd76a', true);
    SC.grantSkulls(st, SC.BONUS_SKULLS, 'ghost');
    return true;
  },

  tapEyes: function (st) {
    if (!this.eyes) return false;
    var e = this.eyes;
    this.eyes = null;
    SC.Audio.play('laugh');
    SC.haptic(20);
    SC.Popups.add('+20 skulls', e.x, e.y - 30, '#ffd76a', true);
    SC.grantSkulls(st, SC.BONUS_SKULLS, 'eyes');
    return true;
  },

  tap: function (st, x, y) {
    var U = SC.UI, i;
    if (this.settingsOpen) return this.tapSettings(st, x, y);
    /* chrome first so the tab bar always wins over actors behind it */
    if (SC.openTab(st, x, y)) return true;
    /* ghost + eyes (topmost actors below the chrome) */
    if (this.ghost && Math.hypot(x - this.ghost.x, y - this.ghost.y) < 84) {
      this.tapGhost(st);
      return true;
    }
    if (this.eyes && Math.hypot(x - (this.eyes.x + 40), y - (this.eyes.y + 17)) < 96) {
      this.tapEyes(st);
      return true;
    }
    for (i = 0; i < this.falling.length; i++) {
      var f = this.falling[i];
      if (Math.hypot(x - f.x, y - f.y) < 52) {
        this.falling.splice(i, 1);
        SC.Audio.play('collect');
        SC.haptic(10);
        this.dropStreak += 1;
        if (this.dropStreak > (st.bestDropStreak || 0)) st.bestDropStreak = this.dropStreak;
        var bonus = SC.dropBonus(this.dropStreak);
        SC.Popups.add('+1 skull', f.x, f.y - 20, '#ffd76a', false);
        SC.grantSkulls(st, 1, 'dropper');
        if (bonus > 0) {
          SC.grantSkulls(st, bonus, 'dropstreak');
          SC.Popups.add('Skull streak x' + this.dropStreak + '! +' + bonus,
            f.x, f.y - 60, '#ffd76a', true);
          SC.Audio.play('achievement');
          SC.haptic(25);
        }
        return true;
      }
    }
    var r = this.cauldronRect();
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      this.tapCauldron(st, x, y);
      return true;
    }
    /* hidden spooks: cat (left of window) and pumpkin (right end) */
    if (x >= 790 && x <= 900 && y >= 500 && y <= 658) {
      SC.Audio.play('meow');
      SC.Popups.add('meow!', x, y - 30, '#c9a86a', false);
      this.touchSecret(st, 'cat');
      return true;
    }
    if (x >= 985 && x <= 1090 && y >= 550 && y <= 658) {
      SC.Audio.play('laugh');
      SC.Popups.add('hehehe…', x, y - 30, '#c9a86a', false);
      this.touchSecret(st, 'pumpkin');
      return true;
    }
    /* the HUD skull: third piece of the secret stash */
    if (x >= 8 && x <= 120 && y >= 8 && y <= 96) {
      SC.Audio.secret();
      SC.haptic(10);
      this.touchSecret(st, 'skull');
      return true;
    }
    return false;
  },

  /* One piece of the secret stash touched: celebrate only on completion. */
  touchSecret: function (st, piece) {
    var r = SC.touchSecret(st, piece);
    if (r.status === 'found') {
      SC.Audio.play('achievement');
      SC.haptic(30);
      SC.Splash.show('Happy Halloween!', 'Secret Stash Found! +' + r.granted + ' Skulls');
      SC.announce('Secret stash found! Plus ' + r.granted + ' skulls');
    }
  },

  /* ---------- settings modal ---------- */

  settingsRects: function () {
    return {
      panel: { x: 360, y: 80, w: 560, h: 450 },
      toggle: { x: 480, y: 204, w: 320, h: 60 },
      music: { x: 480, y: 308, w: 320, h: 60 },
      volBar: { x: 440, y: 416, w: 400, h: 26 },
      reset: { x: 440, y: 462, w: 400, h: 48, label: 'Reset skin to Basic' },
      close: { x: 840, y: 90, w: 70, h: 56, label: 'X' }
    };
  },

  tapSettings: function (st, x, y) {
    var U = SC.UI, R = this.settingsRects();
    if (U.hit(R.close, x, y)) {
      U.press(R.close);
      SC.Audio.play('ui');
      this.settingsOpen = false;
      this.volDrag = false;
      return true;
    }
    if (U.hit(R.toggle, x, y)) {
      U.press(R.toggle);
      if (!st.perks.autoclicker) {
        SC.Popups.add('Buy the Auto Clicker first!', 640, 200, '#ff9a7a', false);
        return true;
      }
      st.autoOn = !st.autoOn;
      SC.Audio.play('ui');
      SC.haptic(10);
      SC.saveSoon(st);
      return true;
    }
    if (U.hit(R.music, x, y)) {
      U.press(R.music);
      st.mutedMusic = !st.mutedMusic;
      SC.Audio.setMusicEnabled(!st.mutedMusic);
      SC.Audio.play('ui');
      SC.saveSoon(st);
      return true;
    }
    if (U.hit(R.reset, x, y)) {
      U.press(R.reset);
      SC.resetSkin(st);
      SC.Audio.play('ui');
      SC.Popups.add('Skin reset to Basic', 640, 300, '#c9a86a', false);
      return true;
    }
    var v = R.volBar;
    if (x >= v.x - 10 && x <= v.x + v.w + 10 && y >= v.y - 20 && y <= v.y + v.h + 20) {
      st.volume = Math.max(0, Math.min(100, Math.round((x - v.x) / v.w * 100)));
      SC.Audio.setVolume(st.volume);
      this.volDrag = true;
      SC.saveSoon(st);
      return true;
    }
    return true;
  },

  dragSettings: function (st, x, y) {
    var v = this.settingsRects().volBar;
    if (y < v.y - 30 || y > v.y + v.h + 30) return;
    st.volume = Math.max(0, Math.min(100, Math.round((x - v.x) / v.w * 100)));
    SC.Audio.setVolume(st.volume);
    SC.saveSoon(st);
  },

  drawSettings: function (st) {
    var U = SC.UI, R = this.settingsRects(), c = U.ctx;
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(0, 0, SC.W, SC.H);
    U.panel(R.panel.x, R.panel.y, R.panel.w, R.panel.h);
    U.text('Settings', 640, R.panel.y + 45, 44, '#ff8c2e');
    U.text('Auto Clicker', 640, 182, 26, '#ffe9c4');
    U.button({ x: R.toggle.x, y: R.toggle.y, w: R.toggle.w, h: R.toggle.h,
      label: st.autoOn ? 'ON' : 'OFF',
      sub: st.perks.autoclicker ? '' : 'requires Auto Clicker',
      tone: st.autoOn && st.perks.autoclicker ? 'green' : '',
      disabled: !st.perks.autoclicker }, false);
    U.text('Music', 640, 288, 26, '#ffe9c4');
    U.button({ x: R.music.x, y: R.music.y, w: R.music.w, h: R.music.h,
      label: st.mutedMusic ? 'OFF' : 'ON' }, false);
    U.text('Volume: ' + st.volume, 640, 392, 26, '#ffe9c4');
    var v = R.volBar;
    c.fillStyle = '#241433';
    c.fillRect(v.x, v.y, v.w, v.h);
    c.fillStyle = '#ff8c2e';
    c.fillRect(v.x, v.y, v.w * st.volume / 100, v.h);
    c.strokeStyle = '#c9a86a';
    c.lineWidth = 2;
    c.strokeRect(v.x, v.y, v.w, v.h);
    U.button(R.reset, false);
    U.button(R.close, false);
  },

  /* ---------- game update: timers ---------- */

  update: function (st, dt) {
    var now = performance.now();
    while (this.cpsWindow.length && now - this.cpsWindow[0] > 1000) {
      this.cpsWindow.shift();
    }
    if (this.shakeT > 0) this.shakeT -= dt;
    if (st.frenzyT > 0) {
      st.frenzyT -= dt;
      if (st.frenzyT <= 0) {
        st.frenzyT = 0;
        SC.Popups.add('Frenzy over', 640, 300, '#c9a86a', false);
        SC.saveSoon(st);
      }
    }
    if (this.critT > 0) this.critT -= dt;
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    if (st.perks.autoclicker && st.autoOn) {
      this.autoAcc += dt;
      var iv = SC.autoInterval(st);
      while (this.autoAcc >= iv) {
        this.autoAcc -= iv;
        this.tapCauldron(st, 640, 470, true);
      }
    } else {
      this.autoAcc = 0;
    }
    if (st.perks.skulldropper) {
      this.skullTimer += dt;
      if (this.skullTimer >= SC.skullInterval(st)) {
        this.skullTimer = 0;
        this.falling.push({ x: 480 + Math.random() * 320, y: -30, vy: 130 });
      }
    }
    var i, f;
    var landY = this.cauldronRect().y + 120; /* skulls fall into the cauldron */
    for (i = this.falling.length - 1; i >= 0; i--) {
      f = this.falling[i];
      f.y += f.vy * dt;
      if (f.y >= landY) {
        this.falling.splice(i, 1);
        SC.Audio.play('collect');
        /* A skull that lands unclicked still pays +1 but breaks the streak. */
        if (this.dropStreak >= 3) {
          SC.Popups.add('Streak lost', 640, landY - 110, '#8a7a8a', false);
        }
        this.dropStreak = 0;
        SC.Popups.add('+1 skull', 640, landY - 80, '#ffd76a', false);
        SC.grantSkulls(st, 1, 'dropper');
      }
    }
    this.ghostTimer += dt;
    if (!this.ghost && !this.ghostArmed && this.ghostTimer >= SC.GHOST_CYCLE) {
      this.ghostArmed = true;
      this.ghostDelay = 1 + Math.random() * 18;
      this.ghostTimer = 0;
    }
    if (this.ghostArmed && !this.ghost && this.ghostTimer >= this.ghostDelay) {
      this.ghostArmed = false;
      this.ghostTimer = 0;
      this.ghost = { x: 150 + Math.random() * 980, y: -60 };
    }
    if (this.ghost) {
      this.ghost.y += 55 * dt;
      if (this.ghost.y > SC.H + 60) this.ghost = null;
    }
    this.eyesTimer += dt;
    if (!this.eyes && this.eyesTimer >= SC.EYES_CYCLE) {
      this.eyesTimer = 0;
      this.eyes = { x: 997, y: 311, t: 0, dur: 2.2 };
    }
    if (this.eyes) {
      this.eyes.t += dt;
      if (this.eyes.t >= this.eyes.dur) this.eyes = null;
    }
  },

  draw: function (st) {
    var U = SC.UI, c = U.ctx, i;
    var bg = U.img('assets/bg-game.png');
    if (bg) c.drawImage(bg, 0, 0, SC.W, SC.H);
    var skull = U.img('assets/skull.png');
    for (i = 0; i < this.falling.length; i++) {
      var f = this.falling[i];
      if (skull) c.drawImage(skull, f.x - 24, f.y - 24, 48, 48);
    }
    if (this.ghost) {
      var g = U.img('assets/ghost.png');
      var bob = U.reduceMotion ? 0 : Math.sin(performance.now() / 300 + this.ghost.x) * 8;
      if (g) c.drawImage(g, this.ghost.x - 55, this.ghost.y - 55 + bob, 110, 110);
    }
    if (this.eyes) {
      var e = U.img('assets/eyes.png');
      if (e) {
        c.save();
        c.globalAlpha = Math.max(0, 1 - this.eyes.t / this.eyes.dur);
        c.drawImage(e, this.eyes.x, this.eyes.y, 120, 52);
        c.restore();
      }
    }
    var r = this.cauldronRect();
    var jx = 0;
    if (this.shakeT > 0 && !U.reduceMotion) {
      jx = Math.sin(this.shakeT * 120) * 8 * (this.shakeT / 0.18);
    }
    var skin = U.img(SC.SKINS[st.skin].img);
    if (skin) {
      var bump = (this.shakeT > 0 ? 0.06 : 0) + (this.critT > 0 ? 0.1 : 0);
      var s = 1 + bump;
      var w = r.w * s, h = r.h * s;
      c.save();
      c.imageSmoothingEnabled = false;
      if (this.critT > 0) {
        c.shadowColor = '#ff9a3d';
        c.shadowBlur = 40;
      }
      c.drawImage(skin, 640 - w / 2 + jx, r.y + r.h - h, w, h);
      c.restore();
    }
    if (this.combo >= 5) {
      U.text('Combo x' + this.combo, 640, r.y - 24, 30, '#ffd76a');
    }
    if (this.dropStreak >= 2) {
      U.text('Skulls x' + this.dropStreak, 640, r.y - 58, 26, '#6fe3d4');
    }
    if (st.frenzyT > 0) {
      U.text('FRENZY x2 ' + Math.ceil(st.frenzyT) + 's', 640, r.y - 92, 26, '#ff9a3d');
    }
    SC.hud(st, { cps: this.cpsWindow.length, goal: SC.nextGoal(st) });
    SC.drawTabs(st, 'game');
  },

  /* Modal overlay: drawn by the main loop AFTER particles/popups/banners
     so cauldron effects always stay under the settings panel. */
  drawOverlay: function (st) {
    if (this.settingsOpen) this.drawSettings(st);
  }
};

/* ================= COLLECTION SCREEN ================= */

SC.CollectionScreen = {
  cards: [],

  enter: function () {
    this.cards = [];
    for (var i = 0; i < SC.ITEMS.length; i++) {
      var col = i % 5, row = Math.floor(i / 5);
      this.cards.push({
        item: SC.ITEMS[i].id,
        x: 90 + col * 222, y: 140 + row * 220, w: 200, h: 200
      });
    }
  },

  update: function () {},

  tap: function (st, x, y) {
    var U = SC.UI;
    if (SC.openTab(st, x, y)) return true;
    for (var i = 0; i < this.cards.length; i++) {
      var c = this.cards[i];
      if (U.hit(c, x, y)) {
        U.press(c);
        var n = st.loot[c.item] || 0;
        if (n <= 0) {
          SC.Popups.add('Nothing to trade', c.x + c.w / 2, c.y + 40, '#ff9a7a', false);
          return true;
        }
        var gained = SC.exchange(st, c.item);
        SC.Audio.play('sell');
        SC.haptic(15);
        SC.Popups.add('+' + gained + ' skulls', c.x + c.w / 2, c.y + 60, '#ffd76a', true);
        return true;
      }
    }
    if (st.perks.sellall) {
      var b = { x: 490, y: 576, w: 300, h: 58 };
      if (U.hit(b, x, y)) {
        U.press(b);
        var total = SC.sellAll(st);
        SC.Audio.play('sell');
        SC.haptic(15);
        SC.Popups.add(total > 0 ? '+' + total + ' skulls' : 'Nothing to sell',
          640, 540, '#ffd76a', true);
        return true;
      }
    }
    var sb = { x: 170, y: 576, w: 280, h: 58 };
    if (U.hit(sb, x, y)) {
      U.press(sb);
      var gained = SC.tradeSet(st);
      if (gained > 0) {
        SC.Audio.play('sell');
        SC.haptic(20);
        SC.Popups.add('+' + gained + ' skulls — full set!', 640, 540, '#ffd76a', true);
      } else {
        SC.Audio.play('ui');
        SC.Popups.add('Need one of each item', 640, 540, '#ff9a7a', false);
      }
      return true;
    }
    return false;
  },

  draw: function (st) {
    var U = SC.UI, c = U.ctx;
    var bg = U.img('assets/bg-other.png');
    if (bg) c.drawImage(bg, 0, 0, SC.W, SC.H);
    U.text('Item Collection', 640, 60, 52, '#ff8c2e');
    U.text('Tap an item to trade it for skulls (1 each)', 640, 110, 24, '#c9a86a');
    for (var i = 0; i < this.cards.length; i++) {
      var card = this.cards[i], item = null, j;
      for (j = 0; j < SC.ITEMS.length; j++) {
        if (SC.ITEMS[j].id === card.item) item = SC.ITEMS[j];
      }
      U.panel(card.x, card.y, card.w, card.h, 'rgba(20,10,30,0.85)');
      var img = U.img(item.img);
      if (img) c.drawImage(img, card.x + 60, card.y + 8, 80, 80);
      U.text(item.name, card.x + card.w / 2, card.y + 108, 23, '#ffe9c4');
      U.text('x' + (st.loot[item.id] || 0), card.x + card.w / 2, card.y + 140, 28, '#ffd76a');
      U.text(st.loot[item.id] > 0 ? 'tap to trade' : '—',
        card.x + card.w / 2, card.y + 172, 19, '#c9a86a');
    }
    if (st.perks.sellall) {
      U.button({ x: 490, y: 576, w: 300, h: 58, label: 'Sell All' }, false);
    }
    var prog = SC.setProgress(st), full = prog >= SC.ITEMS.length;
    U.button({ x: 170, y: 576, w: 280, h: 58,
      label: full ? 'Full Set +35' : 'Set ' + prog + '/10',
      small: true, disabled: !full }, false);
    SC.hud(st, {});
    SC.drawTabs(st, 'collection');
  }
};

/* ================= ACHIEVEMENTS SCREEN ================= */

SC.AchievementsScreen = {
  enter: function () {},
  update: function () {},

  tap: function (st, x, y) {
    if (SC.openTab(st, x, y)) return true;
    return false;
  },

  draw: function (st) {
    var U = SC.UI, c = U.ctx;
    var bg = U.img('assets/bg-other.png');
    if (bg) c.drawImage(bg, 0, 0, SC.W, SC.H);
    U.text('Achievements', 640, 56, 44, '#ff8c2e');
    var star = U.img('assets/star.png');
    for (var i = 0; i < SC.ACHIEVEMENTS.length; i++) {
      var a = SC.ACHIEVEMENTS[i];
      var y = 104 + i * 42;
      var owned = !!st.ach[a.id];
      U.panel(140, y, 1000, 38, owned ? 'rgba(60,30,8,0.9)' : 'rgba(20,10,30,0.85)');
      c.save();
      if (!owned) c.globalAlpha = 0.25;
      if (star) c.drawImage(star, 158, y + 5, 28, 28);
      c.restore();
      U.ctx.textAlign = 'left';
      U.text(a.name, 200, y + 19, 20, owned ? '#ffd76a' : '#8a7a8a', 'left');
      var right = a.trigger + '  •  +' + a.reward + ' skulls' + (owned ? '  ✓' : '');
      U.text(right, 1120, y + 19, 17, owned ? '#ffe9c4' : '#6a5a6a', 'right');
      U.ctx.textAlign = 'center';
    }
    SC.hud(st, {});
    SC.drawTabs(st, 'achievements');
  }
};

/* ================= SKINS SCREEN ================= */

SC.SkinsScreen = {
  cards: [],

  enter: function () {
    this.cards = [];
    for (var i = 0; i < SC.SKIN_LIST.length; i++) {
      this.cards.push({ skin: SC.SKIN_LIST[i], x: 80 + i * 160, y: 230, w: 140, h: 220 });
    }
  },

  update: function () {},

  tap: function (st, x, y) {
    var U = SC.UI;
    if (SC.openTab(st, x, y)) return true;
    for (var i = 0; i < this.cards.length; i++) {
      var cd = this.cards[i], def = SC.SKINS[cd.skin];
      if (!U.hit(cd, x, y)) continue;
      U.press(cd);
      if (st.skins[cd.skin]) {
        SC.selectSkin(st, cd.skin);
        SC.Audio.play('ui');
        SC.haptic(10);
        SC.Popups.add(def.name + ' skin equipped', cd.x + cd.w / 2, 200, '#ffd76a', true);
      } else {
        var r = SC.buySkin(st, cd.skin);
        if (r === 'ok') {
          SC.Audio.play('buy');
          SC.haptic(20);
          SC.selectSkin(st, cd.skin);
          SC.Popups.add(def.name + ' skin equipped', cd.x + cd.w / 2, 200, '#ffd76a', true);
        } else {
          SC.Audio.play('ui');
          SC.Popups.add('Need ' + def.cost + ' skulls', cd.x + cd.w / 2, 200, '#ff9a7a', false);
        }
      }
      return true;
    }
    return false;
  },

  draw: function (st) {
    var U = SC.UI, c = U.ctx;
    var bg = U.img('assets/bg-other.png');
    if (bg) c.drawImage(bg, 0, 0, SC.W, SC.H);
    U.text('Cauldron Skins', 640, 60, 52, '#ff8c2e');
    U.text('Buy with skulls, then tap an owned skin to equip it', 640, 110, 24, '#c9a86a');
    for (var i = 0; i < this.cards.length; i++) {
      var cd = this.cards[i], def = SC.SKINS[cd.skin];
      var owned = !!st.skins[cd.skin], active = st.skin === cd.skin;
      U.panel(cd.x, cd.y, cd.w, cd.h,
        active ? 'rgba(60,30,8,0.92)' : 'rgba(20,10,30,0.85)');
      var img = U.img(def.img);
      c.save();
      if (!owned) c.globalAlpha = 0.45;
      c.imageSmoothingEnabled = false;
      if (img) c.drawImage(img, cd.x + 22, cd.y + 14, 96, 96);
      c.restore();
      U.text(def.name, cd.x + cd.w / 2, cd.y + 132, 24, '#ffe9c4');
      U.text(active ? 'EQUIPPED' : (owned ? 'tap to equip' : def.cost + ' skulls'),
        cd.x + cd.w / 2, cd.y + 164, 20, active ? '#ffd76a' : '#c9a86a');
      if (owned && !active) {
        var cart = U.img('assets/cart.png');
        if (cart) c.drawImage(cart, cd.x + cd.w - 34, cd.y + 8, 26, 22);
      }
    }
    U.text('Your Skulls: ' + st.skulls, 640, 560, 34, '#ffd76a');
    U.text('Progress to "Cauldron Fashionista!" (+500 skulls)', 640, 604, 22, '#c9a86a');
    SC.hud(st, {});
    SC.drawTabs(st, 'skins');
  }
};

/* ================= STORE SCREEN ================= */

SC.StoreScreen = {
  rows: [],
  prestigeRect: null,
  frenzyRect: null,

  enter: function () {
    this.rows = [];
    for (var i = 0; i < SC.PERKS.length; i++) {
      this.rows.push({ perk: SC.PERKS[i].id, y: 132 + i * 56 });
    }
    this.prestigeRect = { x: 980, y: 132 + SC.PERKS.length * 56 + 3, w: 160, h: 50 };
    this.frenzyRect = { x: 980, y: 132 + (SC.PERKS.length + 1) * 56 + 3, w: 160, h: 50 };
  },

  update: function () {},

  tap: function (st, x, y) {
    var U = SC.UI;
    if (SC.openTab(st, x, y)) return true;
    for (var i = 0; i < this.rows.length; i++) {
      var r = this.rows[i], def = SC.perkDef(r.perk);
      var b = { x: 980, y: r.y + 3, w: 160, h: 50 };
      if (!U.hit(b, x, y)) continue;
      U.press(b);
      var res = SC.buyPerk(st, r.perk);
      if (res === 'ok') {
        SC.Audio.play('buy');
        SC.haptic(20);
        SC.Popups.add(def.name + ' purchased!', 640, 120, '#ffd76a', true);
      } else if (res === 'owned') {
        SC.Popups.add('Already owned', 640, 120, '#c9a86a', false);
      } else if (res === 'locked') {
        var req = SC.perkDef(def.req);
        SC.Popups.add('Requires ' + (req ? req.name : 'previous perk'), 640, 120,
          '#ff9a7a', false);
      } else {
        SC.Popups.add('Need ' + def.cost + ' skulls', 640, 120, '#ff9a7a', false);
      }
      return true;
    }
    if (this.frenzyRect && U.hit(this.frenzyRect, x, y)) {
      U.press(this.frenzyRect);
      if (SC.buyFrenzy(st) === 'ok') {
        SC.Audio.play('buy');
        SC.haptic(20);
        SC.Popups.add('Frenzy Brew! 2x drops 60s', 640, 120, '#ffd76a', true);
      } else {
        SC.Audio.play('ui');
        SC.Popups.add('Need ' + SC.FRENZY_COST + ' skulls', 640, 120, '#ff9a7a', false);
      }
      return true;
    }
    if (this.prestigeRect && U.hit(this.prestigeRect, x, y)) {
      U.press(this.prestigeRect);
      if (SC.prestige(st)) {
        SC.Audio.play('achievement');
        SC.haptic(30);
        SC.show('game');
        SC.Banners.announce('Reborn!',
          '+' + Math.round(SC.PRESTIGE_BONUS * 100) + '% skulls forever');
      } else {
        SC.Audio.play('ui');
        SC.Popups.add('Need ' + SC.PRESTIGE_SKULLS + ' lifetime skulls to rebirth',
          640, 120, '#ff9a7a', false);
      }
      return true;
    }
    return false;
  },

  draw: function (st) {
    var U = SC.UI, c = U.ctx;
    var bg = U.img('assets/bg-other.png');
    if (bg) c.drawImage(bg, 0, 0, SC.W, SC.H);
    U.text('Shop', 640, 56, 48, '#ff8c2e');
    U.text('Spend skulls on permanent upgrades', 640, 100, 22, '#c9a86a');
    for (var i = 0; i < this.rows.length; i++) {
      var r = this.rows[i], def = SC.perkDef(r.perk);
      var owned = !!st.perks[r.perk];
      var locked = !!def.req && !st.perks[def.req];
      U.panel(140, r.y, 1000, 56, owned ? 'rgba(60,30,8,0.9)' : 'rgba(20,10,30,0.85)');
      U.ctx.textAlign = 'left';
      U.text(def.name, 165, r.y + 18, 23, owned ? '#ffd76a' : '#ffe9c4', 'left');
      U.text(def.desc, 165, r.y + 41, 17, '#c9a86a', 'left');
      U.ctx.textAlign = 'center';
      U.button({ x: 980, y: r.y + 3, w: 160, h: 50,
        label: owned ? 'OWNED' : (locked ? 'LOCKED' : def.cost + ' skulls'),
        small: true, disabled: owned || locked }, false);
    }
    var py = 132 + SC.PERKS.length * 56;
    var ready = SC.canPrestige(st);
    U.panel(140, py, 1000, 56, ready ? 'rgba(60,30,8,0.9)' : 'rgba(20,10,30,0.85)');
    U.ctx.textAlign = 'left';
    U.text('Rebirth' + (st.prestige ? ' x' + st.prestige : ''), 165, py + 18, 23,
      ready ? '#ffd76a' : '#ffe9c4', 'left');
    U.text(SC.prestigeBonusText(st) + ' — resets run, keeps skins & achievements',
      165, py + 41, 17, '#c9a86a', 'left');
    U.ctx.textAlign = 'center';
    U.button({ x: 980, y: py + 3, w: 160, h: 50,
      label: ready ? 'REBIRTH' : st.skullsTotal + '/' + SC.PRESTIGE_SKULLS,
      small: true, disabled: !ready }, false);
    var fy = 132 + (SC.PERKS.length + 1) * 56;
    var fActive = st.frenzyT > 0, fPoor = st.skulls < SC.FRENZY_COST;
    U.panel(140, fy, 1000, 56, fActive ? 'rgba(60,30,8,0.9)' : 'rgba(20,10,30,0.85)');
    U.ctx.textAlign = 'left';
    U.text('Frenzy Brew' + (fActive ? ' (' + Math.ceil(st.frenzyT) + 's left)' : ''),
      165, fy + 18, 23, fActive ? '#ffd76a' : '#ffe9c4', 'left');
    U.text('2x loot drops for 60s. Repeatable — buying extends it.',
      165, fy + 41, 17, '#c9a86a', 'left');
    U.ctx.textAlign = 'center';
    U.button({ x: 980, y: fy + 3, w: 160, h: 50,
      label: SC.FRENZY_COST + ' skulls', small: true, disabled: fPoor }, false);
    SC.hud(st, {});
    SC.drawTabs(st, 'store');
  }
};
