import { useEffect, useState } from 'react';
import stockfishUrl from 'stockfish.js?url';

export default function useStockfish(fen) {
  const [evaluation, setEvaluation] = useState(null);
  const [bestMove, setBestMove] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!fen) return;

    setIsAnalyzing(true);
    let worker;
    // Spawn stockfish.js directly as a classic worker via URL (works reliably with Vite)
    worker = new Worker(stockfishUrl, { type: 'classic' });

    let ready = false;

    const send = (cmd) => {
      // console.log('[Main->Worker]', cmd);
      worker.postMessage(cmd);
    };

    worker.onmessage = (evt) => {
      const msg = typeof evt.data === 'string' ? evt.data : evt?.data;
      // console.log('[Worker->Main]', msg);
      if (!msg) return;

      if (msg.includes('uciok')) {
        // After uciok, request ready
        send('isready');
      } else if (msg.includes('readyok')) {
        ready = true;
        send('ucinewgame');
        send(`position fen ${fen}`);
        send('go depth 15');
      } else if (msg.includes('bestmove')) {
        setBestMove(msg.split(' ')[1]);
        setIsAnalyzing(false);
      } else if (msg.includes('score cp')) {
        const scoreMatch = msg.match(/score cp (-?\d+)/);
        if (scoreMatch) setEvaluation(parseInt(scoreMatch[1]) / 100);
      }
    };

    // Kick off UCI handshake
    send('uci');

    return () => {
      try { worker?.terminate(); } catch {}
    };
  }, [fen]);

  return { evaluation, bestMove, isAnalyzing };
}