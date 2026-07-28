import { useState, useRef } from "react";
import { swap, enumerate, dealHand, dealLineHand, cardLabel, LINE_LO, LINE_N, LINE_TEST, NBINS, FRINGE, SLIT_L, SLIT_R,
         fireBlind, fireL, fireR, SELF_TEST, ALL_PASS, TEST_LABEL, SLIT_TEST } from "./engine.js";

const cname = (b) => (b === 0 ? "RED" : "BLACK");

export default function CardTable() {
  const [mode, setMode] = useState("cards");
  const [rulesOpen, setRulesOpen] = useState(true);
  const [why, setWhy] = useState({});
  // cards: two-bin screen, separate accumulation per peek setting
  const [peekMode, setPeekMode] = useState(false);
  const [cardsOff, setCardsOff] = useState(Array(LINE_N).fill(0));   // hands per displacement bin, peek OFF
  const [cardsOn, setCardsOn] = useState(Array(LINE_N).fill(0));     // peek ON
  const [lastHand, setLastHand] = useState(null);
  // slit: NBINS-bin screen (matches the card track width), separate accumulation per detector setting
  const [detector, setDetector] = useState(false);
  const [hitsOff, setHitsOff] = useState(Array(NBINS).fill(0));
  const [hitsOn, setHitsOn] = useState(Array(NBINS).fill(0));
  const [lastShot, setLastShot] = useState(null);
  const rng = useRef(Math.random);

  const world = { bg: "radial-gradient(ellipse at 50% 30%, #256049 0%, #1E4D3B 55%, #123327 100%)", ink: "#F0EADA", panel: "rgba(0,0,0,.28)" };
  const gold = "#D8C878";

  function playCards(n) {
    const upd = (bins) => {
      const a = bins.slice(); let last = null;
      for (let i = 0; i < n; i++) { const h = dealLineHand(peekMode, rng.current); a[h.d - LINE_LO]++; last = h; }
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

  const fm = (m) => (m > 0 ? `+${m}` : `${m}`);
  const handStory = (h) => {
    if (!h) return null;
    const steps = h.peeked
      ? `${cardLabel(h.cards.a)} then burned → ${cardLabel(h.cards.a2)}; ${cardLabel(h.cards.b)} then burned → ${cardLabel(h.cards.b2)}`
      : `${cardLabel(h.cards.a)} twice, ${cardLabel(h.cards.b)} twice`;
    return `last hand: ${steps} — marker moved ${fm(h.d)}, deterministically`;
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
              style={{ flex: 1, padding: "9px 11px", borderRadius: 10, cursor: "pointer", background: world.panel, color: world.ink, fontWeight: 700, fontSize: 13.5, border: mode === k ? "2px solid #C9A227" : "1px solid rgba(128,128,128,.3)", opacity: mode === k ? 1 : 0.75 }}>
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
                  text={<>Each hand: <b>two hidden cards are dealt from a standard 52-card deck</b>. Red suits (♥♦) move your marker left, black (♠♣) right, by the card's rank — ace 1 up to king 13. The marker starts at 0. Question: <i>where does it end up?</i></>}
                  whyText={<>The deal is the <b>only randomness in the game</b> — it stands for not knowing the world's starting conditions. Everything after is fixed by the rules, so there are no dice to blame the strangeness on. The hidden card is the point: the world contains more than you can see, and the rules use that part too.</>} />
                <Rule n={2} why={why} setWhy={setWhy} ink={world.ink}
                  text={<>The only move is the <b>shuffle: a hidden card moves the marker by its rank</b>, behind the dealer's screen. Not random, and reversible — every move can be undone. Each hand is four moves: <b>the first card acts twice, then the second acts twice</b> — then showdown.</>}
                  whyText={<><b>Deterministic</b>: same input, same result — so probability can only come from what you can't see. <b>Reversible</b>: every move can be undone, so information can hide but never dies. Each card acting <b>twice, in step</b> doubles its move — so odd final positions become impossible: 52 exact nodes — and the two doubled cards <b>add</b>, so the allowed positions pile into an envelope whose 25 tooth heights are shaped by the deck's own make-up. Stripes and shape, both derived; nothing is engineered.</>} />
                <Rule n={3} why={why} setWhy={setWhy} ink={world.ink}
                  text={<><b>Looking costs.</b> With peek ON, each hidden card is inspected between its two moves — and a seen card is burned and replaced <b>from the remaining deck</b>.</>}
                  whyText={<>In this toy, honestly: a house rule — the toy <i>imposes</i> what real physics <i>derives</i>. In physics there is no passive glance: to see a card you must interact with it. <b>Looking is copying</b> — a record now exists somewhere — and the pattern below is <i>made of</i> a correlation: each card acting twice in step. Burning a card mid-hand makes the four moves <b>independent</b> — the forbidden bins fill in, and independent moves obey the bell-curve theorem: measurement doesn't just erase the stripes, it makes the world normal. Minds are irrelevant: a machine that photographs the card and shows no one destroys the certainty just as thoroughly. What costs is that the record exists, not that anyone reads it.</>} />
              </ol>
            )}
          </div>
        )}

        {mode === "cards" && (() => {
          const bins = peekMode ? cardsOn : cardsOff;
          const total = bins.reduce((a, b) => a + b, 0);
          const peak = Math.max(1, ...bins);
          const offN = cardsOff.reduce((a, b) => a + b, 0), onN = cardsOn.reduce((a, b) => a + b, 0);
          return (
            <div style={{ background: world.panel, borderRadius: 14, padding: "16px", marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <button onClick={() => setPeekMode(!peekMode)} style={{ ...btn(), fontWeight: 700, background: peekMode ? "#c05b52" : "rgba(255,255,255,.12)", color: peekMode ? "#fff" : "inherit" }}>
                  peek: {peekMode ? "ON — hidden cards inspected mid-hand" : "OFF — playing blind"}
                </button>
                <button onClick={() => playCards(1)} style={btn()}>play 1 hand</button>
                <button onClick={() => playCards(1000)} style={btn()}>play 1000</button>
                <button onClick={() => { setCardsOff(Array(LINE_N).fill(0)); setCardsOn(Array(LINE_N).fill(0)); setLastHand(null); }} style={btn()}>reset</button>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 110, background: "rgba(0,0,0,.25)", borderRadius: 8, padding: "6px 6px 0" }}>
                {bins.map((v, x) => (
                  <div key={x} style={{ flex: 1, height: `${(100 * v) / peak}%`, background: peekMode ? "#c05b52" : gold, borderRadius: "2px 2px 0 0", transition: "height .15s" }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 2, padding: "3px 6px 0", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10, opacity: 0.75 }}>
                {bins.map((_, x) => <div key={x} style={{ flex: 1, textAlign: "center" }}>{(x + LINE_LO) % 13 === 0 ? x + LINE_LO : ""}</div>)}
              </div>
              <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11.5, marginTop: 4, opacity: 0.8, textAlign: "center" }}>
                where the marker ended up (0 = where it started)
              </div>
              <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, marginTop: 8, opacity: 0.85, minHeight: 16 }}>
                this screen (peek {peekMode ? "ON" : "OFF"}): {total} hands{lastHand && <><br />{handStory(lastHand)}</>}
              </div>
              {offN > 30 && onN > 30 && (
                <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
                  Same deck, same deal, same four moves behind the screen. Peek OFF: stripes, with
                  positions the marker <b>never</b> reaches. Peek ON: one smooth pile, and the forbidden
                  positions fill in. The only difference is whether a record of the cards exists
                  mid-hand. That is quantum interference — and here it is, dealt from a standard
                  52-card deck.
                  <div style={{ marginTop: 8 }}>
                    And the shape is earned, not chosen: doubling forbids the odd positions, addition
                    builds the envelope — and once the records exist, the four moves are independent,
                    so the pile smooths toward a bell curve. <b>Decoherence is the central limit theorem
                    switching on.</b> (Even the outermost bins are coherence-only: ±52 takes two
                    same-colour kings acting in step — a peeked hand, drawing its burns from a
                    depleted deck, can never get there.)
                  </div>
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
                <button onClick={() => setDetector(!detector)} style={{ ...btn(), fontWeight: 700, background: detector ? "#c05b52" : "rgba(255,255,255,.12)", color: detector ? "#fff" : "inherit" }}>
                  slit detector: {detector ? "ON — recording paths" : "OFF"}
                </button>
                <button onClick={() => fire(1)} style={btn()}>fire 1</button>
                <button onClick={() => fire(1000)} style={btn()}>fire 1000</button>
                <button onClick={() => { setHitsOff(Array(NBINS).fill(0)); setHitsOn(Array(NBINS).fill(0)); setLastShot(null); }} style={btn()}>reset</button>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 110, background: "rgba(0,0,0,.25)", borderRadius: 8, padding: "6px 6px 0" }}>
                {hits.map((v, x) => (
                  <div key={x} style={{ flex: 1, height: `${(100 * v) / peak}%`, background: detector ? "#c05b52" : gold, borderRadius: "2px 2px 0 0", transition: "height .15s" }} />
                ))}
              </div>
              <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, marginTop: 6, opacity: 0.85 }}>
                this screen ({detector ? "detector ON" : "detector OFF"}): {total} particles
                {lastShot && ` — last shot: ${lastShot.slit === null ? "no record" : `slit ${lastShot.slit ? "R" : "L"} recorded`}, hidden number \u2192 bin ${lastShot.x}, deterministically`}
              </div>
              {offN > 100 && onN > 100 && (
                <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
                  Same source, same slits, same wall. Detector OFF: stripes, with bins where particles
                  <b> never</b> land. Detector ON: one smooth pile, and the forbidden bins fill in.
                  The only difference is whether a record of the path exists. That is the double slit —
                  and here it is, running on hidden cards.
                </div>
              )}
              {(
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
            engine self-test: {ALL_PASS && SLIT_TEST.pass && LINE_TEST.pass ? "PASS" : "FAIL"} ({SELF_TEST.map((t) => `${TEST_LABEL[t.p]} ${t.got}`).join(" \u00B7 ")} · fringe nodes {SLIT_TEST.nodes} · line nodes {LINE_TEST.nodes}) — the engine is ~80 lines in engine.js, unit-tested. Read it: there is no trick to find.
          </div>
          <div style={{ marginTop: 8 }}>
            Everything on this page is shown face-up — the hidden cards' values, the lookup tables,
            the last hand's full history. "Hidden" means hidden from the player <i>inside the game</i>,
            not from you — and the stripes survive your seeing everything, because the pattern never
            cared what you know. It cares only whether the game's own record exists (rule 3).
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

const btn = () => ({ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer", border: "1px solid rgba(128,128,128,.5)", background: "rgba(255,255,255,.12)", color: "inherit" });
