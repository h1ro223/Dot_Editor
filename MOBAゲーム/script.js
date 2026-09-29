'use strict';
/* =========================================================
   DOT RUMBLE（ドットランブル）- 3vs3 ドット絵アリーナバトル
   made by hiro/ヒロ  https://github.com/h1ro223
   ========================================================= */
(() => {

// =========================================================
// 定数・ユーティリティ
// =========================================================
const TILE = 32;              // 1タイルのワールド座標サイズ
const TAU = Math.PI * 2;
const STEP = 1 / 60;          // 固定タイムステップ
const T_FLOOR = 0, T_WALL = 1, T_STEEL = 2, T_BUSH = 3, T_WATER = 4, T_BOX = 5, T_GOAL = 6;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; h = h ^ (h >>> 16); return (h >>> 0) / 4294967295; };
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

const COL = {
  blue: '#3aa0ff', blueD: '#1d5fb5', red: '#ff4a5a', redD: '#a8213a',
  me: '#5ee06a', meD: '#2c9a3a', gold: '#ffd23f', ink: '#1f1430', white: '#fff7e6',
};

// =========================================================
// セーブデータ（localStorage）
// =========================================================
const SAVE_KEY = 'dotRumble.save.v1';
function defaultSave() {
  return {
    selected: 'rio', mode: 'gem', difficulty: 'normal',
    trophies: {}, stats: { games: 0, wins: 0, kills: 0 },
    bgm: 0.5, se: 0.7, shake: true, guide: true,
  };
}
function loadSave() {
  const d = defaultSave();
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (s && typeof s === 'object') {
      Object.assign(d, s);
      d.trophies = Object.assign({}, s.trophies || {});
      d.stats = Object.assign(defaultSave().stats, s.stats || {});
    }
  } catch (e) { /* 破損データは無視 */ }
  return d;
}
let save = loadSave();
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 保存不可環境 */ } }
function trophyOf(id) { return save.trophies[id] || 0; }
function totalTrophies() { return Object.values(save.trophies).reduce((a, b) => a + (b || 0), 0); }

// =========================================================
// サウンド（WebAudioで全部生成）
// =========================================================
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function buildTrack(bpm, melody, roots, chords, drum, arpEvery) {
  const len = 64;
  const lead = new Array(len).fill(null);
  let p = 0;
  for (const [n, l] of melody) { if (n) lead[p % len] = [n, l]; p += l; }
  const bass = new Array(len).fill(0);
  for (let bar = 0; bar < 4; bar++) for (let s = 0; s < 16; s += 2) bass[bar * 16 + s] = roots[bar] + (s % 4 === 2 ? 12 : 0);
  const arp = new Array(len).fill(0);
  if (chords) {
    for (let bar = 0; bar < 4; bar++) for (let s = 0; s < 16; s += arpEvery) {
      const iv = chords[bar][(s / arpEvery) % 3];
      arp[bar * 16 + s] = roots[bar] + 24 + iv;
    }
  }
  return { bpm, len, lead, bass, arp, drum };
}

const TRACKS = {
  battle: buildTrack(150,
    [[69, 2], [72, 2], [76, 2], [74, 2], [72, 2], [69, 2], [67, 2], [69, 2],
     [65, 2], [69, 2], [72, 4], [74, 2], [72, 2], [69, 4],
     [67, 2], [72, 2], [76, 2], [79, 2], [76, 4], [74, 4],
     [74, 2], [71, 2], [67, 2], [71, 2], [74, 4], [0, 4]],
    [45, 41, 48, 43], [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]],
    'k.h.s.h.k.khs.hh', 1),
  menu: buildTrack(104,
    [[72, 4], [76, 4], [79, 4], [76, 4],
     [74, 4], [72, 2], [69, 2], [72, 8],
     [69, 4], [72, 4], [77, 4], [76, 4],
     [74, 6], [71, 2], [67, 8]],
    [48, 45, 41, 43], [[0, 4, 7], [0, 3, 7], [0, 4, 7], [0, 4, 7]],
    'k...h.h.s...h.h.', 2),
};

const Sound = {
  ctx: null, master: null, bgm: null, se: null, noise: null, last: {}, seq: null, seqTimer: null, pendingTrack: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { this.ctx = null; return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.8; this.master.connect(c.destination);
    this.bgm = c.createGain(); this.bgm.connect(this.master);
    this.se = c.createGain(); this.se.connect(this.master);
    this.applyVolume();
    const len = c.sampleRate;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    if (this.pendingTrack) { const t = this.pendingTrack; this.seq = null; this.playBgm(t); }
  },
  applyVolume() {
    if (!this.ctx) return;
    this.bgm.gain.value = save.bgm * 0.35;
    this.se.gain.value = save.se * 0.6;
  },
  tone(f, dur, o = {}) {
    const c = this.ctx; if (!c) return;
    const t = o.when || c.currentTime;
    const osc = c.createOscillator(); const g = c.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f * o.slide), t + dur);
    const v = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + (o.att || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(o.dest || this.se);
    osc.start(t); osc.stop(t + dur + 0.03);
  },
  hiss(dur, o = {}) {
    const c = this.ctx; if (!c || !this.noise) return;
    const t = o.when || c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = c.createBiquadFilter(); f.type = o.ftype || 'lowpass';
    f.frequency.setValueAtTime(o.freq || 2000, t);
    if (o.fslide) f.frequency.exponentialRampToValueAtTime(o.fslide, t + dur);
    const g = c.createGain(); const v = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.dest || this.se);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.03);
  },
  play(name, vol = 1) {
    if (!this.ctx || G.demo) return;
    const now = this.ctx.currentTime;
    if (this.last[name] && now - this.last[name] < 0.035) return;
    this.last[name] = now;
    const V = vol;
    switch (name) {
      case 'shoot': this.tone(880, 0.07, { vol: 0.07 * V, slide: 0.5 }); break;
      case 'shotgun': this.hiss(0.14, { vol: 0.25 * V, freq: 1800, fslide: 300 }); this.tone(180, 0.1, { vol: 0.09 * V, slide: 0.5 }); break;
      case 'sniper': this.tone(1400, 0.18, { type: 'sawtooth', vol: 0.09 * V, slide: 0.2 }); this.hiss(0.1, { vol: 0.14 * V, freq: 4000 }); break;
      case 'lob': this.tone(300, 0.2, { type: 'triangle', vol: 0.15 * V, slide: 2 }); break;
      case 'boom': this.hiss(0.4, { vol: 0.4 * V, freq: 900, fslide: 80 }); this.tone(110, 0.3, { type: 'triangle', vol: 0.25 * V, slide: 0.4 }); break;
      case 'bigboom': this.hiss(0.8, { vol: 0.55 * V, freq: 700, fslide: 50 }); this.tone(80, 0.6, { type: 'triangle', vol: 0.35 * V, slide: 0.3 }); break;
      case 'slash': this.hiss(0.1, { vol: 0.25 * V, freq: 5000, ftype: 'highpass' }); this.tone(600, 0.08, { type: 'sawtooth', vol: 0.06 * V, slide: 1.8 }); break;
      case 'orb': this.tone(520, 0.18, { type: 'sine', vol: 0.12 * V, slide: 1.6 }); break;
      case 'flame': this.hiss(0.16, { vol: 0.18 * V, freq: 900, fslide: 2400 }); break;
      case 'hit': this.tone(220, 0.06, { vol: 0.08 * V, slide: 0.6 }); break;
      case 'hurt': this.tone(140, 0.12, { type: 'sawtooth', vol: 0.12 * V, slide: 0.5 }); break;
      case 'kill': [660, 880, 1320].forEach((f, i) => this.tone(f, 0.1, { vol: 0.1 * V, when: now + i * 0.06 })); break;
      case 'die': this.tone(400, 0.5, { vol: 0.12 * V, slide: 0.2 }); break;
      case 'gem': this.tone(1320, 0.08, { vol: 0.08 * V }); this.tone(1760, 0.12, { vol: 0.08 * V, when: now + 0.06 }); break;
      case 'cube': this.tone(520, 0.1, { type: 'triangle', vol: 0.16 * V, slide: 2 }); this.tone(1040, 0.1, { type: 'square', vol: 0.05 * V, when: now + 0.07 }); break;
      case 'super': this.tone(220, 0.35, { type: 'sawtooth', vol: 0.12 * V, slide: 4 }); this.hiss(0.3, { vol: 0.12 * V, freq: 3000 }); break;
      case 'ready': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, { vol: 0.07 * V, when: now + i * 0.05 })); break;
      case 'kick': this.tone(160, 0.08, { type: 'triangle', vol: 0.25 * V, slide: 0.5 }); this.hiss(0.06, { vol: 0.15 * V, freq: 1500 }); break;
      case 'goal': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.16, { vol: 0.1 * V, when: now + i * 0.09 })); break;
      case 'heal': this.tone(700, 0.2, { type: 'sine', vol: 0.1 * V, slide: 1.5 }); break;
      case 'shield': this.tone(300, 0.4, { type: 'triangle', vol: 0.15 * V, slide: 2 }); break;
      case 'dash': this.hiss(0.3, { vol: 0.2 * V, freq: 800, fslide: 3000 }); break;
      case 'zap': this.tone(1200, 0.06, { type: 'sawtooth', vol: 0.05 * V, slide: 0.3 }); break;
      case 'box': this.hiss(0.2, { vol: 0.2 * V, freq: 1200, fslide: 200 }); this.tone(200, 0.15, { vol: 0.08 * V, slide: 0.5 }); break;
      case 'count': this.tone(660, 0.15, { vol: 0.12 * V }); break;
      case 'go': this.tone(990, 0.35, { vol: 0.14 * V }); this.tone(1320, 0.35, { vol: 0.1 * V, when: now + 0.08 }); break;
      case 'win': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.25, { vol: 0.12 * V, when: now + i * 0.12 })); break;
      case 'lose': [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.18 * V, when: now + i * 0.18 })); break;
      case 'click': this.tone(880, 0.04, { vol: 0.06 * V }); break;
      case 'empty': this.tone(120, 0.05, { vol: 0.05 * V }); break;
      case 'warn': this.tone(880, 0.1, { vol: 0.08 * V }); this.tone(660, 0.1, { vol: 0.08 * V, when: now + 0.12 }); break;
    }
  },
  at(name, x, y) {
    if (!this.ctx) return;
    const d = dist(x, y, G.cam.x, G.cam.y) / TILE;
    if (d > 16) return;
    this.play(name, clamp(1.15 - d / 16, 0.15, 1));
  },
  playBgm(name) {
    this.pendingTrack = name;
    if (!this.ctx) return;
    if (this.seq && this.seq.name === name) return;
    this.stopBgm();
    const tr = TRACKS[name]; if (!tr) return;
    this.seq = { name, tr, step: 0, next: this.ctx.currentTime + 0.1 };
    this.seqTimer = setInterval(() => this.tick(), 25);
  },
  stopBgm() {
    if (this.seqTimer) clearInterval(this.seqTimer);
    this.seqTimer = null; this.seq = null;
  },
  tick() {
    const s = this.seq; if (!s || !this.ctx) return;
    const c = this.ctx; const tr = s.tr; const sd = 60 / tr.bpm / 4;
    if (s.next < c.currentTime - 0.3) s.next = c.currentTime + 0.05;
    while (s.next < c.currentTime + 0.15) {
      this.playStep(tr, s.step, s.next, sd);
      s.step = (s.step + 1) % tr.len; s.next += sd;
    }
  },
  playStep(tr, i, t, sd) {
    const d = this.bgm;
    const lead = tr.lead[i];
    if (lead) this.tone(mtof(lead[0]), sd * lead[1] * 0.9, { type: 'square', vol: 0.085, when: t, dest: d });
    const bass = tr.bass[i];
    if (bass) this.tone(mtof(bass), sd * 1.8, { type: 'triangle', vol: 0.22, when: t, dest: d });
    const arp = tr.arp[i];
    if (arp) this.tone(mtof(arp), sd * 0.8, { type: 'square', vol: 0.028, when: t, dest: d });
    const dr = tr.drum[i % tr.drum.length];
    if (dr === 'k') this.tone(120, 0.12, { type: 'sine', vol: 0.35, slide: 0.35, when: t, dest: d });
    if (dr === 's') this.hiss(0.12, { vol: 0.16, freq: 2500, when: t, dest: d });
    if (dr === 'h') this.hiss(0.03, { vol: 0.05, freq: 8000, ftype: 'highpass', when: t, dest: d });
  },
};

// =========================================================
// ドット絵データ
// =========================================================
const BASE_PAL = { k: '#1f1430', s: '#ffd0a6', S: '#e59f73', w: '#ffffff', e: '#1f1430', r: '#ff9a9a', M: '#3b3552', m: '#c9d1dc', g: '#7fe7ff' };
const FACE = ['..khhssssssssk..', '..khsssweswesk..', '..khsssweswesk..', '..ksssssssrssk..', '...kkssssssskk..'];
const HAIR = ['....kkkkkkk.....', '...khhhhhhhkk...', '..khhhhhhhhhhk..'];
const BODY = [
  ['....kccccccck...', '...kcccaccccck..', '..kscccaccccsk..', '...kCCCCCCCCk...', '...kCCCk.kCCCk..', '...kCCk...kCCk..', '...kMMk...kMMk..'],
  ['....kccccccck...', '...kcccaccccck..', '..kscccaccccsk..', '...kCCCCCCCCk...', '...kCCCkkCCCk...', '....kCCk.kCCk...', '....kMMk.kMMk...'],
];
const WEAPONS = {
  rifle: ['..........', 'kkkkkkkkk.', 'kmmmmmmmmk', 'kMaMkkkkk.', '.kk.......'],
  shotgun: ['..........', 'kkkkkkkkkk', 'kaammmmmmk', 'kaakkkkkkk', 'kk........'],
  sniper: ['....kkk.....', 'kkkkkgkkkkkk', 'kMMMmmmmmmmk', 'kMkkkkkkkkkk', 'kk..........'],
  bomb: ['....ka..', '..kkkk..', '.kMMMMk.', '.kMmMMk.', '.kMMMMk.', '..kkkk..'],
  blade: ['............', 'kkk.kkkkkkk.', 'kaakwwwwwwwk', 'kkk.kkkkkkk.', '............'],
  staff: ['........kk..', '.......kaak.', 'kkkkkkkkaaak', 'kMMMMMMkaak.', 'kkkkkkkk.kk.'],
  flamer: ['..kkkkkkk...', '.kmmmmmmmkkk', 'kMMmmmmmmgak', 'kMMkkkkkkkkk', '.kk.........'],
  gadget: ['...kkk....', 'kkkgggkkk.', 'kMMgagMMMk', 'kkkgggkkk.', '...kkk....'],
};
const ITEM_ART = {
  gem: { rows: ['..kkkk..', '.kwppPk.', 'kwppppPk', 'kppppPPk', '.kpppPk.', '..kpPk..', '...kk...'], pal: { k: '#2a1040', p: '#c77dff', P: '#8b3fd9', w: '#f5e6ff' } },
  cube: { rows: ['kkkkkkkk', 'kgggggGk', 'kgwwgGGk', 'kgwgggGk', 'kggggGGk', 'kgggGGGk', 'kGGGGGGk', 'kkkkkkkk'], pal: { k: '#0f3b1f', g: '#5dff8a', G: '#1fae4f', w: '#eaffea' } },
  ball: { rows: ['..kkkk..', '.kwwkwk.', 'kwwkkkwk', 'kwwwkwwk', 'kkwwwwkk', 'kwkwwkMk', '.kMMMMk.', '..kkkk..'], pal: { k: '#1f1430', w: '#ffffff', M: '#b9c2d6' } },
  star: { rows: ['...k...', '..kyk..', 'kkyyykk', 'kyyyyyk', '.kyyyk.', '.kykyk.', 'kk.k.kk'], pal: { k: '#5a3a00', y: '#ffd23f' } },
};

function buildSprite(rows, pal) {
  const h = rows.length, w = rows[0].length;
  const c = mkCanvas(w, h); const x = c.getContext('2d');
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const ch = rows[j][i];
    if (ch === '.' || !pal[ch]) continue;
    x.fillStyle = pal[ch]; x.fillRect(i, j, 1, 1);
  }
  return c;
}
function flipH(src) {
  const c = mkCanvas(src.width, src.height); const x = c.getContext('2d');
  x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c;
}
function whiteOf(src) {
  const c = mkCanvas(src.width, src.height); const x = c.getContext('2d');
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); return c;
}

// =========================================================
// キャラクター（オリジナル8体）
// =========================================================
const BRAWLERS = [
  {
    id: 'rio', name: 'リオ', role: 'アサルト', color: '#ff7a3d',
    desc: '4連射のアサルトライフル使い。距離を選ばず戦えるバランス型。',
    hp: 3800, speed: 2.75, reload: 1.4, atkCd: 0.5, range: 7, superNeed: 3200, weapon: 'rifle',
    ui: { hp: 3, atk: 3, range: 3, speed: 3 },
    attack: { type: 'burst', count: 4, interval: 0.085, dmg: 360, speed: 15, r: 4, spread: 0.045, color: '#ffe066' },
    super: { type: 'fan', count: 14, arc: 0.9, dmg: 360, speed: 15, range: 7.5, r: 4, color: '#ff9b4a' },
    atkName: 'ツインバースト', atkDesc: '弾を4発すばやく連射する。', supName: 'ラピッドストーム', supDesc: '扇状に14発の弾をばらまく。',
    pal: { h: '#ff7a3d', H: '#c2452a', c: '#2e6bff', C: '#1c3f9e', a: '#ffd23f' },
    head: ['...kk..kk.kk....', '..khhkkhhkhhk...', '..khhhhhhhhhhk..', '..kaaaaaaaaaak..', ...FACE],
  },
  {
    id: 'gou', name: 'ゴウ', role: 'ファイター', color: '#e8403a',
    desc: '散弾銃で至近距離を制圧する突撃隊長。スーパーの突進は壁も砕く。',
    hp: 5200, speed: 2.75, reload: 1.6, atkCd: 0.5, range: 3.8, superNeed: 3600, weapon: 'shotgun',
    ui: { hp: 4, atk: 5, range: 1, speed: 3 },
    attack: { type: 'spread', count: 5, arc: 0.5, dmg: 360, speed: 13, r: 5, color: '#ffd9a0' },
    super: { type: 'charge', dist: 6, speed: 18, dmg: 1100, knock: 340 },
    atkName: 'ブルショット', atkDesc: '5発の散弾を放つ。近いほど大ダメージ。', supName: 'ブル突進', supDesc: '一直線に突進し、敵を吹き飛ばして壁も壊す。',
    pal: { h: '#7a4a2a', H: '#51301a', c: '#3f9a45', C: '#28662d', a: '#e8403a' },
    head: ['................', '....kkkkkkk.....', '...kaaaaaaakk...', '..kaaaaaaaaaaaak', FACE[0], FACE[1], FACE[2], '..kssssssHHHsk..', '...kkHHHHHHHkk..'],
  },
  {
    id: 'mirei', name: 'ミレイ', role: 'スナイパー', color: '#ff64a8',
    desc: '超長距離から一撃を叩き込むスナイパー。体力は低め。',
    hp: 2700, speed: 2.6, reload: 2.0, atkCd: 0.55, range: 10, superNeed: 3400, weapon: 'sniper',
    ui: { hp: 1, atk: 4, range: 5, speed: 2 },
    attack: { type: 'single', dmg: 1350, speed: 22, r: 5, color: '#ff9ad0' },
    super: { type: 'rail', dmg: 1900, speed: 26, range: 12, r: 10, color: '#ff64a8' },
    atkName: 'ロングショット', atkDesc: '遠くまで届く高威力の弾を1発撃つ。', supName: 'レールキャノン', supDesc: '敵も壁も貫く極太ビーム。',
    pal: { h: '#b77bff', H: '#7d45c9', c: '#353a5e', C: '#22253e', a: '#ff64a8' },
    head: [HAIR[0], HAIR[1], HAIR[2], '.khhhhhhhhhhhk..', 'khhhhssssssssk..', 'khhhsssweswesk..', 'khhhsssweswesk..', 'khhkssssssrssk..', '.kk.kkssssskk...'],
  },
  {
    id: 'bomba', name: 'ボンバ', role: 'スローワー', color: '#ff9f1c',
    desc: '壁の向こうへ爆弾を投げ込む爆破職人。隠れた敵をあぶり出す。',
    hp: 2900, speed: 2.6, reload: 1.7, atkCd: 0.5, range: 7, superNeed: 3200, weapon: 'bomb',
    ui: { hp: 2, atk: 4, range: 4, speed: 2 },
    attack: { type: 'lob', dmg: 1000, radius: 1.15, flight: 0.6 },
    super: { type: 'megabomb', dmg: 1800, range: 8, radius: 2.3, flight: 0.8 },
    atkName: 'ポイボム', atkDesc: '壁を越える爆弾を投げる。着弾地点で爆発。', supName: 'メガボム', supDesc: '広範囲を吹き飛ばす巨大爆弾。壁も壊す。',
    pal: { h: '#56d468', H: '#2f8a3c', c: '#ff9f1c', C: '#c26d0c', a: '#fff3c4', g: '#8ff0ff', m: '#c9d1dc', M: '#5c6577' },
    head: [HAIR[0], HAIR[1], HAIR[2], '..kmgggmmgggmk..', ...FACE],
  },
  {
    id: 'haku', name: 'ハク', role: 'アサシン', color: '#ff4a5a',
    desc: '影から飛びかかる忍者。足が速く、近距離の連撃が得意。',
    hp: 4300, speed: 3.1, reload: 0.95, atkCd: 0.38, range: 1.9, superNeed: 2800, weapon: 'blade',
    ui: { hp: 3, atk: 4, range: 1, speed: 5 },
    attack: { type: 'melee', dmg: 950, arc: 2.1 },
    super: { type: 'leap', range: 6, dmg: 1300, radius: 1.4, dur: 0.42 },
    atkName: '疾風斬り', atkDesc: '目の前を素早く斬り払う。', supName: '影跳び', supDesc: '壁を飛び越えて着地点の敵を斬る。',
    pal: { c: '#3e3263', C: '#251c40', a: '#ff4a5a', h: '#251c40' },
    head: ['....kkkkkkk.....', '...kCCCCCCCkk...', '..kCCCCCCCCCCk..', '..kCCCCCCCCCCk..', '..kCCssssssssk..', '..kCsssweswesk..', '..kCccccccccck..', '..kcccccccccck..', '...kkaaaaaaakk..'],
  },
  {
    id: 'luna', name: 'ルナ', role: 'サポート', color: '#63c3ff',
    desc: '月の光で仲間を癒やすヒーラー。弾は敵を貫き味方を回復する。',
    hp: 3300, speed: 2.7, reload: 1.5, atkCd: 0.5, range: 7.2, superNeed: 3000, weapon: 'staff',
    ui: { hp: 2, atk: 2, range: 4, speed: 3 },
    attack: { type: 'orb', dmg: 760, heal: 420, speed: 9, r: 9, color: '#bfe8ff' },
    super: { type: 'healzone', range: 7, radius: 2.3, dur: 4.5, hps: 950, dps: 320 },
    atkName: 'ムーンオーブ', atkDesc: '敵を貫く光球。通った味方を回復する。', supName: 'ムーンヒール', supDesc: '味方を回復し続ける月光のエリアを作る。',
    pal: { h: '#efeaff', H: '#aaa0dc', c: '#63c3ff', C: '#347fc2', a: '#ffe066' },
    head: [HAIR[0], HAIR[1], HAIR[2], '.khhhhhhhhhahk..', '.khhhssssssshk..', '.khhsssweswehk..', '.khhsssweswehk..', '.khhssssssrshk..', '.khkkssssssskhk.'],
  },
  {
    id: 'tetsu', name: 'テツ', role: 'タンク', color: '#ffb020',
    desc: '鋼鉄の鎧に身を包んだ重戦車。火炎放射で押し込み、盾で耐える。',
    hp: 6500, speed: 2.45, reload: 1.25, atkCd: 0.45, range: 2.9, superNeed: 3800, weapon: 'flamer',
    ui: { hp: 5, atk: 3, range: 1, speed: 1 },
    attack: { type: 'flame', count: 7, arc: 0.7, dmg: 240, speed: 10, r: 6, color: '#ff8a3a' },
    super: { type: 'shield', dur: 4, radius: 2.2, dmg: 800, knock: 300 },
    atkName: 'ヒートブラスト', atkDesc: '短射程の炎を扇状に吹きつける。', supName: '鋼鉄の守り', supDesc: '衝撃波で敵を弾き、4秒間ダメージを60%カット。',
    pal: { m: '#b4bfce', M: '#667286', g: '#ff6a3a', c: '#7c8799', C: '#4b5566', a: '#ffb020', h: '#667286' },
    head: ['....kkkkkkk.....', '...kmmmmmmmkk...', '..kmmmmmmmmmmk..', '..kmMmmmmmmmmk..', '..kmMkkkkkkkkk..', '..kmMkggggggkk..', '..kmMkkkkkkkkk..', '..kmMmmmmmmmmk..', '...kkMMMMMMMkk..'],
  },
  {
    id: 'spark', name: 'スパーク', role: 'エンジニア', color: '#7fffd4',
    desc: '壁で跳ね返る電撃弾と自動タレットで戦場を支配する発明家。',
    hp: 3100, speed: 2.7, reload: 1.5, atkCd: 0.5, range: 8.5, superNeed: 3000, weapon: 'gadget',
    ui: { hp: 2, atk: 3, range: 4, speed: 3 },
    attack: { type: 'bounce', dmg: 880, speed: 11, r: 6, bounces: 2, color: '#7fffd4' },
    super: { type: 'turret', range: 4.5, hp: 3000, life: 12, dmg: 300, rate: 0.55, trange: 7.5 },
    atkName: 'バウンスボルト', atkDesc: '壁で2回まで跳ね返る電撃弾。', supName: 'ボルトタレット', supDesc: '近くの敵を自動で撃つタレットを設置する。',
    pal: { h: '#ffe14d', H: '#c9a114', c: '#7a4dff', C: '#4a2bb0', a: '#7fffd4', m: '#4a5068', M: '#2b2f40', g: '#7fffd4' },
    head: ['..kk..kk..kk....', '..khkkhhkkhhk...', '..khhhhhhhhhhk..', '..khhhhhhhhhhk..', '..Mmhssssssssk..', '..Mmsssweswesk..', '..Mmsssweswesk..', FACE[3], FACE[4]],
  },
];
const BR = {};
BRAWLERS.forEach((b) => { BR[b.id] = b; });

// スプライト生成
const SPR = {};
const WEAPON_SPR = {};
const ITEM_SPR = {};
function buildAllSprites() {
  for (const b of BRAWLERS) {
    const pal = Object.assign({}, BASE_PAL, b.pal);
    const r = [], l = [], wr = [], wl = [];
    for (let f = 0; f < 2; f++) {
      const img = buildSprite([...b.head, ...BODY[f]], pal);
      r.push(img); l.push(flipH(img));
      wr.push(whiteOf(img)); wl.push(whiteOf(l[f]));
    }
    SPR[b.id] = { r, l, wr, wl };
    WEAPON_SPR[b.id] = buildSprite(WEAPONS[b.weapon], pal);
  }
  for (const k in ITEM_ART) ITEM_SPR[k] = buildSprite(ITEM_ART[k].rows, ITEM_ART[k].pal);
}

// =========================================================
// マップ（左半分＋中央列を書き、左右反転＆上下点対称で生成）
// =========================================================
const THEMES = {
  meadow: { name: '草原', out: '#244a2c', floor1: '#5dbb4c', floor2: '#55ad45', speck: '#78d464', speck2: '#3f8f36', flower: '#fff6a8',
    wallTop: '#d69455', wallTopHi: '#eab077', wallFront: '#a3622e', wallDark: '#7a4520', line: '#3d2210',
    bush: '#2f9a3d', bushD: '#1f6e2c', bushHi: '#5fd06a', water: '#3d8fe0', waterD: '#2c6fbe', waterHi: '#a6dcff' },
  desert: { name: '砂漠', out: '#6b4424', floor1: '#e8c47c', floor2: '#dfb86c', speck: '#f4d99c', speck2: '#c49a52', flower: '#ffffff',
    wallTop: '#e0955d', wallTopHi: '#f2b582', wallFront: '#b86a3c', wallDark: '#8a4a26', line: '#4a2612',
    bush: '#93ad48', bushD: '#6a8231', bushHi: '#c3d86c', water: '#3fa7d8', waterD: '#2c80b3', waterHi: '#b2ecff' },
  stadium: { name: 'スタジアム', out: '#1d3a5c', floor1: '#4db566', floor2: '#44a85c', speck: '#5fc877', speck2: '#3a9150', flower: '#ffffff',
    wallTop: '#9db2d8', wallTopHi: '#c4d3ef', wallFront: '#6479a3', wallDark: '#4a5b80', line: '#1f2640',
    bush: '#2b8c47', bushD: '#1c6634', bushHi: '#56c270', water: '#3d8fe0', waterD: '#2c6fbe', waterHi: '#a6dcff' },
  wasteland: { name: '荒野', out: '#3a2c24', floor1: '#b08f6c', floor2: '#a58462', speck: '#c4a582', speck2: '#8a6c4e', flower: '#e8d8a8',
    wallTop: '#9a9aa8', wallTopHi: '#bdbdc9', wallFront: '#6c6c7a', wallDark: '#50505c', line: '#25252e',
    bush: '#6d9440', bushD: '#4c6c2a', bushHi: '#9cc463', water: '#4a9bd0', waterD: '#3478a8', waterHi: '#b0e0ff' },
};

const MAPS = {
  gem: {
    name: 'クリスタル草原', theme: 'meadow',
    half: ['BBB.....2.2', 'BB.........', 'B...##.....', '....##.....', '...........', '##....BB...', '~~....BB...', '~~.........',
           '....#......', 'BB..#...##.', 'BB......##.', 'BB.........', '....~~.....', '..#.~~.BB..', '..#....BB..'],
    center: 'B.....#...G',
  },
  bounty: {
    name: 'サンセット砂丘', theme: 'desert',
    half: ['BB......2.2', 'BB.........', '....###....', '...........', '#..BB....##', '#..BB......', '...........', '~~~....#...',
           '......##...', 'BB.........', 'BB...~~....', '....#......'],
    center: 'BB.#.......',
  },
  ball: {
    name: 'ピクセルスタジアム', theme: 'stadium',
    half: ['XXXXXXXXggg', 'X..........', '......##...', 'BB.........', 'BB.....2..2', '...........', '..##....#..', '..##.......',
           '~~.........', '~~...BB....', '.....BB....', '...........', 'BB..#......', 'BB..#......'],
    center: '..........O',
  },
  survival: {
    name: 'ワイルドランド', theme: 'wasteland',
    quad: ['BBBB.............', 'BB..S.......b....', 'B....~~~.........', '.....~~~..##.....', '..b.......##..BB.', '..............BB.',
           '..##....BBB......', '..##....BBB...b..', '......b.........S', 'BB...............', 'BB....##....#....', '......##....#..b.',
           '..~~.............', '..~~...b...BB....', '...........BB....', '......#..........'],
    centerRow: 'S.....BB....#...b',
  },
};

const MODES = {
  gem: { name: 'ジェムラッシュ', short: 'ジェム', icon: 'gem', time: 180, team: true, respawn: 3,
    desc: '中央の鉱山から出るジェムを奪い合う。チームで10個以上を持って15秒守り切れば勝利！',
    rules: ['ジェムは7秒ごとに中央から出現', 'やられると持っていたジェムを全部落とす', '10個以上＆相手より多い状態を15秒キープで勝利'] },
  bounty: { name: 'バウンティ', short: 'バウンティ', icon: 'star', time: 120, team: true, respawn: 3,
    desc: '敵を倒して賞金スターを稼げ。倒すほど自分の賞金も上がる。2分間でスターの多いチームの勝ち！',
    rules: ['撃破すると相手の賞金スターを獲得', '連続撃破で自分の賞金が最大7まで上昇', '制限時間2分、スターが多いチームの勝ち'] },
  ball: { name: 'ボールゴール', short: 'ボール', icon: 'ball', time: 150, team: true, respawn: 3,
    desc: 'ボールを運んで相手のゴールへシュート！先に2点取ったチームの勝ち。',
    rules: ['ボールに触れると拾える', 'ボールを持っている間は攻撃ボタンでシュート', '先に2ゴール、または時間切れで得点が多い方の勝ち'] },
  survival: { name: 'ソロサバイバル', short: 'サバイバル', icon: 'cube', time: 0, team: false, respawn: 0,
    desc: '8人のバトルロイヤル。箱を壊してパワーキューブを集め、迫る毒ガスの中で最後の1人を目指せ！',
    rules: ['箱を壊すとパワーキューブが出る（体力＆攻撃力アップ）', '30秒後から毒ガスが外側から迫る', '復活なし、最後まで生き残れば1位'] },
};

function parseMap(key) {
  const M = MAPS[key];
  const mir = (s) => s + s.slice(0, -1).split('').reverse().join('');
  let rows;
  if (M.quad) {
    const top = M.quad.map(mir);
    rows = [...top, mir(M.centerRow), ...top.slice().reverse()];
  } else {
    const top = M.half.map(mir);
    rows = [...top, mir(M.center), ...top.slice().reverse().map((r) => r.replace(/2/g, '1'))];
  }
  const mh = rows.length, mw = rows[0].length;
  const grid = new Uint8Array(mw * mh);
  const spawns = { 0: [], 1: [], S: [] };
  let mine = null, ballSpawn = null;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const ch = rows[y][x];
    let t = T_FLOOR;
    if (ch === '#') t = T_WALL; else if (ch === 'X') t = T_STEEL; else if (ch === 'B') t = T_BUSH;
    else if (ch === '~') t = T_WATER; else if (ch === 'b') t = T_BOX; else if (ch === 'g') t = T_GOAL;
    else if (ch === '1') spawns[0].push({ x, y }); else if (ch === '2') spawns[1].push({ x, y });
    else if (ch === 'S') spawns.S.push({ x, y }); else if (ch === 'G') mine = { x, y }; else if (ch === 'O') ballSpawn = { x, y };
    grid[y * mw + x] = t;
  }
  return { rows, mw, mh, grid, spawns, mine, ballSpawn, theme: THEMES[M.theme], name: M.name };
}

// =========================================================
// ゲーム状態
// =========================================================
const DIFF = {
  easy: { label: 'かんたん', react: 0.6, err: 0.3, lead: 0.1, superChance: 0.35, aggro: 0.75 },
  normal: { label: 'ふつう', react: 0.34, err: 0.13, lead: 0.55, superChance: 0.7, aggro: 1 },
  hard: { label: 'むずかしい', react: 0.17, err: 0.05, lead: 0.9, superChance: 1, aggro: 1.2 },
};
const BOT_NAMES = ['タロウ', 'ミカン', 'ソラ', 'カイ', 'ユズ', 'レン', 'ハナ', 'コタ', 'ナギ', 'リク', 'モモ', 'ジン', 'サクラ', 'ケン', 'アオイ', 'トモ', 'ヒナ', 'ユウ'];

const G = {
  state: 'idle', demo: false, paused: false, running: false,
  mode: 'gem', mapName: '', theme: THEMES.meadow,
  grid: null, mw: 0, mh: 0, spawns: null, mine: null, ballSpawn: null, boxHp: null, boxHitT: null,
  brawlers: [], projs: [], lobs: [], areas: [], turrets: [], items: [], parts: [], texts: [],
  player: null, time: 0, anim: 0, timeLeft: 0, cdT: 0, lastCount: 0, overT: 0, goalT: 0, pendingEnd: null,
  cam: { x: 0, y: 0, shake: 0 }, zoom: 1, viewW: 600, viewH: 400,
  score: [0, 0], gemCd: null, mineT: 0, ball: null, poison: null, result: null,
  floorCache: null, floorDirty: [], uidSeq: 0, focus: null, focusT: 0, warned: {},
};

// =========================================================
// タイル・当たり判定
// =========================================================
function tileAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= G.mw || ty >= G.mh) return T_STEEL;
  return G.grid[ty * G.mw + tx];
}
const tileAtPos = (x, y) => tileAt(Math.floor(x / TILE), Math.floor(y / TILE));
const isMoveSolid = (t) => t === T_WALL || t === T_STEEL || t === T_WATER || t === T_BOX;
const isShotSolid = (t) => t === T_WALL || t === T_STEEL || t === T_BOX;
const walkable = (tx, ty) => !isMoveSolid(tileAt(tx, ty));
const tileCenter = (p) => ({ x: p.x * TILE + TILE / 2, y: p.y * TILE + TILE / 2 });

function resolveCircle(e, solidFn) {
  const r = e.r;
  const x0 = Math.floor((e.x - r) / TILE), x1 = Math.floor((e.x + r) / TILE);
  const y0 = Math.floor((e.y - r) / TILE), y1 = Math.floor((e.y + r) / TILE);
  let hit = false;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!solidFn(tileAt(tx, ty))) continue;
    const bx = tx * TILE, by = ty * TILE;
    const cx = clamp(e.x, bx, bx + TILE), cy = clamp(e.y, by, by + TILE);
    const dx = e.x - cx, dy = e.y - cy; const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    hit = true;
    if (d2 > 1e-6) {
      const d = Math.sqrt(d2); const push = r - d;
      e.x += dx / d * push; e.y += dy / d * push;
    } else {
      const l = e.x - bx, rr = bx + TILE - e.x, t = e.y - by, bb = by + TILE - e.y;
      const m = Math.min(l, rr, t, bb);
      if (m === l) e.x = bx - r; else if (m === rr) e.x = bx + TILE + r; else if (m === t) e.y = by - r; else e.y = by + TILE + r;
    }
  }
  return hit;
}
function moveCircle(e, dx, dy, solidFn = isMoveSolid) {
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 6));
  const sx = dx / n, sy = dy / n; let hit = false;
  for (let i = 0; i < n; i++) {
    e.x += sx; if (resolveCircle(e, solidFn)) hit = true;
    e.y += sy; if (resolveCircle(e, solidFn)) hit = true;
  }
  return hit;
}
function circleHitsSolid(x, y, r, solidFn) {
  const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!solidFn(tileAt(tx, ty))) continue;
    const cx = clamp(x, tx * TILE, tx * TILE + TILE), cy = clamp(y, ty * TILE, ty * TILE + TILE);
    if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
  }
  return false;
}
// 射線チェック（ignoreIdx のタイルは無視＝箱を狙う時用）
function losClear(x0, y0, x1, y1, ignoreIdx = -1) {
  const d = dist(x0, y0, x1, y1); const n = Math.ceil(d / 8);
  for (let i = 1; i < n; i++) {
    const t = i / n; const x = lerp(x0, x1, t), y = lerp(y0, y1, t);
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (ty * G.mw + tx === ignoreIdx && tx >= 0 && tx < G.mw) continue;
    if (isShotSolid(tileAt(tx, ty))) return false;
  }
  return true;
}
function walkClear(x0, y0, x1, y1, r) {
  const d = dist(x0, y0, x1, y1); if (d < 1) return true;
  const nx = -(y1 - y0) / d * r, ny = (x1 - x0) / d * r; const n = Math.ceil(d / 8);
  for (let i = 1; i <= n; i++) {
    const t = i / n; const x = lerp(x0, x1, t), y = lerp(y0, y1, t);
    if (isMoveSolid(tileAtPos(x, y)) || isMoveSolid(tileAtPos(x + nx, y + ny)) || isMoveSolid(tileAtPos(x - nx, y - ny))) return false;
  }
  return true;
}

// =========================================================
// 経路探索（A*・8方向）
// =========================================================
function nearestWalkable(tx, ty) {
  tx = clamp(tx, 0, G.mw - 1); ty = clamp(ty, 0, G.mh - 1);
  if (walkable(tx, ty)) return { x: tx, y: ty };
  for (let r = 1; r < 10; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = tx + dx, y = ty + dy;
      if (x >= 0 && y >= 0 && x < G.mw && y < G.mh && walkable(x, y)) return { x, y };
    }
  }
  return null;
}
const DIRS8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
function findPath(sx, sy, gx, gy) {
  const W = G.mw, H = G.mh;
  const s = nearestWalkable(Math.floor(sx / TILE), Math.floor(sy / TILE));
  const g = nearestWalkable(Math.floor(gx / TILE), Math.floor(gy / TILE));
  if (!s || !g) return null;
  const si = s.y * W + s.x, gi = g.y * W + g.x;
  if (si === gi) return [tileCenter(g)];
  const N = W * H;
  const gs = new Float32Array(N).fill(1e9);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const heap = [];
  const push = (f, i) => {
    heap.push([f, i]); let k = heap.length - 1;
    while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; const t = heap[p]; heap[p] = heap[k]; heap[k] = t; k = p; }
  };
  const pop = () => {
    const top = heap[0]; const last = heap.pop();
    if (heap.length) {
      heap[0] = last; let k = 0;
      for (;;) {
        const l = k * 2 + 1, r = l + 1; let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break; const t = heap[m]; heap[m] = heap[k]; heap[k] = t; k = m;
      }
    }
    return top;
  };
  const h = (x, y) => { const dx = Math.abs(x - g.x), dy = Math.abs(y - g.y); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  gs[si] = 0; push(h(s.x, s.y), si);
  let found = false, guard = 0;
  while (heap.length && guard++ < 5000) {
    const [, ci] = pop();
    if (closed[ci]) continue;
    if (ci === gi) { found = true; break; }
    closed[ci] = 1;
    const cx = ci % W, cy = (ci / W) | 0;
    for (const [dx, dy, c] of DIRS8) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || !walkable(nx, ny)) continue;
      if (dx && dy && (!walkable(cx + dx, cy) || !walkable(cx, cy + dy))) continue;
      const ni = ny * W + nx; if (closed[ni]) continue;
      const ng = gs[ci] + c;
      if (ng < gs[ni]) { gs[ni] = ng; came[ni] = ci; push(ng + h(nx, ny), ni); }
    }
  }
  if (!found) return null;
  const path = []; let k = gi;
  while (k !== si && k !== -1) { path.push({ x: (k % W) * TILE + TILE / 2, y: ((k / W) | 0) * TILE + TILE / 2 }); k = came[k]; }
  path.reverse();
  return path;
}

// =========================================================
// キャラ生成・試合開始
// =========================================================
function makeBrawler(def, team, opts) {
  return {
    def, uid: ++G.uidSeq, team, isPlayer: !!opts.player, name: opts.name, diff: opts.diff || 'normal',
    x: 0, y: 0, r: 11, hp: def.hp, maxHp: def.hp, ammo: 3, maxAmmo: 3, superCharge: 0,
    aimAng: team === 0 ? -Math.PI / 2 : Math.PI / 2, face: 1, alive: true, respawnAt: 0,
    lastAtk: -99, lastHurt: -99, atkReady: 0, revealT: 0, shieldT: 0, invulnT: 0,
    dashing: null, leaping: null, burst: [], kx: 0, ky: 0, mx: 0, my: 0, moving: false, walkT: 0, hitFlash: 0,
    velX: 0, velY: 0, gems: 0, bounty: 2, cubes: 0, dmgMult: 1, spawn: null, place: 0, eliminated: false, poisonAcc: 0,
    stats: { kills: 0, deaths: 0, dmg: 0, heal: 0, gems: 0, goals: 0 },
    superWasReady: false, emptyT: 0, deathT: 0, deathX: 0, deathY: 0, regenFxT: 0,
    ai: {
      thinkT: rand(0, 0.2), target: null, goal: null, path: null, pathKey: '', pathT: 0, pi: 0,
      strafeDir: 1, strafeT: 0, nextShot: 0, superT: 0, stuckT: 0, stuckDir: 0, checkT: 0.5, lastX: 0, lastY: 0,
      lane: 0, wander: null, wanderT: 0, retreat: false, boxT: null,
    },
  };
}

function placeAtSpawn(b) {
  const c = tileCenter(b.spawn);
  b.x = c.x; b.y = c.y; b.hp = b.maxHp; b.ammo = b.maxAmmo; b.alive = true;
  b.dashing = null; b.leaping = null; b.burst.length = 0; b.kx = 0; b.ky = 0;
  b.invulnT = G.time + 1.5; b.lastHurt = G.time; b.hitFlash = 0; b.shieldT = 0;
  b.ai.path = null; b.ai.pathT = 0; b.ai.target = null;
  if (G.mode === 'survival') b.aimAng = Math.atan2(G.mh * TILE / 2 - b.y, G.mw * TILE / 2 - b.x);
  else b.aimAng = b.team === 0 ? -Math.PI / 2 : Math.PI / 2;
  b.face = Math.cos(b.aimAng) >= 0 ? 1 : -1;
}

function startMatch(mode, demo) {
  G.demo = !!demo; G.mode = mode;
  const MD = MODES[mode];
  const m = parseMap(mode);
  G.mw = m.mw; G.mh = m.mh; G.grid = m.grid; G.spawns = m.spawns; G.mine = m.mine; G.ballSpawn = m.ballSpawn;
  G.theme = m.theme; G.mapName = m.name;
  G.boxHp = new Float32Array(G.mw * G.mh); G.boxHitT = new Float32Array(G.mw * G.mh).fill(-99);
  for (let i = 0; i < G.grid.length; i++) if (G.grid[i] === T_BOX) G.boxHp[i] = 2600;
  G.brawlers = []; G.projs = []; G.lobs = []; G.areas = []; G.turrets = []; G.items = []; G.parts = []; G.texts = [];
  G.time = 0; G.anim = 0; G.score = [0, 0]; G.gemCd = null; G.mineT = 4; G.result = null; G.ball = null; G.poison = null;
  G.overT = 0; G.goalT = 0; G.pendingEnd = null; G.timeLeft = MD.time || 0; G.uidSeq = 0; G.warned = {}; G.focus = null; G.focusT = 0;
  const names = shuffle(BOT_NAMES.slice());
  const enemyDiff = demo ? 'normal' : save.difficulty;
  if (mode === 'survival') {
    const spots = shuffle(G.spawns.S.slice());
    const pool = shuffle(BRAWLERS.map((b) => b.id).filter((id) => demo || id !== save.selected));
    for (let i = 0; i < 8; i++) {
      const isP = !demo && i === 0;
      const def = isP ? BR[save.selected] : BR[pool[i % pool.length]];
      const b = makeBrawler(def, i, { player: isP, name: isP ? 'あなた' : names[i], diff: enemyDiff });
      b.spawn = spots[i % spots.length]; b.ai.lane = randi(-2, 2);
      G.brawlers.push(b);
    }
    G.poison = { start: 30, end: 160, cx: G.mw * TILE / 2, cy: G.mh * TILE / 2, maxHalf: Math.max(G.mw, G.mh) * TILE / 2 + TILE, min: 3.5 * TILE, half: 9999 };
  } else {
    const lanes = [0, -1, 1];
    for (let team = 0; team < 2; team++) {
      const pool = shuffle(BRAWLERS.map((b) => b.id).filter((id) => !(team === 0 && !demo && id === save.selected)));
      const spots = G.spawns[team];
      for (let i = 0; i < 3; i++) {
        const isP = !demo && team === 0 && i === 0;
        const def = isP ? BR[save.selected] : BR[pool[i]];
        const b = makeBrawler(def, team, { player: isP, name: isP ? 'あなた' : names.pop(), diff: team === 0 ? 'normal' : enemyDiff });
        b.spawn = spots[i % spots.length]; b.ai.lane = lanes[i];
        G.brawlers.push(b);
      }
    }
    if (mode === 'ball') { const c = tileCenter(G.ballSpawn); G.ball = { x: c.x, y: c.y, vx: 0, vy: 0, r: 8, owner: null, lastKicker: null, lockT: 0, spin: 0 }; }
  }
  for (const b of G.brawlers) placeAtSpawn(b);
  G.player = G.brawlers.find((b) => b.isPlayer) || null;
  G.state = 'countdown'; G.cdT = demo ? 0.01 : 3; G.lastCount = 4;
  G.running = true; G.paused = false;
  const f = G.player || G.brawlers[0];
  G.cam.x = f.x; G.cam.y = f.y; G.cam.shake = 0;
  buildFloorCache();
  Input.reset();
}

function resetRound() {
  G.projs.length = 0; G.lobs.length = 0; G.areas.length = 0; G.turrets.length = 0;
  for (const b of G.brawlers) placeAtSpawn(b);
  if (G.ball) { const c = tileCenter(G.ballSpawn); Object.assign(G.ball, { x: c.x, y: c.y, vx: 0, vy: 0, owner: null, lastKicker: null, lockT: 0 }); }
  G.state = 'countdown'; G.cdT = G.demo ? 1 : 2.4; G.lastCount = 4;
  Input.reset();
}

// =========================================================
// 戦闘：攻撃・スーパー
// =========================================================
function aimSpec(b, isSuper) {
  const A = b.def.attack, S = b.def.super, R = b.def.range * TILE;
  if (!isSuper) {
    if (G.ball && G.ball.owner === b) return { kind: 'line', range: 8 * TILE, width: 16 };
    switch (A.type) {
      case 'spread': return { kind: 'cone', range: R, arc: A.arc };
      case 'flame': return { kind: 'cone', range: R, arc: A.arc };
      case 'lob': return { kind: 'lob', range: R, radius: A.radius * TILE };
      case 'melee': return { kind: 'cone', range: R, arc: A.arc };
      default: return { kind: 'line', range: R, width: (A.r || 4) * 2 + 4 };
    }
  }
  switch (S.type) {
    case 'fan': return { kind: 'cone', range: S.range * TILE, arc: S.arc };
    case 'charge': return { kind: 'line', range: S.dist * TILE, width: 24 };
    case 'rail': return { kind: 'line', range: S.range * TILE, width: S.r * 2 };
    case 'megabomb': return { kind: 'lob', range: S.range * TILE, radius: S.radius * TILE };
    case 'leap': return { kind: 'lob', range: S.range * TILE, radius: S.radius * TILE };
    case 'healzone': return { kind: 'lob', range: S.range * TILE, radius: S.radius * TILE };
    case 'shield': return { kind: 'self', range: S.radius * TILE, radius: S.radius * TILE };
    case 'turret': return { kind: 'lob', range: S.range * TILE, radius: 0.7 * TILE };
  }
  return { kind: 'line', range: R, width: 10 };
}

function tryAttack(b, ang, d) {
  if (!b.alive || b.leaping || b.dashing || G.state !== 'play') return false;
  if (G.ball && G.ball.owner === b) {
    if (G.time < b.atkReady) return false;
    kickBall(b, ang); b.atkReady = G.time + 0.35; b.lastAtk = G.time; return true;
  }
  if (b.ammo < 1 || G.time < b.atkReady || b.burst.length) {
    if (b.isPlayer && b.ammo < 1 && G.time > b.emptyT) { Sound.play('empty'); b.emptyT = G.time + 0.35; }
    return false;
  }
  b.ammo -= 1; b.atkReady = G.time + b.def.atkCd; b.lastAtk = G.time; b.revealT = G.time + 1.1;
  b.aimAng = ang; b.face = Math.cos(ang) >= 0 ? 1 : -1;
  performAttack(b, ang, d);
  return true;
}

function trySuper(b, ang, d) {
  if (!b.alive || b.superCharge < 1 || b.leaping || b.dashing || G.state !== 'play') return false;
  b.superCharge = 0; b.lastAtk = G.time; b.revealT = G.time + 1.1; b.aimAng = ang; b.face = Math.cos(ang) >= 0 ? 1 : -1;
  performSuper(b, ang, d);
  Sound.at('super', b.x, b.y);
  for (let i = 0; i < 14; i++) addPart(b.x, b.y - 8, rand(-120, 120), rand(-160, 20), 0.5, COL.gold, 3, 200);
  return true;
}

function spawnBullet(x, y, ang, o, owner, team) {
  const sp = o.speed * TILE;
  G.projs.push({
    x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: o.r || 4, dmg: o.dmg, team, owner,
    range: o.range * TILE, trav: 0, pierce: !!o.pierce, bounce: o.bounces || 0, heal: o.heal || 0,
    breakWalls: !!o.breakWalls, kind: o.kind || 'bullet', color: o.color || '#fff', hit: new Set(), hitTiles: new Set(),
    isSuper: !!o.isSuper, age: 0,
  });
}
function fireFrom(b, ang, o) {
  const mz = b.r + 2;
  spawnBullet(b.x + Math.cos(ang) * mz, b.y + Math.sin(ang) * mz, ang, Object.assign({}, o, { dmg: o.dmg * b.dmgMult }), b, b.team);
}

function performAttack(b, ang, d) {
  const A = b.def.attack, R = b.def.range;
  switch (A.type) {
    case 'burst':
      for (let i = 0; i < A.count; i++) b.burst.push({ t: G.time + i * A.interval, ang: ang + rand(-A.spread, A.spread) });
      processBurst(b);
      break;
    case 'spread':
      for (let i = 0; i < A.count; i++) {
        const a = ang + (A.count > 1 ? (i / (A.count - 1) - 0.5) * A.arc : 0);
        fireFrom(b, a, Object.assign({}, A, { range: R, kind: 'pellet' }));
      }
      Sound.at('shotgun', b.x, b.y); break;
    case 'single':
      fireFrom(b, ang, Object.assign({}, A, { range: R, kind: 'snipe' }));
      Sound.at('sniper', b.x, b.y); break;
    case 'lob':
      throwLob(b, ang, d, { kind: 'bomb', dmg: A.dmg * b.dmgMult, radius: A.radius * TILE, dur: A.flight, range: R * TILE, peak: 60 });
      Sound.at('lob', b.x, b.y); break;
    case 'melee':
      meleeSlash(b, ang); break;
    case 'orb':
      fireFrom(b, ang, Object.assign({}, A, { range: R, kind: 'orb', pierce: true }));
      Sound.at('orb', b.x, b.y); break;
    case 'bounce':
      fireFrom(b, ang, Object.assign({}, A, { range: R, kind: 'bolt' }));
      Sound.at('zap', b.x, b.y); break;
    case 'flame':
      for (let i = 0; i < A.count; i++) {
        const a = ang + rand(-A.arc / 2, A.arc / 2);
        fireFrom(b, a, Object.assign({}, A, { speed: A.speed * rand(0.85, 1.15), range: R * rand(0.8, 1), kind: 'flame', pierce: true }));
      }
      Sound.at('flame', b.x, b.y); break;
  }
}

function processBurst(b) {
  while (b.burst.length && G.time >= b.burst[0].t) {
    const s = b.burst.shift();
    fireFrom(b, s.ang, Object.assign({}, b.def.attack, { range: b.def.range, kind: 'bullet' }));
    Sound.at('shoot', b.x, b.y);
  }
}

function performSuper(b, ang, d) {
  const S = b.def.super;
  switch (S.type) {
    case 'fan':
      for (let i = 0; i < S.count; i++) {
        const a = ang + (i / (S.count - 1) - 0.5) * S.arc;
        fireFrom(b, a, Object.assign({}, S, { kind: 'bullet', isSuper: true }));
      }
      break;
    case 'charge':
      b.dashing = { ang, remain: S.dist * TILE, speed: S.speed * TILE, hit: new Set() };
      Sound.at('dash', b.x, b.y); break;
    case 'rail':
      fireFrom(b, ang, Object.assign({}, S, { kind: 'rail', pierce: true, breakWalls: true, isSuper: true }));
      Sound.at('sniper', b.x, b.y); addShake(3); break;
    case 'megabomb':
      throwLob(b, ang, d, { kind: 'mega', dmg: S.dmg * b.dmgMult, radius: S.radius * TILE, dur: S.flight, range: S.range * TILE, peak: 95, breakWalls: true });
      Sound.at('lob', b.x, b.y); break;
    case 'leap':
      startLeap(b, ang, d); break;
    case 'healzone':
      throwLob(b, ang, d, { kind: 'heal', dmg: 0, radius: S.radius * TILE, dur: 0.6, range: S.range * TILE, peak: 55, extra: S });
      break;
    case 'shield':
      b.shieldT = G.time + S.dur;
      explode(b.x, b.y, S.radius * TILE, S.dmg * b.dmgMult, b, { knock: S.knock, noCharge: true, kind: 'shock', color: '#9fd8ff' });
      Sound.at('shield', b.x, b.y); break;
    case 'turret':
      throwLob(b, ang, d, { kind: 'turret', dmg: S.dmg * b.dmgMult, radius: 0.7 * TILE, dur: 0.5, range: S.range * TILE, peak: 45, extra: S, min: 0.8 * TILE });
      Sound.at('lob', b.x, b.y); break;
  }
}

function throwLob(b, ang, d, o) {
  const dd = clamp(d == null ? o.range : d, o.min != null ? o.min : TILE * 1.2, o.range);
  const tx = clamp(b.x + Math.cos(ang) * dd, 6, G.mw * TILE - 6);
  const ty = clamp(b.y + Math.sin(ang) * dd, 6, G.mh * TILE - 6);
  G.lobs.push({ x0: b.x, y0: b.y, x1: tx, y1: ty, t: 0, dur: o.dur, kind: o.kind, team: b.team, owner: b,
    dmg: o.dmg, radius: o.radius, breakWalls: !!o.breakWalls, peak: o.peak || 60, extra: o.extra || null });
}

function meleeSlash(b, ang) {
  const A = b.def.attack, R = b.def.range * TILE;
  const inArc = (x, y, r) => {
    const d = dist(b.x, b.y, x, y); if (d > R + r) return false;
    const a = Math.atan2(y - b.y, x - b.x);
    return (Math.abs(angDiff(ang, a)) <= A.arc / 2 || d < r + b.r) && losClear(b.x, b.y, x, y);
  };
  for (const t of G.brawlers) {
    if (!t.alive || t.team === b.team || t.leaping) continue;
    if (inArc(t.x, t.y, t.r)) { damage(t, A.dmg * b.dmgMult, b); knockback(t, b.x, b.y, 110); }
  }
  for (const tu of G.turrets) if (tu.team !== b.team && tu.hp > 0 && inArc(tu.x, tu.y, tu.r)) damage(tu, A.dmg * b.dmgMult, b);
  const hitTiles = new Set();
  for (const off of [-0.6, -0.3, 0, 0.3, 0.6]) for (const k of [0.5, 0.9]) {
    const px = b.x + Math.cos(ang + off) * R * k, py = b.y + Math.sin(ang + off) * R * k;
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    if (tileAt(tx, ty) === T_BOX) hitTiles.add(ty * G.mw + tx);
  }
  hitTiles.forEach((i) => damageBox(i % G.mw, (i / G.mw) | 0, A.dmg * b.dmgMult, b));
  G.areas.push({ kind: 'slash', x: b.x, y: b.y, ang, r: R, arc: A.arc, life: 0.18, max: 0.18, color: '#ffffff', owner: b });
  Sound.at('slash', b.x, b.y);
}

function startLeap(b, ang, d) {
  const S = b.def.super;
  const dd = clamp(d == null ? S.range * TILE : d, TILE, S.range * TILE);
  let tx = clamp(b.x + Math.cos(ang) * dd, TILE / 2, G.mw * TILE - TILE / 2);
  let ty = clamp(b.y + Math.sin(ang) * dd, TILE / 2, G.mh * TILE - TILE / 2);
  if (!walkable(Math.floor(tx / TILE), Math.floor(ty / TILE))) {
    const w = nearestWalkable(Math.floor(tx / TILE), Math.floor(ty / TILE));
    if (!w) return; const c = tileCenter(w); tx = c.x; ty = c.y;
  }
  b.leaping = { x0: b.x, y0: b.y, x1: tx, y1: ty, t: 0, dur: S.dur };
  Sound.at('dash', b.x, b.y);
}
function updateLeap(b, dt) {
  const L = b.leaping; L.t += dt;
  const k = Math.min(1, L.t / L.dur);
  b.x = lerp(L.x0, L.x1, k); b.y = lerp(L.y0, L.y1, k);
  if (Math.random() < 0.6) addPart(b.x, b.y - 10, rand(-30, 30), rand(-30, 30), 0.3, '#3e3263', 3, 0);
  if (k >= 1) {
    b.leaping = null;
    resolveCircle(b, isMoveSolid);
    const S = b.def.super;
    explode(b.x, b.y, S.radius * TILE, S.dmg * b.dmgMult, b, { noCharge: true, kind: 'slashburst', color: '#ff4a5a' });
    Sound.at('slash', b.x, b.y);
  }
}
function updateDash(b, dt) {
  const D = b.dashing; const S = b.def.super;
  const step = Math.min(D.remain, D.speed * dt);
  const cx = Math.cos(D.ang), cy = Math.sin(D.ang);
  for (const off of [-0.7, 0, 0.7]) {
    const px = b.x + Math.cos(D.ang + off) * (b.r + 5) + cx * step, py = b.y + Math.sin(D.ang + off) * (b.r + 5) + cy * step;
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE); const t = tileAt(tx, ty);
    if (t === T_WALL || t === T_BUSH) breakWall(tx, ty);
    else if (t === T_BOX) damageBox(tx, ty, 99999, b);
  }
  const ox = b.x, oy = b.y;
  moveCircle(b, cx * step, cy * step);
  const moved = dist(ox, oy, b.x, b.y);
  D.remain -= step;
  for (const t of G.brawlers) {
    if (!t.alive || t.team === b.team || D.hit.has(t) || t.leaping) continue;
    if (dist(b.x, b.y, t.x, t.y) < b.r + t.r + 4) {
      D.hit.add(t); damage(t, S.dmg * b.dmgMult, b, { noCharge: true }); knockback(t, b.x, b.y, S.knock); addShake(4);
    }
  }
  for (const tu of G.turrets) if (tu.team !== b.team && !D.hit.has(tu) && dist(b.x, b.y, tu.x, tu.y) < b.r + tu.r + 4) { D.hit.add(tu); damage(tu, S.dmg * b.dmgMult, b); }
  addPart(b.x + rand(-6, 6), b.y + rand(-4, 8), -cx * 60, -cy * 60, 0.35, '#e8d4b0', 4, 0);
  if (D.remain <= 0.5 || moved < step * 0.3) b.dashing = null;
}

function knockback(t, x, y, p) {
  if (!t.alive || t.leaping || t.dashing) return;
  const a = Math.atan2(t.y - y, t.x - x);
  t.kx += Math.cos(a) * p; t.ky += Math.sin(a) * p;
}

// =========================================================
// ダメージ・回復・撃破
// =========================================================
function damage(t, amt, src, o = {}) {
  if (t.isTurret) {
    if (t.hp <= 0) return;
    t.hp -= amt; t.flash = 0.1;
    addText(t.x, t.y - 20, Math.round(amt), '#ffffff', false);
    return;
  }
  if (!t.alive || t.leaping) return;
  if (t.invulnT > G.time) return;
  if (t.shieldT > G.time) amt *= 0.4;
  amt = Math.max(1, Math.round(amt));
  t.hp -= amt; t.lastHurt = G.time; t.hitFlash = 0.1;
  t.revealT = Math.max(t.revealT, G.time + 0.5);
  const srcB = src && src.def ? src : null;
  if (srcB && srcB !== t) {
    if (!o.noCharge) srcB.superCharge = Math.min(1, srcB.superCharge + amt / srcB.def.superNeed);
    srcB.stats.dmg += amt;
  }
  const mine = t.isPlayer || (srcB && srcB.isPlayer);
  addText(t.x + rand(-6, 6), t.y - 24, amt, t.isPlayer ? '#ff7070' : (srcB && srcB.isPlayer ? '#ffffff' : '#ffd0d0'), mine);
  for (let i = 0; i < 4; i++) addPart(t.x, t.y - 6, rand(-80, 80), rand(-120, 0), 0.3, o.poison ? '#8cff6a' : '#ffffff', 2, 300);
  if (t.isPlayer) { Sound.play('hurt'); addShake(2.5); } else if (srcB && srcB.isPlayer) Sound.play('hit');
  if (t.hp <= 0) kill(t, srcB);
}

function heal(t, amt, src, noCharge) {
  if (!t.alive || t.hp >= t.maxHp) return;
  const h = Math.min(amt, t.maxHp - t.hp);
  t.hp += h;
  addText(t.x + rand(-6, 6), t.y - 24, '+' + Math.round(h), '#6dff8a', t.isPlayer || (src && src.isPlayer));
  if (src && src.def && src !== t) {
    if (!noCharge) src.superCharge = Math.min(1, src.superCharge + h / (src.def.superNeed * 1.4));
    src.stats.heal += h;
  }
  for (let i = 0; i < 3; i++) addPart(t.x + rand(-10, 10), t.y + rand(-10, 4), 0, rand(-60, -30), 0.5, '#8cffb0', 2, 0);
}

function kill(t, killer) {
  t.alive = false; t.hp = 0; t.deathT = G.time; t.deathX = t.x; t.deathY = t.y;
  t.stats.deaths++; t.dashing = null; t.leaping = null; t.burst.length = 0; t.kx = 0; t.ky = 0; t.shieldT = 0;
  if (killer && killer !== t) killer.stats.kills++;
  for (let i = 0; i < 26; i++) {
    const c = pick([t.def.color, '#ffffff', t.def.pal.c || '#888', COL.ink]);
    addPart(t.x, t.y - 8, rand(-180, 180), rand(-240, 40), rand(0.4, 0.9), c, randi(2, 4), 420);
  }
  G.areas.push({ kind: 'ring', x: t.x, y: t.y, r: TILE * 1.2, life: 0.35, max: 0.35, color: '#ffffff' });
  if (t.isPlayer) Sound.play('die');
  else if (killer && killer.isPlayer) { Sound.play('kill'); addShake(3); }
  else Sound.at('hurt', t.x, t.y);
  addFeed(killer, t);
  if (G.mode === 'gem' && t.gems > 0) { dropItems(t, 'gem', t.gems); t.gems = 0; }
  if (G.mode === 'bounty') {
    if (killer && killer.team !== t.team) {
      G.score[killer.team] += t.bounty;
      addText(t.x, t.y - 40, '★' + t.bounty, COL.gold, true, 1.3);
      killer.bounty = Math.min(7, killer.bounty + 1);
    }
    t.bounty = 2;
  }
  if (G.ball && G.ball.owner === t) { G.ball.owner = null; G.ball.vx = 0; G.ball.vy = 0; G.ball.lockT = 0; }
  if (G.mode === 'survival') {
    t.eliminated = true;
    t.place = G.brawlers.filter((b) => b.alive).length + 1;
    dropItems(t, 'cube', Math.max(1, t.cubes));
    if (t.isPlayer) endMatch(-2);
  } else {
    t.respawnAt = G.time + MODES[G.mode].respawn;
  }
}

function respawn(b) {
  placeAtSpawn(b);
  for (let i = 0; i < 16; i++) addPart(b.x + rand(-12, 12), b.y + rand(-4, 10), 0, rand(-120, -40), 0.6, b.team === 0 ? COL.blue : COL.red, 3, 0);
  if (b.isPlayer) setCenter('', '', 0);
}

function dropItems(t, kind, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(50, 150);
    G.items.push({ kind, x: t.x, y: t.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 5, delay: 0.6, bob: rand(0, TAU) });
  }
}

// =========================================================
// 爆発・壁・箱
// =========================================================
function explode(x, y, radius, dmg, owner, o = {}) {
  const team = owner ? owner.team : -1;
  if (dmg > 0) {
    for (const t of G.brawlers) {
      if (!t.alive || t.team === team || t.leaping) continue;
      if (dist(x, y, t.x, t.y) <= radius + t.r * 0.5) { damage(t, dmg, owner, o); if (o.knock) knockback(t, x, y, o.knock); }
    }
    for (const tu of G.turrets) if (tu.team !== team && tu.hp > 0 && dist(x, y, tu.x, tu.y) <= radius + tu.r * 0.5) damage(tu, dmg, owner, o);
  }
  const x0 = Math.floor((x - radius) / TILE), x1 = Math.floor((x + radius) / TILE);
  const y0 = Math.floor((y - radius) / TILE), y1 = Math.floor((y + radius) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (tx < 0 || ty < 0 || tx >= G.mw || ty >= G.mh) continue;
    if (dist(x, y, tx * TILE + TILE / 2, ty * TILE + TILE / 2) > radius + TILE * 0.3) continue;
    const t = tileAt(tx, ty);
    if (t === T_BOX && dmg > 0) damageBox(tx, ty, dmg, owner);
    else if (o.breakWalls && (t === T_WALL || t === T_BUSH)) breakWall(tx, ty);
  }
  const kind = o.kind || 'boom';
  G.areas.push({ kind: 'ring', x, y, r: radius, life: 0.4, max: 0.4, color: o.color || '#ffd23f' });
  if (kind === 'boom') {
    G.areas.push({ kind: 'flash', x, y, r: radius * 0.9, life: 0.18, max: 0.18, color: '#fff2b0' });
    const n = Math.round(12 + radius / 3);
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(40, 200) * (radius / TILE);
      addPart(x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.3, 0.7), pick(['#ffd23f', '#ff8a3a', '#ff4a2a', '#fff2b0']), randi(2, 5), 0);
    }
    for (let i = 0; i < 6; i++) addPart(x + rand(-8, 8), y + rand(-8, 8), rand(-20, 20), rand(-50, -20), rand(0.6, 1.1), 'rgba(80,70,90,0.7)', randi(4, 7), 0);
  } else {
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU;
      addPart(x + Math.cos(a) * 6, y + Math.sin(a) * 6, Math.cos(a) * radius * 3, Math.sin(a) * radius * 3, 0.3, o.color || '#ffffff', 3, 0);
    }
  }
  addShake(Math.min(8, radius / TILE * 2.4));
}

function breakWall(tx, ty) {
  const t = tileAt(tx, ty);
  if (t !== T_WALL && t !== T_BUSH) return;
  if (tx < 0 || ty < 0 || tx >= G.mw || ty >= G.mh) return;
  G.grid[ty * G.mw + tx] = T_FLOOR; markFloor(tx, ty);
  const th = G.theme; const cx = tx * TILE + TILE / 2, cy = ty * TILE + TILE / 2;
  const cols = t === T_WALL ? [th.wallTop, th.wallFront, th.wallDark, th.line] : [th.bush, th.bushD, th.bushHi];
  for (let i = 0; i < 12; i++) addPart(cx + rand(-12, 12), cy + rand(-12, 8), rand(-120, 120), rand(-200, -40), rand(0.4, 0.8), pick(cols), randi(2, 5), 500);
  if (t === T_WALL) Sound.at('box', cx, cy);
}

function damageBox(tx, ty, amt, src) {
  const i = ty * G.mw + tx;
  if (tx < 0 || ty < 0 || tx >= G.mw || ty >= G.mh || G.grid[i] !== T_BOX) return;
  G.boxHp[i] -= amt; G.boxHitT[i] = G.anim;
  const cx = tx * TILE + TILE / 2, cy = ty * TILE + TILE / 2;
  for (let k = 0; k < 3; k++) addPart(cx + rand(-10, 10), cy - 8, rand(-70, 70), rand(-120, -20), 0.35, '#d9a45a', 2, 400);
  if (G.boxHp[i] <= 0) {
    G.grid[i] = T_FLOOR; markFloor(tx, ty);
    G.items.push({ kind: 'cube', x: cx, y: cy, vx: rand(-30, 30), vy: rand(-30, 30), r: 5, delay: 0.3, bob: rand(0, TAU) });
    for (let k = 0; k < 16; k++) addPart(cx + rand(-12, 12), cy + rand(-12, 4), rand(-150, 150), rand(-220, -40), rand(0.4, 0.8), pick(['#d9a45a', '#b07a36', '#6e4a1e', '#5dff8a']), randi(2, 5), 500);
    Sound.at('box', cx, cy);
  }
}

// =========================================================
// 弾・投擲物・エリア・タレット・アイテム
// =========================================================
function updateProjectiles(dt) {
  const arr = G.projs;
  for (let i = arr.length - 1; i >= 0; i--) {
    const p = arr[i]; let dead = false; p.age += dt;
    const total = Math.hypot(p.vx, p.vy) * dt;
    const n = Math.max(1, Math.ceil(total / 6));
    const sx = p.vx * dt / n, sy = p.vy * dt / n;
    for (let s = 0; s < n && !dead; s++) {
      const nx = p.x + sx, ny = p.y + sy;
      const tx = Math.floor(nx / TILE), ty = Math.floor(ny / TILE);
      const t = tileAt(tx, ty);
      if (isShotSolid(t)) {
        const idx = ty * G.mw + tx;
        if (t === T_BOX && tx >= 0 && tx < G.mw) {
          if (!p.hitTiles.has(idx)) { p.hitTiles.add(idx); damageBox(tx, ty, p.dmg, p.owner); }
          if (!(p.pierce && p.breakWalls)) { dead = true; impactFx(p); break; }
        } else if (t === T_WALL && p.breakWalls) {
          breakWall(tx, ty);
        } else if (p.bounce > 0) {
          const ox = Math.floor(p.x / TILE), oy = Math.floor(p.y / TILE);
          let flipped = false;
          if (tx !== ox && isShotSolid(tileAt(tx, oy))) { p.vx = -p.vx; flipped = true; }
          if (ty !== oy && isShotSolid(tileAt(ox, ty))) { p.vy = -p.vy; flipped = true; }
          if (!flipped) { p.vx = -p.vx; p.vy = -p.vy; }
          p.bounce--; p.hit.clear();
          for (let k = 0; k < 5; k++) addPart(p.x, p.y, rand(-90, 90), rand(-90, 90), 0.25, p.color, 2, 0);
          Sound.at('zap', p.x, p.y);
          break;
        } else { dead = true; impactFx(p); break; }
      }
      p.x = nx; p.y = ny; p.trav += Math.hypot(sx, sy);
      for (const tg of G.brawlers) {
        if (!tg.alive || tg.leaping || p.hit.has(tg)) continue;
        const rr = p.r + tg.r;
        if ((tg.x - p.x) ** 2 + (tg.y - p.y) ** 2 > rr * rr) continue;
        if (tg.team !== p.team) {
          p.hit.add(tg);
          damage(tg, p.dmg, p.owner, { noCharge: p.isSuper });
          if (p.kind === 'rail') knockback(tg, p.x - p.vx, p.y - p.vy, 120);
          if (!p.pierce) { dead = true; impactFx(p); break; }
        } else if (p.heal && tg !== p.owner) {
          p.hit.add(tg); heal(tg, p.heal * (p.owner ? p.owner.dmgMult : 1), p.owner);
        }
      }
      if (dead) break;
      for (const tu of G.turrets) {
        if (tu.team === p.team || tu.hp <= 0 || p.hit.has(tu)) continue;
        if (dist(tu.x, tu.y, p.x, p.y) < p.r + tu.r) {
          p.hit.add(tu); damage(tu, p.dmg, p.owner);
          if (!p.pierce) { dead = true; impactFx(p); break; }
        }
      }
      if (dead) break;
      if (p.trav >= p.range) { dead = true; if (p.kind !== 'flame') impactFx(p, true); break; }
    }
    if (dead) arr.splice(i, 1);
  }
}
function impactFx(p, fizzle) {
  const n = fizzle ? 2 : 5;
  for (let k = 0; k < n; k++) addPart(p.x, p.y, rand(-80, 80), rand(-80, 80), 0.22, p.color, 2, 0);
}

function updateLobs(dt) {
  for (let i = G.lobs.length - 1; i >= 0; i--) {
    const L = G.lobs[i]; L.t += dt;
    if (L.t < L.dur) continue;
    G.lobs.splice(i, 1);
    landLob(L);
  }
}
function landLob(L) {
  const x = L.x1, y = L.y1;
  if (L.kind === 'bomb') {
    explode(x, y, L.radius, L.dmg, L.owner, { kind: 'boom' });
    Sound.at('boom', x, y);
  } else if (L.kind === 'mega') {
    explode(x, y, L.radius, L.dmg, L.owner, { kind: 'boom', breakWalls: true, noCharge: true });
    Sound.at('bigboom', x, y);
  } else if (L.kind === 'heal') {
    const S = L.extra;
    G.areas.push({ kind: 'heal', x, y, r: L.radius, life: S.dur, max: S.dur, team: L.team, owner: L.owner, tick: 0, hps: S.hps, dps: S.dps * (L.owner ? L.owner.dmgMult : 1) });
    Sound.at('heal', x, y);
  } else if (L.kind === 'turret') {
    const S = L.extra;
    let tx = x, ty = y;
    if (!walkable(Math.floor(tx / TILE), Math.floor(ty / TILE))) {
      const w = nearestWalkable(Math.floor(tx / TILE), Math.floor(ty / TILE));
      if (w) { const c = tileCenter(w); tx = c.x; ty = c.y; }
    }
    for (let i = G.turrets.length - 1; i >= 0; i--) if (G.turrets[i].owner === L.owner) G.turrets.splice(i, 1);
    G.turrets.push({ isTurret: true, x: tx, y: ty, r: 12, team: L.team, owner: L.owner, hp: S.hp, maxHp: S.hp, life: S.life, maxLife: S.life,
      fireT: 0.4, ang: L.team === 0 ? -Math.PI / 2 : Math.PI / 2, dmg: L.dmg, rate: S.rate, range: S.trange * TILE, flash: 0 });
    for (let i = 0; i < 12; i++) addPart(tx, ty, rand(-90, 90), rand(-140, -20), 0.4, '#7fffd4', 3, 300);
    Sound.at('zap', tx, ty);
  }
}

function updateAreas(dt) {
  for (let i = G.areas.length - 1; i >= 0; i--) {
    const A = G.areas[i]; A.life -= dt;
    if (A.kind === 'heal') {
      A.tick -= dt;
      if (A.tick <= 0) {
        A.tick = 0.25;
        for (const t of G.brawlers) {
          if (!t.alive || t.leaping || dist(A.x, A.y, t.x, t.y) > A.r + t.r * 0.5) continue;
          if (t.team === A.team) heal(t, A.hps * 0.25, A.owner, true);
          else damage(t, A.dps * 0.25, A.owner, { noCharge: true });
        }
        const a = rand(0, TAU), rr = rand(0, A.r);
        addPart(A.x + Math.cos(a) * rr, A.y + Math.sin(a) * rr, 0, -40, 0.6, '#bfffd8', 2, 0);
      }
    }
    if (A.life <= 0) G.areas.splice(i, 1);
  }
}

function updateTurrets(dt) {
  for (let i = G.turrets.length - 1; i >= 0; i--) {
    const t = G.turrets[i];
    t.life -= dt; t.flash = Math.max(0, t.flash - dt); t.fireT -= dt;
    if (t.hp <= 0 || t.life <= 0) {
      G.turrets.splice(i, 1);
      for (let k = 0; k < 14; k++) addPart(t.x, t.y - 6, rand(-120, 120), rand(-160, -20), 0.5, pick(['#7fffd4', '#4a5068', '#ffffff']), 3, 400);
      Sound.at('box', t.x, t.y);
      continue;
    }
    let best = null, bd = t.range;
    for (const e of G.brawlers) {
      if (!e.alive || e.team === t.team || e.leaping || !visibleTo(t.team, e)) continue;
      const d = dist(t.x, t.y, e.x, e.y);
      if (d < bd && losClear(t.x, t.y, e.x, e.y)) { bd = d; best = e; }
    }
    if (best) {
      const want = Math.atan2(best.y - t.y, best.x - t.x);
      t.ang += angDiff(t.ang, want) * Math.min(1, dt * 12);
      if (t.fireT <= 0 && Math.abs(angDiff(t.ang, want)) < 0.3) {
        t.fireT = t.rate;
        spawnBullet(t.x + Math.cos(t.ang) * 12, t.y - 4 + Math.sin(t.ang) * 12, t.ang,
          { dmg: t.dmg, speed: 16, r: 4, range: t.range / TILE + 0.5, kind: 'tbullet', color: '#7fffd4', isSuper: true }, t.owner, t.team);
        Sound.at('zap', t.x, t.y);
      }
    }
  }
}

function updateItems(dt) {
  for (let i = G.items.length - 1; i >= 0; i--) {
    const it = G.items[i];
    if (it.vx || it.vy) {
      moveCircle(it, it.vx * dt, it.vy * dt);
      const f = Math.exp(-4 * dt); it.vx *= f; it.vy *= f;
      if (Math.abs(it.vx) + Math.abs(it.vy) < 4) { it.vx = 0; it.vy = 0; }
    }
    it.delay -= dt;
    if (it.delay > 0) continue;
    for (const b of G.brawlers) {
      if (!b.alive || b.leaping) continue;
      if (dist(b.x, b.y, it.x, it.y) > b.r + 10) continue;
      collectItem(b, it); G.items.splice(i, 1); break;
    }
  }
}
function collectItem(b, it) {
  if (it.kind === 'gem') {
    b.gems++; b.stats.gems++;
    if (b.isPlayer || (G.player && b.team === G.player.team)) Sound.play('gem');
    addPart(it.x, it.y, 0, -60, 0.4, '#e2b8ff', 3, 0);
  } else if (it.kind === 'cube') {
    b.cubes++;
    b.maxHp += 420; b.hp = Math.min(b.maxHp, b.hp + 420);
    b.dmgMult = 1 + 0.1 * b.cubes;
    if (b.isPlayer) { Sound.play('cube'); addText(b.x, b.y - 40, 'パワーアップ！', '#5dff8a', true, 1.1); }
    for (let k = 0; k < 10; k++) addPart(b.x + rand(-10, 10), b.y + rand(-6, 8), 0, rand(-140, -60), 0.5, '#5dff8a', 3, 0);
  }
}

// =========================================================
// ボール
// =========================================================
function enemyGoalPoint(team) {
  return { x: G.mw * TILE / 2, y: team === 0 ? TILE * 0.5 : (G.mh - 0.5) * TILE };
}
function kickBall(b, ang) {
  const B = G.ball;
  B.owner = null;
  const power = 14 * TILE;
  B.vx = Math.cos(ang) * power; B.vy = Math.sin(ang) * power;
  B.x = b.x + Math.cos(ang) * (b.r + 3); B.y = b.y + Math.sin(ang) * (b.r + 3);
  resolveCircle(B, isMoveSolid);
  B.lastKicker = b; B.lockT = 0.35;
  b.aimAng = ang; b.face = Math.cos(ang) >= 0 ? 1 : -1;
  Sound.at('kick', b.x, b.y);
  for (let k = 0; k < 6; k++) addPart(B.x, B.y, rand(-60, 60), rand(-60, 60), 0.25, '#ffffff', 2, 0);
}
function updateBall(dt) {
  const B = G.ball; if (!B) return;
  B.lockT -= dt;
  if (B.owner) {
    const o = B.owner;
    if (!o.alive) { B.owner = null; B.vx = 0; B.vy = 0; }
    else {
      const a = o.moving ? Math.atan2(o.my, o.mx) : o.aimAng;
      const tx = o.x + Math.cos(a) * 13, ty = o.y + Math.sin(a) * 9 + 5;
      const k = Math.min(1, dt * 18);
      B.x = lerp(B.x, tx, k); B.y = lerp(B.y, ty, k);
      B.spin += (o.moving ? 10 : 0) * dt;
      checkGoal(o);
      return;
    }
  }
  const sp = Math.hypot(B.vx, B.vy);
  if (sp > 0) {
    const n = Math.max(1, Math.ceil(sp * dt / 5));
    for (let s = 0; s < n; s++) {
      const nx = B.x + B.vx * dt / n;
      if (circleHitsSolid(nx, B.y, B.r, isMoveSolid)) { B.vx = -B.vx * 0.7; Sound.at('kick', B.x, B.y); } else B.x = nx;
      const ny = B.y + B.vy * dt / n;
      if (circleHitsSolid(B.x, ny, B.r, isMoveSolid)) { B.vy = -B.vy * 0.7; } else B.y = ny;
    }
    const f = Math.exp(-1.6 * dt); B.vx *= f; B.vy *= f;
    if (Math.hypot(B.vx, B.vy) < 8) { B.vx = 0; B.vy = 0; }
    B.spin += sp * dt * 0.08;
  }
  if (checkGoal(B.lastKicker)) return;
  let best = null, bd = 1e9;
  for (const b of G.brawlers) {
    if (!b.alive || b.leaping) continue;
    if (b === B.lastKicker && B.lockT > 0) continue;
    const d = dist(b.x, b.y, B.x, B.y);
    if (d < b.r + B.r + 3 && d < bd) { bd = d; best = b; }
  }
  if (best) { B.owner = best; B.vx = 0; B.vy = 0; if (best.isPlayer) Sound.play('click'); }
}
function checkGoal(scorer) {
  const B = G.ball;
  if (tileAtPos(B.x, B.y) !== T_GOAL || G.state !== 'play') return false;
  const team = B.y < G.mh * TILE / 2 ? 0 : 1;
  G.score[team]++;
  if (scorer && scorer.team === team) scorer.stats.goals++;
  B.owner = null; B.vx = 0; B.vy = 0;
  G.state = 'goal'; G.goalT = 2.6;
  for (let i = 0; i < 50; i++) addPart(B.x, B.y, rand(-260, 260), rand(-320, 40), rand(0.6, 1.3), pick(['#ffd23f', '#3aa0ff', '#ff4a5a', '#ffffff', '#5ee06a']), 3, 380);
  addShake(6);
  if (!G.demo) {
    const mine = G.player && G.player.team === team;
    setCenter(mine ? 'ゴール！' : '失点…', `${G.score[0]} - ${G.score[1]}`, 2.3, mine ? 'good' : 'bad');
    Sound.play(mine ? 'goal' : 'lose');
  }
  if (G.score[team] >= 2) G.pendingEnd = team;
  return true;
}

// =========================================================
// 視界（草むら）
// =========================================================
function inBush(b) { return tileAtPos(b.x, b.y) === T_BUSH; }
function visibleTo(team, b) {
  if (team < 0 || b.team === team) return true;
  if (!inBush(b)) return true;
  if (G.time < b.revealT) return true;
  for (const o of G.brawlers) if (o.alive && o.team === team && dist(o.x, o.y, b.x, b.y) < 2.3 * TILE) return true;
  return false;
}
const viewTeam = () => (G.player ? G.player.team : -1);

// =========================================================
// キャラ更新
// =========================================================
function updateBrawler(b, dt) {
  if (!b.alive) {
    if (!b.eliminated && b.respawnAt && G.time >= b.respawnAt && G.state === 'play') respawn(b);
    return;
  }
  const ox = b.x, oy = b.y;
  if (b.hitFlash > 0) b.hitFlash -= dt;
  if (b.ammo < b.maxAmmo) b.ammo = Math.min(b.maxAmmo, b.ammo + dt / b.def.reload);
  if (G.time - Math.max(b.lastAtk, b.lastHurt) > 3 && b.hp < b.maxHp && !inPoison(b)) {
    b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.13 * dt);
    b.regenFxT -= dt;
    if (b.regenFxT <= 0) { b.regenFxT = 0.35; addPart(b.x + rand(-8, 8), b.y - 4, 0, -50, 0.5, '#8cffb0', 2, 0); }
  }
  processBurst(b);
  let mx = 0, my = 0;
  if (G.state === 'play') {
    const v = b.isPlayer ? playerControl(b) : botControl(b, dt);
    mx = v[0]; my = v[1];
  }
  b.mx = mx; b.my = my;
  if (b.leaping) updateLeap(b, dt);
  else if (b.dashing) updateDash(b, dt);
  else {
    const sp = b.def.speed * TILE;
    moveCircle(b, (mx * sp + b.kx) * dt, (my * sp + b.ky) * dt);
    b.moving = Math.abs(mx) + Math.abs(my) > 0.05;
    if (b.moving) {
      b.walkT += dt;
      if (Math.abs(mx) > 0.1 && G.time - b.lastAtk > 0.4 && !(b.isPlayer && !Input.touchMode)) b.face = mx > 0 ? 1 : -1;
      if (Math.random() < dt * 6) addPart(b.x + rand(-5, 5), b.y + 9, rand(-10, 10), rand(-20, -5), 0.3, 'rgba(255,255,255,0.35)', 2, 0);
    }
  }
  const f = Math.exp(-6 * dt); b.kx *= f; b.ky *= f;
  if (Math.abs(b.kx) < 1) b.kx = 0; if (Math.abs(b.ky) < 1) b.ky = 0;
  b.velX = (b.x - ox) / dt; b.velY = (b.y - oy) / dt;
  if (b.isPlayer) {
    if (b.superCharge >= 1 && !b.superWasReady) { Sound.play('ready'); b.superWasReady = true; }
    if (b.superCharge < 1) b.superWasReady = false;
  }
  if (G.mode === 'survival' && inPoison(b) && G.state === 'play') {
    b.poisonAcc += dt;
    if (b.poisonAcc >= 0.5) { b.poisonAcc -= 0.5; damage(b, 360 + 60 * Math.floor(G.time / 20), null, { poison: true, noCharge: true }); }
  } else b.poisonAcc = 0;
}
function separateBrawlers() {
  const a = G.brawlers;
  for (let i = 0; i < a.length; i++) {
    const p = a[i]; if (!p.alive || p.leaping) continue;
    for (let j = i + 1; j < a.length; j++) {
      const q = a[j]; if (!q.alive || q.leaping) continue;
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy), m = p.r + q.r - 6;
      if (d < m && d > 0.01) {
        const push = (m - d) * 0.25;
        p.x -= dx / d * push; p.y -= dy / d * push; q.x += dx / d * push; q.y += dy / d * push;
        resolveCircle(p, isMoveSolid); resolveCircle(q, isMoveSolid);
      }
    }
  }
}
function inPoison(b) {
  const P = G.poison; if (!P) return false;
  return Math.abs(b.x - P.cx) > P.half || Math.abs(b.y - P.cy) > P.half;
}

// =========================================================
// モード処理
// =========================================================
function teamGems() {
  const t = [0, 0];
  for (const b of G.brawlers) if (b.alive && b.team < 2) t[b.team] += b.gems;
  return t;
}
function modeUpdate(dt) {
  const MD = MODES[G.mode];
  if (MD.time) {
    if (G.timeLeft <= 10 && !G.warned.t10 && !G.demo) { G.warned.t10 = true; Sound.play('warn'); }
    if (G.timeLeft <= 0) { G.timeLeft = 0; timeUp(); return; }
  }
  if (G.mode === 'gem') {
    G.mineT -= dt;
    if (G.mineT <= 0) {
      G.mineT = 7;
      const c = tileCenter(G.mine); const a = rand(0, TAU);
      G.items.push({ kind: 'gem', x: c.x, y: c.y, vx: Math.cos(a) * rand(50, 90), vy: Math.sin(a) * rand(50, 90), r: 5, delay: 0.35, bob: rand(0, TAU) });
      for (let i = 0; i < 10; i++) addPart(c.x, c.y, rand(-80, 80), rand(-140, -30), 0.5, '#e2b8ff', 3, 300);
      Sound.at('gem', c.x, c.y);
    }
    const tg = teamGems(); G.score = tg;
    let lead = -1;
    if (tg[0] >= 10 && tg[0] > tg[1]) lead = 0; else if (tg[1] >= 10 && tg[1] > tg[0]) lead = 1;
    if (lead === -1) G.gemCd = null;
    else if (!G.gemCd || G.gemCd.team !== lead) G.gemCd = { team: lead, t: 15, last: 16 };
    else {
      G.gemCd.t -= dt;
      const s = Math.ceil(G.gemCd.t);
      if (s !== G.gemCd.last) { G.gemCd.last = s; if (s <= 5 && !G.demo) Sound.play('count'); }
      if (G.gemCd.t <= 0) endMatch(lead);
    }
  } else if (G.mode === 'survival') {
    const P = G.poison;
    const k = clamp((G.time - P.start) / (P.end - P.start), 0, 1);
    P.half = lerp(P.maxHalf, P.min, k);
    if (G.time > P.start - 4 && !G.warned.poison && !G.demo) { G.warned.poison = true; setCenter('毒ガス接近！', '中央へ移動しよう', 2, 'bad'); Sound.play('warn'); }
    const alive = G.brawlers.filter((b) => b.alive);
    if (alive.length <= 1) endMatch(alive[0] ? alive[0].team : -1);
  }
}
function timeUp() {
  if (G.mode === 'gem') { const tg = teamGems(); endMatch(tg[0] > tg[1] ? 0 : tg[1] > tg[0] ? 1 : -1); }
  else endMatch(G.score[0] > G.score[1] ? 0 : G.score[1] > G.score[0] ? 1 : -1);
}
function endMatch(winTeam) {
  if (G.state === 'over') return;
  G.state = 'over'; G.overT = 2.4; G.result = { winTeam };
  if (G.demo) { G.overT = 1.5; return; }
  const p = G.player;
  if (G.mode === 'survival') {
    const place = p.alive ? 1 : p.place;
    G.result.place = place;
    if (place === 1) { setCenter('1位！', 'サバイバル勝利', 2.4, 'good'); Sound.play('win'); }
    else { setCenter(place + '位', 'やられてしまった…', 2.4, 'bad'); Sound.play('lose'); }
  } else if (winTeam === -1) { setCenter('引き分け', '', 2.4, ''); Sound.play('lose'); }
  else if (winTeam === p.team) { setCenter('勝利！', '', 2.4, 'good'); Sound.play('win'); }
  else { setCenter('敗北…', '', 2.4, 'bad'); Sound.play('lose'); }
}

// =========================================================
// BOT AI
// =========================================================
function projSpeed(b) {
  const A = b.def.attack;
  if (A.type === 'lob') return null;
  if (A.type === 'melee') return 1e6;
  return A.speed * TILE;
}
function predictAim(b, T, speedPx, flight, lead) {
  const d = dist(b.x, b.y, T.x, T.y);
  const t = flight != null ? flight : d / speedPx;
  const px = T.x + (T.velX || 0) * t * lead, py = T.y + (T.velY || 0) * t * lead;
  return { ang: Math.atan2(py - b.y, px - b.x), d: dist(b.x, b.y, px, py) };
}
function idealDist(b) {
  const A = b.def.attack, R = b.def.range * TILE;
  let d;
  if (A.type === 'melee') d = TILE * 0.8;
  else if (A.type === 'spread' || A.type === 'flame') d = R * 0.5;
  else if (A.type === 'lob') d = R * 0.78;
  else d = R * 0.7;
  if (G.mode === 'bounty' && b.bounty >= 5) d += 1.5 * TILE;
  if (b.hp / b.maxHp < 0.45) d += 1.5 * TILE;
  return d;
}
function closestToBall(team) {
  let best = null, bd = 1e9;
  for (const b of G.brawlers) if (b.alive && b.team === team) { const d = dist(b.x, b.y, G.ball.x, G.ball.y); if (d < bd) { bd = d; best = b; } }
  return best;
}
function nearestBox(b, maxD) {
  const P = G.poison; let best = null, bd = maxD;
  for (let i = 0; i < G.grid.length; i++) {
    if (G.grid[i] !== T_BOX) continue;
    const tx = i % G.mw, ty = (i / G.mw) | 0; const x = tx * TILE + TILE / 2, y = ty * TILE + TILE / 2;
    if (P && (Math.abs(x - P.cx) > P.half - TILE || Math.abs(y - P.cy) > P.half - TILE)) continue;
    const d = dist(b.x, b.y, x, y);
    if (d < bd) { bd = d; best = { i, x, y }; }
  }
  return best;
}
function modeGoal(b) {
  const ai = b.ai; const cx = G.mw * TILE / 2, cy = G.mh * TILE / 2;
  const laneX = cx + ai.lane * 4 * TILE;
  const own = b.team === 0 ? 1 : -1;
  switch (G.mode) {
    case 'gem': {
      const tg = teamGems(); const mine = tileCenter(G.mine);
      const lead = tg[b.team] >= 10 && tg[b.team] > tg[1 - b.team];
      if (b.gems >= 5 || (lead && b.gems >= 1)) return { x: lerp(cx, laneX, 0.5), y: cy + own * 7 * TILE, hold: true };
      let best = null, bd = 11 * TILE;
      for (const it of G.items) if (it.kind === 'gem') { const d = dist(b.x, b.y, it.x, it.y); if (d < bd) { bd = d; best = it; } }
      if (best) return { x: best.x, y: best.y };
      return { x: lerp(mine.x, laneX, 0.55), y: mine.y + own * 2.2 * TILE };
    }
    case 'bounty':
      return { x: laneX, y: cy + own * (b.bounty >= 5 ? 4 : 1.2) * TILE };
    case 'ball': {
      const B = G.ball; const eg = enemyGoalPoint(b.team);
      if (B.owner === b) return eg;
      if (!B.owner) {
        if (closestToBall(b.team) === b) return { x: B.x, y: B.y };
        return { x: lerp(B.x, laneX, 0.6), y: lerp(B.y, cy, 0.3) + own * 2 * TILE };
      }
      if (B.owner.team === b.team) return { x: laneX, y: B.owner.y - own * 3 * TILE };
      return { x: B.owner.x, y: B.owner.y };
    }
    case 'survival': {
      const P = G.poison; const safe = P.half - 2 * TILE;
      if (Math.abs(b.x - P.cx) > safe || Math.abs(b.y - P.cy) > safe) return { x: P.cx + ai.lane * TILE * 0.5, y: P.cy };
      if (!ai.boxT || G.grid[ai.boxT.i] !== T_BOX) ai.boxT = nearestBox(b, 11 * TILE);
      if (ai.boxT) return { x: ai.boxT.x, y: ai.boxT.y, box: ai.boxT };
      if (!ai.wander || G.time > ai.wanderT) {
        ai.wanderT = G.time + rand(3, 6);
        const r = Math.max(TILE, P.half - 3 * TILE);
        ai.wander = { x: P.cx + rand(-r, r), y: P.cy + rand(-r, r) };
      }
      return ai.wander;
    }
  }
  return { x: cx, y: cy };
}
function retreatPoint(b) {
  if (G.mode === 'survival') {
    const T = b.ai.target; const P = G.poison;
    if (T) {
      const a = Math.atan2(b.y - T.y, b.x - T.x);
      const lim = Math.max(TILE, P.half - TILE);
      return { x: clamp(b.x + Math.cos(a) * 5 * TILE, P.cx - lim, P.cx + lim), y: clamp(b.y + Math.sin(a) * 5 * TILE, P.cy - lim, P.cy + lim) };
    }
    return { x: P.cx, y: P.cy };
  }
  return tileCenter(b.spawn);
}

function botThink(b) {
  const ai = b.ai; const D = DIFF[b.diff];
  let best = null, bs = 1e9;
  const isLob = b.def.attack.type === 'lob';
  for (const e of G.brawlers) {
    if (!e.alive || e.team === b.team || e.leaping) continue;
    if (!visibleTo(b.team, e)) continue;
    const d = dist(b.x, b.y, e.x, e.y); if (d > 11 * TILE) continue;
    let s = d * (0.6 + 0.4 * e.hp / e.maxHp);
    if (G.mode === 'gem') s -= e.gems * 45;
    if (G.ball && G.ball.owner === e) s -= 220;
    if (!isLob && !losClear(b.x, b.y, e.x, e.y)) s += 160;
    if (s < bs) { bs = s; best = e; }
  }
  if (!best) {
    let bd = 8 * TILE;
    for (const tu of G.turrets) if (tu.team !== b.team && tu.hp > 0) { const d = dist(b.x, b.y, tu.x, tu.y); if (d < bd && losClear(b.x, b.y, tu.x, tu.y)) { bd = d; best = tu; } }
  }
  if (best !== ai.target && best) ai.nextShot = Math.max(ai.nextShot, G.time + D.react);
  ai.target = best;
  const hpR = b.hp / b.maxHp;
  const near = best && dist(b.x, b.y, best.x, best.y) < 7 * TILE;
  ai.retreat = !!(near && (hpR < 0.28 || (hpR < 0.5 && ((G.mode === 'gem' && b.gems >= 5) || (G.mode === 'bounty' && b.bounty >= 5)))));
  if (G.ball && G.ball.owner === b) ai.retreat = false;
  ai.goal = modeGoal(b);
}

function followPath(b, dest) {
  const ai = b.ai;
  if (dist(b.x, b.y, dest.x, dest.y) < 10) return [0, 0];
  if (dist(b.x, b.y, dest.x, dest.y) < 5 * TILE && walkClear(b.x, b.y, dest.x, dest.y, b.r - 2)) {
    const dx = dest.x - b.x, dy = dest.y - b.y, l = Math.hypot(dx, dy);
    return [dx / l, dy / l];
  }
  const key = Math.floor(dest.x / TILE) + ',' + Math.floor(dest.y / TILE);
  if (ai.pathKey !== key || G.time > ai.pathT || !ai.path) {
    ai.path = findPath(b.x, b.y, dest.x, dest.y); ai.pathKey = key; ai.pathT = G.time + 1.1; ai.pi = 0;
  }
  let tx = dest.x, ty = dest.y;
  const P = ai.path;
  if (P && P.length) {
    while (ai.pi < P.length - 1 && dist(b.x, b.y, P[ai.pi].x, P[ai.pi].y) < 12) ai.pi++;
    if (ai.pi < P.length - 1 && walkClear(b.x, b.y, P[ai.pi + 1].x, P[ai.pi + 1].y, b.r - 2)) ai.pi++;
    tx = P[ai.pi].x; ty = P[ai.pi].y;
  }
  const dx = tx - b.x, dy = ty - b.y, l = Math.hypot(dx, dy);
  if (l < 3) return [0, 0];
  return [dx / l, dy / l];
}

function botControl(b, dt) {
  const ai = b.ai, D = DIFF[b.diff];
  ai.thinkT -= dt;
  if (ai.thinkT <= 0) { ai.thinkT = rand(0.15, 0.28); botThink(b); }
  ai.strafeT -= dt;
  if (ai.strafeT <= 0) { ai.strafeT = rand(0.45, 1.3) / D.aggro; ai.strafeDir = Math.random() < 0.15 ? 0 : pick([-1, 1]); }
  let T = ai.target;
  if (T && (T.isTurret ? T.hp <= 0 : (!T.alive || T.leaping))) { T = null; ai.target = null; }
  const A = b.def.attack, R = b.def.range * TILE, isLob = A.type === 'lob';
  const carrying = G.ball && G.ball.owner === b;
  let mx = 0, my = 0, direct = false, dest = null;
  if (ai.retreat) dest = retreatPoint(b);
  else if (carrying) dest = ai.goal;
  else if (T) {
    const d = dist(b.x, b.y, T.x, T.y);
    const hold = ai.goal && ai.goal.hold;
    const engageR = R + (hold ? 0.5 * TILE : 3 * TILE) * D.aggro;
    const hunt = ((G.mode === 'bounty' || (G.ball && G.ball.owner === T)) && d < 9 * TILE) || (G.mode === 'survival' && d < (b.cubes >= (T.cubes || 0) ? 6 : 4) * TILE);
    if (d < engageR || hunt) {
      const hasLine = isLob || losClear(b.x, b.y, T.x, T.y);
      if (hasLine && d < R + 2 * TILE) {
        const ideal = idealDist(b);
        const a = Math.atan2(T.y - b.y, T.x - b.x);
        let fwd = 0;
        if (d > ideal + TILE * 0.6) fwd = 1; else if (d < ideal - TILE * 0.8) fwd = -1;
        mx = Math.cos(a) * fwd + Math.cos(a + Math.PI / 2) * ai.strafeDir * 0.85;
        my = Math.sin(a) * fwd + Math.sin(a + Math.PI / 2) * ai.strafeDir * 0.85;
        direct = true;
      } else dest = { x: T.x, y: T.y };
    } else dest = ai.goal;
  } else dest = ai.goal;

  if (!direct && dest) {
    if (dest.box) {
      const d = dist(b.x, b.y, dest.x, dest.y);
      const canShoot = d < R * 0.9 && (isLob || losClear(b.x, b.y, dest.x, dest.y, dest.box.i));
      if (!canShoot) [mx, my] = followPath(b, dest);
    } else [mx, my] = followPath(b, dest);
  }
  const l = Math.hypot(mx, my);
  if (l > 1) { mx /= l; my /= l; }

  ai.checkT -= dt;
  if (ai.checkT <= 0) {
    ai.checkT = 0.5;
    if (l > 0.1 && dist(b.x, b.y, ai.lastX, ai.lastY) < 5) { ai.stuckT = 0.35; ai.stuckDir = rand(0, TAU); ai.pathT = 0; ai.strafeDir = -ai.strafeDir; }
    ai.lastX = b.x; ai.lastY = b.y;
  }
  if (ai.stuckT > 0) { ai.stuckT -= dt; mx = Math.cos(ai.stuckDir); my = Math.sin(ai.stuckDir); }

  botShoot(b, T, D, dest);
  botSuper(b, T, D);
  return [mx, my];
}

function botShoot(b, T, D, dest) {
  const ai = b.ai;
  if (!b.alive || G.time < b.atkReady || b.burst.length) return;
  const A = b.def.attack, R = b.def.range * TILE, isLob = A.type === 'lob';
  if (G.ball && G.ball.owner === b) {
    const g = enemyGoalPoint(b.team);
    const d = dist(b.x, b.y, g.x, g.y);
    const threat = T && dist(b.x, b.y, T.x, T.y) < 2 * TILE;
    if ((d < 7 * TILE && losClear(b.x, b.y, g.x, g.y)) || (threat && d < 11 * TILE && Math.random() < 0.05)) {
      tryAttack(b, Math.atan2(g.y - b.y, g.x - b.x) + rand(-D.err, D.err) * 0.6, d);
    }
    return;
  }
  if (b.ammo < 1 || G.time < ai.nextShot) return;
  if (T) {
    const d = dist(b.x, b.y, T.x, T.y);
    if (d <= R + T.r * 0.5 && (isLob || losClear(b.x, b.y, T.x, T.y))) {
      const aim = predictAim(b, T, projSpeed(b), isLob ? A.flight : null, D.lead);
      tryAttack(b, aim.ang + rand(-D.err, D.err), aim.d);
      ai.nextShot = G.time + rand(D.react * 0.8, D.react * 1.6) + (b.ammo < 1.2 ? D.react : 0);
      return;
    }
  }
  if (dest && dest.box && !T) {
    const d = dist(b.x, b.y, dest.x, dest.y);
    if (d < R * 0.95 && (isLob || losClear(b.x, b.y, dest.x, dest.y, dest.box.i))) {
      tryAttack(b, Math.atan2(dest.y - b.y, dest.x - b.x), d);
      ai.nextShot = G.time + rand(0.3, 0.6);
    }
  }
}

function botSuper(b, T, D) {
  const ai = b.ai;
  if (b.superCharge < 1 || G.time < ai.superT || b.leaping || b.dashing) return;
  const S = b.def.super;
  let use = false, ang = b.aimAng, d = null;
  const dT = T ? dist(b.x, b.y, T.x, T.y) : 1e9;
  const los = T ? losClear(b.x, b.y, T.x, T.y) : false;
  const hpR = b.hp / b.maxHp;
  switch (S.type) {
    case 'fan': if (T && dT < S.range * TILE * 0.85 && los) { use = true; ({ ang, d } = predictAim(b, T, S.speed * TILE, null, D.lead)); } break;
    case 'rail': if (T && dT < S.range * TILE) { use = true; ({ ang, d } = predictAim(b, T, S.speed * TILE, null, D.lead)); } break;
    case 'megabomb': if (T && dT < S.range * TILE) { use = true; ({ ang, d } = predictAim(b, T, 1, S.flight, D.lead)); } break;
    case 'charge': if (T && dT < S.dist * TILE * 0.85 && los) { use = true; ang = Math.atan2(T.y - b.y, T.x - b.x); } break;
    case 'leap': if (T && dT < S.range * TILE && (hpR > 0.4 || T.hp / T.maxHp < 0.4)) { use = true; ({ ang, d } = predictAim(b, T, 1, S.dur, D.lead)); } break;
    case 'healzone': {
      let tgt = null, low = 0.6;
      for (const a of G.brawlers) if (a.alive && a.team === b.team && dist(b.x, b.y, a.x, a.y) < S.range * TILE && a.hp / a.maxHp < low) { low = a.hp / a.maxHp; tgt = a; }
      if (tgt) { use = true; ang = Math.atan2(tgt.y - b.y, tgt.x - b.x); d = dist(b.x, b.y, tgt.x, tgt.y); }
      else if (T && dT < S.range * TILE && Math.random() < 0.3) { use = true; ang = Math.atan2(T.y - b.y, T.x - b.x); d = dT; }
      break;
    }
    case 'shield': if (T && ((hpR < 0.6 && dT < 5 * TILE) || dT < 2.2 * TILE)) { use = true; } break;
    case 'turret': if (T && dT < 8 * TILE) { use = true; ang = Math.atan2(T.y - b.y, T.x - b.x); d = Math.min(S.range * TILE, dT * 0.5); } break;
  }
  if (!use) return;
  if (Math.random() > D.superChance) { ai.superT = G.time + 0.8; return; }
  trySuper(b, ang + rand(-D.err, D.err) * 0.5, d);
  ai.superT = G.time + 0.5;
}

// =========================================================
// プレイヤー操作
// =========================================================
function aimRange(b, isSuper) { return aimSpec(b, isSuper).range; }
function autoAim(b, isSuper) {
  const range = aimRange(b, isSuper);
  if (!isSuper && G.ball && G.ball.owner === b) {
    const g = enemyGoalPoint(b.team); return { ang: Math.atan2(g.y - b.y, g.x - b.x), d: dist(b.x, b.y, g.x, g.y) };
  }
  const S = b.def.super;
  if (isSuper && S.type === 'healzone') {
    let tgt = null, low = 0.85;
    for (const a of G.brawlers) if (a.alive && a.team === b.team && a !== b && dist(b.x, b.y, a.x, a.y) < range && a.hp / a.maxHp < low) { low = a.hp / a.maxHp; tgt = a; }
    if (tgt) return { ang: Math.atan2(tgt.y - b.y, tgt.x - b.x), d: dist(b.x, b.y, tgt.x, tgt.y) };
  }
  let best = null, bd = range + 1.5 * TILE;
  for (const e of G.brawlers) {
    if (!e.alive || e.team === b.team || e.leaping || !visibleTo(b.team, e)) continue;
    const d = dist(b.x, b.y, e.x, e.y); if (d < bd) { bd = d; best = e; }
  }
  for (const tu of G.turrets) if (tu.team !== b.team && tu.hp > 0) { const d = dist(b.x, b.y, tu.x, tu.y); if (d < bd) { bd = d; best = tu; } }
  if (best) {
    const A = b.def.attack;
    const isLob = isSuper ? ['megabomb', 'leap', 'healzone', 'turret'].includes(S.type) : A.type === 'lob';
    const sp = isSuper ? (S.speed ? S.speed * TILE : 1e6) : (projSpeed(b) || 1e6);
    return predictAim(b, best, sp, isLob ? (isSuper ? (S.flight || S.dur || 0.5) : A.flight) : null, 0.5);
  }
  if (G.mode === 'survival') {
    const bx = nearestBox(b, range);
    if (bx) return { ang: Math.atan2(bx.y - b.y, bx.x - b.x), d: dist(b.x, b.y, bx.x, bx.y) };
  }
  return { ang: b.aimAng, d: range };
}

function playerControl(b) {
  let mx = 0, my = 0;
  if (Input.touchMode) {
    const s = Input.stick;
    if (s.id !== null) {
      const dx = s.x - s.ox, dy = s.y - s.oy, l = Math.hypot(dx, dy);
      if (l > 6) { const m = Math.min(1, l / Input.layout.stickR); mx = dx / l * m; my = dy / l * m; }
    }
    const aim = Input.atk.id !== null && Input.atk.drag ? Input.atk : (Input.sup.id !== null && Input.sup.drag ? Input.sup : null);
    if (aim) { b.aimAng = aim.ang; b.face = Math.cos(aim.ang) >= 0 ? 1 : -1; }
  } else {
    const k = Input.keys;
    if (k.KeyA || k.ArrowLeft) mx -= 1;
    if (k.KeyD || k.ArrowRight) mx += 1;
    if (k.KeyW || k.ArrowUp) my -= 1;
    if (k.KeyS || k.ArrowDown) my += 1;
    const l = Math.hypot(mx, my); if (l > 0) { mx /= l; my /= l; }
    const w = screenToWorld(Input.mx, Input.my);
    b.aimAng = Math.atan2(w.y - b.y, w.x - b.x);
    b.aimDist = dist(b.x, b.y, w.x, w.y);
    if (!b.leaping) b.face = Math.cos(b.aimAng) >= 0 ? 1 : -1;
    if (Input.mdown) tryAttack(b, b.aimAng, b.aimDist);
  }
  while (Input.queue.length) {
    const q = Input.queue.shift(); const isSup = q.kind === 'sup';
    let ang, d;
    if (q.auto) { const a = autoAim(b, isSup); ang = a.ang; d = a.d; }
    else if (q.mouse) { ang = b.aimAng; d = b.aimDist; }
    else { ang = q.ang; d = q.frac * aimRange(b, isSup); }
    if (isSup) trySuper(b, ang, d); else tryAttack(b, ang, d);
  }
  return [mx, my];
}

// =========================================================
// 入力（キーボード・マウス・タッチ）
// =========================================================
const Input = {
  keys: {}, mx: 0, my: 0, mdown: false, rdown: false, touchMode: false, lastTouch: 0,
  stick: { id: null, ox: 0, oy: 0, x: 0, y: 0 },
  atk: { id: null, ox: 0, oy: 0, x: 0, y: 0, drag: false, ang: 0, frac: 1 },
  sup: { id: null, ox: 0, oy: 0, x: 0, y: 0, drag: false, ang: 0, frac: 1 },
  queue: [], layout: null,
  reset() {
    this.mdown = false; this.rdown = false; this.queue.length = 0;
    this.stick.id = null; this.atk.id = null; this.sup.id = null; this.atk.drag = false; this.sup.drag = false;
  },
};
function computeLayout() {
  const W = window.innerWidth, H = window.innerHeight;
  const u = clamp(Math.min(W, H) / 400, 0.75, 1.35);
  const padR = 22 * u, padB = 26 * u;
  const atkR = 48 * u, supR = 36 * u;
  const atkX = W - padR - atkR - 10 * u, atkY = H - padB - atkR - 10 * u;
  Input.layout = {
    u, atkX, atkY, atkR, supR,
    supX: atkX - atkR - supR - 22 * u, supY: atkY + atkR - supR + 4 * u,
    stickX: padR + 70 * u, stickY: H - padB - 70 * u, stickR: 52 * u, dragMax: 70 * u,
  };
}
function isInGameInput() { return G.running && !G.demo && !G.paused && (G.state === 'play' || G.state === 'countdown' || G.state === 'goal'); }

function onTouchStart(t) {
  const L = Input.layout; const x = t.clientX, y = t.clientY;
  if (Input.sup.id === null && dist(x, y, L.supX, L.supY) < L.supR * 1.35) {
    Object.assign(Input.sup, { id: t.identifier, ox: L.supX, oy: L.supY, x, y, drag: false });
  } else if (Input.atk.id === null && dist(x, y, L.atkX, L.atkY) < L.atkR * 1.4) {
    Object.assign(Input.atk, { id: t.identifier, ox: L.atkX, oy: L.atkY, x, y, drag: false });
  } else if (x < window.innerWidth * 0.5 && Input.stick.id === null) {
    Object.assign(Input.stick, { id: t.identifier, ox: x, oy: y, x, y });
  } else if (x >= window.innerWidth * 0.5 && Input.atk.id === null) {
    Object.assign(Input.atk, { id: t.identifier, ox: x, oy: y, x, y, drag: false });
  }
}
function updAimTouch(s, t) {
  s.x = t.clientX; s.y = t.clientY;
  const dx = s.x - s.ox, dy = s.y - s.oy, l = Math.hypot(dx, dy);
  if (l > 14) { s.drag = true; s.ang = Math.atan2(dy, dx); s.frac = clamp(l / Input.layout.dragMax, 0.12, 1); }
  else if (l < 8) s.drag = false;
}
function onTouchMove(t) {
  if (t.identifier === Input.stick.id) {
    const s = Input.stick; s.x = t.clientX; s.y = t.clientY;
    const R = Input.layout.stickR * 1.3; const dx = s.x - s.ox, dy = s.y - s.oy, l = Math.hypot(dx, dy);
    if (l > R) { s.ox += dx / l * (l - R); s.oy += dy / l * (l - R); }
  } else if (t.identifier === Input.atk.id) updAimTouch(Input.atk, t);
  else if (t.identifier === Input.sup.id) updAimTouch(Input.sup, t);
}
function onTouchEnd(t, cancel) {
  if (t.identifier === Input.stick.id) Input.stick.id = null;
  else if (t.identifier === Input.atk.id) {
    if (!cancel && G.state === 'play') Input.queue.push(Input.atk.drag ? { kind: 'atk', ang: Input.atk.ang, frac: Input.atk.frac } : { kind: 'atk', auto: true });
    Input.atk.id = null; Input.atk.drag = false;
  } else if (t.identifier === Input.sup.id) {
    if (!cancel && G.state === 'play' && G.player && G.player.superCharge >= 1) Input.queue.push(Input.sup.drag ? { kind: 'sup', ang: Input.sup.ang, frac: Input.sup.frac } : { kind: 'sup', auto: true });
    Input.sup.id = null; Input.sup.drag = false;
  }
}
function setupInput(cv) {
  computeLayout();
  const tOpts = { passive: false };
  cv.addEventListener('touchstart', (e) => {
    e.preventDefault(); Sound.init(); Input.lastTouch = performance.now();
    if (!isInGameInput()) return;
    Input.touchMode = true; Input.mdown = false;
    for (const t of e.changedTouches) onTouchStart(t);
  }, tOpts);
  cv.addEventListener('touchmove', (e) => { e.preventDefault(); Input.lastTouch = performance.now(); for (const t of e.changedTouches) onTouchMove(t); }, tOpts);
  cv.addEventListener('touchend', (e) => { e.preventDefault(); Input.lastTouch = performance.now(); for (const t of e.changedTouches) onTouchEnd(t, false); }, tOpts);
  cv.addEventListener('touchcancel', (e) => { for (const t of e.changedTouches) onTouchEnd(t, true); }, tOpts);
  const fromTouch = () => performance.now() - Input.lastTouch < 900;
  window.addEventListener('mousemove', (e) => {
    if (fromTouch()) return;
    Input.mx = e.clientX; Input.my = e.clientY;
    if (Input.touchMode && (Math.abs(e.movementX) + Math.abs(e.movementY) > 2)) Input.touchMode = false;
  });
  cv.addEventListener('mousedown', (e) => {
    if (fromTouch()) return;
    Sound.init(); Input.touchMode = false; Input.mx = e.clientX; Input.my = e.clientY;
    if (!isInGameInput()) return;
    if (e.button === 0) Input.mdown = true;
    if (e.button === 2) Input.rdown = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) Input.mdown = false;
    if (e.button === 2 && Input.rdown) {
      Input.rdown = false;
      if (isInGameInput() && G.state === 'play') Input.queue.push({ kind: 'sup', mouse: true });
    }
  });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && G.running && !G.demo) e.preventDefault();
    Input.keys[e.code] = true;
    if (e.repeat) return;
    if (!G.running || G.demo) return;
    if (e.code === 'Escape' || e.code === 'KeyP') { togglePause(); return; }
    if (!isInGameInput()) return;
    Input.touchMode = false;
    if ((e.code === 'KeyE' || e.code === 'Space') && G.state === 'play') Input.queue.push({ kind: 'sup', mouse: true });
    if (e.code === 'KeyQ' && G.state === 'play') Input.queue.push({ kind: 'atk', auto: true });
  });
  window.addEventListener('keyup', (e) => { Input.keys[e.code] = false; });
  window.addEventListener('blur', () => { Input.keys = {}; Input.mdown = false; Input.rdown = false; });
}

// =========================================================
// パーティクル・文字・画面揺れ
// =========================================================
function addPart(x, y, vx, vy, life, color, size, grav) {
  if (G.parts.length > 700) G.parts.shift();
  G.parts.push({ x, y, vx, vy, life, max: life, color, size, grav });
}
function addText(x, y, txt, color, big, scale) {
  if (G.texts.length > 80) G.texts.shift();
  G.texts.push({ x, y, txt: String(txt), color, big: !!big, scale: scale || 1, life: 0.85, max: 0.85 });
}
function addShake(v) { if (save.shake && !G.demo) G.cam.shake = Math.min(12, Math.max(G.cam.shake, v)); }
function updateParticles(dt) {
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i]; p.life -= dt;
    if (p.life <= 0) { G.parts.splice(i, 1); continue; }
    p.vy += p.grav * dt; const f = Math.exp(-2.2 * dt); p.vx *= f; if (!p.grav) p.vy *= f;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.life -= dt; t.y -= 34 * dt; if (t.life <= 0) G.texts.splice(i, 1); }
}

// =========================================================
// キャンバス・カメラ
// =========================================================
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
let DPR = 1, SW = 0, SH = 0;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  SW = window.innerWidth; SH = window.innerHeight;
  cv.width = Math.round(SW * DPR); cv.height = Math.round(SH * DPR);
  cv.style.width = SW + 'px'; cv.style.height = SH + 'px';
  computeLayout();
}
function computeZoom() {
  const z = Math.min(Math.sqrt(SW * SH) / (15 * TILE), SW / (11 * TILE), SH / (10 * TILE));
  return clamp(z, 0.7, 4);
}
function screenToWorld(sx, sy) {
  return { x: (sx - SW / 2) / G.zoom + G.cam.x, y: (sy - SH / 2) / G.zoom + G.cam.y };
}
function worldToScreen(wx, wy) {
  return { x: (wx - G.cam.x) * G.zoom + SW / 2, y: (wy - G.cam.y) * G.zoom + SH / 2 };
}
function updateCamera(dt) {
  G.zoom = computeZoom();
  G.viewW = SW / G.zoom; G.viewH = SH / G.zoom;
  let tx, ty;
  const p = G.player;
  if (p) {
    if (p.alive) { tx = p.x; ty = p.y; } else { tx = p.deathX; ty = p.deathY; }
  } else {
    if (!G.focus || !G.focus.alive || G.anim > G.focusT) {
      const alive = G.brawlers.filter((b) => b.alive);
      G.focus = alive.length ? pick(alive) : null; G.focusT = G.anim + 9;
    }
    tx = G.focus ? G.focus.x : G.mw * TILE / 2; ty = G.focus ? G.focus.y : G.mh * TILE / 2;
  }
  const mapW = G.mw * TILE, mapH = G.mh * TILE;
  tx = G.viewW >= mapW + 2 * TILE ? mapW / 2 : clamp(tx, G.viewW / 2 - TILE, mapW - G.viewW / 2 + TILE);
  const topPad = G.player ? 56 / G.zoom : 0, botPad = G.player && Input.touchMode ? 150 / G.zoom : 0;
  ty = G.viewH >= mapH + 2 * TILE ? mapH / 2 : clamp(ty, G.viewH / 2 - TILE - topPad, mapH - G.viewH / 2 + TILE + botPad);
  const k = 1 - Math.pow(G.player ? 0.0008 : 0.08, dt);
  G.cam.x = lerp(G.cam.x, tx, k); G.cam.y = lerp(G.cam.y, ty, k);
  G.cam.shake = Math.max(0, G.cam.shake - dt * 28);
}

// =========================================================
// タイルスプライト（テーマごとにキャッシュ）
// =========================================================
const TILE_SPR = {};
function pixelCircle(x, cx, cy, r, color) {
  x.fillStyle = color;
  for (let j = Math.floor(cy - r); j <= Math.ceil(cy + r); j++) for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++) {
    if ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= r * r) x.fillRect(i, j, 1, 1);
  }
}
function makeBlock(kind, th) {
  const c = mkCanvas(16, 24), x = c.getContext('2d');
  let top, topHi, front, dark, line;
  if (kind === 'wall') { top = th.wallTop; topHi = th.wallTopHi; front = th.wallFront; dark = th.wallDark; line = th.line; }
  else if (kind === 'steel') { top = '#5b6680'; topHi = '#7d89a6'; front = '#3d4660'; dark = '#2b3247'; line = '#161a28'; }
  else { top = '#dca45c'; topHi = '#f0c17f'; front = '#ad7535'; dark = '#83561f'; line = '#3e2708'; }
  x.fillStyle = line; x.fillRect(0, 0, 16, 24);
  x.fillStyle = top; x.fillRect(1, 1, 14, 9);
  x.fillStyle = topHi; x.fillRect(1, 1, 14, 2);
  x.fillStyle = front; x.fillRect(1, 11, 14, 12);
  x.fillStyle = dark; x.fillRect(1, 20, 14, 3);
  if (kind === 'wall') {
    x.fillStyle = dark;
    x.fillRect(1, 15, 14, 1); x.fillRect(5, 11, 1, 4); x.fillRect(11, 11, 1, 4); x.fillRect(3, 16, 1, 4); x.fillRect(9, 16, 1, 4);
    x.fillStyle = topHi; x.fillRect(3, 5, 2, 1); x.fillRect(10, 7, 2, 1);
    x.fillStyle = front; x.fillRect(6, 4, 1, 1); x.fillRect(12, 4, 1, 1);
  } else if (kind === 'steel') {
    x.fillStyle = topHi; x.fillRect(2, 4, 1, 1); x.fillRect(13, 4, 1, 1); x.fillRect(2, 8, 1, 1); x.fillRect(13, 8, 1, 1);
    x.fillStyle = '#ffd23f'; for (let i = 0; i < 16; i += 4) { x.fillRect(1 + i, 12, 2, 2); x.fillRect(3 + i, 14, 2, 2); }
    x.fillStyle = dark; x.fillRect(1, 17, 14, 1);
  } else {
    x.fillStyle = dark; x.fillRect(1, 5, 14, 1); x.fillRect(5, 11, 1, 9); x.fillRect(10, 11, 1, 9);
    x.fillStyle = '#1fae4f'; x.fillRect(6, 2, 4, 3);
    x.fillStyle = '#5dff8a'; x.fillRect(6, 2, 3, 2);
  }
  return c;
}
function makeBush(th, seed) {
  const c = mkCanvas(16, 20), x = c.getContext('2d');
  const blobs = [[4, 11, 5], [11, 10, 5.2], [8, 6, 5], [4, 15, 4], [12, 15, 4]];
  for (const [bx, by, r] of blobs) pixelCircle(x, bx, by, r + 1, th.bushD);
  for (const [bx, by, r] of blobs) pixelCircle(x, bx - 0.5, by - 0.8, r - 0.3, th.bush);
  x.fillStyle = th.bushHi;
  for (let k = 0; k < 14; k++) {
    const h = hash2(seed * 31 + k, k * 17 + seed);
    const px = 2 + Math.floor(h * 12), py = 3 + Math.floor(hash2(k, seed + 5) * 12);
    x.fillRect(px, py, 1, 1);
  }
  x.fillStyle = th.bushD; x.fillRect(3, 18, 10, 1);
  return c;
}
function tileSprites() {
  const key = G.theme.name;
  if (!TILE_SPR[key]) {
    TILE_SPR[key] = { wall: makeBlock('wall', G.theme), steel: makeBlock('steel', G.theme), box: makeBlock('box', G.theme), bush: [makeBush(G.theme, 1), makeBush(G.theme, 2), makeBush(G.theme, 3)] };
  }
  return TILE_SPR[key];
}

// =========================================================
// 床キャッシュ
// =========================================================
function buildFloorCache() {
  G.floorCache = mkCanvas(G.mw * 16, G.mh * 16);
  G.pads = {};
  for (const t of [0, 1, 'S']) for (const s of (G.spawns[t] || [])) G.pads[s.y * G.mw + s.x] = t;
  const fx = G.floorCache.getContext('2d');
  for (let ty = 0; ty < G.mh; ty++) for (let tx = 0; tx < G.mw; tx++) drawFloorTile(fx, tx, ty);
  G.floorDirty = [];
}
function markFloor(tx, ty) { G.floorDirty.push([tx, ty], [tx, ty + 1], [tx, ty - 1], [tx - 1, ty], [tx + 1, ty]); }
function drawFloorTile(fx, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= G.mw || ty >= G.mh) return;
  const th = G.theme; const t = G.grid[ty * G.mw + tx]; const x0 = tx * 16, y0 = ty * 16; const h = hash2(tx, ty);
  let base = ((tx + ty) & 1) ? th.floor1 : th.floor2;
  if (G.mode === 'ball') base = (Math.floor(ty / 2) & 1) ? th.floor1 : th.floor2;
  fx.fillStyle = base; fx.fillRect(x0, y0, 16, 16);
  for (let k = 0; k < 5; k++) {
    const a = hash2(tx * 7 + k, ty * 13 + k * 3), b2 = hash2(tx * 3 + k * 11, ty * 5 + k);
    fx.fillStyle = a < 0.5 ? th.speck : th.speck2;
    fx.fillRect(x0 + Math.floor(a * 15), y0 + Math.floor(b2 * 15), 1, 1);
  }
  if (t === T_FLOOR && h > 0.9 && G.mode !== 'ball') {
    fx.fillStyle = th.flower; fx.fillRect(x0 + 6, y0 + 7, 3, 1); fx.fillRect(x0 + 7, y0 + 6, 1, 3);
    fx.fillStyle = th.speck2; fx.fillRect(x0 + 7, y0 + 7, 1, 1);
  }
  if (t === T_WATER) {
    fx.fillStyle = th.water; fx.fillRect(x0, y0, 16, 16);
    fx.fillStyle = th.waterD; fx.fillRect(x0, y0 + 11, 16, 5);
    fx.fillStyle = th.waterHi;
    if (tileAt(tx, ty - 1) !== T_WATER) fx.fillRect(x0, y0, 16, 2);
    if (tileAt(tx - 1, ty) !== T_WATER) fx.fillRect(x0, y0, 1, 16);
    if (tileAt(tx + 1, ty) !== T_WATER) fx.fillRect(x0 + 15, y0, 1, 16);
    fx.fillStyle = th.waterD; fx.fillRect(x0 + 3, y0 + 6, 4, 1); fx.fillRect(x0 + 9, y0 + 9, 4, 1);
  }
  if (t === T_GOAL) {
    fx.fillStyle = 'rgba(20,20,40,0.35)'; fx.fillRect(x0, y0, 16, 16);
    fx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 16; i += 3) { fx.fillRect(x0 + i, y0, 1, 16); fx.fillRect(x0, y0 + i, 16, 1); }
  }
  const pad = G.pads[ty * G.mw + tx];
  if (pad !== undefined) {
    const c = pad === 0 ? COL.blue : pad === 1 ? COL.red : '#ffd23f';
    fx.fillStyle = c; fx.globalAlpha = 0.35; fx.fillRect(x0 + 1, y0 + 1, 14, 14); fx.globalAlpha = 1;
    fx.fillRect(x0 + 1, y0 + 1, 14, 1); fx.fillRect(x0 + 1, y0 + 14, 14, 1); fx.fillRect(x0 + 1, y0 + 1, 1, 14); fx.fillRect(x0 + 14, y0 + 1, 1, 14);
  }
  if (G.mine && tx === G.mine.x && ty === G.mine.y) {
    fx.fillStyle = '#1b1030'; fx.fillRect(x0 + 2, y0 + 3, 12, 11); fx.fillRect(x0 + 3, y0 + 2, 10, 13);
    fx.fillStyle = '#3a2458'; fx.fillRect(x0 + 3, y0 + 3, 10, 3);
    fx.fillStyle = '#c77dff'; fx.fillRect(x0 + 5, y0 + 8, 2, 4); fx.fillRect(x0 + 9, y0 + 7, 2, 5);
    fx.fillStyle = '#f0dcff'; fx.fillRect(x0 + 5, y0 + 8, 1, 1); fx.fillRect(x0 + 9, y0 + 7, 1, 1);
  }
  if (G.mode === 'ball' && ty === (G.mh - 1) / 2) { fx.fillStyle = 'rgba(255,255,255,0.55)'; fx.fillRect(x0, y0 + 7, 16, 2); }
  if (G.mode === 'ball' && (ty === 2 || ty === G.mh - 3) && tx >= 6 && tx <= G.mw - 7) { fx.fillStyle = 'rgba(255,255,255,0.4)'; fx.fillRect(x0, ty === 2 ? y0 + 15 : y0, 16, 1); }
  const above = tileAt(tx, ty - 1);
  if (above === T_WALL || above === T_STEEL || above === T_BOX) { fx.fillStyle = 'rgba(0,0,0,0.22)'; fx.fillRect(x0, y0, 16, 5); }
}

// =========================================================
// 描画
// =========================================================
function teamColor(b) {
  if (G.player) {
    if (b === G.player) return COL.me;
    return b.team === G.player.team ? COL.blue : COL.red;
  }
  if (G.mode === 'survival') return ['#3aa0ff', '#ff4a5a', '#ffd23f', '#5ee06a', '#c77dff', '#ff9f1c', '#7fffd4', '#ff7ab6'][b.team % 8];
  return b.team === 0 ? COL.blue : COL.red;
}
function ellipse(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); }

function drawWeapon(b, lift) {
  const img = WEAPON_SPR[b.def.id];
  const recent = b.isPlayer || G.time - b.lastAtk < 1.2;
  const a = recent ? b.aimAng : (b.face > 0 ? 0.35 : Math.PI - 0.35);
  const recoil = G.time - b.lastAtk < 0.08 ? -3 : 0;
  const hx = b.x + Math.cos(a) * (5 + recoil), hy = b.y - 5 - lift + Math.sin(a) * 3;
  ctx.save();
  ctx.translate(Math.round(hx), Math.round(hy));
  if (b.def.weapon === 'bomb') {
    ctx.drawImage(img, b.face > 0 ? 0 : -img.width * 2, -img.height, img.width * 2, img.height * 2);
  } else {
    ctx.rotate(a);
    if (Math.cos(a) < 0) ctx.scale(1, -1);
    ctx.drawImage(img, -4, -img.height, img.width * 2, img.height * 2);
  }
  ctx.restore();
}
function drawBrawler(b, alpha) {
  const spr = SPR[b.def.id];
  const frame = b.moving ? (Math.floor(b.walkT * 8) % 2) : 0;
  let lift = 0;
  if (b.leaping) lift = Math.sin(clamp(b.leaping.t / b.leaping.dur, 0, 1) * Math.PI) * 30;
  const blink = b.invulnT > G.time && Math.floor(G.anim * 12) % 2 === 0;
  ctx.globalAlpha = alpha * 0.35; ctx.fillStyle = '#000'; ellipse(b.x, b.y + 10, 11, 4.5); ctx.fill();
  ctx.globalAlpha = alpha; ctx.strokeStyle = teamColor(b); ctx.lineWidth = 2; ellipse(b.x, b.y + 10, 12, 5); ctx.stroke();
  if (b.superCharge >= 1) {
    ctx.globalAlpha = alpha * (0.5 + 0.3 * Math.sin(G.anim * 8)); ctx.strokeStyle = COL.gold; ctx.lineWidth = 2;
    ellipse(b.x, b.y + 10, 15, 6.5); ctx.stroke();
  }
  ctx.globalAlpha = alpha * (blink ? 0.45 : 1);
  const a = b.isPlayer || G.time - b.lastAtk < 1.2 ? b.aimAng : (b.face > 0 ? 0 : Math.PI);
  const behind = Math.sin(a) < -0.35 && b.def.weapon !== 'bomb';
  if (behind) drawWeapon(b, lift);
  const bob = b.moving ? 0 : (Math.sin(G.anim * 3 + b.uid) > 0.6 ? -2 : 0);
  const dx = Math.round(b.x - 16), dy = Math.round(b.y + 13 - 32 - lift + bob);
  ctx.drawImage(b.face > 0 ? spr.r[frame] : spr.l[frame], dx, dy, 32, 32);
  if (b.hitFlash > 0) { ctx.globalAlpha = alpha * 0.85; ctx.drawImage(b.face > 0 ? spr.wr[frame] : spr.wl[frame], dx, dy, 32, 32); ctx.globalAlpha = alpha; }
  if (!behind) drawWeapon(b, lift);
  if (b.shieldT > G.time) {
    ctx.globalAlpha = alpha * (0.35 + 0.15 * Math.sin(G.anim * 10));
    ctx.strokeStyle = '#9fd8ff'; ctx.fillStyle = 'rgba(159,216,255,0.18)'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let i = 0; i <= 6; i++) { const aa = i / 6 * TAU + G.anim; const px = b.x + Math.cos(aa) * 20, py = b.y - 6 + Math.sin(aa) * 20; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.fill(); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawTurret(t) {
  ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ellipse(t.x, t.y + 8, 12, 5); ctx.fill(); ctx.globalAlpha = 1;
  const c = t.team === viewTeam() || viewTeam() < 0 && t.team === 0 ? COL.blue : COL.red;
  ctx.strokeStyle = G.player && t.team === G.player.team ? COL.blue : (G.player ? COL.red : c); ctx.lineWidth = 2; ellipse(t.x, t.y + 8, 13, 5.5); ctx.stroke();
  ctx.fillStyle = COL.ink; ctx.fillRect(t.x - 11, t.y - 2, 22, 10);
  ctx.fillStyle = t.flash > 0 ? '#ffffff' : '#4a5068'; ctx.fillRect(t.x - 10, t.y - 1, 20, 8);
  ctx.fillStyle = '#2b2f40'; ctx.fillRect(t.x - 10, t.y + 5, 20, 2);
  ctx.save(); ctx.translate(t.x, t.y - 6); ctx.rotate(t.ang);
  ctx.fillStyle = COL.ink; ctx.fillRect(-2, -4, 18, 8);
  ctx.fillStyle = '#9aa3bb'; ctx.fillRect(0, -2, 15, 4);
  ctx.restore();
  ctx.fillStyle = COL.ink; ctx.fillRect(t.x - 8, t.y - 14, 16, 14);
  ctx.fillStyle = t.flash > 0 ? '#ffffff' : '#7fffd4'; ctx.fillRect(t.x - 6, t.y - 12, 12, 10);
  ctx.fillStyle = '#e8fff8'; ctx.fillRect(t.x - 4, t.y - 10, 3, 3);
}
function drawBall(B) {
  ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ellipse(B.x, B.y + 7, 8, 3.5); ctx.fill(); ctx.globalAlpha = 1;
  const bounce = B.owner ? 0 : Math.abs(Math.sin(B.spin * 1.5)) * (Math.hypot(B.vx, B.vy) > 60 ? 4 : 0);
  ctx.save(); ctx.translate(Math.round(B.x), Math.round(B.y - 4 - bounce));
  ctx.rotate(Math.floor(B.spin * 2) * Math.PI / 2);
  ctx.drawImage(ITEM_SPR.ball, -8, -8, 16, 16);
  ctx.restore();
}
function drawGuide(b, spec, ang, frac, color) {
  const range = spec.range;
  ctx.save(); ctx.globalAlpha = 0.26; ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 2;
  if (spec.kind === 'line') {
    ctx.translate(b.x, b.y); ctx.rotate(ang);
    ctx.fillRect(b.r, -spec.width / 2, range - b.r, spec.width);
    ctx.globalAlpha = 0.6; ctx.strokeRect(b.r, -spec.width / 2, range - b.r, spec.width);
  } else if (spec.kind === 'cone') {
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.arc(b.x, b.y, range, ang - spec.arc / 2, ang + spec.arc / 2); ctx.closePath();
    ctx.fill(); ctx.globalAlpha = 0.6; ctx.stroke();
  } else if (spec.kind === 'lob') {
    const d = clamp(frac * range, TILE * 1.2, range);
    const tx = b.x + Math.cos(ang) * d, ty = b.y + Math.sin(ang) * d;
    ctx.globalAlpha = 0.7; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(b.x, b.y - 8); ctx.quadraticCurveTo((b.x + tx) / 2, (b.y + ty) / 2 - d * 0.35, tx, ty); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 0.28;
    ctx.beginPath(); ctx.arc(tx, ty, spec.radius, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.7; ctx.stroke();
    ctx.globalAlpha = 0.12; ctx.beginPath(); ctx.arc(b.x, b.y, range, 0, TAU); ctx.stroke();
  } else if (spec.kind === 'self') {
    ctx.beginPath(); ctx.arc(b.x, b.y, spec.radius, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.6; ctx.stroke();
  }
  ctx.restore();
}
function drawProjectile(p) {
  const a = Math.atan2(p.vy, p.vx);
  switch (p.kind) {
    case 'bullet': case 'tbullet':
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
      ctx.fillStyle = COL.ink; ctx.fillRect(-7, -p.r / 2 - 1, 12, p.r + 2);
      ctx.fillStyle = p.color; ctx.fillRect(-6, -p.r / 2, 10, p.r);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, -1, 4, 2);
      ctx.restore(); break;
    case 'pellet':
      ctx.fillStyle = COL.ink; ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
      ctx.fillStyle = p.color; ctx.fillRect(p.x - 3, p.y - 3, 6, 6); break;
    case 'snipe':
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
      ctx.globalAlpha = 0.35; ctx.fillStyle = p.color; ctx.fillRect(-26, -2, 26, 4); ctx.globalAlpha = 1;
      ctx.fillStyle = COL.ink; ctx.fillRect(-9, -4, 16, 8);
      ctx.fillStyle = p.color; ctx.fillRect(-8, -3, 14, 6); ctx.fillStyle = '#fff'; ctx.fillRect(0, -1, 5, 2);
      ctx.restore(); break;
    case 'rail':
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.45; ctx.fillStyle = p.color; ctx.fillRect(-60, -p.r, 70, p.r * 2);
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffd0ea'; ctx.fillRect(-40, -p.r * 0.5, 50, p.r);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-20, -2, 30, 4);
      ctx.restore(); break;
    case 'orb': {
      const pulse = 1 + Math.sin(p.age * 20) * 0.15;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.6 * pulse, 0, TAU); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
      ctx.fillStyle = p.color; ctx.fillRect(p.x - 6, p.y - 2, 12, 4); ctx.fillRect(p.x - 2, p.y - 6, 4, 12);
      break;
    }
    case 'bolt': {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.8, 0, TAU); ctx.fill(); ctx.restore();
      ctx.fillStyle = COL.ink; ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
      ctx.fillStyle = p.color; ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
      ctx.fillStyle = '#fff'; const j = Math.floor(p.age * 30) % 2; ctx.fillRect(p.x - 2 + j * 2, p.y - 2, 2, 4);
      break;
    }
    case 'flame': {
      const k = clamp(p.trav / p.range, 0, 1); const s = 6 + k * 10;
      ctx.globalAlpha = 1 - k * 0.7;
      ctx.fillStyle = k < 0.35 ? '#fff2b0' : k < 0.7 ? '#ff9a3a' : '#ff4a2a';
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      ctx.globalAlpha = 1; break;
    }
  }
}
function drawLob(L) {
  const k = clamp(L.t / L.dur, 0, 1);
  const x = lerp(L.x0, L.x1, k), y = lerp(L.y0, L.y1, k);
  const h = Math.sin(k * Math.PI) * L.peak;
  const danger = !G.player || L.team !== G.player.team;
  ctx.globalAlpha = 0.25 + 0.2 * Math.sin(G.anim * 16);
  ctx.strokeStyle = L.kind === 'heal' ? '#8cffb0' : (danger ? '#ff4a5a' : '#ffffff'); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(L.x1, L.y1, L.radius, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ellipse(x, y + 4, 6, 3); ctx.fill(); ctx.globalAlpha = 1;
  const py = y - h;
  if (L.kind === 'bomb' || L.kind === 'mega') {
    const s = L.kind === 'mega' ? 1.6 : 1;
    ctx.fillStyle = COL.ink; ctx.fillRect(x - 6 * s, py - 6 * s, 12 * s, 12 * s);
    ctx.fillStyle = '#5c6577'; ctx.fillRect(x - 5 * s, py - 5 * s, 10 * s, 10 * s);
    ctx.fillStyle = '#c9d1dc'; ctx.fillRect(x - 3 * s, py - 3 * s, 3 * s, 3 * s);
    ctx.fillStyle = Math.floor(G.anim * 20) % 2 ? '#ffd23f' : '#ff4a2a'; ctx.fillRect(x + 2 * s, py - 9 * s, 3 * s, 3 * s);
  } else if (L.kind === 'heal') {
    ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(x, py, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff8c8'; ctx.fillRect(x - 3, py - 3, 3, 3);
  } else {
    ctx.fillStyle = COL.ink; ctx.fillRect(x - 7, py - 7, 14, 14);
    ctx.fillStyle = '#7fffd4'; ctx.fillRect(x - 6, py - 6, 12, 12);
  }
}
function drawArea(A) {
  const k = 1 - A.life / A.max;
  if (A.kind === 'heal') {
    const fade = Math.min(1, A.life / 0.4);
    ctx.globalAlpha = 0.18 * fade; ctx.fillStyle = A.team === viewTeam() || viewTeam() < 0 ? '#8cffb0' : '#ff8a8a';
    ctx.beginPath(); ctx.arc(A.x, A.y, A.r, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.6 * fade; ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -G.anim * 20;
    ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 0.3 * fade; ctx.beginPath(); ctx.arc(A.x, A.y, A.r * (0.3 + (G.anim % 1) * 0.7), 0, TAU); ctx.stroke();
  } else if (A.kind === 'ring') {
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = A.color; ctx.lineWidth = 3 * (1 - k) + 1;
    ctx.beginPath(); ctx.arc(A.x, A.y, A.r * (0.4 + k * 0.7), 0, TAU); ctx.stroke();
  } else if (A.kind === 'flash') {
    ctx.globalAlpha = (1 - k) * 0.8; ctx.fillStyle = A.color;
    ctx.beginPath(); ctx.arc(A.x, A.y, A.r * (0.6 + k * 0.4), 0, TAU); ctx.fill();
  } else if (A.kind === 'slash') {
    const o = A.owner; const x = o && o.alive ? o.x : A.x, y = o && o.alive ? o.y : A.y;
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6 * (1 - k) + 2;
    ctx.beginPath(); ctx.arc(x, y, A.r * (0.7 + k * 0.3), A.ang - A.arc / 2, A.ang - A.arc / 2 + A.arc * Math.min(1, k * 3)); ctx.stroke();
    ctx.strokeStyle = '#ff4a5a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, A.r * (0.55 + k * 0.3), A.ang - A.arc / 2, A.ang - A.arc / 2 + A.arc * Math.min(1, k * 3)); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawItem(it) {
  const bob = Math.round(Math.sin(G.anim * 4 + it.bob) * 2);
  ctx.globalAlpha = 0.3; ctx.fillStyle = '#000'; ellipse(it.x, it.y + 6, 6, 2.5); ctx.fill(); ctx.globalAlpha = 1;
  const img = ITEM_SPR[it.kind];
  if (it.kind === 'gem') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.15 * Math.sin(G.anim * 5 + it.bob);
    ctx.fillStyle = '#c77dff'; ctx.beginPath(); ctx.arc(it.x, it.y - 4 + bob, 11, 0, TAU); ctx.fill(); ctx.restore();
  }
  ctx.drawImage(img, Math.round(it.x - img.width), Math.round(it.y - img.height * 2 + 4 + bob), img.width * 2, img.height * 2);
}

function render() {
  const W = SW, H = SH;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = G.grid ? G.theme.out : '#17112e';
  ctx.fillRect(0, 0, W, H);
  if (!G.grid) return;
  if (G.floorDirty.length) {
    const fx = G.floorCache.getContext('2d');
    for (const [tx, ty] of G.floorDirty) drawFloorTile(fx, tx, ty);
    G.floorDirty = [];
  }
  const z = G.zoom || computeZoom();
  const shx = G.cam.shake ? rand(-G.cam.shake, G.cam.shake) : 0, shy = G.cam.shake ? rand(-G.cam.shake, G.cam.shake) : 0;
  const camX = G.cam.x + shx / z, camY = G.cam.y + shy / z;
  const ox = Math.round((W / 2 - camX * z) * DPR), oy = Math.round((H / 2 - camY * z) * DPR);
  ctx.setTransform(z * DPR, 0, 0, z * DPR, ox, oy);
  ctx.imageSmoothingEnabled = false;
  const vl = camX - W / 2 / z - TILE, vr = camX + W / 2 / z + TILE, vt = camY - H / 2 / z - TILE, vb = camY + H / 2 / z + TILE * 2;
  const tx0 = Math.floor(vl / TILE), tx1 = Math.floor(vr / TILE), ty0 = Math.floor(vt / TILE), ty1 = Math.floor(vb / TILE);
  const S = tileSprites();

  ctx.drawImage(G.floorCache, 0, 0, G.mw * TILE, G.mh * TILE);
  // 水面アニメ
  ctx.fillStyle = G.theme.waterHi;
  for (let ty = Math.max(0, ty0); ty <= Math.min(G.mh - 1, ty1); ty++) for (let tx = Math.max(0, tx0); tx <= Math.min(G.mw - 1, tx1); tx++) {
    if (G.grid[ty * G.mw + tx] !== T_WATER) continue;
    const ph = (G.anim * 0.8 + hash2(tx, ty)) % 1;
    ctx.globalAlpha = 0.6 * Math.sin(ph * Math.PI);
    ctx.fillRect(tx * TILE + 4 + ph * 10, ty * TILE + 10 + (tx % 2) * 8, 8, 2);
  }
  ctx.globalAlpha = 1;
  // 鉱山の光
  if (G.mine) {
    const c = tileCenter(G.mine);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18 + 0.1 * Math.sin(G.anim * 3);
    ctx.fillStyle = '#c77dff'; ctx.beginPath(); ctx.arc(c.x, c.y, 26, 0, TAU); ctx.fill(); ctx.restore();
  }
  for (const A of G.areas) if (A.kind === 'heal') drawArea(A);
  for (const it of G.items) drawItem(it);

  // 照準ガイド
  const P = G.player;
  if (P && P.alive && G.state === 'play' && !P.leaping) {
    if (Input.touchMode) {
      if (Input.atk.id !== null && Input.atk.drag) drawGuide(P, aimSpec(P, false), Input.atk.ang, Input.atk.frac, '#ffffff');
      if (Input.sup.id !== null && Input.sup.drag && P.superCharge >= 1) drawGuide(P, aimSpec(P, true), Input.sup.ang, Input.sup.frac, COL.gold);
    } else {
      const sp = aimSpec(P, false);
      if (save.guide) { ctx.globalAlpha = 0.6; drawGuide(P, sp, P.aimAng, (P.aimDist || sp.range) / sp.range, '#ffffff'); ctx.globalAlpha = 1; }
      if (Input.rdown && P.superCharge >= 1) { const ss = aimSpec(P, true); drawGuide(P, ss, P.aimAng, (P.aimDist || ss.range) / ss.range, COL.gold); }
    }
  }

  // Yソートする物体
  const objs = [];
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const inMap = tx >= 0 && ty >= 0 && tx < G.mw && ty < G.mh;
    let t;
    if (inMap) t = G.grid[ty * G.mw + tx];
    else if (tx >= -1 && ty >= -1 && tx <= G.mw && ty <= G.mh) t = T_STEEL;
    else continue;
    if (t === T_WALL || t === T_STEEL || t === T_BOX) objs.push({ y: ty * TILE + TILE, t, tx, ty });
  }
  const vt2 = viewTeam();
  for (const b of G.brawlers) {
    if (!b.alive) continue;
    if (!visibleTo(vt2, b)) continue;
    objs.push({ y: b.y + 10 + (b.leaping ? 40 : 0), b });
  }
  for (const t of G.turrets) objs.push({ y: t.y + 8, tu: t });
  if (G.ball) objs.push({ y: G.ball.owner ? G.ball.owner.y + 11 : G.ball.y + 7, ball: G.ball });
  objs.sort((a, b) => a.y - b.y);
  for (const o of objs) {
    if (o.b) drawBrawler(o.b, 1);
    else if (o.tu) drawTurret(o.tu);
    else if (o.ball) drawBall(o.ball);
    else {
      const img = o.t === T_WALL ? S.wall : o.t === T_STEEL ? S.steel : S.box;
      ctx.drawImage(img, o.tx * TILE, o.ty * TILE - 16, TILE, 48);
      if (o.t === T_BOX) {
        const i = o.ty * G.mw + o.tx;
        if (G.anim - G.boxHitT[i] < 2.5) {
          const r = clamp(G.boxHp[i] / 2600, 0, 1);
          ctx.fillStyle = COL.ink; ctx.fillRect(o.tx * TILE + 2, o.ty * TILE - 22, 28, 5);
          ctx.fillStyle = '#5dff8a'; ctx.fillRect(o.tx * TILE + 3, o.ty * TILE - 21, 26 * r, 3);
        }
      }
    }
  }
  // 草むら
  for (let ty = Math.max(0, ty0); ty <= Math.min(G.mh - 1, ty1); ty++) for (let tx = Math.max(0, tx0); tx <= Math.min(G.mw - 1, tx1); tx++) {
    if (G.grid[ty * G.mw + tx] !== T_BUSH) continue;
    const sway = Math.sin(G.anim * 2 + tx * 0.7 + ty) > 0.85 ? 1 : 0;
    ctx.drawImage(S.bush[(tx * 3 + ty) % 3], tx * TILE + sway, ty * TILE - 8, TILE, 40);
  }
  // 草むらの中の自分・味方は半透明で上書き
  for (const b of G.brawlers) {
    if (!b.alive || !inBush(b)) continue;
    if (vt2 < 0 || b.team === vt2) drawBrawler(b, 0.55);
    else if (visibleTo(vt2, b)) drawBrawler(b, 0.9);
  }
  for (const p of G.projs) drawProjectile(p);
  for (const L of G.lobs) drawLob(L);
  for (const A of G.areas) if (A.kind !== 'heal') drawArea(A);
  for (const p of G.parts) {
    ctx.globalAlpha = clamp(p.life / p.max * 1.5, 0, 1);
    ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  // 毒ガス
  if (G.poison && G.poison.half < G.poison.maxHalf) {
    const Pz = G.poison, h = Pz.half;
    ctx.fillStyle = 'rgba(70,200,60,0.30)';
    ctx.beginPath();
    ctx.rect(-TILE * 4, -TILE * 4, G.mw * TILE + TILE * 8, G.mh * TILE + TILE * 8);
    ctx.rect(Pz.cx + h, Pz.cy - h, -2 * h, 2 * h);
    ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(160,255,120,0.7)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.lineDashOffset = G.anim * 30;
    ctx.strokeRect(Pz.cx - h, Pz.cy - h, 2 * h, 2 * h); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(180,255,140,0.5)';
    for (let i = 0; i < 40; i++) {
      const s = hash2(i, 7) * TAU; const rr = h + 10 + hash2(i, 3) * 90;
      const bx = Pz.cx + Math.cos(s) * rr * 1.2, by = Pz.cy + Math.sin(s) * rr * 1.2 - ((G.anim * 20 + i * 13) % 60);
      if (Math.abs(bx - Pz.cx) > h || Math.abs(by - Pz.cy) > h) ctx.fillRect(bx, by, 4, 4);
    }
  }

  // ---------- 画面座標のUI ----------
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawOverheads(vt2);
  for (const t of G.texts) {
    const s = worldToScreen(t.x, t.y);
    const size = Math.round((t.big ? 17 : 12) * t.scale);
    ctx.globalAlpha = clamp(t.life / t.max * 2, 0, 1);
    ctx.font = `${size}px "DotGothic16", monospace`; ctx.textAlign = 'center';
    ctx.fillStyle = COL.ink; ctx.fillText(t.txt, s.x + 1.5, s.y + 1.5);
    ctx.fillStyle = t.color; ctx.fillText(t.txt, s.x, s.y);
  }
  ctx.globalAlpha = 1;
  drawIndicators();
  if (P && P.alive && P.hp / P.maxHp < 0.3 && G.running) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(255,0,40,0)'); g.addColorStop(1, `rgba(255,0,40,${0.25 + 0.1 * Math.sin(G.anim * 6)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (P && !G.demo && G.running && !G.paused) drawControls(P);
}

function drawBar(x, y, w, h, r, col) {
  ctx.fillStyle = COL.ink; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#3a2f55'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col; ctx.fillRect(x, y, Math.max(0, w * r), h);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, y, Math.max(0, w * r), 1);
}
function drawOverheads(vt) {
  const z = G.zoom; const sc = clamp(z / 1.6, 0.75, 1.3);
  ctx.textAlign = 'center';
  for (const b of G.brawlers) {
    if (!b.alive || !visibleTo(vt, b)) continue;
    const lift = b.leaping ? Math.sin(clamp(b.leaping.t / b.leaping.dur, 0, 1) * Math.PI) * 30 : 0;
    const s = worldToScreen(b.x, b.y - 26 - lift);
    const w = 40 * sc, h = 5 * sc;
    const col = teamColor(b);
    drawBar(s.x - w / 2, s.y - h, w, h, b.hp / b.maxHp, col);
    ctx.font = `${Math.round(10 * sc)}px "DotGothic16", monospace`;
    ctx.fillStyle = COL.ink; ctx.fillText(Math.ceil(b.hp), s.x + 1, s.y - h - 3 * sc + 1);
    ctx.fillStyle = '#ffffff'; ctx.fillText(Math.ceil(b.hp), s.x, s.y - h - 3 * sc);
    ctx.font = `${Math.round(9 * sc)}px "DotGothic16", monospace`;
    ctx.fillStyle = COL.ink; ctx.fillText(b.name, s.x + 1, s.y - h - 15 * sc + 1);
    ctx.fillStyle = col; ctx.fillText(b.name, s.x, s.y - h - 15 * sc);
    let badgeX = s.x + w / 2 + 4 * sc;
    if (G.mode === 'gem' && b.gems > 0) {
      ctx.drawImage(ITEM_SPR.gem, badgeX, s.y - 12 * sc, 8 * 1.6 * sc, 7 * 1.6 * sc);
      ctx.font = `${Math.round(10 * sc)}px "DotGothic16", monospace`; ctx.textAlign = 'left';
      ctx.fillStyle = COL.ink; ctx.fillText(b.gems, badgeX + 14 * sc + 1, s.y - 2 * sc + 1); ctx.fillStyle = '#e2b8ff'; ctx.fillText(b.gems, badgeX + 14 * sc, s.y - 2 * sc);
      ctx.textAlign = 'center';
    }
    if (G.mode === 'bounty') {
      ctx.drawImage(ITEM_SPR.star, badgeX, s.y - 12 * sc, 7 * 1.6 * sc, 7 * 1.6 * sc);
      ctx.font = `${Math.round(10 * sc)}px "DotGothic16", monospace`; ctx.textAlign = 'left';
      ctx.fillStyle = COL.ink; ctx.fillText(b.bounty, badgeX + 13 * sc + 1, s.y - 2 * sc + 1); ctx.fillStyle = COL.gold; ctx.fillText(b.bounty, badgeX + 13 * sc, s.y - 2 * sc);
      ctx.textAlign = 'center';
    }
    if (G.mode === 'survival' && b.cubes > 0) {
      ctx.drawImage(ITEM_SPR.cube, badgeX, s.y - 11 * sc, 8 * 1.3 * sc, 8 * 1.3 * sc);
      ctx.font = `${Math.round(10 * sc)}px "DotGothic16", monospace`; ctx.textAlign = 'left';
      ctx.fillStyle = COL.ink; ctx.fillText(b.cubes, badgeX + 13 * sc + 1, s.y - 2 * sc + 1); ctx.fillStyle = '#5dff8a'; ctx.fillText(b.cubes, badgeX + 13 * sc, s.y - 2 * sc);
      ctx.textAlign = 'center';
    }
    if (b.isPlayer) {
      const f = worldToScreen(b.x, b.y + 16 - lift);
      const seg = 3, sw = 13 * sc, gap = 2 * sc, total = seg * sw + (seg - 1) * gap;
      for (let i = 0; i < seg; i++) {
        const r = clamp(b.ammo - i, 0, 1);
        drawBar(f.x - total / 2 + i * (sw + gap), f.y, sw, 4 * sc, r, r >= 1 ? '#ff9f1c' : '#b36a10');
      }
    }
  }
  for (const t of G.turrets) {
    const s = worldToScreen(t.x, t.y - 22);
    drawBar(s.x - 15 * sc, s.y, 30 * sc, 4 * sc, t.hp / t.maxHp, G.player && t.team === G.player.team ? COL.blue : COL.red);
    drawBar(s.x - 15 * sc, s.y + 6 * sc, 30 * sc, 2 * sc, t.life / t.maxLife, '#7fffd4');
  }
}
function drawArrow(x, y, ang, col, label) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -11); ctx.lineTo(-8, 11); ctx.closePath(); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-5, -7); ctx.lineTo(-5, 7); ctx.closePath(); ctx.fill();
  ctx.restore();
  if (label) { ctx.font = '11px "DotGothic16", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = COL.ink; ctx.fillText(label, x + 1, y + 23); ctx.fillStyle = col; ctx.fillText(label, x, y + 22); }
}
function edgePoint(tx, ty, margin) {
  const cx = SW / 2, cy = SH / 2; const dx = tx - cx, dy = ty - cy;
  const k = Math.min((SW / 2 - margin) / Math.max(1e-3, Math.abs(dx)), (SH / 2 - margin) / Math.max(1e-3, Math.abs(dy)));
  return { x: cx + dx * k, y: cy + dy * k, ang: Math.atan2(dy, dx) };
}
function drawIndicators() {
  if (G.demo || !G.player) return;
  if (G.ball) {
    const s = worldToScreen(G.ball.x, G.ball.y);
    if (s.x < 20 || s.y < 60 || s.x > SW - 20 || s.y > SH - 20) { const e = edgePoint(s.x, s.y, 40); drawArrow(e.x, e.y, e.ang, '#ffffff', 'ボール'); }
  }
  if (G.poison && G.player.alive && inPoison(G.player)) {
    const s = worldToScreen(G.poison.cx, G.poison.cy);
    if (s.x < 20 || s.y < 60 || s.x > SW - 20 || s.y > SH - 20) { const e = edgePoint(s.x, s.y, 50); drawArrow(e.x, e.y, e.ang, '#8cff6a', '安全地帯'); }
  }
}
function drawControls(P) {
  const L = Input.layout; if (!L) return;
  if (Input.touchMode) {
    const s = Input.stick; const active = s.id !== null;
    const bx = active ? s.ox : L.stickX, by = active ? s.oy : L.stickY;
    ctx.globalAlpha = active ? 0.5 : 0.25;
    ctx.fillStyle = 'rgba(20,12,40,0.5)'; ctx.beginPath(); ctx.arc(bx, by, L.stickR, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    let kx = bx, ky = by;
    if (active) { const dx = s.x - s.ox, dy = s.y - s.oy, l = Math.hypot(dx, dy); const m = Math.min(l, L.stickR); if (l > 0) { kx = bx + dx / l * m; ky = by + dy / l * m; } }
    ctx.globalAlpha = active ? 0.85 : 0.35; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(kx, ky, L.stickR * 0.42, 0, TAU); ctx.fill();
    // 攻撃ボタン
    const carrying = G.ball && G.ball.owner === P;
    const a = Input.atk; const aActive = a.id !== null;
    ctx.globalAlpha = aActive ? 0.9 : 0.7;
    ctx.fillStyle = carrying ? '#e8f4ff' : '#ff6a3d'; ctx.beginPath(); ctx.arc(L.atkX, L.atkY, L.atkR, 0, TAU); ctx.fill();
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.stroke();
    ctx.globalAlpha = 1;
    if (carrying) ctx.drawImage(ITEM_SPR.ball, L.atkX - 14, L.atkY - 14, 28, 28);
    else {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(L.atkX, L.atkY, L.atkR * 0.35, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(L.atkX - L.atkR * 0.6, L.atkY); ctx.lineTo(L.atkX + L.atkR * 0.6, L.atkY); ctx.moveTo(L.atkX, L.atkY - L.atkR * 0.6); ctx.lineTo(L.atkX, L.atkY + L.atkR * 0.6); ctx.stroke();
    }
    if (aActive && a.drag) {
      const k = Math.min(Math.hypot(a.x - a.ox, a.y - a.oy), L.dragMax);
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(a.ox + Math.cos(a.ang) * k, a.oy + Math.sin(a.ang) * k, L.atkR * 0.35, 0, TAU); ctx.fill();
    }
    // スーパーボタン
    const ready = P.superCharge >= 1; const sp = Input.sup;
    ctx.globalAlpha = ready ? 0.95 : 0.55;
    ctx.fillStyle = ready ? COL.gold : '#3a2f55'; ctx.beginPath(); ctx.arc(L.supX, L.supY, L.supR, 0, TAU); ctx.fill();
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = COL.gold; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(L.supX, L.supY, L.supR - 4, -Math.PI / 2, -Math.PI / 2 + TAU * P.superCharge); ctx.stroke();
    if (ready) { ctx.globalAlpha = 0.4 + 0.3 * Math.sin(G.anim * 8); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(L.supX, L.supY, L.supR + 5, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.drawImage(ITEM_SPR.star, L.supX - 11, L.supY - 11, 22, 22);
    if (sp.id !== null && sp.drag) {
      const k = Math.min(Math.hypot(sp.x - sp.ox, sp.y - sp.oy), L.dragMax);
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(sp.ox + Math.cos(sp.ang) * k, sp.oy + Math.sin(sp.ang) * k, L.supR * 0.4, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    const x = SW - 64, y = SH - 64, r = 34; const ready = P.superCharge >= 1;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = ready ? COL.gold : 'rgba(40,30,80,0.8)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = COL.gold; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, r - 4, -Math.PI / 2, -Math.PI / 2 + TAU * P.superCharge); ctx.stroke();
    ctx.globalAlpha = 1; ctx.drawImage(ITEM_SPR.star, x - 10, y - 16, 20, 20);
    ctx.font = '11px "DotGothic16", monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = ready ? COL.ink : '#ffffff'; ctx.fillText('E', x, y + 18);
  }
}

// =========================================================
// HUD
// =========================================================
const hud = {};
const ICON = {};
function cacheDom() {
  const ids = ['hud', 'scoreBoard', 'timer', 'killfeed', 'centerMsg', 'cmMain', 'cmSub', 'pauseBtn', 'pcHint',
    'totalTrophy', 'scCanvas', 'scName', 'scRole', 'scTrophy', 'curBrawler', 'curMode', 'curBrawlerIco', 'curModeIco',
    'brawlerGrid', 'bdCanvas', 'bdName', 'bdRole', 'bdDesc', 'bdStats', 'bdAtk', 'bdSup', 'bdTrophy', 'bdSelect',
    'modeGrid', 'volBgm', 'volSe', 'optShake', 'optGuide', 'resTitle', 'resSub', 'resTrophy', 'resTable', 'resStats'];
  for (const id of ids) hud[id] = document.getElementById(id);
}
function setHtml(el, html) { if (el && el._h !== html) { el._h = html; el.innerHTML = html; } }
function fmtTime(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
const img = (url, cls) => `<img class="px ${cls || ''}" src="${url}" alt="">`;

function updateHud() {
  if (G.demo || !G.running || !G.player) return;
  const M = G.mode, P = G.player;
  let t;
  if (MODES[M].time) t = `<span class="${G.timeLeft <= 10 ? 'warn' : ''}">${fmtTime(G.timeLeft)}</span>`;
  else { const Pz = G.poison; t = G.time < Pz.start ? `<span>毒ガスまで ${Math.ceil(Pz.start - G.time)}</span>` : `<span class="warn">毒ガス拡大中</span>`; }
  setHtml(hud.timer, t);
  let sb = '';
  if (M === 'gem') {
    const tg = teamGems(); const cd = G.gemCd;
    const pips = (n, cls) => { let s = ''; for (let i = 0; i < 10; i++) s += `<i class="${i < n ? cls : ''}"></i>`; return `<div class="pips">${s}</div>`; };
    sb = `<div class="sb-side blue">${img(ICON.gem)}<b>${tg[0]}</b>${pips(tg[0], 'on')}</div>
      <div class="sb-mid">${cd ? `<span class="sb-cd ${cd.team === P.team ? 'blue' : 'red'}">${Math.ceil(cd.t)}</span>` : '<span class="sb-vs">VS</span>'}</div>
      <div class="sb-side red">${pips(tg[1], 'on')}<b>${tg[1]}</b>${img(ICON.gem)}</div>`;
  } else if (M === 'bounty') {
    sb = `<div class="sb-side blue">${img(ICON.star)}<b>${G.score[0]}</b></div><div class="sb-mid"><span class="sb-vs">VS</span></div><div class="sb-side red"><b>${G.score[1]}</b>${img(ICON.star)}</div>`;
  } else if (M === 'ball') {
    sb = `<div class="sb-side blue">${img(ICON.ball)}<b>${G.score[0]}</b></div><div class="sb-mid"><span class="sb-vs">VS</span></div><div class="sb-side red"><b>${G.score[1]}</b>${img(ICON.ball)}</div>`;
  } else {
    const alive = G.brawlers.filter((b) => b.alive).length;
    sb = `<div class="sb-side solo">残り<b>${alive}</b>人</div><div class="sb-side solo">${img(ICON.cube)}<b>${P.cubes}</b></div>`;
  }
  setHtml(hud.scoreBoard, sb);
  if (!P.alive && G.mode !== 'survival' && G.state === 'play') {
    const n = Math.max(1, Math.ceil(P.respawnAt - G.time));
    setCenter('やられた！', `復活まで ${n}`, 0.5, 'bad', true);
  }
}

function addFeed(killer, victim) {
  if (G.demo || !hud.killfeed) return;
  const cls = (b) => (b === G.player ? 'me' : (G.player && b.team === G.player.team ? 'ally' : 'enemy'));
  const nm = (b) => `<span class="${cls(b)}">${img(ICON[b.def.id], 'kf-ico')}${esc(b.name)}</span>`;
  const el = document.createElement('div'); el.className = 'kf';
  el.innerHTML = killer && killer !== victim ? `${nm(killer)}<em>▶</em>${nm(victim)}` : `<em>✖</em>${nm(victim)}`;
  hud.killfeed.prepend(el);
  while (hud.killfeed.children.length > 4) hud.killfeed.lastChild.remove();
  setTimeout(() => el.classList.add('out'), 3600);
  setTimeout(() => el.remove(), 4200);
}

let cmLast = '';
function setCenter(main, sub, dur, cls, quiet) {
  if (!hud.centerMsg) return;
  const key = main + '|' + sub + '|' + cls;
  G.cmT = dur;
  if (!main) { hud.centerMsg.classList.remove('show'); cmLast = ''; return; }
  if (key === cmLast && hud.centerMsg.classList.contains('show')) return;
  cmLast = key;
  hud.cmMain.textContent = main; hud.cmSub.textContent = sub || '';
  hud.centerMsg.className = 'center-msg ' + (cls || '');
  if (!quiet) void hud.centerMsg.offsetWidth;
  hud.centerMsg.classList.add('show');
}

// =========================================================
// 画面遷移
// =========================================================
function showScreen(name) {
  $$('.screen').forEach((s) => s.classList.toggle('show', s.id === name));
  document.body.dataset.screen = name || 'game';
}
function startDemo() {
  const modes = ['gem', 'bounty', 'ball', 'survival'];
  startMatch(pick(modes), true);
}
function goHome() {
  hud.hud.classList.add('hidden');
  showScreen('home');
  refreshHome();
  startDemo();
  Sound.playBgm('menu');
}
function startGame() {
  Sound.init(); Sound.play('click');
  showScreen('');
  hud.hud.classList.remove('hidden');
  hud.killfeed.innerHTML = ''; hud.scoreBoard._h = ''; hud.timer._h = '';
  setCenter('', '', 0);
  hud.pcHint.classList.toggle('hidden', Input.touchMode);
  startMatch(save.mode, false);
  Sound.playBgm('battle');
}
function togglePause(force) {
  if (!G.running || G.demo || G.state === 'over') return;
  G.paused = force != null ? force : !G.paused;
  Input.reset();
  $('#pause').classList.toggle('show', G.paused);
  if (!G.paused) lastT = performance.now();
}
function retire() {
  $('#pause').classList.remove('show');
  G.paused = false; G.running = false; G.state = 'over';
  const p = G.player;
  G.result = G.mode === 'survival' ? { place: G.brawlers.filter((b) => b.alive).length, retired: true } : { winTeam: 1 - p.team, retired: true };
  showResult();
}
function finishMatch() {
  G.running = false;
  if (G.demo) { startDemo(); return; }
  showResult();
}

function mvpScore(b) { return b.stats.kills * 3 + b.stats.dmg / 900 + b.stats.heal / 900 + b.stats.gems * 0.6 + b.stats.goals * 4 - b.stats.deaths; }
function showResult() {
  const p = G.player, R = G.result || { winTeam: -1 };
  let outcome, delta, title, sub = MODES[G.mode].name + ' / ' + G.mapName;
  if (G.mode === 'survival') {
    const place = R.place || 8;
    delta = [10, 8, 6, 4, 2, 0, -2, -4][place - 1]; if (delta == null) delta = -4;
    outcome = place === 1 ? 'win' : place <= 4 ? 'draw' : 'lose';
    title = R.retired ? 'リタイア' : place + '位';
  } else if (R.retired) { outcome = 'lose'; delta = -4; title = 'リタイア'; }
  else if (R.winTeam === -1) { outcome = 'draw'; delta = 0; title = '引き分け'; }
  else if (R.winTeam === p.team) { outcome = 'win'; delta = 8; title = '勝利！'; }
  else { outcome = 'lose'; delta = -4; title = '敗北'; }
  const id = p.def.id; const before = trophyOf(id); const after = Math.max(0, before + delta);
  save.trophies[id] = after;
  save.stats.games++; if (outcome === 'win') save.stats.wins++; save.stats.kills += p.stats.kills;
  writeSave();
  hud.resTitle.textContent = title;
  hud.resTitle.className = 'res-title ' + outcome;
  hud.resSub.textContent = sub;
  const real = after - before;
  hud.resTrophy.innerHTML = `${img(ICON.trophy)}<b>${after}</b><span class="${real > 0 ? 'up' : real < 0 ? 'down' : ''}">${real > 0 ? '+' + real : real < 0 ? real : '±0'}</span>`;
  const list = G.brawlers.slice();
  const mvp = list.reduce((a, b) => (mvpScore(b) > mvpScore(a) ? b : a), list[0]);
  let extraHead = '', extra = () => '';
  if (G.mode === 'gem') { extraHead = 'ジェム'; extra = (b) => b.stats.gems; }
  else if (G.mode === 'ball') { extraHead = 'ゴール'; extra = (b) => b.stats.goals; }
  else if (G.mode === 'bounty') { extraHead = '回復'; extra = (b) => Math.round(b.stats.heal); }
  else { extraHead = '順位'; extra = (b) => (b.alive ? 1 : b.place) + '位'; list.sort((a, b) => (a.alive ? 1 : a.place) - (b.alive ? 1 : b.place)); }
  if (G.mode !== 'survival') list.sort((a, b) => (a.team - b.team) || (mvpScore(b) - mvpScore(a)));
  let rows = `<div class="rt-row rt-head"><span></span><span class="rt-name">名前</span><span>撃破</span><span>ダメージ</span><span>${extraHead}</span></div>`;
  for (const b of list) {
    const tc = b === p ? 'me' : (G.mode !== 'survival' && b.team === p.team ? 'ally' : 'enemy');
    rows += `<div class="rt-row ${tc}">${img(ICON[b.def.id], 'rt-ico')}<span class="rt-name">${esc(b.name)}${b === mvp ? '<em class="mvp">MVP</em>' : ''}<small>${b.def.name}</small></span><span>${b.stats.kills}</span><span>${Math.round(b.stats.dmg)}</span><span>${extra(b)}</span></div>`;
  }
  hud.resTable.innerHTML = rows;
  hud.resStats.textContent = `通算 ${save.stats.games}戦 ${save.stats.wins}勝 / 撃破 ${save.stats.kills}`;
  hud.hud.classList.add('hidden');
  showScreen('result');
  Sound.playBgm('menu');
}

// =========================================================
// メニュー
// =========================================================
function drawSpriteTo(canvas, id, frame) {
  const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.drawImage(SPR[id].r[frame || 0], 0, 0, canvas.width, canvas.height);
}
function refreshHome() {
  const d = BR[save.selected] || BRAWLERS[0];
  hud.totalTrophy.textContent = totalTrophies();
  drawSpriteTo(hud.scCanvas, d.id, 0);
  hud.scName.textContent = d.name;
  hud.scRole.textContent = d.role;
  hud.scTrophy.innerHTML = `${img(ICON.trophy)}${trophyOf(d.id)}`;
  hud.curBrawler.textContent = d.name;
  hud.curBrawlerIco.src = ICON[d.id];
  hud.curMode.textContent = MODES[save.mode].name;
  hud.curModeIco.src = ICON[MODES[save.mode].icon];
  document.documentElement.style.setProperty('--hero', d.color);
}
let viewingId = null;
function buildBrawlerScreen() {
  hud.brawlerGrid.innerHTML = '';
  for (const d of BRAWLERS) {
    const btn = document.createElement('button');
    btn.className = 'bcard'; btn.dataset.id = d.id; btn.style.setProperty('--c', d.color);
    btn.innerHTML = `${img(ICON[d.id], 'bc-img')}<span class="bc-name">${d.name}</span><span class="bc-role">${d.role}</span><span class="bc-tro">${img(ICON.trophy)}${trophyOf(d.id)}</span>`;
    btn.addEventListener('click', () => { Sound.play('click'); viewBrawler(d.id); });
    hud.brawlerGrid.appendChild(btn);
  }
  viewBrawler(save.selected);
}
function viewBrawler(id) {
  viewingId = id; const d = BR[id];
  $$('.bcard').forEach((c) => c.classList.toggle('sel', c.dataset.id === id));
  drawSpriteTo(hud.bdCanvas, id, 0);
  hud.bdName.textContent = d.name; hud.bdRole.textContent = d.role; hud.bdDesc.textContent = d.desc;
  hud.bdTrophy.innerHTML = `${img(ICON.trophy)}${trophyOf(id)}`;
  const row = (label, v) => `<div class="stat"><span>${label}</span><div class="pips5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</div></div>`;
  hud.bdStats.innerHTML = row('体力', d.ui.hp) + row('攻撃', d.ui.atk) + row('射程', d.ui.range) + row('速さ', d.ui.speed);
  hud.bdAtk.innerHTML = `<b>${d.atkName}</b><p>${d.atkDesc}</p>`;
  hud.bdSup.innerHTML = `<b>${d.supName}</b><p>${d.supDesc}</p>`;
  hud.bdSelect.textContent = id === save.selected ? '選択中' : 'このキャラにする';
  hud.bdSelect.classList.toggle('is-current', id === save.selected);
  document.getElementById('brawlers').style.setProperty('--c', d.color);
}
function mapPreview(key) {
  const m = parseMap(key); const s = 4; const th = m.theme;
  const c = mkCanvas(m.mw * s, m.mh * s), x = c.getContext('2d');
  const pads = {};
  for (const t of [0, 1, 'S']) for (const p of m.spawns[t]) pads[p.y * m.mw + p.x] = t;
  for (let ty = 0; ty < m.mh; ty++) for (let tx = 0; tx < m.mw; tx++) {
    const t = m.grid[ty * m.mw + tx];
    let col = ((tx + ty) & 1) ? th.floor1 : th.floor2;
    if (t === T_WALL) col = th.wallTop; else if (t === T_STEEL) col = '#5b6680'; else if (t === T_BUSH) col = th.bushD;
    else if (t === T_WATER) col = th.water; else if (t === T_BOX) col = '#dca45c'; else if (t === T_GOAL) col = '#ffffff';
    const pd = pads[ty * m.mw + tx];
    if (pd !== undefined) col = pd === 0 ? COL.blue : pd === 1 ? COL.red : COL.gold;
    if (m.mine && m.mine.x === tx && m.mine.y === ty) col = '#c77dff';
    if (m.ballSpawn && m.ballSpawn.x === tx && m.ballSpawn.y === ty) col = '#ffffff';
    x.fillStyle = col; x.fillRect(tx * s, ty * s, s, s);
  }
  return c;
}
function buildModeScreen() {
  hud.modeGrid.innerHTML = '';
  for (const key of Object.keys(MODES)) {
    const M = MODES[key];
    const btn = document.createElement('button');
    btn.className = 'mcard'; btn.dataset.mode = key;
    const pv = mapPreview(key); pv.className = 'mc-map px';
    btn.innerHTML = `<div class="mc-head">${img(ICON[M.icon], 'mc-ico')}<span class="mc-name">${M.name}</span><span class="mc-tag">${M.team ? '3vs3' : '8人バトロワ'}</span></div>
      <div class="mc-body"><div class="mc-mapbox"></div><div class="mc-text"><p>${M.desc}</p><ul>${M.rules.map((r) => `<li>${r}</li>`).join('')}</ul><span class="mc-mapname">マップ：${MAPS[key].name}</span></div></div>`;
    btn.querySelector('.mc-mapbox').appendChild(pv);
    btn.addEventListener('click', () => {
      Sound.play('click'); save.mode = key; writeSave();
      $$('.mcard').forEach((c) => c.classList.toggle('sel', c.dataset.mode === key));
      refreshHome(); setTimeout(() => showScreen('home'), 160);
    });
    hud.modeGrid.appendChild(btn);
  }
  $$('.mcard').forEach((c) => c.classList.toggle('sel', c.dataset.mode === save.mode));
}
function refreshSettings() {
  $$('#diffSeg button').forEach((b) => b.classList.toggle('on', b.dataset.diff === save.difficulty));
  hud.volBgm.value = Math.round(save.bgm * 100); hud.volSe.value = Math.round(save.se * 100);
  hud.optShake.checked = !!save.shake; hud.optGuide.checked = !!save.guide;
}
function setupMenus() {
  $('#btnPlay').addEventListener('click', startGame);
  $('#btnBrawler').addEventListener('click', () => { Sound.init(); Sound.play('click'); buildBrawlerScreen(); showScreen('brawlers'); });
  $('#btnMode').addEventListener('click', () => { Sound.init(); Sound.play('click'); buildModeScreen(); showScreen('modes'); });
  $$('[data-open]').forEach((b) => b.addEventListener('click', () => {
    Sound.init(); Sound.play('click');
    const t = b.dataset.open; if (t === 'settings') refreshSettings();
    b.dataset.from = document.body.dataset.screen;
    showScreen(t);
  }));
  $$('[data-back]').forEach((b) => b.addEventListener('click', () => { Sound.play('click'); refreshHome(); showScreen('home'); }));
  hud.bdSelect.addEventListener('click', () => {
    if (!viewingId) return;
    Sound.play('ready'); save.selected = viewingId; writeSave(); refreshHome(); viewBrawler(viewingId);
    setTimeout(() => showScreen('home'), 220);
  });
  $$('#diffSeg button').forEach((b) => b.addEventListener('click', () => { Sound.play('click'); save.difficulty = b.dataset.diff; writeSave(); refreshSettings(); }));
  hud.volBgm.addEventListener('input', () => { save.bgm = hud.volBgm.value / 100; Sound.applyVolume(); writeSave(); });
  hud.volSe.addEventListener('input', () => { save.se = hud.volSe.value / 100; Sound.applyVolume(); writeSave(); });
  hud.volSe.addEventListener('change', () => Sound.play('hit'));
  hud.optShake.addEventListener('change', () => { save.shake = hud.optShake.checked; writeSave(); });
  hud.optGuide.addEventListener('change', () => { save.guide = hud.optGuide.checked; writeSave(); });
  $('#resetData').addEventListener('click', () => {
    if (!window.confirm('トロフィーと戦績をすべてリセットします。よろしいですか？')) return;
    const keep = { bgm: save.bgm, se: save.se };
    save = Object.assign(defaultSave(), keep); writeSave(); refreshSettings(); refreshHome();
  });
  hud.pauseBtn.addEventListener('click', () => { Sound.play('click'); togglePause(true); });
  $('#btnResume').addEventListener('click', () => { Sound.play('click'); togglePause(false); });
  $('#btnRetire').addEventListener('click', () => { Sound.play('click'); retire(); });
  $('#btnAgain').addEventListener('click', startGame);
  $('#btnHome').addEventListener('click', () => { Sound.play('click'); goHome(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.running && !G.demo && !G.paused && G.state !== 'over') togglePause(true);
  });
}

// =========================================================
// メインループ
// =========================================================
let lastT = performance.now(), acc = 0;
function tick(dt) {
  if (!G.running || G.paused) return;
  G.anim += dt;
  if (G.cmT > 0) { G.cmT -= dt; if (G.cmT <= 0 && hud.centerMsg) { hud.centerMsg.classList.remove('show'); cmLast = ''; } }
  if (G.state === 'countdown') {
    G.cdT -= dt;
    const n = Math.ceil(G.cdT);
    if (n !== G.lastCount && n > 0 && !G.demo) {
      G.lastCount = n;
      const sub = G.mode === 'ball' && G.score[0] + G.score[1] > 0 ? `${G.score[0]} - ${G.score[1]}` : MODES[G.mode].name;
      setCenter(String(n), sub, 1.2, 'count'); Sound.play('count');
    }
    if (G.cdT <= 0) { G.state = 'play'; if (!G.demo) { setCenter('FIGHT!', '', 0.9, 'go'); Sound.play('go'); } }
    updateParticles(dt); updateCamera(dt); updateHud();
    return;
  }
  if (G.state === 'goal') {
    G.goalT -= dt;
    for (const b of G.brawlers) b.moving = false;
    updateParticles(dt); updateCamera(dt); updateHud();
    if (G.goalT <= 0) {
      if (G.pendingEnd !== null) { const w = G.pendingEnd; G.pendingEnd = null; G.state = 'play'; endMatch(w); }
      else resetRound();
    }
    return;
  }
  const sdt = G.state === 'over' ? dt * 0.35 : dt;
  G.time += sdt;
  if (G.state === 'play' && MODES[G.mode].time) G.timeLeft -= sdt;
  for (const b of G.brawlers) updateBrawler(b, sdt);
  separateBrawlers();
  updateProjectiles(sdt); updateLobs(sdt); updateAreas(sdt); updateTurrets(sdt); updateItems(sdt);
  if (G.ball) updateBall(sdt);
  if (G.state === 'play') modeUpdate(sdt);
  updateParticles(sdt);
  updateCamera(dt);
  updateHud();
  if (G.state === 'over') { G.overT -= dt; if (G.overT <= 0) finishMatch(); }
}
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - lastT) / 1000; lastT = now;
  if (!(dt > 0)) dt = 0; if (dt > 0.1) dt = 0.1;
  acc += dt; let steps = 0;
  while (acc >= STEP && steps < 6) { tick(STEP); acc -= STEP; steps++; }
  if (steps >= 6) acc = 0;
  try { render(); } catch (e) { console.error(e); }
}

// =========================================================
// 起動
// =========================================================
function init() {
  buildAllSprites();
  const trophyArt = { rows: ['kkkkkkkk', 'kywyyyYk', 'kyyyyyYk', '.kyyyYk.', '..kyYk..', '...kk...', '..kyyk..', '.kkkkkk.'], pal: { k: '#5a3a00', y: '#ffd23f', Y: '#d49a00', w: '#fff6c0' } };
  ITEM_SPR.trophy = buildSprite(trophyArt.rows, trophyArt.pal);
  for (const k in ITEM_SPR) ICON[k] = ITEM_SPR[k].toDataURL();
  for (const b of BRAWLERS) ICON[b.id] = SPR[b.id].r[0].toDataURL();
  cacheDom();
  const chip = document.getElementById('chipTrophyIco'); if (chip) chip.src = ICON.trophy;
  Input.touchMode = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  resize();
  setupInput(cv);
  setupMenus();
  refreshHome();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  const unlock = () => { Sound.init(); };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  Sound.playBgm('menu');
  showScreen('home');
  startDemo();
  requestAnimationFrame(frame);
  if (location.hash === '#dev') window.__DR = { G, startMatch, BRAWLERS, save, tick, Input, endMatch };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
