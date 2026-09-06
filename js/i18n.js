// Minimal i18n: ca / es / en. Auto-detects from navigator.language, persisted by the user.

export const LANGS = ['ca', 'es', 'en'];

const STRINGS = {
  ca: {
    tagline: 'Llança roques. Fes créixer el teu planeta. No el deixis bolcar.',
    play: 'JUGA',
    daily: 'REPTE DIARI',
    themes: 'Temes',
    stats: 'Estadístiques',
    best: 'Rècord',
    hint: 'Toca quan la roca passi pel punt verd (l\'oposat del costat pesant)',
    howto: 'Cada roca s\'enganxa on cau i desplaça el pes. Si el costat vermell creix massa, el planeta es trenca.',
    gameover: 'El planeta s\'ha trencat',
    newrecord: '🏆 NOU RÈCORD!',
    rocks: 'roques',
    sizeLabel: 'Diàmetre',
    perfects: 'Perfectes',
    maxcombo: 'Combo màx.',
    balance: 'Equilibri',
    share: '📤 COMPARTEIX',
    retry: 'TORNA-HI',
    saveimage: 'Imatge',
    home: 'Menú',
    back: 'Enrere',
    perfect: 'Perfecte',
    copied: 'Copiat al porta-retalls!',
    dailyDone: 'Fet avui: {score} · torna en {time}',
    dailyOneShot: 'Un sol intent · Dia #{day}',
    dailyTitle: 'Repte diari #{day}',
    dailyStreak: '🔥 Ratxa: {streak} dies',
    challengeBanner: '🎯 Algú et repta: supera <b>{score}</b> roques!',
    challengeBeaten: '🏆 Repte superat!',
    targetHud: '🎯 Objectiu {score}',
    unlockedAt: 'Desbloqueja a {n}',
    unlocked: 'Tema desbloquejat: {name}!',
    statGames: 'Partides',
    statBest: 'Rècord',
    statBlocks: 'Roques totals',
    statPerfect: 'Precisió',
    statDailyBest: 'Millor diari',
    statStreak: 'Ratxa diària',
    statBiggest: 'Planeta més gran',
    shareEndless: '🪐 El meu planeta ha arribat a {km} km amb {score} roques a PLANETA. Pots fer-lo més gran?',
    shareDaily: '🪐 PLANETA #{day} · {score} roques · {km} km',
    shareFooter: '⭐ {perfects} perfectes · 🔥 combo ×{combo}',
    imageSaved: 'Imatge desada',
    milestone: '{n} ROQUES!',
    stage1: 'Asteroide', stage2: 'Planetoide', stage3: 'Planeta', stage4: 'Gegant',
    stageUnlock1: '☁️ Atmosfera!', stageUnlock2: '💫 Anells!', stageUnlock3: '🌙 Lluna!',
    tapHint: 'Toca per llançar',
  },
  es: {
    tagline: 'Lanza rocas. Haz crecer tu planeta. No dejes que vuelque.',
    play: 'JUGAR',
    daily: 'RETO DIARIO',
    themes: 'Temas',
    stats: 'Estadísticas',
    best: 'Récord',
    hint: 'Toca cuando la roca pase por el punto verde (el opuesto al lado pesado)',
    howto: 'Cada roca se pega donde cae y desplaza el peso. Si el lado rojo crece demasiado, el planeta se rompe.',
    gameover: 'El planeta se ha roto',
    newrecord: '🏆 ¡NUEVO RÉCORD!',
    rocks: 'rocas',
    sizeLabel: 'Diámetro',
    perfects: 'Perfectos',
    maxcombo: 'Combo máx.',
    balance: 'Equilibrio',
    share: '📤 COMPARTIR',
    retry: 'OTRA VEZ',
    saveimage: 'Imagen',
    home: 'Menú',
    back: 'Atrás',
    perfect: 'Perfecto',
    copied: '¡Copiado al portapapeles!',
    dailyDone: 'Hecho hoy: {score} · vuelve en {time}',
    dailyOneShot: 'Un solo intento · Día #{day}',
    dailyTitle: 'Reto diario #{day}',
    dailyStreak: '🔥 Racha: {streak} días',
    challengeBanner: '🎯 Alguien te reta: ¡supera <b>{score}</b> rocas!',
    challengeBeaten: '🏆 ¡Reto superado!',
    targetHud: '🎯 Objetivo {score}',
    unlockedAt: 'Desbloquea a {n}',
    unlocked: '¡Tema desbloqueado: {name}!',
    statGames: 'Partidas',
    statBest: 'Récord',
    statBlocks: 'Rocas totales',
    statPerfect: 'Precisión',
    statDailyBest: 'Mejor diario',
    statStreak: 'Racha diaria',
    statBiggest: 'Planeta más grande',
    shareEndless: '🪐 Mi planeta ha llegado a {km} km con {score} rocas en PLANETA. ¿Puedes hacerlo más grande?',
    shareDaily: '🪐 PLANETA #{day} · {score} rocas · {km} km',
    shareFooter: '⭐ {perfects} perfectos · 🔥 combo ×{combo}',
    imageSaved: 'Imagen guardada',
    milestone: '¡{n} ROCAS!',
    stage1: 'Asteroide', stage2: 'Planetoide', stage3: 'Planeta', stage4: 'Gigante',
    stageUnlock1: '☁️ ¡Atmósfera!', stageUnlock2: '💫 ¡Anillos!', stageUnlock3: '🌙 ¡Luna!',
    tapHint: 'Toca para lanzar',
  },
  en: {
    tagline: 'Throw rocks. Grow your planet. Don\'t let it tip over.',
    play: 'PLAY',
    daily: 'DAILY CHALLENGE',
    themes: 'Themes',
    stats: 'Stats',
    best: 'Best',
    hint: 'Tap when the rock passes the green spot (opposite the heavy side)',
    howto: 'Every rock sticks where it lands and shifts the weight. Let the red side grow too much and the planet breaks.',
    gameover: 'Your planet broke apart',
    newrecord: '🏆 NEW RECORD!',
    rocks: 'rocks',
    sizeLabel: 'Diameter',
    perfects: 'Perfects',
    maxcombo: 'Max combo',
    balance: 'Balance',
    share: '📤 SHARE',
    retry: 'RETRY',
    saveimage: 'Image',
    home: 'Menu',
    back: 'Back',
    perfect: 'Perfect',
    copied: 'Copied to clipboard!',
    dailyDone: 'Done today: {score} · back in {time}',
    dailyOneShot: 'One attempt · Day #{day}',
    dailyTitle: 'Daily challenge #{day}',
    dailyStreak: '🔥 Streak: {streak} days',
    challengeBanner: '🎯 Someone challenged you: beat <b>{score}</b> rocks!',
    challengeBeaten: '🏆 Challenge beaten!',
    targetHud: '🎯 Target {score}',
    unlockedAt: 'Unlock at {n}',
    unlocked: 'Theme unlocked: {name}!',
    statGames: 'Games',
    statBest: 'Best',
    statBlocks: 'Total rocks',
    statPerfect: 'Accuracy',
    statDailyBest: 'Best daily',
    statStreak: 'Daily streak',
    statBiggest: 'Biggest planet',
    shareEndless: '🪐 My planet reached {km} km with {score} rocks in PLANETA. Can you grow a bigger one?',
    shareDaily: '🪐 PLANETA #{day} · {score} rocks · {km} km',
    shareFooter: '⭐ {perfects} perfects · 🔥 combo ×{combo}',
    imageSaved: 'Image saved',
    milestone: '{n} ROCKS!',
    stage1: 'Asteroid', stage2: 'Planetoid', stage3: 'Planet', stage4: 'Giant',
    stageUnlock1: '☁️ Atmosphere!', stageUnlock2: '💫 Rings!', stageUnlock3: '🌙 Moon!',
    tapHint: 'Tap to launch',
  },
};

let current = 'ca';

export function detectLang() {
  const nav = (navigator.language || 'ca').toLowerCase();
  if (nav.startsWith('ca')) return 'ca';
  if (nav.startsWith('es')) return 'es';
  return 'en';
}

export function setLang(lang) {
  current = LANGS.includes(lang) ? lang : 'ca';
  document.documentElement.lang = current;
  applyDom();
}

export function getLang() { return current; }

export function t(key, vars = {}) {
  const table = STRINGS[current] || STRINGS.ca;
  let s = table[key] ?? STRINGS.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function fmtKm(km) {
  return new Intl.NumberFormat(current === 'en' ? 'en-US' : 'ca-ES').format(km);
}

export function applyDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
}
