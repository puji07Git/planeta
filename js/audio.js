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
}

let gestured = false;
['pointerdown', 'keydown', 'touchstart'].forEach((n) =>
  window.addEventListener(n, () => { gestured = true; }, { once: true, passive: true }));

export function haptic(pattern) {
  if (!gestured) return;
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch { /* ignore */ }
}
