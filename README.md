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

## This repository

- `index-standalone.html` — the entire app in one file (CDN React, in-browser Babel).
  For the live site above, it is uploaded renamed to `index.html`.
- `src/` + `vite.config.js` + `package.json` — the durable Vite version of the same
  component. `npm install && npm run dev` to develop; pushes to `main` deploy via
  `.github/workflows/deploy.yml` if Pages is set to "GitHub Actions".
- `tools/build_standalone.py` — the ONLY supported way to regenerate the standalone
  file from `src/App.jsx`. (A hand regeneration once injected literal `\n` into the
  script body and blanked the page; the script asserts against that.)

## Updating the live site

Edit `src/App.jsx` → `python3 tools/build_standalone.py` → upload the result to the
`card-table` repo renamed `index.html` → commit. Pages refreshes in ~1 minute.

The game engine is the ~50 framework-free lines at the top of `src/App.jsx`, with a
self-test at load asserting the odds table (1/2, 1, 1/2). Read it.
