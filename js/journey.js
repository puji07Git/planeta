// The journey: as the planet grows it drifts through space and meets things. Each encounter is
// an independent modifier on one part of the game (trajectory, orbit, visibility, extra rocks,
// obstacles), so any combination of them works. The sequence is generated from the run's RNG
// (seeded on the daily challenge), gets denser with distance and never ends.
//
// Also here: special rock kinds and the cards offered at the end of every block of encounters.

export const ENCOUNTERS = {
  moon:      { icon: '🌙', easy: true,  axis: 'gravity' },
  ring:      { icon: '⭕', easy: true,  axis: 'obstacle' },
  icering:   { icon: '❄️', easy: true,  axis: 'obstacle' },
  planetx:   { icon: '🔴', easy: true,  axis: 'orbit' },
  comet:     { icon: '☄️', easy: true,  axis: 'extra' },
  shower:    { icon: '🌠', easy: false, axis: 'extra' },
  star:      { icon: '☀️', easy: false, axis: 'orbit' },
  nebula:    { icon: '🌫️', easy: false, axis: 'visibility' },
  blackhole: { icon: '🕳️', easy: false, axis: 'gravity' },
  belt:      { icon: '🪨', easy: false, axis: 'obstacle' },
};
// Real names, one per repetition; Planet X also carries a colour per name.
export const NAMES = {
  moon: [{ n: 'Nyx' }, { n: 'Selen' }, { n: 'Kalio' }, { n: 'Orba' }, { n: 'Tessa' }, { n: 'Vell' }],
  planetx: [{ n: 'Kairos', color: 0xd8432f }, { n: 'Vorn', color: 0x3f63d8 }, { n: 'Ilium', color: 0xe8c87a }, { n: 'Zephra', color: 0xd9a066 }, { n: 'Marun', color: 0x7fd6e0 }, { n: 'Thal', color: 0xe6d3a0 }, { n: 'Oxia', color: 0x9a9aa0 }],
  star: [{ n: 'Helios' }, { n: 'Aster' }, { n: 'Rugen' }, { n: 'Lumen' }, { n: 'Sorel' }],
  comet: [{ n: 'Vela' }, { n: 'Kite' }, { n: 'Sarn' }, { n: 'Iridia' }],
  shower: [{ n: 'Arel' }, { n: 'Nim' }, { n: 'Sor' }, { n: 'Kae' }],
  nebula: [{ n: 'Orel' }, { n: 'Vesna' }, { n: 'Calix' }, { n: 'Drom' }],
  blackhole: [{ n: 'Umbra' }, { n: 'Nihil' }, { n: 'Kor' }, { n: 'Void' }],
  belt: [{ n: 'Dast' }, { n: 'Rhel' }, { n: 'Osk' }],
  ring: [{ n: 'Ilse' }, { n: 'Vau' }, { n: 'Kesh' }],
  icering: [{ n: 'Hael' }, { n: 'Nivea' }, { n: 'Frost' }],
};
// Proper name of an encounter instance (type word is added by the UI: "Lluna Nyx").
export function encounterName(a) {
  const list = NAMES[a.id] || [];
  const n = list[(a.variant || 0) % list.length];
  return n ? n.n : a.id;
}
const IDS = Object.keys(ENCOUNTERS);
const EASY = IDS.filter((id) => ENCOUNTERS[id].easy);

export const CALM_START = 25;   // rocks before the first encounter
export const SEG_ACTIVE = 25;   // rocks an encounter lasts
export const SEG_CALM = 5;      // quiet rocks between encounters (the next thing approaches)
export const SEG_LEN = SEG_ACTIVE + SEG_CALM;
export const BLOCK = 3;         // encounters per block; cards are offered after each block

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

export class Journey {
  constructor(rng = Math.random) { this.reset(rng); }

  reset(rng) {
    this.rng = rng;
    this.segments = [];      // [{ active: [{ id, intensity }] }]
    this.seen = {};          // id → times it has appeared (drives intensity)
    this.current = null;     // segment index currently active, or null while calm
    this.cardsAt = new Set();
  }

  // How many things happen at once, by segment index.
  _count(k) { return k < 5 ? 1 : k < 11 ? 2 : 3; }

  _gen(k) {
    while (this.segments.length <= k) {
      const idx = this.segments.length;
      const prev = idx > 0 ? this.segments[idx - 1].active.map((a) => a.id) : [];
      const pool = (idx < 3 ? EASY : IDS).filter((id) => !prev.includes(id));
      // Unseen encounters come first so the player meets everything before repeats pile up.
      const unseen = pool.filter((id) => !this.seen[id]);
      const chosen = [];
      const n = this._count(idx);
      for (let i = 0; i < n; i++) {
        let cands = (unseen.length && i === 0 ? unseen : pool).filter((id) => !chosen.includes(id));
        if (chosen.some((c) => ENCOUNTERS[c].axis === 'obstacle')) cands = cands.filter((id) => ENCOUNTERS[id].axis !== 'obstacle');
        if (!cands.length) break;
        const id = pick(this.rng, cands);
        chosen.push(id);
      }
      const active = chosen.map((id) => {
        const times = this.seen[id] || 0;
        this.seen[id] = times + 1;
        return { id, intensity: 1 + 0.35 * times, level: times + 1, variant: times % (NAMES[id] ? NAMES[id].length : 1) };
      });
      this.segments.push({ active });
    }
    return this.segments[k];
  }

  // Segment index and phase for a rock count.
  phase(score) {
    if (score < CALM_START) return { k: -1, active: false, calm: true, approaching: score >= CALM_START - SEG_CALM ? 0 : null };
    const rel = score - CALM_START;
    const k = Math.floor(rel / SEG_LEN);
    const inSeg = rel - k * SEG_LEN;
    return { k, active: inSeg < SEG_ACTIVE, calm: inSeg >= SEG_ACTIVE, approaching: inSeg >= SEG_ACTIVE ? k + 1 : null };
  }

  // Called after every landed rock; returns the events to apply, in order.
  onRock(score) {
    const events = [];
    const ph = this.phase(score);
    if (ph.k >= 0 && ph.active && this.current !== ph.k) {
      if (this.current !== null) events.push({ type: 'end', segment: this._gen(this.current) });
      this.current = ph.k;
      events.push({ type: 'start', segment: this._gen(ph.k), index: ph.k });
    } else if (ph.calm && this.current !== null) {
      events.push({ type: 'end', segment: this._gen(this.current) });
      this.current = null;
      // A block just finished: offer cards once.
      const finished = ph.k + 1;
      if (finished % BLOCK === 0 && !this.cardsAt.has(finished)) { this.cardsAt.add(finished); events.push({ type: 'sector', sector: finished / BLOCK }); }
    }
    if (ph.calm && ph.approaching !== null && ph.approaching !== undefined) events.push({ type: 'approach', segment: this._gen(ph.approaching) });
    return events;
  }

  // Active encounters right now (empty while calm).
  active() { return this.current === null ? [] : this.segments[this.current].active; }
}

// ---------- Special rocks ----------
export const ROCK_KINDS = ['heavy', 'ice', 'gold', 'boom'];
const KIND_WEIGHTS = { ice: 35, heavy: 30, gold: 20, boom: 15 };

// Chance that the next rock is special, by rock count.
export function specialChance(score) {
  if (score < 15) return 0;
  if (score < 60) return 0.08 + (score - 15) / 45 * 0.07;
  if (score < 200) return 0.15 + (score - 60) / 140 * 0.10;
  return Math.min(0.30, 0.25 + (score - 200) / 400 * 0.05);
}

export function rollRockKind(rng, score, lastWasSpecial, mods) {
  const p = specialChance(score) * (mods.specialRate || 1);
  if (rng() >= p) return 'normal';
  if (lastWasSpecial && score < 60) return 'normal';
  const w = { ...KIND_WEIGHTS };
  w.ice *= mods.iceRate || 1; w.heavy *= mods.heavyRate || 1; w.gold *= mods.goldRate || 1; w.boom *= mods.boomRate || 1;
  if (score < 30) w.boom = 0;
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (const k of ROCK_KINDS) { r -= w[k]; if (r <= 0) return k; }
  return 'ice';
}

// ---------- Cards ----------
export function defaultMods() {
  return {
    spin: 1, orbit: 1, limit: 1, size: 1, mass: 1, magnet: 0, lives: 0, doubleOrbit: false,
    vision: false, sweetWobble: 0, compress: 0, boomRate: 1, boomKmCost: 0, iceRate: 1, heavyRate: 1,
    goldRate: 1, goldSize: 1, specialRate: 1,
  };
}

// Boosts: a random one may arrive when a sector is cleared; benefit only, lasts CARD_ROCKS rocks.
export const CARDS = [
  { id: 'slow',     icon: '🐢', apply: (m) => { m.spin *= 0.75; } },
  { id: 'big',      icon: '🪨', apply: (m) => { m.size *= 1.3; } },
  { id: 'magnet',   icon: '🧲', apply: (m) => { m.magnet += 15; } },
  { id: 'life',     icon: '💚', apply: (m) => { m.lives += 1; } },
  { id: 'double',   icon: '♊', apply: (m) => { m.doubleOrbit = true; } },
  { id: 'vision',   icon: '👁️', apply: (m) => { m.vision = true; } },
  { id: 'compress', icon: '🌀', apply: (m) => { m.compress += 1; } },
  { id: 'gold',     icon: '💰', apply: (m) => { m.goldRate *= 2.5; } },
  { id: 'glacial',  icon: '🧊', apply: (m) => { m.iceRate *= 2.5; } },
];
export const BOOST_CHANCE = 0.6;

export function randomBoost(rng, last) {
  const pool = CARDS.filter((c) => c.id !== last);
  return pool[Math.floor(rng() * pool.length)];
}
export const CARD_ROCKS = 25;   // a card helps for this many rocks

export function offerCards(rng, chosen) {
  const last = chosen[chosen.length - 1];
  const pool = CARDS.filter((c) => c.id !== last);
  const out = [];
  while (out.length < 3 && pool.length) {
    const i = Math.floor(rng() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

export function applyCard(mods, id) {
  const c = CARDS.find((x) => x.id === id);
  if (c) c.apply(mods);
  return mods;
}
