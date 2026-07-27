import { useState, useRef } from "react";

/* ================================================================== */
/* ENGINE — pure, framework-free, exact. The physics lives here.       */
/* State (v, h[, p]): your card, the burn card, the dealer's pocket.   */
/* The shuffle is the swap (v, h) -> (h, v). Nothing else exists.      */
/* ================================================================== */

const swap = ([v, h]) => [h, v];

function enumerate(game) {
  const cases = [];
  if (game === "cond") {
    for (const v0 of [0, 1]) for (const h0 of [0, 1]) for (const p0 of [0, 1]) {
      let [v, h] = p0 === 1 ? swap([v0, h0]) : [v0, h0];
      [v, h] = swap([v, h]);
      cases.push(v === v0);
    }
  } else {
    for (const v0 of [0, 1]) for (const h0 of [0, 1]) {
      if (game === "peek") {
        for (const h2 of [0, 1]) {
          const s1 = swap([v0, h0]); const s2 = swap([s1[0], h2]);
          cases.push(s2[0] === v0);
        }
      } else {
        const s1 = swap([v0, h0]);
        const last = game === "one" ? s1 : swap(s1);
        cases.push(last[0] === v0);
      }
    }
  }
  const n = cases.filter(Boolean).length, d = cases.length;
  const g = (a, b) => (b ? g(b, a % b) : a || 1);
  const k = g(n, d);
  return { num: n / k || 0, den: n === 0 ? 1 : d / k };
}

function dealHand(game, rng) {
  const v0 = rng() < 0.5 ? 0 : 1, h0 = rng() < 0.5 ? 0 : 1;
  if (game === "cond") {
    const p0 = rng() < 0.5 ? 0 : 1;
    const t = [{ label: "deal", v: v0, h: h0, p: p0 }];
    let [v, h] = p0 === 1 ? swap([v0, h0]) : [v0, h0];
    t.push({ label: "condshuffle", v, h, p: p0, fired: p0 === 1 });
    [v, h] = swap([v, h]);
    t.push({ label: "shuffle2", v, h, p: p0 });
    t.push({ label: "showdown", v, h, p: p0 });
    return { dealt: v0, final: v, match: v === v0, trace: t };
  }
  const t = [{ label: "deal", v: v0, h: h0 }];
  let [v, h] = swap([v0, h0]);
  t.push({ label: "shuffle", v, h });
  if (game === "peek") { const seen = v; h = rng() < 0.5 ? 0 : 1; t.push({ label: "peek", v, h, peeked: seen }); }
  if (game !== "one") { [v, h] = swap([v, h]); t.push({ label: "shuffle2", v, h }); }
  t.push({ label: "showdown", v, h });
  return { dealt: v0, final: v, match: v === v0, trace: t };
}

const TABLE = { one: [1, 2], two: [1, 1], peek: [1, 2], cond: [3, 4] };
const SELF_TEST = Object.entries(TABLE).map(([p, [n, d]]) => {
  const r = enumerate(p); return { p, got: `${r.num}/${r.den}`, pass: r.num === n && r.den === d };
});
const ALL_PASS = SELF_TEST.every((t) => t.pass);

/* ================================================================== */
/* UI — one guided path: four numbered games, one table, one counter.  */
/* ================================================================== */

const ORDER = ["two", "cond"];
const GAMES = {
  two: { name: "The surprise", sub: "two shuffles — and you may peek" },
  cond: { name: "The real table", sub: "a conditional shuffle — a real gamble" },
};
const TEST_LABEL = { one: "1 shuffle", two: "2 shuffles", peek: "peeked", cond: "conditional" };

const cname = (b) => (b === 0 ? "RED" : "BLACK");
const ccol = (b) => (b === 0 ? "#B3392E" : "#1B1B1B");

function narrate(step, t, game, seat) {
  const insp = seat === "inspector";
  switch (t.label) {
    case "deal":
      return insp
        ? `You are dealt ${cname(t.v)}. The burn card happens to be ${cname(t.h)}${game === "cond" ? `, the dealer's pocket card is ${cname(t.p)}` : ""} — you can see everything from up here.`
        : `You are dealt ${cname(t.v)}. A burn card lies face down beside the deck.${game === "cond" ? " The dealer also holds a hidden pocket card." : " After the first swap you will face a choice."} Nobody at your seat knows the hidden cards.`;
    case "shuffle":
      return insp
        ? `SWAP. Your ${cname(t.h)} just moved INTO the burn pile, and the old burn card (${cname(t.v)}) is now in your hand. Your dealt card is not gone — it is sitting right there, face down.`
        : `SWAP. Your card and the burn card trade places. Whatever you were dealt is now lying in the burn pile — and a mystery card is in your hand. (If the game ended right here, it would be a pure coin flip.)`;
    case "condshuffle":
      return insp
        ? (t.fired
            ? `The dealer's pocket card is BLACK — the conditional shuffle FIRES: your dealt card moved into the burn pile.`
            : `The dealer's pocket card is RED — the conditional shuffle does NOT fire. Nothing moves.`)
        : `The dealer checks the pocket card. If it's black, your card and the burn card trade places; if red, nothing moves. Something may or may not have just happened.`;
    case "peek":
      return insp
        ? `You peek: ${cname(t.peeked)}. House rule: a seen card is burned and replaced with a fresh one. The card that remembered your deal is gone.`
        : `You peek at your card: ${cname(t.peeked)}. House rule: a seen card is burned and replaced with a fresh, unrelated one. Looking is not free.`;
    case "shuffle2":
      return insp
        ? `SWAP. The burn pile hands back whatever it was holding.`
        : `SWAP. Your card and the burn card trade places${game === "cond" ? "" : " once more"}.`;
    case "showdown":
      return `SHOWDOWN. Your card: ${cname(t.v)}. You were dealt ${cname(step.dealt)}. ${step.match ? "MATCH." : "NO MATCH."}`;
    default: return "";
  }
}

const EXPLAIN = {
  one: "One swap hands you the burn card, and the burn card was 50/50. One shuffle = a coin flip. Nothing strange yet.",
  two: "Each swap alone is a coin flip — yet two of them are a guarantee. The first swap hid your card in the burn pile; the second handed it back. Reasoning street-by-street (\u201Cafter shuffle one it's 50/50, so after shuffle two it's still 50/50\u201D) gives the wrong answer, because the burn pile remembers. That failure of step-by-step odds is, structurally, quantum interference.",
  peek: "Same two swaps — but your peek burned the card that remembered your deal, and a fresh card took its place. The second swap hands back a stranger. Looking destroyed the memory the game was going to use. That is what measurement does.",
  cond: "The pocket card decides whether the first swap happens. Where it fired (black pocket), the two swaps complete the round trip — certain match. Where it didn't (red), only the second swap runs — a coin flip. Blend: 3 in 4. Step-by-step reasoning still says 50/50 and is still wrong — by a quarter now instead of a half. This is partial interference, the general case: real interferometers sit at angles like this, not only at the extremes.",
};

export default function CardTable() {
  const [seat, setSeat] = useState("player");
  const [game, setGame] = useState("one");
  const [hand, setHand] = useState(null);
  const [step, setStep] = useState(0);
  const [guess, setGuess] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(true);
  const [why, setWhy] = useState({});
  const [bankroll, setBankroll] = useState(100);
  const [bets, setBets] = useState([]);
  const [lastPlay, setLastPlay] = useState(null);
  const [handNo, setHandNo] = useState(0);
  const rng = useRef(Math.random);

  const insp = seat === "inspector";
  const world = insp
    ? { bg: "#F2F4F1", ink: "#23404A", panel: "rgba(35,64,74,.06)" }
    : { bg: "radial-gradient(ellipse at 50% 30%, #256049 0%, #1E4D3B 55%, #123327 100%)", ink: "#F0EADA", panel: "rgba(0,0,0,.28)" };

  const actual = enumerate(game);
  const truth = actual.num / actual.den;
  const atShowdown = hand && step === hand.trace.length - 1;
  const beforeShowdown = hand && step === hand.trace.length - 2;
  const cur = hand ? hand.trace[step] : null;
  const oddsStr = actual.den === 1 ? "certain" : `${actual.num} in ${actual.den}`;

  function switchGame(k) { setGame(k); setHand(null); setGuess(null); setBets([]); setLastPlay(null); setHandNo(0); }
  function deal() {
    const refund = hand && !hand.settled ? 0.5 : 0;   // abandoning an unfinished hand voids its ticket
    setBankroll((x) => Math.round((x - 0.5 + refund) * 2) / 2);
    setHand(dealHand(game, rng.current)); setStep(0); setGuess(null);
  }
  function next() {
    if (beforeShowdown && guess === null) return;
    const target = Math.min(hand.trace.length - 1, step + 1);
    if (target === hand.trace.length - 1 && !hand.settled) {
      const pnl = (hand.match ? 1 : 0) - 0.5;
      setBankroll((x) => Math.round((x + (hand.match ? 1 : 0)) * 2) / 2);   // ticket was paid at the deal
      setBets((b) => [...b, { pnl, match: hand.match }].slice(-300));
      setHandNo((n) => n + 1);
      setHand({ ...hand, settled: true });
    }
    setStep(target);
  }
  function applyPeek() {
    // taken between the shuffles of the two-shuffle game: burns your card, rebuilds the hand
    const d = hand.trace[0], s1 = hand.trace[1];
    const seen = s1.v, freshH = rng.current() < 0.5 ? 0 : 1;
    const [v2, h2] = swap([s1.v, freshH]);
    const t = [d, s1, { label: "peek", v: s1.v, h: freshH, peeked: seen },
               { label: "shuffle2", v: v2, h: h2 }, { label: "showdown", v: v2, h: h2 }];
    setHand({ dealt: d.v, final: v2, match: v2 === d.v, peeked: true, trace: t });
    setStep(2); setGuess(null);
  }

  // Auto-play: n blind hands, each carrying the standard 1/2 ticket, settled instantly.
  // Same economics as the table above — just fast-forwarded.
  function buy(n) {
    let bk = bankroll; const hist = [...bets];
    let matches = 0, delta = 0;
    for (let i = 0; i < n; i++) {
      const h = dealHand(game, rng.current);
      const pnl = (h.match ? 1 : 0) - 0.5;
      bk += pnl; delta += pnl; if (h.match) matches++;
      hist.push({ pnl, match: h.match });
    }
    const startNo = handNo + 1;
    const certain = actual.den === 1;
    const msg = n === 1
      ? `Hand #${startNo}: ${matches ? "match" : "no match"}${certain ? " — as it must be; this game never misses" : ""}. Ticket cost ½, paid ${matches}. You: ${delta > 0 ? "+" : ""}${delta}.`
      : `Hands #${startNo}–#${startNo + n - 1}: ${matches} of ${n} matched${certain ? " (all — this game never misses)" : ""}. ${n} tickets at ½ paid out ${matches}. You: ${delta > 0 ? "+" : ""}${delta} chips.`;
    setHandNo(handNo + n); setLastPlay(msg);
    setBankroll(Math.round(bk * 2) / 2); setBets(hist.slice(-300));
  }

  return (
    <div style={{ minHeight: "100vh", background: world.bg, color: world.ink, transition: "background .4s,color .4s", fontFamily: "Iowan Old Style, Palatino Linotype, Georgia, serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "26px 18px 48px" }}>

        <h1 style={{ margin: 0, fontSize: 28 }}>The Card Table</h1>
        <div style={{ fontSize: 13.5, opacity: 0.8, marginTop: 4, lineHeight: 1.5 }}>
          A card game with no randomness in its rules — whose odds still behave like quantum mechanics.
        </div>

        {/* house rules */}
        <div style={{ background: world.panel, borderRadius: 12, padding: "14px 16px", marginTop: 16 }}>
          <button onClick={() => setRulesOpen(!rulesOpen)} style={{ background: "none", border: "none", cursor: "pointer", color: world.ink, padding: 0, fontWeight: 700, fontSize: 14 }}>
            House rules {rulesOpen ? "\u25BE" : "\u25B8"}
          </button>
          {rulesOpen && (
            <ol style={{ margin: "10px 0 2px", paddingLeft: 20, fontSize: 13.5, lineHeight: 1.65 }}>
              <Rule n={1} why={why} setWhy={setWhy} ink={world.ink}
                text={<><b>The deal.</b> You get one card, red or black, even odds. One <b>burn card</b> — also red or black — lies face down. The question in every game: <i>at showdown, does your card match the one you were dealt?</i></>}
                whyText={<>This is the <b>only randomness in the entire game</b>, and it stands for one thing: you don't know the world's starting conditions. Every move after the deal is fixed by the rules — so whatever strangeness the odds show later, there are no dice in the machinery to blame it on. And the burn card is the whole point: the world contains more than your seat can see, and the rules are allowed to use that part too.</>} />
              <Rule n={2} why={why} setWhy={setWhy} ink={world.ink}
                text={<><b>The shuffle.</b> There is exactly one shuffle move, and it is not random: <b>your card and the burn card trade places.</b> Every game below is just deals and swaps.</>}
                whyText={<>Two deliberate choices. <b>Deterministic:</b> same input, same result, every time — so probability can only ever come from what you can't see, never from the rules. <b>Reversible:</b> a swap undoes itself, so nothing is ever erased — information about your deal can <i>hide</i>, but the dynamics cannot destroy it. The swap is simply the smallest move that couples what you see to what you don't. The framework's real physics is built from exactly these two properties.</>} />
              <Rule n={3} why={why} setWhy={setWhy} ink={world.ink}
                text={<><b>Looking costs.</b> If you peek at a card mid-game, that card is immediately burned and replaced with a fresh one. Looking is a physical act with consequences — not a free glance.</>}
                whyText={<>In this toy, honestly: it's a house rule. A plain card wouldn't care if you glanced at it — and without this rule, the two-shuffle game would stay certain even after a peek. The toy <i>imposes</i> what real physics <i>derives</i>. In physics there is no passive glance: to see a card you must interact with it — bounce light off it, correlate a camera or an eye with its value. <b>Looking is copying</b> — a record of the card now exists somewhere in the world. And the certainty in the two-shuffle game was <i>made of</i> a correlation: the burn card remembering your deal, waiting to hand it back. Copying the card's value into a new record rearranges exactly those correlations, and the clean hand-back is gone. Sharpest form: minds are irrelevant. A machine that photographs the card and shows the photo to no one destroys the certainty just as thoroughly. What costs is that the record <i>exists</i> — not that anyone reads it.</>} />
            </ol>
          )}
        </div>

        {/* seat toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
          <button onClick={() => setSeat(insp ? "player" : "inspector")} style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, fontWeight: 700, padding: "10px 16px", borderRadius: 999, cursor: "pointer", border: "none", background: insp ? "#23404A" : "#C9A227", color: insp ? "#F2F4F1" : "#1B1B1B" }}>
            {insp ? "\u21A9 sit back down (player view)" : "\u2191 stand up (inspector view)"}
          </button>
          <span style={{ fontSize: 12.5, opacity: 0.75, flex: 1, minWidth: 200 }}>
            {insp ? "Every card face up, the whole time. Notice: no tricks anywhere." : "You see only what a player sees."}
          </span>
        </div>

        {/* game progression */}
        <div style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
          {ORDER.map((k, i) => (
            <button key={k} onClick={() => switchGame(k)}
              style={{ flex: "1 1 150px", textAlign: "left", padding: "9px 11px", borderRadius: 10, cursor: "pointer", background: world.panel, color: world.ink, border: game === k ? `2px solid ${insp ? "#23404A" : "#C9A227"}` : "1px solid rgba(128,128,128,.3)", opacity: game === k ? 1 : 0.75 }}>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Game {i + 1}</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{GAMES[k].name}</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>{GAMES[k].sub}</div>
            </button>
          ))}
        </div>

        {/* the table */}
        <div style={{ background: world.panel, borderRadius: 14, padding: "20px 16px", marginTop: 12 }}>
          {!hand ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <button onClick={deal} style={{ ...btn(insp), fontSize: 15, padding: "10px 22px" }}>Deal (ticket: ½)</button>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "center", gap: game === "cond" ? 30 : 50 }}>
                <PlayCard bit={cur.v} faceUp={insp || cur.label === "deal" || cur.label === "showdown" || cur.label === "peek"} label="YOUR CARD" />
                <PlayCard bit={cur.h} faceUp={insp} label="BURN CARD" />
                {game === "cond" && <PlayCard bit={cur.p} faceUp={insp} label="DEALER'S POCKET" />}
              </div>
              <div style={{ margin: "16px auto 0", maxWidth: 520, textAlign: "center", fontSize: 14.5, lineHeight: 1.55, minHeight: 44 }}>
                {narrate(hand, cur, game, seat)}
              </div>
              {beforeShowdown && guess === null && (
                <div style={{ textAlign: "center", marginTop: 14 }}>
                  <div style={{ fontSize: 13.5, marginBottom: 8 }}>Before you look — the odds your card matches your deal?</div>
                  <button onClick={() => setGuess("half")} style={btn(insp)}>50 / 50</button>{" "}
                  <button onClick={() => setGuess("sure")} style={btn(insp)}>Certain</button>{" "}
                  {game === "cond" && <button onClick={() => setGuess("partial")} style={btn(insp)}>In between</button>}
                </div>
              )}
              {atShowdown && (
                <div style={{ margin: "14px auto 0", maxWidth: 560, fontSize: 13.5, lineHeight: 1.6, background: insp ? "rgba(35,64,74,.08)" : "rgba(0,0,0,.22)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    True odds: {hand.peeked ? "1 in 2 — your peek reset them" : oddsStr}
                    {guess && (() => { const correct = hand.peeked ? "half" : actual.den === 1 ? "sure" : actual.num === 1 ? "half" : "partial";
                      const names = { sure: "certain", half: "50/50", partial: "in between" };
                      return ` — you guessed ${names[guess]}${guess === correct ? " \u2713" : ""}`; })()}
                  </div>
                  <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12.5, marginBottom: 6 }}>
                    Your ticket: paid ½ at the deal → collected {hand.match ? 1 : 0} ({hand.match ? "+½" : "−½"})
                    {hand.peeked && " — after your peek this was a fair coin flip; the edge you'd paid for was already gone"}
                  </div>
                  {hand.peeked ? EXPLAIN.peek + " You bought this ticket at ½ when it was worth " + (game === "cond" ? "¾" : "1") + ". Then you looked, and it became worth exactly what you paid. The peek cost you the difference — the cost of looking, measured in chips." : EXPLAIN[game]}
                </div>
              )}
              {game === "two" && !hand.peeked && step === 1 && (
                <div style={{ textAlign: "center", marginTop: 12, fontSize: 13.5, background: insp ? "rgba(35,64,74,.10)" : "rgba(201,162,39,.16)", border: `1px dashed ${insp ? "#23404A" : "#C9A227"}`, borderRadius: 10, padding: "10px 12px" }}>
                  <b>Your call.</b> Play on blind — or look at your card now?
                  <div style={{ marginTop: 8 }}>
                    <button onClick={applyPeek} style={btn(insp)}>peek (burns your card)</button>{" "}
                    <button onClick={next} style={{ ...btn(insp), fontWeight: 700 }}>play on →</button>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14 }}>
                <button onClick={() => setStep(Math.max(0, step - 1))} style={btn(insp)} disabled={step === 0}>&larr; back</button>
                <button onClick={next} style={{ ...btn(insp), fontWeight: 700 }} disabled={atShowdown || (beforeShowdown && guess === null)}>
                  {beforeShowdown ? "showdown \u2192" : "next \u2192"}
                </button>
                <button onClick={deal} style={btn(insp)}>redeal (new ticket: ½)</button>
              </div>
            </div>
          )}
        </div>

        {/* the counter — one fixed framing, no modes */}
        <div style={{ background: world.panel, borderRadius: 14, padding: "16px", marginTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>The counter</div>
          <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6, margin: "6px 0 10px" }}>
            Every hand you deal above carries a ticket, bought at the house's lazy price:
            <b> ½ a chip, pays 1 on a match</b> (&ldquo;each shuffle is 50/50,&rdquo; says the house).
            True odds this game: <b>{oddsStr}</b> — so blind hands are bought at a discount, and
            <b> peeking burns an edge you already paid for</b>. The meter below is interference,
            collected in cash. (Sell at the lazy price yourself and it flows the other way:
            mispricing is a transfer, not a fine.)
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 26, fontWeight: 700 }}>
              {bankroll} <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.7 }}>chips</span>
            </div>
            <button onClick={() => buy(100)} style={btn(insp)}>Auto-play 100 blind hands</button>
            <button onClick={() => { setBankroll(100); setBets([]); setLastPlay(null); setHandNo(0); }} style={btn(insp)}>Reset</button>
          </div>
          {lastPlay && (
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55, background: insp ? "rgba(35,64,74,.08)" : "rgba(0,0,0,.22)", borderRadius: 8, padding: "9px 12px" }}>
              {lastPlay}
              {bankroll >= 200 && <b> You've doubled your stack off a house that won't stop reasoning step-by-step. This is what understanding the game is worth.</b>}
            </div>
          )}
          {bets.length > 0 && (
            <>
              <div style={{ marginTop: 10, height: 14, display: "flex", gap: 1 }}>
                {bets.slice(-80).map((b, i) => (
                  <div key={i} title={b.pnl > 0 ? "won" : "lost"} style={{ flex: 1, borderRadius: 1, background: b.pnl > 0 ? (insp ? "#1c6e46" : "#D8C878") : "#c05b52" }} />
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 12.5, fontFamily: "ui-monospace, Menlo, monospace", opacity: 0.9 }}>
                {(() => {
                  const rate = bets.reduce((s, b) => s + b.pnl, 0) / bets.length;
                  return `Rate: ${rate >= 0 ? "+" : ""}${rate.toFixed(2)} chips/hand over ${bets.length} hands — the interference term, collected in cash.`;
                })()}
              </div>
            </>
          )}
        </div>

        {/* audit + boundary */}
        <div style={{ marginTop: 16, fontSize: 12, opacity: 0.85, lineHeight: 1.6 }}>
          <div style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>
            engine self-test: {ALL_PASS ? "PASS" : "FAIL"} ({SELF_TEST.map((t) => `${TEST_LABEL[t.p]} ${t.got}`).join(" · ")}) — the entire engine is ~60 lines at the top of this file. Read it: there is no trick to find.
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

const btn = (insp) => ({ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer", border: "1px solid rgba(128,128,128,.5)", background: insp ? "#fff" : "rgba(255,255,255,.12)", color: "inherit", opacity: 1 });
