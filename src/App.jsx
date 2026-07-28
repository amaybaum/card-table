import { useState, useRef } from "react";
import { swap, enumerate, dealHand, NBINS, FRINGE, SLIT_L, SLIT_R,
         fireBlind, fireL, fireR, SELF_TEST, ALL_PASS, TEST_LABEL, SLIT_TEST } from "./engine.js";

const cname = (b) => (b === 0 ? "RED" : "BLACK");

export default function CardTable() {
  const [seat, setSeat] = useState("player");
  const [mode, setMode] = useState("cards");
  const [rulesOpen, setRulesOpen] = useState(true);
  const [why, setWhy] = useState({});
  // cards: two-bin screen, separate accumulation per peek setting
  const [peekMode, setPeekMode] = useState(false);
  const [cardsOff, setCardsOff] = useState([0, 0]);   // [match, nomatch], peek OFF
  const [cardsOn, setCardsOn] = useState([0, 0]);     // peek ON
  const [lastHand, setLastHand] = useState(null);
  // slit: 25-bin screen, separate accumulation per detector setting
  const [detector, setDetector] = useState(false);
  const [hitsOff, setHitsOff] = useState(Array(NBINS).fill(0));
  const [hitsOn, setHitsOn] = useState(Array(NBINS).fill(0));
  const [lastShot, setLastShot] = useState(null);
  const rng = useRef(Math.random);

  const insp = seat === "inspector";
  const world = insp
    ? { bg: "#F2F4F1", ink: "#23404A", panel: "rgba(35,64,74,.06)" }
    : { bg: "radial-gradient(ellipse at 50% 30%, #256049 0%, #1E4D3B 55%, #123327 100%)", ink: "#F0EADA", panel: "rgba(0,0,0,.28)" };
  const gold = insp ? "#23404A" : "#D8C878";

  function playCards(n) {
    const upd = (bins) => {
      const a = bins.slice(); let last = null;
      for (let i = 0; i < n; i++) { const h = dealHand(peekMode, rng.current); a[h.match ? 0 : 1]++; last = h; }
      setLastHand(last); return a;
    };
    peekMode ? setCardsOn(upd) : setCardsOff(upd);
  }
  function fire(n) {
    const upd = (arr) => {
      const a = arr.slice(); let last = null;
      for (let i = 0; i < n; i++) {
        if (detector) { const sl = rng.current() < 0.5 ? 0 : 1; const x = (sl ? fireR : fireL)(rng.current); a[x]++; last = { x, slit: sl }; }
        else { const x = fireBlind(rng.current); a[x]++; last = { x, slit: null }; }
      }
      setLastShot(last); return a;
    };
    detector ? setHitsOn(upd) : setHitsOff(upd);
  }

  const handStory = (h) => {
    if (!h) return null;
    const steps = insp
      ? h.trace.map((t) => `${t.label}: you ${cname(t.v)} / hidden ${cname(t.h)}`).join(" \u2192 ")
      : `dealt ${cname(h.dealt)} \u2192 swap \u2192 ${h.peeked ? `peek (${cname(h.trace[2].peeked)}, burned) \u2192 ` : ""}swap \u2192 ${cname(h.final)}`;
    return `last hand: ${steps} — ${h.match ? "MATCH" : "NO MATCH"}, deterministically`;
  };

  return (
    <div style={{ minHeight: "100vh", background: world.bg, color: world.ink, transition: "background .4s,color .4s", fontFamily: "Iowan Old Style, Palatino Linotype, Georgia, serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "26px 18px 48px" }}>

        <h1 style={{ margin: 0, fontSize: 28 }}>The Card Table</h1>
        <div style={{ fontSize: 13.5, opacity: 0.8, marginTop: 4, lineHeight: 1.5 }}>
          Two experiments with no randomness in their rules — whose odds still behave like quantum mechanics.
        </div>

        {/* mode tabs */}
        <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
          {[["cards", "The card table"], ["slit", "The double slit"]].map(([k, label]) => (
            <button key={k} onClick={() => setMode(k)}
              style={{ flex: 1, padding: "9px 11px", borderRadius: 10, cursor: "pointer", background: world.panel, color: world.ink, fontWeight: 700, fontSize: 13.5, border: mode === k ? `2px solid ${insp ? "#23404A" : "#C9A227"}` : "1px solid rgba(128,128,128,.3)", opacity: mode === k ? 1 : 0.75 }}>
              {label}
            </button>
          ))}
        </div>

        {/* rules (cards mode) */}
        {mode === "cards" && (
          <div style={{ background: world.panel, borderRadius: 12, padding: "14px 16px", marginTop: 14 }}>
            <button onClick={() => setRulesOpen(!rulesOpen)} style={{ background: "none", border: "none", cursor: "pointer", color: world.ink, padding: 0, fontWeight: 700, fontSize: 14 }}>
              The three rules {rulesOpen ? "\u25BE" : "\u25B8"}
            </button>
            {rulesOpen && (
              <ol style={{ margin: "10px 0 2px", paddingLeft: 20, fontSize: 13.5, lineHeight: 1.65 }}>
                <Rule n={1} why={why} setWhy={setWhy} ink={world.ink}
                  text={<>Each hand: you get one card, red or black, even odds. A <b>hidden card</b> lies beside it. Question: <i>after two shuffles, does your card match your deal?</i></>}
                  whyText={<>The deal is the <b>only randomness in the game</b> — it stands for not knowing the world's starting conditions. Everything after is fixed by the rules, so there are no dice to blame the strangeness on. The hidden card is the point: the world contains more than you can see, and the rules use that part too.</>} />
                <Rule n={2} why={why} setWhy={setWhy} ink={world.ink}
                  text={<>The only move is the <b>shuffle: your card and the hidden card trade places.</b> Not random. Each hand is: deal, swap, swap, showdown.</>}
                  whyText={<><b>Deterministic</b>: same input, same result — so probability can only come from what you can't see. <b>Reversible</b>: a swap undoes itself, so information can hide but never dies. The swap is the smallest move coupling what you see to what you don't; the framework's real physics is built from exactly these two properties.</>} />
                <Rule n={3} why={why} setWhy={setWhy} ink={world.ink}
                  text={<><b>Looking costs.</b> With peek ON, the card is looked at between the swaps — and a seen card is burned and replaced with a fresh one.</>}
                  whyText={<>In this toy, honestly: a house rule — the toy <i>imposes</i> what real physics <i>derives</i>. In physics there is no passive glance: to see a card you must interact with it. <b>Looking is copying</b> — a record now exists somewhere — and the certainty below is <i>made of</i> a correlation: the hidden card remembering your deal. Copying rearranges exactly that correlation. Minds are irrelevant: a machine that photographs the card and shows no one destroys the certainty just as thoroughly. What costs is that the record exists, not that anyone reads it.</>} />
              </ol>
            )}
          </div>
        )}

        {/* seat toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
          <button onClick={() => setSeat(insp ? "player" : "inspector")} style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, fontWeight: 700, padding: "10px 16px", borderRadius: 999, cursor: "pointer", border: "none", background: insp ? "#23404A" : "#C9A227", color: insp ? "#F2F4F1" : "#1B1B1B" }}>
            {insp ? "\u21A9 sit back down (player view)" : "\u2191 stand up (inspector view)"}
          </button>
          <span style={{ fontSize: 12.5, opacity: 0.75, flex: 1, minWidth: 200 }}>
            {insp ? "Everything face up, every step. Notice: no tricks anywhere." : "You see only what a player sees."}
          </span>
        </div>

        {/* THE CARD TABLE — same shape as the slit: toggle, fire, two-bin screen */}
        {mode === "cards" && (() => {
          const bins = peekMode ? cardsOn : cardsOff;
          const total = bins[0] + bins[1];
          const peak = Math.max(1, bins[0], bins[1]);
          const offN = cardsOff[0] + cardsOff[1], onN = cardsOn[0] + cardsOn[1];
          return (
            <div style={{ background: world.panel, borderRadius: 14, padding: "16px", marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <button onClick={() => setPeekMode(!peekMode)} style={{ ...btn(insp), fontWeight: 700, background: peekMode ? "#c05b52" : (insp ? "#fff" : "rgba(255,255,255,.12)"), color: peekMode ? "#fff" : "inherit" }}>
                  peek: {peekMode ? "ON — every card looked at mid-hand" : "OFF — playing blind"}
                </button>
                <button onClick={() => playCards(1)} style={btn(insp)}>play 1 hand</button>
                <button onClick={() => playCards(100)} style={btn(insp)}>play 100</button>
                <button onClick={() => { setCardsOff([0, 0]); setCardsOn([0, 0]); setLastHand(null); }} style={btn(insp)}>reset</button>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 24, height: 110, background: insp ? "rgba(35,64,74,.05)" : "rgba(0,0,0,.25)", borderRadius: 8, padding: "6px 40px 0" }}>
                {[0, 1].map((i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                    <div style={{ height: `${(100 * bins[i]) / peak}%`, background: peekMode ? "#c05b52" : gold, borderRadius: "3px 3px 0 0", transition: "height .15s" }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 24, padding: "4px 40px 0", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }}>
                <div style={{ flex: 1, textAlign: "center" }}>MATCH {total > 0 && `— ${bins[0]} (${Math.round((100 * bins[0]) / total)}%)`}</div>
                <div style={{ flex: 1, textAlign: "center" }}>NO MATCH {total > 0 && `— ${bins[1]} (${Math.round((100 * bins[1]) / total)}%)`}</div>
              </div>
              <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, marginTop: 8, opacity: 0.85, minHeight: 16 }}>
                this screen (peek {peekMode ? "ON" : "OFF"}): {total} hands{lastHand && <><br />{handStory(lastHand)}</>}
              </div>
              {offN > 20 && onN > 20 && (
                <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
                  Peek OFF: every hand lands in MATCH — <b>NO MATCH is a forbidden bin</b>, a place hands
                  never go, even though each swap alone is a coin flip. Peek ON: the forbidden bin fills in.
                  This is a double slit with two bins — flip the tab above and watch the same thing happen
                  across twenty-five.
                </div>
              )}
            </div>
          );
        })()}

        {/* THE DOUBLE SLIT */}
        {mode === "slit" && (() => {
          const hits = detector ? hitsOn : hitsOff;
          const total = hits.reduce((a, b) => a + b, 0);
          const peak = Math.max(1, ...hits);
          const offN = hitsOff.reduce((a, b) => a + b, 0), onN = hitsOn.reduce((a, b) => a + b, 0);
          return (
            <div style={{ background: world.panel, borderRadius: 14, padding: "16px", marginTop: 14 }}>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 10 }}>
                Same three rules, bigger hidden card: each particle's landing spot is a <b>deterministic
                lookup</b> of one hidden number, dealt uniformly. The slit detector is rule 3 at the
                slits: ON means <b>a record of the path exists</b>.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <button onClick={() => setDetector(!detector)} style={{ ...btn(insp), fontWeight: 700, background: detector ? "#c05b52" : (insp ? "#fff" : "rgba(255,255,255,.12)"), color: detector ? "#fff" : "inherit" }}>
                  slit detector: {detector ? "ON — recording paths" : "OFF"}
                </button>
                <button onClick={() => fire(1)} style={btn(insp)}>fire 1</button>
                <button onClick={() => fire(200)} style={btn(insp)}>fire 200</button>
                <button onClick={() => { setHitsOff(Array(NBINS).fill(0)); setHitsOn(Array(NBINS).fill(0)); setLastShot(null); }} style={btn(insp)}>reset</button>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 110, background: insp ? "rgba(35,64,74,.05)" : "rgba(0,0,0,.25)", borderRadius: 8, padding: "6px 6px 0" }}>
                {hits.map((v, x) => (
                  <div key={x} style={{ flex: 1, height: `${(100 * v) / peak}%`, background: detector ? "#c05b52" : gold, borderRadius: "2px 2px 0 0", transition: "height .15s" }} />
                ))}
              </div>
              <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, marginTop: 6, opacity: 0.85 }}>
                this screen ({detector ? "detector ON" : "detector OFF"}): {total} particles
                {insp && lastShot && ` — last shot: ${lastShot.slit === null ? "no record" : `slit ${lastShot.slit ? "R" : "L"} recorded`}, hidden number \u2192 bin ${lastShot.x}, deterministically`}
              </div>
              {offN > 100 && onN > 100 && (
                <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
                  Same source, same slits, same wall. Detector OFF: stripes, with bins where particles
                  <b> never</b> land. Detector ON: one smooth pile, and the forbidden bins fill in.
                  The only difference is whether a record of the path exists. That is the double slit —
                  and here it is, running on hidden cards.
                </div>
              )}
              {insp && (
                <div style={{ marginTop: 10, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, opacity: 0.8, lineHeight: 1.7 }}>
                  the lookup tables (counts per bin, fully auditable — chosen to equal the quantum
                  prediction; that such tables <i>exist</i> is the framework's claim):<br/>
                  no record: [{FRINGE.join(",")}]<br/>
                  slit L: [{SLIT_L.join(",")}] &nbsp; slit R: [{SLIT_R.join(",")}]
                </div>
              )}
            </div>
          );
        })()}

        {/* audit + boundary */}
        <div style={{ marginTop: 16, fontSize: 12, opacity: 0.85, lineHeight: 1.6 }}>
          <div style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>
            engine self-test: {ALL_PASS && SLIT_TEST.pass ? "PASS" : "FAIL"} ({SELF_TEST.map((t) => `${TEST_LABEL[t.p]} ${t.got}`).join(" \u00B7 ")} \u00B7 fringe nodes {SLIT_TEST.nodes}) — the engine is ~80 lines in engine.js, unit-tested. Read it: there is no trick to find.
          </div>
          <div style={{ marginTop: 8 }}>
            Honest boundary: these are local classical mechanisms. They reproduce interference, indivisibility,
            and measurement-as-intervention — but no card game can violate a Bell inequality. That part belongs
            to the full framework (<i>The Incompleteness of Observation</i>, ch. 1 &amp; 3), not the toys.
          </div>
        </div>
      </div>
    </div>
  );
}

function Rule({ n, text, whyText, why, setWhy, ink }) {
  const open = !!why[n];
  return (
    <li style={{ marginBottom: 8 }}>
      {text}{" "}
      <button onClick={() => setWhy({ ...why, [n]: !open })}
        style={{ background: "none", border: "none", cursor: "pointer", color: ink, opacity: 0.8, fontSize: 12.5, textDecoration: "underline", padding: 0, fontFamily: "inherit" }}>
        {open ? "hide" : "why?"}
      </button>
      {open && (
        <div style={{ fontSize: 12.5, lineHeight: 1.6, opacity: 0.92, margin: "6px 0 4px", paddingLeft: 12, borderLeft: "2px solid rgba(128,128,128,.45)" }}>
          {whyText}
        </div>
      )}
    </li>
  );
}

const btn = (insp) => ({ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer", border: "1px solid rgba(128,128,128,.5)", background: insp ? "#fff" : "rgba(255,255,255,.12)", color: "inherit" });
