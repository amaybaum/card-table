import { describe, it, expect } from "vitest";
import { swap, enumerate, dealHand, NBINS, FRINGE, SLIT_L, SLIT_R,
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
