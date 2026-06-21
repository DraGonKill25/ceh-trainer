import React, { useState, useMemo, useEffect, useRef } from "react";
import QUESTIONS_DATA from "./data/questions.json";

const QUESTIONS = QUESTIONS_DATA;

// ---------- utils ----------
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Prépare une question : mélange l'ordre des choix tout en gardant trace des bons indices
function prepareQuestion(q) {
  const order = shuffle(q.choices.map((_, i) => i));
  const choices = order.map((origIdx) => q.choices[origIdx]);
  const correct = order
    .map((origIdx, newIdx) => (q.correct.includes(origIdx) ? newIdx : -1))
    .filter((x) => x >= 0);
  return { ...q, choices, correct };
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

// Détecte si l'énoncé contient un bloc de code (multi-lignes ou mots-clés techniques)
function splitQuestion(text) {
  if (text.includes("\n")) {
    const lines = text.split("\n");
    // Première ligne = énoncé, le reste = bloc code si ça ressemble à du code
    const intro = lines[0];
    const rest = lines.slice(1).join("\n").trim();
    return { intro, code: rest };
  }
  return { intro: text, code: null };
}

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

// ---------- composants ----------
function Choice({ letter, text, state, onClick, multi, disabled }) {
  // state: 'idle' | 'selected' | 'correct' | 'wrong' | 'missed'
  const base = {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    padding: "0.85rem 1rem",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: "2px",
    cursor: disabled ? "default" : "pointer",
    marginBottom: "0.6rem",
    background: "var(--card2)",
    transition: "all 0.12s ease",
    fontFamily: "var(--mono)",
    fontSize: "0.92rem",
    lineHeight: 1.5,
    color: "var(--text)",
    position: "relative",
  };
  const styles = { ...base };
  if (state === "selected") {
    styles.borderColor = "var(--green)";
    styles.background = "rgba(57,255,136,0.07)";
    styles.boxShadow = "0 0 0 1px var(--green) inset";
  } else if (state === "correct") {
    styles.borderColor = "var(--green)";
    styles.background = "rgba(57,255,136,0.13)";
    styles.boxShadow = "0 0 14px rgba(57,255,136,0.25)";
  } else if (state === "wrong") {
    styles.borderColor = "var(--red)";
    styles.background = "rgba(255,77,90,0.12)";
  } else if (state === "missed") {
    styles.borderColor = "var(--amber)";
    styles.background = "rgba(255,184,0,0.10)";
    styles.borderStyle = "dashed";
  }
  const badge = {
    flexShrink: 0,
    width: "1.5rem",
    height: "1.5rem",
    borderRadius: multi ? "3px" : "50%",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "var(--dim)",
    background: "var(--bg)",
  };
  const badgeStyles = { ...badge };
  let mark = letter;
  if (state === "selected") {
    badgeStyles.color = "var(--green)";
    badgeStyles.borderColor = "var(--green)";
  } else if (state === "correct") {
    badgeStyles.color = "var(--bg)";
    badgeStyles.background = "var(--green)";
    badgeStyles.borderColor = "var(--green)";
    mark = "✓";
  } else if (state === "wrong") {
    badgeStyles.color = "var(--bg)";
    badgeStyles.background = "var(--red)";
    badgeStyles.borderColor = "var(--red)";
    mark = "✕";
  } else if (state === "missed") {
    badgeStyles.color = "var(--amber)";
    badgeStyles.borderColor = "var(--amber)";
    mark = "✓";
  }
  return (
    <div style={styles} onClick={disabled ? undefined : onClick}>
      <div style={badgeStyles}>{mark}</div>
      <div style={{ flex: 1, whiteSpace: "pre-wrap" }}>{text}</div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("home"); // home | quiz | results
  const [mode, setMode] = useState("training"); // training | exam
  const [count, setCount] = useState(20);
  const [deck, setDeck] = useState([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState([]); // indices sélectionnés pour la Q courante
  const [validated, setValidated] = useState(false); // training: réponse validée
  const [answers, setAnswers] = useState({}); // {questionIndex: {selected, correct(bool)}}
  const scrollRef = useRef(null);

  const total = QUESTIONS.length;

  const sourceStats = useMemo(() => {
    const stats = {};
    QUESTIONS.forEach((q) => {
      const s = q.source || "unknown";
      stats[s] = (stats[s] || 0) + 1;
    });
    return stats;
  }, []);

  function start(selectedMode, n) {
    const limit = Math.min(Math.max(1, n), total);
    const prepared = shuffle(QUESTIONS).slice(0, limit).map(prepareQuestion);
    setDeck(prepared);
    setMode(selectedMode);
    setIdx(0);
    setSelected([]);
    setValidated(false);
    setAnswers({});
    setScreen("quiz");
  }

  const current = deck[idx];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [idx, screen]);

  function toggleChoice(i) {
    if (validated) return;
    if (current.multi) {
      setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
    } else {
      setSelected([i]);
    }
  }

  function recordAndNext(isLast) {
    const isCorrect = arraysEqual(selected, current.correct);
    const newAnswers = { ...answers, [idx]: { selected: [...selected], isCorrect } };
    setAnswers(newAnswers);
    if (isLast) {
      setScreen("results");
    } else {
      setIdx((i) => i + 1);
      setSelected([]);
      setValidated(false);
    }
  }

  function handlePrimary() {
    const isLast = idx === deck.length - 1;
    if (mode === "training" && !validated) {
      // valider d'abord (feedback immédiat)
      setValidated(true);
      const isCorrect = arraysEqual(selected, current.correct);
      setAnswers((a) => ({ ...a, [idx]: { selected: [...selected], isCorrect } }));
      return;
    }
    // exam mode OR training already validated -> next
    if (mode === "exam") {
      recordAndNext(isLast);
    } else {
      // training validated -> go next
      if (isLast) setScreen("results");
      else {
        setIdx((i) => i + 1);
        setSelected([]);
        setValidated(false);
      }
    }
  }

  function choiceState(i) {
    if (mode === "training" && validated) {
      const isCorrectChoice = current.correct.includes(i);
      const isSelected = selected.includes(i);
      if (isCorrectChoice && isSelected) return "correct";
      if (isCorrectChoice && !isSelected) return "missed";
      if (!isCorrectChoice && isSelected) return "wrong";
      return "idle";
    }
    return selected.includes(i) ? "selected" : "idle";
  }

  // ---------- RESULTS ----------
  const results = useMemo(() => {
    if (screen !== "results") return null;
    let correct = 0;
    deck.forEach((q, i) => {
      const a = answers[i];
      if (a && a.isCorrect) correct++;
    });
    const pct = Math.round((correct / deck.length) * 100);
    return { correct, total: deck.length, pct, pass: pct >= 70 };
  }, [screen, answers, deck]);

  // ============ RENDER ============
  return (
    <div style={S.root} ref={scrollRef}>
      <style>{CSS}</style>
      <div style={S.scanline} />

      {/* HEADER */}
      <header style={S.header}>
        <div style={S.logo}>
          <span style={{ color: "var(--green)" }}>root@ceh</span>
          <span style={{ color: "var(--dim)" }}>:~$</span>
          <span style={{ color: "var(--text)" }}> ./ceh_trainer</span>
          <span className="blink" style={{ color: "var(--green)" }}>_</span>
        </div>
        {screen === "quiz" && (
          <button style={S.quitBtn} onClick={() => setScreen("home")}>
            [ ABORT ]
          </button>
        )}
      </header>

      {/* HOME */}
      {screen === "home" && (
        <main style={S.main} className="fade">
          <div style={S.hero}>
            <pre style={S.ascii}>{ASCII}</pre>
            <p style={S.tagline}>
              CEH v13 — Exam 312-50v13 // {total} questions // mode aléatoire
            </p>
          </div>

          <div style={S.modeGrid}>
            <div style={S.modeCard}>
              <div style={S.modeTag}>MODE 01</div>
              <h2 style={S.modeTitle}>Entraînement</h2>
              <p style={S.modeDesc}>
                Feedback <strong>immédiat</strong> à chaque validation. Bonne réponse,
                mauvaise réponse et réponses manquées affichées instantanément. Idéal
                pour apprendre.
              </p>
              <div style={S.feat}>→ correction en direct</div>
              <div style={S.feat}>→ pas de chrono</div>
            </div>

            <div style={S.modeCard}>
              <div style={{ ...S.modeTag, color: "var(--amber)", borderColor: "var(--amber)" }}>
                MODE 02
              </div>
              <h2 style={S.modeTitle}>Examen blanc</h2>
              <p style={S.modeDesc}>
                Aucun feedback pendant l'épreuve. Score final sur <strong>100</strong>,
                seuil de réussite à <strong>70 %</strong>, avec corrigé complet
                question par question à la fin.
              </p>
              <div style={S.feat}>→ note finale + corrigé</div>
              <div style={S.feat}>→ conditions réelles</div>
            </div>
          </div>

          <div style={S.countRow}>
            <span style={S.countLabel}>NOMBRE DE QUESTIONS :</span>
            {[10, 20, 50, 100, 125, total].filter((n, i, a) => a.indexOf(n) === i).map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                style={{
                  ...S.countBtn,
                  ...(count === n ? S.countBtnActive : {}),
                }}
              >
                {n === total ? `ALL (${total})` : n}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={total}
              value={count}
              onChange={(e) => setCount(Math.min(total, Math.max(1, Number(e.target.value) || 1)))}
              style={S.countInput}
              title="Nombre personnalisé"
            />
          </div>

          <div style={S.sourceRow}>
            {Object.entries(sourceStats).map(([src, n]) => (
              <span key={src} style={S.sourceBadge}>
                {src}: {n}
              </span>
            ))}
          </div>

          <div style={S.launchRow}>
            <button style={S.launchTrain} onClick={() => start("training", count)}>
              ▶ LANCER L'ENTRAÎNEMENT
            </button>
            <button style={S.launchExam} onClick={() => start("exam", count)}>
              ▶ LANCER L'EXAMEN BLANC
            </button>
          </div>

          <p style={S.disclaimer}>
            * Les questions et l'ordre des réponses sont mélangés à chaque session.
          </p>
        </main>
      )}

      {/* QUIZ */}
      {screen === "quiz" && current && (
        <main style={S.quizMain} className="fade" key={idx}>
          {/* progress */}
          <div style={S.progressWrap}>
            <div style={S.progressInfo}>
              <span style={{ color: "var(--green)" }}>
                Q{String(idx + 1).padStart(2, "0")}
              </span>
              <span style={{ color: "var(--dim)" }}> / {deck.length}</span>
              <span style={S.modeBadge}>
                {mode === "training" ? "ENTRAÎNEMENT" : "EXAMEN BLANC"}
              </span>
            </div>
            <div style={S.progressBar}>
              <div
                style={{
                  ...S.progressFill,
                  width: `${((idx + (validated || mode === "exam" ? 1 : 0)) / deck.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* question */}
          <QuestionBody q={current} />

          {current.multi && (
            <div style={S.multiHint}>
              ⚠ Plusieurs réponses attendues — sélectionne toutes les bonnes options.
            </div>
          )}

          {/* choices */}
          <div style={{ marginTop: "1.2rem" }}>
            {current.choices.map((c, i) => (
              <Choice
                key={i}
                letter={LETTERS[i]}
                text={c}
                multi={current.multi}
                state={choiceState(i)}
                disabled={mode === "training" && validated}
                onClick={() => toggleChoice(i)}
              />
            ))}
          </div>

          {/* feedback training */}
          {mode === "training" && validated && (
            <div
              style={{
                ...S.feedback,
                borderColor: answers[idx]?.isCorrect ? "var(--green)" : "var(--red)",
                color: answers[idx]?.isCorrect ? "var(--green)" : "var(--red)",
              }}
            >
              {answers[idx]?.isCorrect
                ? "✓ CORRECT — bien joué."
                : "✕ INCORRECT — révise les réponses surlignées."}
            </div>
          )}

          {/* actions */}
          <div style={S.actionRow}>
            <button
              style={{
                ...S.primaryBtn,
                opacity: selected.length === 0 && !(mode === "training" && validated) ? 0.4 : 1,
                pointerEvents:
                  selected.length === 0 && !(mode === "training" && validated) ? "none" : "auto",
              }}
              onClick={handlePrimary}
            >
              {mode === "training" && !validated
                ? "VALIDER"
                : idx === deck.length - 1
                ? "VOIR LE RÉSULTAT →"
                : "QUESTION SUIVANTE →"}
            </button>
          </div>
        </main>
      )}

      {/* RESULTS */}
      {screen === "results" && results && (
        <main style={S.main} className="fade">
          <div
            style={{
              ...S.scoreCard,
              borderColor: results.pass ? "var(--green)" : "var(--red)",
            }}
          >
            <div style={S.scoreTag}>
              {mode === "exam" ? "RÉSULTAT — EXAMEN BLANC" : "RÉSULTAT — ENTRAÎNEMENT"}
            </div>
            <div
              style={{
                ...S.scoreBig,
                color: results.pass ? "var(--green)" : "var(--red)",
              }}
            >
              {results.pct}%
            </div>
            <div style={S.scoreSub}>
              {results.correct} / {results.total} bonnes réponses
            </div>
            <div
              style={{
                ...S.verdict,
                background: results.pass ? "var(--green)" : "var(--red)",
              }}
            >
              {results.pass ? "✓ RÉUSSI (seuil 70%)" : "✕ ÉCHEC (seuil 70%)"}
            </div>
          </div>

          <h3 style={S.reviewTitle}>// CORRIGÉ DÉTAILLÉ</h3>
          <div>
            {deck.map((q, i) => {
              const a = answers[i] || { selected: [], isCorrect: false };
              return (
                <div key={i} style={S.reviewItem}>
                  <div style={S.reviewHead}>
                    <span
                      style={{
                        color: a.isCorrect ? "var(--green)" : "var(--red)",
                        fontWeight: 700,
                      }}
                    >
                      {a.isCorrect ? "✓" : "✕"} Q{String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <QuestionBody q={q} small />
                  <div style={{ marginTop: "0.7rem" }}>
                    {q.choices.map((c, ci) => {
                      const isCorrect = q.correct.includes(ci);
                      const isSel = a.selected.includes(ci);
                      let st = "idle";
                      if (isCorrect && isSel) st = "correct";
                      else if (isCorrect && !isSel) st = "missed";
                      else if (!isCorrect && isSel) st = "wrong";
                      return (
                        <Choice
                          key={ci}
                          letter={LETTERS[ci]}
                          text={c}
                          multi={q.multi}
                          state={st}
                          disabled
                          onClick={() => {}}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={S.launchRow}>
            <button style={S.launchTrain} onClick={() => start(mode, deck.length)}>
              ↻ REFAIRE ({deck.length} Q)
            </button>
            <button style={S.launchExam} onClick={() => setScreen("home")}>
              ⌂ MENU PRINCIPAL
            </button>
          </div>
          <div style={{ height: "2rem" }} />
        </main>
      )}
    </div>
  );
}

function QuestionBody({ q, small }) {
  const { intro, code } = splitQuestion(q.q);
  return (
    <div>
      <p
        style={{
          fontFamily: "var(--mono)",
          fontSize: small ? "0.9rem" : "1.05rem",
          lineHeight: 1.6,
          color: "var(--text)",
          margin: "0 0 0.5rem 0",
          whiteSpace: "pre-wrap",
        }}
      >
        {intro}
      </p>
      {code && (
        <pre
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--green)",
            borderRadius: "2px",
            padding: "0.85rem 1rem",
            overflowX: "auto",
            fontFamily: "var(--mono)",
            fontSize: "0.8rem",
            lineHeight: 1.5,
            color: "var(--green-dim)",
            margin: "0.5rem 0",
          }}
        >
          {code}
        </pre>
      )}
    </div>
  );
}

// ---------- styles ----------
const ASCII = ` ___ ___ _  _   _____ ___ ___ ___ _  _ ___ ___
/ __| __| || | |_   _| _ \\ _ \\_ _| \\| | __| _ \\
| (__| _|| __ |   | | |   /   /| || .  | _||   /
\\___|___|_||_|   |_| |_|_\\_|_\\___|_|\\_|___|_|_\\`;

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&display=swap');
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: #0a0e0a; }
  ::-webkit-scrollbar-thumb { background: #1d3b27; border-radius: 0; }
  ::-webkit-scrollbar-thumb:hover { background: #2a5a3a; }
  .blink { animation: blink 1s steps(2) infinite; }
  @keyframes blink { 0%,50% { opacity: 1; } 50.01%,100% { opacity: 0; } }
  .fade { animation: fade 0.35s ease; }
  @keyframes fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  button:active { transform: translateY(1px); }
`;

const S = {
  root: {
    "--bg": "#070b08",
    "--card": "#0d130e",
    "--card2": "#0f1710",
    "--border": "#1d3b27",
    "--green": "#39ff88",
    "--green-dim": "#7dd6a0",
    "--amber": "#ffb800",
    "--red": "#ff4d5a",
    "--text": "#d6f5e0",
    "--dim": "#5e7a68",
    "--mono": "'JetBrains Mono', monospace",
    background:
      "radial-gradient(circle at 50% 0%, #0c1810 0%, #070b08 60%)",
    minHeight: "100vh",
    width: "100%",
    fontFamily: "var(--mono)",
    color: "var(--text)",
    position: "relative",
    overflowX: "hidden",
  },
  scanline: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    background:
      "repeating-linear-gradient(0deg, rgba(57,255,136,0.025) 0px, rgba(57,255,136,0.025) 1px, transparent 1px, transparent 3px)",
    zIndex: 1,
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.9rem 1.4rem",
    borderBottom: "1px solid var(--border)",
    background: "rgba(7,11,8,0.92)",
    backdropFilter: "blur(6px)",
  },
  logo: { fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.02em" },
  quitBtn: {
    background: "transparent",
    border: "1px solid var(--red)",
    color: "var(--red)",
    fontFamily: "var(--mono)",
    fontSize: "0.72rem",
    fontWeight: 700,
    padding: "0.4rem 0.7rem",
    borderRadius: "2px",
    cursor: "pointer",
  },
  main: {
    maxWidth: "780px",
    margin: "0 auto",
    padding: "2rem 1.4rem 3rem",
    position: "relative",
    zIndex: 2,
  },
  quizMain: {
    maxWidth: "780px",
    margin: "0 auto",
    padding: "1.5rem 1.4rem 3rem",
    position: "relative",
    zIndex: 2,
  },
  hero: { textAlign: "center", marginBottom: "2.2rem" },
  ascii: {
    color: "var(--green)",
    fontSize: "0.6rem",
    lineHeight: 1.1,
    fontWeight: 700,
    textShadow: "0 0 12px rgba(57,255,136,0.5)",
    overflowX: "auto",
    margin: "0 0 1rem 0",
  },
  tagline: { color: "var(--dim)", fontSize: "0.8rem", letterSpacing: "0.05em" },
  modeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "1rem",
    marginBottom: "2rem",
  },
  modeCard: {
    border: "1px solid var(--border)",
    borderRadius: "3px",
    padding: "1.3rem",
    background: "var(--card)",
    position: "relative",
  },
  modeTag: {
    display: "inline-block",
    fontSize: "0.65rem",
    fontWeight: 800,
    letterSpacing: "0.15em",
    color: "var(--green)",
    border: "1px solid var(--green)",
    padding: "0.15rem 0.5rem",
    borderRadius: "2px",
    marginBottom: "0.8rem",
  },
  modeTitle: { fontSize: "1.3rem", fontWeight: 800, margin: "0 0 0.6rem 0", color: "var(--text)" },
  modeDesc: { fontSize: "0.82rem", lineHeight: 1.6, color: "var(--dim)", margin: "0 0 0.9rem 0" },
  feat: { fontSize: "0.76rem", color: "var(--green-dim)", marginTop: "0.3rem" },
  countRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "1.5rem",
  },
  countLabel: { fontSize: "0.72rem", color: "var(--dim)", letterSpacing: "0.08em", marginRight: "0.4rem" },
  countBtn: {
    background: "var(--card2)",
    border: "1px solid var(--border)",
    color: "var(--dim)",
    fontFamily: "var(--mono)",
    fontSize: "0.8rem",
    fontWeight: 700,
    padding: "0.45rem 0.85rem",
    borderRadius: "2px",
    cursor: "pointer",
    transition: "all 0.12s",
  },
  countBtnActive: {
    color: "var(--bg)",
    background: "var(--green)",
    borderColor: "var(--green)",
    boxShadow: "0 0 14px rgba(57,255,136,0.35)",
  },
  countInput: {
    width: "4.5rem",
    background: "var(--card2)",
    border: "1px solid var(--border)",
    color: "var(--green)",
    fontFamily: "var(--mono)",
    fontSize: "0.8rem",
    fontWeight: 700,
    padding: "0.45rem 0.5rem",
    borderRadius: "2px",
  },
  sourceRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.4rem",
    marginBottom: "1.2rem",
  },
  sourceBadge: {
    fontSize: "0.68rem",
    color: "var(--dim)",
    border: "1px solid var(--border)",
    padding: "0.2rem 0.5rem",
    borderRadius: "2px",
  },
  launchRow: { display: "flex", flexWrap: "wrap", gap: "0.8rem", marginTop: "0.5rem" },
  launchTrain: {
    flex: 1,
    minWidth: "220px",
    background: "var(--green)",
    color: "var(--bg)",
    border: "none",
    fontFamily: "var(--mono)",
    fontSize: "0.88rem",
    fontWeight: 800,
    letterSpacing: "0.04em",
    padding: "1rem",
    borderRadius: "3px",
    cursor: "pointer",
    boxShadow: "0 0 20px rgba(57,255,136,0.3)",
  },
  launchExam: {
    flex: 1,
    minWidth: "220px",
    background: "transparent",
    color: "var(--amber)",
    border: "1px solid var(--amber)",
    fontFamily: "var(--mono)",
    fontSize: "0.88rem",
    fontWeight: 800,
    letterSpacing: "0.04em",
    padding: "1rem",
    borderRadius: "3px",
    cursor: "pointer",
  },
  disclaimer: { fontSize: "0.7rem", color: "var(--dim)", marginTop: "1.2rem", textAlign: "center" },
  progressWrap: { marginBottom: "1.5rem" },
  progressInfo: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.95rem",
    fontWeight: 700,
    marginBottom: "0.6rem",
  },
  modeBadge: {
    marginLeft: "auto",
    fontSize: "0.62rem",
    letterSpacing: "0.12em",
    color: "var(--dim)",
    border: "1px solid var(--border)",
    padding: "0.2rem 0.5rem",
    borderRadius: "2px",
  },
  progressBar: {
    height: "4px",
    background: "var(--card2)",
    border: "1px solid var(--border)",
    borderRadius: "2px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "var(--green)",
    boxShadow: "0 0 10px var(--green)",
    transition: "width 0.3s ease",
  },
  multiHint: {
    marginTop: "0.9rem",
    fontSize: "0.74rem",
    color: "var(--amber)",
    border: "1px dashed var(--amber)",
    borderRadius: "2px",
    padding: "0.5rem 0.7rem",
  },
  feedback: {
    marginTop: "1rem",
    padding: "0.8rem 1rem",
    border: "1px solid",
    borderRadius: "2px",
    fontSize: "0.85rem",
    fontWeight: 700,
  },
  actionRow: { marginTop: "1.5rem" },
  primaryBtn: {
    width: "100%",
    background: "var(--green)",
    color: "var(--bg)",
    border: "none",
    fontFamily: "var(--mono)",
    fontSize: "0.9rem",
    fontWeight: 800,
    letterSpacing: "0.04em",
    padding: "1rem",
    borderRadius: "3px",
    cursor: "pointer",
    boxShadow: "0 0 18px rgba(57,255,136,0.28)",
    transition: "opacity 0.15s",
  },
  scoreCard: {
    border: "2px solid",
    borderRadius: "4px",
    padding: "2rem 1.5rem",
    textAlign: "center",
    background: "var(--card)",
    marginBottom: "2rem",
  },
  scoreTag: { fontSize: "0.7rem", letterSpacing: "0.15em", color: "var(--dim)", marginBottom: "0.8rem" },
  scoreBig: { fontSize: "4.5rem", fontWeight: 800, lineHeight: 1, textShadow: "0 0 30px currentColor" },
  scoreSub: { fontSize: "0.95rem", color: "var(--text)", marginTop: "0.6rem" },
  verdict: {
    display: "inline-block",
    marginTop: "1.2rem",
    color: "var(--bg)",
    fontWeight: 800,
    fontSize: "0.82rem",
    letterSpacing: "0.06em",
    padding: "0.5rem 1.2rem",
    borderRadius: "3px",
  },
  reviewTitle: { fontSize: "0.95rem", color: "var(--green)", letterSpacing: "0.1em", margin: "0 0 1.2rem 0" },
  reviewItem: {
    border: "1px solid var(--border)",
    borderRadius: "3px",
    padding: "1.1rem",
    marginBottom: "1rem",
    background: "var(--card)",
  },
  reviewHead: { marginBottom: "0.6rem", fontSize: "0.9rem" },
};
