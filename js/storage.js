// localStorage wrapper with safe fallbacks (private mode, blocked storage...).

const PREFIX = 'planeta.';
const mem = new Map();

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return mem.has(key) ? mem.get(key) : fallback;
  }
}
function write(key, value) {
  mem.set(key, value);
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* ignore */ }
}

export const store = {
  get best() { return read('best', 0); },
  set best(v) { write('best', v); },
  get games() { return read('games', 0); },
  set games(v) { write('games', v); },
  get blocks() { return read('blocks', 0); },
  set blocks(v) { write('blocks', v); },
  get perfects() { return read('perfects', 0); },
  set perfects(v) { write('perfects', v); },
  get theme() { return read('theme', 'nebulosa'); },
  get biggest() { return read('biggest', 0); },
  set biggest(v) { write('biggest', v); },
  set theme(v) { write('theme', v); },
  get muted() { return read('muted', false); },
  set muted(v) { write('muted', v); },
  get lang() { return read('lang', null); },
  set lang(v) { write('lang', v); },
  get unlockedSeen() { return read('unlockedSeen', ['nebulosa']); },
  set unlockedSeen(v) { write('unlockedSeen', v); },
  // { date, score, result:[...], streak, lastDate, best }
  get daily() { return read('daily', { date: null, score: 0, result: [], streak: 0, lastDate: null, best: 0 }); },
  set daily(v) { write('daily', v); },
};
