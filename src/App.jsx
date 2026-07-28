import { useState, useRef } from "react";
import { swap, enumerate, dealHand, NBINS, FRINGE, SLIT_L, SLIT_R,
         fireBlind, fireL, fireR, SELF_TEST, ALL_PASS, TEST_LABEL, SLIT_TEST } from "./engine.js";

/* ================================================================== */
/* UI — one game, one choice, and the statistics are the score.        */
/* ================================================================== */

const cname = (b) => (b === 0 ? "RED" : "BLACK");
const ccol = (b) => (b === 0 ? "#B3392E" : "#1B1B1B");

function narrate(hand, t, insp) {
  switch (t.label) {
    case "deal":
      return insp
        ? `You are dealt ${cname(t.v)}. The hidden card happens to be ${cname(t.h)} — from up here you see everything.`
        : `You are dealt ${cname(t.v)}. A hidden card lies face down beside the deck.`;
    case "shuffle1":
      return insp
        ? `SWAP. Your dealt card just moved into the hidden spot; the old hidden card (${cname(t.v)}) is in your hand. Nothing is gone — your card is sitting right there, face down.`
        : `SWAP. Your card and the hidden card trade places. Your dealt card is now the hidden one — and a mystery card is in your hand. (If the game ended here: a pure coin flip.)`;
    case "peek":
      return insp
        ? `You peek: ${cname(t.peeked)}. Rule 3: a seen card is burned and replaced (${cname(t.h)} took its place). The card that remembered your deal is gone.`
        : `You peek at your card: ${cname(t.peeked)}. Rule 3: a seen card is burned and replaced with a fresh one. Looking is not free.`;
    case "shuffle2":
      return insp
        ? `SWAP. The hidden spot hands back whatever it was holding.`
        : `SWAP. The cards trade places once more.`;
    case "showdown":
      return `SHOWDOWN. Your card: ${cname(t.v)}. You were dealt ${cname(hand.dealt)}. ${hand.match ? "MATCH." : "NO MATCH."}`;
    default: return "";
  }
}

export default function CardTable() {
  const [seat, setSeat] = useState("player");
  const [hand, setHand] = useState(null);
  const [step, setStep] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(true);
  const [why, setWhy] = useState({});
  const [tally, setTally] = useState({ blindN: 0, blindM: 0, peekN: 0, peekM: 0 });
  const [mode, setMode] = useState("cards");
  const [detector, setDetector] = useState(false);
  const [hitsOff, setHitsOff] = useState(Array(NBINS).fill(0));
  const [hitsOn, setHitsOn] = useState(Array(NBINS).fill(0));
  const [lastShot, setLastShot] = useState(null);
  const rng = useRef(Math.random);

  const insp = seat === "inspector";
  const world = insp
    ? { bg: "#F2F4F1", ink: "#23404A", panel: "rgba(35,64,74,.06)" }
    : { bg: "radial-gradient(ellipse at 50% 30%, #256049 0%, #1E4D3B 55%, #123327 100%)", ink: "#F0EADA", panel: "rgba(0,0,0,.28)" };

  const atShowdown = hand && step === hand.trace.length - 1;
  const midStep = hand && !hand.peeked && step === 1;
  const cur = hand ? hand.trace[step] : null;

  function record(h) {
    setTally((t) => h.peeked
      ? { ...t, peekN: t.peekN + 1, peekM: t.peekM + h.match }
      : { ...t, blindN: t.blindN + 1, blindM: t.blindM + h.match });
  }
  function deal() { setHand(dealHand(false, rng.current)); setStep(0); }
  function next() {
    const target = Math.min(hand.trace.length - 1, step + 1);
    if (target === hand.trace.length - 1 && !hand.settled) { record(hand); setHand({ ...hand, settled: true }); }
    setStep(target);
  }
  function applyPeek() {
    const d = hand.trace[0], s1 = hand.trace[1];
    const freshH = rng.current() < 0.5 ? 0 : 1;
    const [v2, h2] = swap([s1.v, freshH]);
    const t = [d, s1, { label: "peek", v: s1.v, h: freshH, peeked: s1.v },
               { label: "shuffle2", v: v2, h: h2 }, { label: "showdown", v: v2, h: h2 }];
    setHand({ dealt: d.v, final: v2, match: v2 === d.v, peeked: true, trace: t });
    setStep(2);
  }
  function autoplay(peek, n) {
    setTally((t) => {
      let N = 0, M = 0;
      for (let i = 0; i < n; i++) { const h = dealHand(peek, rng.current); N++; M += h.match; }
      return peek ? { ...t, peekN: t.peekN + N, peekM: t.peekM + M }
                  : { ...t, blindN: t.blindN + N, blindM: t.blindM + M };
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

  const pct = (m, n) => (n ? Math.round((100 * m) / n) : null);
  const bp = pct(tally.blindM, tally.blindN), pp = pct(tally.peekM, tally.peekN);

  return (
    <div style={{ minHeight: "100vh", background: world.bg, color: world.ink, transition: "background .4s,color .4s", fontFamily: "Iowan Old Style, Palatino Linotype, Georgia, serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "26px 18px 48px" }}>

        <h1 style={{ margin: 0, fontSize: 28 }}>The Card Table</h1>
        <div style={{ fontSize: 13.5, opacity: 0.8, marginTop: 4, lineHeight: 1.5 }}>
          A game with no randomness in its rules — whose odds still behave like quantum mechanics.
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

        {/* rules */}
        {mode === "cards" && (<>

        <div style={{ background: world.panel, borderRadius: 12, padding: "14px 16px", marginTop: 16 }}>
          <button onClick={() => setRulesOpen(!rulesOpen)} style={{ background: "none", border: "none", cursor: "pointer", color: world.ink, padding: 0, fontWeight: 700, fontSize: 14 }}>
            The three rules {rulesOpen ? "\u25BE" : "\u25B8"}
          </button>
          {rulesOpen && (
            <ol style={{ margin: "10px 0 2px", paddingLeft: 20, fontSize: 13.5, lineHeight: 1.65 }}>
              <Rule n={1} why={why} setWhy={setWhy} ink={world.ink}
                text={<>You get one card, red or black, even odds. A <b>hidden card</b> lies beside it. Question: <i>after two shuffles, does your card match your deal?</i></>}
                whyText={<>The deal is the <b>only randomness in the game</b> — it stands for not knowing the world's starting conditions. Everything after is fixed by the rules, so there are no dice to blame the strangeness on. The hidden card is the point: the world contains more than you can see, and the rules use that part too.</>} />
              <Rule n={2} why={why} setWhy={setWhy} ink={world.ink}
                text={<>The only move is the <b>shuffle: your card and the hidden card trade places.</b> Not random. That's the entire game.</>}
                whyText={<><b>Deterministic</b>: same input, same result — so probability can only come from what you can't see. <b>Reversible</b>: a swap undoes itself, so information can hide but never dies. The swap is the smallest move coupling what you see to what you don't; the framework's real physics is built from exactly these two properties.</>} />
              <Rule n={3} why={why} setWhy={setWhy} ink={world.ink}
                text={<><b>Looking costs.</b> Peek at a card mid-game and it is burned and replaced with a fresh one.</>}
                whyText={<>In this toy, honestly: a house rule — the toy <i>imposes</i> what real physics <i>derives</i>. In physics there is no passive glance: to see a card you must interact with it. <b>Looking is copying</b> — a record now exists somewhere — and the certainty below is <i>made of</i> a correlation: the hidden card remembering your deal. Copying rearranges exactly that correlation. Minds are irrelevant: a machine that photographs the card and shows no one destroys the certainty just as thoroughly. What costs is that the record exists, not that anyone reads it.</>} />
            </ol>
          )}
        </div>

        </>)}

        {/* seat toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
          <button onClick={() => setSeat(insp ? "player" : "inspector")} style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, fontWeight: 700, padding: "10px 16px", borderRadius: 999, cursor: "pointer", border: "none", background: insp ? "#23404A" : "#C9A227", color: insp ? "#F2F4F1" : "#1B1B1B" }}>
            {insp ? "\u21A9 sit back down (player view)" : "\u2191 stand up (inspector view)"}
          </button>
          <span style={{ fontSize: 12.5, opacity: 0.75, flex: 1, minWidth: 200 }}>
            {insp ? "Every card face up, every step. Notice: no tricks anywhere." : "You see only what a player sees."}
          </span>
        </div>

        {/* the table */}
        {mode === "cards" && (<>

        <div style={{ background: world.panel, borderRadius: 14, padding: "20px 16px", marginTop: 14 }}>
          {!hand ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <button onClick={deal} style={{ ...btn(insp), fontSize: 15, padding: "10px 22px" }}>Deal</button>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "center", gap: 50 }}>
                <PlayCard bit={cur.v} faceUp={insp || cur.label === "deal" || cur.label === "showdown" || cur.label === "peek"} label="YOUR CARD" />
                <PlayCard bit={cur.h} faceUp={insp} label="HIDDEN CARD" />
              </div>
              <div style={{ margin: "16px auto 0", maxWidth: 500, textAlign: "center", fontSize: 14.5, lineHeight: 1.55, minHeight: 44 }}>
                {narrate(hand, cur, insp)}
              </div>
              {midStep && (
                <div style={{ textAlign: "center", marginTop: 12, fontSize: 13.5, background: insp ? "rgba(35,64,74,.10)" : "rgba(201,162,39,.16)", border: `1px dashed ${insp ? "#23404A" : "#C9A227"}`, borderRadius: 10, padding: "10px 12px" }}>
                  <b>Your one choice.</b> Play on blind — or look at your card?
                  <div style={{ marginTop: 8 }}>
                    <button onClick={next} style={{ ...btn(insp), fontWeight: 700 }}>play on →</button>{" "}
                    <button onClick={applyPeek} style={btn(insp)}>peek (burns your card)</button>
                  </div>
                </div>
              )}
              {atShowdown && (
                <div style={{ margin: "14px auto 0", maxWidth: 540, fontSize: 13.5, lineHeight: 1.6, background: insp ? "rgba(35,64,74,.08)" : "rgba(0,0,0,.22)", borderRadius: 10, padding: "12px 14px" }}>
                  {hand.peeked
                    ? <>Peeked hands are a fair coin flip. Your peek burned the card that remembered your deal, so the second swap handed back a stranger. <b>Looking destroyed the memory the game was going to use.</b></>
                    : <>Blind hands match <b>every single time</b>. The first swap hid your card; the second handed it back. Step-by-step reasoning (&ldquo;each swap is 50/50, so it's still 50/50&rdquo;) is simply wrong — the hidden card <b>remembers</b>. That failure of step-by-step odds is, structurally, quantum interference.</>}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14 }}>
                <button onClick={() => setStep(Math.max(0, step - 1))} style={btn(insp)} disabled={step === 0}>&larr; back</button>
                <button onClick={next} style={{ ...btn(insp), fontWeight: 700 }} disabled={atShowdown || midStep}>next →</button>
                <button onClick={deal} style={btn(insp)}>redeal</button>
              </div>
            </div>
          )}
        </div>

        </>)}

        {/* the scoreboard: the statistics ARE the result */}
        {mode === "cards" && (<>

        <div style={{ background: world.panel, borderRadius: 14, padding: "16px", marginTop: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>The scoreboard</div>
          <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13.5, lineHeight: 2 }}>
            <div>played blind:&nbsp;&nbsp;{tally.blindN} hands, {tally.blindM} matches{bp !== null && <b> — {bp}%</b>}
              {" "}<button onClick={() => autoplay(false, 20)} style={{ ...btn(insp), padding: "2px 10px", fontSize: 12 }}>+20</button></div>
            <div>after peeking: {tally.peekN} hands, {tally.peekM} matches{pp !== null && <b> — {pp}%</b>}
              {" "}<button onClick={() => autoplay(true, 20)} style={{ ...btn(insp), padding: "2px 10px", fontSize: 12 }}>+20</button></div>
          </div>
          {tally.blindN > 0 && tally.peekN > 0 && (
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
              Same cards, same shuffles. The only difference between the rows is whether a record of the
              middle of the game <i>exists</i>. The gap between {bp}% and {pp}% is quantum interference —
              and a casino pricing both rows at 50/50 would be bankrupted by the top one.
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <button onClick={() => setTally({ blindN: 0, blindM: 0, peekN: 0, peekM: 0 })} style={btn(insp)}>reset</button>
          </div>
        </div>

        </>)}

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
                  <div key={x} style={{ flex: 1, height: `${(100 * v) / peak}%`, background: detector ? "#c05b52" : (insp ? "#23404A" : "#D8C878"), borderRadius: "2px 2px 0 0", transition: "height .15s" }} />
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
            engine self-test: {ALL_PASS && SLIT_TEST.pass ? "PASS" : "FAIL"} ({SELF_TEST.map((t) => `${TEST_LABEL[t.p]} ${t.got}`).join(" · ")} · fringe nodes {SLIT_TEST.nodes}) — the entire engine is ~40 lines at the top of this file. Read it: there is no trick to find.
          </div>
          <div style={{ marginTop: 8 }}>
            Honest boundary: this is a local classical mechanism. It reproduces interference, indivisibility,
            and measurement-as-intervention — but no card game can violate a Bell inequality. That part belongs
            to the full framework (<i>The Incompleteness of Observation</i>, ch. 1 &amp; 3), not the toy.
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

function PlayCard({ bit, faceUp, label }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 72, height: 102, borderRadius: 8, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(0,0,0,.45)", boxShadow: "0 3px 10px rgba(0,0,0,.35)", background: faceUp ? "#F6F1E3" : "repeating-linear-gradient(135deg,#27506b 0 7px,#1d3d53 7px 14px)" }}>
        {faceUp && <span style={{ color: ccol(bit), fontSize: 32, fontWeight: 700 }}>{bit === 0 ? "\u2665" : "\u2660"}</span>}
      </div>
      <div style={{ fontSize: 10.5, letterSpacing: ".12em", marginTop: 6, opacity: 0.75 }}>{label}</div>
    </div>
  );
}

const btn = (insp) => ({ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer", border: "1px solid rgba(128,128,128,.5)", background: insp ? "#fff" : "rgba(255,255,255,.12)", color: "inherit" });
