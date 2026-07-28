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

- `src/engine.js` — the entire game physics (~80 framework-free lines), exact and
  auditable. `src/App.jsx` is only the interface.
- `src/engine.test.js` — unit tests: the odds table proven exhaustively (no statistics),
  swap involution, determinism, fringe nodes, and every hidden integer of the slit
  samplers audited against the tables. `npm test` runs them; the deploy workflow runs
  them before every build, so a failing test blocks deployment.
- `src/main.jsx`, `index.html`, `vite.config.js`, `package.json` — standard Vite
  scaffolding. `npm install && npm run dev` for local development with live reload.
- `tools/build_standalone.py` — optional: generates a single self-contained HTML file
  of the app (CDN React, in-browser Babel) for sharing by email or hosting anywhere
  without a build step. Not used by the deployed site.
**Derived files**: `index-standalone.html` (offline single-file preview) is generated from `src/` by `tools/build_standalone.py` and is gitignored — never edit or commit it; regenerate it.
