# The Card Table

**Live: https://amaybaum.github.io/card-table/**

Two experiments with no randomness in their rules — whose statistics still behave like
quantum mechanics. Companion to *The Incompleteness of Observation*, book §1.11
(DOI 10.5281/zenodo.19060318).

**The card table.** Two hidden cards are dealt from a Euchre deck — the 24 cards 9, 10, J, Q, K, A of a standard deck, counting by order (9 is 1, ace is 6); red suits
(♥♦) move a marker left, black (♠♣) right, by rank — and each card acts **twice**,
behind the dealer's screen. Played blind, the landing spots form stripes: 24 forbidden
positions the marker never reaches, under an envelope shaped by the deck's own make-up —
all of it derived from the stated rules, nothing engineered. Flip peek ON (each hidden
card is inspected between its two moves, burned, and replaced from the remaining deck)
and the stripes die: the forbidden positions fill in and the pile smooths toward a bell
curve — decoherence as the central limit theorem switching on. Even the outermost bins
are coherence-only: ±24 takes two same-colour aces acting in step, and no peeked hand
can get there.

**The double slit.** The same grammar at the same 49-bin resolution: fire one particle
or a thousand, toggle the slit detector, and watch fringes with exact nodes on every odd position collapse
into one smooth pile the moment a record of the path exists. Here the lookup tables are
*chosen* to equal the quantum prediction — and printed on the page; that such
deterministic tables exist at all is the framework's claim.

Everything is face-up: "hidden" means hidden from the player inside the game, not from
you. The patterns survive your seeing everything, because they depend only on whether
the game's own record exists (rule 3). The honest boundary is stated on the page: no
card game violates a Bell inequality; that part belongs to the framework, not the toy.

## How this repo deploys

Pages is served by GitHub Actions: every push to `main` runs the tests, builds the Vite
app, and deploys it (`.github/workflows/deploy.yml`). **To update the live site: edit
`src/`, commit, push. Live in about two minutes.** A failing test blocks deployment.

## Layout

- `src/engine.js` — the entire physics (~130 framework-free lines): the two-card swap
  core, the 52-card line game with exact enumeration over all ordered deals, and the
  slit tables with their samplers. Exact and auditable; a self-test runs at every page
  load and reports in the footer.
- `src/engine.test.js` — unit tests: all 552 blind deals verified exhaustively with
  the deck-order mapping mirrored; both 49-bin distributions checked bin-for-bin
  against independently computed ground truth; the coherence-only edge bins asserted;
  swap involution, determinism, symmetry, fringe nodes, and every hidden integer of the
  slit samplers audited. `npm test` runs them locally.
- `src/main.jsx`, `index.html`, `vite.config.js`, `package.json` — standard Vite
  scaffolding. `npm install && npm run dev` for local development with live reload.
- `tools/build_standalone.py` — generates `index-standalone.html`, a single
  self-contained file (CDN React, in-browser Babel) for sharing or offline use.
  That output is **derived and gitignored**: never edit or commit it; regenerate it.
  Not used by the deployed site.
