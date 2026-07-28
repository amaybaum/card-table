import { describe, it, expect } from "vitest";
import { swap, enumerate, dealHand, dealLineHand, lineDist, LINE_S, LINE_LO, LINE_N, LINE_TEST, NBINS, FRINGE, SLIT_L, SLIT_R,
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

describe("the line game", () => {
  const r = (idxs) => { let i = 0; return () => (idxs[i++] + 0.5) / 8; };
  const EXPECTED_BLIND = [1,0,2,0,3,0,4,0,3,0,4,0,5,0,6,0,8,0,6,0,5,0,4,0,3,0,4,0,3,0,2,0,1];
  it("blind: displacement is exactly 2a+2b for ALL 64 configurations — odd positions unreachable", () => {
    for (let ia = 0; ia < 8; ia++) for (let ib = 0; ib < 8; ib++) {
      const h = dealLineHand(false, r([ia, ib]));
      expect(h.d).toBe(2 * LINE_S[ia] + 2 * LINE_S[ib]);
      expect(Math.abs(h.d) % 2).toBe(0);
      expect(h.moves).toEqual([LINE_S[ia], LINE_S[ia], LINE_S[ib], LINE_S[ib]]);
    }
  });
  it("peeked: displacement is a+a'+b+b' for ALL 4096 configurations", () => {
    for (let ia = 0; ia < 8; ia++) for (let ib = 0; ib < 8; ib++)
      for (let ia2 = 0; ia2 < 8; ia2++) for (let ib2 = 0; ib2 < 8; ib2++) {
        const h = dealLineHand(true, r([ia, ib, ia2, ib2]));
        expect(h.d).toBe(LINE_S[ia] + LINE_S[ia2] + LINE_S[ib] + LINE_S[ib2]);
      }
  });
  it("exact distributions: the verified fringe-under-envelope array; peeked fills every bin", () => {
    expect(lineDist(false)).toEqual(EXPECTED_BLIND);
    const pk = lineDist(true);
    expect(pk.reduce((x, y) => x + y, 0)).toBe(4096);
    expect(pk.every((v) => v > 0)).toBe(true);
    expect(LINE_TEST.pass).toBe(true);
    expect(LINE_TEST.nodes).toBe(16);
  });
  it("symmetry: both distributions are exactly even in displacement", () => {
    for (const d of [lineDist(false), lineDist(true)])
      for (let i = 0; i < LINE_N; i++) expect(d[i]).toBe(d[LINE_N - 1 - i]);
  });
});
