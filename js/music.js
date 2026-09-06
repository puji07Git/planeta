// Generative ambient score (no audio files): slow organ-like chords that breathe through a
// filter and a long reverb, a sub bass, and sparse bells. The mood follows the journey: every
// encounter changes the chords, the brightness and the pace instead of adding a separate loop.
const N = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
const hz = (semi, octave) => 440 * Math.pow(2, (semi - 9) / 12 + (octave - 4));

// Chords as [root semitone, intervals]; progressions loop.
const MOODS = {
  menu:      { chords: [['A', [0, 3, 7, 12]], ['F', [0, 4, 7, 11]], ['C', [0, 4, 7, 12]], ['G', [0, 4, 7, 14]]], every: 9, cutoff: 1400, bells: 6, sub: 0.18, bright: 0.5 },
  calm:      { chords: [['A', [0, 3, 7, 12]], ['F', [0, 4, 7, 11]], ['C', [0, 4, 7, 12]], ['E', [0, 3, 7, 10]]], every: 9, cutoff: 1500, bells: 5, sub: 0.2, bright: 0.55 },
  moon:      { chords: [['A', [0, 3, 7, 14]], ['D', [0, 3, 7, 12]], ['F', [0, 4, 7, 11]], ['E', [0, 3, 7, 12]]], every: 11, cutoff: 900, bells: 7, sub: 0.2, bright: 0.35 },
  planetx:   { chords: [['D', [0, 3, 7, 10]], ['Bb', [0, 4, 7, 11]], ['F', [0, 4, 7, 12]], ['C', [0, 4, 7, 10]]], every: 9, cutoff: 1100, bells: 8, sub: 0.25, bright: 0.4 },
  star:      { chords: [['C', [0, 4, 7, 12]], ['G', [0, 4, 7, 14]], ['A', [0, 3, 7, 12]], ['F', [0, 4, 7, 12]]], every: 7, cutoff: 3200, bells: 3, sub: 0.15, bright: 0.9 },
  ring:      { chords: [['E', [0, 3, 7, 12]], ['C', [0, 4, 7, 11]], ['G', [0, 4, 7, 12]], ['D', [0, 4, 7, 14]]], every: 8, cutoff: 2000, bells: 2.5, sub: 0.15, bright: 0.7 },
  comet:     { chords: [['C', [0, 4, 7, 12]], ['D', [0, 4, 7, 12]], ['A', [0, 3, 7, 12]], ['G', [0, 4, 7, 12]]], every: 6, cutoff: 2600, bells: 2, sub: 0.15, bright: 0.85 },
  shower:    { chords: [['A', [0, 3, 7, 12]], ['F', [0, 4, 7, 12]], ['G', [0, 4, 7, 12]], ['E', [0, 3, 7, 10]]], every: 7, cutoff: 1600, bells: 1.5, sub: 0.2, bright: 0.6 },
  nebula:    { chords: [['A', [0, 3, 7, 12]], ['D', [0, 3, 7, 10]]], every: 14, cutoff: 420, bells: 12, sub: 0.22, bright: 0.2 },
  belt:      { chords: [['A', [0, 3, 7, 12]], ['G', [0, 3, 7, 12]], ['F', [0, 4, 7, 12]], ['E', [0, 4, 7, 12]]], every: 8, cutoff: 1300, bells: 4, sub: 0.25, bright: 0.5, tremolo: 2.2 },
  blackhole: { chords: [['A', [0, 3, 7, 12]], ['Bb', [0, 4, 7, 11]], ['A', [0, 1, 7, 12]], ['F', [0, 3, 7, 10]]], every: 14, cutoff: 520, bells: 16, sub: 0.4, bright: 0.15 },
  over:      { chords: [['A', [0, 3, 7, 12]], ['F', [0, 4, 7, 11]]], every: 12, cutoff: 700, bells: 20, sub: 0.15, bright: 0.25 },
};
const PRIORITY = ['blackhole', 'nebula', 'star', 'planetx', 'moon', 'belt', 'ring', 'comet', 'shower'];

export class Music {
  constructor(audio) {
    this.audio = audio;
    this.ctx = null;
    this.mood = 'menu';
    this.running = false;
    this.voices = [];
    this.chordIdx = 0;
    this.timer = 0;
    this.bellTimer = 0;
  }

  _init() {
    if (this.ctx) return true;
    if (!this.audio.ensure()) return false;
    const c = this.ctx = this.audio.ctx;
    this.out = c.createGain(); this.out.gain.value = 0;
    this.out.connect(this.audio.master);
    // Filter → dry + reverb → out.
    this.filter = c.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 1400; this.filter.Q.value = 0.7;
    this.dry = c.createGain(); this.dry.gain.value = 0.55;
    this.wet = c.createGain(); this.wet.gain.value = 0.7;
    this.reverb = c.createConvolver(); this.reverb.buffer = this._impulse(4.5, 2.2);
    this.filter.connect(this.dry).connect(this.out);
    this.filter.connect(this.reverb).connect(this.wet).connect(this.out);
    // Slow breathing on the filter.
    this.lfo = c.createOscillator(); this.lfo.frequency.value = 0.06;
    this.lfoGain = c.createGain(); this.lfoGain.value = 0;
    this.lfo.connect(this.lfoGain).connect(this.filter.frequency); this.lfo.start();
    // Optional tremolo (asteroid belt).
    this.trem = c.createOscillator(); this.trem.frequency.value = 2; this.tremGain = c.createGain(); this.tremGain.gain.value = 0;
    this.tremDepth = c.createGain(); this.tremDepth.gain.value = 0;
    this.trem.connect(this.tremDepth).connect(this.out.gain); this.trem.start();
    // Sub bass.
    this.sub = c.createOscillator(); this.sub.type = 'sine'; this.subGain = c.createGain(); this.subGain.gain.value = 0;
    this.sub.connect(this.subGain).connect(this.out); this.sub.start();
    return true;
  }

  _impulse(seconds, decay) {
    const c = this.ctx, len = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  start() {
    if (!this._init()) return;
    if (this.running) return;
    this.running = true;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t); this.out.gain.setValueAtTime(this.out.gain.value, t); this.out.gain.linearRampToValueAtTime(0.42, t + 3);
    this.chordIdx = -1;
    this._nextChord();
    this.timer = setInterval(() => this._tick(), 250);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    clearInterval(this.timer);
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t); this.out.gain.setValueAtTime(this.out.gain.value, t); this.out.gain.linearRampToValueAtTime(0, t + 2.5);
    for (const v of this.voices) this._release(v, 2.5);
    this.voices = [];
  }

  // Pick the mood from the live encounters (or 'menu' / 'calm' / 'over').
  setScene(scene, encounterIds = []) {
    let mood = scene;
    if (scene === 'play') mood = PRIORITY.find((id) => encounterIds.includes(id)) || 'calm';
    if (mood === this.mood) return;
    this.mood = mood;
    if (!this.running) return;
    this.chordIdx = -1;
    this._nextChord(true);
  }

  _tick() {
    if (!this.running) return;
    const m = MOODS[this.mood] || MOODS.calm;
    const now = this.ctx.currentTime;
    if (now >= this.nextChordAt) this._nextChord();
    if (now >= this.nextBellAt) { this._bell(); this.nextBellAt = now + m.bells * (0.5 + Math.random()); }
  }

  _nextChord(sudden = false) {
    const m = MOODS[this.mood] || MOODS.calm;
    const c = this.ctx, t = c.currentTime;
    this.chordIdx = (this.chordIdx + 1) % m.chords.length;
    const [rootName, ivs] = m.chords[this.chordIdx];
    const root = N[rootName];
    this.chord = ivs.map((iv) => root + iv);
    // Release the old voices slowly; start new ones with a long attack so chords overlap.
    for (const v of this.voices) this._release(v, sudden ? 1.5 : 4);
    this.voices = [];
    const octave = m.bright > 0.7 ? 3 : 2;
    ivs.forEach((iv, i) => {
      const f = hz(root + iv, octave + (i === 3 ? 1 : 0));
      this.voices.push(this._voice(f, m, sudden ? 1.2 : 3.5, i));
    });
    // Sub bass follows the root.
    this.sub.frequency.setTargetAtTime(hz(root, 1), t, 0.5);
    this.subGain.gain.setTargetAtTime(m.sub, t, 1.5);
    // Colour.
    this.filter.frequency.setTargetAtTime(m.cutoff, t, sudden ? 1 : 3);
    this.lfoGain.gain.setTargetAtTime(m.cutoff * 0.35, t, 2);
    this.tremDepth.gain.setTargetAtTime(m.tremolo ? 0.12 : 0, t, 1);
    if (m.tremolo) this.trem.frequency.setTargetAtTime(m.tremolo, t, 0.5);
    this.nextChordAt = t + m.every * (0.85 + Math.random() * 0.3);
    if (!this.nextBellAt) this.nextBellAt = t + 2;
  }

  _voice(freq, m, attack, i) {
    const c = this.ctx, t = c.currentTime;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11, t + attack);
    const oscs = [];
    for (const [type, det, vol] of [['sawtooth', -6, 0.35], ['sawtooth', 6, 0.35], ['triangle', 0, 0.8], ['sine', 0, 0.5]]) {
      const o = c.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = det + (i - 1.5) * 2;
      const og = c.createGain(); og.gain.value = vol;
      o.connect(og).connect(g); o.start(); oscs.push(o);
    }
    g.connect(this.filter);
    return { g, oscs };
  }

  _release(v, seconds) {
    const t = this.ctx.currentTime;
    v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.linearRampToValueAtTime(0, t + seconds);
    setTimeout(() => { for (const o of v.oscs) { try { o.stop(); } catch { /* ignore */ } } v.g.disconnect(); }, seconds * 1000 + 100);
  }

  _bell() {
    if (!this.chord) return;
    const m = MOODS[this.mood] || MOODS.calm;
    const c = this.ctx, t = c.currentTime;
    const semi = this.chord[Math.floor(Math.random() * this.chord.length)];
    const f = hz(semi, m.bright > 0.6 ? 5 : 4);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.01;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07 * (0.5 + m.bright), t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
    const g2 = c.createGain(); g2.gain.value = 0.25;
    o.connect(g); o2.connect(g2).connect(g); g.connect(this.reverb);
    o.start(); o2.start(); o.stop(t + 3.6); o2.stop(t + 3.6);
  }
}
