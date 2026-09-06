// Deterministic PRNG (mulberry32) so the daily challenge is identical for everyone.

export function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngFromString(str) {
  return mulberry32(hashString(str));
}

// Local calendar date as YYYY-MM-DD (the daily resets at local midnight).
export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const EPOCH = new Date(2026, 8, 6); // 6 Sep 2026 = day #1

export function dayNumber(d = new Date()) {
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((a - EPOCH) / 86400000) + 1;
}

export function msUntilTomorrow(d = new Date()) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return t - d;
}

export function formatCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}
