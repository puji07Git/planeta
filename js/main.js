// PLANETA: UI, modes, sharing and persistence glue.
import { Game } from './game.js';
import { AudioEngine, haptic } from './audio.js';
import { t, setLang, detectLang, getLang, LANGS, fmtKm } from './i18n.js';
import { THEMES, themeById, rockHSL, hslToHex, stageIndex } from './themes.js';
import { store } from './storage.js';
import { rngFromString, todayKey, dayNumber, msUntilTomorrow, formatCountdown } from './rng.js';
import { emojiGrid, shareText, shareFile, renderCard, downloadBlob, baseUrl } from './share.js';
import { ENCOUNTERS, CARDS, NAMES, encounterName, CARD_ROCKS } from './journey.js';
import { Music } from './music.js';

const $ = (id) => document.getElementById(id);
const el = {
  bg: $('bg'), hud: $('hud'), score: $('score'), size: $('size'), combo: $('combo'), target: $('target'),
  gauge: $('gauge'), gaugeFill: $('gauge-fill'), playHint: $('play-hint'),
  menu: $('menu'), gameover: $('gameover'), themes: $('themes'), stats: $('stats'),
  toast: $('toast'), milestone: $('milestone'), challenge: $('challenge'),
  menuBest: $('menu-best'), dailySub: $('daily-sub'), btnDaily: $('btn-daily'),
  goTitle: $('go-title'), goRecord: $('go-record'), goScore: $('go-score'), goKm: $('go-km'),
  goBest: $('go-best'), goPerfects: $('go-perfects'), goCombo: $('go-combo'), goEmoji: $('go-emoji'), goDaily: $('go-daily-info'),
  themeGrid: $('theme-grid'), statsGrid: $('stats-grid'),
  encounter: $('encounter'), rocktag: $('rocktag'), glare: $('glare'), cards: $('cards'), cardsSub: $('cards-sub'), cardsGrid: $('cards-grid'), goJourney: $('go-journey'),
  pause: $('pause'), btnPause: $('btn-pause'), updateDot: $('update-dot'),
  btnMute: $('btn-mute'), btnLang: $('btn-lang'),
};

const audio = new AudioEngine();
audio.muted = !!store.muted;
const music = new Music(audio);
// Music can only start after a user gesture; from then on it follows the scene.
let musicWanted = 'menu';
function musicScene(scene) {
  musicWanted = scene;
  if (!audio.ctx) return;
  music.start();
  music.setScene(scene, game ? game.encounters.filter((v) => !v.pending && v.target === 1).map((v) => v.id) : []);
}
['pointerdown', 'keydown'].forEach((n) => window.addEventListener(n, () => { if (audio.ensure()) musicScene(musicWanted); }, { once: true }));

let theme = themeById(store.theme);
let mode = 'endless';
let lastResult = null;
let challengeTarget = 0;
let challengeBeaten = false;
let comboTimer = 0;
let launches = 0;

setLang(store.lang || detectLang());
el.btnLang.textContent = getLang().toUpperCase();

{
  const p = new URLSearchParams(location.search);
  const beat = parseInt(p.get('beat') || '0', 10);
  if (beat > 0 && beat < 100000) {
    challengeTarget = beat;
    el.challenge.innerHTML = t('challengeBanner', { score: beat });
    el.challenge.classList.remove('hidden');
  }
}

// ---------- Game ----------
const game = new Game($('c'), {
  onSky(colors, stage, stageChanged) {
    el.bg.style.background = `linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 100%)`;
    if (stageChanged && stage > 0 && game.state === 'playing') {
      showMilestone(t(`stageUnlock${stage}`));
      audio.milestone(true);
      haptic([20, 40, 20, 40, 40]);
    }
  },
  onPlace({ score, perfect, combo, q, sizeKm, cracked }) {
    if (score > store.best) store.best = score;
    el.score.textContent = score;
    el.size.textContent = `${fmtKm(sizeKm)} km`;
    el.score.classList.remove('pop'); void el.score.offsetWidth; el.score.classList.add('pop');
    setGauge(q);
    if (cracked) { audio.crack(); haptic([60, 40, 120]); el.playHint.classList.add('hidden'); return; }
    if (arguments[0].frozen) toast(t('iceFrozen'), 1200);
    if (perfect) {
      audio.perfect(combo);
      haptic(combo >= 3 ? [12, 30, 12] : 12);
      el.combo.textContent = combo > 1 ? `${t('perfect')} ×${combo}` : t('perfect');
      el.combo.classList.remove('show'); void el.combo.offsetWidth; el.combo.classList.add('show');
      clearTimeout(comboTimer);
      comboTimer = setTimeout(() => el.combo.classList.remove('show'), 900);
    } else {
      audio.place(1 - q);
      haptic(8);
    }
    if (score % 10 === 0 && stageIndex(score) === stageIndex(score - 1)) {
      audio.milestone(score % 50 === 0);
      showMilestone(t('milestone', { n: score }));
    }
    if (challengeTarget && !challengeBeaten && score > challengeTarget) {
      challengeBeaten = true;
      audio.challengeBeaten();
      haptic([20, 40, 20, 40, 40]);
      toast(t('challengeBeaten'));
      el.target.classList.add('hidden');
    }
  },
  onFail(result) {
    lastResult = result;
    musicScene('over');
    showGameOver(result);
  },
  onSpawn(kind) {
    if (kind === 'normal' || kind === 'wild') { el.rocktag.classList.add('hidden'); return; }
    el.rocktag.textContent = t('rock_' + kind);
    el.rocktag.className = kind;
    const sp = store.special; sp[kind] = (sp[kind] || 0) + 1; store.special = sp;
    el.rocktag.style.animation = 'none'; void el.rocktag.offsetWidth; el.rocktag.style.animation = '';
    audio.special(kind);
    clearTimeout(onSpawnTimer);
    onSpawnTimer = setTimeout(() => el.rocktag.classList.add('hidden'), 4000);
  },
  onApproach(list) {
    renderEncounterBar();
    audio.approach();
  },
  onEncounter(phase, list, index) {
    if (phase === 'start') {
      audio.encounterJingle(Math.max(...list.map((a) => a.level)));
      haptic([15, 30, 15]);
      showMilestone(list.map((a) => `${ENCOUNTERS[a.id].icon} ${t('enc_' + a.id)} ${encounterName(a)}`).join(' + '));
    } else {
      store.encountersDone = store.encountersDone + list.length;
    }
    renderEncounterBar();
    musicScene('play');
  },
  onCards(cards, rocks) {
    audio.cardsOpen();
    haptic([20, 30, 20, 30, 20]);
    el.rocktag.classList.add('hidden');
    renderCards(cards, rocks);
  },
  onCardExpired() { toast(t('cardOver'), 1500); },
  onBoost(id, rocks) {
    audio.cardsOpen(); haptic([20, 30, 20]);
    store.cardsPicked = store.cardsPicked + 1;
    const c = CARDS.find((x) => x.id === id);
    setTimeout(() => showMilestone(t('boostGot', { name: `${c ? c.icon : ''} ${t('card_' + id)}`, n: rocks })), 1500);
  },
  onSector(n) { showMilestone(t('sector', { n })); audio.milestone(true); haptic([20, 40, 20, 40, 40]); },
  onSlide() { audio.bounce(); toast(t('slide'), 900); haptic(15); },
  onCardChosen() { show(null); store.cardsPicked = store.cardsPicked + 1; },
  onWind() { audio.wind(); toast(t('wind'), 900); },
  onGlare() { el.glare.style.opacity = '0.55'; setTimeout(() => { el.glare.style.opacity = '0'; }, 220); },
  onBounce() { audio.bounce(); toast(t('bounce'), 800); haptic(20); },
  onSmash(captured) { audio.smash(); toast(t(captured ? 'captured' : 'smash'), 1000); haptic([30, 30, 30]); },
  onBoom(n) { audio.boom(); haptic([40, 30, 60]); if (n) toast(t('boomHit', { n }), 1200); },
  onRescue() { audio.rescue(); haptic([30, 40, 30, 40, 60]); showMilestone(t('rescue')); },
  onCompress() { toast(t('compress'), 900); },
  onWild() { audio.whoosh(); },
  onWildLand(q) { audio.place(1 - q); setGauge(q); },
  onError(e) { reportError(e); },
});
// Errors are shown on screen (briefly) so they can be reported instead of silently freezing.
let lastErr = '';
function reportError(e) {
  const msg = String(e && (e.stack || e.message || e)).split('\n').slice(0, 2).join(' · ').slice(0, 160);
  if (msg === lastErr) return;
  lastErr = msg;
  toast('⚠️ ' + msg, 6000);
}
window.addEventListener('error', (ev) => reportError(ev.error || ev.message));
window.addEventListener('unhandledrejection', (ev) => reportError(ev.reason));
let onSpawnTimer = 0;
const roman = (n) => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n);

// ---------- Journey UI ----------
function stopAmbients() { /* music follows the scene now */ }

function renderEncounterBar() {
  const live = game.encounters.filter((v) => v.target === 1);
  el.encounter.innerHTML = '';
  for (const v of live) {
    const d = document.createElement('div');
    d.className = 'enc' + (v.pending ? ' near' : '');
    const name = `${t('enc_' + v.id)} ${encounterName(v)}`;
    d.innerHTML = `<span>${ENCOUNTERS[v.id].icon}</span><span>${v.pending ? t('encNear') + ': ' : ''}${name}</span>${v.pending ? '' : `<small>· ${t('enc_' + v.id + '_hint')}</small>`}`;
    el.encounter.appendChild(d);
  }
  el.encounter.classList.toggle('hidden', !live.length);
}

function renderCards(cards, rocks) {
  el.cardsSub.textContent = t('cardsSub', { n: rocks });
  el.cardsGrid.innerHTML = '';
  for (const c of cards) {
    const b = document.createElement('button');
    b.className = 'card-opt';
    b.innerHTML = `<div class="ico">${c.icon}</div><div class="name">${t('card_' + c.id)}</div><div class="pro">✔ ${t('card_' + c.id + '_pro')}</div><div class="con">✖ ${t('card_' + c.id + '_con')}</div>`;
    b.addEventListener('click', () => { audio.cardPick(); haptic(15); game.chooseCard(c.id); });
    el.cardsGrid.appendChild(b);
  }
  show(el.cards);
}
game.setTheme(theme);
applyThemeUi();
game.reset();

// ---------- Screens ----------
function show(screen) {
  [el.menu, el.gameover, el.themes, el.stats, el.cards, el.pause, $('guide')].forEach((s) => s.classList.add('hidden'));
  if (screen) screen.classList.remove('hidden');
  el.hud.classList.toggle('hidden', screen !== null && screen !== el.cards && screen !== el.pause);
  el.btnPause.classList.toggle('hidden', screen !== null);
  $('btn-help').classList.toggle('hidden', screen !== el.menu);
}

function toast(msg, ms = 2200) {
  el.toast.textContent = msg;
  el.toast.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.toast.classList.add('hidden'), ms);
}

function showMilestone(text) {
  const m = el.milestone;
  m.textContent = text;
  m.classList.remove('hidden');
  m.style.animation = 'none'; void m.offsetWidth; m.style.animation = '';
  clearTimeout(showMilestone._t);
  showMilestone._t = setTimeout(() => m.classList.add('hidden'), 1400);
}

function setGauge(q) {
  const pct = Math.round(Math.min(1, q) * 100);
  el.gaugeFill.style.width = pct + '%';
  el.gauge.classList.toggle('warn', q >= 0.55 && q < 0.8);
  el.gauge.classList.toggle('danger', q >= 0.8);
}

function refreshMenu() {
  el.menuBest.textContent = store.best;
  const d = store.daily;
  const today = todayKey();
  if (d.date === today) {
    el.btnDaily.disabled = true;
    el.dailySub.textContent = t('dailyDone', { score: d.score, time: formatCountdown(msUntilTomorrow()) });
  } else {
    el.btnDaily.disabled = false;
    el.dailySub.textContent = t('dailyOneShot', { day: dayNumber() });
  }
}
refreshMenu();
setInterval(refreshMenu, 30000);

// ---------- Start / end ----------
let runStartBest = 0;
function startGame(m) {
  mode = m;
  runStartBest = store.best;
  challengeBeaten = false;
  launches = 0;
  audio.ensure();
  if (mode === 'daily') {
    const seed = 'planeta-' + todayKey();
    const rng = rngFromString(seed);
    game.reset({ rng, hueOffset: Math.floor(rng() * 360), jitter: true });
  } else {
    game.reset();
  }
  el.score.textContent = '0';
  el.size.textContent = `${fmtKm(game.sizeKm)} km`;
  el.combo.classList.remove('show');
  el.encounter.classList.add('hidden'); el.encounter.innerHTML = '';
  el.rocktag.classList.add('hidden');
  stopAmbients();
  setGauge(0);
  el.playHint.textContent = store.games < 3 ? t('hint') : t('tapHint');
  el.playHint.classList.remove('hidden');
  if (mode === 'endless' && challengeTarget) {
    el.target.textContent = t('targetHud', { score: challengeTarget });
    el.target.classList.remove('hidden');
  } else {
    el.target.classList.add('hidden');
  }
  show(null);
  game.start();
  musicScene('play');
}

// ---------- Pause ----------
el.btnPause.addEventListener('click', () => {
  if (game.state !== 'playing') return;
  audio.click();
  game.pause();
  show(el.pause);
  el.btnPause.classList.add('hidden');
});
$('btn-resume').addEventListener('click', () => { audio.click(); game.resume(); show(null); });
$('btn-pause-home').addEventListener('click', () => { audio.click(); goHome(); });

function showGameOver(r) {
  const prevBest = runStartBest;
  const isRecord = r.score > prevBest;
  store.games = store.games + 1;
  store.blocks = store.blocks + r.score;
  store.perfects = store.perfects + r.perfects;
  if (isRecord) store.best = r.score;
  if (r.sizeKm > (store.biggest || 0)) store.biggest = r.sizeKm;

  let dailyInfo = '';
  if (mode === 'daily') {
    const d = store.daily;
    const today = todayKey();
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yesterday = todayKey(y);
    d.streak = d.lastDate === yesterday ? d.streak + 1 : 1;
    d.lastDate = today; d.date = today; d.score = r.score; d.result = r.results;
    d.best = Math.max(d.best || 0, r.score);
    store.daily = d;
    dailyInfo = `${t('dailyTitle', { day: dayNumber() })} · ${t('dailyStreak', { streak: d.streak })}`;
  }

  el.goTitle.textContent = mode === 'daily' ? t('dailyTitle', { day: dayNumber() }) : t('gameover');
  el.goRecord.classList.toggle('hidden', !isRecord);
  el.goScore.textContent = r.score;
  el.goKm.textContent = `${t('sizeLabel')}: ${fmtKm(r.sizeKm)} km · ${t('stage' + (stageIndex(r.score) + 1))}`;
  el.goBest.textContent = store.best;
  el.goPerfects.textContent = r.perfects;
  el.goCombo.textContent = r.maxCombo;
  el.goEmoji.textContent = emojiGrid(r.results);
  {
    const parts = [];
    if (r.encounters) parts.push(`<span>🚀 ${t('encountersSeen')}: ${r.encounters}</span>`);
    for (const id of r.cards || []) { const c = CARDS.find((x) => x.id === id); if (c) parts.push(`<span>${c.icon} ${t('card_' + id)}</span>`); }
    el.goJourney.innerHTML = parts.join('');
    el.goJourney.classList.toggle('hidden', !parts.length);
  }
  el.goDaily.textContent = dailyInfo;
  el.goDaily.classList.toggle('hidden', !dailyInfo);
  show(el.gameover);
  refreshMenu();

  const seen = store.unlockedSeen;
  const fresh = THEMES.filter((th) => store.best >= th.unlock && !seen.includes(th.id));
  if (fresh.length) {
    store.unlockedSeen = seen.concat(fresh.map((f) => f.id));
    setTimeout(() => toast(t('unlocked', { name: fresh[0].name[getLang()] }), 3000), 600);
  }
}

// ---------- Share ----------
function buildShare(r) {
  const grid = emojiGrid(r.results);
  const footer = t('shareFooter', { perfects: r.perfects, combo: r.maxCombo });
  const km = fmtKm(r.sizeKm);
  if (mode === 'daily') {
    const head = t('shareDaily', { day: dayNumber(), score: r.score, km });
    return { text: `${head}\n${grid}\n${footer} · 🔥 ${store.daily.streak}`, url: baseUrl() };
  }
  const head = t('shareEndless', { score: r.score, km });
  return { text: `${head}\n${grid}\n${footer}`, url: `${baseUrl()}?beat=${r.score}` };
}

async function makeCard(r) {
  const stage = stageIndex(r.score);
  const rockColors = Array.from({ length: 12 }, (_, i) => {
    const [h, s, l] = rockHSL(theme, i * 3);
    return hslToHex(h, s, l);
  });
  return renderCard({
    title: 'PLANETA',
    score: r.score,
    label: mode === 'daily' ? t('dailyTitle', { day: dayNumber() }) : `${t('rocks')} · ${t('stage' + (stage + 1))}`,
    subline: `${fmtKm(r.sizeKm)} km`,
    footer: t('shareFooter', { perfects: r.perfects, combo: r.maxCombo }),
    grid: emojiGrid(r.results, { cols: 10, maxRows: 4 }),
    colors: theme.zones[Math.min(stage, 3)],
    rockColors, coreColor: theme.core, atmoColor: theme.atmo, stage,
  });
}

$('btn-share').addEventListener('click', async () => {
  if (!lastResult) return;
  audio.click();
  const { text, url } = buildShare(lastResult);
  try {
    const blob = await makeCard(lastResult);
    const file = new File([blob], 'planeta.png', { type: 'image/png' });
    const r = await shareFile(file, text, url);
    if (r === 'shared' || r === 'cancelled') return;
  } catch { /* fall through */ }
  const res = await shareText(text, url);
  if (res === 'copied') toast(t('copied'));
});

$('btn-image').addEventListener('click', async () => {
  if (!lastResult) return;
  audio.click();
  const blob = await makeCard(lastResult);
  downloadBlob(blob, `planeta-${lastResult.score}.png`);
  toast(t('imageSaved'));
});

// ---------- Buttons ----------
$('btn-play').addEventListener('click', () => { audio.click(); startGame('endless'); });
el.btnDaily.addEventListener('click', () => { if (el.btnDaily.disabled) return; audio.click(); startGame('daily'); });
$('btn-retry').addEventListener('click', () => { audio.click(); startGame(mode === 'daily' && store.daily.date === todayKey() ? 'endless' : mode); });
$('btn-home').addEventListener('click', () => { audio.click(); goHome(); });
$('btn-themes').addEventListener('click', () => { audio.click(); renderThemes(); show(el.themes); });
$('btn-stats').addEventListener('click', () => { audio.click(); renderStats(); show(el.stats); });
$('btn-help').addEventListener('click', () => { if (game.state === 'playing') return; audio.click(); renderGuide(); show($('guide')); });

// Small drawings that match what the game shows (no emoji).
const ROCK_COLORS = { heavy: ['#5a2a2a', '#ff3b3b'], ice: ['#c9f1ff', '#7fe6ff'], gold: ['#ffd24a', '#ffaa00'], boom: ['#2a2a30', '#ff7a1a'], comet: ['#e8fbff', '#ffffff'] };
function rockSvg(kind) {
  const [fill, glow] = ROCK_COLORS[kind];
  return `<svg viewBox="0 0 40 40"><defs><radialGradient id="g${kind}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${glow}" stop-opacity=".8"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient></defs><circle cx="20" cy="20" r="19" fill="url(#g${kind})"/><polygon points="20,7 30,11 33,21 27,31 16,32 9,24 10,13" fill="${fill}" stroke="rgba(255,255,255,.35)" stroke-width="1"/><polygon points="20,7 30,11 22,19 13,15" fill="rgba(255,255,255,.18)"/></svg>`;
}
function encSvg(id) {
  const S = (inner) => `<svg viewBox="0 0 40 40">${inner}</svg>`;
  switch (id) {
    case 'moon': return S('<circle cx="20" cy="20" r="13" fill="#d8d8e0"/><circle cx="14" cy="16" r="3" fill="#b8b8c4"/><circle cx="25" cy="24" r="4" fill="#b8b8c4"/>');
    case 'planetx': return S('<circle cx="20" cy="20" r="16" fill="#ff5a3c" opacity=".25"/><circle cx="20" cy="20" r="12" fill="#d8432f"/><circle cx="15" cy="15" r="4" fill="rgba(255,255,255,.2)"/>');
    case 'star': return S('<circle cx="20" cy="20" r="18" fill="#ffd166" opacity=".35"/><circle cx="20" cy="20" r="11" fill="#fff1b0"/>');
    case 'ring': return S('<circle cx="20" cy="20" r="14" fill="none" stroke="#e8c9a0" stroke-width="4" stroke-dasharray="20 9.3" stroke-linecap="butt"/>');
    case 'icering': return S('<circle cx="20" cy="20" r="14" fill="none" stroke="#bff3ff" stroke-width="4" stroke-dasharray="20 9.3" stroke-linecap="butt"/>');
    case 'belt': return S('<polygon points="6,22 11,14 17,18 14,26" fill="#7a7a88"/><polygon points="18,10 26,8 29,16 21,18" fill="#8a8a98"/><polygon points="24,26 32,24 34,32 26,34" fill="#6f6f7c"/>');
    case 'shower': return S('<line x1="6" y1="8" x2="16" y2="18" stroke="#fff" stroke-width="2"/><line x1="18" y1="4" x2="30" y2="16" stroke="#fff" stroke-width="2"/><line x1="12" y1="24" x2="24" y2="36" stroke="#fff" stroke-width="2"/><circle cx="16" cy="18" r="2.5" fill="#fff"/><circle cx="30" cy="16" r="2.5" fill="#fff"/><circle cx="24" cy="36" r="2.5" fill="#fff"/>');
    case 'comet': return S('<line x1="4" y1="34" x2="26" y2="12" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".35"/><circle cx="28" cy="11" r="6" fill="#e8fbff"/>');
    case 'nebula': return S('<ellipse cx="20" cy="20" rx="18" ry="13" fill="#6b7fb3" opacity=".5"/><ellipse cx="17" cy="21" rx="11" ry="8" fill="#9fb0e0" opacity=".45"/>');
    case 'blackhole': return S('<circle cx="20" cy="20" r="18" fill="#ff7a2a" opacity=".3"/><ellipse cx="20" cy="20" rx="17" ry="6" fill="none" stroke="#ff9a3c" stroke-width="3"/><circle cx="20" cy="20" r="8" fill="#000"/>');
    default: return '';
  }
}

function renderGuide() {
  const body = $('guide-body');
  const lang = getLang();
  const row = (icon, title, text) => `<div class="g"><div class="i">${icon}</div><b>${title}</b><small>${text}</small></div>`;
  let h = `<h3>${t('help')}</h3><div class="g" style="grid-template-columns:1fr"><small>${t('howto1')}</small></div><div class="g" style="grid-template-columns:1fr"><small>${t('howto2')}</small></div><div class="g" style="grid-template-columns:1fr"><small>${t('howto3')}</small></div>`;
  h += `<h3>${t('guideRocks')}</h3>`;
  for (const k of ['heavy', 'ice', 'gold', 'boom', 'comet']) h += row(rockSvg(k), t('rock_' + k).replace(/^\S+\s/, '').split(':')[0], t('g_' + k));
  h += `<h3>${t('guideEnc')}</h3>`;
  for (const id of Object.keys(ENCOUNTERS)) {
    const names = (NAMES[id] || []).map((n) => n.n).join(' · ');
    h += row(encSvg(id), t('enc_' + id), `${t('enc_' + id + '_hint')}<br><span style="opacity:.6">${names}</span>`);
  }
  h += `<h3>${t('guideCards')}</h3>`;
  for (const c of CARDS) h += row(c.icon, t('card_' + c.id), `<span class="pro">${t('card_' + c.id + '_pro')}</span>`);
  body.innerHTML = h;
}
document.querySelectorAll('.btn-back').forEach((b) => b.addEventListener('click', () => { audio.click(); goHome(); }));

function goHome() {
  musicScene('menu');
  game.reset();
  game.idle();
  refreshMenu();
  show(el.menu);
}

el.btnMute.addEventListener('click', () => {
  const m = !audio.muted;
  audio.ensure();
  audio.setMuted(m);
  store.muted = m;
  el.btnMute.textContent = m ? '🔇' : '🔊';
  if (!m) audio.click();
});
el.btnMute.textContent = audio.muted ? '🔇' : '🔊';

el.btnLang.addEventListener('click', () => {
  const i = (LANGS.indexOf(getLang()) + 1) % LANGS.length;
  setLang(LANGS[i]);
  store.lang = LANGS[i];
  el.btnLang.textContent = LANGS[i].toUpperCase();
  if (challengeTarget) el.challenge.innerHTML = t('challengeBanner', { score: challengeTarget });
  refreshMenu();
  audio.click();
});

// ---------- Themes ----------
function applyThemeUi() {
  document.documentElement.style.setProperty('--accent', theme.accent);
  document.documentElement.style.setProperty('--accent2', theme.accent2);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.zones[0][1]);
}

function renderThemes() {
  el.themeGrid.innerHTML = '';
  for (const th of THEMES) {
    const unlocked = store.best >= th.unlock;
    const card = document.createElement('button');
    card.className = 'theme-card' + (th.id === theme.id ? ' active' : '') + (unlocked ? '' : ' locked');
    const sw = document.createElement('div');
    sw.className = 'swatch';
    const core = document.createElement('i');
    core.style.background = th.core; core.style.flex = '1.6';
    sw.appendChild(core);
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('i');
      const [h, sa, l] = rockHSL(th, i * 4);
      s.style.background = hslToHex(h, sa, l);
      sw.appendChild(s);
    }
    card.appendChild(sw);
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = (unlocked ? '' : '🔒 ') + th.name[getLang()];
    card.appendChild(name);
    const req = document.createElement('div');
    req.className = 'req';
    req.textContent = unlocked ? '' : t('unlockedAt', { n: th.unlock });
    card.appendChild(req);
    if (unlocked) {
      card.addEventListener('click', () => {
        theme = th;
        store.theme = th.id;
        game.setTheme(th);
        applyThemeUi();
        audio.click();
        renderThemes();
      });
    }
    el.themeGrid.appendChild(card);
  }
}

// ---------- Stats ----------
function renderStats() {
  const games = store.games, blocks = store.blocks, perf = store.perfects;
  const d = store.daily;
  const sp = store.special;
  const rows = [
    ['statBest', store.best],
    ['statBiggest', `${fmtKm(store.biggest || 0)} km`],
    ['statGames', games],
    ['statBlocks', blocks],
    ['statPerfect', blocks ? Math.round((perf / blocks) * 100) + '%' : '0%'],
    ['statDailyBest', d.best || 0],
    ['statStreak', d.streak || 0],
    ['statHeavy', sp.heavy || 0],
    ['statIce', sp.ice || 0],
    ['statGold', sp.gold || 0],
    ['statBoom', sp.boom || 0],
    ['statEncounters', store.encountersDone],
    ['statCards', store.cardsPicked],
  ];
  el.statsGrid.innerHTML = '';
  for (const [k, v] of rows) {
    const div = document.createElement('div');
    const s = document.createElement('small'); s.textContent = t(k);
    const b = document.createElement('b'); b.textContent = v;
    div.append(s, b);
    el.statsGrid.appendChild(div);
  }
}

// ---------- Input ----------
function isInteractive(target) {
  return target && (target.closest('button') || target.closest('.screen'));
}
function tryLaunch() {
  if (game.launch()) {
    launches++;
    audio.whoosh();
    if (launches >= 2) el.playHint.classList.add('hidden');
  }
}
window.addEventListener('pointerdown', (e) => {
  if (game.state !== 'playing') return;
  if (isInteractive(e.target)) return;
  audio.ensure();
  tryLaunch();
}, { passive: true });

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key;
  const isSpace = e.code === 'Space' || k === ' ' || k === 'Spacebar';
  const isEnter = e.code === 'Enter' || k === 'Enter';
  const isUp = e.code === 'ArrowUp' || k === 'ArrowUp';
  if (!(isSpace || isEnter || isUp)) return;
  if (game.state === 'playing') { e.preventDefault(); tryLaunch(); }
  else if (isSpace && !el.menu.classList.contains('hidden')) { e.preventDefault(); startGame('endless'); }
  else if (isEnter && !el.gameover.classList.contains('hidden')) { e.preventDefault(); $('btn-retry').click(); }
});

document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
document.addEventListener('contextmenu', (e) => { if (game.state === 'playing') e.preventDefault(); });

// ---------- PWA ----------
// PWA + automatic updates: the service worker fetches the new version in the background and the
// page reloads at a quiet moment (never mid-run) once it is installed.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').then((reg) => {
    const check = () => reg.update().catch(() => {});
    setInterval(check, 15 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    const watch = (w) => { if (!w) return; w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) { el.updateDot.classList.remove('hidden'); toast(t('updateReady'), 2500); } }); };
    watch(reg.installing);
    reg.addEventListener('updatefound', () => watch(reg.installing));
  }).catch(() => {}));
  try { if (sessionStorage.getItem('planeta.updated')) { sessionStorage.removeItem('planeta.updated'); setTimeout(() => toast(t('updated'), 2500), 800); } } catch { /* ignore */ }
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing || !navigator.serviceWorker.controller) return;
    refreshing = true;
    const reloadWhenIdle = () => { if (game.state === 'idle' && !el.menu.classList.contains('hidden')) { try { sessionStorage.setItem('planeta.updated', '1'); } catch { /* ignore */ } location.reload(); } else setTimeout(reloadWhenIdle, 2000); };
    reloadWhenIdle();
  });
}

window.PLANETA = { game, store };
show(el.menu);
game.idle();
