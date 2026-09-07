/* Spooky Clicker 2026 — game data tables (see SPEC.md for provenance). */
'use strict';

var SC = SC || {};

SC.W = 1280;
SC.H = 720;
SC.SAVE_KEY = 'spooky-clicker-2026';

/* Tap loot table: exact roll of rand(0..100) drops the item. */
SC.ITEMS = [
  { id: 'braincake',   name: 'Brain Cake',    roll: 10, img: 'assets/item-braincake.png' },
  { id: 'zombiehand',  name: 'Zombie Hand',   roll: 38, img: 'assets/item-zombiehand.png' },
  { id: 'witchhat',    name: 'Witch Hat',     roll: 43, img: 'assets/item-witchhat.png' },
  { id: 'candies',     name: 'Candies',       roll: 50, img: 'assets/item-candies.png' },
  { id: 'treatbag',    name: 'Treat Bag',     roll: 53, img: 'assets/item-treatbag.png' },
  { id: 'pumpkin',     name: 'Pumpkin',       roll: 62, img: 'assets/item-pumpkin.png' },
  { id: 'lolipop',     name: 'Lolipop',       roll: 78, img: 'assets/item-lolipop.png' },
  { id: 'jackolantern',name: 'Jack-O-Lantern',roll: 80, img: 'assets/item-jackolantern.png' },
  { id: 'jackpops',    name: 'Jack Pops',     roll: 87, img: 'assets/item-jackpops.png' },
  { id: 'faketeeth',   name: 'Fake Teeth',    roll: 99, img: 'assets/item-faketeeth.png' }
];

SC.ACHIEVEMENTS = [
  { id: 1, name: "It's a Start!",       trigger: 'Tap 100 times',          reward: 10 },
  { id: 2, name: 'Getting Somewhere!',  trigger: 'Tap 300 times',          reward: 20 },
  { id: 3, name: 'Starting to Bubble!', trigger: 'Tap 500 times',          reward: 50 },
  { id: 4, name: 'Brew Master!',        trigger: 'Tap 1000 times',         reward: 75 },
  { id: 5, name: 'Spooky Clickah!',     trigger: 'Tap 2000 times',         reward: 100 },
  { id: 6, name: 'Mad Scientist!',      trigger: 'Tap 5000 times',         reward: 200 },
  { id: 7, name: 'EZ Win!',             trigger: 'Buy the Auto Clicker',   reward: 50 },
  { id: 8, name: 'Cauldron Fashionista!', trigger: 'Own all 6 skins',      reward: 500 },
  { id: 9, name: 'Gravedigger!',        trigger: 'Collect 5000 skulls',    reward: 800 },
  { id: 10, name: 'Hot Hands!',         trigger: 'Catch streak x10',       reward: 100 },
  { id: 11, name: 'Combo Cook!',        trigger: 'Tap combo x50',          reward: 100 },
  { id: 12, name: 'Born Again!',        trigger: 'Rebirth once',           reward: 250 },
  { id: 13, name: 'Full Menu!',         trigger: 'Trade a full item set',  reward: 150 }
];

SC.CLICK_THRESHOLDS = [100, 300, 500, 1000, 2000, 5000]; /* achievements 1..6 */

/* Store perks. interval: seconds between auto actions. */
SC.PERKS = [
  { id: 'autoclicker',  name: '1x Auto Clicker',      cost: 25,
    desc: 'Taps automatically every 2 seconds. Enable it in Settings.' },
  { id: 't1autoclicker',name: 'T1 Auto Clicker',      cost: 50, req: 'autoclicker',
    desc: 'Taps automatically every 1 second. Requires Auto Clicker.' },
  { id: 't2autoclicker',name: 'T2 Auto Clicker',      cost: 100, req: 't1autoclicker',
    desc: 'Taps automatically every 0.5 seconds. Requires T1 Auto Clicker.' },
  { id: 'strongerbrews',name: 'Stronger Brews',       cost: 200,
    desc: 'Your cauldron brews 2x items per drop instead of 1.' },
  { id: 'sellall',      name: 'Sell All',             cost: 100,
    desc: 'Adds a Sell All button to the Collection screen.' },
  { id: 'skulldropper', name: 'Skull Dropper',        cost: 300,
    desc: 'Every 5 seconds a skull falls into your cauldron.' },
  { id: 't1skulldropper', name: 'T1 Skull Dropper',   cost: 500, req: 'skulldropper',
    desc: 'A skull falls every 2 seconds. Requires Skull Dropper.' }
];

SC.SKIN_LIST = ['basic', 'ruby', 'lapis', 'emerald', 'topaz', 'amethyst', 'pumpkin'];

SC.SKINS = {
  basic:    { name: 'Basic',    cost: 0,    img: 'assets/cauldron-basic.png' },
  ruby:     { name: 'Ruby',     cost: 50,   img: 'assets/cauldron-ruby.png' },
  lapis:    { name: 'Lapis',    cost: 100,  img: 'assets/cauldron-lapis.png' },
  emerald:  { name: 'Emerald',  cost: 250,  img: 'assets/cauldron-emerald.png' },
  topaz:    { name: 'Topaz',    cost: 500,  img: 'assets/cauldron-topaz.png' },
  amethyst: { name: 'Amethyst', cost: 1000, img: 'assets/cauldron-amethyst.png' },
  pumpkin:  { name: 'Pumpkin',  cost: 2500, img: 'assets/cauldron-pumpkin.png' }
};

SC.AUTO_INTERVAL = 2;     /* base autoclicker seconds per tap */
SC.T1_AUTO_INTERVAL = 1;
SC.T2_AUTO_INTERVAL = 0.5;
SC.SKULL_INTERVAL = 5;    /* skull dropper seconds per skull */
SC.T1_SKULL_INTERVAL = 2;
SC.GHOST_CYCLE = 20;      /* seconds between ghost spawn windows */
SC.EYES_CYCLE = 30;       /* seconds between spooky-eyes appearances */
SC.BONUS_SKULLS = 20;     /* ghost + eyes click reward */
SC.GRAVEDIGGER_SKULLS = 5000;
