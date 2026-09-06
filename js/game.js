// PLANETA core: a spinning planet you grow by launching rocks at it. Every rock shifts the
// centre of mass; let the heavy side grow too much and the planet tears itself apart.
import * as THREE from 'three';
import { rockHSL, nebulaFor, stageIndex } from './themes.js';
import { Journey, rollRockKind, defaultMods, applyCard, CARD_ROCKS, randomBoost, BOOST_CHANCE } from './journey.js';
import { createEncounter, updateEncounter, disposeEncounter, gravitySources, ringBlocks, ringSlideTo, beltBlocks, angDist } from './encounters.js';

const R0 = 1;              // core radius
const FOV = 45;
const FLY_SPEED = 15;
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

function hash3(x, y, z, k) {
  const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + k * 3.17) * 43758.5453;
  return v - Math.floor(v);
}

// Low-poly lumpy rocks. Vertices are jittered by a hash of their position so the duplicated
// vertices of the non-indexed icosahedron stay welded.
function makeRockGeometries(n = 5) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const s = 0.8 + hash3(Math.round(x * 1000), Math.round(y * 1000), Math.round(z * 1000), k) * 0.4;
      p.setXYZ(i, x * s, y * s, z * s);
    }
    g.computeVertexNormals();
    out.push(g);
  }
  return out;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// Soft but opaque disc for the nebula fog.
function fogTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.97)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export class Game {
  constructor(canvas, hooks = {}) {
    this.hooks = hooks;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 800);
    this.camDist = 14; this.camGoal = 14;
    this.camera.position.set(0, 0, this.camDist);
    this.shake = 0;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 0.8));
    this.sun = new THREE.DirectionalLight(0xffffff, 2.6);
    this.sun.position.set(-6, 8, 10);
    this.scene.add(this.sun);

    this.planet = new THREE.Group();
    this.deco = new THREE.Group();
    this.scene.add(this.planet, this.deco);

    this.rockGeos = makeRockGeometries();
    this.coreMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.85, metalness: 0.05, emissive: 0xff3300, emissiveIntensity: 0 });
    this.core = new THREE.Mesh(new THREE.SphereGeometry(R0, 40, 28), this.coreMat);
    this.planet.add(this.core);

    this.atmoMat = new THREE.SpriteMaterial({ map: glowTexture(), color: 0x66ccff, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
    this.atmo = new THREE.Sprite(this.atmoMat);
    this.atmo.renderOrder = -1;
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.4, 96), this.ringMat);
    this.ring.rotation.set(1.25, 0.35, 0);
    this.moonMat = new THREE.MeshStandardMaterial({ color: 0xd8d8e0, roughness: 0.9 });
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), this.moonMat);
    this.moon.visible = false;
    this.moonAngle = 0;
    this.deco.add(this.atmo, this.ring, this.moon);

    // Orbit path of the incoming rock.
    {
      const pts = [];
      for (let i = 0; i < 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(Math.cos(a), Math.sin(a), 0);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      this.orbitLine = new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 }));
      this.deco.add(this.orbitLine);
    }

    const tex = glowTexture();
    this.heavy = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xff3b3b, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.sweet = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x4dff88, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(this.heavy, this.sweet);

    // Journey: encounters live under `enc`; the fog sprite can hide everything; the prediction
    // line belongs to the Vision card.
    this.enc = new THREE.Group();
    this.scene.add(this.enc);
    this.journey = new Journey(Math.random);
    this.mods = defaultMods();
    this.chosenCards = []; this.lives = 0; this.compressCount = 0;
    this.encounters = [];        // live encounter visuals
    this.orbitDir = 1; this.orbitEcc = 0; this.orbitPhi = 0; this.spinMul = 1; this.glare = 0; this.fogTarget = 0;
    this.lastSpecial = false; this.wild = []; this.incoming2 = null; this.cometDue = 0; this.pendingCards = null;
    this.cardId = null; this.cardUntil = 0; this.lastCardOffer = 0;
    this.fogMat = new THREE.SpriteMaterial({ map: fogTexture(), color: 0x7f8fb8, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
    this.fog = new THREE.Sprite(this.fogMat); this.fog.renderOrder = 50; this.scene.add(this.fog);
    {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 3), 3));
      g.setDrawRange(0, 0);
      this.predict = new THREE.Line(g, new THREE.LineDashedMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, dashSize: 0.22, gapSize: 0.16 }));
      this.predict.visible = false; this.scene.add(this.predict);
    }
    // Aura shown around the planet while a boost is active.
    this.boostMat = new THREE.SpriteMaterial({ map: this.heavy.material.map, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
    this.boostGlow = new THREE.Sprite(this.boostMat); this.boostGlow.renderOrder = -2; this.scene.add(this.boostGlow);

    // Stars on a far shell.
    {
      const N = 900;
      const pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u), r = 150 + Math.random() * 120;
        pos[i * 3] = s * Math.cos(a) * r; pos[i * 3 + 1] = s * Math.sin(a) * r; pos[i * 3 + 2] = u * r - 60;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false }));
      this.scene.add(this.stars);
    }

    this.rocks = []; this.fx = [];
    this.incoming = null; this.flying = null;
    this.state = 'idle'; this.theme = null;
    this.hueOffset = 0; this.rng = Math.random; this.jitter = false;
    this.time = 0; this.spawnTimer = 0; this.overTimer = 0; this.overFired = false;
    this.inputLockUntil = 0; this.orbitTheta = 0;
    this.M = 1; this.com = new THREE.Vector3(); this.Rvis = R0; this.q = 0;
    this.score = 0; this.combo = 0; this.maxCombo = 0; this.perfects = 0; this.results = [];
    this.stage = 0; this.lastStage = -1;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._last = performance.now();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  // ---------- Derived values ----------
  get Rmass() { return Math.cbrt(this.M); }
  get orbitR() { return Math.max(this.Rvis * 1.3, this.Rmass * 1.8) + 0.9; }
  get sizeKm() { return Math.round((this.Rmass * 1800) / 10) * 10; }

  // Difficulty never stops growing: fast at first, then a slow but endless climb.
  _spin(i) { return (0.35 + 1.15 * (1 - Math.exp(-i / 90)) + i * 0.0025) * this.mods.spin; }
  _orbitSpeed(i) { return -(0.95 + 1.45 * (1 - Math.exp(-i / 110)) + i * 0.002) * (this.jitter ? 0.88 + this.rng() * 0.24 : 1) * this.mods.orbit; }
  _limit(i) { return Math.max(0.05, 0.11 - i * 0.0004) * this.mods.limit; }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._fitCamera(true);
  }

  _fitCamera(snap = false) {
    let E = this.orbitR + this.Rmass * 0.4;
    E *= 1.12;
    const tan = Math.tan((FOV / 2) * Math.PI / 180);
    this.camGoal = E / (tan * Math.min(1, this.camera.aspect)) * (this.camera.aspect < 1 ? 1.08 : 1);
    if (this.state === 'over') this.camGoal *= 1.25;
    if (snap) { this.camDist = this.camGoal; this.camera.position.z = this.camDist; }
  }

  // ---------- Theme ----------
  setTheme(theme) {
    this.theme = theme;
    this.coreMat.color.set(theme.core);
    this.atmoMat.color.set(theme.atmo);
    this.ringMat.color.set(theme.ring);
    this.moonMat.color.set(theme.moon);
    for (const r of this.rocks) this._colorize(r.mesh.material, r.index);
    if (this.incoming) this._colorize(this.incoming.mesh.material, this.incoming.index);
    if (this.flying) this._colorize(this.flying.mesh.material, this.flying.index);
    this._updateSky(true);
  }

  _colorize(mat, i) {
    const [h, s, l] = rockHSL(this.theme, i, this.hueOffset);
    mat.color.setHSL(h / 360, s, l, THREE.SRGBColorSpace);
  }

  _rockMesh(i, r, kind = 'normal') {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.0, flatShading: true });
    this._colorize(mat, i);
    if (kind === 'heavy') { mat.color.multiplyScalar(0.45); mat.emissive.set(0xff2a00); mat.emissiveIntensity = 0.45; mat.metalness = 0.35; }
    else if (kind === 'ice') { mat.color.set(0xc9f1ff); mat.roughness = 0.15; mat.transparent = true; mat.opacity = 0.88; mat.emissive.set(0x3fa9ff); mat.emissiveIntensity = 0.25; }
    else if (kind === 'gold') { mat.color.set(0xffd24a); mat.metalness = 0.85; mat.roughness = 0.3; mat.emissive.set(0xffaa00); mat.emissiveIntensity = 0.5; }
    else if (kind === 'boom') { mat.color.set(0x2a2a30); mat.emissive.set(0xff6a00); mat.emissiveIntensity = 0.8; }
    else if (kind === 'comet') { mat.color.set(0xe8fbff); mat.emissive.set(0xffffff); mat.emissiveIntensity = 0.9; }
    else if (kind === 'wild') { mat.color.set(0x8a8a94); }
    const mesh = new THREE.Mesh(this.rockGeos[Math.floor(this.rng() * this.rockGeos.length)], mat);
    mesh.scale.setScalar(r);
    mesh.rotation.set(this.rng() * 6.28, this.rng() * 6.28, this.rng() * 6.28);
    return mesh;
  }

  _dispose(mesh) {
    if (mesh.parent) mesh.parent.remove(mesh);
    if (mesh.material && mesh.material.dispose) mesh.material.dispose();
  }

  // ---------- Lifecycle ----------
  reset({ rng = Math.random, hueOffset = 0, jitter = false } = {}) {
    this.rocks.forEach((r) => this._dispose(r.mesh));
    this.fx.forEach((f) => { if (f.kind !== 'pop') this._dispose(f.mesh); });
    if (this.incoming) this._dispose(this.incoming.mesh);
    if (this.flying) this._dispose(this.flying.mesh);
    this.rocks = []; this.fx = []; this.incoming = null; this.flying = null;

    this.rng = rng; this.hueOffset = hueOffset; this.jitter = jitter;
    this.spinDir = this.rng() < 0.5 ? 1 : -1;
    this.M = 1; this.com.set(0, 0, 0); this.Rvis = R0; this.q = 0;
    this.score = 0; this.combo = 0; this.maxCombo = 0; this.perfects = 0; this.results = [];
    this.planet.rotation.z = 0; this.planet.position.set(0, 0, 0);
    this.core.scale.setScalar(1); this.coreMat.emissiveIntensity = 0;
    this.atmoMat.opacity = 0; this.ringMat.opacity = 0; this.moon.visible = false;
    this.heavy.material.opacity = 0; this.sweet.material.opacity = 0;
    this.stage = 0; this.lastStage = -1;
    this.mods = defaultMods(); this.chosenCards = []; this.lives = 0; this.compressCount = 0; this.pendingCards = null;
    this.cardId = null; this.cardUntil = 0; this.lastCardOffer = 0;
    this.journey.reset(this.rng);
    for (const v of this.encounters) disposeEncounter(this, v);
    this.encounters = [];
    for (const w of this.wild) this._dispose(w.mesh);
    this.wild = [];
    if (this.incoming2) { this._dispose(this.incoming2.mesh); this.incoming2 = null; }
    this.orbitDir = 1; this.orbitEcc = 0; this.spinMul = 1; this.glare = 0; this.fogTarget = 0; this.fogMat.opacity = 0;
    this.lastSpecial = false; this.cometDue = 0; this.predict.visible = false;
    this.orbitTheta = this.rng() * Math.PI * 2;
    this.spawnTimer = 0; this.overTimer = 0; this.overFired = false; this.shake = 0;
    this._spawn();
    this._updateSky(true);
    this._fitCamera(true);
  }

  start() {
    this.state = 'playing';
    this.inputLockUntil = performance.now() + 180;
    this._fitCamera();
  }

  idle() { this.state = 'idle'; this._fitCamera(); }
  pause() { if (this.state === 'playing') this.state = 'paused'; }
  resume() { if (this.state === 'paused') { this.state = 'playing'; this.inputLockUntil = performance.now() + 300; } }

  // ---------- Mechanics ----------
  _spawn() {
    const i = this.score;
    if (!this.incoming) {
      let kind = rollRockKind(this.rng, i, this.lastSpecial, this.mods);
      if (this.cometDue > 0) { kind = 'comet'; this.cometDue = 0; }
      this.lastSpecial = kind !== 'normal';
      this.incoming = this._makeRock(i, kind);
      this.hooks.onSpawn && this.hooks.onSpawn(kind);
    }
    if (this.mods.doubleOrbit && !this.incoming2) this.incoming2 = this._makeRock(i, rollRockKind(this.rng, i, true, this.mods));
    this._placeIncoming();
    this._fitCamera();
  }

  _halo(kind) {
    const colors = { heavy: 0xff3b3b, ice: 0x7fe6ff, gold: 0xffd24a, boom: 0xff7a1a, comet: 0xffffff };
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.heavy.material.map, color: colors[kind] || 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(3.4);
    s.userData.halo = true;
    return s;
  }

  _makeRock(i, kind) {
    let size = this.mods.size, massMul = this.mods.mass;
    if (kind === 'gold') size *= this.mods.goldSize * 0.85;
    if (kind === 'heavy') { size *= 0.9; massMul *= 2; }
    if (kind === 'comet') size *= 0.8;
    const r = this.Rmass * (0.2 + this.rng() * 0.2) * size;
    const mesh = this._rockMesh(i, r, kind);
    if (kind !== 'normal' && kind !== 'wild') mesh.add(this._halo(kind));
    this.scene.add(mesh);
    const zt = (this.rng() * 2 - 1) * 0.6 * this.Rmass;
    let omega = this._orbitSpeed(i), life = 0;
    if (kind === 'comet') { const c = this.encounters.find((v) => v.id === 'comet'); omega *= c ? c.speedMul : 2.2; life = (Math.PI * 2) / Math.abs(omega); }
    return { mesh, r, m: r * r * r * massMul, index: i, omega, zt, kind, life };
  }

  _orbitPoint(theta, out) {
    const r = this.orbitR * (1 + this.orbitEcc * Math.cos(theta - this.orbitPhi));
    return out.set(Math.cos(theta) * r, Math.sin(theta) * r, 0);
  }

  _placeIncoming() {
    if (this.incoming) this._orbitPoint(this.orbitTheta, this.incoming.mesh.position);
    if (this.incoming2) this._orbitPoint(this.orbitTheta + Math.PI, this.incoming2.mesh.position);
  }

  // World angle of the green point (opposite the heavy side), or null when balanced.
  _sweetAngle() {
    const cw = this._comWorld(_v);
    if (cw.length() < 1e-4) return null;
    return Math.atan2(-cw.y, -cw.x);
  }

  launch() {
    if (this.state !== 'playing' || !this.incoming || this.flying) return false;
    if (performance.now() < this.inputLockUntil) return false;
    let f = this.incoming;
    if (this.incoming2) {
      // Double orbit: fire whichever rock is nearer the green point; the other keeps its place.
      const sw = this._sweetAngle();
      const a1 = this.orbitTheta, a2 = this.orbitTheta + Math.PI;
      if (sw !== null && Math.abs(angDist(a2, sw)) < Math.abs(angDist(a1, sw))) { f = this.incoming2; this.incoming2 = null; }
      else { this.incoming = this.incoming2; this.incoming2 = null; this.orbitTheta = a2; }
    } else this.incoming = null;
    f.dir = new THREE.Vector3(0, 0, f.zt).sub(f.mesh.position).normalize();
    f.launchAngle = Math.atan2(f.mesh.position.y, f.mesh.position.x);
    const sw = this._sweetAngle();
    f.magnet = this.mods.magnet > 0 && sw !== null && Math.abs(angDist(f.launchAngle, sw)) < THREE.MathUtils.degToRad(this.mods.magnet);
    this.flying = f;
    this.spawnTimer = 0.45;
    return true;
  }

  _comWorld(out) {
    const c = Math.cos(this.planet.rotation.z), s = Math.sin(this.planet.rotation.z);
    return out.set(this.com.x * c - this.com.y * s, this.com.x * s + this.com.y * c, 0);
  }

  _hitTest(pos, r) {
    // Core
    if (pos.length() <= (R0 + r * 0.7)) return { c: _w.set(0, 0, 0), rr: R0 + r * 0.7 };
    for (const rock of this.rocks) {
      this.planet.localToWorld(_w.copy(rock.local));
      const rr = (r + rock.r) * 0.68;
      if (pos.distanceToSquared(_w) <= rr * rr) return { c: _w, rr };
    }
    return null;
  }

  // Let a rock roll inward until it wedges against the core or other rocks, so the planet
  // packs into a ball instead of growing spikes.
  _settle(pos, r) {
    const step = r * 0.25;
    for (let k = 0; k < 80; k++) {
      const d0 = pos.length();
      if (d0 < 1e-3) break;
      _v.copy(pos).multiplyScalar(-step / d0);
      pos.add(_v);
      for (let it = 0; it < 4; it++) {
        let pushed = false;
        const dc = pos.length(), rc = R0 + r * 0.7;
        if (dc < rc) { pos.multiplyScalar(rc / Math.max(dc, 1e-6)); pushed = true; }
        for (const rock of this.rocks) {
          this.planet.localToWorld(_w.copy(rock.local));
          const rr = (r + rock.r) * 0.68;
          const d = pos.distanceTo(_w);
          if (d < rr) { pos.sub(_w).multiplyScalar(rr / Math.max(d, 1e-6)).add(_w); pushed = true; }
        }
        if (!pushed) break;
      }
      if (pos.length() > d0 - step * 0.2) break;
    }
  }

  // Self-gravity: every rock creeps toward the centre and overlaps are resolved, so the pile
  // slowly rounds itself off. Also refreshes the visible extent.
  _compact() {
    const rocks = this.rocks;
    for (let it = 0; it < 2; it++) {
      for (const a of rocks) {
        const d = a.local.length();
        if (d > R0 * 0.5) a.local.multiplyScalar(Math.max(0, d - a.r * 0.08) / d);
      }
      for (let i = 0; i < rocks.length; i++) {
        const a = rocks[i];
        const dc = a.local.length(), rc = R0 + a.r * 0.7;
        if (dc < rc) a.local.multiplyScalar(rc / Math.max(dc, 1e-6));
        for (let j = i + 1; j < rocks.length; j++) {
          const b = rocks[j];
          const rr = (a.r + b.r) * 0.68;
          _w.subVectors(b.local, a.local);
          const d = _w.length();
          if (d < rr && d > 1e-6) {
            const push = (rr - d) * 0.5;
            _w.multiplyScalar(push / d);
            const wa = b.m / (a.m + b.m), wb = a.m / (a.m + b.m);
            a.local.addScaledVector(_w, -wa);
            b.local.addScaledVector(_w, wb);
          }
        }
      }
    }
    let ext = R0;
    for (const a of rocks) {
      a.mesh.position.copy(a.local);
      ext = Math.max(ext, a.local.length() + a.r * 0.8);
    }
    this.Rvis = ext;
  }

  _recomputeCom() {
    this.com.set(0, 0, 0);
    for (const a of this.rocks) this.com.addScaledVector(a.lp, a.m);
    this.com.divideScalar(this.M);
    this.com.z = 0;
  }

  _land(f) {
    const pos = f.mesh.position;
    this._settle(pos, f.r);
    if (f.kind === 'boom') { this._explode(f); return; }
    if (f.kind === 'ice') this._slideIce(pos, f);
    const local = this.planet.worldToLocal(pos.clone());
    this.scene.remove(f.mesh);
    for (const ch of f.mesh.children.slice()) if (ch.userData.halo) { f.mesh.remove(ch); ch.material.dispose(); }
    this.planet.add(f.mesh);
    f.mesh.position.copy(local);
    // `lp` is the landing position: the torque a rock contributes is fixed at impact, so the
    // cosmetic compaction below can never rebalance the planet for the player.
    this.rocks.push({ mesh: f.mesh, local, lp: local.clone(), r: f.r, m: f.m, index: f.index, kind: f.kind });

    const qBefore = this.q;
    this.M += f.m;
    this._compact();
    this._recomputeCom();
    if (f.kind === 'boom') {
      this._boom(f); this._compact(); this._recomputeCom();
      const qb = this.com.length() / (this._limit(this.score + 1) * this.Rmass);
      if (qb > 0.85) { const k = 0.85 / qb; for (const r of this.rocks) r.lp.multiplyScalar(k); this._recomputeCom(); }
    }
    if (f.kind === 'gold' || f.kind === 'comet') this.M += f.m;   // grows the planet twice as much
    if (!f.wild) this.score++;
    this.q = this.com.length() / (this._limit(this.score) * this.Rmass);
    if (this.mods.compress && !f.wild && this.score % 10 === 0) {
      const k = Math.pow(0.9, this.mods.compress);
      for (const r of this.rocks) r.lp.multiplyScalar(k);
      this._recomputeCom();
      this.q = this.com.length() / (this._limit(this.score) * this.Rmass);
      this.hooks.onCompress && this.hooks.onCompress();
    }
    if (f.wild) {
      this.fx.push({ kind: 'pop', mesh: f.mesh, base: f.r, t: 0, life: 0.28 });
      this._burst(pos, f.mesh.material.color, f.r);
      this.shake = Math.max(this.shake, 0.06 + f.r * 0.25);
      this._updateSky();
      if (this.q >= 1 && this.lives > 0) { this.lives--; this._rescue(); }
      if (this.q >= 1) { this.hooks.onPlace && this.hooks.onPlace({ score: this.score, perfect: false, combo: 0, q: 1, improved: false, sizeKm: this.sizeKm, cracked: true }); this._break(); return; }
      this.hooks.onWildLand && this.hooks.onWildLand(this.q);
      return;
    }

    const improved = this.q < qBefore - 0.02;
    const perfect = (qBefore > 0.2 && this.q < qBefore * 0.45) || this.q < 0.06;
    if (perfect) { this.combo++; this.perfects++; this.maxCombo = Math.max(this.maxCombo, this.combo); }
    else this.combo = 0;
    if (f.kind === 'gold' && perfect) { this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); }
    this.results.push(perfect ? 'P' : 'C');

    this.fx.push({ kind: 'pop', mesh: f.mesh, base: f.r, t: 0, life: 0.28 });
    this._burst(pos, f.mesh.material.color, f.r);
    this.shake = Math.max(this.shake, 0.06 + f.r * 0.25);
    if (this.flying === f) this.flying = null;
    this._updateSky();
    if (this.q >= 1 && this.lives > 0) { this.lives--; this._rescue(); }
    if (this.q >= 1) {
      this.hooks.onPlace && this.hooks.onPlace({ score: this.score, perfect: false, combo: 0, q: 1, improved: false, sizeKm: this.sizeKm, cracked: true });
      this._break();
      return;
    }
    this._fitCamera();
    this.hooks.onPlace && this.hooks.onPlace({ score: this.score, perfect, combo: this.combo, q: this.q, improved, sizeKm: this.sizeKm, cracked: false, kind: f.kind, slid: !!f.slid, frozen: !!f.frozen });
    for (const ev of this.journey.onRock(this.score)) this._journeyEvent(ev);
    this._journeyTick();
    this._afterRock();
  }

  // Card bookkeeping after every counted rock: expiry, and offering help when the planet is in
  // danger (at most once every 20 rocks, never while a card is still active).
  _afterRock() {
    if (this.cardUntil && this.score >= this.cardUntil) {
      this.cardUntil = 0; this.cardId = null; this.mods = defaultMods();
      this._placeIncoming();
      this.hooks.onCardExpired && this.hooks.onCardExpired();
    }
  }

  _grantBoost() {
    const c = randomBoost(this.rng, this.cardId || this.chosenCards[this.chosenCards.length - 1]);
    if (!c) return;
    this.mods = defaultMods();
    applyCard(this.mods, c.id);
    if (this.mods.lives) { this.lives += this.mods.lives; this.mods.lives = 0; }
    this.cardId = c.id; this.cardUntil = this.score + CARD_ROCKS;
    this.chosenCards.push(c.id);
    if (this.mods.doubleOrbit && !this.incoming2 && this.incoming) this.incoming2 = this._makeRock(this.score, 'normal');
    this._placeIncoming();
    this.hooks.onBoost && this.hooks.onBoost(c.id, CARD_ROCKS);
  }

  // Ice slides toward the green point (up to 45°); on the heavy side it freezes and weighs more.
  _slideIce(pos, f) {
    const sw = this._sweetAngle();
    if (sw === null) return;
    const a = Math.atan2(pos.y, pos.x);
    if (Math.abs(angDist(a, sw + Math.PI)) < THREE.MathUtils.degToRad(30)) { f.m *= 1.3; f.frozen = true; return; }
    const d = angDist(sw, a);
    const step = Math.sign(d) * Math.min(Math.abs(d), THREE.MathUtils.degToRad(45));
    const r = pos.length();
    pos.set(Math.cos(a + step) * r, Math.sin(a + step) * r, pos.z);
    this._settle(pos, f.r);
    f.slid = true;
  }

  // Explosive rock: bursts on impact, takes the rocks around it with it and is gone.
  _explode(f) {
    const local = this.planet.worldToLocal(f.mesh.position.clone());
    const gone = [];
    for (const rock of this.rocks) {
      const rr = (f.r + rock.r) * 2.1;
      if (rock.local.distanceToSquared(local) <= rr * rr) gone.push(rock);
    }
    for (const rock of gone) this._removeRock(rock);
    if (this.mods.boomKmCost) this.M = Math.max(1, this.M * (1 - this.mods.boomKmCost));
    this._burst(f.mesh.position, f.mesh.material.emissive, f.r * 1.6);
    this._burst(f.mesh.position, f.mesh.material.emissive, f.r * 1.2);
    this._dispose(f.mesh);
    if (this.flying === f) this.flying = null;
    this.shake = Math.max(this.shake, 0.4);
    this._compact(); this._recomputeCom();
    if (!f.wild) this.score++;
    let q = this.com.length() / (this._limit(this.score) * this.Rmass);
    if (q > 0.85) { const k = 0.85 / q; for (const r of this.rocks) r.lp.multiplyScalar(k); this._recomputeCom(); q = 0.85; }
    this.q = q;
    this.combo = 0;
    this.results.push('C');
    this._updateSky();
    this._fitCamera();
    this.hooks.onBoom && this.hooks.onBoom(gone.length);
    this.hooks.onPlace && this.hooks.onPlace({ score: this.score, perfect: false, combo: 0, q: this.q, improved: gone.length > 0, sizeKm: this.sizeKm, cracked: false, kind: 'boom' });
    for (const ev of this.journey.onRock(this.score)) this._journeyEvent(ev);
    this._journeyTick();
    this._afterRock();
  }

  _boom(f) {
    const me = this.rocks[this.rocks.length - 1];
    const gone = [];
    for (const rock of this.rocks) {
      if (rock === me) continue;
      const rr = (f.r + rock.r) * 1.9;
      if (rock.local.distanceToSquared(me.local) <= rr * rr) gone.push(rock);
    }
    for (const rock of gone) this._removeRock(rock);
    if (this.mods.boomKmCost) this.M = Math.max(1 + f.m, this.M * (1 - this.mods.boomKmCost));
    this.shake = Math.max(this.shake, 0.35);
    this.hooks.onBoom && this.hooks.onBoom(gone.length);
  }

  _removeRock(rock) {
    this.M = Math.max(1, this.M - rock.m);
    this._burst(this.planet.localToWorld(rock.local.clone()), rock.mesh.material.color, rock.r);
    this._dispose(rock.mesh);
    const i = this.rocks.indexOf(rock);
    if (i >= 0) this.rocks.splice(i, 1);
  }

  // Second-chance card: the heaviest rocks on the heavy side fly off and the planet survives.
  _rescue() {
    const dir = this.com.clone().normalize();
    const sorted = this.rocks.slice().sort((a, b) => b.lp.dot(dir) * b.m - a.lp.dot(dir) * a.m);
    for (const rock of sorted.slice(0, Math.min(4, Math.max(1, Math.floor(this.rocks.length / 4))))) this._removeRock(rock);
    this._compact(); this._recomputeCom();
    let q = this.com.length() / (this._limit(this.score) * this.Rmass);
    if (q > 0.6) { const k = 0.6 / q; for (const r of this.rocks) r.lp.multiplyScalar(k); this._recomputeCom(); q = 0.6; }
    this.q = q;
    this.shake = 0.5;
    this.hooks.onRescue && this.hooks.onRescue(this.lives);
  }

  // ---------- Journey ----------
  _journeyEvent(ev) {
    if (ev.type === 'approach') {
      let fresh = false;
      for (const a of ev.segment.active) if (!this.encounters.some((v) => v.id === a.id && v.pending)) { this._startEncounter(a, true); fresh = true; }
      if (fresh) this.hooks.onApproach && this.hooks.onApproach(ev.segment.active);
    } else if (ev.type === 'start') {
      for (const a of ev.segment.active) {
        const v = this.encounters.find((x) => x.id === a.id && x.pending);
        if (v) v.pending = false; else this._startEncounter(a, false);
      }
      this.hooks.onEncounter && this.hooks.onEncounter('start', ev.segment.active, ev.index);
    } else if (ev.type === 'end') {
      for (const a of ev.segment.active) { const v = this.encounters.find((x) => x.id === a.id && !x.pending && x.target === 1); if (v) v.target = 0; }
      this.hooks.onEncounter && this.hooks.onEncounter('end', ev.segment.active);
    } else if (ev.type === 'sector') {
      this.hooks.onSector && this.hooks.onSector(ev.sector);
      if (this.rng() < BOOST_CHANCE) this._grantBoost();
    }
  }

  _startEncounter(a, pending) {
    const v = createEncounter(this, a.id, a.intensity, a.level, this.rng, a.variant);
    v.pending = pending;
    this.encounters.push(v);
  }

  // Extra rocks driven by encounters: meteor showers and comets.
  _journeyTick() {
    const live = (id) => this.encounters.find((v) => v.id === id && !v.pending && v.target === 1);
    const sh = live('shower');
    if (sh && this.score % sh.every === 0) {
      const a = this.rng() * Math.PI * 2;
      const w = this._makeRock(this.score, 'wild');
      this._orbitPoint(a, w.mesh.position).multiplyScalar(1.7);
      w.dir = new THREE.Vector3(0, 0, w.zt).sub(w.mesh.position).normalize();
      w.wild = true;
      this.wild.push(w);
      this.hooks.onWild && this.hooks.onWild();
    }
    const c = live('comet');
    if (c && this.score % c.every === 0) this.cometDue = 1;
  }

  chooseCard(id) {
    if (this.state !== 'cards') return;
    this.mods = defaultMods();
    applyCard(this.mods, id);
    this.cardId = id; this.cardUntil = this.score + CARD_ROCKS;
    if (this.mods.lives) { this.lives += this.mods.lives; this.mods.lives = 0; }   // a spare life outlives the card
    this.chosenCards.push(id);
    this.pendingCards = null;
    this.state = 'playing';
    this.inputLockUntil = performance.now() + 300;
    if (this.mods.doubleOrbit && !this.incoming2 && this.incoming) this.incoming2 = this._makeRock(this.score, 'normal');
    this._placeIncoming();
    this.hooks.onCardChosen && this.hooks.onCardChosen(id);
  }

  _trail(f) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.heavy.material.map, color: f.mesh.material.emissive && f.mesh.material.emissiveIntensity > 0.3 ? f.mesh.material.emissive : 0xffffff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.copy(f.mesh.position);
    s.scale.setScalar(f.r * 1.6);
    this.scene.add(s);
    this.fx.push({ kind: 'trail', mesh: s, t: 0, life: 0.35 });
  }

  // Ring: the rock bounces back to the orbit and gets another lap.
  _bounce(f, ang) {
    if (this.flying === f) this.flying = null;
    f.passedRing = false; f.passedBelt = false; f.dir = null; f.magnet = false;
    if (!this.incoming) { this.incoming = f; this.orbitTheta = ang; this._placeIncoming(); }
    else if (this.mods.doubleOrbit && !this.incoming2) { this.incoming2 = f; this._placeIncoming(); }
    else this._dispose(f.mesh);
    this.shake = Math.max(this.shake, 0.12);
    this.hooks.onBounce && this.hooks.onBounce();
  }

  // Belt: the rock is lost against an asteroid.
  _smash(f, captured = false) {
    if (this.flying === f) this.flying = null;
    if (f.wild) { this._dispose(f.mesh); return; }
    this._burst(f.mesh.position, f.mesh.material.color, f.r);
    this._dispose(f.mesh);
    this.combo = 0;
    this.shake = Math.max(this.shake, 0.2);
    this.hooks.onSmash && this.hooks.onSmash(captured);
  }

  // Bends a direction by the active gravity sources (and the magnet) for one sub-step.
  _bend(pos, dir, dt, grav, sw) {
    for (const g of grav) {
      _w.subVectors(g.pos, pos);
      const d = Math.max(0.5, _w.length());
      dir.addScaledVector(_w.normalize(), (g.g * dt) * Math.min(1, 8 / d));
    }
    if (sw !== null) { _w.set(Math.cos(sw), Math.sin(sw), 0).multiplyScalar(this.Rvis).sub(pos); dir.addScaledVector(_w.normalize(), 5 * dt); }
    if (grav.length || sw !== null) dir.normalize();
  }

  // Where the waiting rock would go if launched now (same physics as the flight).
  _simulatePath(rock, out) {
    const grav = gravitySources(this.encounters.filter((v) => !v.pending));
    const pos = rock.mesh.position.clone();
    const dir = new THREE.Vector3(0, 0, rock.zt).sub(pos).normalize();
    const dt = 1 / 60;
    const step = (FLY_SPEED * (grav.length ? 0.7 : 1) * (0.6 + 0.4 * this.Rmass) * dt) / 4;
    let n = 0;
    out[n++] = pos.clone();
    for (let i = 0; i < 63 * 4 && n < 64; i++) {
      this._bend(pos, dir, dt / 4, grav, null);
      pos.addScaledVector(dir, step);
      if (i % 4 === 3) out[n++] = pos.clone();
      if (pos.length() < this.Rvis * 0.98 || pos.length() > this.orbitR * 1.5) break;
    }
    return n;
  }

  // One flight step for a launched or wild rock; returns true when the rock is gone (landed,
  // bounced or smashed).
  _flyStep(f, dt) {
    const grav = gravitySources(this.encounters.filter((v) => !v.pending));
    const step = (FLY_SPEED * (grav.length ? 0.7 : 1) * (0.6 + 0.4 * this.Rmass) * dt) / 4;
    f.trailT = (f.trailT || 0) + dt;
    if (f.trailT > 0.02) { f.trailT = 0; this._trail(f); }
    // A rock bent away from the planet is lost (captured by whatever pulled it).
    f.flyT = (f.flyT || 0) + dt;
    if (f.flyT > 1.6 || f.mesh.position.length() > this.orbitR * 1.5) { this._smash(f, true); return true; }
    const sw = f.magnet ? this._sweetAngle() : null;
    for (let s = 0; s < 4; s++) {
      this._bend(f.mesh.position, f.dir, dt / 4, grav, sw);
      f.mesh.position.addScaledVector(f.dir, step);
      f.mesh.rotation.x += dt * 2;
      const rad = f.mesh.position.length(), ang = Math.atan2(f.mesh.position.y, f.mesh.position.x);
      if (!f.wild) {
        for (const v of this.encounters) {
          if (v.pending || v.target !== 1) continue;
          if ((v.id === 'ring' || v.id === 'icering') && !f.passedRing && rad <= this.orbitR * v.radius) {
            f.passedRing = true;
            if (ringBlocks(v, ang)) {
              if (!v.slide) { this._bounce(f, ang); return true; }
              // Ice: slide along the ring to the nearest gap, then carry on inward from there.
              const a2 = ringSlideTo(v, ang);
              f.mesh.position.set(Math.cos(a2) * rad, Math.sin(a2) * rad, f.mesh.position.z);
              f.dir = new THREE.Vector3(0, 0, f.zt).sub(f.mesh.position).normalize();
              f.slidBarrier = true;
              this.hooks.onSlide && this.hooks.onSlide();
              for (let s2 = 0; s2 < 6; s2++) this._trail(f);
            }
          }
          if (v.id === 'belt' && !f.passedBelt && rad <= this.orbitR * v.radius) { f.passedBelt = true; if (beltBlocks(v, ang, f.r / (this.orbitR * v.radius))) { this._smash(f); return true; } }
        }
      }
      const hit = this._hitTest(f.mesh.position, f.r);
      if (hit || rad < 0.05) {
        if (hit) {
          const n = f.mesh.position.clone().sub(hit.c);
          if (n.lengthSq() < 1e-6) n.copy(f.dir).negate();
          f.mesh.position.copy(hit.c).addScaledVector(n.normalize(), hit.rr);
        }
        this._land(f);
        return true;
      }
    }
    return false;
  }

  _break() {
    this.state = 'over';
    this.results.push('F');
    for (const rock of this.rocks) {
      const wp = this.planet.localToWorld(rock.local.clone());
      this.planet.remove(rock.mesh);
      this.scene.add(rock.mesh);
      rock.mesh.position.copy(wp);
      rock.vel = wp.clone().normalize().multiplyScalar(4 + Math.random() * 7)
        .add(new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 5));
      rock.ang = new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    }
    if (this.incoming) { this._dispose(this.incoming.mesh); this.incoming = null; }
    if (this.incoming2) { this._dispose(this.incoming2.mesh); this.incoming2 = null; }
    for (const w of this.wild) this._dispose(w.mesh);
    this.wild = [];
    this.predict.visible = false;
    this.shake = 0.9;
    this.overTimer = 0; this.overFired = false;
    this._fitCamera();
  }

  _burst(pos, color, r) {
    for (let i = 0; i < 7; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: color.clone(), flatShading: true, roughness: 0.9 });
      const mesh = new THREE.Mesh(this.rockGeos[i % this.rockGeos.length], mat);
      const s = r * (0.12 + Math.random() * 0.2);
      mesh.scale.setScalar(s);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      const dir = pos.clone().normalize();
      this.fx.push({
        kind: 'particle', mesh, t: 0, life: 0.7,
        vel: dir.multiplyScalar(2 + Math.random() * 3).add(new THREE.Vector3((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3)),
      });
    }
  }

  _updateSky(force = false) {
    if (!this.theme) return;
    const stage = stageIndex(this.score);
    const colors = nebulaFor(this.theme, this.score);
    const changed = force || stage !== this.lastStage;
    this.hooks.onSky && this.hooks.onSky(colors, stage, changed);
    this.lastStage = stage;
    this.stage = stage;
  }

  // ---------- Loop ----------
  _loop(now) {
    requestAnimationFrame(this._loop);
    let dt = (now - this._last) / 1000;
    this._last = now;
    if (dt > 0.05) dt = 0.05;
    this.time += dt;
    try { this.update(dt); } catch (e) { console.error(e); this.hooks.onError && this.hooks.onError(e); }
    this.renderer.render(this.scene, this.camera);
  }

  update(dt) {
    const playing = this.state === 'playing';
    const idle = this.state === 'idle';

    // Encounters: their visuals, and the knobs they drive (re-derived every frame).
    this.orbitEcc = 0; this.spinMul = 1; this.glare = 0; this.fogTarget = 0;
    for (let i = this.encounters.length - 1; i >= 0; i--) {
      const v = this.encounters[i];
      updateEncounter(this, v, dt);
      if (!v.alive) { disposeEncounter(this, v); this.encounters.splice(i, 1); }
    }
    this.fogMat.opacity += (this.fogTarget - this.fogMat.opacity) * Math.min(1, dt * 3);
    this.fog.position.copy(this.planet.position);
    this.fog.scale.setScalar(Math.max(this.orbitR * 2.1, this.Rvis * 3.2));
    if (this.orbitEcc > 0 || this._lastEcc > 0) {
      const pos = this.orbitLine.geometry.attributes.position;
      for (let i = 0; i < 128; i++) {
        const a = (i / 128) * Math.PI * 2, r = 1 + this.orbitEcc * Math.cos(a - this.orbitPhi);
        pos.setXYZ(i, Math.cos(a) * r, Math.sin(a) * r, 0);
      }
      pos.needsUpdate = true;
    }
    this._lastEcc = this.orbitEcc;

    // Planet spin
    if (playing || idle) this.planet.rotation.z += this.spinDir * (idle ? 0.25 : this._spin(this.score) * this.spinMul) * dt;

    // Orbiting rock(s)
    if (this.incoming) {
      this.orbitTheta += (idle ? -0.5 : this.incoming.omega * this.orbitDir) * dt;
      this._placeIncoming();
      for (const r of [this.incoming, this.incoming2]) {
        if (!r) continue;
        r.mesh.rotation.x += dt * 0.8; r.mesh.rotation.y += dt * 1.1;
        if (r.kind === 'boom') r.mesh.material.emissiveIntensity = 0.6 + 0.4 * Math.sin(this.time * 9);
        for (const ch of r.mesh.children) if (ch.userData.halo) { ch.scale.setScalar(3.0 + 0.7 * Math.sin(this.time * 5)); ch.material.opacity = 0.6 + 0.3 * Math.sin(this.time * 5); }
      }
      if (this.incoming.life) {
        this.incoming.life -= dt;
        if (this.incoming.life <= 0) { this._dispose(this.incoming.mesh); this.incoming = null; this.spawnTimer = 0.2; this.hooks.onCometGone && this.hooks.onCometGone(); }
      }
    }
    if (playing && !this.flying && (!this.incoming || (this.mods.doubleOrbit && !this.incoming2))) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) { if (!this.incoming) this.orbitTheta += Math.PI; this._spawn(); }
    }

    // Flying rocks: the launched one and any wild ones from a meteor shower.
    if (this.flying) this._flyStep(this.flying, dt);
    for (let i = this.wild.length - 1; i >= 0; i--) if (this._flyStep(this.wild[i], dt)) this.wild.splice(i, 1);

    // Predicted path: with the Vision boost, or whenever something is bending the rocks.
    const bending = this.encounters.some((v) => v.gravity && !v.pending && v.target === 1 && v.k > 0.3);
    this.predict.visible = !!((this.mods.vision || bending) && this.incoming && playing);
    if (this.predict.visible) {
      this._pathPts = this._pathPts || [];
      const n = this._simulatePath(this.incoming, this._pathPts);
      const pts = this.predict.geometry.attributes.position;
      for (let i = 0; i < n; i++) pts.setXYZ(i, this._pathPts[i].x, this._pathPts[i].y, 0);
      pts.needsUpdate = true;
      this.predict.geometry.setDrawRange(0, n);
      this.predict.computeLineDistances();
      this.predict.material.color.set(bending ? 0xffd166 : 0xffffff);
    }
    // Boost aura.
    {
      const on = this.cardUntil > this.score && playing;
      const BOOST_COLORS = { slow: 0x7dffb0, big: 0xffb056, magnet: 0xff5e7e, life: 0x4dff88, double: 0xc44bd6, vision: 0x66ccff, compress: 0x9b5de5, gold: 0xffd24a, glacial: 0x7fe6ff };
      this.boostMat.color.set(BOOST_COLORS[this.cardId] || 0xffffff);
      this.boostMat.opacity += ((on ? 0.28 + 0.1 * Math.sin(this.time * 4) : 0) - this.boostMat.opacity) * Math.min(1, dt * 4);
      this.boostGlow.position.copy(this.planet.position);
      this.boostGlow.scale.setScalar(Math.max(this.Rvis * 3.4, this.Rmass * 4));
    }

    // Balance visuals
    const cw = this._comWorld(_v);
    const len = cw.length();
    const q = this.q;
    if (this.state !== 'over') {
      if (len > 1e-4) {
        const dir = cw.divideScalar(len);
        const wob = q * q;
        this.planet.position.set(
          dir.x * 0.08 * q * this.Rvis + (Math.random() - 0.5) * wob * 0.08 * this.Rvis,
          dir.y * 0.08 * q * this.Rvis + (Math.random() - 0.5) * wob * 0.08 * this.Rvis,
          0,
        );
        const pulse = 1 + 0.12 * Math.sin(this.time * 7);
        this.heavy.position.copy(dir).multiplyScalar(this.Rvis * 1.08);
        this.heavy.scale.setScalar(this.Rvis * 0.75 * pulse);
        // Always readable while playing: the markers are the whole aiming aid, so they must not
        // fade to nothing on a well-balanced planet.
        this.heavy.material.opacity = (playing ? 0.35 + 0.65 * Math.min(1, q * 1.3) : idle ? Math.min(1, q * 1.3) : 0);
        let sdir = dir;
        if (this.mods.sweetWobble) {
          const w = Math.sin(this.time * 2.3) * THREE.MathUtils.degToRad(this.mods.sweetWobble);
          sdir = _w.set(dir.x * Math.cos(w) - dir.y * Math.sin(w), dir.x * Math.sin(w) + dir.y * Math.cos(w), 0);
        }
        this.sweet.position.copy(sdir).multiplyScalar(-this.Rvis * 1.08);
        this.sweet.scale.setScalar(this.Rvis * 0.6 * (2 - pulse));
        this.sweet.material.opacity = (q > 0.08 ? 0.95 : 0.7) * (playing ? 1 : 0) * (1 - this.glare);
        this.heavy.material.opacity *= (1 - this.glare);
        if (playing && this.incoming && this.incoming.kind === 'boom') {
          // Explosives go to the heavy side: make the red point the obvious target.
          this.heavy.scale.setScalar(this.Rvis * (1.1 + 0.25 * Math.sin(this.time * 8)));
          this.heavy.material.opacity = 1;
          this.sweet.material.opacity *= 0.2;
        }
      } else {
        this.planet.position.set(0, 0, 0);
        this.heavy.material.opacity = 0;
        this.sweet.material.opacity = 0;
      }
      this.coreMat.emissiveIntensity = q * q * 0.9;
    }

    // Decorations
    const stage = this.stage;
    this.atmo.scale.setScalar(Math.max(this.Rmass * 3.6, this.Rvis * 2.6));
    this.atmoMat.opacity += ((stage >= 1 ? 0.28 + 0.06 * stage : 0) - this.atmoMat.opacity) * Math.min(1, dt * 2);
    this.ring.scale.setScalar(Math.max(this.Rmass * 1.2, this.Rvis * 0.85));
    this.ringMat.opacity = 0;
    this.moon.visible = false;
    if (this.moon.visible) {
      this.moonAngle += dt * 0.6;
      const mr = this.orbitR * 1.35;
      this.moon.position.set(Math.cos(this.moonAngle) * mr, Math.sin(this.moonAngle) * mr * 0.35, Math.sin(this.moonAngle) * mr * 0.6);
      this.moon.scale.setScalar(this.Rvis * 0.22);
    }
    this.orbitLine.scale.setScalar(this.orbitR);
    this.orbitLine.material.opacity = playing ? 0.22 : 0.1;
    this.atmo.position.copy(this.planet.position);
    this.ring.position.copy(this.planet.position);
    this.stars.rotation.z += dt * 0.008;

    // FX
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.life);
      if (f.kind === 'pop') {
        const s = f.base * (1 + 0.45 * Math.sin(k * Math.PI));
        f.mesh.scale.setScalar(s);
        if (k >= 1) { f.mesh.scale.setScalar(f.base); this.fx.splice(i, 1); }
      } else if (f.kind === 'trail') {
        f.mesh.material.opacity = 0.45 * (1 - k);
        f.mesh.scale.multiplyScalar(1 - dt * 1.5);
        if (k >= 1) { this._dispose(f.mesh); this.fx.splice(i, 1); }
      } else {
        f.mesh.position.addScaledVector(f.vel, dt);
        f.vel.multiplyScalar(1 - dt * 2);
        f.mesh.rotation.x += 5 * dt; f.mesh.rotation.y += 4 * dt;
        f.mesh.scale.multiplyScalar(1 - dt * 1.6);
        if (k >= 1) { this._dispose(f.mesh); this.fx.splice(i, 1); }
      }
    }

    // Break animation
    if (this.state === 'over') {
      this.overTimer += dt;
      for (const rock of this.rocks) {
        if (!rock.vel) continue;
        rock.mesh.position.addScaledVector(rock.vel, dt);
        rock.vel.multiplyScalar(1 - dt * 0.6);
        rock.mesh.rotation.x += rock.ang.x * dt; rock.mesh.rotation.y += rock.ang.y * dt; rock.mesh.rotation.z += rock.ang.z * dt;
      }
      const k = Math.min(1, this.overTimer / 0.9);
      this.core.scale.setScalar(1 - 0.8 * k);
      this.coreMat.emissiveIntensity = 1.6 * (1 - k);
      this.heavy.material.opacity *= 1 - dt * 4;
      this.sweet.material.opacity = 0;
      this.atmoMat.opacity *= 1 - dt * 2;
      this.ringMat.opacity *= 1 - dt * 2;
      if (!this.overFired && this.overTimer > 1.15) {
        this.overFired = true;
        this.hooks.onFail && this.hooks.onFail({
          score: this.score, perfects: this.perfects, maxCombo: this.maxCombo, results: this.results.slice(), sizeKm: this.sizeKm,
          cards: this.chosenCards.slice(), encounters: Object.keys(this.journey.seen).length,
        });
      }
    }

    // Camera
    this.camDist += (this.camGoal - this.camDist) * (1 - Math.exp(-dt * 2.5));
    this.camera.position.set(0, 0, this.camDist);
    if (this.shake > 0) {
      this.shake -= dt;
      const s = this.shake * 0.5 * this.Rvis;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
    }
    this.camera.lookAt(0, 0, 0);
  }
}
