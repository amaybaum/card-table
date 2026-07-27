# The Card Table

**Live: https://amaybaum.github.io/card-table/**

A card game with no randomness in its rules — whose odds still behave like quantum
mechanics. Companion to *The Incompleteness of Observation*, book §1.11
(DOI 10.5281/zenodo.19060318).

Deal a card. A hidden burn card sits beside the deck. The only shuffle is a swap of the
two. One shuffle randomizes your card completely; two shuffles return it with certainty;
reasoning street-by-street says 50/50 and is wrong; peeking in the middle makes 50/50
right again. Then round two makes you the bookmaker, and mispricing the game costs you
chips at a rate exactly equal to the interference term. Stand up into the inspector's
seat at any point: every card face up, every step ledgered — there is no trick to find.
The honest boundary is stated on the page: no card game violates a Bell inequality; that
part belongs to the framework, not the toy.

## How this repo deploys

Pages is served by GitHub Actions: every push to `main` builds the Vite app and deploys
it (`.github/workflows/deploy.yml`). **To update the live site: edit `src/App.jsx`,
commit, push. Live in about two minutes.** Nothing to build or rename by hand.

## Layout

- `src/App.jsx` — the entire app. The game engine is the ~50 framework-free lines at
  the top, with a self-test at load asserting the odds table (1/2, 1, 1/2). Read it:
  there is no trick to find.
- `src/main.jsx`, `index.html`, `vite.config.js`, `package.json` — standard Vite
  scaffolding. `npm install && npm run dev` for local development with live reload.
- `tools/build_standalone.py` — optional: generates a single self-contained HTML file
  of the app (CDN React, in-browser Babel) for sharing by email or hosting anywhere
  without a build step. Not used by the deployed site.
