/* Spooky Clicker 2026 — pure game state & rules. No DOM access here. */
'use strict';

var SC = SC || {};

SC.SAVE_VERSION = 2;
SC.OFFLINE_CAP_HOURS = 8;   /* max offline earnings window */
SC.PRESTIGE_SKULLS = 5000;  /* lifetime skulls needed to rebirth */
SC.PRESTIGE_BONUS = 0.25;   /* +25% skull rewards (batches of 10+) per level */
SC.CRIT_CHANCE = 0.05;
SC.CRIT_SKULLS = 5;
SC.COMBO_WINDOW = 1.5;      /* seconds between taps to keep a combo */
SC.COMBO_MILESTONE = 25;
SC.COMBO_REWARD = 10;
SC.DROP_MILESTONE = 5;      /* every Nth consecutive caught skull pays bonus */
SC.SET_BONUS = 25;            /* extra skulls for trading a full 10-item set */
SC.FRENZY_COST = 300;         /* skull price of one Frenzy Brew */
SC.FRENZY_TIME = 60;          /* seconds of 2x loot drops per brew */
SC.SECRET_REWARD = 500;       /* once-ever secret-stash payout */
/* Bonus skulls for catching the streak-th falling skull (0 off-milestone). */
SC.dropBonus = function (streak) {
  return (streak > 0 && streak % SC.DROP_MILESTONE === 0) ? streak : 0;
};
SC.DAILY_TABLE = [25, 50, 75, 100, 150, 250, 400]; /* streak day 1..7 (7th repeats) */

/* Notify hook: UI layer assigns SC.notify = function(type, data){}. */
SC.notify = null;
function scEmit(type, data) {
  if (typeof SC.notify === 'function') {
    try { SC.notify(type, data); } catch (e) { /* UI errors must not break rules */ }
  }
}

SC.newState = function () {
  var loot = {};
  for (var i = 0; i < SC.ITEMS.length; i++) loot[SC.ITEMS[i].id] = 0;
  var perks = {};
  for (var j = 0; j < SC.PERKS.length; j++) perks[SC.PERKS[j].id] = false;
  var skins = { basic: true };
  var sk = SC.SKIN_LIST;
  for (var k = 0; k < sk.length; k++) if (!(sk[k] in skins)) skins[sk[k]] = false;
  var ach = {};
  for (var a = 1; a <= 13; a++) ach[a] = false;
  return {
    loot: loot,
    skulls: 0, skullsTotal: 0,
    clicks: 0,
    bestCombo: 0, bestDropStreak: 0, setsTraded: 0, frenzyT: 0,
    secret: { cat: false, pumpkin: false, skull: false, found: false },
    lootAmount: 1,
    perks: perks,
    skins: skins, skin: 'basic',
    ach: ach,
    autoOn: false,
    volume: 70,
    mutedMusic: false,
    prestige: 0,
    lastSeen: 0,
    lastDaily: null,
    dailyStreak: 0,
    tutorial: 0 /* 0=new, 1=tapped, 2=traded, 3=done */
  };
};

/* Roll 0..100 inclusive; exact table match drops that item. */
SC.rollFor = function (roll) {
  for (var i = 0; i < SC.ITEMS.length; i++) {
    if (SC.ITEMS[i].roll === roll) return SC.ITEMS[i].id;
  }
  return null;
};

/* The single authoritative tap path. Returns the dropped item id or null.
   Pass auto=true for autoclicker taps (no tutorial/crit/combo credit). */
SC.tap = function (st, roll, auto) {
  st.clicks += 1;
  var r = (typeof roll === 'number') ? roll : Math.floor(Math.random() * 101);
  var item = SC.rollFor(r);
  if (item) st.loot[item] += st.lootAmount * (st.frenzyT > 0 ? 2 : 1);
  if (!auto && st.tutorial === 0) st.tutorial = 1;
  SC.checkAchievements(st);
  SC.saveSoon(st);
  return item;
};

/* Prestige multiplier for batch skull rewards (10+). Single +1 trickles
   stay exact; droppers speed up instead (see skullInterval). */
SC.prestigeMult = function (st) {
  return 1 + SC.PRESTIGE_BONUS * (st.prestige || 0);
};

/* The single authoritative skull-grant path. */
SC.grantSkulls = function (st, n, why) {
  if (!n || n <= 0) return 0;
  if (n >= 10 && st.prestige > 0) n = Math.round(n * SC.prestigeMult(st));
  st.skulls += n;
  st.skullsTotal += n;
  scEmit('skulls', { n: n, why: why });
  SC.checkAchievements(st);
  SC.saveSoon(st);
  return n;
};

/* Trade one item's whole stack 1:1. Returns skulls gained. */
SC.exchange = function (st, itemId) {
  var n = st.loot[itemId] || 0;
  if (n <= 0) return 0;
  st.loot[itemId] = 0;
  scEmit('sold', { item: itemId, count: n });
  if (st.tutorial < 2) st.tutorial = 2;
  return SC.grantSkulls(st, n, 'exchange');
};

/* Items of each kind held (0..10): progress toward a full-set trade. */
SC.setProgress = function (st) {
  var n = 0;
  for (var i = 0; i < SC.ITEMS.length; i++) {
    if ((st.loot[SC.ITEMS[i].id] || 0) > 0) n++;
  }
  return n;
};

/* Trade one of every item for 10 skulls + SET_BONUS. Returns skulls gained
   (0 without a complete set). Counts toward the Full Menu achievement. */
SC.tradeSet = function (st) {
  if (SC.setProgress(st) < SC.ITEMS.length) return 0;
  for (var i = 0; i < SC.ITEMS.length; i++) st.loot[SC.ITEMS[i].id] -= 1;
  st.setsTraded = (st.setsTraded || 0) + 1;
  var total = SC.ITEMS.length + SC.SET_BONUS;
  scEmit('sold', { item: 'set', count: total });
  if (st.tutorial < 2) st.tutorial = 2;
  return SC.grantSkulls(st, total, 'set');
};

/* Secret stash: pet the cat, poke the pumpkin, and tap the HUD skull in
   any order for a once-ever payout. Returns {status, granted} where status
   is 'piece', 'found', or 'done' (already claimed). */
SC.touchSecret = function (st, piece) {
  if (!st.secret || typeof st.secret !== 'object') {
    st.secret = { cat: false, pumpkin: false, skull: false, found: false };
  }
  if (st.secret.found) return { status: 'done', granted: 0 };
  st.secret[piece] = true;
  if (st.secret.cat && st.secret.pumpkin && st.secret.skull) {
    st.secret.found = true;
    var n = SC.grantSkulls(st, SC.SECRET_REWARD, 'secret');
    return { status: 'found', granted: n };
  }
  SC.saveSoon(st);
  return { status: 'piece', granted: 0 };
};

/* Repeatable skull sink: 60s of 2x loot drops. Buying while active extends.
   Returns 'ok' or 'poor'. */
SC.buyFrenzy = function (st) {
  if (st.skulls < SC.FRENZY_COST) return 'poor';
  st.skulls -= SC.FRENZY_COST;
  st.frenzyT = (st.frenzyT || 0) + SC.FRENZY_TIME;
  scEmit('bought', { kind: 'frenzy' });
  SC.saveSoon(st);
  return 'ok';
};

/* Trade every stack 1:1. Requires the Sell All perk. Returns skulls gained. */
SC.sellAll = function (st) {
  if (!st.perks.sellall) return 0;
  var total = 0, k;
  for (k in st.loot) { total += st.loot[k]; st.loot[k] = 0; }
  if (total > 0) scEmit('sold', { item: 'all', count: total });
  if (total > 0 && st.tutorial < 2) st.tutorial = 2;
  return SC.grantSkulls(st, total, 'sellall');
};

SC.perkDef = function (id) {
  for (var i = 0; i < SC.PERKS.length; i++) {
    if (SC.PERKS[i].id === id) return SC.PERKS[i];
  }
  return null;
};

/* Buy a perk. Returns 'ok', 'owned', 'locked' (missing prereq) or 'poor'. */
SC.buyPerk = function (st, id) {
  var def = SC.perkDef(id);
  if (!def) return 'missing';
  if (st.perks[id]) return 'owned';
  if (def.req && !st.perks[def.req]) return 'locked';
  if (st.skulls < def.cost) return 'poor';
  st.skulls -= def.cost;
  st.perks[id] = true;
  if (id === 'strongerbrews') st.lootAmount = 2;
  scEmit('bought', { kind: 'perk', id: id });
  st.tutorial = 3;
  SC.checkAchievements(st);
  SC.saveSoon(st);
  return 'ok';
};

/* Buy a skin with skulls. Returns 'ok', 'owned' or 'poor'. */
SC.buySkin = function (st, id) {
  if (!SC.SKINS[id]) return 'missing';
  if (st.skins[id]) return 'owned';
  if (st.skulls < SC.SKINS[id].cost) return 'poor';
  st.skulls -= SC.SKINS[id].cost;
  st.skins[id] = true;
  scEmit('bought', { kind: 'skin', id: id });
  st.tutorial = 3;
  SC.checkAchievements(st);
  SC.saveSoon(st);
  return 'ok';
};

SC.selectSkin = function (st, id) {
  if (!st.skins[id]) return false;
  st.skin = id;
  SC.saveSoon(st);
  return true;
};

SC.resetSkin = function (st) {
  st.skin = 'basic';
  SC.saveSoon(st);
};

/* Total loot items carried (Collection tab badge). */
SC.lootTotal = function (st) {
  var n = 0, k;
  for (k in st.loot) n += st.loot[k] || 0;
  return n;
};

/* True when any perk can be bought right now (Store tab dot). */
SC.storeHasAffordable = function (st) {
  for (var i = 0; i < SC.PERKS.length; i++) {
    var def = SC.PERKS[i];
    if (st.perks[def.id]) continue;
    if (def.req && !st.perks[def.req]) continue;
    if (st.skulls >= def.cost) return true;
  }
  return false;
};

SC.allSkinsOwned = function (st) {
  for (var i = 0; i < SC.SKIN_LIST.length; i++) {
    if (!st.skins[SC.SKIN_LIST[i]]) return false;
  }
  return true;
};

/* Idempotent: each achievement unlocks and pays exactly once. */
SC.checkAchievements = function (st) {
  var newly = [];
  var th = SC.CLICK_THRESHOLDS;
  var i;
  for (i = 0; i < th.length; i++) {
    if (!st.ach[i + 1] && st.clicks >= th[i]) {
      st.ach[i + 1] = true;
      newly.push(i + 1);
    }
  }
  if (!st.ach[7] && st.perks.autoclicker) { st.ach[7] = true; newly.push(7); }
  if (!st.ach[8] && SC.allSkinsOwned(st)) { st.ach[8] = true; newly.push(8); }
  if (!st.ach[9] && st.skullsTotal >= SC.GRAVEDIGGER_SKULLS) {
    st.ach[9] = true; newly.push(9);
  }
  if (!st.ach[10] && (st.bestDropStreak || 0) >= 10) { st.ach[10] = true; newly.push(10); }
  if (!st.ach[11] && (st.bestCombo || 0) >= 50) { st.ach[11] = true; newly.push(11); }
  if (!st.ach[12] && (st.prestige || 0) >= 1) { st.ach[12] = true; newly.push(12); }
  if (!st.ach[13] && (st.setsTraded || 0) >= 1) { st.ach[13] = true; newly.push(13); }
  for (i = 0; i < newly.length; i++) {
    var id = newly[i];
    var reward = 0;
    for (var j = 0; j < SC.ACHIEVEMENTS.length; j++) {
      if (SC.ACHIEVEMENTS[j].id === id) reward = SC.ACHIEVEMENTS[j].reward;
    }
    st.skulls += reward;
    st.skullsTotal += reward;
    scEmit('achievement', { id: id, reward: reward });
  }
  if (newly.length) SC.saveSoon(st);
  return newly;
};

/* Short human-readable next goal for the HUD. '' when fully complete. */
SC.nextGoal = function (st) {
  var th = SC.CLICK_THRESHOLDS;
  var names = SC.ACHIEVEMENTS;
  var i;
  for (i = 0; i < th.length; i++) {
    if (st.clicks < th[i]) {
      return 'Next: ' + names[i].name + ' — ' + (th[i] - st.clicks) + ' taps to go';
    }
  }
  if (!st.perks.autoclicker) return 'Next: EZ Win! — buy the Auto Clicker';
  var owned = 0;
  for (i = 0; i < SC.SKIN_LIST.length; i++) if (st.skins[SC.SKIN_LIST[i]]) owned++;
  if (owned < SC.SKIN_LIST.length) {
    return 'Next: Cauldron Fashionista! — ' + owned + '/' + SC.SKIN_LIST.length + ' skins';
  }
  if (st.skullsTotal < SC.GRAVEDIGGER_SKULLS) {
    return 'Next: Gravedigger! — ' + (SC.GRAVEDIGGER_SKULLS - st.skullsTotal) + ' skulls to go';
  }
  if (SC.canPrestige(st)) return 'Rebirth is ready in the Store!';
  return 'All goals complete!';
};

SC.autoInterval = function (st) {
  if (st.perks.t2autoclicker) return SC.T2_AUTO_INTERVAL;
  if (st.perks.t1autoclicker) return SC.T1_AUTO_INTERVAL;
  return SC.AUTO_INTERVAL;
};

SC.skullInterval = function (st) {
  var base = st.perks.t1skulldropper ? SC.T1_SKULL_INTERVAL : SC.SKULL_INTERVAL;
  if (st.prestige > 0) return Math.max(0.5, base / (1 + 0.1 * st.prestige));
  return base;
};

/* ---- prestige (rebirth): reset the run, keep cosmetics/history ---- */

SC.canPrestige = function (st) {
  return st.skullsTotal >= SC.PRESTIGE_SKULLS;
};

SC.prestigeBonusText = function (st) {
  var lvl = st.prestige || 0;
  if (!lvl) return 'No rebirth yet — +' + Math.round(SC.PRESTIGE_BONUS * 100) + '% skulls per rebirth';
  return 'Rebirth x' + lvl + ': +' + Math.round(lvl * SC.PRESTIGE_BONUS * 100) + '% skulls (10+ batches), faster droppers';
};

SC.prestige = function (st) {
  if (!SC.canPrestige(st)) return false;
  var keep = {
    skins: st.skins, skin: st.skin, ach: st.ach,
    volume: st.volume, mutedMusic: st.mutedMusic,
    lastDaily: st.lastDaily, dailyStreak: st.dailyStreak,
    prestige: (st.prestige || 0) + 1
  };
  var fresh = SC.newState();
  fresh.skins = keep.skins;
  fresh.skin = keep.skin;
  fresh.ach = keep.ach;
  fresh.volume = keep.volume;
  fresh.mutedMusic = keep.mutedMusic;
  fresh.lastDaily = keep.lastDaily;
  fresh.dailyStreak = keep.dailyStreak;
  fresh.prestige = keep.prestige;
  fresh.tutorial = 3;
  fresh.lastSeen = (typeof Date !== 'undefined') ? Date.now() : 0;
  var k;
  for (k in fresh) st[k] = fresh[k];
  scEmit('prestige', { level: st.prestige });
  SC.checkAchievements(st); /* Born Again! pays out as starter skulls */
  SC.flushSave(st);
  return true;
};

/* ---- offline earnings (pure estimate, then apply) ---- */

SC.offlineGains = function (st, elapsedSec) {
  var capped = Math.max(0, Math.min(elapsedSec, SC.OFFLINE_CAP_HOURS * 3600));
  var fromDropper = 0, fromAuto = 0, autoTaps = 0;
  if (st.perks.skulldropper && capped > 0) {
    fromDropper = Math.floor(capped / SC.skullInterval(st));
  }
  if (st.perks.autoclicker && st.autoOn && capped > 0) {
    autoTaps = Math.floor(capped / SC.autoInterval(st));
    /* Expected loot auto-sold 1:1: 10 exact-roll drops per 101 taps. */
    fromAuto = Math.floor(autoTaps * (10 / 101) * st.lootAmount);
  }
  return { seconds: Math.floor(capped), skulls: fromDropper + fromAuto,
    fromDropper: fromDropper, fromAuto: fromAuto, autoTaps: autoTaps };
};

SC.applyOffline = function (st, elapsedSec) {
  var g = SC.offlineGains(st, elapsedSec);
  if (g.skulls > 0) SC.grantSkulls(st, g.skulls, 'offline');
  return g;
};

/* ---- daily reward (local-midnight streak) ---- */

SC.dayKey = function (d) {
  d = d || new Date();
  var m = d.getMonth() + 1, day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
};

SC._midnight = function (key) {
  var p = String(key).split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
};

SC.dailyRewardFor = function (streak) {
  return SC.DAILY_TABLE[Math.max(1, Math.min(streak, SC.DAILY_TABLE.length)) - 1];
};

SC.dailyStatus = function (st, today) {
  today = today || SC.dayKey();
  if (st.lastDaily === today) return { claimable: false, streak: st.dailyStreak || 0, reward: 0 };
  var streak = 1;
  if (st.lastDaily) {
    var diff = Math.round((SC._midnight(today) - SC._midnight(st.lastDaily)) / 86400000);
    if (diff === 1) streak = (st.dailyStreak || 0) + 1;
  }
  return { claimable: true, streak: streak, reward: SC.dailyRewardFor(streak) };
};

SC.claimDaily = function (st, today) {
  var s = SC.dailyStatus(st, today);
  if (!s.claimable) return { streak: st.dailyStreak || 0, reward: 0, claimed: false };
  st.lastDaily = today || SC.dayKey();
  st.dailyStreak = s.streak;
  SC.grantSkulls(st, s.reward, 'daily');
  return { streak: s.streak, reward: s.reward, claimed: true };
};

/* ---- persistence: versioned envelope, migrates v1 raw saves ---- */

SC._saveTimer = null;

SC._merge = function (d) {
  var st = SC.newState();
  if (!d || typeof d !== 'object') return st;
  var k;
  if (d.loot) for (k in st.loot) if (typeof d.loot[k] === 'number') st.loot[k] = d.loot[k];
  if (typeof d.skulls === 'number') st.skulls = d.skulls;
  if (typeof d.skullsTotal === 'number') st.skullsTotal = d.skullsTotal;
  if (typeof d.clicks === 'number') st.clicks = d.clicks;
  if (d.lootAmount === 2) st.lootAmount = 2;
  if (d.perks) for (k in st.perks) st.perks[k] = d.perks[k] === true;
  if (d.skins) for (k in st.skins) st.skins[k] = d.skins[k] === true;
  if (d.skin && st.skins[d.skin]) st.skin = d.skin;
  if (d.ach) for (k = 1; k <= 13; k++) st.ach[k] = d.ach[k] === true;
  if (typeof d.bestCombo === 'number' && d.bestCombo > 0) st.bestCombo = Math.floor(d.bestCombo);
  if (typeof d.bestDropStreak === 'number' && d.bestDropStreak > 0) {
    st.bestDropStreak = Math.floor(d.bestDropStreak);
  }
  if (typeof d.setsTraded === 'number' && d.setsTraded > 0) st.setsTraded = Math.floor(d.setsTraded);
  if (typeof d.frenzyT === 'number' && d.frenzyT > 0) st.frenzyT = Math.min(3600, d.frenzyT);
  if (d.secret && typeof d.secret === 'object') {
    st.secret.cat = d.secret.cat === true;
    st.secret.pumpkin = d.secret.pumpkin === true;
    st.secret.skull = d.secret.skull === true;
    st.secret.found = d.secret.found === true;
  }
  st.autoOn = d.autoOn === true;
  if (typeof d.volume === 'number') st.volume = Math.max(0, Math.min(100, d.volume));
  st.mutedMusic = d.mutedMusic === true;
  if (typeof d.prestige === 'number' && d.prestige >= 0) st.prestige = Math.floor(d.prestige);
  if (typeof d.lastSeen === 'number') st.lastSeen = d.lastSeen;
  if (typeof d.lastDaily === 'string') st.lastDaily = d.lastDaily;
  if (typeof d.dailyStreak === 'number' && d.dailyStreak >= 0) {
    st.dailyStreak = Math.floor(d.dailyStreak);
  }
  if (typeof d.tutorial === 'number') st.tutorial = Math.max(0, Math.min(3, Math.floor(d.tutorial)));
  else if (typeof d.clicks === 'number' && d.clicks > 0) st.tutorial = 3; /* pre-tutorial save */
  return st;
};

SC.save = function (st) {
  try {
    var store = (typeof localStorage !== 'undefined') ? localStorage : null;
    if (!store) return false;
    st.lastSeen = (typeof Date !== 'undefined') ? Date.now() : 0;
    store.setItem(SC.SAVE_KEY, JSON.stringify({ v: SC.SAVE_VERSION, savedAt: st.lastSeen, state: st }));
    return true;
  } catch (e) {
    return false;
  }
};

SC.saveSoon = function (st) {
  if (typeof setTimeout === 'undefined') { SC.save(st); return; }
  if (SC._saveTimer) return;
  SC._saveTimer = setTimeout(function () {
    SC._saveTimer = null;
    SC.save(st);
  }, 400);
};

SC.flushSave = function (st) {
  if (SC._saveTimer && typeof clearTimeout !== 'undefined') {
    clearTimeout(SC._saveTimer);
    SC._saveTimer = null;
  }
  return SC.save(st);
};

SC.load = function () {
  try {
    var store = (typeof localStorage !== 'undefined') ? localStorage : null;
    if (!store) return SC.newState();
    var raw = store.getItem(SC.SAVE_KEY);
    if (!raw) return SC.newState();
    var d = JSON.parse(raw);
    if (d && typeof d === 'object' && d.state && typeof d.state === 'object') {
      return SC._merge(d.state); /* v2 envelope */
    }
    return SC._merge(d); /* v1 raw state */
  } catch (e) { /* corrupt save -> fresh state */ }
  return SC.newState();
};

/* Export/import for the Settings panel. Returns {ok, state} or {ok, error}. */
SC.exportSave = function (st) {
  var now = (typeof Date !== 'undefined') ? Date.now() : 0;
  return JSON.stringify({ v: SC.SAVE_VERSION, savedAt: now, state: st });
};

SC.importSave = function (text) {
  var d;
  try {
    d = JSON.parse(String(text));
  } catch (e) {
    return { ok: false, error: 'That is not valid save JSON.' };
  }
  var payload = (d && d.state && typeof d.state === 'object') ? d.state : d;
  if (!payload || typeof payload !== 'object' || !payload.loot ||
      typeof payload.skulls !== 'number' || typeof payload.clicks !== 'number') {
    return { ok: false, error: 'That JSON is not a Spooky Clicker save.' };
  }
  return { ok: true, state: SC._merge(payload) };
};
