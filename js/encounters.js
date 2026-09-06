// Visuals and per-frame behaviour of the journey encounters. Each one owns a small scene graph
// under game.enc, drifts in when approaching, drifts out when over, and exposes the numbers the
// core loop reads (gravity sources, orbit shape, obstacles, fog, extra rocks).
import * as THREE from 'three';
import { NAMES } from './journey.js';

const _v = new THREE.Vector3();
const ease = (k) => k * k * (3 - 2 * k);

function glow(color, opacity = 0.6) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
}

export function angDist(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Home position of a body relative to the orbit radius; `dir` is the screen direction.
function place(vis, game, dist, dir) {
  const R = game.orbitR * dist;
  vis.home.set(Math.cos(dir) * R, Math.sin(dir) * R, 0);
}

export function createEncounter(game, id, intensity, level, rng, variant = 0) {
  const vis = { id, intensity, level, variant, group: new THREE.Group(), k: 0, target: 1, home: new THREE.Vector3(), dir: rng() * Math.PI * 2, t: 0, alive: true };
  game.enc.add(vis.group);
  const I = intensity;
  switch (id) {
    case 'moon': {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: 0xd8d8e0, roughness: 0.9 }));
      vis.group.add(m); vis.body = m; vis.gravity = 2.6 * I; vis.dist = 1.75;
      break;
    }
    case 'blackhole': {
      const core = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      const disc = new THREE.Mesh(new THREE.RingGeometry(1.15, 2.1, 64), new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.75, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      disc.rotation.x = 1.1;
      const halo = glow(0xff7a2a, 0.5); halo.scale.setScalar(5);
      vis.group.add(halo, disc, core); vis.body = core; vis.disc = disc;
      vis.gravity = 4.2 * I; vis.spinMul = 1 + 0.3 * I; vis.dist = 1.95;
      break;
    }
    case 'planetx': {
      const col = (NAMES.planetx[variant % NAMES.planetx.length] || {}).color || 0xd8432f;
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: col, roughness: 0.8, emissive: col, emissiveIntensity: 0.25 }));
      const halo = glow(col, 0.35); halo.scale.setScalar(3.2);
      vis.group.add(halo, m); vis.body = m; vis.ecc = Math.min(0.5, 0.28 * I); vis.dist = 2.2;
      break;
    }
    case 'star': {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff1b0 }));
      const halo = glow(0xffd166, 0.9); halo.scale.setScalar(6);
      vis.group.add(halo, m); vis.body = m; vis.halo = halo;
      vis.flipEvery = Math.max(2.2, 5.5 / I); vis.flipTimer = vis.flipEvery * (0.6 + rng() * 0.6);
      vis.glareEvery = Math.max(3, 7 / I); vis.glareTimer = vis.glareEvery * (0.5 + rng()); vis.glare = 0; vis.dist = 2.4;
      break;
    }
    case 'ring': case 'icering': {
      // Three arcs with gaps between them; the gaps shrink with intensity and the whole ring turns.
      // Plain rings bounce the rock back to orbit; ice rings let it slide to the nearest gap.
      vis.slide = id === 'icering';
      vis.gaps = 3; vis.gapSize = Math.max(0.75, 1.35 / Math.sqrt(I)); vis.rot = rng() * Math.PI * 2; vis.rotSpeed = 0.25 * I * (rng() < 0.5 ? 1 : -1);   // ~65 % open at first, tighter later
      const mat = new THREE.MeshBasicMaterial({ color: vis.slide ? 0xbff3ff : 0xe8c9a0, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
      vis.arcs = [];
      for (let i = 0; i < vis.gaps; i++) {
        const arcLen = (Math.PI * 2) / vis.gaps - vis.gapSize;
        const a = new THREE.Mesh(new THREE.RingGeometry(0.94, 1.06, 40, 1, 0, arcLen), mat.clone());
        a.rotation.z = i * (Math.PI * 2) / vis.gaps;
        vis.arcs.push(a); vis.group.add(a);
      }
      vis.dist = 0; vis.radius = 0.6;
      break;
    }
    case 'belt': {
      vis.n = 3 + Math.min(2, Math.round(I - 1)); vis.span = Math.min(0.75, 0.36 * I); vis.rot = rng() * Math.PI * 2; vis.rotSpeed = 0.12 * (rng() < 0.5 ? 1 : -1);
      vis.stones = [];
      for (let i = 0; i < vis.n; i++) {
        const cluster = new THREE.Group();
        for (let j = 0; j < 3; j++) {
          const s = new THREE.Mesh(game.rockGeos[(i + j) % game.rockGeos.length], new THREE.MeshStandardMaterial({ color: 0x7a7a88, roughness: 0.95, flatShading: true }));
          s.position.set((j - 1) * 0.5, (rng() - 0.5) * 0.3, (rng() - 0.5) * 0.3); s.scale.setScalar(0.32 + rng() * 0.16);
          cluster.add(s);
        }
        vis.stones.push(cluster); vis.group.add(cluster);
      }
      vis.dist = 0; vis.radius = 0.8;
      break;
    }
    case 'shower': {
      vis.every = Math.max(3, Math.round(5 / I)); vis.streaks = []; vis.streakTimer = 0; vis.dist = 0;
      break;
    }
    case 'nebula': {
      vis.speed = 0.55 * Math.sqrt(I); vis.maxOpacity = Math.min(0.97, 0.88 + 0.03 * I); vis.dist = 0;
      const tint = glow(0x6b7fb3, 0.35); tint.scale.setScalar(40); vis.group.add(tint); vis.tint = tint;
      break;
    }
    case 'comet': {
      vis.every = Math.max(4, Math.round(8 / I)); vis.sinceComet = 0; vis.speedMul = 2.2 + 0.4 * (I - 1); vis.dist = 0;
      break;
    }
    default: break;
  }
  if (vis.dist) place(vis, game, vis.dist, vis.dir);
  return vis;
}

// Per-frame. Returns nothing; writes the shared knobs on `game`.
export function updateEncounter(game, vis, dt) {
  vis.t += dt;
  const speed = vis.target > vis.k ? 0.45 : 0.6;
  vis.k += (vis.target - vis.k) * Math.min(1, dt * speed * 2.5);
  if (vis.target === 0 && vis.k < 0.02) vis.alive = false;
  const k = ease(Math.max(0, Math.min(1, vis.k)));
  const R = game.orbitR;
  const act = !vis.pending && vis.target === 1 && game.state === 'playing';   // acting on the game, not just visible
  if (vis.arrive === undefined) vis.arrive = 0;
  vis.arrive += ((vis.pending ? 0 : 1) - vis.arrive) * Math.min(1, dt * 1.1);
  const far = 1 - ease(vis.arrive);   // 1 = still approaching
  switch (vis.id) {
    case 'moon': case 'blackhole': case 'planetx': case 'star': {
      place(vis, game, vis.dist, vis.dir + vis.t * 0.05);
      // Drift in from far away along its own direction.
      _v.copy(vis.home).multiplyScalar(1 + far * 0.9 + (1 - k) * 3);
      vis.group.position.copy(_v);
      const s = vis.id === 'moon' ? Math.max(0.5, game.Rvis * 0.28) : vis.id === 'blackhole' ? Math.max(0.6, game.Rvis * 0.32)
        : vis.id === 'planetx' ? Math.max(0.7, game.Rvis * 0.42) : Math.max(0.9, game.Rvis * 0.5);
      vis.group.scale.setScalar(s);
      if (vis.body) vis.body.rotation.y += dt * 0.3;
      if (vis.disc) vis.disc.rotation.z += dt * 1.4;
      if (vis.id === 'star') {
        vis.flipTimer -= dt;
        if (vis.flipTimer <= 0 && k > 0.5 && act) { vis.flipTimer = vis.flipEvery * (0.6 + Math.random() * 0.8); game.orbitDir *= -1; game.hooks.onWind && game.hooks.onWind(); }
        vis.glareTimer -= dt;
        if (vis.glareTimer <= 0 && k > 0.5 && act) { vis.glareTimer = vis.glareEvery * (0.6 + Math.random() * 0.8); vis.glare = 0.9; game.hooks.onGlare && game.hooks.onGlare(); }
        vis.glare = Math.max(0, vis.glare - dt);
        vis.halo.material.opacity = 0.7 + Math.sin(vis.t * 3) * 0.15 + vis.glare * 0.5;
        if (act) game.glare = Math.max(game.glare, vis.glare * k);
      }
      if (vis.id === 'planetx' && act) { game.orbitEcc = Math.max(game.orbitEcc, vis.ecc * k); game.orbitPhi = vis.dir + vis.t * 0.05; }
      if (vis.id === 'blackhole' && act) game.spinMul = Math.max(game.spinMul, 1 + (vis.spinMul - 1) * k);
      break;
    }
    case 'ring': case 'icering': {
      vis.rot += vis.rotSpeed * dt;
      const r = R * vis.radius;
      vis.group.scale.setScalar(r * (0.2 + 0.8 * k) * (1 + far * 1.6));
      vis.group.rotation.z = vis.rot;
      for (const a of vis.arcs) a.material.opacity = (0.85 - far * 0.6) * k;
      break;
    }
    case 'belt': {
      vis.rot += vis.rotSpeed * dt;
      const r = R * vis.radius;
      for (let i = 0; i < vis.n; i++) {
        const a = vis.rot + (i / vis.n) * Math.PI * 2;
        const c = vis.stones[i];
        c.position.set(Math.cos(a) * r * (1 + far * 1.4 + (1 - k) * 2.5), Math.sin(a) * r * (1 + far * 1.4 + (1 - k) * 2.5), 0);
        c.rotation.z = a; c.rotation.x += dt * 0.4;
        c.scale.setScalar(Math.max(0.35, game.Rmass * 0.55) * k);
      }
      break;
    }
    case 'nebula': {
      // Rolling fog: hidden about 40 % of the time, never for more than ~3 s.
      const s = Math.sin(vis.t * vis.speed);
      const f = Math.max(0, Math.min(1, (s - 0.1) / 0.5));
      if (act) game.fogTarget = Math.max(game.fogTarget, f * vis.maxOpacity * k);
      vis.tint.position.copy(game.planet.position);
      vis.tint.material.opacity = (0.12 + 0.23 * (1 - far)) * k;
      break;
    }
    case 'shower': {
      // Cosmetic streaks in the background.
      vis.streakTimer -= dt;
      if (vis.streakTimer <= 0 && k > 0.5 && act) {
        vis.streakTimer = 0.6 + Math.random() * 1.2;
        const s = glow(0xffffff, 0.8); s.scale.set(0.15, 0.15, 1);
        const a = Math.random() * Math.PI * 2, rr = R * (2.5 + Math.random() * 2);
        s.position.set(Math.cos(a) * rr, Math.sin(a) * rr, -4);
        s.userData.vel = new THREE.Vector3(-Math.cos(a) * 9, -Math.sin(a) * 9, 0); s.userData.life = 0.9;
        vis.group.add(s); vis.streaks.push(s);
      }
      for (let i = vis.streaks.length - 1; i >= 0; i--) {
        const s = vis.streaks[i];
        s.position.addScaledVector(s.userData.vel, dt); s.userData.life -= dt;
        s.material.opacity = Math.max(0, s.userData.life);
        if (s.userData.life <= 0) { vis.group.remove(s); s.material.dispose(); vis.streaks.splice(i, 1); }
      }
      break;
    }
    default: break;
  }
}

export function disposeEncounter(game, vis) {
  game.enc.remove(vis.group);
  vis.group.traverse((o) => { if (o.material && o.material.dispose) o.material.dispose(); if (o.geometry && o.geometry.dispose) o.geometry.dispose(); });
}

// ---------- Queries used by the core loop ----------

// Gravity sources: [{ pos, g }]
export function gravitySources(list) {
  const out = [];
  for (const vis of list) if (vis.gravity && vis.k > 0.3 && vis.target === 1) out.push({ pos: vis.group.position, g: vis.gravity * ease(Math.min(1, vis.k)) });
  return out;
}

// Ring test: does a rock at angle `a` pass through a gap? (angles in world space)
export function ringBlocks(vis, a) {
  const rel = ((a - vis.rot) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const seg = (Math.PI * 2) / vis.gaps;
  const inSeg = rel % seg;
  const arcLen = seg - vis.gapSize;
  return inSeg < arcLen;   // inside an arc → blocked
}

// Where a rock hitting an arc at angle `a` slides to: the nearest gap edge (world angle).
export function ringSlideTo(vis, a) {
  const rel = ((a - vis.rot) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const seg = (Math.PI * 2) / vis.gaps;
  const segStart = rel - (rel % seg);
  const inSeg = rel - segStart;
  const arcLen = seg - vis.gapSize;
  const margin = Math.min(0.12, vis.gapSize * 0.25);
  const toStart = inSeg, toEnd = arcLen - inSeg;
  const edge = toEnd <= toStart ? segStart + arcLen + margin : segStart - margin;
  return vis.rot + edge;
}

// Belt test: obstacle within reach of angle `a`?
export function beltBlocks(vis, a, extra = 0) {
  for (let i = 0; i < vis.n; i++) {
    const c = vis.rot + (i / vis.n) * Math.PI * 2;
    if (Math.abs(angDist(a, c)) < vis.span / 2 + extra) return true;
  }
  return false;
}
