let engine = null;

async function init() {
  try {
    // Use stockfish.js package which works with Vite + Workers
    const mod = await import('stockfish.js');
    const Factory = (mod && typeof mod.default === 'function' && mod.default)
      || (mod && typeof mod.Stockfish === 'function' && mod.Stockfish)
      || (typeof mod === 'function' && mod)
      || null;

    if (Factory) {
      engine = Factory();
    } else {
      // Some bundlers expose the worker script URL instead of a factory.
      const url = (typeof mod === 'string') ? mod
        : (mod && typeof mod.default === 'string') ? mod.default
        : null;
      if (!url) throw new Error('No factory function or URL exported by Stockfish module');
      // Spawn the stockfish script as a classic worker.
      engine = new Worker(url, { type: 'classic' });
    }

    engine.onmessage = (evt) => {
      const msg = typeof evt === 'string' ? evt : evt?.data;
      if (msg != null) self.postMessage(msg);
    };

    // Optionally initialize UCI
    engine.postMessage('uci');
  } catch (err) {
    self.postMessage(`[worker-error] ${err?.message || err}`);
  }
}

init();

self.onmessage = (e) => {
  if (!engine) {
    // queue is simple: try again shortly
    setTimeout(() => self.onmessage(e), 10);
    return;
  }
  engine.postMessage(e.data);
};
