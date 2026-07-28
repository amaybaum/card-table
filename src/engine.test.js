import { describe, it, expect } from "vitest";
import { swap, enumerate, dealHand, dealLineHand, lineDist, CARD52, LINE_LO, LINE_N, LINE_TEST, NBINS, FRINGE, SLIT_L, SLIT_R,
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

describe("the 52-card line game", () => {
  // ground truth computed by independent exact enumeration (python), hardcoded:
  const EXPECTED_BLIND = [2, 0, 8, 0, 10, 0, 16, 0, 18, 0, 24, 0, 26, 0, 32, 0, 34, 0, 40, 0, 42, 0, 48, 0, 50, 0, 48, 0, 50, 0, 56, 0, 58, 0, 64, 0, 66, 0, 72, 0, 74, 0, 80, 0, 82, 0, 88, 0, 90, 0, 96, 0, 104, 0, 96, 0, 90, 0, 88, 0, 82, 0, 80, 0, 74, 0, 72, 0, 66, 0, 64, 0, 58, 0, 56, 0, 50, 0, 48, 0, 50, 0, 48, 0, 42, 0, 40, 0, 34, 0, 32, 0, 26, 0, 24, 0, 18, 0, 16, 0, 10, 0, 8, 0, 2];
  const EXPECTED_PEEK = [0, 0, 24, 96, 216, 384, 720, 1056, 1584, 2208, 3048, 3936, 5160, 6432, 7968, 9600, 11424, 13440, 15768, 18144, 20952, 23904, 27216, 30720, 34704, 38784, 43536, 48576, 53904, 59520, 65352, 71232, 77352, 83424, 89568, 95616, 101664, 107424, 113208, 118368, 123672, 128832, 133872, 138528, 143088, 147168, 150984, 154272, 157224, 159456, 161376, 162432, 163128, 162432, 161376, 159456, 157224, 154272, 150984, 147168, 143088, 138528, 133872, 128832, 123672, 118368, 113208, 107424, 101664, 95616, 89568, 83424, 77352, 71232, 65352, 59520, 53904, 48576, 43536, 38784, 34704, 30720, 27216, 23904, 20952, 18144, 15768, 13440, 11424, 9600, 7968, 6432, 5160, 3936, 3048, 2208, 1584, 1056, 720, 384, 216, 96, 24, 0, 0];
  const rr = (picks, lens) => { let i = 0; return () => (picks[i] + 0.5) / lens[i++]; };

  it("blind: displacement is 2(a+b) for ALL 2652 ordered deals; deck order mirrored exactly", () => {
    for (let k1 = 0; k1 < 52; k1++) for (let k2 = 0; k2 < 51; k2++) {
      const avail = CARD52.map((_, x) => x);
      const i = avail.splice(k1, 1)[0], j = avail.splice(k2, 1)[0];
      const h = dealLineHand(false, rr([k1, k2], [52, 51]));
      expect(h.d).toBe(2 * CARD52[i].m + 2 * CARD52[j].m);
      expect(h.cards.a).toBe(CARD52[i]);
      expect(h.cards.b).toBe(CARD52[j]);
    }
  });
  it("peeked: displacement is a+a'+b+b' on scripted spot deals; replacements come from the depleted deck", () => {
    for (let trial = 0; trial < 500; trial++) {
      const k1 = trial % 52, k2 = (trial * 7) % 51, k3 = (trial * 13) % 50, k4 = (trial * 29) % 49;
      const avail = CARD52.map((_, x) => x);
      const i = avail.splice(k1, 1)[0], j = avail.splice(k2, 1)[0];
      const k = avail.splice(k3, 1)[0], l = avail.splice(k4, 1)[0];
      const h = dealLineHand(true, rr([k1, k2, k3, k4], [52, 51, 50, 49]));
      expect(h.d).toBe(CARD52[i].m + CARD52[k].m + CARD52[j].m + CARD52[l].m);
      expect(new Set([h.cards.a, h.cards.b, h.cards.a2, h.cards.b2]).size).toBe(4);
    }
  });
  it("exact distributions match the independent ground truth, bin for bin", () => {
    expect(lineDist(false)).toEqual(EXPECTED_BLIND);
    expect(lineDist(true)).toEqual(EXPECTED_PEEK);
  });
  it("structure: 52 odd nodes; edges \u00b152 are coherence-only (blind reaches them, peeked cannot)", () => {
    expect(LINE_TEST.pass).toBe(true);
    expect(LINE_TEST.nodes).toBe(52);
    expect(EXPECTED_BLIND[0]).toBeGreaterThan(0);
    expect(EXPECTED_PEEK[0]).toBe(0);
    expect(EXPECTED_PEEK[LINE_N - 1]).toBe(0);
  });
  it("symmetry: both distributions exactly even", () => {
    for (const d of [EXPECTED_BLIND, EXPECTED_PEEK])
      for (let x = 0; x < LINE_N; x++) expect(d[x]).toBe(d[LINE_N - 1 - x]);
  });
});
