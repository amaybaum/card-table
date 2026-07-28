/* ================================================================== */
/* ENGINE — pure, exact. State (v, h): your card, the hidden card.     */
/* The only move is the swap (v, h) -> (h, v).                         */
/* ================================================================== */

export const swap = ([v, h]) => [h, v];

export function enumerate(protocol) {
  const cases = [];
  for (const v0 of [0, 1]) for (const h0 of [0, 1]) {
    if (protocol === "peek") {
      for (const h2 of [0, 1]) {
        const s1 = swap([v0, h0]); const s2 = swap([s1[0], h2]);
        cases.push(s2[0] === v0);
      }
    } else {
      const s1 = swap([v0, h0]);
      cases.push((protocol === "one" ? s1 : swap(s1))[0] === v0);
    }
  }
  const n = cases.filter(Boolean).length, d = cases.length;
  const g = (a, b) => (b ? g(b, a % b) : a || 1); const k = g(n, d);
  return { num: n / k || 0, den: n === 0 ? 1 : d / k };
}

export function dealHand(peek, rng) {
  const v0 = rng() < 0.5 ? 0 : 1, h0 = rng() < 0.5 ? 0 : 1;
  const t = [{ label: "deal", v: v0, h: h0 }];
  let [v, h] = swap([v0, h0]);
  t.push({ label: "shuffle1", v, h });
  if (peek) { const seen = v; h = rng() < 0.5 ? 0 : 1; t.push({ label: "peek", v, h, peeked: seen }); }
  [v, h] = swap([v, h]);
  t.push({ label: "shuffle2", v, h });
  t.push({ label: "showdown", v, h });
  return { dealt: v0, final: v, match: v === v0, peeked: !!peek, trace: t };
}

export const SELF_TEST = [["one", 1, 2], ["two", 1, 1], ["peek", 1, 2]].map(([p, n, d]) => {
  const r = enumerate(p); return { p, got: `${r.num}/${r.den}`, pass: r.num === n && r.den === d };
});
export const ALL_PASS = SELF_TEST.every((t) => t.pass);
export const TEST_LABEL = { one: "1 shuffle", two: "2 shuffles", peek: "peeked" };

/* ------------------------------------------------------------------ */
/* DOUBLE SLIT — same species of engine, bigger hidden card.           */
/* A particle's landing bin is a deterministic lookup of one hidden    */
/* integer, drawn uniformly (the deal). The tables below were CHOSEN   */
/* to equal the quantum two-slit prediction; the framework's claim is  */
/* precisely that such deterministic tables exist. They sit here,      */
/* auditable. Detector ON = a record of the slit exists (rule 3):      */
/* each slit's own table is used instead, and the fringes die.         */
/* ------------------------------------------------------------------ */

export const NBINS = 49;
export const FRINGE = [11, 0, 16, 0, 23, 0, 31, 0, 42, 0, 53, 0, 66, 0, 79, 0, 92, 0, 103, 0, 112, 0, 118, 0, 120, 0, 118, 0, 112, 0, 103, 0, 92, 0, 79, 0, 66, 0, 53, 0, 42, 0, 31, 0, 23, 0, 16, 0, 11];
export const SLIT_L = [6, 7, 8, 10, 11, 13, 16, 18, 21, 24, 27, 30, 33, 36, 40, 43, 46, 49, 52, 54, 56, 58, 59, 60, 60, 60, 59, 58, 56, 54, 52, 49, 46, 43, 40, 36, 33, 30, 27, 24, 21, 18, 16, 13, 11, 10, 8, 7, 6];
export const SLIT_R = SLIT_L.slice().reverse();
export function sampler(counts) {
  const total = counts.reduce((a, b) => a + b, 0);
  return (rng) => {                     // hidden integer -> bin, deterministic lookup
    let h = Math.floor(rng() * total);
    for (let x = 0; x < counts.length; x++) { h -= counts[x]; if (h < 0) return x; }
    return counts.length - 1;
  };
}
export const fireBlind = sampler(FRINGE), fireL = sampler(SLIT_L), fireR = sampler(SLIT_R);
export const SLIT_TEST = (() => {
  const nodes = FRINGE.filter((v, x) => v === 0 && x > 1 && x < NBINS - 2).length;
  const filled = SLIT_L.every((v, x) => (x > 2 && x < NBINS - 3 ? v + SLIT_R[x] > 0 : true));
  return { nodes, pass: nodes >= 4 && filled };
})();



/* ------------------------------------------------------------------ */
/* THE LINE GAME, on a Euchre deck: the 24 cards 9,10,J,Q,K,A of a     */
/* standard deck. Two hidden cards are DEALT (without replacement).    */
/* Cards count by their order (9=1 .. A=6); red suits move the marker  */
/* left, black right, by that count.                                   */
/* EACH CARD ACTS TWICE (A,A,B,B) behind the dealer's screen; screen = */
/* final marker position, -24..+24. Blind: displacement 2a+2b — 24     */
/* exact odd nodes under an 11-height envelope shaped by the deck's    */
/* own make-up. Peek (rule 3, between a card's two moves) burns it;    */
/* the replacement comes from the REMAINING deck — so the outermost    */
/* bins (\u00b124, two same-colour aces in step) are reachable ONLY      */
/* without measurement.                                                */
/* ------------------------------------------------------------------ */

export const SUITS = ["\u2660", "\u2665", "\u2666", "\u2663"];
export const FACES = ["9", "10", "J", "Q", "K", "A"];   // Euchre order; counts 1..6
export const CARDS = [];
for (let v = 1; v <= 6; v++)
  for (let si = 0; si < 4; si++) {
    const red = si === 1 || si === 2;
    CARDS.push({ face: FACES[v - 1], v, s: SUITS[si], m: red ? -v : v });
  }
export const cardLabel = (c) => `${c.face}${c.s}`;
export const LINE_LO = -24, LINE_HI = 24, LINE_N = 49;
function drawFrom(avail, rng) { const k = Math.floor(rng() * avail.length); return avail.splice(k, 1)[0]; }
export function dealLineHand(peek, rng) {
  const avail = CARDS.map((_, i) => i);
  const A = CARDS[drawFrom(avail, rng)], B = CARDS[drawFrom(avail, rng)];
  if (!peek) return { d: 2 * A.m + 2 * B.m, peeked: false, cards: { a: A, b: B } };
  const A2 = CARDS[drawFrom(avail, rng)], B2 = CARDS[drawFrom(avail, rng)];
  return { d: A.m + A2.m + B.m + B2.m, peeked: true, cards: { a: A, b: B, a2: A2, b2: B2 } };
}
export function lineDist(peek) {           // exact enumeration over ordered distinct deals
  const c = Array(LINE_N).fill(0), M = CARDS.map((x) => x.m), n = 24;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (j === i) continue;
    if (!peek) { c[2 * M[i] + 2 * M[j] - LINE_LO]++; continue; }
    const base = M[i] + M[j];
    for (let k = 0; k < n; k++) {
      if (k === i || k === j) continue;
      for (let l = 0; l < n; l++) {
        if (l === i || l === j || l === k) continue;
        c[base + M[k] + M[l] - LINE_LO]++;
      }
    }
  }
  return c;
}
export const LINE_TEST = (() => {
  const bl = lineDist(false), pk = lineDist(true);
  const nodes = bl.filter((v, x) => (x + LINE_LO) % 2 !== 0 && v === 0).length;
  const heights = new Set(bl.filter((v) => v > 0)).size;
  const midFilled = pk.every((v, x) => (Math.abs(x + LINE_LO) <= 22 ? v > 0 : true));
  const edgesCoherent = bl[0] > 0 && bl[LINE_N - 1] > 0 && pk[0] === 0 && pk[LINE_N - 1] === 0;
  return { nodes, heights, pass: nodes === 24 && heights >= 8 && midFilled && edgesCoherent };
})();
