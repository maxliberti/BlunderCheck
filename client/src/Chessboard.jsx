import React, { useState } from 'react';
import Chessboard from 'chessboardjsx';
import { Chess } from 'chess.js';
import useStockfish from './useStockfish';

export default function GameReviewChessboard() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const { evaluation, bestMove, isAnalyzing } = useStockfish(fen);

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
    </div>
  );
}
