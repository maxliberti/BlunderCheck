import React, { useEffect, useMemo, useRef, useState } from 'react';
import Chessboard from 'chessboardjsx';
import { Chess } from 'chess.js';
import useStockfish from './useStockfish';
import { analyzePGN, parsePGNToSAN } from './analyzeGame';
import api from './api';
import { useAuth } from './AuthContext';

export default function GameReviewChessboard() {
  const { token, setToken } = useAuth();
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const { evaluation, bestMove, isAnalyzing, mate } = useStockfish(fen);
  const [pgn, setPgn] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResults, setBatchResults] = useState([]);
  const [saveName, setSaveName] = useState('');
  const [myGames, setMyGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [showGamesModal, setShowGamesModal] = useState(false);

  // No inline auth forms; dedicated /login page is used

  // PGN navigation state
  const [mainline, setMainline] = useState([]); // array of SAN tokens
  const [plyIndex, setPlyIndex] = useState(0); // how many mainline moves are applied
  const [inDeviation, setInDeviation] = useState(false);
  const [deviation, setDeviation] = useState([]); // SAN tokens from deviation

  const navBase = useMemo(() => new Chess(), []);

  // Best move arrow state and board measurements
  const [showBestArrow, setShowBestArrow] = useState(false);
  const boardWrapRef = useRef(null);
  const [boardSize, setBoardSize] = useState(560);
  useEffect(() => {
    function measure() {
      const el = boardWrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height || rect.width);
      if (size && Math.abs(size - boardSize) > 0.5) setBoardSize(size);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [boardSize]);

  function squareToCenterXY(sq, size) {
    if (!sq || sq.length < 2) return { x: 0, y: 0 };
    const file = sq.charCodeAt(0) - 'a'.charCodeAt(0); // 0..7
    const rank = parseInt(sq[1], 10); // 1..8
    const sqSize = size / 8;
    // chessboardjsx draws rank 8 at the top, so invert rank for y
    const x = file * sqSize + sqSize / 2;
    const y = (8 - rank) * sqSize + sqSize / 2;
    return { x, y };
  }

  // Hover highlight: only outline the square under the cursor
  const [hoverSq, setHoverSq] = useState('');
  const squareStyles = useMemo(() => {
    if (!hoverSq) return {};
    return {
      [hoverSq]: {
        boxShadow: 'inset 0 0 0 3px #2d6a4f',
        backgroundColor: 'rgba(45,106,79,0.1)'
      }
    };
  }, [hoverSq]);

  const computeFen = (ml = mainline, idx = plyIndex, dev = deviation) => {
    const g = new Chess();
    for (let i = 0; i < Math.min(idx, ml.length); i++) {
      const mv = g.move(ml[i], { sloppy: true });
      if (!mv) break;
    }
    if (dev && dev.length) {
      for (const san of dev) {
        const mv = g.move(san, { sloppy: true });
        if (!mv) break;
      }
    }
    return g.fen();
  };

  // Convert centipawn evaluation to a 0..100% white-advantage fill using a smooth mapping
  function evalToPercentWhite(ev) {
    if (ev === null || Number.isNaN(ev)) return 50; // neutral when unknown
    // Smooth saturating function: tanh to keep within bounds
    const t = Math.tanh(ev / 3); // ev in pawns; scale controls steepness
    const pct = 50 + 50 * t; // -1..1 -> 0..100
    return Math.max(0, Math.min(100, pct));
  }

  // chessboardjsx passes a single object: { sourceSquare, targetSquare, piece }
  function onDrop({ sourceSquare, targetSquare }) {
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // always promote to queen for simplicity
      });

      if (move === null) return false; // illegal move

      // Determine if this matches the next mainline move; if not, start/continue deviation
      const nextMain = mainline[plyIndex];
      if (!inDeviation && nextMain && move.san === nextMain) {
        // Follow mainline
        setPlyIndex((i) => i + 1);
      } else {
        // Create or extend deviation
        setInDeviation(true);
        setDeviation((d) => [...d, move.san]);
      }

      setFen(game.fen());
      return true;
    } catch (e) {
      return false;
    }
  }

  function syncBoardToState(newMain = mainline, newPly = plyIndex, newDev = deviation) {
    const newFen = computeFen(newMain, newPly, newDev);
    const g = new Chess();
    g.load(newFen);
    setGame(g);
    setFen(newFen);
  }

  // Helpers for games API
  async function refreshGames() {
    if (!token) return;
    setLoadingGames(true);
    try {
      const list = await api.games.list();
      setMyGames(list);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoadingGames(false);
    }
  }

  useEffect(() => {
    // Load games once when user logs in
    if (token) {
      refreshGames();
    } else {
      setMyGames([]);
    }
  }, [token]);

  return (
    <>
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', justifyContent: 'center' }}>
        {/* Eval bar on the left */}
        <div style={{ flex: '0 0 28px', position: 'relative', border: '1px solid #5a4f45', borderRadius: 4, overflow: 'hidden' }} aria-label="Evaluation bar">
          {/* Mate state fills entire bar with winner color */}
          {mate ? (
            <>
              <div style={{ position: 'absolute', inset: 0, background: mate.winner === 'white' ? '#e6e6e6' : '#1f1f1f' }} />
              <div
                style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 9,
                  color: mate.winner === 'white' ? '#333' : '#ddd',
                  textShadow: mate.winner === 'white' ? 'none' : '0 1px 2px rgba(0,0,0,0.6)'
                }}
                title={`Mate in ${mate.moves} for ${mate.winner}`}
              >
                {`M${mate.moves}`}
              </div>
            </>
          ) : (
            <>
              {/* white fill from top */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  height: `${evalToPercentWhite(evaluation)}%`,
                  background: '#e6e6e6'
                }}
              />
              {/* black fill covers remainder */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: `${100 - evalToPercentWhite(evaluation)}%`,
                  background: '#1f1f1f'
                }}
              />
            </>
          )}
          {/* numeric value overlay */}
          {isAnalyzing && !mate ? (
            <div
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700,
                fontSize: 9,
                color: '#bbb',
                textShadow: 'none'
              }}
            >
              …
            </div>
          ) : !mate ? (
            evaluation !== null ? (
              <>
                {/* White label (top) shows eval from White perspective */}
                <div
                  style={{
                    position: 'absolute', top: 6, left: 0, right: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 9,
                    color: '#333',
                    textShadow: 'none',
                    pointerEvents: 'none'
                  }}
                  title="White evaluation (pawns)"
                >
                  {`${evaluation >= 0 ? '+' : ''}${evaluation.toFixed(2)}`}
                </div>
                {/* Black label (bottom) shows eval from Black perspective (negated) */}
                <div
                  style={{
                    position: 'absolute', bottom: 6, left: 0, right: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 9,
                    color: '#ddd',
                    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                    pointerEvents: 'none'
                  }}
                  title="Black evaluation (pawns)"
                >
                  {`${(-evaluation) >= 0 ? '+' : ''}${(-evaluation).toFixed(2)}`}
                </div>
              </>
            ) : (
              <div
                style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 9,
                  color: '#bbb',
                  textShadow: 'none'
                }}
              >
                N/A
              </div>
            )
          ) : null}
        </div>
        <div style={{ flex: '0 0 auto', position: 'relative' }} ref={boardWrapRef}>
          <Chessboard
            position={fen}
            onDrop={onDrop}
            draggable={true}
            onMouseOverSquare={(sq) => setHoverSq(sq)}
            onMouseOutSquare={() => setHoverSq('')}
            allowDrag={({ piece }) => {
              // Only allow dragging pieces of the side to move
              const sideToMove = game.turn() === 'w' ? 'w' : 'b';
              return piece && piece[0] === sideToMove;
            }}
            width={560}
            squareStyles={squareStyles}
            boardStyle={{
              borderRadius: '5px',
              boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
            }}
          />
          {/* Best move arrow overlay */}
          {showBestArrow && bestMove && !isAnalyzing && !mate && boardSize > 0 && (
            (() => {
              const uci = bestMove.trim();
              const from = uci.slice(0, 2);
              const to = uci.slice(2, 4);
              const { x: x1, y: y1 } = squareToCenterXY(from, boardSize);
              const { x: x2, y: y2 } = squareToCenterXY(to, boardSize);
              return (
                <svg
                  width={boardSize}
                  height={boardSize}
                  viewBox={`0 0 ${boardSize} ${boardSize}`}
                  style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}
                >
                  <defs>
                    <marker id="bestArrowHead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                      <path d="M0,0 L0,8 L8,4 z" fill="#2d6a4f" />
                    </marker>
                  </defs>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#2d6a4f"
                    strokeWidth={5}
                    strokeOpacity={0.9}
                    markerEnd="url(#bestArrowHead)"
                  />
                  {/* endpoints for visibility */}
                  <circle cx={x1} cy={y1} r={4} fill="#2d6a4f" opacity={0.8} />
                  <circle cx={x2} cy={y2} r={4} fill="#2d6a4f" opacity={0.9} />
                </svg>
              );
            })()
          )}
        </div>
      </div>
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => setShowBestArrow((v) => !v)}
          disabled={!bestMove || isAnalyzing || !!mate}
          title={bestMove ? `Best move: ${bestMove}` : 'Best move not available yet'}
        >
          {showBestArrow ? 'Hide Best Move Arrow' : 'Show Best Move Arrow'}
        </button>
      </div>

      {/* Auth + Save/Load Controls */}
      <div style={{ marginTop: 16, padding: 12, border: '1px solid #5a4f45', borderRadius: 6 }}>
        {!token ? (
          <div style={{ display: 'grid', gap: 6 }}>
            <a href="/login" style={{ textDecoration: 'none' }}>
              <button>Login to save and load games</button>
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Optional game name"
                style={{ flex: 1 }}
              />
              <button
                onClick={async () => {
                  try {
                    if (!pgn.trim()) return alert('Paste a PGN first.');
                    await api.games.create({ name: saveName || undefined, pgn, notes: undefined });
                    setSaveName('');
                    await refreshGames();
                    alert('Saved.');
                  } catch (e) {
                    alert(e.message);
                  }
                }}
              >
                Save PGN
              </button>
              <button
                onClick={async () => {
                  setShowGamesModal(true);
                  await refreshGames();
                }}
                disabled={loadingGames}
              >
                {loadingGames ? 'Loading...' : 'My Games'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <h2>Analyze PGN</h2>
        <textarea
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
          placeholder="Paste a full PGN here"
          rows={8}
          style={{ width: '100%', fontFamily: 'monospace' }}
        />
        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={async () => {
              try {
                setBatchLoading(true);
                const results = await analyzePGN(pgn, { depth: 12 });
                setBatchResults(results);
                // Initialize navigation: parse PGN into mainline and reset state
                const { tokens } = parsePGNToSAN(pgn);
                setMainline(tokens);
                setPlyIndex(0);
                setInDeviation(false);
                setDeviation([]);
                syncBoardToState(tokens, 0, []);
              } catch (err) {
                alert(err?.message || 'Failed to analyze PGN');
              } finally {
                setBatchLoading(false);
              }
            }}
            disabled={!pgn.trim() || batchLoading}
          >
            {batchLoading ? 'Analyzing...' : 'Analyze PGN'}
          </button>

          {/* Navigation controls */}
          <button
            onClick={() => {
              if (inDeviation) {
                // Undo deviation move
                setDeviation((d) => {
                  const nd = d.slice(0, -1);
                  const newDev = nd;
                  syncBoardToState(mainline, plyIndex, newDev);
                  if (newDev.length === 0) setInDeviation(false);
                  return newDev;
                });
              } else {
                // Step back mainline
                setPlyIndex((i) => {
                  const ni = Math.max(0, i - 1);
                  syncBoardToState(mainline, ni, []);
                  return ni;
                });
              }
            }}
            disabled={(!inDeviation && plyIndex === 0) || (inDeviation && deviation.length === 0)}
          >
            ◀ Prev
          </button>

          <button
            onClick={() => {
              if (inDeviation) return; // Do not advance mainline while deviating
              setPlyIndex((i) => {
                const ni = Math.min(mainline.length, i + 1);
                syncBoardToState(mainline, ni, []);
                return ni;
              });
            }}
            disabled={inDeviation || plyIndex >= mainline.length}
          >
            Next ▶
          </button>

          {inDeviation && (
            <button
              onClick={() => {
                setInDeviation(false);
                setDeviation([]);
                syncBoardToState(mainline, plyIndex, []);
              }}
            >
              Return to PGN
            </button>
          )}
        </div>

        {batchResults.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <h3>Results</h3>
            <ol>
              {batchResults.map((r) => (
                <li key={r.ply} style={{ marginBottom: 6 }}>
                  <code>#{r.ply}</code> {r.san} — Best: <code>{r.bestMove}</code> — Eval: <strong>{r.eval ?? 'N/A'}</strong>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>

    {/* My Games Modal */}
    {showGamesModal && (
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}
        onClick={() => setShowGamesModal(false)}
      >
        <div
          style={{ background: '#fff', borderRadius: 8, width: '90%', maxWidth: 700, maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,.3)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #5a4f45', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>My Games</strong>
            <button onClick={() => setShowGamesModal(false)}>Close</button>
          </div>
          <div style={{ padding: 16, overflow: 'auto', maxHeight: '65vh' }}>
            {loadingGames && <p>Loading...</p>}
            {!loadingGames && myGames.length === 0 && <p>No saved games yet.</p>}
            {!loadingGames && myGames.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {myGames.map((g) => (
                  <li key={g._id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #5a4f45' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name || '(unnamed)'}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{new Date(g.updatedAt).toLocaleString()}</div>
                    </div>
                    <button
                      onClick={async () => {
                        setPgn(g.pgn || '');
                        try {
                          const { tokens } = parsePGNToSAN(g.pgn || '');
                          setMainline(tokens);
                          setPlyIndex(0);
                          setInDeviation(false);
                          setDeviation([]);
                          syncBoardToState(tokens, 0, []);
                          setShowGamesModal(false);
                        } catch (e) {
                          alert('Loaded PGN, but failed to parse for navigation.');
                        }
                      }}
                    >
                      Load
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm('Delete this saved game?')) return;
                        try {
                          await api.games.delete(g._id);
                          await refreshGames();
                        } catch (e) {
                          alert(e.message);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
