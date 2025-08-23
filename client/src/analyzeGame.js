import stockfishUrl from 'stockfish.js?url';
import { Chess } from 'chess.js';

function createEngine() {
  const worker = new Worker(stockfishUrl, { type: 'classic' });
  const queue = [];
  let lastInfo = null;

  worker.onmessage = (evt) => {
    const msg = typeof evt.data === 'string' ? evt.data : evt?.data;
    if (!msg) return;
    if (msg.startsWith('info ')) {
      lastInfo = msg;
    }
    if (msg.startsWith('bestmove')) {
      const resolver = queue.shift();
      if (resolver) resolver({ best: msg, info: lastInfo });
      lastInfo = null;
    }
  };

  const send = (cmd) => worker.postMessage(cmd);

  const init = () => {
    return new Promise((resolve) => {
      const onMsg = (evt) => {
        const msg = typeof evt.data === 'string' ? evt.data : evt?.data;
        if (msg?.includes('uciok')) {
          send('isready');
        } else if (msg?.includes('readyok')) {
          worker.removeEventListener('message', onMsg);
          resolve();
        }
      };
      worker.addEventListener('message', onMsg);
      send('uci');
    });
  };

  const analyzeFen = (fen, depth = 12, { maxMs = 7000 } = {}) => {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (payload) => {
        if (settled) return;
        settled = true;
        resolve(payload);
      };

      queue.push((payload) => finish(payload));
      send('ucinewgame');
      send(`position fen ${fen}`);
      send(`go depth ${depth}`);

      // Safety: ensure we don't hang forever
      const timer = setTimeout(() => {
        try { send('stop'); } catch {}
      }, Math.max(1000, maxMs));

      // Intercept resolution to clear timer
      const originalLength = queue.length;
      const checkInterval = setInterval(() => {
        if (settled || queue.length < originalLength) {
          clearInterval(checkInterval);
          clearTimeout(timer);
        }
      }, 100);
    });
  };

  const terminate = () => {
    try { worker.terminate(); } catch {}
  };

  return { init, analyzeFen, terminate };
}

// Parse PGN into SAN token list and headers for navigation
export function parsePGNToSAN(pgn) {
  // Reuse sanitizer
  const sanitizePGN = (text) => {
    if (!text) return '';
    const raw = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const lines = raw.split('\n');
    const headerLines = [];
    const moveLines = [];
    let inHeader = true;
    for (let line of lines) {
      const trimmed = line.trim();
      if (inHeader && /^\[[^\]]+\]$/.test(trimmed)) {
        headerLines.push(trimmed);
        continue;
      }
      if (trimmed.length > 0) inHeader = false;
      moveLines.push(line);
    }
    let movesText = moveLines.join('\n');
    movesText = movesText.replace(/\[\%[^\]]*\]/g, '');
    movesText = movesText.replace(/\{[^}]*\}/g, '');
    movesText = movesText.replace(/\$\d+/g, '');
    movesText = movesText
      .split('\n')
      .map((l) => l.trim().replace(/\s+/g, ' '))
      .filter((l) => l.length > 0)
      .join('\n');
    const headerBlock = headerLines.join('\n');
    const finalPGN = headerBlock ? `${headerBlock}\n\n${movesText}` : movesText;
    return finalPGN.trim();
  };

  const clean = sanitizePGN(pgn);
  const parts = clean.split(/\n\n/);
  const headerText = parts.length > 1 ? parts[0] : '';
  const moveSection = parts.length > 1 ? parts.slice(1).join('\n\n') : parts[0];
  const stripped = moveSection.replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/i, '').trim();
  const withoutNums = stripped.replace(/\b\d+\.(\.\.)?/g, '').trim();
  const tokens = withoutNums.split(/\s+/).filter(Boolean);

  return { headers: headerText, tokens };
}

export async function analyzePGN(pgn, { depth = 12 } = {}) {
  const game = new Chess();

  // Allow common Chess.com artifacts and comments, while preserving headers and structure
  const sanitizePGN = (text) => {
    if (!text) return '';
    // Normalize newlines and strip BOM
    const raw = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const lines = raw.split('\n');

    const headerLines = [];
    const moveLines = [];
    let inHeader = true;

    for (let line of lines) {
      const trimmed = line.trim();
      if (inHeader && /^\[[^\]]+\]$/.test(trimmed)) {
        headerLines.push(trimmed);
        continue;
      }
      // Once a non-header line encountered, the rest are moves/body
      if (trimmed.length > 0) inHeader = false;
      moveLines.push(line);
    }

    // Join move text and clean artifacts
    let movesText = moveLines.join('\n');
    // Remove inline engine/clock tags like [%clk 0:10:00], [%eval 0.5]
    movesText = movesText.replace(/\[\%[^\]]*\]/g, '');
    // Remove comments in braces { ... }
    movesText = movesText.replace(/\{[^}]*\}/g, '');
    // Remove NAGs like $1, $15
    movesText = movesText.replace(/\$\d+/g, '');
    // Collapse spaces within moves but keep newlines to allow parser flexibility
    movesText = movesText
      .split('\n')
      .map((l) => l.trim().replace(/\s+/g, ' '))
      .filter((l) => l.length > 0)
      .join('\n');

    const headerBlock = headerLines.join('\n');
    const finalPGN = headerBlock ? `${headerBlock}\n\n${movesText}` : movesText;
    return finalPGN.trim();
  };

  const clean = sanitizePGN(pgn);
  // Extract move text (after headers) and build SAN tokens
  const parts = clean.split(/\n\n/);
  const moveSection = parts.length > 1 ? parts.slice(1).join('\n\n') : parts[0];
  // Remove game termination markers
  const stripped = moveSection.replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/i, '').trim();
  // Remove move numbers like "12." or "12..."
  const withoutNums = stripped.replace(/\b\d+\.(\.\.)?/g, '').trim();
  // Tokenize SAN moves
  const tokens = withoutNums.split(/\s+/).filter(Boolean);

  const replay = new Chess();
  const positions = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    // Skip stray artifacts just in case
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/i.test(t)) break;
    const move = replay.move(t, { sloppy: true });
    if (!move) {
      throw new Error(`Invalid PGN near token: "${t}"`);
    }
    positions.push({ ply: positions.length + 1, san: move.san, fen: replay.fen() });
  }

  const engine = createEngine();
  await engine.init();

  const results = [];
  for (const pos of positions) {
    // Detect terminal positions to avoid engine hang: no legal moves => terminal (checkmate/stalemate)
    const probe = new Chess();
    probe.load(pos.fen);
    if (probe.moves().length === 0) {
      // Terminal node: don't query engine
      results.push({ ...pos, bestMove: null, eval: null });
      continue;
    }

    const { best, info } = await engine.analyzeFen(pos.fen, depth, { maxMs: 7000 });
    const bestMove = best?.split(' ')[1] || null; // may be (none)
    let evalCp = null;
    if (info) {
      const m1 = info.match(/score cp (-?\d+)/);
      const m2 = info.match(/score mate (-?\d+)/);
      if (m1) evalCp = parseInt(m1[1], 10);
      else if (m2) evalCp = (parseInt(m2[1], 10) > 0 ? 100000 : -100000);
    }
    results.push({ ...pos, bestMove, eval: evalCp !== null ? evalCp / 100 : null });
  }

  engine.terminate();
  return results;
}
