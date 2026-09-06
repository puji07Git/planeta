// PLANETA core: a spinning planet you grow by launching rocks at it. Every rock shifts the
// centre of mass; let the heavy side grow too much and the planet tears itself apart.
import * as THREE from 'three';
import { rockHSL, nebulaFor, stageIndex } from './themes.js';

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

  _spin(i) { return Math.min(1.5, 0.35 + i * 0.011); }
  _orbitSpeed(i) { return -Math.min(2.4, 0.95 + i * 0.013) * (this.jitter ? 0.88 + this.rng() * 0.24 : 1); }
  _limit(i) { return Math.max(0.06, 0.11 - i * 0.0004); }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._fitCamera(true);
  }

  _fitCamera(snap = false) {
    let E = this.orbitR + this.Rmass * 0.4;
    if (this.stage >= 3) E = Math.max(E, this.orbitR * 1.35 + this.Rvis * 0.3);
    if (this.stage >= 2) E = Math.max(E, Math.max(this.Rmass * 1.2, this.Rvis * 0.85) * 2.4);
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

  _rockMesh(i, r) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.0, flatShading: true });
    this._colorize(mat, i);
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

  // ---------- Mechanics ----------
  _spawn() {
    const i = this.score;
    const r = this.Rmass * (0.2 + this.rng() * 0.2);
    const mesh = this._rockMesh(i, r);
    this.scene.add(mesh);
    const zt = (this.rng() * 2 - 1) * 0.6 * this.Rmass;
    this.incoming = { mesh, r, m: r * r * r, index: i, omega: this._orbitSpeed(i), zt };
    this._placeIncoming();
    this._fitCamera();
  }

  _placeIncoming() {
    const p = this.incoming.mesh.position;
    p.set(Math.cos(this.orbitTheta), Math.sin(this.orbitTheta), 0).multiplyScalar(this.orbitR);
  }

  launch() {
    if (this.state !== 'playing' || !this.incoming || this.flying) return false;
    if (performance.now() < this.inputLockUntil) return false;
    this.flying = this.incoming;
    this.incoming = null;
    this.flying.dir = new THREE.Vector3(0, 0, this.flying.zt).sub(this.flying.mesh.position).normalize();
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
    const local = this.planet.worldToLocal(pos.clone());
    this.scene.remove(f.mesh);
    this.planet.add(f.mesh);
    f.mesh.position.copy(local);
    // `lp` is the landing position: the torque a rock contributes is fixed at impact, so the
    // cosmetic compaction below can never rebalance the planet for the player.
    this.rocks.push({ mesh: f.mesh, local, lp: local.clone(), r: f.r, m: f.m, index: f.index });

    const qBefore = this.q;
    this.M += f.m;
    this._compact();
    this._recomputeCom();
    this.score++;
    this.q = this.com.length() / (this._limit(this.score) * this.Rmass);

    const improved = this.q < qBefore - 0.02;
    const perfect = (qBefore > 0.2 && this.q < qBefore * 0.45) || this.q < 0.06;
    if (perfect) { this.combo++; this.perfects++; this.maxCombo = Math.max(this.maxCombo, this.combo); }
    else this.combo = 0;
    this.results.push(perfect ? 'P' : 'C');

    this.fx.push({ kind: 'pop', mesh: f.mesh, base: f.r, t: 0, life: 0.28 });
    this._burst(pos, f.mesh.material.color, f.r);
    this.shake = Math.max(this.shake, 0.06 + f.r * 0.25);
    this.flying = null;
    this._updateSky();

    if (this.q >= 1) {
      this.hooks.onPlace && this.hooks.onPlace({ score: this.score, perfect: false, combo: 0, q: 1, improved: false, sizeKm: this.sizeKm, cracked: true });
      this._break();
      return;
    }
    this._fitCamera();
    this.hooks.onPlace && this.hooks.onPlace({ score: this.score, perfect, combo: this.combo, q: this.q, improved, sizeKm: this.sizeKm, cracked: false });
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
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  update(dt) {
    const playing = this.state === 'playing';
    const idle = this.state === 'idle';

    // Planet spin
    if (playing || idle) this.planet.rotation.z += this.spinDir * (idle ? 0.25 : this._spin(this.score)) * dt;

    // Orbiting rock
    if (this.incoming) {
      this.orbitTheta += (idle ? -0.5 : this.incoming.omega) * dt;
      this._placeIncoming();
      this.incoming.mesh.rotation.x += dt * 0.8;
      this.incoming.mesh.rotation.y += dt * 1.1;
    } else if (playing && !this.flying) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) { this.orbitTheta += Math.PI; this._spawn(); }
    }

    // Flying rock
    if (this.flying) {
      const f = this.flying;
      const step = (FLY_SPEED * (0.6 + 0.4 * this.Rmass) * dt) / 4;
      for (let s = 0; s < 4; s++) {
        f.mesh.position.addScaledVector(f.dir, step);
        f.mesh.rotation.x += dt * 2;
        const hit = this._hitTest(f.mesh.position, f.r);
        if (hit || f.mesh.position.length() < 0.05) {
          if (hit) {
            const n = f.mesh.position.clone().sub(hit.c);
            if (n.lengthSq() < 1e-6) n.copy(f.dir).negate();
            f.mesh.position.copy(hit.c).addScaledVector(n.normalize(), hit.rr);
          }
          this._land(f);
          break;
        }
      }
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
        this.sweet.position.copy(dir).multiplyScalar(-this.Rvis * 1.08);
        this.sweet.scale.setScalar(this.Rvis * 0.6 * (2 - pulse));
        this.sweet.material.opacity = (q > 0.08 ? 0.95 : 0.7) * (playing ? 1 : 0);
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
    this.atmoMat.opacity += ((stage >= 1 ? 0.6 : 0) - this.atmoMat.opacity) * Math.min(1, dt * 2);
    this.ring.scale.setScalar(Math.max(this.Rmass * 1.2, this.Rvis * 0.85));
    this.ringMat.opacity += ((stage >= 2 ? 0.55 : 0) - this.ringMat.opacity) * Math.min(1, dt * 2);
    this.ring.rotation.z += dt * 0.05;
    this.moon.visible = stage >= 3 && this.state !== 'over';
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
