# Spooky Clicker 2026 changelog

Spooky Clicker 2026 is a from-scratch rebuild of an older clicker game that
was made in GDevelop. So this log isn't version history of the same code;
it's the list of what the rebuild changed compared to the original game. The
full rulebook lives in SPEC.md.

## Tap feel

- One tap in about twenty is a crit and pays 5 extra skulls, with an orange
  flash and a quick squash of the cauldron.
- Taps that land within a second and a half of each other build a combo over
  the cauldron. Every 25th tap pays 10 extra skulls.
- The screen shakes, the pot puffs smoke and bubbles, each drop has its own
  sound, and achievements play a small fanfare.
- Fixed a draw-order bug where smoke, bubbles, and floating popups could
  render on top of the open Settings panel. They stay behind it now.

## Things you can catch

- Lucky Ghost floats down the screen every twenty seconds or so. Catch it
  before it leaves and it bursts into 20 skulls.
- Spooky Eyes peek in near the window every thirty seconds or so and fade
  after a moment. Click them while they're visible for another 20.
- If you own a Skull Dropper, skulls fall from the top of the screen.
  Catching them by hand builds a streak, and every fifth catch pays a bonus
  equal to the streak. A skull that lands without a click still gives you
  1 skull, but it resets the streak.

## Achievements and daily rewards

- Thirteen one-shot achievements, each paying skulls the first time you earn
  it. The click-count milestones run from "It's a Start!" (100 taps) to
  "Mad Scientist!" (5,000 taps); "EZ Win!" rewards your first Auto Clicker,
  "Cauldron Fashionista!" rewards owning every skin, and "Gravedigger!"
  rewards 5,000 skulls collected. Four are new to this version: "Hot Hands!"
  (a 10-catch streak), "Combo Cook!" (a 50-tap combo), "Born Again!" (your
  first rebirth), and "Full Menu!" (trading a complete set).
- A small HUD line always shows the goal that's closest, whether that's the
  next achievement or a rebirth you've finally earned enough for.
- Daily streak rewards climb from 25 to 400 skulls and roll over at local
  midnight.
- Offline earnings: when the game is closed, your droppers and auto clickers
  keep earning, up to 8 hours' worth, and a banner shows what you missed when
  you come back.

## Store, skins, and rebirth

- Auto Clickers come in three tiers, tapping every 2, 1, or 0.5 seconds.
  They're switched on from Settings.
- Stronger Brews doubles the items each drop gives you. Sell All clears every
  stack in one click. Skull Droppers rain a skull every 5 seconds, or every 2
  with the T1 upgrade.
- Frenzy Brew costs 300 skulls and doubles drops for 60 seconds. Buying it
  again while it's running extends the timer instead of wasting it.
- The Loot tab can trade a full set, one of each of the ten items, for the
  usual skulls plus a 25-skull bonus.
- Rebirth unlocks at 5,000 lifetime skulls. It resets the run, and each
  rebirth makes batches of 10 or more skulls pay 25% extra and speeds up the
  droppers. Skins, achievements, and your history carry over. Small drops
  stay exact; the bonus only touches batches, by design.
- Six new cauldron skins: Ruby (50), Lapis (100), Emerald (250), Topaz (500),
  Amethyst (1,000), and Pumpkin (2,500). Basic is the free pot you start
  with, and Settings can put you back on it any time.

## Getting around

- The side buttons and per-screen back buttons are gone. Every screen now has
  one bottom bar: Brew, Loot, Goals, Skins, Store, Settings. The Loot tab
  shows how many items you're holding, and the Store tab gets a dot when you
  can afford something in it.
- Keyboard play: Space or Enter taps, 1 through 6 switch screens, Esc goes
  back.
- Screens crossfade into one another, unless you've asked for reduced motion.
- The cauldron used to hover slightly above the floor; it's now anchored by
  its painted base so it sits right on the wall/floor seam.

## Sound and settings

- A volume slider for sound effects (default 70) and a separate Music
  on/off switch that remembers itself.
- Effects play through WebAudio where the browser supports it and fall back
  to ordinary audio elements elsewhere. The music track streams in a loop
  and starts after your first tap or click, which is also when browsers
  allow it to.
- The collect sound plays at 40% of its volume so it doesn't grate over time;
  the achievement fanfare stays at full.
- Phones that support it vibrate briefly on taps and purchases.

## Accessibility and display

- Everything is reachable with a keyboard, screen readers get announcements
  of what's happening, and reduced motion turns off the shakes, particles,
  transitions, and button flash.
- The canvas renders sharply on high-density screens (it draws at up to 2x
  your display's pixel ratio and scales back down), and touch targets were
  enlarged for fingers.

## Saves, offline, and installing it

- Progress saves automatically after every change, on a short delay so it
  doesn't fire constantly. Saves are versioned, and old saves from the first
  build migrate over cleanly. Everything lives in your browser under the
  `spooky-clicker-2026` storage key and never leaves your device.
- When the game is served over http(s), it registers a service worker and a
  web manifest, so after the first visit it opens without a connection and
  browsers offer to install it like an app. Double-clicking `index.html`
  works for playing, but this part needs a real web server.

## Tried and removed

- A tutorial popup on the first screen. The screens explain themselves, so it
  didn't last.
- Save export/import buttons in Settings. They were in for a while, then
  removed.

Rebuilt from the original game by DevTarlow.
