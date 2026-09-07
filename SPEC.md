# Spooky Clicker 2026 — Spec (reverse-engineered from the v1.0.0 export)

Source: `data.js` (GDevelop 5.4.217 project data), `code0.js`–`code4.js`
(compiled events), resource table. All numbers below are verbatim from the
original unless marked `(2026 polish)`.

## Canvas

- Logical resolution 1280x720, landscape, scaled to fit viewport.
- Screens: Game, Collection, Achievements, Skins, Store. (Leaderboard was
  empty in the original and is cut.)

## Core tap loop (Game screen)

- Tap cauldron: ClickCounter+1, shake + bubble-pop sound, smoke puff.
- Roll `randomInRange(0, 100)`; on exact match an item drops and is
  collected for LootAmount (1; 2 with StrongerBrews):

| Item | Roll | Sprite |
|---|---|---|
| BrainCake | 10 | 37.png |
| ZombieHand | 38 | 35.png |
| WitchHat | 43 | 34.png |
| Candies | 50 | 18.png |
| TreatBag | 53 | 5.png |
| Pumpkin | 62 | 2.png |
| Lolipop | 78 | 15.png |
| JackOLantern | 80 | 11a.png |
| JackPops | 87 | 22.png |
| FakeTeeth | 99 | 33.png |

- Any other roll: no drop (bubbles/smoke only).

## Exchange (Collection screen)

- Click an item: trade its whole stack for skulls 1:1. Zero stacks grant nothing.
- Sell All button (visible only with the Sell All perk): trades every stack.
- Full Set button: one of every item for 10 skulls + 25 bonus (counts one
  set toward Full Menu!).
- Item display names use the table above ("Lolipop" spelling kept).

## Skull sources

- Item exchange (1:1), LuckyGhost click (+20), SpookyEyes click (+20),
  SkullDropper perk (auto +1 per interval), achievement rewards.

## Bonuses

- LuckyGhost: every 20s arm a spawn with random 1–19s delay; ghost drifts
  down; click → explosion + pop sound + 20 skulls; despawns at the bottom.
- SpookyEyes: every 30s appears (top-right area), fades over ~2s; click
  while visible → +20 skulls and a "+20 Skulls" popup.
- Hidden spooks: cat → meow; pumpkin → evil laugh (flavor, no reward).
- Secret stash (easter egg, once ever): touch the cat, the pumpkin, and the
  HUD skull in any order → center-screen "Happy Halloween! Secret Stash
  Found! +500 Skulls" splash and a 500-skull grant (`state.secret`
  persists the claim).

## Achievements (one-shot each, checked on every grant)

| # | Name | Trigger | Reward |
|---|---|---|---|
| 1 | It's a Start! | 100 clicks | +10 |
| 2 | Getting Somewhere! | 300 clicks | +20 |
| 3 | Starting to Bubble! | 500 clicks | +50 |
| 4 | Brew Master! | 1000 clicks | +75 |
| 5 | Spooky Clickah! | 2000 clicks | +100 |
| 6 | Mad Scientist! | 5000 clicks | +200 |
| 7 | EZ Win! | own Auto Clicker | +50 |
| 8 | Cauldron Fashionista! | own all 6 skins | +500 |
| 9 | Gravedigger! | 5000 skulls collected | +800 |
| 10 | Hot Hands! | catch streak x10 | +100 |
| 11 | Combo Cook! | tap combo x50 | +100 |
| 12 | Born Again! | rebirth once (pays as starter skulls) | +250 |
| 13 | Full Menu! | trade a full 10-item set | +150 |

## Store (skull prices, one-time purchases)

| Perk | Cost | Effect |
|---|---|---|
| Auto Clicker | 25 | taps automatically every 2s (enable in settings) |
| T1 Auto Clicker | 50 | every 1s (requires Auto Clicker) |
| T2 Auto Clicker | 100 | every 0.5s (requires T1) |
| Stronger Brews | 200 | LootAmount 1 → 2 |
| Sell All | 100 | adds Sell All button to Collection |
| Skull Dropper | 300 | +1 skull auto-collected every 5s |
| T1 Skull Dropper | 500 | every 2s (requires Skull Dropper) |
| Frenzy Brew (repeatable) | 300 | 2x loot drops for 60s; rebuying extends |

## Skins (cauldron appearance)

Basic (default) + Ruby 50, Lapis 100, Emerald 250, Topaz 500,
Amethyst 1000, Pumpkin 2500. Buy with skulls, then select to activate.
Settings has a reset-to-Basic button.

## Settings

- Auto Clicker On/Off toggle (default Off), volume slider (default 70),
  reset skin button. Music loops after first user gesture.

## Save model (`localStorage`, key `spooky-clicker-2026`)

`{ loot: {10 items}, skulls, clicks, lootAmount, perks: {…},
skinsOwned: {…}, currentSkin, achievements: {1..9: bool},
autoClickerOn, volume }`. Saved on every change (debounced).

## Modernization pass (post-1.0.0)

- HiDPI: canvas backing store scales to `devicePixelRatio` (cap 2);
  logical space stays 1280x720 (`js/ui.js`).
- Touch: enlarged hit areas (gear, back, ghost, eyes, falling skulls),
  pressed-state flash on canvas buttons, haptics via `navigator.vibrate`.
- Game feel: 5% crit taps (+5 skulls, orange glow + squash), manual-tap
  combo (milestone every 25 taps: +10 skulls), 0.18s crossfade between
  screens, HUD shows the next goal (`SC.nextGoal`).
- Dropper catch streak: tapping falling skulls by hand builds a streak
  (teal "Skulls xN" over the cauldron); every 5th consecutive catch pays
  a bonus equal to the streak. A skull that lands unclicked still pays +1
  but resets the streak.
- Onboarding: removed — instructions live on the screens themselves
  (Collection/Store subtitles, HUD next-goal line).
- Retention: offline earnings (skull dropper + auto-clicker expected value,
  capped at 8h, welcome-back banner), daily streak rewards
  (25/50/75/100/150/250/400, local-midnight), Rebirth prestige in the Store
  (requires 5000 lifetime skulls; +25% batch skulls per level, faster
  droppers; resets the run, keeps skins/achievements/history).
- Settings: separate Music ON/OFF (`state.mutedMusic`, persisted) alongside
  the SFX volume slider.
- Audio: WebAudio SFX buffers with `<audio>` fallback; music stays a
  streaming loop. Volumes are separate gains. The secret-stash skull plays
  a synthesized two-bell chime (E5→B5), no asset needed. Per-sound trims
  (`Audio.trims`) can soften individual effects; the collect sound plays
  at 0.4.
- Saves: versioned envelope `{v:2, savedAt, state}` under the same
  `spooky-clicker-2026` key; v1 raw saves migrate (played saves skip the
  tutorial). `lastSeen` powers offline earnings.
- PWA: `manifest.webmanifest` + `sw.js` (precached shell, runtime cache),
  theme-color, icons, safe-area padding.
- Navigation: bottom tab bar on every screen (Brew, Loot, Goals, Skins,
  Store, Settings) with icons, active highlight, loot count on Loot and an
  affordability dot on Store; keyboard 1–6 mirrors the tabs.
- Accessibility: keyboard play (Space/Enter tap, 1–6 tabs, Esc back),
  `#live` ARIA-live announcements, reduced-motion skips shake/particles/
  transitions/press-flash.

## Anti-bug rules (the 2026 fixes)

- Exactly one authoritative `grantTap()` / `grantSkulls()` path; rapid
  clicks can never double-grant (no per-frame edge triggers).
- Bonus actors (ghost, eyes) are removed synchronously on first click, so
  the same actor can never pay twice.
- Achievements are boolean flags evaluated idempotently; rewards granted once.
