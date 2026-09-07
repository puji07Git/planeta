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
    id: 'lava', unlock: 25,
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
    id: 'gel', unlock: 60,
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
    id: 'neo', unlock: 100,
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
    id: 'terra', unlock: 150,
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
    id: 'or', unlock: 250,
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
  {
    id: 'supernova', unlock: 400,
    name: { ca: 'Supernova', es: 'Supernova', en: 'Supernova' },
    core: '#2a0a2a', atmo: '#ff5ee6', ring: '#ffb8f5', moon: '#c9a0ff',
    hue0: 300, hueStep: 4, sat: 0.85, light: 0.6, wave: 0.12,
    zones: [
      ['#2a0a2a', '#0a0010'],
      ['#3a0a3a', '#0a0010'],
      ['#1a0530', '#000000'],
      ['#3a1040', '#08000f'],
    ],
    accent: '#ff5ee6', accent2: '#ffd1f7',
  },
  {
    id: 'galaxia', unlock: 600,
    name: { ca: 'Galàxia', es: 'Galaxia', en: 'Galaxy' },
    core: '#1a2250', atmo: '#fff2c0', ring: '#ffe8a0', moon: '#f0f0ff',
    hue0: 40, hueStep: 7, sat: 0.7, light: 0.66, wave: 0.14,
    zones: [
      ['#0a0f2a', '#000000'],
      ['#101a3a', '#000000'],
      ['#0a1030', '#000000'],
      ['#1a1a40', '#000005'],
    ],
    accent: '#ffe08a', accent2: '#7fb8ff',
  },
  {
    id: 'univers', unlock: 900,
    name: { ca: 'Univers', es: 'Universo', en: 'Universe' },
    core: '#15082a', atmo: '#9b7bff', ring: '#c9b8ff', moon: '#e0d8ff',
    hue0: 260, hueStep: 5, sat: 0.7, light: 0.6, wave: 0.12,
    zones: [
      ['#000006', '#000000'],
      ['#08000f', '#000000'],
      ['#050010', '#000000'],
      ['#0a0018', '#000000'],
    ],
    accent: '#9b7bff', accent2: '#ffffff',
  },
  {
    id: 'aurora', unlock: 0, streak: 7,
    name: { ca: 'Aurora', es: 'Aurora', en: 'Aurora' },
    core: '#0f3a3a', atmo: '#4dffb0', ring: '#b0fff0', moon: '#e0fff8',
    hue0: 150, hueStep: 6, sat: 0.75, light: 0.58, wave: 0.14,
    zones: [
      ['#04202a', '#020a10'],
      ['#063a3a', '#02100f'],
      ['#0a2a3a', '#020810'],
      ['#0a3a2a', '#02100a'],
    ],
    accent: '#4dffb0', accent2: '#7fe6ff',
  },
];

// A theme is available by record, or by daily-challenge streak for the ones that ask for it.
export function themeUnlocked(th, best, streak) {
  return th.streak ? streak >= th.streak : best >= th.unlock;
}

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

// Growth stages by rock count: asteroid → planetoid → planet → giant → star → blue giant →
// supernova → galaxy → universe (→ universe II, III… every 400 rocks).
export const STAGE_SCORES = [0, 25, 60, 100, 150, 250, 400, 600, 900];
export const UNIVERSE_SPAN = 400;

export function stageIndex(score) {
  if (score >= STAGE_SCORES[8]) return 8 + Math.floor((score - STAGE_SCORES[8]) / UNIVERSE_SPAN);
  let i = 0;
  while (i < STAGE_SCORES.length - 1 && score >= STAGE_SCORES[i + 1]) i++;
  return i;
}

export function stageStart(i) { return i < 8 ? STAGE_SCORES[i] : STAGE_SCORES[8] + (i - 8) * UNIVERSE_SPAN; }

// Sky colours beyond the theme's four zones: star, blue giant, supernova, galaxy, universes.
const LATE_ZONES = [
  ['#3a2410', '#0d0703'],
  ['#0f2f5a', '#02091a'],
  ['#3a0a3a', '#0a0010'],
  ['#0a0f2a', '#000000'],
];
const UNIVERSE_ZONES = [
  ['#000006', '#000000'],
  ['#08000f', '#000000'],
  ['#000a08', '#000000'],
  ['#0a0600', '#000000'],
];
export function zoneFor(theme, i) {
  if (i < 4) return theme.zones[i];
  if (i < 8) return LATE_ZONES[i - 4];
  return UNIVERSE_ZONES[(i - 8) % UNIVERSE_ZONES.length];
}

export function nebulaFor(theme, score) {
  const i = stageIndex(score);
  const from = zoneFor(theme, i);
  const to = zoneFor(theme, i + 1);
  const span = stageStart(i + 1) - stageStart(i);
  const t = Math.min(1, Math.max(0, (score - stageStart(i)) / span));
  return [mixHex(from[0], to[0], t), mixHex(from[1], to[1], t)];
}
