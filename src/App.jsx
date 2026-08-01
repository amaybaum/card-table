import { useState, useRef } from "react";
import { dealLineHand, cardLabel, LINE_LO, LINE_N, NBINS, FRINGE, SLIT_L, SLIT_R,
         fireBlind, fireL, fireR, dealCatHand, CAT_LEVELS, catOdds, DIVISIBLE_ODDS } from "./engine.js";

const cname = (b) => (b === 0 ? "RED" : "BLACK");
const FATE = ["ALIVE", "DEAD"];
const CAT_BAR = ["#D8C878", "#D4B171", "#CE9A69", "#C87B5E", "#c05b52"];   // gold draining to clay

function MiniCard({ c, dim }) {
  const red = c.s === "\u2665" || c.s === "\u2666";
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 30, height: 42, borderRadius: 4, background: "#F6F1E3", color: red ? "#B3392E" : "#1B1B1B", border: "1px solid rgba(0,0,0,.4)", boxShadow: "0 1px 3px rgba(0,0,0,.35)", fontWeight: 700, fontSize: 12, lineHeight: 1.05, opacity: dim ? 0.45 : 1, textDecoration: dim ? "line-through" : "none" }}>
      <span>{c.face}</span><span>{c.s}</span>
    </span>
  );
}

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
  // cat: five isolation stops, separate accumulation per stop
  const [catLevel, setCatLevel] = useState(0);
  const [catStats, setCatStats] = useState(CAT_LEVELS.map(() => ({ match: 0, total: 0 })));
  const [lastBox, setLastBox] = useState(null);
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
  function openBoxes(n) {
    const p = CAT_LEVELS[catLevel].p;
    setCatStats((st) => {
      const a = st.map((x) => ({ ...x })); let last = null;
      for (let i = 0; i < n; i++) {
        const h = dealCatHand(p, rng.current);
        a[catLevel].total++; if (h.match) a[catLevel].match++;
        last = h;
      }
      setLastBox(last); return a;
    });
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

  return (
    <div style={{ minHeight: "100vh", background: world.bg, color: world.ink, transition: "background .4s,color .4s", fontFamily: "Iowan Old Style, Palatino Linotype, Georgia, serif" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "26px 18px 48px" }}>

        <h1 style={{ margin: 0, fontSize: 28 }}>The Card Table</h1>
        <div style={{ fontSize: 15.5, fontStyle: "italic", opacity: 0.92, marginTop: 8, lineHeight: 1.5 }}>
          Einstein was only half right — God doesn't play dice, but he does play cards.
        </div>
        <div style={{ fontSize: 13.5, opacity: 0.8, marginTop: 4, lineHeight: 1.5 }}>
          Three experiments with no randomness in their rules — whose odds still behave like quantum mechanics.
        </div>

        {/* mode tabs */}
        <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
          {[["cards", "The card table"], ["slit", "The double slit"], ["cat", "Schrödinger’s cat"]].map(([k, label]) => (
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
                  text={<>Each hand: <b>two hidden cards are dealt from a Euchre deck</b> — the 24 cards 9, 10, J, Q, K, A of a standard deck. Cards count by their order: 9 counts 1, up to ace counting 6. Red suits (♥♦) move your marker left, black (♠♣) right, by that count. The marker starts at 0. Question: <i>where does it end up?</i></>}
                  whyText={<>The deal is the <b>only randomness in the game</b> — it stands for not knowing the world's starting conditions. Everything after is fixed by the rules, so there are no dice to blame the strangeness on. The hidden card is the point: the world contains more than you can see, and the rules use that part too.</>} />
                <Rule n={2} why={why} setWhy={setWhy} ink={world.ink}
                  text={<>The only move is the <b>shuffle: a hidden card moves the marker by its rank</b>, behind the dealer's screen. Not random, and reversible — every move can be undone. Each hand is four moves: <b>the first card acts twice, then the second acts twice</b> — then showdown.</>}
                  whyText={<><b>Deterministic</b>: same input, same result — so probability can only come from what you can't see. <b>Reversible</b>: every move can be undone, so information can hide but never dies. Each card acting <b>twice, in step</b> doubles its move — so odd final positions become impossible: 24 exact nodes — and the two doubled cards <b>add</b>, so the allowed positions pile into an envelope shaped by the deck's own make-up. Stripes and shape, both derived; nothing is engineered.</>} />
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
              <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 130, background: "rgba(0,0,0,.25)", borderRadius: 8, padding: "6px 6px 0" }}>
                {bins.map((v, x) => (
                  <div key={x} style={{ flex: 1, height: `${(100 * v) / peak}%`, background: peekMode ? "#c05b52" : gold, borderRadius: "2px 2px 0 0", transition: "height .15s" }} />
                ))}
              </div>
              {(() => {
                const other = peekMode ? cardsOff : cardsOn;
                const oN = other.reduce((a, b) => a + b, 0);
                if (!oN) return null;
                return (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10.5, opacity: 0.7, marginBottom: 2 }}>
                      for comparison — peek {peekMode ? "OFF" : "ON"} ({oN} hands):
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 44, background: "rgba(0,0,0,.25)", borderRadius: 6, padding: "3px 6px 0", opacity: 0.6 }}>
                      {other.map((v, x) => (
                        <div key={x} style={{ flex: 1, height: `${(100 * v) / Math.max(1, ...other)}%`, background: peekMode ? gold : "#c05b52", borderRadius: "1px 1px 0 0" }} />
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div style={{ display: "flex", gap: 1, padding: "3px 6px 0", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10, opacity: 0.75 }}>
                {bins.map((_, x) => <div key={x} style={{ flex: 1, textAlign: "center" }}>{(x + LINE_LO) % 8 === 0 ? x + LINE_LO : ""}</div>)}
              </div>
              <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11.5, marginTop: 4, opacity: 0.8, textAlign: "center" }}>
                where the marker ended up (0 = where it started)
              </div>
              <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, marginTop: 8, opacity: 0.85 }}>
                this screen (peek {peekMode ? "ON" : "OFF"}): {total} hands
              </div>
              {lastHand && (
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }}>
                  <span style={{ opacity: 0.85 }}>last hand:</span>
                  {lastHand.peeked ? (
                    <>
                      <MiniCard c={lastHand.cards.a} dim /><MiniCard c={lastHand.cards.a2} />
                      <span style={{ opacity: 0.4 }}>|</span>
                      <MiniCard c={lastHand.cards.b} dim /><MiniCard c={lastHand.cards.b2} />
                      <span style={{ opacity: 0.8 }}>each first card burned after one move — marker moved {fm(lastHand.d)}</span>
                    </>
                  ) : (
                    <>
                      <MiniCard c={lastHand.cards.a} /><span style={{ opacity: 0.8 }}>×2</span>
                      <MiniCard c={lastHand.cards.b} /><span style={{ opacity: 0.8 }}>×2</span>
                      <span style={{ opacity: 0.8 }}>— marker moved {fm(lastHand.d)}, deterministically</span>
                    </>
                  )}
                </div>
              )}
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
                    switching on.</b> (Even the outermost bins are coherence-only: ±24 takes two
                    same-colour aces acting in step — a peeked hand, drawing its burns from a
                    depleted deck, can never get there.)
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* SCHRODINGER'S CAT */}
        {mode === "cat" && (
          <div style={{ background: world.panel, borderRadius: 12, padding: "14px 16px", marginTop: 14 }}>
            <button onClick={() => setRulesOpen(!rulesOpen)} style={{ background: "none", border: "none", cursor: "pointer", color: world.ink, padding: 0, fontWeight: 700, fontSize: 14 }}>
              The box, the hour, the world {rulesOpen ? "\u25BE" : "\u25B8"}
            </button>
            {rulesOpen && (
              <ol style={{ margin: "10px 0 2px", paddingLeft: 20, fontSize: 13.5, lineHeight: 1.65 }}>
                <Rule n={11} why={why} setWhy={setWhy} ink={world.ink}
                  text={<>The box: a <b>fate card is dealt, hidden</b> — ALIVE or DEAD, definite from the moment of sealing. Sealing the box means <i>you</i> can’t see it; the card doesn’t care.</>}
                  whyText={<>The deal is the only randomness, and it happens <b>once, at the start</b>. Nothing in this game is ever “both”: the famous alive+dead will turn out to be a <b>price on an odds sheet</b>, not a state of the cat.</>} />
                <Rule n={12} why={why} setWhy={setWhy} ink={world.ink}
                  text={<>The sealed hour: the fate card is <b>written into the burn pile and read back</b> — the two swaps of the card table. Left alone, the read-back is perfect: opening the box shows the sealed fate, <b>certainly</b>.</>}
                  whyText={<>Reversible bookkeeping — information hides but never dies. The certainty is the write-then-read theorem, and the test suite proves it over every configuration, not statistically.</>} />
                <Rule n={13} why={why} setWhy={setWhy} ink={world.ink}
                  text={<>The world: with probability set by the dial, <b>a stray photon peeks mid-hour</b> — rule 3, performed by the environment. Record made, fate card burned and replaced. Nobody has to be watching.</>}
                  whyText={<>An engineered cat state (dial at the left) is a real laboratory regime: nothing looks, and the certainty survives. An actual cat (dial at the right) is peeked <b>constantly</b> — air, warmth, the counter itself — so the “alive+dead” sheet at ½ becomes the <i>correct</i> price. Decoherence is this dial.</>} />
              </ol>
            )}
          </div>
        )}
        {mode === "cat" && (() => {
          const lv = CAT_LEVELS[catLevel];
          const anyN = catStats.reduce((a, s) => a + s.total, 0);
          const isoN = catStats[0].total, realN = catStats[CAT_LEVELS.length - 1].total;
          return (
            <div style={{ background: world.panel, borderRadius: 14, padding: "16px", marginTop: 14 }}>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 10 }}>
                A fate is sealed in, an hour passes behind the screen, the box is opened. The question
                a gambler asks: <b>will the fate at opening match the fate that was sealed?</b> The
                “alive + dead” story prices that bet at ½. Play the columns and see which sheet
                pays — the answer depends on the dial.
              </div>
              <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
                {CAT_LEVELS.map((L, i) => (
                  <button key={i} onClick={() => setCatLevel(i)}
                    style={{ flex: 1, minWidth: 88, padding: "7px 6px", borderRadius: 9, cursor: "pointer", background: world.panel, color: world.ink, fontWeight: 700, fontSize: 11.5, border: catLevel === i ? "2px solid #C9A227" : "1px solid rgba(128,128,128,.3)", opacity: catLevel === i ? 1 : 0.75 }}>
                    {L.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <button onClick={() => openBoxes(1)} style={btn()}>seal &amp; open 1 box</button>
                <button onClick={() => openBoxes(1000)} style={btn()}>1000 boxes</button>
                <button onClick={() => { setCatStats(CAT_LEVELS.map(() => ({ match: 0, total: 0 }))); setLastBox(null); }} style={btn()}>reset</button>
                <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, opacity: 0.85 }}>
                  photon odds this hour: {Math.round(lv.p * 100)}%
                </span>
              </div>
              <div style={{ position: "relative", height: 150, background: "rgba(0,0,0,.25)", borderRadius: 8, padding: "6px 6px 0", display: "flex", gap: 8 }}>
                <div style={{ position: "absolute", left: 6, right: 6, bottom: "50%", borderTop: "1px dashed rgba(240,234,218,.55)" }} />
                <div style={{ position: "absolute", right: 10, bottom: "51%", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 9.5, opacity: 0.7 }}>the “alive+dead” sheet: ½</div>
                {CAT_LEVELS.map((L, i) => {
                  const s = catStats[i];
                  const frac = s.total ? s.match / s.total : 0;
                  const exact = catOdds(L.p);
                  return (
                    <div key={i} onClick={() => setCatLevel(i)} style={{ flex: 1, position: "relative", cursor: "pointer", outline: catLevel === i ? "1px solid rgba(201,162,39,.8)" : "none", borderRadius: 4 }}>
                      <div style={{ position: "absolute", bottom: 0, left: "14%", right: "14%", height: `${100 * frac}%`, background: CAT_BAR[i], borderRadius: "2px 2px 0 0", transition: "height .15s" }} />
                      <div style={{ position: "absolute", left: "6%", right: "6%", bottom: `${100 * exact}%`, borderTop: "2px solid rgba(240,234,218,.95)" }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8, padding: "3px 6px 0", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10, opacity: 0.8 }}>
                {CAT_LEVELS.map((L, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center" }}>
                    {catStats[i].total ? `${Math.round((100 * catStats[i].match) / catStats[i].total)}%` : "—"}
                    <span style={{ opacity: 0.6 }}> · {catStats[i].total}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11.5, marginTop: 4, opacity: 0.8, textAlign: "center" }}>
                same-fate rate per isolation setting — tick: the exact law 1 − p/2 · dashes: the divisible price
              </div>
              {lastBox && (
                <div style={{ marginTop: 8, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, lineHeight: 1.6, opacity: 0.9 }}>
                  last box: sealed <b>{FATE[lastBox.dealt]}</b> — the hour passes{lastBox.envLooked ? " — a stray photon looked: record made, fate card burned and replaced" : ", unobserved"} — opened: <b>{FATE[lastBox.final]}</b> — {lastBox.match ? "same fate" : "fate changed"}{lastBox.envLooked ? "" : ", deterministically"}
                </div>
              )}
              {isoN > 30 && realN > 30 && (
                <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
                  The cat was never alive-and-dead: the fate card is definite in every hand, sealed to
                  opened. “Alive + dead” is the <b>divisible odds sheet</b> — the ½ a gambler must
                  quote when the hour’s bookkeeping runs through cards that nothing has looked at —
                  and at perfect isolation that sheet <b>loses money</b> at exactly the interference
                  rate, (1−p)/2 per box. Slide right and the world does the looking for you: each
                  stray photon is rule 3 without a mind attached, and by “an actual cat” the
                  divisible price is simply correct. Opening the box never decides the fate; it reveals
                  it — what costs is a record <i>during</i> the hour, whoever’s photon makes it.
                  <div style={{ marginTop: 8 }}>
                    The left column is not fiction: record-holding experiments hold ever-larger
                    “cats” — thousands of atoms at once — in exactly that column, and the book’s
                    registered wager (§1.6, §4.5) is that no scale ever redraws it. One box, one
                    cat: a single-system story, exactly this toy’s home turf.
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
                slits: ON means <b>a record of the path exists</b>. One honest difference from the card
                table: here the lookup tables are <b>engineered</b> — chosen so the pattern equals the
                quantum prediction. That such deterministic tables exist at all is the framework's
                claim; they are a dozen lines in engine.js if you want to check.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <button onClick={() => setDetector(!detector)} style={{ ...btn(), fontWeight: 700, background: detector ? "#c05b52" : "rgba(255,255,255,.12)", color: detector ? "#fff" : "inherit" }}>
                  slit detector: {detector ? "ON — recording paths" : "OFF"}
                </button>
                <button onClick={() => fire(1)} style={btn()}>fire 1</button>
                <button onClick={() => fire(1000)} style={btn()}>fire 1000</button>
                <button onClick={() => { setHitsOff(Array(NBINS).fill(0)); setHitsOn(Array(NBINS).fill(0)); setLastShot(null); }} style={btn()}>reset</button>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 130, background: "rgba(0,0,0,.25)", borderRadius: 8, padding: "6px 6px 0" }}>
                {hits.map((v, x) => (
                  <div key={x} style={{ flex: 1, height: `${(100 * v) / peak}%`, background: detector ? "#c05b52" : gold, borderRadius: "2px 2px 0 0", transition: "height .15s" }} />
                ))}
              </div>
              {(() => {
                const other = detector ? hitsOff : hitsOn;
                const oN = other.reduce((a, b) => a + b, 0);
                if (!oN) return null;
                return (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10.5, opacity: 0.7, marginBottom: 2 }}>
                      for comparison — detector {detector ? "OFF" : "ON"} ({oN} particles):
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 44, background: "rgba(0,0,0,.25)", borderRadius: 6, padding: "3px 6px 0", opacity: 0.6 }}>
                      {other.map((v, x) => (
                        <div key={x} style={{ flex: 1, height: `${(100 * v) / Math.max(1, ...other)}%`, background: detector ? gold : "#c05b52", borderRadius: "1px 1px 0 0" }} />
                      ))}
                    </div>
                  </div>
                );
              })()}
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
            </div>
          );
        })()}

        {/* audit + boundary */}
        <div style={{ marginTop: 16, fontSize: 12, opacity: 0.85, lineHeight: 1.6 }}>
          <div style={{ marginTop: 8 }}>
            Every hand's hidden cards are laid face-up above the moment it ends — but only
            records made <i>inside</i> a hand (rule 3) touch the pattern.
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
