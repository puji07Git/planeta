// Tiny synthesised sound engine (no assets). Created lazily on the first user gesture.

const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
  }

  tone({ freq = 440, type = 'sine', dur = 0.2, vol = 0.4, attack = 0.005, slide = 0, delay = 0 }) {
    if (!this.ensure() || this.muted) return;
    const c = this.ctx;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  noise({ dur = 0.12, vol = 0.25, cutoff = 900, delay = 0, type = 'lowpass' }) {
    if (!this.ensure() || this.muted) return;
    const c = this.ctx;
    const t0 = c.currentTime + delay;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
  }

  // --- Game events ---
  whoosh() {
    this.noise({ dur: 0.18, vol: 0.18, cutoff: 2400, type: 'bandpass' });
  }

  place(quality = 1) {
    this.noise({ dur: 0.1, vol: 0.25, cutoff: 600 });
    this.tone({ freq: 120 + 90 * quality, type: 'triangle', dur: 0.14, vol: 0.28 });
  }

  perfect(combo = 1) {
    const idx = Math.min(PENTA.length - 1, combo - 1);
    const base = 392;
    const freq = base * Math.pow(2, PENTA[idx] / 12);
    this.tone({ freq, type: 'sine', dur: 0.32, vol: 0.35 });
    this.tone({ freq: freq * 2, type: 'sine', dur: 0.2, vol: 0.12 });
    this.noise({ dur: 0.05, vol: 0.12, cutoff: 3000 });
  }

  crack() {
    this.tone({ freq: 90, type: 'sawtooth', dur: 0.9, vol: 0.35, slide: -60 });
    this.noise({ dur: 0.5, vol: 0.4, cutoff: 500 });
    this.noise({ dur: 0.9, vol: 0.25, cutoff: 200, delay: 0.1 });
  }

  milestone(big = false) {
    const notes = big ? [523, 659, 784, 1047, 1319] : [523, 659, 784];
    notes.forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.35, vol: 0.3, delay: i * 0.07 }));
  }

  challengeBeaten() {
    [659, 784, 988, 1319].forEach((f, i) => this.tone({ freq: f, type: 'square', dur: 0.25, vol: 0.18, delay: i * 0.09 }));
  }

  click() {
    this.tone({ freq: 880, type: 'sine', dur: 0.06, vol: 0.15 });
  }

  // --- Journey ---
  encounterJingle(level = 1) {
    const notes = level > 1 ? [392, 523, 659, 784] : [392, 523, 659];
    notes.forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.22, delay: i * 0.08 }));
    this.noise({ dur: 0.4, vol: 0.08, cutoff: 1200, type: 'bandpass' });
  }
  cardsOpen() { [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, type: 'sine', dur: 0.4, vol: 0.2, delay: i * 0.1 })); }
  cardPick() { this.tone({ freq: 660, type: 'triangle', dur: 0.18, vol: 0.25 }); this.tone({ freq: 990, type: 'triangle', dur: 0.25, vol: 0.18, delay: 0.09 }); }
  bounce() { this.tone({ freq: 1320, type: 'sine', dur: 0.25, vol: 0.25 }); this.tone({ freq: 1980, type: 'sine', dur: 0.35, vol: 0.12, delay: 0.02 }); }
  smash() { this.noise({ dur: 0.25, vol: 0.35, cutoff: 700 }); this.tone({ freq: 160, type: 'square', dur: 0.2, vol: 0.2, slide: -80 }); }
  boom() { this.noise({ dur: 0.5, vol: 0.5, cutoff: 400 }); this.tone({ freq: 70, type: 'sawtooth', dur: 0.5, vol: 0.35, slide: -40 }); }
  wind() { this.noise({ dur: 0.6, vol: 0.3, cutoff: 1800, type: 'bandpass' }); }
  rescue() { [784, 988, 1175, 1568].forEach((f, i) => this.tone({ freq: f, type: 'sine', dur: 0.3, vol: 0.22, delay: i * 0.07 })); }
  special(kind) {
    if (kind === 'gold') this.tone({ freq: 1568, type: 'sine', dur: 0.3, vol: 0.18 });
    else if (kind === 'heavy') this.tone({ freq: 110, type: 'square', dur: 0.2, vol: 0.18 });
    else if (kind === 'ice') this.tone({ freq: 1200, type: 'triangle', dur: 0.2, vol: 0.14, slide: 600 });
    else if (kind === 'boom') this.tone({ freq: 220, type: 'sawtooth', dur: 0.15, vol: 0.16, slide: 120 });
    else if (kind === 'comet') this.tone({ freq: 1800, type: 'sine', dur: 0.5, vol: 0.18, slide: -900 });
  }

  // Looping ambient layer for an encounter; returns a handle with stop().
  ambient(id) {
    if (!this.ensure()) return null;
    const c = this.ctx, t0 = c.currentTime;
    const out = c.createGain(); out.gain.setValueAtTime(0, t0); out.gain.linearRampToValueAtTime(1, t0 + 1.5);
    out.connect(this.master);
    const nodes = [];
    const osc = (type, freq, vol, detune = 0) => { const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = freq; o.detune.value = detune; g.gain.value = vol; o.connect(g).connect(out); o.start(); nodes.push(o); return { o, g }; };
    const lfo = (target, freq, depth) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = freq; g.gain.value = depth; o.connect(g).connect(target); o.start(); nodes.push(o); };
    const noiseLoop = (cutoff, vol, type = 'bandpass', q = 1) => {
      const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = cutoff; f.Q.value = q;
      const g = c.createGain(); g.gain.value = vol; src.connect(f).connect(g).connect(out); src.start(); nodes.push(src); return { src, f, g };
    };
    switch (id) {
      case 'moon': { const a = osc('sine', 82, 0.09); lfo(a.g.gain, 0.25, 0.05); osc('sine', 164, 0.03); break; }
      case 'blackhole': { const a = osc('sawtooth', 46, 0.05); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 140; a.g.disconnect(); a.g.connect(f).connect(out); lfo(f.frequency, 0.15, 60); noiseLoop(120, 0.05, 'lowpass'); break; }
      case 'planetx': { const a = osc('square', 110, 0.03); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; a.g.disconnect(); a.g.connect(f).connect(out); lfo(a.g.gain, 0.9, 0.02); break; }
      case 'star': { osc('triangle', 880, 0.025); osc('triangle', 883, 0.025); osc('sine', 1760, 0.012, 5); const n = noiseLoop(2200, 0.03, 'bandpass', 2); lfo(n.g.gain, 0.2, 0.025); break; }
      case 'nebula': { const n = noiseLoop(500, 0.07, 'bandpass', 1.5); lfo(n.f.frequency, 0.08, 350); break; }
      case 'ring': { osc('sine', 660, 0.02); osc('sine', 990, 0.012); lfo(out.gain, 0.5, 0.15); break; }
      case 'belt': { const n = noiseLoop(900, 0.03, 'bandpass', 4); lfo(n.g.gain, 3.1, 0.03); break; }
      case 'shower': { const n = noiseLoop(3200, 0.03, 'highpass'); lfo(n.g.gain, 5.3, 0.03); break; }
      case 'comet': { const a = osc('sine', 1200, 0.02); lfo(a.o.frequency, 0.3, 400); break; }
      default: break;
    }
    return { stop: () => { const t = c.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + 1.2); setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch { /* ignore */ } }); out.disconnect(); }, 1400); } };
  }
}

let gestured = false;
['pointerdown', 'keydown', 'touchstart'].forEach((n) =>
  window.addEventListener(n, () => { gestured = true; }, { once: true, passive: true }));

export function haptic(pattern) {
  if (!gestured) return;
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch { /* ignore */ }
}
