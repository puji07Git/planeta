// The journey: as the planet grows it drifts through space and meets things. Each encounter is
// an independent modifier on one part of the game (trajectory, orbit, visibility, extra rocks,
// obstacles), so any combination of them works. The sequence is generated from the run's RNG
// (seeded on the daily challenge), gets denser with distance and never ends.
//
// Also here: special rock kinds and the cards offered at the end of every block of encounters.

export const ENCOUNTERS = {
  moon:      { icon: '🌙', easy: true,  axis: 'gravity' },
  ring:      { icon: '⭕', easy: true,  axis: 'obstacle' },
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
  moon: [{ ca: 'Lluna', es: 'Luna', en: 'Moon' }, { ca: 'Europa', es: 'Europa', en: 'Europa' }, { ca: 'Tità', es: 'Titán', en: 'Titan' }, { ca: 'Io', es: 'Ío', en: 'Io' }, { ca: 'Ganímedes', es: 'Ganímedes', en: 'Ganymede' }, { ca: 'Encèlad', es: 'Encélado', en: 'Enceladus' }],
  planetx: [{ ca: 'Mart', es: 'Marte', en: 'Mars', color: 0xd8432f }, { ca: 'Neptú', es: 'Neptuno', en: 'Neptune', color: 0x3f63d8 }, { ca: 'Venus', es: 'Venus', en: 'Venus', color: 0xe8c87a }, { ca: 'Júpiter', es: 'Júpiter', en: 'Jupiter', color: 0xd9a066 }, { ca: 'Urà', es: 'Urano', en: 'Uranus', color: 0x7fd6e0 }, { ca: 'Saturn', es: 'Saturno', en: 'Saturn', color: 0xe6d3a0 }, { ca: 'Mercuri', es: 'Mercurio', en: 'Mercury', color: 0x9a9aa0 }],
  star: [{ ca: 'Sol', es: 'Sol', en: 'Sun' }, { ca: 'Sírius', es: 'Sirio', en: 'Sirius' }, { ca: 'Betelgeuse', es: 'Betelgeuse', en: 'Betelgeuse' }, { ca: 'Vega', es: 'Vega', en: 'Vega' }, { ca: 'Pròxima', es: 'Próxima', en: 'Proxima' }],
  comet: [{ ca: 'Halley', es: 'Halley', en: 'Halley' }, { ca: 'Hale-Bopp', es: 'Hale-Bopp', en: 'Hale-Bopp' }, { ca: 'Encke', es: 'Encke', en: 'Encke' }, { ca: 'NEOWISE', es: 'NEOWISE', en: 'NEOWISE' }],
  shower: [{ ca: 'Perseids', es: 'Perseidas', en: 'Perseids' }, { ca: 'Leònids', es: 'Leónidas', en: 'Leonids' }, { ca: 'Gemínids', es: 'Gemínidas', en: 'Geminids' }, { ca: 'Quadràntids', es: 'Cuadrántidas', en: 'Quadrantids' }],
  nebula: [{ ca: 'Nebulosa d\u2019Orió', es: 'Nebulosa de Orión', en: 'Orion Nebula' }, { ca: 'Nebulosa de Carina', es: 'Nebulosa de Carina', en: 'Carina Nebula' }, { ca: 'Nebulosa de l\u2019Àguila', es: 'Nebulosa del Águila', en: 'Eagle Nebula' }, { ca: 'Nebulosa del Cranc', es: 'Nebulosa del Cangrejo', en: 'Crab Nebula' }],
  blackhole: [{ ca: 'Sagitari A*', es: 'Sagitario A*', en: 'Sagittarius A*' }, { ca: 'Cygnus X-1', es: 'Cygnus X-1', en: 'Cygnus X-1' }, { ca: 'M87*', es: 'M87*', en: 'M87*' }],
  belt: [{ ca: 'Cinturó principal', es: 'Cinturón principal', en: 'Main belt' }, { ca: 'Cinturó de Kuiper', es: 'Cinturón de Kuiper', en: 'Kuiper belt' }, { ca: 'Troians', es: 'Troyanos', en: 'Trojans' }],
  ring: [{ ca: 'Barrera de gel', es: 'Barrera de hielo', en: 'Ice barrier' }, { ca: 'Barrera de pols', es: 'Barrera de polvo', en: 'Dust barrier' }, { ca: 'Barrera de roca', es: 'Barrera de roca', en: 'Rock barrier' }],
};
export function encounterName(a, lang) {
  const list = NAMES[a.id] || [];
  const n = list[(a.variant || 0) % list.length];
  return n ? (n[lang] || n.en) : a.id;
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
        if (chosen.includes('ring')) cands = cands.filter((id) => id !== 'belt');
        if (chosen.includes('belt')) cands = cands.filter((id) => id !== 'ring');
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
      if (finished % BLOCK === 0 && !this.cardsAt.has(finished)) { this.cardsAt.add(finished); events.push({ type: 'cards', block: finished / BLOCK }); }
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

export const CARDS = [
  { id: 'slow',     icon: '🐢', apply: (m) => { m.spin *= 0.8; m.limit *= 0.72; } },
  { id: 'big',      icon: '🪨', apply: (m) => { m.size *= 1.3; m.mass *= 1.3; } },
  { id: 'magnet',   icon: '🧲', apply: (m) => { m.magnet += 15; m.orbit *= 1.25; } },
  { id: 'life',     icon: '💚', apply: (m) => { m.lives += 1; m.mass *= 1.1; } },
  { id: 'double',   icon: '♊', apply: (m) => { m.doubleOrbit = true; m.orbit *= 1.3; } },
  { id: 'vision',   icon: '👁️', apply: (m) => { m.vision = true; m.sweetWobble += 12; } },
  { id: 'compress', icon: '🌀', apply: (m) => { m.compress += 1; m.size *= 0.8; } },
  { id: 'pyro',     icon: '💣', apply: (m) => { m.boomRate *= 2; m.boomKmCost += 0.03; } },
  { id: 'glacial',  icon: '🧊', apply: (m) => { m.iceRate *= 2; m.heavyRate *= 1.5; } },
  { id: 'gold',     icon: '💰', apply: (m) => { m.goldRate *= 2; m.goldSize *= 0.5; } },
];
export const MAX_STACK = 2;

export function offerCards(rng, chosen) {
  const count = (id) => chosen.filter((c) => c === id).length;
  const pool = CARDS.filter((c) => count(c.id) < MAX_STACK && !(c.id === 'double' && count('double') >= 1) && !(c.id === 'vision' && count('vision') >= 1));
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
