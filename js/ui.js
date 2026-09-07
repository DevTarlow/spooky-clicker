/* Spooky Clicker 2026 — canvas UI kit: loader, widgets, particles, banners. */
'use strict';

var SC = SC || {};

SC.UI = {
  canvas: null, ctx: null,
  scale: 1, offX: 0, offY: 0,
  dpr: 1,
  images: {},
  reduceMotion: false,
  touch: false,
  flash: null, /* {x,y,w,h,t} pressed-button feedback */

  init: function (canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    try {
      this.reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { this.reduceMotion = false; }
    try {
      this.touch = ('ontouchstart' in window) ||
        (navigator && navigator.maxTouchPoints > 0);
    } catch (e) { this.touch = false; }
    this.resize();
    var self = this;
    window.addEventListener('resize', function () { self.resize(); });
  },

  resize: function () {
    var ww = window.innerWidth, wh = window.innerHeight;
    var s = Math.min(ww / SC.W, wh / SC.H);
    this.scale = s;
    /* Crisp rendering on retina/hiDPI: fixed logical space, dense backing store. */
    var dpr = 1;
    try {
      dpr = Math.min(2, window.devicePixelRatio || 1);
    } catch (e) { dpr = 1; }
    this.dpr = dpr;
    this.canvas.width = Math.round(SC.W * dpr);
    this.canvas.height = Math.round(SC.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.canvas.style.width = Math.floor(SC.W * s) + 'px';
    this.canvas.style.height = Math.floor(SC.H * s) + 'px';
    this.offX = Math.floor((ww - SC.W * s) / 2);
    this.offY = Math.floor((wh - SC.H * s) / 2);
  },

  update: function (dt) {
    if (this.flash) {
      this.flash.t -= dt;
      if (this.flash.t <= 0) this.flash = null;
    }
  },

  /* Brief pressed-state feedback for canvas buttons. */
  press: function (b) {
    if (this.reduceMotion) return;
    this.flash = { x: b.x, y: b.y, w: b.w, h: b.h, t: 0.14 };
  },

  toLogical: function (clientX, clientY) {
    var r = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left) / r.width * SC.W,
      y: (clientY - r.top) / r.height * SC.H
    };
  },

  loadImages: function (list, onProgress, onDone) {
    var total = list.length, done = 0, self = this;
    if (!total) { onDone(); return; }
    list.forEach(function (src) {
      var img = new Image();
      img.onload = img.onerror = function () {
        self.images[src] = img;
        done++;
        onProgress(done, total);
        if (done >= total) onDone();
      };
      img.src = src;
    });
  },

  img: function (src) { return this.images[src] || null; },

  /* ---------- drawing ---------- */

  font: function (px) { return px + 'px Spooky, "Trebuchet MS", sans-serif'; },

  text: function (str, x, y, px, color, align, outline) {
    var c = this.ctx;
    c.font = this.font(px);
    c.textAlign = align || 'center';
    c.textBaseline = 'middle';
    if (outline !== false) {
      c.lineWidth = Math.max(2, px / 8);
      c.strokeStyle = 'rgba(10,4,18,0.9)';
      c.strokeText(str, x, y);
    }
    c.fillStyle = color || '#f5e6c8';
    c.fillText(str, x, y);
  },

  panel: function (x, y, w, h, fill) {
    var c = this.ctx;
    c.fillStyle = fill || 'rgba(20,10,30,0.92)';
    c.strokeStyle = '#c9a86a';
    c.lineWidth = 3;
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, 14);
    else c.rect(x, y, w, h);
    c.fill();
    c.stroke();
  },

  /* Button spec: {x,y,w,h,label,sub,disabled,small}. Drawn + hit-tested. */
  button: function (b, hover) {
    var c = this.ctx;
    var pressed = this.flash && !b.disabled &&
      this.flash.x === b.x && this.flash.y === b.y &&
      this.flash.w === b.w && this.flash.h === b.h;
    /* Named colorways: default (orange), green, gold, teal, red. */
    var tones = {
      green: { base: '#2a7a38', hover: '#359846', pressed: '#123f1c', edge: '#7ce28a' },
      gold:  { base: '#7a5a00', hover: '#a37e00', pressed: '#4a3a00', edge: '#ffd76a' },
      teal:  { base: '#0f5a52', hover: '#178074', pressed: '#083230', edge: '#6fe3d4' },
      red:   { base: '#7a1f1f', hover: '#a32e2e', pressed: '#4a1212', edge: '#ff9a7a' }
    };
    var tone = tones[b.tone] || { base: '#7a2e00', hover: '#a33d00',
      pressed: '#4a1c00', edge: '#ff8c2e' };
    var fill = b.disabled ? '#3a2a3a' :
      (pressed ? tone.pressed : (hover ? tone.hover : tone.base));
    c.fillStyle = fill;
    c.strokeStyle = b.disabled ? '#6a5a6a' : tone.edge;
    c.lineWidth = 3;
    c.beginPath();
    if (c.roundRect) c.roundRect(b.x, b.y, b.w, b.h, 12);
    else c.rect(b.x, b.y, b.w, b.h);
    c.fill();
    c.stroke();
    var ly = b.sub ? b.y + b.h / 2 - 12 : b.y + b.h / 2;
    this.text(b.label, b.x + b.w / 2, ly, b.small ? 22 : 28,
      b.disabled ? '#9a8a9a' : '#ffe9c4');
    if (b.sub) {
      this.text(b.sub, b.x + b.w / 2, b.y + b.h / 2 + 16, 20,
        b.disabled ? '#8a7a8a' : '#ffc46a');
    }
  },

  hit: function (b, x, y) {
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  },

  /* Hit test with an expanded touch area (logical px) for small targets. */
  hitSlop: function (b, x, y, slop) {
    var s = slop || 0;
    return x >= b.x - s && x <= b.x + b.w + s && y >= b.y - s && y <= b.y + b.h + s;
  }
};

/* Haptics: guarded vibration for taps/purchases. No-op where unsupported. */
SC.haptic = function (ms) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {}
};

/* Short crossfade between screens. Skipped under reduced motion. */
SC.Transition = {
  t: 0, dur: 0.18, active: false,
  kick: function () {
    if (SC.UI.reduceMotion) { this.active = false; return; }
    this.t = 0;
    this.active = true;
  },
  update: function (dt) {
    if (!this.active) return;
    this.t += dt;
    if (this.t >= this.dur) this.active = false;
  },
  draw: function () {
    if (!this.active) return;
    var k = 1 - this.t / this.dur; /* 1 -> 0 */
    var c = SC.UI.ctx;
    c.save();
    c.globalAlpha = Math.max(0, k) * 0.55;
    c.fillStyle = '#0d0716';
    c.fillRect(0, 0, SC.W, SC.H);
    c.restore();
  }
};

/* ---------- floating combat-text style popups ---------- */
SC.Popups = {
  list: [],
  add: function (str, x, y, color, big) {
    this.list.push({ str: str, x: x, y: y, color: color || '#ffd76a',
      t: 0, dur: big ? 1.6 : 1.1, big: !!big });
  },
  update: function (dt) {
    for (var i = this.list.length - 1; i >= 0; i--) {
      this.list[i].t += dt;
      if (this.list[i].t >= this.list[i].dur) this.list.splice(i, 1);
    }
  },
  draw: function () {
    for (var i = 0; i < this.list.length; i++) {
      var p = this.list[i];
      var k = p.t / p.dur;
      SC.UI.text(p.str, p.x, p.y - k * 70, p.big ? 40 : 30, p.color);
    }
  },
  clear: function () { this.list = []; }
};

/* ---------- particles (bubbles, smoke, blast frames) ---------- */
SC.Particles = {
  list: [],
  spawnBubble: function (x, y) {
    if (SC.UI.reduceMotion) return;
    this.list.push({ kind: 'img', src: 'assets/bubble.png',
      x: x + (Math.random() * 60 - 30), y: y, vx: (Math.random() * 40 - 20),
      vy: -(60 + Math.random() * 80), t: 0, dur: 0.9, size: 20 + Math.random() * 22 });
  },
  spawnSmoke: function (x, y) {
    if (SC.UI.reduceMotion) return;
    this.list.push({ kind: 'img', src: 'assets/smoke.png',
      x: x + (Math.random() * 40 - 20), y: y - 10, vx: 0, vy: -90,
      t: 0, dur: 0.7, size: 60 });
  },
  spawnBlast: function (x, y) {
    if (SC.UI.reduceMotion) return;
    this.list.push({ kind: 'blast', x: x, y: y, t: 0, dur: 0.8, size: 150 });
  },
  spawnDrop: function (itemId, x, y) {
    var img = null;
    for (var i = 0; i < SC.ITEMS.length; i++) {
      if (SC.ITEMS[i].id === itemId) img = SC.ITEMS[i].img;
    }
    this.list.push({ kind: 'img', src: img, x: x, y: y - 40,
      vx: (Math.random() * 240 - 120), vy: -(280 + Math.random() * 140),
      t: 0, dur: 1.1, size: 64, gravity: 500 });
  },
  update: function (dt) {
    for (var i = this.list.length - 1; i >= 0; i--) {
      var p = this.list[i];
      p.t += dt;
      if (p.t >= p.dur) { this.list.splice(i, 1); continue; }
      if (p.vx !== undefined) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.gravity) p.vy += p.gravity * dt;
      }
    }
  },
  draw: function () {
    var c = SC.UI.ctx;
    for (var i = 0; i < this.list.length; i++) {
      var p = this.list[i];
      var k = p.t / p.dur;
      c.save();
      c.globalAlpha = 1 - k;
      if (p.kind === 'blast') {
        var frame = Math.min(28, 1 + Math.floor(k * 28));
        var img = SC.UI.img('assets/boom-' + (frame < 10 ? '0' : '') + frame + '.png');
        if (img) c.drawImage(img, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        var im = p.src ? SC.UI.img(p.src) : null;
        if (im) c.drawImage(im, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      c.restore();
    }
  },
  clear: function () { this.list = []; }
};

/* ---------- achievement banner queue ---------- */
SC.Banners = {
  queue: [],
  current: null,
  push: function (achId, reward) {
    var name = '';
    for (var i = 0; i < SC.ACHIEVEMENTS.length; i++) {
      if (SC.ACHIEVEMENTS[i].id === achId) name = SC.ACHIEVEMENTS[i].name;
    }
    this.queue.push({ name: name, reward: reward, t: 0, dur: 2.6 });
  },
  /* Generic announcement banner (rebirth, daily, welcome-back). */
  announce: function (title, sub) {
    this.queue.push({ name: title, sub: sub, reward: null, t: 0, dur: 2.6 });
  },
  update: function (dt) {
    if (!this.current) this.current = this.queue.shift() || null;
    if (this.current) {
      this.current.t += dt;
      if (this.current.t >= this.current.dur) this.current = null;
    }
  },
  draw: function () {
    if (!this.current) return;
    var b = this.current;
    var slide = Math.min(1, b.t / 0.3);
    var y = -90 + slide * 150;
    if (b.t > b.dur - 0.4) y -= (b.t - (b.dur - 0.4)) / 0.4 * 40;
    SC.UI.panel(340, y - 60, 600, 120, 'rgba(40,16,8,0.95)');
    var star = SC.UI.img('assets/star.png');
    if (star) SC.UI.ctx.drawImage(star, 360, y - 40, 64, 64);
    var isAnnounce = b.reward === null || typeof b.reward === 'undefined';
    SC.UI.text(isAnnounce ? b.name : 'Achievement Unlocked!', 660, y - 30, 26, '#ffc46a');
    SC.UI.text(isAnnounce ? (b.sub || '') : (b.name + '  +' + b.reward + ' skulls'),
      660, y + 12, 30, '#ffe9c4');
  },
  clear: function () { this.queue = []; this.current = null; }
};

/* Center-screen celebration splash (secret stash). Above world and modal. */
SC.Splash = {
  title: null, sub: null, t: 0, dur: 3.4,
  show: function (title, sub) {
    this.title = title;
    this.sub = sub || '';
    this.t = 0;
  },
  update: function (dt) {
    if (!this.title) return;
    this.t += dt;
    if (this.t >= this.dur) this.title = null;
  },
  draw: function () {
    if (!this.title) return;
    var U = SC.UI, c = U.ctx;
    var a = 1;
    if (this.t < 0.25 && !U.reduceMotion) a = this.t / 0.25;
    if (this.t > this.dur - 0.5) a = Math.min(a, (this.dur - this.t) / 0.5);
    c.save();
    c.globalAlpha = Math.max(0, a);
    U.panel(290, 255, 700, 170, 'rgba(40,16,8,0.95)');
    var star = U.img('assets/star.png');
    if (star) c.drawImage(star, 310, 300, 80, 80);
    U.text(this.title, 670, 305, 54, '#ff8c2e');
    U.text(this.sub, 670, 365, 34, '#ffd76a');
    c.restore();
  },
  clear: function () { this.title = null; }
};
