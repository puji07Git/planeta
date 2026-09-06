// Visual palettes for PLANETA. Rock colour is HSL by rock index; the nebula behind is a CSS
// gradient that blends across four growth stages.

export const THEMES = [
  {
    id: 'nebulosa', unlock: 0,
    name: { ca: 'Nebulosa', es: 'Nebulosa', en: 'Nebula' },
    core: '#4a5a7a', atmo: '#5fc8ff', ring: '#e8d9ff', moon: '#d8d8e0',
    hue0: 20, hueStep: 6, sat: 0.55, light: 0.56, wave: 0.1,
    zones: [
      ['#1b1f4a', '#0b0d24'],
      ['#2a1a55', '#0d0a24'],
      ['#0f2a45', '#050b18'],
      ['#3a1030', '#07030f'],
    ],
    accent: '#ff5e7e', accent2: '#ffd166',
  },
  {
    id: 'lava', unlock: 15,
    name: { ca: 'Lava', es: 'Lava', en: 'Lava' },
    core: '#3a0c0c', atmo: '#ff7b00', ring: '#ffb347', moon: '#5a3a2a',
    hue0: 5, hueStep: 3, sat: 0.9, light: 0.5, wave: 0.12,
    zones: [
      ['#2a0808', '#0d0303'],
      ['#3a1000', '#0d0300'],
      ['#160303', '#000000'],
      ['#000000', '#1a0500'],
    ],
    accent: '#ff7b00', accent2: '#ffe600',
  },
  {
    id: 'gel', unlock: 30,
    name: { ca: 'Gel', es: 'Hielo', en: 'Ice' },
    core: '#a9d6f5', atmo: '#bff3ff', ring: '#ffffff', moon: '#e8f4ff',
    hue0: 195, hueStep: 3, sat: 0.45, light: 0.74, wave: 0.08,
    zones: [
      ['#0d2a4a', '#04101f'],
      ['#123a5e', '#061423'],
      ['#0a1e3a', '#02060f'],
      ['#1a2a5a', '#04061a'],
    ],
    accent: '#4cc9f0', accent2: '#ffffff',
  },
  {
    id: 'neo', unlock: 50,
    name: { ca: 'Neó', es: 'Neón', en: 'Neon' },
    core: '#111118', atmo: '#00f5d4', ring: '#f15bb5', moon: '#9b5de5',
    hue0: 290, hueStep: 9, sat: 1.0, light: 0.55, wave: 0.1,
    zones: [
      ['#0a0616', '#000000'],
      ['#12082a', '#000000'],
      ['#001a1a', '#000000'],
      ['#1a0020', '#000000'],
    ],
    accent: '#00f5d4', accent2: '#f15bb5',
  },
  {
    id: 'terra', unlock: 80,
    name: { ca: 'Terra', es: 'Tierra', en: 'Earth' },
    core: '#1f4d8a', atmo: '#7fd0ff', ring: '#d9c9a3', moon: '#cfcfcf',
    hue0: 90, hueStep: 2, sat: 0.5, light: 0.42, wave: 0.12,
    zones: [
      ['#0b1a33', '#030812'],
      ['#142a4a', '#050c1a'],
      ['#0a1f2a', '#02070c'],
      ['#1a1f3d', '#05060f'],
    ],
    accent: '#ff9f1c', accent2: '#ffe66d',
  },
  {
    id: 'or', unlock: 120,
    name: { ca: 'Or', es: 'Oro', en: 'Gold' },
    core: '#3d2b00', atmo: '#ffe08a', ring: '#fff1b8', moon: '#ffd166',
    hue0: 45, hueStep: 1, sat: 0.9, light: 0.55, wave: 0.15,
    zones: [
      ['#1a1200', '#050300'],
      ['#2a1a00', '#080400'],
      ['#141000', '#000000'],
      ['#2a2000', '#0a0600'],
    ],
    accent: '#ffd166', accent2: '#ffffff',
  },
];

export function themeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function rockHSL(theme, i, hueOffset = 0) {
  const h = ((theme.hue0 + hueOffset + i * theme.hueStep) % 360 + 360) % 360;
  const l = Math.min(0.9, Math.max(0.15, theme.light + theme.wave * Math.sin(i * 0.7)));
  return [h, theme.sat, l];
}

export function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// Growth stages by rock count: asteroid → planetoid (atmosphere) → planet (rings) → giant (moon).
export const STAGE_SCORES = [0, 25, 60, 100];

export function stageIndex(score) {
  let i = 0;
  while (i < STAGE_SCORES.length - 1 && score >= STAGE_SCORES[i + 1]) i++;
  return i;
}

export function nebulaFor(theme, score) {
  const z = theme.zones;
  const i = stageIndex(score);
  const from = z[i];
  const to = z[Math.min(i + 1, z.length - 1)];
  const span = (STAGE_SCORES[i + 1] ?? STAGE_SCORES[i] + 1) - STAGE_SCORES[i];
  const t = Math.min(1, Math.max(0, (score - STAGE_SCORES[i]) / span));
  return [mixHex(from[0], to[0], t), mixHex(from[1], to[1], t)];
}
