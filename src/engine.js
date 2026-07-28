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

export const NBINS = 25;
export const FRINGE = [16,11,0,19,50,30,0,42,96,53,0,59,120,59,0,53,96,42,0,30,50,19,0,11,16];
export const SLIT_L = [4,7,13,20,28,36,43,48,50,48,43,36,28,20,13,7,4,2,1,0,0,0,0,0,0];
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
/* THE LINE GAME — fringes under an envelope, all derived.             */
/* Two hidden cards per hand, each red or black, rank 1-4: red moves   */
/* the marker left, black right. EACH HIDDEN CARD ACTS TWICE (A,A,B,B) */
/* behind the dealer's screen. Screen = final marker position, -16..16.*/
/* Blind: displacement 2a+2b — odd positions are exact nodes (parity), */
/* and the two doubled cards ADD, so allowed positions pile into a     */
/* graded envelope. Peek (rule 3, at a hidden card between its two     */
/* moves) burns and replaces it: four INDEPENDENT moves — every bin    */
/* fills and the shape smooths toward a bell curve. Nothing engineered.*/
/* ------------------------------------------------------------------ */

export const LINE_S = [-4, -3, -2, -1, 1, 2, 3, 4];
export const LINE_LO = -16, LINE_HI = 16, LINE_N = 33;
export function dealLineHand(peek, rng) {
  const draw = () => LINE_S[Math.floor(rng() * 8)];
  const a = draw(), b = draw();
  if (!peek) {
    const d = 2 * a + 2 * b;
    return { d, peeked: false, moves: [a, a, b, b], cards: { a, b } };
  }
  const a2 = draw(), b2 = draw();
  const d = a + a2 + b + b2;
  return { d, peeked: true, moves: [a, a2, b, b2], cards: { a, b, a2, b2 } };
}
export function lineDist(peek) {             // exact enumeration, counts per bin
  const c = Array(LINE_N).fill(0);
  for (const a of LINE_S) for (const b of LINE_S) {
    if (!peek) c[2 * a + 2 * b - LINE_LO]++;
    else for (const a2 of LINE_S) for (const b2 of LINE_S) c[a + a2 + b + b2 - LINE_LO]++;
  }
  return c;
}
export const LINE_TEST = (() => {
  const bl = lineDist(false), pk = lineDist(true);
  const nodes = bl.filter((v, i) => (i + LINE_LO) % 2 !== 0 && v === 0).length;
  const heights = new Set(bl.filter((v) => v > 0)).size;
  const filled = pk.slice(1, -1).every((v) => v > 0) && pk[0] > 0 && pk[LINE_N - 1] > 0;
  return { nodes, heights, pass: nodes === 16 && heights >= 5 && filled };
})();
