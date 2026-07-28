import { describe, it, expect } from "vitest";
import { swap, enumerate, dealHand, dealLineHand, lineDist, CARDS, LINE_LO, LINE_N, LINE_TEST, NBINS, FRINGE, SLIT_L, SLIT_R,
         fireBlind, fireL, fireR, SELF_TEST, ALL_PASS, SLIT_TEST } from "./engine.js";

const script = (vals) => { let i = 0; return () => vals[i++]; };
const LO = 0.25, HI = 0.75; // deal a 0 / deal a 1

describe("the swap", () => {
  it("is an involution on all four states", () => {
    for (const v of [0, 1]) for (const h of [0, 1])
      expect(swap(swap([v, h]))).toEqual([v, h]);
  });
});

describe("exact odds (the verified table)", () => {
  it("one shuffle: 1/2", () => expect(enumerate("one")).toEqual({ num: 1, den: 2 }));
  it("two shuffles: certain", () => expect(enumerate("two")).toEqual({ num: 1, den: 1 }));
  it("peeked: 1/2", () => expect(enumerate("peek")).toEqual({ num: 1, den: 2 }));
  it("the app's own load-time self-test agrees", () => {
    expect(ALL_PASS).toBe(true);
    expect(SELF_TEST.every((t) => t.pass)).toBe(true);
  });
});

describe("dealHand — exhaustive, no statistics", () => {
  it("blind hands match for ALL four initial configurations", () => {
    for (const v of [LO, HI]) for (const h of [LO, HI]) {
      const hand = dealHand(false, script([v, h]));
      expect(hand.match).toBe(true);            // the certainty is a theorem, test it as one
      expect(hand.trace.map((t) => t.label)).toEqual(["deal", "shuffle1", "shuffle2", "showdown"]);
    }
  });
  it("peeked hands match exactly when the fresh card equals the deal (4 of 8 configs)", () => {
    let matches = 0;
    for (const v of [LO, HI]) for (const h of [LO, HI]) for (const f of [LO, HI]) {
      const hand = dealHand(true, script([v, h, f]));
      expect(hand.match).toBe((v < 0.5 ? 0 : 1) === (f < 0.5 ? 0 : 1));
      matches += hand.match;
      expect(hand.trace.map((t) => t.label)).toEqual(["deal", "shuffle1", "peek", "shuffle2", "showdown"]);
    }
    expect(matches).toBe(4);
  });
  it("is deterministic: identical script, identical hand", () => {
    const a = dealHand(true, script([LO, HI, LO])), b = dealHand(true, script([LO, HI, LO]));
    expect(a).toEqual(b);
  });
});

describe("double slit tables", () => {
  it("fringe has at least 4 exact interior nodes and the self-test agrees", () => {
    const nodes = FRINGE.filter((v, x) => v === 0 && x > 1 && x < NBINS - 2).length;
    expect(nodes).toBeGreaterThanOrEqual(4);
    expect(SLIT_TEST.pass).toBe(true);
  });
  it("slit R is the mirror of slit L; detector case has no interior forbidden bins", () => {
    expect(SLIT_R).toEqual([...SLIT_L].reverse());
    for (let x = 3; x < NBINS - 3; x++) expect(SLIT_L[x] + SLIT_R[x]).toBeGreaterThan(0);
  });
  it("samplers realize their tables EXACTLY (every hidden integer audited)", () => {
    for (const [fire, table] of [[fireBlind, FRINGE], [fireL, SLIT_L], [fireR, SLIT_R]]) {
      const total = table.reduce((a, b) => a + b, 0);
      const counts = Array(NBINS).fill(0);
      for (let h = 0; h < total; h++) counts[fire(() => (h + 0.5) / total)]++;
      expect(counts).toEqual(table);            // the marginal IS the table — no sampling error
    }
  });
});

describe("the 24-card line game (Euchre deck: 9,10,J,Q,K,A counting 1..6)", () => {
  const EXPECTED_BLIND = [2, 0, 8, 0, 10, 0, 16, 0, 18, 0, 24, 0, 18, 0, 24, 0, 26, 0, 32, 0, 34, 0, 40, 0, 48, 0, 40, 0, 34, 0, 32, 0, 26, 0, 24, 0, 18, 0, 24, 0, 18, 0, 16, 0, 10, 0, 8, 0, 2];
  const EXPECTED_PEEK = [0, 0, 24, 96, 216, 384, 720, 960, 1392, 1728, 2376, 2880, 3792, 4800, 5928, 7008, 8136, 9120, 9888, 10656, 11616, 12288, 13080, 13440, 13968, 13440, 13080, 12288, 11616, 10656, 9888, 9120, 8136, 7008, 5928, 4800, 3792, 2880, 2376, 1728, 1392, 960, 720, 384, 216, 96, 24, 0, 0];
  const rr = (picks, lens) => { let i = 0; return () => (picks[i] + 0.5) / lens[i++]; };

  it("blind: displacement is 2(a+b) for ALL 552 ordered deals; deck order mirrored exactly", () => {
    for (let k1 = 0; k1 < 24; k1++) for (let k2 = 0; k2 < 23; k2++) {
      const avail = CARDS.map((_, x) => x);
      const i = avail.splice(k1, 1)[0], j = avail.splice(k2, 1)[0];
      const h = dealLineHand(false, rr([k1, k2], [24, 23]));
      expect(h.d).toBe(2 * CARDS[i].m + 2 * CARDS[j].m);
      expect(h.cards.a).toBe(CARDS[i]);
      expect(h.cards.b).toBe(CARDS[j]);
    }
  });
  it("peeked: displacement is a+a'+b+b' on scripted spot deals; burns drawn from the depleted deck", () => {
    for (let trial = 0; trial < 500; trial++) {
      const k1 = trial % 24, k2 = (trial * 7) % 23, k3 = (trial * 13) % 22, k4 = (trial * 29) % 21;
      const avail = CARDS.map((_, x) => x);
      const i = avail.splice(k1, 1)[0], j = avail.splice(k2, 1)[0];
      const k = avail.splice(k3, 1)[0], l = avail.splice(k4, 1)[0];
      const h = dealLineHand(true, rr([k1, k2, k3, k4], [24, 23, 22, 21]));
      expect(h.d).toBe(CARDS[i].m + CARDS[k].m + CARDS[j].m + CARDS[l].m);
      expect(new Set([h.cards.a, h.cards.b, h.cards.a2, h.cards.b2]).size).toBe(4);
    }
  });
  it("exact distributions match the independent ground truth, bin for bin", () => {
    expect(lineDist(false)).toEqual(EXPECTED_BLIND);
    expect(lineDist(true)).toEqual(EXPECTED_PEEK);
  });
  it("structure: 24 odd nodes; edges \u00b124 are coherence-only", () => {
    expect(LINE_TEST.pass).toBe(true);
    expect(LINE_TEST.nodes).toBe(24);
    expect(EXPECTED_BLIND[0]).toBeGreaterThan(0);
    expect(EXPECTED_PEEK[0]).toBe(0);
    expect(EXPECTED_PEEK[48]).toBe(0);
  });
  it("symmetry: both distributions exactly even", () => {
    for (const d of [EXPECTED_BLIND, EXPECTED_PEEK])
      for (let x = 0; x < 49; x++) expect(d[x]).toBe(d[48 - x]);
  });
});
