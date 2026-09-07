/* Spooky Clicker 2026 — sound effects + music.
   WebAudio for SFX (separate gain from music), streaming <audio> for the
   music loop. Falls back to plain <audio> clones where WebAudio is missing. */
'use strict';

var SC = SC || {};

SC.Audio = {
  sounds: {},   /* fallback <audio> elements, also the buffer source list */
  buffers: {},  /* decoded WebAudio buffers by name */
  trims: { collect: 0.4 }, /* per-sound loudness multipliers */
  ctx: null,
  sfxGain: null,
  music: null,
  musicStarted: false,
  musicOn: true,
  volume: 70,

  init: function (volume, mutedMusic) {
    this.volume = (typeof volume === 'number') ? volume : 70;
    this.musicOn = mutedMusic !== true;
    var names = ['tap', 'pop', 'achievement', 'sell', 'buy',
                 'meow', 'laugh', 'ui', 'collect'];
    var self = this;
    /* Fallback elements work everywhere; upgraded to buffers below. */
    for (var i = 0; i < names.length; i++) {
      try {
        if (typeof Audio !== 'undefined') {
          var a = new Audio('assets/' + names[i] + '.mp3');
          a.preload = 'auto';
          this.sounds[names[i]] = a;
        }
      } catch (e) { /* audio unsupported: stay silent */ }
    }
    try {
      if (typeof Audio !== 'undefined') {
        this.music = new Audio('assets/music.mp3');
        this.music.preload = 'auto';
        this.music.loop = true;
      }
    } catch (e) { this.music = null; }
    /* WebAudio path: one context, one SFX gain node, fetch+decode each file. */
    try {
      var AC = (typeof window !== 'undefined') &&
        (window.AudioContext || window.webkitAudioContext);
      if (AC && typeof fetch !== 'undefined') {
        this.ctx = new AC();
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.connect(this.ctx.destination);
        names.forEach(function (name) {
          fetch('assets/' + name + '.mp3').then(function (res) {
            if (!res.ok) throw new Error('http ' + res.status);
            return res.arrayBuffer();
          }).then(function (buf) {
            return self.ctx.decodeAudioData(buf);
          }).then(function (decoded) {
            self.buffers[name] = decoded;
          }).catch(function () { /* keep <audio> fallback */ });
        });
      }
    } catch (e) { this.ctx = null; }
    this.applyVolume();
  },

  applyVolume: function () {
    var v = Math.max(0, Math.min(100, this.volume)) / 100;
    var k;
    for (k in this.sounds) {
      try { this.sounds[k].volume = v; } catch (e) {}
    }
    try {
      if (this.sfxGain && this.ctx) this.sfxGain.gain.value = v;
    } catch (e) {}
    if (this.music) {
      try { this.music.volume = v * 0.7; } catch (e) {}
    }
  },

  setVolume: function (v) {
    this.volume = Math.max(0, Math.min(100, v));
    this.applyVolume();
  },

  /* Separate music toggle; persisted by the caller in state.mutedMusic. */
  setMusicEnabled: function (on) {
    this.musicOn = !!on;
    if (!this.music) return;
    try {
      if (!on) {
        this.music.pause();
      } else if (this.musicStarted && this.music.paused) {
        var p = this.music.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      }
    } catch (e) {}
  },

  /* Signature chime for the secret-stash skull: two soft bell tones a
     fifth apart. Synthesized so it needs no asset file; falls back to
     'collect' where WebAudio is missing. */
  secret: function () {
    if (!this.ctx || !this.sfxGain) { this.play('collect'); return; }
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      var t0 = this.ctx.currentTime;
      this.bell(659.25, t0, 0.9);        /* E5 */
      this.bell(987.77, t0 + 0.16, 1.1); /* B5 */
    } catch (e) { this.play('collect'); }
  },

  bell: function (freq, when, dur) {
    var ctx = this.ctx;
    var osc = ctx.createOscillator();
    var shimmer = ctx.createOscillator();
    var out = ctx.createGain();
    var thin = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    shimmer.type = 'sine';
    shimmer.frequency.value = freq * 2.01;
    thin.gain.value = 0.25;
    out.gain.setValueAtTime(0.0001, when);
    out.gain.exponentialRampToValueAtTime(0.5, when + 0.02);
    out.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(out);
    shimmer.connect(thin);
    thin.connect(out);
    out.connect(this.sfxGain);
    osc.start(when);
    shimmer.start(when);
    osc.stop(when + dur + 0.05);
    shimmer.stop(when + dur + 0.05);
  },

  /* Clone-per-play so rapid taps overlap instead of cutting each other.
     Uses the decoded buffer when ready, else the <audio> fallback.
     Per-sound trims (see trims) apply on both paths. */
  play: function (name) {
    var trim = (this.trims && this.trims[name]) || 1;
    if (this.ctx && this.sfxGain && this.buffers[name]) {
      try {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        var src = this.ctx.createBufferSource();
        var g = this.ctx.createGain();
        g.gain.value = trim;
        src.buffer = this.buffers[name];
        src.connect(g);
        g.connect(this.sfxGain);
        src.start();
        return;
      } catch (e) { /* fall through to <audio> */ }
    }
    var s = this.sounds[name];
    if (!s) return;
    try {
      var c = s.cloneNode();
      c.volume = s.volume * trim;
      var p = c.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e) {}
  },

  /* Browsers require a user gesture before audio; call from pointerdown. */
  unlock: function (mutedMusic) {
    if (typeof mutedMusic === 'boolean') this.musicOn = !mutedMusic;
    try {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) {}
    if (!this.music || this.musicStarted) return;
    this.musicStarted = true;
    if (!this.musicOn) return;
    try {
      var p = this.music.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e) {}
  }
};
