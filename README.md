# Spooky Clicker 2026

Launched on itch.io originally 2 years ago.

Optimized and rebuilt my 2023 version of Spooky Clicker which used the GDevelop engine before but since has been converted.

Tap the cauldron, collect spooky loot, trade it for skulls, and spend those on
upgrades that tap for you. It's a Halloween clicker that runs in any browser.
There's no account and no server involved, and once it's loaded the game works
offline. You can add it to a phone's home screen like any other app.

## How to play

Tap the cauldron. It bubbles, smokes, and shakes, and every so often a tap
drops a spooky item you can keep, one of ten different collectibles. Brain
Cake, Zombie Hand, Witch Hat, Candies, Treat Bags, Pumpkins... there's a whole
shelf of them.

Items pile up in the Loot tab. Click an item there and its whole stack trades
for skulls, one skull per item. The Sell All perk adds a button that clears
every stack at once. Or, if you've collected one of each of the ten, you can
trade a full set, which pays the usual skulls plus a 25-skull bonus and counts
toward the Full Menu! achievement.

The Store is where skulls go. Perks include Auto Clickers that tap for you at
a few speeds (turn them on in Settings), Stronger Brews, which makes items
drop in pairs, Sell All, Skull Droppers that rain skulls down the screen, and
Frenzy Brew, a 300-skull splurge that doubles drops for a minute and can be
extended by buying it again. There are also six extra cauldron skins to buy,
from Ruby to a carved Pumpkin, with the plain Basic pot as the starting look.

When your lifetime skulls pass 5,000, a Rebirth option shows up in the Store.
It starts the run over, but batches of 10 or more skulls pay 25% extra and
your droppers speed up, and each rebirth stacks that bonus. Skins,
achievements, and your lifetime history carry over. That's the long game: tap,
trade, upgrade, and eventually rebirth to do it all again with a head start.

## While you play

- One tap in about twenty is a crit and pays 5 extra skulls, with an orange
  flash and a quick squash of the cauldron.
- Keep tapping without long gaps and a combo counter builds over the
  cauldron; every 25th tap pays 10 skulls.
- Every twenty seconds or so a Lucky Ghost drifts down the screen. Click it
  before it sinks away and it bursts into 20 skulls.
- Spooky Eyes peek in at the window every so often and fade after a couple of
  seconds. Click them while they're visible for another 20.
- If you buy a Skull Dropper, skulls fall from the top of the screen. Catch
  them by hand for one skull each, and every fifth catch in a row pays a
  bonus equal to your streak. A skull that lands unclicked still counts, but
  it breaks the streak.
- There are a couple of hidden surprises if you click around the scene.
  Happy hunting.

## Reasons to come back

- Thirteen one-shot achievements pay skulls the first time you earn them,
  from It's a Start! at 100 clicks to Mad Scientist! at 5,000. The HUD keeps
  a small line showing which goal is closest.
- Come back each day and the daily bonus climbs from 25 to 400 skulls,
  resetting at local midnight.
- Close the tab and your droppers and auto clickers keep earning while you're
  away, up to 8 hours' worth. A banner tells you what you missed when you
  return.

## Your save

Progress saves itself automatically to your browser. There are no accounts,
nothing is uploaded anywhere, and each browser keeps its own save. Clearing
the site's data wipes it, which is also the way to start fresh if you ever
want to.

## Running it

There's no build step. Download the folder and double-click `index.html` and
the game starts. For offline support and the install-as-app part, serve the
folder over HTTP instead:

```
cd spooky-clicker-game
python3 -m http.server 8000
```

Then open http://localhost:8000. Any static file server works, including
VS Code's Live Server or `npx serve`.

## Hosting it

Upload the folder as-is to any static host: GitHub Pages, Netlify, itch.io,
or your own web space. For itch.io, zip the folder contents and upload it as
an HTML game. There's nothing to compile, so the same files work everywhere.

## What's in the folder

```
spooky-clicker-game/
├── index.html            # the page that loads the game
├── style.css             # page styling and the loading screen
├── manifest.webmanifest  # lets browsers install it as an app
├── sw.js                 # makes the game work offline
├── js/
│   ├── data.js           # items, perks, skins, achievements
│   ├── state.js          # game rules and saving
│   ├── audio.js          # sound effects and music
│   ├── ui.js             # buttons, text, particles, banners
│   ├── screens.js        # each screen's drawing and logic
│   └── main.js           # startup and the game loop
├── assets/               # art, sounds, the font, app icons
├── SPEC.md               # the full design write-up, rule by rule
└── CHANGELOG.md          # what changed since the old version
```

## How it's built

Plain JavaScript drawing to an HTML5 canvas. No frameworks, no libraries, no
build step: the files load in order from `index.html` and a game loop drives
everything. Offline and install support come from the service worker and
manifest, which is the standard way browsers handle that.

## Where it came from

Spooky Clicker 2026 is a from-scratch rewrite of an older clicker game that
was originally made in GDevelop. The old project's rules were written down in
SPEC.md, then the game was rebuilt as plain canvas JavaScript with modern
touches added along the way: touch controls, offline earnings, rebirth, the
bottom tab bar, and app-install support. CHANGELOG.md tracks what changed and
why.
