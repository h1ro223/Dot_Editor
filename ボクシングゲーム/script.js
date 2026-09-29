/* =========================================================
   KNOCKOUT ROAD ～拳闘伝説～   script.js
   made by hiro/ヒロ   https://github.com/h1ro223
   ---------------------------------------------------------
   01 core / 02 data / 03 draw / 04 fight / 05 train / 06 ui
   ========================================================= */
'use strict';

/* ================= 01. CORE ================= */
const W = 480, H = 560;           // 論理解像度
const OX = 240, OY = 292;         // 相手の基準点（首の付け根）
const PX = 240, PY = H + 22;      // 自分の基準点（背面）
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const chance = p => Math.random() < p;
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeIn = t => t * t;
const easeIO = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const backOut = t => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtMoney = n => Math.floor(n).toLocaleString('ja-JP') + 'G';
const fmtTime = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + String(r).padStart(2, '0'); };
function wpick(obj) {
  let t = 0; for (const k in obj) t += Math.max(0, obj[k]);
  let r = Math.random() * t;
  for (const k in obj) { r -= Math.max(0, obj[k]); if (r <= 0) return k; }
  return Object.keys(obj)[0];
}
function hexA(hex, a) {
  const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
function shade(hex, amt) { // amt -1..1
  const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}

/* ---------- セーブ ---------- */
const SAVE_KEY = 'knockout_road_save_v1';
function newSave() {
  return {
    v: 1, created: false, name: 'ルーキー',
    level: 1, exp: 0, points: 0, money: 500,
    stats: { pow: 3, spd: 3, sta: 3, tgh: 3, tec: 3 },
    statXp: { pow: 0, spd: 0, sta: 0, tgh: 0, tec: 0 },
    progress: 0, week: 1, energy: 3,
    beaten: {}, beatenEx: {}, bestTime: {}, losses: {},
    items: { drink: 2, protein: 0, bar: 0 }, proteinLeft: 0,
    owned: ['g0', 's0', 't0', 'c0'],
    equip: { glove: 'g0', shoe: 's0', trunk: 't0', color: 'c0' },
    record: { w: 0, l: 0, d: 0, ko: 0 },
    st: { punches: 0, landed: 0, counters: 0, stars: 0, kds: 0, downs: 0, fights: 0, trainings: 0, earned: 0, perfect: 0, sGrades: 0, survFights: 0 },
    survivalBest: 0, trainBest: {}, ach: {}, story: {},
    settings: { sfx: true, bgm: true, vol: .7, diff: 'normal', guide: true, pad: 'auto', shake: true, vib: true }
  };
}
function deepMerge(def, src) {
  if (src === undefined || src === null) return def;
  if (Array.isArray(def)) return Array.isArray(src) ? src : def;
  if (def !== null && typeof def === 'object') {
    if (typeof src !== 'object' || Array.isArray(src)) return def;
    const out = {};
    for (const k in def) out[k] = deepMerge(def[k], src[k]);
    for (const k in src) if (!(k in out)) out[k] = src[k];
    return out;
  }
  return typeof src === typeof def ? src : def;
}
let S = newSave();
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) S = deepMerge(newSave(), JSON.parse(raw));
  } catch (e) { S = newSave(); }
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
function hasSave() { try { const r = localStorage.getItem(SAVE_KEY); return !!(r && JSON.parse(r).created); } catch (e) { return false; } }

const vib = ms => { if (S.settings.vib && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { } };

/* ---------- オーディオ（WebAudio 合成） ---------- */
const AU = { ctx: null, master: null, sfxG: null, bgmG: null, noiseBuf: null, song: null, step: 0, next: 0, timer: null };
function auInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended' && !document.hidden) AU.ctx.resume().catch(() => { }); return; }
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    AU.ctx = new C();
    AU.master = AU.ctx.createGain(); AU.master.connect(AU.ctx.destination);
    const comp = AU.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(AU.master);
    AU.sfxG = AU.ctx.createGain(); AU.sfxG.connect(comp);
    AU.bgmG = AU.ctx.createGain(); AU.bgmG.connect(comp);
    const len = AU.ctx.sampleRate * 1.5; AU.noiseBuf = AU.ctx.createBuffer(1, len, AU.ctx.sampleRate);
    const d = AU.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    applyVolume();
    if (!AU.timer) AU.timer = setInterval(bgmTick, 25);
  } catch (e) { AU.ctx = null; }
}
function applyVolume() {
  if (!AU.ctx) return;
  AU.master.gain.value = S.settings.vol;
  AU.sfxG.gain.value = S.settings.sfx ? .9 : 0;
  AU.bgmG.gain.value = S.settings.bgm ? .32 : 0;
}
function tone(f, dur, type = 'square', vol = .25, slide = 0, delay = 0, dest) {
  if (!AU.ctx) return;
  const t = AU.ctx.currentTime + delay, o = AU.ctx.createOscillator(), g = AU.ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(Math.max(20, f), t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g); g.connect(dest || AU.sfxG); o.start(t); o.stop(t + dur + .02);
}
function noise(dur, vol = .3, freq = 1500, ftype = 'lowpass', delay = 0, q = 1, dest) {
  if (!AU.ctx) return;
  const t = AU.ctx.currentTime + delay, s = AU.ctx.createBufferSource(), f = AU.ctx.createBiquadFilter(), g = AU.ctx.createGain();
  s.buffer = AU.noiseBuf; f.type = ftype; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(dest || AU.sfxG); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
}
const SFX = {
  hit() { noise(.14, .7, 900); tone(140, .12, 'sine', .55, -80); },
  hit2() { noise(.12, .6, 1400); tone(190, .1, 'sine', .45, -110); },
  body() { noise(.16, .7, 500); tone(95, .16, 'sine', .6, -40); },
  counter() { noise(.2, .8, 2200); tone(220, .2, 'sawtooth', .3, -160); tone(880, .15, 'square', .12, 400, .02); },
  special() { noise(.4, .9, 700); tone(70, .45, 'sine', .8, -30); tone(440, .3, 'sawtooth', .18, -300); },
  heavy() { noise(.3, .9, 600); tone(60, .35, 'sine', .9, -20); },
  block() { noise(.08, .45, 3200, 'highpass'); tone(320, .06, 'triangle', .2, -80); },
  whoosh() { noise(.18, .35, 1800, 'bandpass', 0, 1.4); },
  miss() { noise(.2, .25, 1200, 'bandpass', 0, 2); },
  bell() { [0, .28, .56].forEach(d => { tone(1320, 1.1, 'sine', .28, 0, d); tone(2640, .6, 'sine', .08, 0, d); tone(1760, .9, 'triangle', .07, 0, d); }); },
  bell1() { tone(1320, 1.3, 'sine', .3); tone(2640, .7, 'sine', .1); tone(1760, 1, 'triangle', .07); },
  beep() { tone(880, .07, 'square', .12); },
  count() { tone(520, .16, 'square', .18); tone(260, .16, 'square', .1); },
  select() { tone(660, .06, 'square', .12); tone(990, .08, 'square', .1, 0, .05); },
  back() { tone(520, .06, 'square', .1); tone(330, .08, 'square', .08, 0, .05); },
  star() { [0, .06, .12].forEach((d, i) => tone(988 * Math.pow(1.26, i), .12, 'triangle', .2, 0, d)); },
  charge() { tone(220, .5, 'sawtooth', .16, 660); noise(.5, .2, 3000, 'highpass'); },
  down() { tone(200, .5, 'sawtooth', .22, -150); noise(.5, .6, 400); },
  ko() { tone(110, .9, 'sawtooth', .3, -80); noise(.8, .8, 300); },
  cheer() { noise(1.6, .28, 1400, 'bandpass', 0, .6); noise(1.2, .18, 2600, 'bandpass', .2, .8); },
  lvup() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .18, 'square', .14, 0, i * .08)); },
  coin() { tone(988, .06, 'square', .14); tone(1319, .18, 'square', .14, 0, .06); },
  error() { tone(160, .18, 'square', .18); tone(120, .2, 'square', .15, 0, .1); },
  step() { noise(.04, .12, 2400, 'highpass'); },
  jump() { tone(300, .1, 'triangle', .14, 300); },
  good() { tone(784, .08, 'square', .14); tone(1175, .12, 'square', .12, 0, .06); },
  perfect() { [784, 988, 1319, 1568].forEach((f, i) => tone(f, .1, 'square', .12, 0, i * .04)); },
  hurt() { tone(160, .2, 'sawtooth', .25, -80); noise(.18, .5, 800); },
  rage() { tone(80, .8, 'sawtooth', .3, 40); noise(.8, .3, 400); },
  win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i === 5 ? .6 : .16, 'square', .15, 0, i * .13)); },
  lose() { [392, 349, 311, 262].forEach((f, i) => tone(f, .3, 'triangle', .2, 0, i * .22)); },
  gong() { tone(90, 2.2, 'sine', .5, -10); tone(135, 1.8, 'sine', .25, -8); noise(1.2, .25, 900); }
};
function sfx(n) { if (!AU.ctx || !S.settings.sfx) return; try { SFX[n] && SFX[n](); } catch (e) { } }

/* ---- BGM シーケンサー（オリジナル曲） ---- */
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function parsePat(str) {
  return str.trim().split(/\s+/).map(tk => {
    if (tk === '.' || tk === '-') return tk;
    const m = tk.match(/^([A-G]#?)(\d)$/); if (!m) return '.';
    return 12 * (+m[2] + 1) + NOTE[m[1]];
  });
}
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const SONGS_SRC = {
  title: {
    bpm: 112, lead: 'square', bass: 'triangle',
    L: `C5 - - G4 C5 - D5 - D#5 - - D5 C5 - A#4 - C5 - - - G4 - - - A#4 - C5 - D5 - - -
        D#5 - - D5 C5 - D5 - G5 - - F5 D#5 - D5 - C5 - - - - - G4 - C5 - - - - - - -
        G#4 - - G4 G#4 - A#4 - C5 - - A#4 G#4 - G4 - A#4 - - G#4 G4 - F4 - G4 - - - - - - -
        C5 - - G4 C5 - D5 - D#5 - - F5 G5 - F5 - D#5 - D5 - C5 - A#4 - C5 - - - - - . .`,
    B: `C3 . C3 . G2 . C3 . C3 . C3 . G2 . A#2 . A#2 . A#2 . F2 . A#2 . A#2 . G2 . A#2 .
        G#2 . G#2 . D#2 . G#2 . G2 . G2 . D2 . G2 . C3 . C3 . G2 . C3 . C3 . G2 . C3 .
        G#2 . G#2 . D#2 . G#2 . A#2 . A#2 . F2 . A#2 . C3 . C3 . G2 . C3 . G2 . G2 . B2 .
        C3 . C3 . G2 . C3 . G#2 . G#2 . D#2 . G#2 . G2 . G2 . D2 . G2 . C3 . G2 . C3 .`,
    D: 'k . h . s . h . k k h . s . h h'
  },
  gym: {
    bpm: 124, lead: 'square', bass: 'sawtooth',
    L: `E5 . G5 . A5 . . G5 E5 . D5 . E5 - - . E5 . G5 . A5 . C6 . B5 . A5 . G5 - - .
        A5 . . A5 G5 . E5 . D5 . E5 . G5 - - . C5 . D5 . E5 . G5 . E5 . D5 . C5 - - .`,
    B: `A2 . A2 A3 . A2 G2 . A2 . A2 A3 . G2 E2 G2 F2 . F2 F3 . F2 E2 . G2 . G2 G3 . G2 A2 B2
        A2 . A2 A3 . A2 G2 . A2 . A2 A3 . G2 E2 G2 F2 . F2 F3 . G2 . G2 C3 . C3 B2 . G2 . A2 .`,
    D: 'k . h k s . h . k . h k s . h h'
  },
  fight: {
    bpm: 150, lead: 'square', bass: 'sawtooth',
    L: `D5 . D5 . F5 . D5 . G5 . F5 . D5 . C5 . D5 . D5 . F5 . A5 . G5 . F5 . D5 - - .
        A#4 . A#4 . D5 . A#4 . C5 . D5 . F5 . E5 . A4 . A4 . C#5 . E5 . A5 - G5 - E5 - C#5 .
        D5 . D5 . F5 . D5 . G5 . F5 . D5 . C5 . D5 . F5 . A5 . D6 . C6 . A5 . G5 - - .
        A#5 . A5 . G5 . F5 . E5 . F5 . G5 . A5 . D5 - - - - - . . A4 . C#5 . E5 . A5 .`,
    B: `D2 D2 D3 D2 D2 D3 D2 D3 D2 D2 D3 D2 C2 C3 C2 C3 D2 D2 D3 D2 D2 D3 D2 D3 D2 D2 D3 D2 C2 C3 C2 C3
        A#1 A#1 A#2 A#1 A#1 A#2 A#1 A#2 C2 C2 C3 C2 C2 C3 C2 C3 A1 A1 A2 A1 A1 A2 A1 A2 A1 A1 A2 A1 C#2 C#3 E2 E3
        D2 D2 D3 D2 D2 D3 D2 D3 D2 D2 D3 D2 C2 C3 C2 C3 D2 D2 D3 D2 D2 D3 D2 D3 F2 F2 F3 F2 G2 G3 G2 G3
        A#1 A#1 A#2 A#1 G1 G1 G2 G1 A1 A1 A2 A1 A1 A2 A1 A2 D2 D2 D3 D2 D2 D3 D2 D3 A1 A1 A2 A1 C#2 C#3 E2 E3`,
    D: 'k . h k s . h . k k h . s . h s'
  },
  boss: {
    bpm: 164, lead: 'sawtooth', bass: 'sawtooth',
    L: `E5 . . E5 . . E5 . F5 . E5 . D#5 . E5 . B4 . . B4 . . B4 . C5 . B4 . A#4 . B4 .
        G5 . . G5 . . F#5 . G5 . A5 . B5 . G5 . F#5 . . F#5 . . E5 . D#5 . F#5 . B5 - - .
        E5 . . E5 . . E5 . F5 . E5 . D#5 . E5 . C6 . . B5 . . A5 . G5 . F#5 . E5 . D#5 .
        E5 . G5 . B5 . E6 . D#6 . B5 . F#5 . D#5 . E5 - - - . . . . B4 . . . E5 . . .`,
    B: `E2 E2 E3 E2 E2 E3 E2 E3 E2 E2 E3 E2 F2 F3 E2 E3 B1 B1 B2 B1 B1 B2 B1 B2 B1 B1 B2 B1 A#1 A#2 B1 B2
        C2 C2 C3 C2 C2 C3 C2 C3 C2 C2 C3 C2 D2 D3 D2 D3 B1 B1 B2 B1 B1 B2 B1 B2 B1 B1 B2 B1 D#2 D#3 F#2 F#3
        E2 E2 E3 E2 E2 E3 E2 E3 E2 E2 E3 E2 F2 F3 E2 E3 A1 A1 A2 A1 A1 A2 A1 A2 B1 B1 B2 B1 B1 B2 B1 B2
        C2 C2 C3 C2 A1 A1 A2 A1 B1 B1 B2 B1 B1 B2 B1 B2 E2 E2 E3 E2 E2 E3 E2 E3 B1 B1 B2 B1 D#2 D#3 F#2 F#3`,
    D: 'k h s h k k s h k h s h k s s s'
  },
  story: {
    bpm: 84, lead: 'triangle', bass: 'triangle',
    L: `E5 - - - D5 - C5 - D5 - - - G4 - - - C5 - - - D5 - E5 - G5 - - - - - - -
        A5 - - - G5 - E5 - D5 - - - C5 - D5 - E5 - - - D5 - C5 - C5 - - - - - - -`,
    B: `C3 . G3 . E3 . G3 . G2 . D3 . B2 . D3 . A2 . E3 . C3 . E3 . F2 . C3 . A2 . G2 .
        F2 . C3 . A2 . C3 . G2 . D3 . B2 . D3 . A2 . E3 . G2 . D3 . C3 . G2 . C3 . . .`,
    D: 'k . . . s . . . k . k . s . . .'
  }
};
const SONGS = {};
for (const k in SONGS_SRC) {
  const s = SONGS_SRC[k]; const L = parsePat(s.L), B = parsePat(s.B), D = s.D.split(/\s+/);
  SONGS[k] = { bpm: s.bpm, lead: s.lead, bass: s.bass, L, B, D, len: Math.max(L.length, B.length) };
}
function bgm(name) {
  if (AU.song === name) return;
  AU.song = name; AU.step = 0;
  if (AU.ctx) AU.next = AU.ctx.currentTime + .08;
}
function holdLen(arr, i) { let n = 1; while (arr[(i + n) % arr.length] === '-' && n < 16) n++; return n; }
function bgmTick() {
  if (!AU.ctx || !AU.song || AU.ctx.state !== 'running') return;
  const sg = SONGS[AU.song]; if (!sg) return;
  const spb = 60 / sg.bpm / 4, now = AU.ctx.currentTime;
  if (AU.next < now - .3) AU.next = now + .05;
  while (AU.next < now + .15) {
    const i = AU.step, t = AU.next - now;
    if (S.settings.bgm) {
      const l = sg.L[i % sg.L.length];
      if (typeof l === 'number') tone(mtof(l), spb * holdLen(sg.L, i % sg.L.length) * .95, sg.lead, .09, 0, t, AU.bgmG);
      const b = sg.B[i % sg.B.length];
      if (typeof b === 'number') tone(mtof(b), spb * .9, sg.bass, .13, 0, t, AU.bgmG);
      const d = sg.D[i % sg.D.length];
      if (d === 'k') { tone(120, .12, 'sine', .45, -70, t, AU.bgmG); }
      else if (d === 's') noise(.1, .22, 1800, 'bandpass', t, .8, AU.bgmG);
      else if (d === 'h') noise(.03, .09, 7000, 'highpass', t, 1, AU.bgmG);
    }
    AU.step = (AU.step + 1) % sg.len; AU.next += spb;
  }
}
document.addEventListener('visibilitychange', () => {
  if (!AU.ctx) return;
  if (document.hidden) AU.ctx.suspend().catch(() => { }); else AU.ctx.resume().catch(() => { });
  if (document.hidden && typeof onHiddenPause === 'function') onHiddenPause();
});

/* ---------- 入力 ---------- */
const KEYMAP = {
  ArrowLeft: 'dL', ArrowRight: 'dR', ArrowDown: 'duck', ArrowUp: 'guard',
  KeyZ: 'lf', KeyX: 'rf', KeyA: 'lb', KeyS: 'rb', Space: 'star',
  KeyJ: 'lf', KeyK: 'rf', KeyN: 'lb', KeyM: 'rb', KeyL: 'star',
  Escape: 'pause', KeyP: 'pause', Enter: 'ok'
};
const IN = { held: {}, q: [] };
function inPress(a) { IN.held[a] = true; IN.q.push(a); if (IN.q.length > 8) IN.q.shift(); }
function inRelease(a) { IN.held[a] = false; }
function inTake() { return IN.q.shift(); }
function inClear() { IN.q.length = 0; for (const k in IN.held) IN.held[k] = false; }
window.addEventListener('keydown', e => {
  auInit();
  const a = KEYMAP[e.code];
  if (!a) return;
  if (e.target && e.target.closest && e.target.closest('input,textarea') && a !== 'ok') return;
  const gameOn = $('#scr-game').classList.contains('on') && !isModal();
  if (gameOn || a === 'pause') e.preventDefault();
  if (e.repeat) return;
  if (a === 'pause') { onPauseKey(); return; }
  if (a === 'ok' && !gameOn) { e.preventDefault(); onOkKey(); return; }
  if (gameOn) inPress(a);
});
window.addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) inRelease(a); });
window.addEventListener('blur', () => inClear());

/* タッチパッド */
const PAD_PTR = {};
function bindPad() {
  $$('#pad .pb').forEach(b => {
    const act = b.dataset.act;
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); auInit();
      try { b.setPointerCapture(e.pointerId); } catch (_) { }
      PAD_PTR[e.pointerId] = { act, b }; b.classList.add('down'); inPress(act); vib(8);
    });
    const up = e => {
      const p = PAD_PTR[e.pointerId]; if (!p) return;
      delete PAD_PTR[e.pointerId]; p.b.classList.remove('down');
      if (!Object.values(PAD_PTR).some(q => q.act === p.act)) inRelease(p.act);
    };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', e => e.preventDefault());
  });
}

/* iOS Safari: 長押し・ダブルタップ・ピンチでのコピー/拡大を防止 */
(function antiZoom() {
  document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
  document.addEventListener('gestureend', e => e.preventDefault(), { passive: false });
  document.addEventListener('contextmenu', e => { if (!e.target.closest('input,textarea')) e.preventDefault(); });
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  document.addEventListener('selectstart', e => { if (!e.target.closest('input,textarea')) e.preventDefault(); });
  let lastTouch = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouch < 320 && !e.target.closest('button,a,input,.pb,[data-cmd]')) e.preventDefault();
    lastTouch = now;
  }, { passive: false });
  document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('touchstart', e => {
    if (e.touches.length > 1) e.preventDefault();
    if (e.target.closest('#scr-game') && !e.target.closest('#btnPause')) e.preventDefault();
  }, { passive: false });
})();

/* ---------- 画面管理 ---------- */
let CUR_SCR = 'scr-title';
function show(id) {
  $$('.scr').forEach(s => s.classList.toggle('on', s.id === id));
  CUR_SCR = id;
  if (id === 'scr-game') { applyPadMode(); requestAnimationFrame(fitCanvas); setTimeout(fitCanvas, 120); }
}
function applyPadMode() {
  const m = S.settings.pad;
  const coarse = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
  const on = m === 'on' || (m === 'auto' && (coarse || 'ontouchstart' in window));
  $('#scr-game').classList.toggle('pad', on);
}

/* ---------- トースト / モーダル ---------- */
function toast(msg, cls = '') {
  const t = document.createElement('div'); t.className = 't ' + cls; t.textContent = msg;
  $('#toast').appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; }, 2300);
  setTimeout(() => t.remove(), 2800);
}
let MODAL_CB = {};
function openModal(html, handlers = {}) {
  $('#mbox').innerHTML = html; MODAL_CB = handlers;
  $('#modal').classList.add('on');
}
function closeModal() { $('#modal').classList.remove('on'); MODAL_CB = {}; }
function isModal() { return $('#modal').classList.contains('on'); }
function confirmBox(title, text, yesLabel, onYes, noLabel = 'やめる', onNo) {
  openModal(`<h3>${esc(title)}</h3><p>${text}</p><div class="btns row">
    <button class="btn ghost" data-mcb="no" type="button">${esc(noLabel)}</button>
    <button class="btn red" data-mcb="yes" type="button">${esc(yesLabel)}</button></div>`,
    { yes: () => { closeModal(); onYes && onYes(); }, no: () => { closeModal(); onNo && onNo(); } });
}
$('#modal').addEventListener('click', e => {
  const b = e.target.closest('[data-mcb]'); if (!b || b.disabled) return;
  auInit(); const f = MODAL_CB[b.dataset.mcb]; if (f) { sfx('select'); f(b.dataset.arg, b); }
});

/* ================= 02. DATA ================= */
/* 相手の攻撃テーブル（side = 画面上でどちら側から来るか） */
const ATK = {};
(function buildAtk() {
  const base = {
    jab:      { wind: .52, dmg: 6,  rec: .62, avoid: ['dL', 'dR', 'duck'], block: .15, intr: true,  label: 'ジャブ' },
    straight: { wind: .30, dmg: 7,  rec: .50, avoid: ['dL', 'dR', 'duck'], block: .2,  intr: false, label: 'ストレート' },
    hook:     { wind: .78, dmg: 10, rec: .90, avoid: null,                 block: .3,  intr: true,  label: 'フック' },
    upper:    { wind: .88, dmg: 14, rec: 1.1, avoid: ['dL', 'dR'],         block: .35, intr: true,  label: 'アッパー' },
    body:     { wind: .58, dmg: 8,  rec: .75, avoid: ['dL', 'dR', 'guard'], block: 0,  intr: true,  label: 'ボディ' },
    hay:      { wind: 1.25, dmg: 22, rec: 1.6, avoid: ['duck'],            block: .5,  intr: false, label: '大振り' }
  };
  const keyName = { jab: 'jab', straight: 'str', hook: 'hook', upper: 'up', body: 'body', hay: 'hay' };
  for (const kind in base) for (const side of ['L', 'R']) {
    const b = base[kind];
    const av = kind === 'hook' ? (side === 'L' ? ['dR', 'duck'] : ['dL', 'duck']) : b.avoid;
    ATK[keyName[kind] + side] = Object.assign({}, b, { kind, side, avoid: av, key: keyName[kind] + side });
  }
})();
const KIND_COLOR = { jab: '#9fd3ff', straight: '#ffffff', hook: '#ffb347', upper: '#ff5a5a', body: '#7dff9a', hay: '#ff3df0' };
const GUIDE_SYM = { dL: '◀', dR: '▶', duck: '▼', guard: '▲' };

const DIFF = {
  easy:   { name: 'EASY',   spd: .85, pow: .65, idle: 1.2 },
  normal: { name: 'NORMAL', spd: 1,   pow: 1,   idle: 1 },
  hard:   { name: 'HARD',   spd: 1.15, pow: 1.3, idle: .85 }
};

/* ---------- 装備 ---------- */
const GEAR = {
  g0: { type: 'glove', name: 'ジム支給グローブ', desc: '使い込まれた練習用。', price: 0, mul: 1.00 },
  g1: { type: 'glove', name: 'レザーグローブ', desc: 'パンチ威力 +6%', price: 1500, mul: 1.06 },
  g2: { type: 'glove', name: 'プロ10オンス', desc: 'パンチ威力 +12%', price: 4000, mul: 1.12 },
  g3: { type: 'glove', name: 'ハードパンチャー', desc: 'パンチ威力 +20%', price: 9000, mul: 1.20 },
  g4: { type: 'glove', name: 'チャンピオンモデル', desc: 'パンチ威力 +30%', price: 20000, mul: 1.30 },
  g5: { type: 'glove', name: '黄金の拳', desc: 'パンチ威力 +42%（ベルト3本で解禁）', price: 45000, mul: 1.42, belts: 3 },
  s0: { type: 'shoe', name: '布シューズ', desc: '普通のシューズ。', price: 0, regen: 1, win: 1 },
  s1: { type: 'shoe', name: 'ライトシューズ', desc: 'スタミナ回復 +15% / 回避時間 +5%', price: 2000, regen: 1.15, win: 1.05 },
  s2: { type: 'shoe', name: 'フェザーステップ', desc: 'スタミナ回復 +30% / 回避時間 +10%', price: 7000, regen: 1.3, win: 1.10 },
  s3: { type: 'shoe', name: '疾風リングシューズ', desc: 'スタミナ回復 +50% / 回避時間 +18%', price: 18000, regen: 1.5, win: 1.18 },
  t0: { type: 'trunk', name: '浪速ブルー', price: 0, c1: '#2f6fe0', c2: '#ffffff' },
  t1: { type: 'trunk', name: '炎のレッド', price: 500, c1: '#d8262c', c2: '#ffd23f' },
  t2: { type: 'trunk', name: 'ブラック&ゴールド', price: 900, c1: '#1b1b22', c2: '#ffc53d' },
  t3: { type: 'trunk', name: '桜ピンク', price: 900, c1: '#ff7eb6', c2: '#ffffff' },
  t4: { type: 'trunk', name: 'ジャングルグリーン', price: 1200, c1: '#1f9a5a', c2: '#ffe066' },
  t5: { type: 'trunk', name: 'ロイヤルパープル', price: 1600, c1: '#6a2bd1', c2: '#e6d3ff' },
  t6: { type: 'trunk', name: '星条ストライプ', price: 2400, c1: '#ffffff', c2: '#d8262c' },
  t7: { type: 'trunk', name: '伝説の金', price: 6000, c1: '#f5b914', c2: '#8a1418' },
  c0: { type: 'color', name: 'レッド', price: 0, c: '#d7262d' },
  c1: { type: 'color', name: 'ブルー', price: 300, c: '#2466d6' },
  c2: { type: 'color', name: 'ブラック', price: 500, c: '#26262e' },
  c3: { type: 'color', name: 'ホワイト', price: 500, c: '#eeeeee' },
  c4: { type: 'color', name: 'グリーン', price: 700, c: '#1c9a52' },
  c5: { type: 'color', name: 'パープル', price: 900, c: '#7a33d6' },
  c6: { type: 'color', name: 'ゴールド', price: 2000, c: '#f2b40c' }
};
const ITEMS = {
  drink: { name: 'スポーツドリンク', desc: 'インターバル中に使用。体力を35%回復。', price: 250, ic: '🥤' },
  protein: { name: 'プロテイン', desc: '使用後3回のトレーニングで能力経験値が2倍。', price: 1200, ic: '🥛' },
  bar: { name: 'エナジーバー', desc: 'トレーニング回数（週の体力）を1回復。', price: 600, ic: '🍫' }
};
const STAT_INFO = {
  pow: { name: 'パワー', sub: 'パンチの威力', col: '#e23b3b' },
  spd: { name: 'スピード', sub: 'パンチの速さ', col: '#3a86ff' },
  sta: { name: 'スタミナ', sub: '最大スタミナ・回復', col: '#34c77b' },
  tgh: { name: 'タフネス', sub: '体力・防御・根性', col: '#ff9f1c' },
  tec: { name: 'テクニック', sub: 'カウンター・スター率', col: '#b47cff' }
};
const STAT_MAX = 30, LV_MAX = 50;
function expNeed(lv) { return 50 + 40 * lv + 3 * lv * lv; }
function beltCount() { return [3, 7, 11, 15].filter(i => i < S.progress).length; }

/* プレイヤー派生値 */
function derived(stats = S.stats, eq = S.equip) {
  const g = GEAR[eq.glove] || GEAR.g0, sh = GEAR[eq.shoe] || GEAR.s0;
  return {
    maxHp: 80 + 6 * stats.tgh,
    maxSta: 40 + 4 * stats.sta,
    staRegen: (4 + .3 * stats.sta) * sh.regen,
    dmgMul: (1 + .04 * (stats.pow - 1)) * g.mul,
    spdMul: Math.max(.6, 1 - .013 * (stats.spd - 1)),
    counterMul: 1.5 + .03 * stats.tec,
    starChance: Math.min(.95, .4 + .02 * stats.tec),
    defMul: Math.max(.7, 1 - .009 * stats.tgh),
    getupBonus: .3 * stats.tgh,
    dodgeWin: sh.win
  };
}

/* ---------- 対戦相手 ---------- */
const CIRCUITS = [
  { name: 'ルーキーリーグ', col: '#4fc3f7', belt: 'ルーキーリーグ王座' },
  { name: 'メジャーサーキット', col: '#2ecc71', belt: 'メジャー王座' },
  { name: 'ワールドサーキット', col: '#e67e22', belt: 'WBAワールド王座' },
  { name: 'レジェンドサーキット', col: '#f1c40f', belt: '拳闘伝説の称号' },
  { name: 'シークレット', col: '#e23b3b', belt: '真の伝説' }
];
const OPP = [
  { id: 'jimmy', name: 'ジミー・スロウ', circuit: 0, from: 'イギリス', age: 38, title: 'のんびり屋のベテラン',
    hp: 90, pow: .5, spd: .72, idle: 1.5, guard: { high: 3, low: 1, full: .5, open: 1.5 }, evade: 0, cob: 0, feint: 0, taunt: .12, combo: 6,
    moves: { jabL: 3, jabR: 3, hookL: 1, hookR: 1 }, combos: [], specials: [], rage: 0, getUp: [3, 6, 10],
    look: { skin: '#f0c7a0', hair: 'bald', hairC: '#8a6a4a', beard: 'mustache', beardC: '#8a6a4a', acc: [], trunk: '#8e8e9a', trunk2: '#ffffff', glove: '#b8322f', build: 1.05, belly: .6, eyes: 'sleepy', brow: 'normal', mouth: 'smile' },
    quotes: { intro: 'ふわぁ…お手柔らかに頼むよ、坊や。', taunt: ['よっこいしょ…', 'まぁまぁ、焦らずに'], hurt: 'いててて…', rage: '', win: '年の功ってやつさ。', lose: 'いやぁ…若さには勝てんのう' },
    tips: ['パンチの前に腕をゆっくり引くのが合図や。見てからかわせば間に合う！', 'かわした直後は隙だらけ。そこで連打や！'],
    purse: 300, exp: 60, bgm: 'fight' },
  { id: 'paul', name: 'ポール・ブロック', circuit: 0, from: 'フランス', age: 29, title: '鉄壁のガードマン',
    hp: 110, pow: .6, spd: .8, idle: 1.3, guard: { high: 2, low: 1, full: 4, open: .2 }, evade: 0, cob: .15, feint: 0, taunt: .05, combo: 4,
    moves: { jabL: 2, jabR: 2, hookL: 1.5, hookR: 1.5, bodyL: 1 }, combos: [['jabL', 'jabR']], specials: [], rage: 0, getUp: [4, 7, 10],
    look: { skin: '#f3d2b3', hair: 'slick', hairC: '#3a2a1f', beard: 'none', acc: [], trunk: '#2c4fa3', trunk2: '#e23b3b', glove: '#2c4fa3', build: 1, eyes: 'normal', brow: 'thick', mouth: 'frown' },
    quotes: { intro: 'ボンジュール。僕のガードは破れないよ。', taunt: ['ノン、ノン', 'どうしたんだい？'], hurt: 'モンデュー！', rage: '', win: 'セ・ラ・ヴィ。', lose: 'ガードが…崩された…？' },
    tips: ['固いガードを殴ってもスタミナのムダや。攻撃をかわした後の隙を狙え！', '両腕を顔の前に揃えとる時は完全防御。手を出すな！'],
    purse: 450, exp: 90, bgm: 'fight' },
  { id: 'tora', name: 'タイガー山田', circuit: 0, from: '日本・大阪', age: 24, title: '浪速の猛虎',
    hp: 130, pow: .75, spd: .9, idle: 1.05, guard: { high: 2, low: 1, full: 1, open: .6 }, evade: .06, cob: .1, feint: .08, taunt: .1, combo: 4,
    moves: { jabL: 3, jabR: 3, hookL: 1.5, hookR: 1.5, bodyL: 1, bodyR: 1 }, combos: [['jabL', 'jabR'], ['jabR', 'hookL']],
    specials: [{ name: '虎爪乱舞', shout: 'いくでぇ！虎爪乱舞！', seq: ['jabL', 'jabR', 'hookL'], hp: .6, ch: .3 }], rage: .35, getUp: [4, 7, 10],
    look: { skin: '#e8b88c', hair: 'spiky', hairC: '#e8a317', beard: 'none', acc: ['headband'], accC: '#ffcc00', trunk: '#f2a900', trunk2: '#111111', glove: '#111111', build: .98, eyes: 'narrow', brow: 'angry', mouth: 'grin' },
    quotes: { intro: 'ゲンのオッサンとこの新入りか。ナメとったら噛み殺すで！', taunt: ['かかってこんかい！', 'ビビっとんのか？'], hurt: 'くっ…やるやんけ！', rage: 'もう手加減せえへんで！！', win: '十年早いわ！', lose: 'ちっ…次は負けへんからな！' },
    tips: ['虎は連打で来る。1発かわしても油断すな、2発目が来るで！', 'フラフラさせたら叫んで大技や。叫び声が聞こえたら準備せえ。'],
    purse: 600, exp: 130, bgm: 'fight' },
  { id: 'goliath', name: 'キング・ゴリアテ', circuit: 0, from: 'ガーナ', age: 31, title: 'ルーキーリーグ王者', champ: true,
    hp: 170, pow: .88, spd: .8, idle: 1.3, guard: { high: 2, low: 2, full: 1, open: .8 }, evade: 0, cob: .1, feint: .05, taunt: .15, combo: 5,
    moves: { jabL: 2, jabR: 2, hookL: 1.5, hookR: 1.5, upL: 1, hayL: .6, hayR: .6 }, combos: [['jabL', 'hookR']],
    specials: [{ name: 'ゴリアテ・ハンマー', shout: 'ぬおおお！ゴリアテ・ハンマー！！', seq: ['hayL', 'hayR'], hp: .7, ch: .35 }], rage: .4, getUp: [5, 8, 10],
    look: { skin: '#6b4226', hair: 'buzz', hairC: '#1a1210', beard: 'full', beardC: '#1a1210', acc: ['crown'], trunk: '#6a1b9a', trunk2: '#ffc53d', glove: '#ffc53d', build: 1.35, eyes: 'narrow', brow: 'thick', mouth: 'grin', jaw: 'square' },
    quotes: { intro: 'この王冠が欲しいか？ならば奪ってみるがいい。', taunt: ['ハッハッハ！', 'それで本気か？'], hurt: 'グゥッ…！', rage: '王の怒りを知れぇ！！', win: '王座はまだ渡さん。', lose: '見事だ…王冠はお前のものだ。' },
    tips: ['大振りは腕を高ーく振りかぶる。それはダッキング（▼）しかかわせへんで！', '体がデカい分、ボディがよう効く。腹を狙って動きを鈍らせたれ。'],
    purse: 1500, exp: 220, bgm: 'boss' },

  { id: 'marco', name: 'マルコ・ファンタジア', circuit: 1, from: 'イタリア', age: 27, title: '華麗なる伊達男',
    hp: 150, pow: .85, spd: 1.0, idle: 1.0, guard: { high: 2, low: 1, full: 1, open: 1.2 }, evade: .12, cob: .1, feint: .25, taunt: .22, combo: 4,
    moves: { jabL: 3, jabR: 3, strL: 1, hookL: 1, hookR: 1, upR: 1 }, combos: [['jabL', 'jabR', 'upR']],
    specials: [{ name: 'ファンタジア・ベーゼ', shout: 'ボーノ！君に投げキッスさ♪', seq: ['strL', 'strR', 'upL'], hp: .55, ch: .3 }], rage: .3, getUp: [5, 8, 10],
    look: { skin: '#e9bf96', hair: 'long', hairC: '#3b2414', beard: 'goatee', beardC: '#3b2414', acc: ['earring'], trunk: '#ffffff', trunk2: '#1c9a52', glove: '#1c9a52', build: .95, eyes: 'normal', brow: 'normal', mouth: 'smile' },
    quotes: { intro: 'チャオ♪ 美しく勝たせてもらうよ。', taunt: ['マンマミーア♪', 'ブラーヴォ！'], hurt: 'ぼ、僕の顔がっ！', rage: '顔を殴ったね…許さない！', win: 'ボーノ♪', lose: 'アリヴェデルチ…' },
    tips: ['マルコはフェイント多め。肩だけ動かして止めるやつや。慌てて逃げたらカモにされる！', '投げキッス（挑発）中はノーガード。すかさず殴ってスターをもらえ！'],
    purse: 1200, exp: 320, bgm: 'fight' },
  { id: 'ivan', name: 'イワン・ドラグノフ', circuit: 1, from: 'ロシア', age: 33, title: 'シベリアの鉄人',
    hp: 190, pow: 1.05, spd: .95, idle: 1.15, guard: { high: 2, low: .5, full: 2.5, open: .4 }, evade: 0, cob: .25, feint: .05, taunt: .05, combo: 3,
    moves: { jabL: 2, jabR: 2, bodyL: 1.5, bodyR: 1.5, upL: 1.2, upR: 1.2 }, combos: [['bodyL', 'upR'], ['bodyR', 'upL']],
    specials: [{ name: 'ツンドラ・ブリザード', shout: 'ウラー！ツンドラ・ブリザード！', seq: ['bodyL', 'bodyR', 'upL', 'upR'], hp: .6, ch: .3 }], rage: .35, getUp: [6, 8, 10],
    look: { skin: '#f4d8c4', hair: 'buzz', hairC: '#d9c89a', beard: 'stubble', beardC: '#b09a70', acc: ['scar'], trunk: '#c62828', trunk2: '#ffc53d', glove: '#c62828', build: 1.22, eyes: 'narrow', brow: 'thick', mouth: 'frown', jaw: 'square' },
    quotes: { intro: '…お前を砕く。', taunt: ['……', 'ダー。'], hurt: 'ぬぅ…', rage: 'ウラアアアア！！', win: '弱い。', lose: '…強い男だ。' },
    tips: ['イワンはボディ攻撃が多い。ボディはガード（▲）で完全に防げるで！', 'ガードを殴ると反撃が飛んでくる。手を出すのはかわした後や。'],
    purse: 1600, exp: 420, bgm: 'fight' },
  { id: 'solar', name: 'エル・ソラール', circuit: 1, from: 'メキシコ', age: 26, title: '太陽の覆面戦士',
    hp: 175, pow: .95, spd: 1.12, idle: .95, guard: { high: 2, low: 1.5, full: 1, open: 1 }, evade: .15, cob: .1, feint: .12, taunt: .15, combo: 4,
    moves: { jabL: 2, jabR: 2, hookL: 2, hookR: 2, upL: 1, upR: 1 }, combos: [['hookL', 'hookR'], ['jabL', 'hookR', 'upL']],
    specials: [{ name: 'ソラール・エクリプス', shout: '太陽よ燃えろ！エクリプス！', seq: ['hookL', 'hookR', 'hookL', 'upR'], hp: .6, ch: .35 }], rage: .35, getUp: [5, 8, 10],
    look: { skin: '#c98b5b', hair: 'none', hairC: '#000', beard: 'none', acc: ['lucha'], accC: '#ff8c1a', acc2C: '#ffe14d', trunk: '#ff8c1a', trunk2: '#ffe14d', glove: '#ffe14d', build: 1.02, eyes: 'big', brow: 'normal', mouth: 'grin' },
    quotes: { intro: '¡Hola! 太陽の力を見せてやる！', taunt: ['¡Vamos!', 'オーレ！'], hurt: '¡Ay!', rage: '¡Fuego! 燃えてきたぜ！', win: '¡Viva México!', lose: '¡Increíble! お前は太陽より熱い！' },
    tips: ['左右フックの連打が得意や。フックはパンチと逆側に避けるか、ダッキングや！', '素早いけどスタミナは普通。焦らずパターンを読め。'],
    purse: 2000, exp: 520, bgm: 'fight' },
  { id: 'mike', name: 'ブルー・マイケル', circuit: 1, from: 'アメリカ', age: 30, title: 'メジャー王者', champ: true,
    hp: 220, pow: 1.15, spd: 1.12, idle: .95, guard: { high: 2, low: 1.5, full: 1.2, open: .5 }, evade: .12, cob: .2, feint: .15, taunt: .08, combo: 4,
    moves: { jabL: 2, jabR: 2, strL: 1.5, strR: 1.5, hookL: 1, hookR: 1, upL: .8, upR: .8, bodyL: .8, bodyR: .8 }, combos: [['jabL', 'strR'], ['jabR', 'strL', 'hookR']],
    specials: [{ name: 'ブルー・ライトニング', shout: 'Lightning!! ブルー・ライトニング！', seq: ['strL', 'strR', 'strL', 'hayR'], hp: .6, ch: .35 }], rage: .4, getUp: [6, 9, 10],
    look: { skin: '#8d5a3b', hair: 'short', hairC: '#111', beard: 'goatee', beardC: '#111', acc: [], trunk: '#1565c0', trunk2: '#ffffff', glove: '#1565c0', build: 1.08, eyes: 'normal', brow: 'thick', mouth: 'smile' },
    quotes: { intro: 'Welcome to the Major. ここからが本当のボクシングだ。', taunt: ['Come on!', 'Is that all?'], hurt: 'Damn!', rage: 'OK…本気で行くぜ！', win: 'Good fight, kid.', lose: 'You got it, champ.' },
    tips: ['ストレートは溜めがほぼない最速の拳や。腕を引いた瞬間に動け！', '王者は全部の技を使ってくる。基本に忠実に、かわして・打つ、や。'],
    purse: 5000, exp: 700, bgm: 'boss' },

  { id: 'long', name: 'チャン・ロン', circuit: 2, from: '中国', age: 25, title: '疾風の拳法家',
    hp: 230, pow: 1.1, spd: 1.28, idle: .85, guard: { high: 2, low: 2, full: 1, open: .6 }, evade: .25, cob: .15, feint: .15, taunt: .1, combo: 3,
    moves: { jabL: 4, jabR: 4, strL: 1.5, strR: 1.5, bodyL: 1, bodyR: 1, upL: .8 }, combos: [['jabL', 'jabR', 'jabL'], ['jabR', 'jabL', 'strR']],
    specials: [{ name: '百烈疾風拳', shout: 'ハァァァ！百烈疾風拳！', seq: ['jabL', 'jabR', 'jabL', 'jabR', 'jabL', 'strR'], hp: .6, ch: .35 }], rage: .35, getUp: [6, 9, 10],
    look: { skin: '#efcfa7', hair: 'topknot', hairC: '#111', beard: 'none', acc: [], trunk: '#c62828', trunk2: '#ffd23f', glove: '#ffd23f', build: .92, eyes: 'narrow', brow: 'normal', mouth: 'normal' },
    quotes: { intro: '風のように打ち、風のように去る。', taunt: ['ハイッ！', '遅い。'], hurt: 'アイヤー！', rage: '本気の風を見せよう。', win: '修行が足りない。', lose: '…あなたこそ風だ。' },
    tips: ['チャンは避けるのが上手い。ガードしてない時でも殴ると外されることがある。隙を殴れ！', 'ジャブの嵐はリズムで見切れ。'],
    purse: 3500, exp: 850, bgm: 'fight' },
  { id: 'sam', name: 'サムソン・ブル', circuit: 2, from: 'オーストラリア', age: 34, title: '荒野の暴れ牛',
    hp: 290, pow: 1.45, spd: 1.05, idle: 1.05, guard: { high: 1.5, low: 1.5, full: 1.5, open: 1 }, evade: 0, cob: .15, feint: .08, taunt: .12, combo: 5,
    moves: { jabL: 1.5, jabR: 1.5, hookL: 2, hookR: 2, upL: 1, upR: 1, hayL: 1, hayR: 1 }, combos: [['hookL', 'hayR'], ['hookR', 'hayL']],
    specials: [{ name: 'ブル・スタンピード', shout: 'ブモォォォ！スタンピード！！', seq: ['hayL', 'hayR', 'hayL'], hp: .65, ch: .35 }, { name: 'レイジング・ホーン', shout: 'レイジング・ホォォン！', seq: ['upL', 'upR', 'hayL', 'hayR'], hp: .4, ch: .5, rage: true }], rage: .45, getUp: [7, 9, 10],
    look: { skin: '#e9b48a', hair: 'mohawk', hairC: '#7a3b12', beard: 'full', beardC: '#7a3b12', acc: ['earring'], trunk: '#5d4037', trunk2: '#ffcc80', glove: '#8d2f16', build: 1.35, belly: .35, eyes: 'narrow', brow: 'angry', mouth: 'grin', jaw: 'square' },
    quotes: { intro: 'お前をリングの外まで吹っ飛ばしてやるぜ！', taunt: ['ブルルル…', 'オラ来いよ！'], hurt: 'ぐおっ！', rage: 'ブモオオオオオオ！！', win: 'ガッハッハ！', lose: 'やるじゃねぇか、チビ…' },
    tips: ['サムの一撃はシャレにならん。大振りは絶対ダッキングや！', '怒ったら手が付けられへん。怒らす前に削り切るのも手や。'],
    purse: 4200, exp: 1000, bgm: 'fight' },
  { id: 'brain', name: 'ドクター・ブレイン', circuit: 2, from: 'ドイツ', age: 41, title: '計算するボクサー', adaptive: true,
    hp: 260, pow: 1.2, spd: 1.2, idle: .95, guard: { high: 2, low: 2, full: 1.5, open: .3 }, evade: .15, cob: .25, feint: .2, taunt: .05, combo: 3,
    moves: { jabL: 2, jabR: 2, strL: 1, strR: 1, hookL: 1.5, hookR: 1.5, upL: 1, upR: 1, bodyL: 1, bodyR: 1 }, combos: [['jabL', 'hookL'], ['jabR', 'hookR'], ['bodyL', 'upL']],
    specials: [{ name: '演算終了', shout: '計算完了。演算終了(QED)！', seq: ['hookR', 'hookL', 'upR', 'hayL'], hp: .55, ch: .4 }], rage: .3, getUp: [7, 9, 10],
    look: { skin: '#f6dcc6', hair: 'curly', hairC: '#c9c9c9', beard: 'none', acc: ['glasses'], trunk: '#37474f', trunk2: '#80deea', glove: '#37474f', build: .95, eyes: 'normal', brow: 'normal', mouth: 'normal' },
    quotes: { intro: 'キミの回避パターンは既に解析済みだ。', taunt: ['予測通り。', 'データが足りたよ。'], hurt: '計算外だ…！', rage: 'パラメータを修正する！', win: 'Q.E.D.（証明終了）', lose: 'キミは…計算を超えた…' },
    tips: ['ブレインはお前のクセを学習しよる。同じ避け方ばっかりしとったら狙われるで！', 'フックは逆側かダッキング、ジャブはどっちでもOK。避け方を散らせ！'],
    purse: 5000, exp: 1150, bgm: 'fight' },
  { id: 'maddog', name: 'マッドドッグ・ジョー', circuit: 2, from: 'アメリカ', age: 28, title: 'WBA世界王者', champ: true,
    hp: 320, pow: 1.5, spd: 1.3, idle: .82, guard: { high: 1.5, low: 1.5, full: 1, open: 1.2 }, evade: .1, cob: .2, feint: .15, taunt: .15, combo: 4,
    moves: { jabL: 2, jabR: 2, strL: 1.2, strR: 1.2, hookL: 1.5, hookR: 1.5, upL: 1.2, upR: 1.2, bodyL: 1, bodyR: 1, hayL: .6, hayR: .6 }, combos: [['jabL', 'jabR', 'hookL'], ['strR', 'upL'], ['bodyL', 'bodyR', 'upR']],
    specials: [{ name: 'マッド・バイト', shout: 'ガルルル！食い千切ってやる！', seq: ['hookL', 'hookR', 'hookL', 'hookR'], hp: .7, ch: .3 }, { name: 'ラビッド・ラッシュ', shout: 'ヒャッハー！ラビッド・ラッシュ！！', seq: ['jabL', 'jabR', 'upL', 'upR', 'hayL'], hp: .45, ch: .45, rage: true }], rage: .45, getUp: [7, 9, 10],
    look: { skin: '#e8b890', hair: 'mohawk', hairC: '#e23b3b', beard: 'stubble', beardC: '#5a3a28', acc: ['scar', 'earring'], trunk: '#111111', trunk2: '#e23b3b', glove: '#e23b3b', build: 1.12, eyes: 'big', brow: 'angry', mouth: 'grin' },
    quotes: { intro: 'ヒャハハ！世界のてっぺんの味、教えてやるよ！', taunt: ['ワンワン！', 'ビビってんのか？ヒャハ！'], hurt: 'イッてぇなぁ！！', rage: 'ガルルルル……ブッ殺す！！', win: 'ヒャーッハッハッハ！', lose: 'く…狂犬が…負けた…' },
    tips: ['マッドドッグは何でもアリの狂犬や。技の見た目をしっかり覚えるんや。', '怒ると連打がエグい。スターを溜めておいて、怒った瞬間に叩き込め！'],
    purse: 12000, exp: 1400, bgm: 'boss' },

  { id: 'kage', name: '影丸', circuit: 3, from: '日本・伊賀', age: 32, title: '闇に消える忍拳士', vanish: true,
    hp: 300, pow: 1.35, spd: 1.35, idle: .85, guard: { high: 2, low: 2, full: 1, open: .5 }, evade: .28, cob: .2, feint: .2, taunt: .05, combo: 3,
    moves: { jabL: 2, jabR: 2, strL: 1.5, strR: 1.5, hookL: 1.2, hookR: 1.2, upL: 1, upR: 1, bodyL: 1, bodyR: 1 }, combos: [['jabL', 'strR'], ['hookL', 'upR']],
    specials: [{ name: '影分身の拳', shout: '忍法・影分身の拳…！', seq: ['strL', 'hookR', 'strL', 'hookL', 'upR'], hp: .6, ch: .35 }], rage: .35, getUp: [7, 9, 10],
    look: { skin: '#e6c29c', hair: 'none', hairC: '#111', beard: 'none', acc: ['ninja'], accC: '#1b1b2a', trunk: '#1b1b2a', trunk2: '#6a5acd', glove: '#1b1b2a', build: .95, eyes: 'narrow', brow: 'angry', mouth: 'normal' },
    quotes: { intro: '…我が拳、見えぬと知れ。', taunt: ['……ふっ', '遅い。'], hurt: 'ぐっ…', rage: '闇よ…深まれ。', win: '去れ。', lose: '見事…なり…' },
    tips: ['影丸は拳を振る時に姿がブレる。見た目に惑わされず、腕の位置と光で判断や！', '避けるのも上手い。確実な隙だけ狙え。'],
    purse: 9000, exp: 1700, bgm: 'boss' },
  { id: 'raja', name: 'ラジャ・マハール', circuit: 3, from: 'インド', age: 36, title: '瞑想の拳聖', delay: true,
    hp: 330, pow: 1.4, spd: 1.3, idle: .9, guard: { high: 1.5, low: 1.5, full: 2, open: .8 }, evade: .15, cob: .2, feint: .3, taunt: .15, combo: 4,
    moves: { jabL: 2, jabR: 2, hookL: 1.5, hookR: 1.5, upL: 1.2, upR: 1.2, hayL: .8, hayR: .8 }, combos: [['jabL', 'hayR'], ['upL', 'hookR']],
    specials: [{ name: '曼荼羅連掌', shout: 'オーム…曼荼羅連掌！', seq: ['hookL', 'upR', 'hookR', 'upL', 'hayL'], hp: .6, ch: .35 }], rage: .35, getUp: [7, 9, 10],
    look: { skin: '#9c6644', hair: 'none', hairC: '#111', beard: 'full', beardC: '#2a1a12', acc: ['turban'], accC: '#e67e22', trunk: '#e67e22', trunk2: '#ffffff', glove: '#8e24aa', build: 1.1, eyes: 'sleepy', brow: 'thick', mouth: 'normal' },
    quotes: { intro: '心を静めよ。さすれば拳は見える。', taunt: ['オーム……', '焦りは敗北の種。'], hurt: 'むぅ…', rage: '瞑想を…解く！', win: 'ナマステ。', lose: 'そなたの心、澄み切っておる。' },
    tips: ['ラジャは溜めを途中で止めてタイミングをずらしてくる。最後まで見てから動け！', 'フェイントも多い。焦った奴から倒れる相手や。'],
    purse: 11000, exp: 2000, bgm: 'boss' },
  { id: 'apollo', name: 'アポロ・グレイス', circuit: 3, from: 'ギリシャ', age: 29, title: '黄金の彫像',
    hp: 360, pow: 1.45, spd: 1.34, idle: .82, guard: { high: 2, low: 2, full: 2.5, open: .2 }, evade: .2, cob: .32, feint: .15, taunt: .08, combo: 3,
    moves: { jabL: 2, jabR: 2, strL: 2, strR: 2, hookL: 1.2, hookR: 1.2, upL: 1, upR: 1, bodyL: .8, bodyR: .8 }, combos: [['jabL', 'strR', 'hookL'], ['strL', 'strR']],
    specials: [{ name: 'オリンポス・ジャッジメント', shout: '神々の審判を受けよ！', seq: ['strL', 'strR', 'upL', 'upR', 'hayR'], hp: .6, ch: .4 }], rage: .3, getUp: [8, 9, 10],
    look: { skin: '#f0cfa8', hair: 'curly', hairC: '#e2b13c', beard: 'none', acc: ['laurel'], trunk: '#ffffff', trunk2: '#ffc53d', glove: '#ffc53d', build: 1.08, eyes: 'normal', brow: 'normal', mouth: 'smile', jaw: 'square' },
    quotes: { intro: '美とは、無駄のない強さのことだ。', taunt: ['美しくない。', 'ふふ…'], hurt: '私の顔に…傷を！？', rage: '神の怒りを見せよう。', win: '美しい勝利だ。', lose: '美しい…拳だった。' },
    tips: ['アポロは鉄壁のガードからの反撃が怖い。ガードを叩いたら即反撃が来ると思え。', 'カウンター狙い一本で行くんや。スターを溜めて一気に崩せ！'],
    purse: 14000, exp: 2400, bgm: 'boss' },
  { id: 'zeus', name: 'ゼウス・ヴァレンタイン', circuit: 3, from: 'アメリカ', age: 33, title: '統一世界王者', champ: true, final: true,
    hp: 400, pow: 1.7, spd: 1.46, idle: .78, guard: { high: 2, low: 2, full: 1.5, open: .5 }, evade: .2, cob: .3, feint: .2, taunt: .1, combo: 3,
    moves: { jabL: 2, jabR: 2, strL: 1.5, strR: 1.5, hookL: 1.5, hookR: 1.5, upL: 1.2, upR: 1.2, bodyL: 1, bodyR: 1, hayL: .7, hayR: .7 }, combos: [['jabL', 'strR', 'hookL'], ['bodyR', 'upL'], ['hookR', 'hookL', 'upR']],
    specials: [{ name: 'ゴッド・サンダー', shout: '天より落ちよ…ゴッド・サンダー！', seq: ['upL', 'upR', 'hayL'], hp: .75, ch: .3 }, { name: 'ヴァレンタイン・レクイエム', shout: 'これが頂点の拳だ！レクイエム！！', seq: ['strL', 'hookR', 'upL', 'bodyR', 'hookL', 'hayR'], hp: .5, ch: .45, rage: true }], rage: .5, getUp: [8, 9, 10],
    look: { skin: '#b07850', hair: 'slick', hairC: '#f5f5f5', beard: 'goatee', beardC: '#f5f5f5', acc: ['earring'], trunk: '#f5f5f5', trunk2: '#ffc53d', glove: '#ffc53d', build: 1.18, eyes: 'narrow', brow: 'thick', mouth: 'smile', jaw: 'square' },
    quotes: { intro: 'よくぞ辿り着いた。頂点の景色を見せてやろう。', taunt: ['来い。', '王の前だぞ。'], hurt: 'ほう…！', rage: '面白い…！全力で潰す！！', win: 'ここが頂点だ。', lose: '見事…お前が新たな伝説だ。' },
    tips: ['ゼウスは全ての技が速くて重い。これまでの全部をぶつけるんや！', '怒りの大技レクイエムは6連打。覚えて、耐えて、打ち返せ！'],
    purse: 50000, exp: 3200, bgm: 'boss' },

  { id: 'gen', name: 'ゲン（全盛期）', circuit: 4, from: '日本・大阪', age: 27, title: '浪速の閃光', secret: true,
    hp: 380, pow: 1.65, spd: 1.5, idle: .78, guard: { high: 2, low: 2, full: 1.5, open: .6 }, evade: .22, cob: .3, feint: .25, taunt: .12, combo: 3,
    moves: { jabL: 3, jabR: 3, strL: 1.5, strR: 1.5, hookL: 1.5, hookR: 1.5, upL: 1, upR: 1, bodyL: 1, bodyR: 1 }, combos: [['jabL', 'jabR', 'strL'], ['bodyL', 'hookL'], ['jabR', 'upR']],
    specials: [{ name: '浪速閃光拳', shout: '見さらせ！浪速閃光拳！！', seq: ['jabL', 'jabR', 'strL', 'hookR', 'upL', 'hayR'], hp: .6, ch: .45 }], rage: .4, getUp: [8, 9, 10],
    look: { skin: '#e3b287', hair: 'short', hairC: '#1a1a1a', beard: 'none', acc: ['headband'], accC: '#e23b3b', trunk: '#e23b3b', trunk2: '#ffffff', glove: '#ffffff', build: 1.02, eyes: 'normal', brow: 'thick', mouth: 'grin' },
    quotes: { intro: 'オッサンの昔の姿や。全盛期のワシを超えてみい！', taunt: ['なんや、そんなもんか', 'ほれほれ！'], hurt: 'ええパンチや！', rage: 'ここからが本番や！！', win: 'まだまだやな。', lose: '…ようやった。お前は、ワシを超えた。' },
    tips: ['ワシのことはワシが一番よう知っとる。フェイントに乗せられんなよ！'],
    purse: 30000, exp: 3000, bgm: 'boss' },
  { id: 'mirror', name: 'シャドウ', circuit: 4, from: '？？？', age: 0, title: 'もう一人の自分', secret: true, adaptive: true, isMirror: true,
    hp: 420, pow: 1.8, spd: 1.6, idle: .75, guard: { high: 2, low: 2, full: 1.5, open: .5 }, evade: .22, cob: .3, feint: .25, taunt: .05, combo: 3,
    moves: { jabL: 2, jabR: 2, strL: 1.5, strR: 1.5, hookL: 1.5, hookR: 1.5, upL: 1.2, upR: 1.2, bodyL: 1, bodyR: 1, hayL: .6, hayR: .6 }, combos: [['jabL', 'strR', 'hookL'], ['bodyL', 'bodyR', 'upR'], ['hookL', 'hookR', 'upL']],
    specials: [{ name: 'シャドウ・スター', shout: '………スターパンチ。', seq: ['upR', 'hayL', 'hayR'], hp: .6, ch: .45 }, { name: 'ネガ・ラッシュ', shout: 'オマエハ…オレダ……', seq: ['jabL', 'jabR', 'hookL', 'hookR', 'upL', 'upR', 'hayL'], hp: .35, ch: .5, rage: true }], rage: .45, getUp: [8, 9, 10],
    look: { skin: '#3a3f5c', hair: 'short', hairC: '#0a0a14', beard: 'none', acc: [], trunk: '#20243a', trunk2: '#6b72a8', glove: '#20243a', build: 1.05, eyes: 'glow', brow: 'angry', mouth: 'normal' },
    quotes: { intro: '………オマエノ　スベテヲ　シッテイル。', taunt: ['……', 'ムダダ。'], hurt: '……ッ', rage: 'ウオオオオオ……', win: '……オマエハ　オレニ　カテナイ', lose: '……ソウカ。オマエハ　マエニ　ススムノカ。' },
    tips: ['自分自身が相手や。お前のクセは全部読まれとる。最後は心で勝て！'],
    purse: 40000, exp: 4000, bgm: 'boss' }
];
const OPP_BY = {}; OPP.forEach((o, i) => { o.idx = i; OPP_BY[o.id] = o; });
const MAIN_COUNT = 16;

/* スパーリング相手（トレーニング用） */
const SPAR = { id: 'spar', name: 'スパー相手・テツ', circuit: 0, title: 'ジムの先輩', hp: 999, pow: 0, spd: .9, idle: .9,
  guard: { full: 1 }, evade: 0, cob: 0, feint: .12, taunt: 0, combo: 99,
  moves: { jabL: 2, jabR: 2, hookL: 1.5, hookR: 1.5, upL: 1, upR: 1, bodyL: 1, bodyR: 1, hayL: .6, hayR: .6 }, combos: [], specials: [], rage: 0, getUp: [1],
  look: { skin: '#e8bd94', hair: 'buzz', hairC: '#222', beard: 'stubble', beardC: '#333', acc: ['headgear'], accC: '#2f6fe0', trunk: '#2f6fe0', trunk2: '#fff', glove: '#2f6fe0', build: 1.05, eyes: 'normal', brow: 'thick', mouth: 'normal' },
  quotes: { intro: 'よっしゃ、かかってこい！', taunt: [], hurt: '', rage: '', win: '', lose: '' }, tips: [] };

const COACH_LOOK = { skin: '#dcaa82', hair: 'buzz', hairC: '#bdbdbd', beard: 'mustache', beardC: '#cfcfcf', acc: ['shirt', 'sunglasses'], accC: '#1b2b55', trunk: '#333', trunk2: '#fff', glove: '#e23b3b', build: 1.1, belly: .4, eyes: 'normal', brow: 'thick', mouth: 'grin', jaw: 'square' };
const PLAYER_LOOK_BASE = { skin: '#e6b48a', hair: 'short', hairC: '#1c1c22', beard: 'none', acc: [], build: 1.02, eyes: 'normal', brow: 'thick', mouth: 'normal' };
function playerLook() {
  return Object.assign({}, PLAYER_LOOK_BASE, { trunk: GEAR[S.equip.trunk].c1, trunk2: GEAR[S.equip.trunk].c2, glove: GEAR[S.equip.color].c });
}

/* ---------- ストーリー ---------- */
const STORY = {
  opening: { title: 'プロローグ', lines: [
    ['gen', 'おう、お前か。ウチのジム「浪速拳闘会」の門叩いたんは。'],
    ['gen', 'ワシはゲン。昔はちょっとは名の知れたボクサーやった。今はこのボロジムの会長兼コーチや。'],
    ['you', '（世界の頂点――統一世界王者ゼウス・ヴァレンタインを倒す。それが夢だ）'],
    ['gen', 'ほう、ええ目しとるやないか。夢はデカい方がええ。'],
    ['gen', 'ボクシングの基本は一つや。「見切って、かわして、打つ」。相手が腕を引いたら、それが合図や。'],
    ['gen', 'かわした後、相手は隙だらけ。そこでカウンターを決めたら「スター★」が貯まる。★は必殺のスターパンチに使え。'],
    ['gen', 'まずはルーキーリーグからや。トレーニングで体作って、一戦一戦、勝ち上がってこい！'],
    ['gen', 'ほな行くで。お前の「KNOCKOUT ROAD」の始まりや！']
  ] },
  belt1: { title: 'ルーキー王者', lines: [
    ['gen', 'やりよった…！ゴリアテを倒して、ルーキーリーグ王者や！'],
    ['gen', 'せやけど浮かれたらアカン。次のメジャーサーキットは、技もスピードも段違いや。'],
    ['gen', 'フェイントを使う奴、ガードを殴ったら反撃してくる奴…頭も使わなアカンで。'],
    ['you', '（ベルトの重みが、手に心地よい）'],
    ['gen', '稼いだファイトマネーで、ええグローブでも買うたらどうや。道具も実力のうちやで。']
  ] },
  belt2: { title: 'メジャー王者', lines: [
    ['gen', 'ブルー・マイケルまで倒すとはな…お前、ほんまにモノが違うわ。'],
    ['gen', 'ここから先は世界や。ワールドサーキット――化け物しかおらん。'],
    ['gen', 'お前のクセを読んでくる奴もおる。同じ避け方ばっかりしとったら、あっという間に沈められるで。'],
    ['gen', '…マッドドッグ・ジョー。今の世界王者や。狂犬と呼ばれとる。アイツを倒せば、世界の頂点が見えてくる。']
  ] },
  belt3: { title: '世界王者', lines: [
    ['gen', '……世界王者、か。ワシが届かんかった場所に、お前は立っとる。'],
    ['you', '（ゲンさんの目が、少し潤んでいるように見えた）'],
    ['gen', 'せやけどな、まだ上がおる。「レジェンドサーキット」――歴代の化け物ばかりが集う、伝説の舞台や。'],
    ['gen', 'その頂点におるのが、統一世界王者ゼウス・ヴァレンタイン。お前の夢の相手や。'],
    ['gen', '行ってこい。ワシの分まで、殴ってこい！']
  ] },
  preZeus: { title: '頂上決戦前夜', lines: [
    ['gen', 'いよいよ明日やな。'],
    ['gen', '…昔な、ワシもゼウスの前の王者に挑んだことがある。結果はボロ負けや。それで拳を壊して引退した。'],
    ['gen', 'せやからってお前に背負わせるつもりはない。お前はお前のボクシングをしたらええ。'],
    ['you', '（見切って、かわして、打つ。ゲンさんに教わった全部をぶつける）'],
    ['gen', 'ええ顔や。…行ってこい、チャンピオン。']
  ] },
  ending: { title: 'エピローグ', lines: [
    ['gen', 'やった……やりよった……！！統一世界王者や！！'],
    ['gen', '見たか世界！ウチの、浪速拳闘会の、ボクサーやで！！'],
    ['you', '（大歓声。頭上に掲げたベルトが、ライトを浴びて輝いていた）'],
    ['gen', '…ありがとうな。お前のおかげで、ワシの夢も叶ったわ。'],
    ['gen', '……と、しんみりするのはここまでや。実はな、お前に最後の挑戦状がある。'],
    ['gen', 'ワシの全盛期のスパー映像を再現した特別マッチや。「ゲン（全盛期）」――エキシビションから挑戦できるで。'],
    ['gen', 'ここまで来たお前なら、きっと超えられる。待っとるで！']
  ] },
  afterGen: { title: '師を超えて', lines: [
    ['gen', '…参ったわ。全盛期のワシでも、もうお前には敵わん。'],
    ['gen', 'せやけどな、ボクサーの最後の敵は、いつだって自分自身や。'],
    ['gen', '「シャドウ」――お前の全てを知り尽くした、もう一人のお前。エキシビションに現れたで。'],
    ['gen', 'お前の拳が本物なら、自分の影にも勝てるはずや。']
  ] },
  afterMirror: { title: '真の伝説', lines: [
    ['you', '（影が、光の中に溶けていった）'],
    ['gen', '……とうとう自分にまで勝ってもうたか。'],
    ['gen', 'お前はもう、ワシが教えることなんか何もない。本物の「伝説」や。'],
    ['gen', 'せやけど、ボクシングに終わりはない。EXモードで強化された猛者たちも待っとる。'],
    ['gen', 'これからもリングで待っとるで。KNOCKOUT ROADは、まだまだ続くんや！'],
    ['you', '― Thank you for playing! ―  made by hiro/ヒロ']
  ] }
};
const COACH_TIPS = [
  '相手が腕を引いたら攻撃の合図や。グローブが光る色で技の種類がわかるで。',
  '青白い光はジャブ、白はストレート、オレンジはフック、赤はアッパー、緑はボディ、紫は大振りや！',
  'フックは拳と逆の方向に避けるか、ダッキング（▼）。同じ側に避けたら直撃やで。',
  'アッパーは左右の回避のみ。ダッキングしたら逆に大ダメージや！',
  'ボディ攻撃はガード（▲）で完全に防げる。左右の回避でもOKや。',
  '大振りは▼ダッキング以外かわせへん。デカい振りかぶりが見えたらしゃがめ！',
  'かわした直後がチャンス。最初の一発はカウンターになってダメージ倍増、★も貰えるで。',
  '★が溜まったらスターパンチ（Space）。★3つならとんでもない威力や！',
  '殴られると★が1つ減る。溜めたら早めに使うのもアリや。',
  'スタミナが切れたら少しの間パンチが出せん。空振りやガード殴りは控えめにな。',
  'ダウンしたら連打で立ち上がれ！タフネスが高いほど早く立てるで。',
  '相手の叫び声は必殺技の合図。連続で飛んでくるから最後まで気ぃ抜くな。',
  '挑発しとる相手はノーガード。殴ったらスターが貰えるで！',
  'ボディを打ち続けると相手の動きが鈍る。スタミナ切れを狙え。',
  'トレーニングは週3回まで。休むか試合をすると回復するで。',
  '同じ相手とはエキシビションで何度でも戦える。ファイトマネーは少なめやけどな。'
];

/* ---------- トレーニング ---------- */
const TRAIN = {
  bag:  { name: 'サンドバッグ', stat: 'pow', ic: '🥊', desc: 'メーターの針が金色ゾーンに来た瞬間に打て！（12発）', how: 'どのパンチボタンでもOK', grades: [100, 80, 55, 30] },
  mitt: { name: 'ミット打ち', stat: 'spd', ic: '🎯', desc: '会長が構えたミットを素早く正確に打ち抜け！（30秒）', how: '左顔=Z 右顔=X 左ボディ=A 右ボディ=S', grades: [44, 34, 24, 14] },
  dodge:{ name: 'スパーリング', stat: 'tec', ic: '🛡️', desc: 'スパー相手の攻撃を正しくかわし続けろ！（30秒）', how: '←→回避 ↓ダッキング ↑ガード', grades: [15, 11, 8, 5] },
  run:  { name: 'ロードワーク', stat: 'sta', ic: '🏃', desc: '◀と▶を交互にリズムよく押して走れ！（25秒）', how: '←→ 交互（左顔/右顔でもOK）', grades: [170, 135, 100, 65] },
  rope: { name: '縄跳び', stat: 'tgh', ic: '🪢', desc: '縄が足元に来た瞬間にジャンプ！（45秒・ミス3回で終了）', how: '↓ / ↑ / どのボタンでもジャンプ', grades: [40, 28, 18, 10] }
};
const GRADE_XP = { S: 60, A: 45, B: 32, C: 20, D: 10 };
const GRADE_EXP = { S: 40, A: 30, B: 20, C: 12, D: 6 };
const GRADE_COL = { S: '#ffc53d', A: '#ff7b74', B: '#7fb2ff', C: '#34c77b', D: '#8ea0c8' };

/* ---------- 実績 ---------- */
const ACH = [
  ['first_win', '🥊', '初勝利', 'プロ初勝利を挙げる'],
  ['belt1', '🥉', 'ルーキー王者', 'ルーキーリーグ王者になる'],
  ['belt2', '🥈', 'メジャー王者', 'メジャー王者になる'],
  ['belt3', '🥇', '世界王者', 'WBA世界王者になる'],
  ['legend', '👑', '統一世界王者', 'ゼウス・ヴァレンタインを倒す'],
  ['gen', '🧢', '師を超えて', 'ゲン（全盛期）を倒す'],
  ['mirror', '🌑', '己に克つ', 'シャドウを倒す'],
  ['ko10', '💥', 'ノックアウト・アーティスト', 'KO勝利を10回達成'],
  ['r1ko', '⚡', '秒殺', '1ラウンドKO勝利'],
  ['perfect', '💎', 'パーフェクト', 'ノーダメージで勝利'],
  ['star3', '⭐', 'トリプルスター', '★3のスターパンチを当てる'],
  ['tko', '🔔', 'TKO', '1ラウンドに3回ダウンを奪う'],
  ['comeback', '🔥', '不屈の闘志', 'ダウンを奪われた試合で勝つ'],
  ['decision', '📋', '判定勝ち', '判定で勝利する'],
  ['counter50', '🎯', 'カウンターの鬼', '通算カウンター50回'],
  ['counter300', '🏹', 'カウンターの神', '通算カウンター300回'],
  ['punch1000', '👊', '千本拳', '通算1000発パンチを当てる'],
  ['punch5000', '🌋', '万拳の嵐', '通算5000発パンチを当てる'],
  ['train10', '🏋️', '練習の虫', 'トレーニングを10回行う'],
  ['train50', '🏅', '努力の天才', 'トレーニングを50回行う'],
  ['grade_s', '🌟', 'Sランク', 'トレーニングでSランクを取る'],
  ['surv5', '🛡️', 'サバイバー', 'サバイバルで5連勝'],
  ['surv15', '🗡️', '不死身', 'サバイバルで15連勝'],
  ['surv30', '🐉', '伝説の生存者', 'サバイバルで30連勝'],
  ['ex4', '🔱', 'EXハンター', 'EX版の相手に4人勝つ'],
  ['exall', '😈', '真・最強', '全16人のEX版に勝つ'],
  ['lv10', '📈', '成長期', 'レベル10に到達'],
  ['lv30', '🚀', '覚醒', 'レベル30に到達'],
  ['rich', '💰', '大富豪', '所持金100,000Gを達成'],
  ['gold', '🏆', '黄金の拳', '黄金の拳を手に入れる'],
  ['noguide', '🙈', '達人の眼', 'ガイドOFFでチャンピオンに勝つ'],
  ['hard', '☠️', '修羅の道', 'HARDでゼウスを倒す']
];

/* ================= 03. DRAW ================= */
const cv = $('#cv');
const ctx = cv.getContext('2d');
let DPK = 1;               // 論理px → 実px
const OB = document.createElement('canvas'), obx = OB.getContext('2d'); // 相手用オフスクリーン
function fitCanvas() {
  const box = $('#canvasBox'); if (!box) return;
  const cs = getComputedStyle(box);
  const bw = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const bh = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  if (bw <= 0 || bh <= 0) return;
  const s = Math.min(bw / W, bh / H);
  cv.style.width = Math.floor(W * s) + 'px'; cv.style.height = Math.floor(H * s) + 'px';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pw = Math.max(1, Math.round(W * s * dpr)), ph = Math.max(1, Math.round(H * s * dpr));
  if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; OB.width = pw; OB.height = ph; }
  DPK = pw / W;
}
window.addEventListener('resize', () => { if (CUR_SCR === 'scr-game') fitCanvas(); });
window.addEventListener('orientationchange', () => setTimeout(() => { if (CUR_SCR === 'scr-game') fitCanvas(); }, 250));

/* ---------- 汎用図形 ---------- */
function rrect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); }
function star5(c, x, y, r, r2 = r * .45) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r2 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath();
}

/* ---------- アリーナ（事前描画） ---------- */
const ARENA = document.createElement('canvas'); ARENA.width = W * 2; ARENA.height = H * 2;
const CROWD_FLASH = [];
function buildArena() {
  const c = ARENA.getContext('2d'); c.setTransform(2, 0, 0, 2, 0, 0);
  // 背景
  let g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#060a18'); g.addColorStop(.45, '#121c3e'); g.addColorStop(1, '#0a0f22');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // 上部照明リグ
  c.fillStyle = '#0b1128'; c.fillRect(0, 0, W, 34);
  for (let i = 0; i < 9; i++) {
    const x = 30 + i * 52;
    c.fillStyle = '#1b2345'; rrect(c, x - 10, 18, 20, 12, 3); c.fill();
    const lg = c.createRadialGradient(x, 30, 0, x, 30, 26); lg.addColorStop(0, 'rgba(255,248,220,.9)'); lg.addColorStop(1, 'rgba(255,248,220,0)');
    c.fillStyle = lg; c.fillRect(x - 26, 4, 52, 52);
  }
  // 観客
  const rng = mulberry(7);
  for (let row = 0; row < 7; row++) {
    const y = 96 + row * 22, sc = .7 + row * .07, dark = .55 - row * .04;
    for (let x = -10; x < W + 20; x += 15 * sc + rng() * 8) {
      const yy = y + rng() * 6;
      const shirt = ['#3a4a8a', '#8a3a4a', '#3a7a5a', '#7a6a3a', '#5a3a8a', '#2a2a3a', '#aa8a4a'][Math.floor(rng() * 7)];
      c.fillStyle = shade(shirt, -dark); ell(c, x, yy + 16 * sc, 11 * sc, 12 * sc); c.fill();
      c.fillStyle = shade(['#e8c09a', '#c9956b', '#8d5a3b', '#f2d2b4'][Math.floor(rng() * 4)], -dark - .1);
      ell(c, x, yy, 6.5 * sc, 7.5 * sc); c.fill();
      c.fillStyle = shade(['#111', '#3a2a1a', '#6a4a2a', '#222', '#aa8a4a'][Math.floor(rng() * 5)], -dark);
      c.beginPath(); c.arc(x, yy - 1.5 * sc, 6.8 * sc, Math.PI, 0); c.fill();
      if (rng() < .08) CROWD_FLASH.push({ x, y: yy - 4, t: rng() * 8, p: 3 + rng() * 6 });
    }
  }
  // 客席を暗く
  g = c.createLinearGradient(0, 80, 0, 260); g.addColorStop(0, 'rgba(6,10,24,.55)'); g.addColorStop(1, 'rgba(6,10,24,.1)');
  c.fillStyle = g; c.fillRect(0, 80, W, 180);
  // リング（床）
  const fy = 300;
  c.fillStyle = '#0c1024'; c.beginPath(); c.moveTo(20, fy - 8); c.lineTo(460, fy - 8); c.lineTo(W + 140, H); c.lineTo(-140, H); c.closePath(); c.fill();
  g = c.createLinearGradient(0, fy, 0, H);
  g.addColorStop(0, '#2758b8'); g.addColorStop(1, '#3a86ff');
  c.fillStyle = g; c.beginPath(); c.moveTo(34, fy); c.lineTo(446, fy); c.lineTo(W + 120, H); c.lineTo(-120, H); c.closePath(); c.fill();
  // キャンバスの光
  const sp = c.createRadialGradient(W / 2, 420, 10, W / 2, 420, 260); sp.addColorStop(0, 'rgba(255,255,255,.28)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = sp; c.fillRect(0, fy, W, H - fy);
  // ロゴ
  c.save(); c.translate(W / 2, 452); c.scale(1, .32);
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 150, 0, Math.PI * 2); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.12)'; c.font = '64px "Dela Gothic One", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('KO ROAD', 0, 4);
  c.restore();
  // エプロン
  c.fillStyle = '#b01c22'; c.fillRect(0, fy - 16, W, 8);
  // ポスト
  const post = (x, y, h, w, col) => {
    const pg = c.createLinearGradient(x - w, 0, x + w, 0); pg.addColorStop(0, shade(col, -.4)); pg.addColorStop(.5, col); pg.addColorStop(1, shade(col, -.5));
    c.fillStyle = pg; rrect(c, x - w, y - h, w * 2, h, 3); c.fill();
    c.fillStyle = shade(col, .3); rrect(c, x - w - 1, y - h - 4, w * 2 + 2, 8, 3); c.fill();
  };
  post(36, fy, 108, 5, '#c9ccd6'); post(444, fy, 108, 5, '#c9ccd6');
  // ロープ（奥）
  const ropes = [['#e23b3b', fy - 90], ['#f3ede1', fy - 62], ['#3a86ff', fy - 34]];
  for (const [col, y] of ropes) {
    c.strokeStyle = shade(col, -.45); c.lineWidth = 5; c.beginPath(); c.moveTo(36, y + 1); c.quadraticCurveTo(240, y + 7, 444, y + 1); c.stroke();
    c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.moveTo(36, y); c.quadraticCurveTo(240, y + 6, 444, y); c.stroke();
  }
  // ロープ（左右・手前へ）
  for (const [col, y] of ropes) {
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? 36 : 444, x1 = s < 0 ? -60 : W + 60;
      c.strokeStyle = shade(col, -.45); c.lineWidth = 7; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y + 250 + (y - fy) * 1.6); c.stroke();
      c.strokeStyle = col; c.lineWidth = 4.5; c.beginPath(); c.moveTo(x0, y - 1); c.lineTo(x1, y + 248 + (y - fy) * 1.6); c.stroke();
    }
  }
  // ビネット
  const vg = c.createRadialGradient(W / 2, H * .45, H * .3, W / 2, H * .45, H * .8);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
}
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function drawArena(c, t, excite = 0) {
  c.drawImage(ARENA, 0, 0, W, H);
  // カメラのフラッシュ
  for (const f of CROWD_FLASH) {
    const ph = (t + f.t) % f.p;
    if (ph < .09 || (excite > 0 && ((t * 3 + f.t) % 1.4) < .05 * excite)) {
      const r = 10 + Math.random() * 6;
      const fg = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, r); fg.addColorStop(0, 'rgba(255,255,255,.95)'); fg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = fg; c.fillRect(f.x - r, f.y - r, r * 2, r * 2);
    }
  }
  // スポットライト
  c.save(); c.globalCompositeOperation = 'lighter';
  const sw = Math.sin(t * .4) * 30;
  for (const [x0, x1] of [[120, 200 + sw], [360, 280 - sw]]) {
    const g = c.createLinearGradient(0, 0, 0, 420); g.addColorStop(0, 'rgba(255,245,210,.10)'); g.addColorStop(1, 'rgba(255,245,210,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(x0 - 8, 20); c.lineTo(x0 + 8, 20); c.lineTo(x1 + 90, 440); c.lineTo(x1 - 90, 440); c.closePath(); c.fill();
  }
  c.restore();
}

/* ---------- ボクサー描画（正面） ---------- */
const DEF_POSE = () => ({ x: 0, y: 0, rot: 0, sq: 1, hx: 0, hy: 0, hr: 0, L: { x: -30, y: -38, z: 1 }, R: { x: 30, y: -38, z: 1 } });
function drawBoxer(c, L, P, x, y, s, opt = {}) {
  const bw = L.build || 1, sw = 46 * bw, expr = opt.expr || L.mouthExpr || 'idle', t = opt.t || 0;
  c.save();
  c.translate(x + P.x * s, y + P.y * s);
  c.translate(0, 130 * s); c.rotate(P.rot || 0); c.translate(0, -130 * s);
  c.scale(s, s * (P.sq || 1));
  const skin = L.skin, skinD = shade(skin, -.28), skinL = shade(skin, .18), outline = shade(skin, -.6);
  c.lineJoin = 'round'; c.lineCap = 'round';
  // --- 脚 ---
  if (!opt.bust) {
    for (const sx of [-1, 1]) {
      const lg = c.createLinearGradient(sx * 10, 0, sx * 40, 0); lg.addColorStop(0, skin); lg.addColorStop(1, skinD);
      c.fillStyle = lg; c.strokeStyle = outline; c.lineWidth = 2;
      c.beginPath(); c.moveTo(sx * 6 * bw, 150); c.lineTo(sx * 36 * bw, 150); c.lineTo(sx * 40 * bw, 300); c.lineTo(sx * 14 * bw, 300); c.closePath(); c.fill(); c.stroke();
    }
  }
  // --- ロングヘア（背面） ---
  if (L.hair === 'long') { c.fillStyle = shade(L.hairC, -.15); rrect(c, -34 + P.hx, -80 + P.hy, 68, 96, 24); c.fill(); }
  // --- 首 ---
  c.fillStyle = skinD; c.fillRect(-13 * bw, -24, 26 * bw, 30);
  // --- 胴体 ---
  const tg = c.createLinearGradient(-sw, 0, sw, 0);
  tg.addColorStop(0, skinD); tg.addColorStop(.3, skin); tg.addColorStop(.55, skinL); tg.addColorStop(1, skinD);
  c.fillStyle = tg; c.strokeStyle = outline; c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(-14 * bw, -4); c.lineTo(-sw + 8, 8);
  c.quadraticCurveTo(-sw - 6, 12, -sw - 2, 36);
  c.quadraticCurveTo(-sw * .86, 72, -sw * .7, 108);
  c.lineTo(sw * .7, 108);
  c.quadraticCurveTo(sw * .86, 72, sw + 2, 36);
  c.quadraticCurveTo(sw + 6, 12, sw - 8, 8);
  c.lineTo(14 * bw, -4); c.closePath(); c.fill(); c.stroke();
  // 筋肉ライン
  c.strokeStyle = hexA(outline, .45); c.lineWidth = 2;
  c.beginPath(); c.moveTo(-sw * .62, 30); c.quadraticCurveTo(-sw * .3, 52, -3, 44); c.stroke();
  c.beginPath(); c.moveTo(sw * .62, 30); c.quadraticCurveTo(sw * .3, 52, 3, 44); c.stroke();
  if ((L.belly || 0) > .3) {
    c.fillStyle = hexA(skinL, .5); ell(c, 0, 82, sw * .55 * (.8 + L.belly * .4), 26 * (.8 + L.belly * .5)); c.fill();
    c.strokeStyle = hexA(outline, .35); c.beginPath(); c.arc(0, 86, sw * .45, .2, Math.PI - .2); c.stroke();
  } else {
    c.beginPath(); c.moveTo(0, 50); c.lineTo(0, 100); c.stroke();
    for (const yy of [62, 78, 93]) { c.beginPath(); c.moveTo(-14, yy); c.quadraticCurveTo(-7, yy + 3, 0, yy); c.quadraticCurveTo(7, yy + 3, 14, yy); c.stroke(); }
  }
  // コーチのシャツ
  if (L.acc && L.acc.includes('shirt')) {
    c.fillStyle = L.accC || '#1b2b55'; c.strokeStyle = shade(L.accC || '#1b2b55', -.5);
    c.beginPath(); c.moveTo(-14 * bw, -4); c.lineTo(-sw + 8, 8); c.quadraticCurveTo(-sw - 6, 12, -sw - 2, 36); c.quadraticCurveTo(-sw * .86, 72, -sw * .7, 110);
    c.lineTo(sw * .7, 110); c.quadraticCurveTo(sw * .86, 72, sw + 2, 36); c.quadraticCurveTo(sw + 6, 12, sw - 8, 8); c.lineTo(14 * bw, -4); c.lineTo(0, 14); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#ffc53d'; c.font = '900 13px "Dela Gothic One",sans-serif'; c.textAlign = 'center'; c.fillText('浪速', 0, 64); c.fillText('拳闘会', 0, 80);
  }
  // --- トランクス ---
  if (!opt.bust) {
    c.fillStyle = L.trunk; c.strokeStyle = shade(L.trunk, -.55); c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(-sw * .74, 104); c.lineTo(sw * .74, 104); c.lineTo(sw * .82, 176); c.lineTo(4, 176); c.lineTo(0, 160); c.lineTo(-4, 176); c.lineTo(-sw * .82, 176); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = L.trunk2; c.fillRect(-sw * .74, 104, sw * 1.48, 12);
    c.fillStyle = hexA(L.trunk2, .9); c.fillRect(-sw * .8, 130, 6, 44); c.fillRect(sw * .8 - 6, 130, 6, 44);
  }
  // --- 頭 ---
  c.save(); c.translate(P.hx || 0, -54 + (P.hy || 0)); c.rotate(P.hr || 0);
  drawHead(c, L, expr, t, opt);
  c.restore();
  // --- 腕とグローブ ---
  if (!opt.noArms) {
    const arms = [['L', -1], ['R', 1]];
    // 奥行きの小さい方から描く
    arms.sort((a, b) => (P[a[0]].z || 1) - (P[b[0]].z || 1));
    for (const [k, sx] of arms) {
      const G = P[k], sxp = sx * (sw - 4), syp = 22;
      const dx = G.x - sxp, dy = G.y - syp, d = Math.hypot(dx, dy) || 1;
      let nx = -dy / d, ny = dx / d; if (ny < 0 || (Math.abs(ny) < .3 && nx * sx < 0)) { nx = -nx; ny = -ny; }
      const bend = Math.max(0, 118 - d) * .55;
      const ex = (sxp + G.x) / 2 + nx * bend + sx * 8, ey = (syp + G.y) / 2 + ny * bend;
      c.strokeStyle = outline; c.lineWidth = 23 * bw; c.beginPath(); c.moveTo(sxp, syp); c.lineTo(ex, ey); c.lineTo(G.x, G.y); c.stroke();
      c.strokeStyle = skin; c.lineWidth = 19 * bw; c.beginPath(); c.moveTo(sxp, syp); c.lineTo(ex, ey); c.lineTo(G.x, G.y); c.stroke();
      c.strokeStyle = hexA(skinL, .6); c.lineWidth = 6 * bw; c.beginPath(); c.moveTo(sxp - sx * 3, syp - 4); c.lineTo(ex - sx * 3, ey - 4); c.stroke();
      drawGlove(c, G.x, G.y, 21 * (G.z || 1) * (.92 + bw * .08), L.glove, sx, opt.glow && opt.glow.side === k ? opt.glow : null);
    }
  }
  c.restore();
}
function drawGlove(c, x, y, r, col, sx, glow) {
  c.save(); c.translate(x, y);
  if (glow) {
    c.shadowColor = glow.col; c.shadowBlur = 16 + 14 * glow.a;
    c.fillStyle = hexA(glow.col, .35 * glow.a); ell(c, 0, 0, r * 1.5, r * 1.5); c.fill();
  }
  const gg = c.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r * 1.2);
  gg.addColorStop(0, shade(col, .45)); gg.addColorStop(.55, col); gg.addColorStop(1, shade(col, -.45));
  c.fillStyle = gg; c.strokeStyle = shade(col, -.65); c.lineWidth = Math.max(1.5, r * .1);
  ell(c, 0, 0, r, r * 1.05); c.fill(); c.stroke();
  c.shadowBlur = 0;
  // 親指
  c.fillStyle = shade(col, -.08); ell(c, -sx * r * .72, r * .15, r * .38, r * .5, sx * .4); c.fill(); c.stroke();
  // カフ
  c.fillStyle = '#f3ede1'; c.strokeStyle = 'rgba(0,0,0,.35)';
  rrect(c, -r * .62, r * .72, r * 1.24, r * .42, r * .15); c.fill(); c.stroke();
  // ハイライト
  c.fillStyle = 'rgba(255,255,255,.35)'; ell(c, -r * .3, -r * .45, r * .35, r * .2, -.5); c.fill();
  if (glow && glow.a > .6) { c.fillStyle = hexA('#ffffff', (glow.a - .6) * 1.5); ell(c, 0, 0, r, r * 1.05); c.fill(); }
  c.restore();
}
function drawHead(c, L, expr, t, opt = {}) {
  const skin = L.skin, skinD = shade(skin, -.28), outline = shade(skin, -.6), acc = L.acc || [];
  const sq = L.jaw === 'square';
  // 後ろ髪系
  if (L.hair === 'afro') { c.fillStyle = L.hairC; ell(c, 0, -12, 44, 40); c.fill(); }
  if (acc.includes('turban')) { c.fillStyle = shade(L.accC || '#e67e22', -.2); ell(c, 0, -30, 36, 26); c.fill(); }
  // 耳
  c.fillStyle = skinD; c.strokeStyle = outline; c.lineWidth = 2;
  ell(c, -27, 2, 7, 10); c.fill(); c.stroke(); ell(c, 27, 2, 7, 10); c.fill(); c.stroke();
  // 顔
  const fg = c.createRadialGradient(-6, -8, 4, 0, 0, 36); fg.addColorStop(0, shade(skin, .16)); fg.addColorStop(1, skinD);
  c.fillStyle = fg;
  if (sq) { rrect(c, -27, -32, 54, 66, 18); } else { ell(c, 0, 0, 26.5, 32); }
  c.fill(); c.stroke();
  // 髭（あご）
  if (L.beard === 'full') { c.fillStyle = L.beardC || '#222'; c.beginPath(); c.moveTo(-26, 2); c.quadraticCurveTo(-26, 36, 0, 38); c.quadraticCurveTo(26, 36, 26, 2); c.quadraticCurveTo(14, 20, 0, 18); c.quadraticCurveTo(-14, 20, -26, 2); c.fill(); }
  if (L.beard === 'stubble') { c.fillStyle = hexA(L.beardC || '#333', .35); c.beginPath(); c.moveTo(-24, 6); c.quadraticCurveTo(-22, 34, 0, 34); c.quadraticCurveTo(22, 34, 24, 6); c.quadraticCurveTo(12, 22, 0, 20); c.quadraticCurveTo(-12, 22, -24, 6); c.fill(); }
  if (L.beard === 'goatee') { c.fillStyle = L.beardC || '#222'; c.beginPath(); c.moveTo(-9, 24); c.quadraticCurveTo(0, 40, 9, 24); c.quadraticCurveTo(0, 28, -9, 24); c.fill(); }
  // 覆面系
  if (acc.includes('lucha')) {
    c.fillStyle = L.accC || '#ff8c1a'; c.strokeStyle = shade(L.accC || '#ff8c1a', -.5);
    ell(c, 0, -2, 27.5, 33); c.fill(); c.stroke();
    c.fillStyle = L.acc2C || '#ffe14d';
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.beginPath(); c.moveTo(0, -30); c.lineTo(Math.cos(a) * 6, -30 + Math.sin(a) * 6); c.lineTo(Math.cos(a + .3) * 14, -30 + Math.sin(a + .3) * 14); c.fill(); }
    c.fillStyle = '#fff'; ell(c, -10, -3, 10, 7, -.3); c.fill(); ell(c, 10, -3, 10, 7, .3); c.fill();
    c.fillStyle = skin; ell(c, 0, 20, 12, 9); c.fill();
  }
  if (acc.includes('ninja')) {
    c.fillStyle = L.accC || '#1b1b2a'; ell(c, 0, -4, 28, 33); c.fill();
    c.fillStyle = skin; rrect(c, -22, -12, 44, 16, 7); c.fill();
    c.fillStyle = '#6a5acd'; c.fillRect(-28, -18, 56, 5);
    c.strokeStyle = '#6a5acd'; c.lineWidth = 4; c.beginPath(); c.moveTo(24, -16); c.quadraticCurveTo(40 + Math.sin(t * 6) * 4, -10, 48, 4 + Math.sin(t * 5) * 5); c.stroke();
  }
  if (L.eyes === 'none') { drawHair(c, L, t); return; }
  // 目
  drawEyes(c, L, expr, t);
  // 鼻
  if (!acc.includes('ninja')) {
    c.strokeStyle = hexA(outline, .7); c.lineWidth = 2;
    c.beginPath(); c.moveTo(-2, 0); c.quadraticCurveTo(-6, 12, -1, 13); c.quadraticCurveTo(3, 14, 5, 11); c.stroke();
  }
  // 口
  if (!acc.includes('ninja')) drawMouth(c, L, expr, t);
  if (L.beard === 'mustache' || L.beard === 'goatee') {
    c.fillStyle = L.beardC || '#222';
    c.beginPath(); c.moveTo(-14, 19); c.quadraticCurveTo(-7, 12, 0, 16); c.quadraticCurveTo(7, 12, 14, 19); c.quadraticCurveTo(7, 17, 0, 19); c.quadraticCurveTo(-7, 17, -14, 19); c.fill();
  }
  // 髪
  drawHair(c, L, t);
  // アクセサリ
  for (const a of acc) {
    if (a === 'headband') {
      c.fillStyle = L.accC || '#e23b3b'; c.fillRect(-27, -24, 54, 8);
      c.beginPath(); c.moveTo(25, -22); c.lineTo(40, -14 + Math.sin(t * 7) * 3); c.lineTo(38, -8 + Math.sin(t * 7) * 3); c.lineTo(24, -17); c.fill();
      c.beginPath(); c.moveTo(25, -20); c.lineTo(36, -4 + Math.sin(t * 6) * 3); c.lineTo(33, 0 + Math.sin(t * 6) * 3); c.lineTo(23, -15); c.fill();
    } else if (a === 'sunglasses') {
      c.fillStyle = '#111'; rrect(c, -22, -12, 19, 10, 3); c.fill(); rrect(c, 3, -12, 19, 10, 3); c.fill(); c.fillRect(-4, -10, 8, 3);
      c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-19, -11, 6, 2); c.fillRect(6, -11, 6, 2);
    } else if (a === 'glasses') {
      c.strokeStyle = '#222'; c.lineWidth = 2.2; ell(c, -10, -6, 9, 7.5); c.stroke(); ell(c, 10, -6, 9, 7.5); c.stroke();
      c.beginPath(); c.moveTo(-1, -7); c.lineTo(1, -7); c.stroke();
      c.fillStyle = 'rgba(200,240,255,.25)'; ell(c, -10, -6, 8, 6.5); c.fill(); ell(c, 10, -6, 8, 6.5); c.fill();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-14, -10, 4, 2); c.fillRect(6, -10, 4, 2);
    } else if (a === 'scar') {
      c.strokeStyle = 'rgba(150,40,40,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(12, -16); c.lineTo(20, 4); c.stroke();
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(13 + i * 3, -11 + i * 6); c.lineTo(19 + i * 3, -13 + i * 6); c.stroke(); }
    } else if (a === 'earring') {
      c.strokeStyle = '#ffc53d'; c.lineWidth = 2; c.beginPath(); c.arc(-28, 13, 4, 0, Math.PI * 2); c.stroke();
    } else if (a === 'crown') {
      c.fillStyle = '#ffc53d'; c.strokeStyle = '#8a5a00'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-18, -34); c.lineTo(-20, -52); c.lineTo(-10, -42); c.lineTo(0, -56); c.lineTo(10, -42); c.lineTo(20, -52); c.lineTo(18, -34); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#e23b3b'; ell(c, 0, -40, 3, 3); c.fill();
    } else if (a === 'turban') {
      const col = L.accC || '#e67e22'; c.fillStyle = col; c.strokeStyle = shade(col, -.45); c.lineWidth = 2;
      c.beginPath(); c.moveTo(-28, -12); c.quadraticCurveTo(-34, -52, 0, -56); c.quadraticCurveTo(34, -52, 28, -12); c.quadraticCurveTo(0, -24, -28, -12); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-24, -20); c.quadraticCurveTo(0, -46, 24, -26); c.stroke();
      c.fillStyle = '#2ecc71'; ell(c, 0, -30, 5, 6); c.fill(); c.fillStyle = '#ffc53d'; ell(c, 0, -38, 3, 3); c.fill();
    } else if (a === 'laurel') {
      c.fillStyle = '#e2b13c'; c.strokeStyle = '#8a6a10'; c.lineWidth = 1;
      for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) {
        const ang = Math.PI * (1.08 + i * .065); const x = Math.cos(ang) * 29 * sx * -1, y = Math.sin(ang) * 30 - 4;
        ell(c, x, y, 7.5, 3.2, sx * (.9 + i * .28)); c.fill(); c.stroke();
      }
    } else if (a === 'headgear') {
      const col = L.accC || '#2f6fe0'; c.fillStyle = col; c.strokeStyle = shade(col, -.5); c.lineWidth = 2;
      c.beginPath(); c.moveTo(-30, 18); c.lineTo(-30, -10); c.quadraticCurveTo(-30, -40, 0, -40); c.quadraticCurveTo(30, -40, 30, -10); c.lineTo(30, 18); c.lineTo(22, 18); c.lineTo(22, -12); c.quadraticCurveTo(0, -26, -22, -12); c.lineTo(-22, 18); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.font = '8px sans-serif'; c.textAlign = 'center'; c.fillText('KR', 0, -30);
    }
  }
}
function drawEyes(c, L, expr, t) {
  const out = shade(L.skin, -.65);
  c.lineCap = 'round';
  const eyeY = -6;
  const type = L.eyes || 'normal';
  if (expr === 'ko') {
    c.strokeStyle = '#222'; c.lineWidth = 3;
    for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 10 - 5, eyeY - 5); c.lineTo(sx * 10 + 5, eyeY + 5); c.moveTo(sx * 10 + 5, eyeY - 5); c.lineTo(sx * 10 - 5, eyeY + 5); c.stroke(); }
    return;
  }
  if (expr === 'dizzy') {
    c.strokeStyle = '#222'; c.lineWidth = 2;
    for (const sx of [-1, 1]) { c.beginPath(); for (let a = 0; a < 12; a += .4) c.lineTo(sx * 10 + Math.cos(a + t * 8 * sx) * a * .55, eyeY + Math.sin(a + t * 8 * sx) * a * .55); c.stroke(); }
    drawBrows(c, L, 'hurt'); return;
  }
  if (expr === 'hurt') {
    c.strokeStyle = '#222'; c.lineWidth = 3;
    for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 5, eyeY - 5); c.lineTo(sx * 14, eyeY); c.lineTo(sx * 5, eyeY + 4); c.stroke(); }
    drawBrows(c, L, 'hurt'); return;
  }
  if (type === 'glow') {
    for (const sx of [-1, 1]) { c.fillStyle = '#ff3b5c'; c.shadowColor = '#ff3b5c'; c.shadowBlur = 12; ell(c, sx * 10, eyeY, 6, 3.5); c.fill(); }
    c.shadowBlur = 0; drawBrows(c, L, expr); return;
  }
  const big = type === 'big' || expr === 'shock';
  const ry = type === 'narrow' ? 2.8 : type === 'sleepy' ? 2.4 : big ? 6 : 4.6;
  const blink = (t % 3.7) < .1 && expr !== 'shock';
  for (const sx of [-1, 1]) {
    if (blink) { c.strokeStyle = '#222'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(sx * 10 - 6, eyeY); c.lineTo(sx * 10 + 6, eyeY); c.stroke(); continue; }
    c.fillStyle = '#fff'; c.strokeStyle = out; c.lineWidth = 1.5; ell(c, sx * 10, eyeY, 6.5, ry); c.fill(); c.stroke();
    c.fillStyle = '#1a1a1a'; ell(c, sx * 10 + (expr === 'shock' ? 0 : sx * -1), eyeY + (type === 'sleepy' ? 1 : 0), big ? 2.4 : 2.8, Math.min(ry, big ? 2.4 : 3)); c.fill();
    if (type === 'sleepy') { c.fillStyle = shade(L.skin, -.1); c.fillRect(sx * 10 - 7, eyeY - 5, 14, 4); }
  }
  drawBrows(c, L, expr);
}
function drawBrows(c, L, expr) {
  const col = L.hair === 'bald' || L.hair === 'none' ? shade(L.skin, -.5) : (L.hairC === '#f5f5f5' || L.hairC === '#c9c9c9' ? '#999' : L.hairC);
  c.strokeStyle = col; c.lineWidth = L.brow === 'thick' ? 4.5 : 3; c.lineCap = 'round';
  const ang = expr === 'angry' || expr === 'shout' || L.brow === 'angry' ? 1 : expr === 'hurt' || expr === 'dizzy' ? -1 : 0;
  for (const sx of [-1, 1]) {
    c.beginPath(); c.moveTo(sx * 4, -15 + ang * 3); c.lineTo(sx * 17, -17 - ang * 3); c.stroke();
  }
}
function drawMouth(c, L, expr, t) {
  const m = expr === 'idle' ? (L.mouth || 'normal') : expr;
  c.strokeStyle = '#3a1a14'; c.lineWidth = 2.5; c.fillStyle = '#5a1a1a';
  const y = 22;
  if (m === 'hurt' || m === 'shock') { ell(c, 0, y + 1, 6, 7); c.fill(); c.fillStyle = '#fff'; c.fillRect(-4, y - 5, 8, 3); }
  else if (m === 'shout') { ell(c, 0, y, 9, 8 + Math.sin(t * 30) * 1.5); c.fill(); c.fillStyle = '#fff'; c.fillRect(-7, y - 7, 14, 3); c.fillStyle = '#e57373'; ell(c, 0, y + 5, 5, 2.5); c.fill(); }
  else if (m === 'grin' || m === 'smug') { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-10, y - 2); c.quadraticCurveTo(0, y + 8, 10, y - 2); c.closePath(); c.fill(); c.stroke(); }
  else if (m === 'smile') { c.beginPath(); c.moveTo(-9, y - 2); c.quadraticCurveTo(0, y + 6, 9, y - 2); c.stroke(); }
  else if (m === 'frown') { c.beginPath(); c.moveTo(-8, y + 3); c.quadraticCurveTo(0, y - 3, 8, y + 3); c.stroke(); }
  else if (m === 'ko' || m === 'dizzy') { c.beginPath(); c.moveTo(-8, y); c.quadraticCurveTo(-4, y - 4, 0, y); c.quadraticCurveTo(4, y + 4, 8, y); c.stroke(); }
  else if (m === 'angry') { c.fillStyle = '#fff'; rrect(c, -9, y - 3, 18, 7, 2); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-9, y + .5); c.lineTo(9, y + .5); c.stroke(); }
  else { c.beginPath(); c.moveTo(-7, y); c.lineTo(7, y); c.stroke(); }
}
function drawHair(c, L, t) {
  const h = L.hair, col = L.hairC, hl = shade(col, .25);
  c.fillStyle = col; c.strokeStyle = shade(col, -.4); c.lineWidth = 1.5;
  switch (h) {
    case 'short':
      c.beginPath(); c.moveTo(-27, -4); c.quadraticCurveTo(-30, -36, 0, -37); c.quadraticCurveTo(30, -36, 27, -4); c.quadraticCurveTo(24, -20, 14, -22);
      c.lineTo(6, -16); c.lineTo(0, -23); c.lineTo(-8, -16); c.lineTo(-14, -22); c.quadraticCurveTo(-24, -20, -27, -4); c.fill(); break;
    case 'buzz':
      c.fillStyle = hexA(col, .75); c.beginPath(); c.moveTo(-26, -8); c.quadraticCurveTo(-28, -36, 0, -34); c.quadraticCurveTo(28, -36, 26, -8); c.quadraticCurveTo(0, -26, -26, -8); c.fill(); break;
    case 'slick':
      c.beginPath(); c.moveTo(-27, -2); c.quadraticCurveTo(-32, -40, 0, -40); c.quadraticCurveTo(32, -40, 27, -2); c.quadraticCurveTo(22, -26, 0, -26); c.quadraticCurveTo(-20, -26, -27, -2); c.fill();
      c.strokeStyle = hl; c.lineWidth = 2; for (const x of [-12, 0, 12]) { c.beginPath(); c.moveTo(x - 4, -27); c.quadraticCurveTo(x, -36, x + 8, -38); c.stroke(); } break;
    case 'spiky':
      c.beginPath(); c.moveTo(-27, -4);
      const pts = [[-30, -30], [-22, -26], [-24, -50], [-10, -34], [-4, -58], [4, -36], [16, -54], [16, -32], [32, -40], [24, -22], [30, -14]];
      c.lineTo(-24, -20); for (const [x, y] of pts) c.lineTo(x, y); c.lineTo(27, -4); c.quadraticCurveTo(10, -24, -27, -4); c.fill(); c.stroke(); break;
    case 'mohawk':
      c.fillStyle = hexA(shade(L.skin, -.4), .4); c.beginPath(); c.moveTo(-26, -8); c.quadraticCurveTo(-28, -34, 0, -34); c.quadraticCurveTo(28, -34, 26, -8); c.quadraticCurveTo(0, -26, -26, -8); c.fill();
      c.fillStyle = col; c.beginPath(); c.moveTo(-6, -30); for (let i = 0; i < 6; i++) { c.lineTo(-8 + i * 3, -48 - (i % 2) * 8 - Math.sin(t * 4 + i) * 1.5); c.lineTo(-6 + i * 3 + 1.5, -36); } c.lineTo(8, -30); c.closePath(); c.fill(); c.stroke(); break;
    case 'afro':
      for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI; ell(c, Math.cos(a) * 30, -12 + Math.sin(a) * 30, 14, 14); c.fill(); } break;
    case 'long':
      c.beginPath(); c.moveTo(-28, 10); c.quadraticCurveTo(-34, -40, 0, -38); c.quadraticCurveTo(34, -40, 28, 10); c.lineTo(22, -8); c.quadraticCurveTo(10, -26, -4, -24); c.quadraticCurveTo(-18, -20, -22, -8); c.closePath(); c.fill();
      c.strokeStyle = hl; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-12, -32); c.quadraticCurveTo(-20, -20, -24, 0); c.stroke(); break;
    case 'topknot':
      c.beginPath(); c.moveTo(-26, -6); c.quadraticCurveTo(-28, -36, 0, -36); c.quadraticCurveTo(28, -36, 26, -6); c.quadraticCurveTo(0, -24, -26, -6); c.fill();
      ell(c, 0, -44, 9, 8); c.fill(); c.fillStyle = '#e23b3b'; c.fillRect(-6, -38, 12, 3); break;
    case 'curly':
      for (let i = 0; i < 10; i++) { const a = Math.PI * 1.03 + i / 9 * Math.PI * .94; ell(c, Math.cos(a) * 26, -8 + Math.sin(a) * 28, 9, 9); c.fill(); }
      ell(c, 0, -30, 16, 8); c.fill(); break;
    case 'bald':
      c.fillStyle = 'rgba(255,255,255,.28)'; ell(c, -8, -24, 9, 4, -.3); c.fill();
      c.fillStyle = hexA(col, .8); c.fillRect(-28, -2, 5, 12); c.fillRect(23, -2, 5, 12); break;
    default: break;
  }
}

/* ---------- プレイヤー（背面） ---------- */
function drawBack(c, L, P, alpha = .9) {
  c.save(); c.globalAlpha = alpha;
  c.translate(PX + P.x, PY + P.y); c.rotate(P.rot || 0);
  const skin = L.skin, skinD = shade(skin, -.3), out = shade(skin, -.6);
  c.lineJoin = 'round'; c.lineCap = 'round';
  // 背中
  const bg = c.createLinearGradient(-80, 0, 80, 0); bg.addColorStop(0, skinD); bg.addColorStop(.5, skin); bg.addColorStop(1, skinD);
  c.fillStyle = bg; c.strokeStyle = out; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-16, -112); c.lineTo(-62, -98); c.quadraticCurveTo(-84, -92, -82, -66); c.lineTo(-70, 40); c.lineTo(70, 40); c.lineTo(82, -66); c.quadraticCurveTo(84, -92, 62, -98); c.lineTo(16, -112); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = hexA(out, .4); c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(0, -100); c.lineTo(0, 30); c.stroke();
  c.beginPath(); c.moveTo(-40, -86); c.quadraticCurveTo(-22, -60, -36, -34); c.stroke();
  c.beginPath(); c.moveTo(40, -86); c.quadraticCurveTo(22, -60, 36, -34); c.stroke();
  // 首・頭
  c.fillStyle = skinD; c.fillRect(-14, -132, 28, 26);
  c.fillStyle = skinD; ell(c, -28, -142, 6, 9); c.fill(); ell(c, 28, -142, 6, 9); c.fill();
  c.fillStyle = skin; ell(c, 0, -146, 28, 31); c.fill(); c.strokeStyle = out; c.lineWidth = 2.5; c.stroke();
  c.fillStyle = L.hairC; c.beginPath(); c.moveTo(-28, -140); c.quadraticCurveTo(-30, -180, 0, -178); c.quadraticCurveTo(30, -180, 28, -140); c.quadraticCurveTo(24, -122, 0, -120); c.quadraticCurveTo(-24, -122, -28, -140); c.fill();
  c.strokeStyle = hexA('#ffffff', .12); c.lineWidth = 2; c.beginPath(); c.arc(0, -150, 18, -2.6, -1.2); c.stroke();
  // 腕とグローブ
  const arms = [['L', -1], ['R', 1]].sort((a, b) => (P[b[0]].z || 1) - (P[a[0]].z || 1));
  for (const [k, sx] of arms) {
    const G = P[k], s0x = sx * 70, s0y = -84;
    const dx = G.x - s0x, dy = G.y - s0y, d = Math.hypot(dx, dy) || 1;
    const bend = Math.max(0, 150 - d) * .5;
    const ex = (s0x + G.x) / 2 + sx * (18 + bend), ey = (s0y + G.y) / 2 + bend * .4 + 10;
    c.strokeStyle = out; c.lineWidth = 28; c.beginPath(); c.moveTo(s0x, s0y); c.lineTo(ex, ey); c.lineTo(G.x, G.y); c.stroke();
    c.strokeStyle = skin; c.lineWidth = 23; c.beginPath(); c.moveTo(s0x, s0y); c.lineTo(ex, ey); c.lineTo(G.x, G.y); c.stroke();
    drawGloveBack(c, G.x, G.y, 27 * (G.z || 1), L.glove, sx);
  }
  // トランクスのウエスト
  c.fillStyle = L.trunk; c.fillRect(-70, 20, 140, 30); c.fillStyle = L.trunk2; c.fillRect(-70, 20, 140, 8);
  c.restore();
}
function drawGloveBack(c, x, y, r, col, sx) {
  c.save(); c.translate(x, y);
  const gg = c.createRadialGradient(sx * r * .2, -r * .3, r * .1, 0, 0, r * 1.2);
  gg.addColorStop(0, shade(col, .4)); gg.addColorStop(.6, col); gg.addColorStop(1, shade(col, -.5));
  c.fillStyle = gg; c.strokeStyle = shade(col, -.7); c.lineWidth = Math.max(1.5, r * .1);
  ell(c, 0, 0, r, r * 1.1); c.fill(); c.stroke();
  c.fillStyle = shade(col, -.15); ell(c, sx * r * .7, r * .1, r * .35, r * .5, -sx * .4); c.fill(); c.stroke();
  c.fillStyle = '#f3ede1'; rrect(c, -r * .6, r * .7, r * 1.2, r * .45, r * .15); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-r * .3, r * .78); c.lineTo(r * .3, r * 1.05); c.moveTo(r * .3, r * .78); c.lineTo(-r * .3, r * 1.05); c.stroke();
  c.restore();
}

/* ---------- ポートレート ---------- */
function portrait(canvas, L, expr = 'idle', opts = {}) {
  const size = canvas.clientWidth || canvas.width || 96;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr);
  const c = canvas.getContext('2d'); c.setTransform(canvas.width / 150, 0, 0, canvas.width / 150, 0, 0);
  c.clearRect(0, 0, 150, 150);
  if (opts.bg !== false) {
    const g = c.createRadialGradient(75, 55, 10, 75, 75, 100); g.addColorStop(0, opts.bg || '#3c4f8e'); g.addColorStop(1, '#101a36');
    c.fillStyle = g; c.fillRect(0, 0, 150, 150);
  }
  if (opts.locked) {
    c.fillStyle = '#0a1024'; c.globalAlpha = 1;
    drawBoxer(c, Object.assign({}, L, { skin: '#0a1024', hairC: '#0a1024', trunk: '#0a1024', trunk2: '#0a1024', glove: '#0a1024', beardC: '#0a1024', accC: '#0a1024', acc2C: '#0a1024', acc: [], eyes: 'none' }), DEF_POSE(), 75, 92, .9, { bust: true, noArms: true, expr: 'idle' });
    c.fillStyle = '#8ea0c8'; c.font = '40px "Dela Gothic One",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 75, 64);
    return;
  }
  drawBoxer(c, L, DEF_POSE(), 75, 92, .9, { bust: true, noArms: true, expr, t: 0 });
}

/* ---------- エフェクト ---------- */
const FX = { parts: [], pops: [], rings: [] };
function fxClear() { FX.parts.length = 0; FX.pops.length = 0; FX.rings.length = 0; }
function fxSpark(x, y, col = '#fff', n = 14, spd = 260) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = spd * (.3 + Math.random() * .7);
    FX.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .4 + Math.random() * .3, max: .7, col, size: 2 + Math.random() * 3, g: 300, type: 'spark' });
  }
}
function fxSweat(x, y, n = 6) {
  for (let i = 0; i < n; i++) FX.parts.push({ x, y, vx: rand(-160, 160), vy: rand(-220, -60), life: .7, max: .7, col: '#bfe6ff', size: rand(2, 4), g: 700, type: 'drop' });
}
function fxStars(x, y, n = 6) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2; FX.parts.push({ x, y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200 - 80, life: .9, max: .9, col: '#ffc53d', size: rand(6, 10), g: 250, type: 'star', rot: rand(0, 6) }); }
}
function fxRing(x, y, col = '#fff', r = 60, dur = .35, w = 6) { FX.rings.push({ x, y, col, r, t: 0, dur, w }); }
function fxPop(x, y, text, col = '#fff', size = 26, dur = .9) { FX.pops.push({ x, y, text, col, size, t: 0, dur }); }
function fxUpdate(dt) {
  for (const p of FX.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= .98; if (p.rot !== undefined) p.rot += dt * 6; }
  FX.parts = FX.parts.filter(p => p.life > 0);
  for (const r of FX.rings) r.t += dt; FX.rings = FX.rings.filter(r => r.t < r.dur);
  for (const p of FX.pops) p.t += dt; FX.pops = FX.pops.filter(p => p.t < p.dur);
}
function fxDraw(c) {
  for (const r of FX.rings) {
    const k = r.t / r.dur; c.strokeStyle = hexA(r.col, 1 - k); c.lineWidth = r.w * (1 - k) + 1;
    c.beginPath(); c.arc(r.x, r.y, r.r * easeOut(k) + 6, 0, Math.PI * 2); c.stroke();
  }
  for (const p of FX.parts) {
    const a = clamp(p.life / p.max, 0, 1); c.globalAlpha = a;
    if (p.type === 'star') { c.fillStyle = p.col; c.save(); c.translate(p.x, p.y); c.rotate(p.rot); star5(c, 0, 0, p.size); c.fill(); c.restore(); }
    else if (p.type === 'drop') { c.fillStyle = p.col; ell(c, p.x, p.y, p.size * .7, p.size); c.fill(); }
    else { c.strokeStyle = p.col; c.lineWidth = p.size; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * .03, p.y - p.vy * .03); c.stroke(); }
  }
  c.globalAlpha = 1;
  for (const p of FX.pops) {
    const k = p.t / p.dur, sc = k < .15 ? backOut(k / .15) : 1;
    c.save(); c.translate(p.x, p.y - 30 * easeOut(k)); c.scale(sc, sc); c.globalAlpha = k > .7 ? 1 - (k - .7) / .3 : 1;
    c.font = `${p.size}px "Dela Gothic One",sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 5; c.strokeStyle = '#070c1c'; c.strokeText(p.text, 0, 0); c.fillStyle = p.col; c.fillText(p.text, 0, 0);
    c.restore();
  }
  c.globalAlpha = 1;
}
function outlineText(c, text, x, y, size, col = '#fff', stroke = '#070c1c', lw = 6, align = 'center') {
  c.font = `${size}px "Dela Gothic One",sans-serif`; c.textAlign = align; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = lw; c.strokeStyle = stroke; c.strokeText(text, x, y); c.fillStyle = col; c.fillText(text, x, y);
}
function bubble(c, x, y, text, col = '#fff', fg = '#101a36', maxW = 250) {
  c.font = '800 15px "M PLUS Rounded 1c",sans-serif';
  const lines = wrapText(c, text, maxW);
  const w = Math.min(maxW, Math.max(...lines.map(l => c.measureText(l).width))) + 24, h = lines.length * 20 + 14;
  let bx = clamp(x - w / 2, 8, W - w - 8), by = y - h;
  c.fillStyle = col; c.strokeStyle = '#070c1c'; c.lineWidth = 3;
  rrect(c, bx, by, w, h, 12); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(clamp(x, bx + 16, bx + w - 16) - 8, by + h - 1); c.lineTo(clamp(x, bx + 16, bx + w - 16), by + h + 12); c.lineTo(clamp(x, bx + 16, bx + w - 16) + 8, by + h - 1); c.fill();
  c.beginPath(); c.moveTo(clamp(x, bx + 16, bx + w - 16) - 8, by + h); c.lineTo(clamp(x, bx + 16, bx + w - 16), by + h + 12); c.lineTo(clamp(x, bx + 16, bx + w - 16) + 8, by + h); c.stroke();
  c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'top';
  lines.forEach((l, i) => c.fillText(l, bx + w / 2, by + 8 + i * 20));
}
function wrapText(c, text, maxW) {
  const out = []; let cur = '';
  for (const ch of String(text)) {
    if (c.measureText(cur + ch).width > maxW - 24 && cur) { out.push(cur); cur = ch; } else cur += ch;
  }
  if (cur) out.push(cur); return out;
}

/* ================= 04. FIGHT ================= */
const STEP = 1 / 60, CLOCK_SCALE = 1.8;
let F = null, SCENE = null, PAUSED = false;
const GETUP_HP = [.72, .56, .42, .32, .25];

function makeOppRuntime(d, ex) {
  const k = ex ? { hp: 1.35, pow: 1.3, spd: 1.2 } : { hp: 1, pow: 1, spd: 1 };
  const cm = [1, 1.4, 1.8, 2.2, 2.3][d.circuit] || 1;
  let hp = d.hp * k.hp * cm, pow = d.pow * k.pow, spd = d.spd * k.spd;
  if (d.isMirror) {
    const dv = derived();
    hp = dv.maxHp * 3.4; pow = .9 + S.stats.pow * .035; spd = 1.1 + S.stats.spd * .015;
  }
  return {
    d, hp, maxHp: hp, dispHp: hp, pow, spd,
    state: 'intro', t: 0, dur: 0, atk: null, queue: [], inSeq: false, missed: false, counterUsed: false,
    guard: 'high', guardT: 1.5, idleT: 1.2, pose: DEF_POSE(), expr: 'idle',
    comboHits: 0, comboLimit: d.combo || 4, rage: false, rageDone: false, pendingRage: false, pendingDizzy: false,
    bodyDmg: 0, kd: 0, kdRound: 0, flash: 0, feinting: false, punish: false, delay: 0, spCool: 3,
    hurtSide: 1, hurtKind: 'face', weaveDir: 1, blockHits: 0, ex
  };
}
function startFight(cfg) {
  const d = cfg.oppId === 'spar' ? SPAR : OPP_BY[cfg.oppId];
  const dv = derived();
  const diff = DIFF[S.settings.diff] || DIFF.normal;
  F = {
    cfg, mode: cfg.mode, d, ex: !!cfg.ex, dv, diff,
    rounds: cfg.rounds || 3, round: 1, clock: cfg.mode === 'spar' ? 30 : (cfg.mode === 'survival' ? 90 : 180),
    phase: 'pre', phaseT: 0, t: 0, hitstop: 0, slow: 1, slowT: 0, shake: 0, flash: 0, flashCol: '#fff', redV: 0,
    big: null, bub: null, count: null, endT: 0, result: null, method: '',
    habit: { dL: 0, dR: 0, duck: 0, guard: 0 },
    stats: { thrown: 0, landed: 0, counters: 0, starsUsed: 0, star3: false, dealt: 0, taken: 0, kdG: 0, kdT: 0, dodges: 0, hitsTaken: 0, maxCombo: 0, combo: 0, time: 0 },
    rs: [], dodgeTips: 0, sparScore: 0, sparHits: 0,
    o: makeOppRuntime(d, cfg.ex),
    p: {
      hp: dv.maxHp, maxHp: dv.maxHp, dispHp: dv.maxHp, sta: dv.maxSta, maxSta: dv.maxSta, stars: 0,
      state: 'idle', t: 0, dur: 0, act: null, hitDone: false, buffer: null, exhausted: 0, cool: 0, inv: 0,
      pose: { x: 0, y: 0, rot: 0, L: { x: -72, y: -150, z: 1 }, R: { x: 72, y: -150, z: 1 } }, kd: 0, kdRound: 0, look: playerLook()
    }
  };
  if (cfg.startHp) F.p.hp = F.p.dispHp = clamp(cfg.startHp, 1, F.p.maxHp);
  F.rs.push({ dealt: 0, taken: 0, kdG: 0, kdT: 0 });
  if (cfg.mode === 'spar') { F.phase = 'intro'; F.phaseT = 0; F.rounds = 1; }
  else if (cfg.mode === 'survival' || cfg.skipIntro) { F.phase = 'intro'; F.phaseT = 0; }
  else { F.bub = { text: d.quotes.intro, t: 0, dur: 3.2 }; }
  fxClear(); inClear(); PAUSED = false; SCENE = 'fight';
  show('scr-game');
  bgm(d.bgm || 'fight');
  updateStarBtn();
}

/* ---------- ポーズ（姿勢）テーブル ---------- */
const GUARD_P = {
  high: { L: { x: -30, y: -40, z: 1.05 }, R: { x: 30, y: -40, z: 1.05 }, y: 0 },
  low:  { L: { x: -38, y: 34, z: 1 },    R: { x: 38, y: 34, z: 1 },    y: 2 },
  full: { L: { x: -15, y: -52, z: 1.2 }, R: { x: 15, y: -52, z: 1.2 }, y: 8 },
  open: { L: { x: -68, y: 62, z: .95 },  R: { x: 68, y: 62, z: .95 },  y: -2 }
};
function windP(kind, s) { // s: -1 画面左 / +1 画面右
  switch (kind) {
    case 'jab':      return { g: { x: s * 46, y: -26, z: .85 }, x: -s * 6, rot: s * .04, sq: 1, y: 0 };
    case 'straight': return { g: { x: s * 40, y: -18, z: .8 }, x: s * 12, rot: s * .07, sq: 1, y: 0 };
    case 'hook':     return { g: { x: s * 124, y: -36, z: .95 }, x: s * 16, rot: -s * .14, sq: 1, y: 0 };
    case 'upper':    return { g: { x: s * 48, y: 96, z: .9 }, x: s * 8, rot: s * .05, sq: .9, y: 16 };
    case 'body':     return { g: { x: s * 76, y: 44, z: .9 }, x: s * 6, rot: s * .06, sq: .96, y: 10 };
    case 'hay':      return { g: { x: s * 156, y: -128, z: .8 }, x: s * 34, rot: s * .24, sq: 1, y: -6 };
  }
}
function strikeP(kind, s) {
  switch (kind) {
    case 'jab':      return { g: { x: s * 16, y: -28, z: 2.3 }, x: s * 4, rot: -s * .02, sq: 1, y: 0 };
    case 'straight': return { g: { x: s * 6, y: -24, z: 2.6 }, x: -s * 10, rot: -s * .08, sq: 1, y: -4 };
    case 'hook':     return { g: { x: -s * 12, y: -40, z: 2.1 }, x: -s * 18, rot: s * .12, sq: 1, y: 0 };
    case 'upper':    return { g: { x: s * 8, y: -96, z: 2.2 }, x: -s * 4, rot: -s * .05, sq: 1.04, y: -12 };
    case 'body':     return { g: { x: s * 18, y: 92, z: 2.0 }, x: -s * 6, rot: -s * .05, sq: .95, y: 12 };
    case 'hay':      return { g: { x: -s * 22, y: -12, z: 3.0 }, x: -s * 28, rot: -s * .22, sq: 1, y: 0 };
  }
}
function copyG(g) { return { x: g.x, y: g.y, z: g.z }; }
function oppPoseTarget(o) {
  const P = DEF_POSE(), t = F.t, gp = GUARD_P[o.guard] || GUARD_P.high;
  P.L = copyG(gp.L); P.R = copyG(gp.R); P.y = gp.y;
  const bob = Math.sin(t * 4.2) * 3;
  let rate = 12;
  o.expr = 'idle';
  switch (o.state) {
    case 'pre': case 'intro': case 'idle':
      P.y += bob; P.L.y += Math.sin(t * 4.2 + 1) * 4; P.R.y += Math.sin(t * 4.2 + 2) * 4; P.x = Math.sin(t * 1.3) * 6;
      if (o.rage) { P.x += Math.sin(t * 40) * 2; o.expr = 'angry'; }
      break;
    case 'windup': {
      const a = o.atk, s = a.side === 'L' ? -1 : 1, k = clamp(o.t / o.dur, 0, 1);
      const w = windP(a.kind, s), ke = easeOut(Math.min(1, k / .62));
      const G = a.side === 'L' ? P.L : P.R;
      G.x = lerp(G.x, w.g.x, ke); G.y = lerp(G.y, w.g.y, ke); G.z = lerp(G.z, w.g.z, ke);
      P.x = w.x * ke; P.rot = w.rot * ke; P.sq = lerp(1, w.sq, ke); P.y += w.y * ke;
      if (k > .6) { const tr = (k - .6) * 6; G.x += Math.sin(t * 60) * tr; P.x += Math.sin(t * 55) * tr * .5; }
      o.expr = a.kind === 'hay' || a.kind === 'upper' ? 'angry' : 'idle';
      rate = k > .6 ? 22 : 14; break;
    }
    case 'strike': {
      const a = o.atk, s = a.side === 'L' ? -1 : 1, w = strikeP(a.kind, s);
      const G = a.side === 'L' ? P.L : P.R; Object.assign(G, w.g);
      P.x = w.x; P.rot = w.rot; P.sq = w.sq; P.y += w.y; o.expr = 'angry'; rate = 45; break;
    }
    case 'gap': rate = 26; P.y += 2; break;
    case 'recover':
      if (o.missed) {
        const s = o.atk && o.atk.side === 'L' ? -1 : 1;
        P.x = -s * 22; P.rot = -s * .1; P.L = { x: -52, y: 30, z: .95 }; P.R = { x: 52, y: 30, z: .95 };
        P.hy = 4; o.expr = 'shock'; rate = 10;
      } else { rate = 16; }
      break;
    case 'hurt': {
      const s = o.hurtSide; o.expr = 'hurt'; rate = 30;
      if (o.hurtKind === 'face') { P.hx = s * 16; P.hy = -4; P.hr = s * .22; P.rot = s * .05; P.L = { x: -60, y: -6, z: .95 }; P.R = { x: 60, y: -6, z: .95 }; P.x = s * 10; }
      else { P.sq = .9; P.y = 14; P.hy = 10; P.L = { x: -30, y: 52, z: .95 }; P.R = { x: 30, y: 52, z: .95 }; P.x = s * 6; }
      break;
    }
    case 'guardUp': P.L = copyG(GUARD_P.full.L); P.R = copyG(GUARD_P.full.R); P.y = 10; P.sq = .96; rate = 24; break;
    case 'weave': P.x = o.weaveDir * 76; P.rot = o.weaveDir * .14; P.y = 8; rate = 22; break;
    case 'taunt': {
      P.L = copyG(GUARD_P.open.L); P.R = { x: 60 + Math.sin(t * 9) * 10, y: -30 + Math.sin(t * 9) * 16, z: 1 };
      P.hx = Math.sin(t * 5) * 8; P.hr = Math.sin(t * 5) * .1; P.y = bob; o.expr = 'smug'; rate = 12; break;
    }
    case 'shout': P.L = { x: -70, y: -96, z: 1 }; P.R = { x: 70, y: -96, z: 1 }; P.x = Math.sin(t * 50) * 3; P.hy = -6; o.expr = 'shout'; rate = 14; break;
    case 'rageUp': P.L = { x: -86, y: -60, z: 1 }; P.R = { x: 86, y: -60, z: 1 }; P.sq = 1.04; P.x = Math.sin(t * 60) * 4; o.expr = 'shout'; rate = 12; break;
    case 'dizzy': P.x = Math.sin(t * 3) * 30; P.rot = Math.sin(t * 3) * .12; P.hr = Math.sin(t * 3 + 1) * .2; P.L = { x: -50, y: 60, z: .95 }; P.R = { x: 50, y: 60, z: .95 }; P.y = 6; o.expr = 'dizzy'; rate = 8; break;
    case 'down': { const k = clamp(o.t / .7, 0, 1); P.y = easeIn(k) * 250; P.rot = o.hurtSide * .5 * k; P.L = { x: -80, y: -60, z: 1 }; P.R = { x: 80, y: -50, z: 1 }; o.expr = 'ko'; rate = 16; break; }
    case 'getup': { const k = clamp(o.t / .9, 0, 1); P.y = (1 - easeOut(k)) * 250; P.rot = o.hurtSide * .3 * (1 - k); o.expr = 'hurt'; rate = 16; break; }
    case 'win': P.L = { x: -76, y: -128, z: 1 }; P.R = { x: 76, y: -128, z: 1 }; P.y = bob * 2; o.expr = 'grin'; rate = 8; break;
    case 'ko': { const k = clamp(o.t / 1.2, 0, 1); P.y = easeIn(k) * 330; P.rot = o.hurtSide * .7 * k; P.hr = o.hurtSide * .4; P.L = { x: -100, y: -90, z: 1 }; P.R = { x: 96, y: -70, z: 1 }; o.expr = 'ko'; rate = 12; break; }
  }
  if (o.d.id === 'spar' && o.state !== 'windup' && o.state !== 'strike') { P.L = copyG(GUARD_P.full.L); P.R = copyG(GUARD_P.full.R); }
  return { P, rate };
}
function blendPose(cur, tgt, k) {
  for (const key of ['x', 'y', 'rot', 'sq', 'hx', 'hy', 'hr']) cur[key] = lerp(cur[key] || (key === 'sq' ? 1 : 0), tgt[key] === undefined ? (key === 'sq' ? 1 : 0) : tgt[key], k);
  for (const g of ['L', 'R']) { cur[g].x = lerp(cur[g].x, tgt[g].x, k); cur[g].y = lerp(cur[g].y, tgt[g].y, k); cur[g].z = lerp(cur[g].z, tgt[g].z, k); }
}
function playerPoseTarget(p) {
  const t = F.t, P = { x: 0, y: 0, rot: 0, L: { x: -72, y: -150, z: 1 }, R: { x: 72, y: -150, z: 1 } };
  let rate = 16;
  const bob = Math.sin(t * 4) * 3;
  P.y = bob; P.L.y += Math.sin(t * 4 + 1) * 3; P.R.y += Math.sin(t * 4 + 2) * 3;
  if (p.exhausted > 0) { P.L.y += 40; P.R.y += 40; P.y += 8; }
  const k = p.dur ? clamp(p.t / p.dur, 0, 1) : 0;
  switch (p.state) {
    case 'guard': P.L = { x: -28, y: -214, z: 1.22 }; P.R = { x: 28, y: -214, z: 1.22 }; P.y = 6; rate = 26; break;
    case 'punch': {
      const face = p.act === 'lf' || p.act === 'rf', left = p.act === 'lf' || p.act === 'lb';
      const e = k < .42 ? easeOut(k / .42) : 1 - easeIn((k - .42) / .58);
      const G = left ? P.L : P.R, s = left ? -1 : 1;
      const tx = s * 24 + (F.o.pose.x + (face ? F.o.pose.hx || 0 : 0)) * .8, ty = face ? -340 + (F.o.pose.y || 0) * .6 : -262 + (F.o.pose.y || 0) * .5;
      G.x = lerp(G.x, tx, e); G.y = lerp(G.y, ty, e); G.z = lerp(1, face ? .5 : .56, e);
      P.x = s * 14 * e; P.rot = s * .05 * e; rate = 40; break;
    }
    case 'special': {
      if (k < .5) { const e = easeOut(k / .5); P.R = { x: lerp(72, 118, e), y: lerp(-150, -30, e), z: 1.2 }; P.y = 30 * e; P.rot = .12 * e; P.L.x = -60; rate = 20; }
      else { const e = easeOut(clamp((k - .5) / .2, 0, 1)); P.R = { x: lerp(118, 6, e), y: lerp(-30, -360, e), z: lerp(1.2, .52, e) }; P.y = lerp(30, -14, e); P.rot = lerp(.12, -.12, e); rate = 44; }
      break;
    }
    case 'dodge': { const s = p.act === 'dL' ? -1 : 1, e = k < .7 ? easeOut(Math.min(1, k / .3)) : 1 - easeIO((k - .7) / .3); P.x = s * 138 * e; P.rot = s * .24 * e; P.y += 18 * e; rate = 30; break; }
    case 'duck': { const e = k < .72 ? easeOut(Math.min(1, k / .25)) : 1 - easeIO((k - .72) / .28); P.y += 118 * e; P.L.y += 10 * e; P.R.y += 10 * e; rate = 30; break; }
    case 'hurt': P.y += 16; P.rot = Math.sin(t * 50) * .05; P.x = Math.sin(t * 40) * 8; rate = 30; break;
    case 'down': { P.y = 280 * easeIn(clamp(p.t / .6, 0, 1)); P.rot = .35; rate = 14; break; }
    case 'getup': { P.y = 280 * (1 - easeOut(clamp(p.t / .8, 0, 1))); rate = 14; break; }
    case 'win': P.L = { x: -80, y: -300, z: .9 }; P.R = { x: 80, y: -300, z: .9 }; P.y = bob * 2; rate = 8; break;
    case 'lose': P.y = 260; P.rot = .3; rate = 6; break;
  }
  return { P, rate };
}

/* ---------- プレイヤー行動 ---------- */
function pCanAct(p) { return p.state === 'idle' || p.state === 'guard'; }
function pStart(act) {
  const p = F.p, dv = F.dv;
  if (act === 'dL' || act === 'dR' || act === 'duck') {
    if (p.cool > 0) return false;
    p.state = act === 'duck' ? 'duck' : 'dodge'; p.act = act; p.t = 0; p.dur = .5;
    p.inv = Math.min(p.dur * .95, p.dur * .86 * dv.dodgeWin);
    sfx('step'); return true;
  }
  if (act === 'lf' || act === 'rf' || act === 'lb' || act === 'rb') {
    if (p.exhausted > 0 || p.sta < 1) { fxPop(PX + (act[0] === 'l' ? -70 : 70), 400, 'スタミナ切れ', '#8ea0c8', 16, .6); sfx('miss'); return false; }
    p.state = 'punch'; p.act = act; p.t = 0; p.dur = .3 * dv.spdMul; p.hitDone = false;
    p.sta -= 1.6; sfx('whoosh'); return true;
  }
  if (act === 'star') {
    if (p.stars <= 0) { sfx('error'); return false; }
    p.state = 'special'; p.act = 'star'; p.t = 0; p.dur = .78; p.hitDone = false; p.specialN = p.stars; p.stars = 0;
    updateStarBtn(); sfx('charge'); fxRing(PX + 100, 470, '#ffc53d', 70, .4, 8); return true;
  }
  return false;
}
function pUpdate(dt) {
  const p = F.p, dv = F.dv;
  p.t += dt;
  if (p.cool > 0) p.cool -= dt;
  if (p.exhausted > 0) { p.exhausted -= dt; if (p.exhausted <= 0) { p.sta = p.maxSta * .35; } }
  else if (p.state !== 'punch') p.sta = Math.min(p.maxSta, p.sta + dv.staRegen * dt * (p.state === 'guard' ? .6 : 1));
  if (p.sta <= 0 && p.exhausted <= 0) { p.sta = 0; p.exhausted = 2.6; fxPop(PX, 380, 'スタミナ切れ！', '#8ea0c8', 22, 1.2); sfx('error'); }
  // 入力
  let a;
  while ((a = inTake()) !== undefined) {
    if (F.phase === 'down' && F.count && F.count.who === 'p') { if (a !== 'guard') mashUp(); continue; }
    if (F.phase !== 'fight') continue;
    if (a === 'guard') continue;
    if (pCanAct(p)) pStart(a);
    else if ((p.state === 'punch' || p.state === 'dodge' || p.state === 'duck') && p.t / p.dur > .5) p.buffer = a;
  }
  if (F.phase !== 'fight') { if (p.state === 'guard') p.state = 'idle'; return; }
  switch (p.state) {
    case 'idle': if (IN.held.guard) { p.state = 'guard'; p.t = 0; } break;
    case 'guard': if (!IN.held.guard) p.state = 'idle'; break;
    case 'punch':
      if (!p.hitDone && p.t >= p.dur * .42) { p.hitDone = true; pPunchLand(p.act); }
      if (p.t >= p.dur) pEnd();
      break;
    case 'special':
      if (!p.hitDone && p.t >= p.dur * .55) { p.hitDone = true; pStarLand(p.specialN); }
      if (p.t >= p.dur) pEnd();
      break;
    case 'dodge': case 'duck':
      if (p.t >= p.dur) { p.cool = .08; pEnd(); }
      break;
    case 'hurt': if (p.t >= p.dur) pEnd(); break;
    case 'getup': if (p.t >= .8) pEnd(); break;
  }
}
function pEnd() {
  const p = F.p; p.state = 'idle'; p.t = 0; p.act = null;
  if (p.buffer) { const b = p.buffer; p.buffer = null; pStart(b); }
}
function updateStarBtn() {
  const b = $('.pb-star'); if (!b || !F) return;
  b.classList.toggle('ready', F.p.stars > 0);
  b.querySelector('b').textContent = F.p.stars > 0 ? '★'.repeat(F.p.stars) : '★';
}

/* ---------- 自分のパンチ判定 ---------- */
function oppHeadPos() { const o = F.o; return { x: OX + o.pose.x + (o.pose.hx || 0), y: OY + o.pose.y - 54 + (o.pose.hy || 0) }; }
function oppBodyPos() { const o = F.o; return { x: OX + o.pose.x, y: OY + o.pose.y + 64 }; }
function pPunchLand(act) {
  const o = F.o, p = F.p, face = act === 'lf' || act === 'rf';
  const side = (act === 'lf' || act === 'lb') ? 1 : -1;
  F.stats.thrown++; S.st.punches++;
  const pos = face ? oppHeadPos() : oppBodyPos();
  pos.x -= side * 18;
  if (F.mode === 'spar') { oppBlock(pos, true); return; }
  switch (o.state) {
    case 'pre': case 'intro': case 'down': case 'getup': case 'win': case 'ko': case 'weave':
      sfx('miss'); F.stats.combo = 0; return;
    case 'guardUp': case 'gap': oppBlock(pos); return;
    case 'dizzy': landHit(face, side, 1.25, false, pos); return;
    case 'windup':
      if (o.feinting || o.atk.intr) { landHit(face, side, F.dv.counterMul, true, pos, true); return; }
      landHit(face, side, .5, false, pos, false, true); return;
    case 'taunt': landHit(face, side, F.dv.counterMul, true, pos, true); return;
    case 'shout': case 'rageUp': case 'strike': landHit(face, side, 1, false, pos, false, true); return;
    case 'recover':
      if (o.missed && !o.counterUsed) { o.counterUsed = true; landHit(face, side, F.dv.counterMul, chance(F.dv.starChance), pos, true); }
      else landHit(face, side, 1, false, pos);
      return;
    case 'hurt':
      if (o.comboHits >= o.comboLimit) { o.state = 'guardUp'; o.t = 0; o.dur = .6; o.comboHits = 0; o.guard = 'full'; oppBlock(pos); return; }
      landHit(face, side, 1, false, pos); return;
    case 'idle': {
      const g = o.guard;
      const blocked = g === 'full' || (g === 'high' && face) || (g === 'low' && !face);
      if (blocked) { oppBlock(pos); return; }
      if (chance(o.d.evade * (F.ex ? 1.2 : 1))) { o.state = 'weave'; o.t = 0; o.dur = .42; o.weaveDir = side; sfx('miss'); fxPop(pos.x, pos.y - 20, 'MISS', '#8ea0c8', 18, .5); F.stats.combo = 0; return; }
      landHit(face, side, 1, false, pos); return;
    }
  }
}
function oppBlock(pos, soft) {
  const o = F.o, p = F.p;
  sfx('block'); fxSpark(pos.x, pos.y, '#c9d6ff', 6, 160);
  p.sta -= soft ? 0 : 3; F.stats.combo = 0;
  if (F.mode === 'spar' || soft) return;
  o.blockHits++;
  if (o.state === 'idle' && (chance(o.d.cob * (F.ex ? 1.3 : 1)) || o.blockHits >= 4)) {
    o.blockHits = 0; oppQuickCounter();
  } else if (o.state === 'idle' && o.blockHits >= 2 && chance(.4)) { o.guard = pick(['high', 'low', 'full']); }
}
function oppQuickCounter() {
  const o = F.o, keys = Object.keys(o.d.moves).filter(k => /^(jab|str)/.test(k));
  startAttack(keys.length ? pick(keys) : 'jabL', .58);
  fxPop(OX, OY - 120, 'カウンター注意！', '#ff7b74', 16, .6);
}
function landHit(face, side, mult, star, pos, isCounter, armored) {
  const o = F.o, p = F.p;
  let dmg = (face ? 4.2 : 3.7) * F.dv.dmgMul * mult * rand(.9, 1.1);
  if (!face && !armored) o.bodyDmg += dmg;
  if (!face) dmg *= .92;
  o.hp -= dmg; F.stats.dealt += dmg; F.rs[F.round - 1].dealt += dmg;
  F.stats.landed++; S.st.landed++; F.stats.combo++; F.stats.maxCombo = Math.max(F.stats.maxCombo, F.stats.combo);
  o.flash = 1;
  if (isCounter) {
    F.stats.counters++; S.st.counters++;
    sfx('counter'); fxSpark(pos.x, pos.y, '#ffe07a', 22, 380); fxRing(pos.x, pos.y, '#ffc53d', 70, .35, 8);
    fxPop(pos.x, pos.y - 30, 'COUNTER!', '#ffc53d', 26, .8);
    F.hitstop = .09; F.shake = Math.max(F.shake, 7);
    if (star && p.stars < 3) { p.stars++; sfx('star'); fxStars(pos.x, pos.y, 5); fxPop(PX - 150, 470, '★ GET!', '#ffc53d', 22, .8); updateStarBtn(); }
  } else {
    sfx(face ? (chance(.5) ? 'hit' : 'hit2') : 'body'); fxSpark(pos.x, pos.y, face ? '#ffffff' : '#bfe6ff', 12, 260);
    F.hitstop = .045; F.shake = Math.max(F.shake, 3);
    if (F.stats.combo >= 3) fxPop(pos.x + 40, pos.y - 40, F.stats.combo + ' HIT', '#9fd3ff', 16, .5);
  }
  if (chance(.25)) fxSweat(pos.x, pos.y, 4);
  if (armored) { fxPop(pos.x, pos.y - 30, 'ARMOR', '#c9d6ff', 14, .5); if (o.hp <= 0) oppDown(side); return; }
  o.hurtSide = side; o.hurtKind = face ? 'face' : 'body';
  if (o.state === 'windup' || o.state === 'taunt' || o.state === 'recover') { o.queue = []; o.inSeq = false; o.feinting = false; }
  if (o.state !== 'hurt') o.comboHits = 0;
  o.comboHits++;
  o.state = 'hurt'; o.t = 0; o.dur = isCounter ? .42 : .3;
  if (o.d.rage && !o.rageDone && o.hp / o.maxHp <= o.d.rage && o.hp > 0) o.pendingRage = true;
  if (o.hp <= 0) oppDown(side);
  else if (chance(.07) && o.d.quotes.hurt) F.bub = { text: o.d.quotes.hurt, t: 0, dur: 1.2 };
}
function pStarLand(n) {
  const o = F.o, p = F.p, pos = oppHeadPos();
  F.stats.starsUsed += n; S.st.stars += n;
  if (n >= 3) F.stats.star3 = true;
  if (['pre', 'intro', 'down', 'getup', 'win', 'ko', 'weave'].includes(o.state)) { sfx('miss'); fxPop(pos.x, pos.y, 'MISS...', '#8ea0c8', 22, .7); return; }
  let mult = 1;
  const guarded = o.state === 'guardUp' || o.state === 'gap' || (o.state === 'idle' && o.guard === 'full');
  if (guarded) mult = .5;
  if (o.state === 'windup' || o.state === 'recover' || o.state === 'taunt') mult = 1.2;
  let dmg = [24, 40, 62][n - 1] * F.dv.dmgMul * mult;
  if (F.mode === 'spar') dmg = 0;
  o.hp -= dmg; F.stats.dealt += dmg; F.rs[F.round - 1].dealt += dmg; F.stats.landed++; S.st.landed++;
  o.flash = 1.4; o.hurtSide = -1; o.hurtKind = 'face';
  sfx('special'); vib(40);
  fxSpark(pos.x, pos.y, '#ffc53d', 30 + n * 10, 480); fxStars(pos.x, pos.y, 4 + n * 3); fxRing(pos.x, pos.y, '#ffffff', 100 + n * 30, .5, 12);
  fxPop(pos.x, pos.y - 40, guarded ? 'ガードの上から！' : ['STAR PUNCH!', 'DOUBLE STAR!!', 'TRIPLE STAR!!!'][n - 1], '#ffc53d', guarded ? 20 : 26 + n * 3, 1);
  F.hitstop = .12 + n * .04; F.shake = 10 + n * 4; F.flash = .5; F.flashCol = '#fff5c0';
  o.queue = []; o.inSeq = false; o.feinting = false;
  o.state = 'hurt'; o.t = 0; o.dur = .5; o.comboHits = 0;
  if (n >= 2 && !guarded) o.pendingDizzy = true;
  if (o.d.rage && !o.rageDone && o.hp / o.maxHp <= o.d.rage && o.hp > 0) o.pendingRage = true;
  if (o.hp <= 0) oppDown(-1);
}

/* ---------- 相手AI ---------- */
function oppSpeed(o) { return o.spd * F.diff.spd * (o.rage ? 1.18 : 1); }
function startAttack(key, speedMul = 1) {
  const o = F.o, a = ATK[key] || ATK.jabL;
  const bodySlow = 1 + Math.min(.3, o.bodyDmg / o.maxHp * .8);
  o.atk = a; o.state = 'windup'; o.t = 0; o.feinting = false;
  o.dur = Math.max(.2, a.wind / oppSpeed(o) * bodySlow * speedMul);
  o.delay = (o.d.delay && !o.inSeq && chance(.35)) ? .38 : 0; o.delayDone = false;
  o.missed = false; o.counterUsed = false;
}
function adaptMoves(o) {
  const m = Object.assign({}, o.d.moves);
  if (!o.d.adaptive) return m;
  const h = F.habit, tot = h.dL + h.dR + h.duck + h.guard;
  if (tot < 4) return m;
  let top = 'dL'; for (const k in h) if (h[k] > h[top]) top = k;
  const share = h[top] / tot;
  if (share < .4) return m;
  for (const k in m) m[k] *= ATK[k].avoid.includes(top) ? .3 : 1.7;
  return m;
}
function oppDecide() {
  const o = F.o, d = o.d;
  if (F.mode === 'spar') { const k = wpick(d.moves); startAttack(k); if (chance(d.feint)) o.feinting = true; return; }
  if (o.punish) { o.punish = false; const ks = Object.keys(d.moves).filter(k => /^(jab|str)/.test(k)); startAttack(ks.length ? pick(ks) : 'jabL', .55); F.bub = { text: pick(['見え見えや！', 'かかったな！', 'そこだ！']), t: 0, dur: .9 }; return; }
  if (o.spCool <= 0) for (const sp of d.specials) {
    if (sp.rage && !o.rage) continue;
    if (o.hp / o.maxHp <= sp.hp && chance(sp.ch * (F.ex ? 1.2 : 1))) { startSpecial(sp); return; }
  }
  if (d.taunt && chance(d.taunt * (o.rage ? .4 : 1))) { o.state = 'taunt'; o.t = 0; o.dur = 1.3; F.bub = { text: pick(d.quotes.taunt), t: 0, dur: 1.2 }; o.guard = 'open'; return; }
  if (d.combos.length && chance(o.rage ? .45 : .28)) { const cb = pick(d.combos); o.queue = cb.slice(1); startAttack(cb[0]); return; }
  const key = wpick(adaptMoves(o));
  startAttack(key);
  if (chance(d.feint)) o.feinting = true;
}
function startSpecial(sp) {
  const o = F.o;
  o.state = 'shout'; o.t = 0; o.dur = 1.15; o.queue = sp.seq.slice(); o.inSeq = true; o.spCool = 9;
  F.bub = { text: sp.shout, t: 0, dur: 1.4, hot: true };
  F.big = { text: sp.name, col: '#ff7b74', t: 0, dur: 1.2, size: 30, y: 140 };
  sfx('charge');
}
function oUpdate(dt) {
  const o = F.o, d = o.d;
  o.t += dt; if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 6);
  if (o.spCool > 0) o.spCool -= dt;
  o.dispHp = lerp(o.dispHp, Math.max(0, o.hp), Math.min(1, dt * 3));
  if (F.phase !== 'fight') return;
  switch (o.state) {
    case 'intro': case 'pre': o.state = 'idle'; o.idleT = .9; break;
    case 'idle':
      o.guardT -= dt;
      if (o.guardT <= 0) { o.guard = wpick(d.guard); o.guardT = rand(.8, 2.2); }
      o.idleT -= dt;
      if (o.idleT <= 0) oppDecide();
      break;
    case 'windup':
      if (o.delay > 0 && !o.delayDone && o.t >= o.dur * .6) { o.delay -= dt; o.t -= dt; if (o.delay <= 0) o.delayDone = true; break; }
      if (o.feinting && o.t >= o.dur * .6) {
        o.state = 'idle'; o.idleT = rand(.25, .5); o.feinting = false;
        const p = F.p; if (p.state === 'dodge' || p.state === 'duck') { o.punish = true; o.idleT = .12; }
        break;
      }
      if (o.t >= o.dur) resolveOppHit();
      break;
    case 'strike':
      if (o.t >= o.dur) {
        if (o.queue.length) { o.state = 'gap'; o.t = 0; o.dur = o.missed ? .14 : .12; }
        else {
          o.state = 'recover'; o.t = 0;
          o.dur = o.missed ? o.atk.rec / Math.sqrt(oppSpeed(o)) * (o.inSeq ? 1.3 : 1) * (F.ex ? .9 : 1) : .32;
          o.inSeq = false;
        }
      }
      break;
    case 'gap': if (o.t >= o.dur) startAttack(o.queue.shift(), o.inSeq ? .78 : .85); break;
    case 'recover': if (o.t >= o.dur) { o.state = 'idle'; o.idleT = rand(.3, .8) * d.idle * F.diff.idle; } break;
    case 'hurt':
      if (o.t >= o.dur) {
        if (o.pendingRage) { o.pendingRage = false; o.rageDone = true; o.state = 'rageUp'; o.t = 0; o.dur = 1.3; F.bub = { text: d.quotes.rage || '！！', t: 0, dur: 1.4, hot: true }; sfx('rage'); F.shake = 6; }
        else if (o.pendingDizzy) { o.pendingDizzy = false; o.state = 'dizzy'; o.t = 0; o.dur = 1.8; }
        else if (o.comboHits >= o.comboLimit) { o.state = 'guardUp'; o.t = 0; o.dur = .7; o.comboHits = 0; }
        else { o.state = 'idle'; o.idleT = rand(.25, .55); o.guard = chance(.5) ? 'high' : 'full'; o.guardT = rand(.6, 1.4); }
        if (o.state !== 'hurt') F.stats.combo = 0;
      }
      break;
    case 'guardUp': if (o.t >= o.dur) { if (chance(.5)) oppQuickCounter(); else { o.state = 'idle'; o.idleT = .4; } } break;
    case 'weave': if (o.t >= o.dur) { if (chance(.45)) oppQuickCounter(); else { o.state = 'idle'; o.idleT = .5; } } break;
    case 'taunt': if (o.t >= o.dur) { o.state = 'idle'; o.idleT = .5; o.guard = 'high'; } break;
    case 'shout': if (o.t >= o.dur) startAttack(o.queue.shift(), .8); break;
    case 'rageUp': if (o.t >= o.dur) { o.rage = true; o.state = 'idle'; o.idleT = .4; } break;
    case 'dizzy': if (o.t >= o.dur) { o.state = 'idle'; o.idleT = .5; } break;
    case 'getup': if (o.t >= 1) { o.state = 'idle'; o.idleT = 1; } break;
  }
}

/* ---------- 相手の攻撃が届いた瞬間 ---------- */
function resolveOppHit() {
  const o = F.o, p = F.p, a = o.atk;
  let res = 'hit';
  if (p.state === 'dodge' && p.t <= p.inv && a.avoid.includes(p.act)) res = 'dodge';
  else if (p.state === 'duck' && p.t <= p.inv && a.avoid.includes('duck')) res = 'dodge';
  else if (p.state === 'guard') res = a.avoid.includes('guard') ? 'fullblock' : 'block';
  else if (p.state === 'down' || p.state === 'getup') res = 'none';
  // 癖の記録
  if (p.state === 'dodge' || p.state === 'duck') F.habit[p.act]++; else if (p.state === 'guard') F.habit.guard++;
  o.state = 'strike'; o.t = 0; o.dur = .18;
  if (res === 'dodge') {
    o.missed = true; o.counterUsed = false; F.stats.dodges++;
    p.sta = Math.min(p.maxSta, p.sta + 4);
    sfx('miss');
    if (F.mode === 'spar') { F.sparScore++; fxPop(PX + (p.act === 'dL' ? -120 : p.act === 'dR' ? 120 : 0), 330, 'GOOD!', '#34c77b', 22, .6); sfx('good'); }
    else if (S.settings.guide && F.dodgeTips < 3 && !o.queue.length) { F.dodgeTips++; fxPop(OX, OY - 150, 'いまや！打て！', '#ffc53d', 20, .8); }
  } else if (res === 'block' || res === 'fullblock') {
    const chip = res === 'block' ? a.dmg * o.pow * F.diff.pow * a.block * F.dv.defMul : 0;
    if (F.mode !== 'spar') { p.hp -= chip; F.stats.taken += chip; F.rs[F.round - 1].taken += chip; }
    p.sta -= res === 'block' ? 4 : 2;
    sfx('block'); fxSpark(PX, 350, '#c9d6ff', 10, 220); F.shake = Math.max(F.shake, 2);
    if (F.mode === 'spar' && res === 'fullblock') { F.sparScore++; fxPop(PX, 330, 'GUARD!', '#34c77b', 20, .6); }
    if (p.hp <= 0) playerDown();
  } else if (res === 'hit') {
    let dmg = a.dmg * o.pow * F.diff.pow * F.dv.defMul * rand(.9, 1.1);
    if (a.kind === 'upper' && p.state === 'duck') { dmg *= 1.3; fxPop(PX, 300, 'ダッキング狩り！', '#ff5a5a', 18, .8); }
    F.stats.hitsTaken++; F.stats.combo = 0;
    if (F.mode === 'spar') { F.sparHits++; dmg = 0; fxPop(PX, 330, 'HIT…', '#ff7b74', 20, .6); }
    p.hp -= dmg; F.stats.taken += dmg; F.rs[F.round - 1].taken += dmg;
    if (p.stars > 0 && F.mode !== 'spar') { p.stars--; updateStarBtn(); fxPop(PX - 150, 470, '★ LOST', '#8ea0c8', 18, .7); }
    p.sta -= 5;
    p.state = 'hurt'; p.t = 0; p.dur = .35; p.buffer = null; p.act = null;
    const heavy = a.dmg >= 14;
    sfx(heavy ? 'heavy' : 'hurt'); vib(heavy ? 60 : 25);
    F.shake = heavy ? 14 : 8; F.redV = heavy ? 1 : .7; F.hitstop = heavy ? .08 : .05;
    fxSpark(W / 2 + rand(-40, 40), 330 + rand(-30, 30), '#ff8a80', 16, 320);
    if (p.hp <= 0) playerDown();
  }
}

/* ---------- ダウン / カウント ---------- */
function oppDown(side) {
  const o = F.o;
  o.hp = 0; o.kd++; o.kdRound++; F.stats.kdG++; F.rs[F.round - 1].kdG++; S.st.kds++;
  o.state = 'down'; o.t = 0; o.hurtSide = side || 1; o.queue = []; o.inSeq = false;
  sfx('down'); vib(80); F.slow = .25; F.slowT = .7; F.shake = 12; F.flash = .6; F.flashCol = '#ffffff';
  F.p.state = 'idle'; F.p.buffer = null; inClear();
  if (o.kdRound >= 3 && F.mode !== 'spar') { F.big = { text: 'T.K.O.!!', col: '#ffc53d', t: 0, dur: 3, size: 64 }; endFight('win', 'TKO'); return; }
  const arr = o.d.getUp; let getAt = arr[Math.min(o.kd - 1, arr.length - 1)];
  if (F.ex && getAt < 10) getAt = Math.min(9, getAt + 1);
  if (F.cfg.mode === 'survival' && o.kd >= 2) getAt = 10;
  F.big = { text: 'DOWN!', col: '#ffffff', t: 0, dur: 1.4, size: 64 };
  F.phase = 'down'; F.count = { who: 'o', n: 0, t: -1.4, getAt };
}
function playerDown() {
  const p = F.p;
  p.hp = 0; p.kd++; p.kdRound++; F.stats.kdT++; F.rs[F.round - 1].kdT++; S.st.downs++;
  p.state = 'down'; p.t = 0; p.buffer = null; p.stars = 0; updateStarBtn();
  sfx('down'); vib([80, 40, 120]); F.slow = .3; F.slowT = .6; F.shake = 16; F.redV = 1;
  const o = F.o; o.queue = []; o.inSeq = false; o.state = 'win'; o.t = 0;
  if (p.kdRound >= 3) { F.big = { text: 'T.K.O.', col: '#8ea0c8', t: 0, dur: 3, size: 60 }; endFight('lose', 'TKO'); return; }
  const need = clamp(10 + 7 * (p.kd - 1) - F.dv.getupBonus, 6, 40);
  F.big = { text: 'DOWN!', col: '#ff5a5a', t: 0, dur: 1.4, size: 64 };
  F.phase = 'down'; F.count = { who: 'p', n: 0, t: -1.4, need, mash: 0, up: false };
  inClear();
}
function mashUp() {
  const c = F.count; if (!c || c.who !== 'p' || c.up) return;
  c.mash = Math.min(1, c.mash + 1 / c.need); sfx('beep');
  fxPop(W / 2 + rand(-60, 60), 420 + rand(-20, 20), 'ぐっ！', '#ffc53d', 16, .4);
  if (c.mash >= 1) c.up = true;
}
function countUpdate(dt) {
  const c = F.count; if (!c) return;
  if (c.who === 'p') c.mash = Math.max(0, c.mash - (c.up ? 0 : .16 * dt));
  c.t += dt;
  if (c.t >= .9) {
    c.t -= .9; c.n++;
    sfx('count'); F.big = { text: String(c.n), col: c.n >= 8 ? '#ff5a5a' : '#ffffff', t: 0, dur: .8, size: 90, count: true };
    if (c.who === 'o') {
      if (c.n >= 10) { F.big = { text: 'K.O.!!', col: '#ffc53d', t: 0, dur: 3, size: 80 }; F.o.state = 'ko'; F.o.t = 0; endFight('win', 'KO'); return; }
      if (c.n >= c.getAt) {
        const o = F.o; o.state = 'getup'; o.t = 0; o.hp = o.maxHp * GETUP_HP[Math.min(o.kd - 1, 4)];
        if (F.ex) o.hp *= 1.1;
        o.comboHits = 0; o.guard = 'high';
        F.count = null; F.phase = 'fight'; F.big = { text: 'FIGHT!', col: '#ffc53d', t: 0, dur: .8, size: 54 };
        F.p.sta = F.p.maxSta; F.p.exhausted = 0;
        if (chance(.5) && o.d.quotes.hurt) F.bub = { text: pick(['まだまだ…！', 'やるやないか…', o.d.quotes.hurt]), t: 0, dur: 1.3 };
      }
    } else {
      if (c.up) {
        const p = F.p; p.state = 'getup'; p.t = 0; p.hp = p.maxHp * Math.max(.2, .6 - .12 * (p.kd - 1)); p.sta = p.maxSta; p.exhausted = 0;
        F.o.state = 'idle'; F.o.idleT = 1.2; F.count = null; F.phase = 'fight';
        F.big = { text: 'FIGHT!', col: '#ffc53d', t: 0, dur: .8, size: 54 }; inClear(); return;
      }
      if (c.n >= 10) { F.big = { text: 'K.O.', col: '#8ea0c8', t: 0, dur: 3, size: 80 }; F.p.state = 'lose'; endFight('lose', 'KO'); }
    }
  }
}

/* ---------- ラウンド進行 ---------- */
function fightStep(dt) {
  if (!F) return;
  if (F.hitstop > 0) { F.hitstop -= dt; fxUpdate(dt * .2); return; }
  if (F.slowT > 0) { F.slowT -= dt; if (F.slowT <= 0) F.slow = 1; }
  const sdt = dt * F.slow;
  F.t += sdt;
  F.shake = Math.max(0, F.shake - dt * 30); F.flash = Math.max(0, F.flash - dt * 2); F.redV = Math.max(0, F.redV - dt * 1.6);
  if (F.big) { F.big.t += dt; if (F.big.t > F.big.dur) F.big = null; }
  if (F.bub) { F.bub.t += dt; if (F.bub.t > F.bub.dur) F.bub = null; }
  const p = F.p;
  p.dispHp = lerp(p.dispHp, Math.max(0, p.hp), Math.min(1, dt * 3));
  switch (F.phase) {
    case 'pre':
      F.phaseT += dt;
      if (F.phaseT > 3.2 || IN.q.length) { inClear(); F.phase = 'intro'; F.phaseT = 0; F.bub = null; }
      break;
    case 'intro':
      if (F.phaseT === 0) { F.big = { text: F.mode === 'spar' ? 'SPARRING' : (F.rounds > 1 || F.mode !== 'survival' ? 'ROUND ' + F.round : 'STAGE ' + (F.cfg.stage || 1)), col: '#ffffff', t: 0, dur: 1.3, size: 56 }; }
      F.phaseT += dt;
      if (F.phaseT >= 1.4 && !F.fightShown) { F.fightShown = true; sfx('bell1'); F.big = { text: 'FIGHT!', col: '#ffc53d', t: 0, dur: .9, size: 64 }; }
      if (F.phaseT >= 1.9) { F.phase = 'fight'; F.fightShown = false; inClear(); }
      break;
    case 'fight':
      F.clock -= sdt * (F.mode === 'spar' ? 1 : CLOCK_SCALE);
      F.stats.time += sdt;
      if (F.clock <= 0) { F.clock = 0; roundEnd(); }
      break;
    case 'down': countUpdate(dt); break;
    case 'roundEnd':
      F.phaseT += dt;
      if (F.phaseT > 1.8 && !F.intervalShown) { F.intervalShown = true; afterRound(); }
      break;
    case 'end':
      F.endT += dt;
      if (F.endT > 3.4 && !F.finished) { F.finished = true; finishFight(); }
      break;
  }
  if (!F || SCENE !== 'fight') return;
  pUpdate(sdt);
  oUpdate(sdt);
  const op = oppPoseTarget(F.o); blendPose(F.o.pose, op.P, Math.min(1, op.rate * sdt));
  const pp = playerPoseTarget(p); blendPose(p.pose, pp.P, Math.min(1, pp.rate * sdt));
  fxUpdate(sdt);
}
function roundEnd() {
  F.phase = 'roundEnd'; F.phaseT = 0; F.intervalShown = false;
  sfx('bell'); F.big = { text: F.mode === 'spar' ? 'TIME UP' : 'END OF ROUND ' + F.round, col: '#ffffff', t: 0, dur: 1.8, size: 36 };
  F.p.state = 'idle'; F.p.buffer = null; F.o.queue = []; F.o.inSeq = false; F.o.state = 'idle'; inClear();
}
function afterRound() {
  if (F.mode === 'spar') { F.phase = 'end'; F.endT = 3; F.result = 'spar'; return; }
  if (F.round >= F.rounds) { decide(); return; }
  showInterval();
}
function decide() {
  let pTot = [0, 0, 0], oTot = [0, 0, 0];
  for (let j = 0; j < 3; j++) {
    for (const r of F.rs) {
      const th = 1.08 + (j - 1) * .06;
      let ps = 10, os = 10;
      if (r.dealt > r.taken * th) os = 9; else if (r.taken > r.dealt * th) ps = 9;
      else if (j === 1) { if (r.dealt > r.taken) os = 9; else if (r.taken > r.dealt) ps = 9; }
      ps -= r.kdT; os -= r.kdG;
      pTot[j] += ps; oTot[j] += os;
    }
  }
  let pw = 0, ow = 0; for (let j = 0; j < 3; j++) { if (pTot[j] > oTot[j]) pw++; else if (oTot[j] > pTot[j]) ow++; }
  F.cards = { p: pTot, o: oTot };
  const res = pw > ow ? 'win' : ow > pw ? 'lose' : 'draw';
  F.big = { text: res === 'win' ? '判定勝ち！' : res === 'lose' ? '判定負け…' : 'ドロー', col: res === 'win' ? '#ffc53d' : '#8ea0c8', t: 0, dur: 3.2, size: 56 };
  if (res === 'win') { F.o.state = 'idle'; F.p.state = 'win'; } else if (res === 'lose') F.o.state = 'win';
  endFight(res, '判定');
}
function endFight(res, method) {
  F.phase = 'end'; F.endT = 0; F.result = res; F.method = method; F.finished = false;
  if (res === 'win') { sfx('cheer'); setTimeout(() => sfx('win'), 700); F.p.state = method === '判定' ? 'win' : F.p.state; if (method !== '判定') setTimeout(() => { if (F && F.p.state !== 'lose') F.p.state = 'win'; }, 900); }
  else if (res === 'lose') { sfx('ko'); setTimeout(() => sfx('lose'), 800); }
  if (res === 'win' && method === 'KO' || method === 'TKO' && res === 'win') { F.o.state = 'ko'; F.o.t = 0; }
}
function nextRound() {
  F.round++; F.clock = 180; F.o.kdRound = 0; F.p.kdRound = 0;
  F.rs.push({ dealt: 0, taken: 0, kdG: 0, kdT: 0 });
  F.phase = 'intro'; F.phaseT = 0; F.fightShown = false;
  F.o.state = 'idle'; F.o.idleT = 1; F.o.spCool = 3; F.p.state = 'idle'; F.p.sta = F.p.maxSta; F.p.exhausted = 0;
  inClear(); PAUSED = false;
}
function onHiddenPause() { if (SCENE && !PAUSED && !isModal()) openPause(); }
function onPauseKey() {
  if (CUR_SCR !== 'scr-game') { if (isModal() && MODAL_CB.no) MODAL_CB.no(); return; }
  if (PAUSED && MODAL_CB.resume) { MODAL_CB.resume(); return; }
  if (!PAUSED && !isModal()) openPause();
}

/* ---------- 試合描画 ---------- */
function fightDraw() {
  const c = ctx;
  c.setTransform(DPK, 0, 0, DPK, 0, 0);
  c.save();
  if (F.shake > 0 && S.settings.shake) c.translate(rand(-F.shake, F.shake), rand(-F.shake, F.shake));
  drawArena(c, F.t, F.phase === 'end' && F.result === 'win' ? 1 : F.o.state === 'down' ? .6 : 0);
  // 相手（オフスクリーンに描いて色調整）
  const o = F.o, d = o.d;
  obx.setTransform(DPK, 0, 0, DPK, 0, 0); obx.clearRect(0, 0, W, H);
  let glow = null;
  if (o.state === 'windup' && !(d.vanish && Math.sin(F.t * 40) > .3 && o.t / o.dur > .3)) {
    const k = clamp((o.t / o.dur - .25) / .75, 0, 1);
    glow = { side: o.atk.side, col: KIND_COLOR[o.atk.kind], a: k };
  }
  const look = d.isMirror ? Object.assign({}, d.look, { hair: 'short' }) : d.look;
  drawBoxer(obx, look, o.pose, OX, OY, 1, { expr: o.expr, t: F.t, glow });
  const tint = o.flash > 0 ? ['#ffffff', Math.min(.8, o.flash * .7)] : o.rage ? ['#ff2020', .12 + Math.sin(F.t * 8) * .06] : o.state === 'shout' ? ['#ffd24a', .15 + Math.sin(F.t * 20) * .1] : null;
  if (tint) { obx.globalCompositeOperation = 'source-atop'; obx.fillStyle = hexA(tint[0], tint[1]); obx.fillRect(0, 0, W, H); obx.globalCompositeOperation = 'source-over'; }
  let alpha = 1;
  if (d.vanish && o.state === 'windup') alpha = .25 + .75 * Math.abs(Math.sin(F.t * 13));
  if (d.isMirror) { c.save(); c.shadowColor = '#6b72a8'; c.shadowBlur = 24; }
  if (o.rage) { c.save(); c.shadowColor = 'rgba(255,40,40,.9)'; c.shadowBlur = 18 + Math.sin(F.t * 8) * 8; }
  c.globalAlpha = alpha; c.drawImage(OB, 0, 0, W, H); c.globalAlpha = 1;
  if (o.rage) c.restore();
  if (d.isMirror) c.restore();
  if (d.vanish && o.state === 'windup') { c.globalAlpha = .25; c.drawImage(OB, -26 + Math.sin(F.t * 30) * 10, 0, W, H); c.drawImage(OB, 26 - Math.sin(F.t * 30) * 10, 0, W, H); c.globalAlpha = 1; }
  if (o.state === 'dizzy') {
    const h = oppHeadPos();
    for (let i = 0; i < 4; i++) { const a = F.t * 4 + i * Math.PI / 2; c.fillStyle = '#ffc53d'; star5(c, h.x + Math.cos(a) * 36, h.y - 38 + Math.sin(a) * 9, 7); c.fill(); }
  }
  // ガイド
  if (o.state === 'windup' && S.settings.guide && F.mode !== 'spar_hard') {
    const k = o.t / o.dur;
    if (k > .15) {
      const h = oppHeadPos(), col = KIND_COLOR[o.atk.kind];
      const syms = o.atk.avoid.map(a => GUIDE_SYM[a]).join(' ');
      c.globalAlpha = clamp((k - .15) * 4, 0, 1);
      c.fillStyle = 'rgba(7,12,28,.78)'; rrect(c, h.x - 58, h.y - 104, 116, 34, 10); c.fill();
      c.strokeStyle = col; c.lineWidth = 2.5; rrect(c, h.x - 58, h.y - 104, 116, 34, 10); c.stroke();
      outlineText(c, syms, h.x, h.y - 87, 20, col, '#070c1c', 4);
      c.font = '800 10px "M PLUS Rounded 1c",sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(o.atk.label, h.x, h.y - 112);
      c.globalAlpha = 1;
    }
  }
  // プレイヤー
  const pa = F.p.state === 'dodge' || F.p.state === 'duck' ? .72 : .88;
  drawBack(c, F.p.look, F.p.pose, pa);
  fxDraw(c);
  c.restore();
  // 吹き出し
  if (F.bub) {
    const h = oppHeadPos();
    bubble(c, clamp(h.x, 100, 380), h.y - (o.state === 'windup' ? 120 : 52), F.bub.text, F.bub.hot ? '#ffe07a' : '#ffffff');
  }
  drawHUD(c);
  // 赤ビネット / フラッシュ
  if (F.redV > 0) {
    const g = c.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .75);
    g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(200,0,20,${.55 * F.redV})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  const lowHp = F.p.hp / F.p.maxHp;
  if (lowHp < .25 && F.phase === 'fight') {
    const a = (.25 - lowHp) * 1.4 * (.6 + .4 * Math.sin(F.t * 6));
    const g = c.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .8);
    g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(160,0,20,${a})`); c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  if (F.flash > 0) { c.fillStyle = hexA(F.flashCol, Math.min(.8, F.flash)); c.fillRect(0, 0, W, H); }
  if (F.p.state === 'down' || (F.count && F.count.who === 'p')) { c.fillStyle = 'rgba(7,12,28,.35)'; c.fillRect(0, 0, W, H); }
  drawBig(c);
  drawCount(c);
  if (F.phase === 'pre') {
    c.font = '800 13px "M PLUS Rounded 1c",sans-serif'; c.fillStyle = 'rgba(243,237,225,.75)'; c.textAlign = 'center';
    c.fillText('タップ / キーでスキップ', W / 2, H - 20);
  }
}
function hpBar(c, x, y, w, h, v, disp, max, col, right) {
  c.fillStyle = 'rgba(7,12,28,.8)'; rrect(c, x - 2, y - 2, w + 4, h + 4, 5); c.fill();
  const f = clamp(v / max, 0, 1), fd = clamp(disp / max, 0, 1);
  c.fillStyle = '#3a0d12'; c.fillRect(x, y, w, h);
  c.fillStyle = '#ffffff'; if (right) c.fillRect(x + w - w * fd, y, w * fd, h); else c.fillRect(x, y, w * fd, h);
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, shade(col, .35)); g.addColorStop(1, col);
  c.fillStyle = f < .25 ? (Math.sin(F.t * 10) > 0 ? '#ff4040' : col) : g;
  if (right) c.fillRect(x + w - w * f, y, w * f, h); else c.fillRect(x, y, w * f, h);
  c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1; c.strokeRect(x, y, w, h);
}
function drawHUD(c) {
  const p = F.p, o = F.o;
  // 名前
  c.font = '800 12px "M PLUS Rounded 1c",sans-serif'; c.textBaseline = 'middle';
  c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(S.name, 12, 13);
  c.textAlign = 'right'; c.fillText(oppDisplayName(o.d, F.ex), W - 12, 13);
  hpBar(c, 12, 24, 176, 14, p.hp, p.dispHp, p.maxHp, '#3a86ff', false);
  if (F.mode !== 'spar') hpBar(c, W - 188, 24, 176, 14, o.hp, o.dispHp, o.maxHp, '#e23b3b', true);
  else { c.fillStyle = 'rgba(7,12,28,.8)'; rrect(c, W - 190, 22, 180, 18, 5); c.fill(); outlineText(c, `かわした ${F.sparScore}  被弾 ${F.sparHits}`, W - 100, 31, 13, '#34c77b', '#070c1c', 3); }
  // スタミナ
  const sf = clamp(p.sta / p.maxSta, 0, 1);
  c.fillStyle = 'rgba(7,12,28,.8)'; rrect(c, 11, 42, 132, 9, 4); c.fill();
  c.fillStyle = p.exhausted > 0 ? '#8ea0c8' : '#34c77b'; c.fillRect(12, 43, 130 * (p.exhausted > 0 ? 1 - p.exhausted / 2.6 : sf), 7);
  c.font = '800 8px "M PLUS Rounded 1c",sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText('STAMINA', 147, 47);
  // スター
  for (let i = 0; i < 3; i++) {
    const x = 22 + i * 24, y = 66, on = i < p.stars;
    c.fillStyle = on ? '#ffc53d' : 'rgba(255,255,255,.14)'; c.strokeStyle = on ? '#8a5a00' : 'rgba(255,255,255,.2)'; c.lineWidth = 2;
    star5(c, x, y, on ? 11 + Math.sin(F.t * 6 + i) * 1 : 10); c.fill(); c.stroke();
  }
  // ダウン数
  for (let i = 0; i < o.kdRound; i++) { c.fillStyle = '#ffc53d'; rrect(c, W - 22 - i * 16, 44, 12, 12, 3); c.fill(); }
  for (let i = 0; i < p.kdRound; i++) { c.fillStyle = '#ff5a5a'; rrect(c, 180 - i * 16 - 10, 44, 12, 12, 3); c.fill(); }
  // 時計
  if (F.mode !== 'spar' || true) {
    c.fillStyle = 'rgba(7,12,28,.82)'; rrect(c, W / 2 - 42, 44, 84, 40, 9); c.fill();
    c.strokeStyle = o.rage ? '#ff5a5a' : 'rgba(255,197,61,.6)'; c.lineWidth = 2; rrect(c, W / 2 - 42, 44, 84, 40, 9); c.stroke();
    c.font = '800 9px "M PLUS Rounded 1c",sans-serif'; c.fillStyle = '#ffc53d'; c.textAlign = 'center';
    c.fillText(F.mode === 'spar' ? 'SPAR' : F.mode === 'survival' ? 'STAGE ' + (F.cfg.stage || 1) : `ROUND ${F.round}/${F.rounds}`, W / 2, 53);
    outlineText(c, F.mode === 'spar' ? String(Math.ceil(F.clock)) : fmtTime(F.clock), W / 2, 70, 20, F.clock < 20 && F.phase === 'fight' ? '#ff7b74' : '#fff', '#070c1c', 3);
  }
  if (p.exhausted > 0) outlineText(c, 'スタミナ切れ…', PX, 390, 18, '#8ea0c8', '#070c1c', 4);
}
function drawBig(c) {
  const b = F.big; if (!b) return;
  const k = b.t / b.dur, sc = k < .12 ? backOut(k / .12) : 1, a = k > .8 ? 1 - (k - .8) / .2 : 1;
  c.save(); c.translate(W / 2, b.y || (b.count ? 250 : 210)); c.scale(sc, sc); c.rotate(b.count ? 0 : -.05); c.globalAlpha = a;
  outlineText(c, b.text, 0, 0, b.size || 56, b.col || '#fff', '#070c1c', 10);
  c.restore();
}
function drawCount(c) {
  const ct = F.count; if (!ct) return;
  if (ct.who === 'p') {
    const x = W / 2 - 120, y = 330;
    c.fillStyle = 'rgba(7,12,28,.85)'; rrect(c, x - 10, y - 30, 260, 74, 12); c.fill();
    outlineText(c, '連打で立ち上がれ！', W / 2, y - 12, 18, '#ffc53d', '#070c1c', 4);
    c.fillStyle = '#1c2649'; rrect(c, x, y + 6, 240, 20, 8); c.fill();
    const g = c.createLinearGradient(x, 0, x + 240, 0); g.addColorStop(0, '#e23b3b'); g.addColorStop(1, '#ffc53d');
    c.fillStyle = g; rrect(c, x, y + 6, Math.max(8, 240 * ct.mash), 20, 8); c.fill();
    if (ct.up) outlineText(c, 'OK!', W / 2, y + 16, 16, '#fff', '#070c1c', 3);
  }
}

/* ---------- インターバル ---------- */
function showInterval() {
  PAUSED = true; F.phase = 'interval';
  const p = F.p, o = F.o;
  const heal = (p.maxHp - p.hp) * .3 + p.maxHp * .05;
  p.hp = Math.min(p.maxHp, p.hp + heal); p.dispHp = p.hp;
  o.hp = Math.min(o.maxHp, o.hp + (o.maxHp - o.hp) * .15); o.dispHp = o.hp;
  const tip = pick(o.d.tips && o.d.tips.length ? o.d.tips.concat(pick(COACH_TIPS)) : COACH_TIPS);
  const render = () => {
    const pf = Math.round(p.hp / p.maxHp * 100), of = Math.round(o.hp / o.maxHp * 100);
    openModal(`<h3>インターバル</h3>
      <div class="kv"><span>ラウンド</span><span>${F.round} / ${F.rounds} 終了</span>
      <span>あなたの体力</span><span>${pf}%</span><span>相手の体力</span><span>${of}%</span>
      <span>与ダメージ / 被ダメージ</span><span>${Math.round(F.rs[F.round - 1].dealt)} / ${Math.round(F.rs[F.round - 1].taken)}</span></div>
      <div class="coachline"><canvas class="cpt"></canvas><p><b style="color:var(--gold)">ゲン</b><br>${esc(tip)}</p></div>
      <div class="btns">
        <button class="btn gold" data-mcb="drink" type="button" ${S.items.drink > 0 && pf < 100 && F.mode !== 'survival' ? '' : 'disabled'}>🥤 ドリンクを飲む <small>(残り${S.items.drink}本 / 体力+35%)</small></button>
        <button class="btn red" data-mcb="go" type="button">ROUND ${F.round + 1} へ！</button>
      </div>`, {
      drink: () => { if (S.items.drink <= 0) return; S.items.drink--; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * .35); p.dispHp = p.hp; save(); sfx('coin'); render(); },
      go: () => { closeModal(); sfx('bell1'); nextRound(); }
    });
    const cp = $('#mbox .cpt'); if (cp) portrait(cp, COACH_LOOK, 'idle');
  };
  render();
}

/* ---------- ポーズ ---------- */
function openPause() {
  if (!SCENE) return;
  PAUSED = true; inClear();
  const inFight = SCENE === 'fight' && F && F.phase !== 'end';
  openModal(`<h3>PAUSE</h3>
    <div class="set-row"><div class="sl">攻撃ガイド<small>回避方向を表示</small></div><div class="seg"><button data-mcb="guide" data-arg="1" class="${S.settings.guide ? 'on' : ''}" type="button">ON</button><button data-mcb="guide" data-arg="0" class="${S.settings.guide ? '' : 'on'}" type="button">OFF</button></div></div>
    <div class="set-row"><div class="sl">BGM</div><div class="seg"><button data-mcb="bgm" data-arg="1" class="${S.settings.bgm ? 'on' : ''}" type="button">ON</button><button data-mcb="bgm" data-arg="0" class="${S.settings.bgm ? '' : 'on'}" type="button">OFF</button></div></div>
    <div class="btns">
      <button class="btn gold" data-mcb="resume" type="button">▶ 再開する</button>
      <button class="btn ghost" data-mcb="howto" type="button">操作を確認</button>
      <button class="btn red" data-mcb="quit" type="button">${inFight ? '棄権する（負け扱い）' : 'やめる'}</button>
    </div>`, {
    resume: () => { closeModal(); PAUSED = false; inClear(); },
    guide: v => { S.settings.guide = v === '1'; save(); openPause(); },
    bgm: v => { S.settings.bgm = v === '1'; applyVolume(); save(); openPause(); },
    howto: () => openModal(`<h3>操作</h3>${controlsHTML()}<div class="btns"><button class="btn gold" data-mcb="back" type="button">もどる</button></div>`, { back: () => openPause() }),
    quit: () => {
      closeModal();
      if (SCENE === 'fight' && F) {
        if (F.mode === 'spar') { SCENE = null; PAUSED = false; trainAbort(); return; }
        F.result = 'lose'; F.method = '棄権'; F.finished = true; PAUSED = false; finishFight();
      } else { SCENE = null; PAUSED = false; trainAbort(); }
    }
  });
}
$('#btnPause').addEventListener('click', e => { e.preventDefault(); auInit(); if (!PAUSED && !isModal()) openPause(); });
$('#cv').addEventListener('pointerdown', e => {
  e.preventDefault(); auInit();
  if (SCENE === 'fight' && F && F.phase === 'pre') inPress('ok');
  else if (SCENE === 'fight' && F && F.count && F.count.who === 'p') mashUp();
  else if (SCENE === 'train' && typeof trainTap === 'function') trainTap(e);
});

/* ---------- メインループ ---------- */
let lastTS = 0, ACC = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  let dt = (ts - lastTS) / 1000; lastTS = ts;
  if (!(dt > 0)) dt = 0; if (dt > .25) dt = .25;
  if (CUR_SCR === 'scr-title') { titleDraw(ts / 1000); return; }
  if (!SCENE || CUR_SCR !== 'scr-game') return;
  if (!PAUSED) {
    ACC += dt; let n = 0;
    while (ACC >= STEP && n < 6 && SCENE && !PAUSED) { if (SCENE === 'fight') fightStep(STEP); else trainStep(STEP); ACC -= STEP; n++; }
    if (n >= 6) ACC = 0;
  }
  try { if (SCENE === 'fight' && F) fightDraw(); else if (SCENE === 'train' && TR) trainDraw(); } catch (e) { console.error(e); }
}

/* タイトル画面の背景アニメ */
const tcv = $('#titleCv'), tctx = tcv.getContext('2d');
let titleSized = false;
const TITLE_POSE = DEF_POSE();
function titleDraw(t) {
  if (!titleSized) { const dpr = Math.min(2, window.devicePixelRatio || 1); tcv.width = W * dpr; tcv.height = H * dpr; titleSized = true; }
  const k = tcv.width / W; tctx.setTransform(k, 0, 0, k, 0, 0);
  drawArena(tctx, t, .4);
  const P = TITLE_POSE; P.y = Math.sin(t * 3) * 4 + 20; P.L = { x: -30, y: -40 + Math.sin(t * 3 + 1) * 4, z: 1.05 }; P.R = { x: 30, y: -40 + Math.sin(t * 3 + 2) * 4, z: 1.05 };
  tctx.globalAlpha = .9;
  drawBoxer(tctx, Object.assign({}, OPP_BY.zeus.look, { skin: '#1b2447', hairC: '#0e1430', trunk: '#10183a', trunk2: '#e23b3b', glove: '#e23b3b', beardC: '#0e1430', eyes: 'glow', acc: [] }), P, OX, OY + 10, 1, { t, expr: 'idle' });
  tctx.globalAlpha = 1;
  drawBack(tctx, playerLook(), { x: Math.sin(t * 2) * 6, y: Math.sin(t * 3) * 3, rot: 0, L: { x: -72, y: -150 + Math.sin(t * 3) * 4, z: 1 }, R: { x: 72, y: -150 + Math.sin(t * 3 + 1) * 4, z: 1 } }, .95);
  const g = tctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(16,26,54,.2)'); g.addColorStop(.5, 'rgba(16,26,54,.55)'); g.addColorStop(1, 'rgba(7,12,28,.85)');
  tctx.fillStyle = g; tctx.fillRect(0, 0, W, H);
}

/* ================= 05. TRAINING ================= */
let TR = null;
const GYM = document.createElement('canvas'); GYM.width = W * 2; GYM.height = H * 2;
function buildGym() {
  const c = GYM.getContext('2d'); c.setTransform(2, 0, 0, 2, 0, 0);
  // 壁（レンガ）
  c.fillStyle = '#5a2e22'; c.fillRect(0, 0, W, 380);
  for (let y = 0; y < 380; y += 18) for (let x = (y / 18) % 2 ? -20 : 0; x < W; x += 40) {
    c.fillStyle = shade('#7a3e2c', (Math.sin(x * 7.1 + y * 3.3) * .12)); c.fillRect(x + 1, y + 1, 38, 16);
  }
  // 窓と光
  c.fillStyle = '#9fc6e8'; rrect(c, 300, 40, 140, 110, 4); c.fill();
  c.fillStyle = '#6f93b8'; c.fillRect(368, 40, 4, 110); c.fillRect(300, 93, 140, 4);
  c.fillStyle = 'rgba(255,245,200,.08)'; c.beginPath(); c.moveTo(300, 150); c.lineTo(440, 150); c.lineTo(380, 380); c.lineTo(160, 380); c.closePath(); c.fill();
  // ポスター
  const poster = (x, y, col, t1, t2) => {
    c.save(); c.translate(x, y); c.rotate((Math.sin(x) * .06));
    c.fillStyle = '#f3ede1'; c.fillRect(-34, -46, 68, 92); c.fillStyle = col; c.fillRect(-30, -42, 60, 50);
    c.fillStyle = '#101a36'; c.font = '11px "Dela Gothic One",sans-serif'; c.textAlign = 'center'; c.fillText(t1, 0, 22); c.font = '8px sans-serif'; c.fillText(t2, 0, 36);
    c.fillStyle = '#fff'; c.font = '22px "Dela Gothic One",sans-serif'; c.fillText('VS', 0, -12);
    c.restore();
  };
  poster(60, 90, '#e23b3b', '浪速拳闘会', 'SINCE 1978'); poster(150, 80, '#3a86ff', 'KO ROAD', 'WORLD TITLE'); poster(240, 96, '#ffc53d', '根性', 'NEVER GIVE UP');
  // 看板
  c.fillStyle = '#101a36'; rrect(c, 40, 170, 200, 40, 6); c.fill(); c.strokeStyle = '#ffc53d'; c.lineWidth = 2; c.stroke();
  c.fillStyle = '#ffc53d'; c.font = '20px "Dela Gothic One",sans-serif'; c.textAlign = 'center'; c.fillText('浪速拳闘会', 140, 198);
  // 床
  const fg = c.createLinearGradient(0, 380, 0, H); fg.addColorStop(0, '#8a5a34'); fg.addColorStop(1, '#5a3a20');
  c.fillStyle = fg; c.fillRect(0, 380, W, H - 380);
  c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1.5;
  for (let i = -10; i < 20; i++) { c.beginPath(); c.moveTo(240 + i * 30, 380); c.lineTo(240 + i * 90, H); c.stroke(); }
  c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, 376, W, 6);
  const vg = c.createRadialGradient(W / 2, H * .45, H * .3, W / 2, H * .45, H * .8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
}

function startTraining(type, practice) {
  if (!practice) {
    if (S.energy <= 0) { sfx('error'); toast('今週のトレーニングはもう限界や！休むか試合をしよう'); return; }
    S.energy--; save();
  }
  if (type === 'dodge') { startFight({ oppId: 'spar', mode: 'spar', train: { type, practice } }); return; }
  TR = { type, practice, t: 0, phase: 'ready', readyT: 2.4, score: 0, doneT: 0, msg: null,
    pose: { x: 0, y: 0, rot: 0, L: { x: -72, y: -150, z: 1 }, R: { x: 72, y: -150, z: 1 } }, punch: null, look: playerLook() };
  if (type === 'bag') Object.assign(TR, { n: 0, max: 12, th: 0, dir: 1, v: .9, zc: rand(.25, .75), gold: .075, good: .2, bagA: 0, bagV: 0, lastRes: null, lock: 0 });
  if (type === 'mitt') Object.assign(TR, { time: 30, target: null, win: 1.1, tt: 0, combo: 0, maxCombo: 0, gap: .5, coachPose: DEF_POSE(), hits: 0, miss: 0 });
  if (type === 'run') Object.assign(TR, { time: 25, v: 0, dist: 0, last: null, scroll: 0, stepT: 0, stumble: 0 });
  if (type === 'rope') Object.assign(TR, { time: 45, lives: 3, th: Math.PI, w: 4.2, air: 0, jumps: 0, trip: 0 });
  SCENE = 'train'; PAUSED = false; fxClear(); inClear(); show('scr-game'); bgm('gym');
}
function trainAbort() {
  if (TR && !TR.practice) { S.energy = Math.min(3, S.energy + 1); save(); }
  if (F && F.mode === 'spar' && F.cfg.train && !F.cfg.train.practice) { S.energy = Math.min(3, S.energy + 1); save(); }
  TR = null; F = null; SCENE = null; PAUSED = false;
  toast('トレーニングを中断しました（回数は戻ったで）');
  goTrainingMenu();
}
function trainPunch(side, face = true) {
  TR.punch = { side, face, t: 0, dur: .22 };
}
function trainInput(a) {
  const T = TR;
  if (T.type === 'bag') {
    if (!['lf', 'rf', 'lb', 'rb', 'star', 'duck', 'guard'].includes(a) || T.lock > 0) return;
    trainPunch(a === 'rf' || a === 'rb' ? 1 : -1);
    const d = Math.abs(T.th - T.zc);
    let pts = 0, txt = 'MISS', col = '#8ea0c8';
    if (d < T.gold / 2) { pts = 10; txt = 'PERFECT!'; col = '#ffc53d'; sfx('perfect'); fxRing(240, 250, '#ffc53d', 90, .4, 10); }
    else if (d < T.good / 2) { pts = 6; txt = 'GOOD'; col = '#34c77b'; sfx('hit'); }
    else if (d < .25) { pts = 3; txt = 'OK'; col = '#9fd3ff'; sfx('hit2'); }
    else sfx('block');
    T.score += pts; T.n++; T.lock = .45;
    T.bagV += (pts + 2) * (a === 'rf' || a === 'rb' ? -.07 : .07) * (1 + pts / 10);
    fxSpark(240 + (a === 'rf' ? 20 : -20), 260, pts >= 6 ? '#fff' : '#c9d6ff', 6 + pts, 180 + pts * 20);
    fxPop(240, 170, txt + (pts ? ' +' + pts : ''), col, 26, .7);
    if (pts >= 6) vib(20);
    T.v = Math.min(2.6, T.v + .12); T.zc = rand(.15, .85); T.gold = Math.max(.045, T.gold - .003); T.good = Math.max(.12, T.good - .006);
    if (T.n >= T.max) trainFinish();
  } else if (T.type === 'mitt') {
    if (!['lf', 'rf', 'lb', 'rb'].includes(a) || !T.target || T.gap > 0) { if (['lf', 'rf', 'lb', 'rb'].includes(a)) sfx('miss'); return; }
    trainPunch(a === 'rf' || a === 'rb' ? 1 : -1, a === 'lf' || a === 'rf');
    const pos = mittPos(T.target);
    if (a === T.target) {
      T.hits++; T.combo++; T.maxCombo = Math.max(T.maxCombo, T.combo); T.score = T.hits;
      sfx(T.combo % 10 === 0 ? 'perfect' : 'hit'); fxSpark(pos.x, pos.y, '#fff', 10, 240);
      fxPop(pos.x, pos.y - 30, T.combo >= 5 ? T.combo + ' COMBO' : 'ナイス！', '#ffc53d', 18, .5);
      T.target = null; T.gap = .12; T.win = Math.max(.5, T.win - .018);
    } else {
      T.combo = 0; T.miss++; sfx('error'); fxPop(pos.x, pos.y - 30, 'ちゃう！', '#ff7b74', 18, .6); T.target = null; T.gap = .45;
    }
  } else if (T.type === 'run') {
    let k = a === 'dL' || a === 'lf' || a === 'lb' ? 'L' : a === 'dR' || a === 'rf' || a === 'rb' ? 'R' : null;
    if (!k || T.stumble > 0) return;
    if (T.last === k) { T.v *= .45; T.stumble = .45; sfx('error'); fxPop(240, 260, 'つまずいた！', '#ff7b74', 20, .7); T.last = null; return; }
    T.last = k; T.v = Math.min(12, T.v + 1.12); sfx('step');
  } else if (T.type === 'rope') {
    if (T.air > 0 || T.trip > 0) return;
    T.air = .4; sfx('jump');
  }
}
function trainTap(e) {
  if (!TR || TR.phase !== 'play') return;
  if (TR.type === 'bag') trainInput('rf');
  else if (TR.type === 'rope') trainInput('duck');
}
function mittPos(tg) {
  return { lf: { x: 196, y: 230 }, rf: { x: 284, y: 230 }, lb: { x: 196, y: 330 }, rb: { x: 284, y: 330 } }[tg];
}
function trainStep(dt) {
  const T = TR; if (!T) return;
  T.t += dt; fxUpdate(dt);
  if (T.punch) { T.punch.t += dt; if (T.punch.t > T.punch.dur) T.punch = null; }
  if (T.msg) { T.msg.t += dt; if (T.msg.t > T.msg.dur) T.msg = null; }
  if (T.phase === 'ready') {
    const prev = Math.ceil(T.readyT); T.readyT -= dt; const now = Math.ceil(T.readyT);
    if (now !== prev && now > 0) sfx('beep');
    if (T.readyT <= 0) { T.phase = 'play'; sfx('bell1'); T.msg = { text: 'GO!', t: 0, dur: .7 }; inClear(); }
    trainPose(dt); return;
  }
  if (T.phase === 'done') { T.doneT += dt; trainPose(dt); if (T.doneT > 1.4 && !T.reported) { T.reported = true; trainReport(T.type, T.score, T.practice); } return; }
  let a; while ((a = inTake()) !== undefined) trainInput(a);
  if (T.type === 'bag') {
    T.th += T.dir * T.v * dt; if (T.th > 1) { T.th = 1; T.dir = -1; } if (T.th < 0) { T.th = 0; T.dir = 1; }
    T.bagV += -T.bagA * 30 * dt; T.bagV *= Math.exp(-2.4 * dt); T.bagA += T.bagV * dt * 6; if (T.lock > 0) T.lock -= dt;
  } else if (T.type === 'mitt') {
    T.time -= dt;
    if (T.gap > 0) { T.gap -= dt; if (T.gap <= 0) { T.target = pick(['lf', 'rf', 'lb', 'rb']); T.tt = 0; sfx('select'); } }
    else if (T.target) { T.tt += dt; if (T.tt > T.win) { T.combo = 0; T.miss++; fxPop(240, 170, 'おそい！', '#ff7b74', 20, .5); T.target = null; T.gap = .35; sfx('miss'); } }
    if (T.time <= 0) { T.time = 0; trainFinish(); }
  } else if (T.type === 'run') {
    T.time -= dt; T.v *= Math.exp(-1.2 * dt); if (T.stumble > 0) T.stumble -= dt;
    T.dist += T.v * dt; T.scroll += T.v * dt * 40; T.score = Math.floor(T.dist);
    if (T.time <= 0) { T.time = 0; trainFinish(); }
  } else if (T.type === 'rope') {
    T.time -= dt; if (T.time <= 0) { T.time = 0; trainFinish(); }
    if (T.trip > 0) { T.trip -= dt; if (T.trip <= 0) { T.th = Math.PI; } }
    else {
      const before = Math.floor(T.th / (Math.PI * 2));
      T.th += T.w * dt;
      const after = Math.floor(T.th / (Math.PI * 2));
      if (after > before) {
        if (T.air > .04) { T.jumps++; T.score = T.jumps; T.w = Math.min(11, T.w * 1.028); if (T.jumps % 10 === 0) { sfx('good'); fxPop(240, 160, T.jumps + ' 回！', '#ffc53d', 24, .8); } }
        else { T.lives--; T.trip = .9; T.w = Math.max(4.2, T.w * .9); sfx('hurt'); vib(40); fxPop(240, 200, 'ひっかかった！', '#ff7b74', 22, .8); if (T.lives <= 0) trainFinish(); }
      }
    }
    if (T.air > 0) T.air -= dt;
  }
  trainPose(dt);
}
function trainFinish() { if (TR.phase === 'done') return; TR.phase = 'done'; TR.doneT = 0; sfx('bell'); TR.msg = { text: 'FINISH!', t: 0, dur: 1.4 }; }
function trainPose(dt) {
  const T = TR, P = { x: 0, y: 0, rot: 0, L: { x: -72, y: -150, z: 1 }, R: { x: 72, y: -150, z: 1 } }, t = T.t;
  P.y = Math.sin(t * 4) * 3;
  if (T.punch) {
    const k = T.punch.t / T.punch.dur, e = k < .45 ? easeOut(k / .45) : 1 - (k - .45) / .55;
    const G = T.punch.side < 0 ? P.L : P.R;
    let tx = T.punch.side * 20, ty = -320;
    if (T.type === 'mitt') { const mp = mittPos(T.punch.side < 0 ? (T.punch.face ? 'lf' : 'lb') : (T.punch.face ? 'rf' : 'rb')); tx = mp.x - PX; ty = mp.y - PY; }
    G.x = lerp(G.x, tx, e); G.y = lerp(G.y, ty, e); G.z = lerp(1, .55, e); P.x = T.punch.side * 12 * e;
  }
  blendPose(T.pose, Object.assign({ sq: 1, hx: 0, hy: 0, hr: 0 }, P), Math.min(1, dt * 30));
}
function trainDraw() {
  const T = TR, c = ctx; if (!T) return;
  c.setTransform(DPK, 0, 0, DPK, 0, 0);
  if (T.type === 'run') drawRun(c, T);
  else {
    c.drawImage(GYM, 0, 0, W, H);
    if (T.type === 'bag') drawBag(c, T);
    if (T.type === 'mitt') drawMitt(c, T);
    if (T.type === 'rope') { drawRope(c, T); }
  }
  if (T.type !== 'rope' && T.type !== 'run') drawBack(c, T.look, T.pose, .9);
  fxDraw(c);
  // HUD
  const info = TRAIN[T.type];
  c.fillStyle = 'rgba(7,12,28,.82)'; rrect(c, 10, 10, W - 20, 50, 12); c.fill();
  outlineText(c, info.ic + ' ' + info.name, 22, 35, 18, '#ffc53d', '#070c1c', 4, 'left');
  let right = '';
  if (T.type === 'bag') right = `${T.n}/${T.max}発  ${T.score}点`;
  if (T.type === 'mitt') right = `${Math.ceil(T.time)}秒  ${T.hits}HIT`;
  if (T.type === 'run') right = `${Math.ceil(T.time)}秒  ${T.dist.toFixed(0)}m`;
  if (T.type === 'rope') right = `${Math.ceil(T.time)}秒  ${T.jumps}回  ${'❤'.repeat(Math.max(0, T.lives))}`;
  outlineText(c, right, W - 22, 35, 18, '#fff', '#070c1c', 4, 'right');
  if (T.phase === 'ready') {
    c.fillStyle = 'rgba(7,12,28,.6)'; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(7,12,28,.9)'; rrect(c, 30, 170, W - 60, 190, 16); c.fill();
    outlineText(c, info.name, W / 2, 205, 28, '#ffc53d', '#070c1c', 6);
    c.font = '800 14px "M PLUS Rounded 1c",sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'center';
    wrapText(c, info.desc, W - 80).forEach((l, i) => c.fillText(l, W / 2, 240 + i * 20));
    c.fillStyle = '#8ea0c8'; c.fillText('操作: ' + info.how, W / 2, 300);
    outlineText(c, String(Math.max(1, Math.ceil(T.readyT))), W / 2, 335, 36, '#fff', '#070c1c', 6);
  }
  if (T.msg) { const k = T.msg.t / T.msg.dur, sc = k < .15 ? backOut(k / .15) : 1; c.save(); c.translate(W / 2, 260); c.scale(sc, sc); c.globalAlpha = k > .8 ? 1 - (k - .8) * 5 : 1; outlineText(c, T.msg.text, 0, 0, 60, '#ffc53d', '#070c1c', 10); c.restore(); }
}
function drawBag(c, T) {
  // サンドバッグ
  c.save(); c.translate(240, 40); c.rotate(T.bagA * .6);
  c.strokeStyle = '#999'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(-20, 80); c.moveTo(0, 0); c.lineTo(20, 80); c.stroke();
  const g = c.createLinearGradient(-60, 0, 60, 0); g.addColorStop(0, '#5a1414'); g.addColorStop(.4, '#b52a2a'); g.addColorStop(1, '#4a1010');
  c.fillStyle = g; rrect(c, -58, 80, 116, 290, 40); c.fill(); c.strokeStyle = '#2a0808'; c.lineWidth = 3; c.stroke();
  c.fillStyle = '#e8e2d4'; c.fillRect(-58, 150, 116, 10); c.fillRect(-58, 300, 116, 10);
  c.fillStyle = '#ffc53d'; c.font = '20px "Dela Gothic One",sans-serif'; c.textAlign = 'center'; c.fillText('KO', 0, 240);
  c.restore();
  // メーター
  const x = 60, y = 78, w = 360, h = 26;
  c.fillStyle = 'rgba(7,12,28,.9)'; rrect(c, x - 6, y - 6, w + 12, h + 12, 10); c.fill();
  c.fillStyle = '#26336a'; c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(52,199,123,.7)'; c.fillRect(x + (T.zc - T.good / 2) * w, y, T.good * w, h);
  c.fillStyle = '#ffc53d'; c.fillRect(x + (T.zc - T.gold / 2) * w, y, T.gold * w, h);
  const nx = x + T.th * w;
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(nx, y - 8); c.lineTo(nx - 7, y - 18); c.lineTo(nx + 7, y - 18); c.fill();
  c.fillRect(nx - 2, y - 4, 4, h + 8);
}
function drawMitt(c, T) {
  const P = DEF_POSE();
  const tg = T.target;
  const mp = { lf: { x: -44, y: -62 }, rf: { x: 44, y: -62 }, lb: { x: -44, y: 38 }, rb: { x: 44, y: 38 } };
  P.L = { x: -60, y: 0, z: 1 }; P.R = { x: 60, y: 0, z: 1 };
  if (tg) { const m = mp[tg]; const G = tg[0] === 'l' ? P.L : P.R; G.x = m.x; G.y = m.y; G.z = 1.35; }
  blendPose(T.coachPose, P, .35);
  drawBoxer(c, Object.assign({}, COACH_LOOK, { glove: '#f3ede1' }), T.coachPose, OX, OY - 2, 1, { t: T.t, expr: tg ? 'shout' : 'idle', glow: tg ? { side: tg[0] === 'l' ? 'L' : 'R', col: '#ffc53d', a: .8 } : null });
  if (tg) {
    const pos = mittPos(tg);
    const lab = { lf: ['Z', '左顔'], rf: ['X', '右顔'], lb: ['A', '左ボディ'], rb: ['S', '右ボディ'] }[tg];
    const k = 1 - T.tt / T.win;
    c.strokeStyle = '#ffc53d'; c.lineWidth = 5; c.beginPath(); c.arc(pos.x, pos.y, 40, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); c.stroke();
    outlineText(c, lab[0], pos.x, pos.y - 2, 22, '#101a36', '#ffc53d', 5);
    outlineText(c, lab[1], pos.x, pos.y + 54, 14, '#fff', '#070c1c', 4);
  }
  if (T.combo >= 3) outlineText(c, T.combo + ' COMBO', W / 2, 110, 22, '#ffc53d', '#070c1c', 5);
}
function drawRun(c, T) {
  // 空と大阪の街並み
  const g = c.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, '#2b3b7a'); g.addColorStop(.6, '#f08a5d'); g.addColorStop(1, '#ffd98e');
  c.fillStyle = g; c.fillRect(0, 0, W, 300);
  c.fillStyle = 'rgba(255,230,160,.9)'; ell(c, 360, 230, 40, 40); c.fill();
  const layer = (col, par, base, seed, hMax) => {
    c.fillStyle = col; const rng = mulberry(seed); const off = (T.scroll * par) % 600;
    for (let x = -off - 60; x < W + 60; x += 0) { const w = 26 + rng() * 40, h = 40 + rng() * hMax; c.fillRect(x, base - h, w, h); if (rng() < .2) c.fillRect(x + w / 2 - 2, base - h - 20, 4, 20); x += w + 2; if (x > 1200) break; }
  };
  // タワー
  c.fillStyle = '#3b2b4a'; const tx = 120 - (T.scroll * .05) % 700; c.fillRect(tx, 150, 10, 150); c.beginPath(); c.moveTo(tx - 16, 180); c.lineTo(tx + 26, 180); c.lineTo(tx + 5, 130); c.fill();
  layer('#4a3a5e', .12, 300, 3, 90); layer('#2f2640', .25, 300, 9, 60);
  // 道
  c.fillStyle = '#3a3a48'; c.beginPath(); c.moveTo(200, 300); c.lineTo(280, 300); c.lineTo(W + 200, H); c.lineTo(-200, H); c.closePath(); c.fill();
  c.fillStyle = '#5a7a3a'; c.beginPath(); c.moveTo(0, 300); c.lineTo(200, 300); c.lineTo(-200, H); c.lineTo(0, H); c.fill(); c.beginPath(); c.moveTo(W, 300); c.lineTo(280, 300); c.lineTo(W + 200, H); c.lineTo(W, H); c.fill();
  c.fillStyle = '#f3ede1';
  for (let i = 0; i < 10; i++) { const z = ((i * 60 + T.scroll * 3) % 600) / 600; const y = 300 + Math.pow(z, 2) * 260; const w = 2 + z * 14, h = 4 + z * 30; c.fillRect(240 - w / 2, y, w, h); }
  // ランナー（背面）
  const ph = T.t * (4 + T.v * .9), sw = Math.sin(ph);
  const P = { x: sw * 6, y: -Math.abs(Math.cos(ph)) * (6 + T.v) + 30, rot: sw * .04, L: { x: -70, y: -140 + sw * 40, z: 1 - sw * .1 }, R: { x: 70, y: -140 - sw * 40, z: 1 + sw * .1 } };
  if (T.stumble > 0) { P.rot = .2; P.y += 20; }
  drawBack(c, T.look, P, .95);
  if (Math.floor(ph / Math.PI) !== T.stepT) { T.stepT = Math.floor(ph / Math.PI); if (T.phase === 'play' && T.v > 1) sfx('step'); }
  // スピードメーター
  c.fillStyle = 'rgba(7,12,28,.85)'; rrect(c, 20, 74, 200, 22, 8); c.fill();
  const sg = c.createLinearGradient(20, 0, 220, 0); sg.addColorStop(0, '#34c77b'); sg.addColorStop(1, '#ffc53d');
  c.fillStyle = sg; rrect(c, 22, 76, 196 * clamp(T.v / 12, 0, 1), 18, 7); c.fill();
  outlineText(c, 'SPEED', 120, 85, 11, '#fff', '#070c1c', 3);
  const nextK = T.last === 'L' ? '▶' : T.last === 'R' ? '◀' : '◀ ▶';
  outlineText(c, '次: ' + nextK, W - 70, 86, 18, '#ffc53d', '#070c1c', 4);
}
function drawRope(c, T) {
  const s = .82, BY = OY - 40;
  const jump = T.air > 0 ? Math.sin((1 - T.air / .4) * Math.PI) * 58 : 0;
  const P = DEF_POSE(); P.y = -jump / s + (T.trip > 0 ? 20 : 0);
  P.L = { x: -66, y: 70, z: .8 }; P.R = { x: 66, y: 70, z: .8 };
  if (T.trip > 0) P.rot = .15;
  const hy = BY + (70 + P.y) * s, amp = 172, midY = BY + 100 * s;
  const th = T.th, front = Math.sin(th) > 0;
  const ropeY = midY + Math.cos(th) * amp;
  const drawR = () => { c.strokeStyle = '#ffc53d'; c.lineWidth = 3; c.beginPath(); c.moveTo(OX - 66 * s, hy); c.quadraticCurveTo(OX, ropeY + (ropeY - hy) * .55, OX + 66 * s, hy); c.stroke(); };
  if (!front) drawR();
  c.fillStyle = 'rgba(0,0,0,.3)'; ell(c, OX, BY + 300 * s, 60 - jump * .3, 12); c.fill();
  const look = Object.assign({}, T.look, { glove: '#8a5a34' });
  drawBoxer(c, look, P, OX, BY, s, { t: T.t, expr: T.trip > 0 ? 'hurt' : 'idle' });
  if (front) drawR();
  const phase = ((th % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), k = phase / (Math.PI * 2);
  c.fillStyle = 'rgba(7,12,28,.85)'; rrect(c, 40, 74, 400, 18, 8); c.fill();
  c.fillStyle = '#34c77b'; c.fillRect(40 + 400 * .84, 76, 400 * .16 - 2, 14);
  c.fillStyle = '#fff'; c.fillRect(40 + 400 * k - 2, 72, 4, 22);
  outlineText(c, 'JUMP', 40 + 400 * .92, 84, 10, '#fff', '#070c1c', 3);
}

/* ---------- トレーニング結果 ---------- */
function gradeOf(type, score) {
  const g = TRAIN[type].grades;
  return score >= g[0] ? 'S' : score >= g[1] ? 'A' : score >= g[2] ? 'B' : score >= g[3] ? 'C' : 'D';
}
function trainReport(type, score, practice) {
  SCENE = null; PAUSED = false;
  const grade = gradeOf(type, score), info = TRAIN[type], st = info.stat;
  const best = S.trainBest[type] || 0, newBest = score > best;
  if (newBest) S.trainBest[type] = score;
  let body = '';
  if (!practice) {
    const mul = S.proteinLeft > 0 ? 2 : 1; if (S.proteinLeft > 0) S.proteinLeft--;
    const xp = GRADE_XP[grade] * mul, ex = GRADE_EXP[grade];
    S.statXp[st] += xp; let ups = 0;
    while (S.statXp[st] >= 100) { if (S.stats[st] < STAT_MAX) { S.stats[st]++; ups++; } S.statXp[st] -= 100; if (S.stats[st] >= STAT_MAX) { S.statXp[st] = 0; break; } }
    S.st.trainings++; if (grade === 'S') S.st.sGrades++;
    const lv = gainExp(ex);
    body = `<div class="kv"><span>${STAT_INFO[st].name} 経験値</span><span>+${xp}${mul > 1 ? ' (プロテイン×2)' : ''}</span>
      <span>現在の${STAT_INFO[st].name}</span><span>${S.stats[st]} ${ups ? `<b style="color:var(--gold)">(+${ups}!)</b>` : ''}</span>
      <span>次の上昇まで</span><span>${100 - S.statXp[st]}</span><span>EXP</span><span>+${ex}</span></div>
      ${ups ? `<p class="lvup">${STAT_INFO[st].name} UP！</p>` : ''}${lv ? `<p class="lvup">LEVEL UP！ Lv${S.level}</p>` : ''}`;
  } else body = `<p style="text-align:center">練習モード（能力は上がりません）</p>`;
  checkAch(); save();
  openModal(`<h3>${info.ic} ${info.name} 結果</h3>
    <div class="gradebig" style="color:${GRADE_COL[grade]}">${grade}</div>
    <p style="text-align:center;font-weight:800">スコア ${score}${newBest ? '　<span class="tag gold">NEW BEST</span>' : ''}</p>
    ${body}
    <div class="btns"><button class="btn gold" data-mcb="ok" type="button">OK</button></div>`,
    { ok: () => { closeModal(); TR = null; F = null; if (practice) goFreeTraining(); else goTrainingMenu(); } });
  sfx(grade === 'S' || grade === 'A' ? 'win' : 'select');
}

/* ================= 06. UI / FLOW ================= */
function oppDisplayName(d, ex) {
  if (!d) return '';
  const n = d.isMirror ? 'シャドウ・' + S.name : d.name;
  return ex ? n + ' EX' : n;
}
function oppLook(d) { return d.isMirror ? Object.assign({}, d.look) : d.look; }
function gainExp(n) {
  let ups = 0; S.exp += Math.round(n);
  while (S.level < LV_MAX && S.exp >= expNeed(S.level)) {
    S.exp -= expNeed(S.level); S.level++; ups++;
    S.points += 2 + (S.level % 5 === 0 ? 2 : 0);
  }
  if (S.level >= LV_MAX) S.exp = Math.min(S.exp, expNeed(LV_MAX));
  if (ups) sfx('lvup');
  return ups;
}
function addMoney(n) { n = Math.round(n); S.money += n; S.st.earned += n; return n; }
function unlockedIds() {
  const ids = OPP.slice(0, MAIN_COUNT).filter(o => S.beaten[o.id]).map(o => o.id);
  if (S.beaten.zeus) ids.push('gen');
  if (S.beaten.gen) ids.push('mirror');
  return ids;
}
function unlockAch(id) {
  if (S.ach[id]) return;
  const a = ACH.find(x => x[0] === id); if (!a) return;
  S.ach[id] = Date.now();
  setTimeout(() => { toast(`${a[1]} 実績解除：${a[2]}`, 'ach'); sfx('star'); }, 400);
}
function checkAch(r) {
  const U = unlockAch;
  if (S.record.w >= 1) U('first_win');
  if (S.progress > 3) U('belt1'); if (S.progress > 7) U('belt2'); if (S.progress > 11) U('belt3'); if (S.beaten.zeus) U('legend');
  if (S.beaten.gen) U('gen'); if (S.beaten.mirror) U('mirror');
  if (S.record.ko >= 10) U('ko10');
  if (S.st.counters >= 50) U('counter50'); if (S.st.counters >= 300) U('counter300');
  if (S.st.landed >= 1000) U('punch1000'); if (S.st.landed >= 5000) U('punch5000');
  if (S.st.trainings >= 10) U('train10'); if (S.st.trainings >= 50) U('train50'); if (S.st.sGrades >= 1) U('grade_s');
  if (S.survivalBest >= 5) U('surv5'); if (S.survivalBest >= 15) U('surv15'); if (S.survivalBest >= 30) U('surv30');
  const exN = Object.keys(S.beatenEx).length; if (exN >= 4) U('ex4'); if (OPP.slice(0, MAIN_COUNT).every(o => S.beatenEx[o.id])) U('exall');
  if (S.level >= 10) U('lv10'); if (S.level >= 30) U('lv30');
  if (S.money >= 100000) U('rich'); if (S.owned.includes('g5')) U('gold');
  if (r && r.win) {
    if ((r.method === 'KO' || r.method === 'TKO') && r.round === 1) U('r1ko');
    if (r.taken < .5) U('perfect');
    if (r.method === 'TKO') U('tko');
    if (r.kdT > 0) U('comeback');
    if (r.method === '判定') U('decision');
    if (r.d.champ && !S.settings.guide) U('noguide');
    if (r.d.id === 'zeus' && S.settings.diff === 'hard') U('hard');
  }
  if (r && r.star3) U('star3');
}

/* ---------- 試合終了 → 結果 ---------- */
let SURV = null;
function finishFight() {
  const f = F; if (!f) return;
  SCENE = null; PAUSED = false;
  if (f.mode === 'spar') {
    const score = Math.max(0, f.sparScore - Math.floor(f.sparHits / 2));
    F = null; trainReport('dodge', score, f.cfg.train && f.cfg.train.practice); return;
  }
  const d = f.d, win = f.result === 'win', draw = f.result === 'draw';
  const r = { d, win, draw, method: f.method, round: f.round, time: f.stats.time, taken: f.stats.taken, kdT: f.stats.kdT, star3: f.stats.star3, stats: f.stats, ex: f.ex, mode: f.mode, cards: f.cards, hpLeft: f.p.hp, elapsed: Math.max(0, (f.mode === 'survival' ? 90 : 180) - f.clock) };
  S.st.fights++;
  if (f.mode === 'survival') { F = null; survivalAfter(r); return; }
  let money = 0, exp = 0, bonus = [];
  const base = d.purse * (f.ex ? 1.6 : 1), bexp = d.exp * (f.ex ? 1.5 : 1);
  const rate = f.mode === 'career' ? 1 : (f.ex ? .8 : .4);
  if (win) {
    money = base * rate; exp = bexp * rate;
    if (f.method === 'KO' || f.method === 'TKO') { money *= 1.2; bonus.push('KOボーナス +20%'); }
    if (f.stats.taken < .5) { money *= 1.5; exp *= 1.2; bonus.push('パーフェクト +50%'); S.st.perfect++; }
    if (S.settings.diff === 'hard') { money *= 1.25; exp *= 1.2; bonus.push('HARDボーナス'); }
    if (S.settings.diff === 'easy') { money *= .8; exp *= .8; }
    S.record.w++; if (f.method === 'KO' || f.method === 'TKO') S.record.ko++;
    const firstWin = !S.beaten[d.id];
    if (f.ex) S.beatenEx[d.id] = true; else S.beaten[d.id] = true;
    const tkey = d.id + (f.ex ? '_ex' : '');
    if (!S.bestTime[tkey] || f.stats.time < S.bestTime[tkey]) S.bestTime[tkey] = f.stats.time;
    if (f.mode === 'career' && d.idx === S.progress) S.progress++;
    r.firstWin = firstWin && !f.ex;
  } else {
    money = base * rate * (draw ? .5 : .2); exp = bexp * rate * (draw ? .5 : .3);
    if (draw) S.record.d++; else S.record.l++;
    S.losses[d.id] = (S.losses[d.id] || 0) + 1;
  }
  r.money = addMoney(money); r.exp = Math.round(exp); r.bonus = bonus;
  r.lvUps = gainExp(exp);
  S.week++; S.energy = 3;
  checkAch(r); save();
  F = null;
  showResult(r);
}
function showResult(r) {
  const s = r.stats, acc = s.thrown ? Math.round(s.landed / s.thrown * 100) : 0;
  const big = r.win ? 'WIN!' : r.draw ? 'DRAW' : 'LOSE';
  const sub = r.win ? `${r.method}勝ち　${oppDisplayName(r.d, r.ex)}` : `${r.method === '棄権' ? '棄権' : r.method + '負け'}　${oppDisplayName(r.d, r.ex)}`;
  const quote = r.win ? r.d.quotes.lose : r.d.quotes.win;
  let cards = '';
  if (r.cards) cards = `<div class="res-box"><div class="res-row"><b>ジャッジ採点</b><span>${r.cards.p.map((v, i) => `${v}-${r.cards.o[i]}`).join(' / ')}</span></div></div>`;
  $('#scr-result').innerHTML = `<div class="res">
    <div class="res-big ${r.win ? 'win' : 'lose'}">${big}</div>
    <div class="res-sub">${esc(sub)}</div>
    <div class="coach"><canvas class="rp"></canvas><p><b>${esc(oppDisplayName(r.d, r.ex))}</b>${esc(quote)}</p></div>
    ${cards}
    <div class="res-box">
      <div class="res-row"><span>決着</span><b>ROUND ${r.round}　${fmtTime(r.elapsed)}</b></div>
      <div class="res-row"><span>パンチ命中率</span><b>${s.landed} / ${s.thrown}（${acc}%）</b></div>
      <div class="res-row"><span>カウンター</span><b>${s.counters}回</b></div>
      <div class="res-row"><span>回避成功</span><b>${s.dodges}回</b></div>
      <div class="res-row"><span>最大コンボ</span><b>${s.maxCombo}</b></div>
      <div class="res-row"><span>奪ったダウン / 喫したダウン</span><b>${s.kdG} / ${s.kdT}</b></div>
      <div class="res-row"><span>被ダメージ</span><b>${Math.round(s.taken)}</b></div>
    </div>
    <div class="res-box">
      <div class="res-row"><span>ファイトマネー</span><b class="g">+${fmtMoney(r.money)}</b></div>
      <div class="res-row"><span>経験値</span><b class="g">+${r.exp} EXP</b></div>
      ${r.bonus.map(b => `<div class="res-row"><span>ボーナス</span><b>${esc(b)}</b></div>`).join('')}
    </div>
    ${r.lvUps ? `<div class="lvup">LEVEL UP!! Lv${S.level}<br><small style="font-size:14px;font-family:var(--body)">能力ポイントを獲得！ステータス画面で振り分けよう</small></div>` : ''}
    ${!r.win && r.mode === 'career' ? `<div class="coach"><canvas class="cp2"></canvas><p><b>ゲン</b>${esc(pick(r.d.tips.length ? r.d.tips : COACH_TIPS))}</p></div>` : ''}
    <button class="btn red" data-cmd="resultNext" type="button">つづける</button>
  </div>
  <a class="credit" href="https://github.com/h1ro223" target="_blank" rel="noopener">made by hiro/ヒロ</a>`;
  show('scr-result'); bgm(r.win ? 'title' : 'story');
  portrait($('#scr-result .rp'), oppLook(r.d), r.win ? 'hurt' : 'grin');
  const c2 = $('#scr-result .cp2'); if (c2) portrait(c2, COACH_LOOK);
  RESULT_CTX = r;
}
let RESULT_CTX = null;
function resultNext() {
  const r = RESULT_CTX; RESULT_CTX = null;
  if (r && r.win && r.mode === 'career' && !r.ex) {
    const id = r.d.id;
    const key = id === 'goliath' ? 'belt1' : id === 'mike' ? 'belt2' : id === 'maddog' ? 'belt3' : id === 'zeus' ? 'ending' : null;
    if (key && !S.story[key]) { showStory(key, goHub); return; }
  }
  if (r && r.win && r.d.id === 'gen' && !S.story.afterGen) { showStory('afterGen', goHub); return; }
  if (r && r.win && r.d.id === 'mirror' && !S.story.afterMirror) { showStory('afterMirror', goHub); return; }
  if (r && r.mode === 'exhib') { goExhibition(); return; }
  goHub();
}

/* ---------- サバイバル ---------- */
function survivalPool() {
  const max = Math.min(MAIN_COUNT - 1, Math.max(0, S.progress));
  return OPP.slice(0, max + 1);
}
function startSurvival() {
  const dv = derived();
  SURV = { stage: 1, hp: dv.maxHp, money: 0, exp: 0, used: [] };
  nextSurvival();
}
function nextSurvival() {
  const pool = survivalPool();
  const lo = Math.min(pool.length - 1, Math.floor((SURV.stage - 1) / 3)), hi = Math.min(pool.length - 1, lo + 2);
  const d = pool[randi(lo, hi)];
  const ex = SURV.stage > pool.length * 2 && chance(.5);
  showVS(d, ex, () => startFight({ oppId: d.id, mode: 'survival', rounds: 1, startHp: SURV.hp, stage: SURV.stage, ex }), 'SURVIVAL STAGE ' + SURV.stage);
}
function survivalAfter(r) {
  if (r.win) {
    S.st.survFights++;
    SURV.money += r.d.purse * .2; SURV.exp += r.d.exp * .2;
    const dv = derived(); SURV.hp = Math.min(dv.maxHp, r.hpLeft + dv.maxHp * .3);
    const cleared = SURV.stage; SURV.stage++;
    if (cleared > S.survivalBest) S.survivalBest = cleared;
    checkAch(r); save();
    show('scr-menu');
    renderMenu('サバイバル', `<div class="res" style="margin:0 auto">
      <div class="res-big win" style="font-size:54px">STAGE ${cleared}<br>CLEAR!</div>
      <div class="res-box"><div class="res-row"><span>残り体力（+30%回復後）</span><b>${Math.round(SURV.hp)} / ${Math.round(dv.maxHp)}</b></div>
      <div class="res-row"><span>獲得予定</span><b class="g">${fmtMoney(SURV.money)} / ${Math.round(SURV.exp)} EXP</b></div>
      <div class="res-row"><span>自己ベスト</span><b>${S.survivalBest} 連勝</b></div></div>
      <button class="btn red" data-cmd="survNext" type="button">次のステージへ！</button>
      <button class="btn ghost" data-cmd="survQuit" type="button">ここでやめる（報酬を受け取る）</button></div>`, () => survQuit());
    sfx('win');
  } else survQuit(true);
}
function survQuit(lost) {
  const m = addMoney(SURV.money), e = Math.round(SURV.exp), lv = gainExp(e), cleared = SURV.stage - 1;
  S.week++; S.energy = 3; checkAch(); save();
  SURV = null;
  openModal(`<h3>サバイバル終了</h3>
    <p style="text-align:center;font-size:18px;font-weight:800">${lost ? 'STAGE ' + (cleared + 1) + ' で力尽きた…' : 'ナイスファイト！'}</p>
    <div class="kv"><span>連勝数</span><span>${cleared}</span><span>自己ベスト</span><span>${S.survivalBest}</span>
    <span>獲得ファイトマネー</span><span>+${fmtMoney(m)}</span><span>経験値</span><span>+${e}</span></div>
    ${lv ? `<p class="lvup">LEVEL UP! Lv${S.level}</p>` : ''}
    <div class="btns"><button class="btn gold" data-mcb="ok" type="button">OK</button></div>`, { ok: () => { closeModal(); goHub(); } });
  sfx(lost ? 'lose' : 'coin');
}

/* ---------- VS 画面 ---------- */
let VS_GO = null, VS_T = 0;
function showVS(d, ex, go, label) {
  const circ = CIRCUITS[d.circuit];
  $('#scr-vs').innerHTML = `
    <div class="vs-side vs-l"><canvas class="vsp"></canvas><div class="vs-name">${esc(S.name)}</div><div class="vs-sub">Lv${S.level}　${S.record.w}勝${S.record.l}敗（${S.record.ko}KO）</div></div>
    <div class="vs-side vs-r"><canvas class="vso"></canvas><div class="vs-name">${esc(oppDisplayName(d, ex))}</div><div class="vs-sub">${esc(d.title)}　/　${esc(d.from)}${d.age ? '　' + d.age + '歳' : ''}</div></div>
    <div class="vs-mid">VS</div>
    <div class="vs-info">${label ? `<div class="belt">${esc(label)}</div>` : d.champ ? `<div class="belt">🏆 ${esc(circ.belt)} タイトルマッチ</div>` : `<div class="belt" style="background:${circ.col}">${esc(circ.name)}</div>`}
    <div class="tap">TAP / ENTER でファイト！</div></div>`;
  show('scr-vs'); bgm(d.bgm === 'boss' ? 'boss' : 'fight'); sfx('gong');
  portrait($('#scr-vs .vsp'), Object.assign(playerLook(), {}), 'angry', { bg: '#2a57c8' });
  portrait($('#scr-vs .vso'), oppLook(d), 'angry', { bg: '#c0282e' });
  VS_GO = go; VS_T = performance.now();
}
$('#scr-vs').addEventListener('click', () => vsGo());
function vsGo() { if (!VS_GO || performance.now() - VS_T < 700) return; const g = VS_GO; VS_GO = null; sfx('select'); g(); }

/* ---------- ストーリー ---------- */
let ST = null;
function showStory(key, after) {
  const sc = STORY[key]; if (!sc) { after && after(); return; }
  S.story[key] = true; save();
  ST = { key, sc, i: -1, after, typing: 0, full: '', timer: null };
  $('#scr-story').innerHTML = `<div class="st-title">${esc(sc.title)}</div>
    <button class="btn sm ghost st-skip" data-cmd="storySkip" type="button">スキップ ▶▶</button>
    <div class="st-stage"><canvas class="stc"></canvas></div>
    <div class="st-box"><div class="st-name"></div><div class="st-text"></div><div class="st-next">▼ TAP</div></div>`;
  show('scr-story'); bgm('story');
  storyNext();
}
function storyNext() {
  if (!ST) return;
  if (ST.typing < ST.full.length) { ST.typing = ST.full.length; $('#scr-story .st-text').textContent = ST.full; return; }
  ST.i++;
  if (ST.i >= ST.sc.lines.length) { const a = ST.after; clearInterval(ST.timer); ST = null; a && a(); return; }
  const [who, text] = ST.sc.lines[ST.i];
  const name = who === 'gen' ? 'ゲン会長' : who === 'you' ? S.name : (OPP_BY[who] ? OPP_BY[who].name : who);
  $('#scr-story .st-name').textContent = name;
  const cvs = $('#scr-story .stc');
  cvs.style.opacity = who === 'you' ? .0 : 1;
  if (who !== 'you') portrait(cvs, who === 'gen' ? COACH_LOOK : OPP_BY[who].look, 'idle', { bg: false });
  ST.full = text.replace('{name}', S.name); ST.typing = 0;
  const el = $('#scr-story .st-text'); el.textContent = '';
  clearInterval(ST.timer);
  ST.timer = setInterval(() => {
    if (!ST) return;
    ST.typing = Math.min(ST.full.length, ST.typing + 1); el.textContent = ST.full.slice(0, ST.typing);
    if (ST.typing % 4 === 0) tone(700, .03, 'square', .04);
    if (ST.typing >= ST.full.length) clearInterval(ST.timer);
  }, 28);
}
$('#scr-story').addEventListener('click', e => { if (e.target.closest('[data-cmd]')) return; auInit(); storyNext(); });

/* ---------- 汎用メニュー ---------- */
let MENU_BACK = null;
function renderMenu(title, html, back, meta = '') {
  $('#menuTitle').textContent = title;
  $('#menuMeta').innerHTML = meta;
  $('#menuBody').innerHTML = html;
  $('#menuBody').scrollTop = 0;
  MENU_BACK = back || goHub;
  show('scr-menu');
}
function moneyChip() { return `<span class="chip"><span class="k">所持金</span>${fmtMoney(S.money)}</span>`; }
function energyHTML() { let h = ''; for (let i = 0; i < 3; i++) h += `<i class="${i < S.energy ? 'on' : ''}"></i>`; return h; }
function paintPortraits(root = document) {
  root.querySelectorAll('canvas[data-por]').forEach(cv => {
    const id = cv.dataset.por, ex = cv.dataset.ex === '1', lock = cv.dataset.lock === '1';
    const look = id === 'coach' ? COACH_LOOK : id === 'player' ? playerLook() : oppLook(OPP_BY[id]);
    portrait(cv, look, cv.dataset.expr || 'idle', { locked: lock, bg: ex ? '#7a1f3a' : undefined });
  });
}

/* ---------- ハブ（ジム） ---------- */
function goHub() {
  closeModal(); SCENE = null; F = null; TR = null;
  const done = S.progress >= MAIN_COUNT;
  const d = done ? null : OPP[S.progress];
  const need = expNeed(S.level), xpPct = S.level >= LV_MAX ? 100 : Math.floor(S.exp / need * 100);
  let coachMsg;
  if (S.points > 0) coachMsg = `能力ポイントが <b>${S.points}</b> 余っとるで！「ステータス」で振り分けや。`;
  else if (!done && (S.losses[d.id] || 0) >= 2) coachMsg = pick(d.tips);
  else if (S.energy > 0) coachMsg = `今週はあと <b>${S.energy}回</b> トレーニングできるで。体を作ってから挑むのもアリや。`;
  else coachMsg = pick(COACH_TIPS);
  if (done) coachMsg = S.beaten.mirror ? 'お前はもう真の伝説や。EX版の猛者たちにも挑んでみい！' : S.beaten.gen ? '「シャドウ」がエキシビションに現れたで…！' : '全盛期のワシ「ゲン」がエキシビションで待っとるで！';
  const circ = d ? CIRCUITS[d.circuit] : null;
  $('#scr-hub').innerHTML = `<div class="hub">
    <div class="hub-top">
      <div class="hub-name">${esc(S.name)}<small>Lv${S.level}</small></div>
      <div class="chips">
        ${moneyChip()}
        <span class="chip"><span class="k">第</span>${S.week}<span class="k">週</span></span>
        <span class="chip energy"><span class="k">練習</span>${energyHTML()}</span>
        <span class="chip"><span class="k">戦績</span>${S.record.w}勝${S.record.l}敗</span>
      </div>
    </div>
    <div class="xpbar" title="EXP"><b style="width:${xpPct}%"></b></div>
    ${d ? `<div class="poster">
      <canvas data-por="${d.id}" data-expr="grin"></canvas>
      <div class="pinfo">
        <div class="pcirc" style="color:${circ.col}">${esc(circ.name)} ${d.champ ? '🏆 タイトルマッチ' : `第${d.idx % 4 + 1}戦`}</div>
        <div class="pname">${esc(d.name)}</div>
        <div class="pttl">${esc(d.title)}　/　${esc(d.from)}</div>
        <div class="pquote">「${esc(d.quotes.intro)}」</div>
        <button class="btn red" data-cmd="fight" type="button">🥊 試合に挑む <small>(3R)</small></button>
      </div></div>`
    : `<div class="poster" style="grid-template-columns:1fr"><div class="pinfo" style="align-items:center;text-align:center">
        <div class="pcirc" style="color:var(--gold)">CAREER COMPLETE</div><div class="pname">👑 統一世界王者 👑</div>
        <div class="pttl">あなたは頂点に立った。エキシビション・サバイバルで更なる高みへ！</div>
        <button class="btn gold" data-cmd="exhib" type="button">エキシビションへ</button></div></div>`}
    <div class="coach"><canvas data-por="coach"></canvas><p><b>ゲン会長</b>${coachMsg}</p></div>
    <div class="hub-grid">
      <button class="btn" data-cmd="training" type="button"><span class="ic">🏋️</span>トレーニング<small>残り${S.energy}回</small></button>
      <button class="btn" data-cmd="status" type="button"><span class="ic">📊</span>ステータス${S.points ? `<small style="color:var(--gold)">ポイント${S.points}</small>` : '<small>能力・装備</small>'}</button>
      <button class="btn" data-cmd="shop" type="button"><span class="ic">🛒</span>ショップ<small>装備・アイテム</small></button>
      <button class="btn" data-cmd="items" type="button"><span class="ic">🎒</span>アイテム<small>持ち物を使う</small></button>
      <button class="btn" data-cmd="opps" type="button"><span class="ic">🗺️</span>対戦相手<small>サーキット</small></button>
      <button class="btn" data-cmd="exhib" type="button"><span class="ic">🎪</span>エキシビション<small>再戦・EX</small></button>
      <button class="btn" data-cmd="survival" type="button"><span class="ic">🔥</span>サバイバル<small>最高${S.survivalBest}連勝</small></button>
      <button class="btn" data-cmd="rest" type="button"><span class="ic">🛌</span>休んで次週へ<small>練習回数回復</small></button>
      <button class="btn" data-cmd="records" type="button"><span class="ic">🏆</span>記録・実績<small>${Object.keys(S.ach).length}/${ACH.length}</small></button>
      <button class="btn" data-cmd="howto" type="button"><span class="ic">📖</span>遊び方</button>
      <button class="btn" data-cmd="settings" type="button"><span class="ic">⚙️</span>設定</button>
      <button class="btn" data-cmd="title" type="button"><span class="ic">🚪</span>タイトルへ</button>
    </div>
  </div>
  <a class="credit" href="https://github.com/h1ro223" target="_blank" rel="noopener">made by hiro/ヒロ</a>`;
  show('scr-hub'); bgm('gym'); paintPortraits($('#scr-hub'));
}
function careerFight() {
  if (S.progress >= MAIN_COUNT) return;
  const d = OPP[S.progress];
  const go = () => showVS(d, false, () => startFight({ oppId: d.id, mode: 'career', rounds: 3 }));
  if (d.id === 'zeus' && !S.story.preZeus) showStory('preZeus', go); else go();
}

/* ---------- トレーニング ---------- */
let TRAIN_PRACTICE = false;
function goTrainingMenu() {
  TRAIN_PRACTICE = false;
  const pro = S.proteinLeft > 0 ? `<span class="tag green">プロテイン効果 残り${S.proteinLeft}回</span>` : '';
  renderMenu('トレーニング', `
    <div class="coach"><canvas data-por="coach"></canvas><p><b>ゲン会長</b>トレーニングは週3回までや。ランクが高いほど能力がグンと伸びる！ ${pro}</p></div>
    <div class="sec"><h3>メニュー（残り ${S.energy} 回）</h3><div class="list">
    ${Object.entries(TRAIN).map(([k, t]) => `<div class="card"><div class="ai" style="font-size:30px;width:52px;text-align:center">${t.ic}</div>
      <div class="ci"><div class="ct">${t.name} <span class="tag" style="background:${STAT_INFO[t.stat].col}">${STAT_INFO[t.stat].name}</span></div>
      <div class="cd">${esc(t.desc)}<br>ベスト: ${S.trainBest[k] || 0}　/　${STAT_INFO[t.stat].name} ${S.stats[t.stat]}（次まで ${100 - S.statXp[t.stat]}）</div></div>
      <div class="cr"><button class="btn sm red ${S.energy <= 0 ? 'dis' : ''}" data-cmd="train" data-arg="${k}" type="button">開始</button></div></div>`).join('')}
    </div></div>
    <div class="sec"><h3>練習モード</h3><p class="cd" style="color:var(--steel);font-size:13px;margin-bottom:8px">回数を消費せずに遊べます（能力は上がりません）。</p>
      <button class="btn ghost" data-cmd="freeTrain" type="button">練習モードで遊ぶ</button></div>`,
    goHub, `<span class="chip energy"><span class="k">練習</span>${energyHTML()}</span>`);
  paintPortraits($('#menuBody'));
}
function goFreeTraining() {
  renderMenu('練習モード', `<div class="list">
    ${Object.entries(TRAIN).map(([k, t]) => `<div class="card"><div style="font-size:30px;width:52px;text-align:center">${t.ic}</div>
      <div class="ci"><div class="ct">${t.name}</div><div class="cd">${esc(t.desc)}<br>ベスト: ${S.trainBest[k] || 0}</div></div>
      <div class="cr"><button class="btn sm" data-cmd="trainFree" data-arg="${k}" type="button">練習</button></div></div>`).join('')}
    </div>`, goTrainingMenu);
}

/* ---------- ステータス ---------- */
function goStatus() {
  const dv = derived();
  const eq = S.equip;
  renderMenu('ステータス', `
    <div class="sec"><h3>能力値 <span class="tag gold">ポイント ${S.points}</span></h3>
    ${Object.entries(STAT_INFO).map(([k, i]) => `<div class="stat-row">
      <div class="sn">${i.name}<small>${i.sub}</small></div>
      <div class="sbar"><b style="width:${S.stats[k] / STAT_MAX * 100}%;background:${i.col}"></b><u style="width:${S.statXp[k]}%"></u></div>
      <div class="sv">${S.stats[k]}</div>
      <button class="plus" data-cmd="addStat" data-arg="${k}" type="button" ${S.points > 0 && S.stats[k] < STAT_MAX ? '' : 'disabled'} aria-label="${i.name}を上げる">＋</button></div>`).join('')}
    </div>
    <div class="sec"><h3>詳細</h3><div class="kv">
      <span>Lv / EXP</span><span>${S.level}　(${S.exp}/${expNeed(S.level)})</span>
      <span>最大体力</span><span>${dv.maxHp}</span>
      <span>最大スタミナ / 回復</span><span>${dv.maxSta} / ${dv.staRegen.toFixed(1)}/秒</span>
      <span>パンチ威力倍率</span><span>×${dv.dmgMul.toFixed(2)}</span>
      <span>パンチ速度</span><span>${(0.3 * dv.spdMul).toFixed(3)}秒</span>
      <span>カウンター倍率</span><span>×${dv.counterMul.toFixed(2)}</span>
      <span>カウンター時★獲得率</span><span>${Math.round(dv.starChance * 100)}%</span>
      <span>被ダメージ</span><span>×${dv.defMul.toFixed(2)}</span>
      <span>回避の無敵時間</span><span>${(0.43 * dv.dodgeWin).toFixed(2)}秒</span>
    </div></div>
    <div class="sec"><h3>装備</h3><div class="kv">
      <span>グローブ</span><span>${GEAR[eq.glove].name}</span><span>シューズ</span><span>${GEAR[eq.shoe].name}</span>
      <span>トランクス</span><span>${GEAR[eq.trunk].name}</span><span>グローブ色</span><span>${GEAR[eq.color].name}</span></div>
      <div style="margin-top:10px"><button class="btn ghost sm" data-cmd="shop" type="button">ショップで装備を変える</button></div></div>`,
    goHub, moneyChip());
}

/* ---------- ショップ ---------- */
let SHOP_TAB = 'glove';
function goShop(tab) {
  if (tab) SHOP_TAB = tab;
  const tabs = [['glove', 'グローブ'], ['shoe', 'シューズ'], ['trunk', 'トランクス'], ['color', 'グローブ色'], ['item', 'アイテム']];
  let body = '';
  if (SHOP_TAB === 'item') {
    body = Object.entries(ITEMS).map(([k, it]) => `<div class="card"><div style="font-size:30px;width:52px;text-align:center">${it.ic}</div>
      <div class="ci"><div class="ct">${it.name}　<span class="tag">所持 ${S.items[k]}</span></div><div class="cd">${esc(it.desc)}</div></div>
      <div class="cr"><b>${fmtMoney(it.price)}</b><button class="btn sm gold ${S.money < it.price ? 'dis' : ''}" data-cmd="buyItem" data-arg="${k}" type="button">購入</button></div></div>`).join('');
  } else {
    const slot = SHOP_TAB;
    body = Object.entries(GEAR).filter(([, g]) => g.type === slot).map(([k, g]) => {
      const own = S.owned.includes(k), eqd = S.equip[slot] === k;
      const locked = g.belts && beltCount() < g.belts;
      const sw = slot === 'trunk' ? `<div style="width:52px;height:52px;border-radius:10px;background:linear-gradient(180deg,${g.c2} 0 22%,${g.c1} 22%)"></div>`
        : slot === 'color' ? `<div style="width:52px;height:52px;border-radius:50%;background:radial-gradient(circle at 35% 30%,${shade(g.c, .4)},${g.c} 60%,${shade(g.c, -.4)})"></div>`
        : `<div style="font-size:30px;width:52px;text-align:center">${slot === 'glove' ? '🥊' : '👟'}</div>`;
      const btn = eqd ? `<span class="tag green">装備中</span>` : own ? `<button class="btn sm" data-cmd="equip" data-arg="${k}" type="button">装備</button>`
        : locked ? `<span class="tag">ベルト${g.belts}本必要</span>` : `<button class="btn sm gold ${S.money < g.price ? 'dis' : ''}" data-cmd="buyGear" data-arg="${k}" type="button">購入</button>`;
      return `<div class="card ${eqd ? 'sel' : ''} ${locked ? 'lock' : ''}">${sw}<div class="ci"><div class="ct">${esc(g.name)}</div><div class="cd">${esc(g.desc || '見た目が変わります')}</div></div>
        <div class="cr">${own ? '' : `<b>${fmtMoney(g.price)}</b>`}${btn}</div></div>`;
    }).join('');
  }
  renderMenu('ショップ', `<div class="tabs">${tabs.map(([k, n]) => `<button class="${k === SHOP_TAB ? 'on' : ''}" data-cmd="shopTab" data-arg="${k}" type="button">${n}</button>`).join('')}</div>
    <div class="list">${body}</div>`, goHub, moneyChip());
}
function goItems() {
  renderMenu('アイテム', `<div class="list">${Object.entries(ITEMS).map(([k, it]) => `<div class="card"><div style="font-size:30px;width:52px;text-align:center">${it.ic}</div>
    <div class="ci"><div class="ct">${it.name}　<span class="tag">所持 ${S.items[k]}</span></div><div class="cd">${esc(it.desc)}</div></div>
    <div class="cr">${k === 'drink' ? '<span class="tag">試合中に使用</span>' : `<button class="btn sm gold ${S.items[k] <= 0 ? 'dis' : ''}" data-cmd="useItem" data-arg="${k}" type="button">使う</button>`}</div></div>`).join('')}
    </div><div style="margin-top:12px"><button class="btn ghost" data-cmd="shopItem" type="button">🛒 ショップで買う</button></div>
    ${S.proteinLeft > 0 ? `<p style="margin-top:10px;color:var(--gold);font-weight:800">プロテイン効果：残り${S.proteinLeft}回</p>` : ''}`, goHub, moneyChip());
}

/* ---------- 対戦相手一覧 ---------- */
function goOpponents() {
  let html = '';
  CIRCUITS.forEach((c, ci) => {
    const list = OPP.filter(o => o.circuit === ci);
    if (ci === 4 && !S.beaten.zeus) return;
    html += `<div class="circ"><div class="circ-h"><i style="background:${c.col}"></i>${esc(c.name)}</div><div class="og">`;
    list.forEach(o => {
      const known = o.idx <= S.progress || S.beaten[o.id] || (o.id === 'gen' && S.beaten.zeus) || (o.id === 'mirror' && S.beaten.gen);
      html += `<button class="oc ${S.beaten[o.id] ? 'beat' : ''} ${o.champ ? 'champ' : ''}" data-cmd="oppInfo" data-arg="${o.id}" type="button" ${known ? '' : 'disabled'}>
        <canvas data-por="${o.id}" ${known ? '' : 'data-lock="1"'}></canvas>
        <div class="on">${known ? esc(oppDisplayName(o)) : '？？？'}</div>
        <div class="os">${known ? esc(o.title) : 'LOCKED'}</div></button>`;
    });
    html += '</div></div>';
  });
  renderMenu('対戦相手', html, goHub, `<span class="chip">🏆 ベルト ${beltCount()}本</span>`);
  paintPortraits($('#menuBody'));
}
function oppInfo(id) {
  const d = OPP_BY[id];
  const bt = S.bestTime[id], btx = S.bestTime[id + '_ex'];
  openModal(`<h3>${esc(oppDisplayName(d))}</h3>
    <div class="coachline"><canvas class="oip"></canvas><p>${esc(d.title)}<br><span style="color:var(--steel)">${esc(d.from)}${d.age ? '　' + d.age + '歳' : ''}</span></p></div>
    <div class="kv"><span>勝利</span><span>${S.beaten[id] ? '済' : '―'}${S.beatenEx[id] ? '　EX済' : ''}</span>
    <span>敗北回数</span><span>${S.losses[id] || 0}</span><span>ベストタイム</span><span>${bt ? bt.toFixed(1) + '秒' : '―'}${btx ? '　EX ' + btx.toFixed(1) + '秒' : ''}</span>
    <span>ファイトマネー</span><span>${fmtMoney(d.purse)}</span></div>
    ${d.specials.length && S.beaten[id] ? `<p><b>必殺技：</b>${d.specials.map(s => esc(s.name)).join('、')}</p>` : ''}
    ${d.tips.length ? `<div class="coachline"><canvas class="oic"></canvas><p><b style="color:var(--gold)">ゲン</b><br>${esc(d.tips[0])}</p></div>` : ''}
    <div class="btns"><button class="btn gold" data-mcb="ok" type="button">閉じる</button></div>`, { ok: closeModal });
  portrait($('#mbox .oip'), oppLook(d), 'grin'); const oc = $('#mbox .oic'); if (oc) portrait(oc, COACH_LOOK);
}

/* ---------- エキシビション ---------- */
function goExhibition() {
  const ids = unlockedIds();
  if (!ids.length) {
    renderMenu('エキシビション', `<div class="coach"><canvas data-por="coach"></canvas><p><b>ゲン会長</b>キャリアで倒した相手と、ここで何度でも再戦できるで。まずは1勝や！</p></div>`, goHub);
    paintPortraits($('#menuBody')); return;
  }
  renderMenu('エキシビション', `<p style="color:var(--steel);font-size:13px;margin-bottom:10px">倒した相手と再戦できます。報酬は40%（EX版は強化＆報酬80%）。</p>
    <div class="og">${ids.map(id => { const o = OPP_BY[id]; return `<button class="oc ${S.beaten[id] ? 'beat' : ''}" data-cmd="exSel" data-arg="${id}" type="button">
      <canvas data-por="${id}"></canvas><div class="on">${esc(oppDisplayName(o))}</div><div class="os">${S.beatenEx[id] ? '<span class="tag red">EX撃破</span>' : esc(CIRCUITS[o.circuit].name)}</div></button>`; }).join('')}</div>`, goHub, moneyChip());
  paintPortraits($('#menuBody'));
}
let EX_CFG = { ex: false, rounds: 3 };
function exSelect(id) {
  const d = OPP_BY[id], canEx = !!S.beaten[id] && !d.secret;
  if (!canEx) EX_CFG.ex = false;
  const render = () => openModal(`<h3>${esc(oppDisplayName(d, EX_CFG.ex))}</h3>
    <div class="set-row"><div class="sl">EXモード<small>${canEx ? '体力・攻撃力・速度が大幅アップ' : 'この相手は選べません'}</small></div>
      <div class="seg"><button data-mcb="ex" data-arg="0" class="${EX_CFG.ex ? '' : 'on'}" type="button">通常</button><button data-mcb="ex" data-arg="1" class="${EX_CFG.ex ? 'on' : ''}" type="button" ${canEx ? '' : 'disabled'}>EX</button></div></div>
    <div class="set-row"><div class="sl">ラウンド数</div><div class="seg">${[1, 3, 5].map(n => `<button data-mcb="rd" data-arg="${n}" class="${EX_CFG.rounds === n ? 'on' : ''}" type="button">${n}R</button>`).join('')}</div></div>
    <div class="btns row"><button class="btn ghost" data-mcb="no" type="button">やめる</button><button class="btn red" data-mcb="go" type="button">ファイト！</button></div>`, {
    ex: v => { EX_CFG.ex = v === '1' && canEx; render(); }, rd: v => { EX_CFG.rounds = +v; render(); }, no: closeModal,
    go: () => { closeModal(); const c = Object.assign({}, EX_CFG); showVS(d, c.ex, () => startFight({ oppId: id, mode: 'exhib', rounds: c.rounds, ex: c.ex }), c.ex ? 'EXHIBITION - EX' : 'EXHIBITION'); }
  });
  render();
}
function goSurvivalMenu() {
  renderMenu('サバイバル', `<div class="coach"><canvas data-por="coach"></canvas><p><b>ゲン会長</b>1ラウンド勝負を連続で戦うモードや。体力は少ししか回復せん。どこまで勝ち抜けるか試してみい！</p></div>
    <div class="res-box" style="margin:12px 0"><div class="res-row"><span>自己ベスト</span><b>${S.survivalBest} 連勝</b></div>
    <div class="res-row"><span>登場する相手</span><b>${esc(OPP[Math.min(MAIN_COUNT - 1, S.progress)].name)} まで</b></div>
    <div class="res-row"><span>報酬</span><b>勝利ごとにファイトマネー20%</b></div></div>
    <button class="btn red" data-cmd="survStart" type="button">🔥 サバイバル開始</button>`, goHub);
  paintPortraits($('#menuBody'));
}

/* ---------- 記録・実績 ---------- */
let REC_TAB = 'rec';
function goRecords(tab) {
  if (tab) REC_TAB = tab;
  const tabs = `<div class="tabs"><button class="${REC_TAB === 'rec' ? 'on' : ''}" data-cmd="recTab" data-arg="rec" type="button">戦績</button><button class="${REC_TAB === 'ach' ? 'on' : ''}" data-cmd="recTab" data-arg="ach" type="button">実績 ${Object.keys(S.ach).length}/${ACH.length}</button></div>`;
  let body;
  if (REC_TAB === 'ach') {
    body = `<div class="ach">${ACH.map(([id, ic, n, desc]) => `<div class="a ${S.ach[id] ? 'got' : ''}"><div class="ai">${S.ach[id] ? ic : '🔒'}</div><div><b>${esc(n)}</b><small>${esc(desc)}</small></div></div>`).join('')}</div>`;
  } else {
    const st = S.st;
    body = `<div class="sec"><h3>通算成績</h3><div class="kv">
      <span>戦績</span><span>${S.record.w}勝 ${S.record.l}敗 ${S.record.d}分（${S.record.ko}KO）</span>
      <span>試合数</span><span>${st.fights}</span><span>当てたパンチ / 打ったパンチ</span><span>${st.landed} / ${st.punches}</span>
      <span>カウンター</span><span>${st.counters}</span><span>使った★</span><span>${st.stars}</span>
      <span>奪ったダウン / 喫したダウン</span><span>${st.kds} / ${st.downs}</span><span>パーフェクト勝利</span><span>${st.perfect}</span>
      <span>トレーニング回数</span><span>${st.trainings}（S: ${st.sGrades}）</span><span>獲得ファイトマネー</span><span>${fmtMoney(st.earned)}</span>
      <span>サバイバル最高</span><span>${S.survivalBest}連勝</span><span>経過週</span><span>${S.week}週</span></div></div>
      <div class="sec"><h3>トレーニング自己ベスト</h3><div class="kv">${Object.entries(TRAIN).map(([k, t]) => `<span>${t.name}</span><span>${S.trainBest[k] || 0}</span>`).join('')}</div></div>
      <div class="sec"><h3>ベストタイム</h3><table class="tbl"><tr><th>相手</th><th>通常</th><th>EX</th></tr>
      ${OPP.filter(o => S.beaten[o.id]).map(o => `<tr><td>${esc(oppDisplayName(o))}</td><td>${S.bestTime[o.id] ? S.bestTime[o.id].toFixed(1) + '秒' : '―'}</td><td>${S.bestTime[o.id + '_ex'] ? S.bestTime[o.id + '_ex'].toFixed(1) + '秒' : '―'}</td></tr>`).join('') || '<tr><td colspan="3">まだ記録がありません</td></tr>'}</table></div>`;
  }
  renderMenu('記録・実績', tabs + body, goHub);
}

/* ---------- 遊び方 ---------- */
function controlsHTML() {
  return `<div class="keys">
    <span><kbd>←</kbd><kbd>→</kbd></span><span>左右に回避（スウェー）</span>
    <span><kbd>↓</kbd></span><span>ダッキング（しゃがんで回避）</span>
    <span><kbd>↑</kbd></span><span>ガード（押しっぱなし）</span>
    <span><kbd>Z</kbd><kbd>X</kbd></span><span>左 / 右 顔面パンチ（J / K でも可）</span>
    <span><kbd>A</kbd><kbd>S</kbd></span><span>左 / 右 ボディパンチ（N / M でも可）</span>
    <span><kbd>Space</kbd></span><span>スターパンチ（★を全部使う / L でも可）</span>
    <span><kbd>Esc</kbd><kbd>P</kbd></span><span>ポーズ</span></div>
    <p style="margin-top:8px;font-size:13px;color:var(--steel)">スマホは画面下のボタンで操作。十字＝回避/ガード、右側＝パンチ。</p>`;
}
function goHowto(back) {
  const rows = Object.values(ATK).filter(a => a.side === 'L').map(a => `<tr><td><span style="color:${KIND_COLOR[a.kind]}">●</span> ${a.label}</td><td>${(a.kind === 'hook' ? ['逆側に回避', '▼'] : a.avoid.map(x => GUIDE_SYM[x])).join(' ')}</td><td>${a.kind === 'upper' ? 'ダッキングは大ダメージ' : a.kind === 'body' ? 'ガードで完全防御' : a.kind === 'hay' ? 'しゃがむしかない' : a.kind === 'straight' ? '最速・予備動作短い' : a.kind === 'jab' ? 'どれでもOK' : 'パンチと逆に避ける'}</td></tr>`).join('');
  renderMenu('遊び方', `<div class="howto">
    <div class="sec"><h3>操作方法</h3>${controlsHTML()}</div>
    <div class="sec"><h3>勝利の基本「見切って、かわして、打つ」</h3><ul>
      <li>相手が腕を引いたら攻撃の合図。<b>グローブが光る色</b>で技の種類がわかります。</li>
      <li>正しい方向にかわすと相手は隙だらけ。直後の一発は<b>カウンター</b>（ダメージ大・★獲得）。</li>
      <li>挑発中・振りかぶり中（ジャブ/フック/アッパー/ボディ）を殴っても<b>カウンター</b>になり攻撃を止められます。</li>
      <li>ガードしている所を殴っても効きません。スタミナも減り、反撃されることも。</li>
      <li>★はスターパンチに使用。★が多いほど威力UP、★2以上で相手がフラフラに。<b>殴られると★が1つ減ります</b>。</li>
      <li>相手を1ラウンドに3回ダウンさせるとTKO。10カウント以内に立てなければKO。</li>
      <li>自分がダウンしたらボタン連打で立ち上がれ！</li></ul></div>
    <div class="sec"><h3>相手の攻撃とかわし方</h3><table class="tbl"><tr><th>攻撃（光の色）</th><th>かわし方</th><th>メモ</th></tr>${rows}</table></div>
    <div class="sec"><h3>キャリアの進め方</h3><ul>
      <li>ルーキー → メジャー → ワールド → レジェンドの4サーキット、全16人を倒して統一世界王者を目指そう。</li>
      <li>トレーニングは週3回。試合をするか「休む」と週が進んで回復します。</li>
      <li>レベルアップで得た能力ポイントをステータスで振り分けよう。</li>
      <li>ファイトマネーでグローブやシューズを買うと更に強くなれます。</li>
      <li>クリア後は秘密の相手やEXモード、サバイバル、32個の実績が待っています。</li></ul></div>
    <p style="text-align:center;margin-top:10px"><a href="https://github.com/h1ro223" target="_blank" rel="noopener" style="color:var(--gold);font-weight:800">made by hiro/ヒロ</a></p></div>`, back || goHub);
}

/* ---------- 設定 ---------- */
function goSettings(back) {
  const st = S.settings;
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, n]) => `<button data-cmd="set" data-arg="${key}:${v}" class="${String(st[key]) === String(v) ? 'on' : ''}" type="button">${n}</button>`).join('')}</div>`;
  const bk = back || goHub;
  renderMenu('設定', `
    <div class="set-row"><div class="sl">難易度<small>相手の速さ・攻撃力（HARDは報酬UP）</small></div>${seg('diff', [['easy', 'EASY'], ['normal', 'NORMAL'], ['hard', 'HARD']])}</div>
    <div class="set-row"><div class="sl">攻撃ガイド<small>相手の頭上に回避方向を表示</small></div>${seg('guide', [[true, 'ON'], [false, 'OFF']])}</div>
    <div class="set-row"><div class="sl">タッチパッド<small>スマホ用ボタンの表示</small></div>${seg('pad', [['auto', '自動'], ['on', 'ON'], ['off', 'OFF']])}</div>
    <div class="set-row"><div class="sl">効果音</div>${seg('sfx', [[true, 'ON'], [false, 'OFF']])}</div>
    <div class="set-row"><div class="sl">BGM</div>${seg('bgm', [[true, 'ON'], [false, 'OFF']])}</div>
    <div class="set-row"><div class="sl">音量</div><input type="range" min="0" max="1" step="0.05" value="${st.vol}" id="volRange" aria-label="音量"></div>
    <div class="set-row"><div class="sl">画面の揺れ</div>${seg('shake', [[true, 'ON'], [false, 'OFF']])}</div>
    <div class="set-row"><div class="sl">振動<small>対応端末のみ</small></div>${seg('vib', [[true, 'ON'], [false, 'OFF']])}</div>
    <div class="set-row"><div class="sl">ボクサー名<small>${esc(S.name)}</small></div><button class="btn sm" data-cmd="rename" type="button">変更</button></div>
    <div class="set-row"><div class="sl">セーブデータ削除<small>最初からやり直します</small></div><button class="btn sm red" data-cmd="reset" type="button">削除</button></div>`, bk);
  SETTINGS_BACK = bk;
  const vr = $('#volRange');
  if (vr) vr.addEventListener('input', () => { S.settings.vol = +vr.value; applyVolume(); save(); });
}
let SETTINGS_BACK = null;

/* ---------- タイトル ---------- */
function goTitle() {
  closeModal(); SCENE = null; F = null; TR = null;
  const has = hasSave();
  $('#titleBtns').innerHTML = `
    ${has ? `<button class="btn red" data-cmd="continue" type="button">▶ つづきから <small>Lv${S.level} ${esc(S.name)}</small></button>` : ''}
    <button class="btn ${has ? '' : 'red'}" data-cmd="newGame" type="button">はじめから</button>
    <div class="row"><button class="btn ghost" data-cmd="howtoT" type="button">遊び方</button><button class="btn ghost" data-cmd="settingsT" type="button">設定</button></div>`;
  show('scr-title'); bgm('title');
}
function nameModal(onDone, initial = '') {
  openModal(`<h3>ボクサー名を入力</h3><p style="text-align:center">リングで名乗る名前を決めよう（8文字まで）</p>
    <input type="text" id="nameIn" maxlength="8" value="${esc(initial)}" placeholder="ヒロ" autocomplete="off">
    <div class="btns"><button class="btn red" data-mcb="ok" type="button">決定</button></div>`, {
    ok: () => { const v = ($('#nameIn').value || '').trim().slice(0, 8) || 'ヒロ'; closeModal(); onDone(v); }
  });
  setTimeout(() => { const i = $('#nameIn'); if (i) i.focus(); }, 50);
}
function newGame() {
  const begin = () => nameModal(name => {
    const keep = S.settings; S = newSave(); S.settings = keep; S.name = name; S.created = true; save();
    showStory('opening', goHub);
  });
  if (hasSave()) confirmBox('はじめから', 'いまのセーブデータは消えてしまいます。よろしいですか？', 'はじめから', begin);
  else begin();
}

/* ---------- コマンド ---------- */
const CMD = {
  back: () => { sfx('back'); (MENU_BACK || goHub)(); },
  continue: () => goHub(), newGame, title: () => goTitle(),
  howtoT: () => goHowto(goTitle), settingsT: () => goSettings(goTitle),
  fight: careerFight, training: goTrainingMenu, status: goStatus, shop: () => goShop(), items: goItems,
  opps: goOpponents, exhib: goExhibition, survival: goSurvivalMenu, records: () => goRecords(), howto: () => goHowto(),
  settings: () => goSettings(),
  rest: () => {
    const doRest = () => { S.week++; S.energy = 3; save(); toast(`しっかり休んだ！第${S.week}週スタート`); goHub(); };
    if (S.energy > 0) confirmBox('休む', `まだ今週のトレーニングが<b>${S.energy}回</b>残っとるで。休んで次の週に進むか？`, '休む', doRest); else doRest();
  },
  train: k => startTraining(k, false), freeTrain: goFreeTraining, trainFree: k => startTraining(k, true),
  addStat: k => { if (S.points > 0 && S.stats[k] < STAT_MAX) { S.points--; S.stats[k]++; sfx('lvup'); save(); goStatus(); } },
  shopTab: k => goShop(k), shopItem: () => goShop('item'),
  buyGear: k => {
    const g = GEAR[k]; if (S.owned.includes(k)) return;
    if (S.money < g.price) { sfx('error'); toast('お金が足りません'); return; }
    confirmBox('購入', `<b>${esc(g.name)}</b> を ${fmtMoney(g.price)} で購入して装備しますか？`, '購入する', () => {
      S.money -= g.price; S.owned.push(k); S.equip[g.type] = k; sfx('coin'); checkAch(); save(); toast(`${g.name} を手に入れた！`); goShop();
    });
  },
  equip: k => { const g = GEAR[k]; S.equip[g.type] = k; sfx('select'); save(); goShop(); },
  buyItem: k => {
    const it = ITEMS[k]; if (S.money < it.price) { sfx('error'); toast('お金が足りません'); return; }
    S.money -= it.price; S.items[k]++; sfx('coin'); save(); toast(`${it.name} を買った！（所持 ${S.items[k]}）`); goShop('item');
  },
  useItem: k => {
    if (S.items[k] <= 0) return;
    if (k === 'bar') { if (S.energy >= 3) { toast('練習回数はもう満タンや！'); sfx('error'); return; } S.energy++; }
    if (k === 'protein') S.proteinLeft += 3;
    S.items[k]--; sfx('coin'); save(); toast(`${ITEMS[k].name} を使った！`); goItems();
  },
  oppInfo, exSel: exSelect, survStart: startSurvival, survNext: () => nextSurvival(), survQuit: () => survQuit(false),
  recTab: k => goRecords(k), resultNext, storySkip: () => { if (!ST) return; const a = ST.after; clearInterval(ST.timer); ST = null; a && a(); },
  set: arg => {
    const [k, v] = arg.split(':'); const cur = S.settings[k];
    S.settings[k] = typeof cur === 'boolean' ? v === 'true' : v;
    applyVolume(); save(); sfx('select'); goSettings(SETTINGS_BACK);
  },
  rename: () => nameModal(n => { S.name = n; save(); goSettings(SETTINGS_BACK); }, S.name),
  reset: () => confirmBox('データ削除', '本当にセーブデータを全て削除しますか？<br>この操作は元に戻せません。', '削除する', () => {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
    S = newSave(); toast('データを削除しました'); goTitle();
  })
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-cmd]'); if (!b || b.disabled || b.classList.contains('dis')) return;
  auInit();
  const f = CMD[b.dataset.cmd];
  if (f) { if (b.dataset.cmd !== 'back') sfx('select'); f(b.dataset.arg, b); }
});
function onOkKey() {
  if (isModal()) {
    if ($('#nameIn') && MODAL_CB.ok) { MODAL_CB.ok(); return; }
    const k = ['ok', 'go', 'resume', 'yes'].find(x => MODAL_CB[x]); if (k) MODAL_CB[k](); return;
  }
  if (CUR_SCR === 'scr-vs') vsGo();
  else if (CUR_SCR === 'scr-story') storyNext();
  else if (CUR_SCR === 'scr-result') resultNext();
  else if (CUR_SCR === 'scr-title') { hasSave() ? goHub() : newGame(); }
}

/* ---------- 起動 ---------- */
function init() {
  loadSave();
  buildArena(); buildGym(); bindPad();
  goTitle();
  requestAnimationFrame(loop);
  // フォント読込後にアリーナ文字を描き直す
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { CROWD_FLASH.length = 0; buildArena(); buildGym(); }).catch(() => { });
  // 初回タップでオーディオ解禁
  const unlock = () => { auInit(); };
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('touchend', unlock, { passive: true });
}
init();
