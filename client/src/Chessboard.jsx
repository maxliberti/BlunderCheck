import React, { useState } from 'react';
import Chessboard from 'chessboardjsx';
import { Chess } from 'chess.js';
import useStockfish from './useStockfish';
import { analyzePGN } from './analyzeGame';

export default function GameReviewChessboard() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const { evaluation, bestMove, isAnalyzing } = useStockfish(fen);
  const [pgn, setPgn] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResults, setBatchResults] = useState([]);

  // chessboardjsx passes a single object: { sourceSquare, targetSquare, piece }
  function onDrop({ sourceSquare, targetSquare }) {
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // always promote to queen for simplicity
      });

      if (move === null) return false; // illegal move

      setFen(game.fen());
      return true;
    } catch (e) {
      return false;
    }
  }

  return (
    <div style={{ width: '560px', margin: '0 auto' }}>
      <h1>Chess Review Board</h1> {/* Temporary test element */}
      <Chessboard
        position={fen}
        onDrop={onDrop}
        draggable={true}
        allowDrag={({ piece }) => {
          // Only allow dragging pieces of the side to move
          const sideToMove = game.turn() === 'w' ? 'w' : 'b';
          return piece && piece[0] === sideToMove;
        }}
        boardStyle={{
          borderRadius: '5px',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
        }}
      />
      <div style={{ marginTop: '20px' }}>
        {isAnalyzing ? (
          <p>Analyzing position...</p>
        ) : (
          <div>
            <p><strong>Evaluation:</strong> {evaluation !== null ? evaluation : 'N/A'}</p>
            <p><strong>Best move:</strong> {bestMove || 'N/A'}</p>
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
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button
            onClick={async () => {
              try {
                setBatchLoading(true);
                const results = await analyzePGN(pgn, { depth: 12 });
                setBatchResults(results);
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
  );
}
