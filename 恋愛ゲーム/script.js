/* =========================================================
   夏色トワイライト ～君と結ぶ14日間～
   made by hiro/ヒロ  https://github.com/h1ro223
   ---------------------------------------------------------
   構成
     1. 基本ユーティリティ / 保存
     2. サウンド（WebAudio でBGM・効果音をすべて生成）
     3. グラフィック（キャラ立ち絵・背景・マップをSVGで生成）
     4. 演出エフェクト（Canvas）
     5. シナリオ解析
     6. ゲームエンジン / UI
     7. シナリオ本文
   ========================================================= */
'use strict';

/* =========================================================
   1. 基本ユーティリティ
   ========================================================= */
const IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';
const $ = (s) => (IS_BROWSER ? document.querySelector(s) : null);
const $$ = (s) => (IS_BROWSER ? Array.from(document.querySelectorAll(s)) : []);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const deepCopy = (o) => JSON.parse(JSON.stringify(o));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function seeded(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STORE_KEY = 'natsuiro_twilight_v1';
const Store = {
  mem: {},
  get(key, def) {
    try {
      const raw = localStorage.getItem(STORE_KEY + ':' + key);
      if (raw == null) return key in this.mem ? deepCopy(this.mem[key]) : def;
      return JSON.parse(raw);
    } catch (e) {
      return key in this.mem ? deepCopy(this.mem[key]) : def;
    }
  },
  set(key, val) {
    this.mem[key] = deepCopy(val);
    try { localStorage.setItem(STORE_KEY + ':' + key, JSON.stringify(val)); return true; } catch (e) { return false; }
  },
  del(key) {
    delete this.mem[key];
    try { localStorage.removeItem(STORE_KEY + ':' + key); } catch (e) { /* noop */ }
  },
  clearAll() {
    this.mem = {};
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(STORE_KEY + ':') === 0) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch (e) { /* noop */ }
  }
};

/* =========================================================
   2. サウンド
   ========================================================= */
const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteToMidi(n) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) return null;
  let v = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return v + (parseInt(m[3], 10) + 1) * 12;
}
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function chordTones(name) {
  const m = /^([A-G])([#b]?)(maj7|m7|m|7|sus4|add9)?$/.exec(name);
  if (!m) return [0, 4, 7, 12];
  const root = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const q = m[3] || '';
  let iv;
  switch (q) {
    case 'm': iv = [0, 3, 7, 12]; break;
    case '7': iv = [0, 4, 7, 10]; break;
    case 'maj7': iv = [0, 4, 7, 11]; break;
    case 'm7': iv = [0, 3, 7, 10]; break;
    case 'sus4': iv = [0, 5, 7, 12]; break;
    case 'add9': iv = [0, 4, 7, 14]; break;
    default: iv = [0, 4, 7, 12];
  }
  return iv.map((x) => x + root);
}

/* 曲データ：1小節=8分音符×8。メロディ "." は伸ばし、"-" は休符 */
const TRACKS = {
  title: {
    bpm: 84, key: 2,
    chords: ['F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'C'],
    mel: 'A4 . C5 . F5 . E5 D5 | E5 . . D5 D5 . C5 B4 | G4 . B4 . E5 . D5 C5 | C5 . . . - - E5 D5 | D5 . F5 . A5 . G5 F5 | G5 . . F5 E5 . D5 E5 | E5 . . . D5 . C5 . | C5 . . . - - - -',
    melInst: 'bell', melVol: .16,
    arp: [0, 1, 2, 3, 4, 3, 2, 1], arpOct: 3, arpInst: 'piano', arpVol: .07,
    pad: .035, bass: 'x...x...', bassVol: .12
  },
  daily: {
    bpm: 116, key: 0,
    chords: ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'],
    mel: 'E5 . G5 . C6 . G5 . | D5 . G5 . B5 . A5 G5 | C5 . E5 . A5 . G5 E5 | G5 . . . E5 . - - | F5 . A5 . C6 . A5 . | G5 . E5 . C5 . E5 . | F5 . E5 . D5 . C5 . | D5 . . . G4 . - -',
    melInst: 'bell', melVol: .13,
    arp: [0, 2, 1, 2, 0, 2, 1, 2], arpOct: 4, arpInst: 'piano', arpVol: .06,
    bass: 'x...x.x.', bassVol: .13,
    kick: 'x...x...', hat: '..x...x.', drumVol: .5
  },
  romance: {
    bpm: 72, key: -3,
    chords: ['F', 'G', 'Em', 'Am', 'Dm', 'Em', 'F', 'G'],
    mel: 'C5 . . . A4 . C5 . | D5 . . . B4 . D5 . | E5 . . . G5 . E5 D5 | C5 . . . . . - - | F5 . E5 . D5 . C5 . | B4 . C5 . D5 . G4 . | A4 . C5 . F5 . E5 . | D5 . . . . . - -',
    melInst: 'piano', melVol: .17,
    arp: [0, 1, 2, 4, 2, 1, 3, 1], arpOct: 4, arpInst: 'harp', arpVol: .06,
    pad: .04, bass: 'x.......', bassVol: .11
  },
  sad: {
    bpm: 64, key: 0,
    chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'E'],
    mel: 'E5 . . . C5 . . B4 | A4 . . . . . C5 . | G4 . C5 . E5 . D5 C5 | D5 . . . . . - - | E5 . . . A5 . . G5 | F5 . . E5 D5 . C5 . | B4 . . C5 D5 . . E5 | E5 . . . . . - -',
    melInst: 'piano', melVol: .15,
    arp: [0, 1, 2, 1, 3, 2, 1, 2], arpOct: 3, arpInst: 'piano', arpVol: .055,
    pad: .03, bass: 'x.......', bassVol: .1
  },
  comic: {
    bpm: 138, key: 5,
    chords: ['C', 'F', 'G', 'C', 'C', 'F', 'G', 'C'],
    mel: 'C5 - E5 - G5 - E5 - | F5 - A5 - F5 - C5 - | D5 - G5 - B4 - D5 - | C5 . E5 - C5 - - - | E5 E5 G5 - E5 E5 G5 - | A5 - G5 - F5 - A5 - | G5 - F5 - D5 - B4 - | C5 - - - C4 - - -',
    melInst: 'lead', melVol: .08,
    arp: null, bass: 'xoxoxoxo', bassVol: .13,
    kick: 'x...x...', snare: '..x...x.', hat: 'xxxxxxxx', drumVol: .45
  },
  luna: {
    bpm: 70, key: 0,
    chords: ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7', 'Fmaj7', 'Em7', 'Dm7', 'G'],
    mel: 'A5 . G5 . E5 . C5 . | B4 . . . G5 . E5 . | F5 . E5 . D5 . A4 . | E5 . . . . . - - | A5 . G5 . E5 . C6 . | B5 . . . G5 . E5 . | F5 . A5 . D6 . C6 . | B5 . . . . . - -',
    melInst: 'bell', melVol: .15,
    arp: [0, 2, 1, 3, 2, 4, 3, 2], arpOct: 3, arpInst: 'harp', arpVol: .06,
    pad: .045, bass: 'x.......', bassVol: .1
  },
  festival: {
    bpm: 120, key: 2,
    chords: ['C', 'C', 'Am', 'Am', 'F', 'G', 'C', 'C'],
    mel: 'C5 D5 E5 . G5 . E5 D5 | C5 . A4 . C5 . . . | E5 G5 A5 . G5 E5 D5 . | E5 . . . - - - - | A5 . G5 E5 G5 . E5 D5 | C5 D5 E5 . D5 . C5 A4 | G4 . A4 C5 D5 . E5 G5 | C5 . . . - - - -',
    melInst: 'flute', melVol: .12,
    arp: [0, 2, 4, 2, 0, 2, 4, 2], arpOct: 3, arpInst: 'harp', arpVol: .045,
    bass: 'x...x...', bassVol: .12,
    taiko: 'x..x..x.', hat: 'x.x.x.x.', drumVol: .55
  },
  ending: {
    bpm: 80, key: 2,
    chords: ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'],
    mel: 'C5 . F5 . A5 . G5 F5 | G5 . . . D5 . E5 F5 | E5 . . . B4 . C5 D5 | C5 . . . A4 . C5 . | F5 . E5 . F5 . A5 . | G5 . . . F5 E5 D5 . | E5 . G5 . C6 . . . | C6 . . . - - - -',
    melInst: 'piano', melVol: .17,
    arp: [0, 1, 2, 3, 4, 3, 2, 1], arpOct: 3, arpInst: 'harp', arpVol: .06,
    pad: .045, bass: 'x...x...', bassVol: .12, kick: 'x.......', drumVol: .35
  },
  tension: {
    bpm: 96, key: 0,
    chords: ['Am', 'Am', 'F', 'F', 'Dm', 'Dm', 'E', 'E'],
    mel: '',
    arp: [0, 0, 2, 0, 1, 0, 2, 0], arpOct: 3, arpInst: 'piano', arpVol: .07,
    pad: .05, bass: 'x..x..x.', bassVol: .14, kick: 'x...x...', drumVol: .4
  }
};

const AudioSys = {
  ctx: null, master: null, bgmBus: null, seBus: null, noiseBuf: null,
  cur: null, curName: null, timer: null, step: 0, nextTime: 0,
  rainNode: null, vol: { bgm: .5, se: .6 },
  init() {
    if (this.ctx || !IS_BROWSER) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = .9;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      this.master.connect(comp); comp.connect(this.ctx.destination);
      this.bgmBus = this.ctx.createGain();
      this.seBus = this.ctx.createGain();
      /* 簡易リバーブ */
      const conv = this.ctx.createConvolver();
      conv.buffer = this.makeImpulse(2.2);
      const wet = this.ctx.createGain(); wet.gain.value = .28;
      this.bgmBus.connect(this.master);
      this.bgmBus.connect(conv); conv.connect(wet); wet.connect(this.master);
      this.seBus.connect(this.master);
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVol();
    } catch (e) { this.ctx = null; }
  },
  makeImpulse(sec) {
    const rate = this.ctx.sampleRate, len = Math.floor(rate * sec);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  },
  unlock() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    try {
      const b = this.ctx.createBuffer(1, 1, 22050);
      const s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start(0);
    } catch (e) { /* noop */ }
  },
  applyVol() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.bgmBus.gain.setTargetAtTime(this.vol.bgm * 1.1, t, .05);
    this.seBus.gain.setTargetAtTime(this.vol.se, t, .05);
  },
  /* ---- 楽器 ---- */
  tone(inst, freq, t, dur, vol, bus) {
    const c = this.ctx; if (!c) return;
    const out = c.createGain(); out.connect(bus || this.bgmBus);
    const g = out.gain;
    const osc = [];
    const add = (type, f, gain, detune) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune;
      const og = c.createGain(); og.gain.value = gain; o.connect(og); og.connect(out); osc.push(o); return o;
    };
    let end = t + dur;
    switch (inst) {
      case 'piano': {
        add('triangle', freq, 1); add('sine', freq * 2, .25); add('sine', freq, .5, 4);
        g.setValueAtTime(0, t); g.linearRampToValueAtTime(vol, t + .006);
        g.exponentialRampToValueAtTime(vol * .35, t + .25);
        g.exponentialRampToValueAtTime(.0001, t + dur + .6); end = t + dur + .65; break;
      }
      case 'bell': {
        add('sine', freq, 1); add('sine', freq * 3.01, .22); add('sine', freq * 5.02, .06);
        g.setValueAtTime(0, t); g.linearRampToValueAtTime(vol, t + .004);
        g.exponentialRampToValueAtTime(.0001, t + Math.max(.6, dur * 1.6)); end = t + Math.max(.65, dur * 1.6 + .05); break;
      }
      case 'harp': {
        add('triangle', freq, 1); add('sine', freq * 2, .3);
        g.setValueAtTime(0, t); g.linearRampToValueAtTime(vol, t + .01);
        g.exponentialRampToValueAtTime(.0001, t + 1.1); end = t + 1.15; break;
      }
      case 'flute': {
        const o = add('sine', freq, 1); add('triangle', freq, .25);
        const lfo = c.createOscillator(); lfo.frequency.value = 5.2; const lg = c.createGain(); lg.gain.value = freq * .012;
        lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + .3);
        g.setValueAtTime(0, t); g.linearRampToValueAtTime(vol, t + .06);
        g.setValueAtTime(vol, t + Math.max(.07, dur - .05)); g.exponentialRampToValueAtTime(.0001, t + dur + .25); end = t + dur + .3; break;
      }
      case 'lead': {
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
        out.disconnect(); out.connect(f); f.connect(bus || this.bgmBus);
        add('square', freq, 1);
        g.setValueAtTime(0, t); g.linearRampToValueAtTime(vol, t + .01);
        g.exponentialRampToValueAtTime(.0001, t + Math.min(dur, .3) + .12); end = t + Math.min(dur, .3) + .15; break;
      }
      case 'bass': {
        add('triangle', freq, 1); add('sine', freq, .6);
        g.setValueAtTime(0, t); g.linearRampToValueAtTime(vol, t + .01);
        g.exponentialRampToValueAtTime(vol * .4, t + .3); g.exponentialRampToValueAtTime(.0001, t + dur + .1); end = t + dur + .15; break;
      }
      case 'pad': {
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
        out.disconnect(); out.connect(f); f.connect(bus || this.bgmBus);
        add('sawtooth', freq, .5, -6); add('sawtooth', freq, .5, 6);
        g.setValueAtTime(0, t); g.linearRampToValueAtTime(vol, t + Math.min(.5, dur * .4));
        g.setValueAtTime(vol, t + dur * .8); g.linearRampToValueAtTime(0, t + dur + .4); end = t + dur + .45; break;
      }
      default: {
        add('sine', freq, 1);
        g.setValueAtTime(0, t); g.linearRampToValueAtTime(vol, t + .005);
        g.exponentialRampToValueAtTime(.0001, t + dur); end = t + dur + .05;
      }
    }
    osc.forEach((o) => { o.start(t); o.stop(end); });
  },
  noise(t, dur, vol, type, freq, bus, q) {
    const c = this.ctx; if (!c) return;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq || 1000; if (q) f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || this.bgmBus);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + .05);
  },
  drum(kind, t, vol) {
    const c = this.ctx; if (!c) return;
    if (kind === 'kick' || kind === 'taiko') {
      const o = c.createOscillator(); const g = c.createGain();
      const f0 = kind === 'kick' ? 120 : 95, f1 = kind === 'kick' ? 42 : 55, d = kind === 'kick' ? .28 : .5;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d * .8);
      g.gain.setValueAtTime(vol * (kind === 'kick' ? .55 : .8), t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g); g.connect(this.bgmBus); o.start(t); o.stop(t + d + .05);
      if (kind === 'taiko') this.noise(t, .12, vol * .12, 'lowpass', 600);
    } else if (kind === 'snare') {
      this.noise(t, .16, vol * .22, 'highpass', 1600);
    } else if (kind === 'hat') {
      this.noise(t, .05, vol * .09, 'highpass', 7000);
    }
  },
  /* ---- BGM ---- */
  prep(name) {
    const tr = TRACKS[name]; if (!tr) return null;
    if (tr._mel) return tr;
    const toks = tr.mel ? tr.mel.replace(/\|/g, ' ').split(/\s+/).filter(Boolean) : [];
    const mel = []; // {s, len, midi}
    for (let i = 0; i < toks.length; i++) {
      const tk = toks[i];
      if (tk === '.' || tk === '-') continue;
      const midi = noteToMidi(tk); if (midi == null) continue;
      let len = 1; while (toks[i + len] === '.') len++;
      mel.push({ s: i, len, midi: midi + tr.key });
    }
    tr._mel = mel;
    tr._steps = tr.chords.length * 8;
    return tr;
  },
  playBGM(name) {
    if (!this.ctx) { this.curName = name; return; }
    if (name === this.curName && this.timer) return;
    this.stopBGM(true);
    if (!name || name === 'stop' || !TRACKS[name]) { this.curName = null; return; }
    this.cur = this.prep(name); this.curName = name;
    this.step = 0; this.nextTime = this.ctx.currentTime + .15;
    this.bgmBus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.bgmBus.gain.setValueAtTime(0, this.ctx.currentTime);
    this.bgmBus.gain.linearRampToValueAtTime(this.vol.bgm * 1.1, this.ctx.currentTime + 1.2);
    this.timer = setInterval(() => this.schedule(), 30);
    this.schedule();
  },
  stopBGM(fast) {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.ctx && this.bgmBus) {
      const t = this.ctx.currentTime;
      this.bgmBus.gain.cancelScheduledValues(t);
      this.bgmBus.gain.setValueAtTime(this.bgmBus.gain.value, t);
      this.bgmBus.gain.linearRampToValueAtTime(0, t + (fast ? .25 : 1));
    }
    if (!fast) this.curName = null;
  },
  schedule() {
    const tr = this.cur; if (!tr || !this.ctx) return;
    const sd = 60 / tr.bpm / 2;
    if (this.nextTime < this.ctx.currentTime - .1) this.nextTime = this.ctx.currentTime + .05;
    while (this.nextTime < this.ctx.currentTime + .18) {
      const st = this.step % tr._steps, bar = Math.floor(st / 8), inBar = st % 8, t = this.nextTime;
      const tones = chordTones(tr.chords[bar]).map((x) => x + tr.key);
      if (tr.arp) {
        const idx = tr.arp[inBar];
        const midi = tones[idx % tones.length] + 12 * Math.floor(idx / tones.length) + (tr.arpOct + 1) * 12;
        this.tone(tr.arpInst, mtof(midi), t, sd * 1.8, tr.arpVol);
      }
      if (tr.pad && inBar === 0) tones.slice(0, 3).forEach((x) => this.tone('pad', mtof(x + 48), t, sd * 8, tr.pad));
      if (tr.bass) {
        const ch = tr.bass[inBar];
        if (ch === 'x' || ch === 'o') {
          let len = 1; while (len < 8 - inBar && tr.bass[inBar + len] === '.') len++;
          const root = tones[0] + 36 + (ch === 'o' ? 7 : 0);
          this.tone('bass', mtof(root), t, sd * len * .95, tr.bassVol);
        }
      }
      const dv = tr.drumVol || .4;
      if (tr.kick && tr.kick[inBar] === 'x') this.drum('kick', t, dv);
      if (tr.taiko && tr.taiko[inBar] === 'x') this.drum('taiko', t, dv);
      if (tr.snare && tr.snare[inBar] === 'x') this.drum('snare', t, dv);
      if (tr.hat && tr.hat[inBar] === 'x') this.drum('hat', t, dv);
      for (const n of tr._mel) if (n.s === st) this.tone(tr.melInst, mtof(n.midi), t, sd * n.len, tr.melVol);
      this.nextTime += sd; this.step++;
    }
  },
  /* ---- 効果音 ---- */
  se(name) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + .01, B = this.seBus;
    switch (name) {
      case 'click': this.tone('sine', 1320, t, .05, .06, B); break;
      case 'select': this.tone('bell', 988, t, .12, .1, B); this.tone('bell', 1318, t + .07, .2, .09, B); break;
      case 'cancel': this.tone('bell', 660, t, .1, .08, B); this.tone('bell', 494, t + .06, .15, .07, B); break;
      case 'heart': [72, 76, 79, 84].forEach((m, i) => this.tone('bell', mtof(m + 12), t + i * .06, .3, .08, B)); break;
      case 'down': this.tone('piano', mtof(64), t, .2, .1, B); this.tone('piano', mtof(60), t + .12, .3, .09, B); break;
      case 'save': [79, 84].forEach((m, i) => this.tone('bell', mtof(m), t + i * .08, .3, .1, B)); break;
      case 'door': this.noise(t, .25, .5, 'lowpass', 400, B); this.tone('sine', 110, t, .2, .2, B); break;
      case 'wave': {
        const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noiseBuf;
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
        const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35, t + .9); g.gain.linearRampToValueAtTime(0, t + 2.6);
        s.connect(f); f.connect(g); g.connect(B); s.start(t); s.stop(t + 2.7); break;
      }
      case 'boom': this.noise(t, 1.2, .7, 'lowpass', 500, B); this.tone('sine', 60, t, .6, .5, B); this.noise(t + .05, .9, .12, 'highpass', 3000, B); break;
      case 'shock': this.tone('sine', 80, t, .4, .5, B); this.noise(t, .3, .3, 'lowpass', 900, B); this.tone('bell', mtof(49), t, .5, .12, B); break;
      case 'bell': this.tone('bell', mtof(55), t, 2, .2, B); this.tone('bell', mtof(62), t + .02, 2, .1, B); break;
      case 'splash': this.noise(t, .5, .45, 'highpass', 900, B); this.noise(t + .1, .6, .25, 'bandpass', 2000, B); break;
      case 'phone': for (let i = 0; i < 4; i++) { this.tone('sine', 1100, t + i * .12, .08, .08, B); this.tone('sine', 1300, t + i * .12 + .04, .06, .06, B); } break;
      case 'cicada': this.noise(t, 2.5, .08, 'bandpass', 4200, B, 8); break;
      case 'piano': [60, 64, 67, 72, 76, 79].forEach((m, i) => this.tone('piano', mtof(m), t + i * .14, .8, .1, B)); break;
      case 'step': this.noise(t, .08, .25, 'lowpass', 600, B); this.noise(t + .3, .08, .22, 'lowpass', 600, B); break;
      default: break;
    }
  },
  rain(on) {
    if (!this.ctx) return;
    if (on && !this.rainNode) {
      const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = .4;
      const g = c.createGain(); g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(.16, c.currentTime + 1.5);
      s.connect(f); f.connect(g); g.connect(this.seBus); s.start();
      this.rainNode = { s, g };
    } else if (!on && this.rainNode) {
      const n = this.rainNode, t = this.ctx.currentTime; this.rainNode = null;
      n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(n.g.gain.value, t); n.g.gain.linearRampToValueAtTime(0, t + 1);
      setTimeout(() => { try { n.s.stop(); } catch (e) { /* noop */ } }, 1200);
    }
  }
};

/* =========================================================
   3. グラフィック：キャラクター
   ========================================================= */
const CHARA = {
  hi: {
    name: '陽葵', full: '朝比奈 陽葵', kana: 'あさひな ひまり', color: '#ff9442',
    hair: '#e98b4a', hairS: '#b45a25', hairH: '#ffc896', eye: '#e07a22', eyeD: '#7a3508', eyeL: '#ffc46b',
    ribbon: '#ff7a45', def: 'casual',
    prof: '隣の家に住む幼なじみ。水泳部のエースで、いつも元気いっぱい。昔から湊を振り回してばかりだけど、この夏はどこか様子が違う。',
    birth: '7月7日 / 高校2年', like: '泳ぐこと・ラムネ・駄菓子屋'
  },
  sz: {
    name: '雫', full: '白鷺 雫', kana: 'しらさぎ しずく', color: '#6d8cf0',
    hair: '#343d6b', hairS: '#1b2044', hairH: '#6b79b8', eye: '#4064c8', eyeD: '#16245c', eyeL: '#9fc0ff',
    ribbon: '#4a78d8', def: 'uni',
    prof: 'クラスメイト。夏休みも図書室に通い続け、「図書室の幽霊」と噂されている。物静かだけど、ノートの中には誰にも見せない物語が眠っている。',
    birth: '11月3日 / 高校2年', like: '本・雨の音・ミルクティー'
  },
  re: {
    name: '玲奈', full: '神崎 玲奈', kana: 'かんざき れいな', color: '#e0587a',
    hair: '#a3334c', hairS: '#62172b', hairH: '#e0768e', eye: '#7c4cc4', eyeD: '#2f1466', eyeL: '#c7a6ff',
    ribbon: '#d13a5a', def: 'uni',
    prof: '一学年上の生徒会長。成績優秀、品行方正、隙のない完璧超人……と誰もが思っている。夏祭りの実行委員長も務める。',
    birth: '2月14日 / 高校3年', like: '秩序・紅茶・（本人いわく）特になし'
  },
  lu: {
    name: 'ルナ', full: '月城 ルナ', kana: 'つきしろ るな', color: '#7fc9ee',
    hair: '#eef2f9', hairS: '#aab5ce', hairH: '#ffffff', eye: '#4f9fd6', eyeD: '#163f6e', eyeL: '#bfe6ff',
    ribbon: '#7cc4e8', def: 'dress',
    prof: '夕暮れの灯台にだけ現れる、白いワンピースの少女。町では「灯台の幽霊」と噂されている。なぜか湊の名前を知っていた。',
    birth: '9月9日 / 高校2年', like: '夕焼け・海の音・古いオルゴール'
  }
};
const HEROINES = ['hi', 'sz', 're', 'lu'];

const SKIN = '#fde5d7', SKIN_S = '#f1c3ad', LINE = '#3a2320';
let svgUid = 0;

const EXPR = {
  normal:   { eye: 'open', brow: 'normal', mouth: 'small', blush: 0 },
  smile:    { eye: 'open', brow: 'normal', mouth: 'smile', blush: 0 },
  laugh:    { eye: 'happy', brow: 'up', mouth: 'grin', blush: 1 },
  talk:     { eye: 'open', brow: 'normal', mouth: 'open', blush: 0 },
  blush:    { eye: 'open', brow: 'sad', mouth: 'small', blush: 2 },
  shy:      { eye: 'half', brow: 'sad', mouth: 'smile', blush: 2, look: 1 },
  surprise: { eye: 'wide', brow: 'up', mouth: 'o', blush: 0 },
  panic:    { eye: 'wide', brow: 'sad', mouth: 'wavy', blush: 2, sweat: 1 },
  sad:      { eye: 'half', brow: 'sad', mouth: 'frown', blush: 0 },
  cry:      { eye: 'open', brow: 'sad', mouth: 'frown', blush: 1, tears: 1 },
  tearsmile:{ eye: 'happy', brow: 'sad', mouth: 'smile', blush: 1, tears: 1 },
  angry:    { eye: 'open', brow: 'angry', mouth: 'frown', blush: 0 },
  pout:     { eye: 'half', brow: 'angry', mouth: 'pout', blush: 1 },
  think:    { eye: 'half', brow: 'normal', mouth: 'flat', blush: 0, look: -1 },
  wink:     { eye: 'wink', brow: 'up', mouth: 'grin', blush: 1 },
  serious:  { eye: 'open', brow: 'angry', mouth: 'flat', blush: 0 },
  closed:   { eye: 'closed', brow: 'normal', mouth: 'smile', blush: 0 },
  sleep:    { eye: 'closed', brow: 'sad', mouth: 'o', blush: 0 },
  troubled: { eye: 'open', brow: 'sad', mouth: 'wavy', blush: 0, sweat: 1 },
  smug:     { eye: 'half', brow: 'up', mouth: 'smile', blush: 0 },
  love:     { eye: 'happy', brow: 'sad', mouth: 'smile', blush: 2 }
};

function eyeSVG(cx, cy, mode, c, u, side, look) {
  const lx = cx + (look || 0) * 4;
  const lash = `stroke="${LINE}" stroke-linecap="round" fill="none"`;
  const upper = side < 0
    ? `M${cx - 23} ${cy - 4} Q${cx - 6} ${cy - 27} ${cx + 21} ${cy - 13}`
    : `M${cx + 23} ${cy - 4} Q${cx + 6} ${cy - 27} ${cx - 21} ${cy - 13}`;
  const flick = side < 0
    ? `M${cx - 22} ${cy - 5} l-7 3`
    : `M${cx + 22} ${cy - 5} l7 3`;
  if (mode === 'happy') return `<path d="M${cx - 18} ${cy + 4} Q${cx} ${cy - 16} ${cx + 18} ${cy + 4}" ${lash} stroke-width="5"/>`;
  if (mode === 'closed') return `<path d="M${cx - 19} ${cy} Q${cx} ${cy + 12} ${cx + 19} ${cy}" ${lash} stroke-width="4.5"/><path d="${flick}" ${lash} stroke-width="3"/>`;
  const wide = mode === 'wide';
  const irx = wide ? 12 : 14.5, iry = wide ? 16 : 19.5;
  let s = '';
  s += `<ellipse cx="${cx}" cy="${cy + 3}" rx="19.5" ry="22" fill="#fff"/>`;
  s += `<ellipse cx="${lx}" cy="${cy + 5}" rx="${irx}" ry="${iry}" fill="url(#ig${u})"/>`;
  s += `<ellipse cx="${lx}" cy="${cy + 6}" rx="${irx * .5}" ry="${iry * .52}" fill="${c.eyeD}" opacity=".85"/>`;
  s += `<ellipse cx="${lx}" cy="${cy + 15}" rx="${irx * .7}" ry="${iry * .3}" fill="${c.eyeL}" opacity=".55"/>`;
  s += `<circle cx="${lx - 5}" cy="${cy - 3}" r="${wide ? 4 : 5.5}" fill="#fff"/>`;
  s += `<circle cx="${lx + 6}" cy="${cy + 13}" r="2.6" fill="#fff" opacity=".85"/>`;
  s += `<path d="M${cx - 19} ${cy - 6} Q${cx} ${cy - 20} ${cx + 19} ${cy - 6}" fill="${LINE}" opacity=".18"/>`;
  s += `<path d="${upper}" ${lash} stroke-width="5.5"/><path d="${flick}" ${lash} stroke-width="3.5"/>`;
  s += `<path d="M${cx - 12} ${cy + 26} Q${cx} ${cy + 29} ${cx + 12} ${cy + 26}" ${lash} stroke-width="1.6" opacity=".55"/>`;
  if (mode === 'half') {
    s += `<path d="M${cx - 26} ${cy - 30} L${cx + 26} ${cy - 30} L${cx + 26} ${cy - 1} Q${cx} ${cy - 9} ${cx - 26} ${cy - 1} Z" fill="${SKIN}"/>`;
    s += `<path d="M${cx - 22} ${cy - 1} Q${cx} ${cy - 10} ${cx + 22} ${cy - 1}" ${lash} stroke-width="5"/>`;
  }
  return s;
}

function browSVG(kind) {
  const st = `stroke="${LINE}" stroke-width="3.6" stroke-linecap="round" fill="none" opacity=".82"`;
  switch (kind) {
    case 'angry': return `<path d="M140 196 L178 209" ${st}/><path d="M260 196 L222 209" ${st}/>`;
    case 'sad': return `<path d="M140 206 Q158 202 177 193" ${st}/><path d="M260 206 Q242 202 223 193" ${st}/>`;
    case 'up': return `<path d="M140 193 Q158 184 177 190" ${st}/><path d="M260 193 Q242 184 223 190" ${st}/>`;
    default: return `<path d="M140 201 Q158 194 177 199" ${st}/><path d="M260 201 Q242 194 223 199" ${st}/>`;
  }
}

function mouthSVG(kind) {
  const st = `stroke="#9c4452" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;
  switch (kind) {
    case 'smile': return `<path d="M186 291 Q200 302 214 291" ${st} fill="none"/>`;
    case 'grin': return `<path d="M183 289 Q200 314 217 289 Q200 295 183 289 Z" fill="#b34455" ${st}/><path d="M191 302 Q200 308 209 302 Q200 299 191 302 Z" fill="#ff8f9c"/>`;
    case 'open': return `<path d="M190 290 Q200 306 210 290 Q200 293 190 290 Z" fill="#b34455" ${st}/>`;
    case 'o': return `<ellipse cx="200" cy="297" rx="6.5" ry="8" fill="#b34455" ${st}/>`;
    case 'frown': return `<path d="M188 298 Q200 289 212 298" ${st} fill="none"/>`;
    case 'pout': return `<path d="M192 293 Q198 288 202 293 Q206 288 211 293" ${st} fill="none"/>`;
    case 'wavy': return `<path d="M184 295 q4 -5 8 0 q4 5 8 0 q4 -5 8 0 q4 5 8 0" ${st} fill="none"/>`;
    case 'flat': return `<path d="M191 295 L209 295" ${st} fill="none"/>`;
    default: return `<path d="M192 294 Q200 298 208 294" ${st} fill="none"/>`;
  }
}

/* ---- 髪型 ---- */
function hairBack(id, u) {
  const f = `fill="url(#hg${u})"`;
  switch (id) {
    case 'hi': return `
      <path d="M284 150 C336 138 356 206 346 262 C338 306 322 336 300 356 C314 306 316 252 298 206 Z" ${f}/>
      <path d="M110 214 C98 122 150 78 200 78 C254 78 304 122 292 216 C290 262 284 300 272 322 L250 300 L150 300 L128 322 C116 300 112 262 110 214 Z" ${f}/>`;
    case 'sz': return `
      <path d="M108 200 C96 108 150 74 200 74 C250 74 304 108 292 200 C300 300 312 420 320 560 L80 560 C88 420 100 300 108 200 Z" ${f}/>`;
    case 're': return `
      <path d="M244 92 C330 76 356 170 340 262 C328 334 332 420 356 506 C312 452 290 360 300 266 C306 196 290 134 244 112 Z" ${f}/>
      <path d="M108 206 C98 120 150 78 200 78 C250 78 302 120 292 206 C292 252 286 292 278 314 L122 314 C114 292 108 252 108 206 Z" ${f}/>`;
    case 'lu': return `
      <path d="M106 200 C92 108 150 72 200 72 C250 72 308 108 294 200 C306 290 322 380 312 468 C330 508 318 540 332 560 L68 560 C82 540 70 508 88 468 C78 380 94 290 106 200 Z" ${f}/>`;
    default: return '';
  }
}

function hairFront(id, u, c) {
  const f = `fill="url(#hg${u})"`;
  const hl = `<path d="M136 128 Q200 104 264 128" stroke="${c.hairH}" stroke-width="7" fill="none" opacity=".55" stroke-linecap="round"/>`;
  switch (id) {
    case 'hi': return `
      <path d="M112 212 C108 240 116 292 134 324 C128 282 126 244 134 206 Z" ${f}/>
      <path d="M288 212 C292 240 284 292 266 324 C272 282 274 244 266 206 Z" ${f}/>
      <path d="M112 206 C108 130 150 88 200 88 C252 88 294 128 290 206 L277 172 L263 214 L247 162 L228 208 L211 152 L192 205 L174 154 L157 209 L141 166 L127 214 Z" ${f}/>
      ${hl}
      <circle cx="289" cy="163" r="10" fill="#ffcf3f"/><circle cx="289" cy="163" r="4" fill="#ff9f1c"/>
      <path d="M150 140 l16 -6 M152 150 l16 -6" stroke="#ffcf3f" stroke-width="4" stroke-linecap="round"/>`;
    case 'sz': return `
      <path d="M112 196 L108 336 C118 344 130 344 138 336 L136 208 Z" ${f}/>
      <path d="M288 196 L292 336 C282 344 270 344 262 336 L264 208 Z" ${f}/>
      <path d="M112 210 C106 126 150 84 200 84 C250 84 294 126 288 210 C272 204 252 202 232 207 L222 202 C208 207 192 207 178 202 L168 207 C148 202 128 204 112 210 Z" ${f}/>
      ${hl}
      <g transform="translate(262 146)"><path d="M0 -9 L3 -3 L9 -3 L4 1 L6 8 L0 4 L-6 8 L-4 1 L-9 -3 L-3 -3 Z" fill="#fff4b8" stroke="#e6c35c" stroke-width="1.2"/></g>`;
    case 're': return `
      <path d="M112 202 C104 262 110 334 124 384 C130 334 128 262 132 212 Z" ${f}/>
      <path d="M288 202 C296 262 290 334 276 384 C270 334 272 262 268 212 Z" ${f}/>
      <path d="M112 212 C106 128 150 86 200 86 C252 86 294 128 290 210 L281 182 C273 202 262 212 250 216 C257 190 251 160 237 140 C230 176 210 200 180 213 C196 190 200 160 196 140 C176 170 150 196 121 214 Z" ${f}/>
      ${hl}
      <path d="M232 86 L208 70 L212 96 Z M232 86 L258 70 L254 96 Z" fill="#1d1d2e"/><circle cx="232" cy="86" r="6" fill="#2d2d44"/>`;
    case 'lu': return `
      <path d="M112 200 C100 250 116 300 104 350 C122 320 134 280 134 212 Z" ${f}/>
      <path d="M288 200 C300 250 284 300 296 350 C278 320 266 280 266 212 Z" ${f}/>
      <path d="M112 216 C104 130 150 84 200 84 C250 84 296 130 288 216 C280 192 270 178 258 170 C262 192 256 208 246 220 C240 192 226 170 208 158 L200 152 L192 158 C174 170 160 192 154 220 C144 208 138 192 142 170 C130 178 120 192 112 216 Z" ${f}/>
      ${hl}`;
    default: return '';
  }
}

function hatSVG() {
  return `
    <path d="M128 110 C132 58 172 38 200 38 C228 38 268 58 272 110 Z" fill="#f1d796"/>
    <path d="M130 100 C170 88 230 88 270 100 L271 112 C230 100 170 100 129 112 Z" fill="#7cc4e8"/>
    <ellipse cx="200" cy="112" rx="152" ry="30" fill="#f5dfa5"/>
    <ellipse cx="200" cy="110" rx="118" ry="18" fill="#e9cb86" opacity=".7"/>
    <path d="M60 116 Q200 150 340 116" stroke="#d7b670" stroke-width="3" fill="none" opacity=".6"/>`;
}

function flowerPin(x, y, col) {
  let s = `<g transform="translate(${x} ${y})">`;
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5 - Math.PI / 2;
    s += `<circle cx="${(Math.cos(a) * 9).toFixed(1)}" cy="${(Math.sin(a) * 9).toFixed(1)}" r="8" fill="${col}"/>`;
  }
  return s + `<circle r="5" fill="#fff3a8"/></g>`;
}

/* ---- 服装 ---- */
const BODY = 'M200 358 C162 358 140 364 122 378 C88 396 64 440 54 560 L346 560 C336 440 312 396 278 378 C260 364 238 358 200 358 Z';
function outfitSVG(id, outfit, u, c) {
  const shadeL = (col) => `<path d="M122 378 C96 392 76 430 66 560 L102 560 C106 470 114 420 132 390 Z" fill="${col}"/>`;
  const shadeR = (col) => `<path d="M278 378 C304 392 324 430 334 560 L298 560 C294 470 286 420 268 390 Z" fill="${col}"/>`;
  if (outfit === 'yukata') {
    const Y = {
      hi: { base: '#2c4d8f', dark: '#1b3163', pat: '#ffa24c', obi: '#ffcf3f' },
      sz: { base: '#f4f6ff', dark: '#b7c2e6', pat: '#7da2ea', obi: '#3d5aa8' },
      re: { base: '#23202e', dark: '#0f0d16', pat: '#d93a5a', obi: '#c9a24a' },
      lu: { base: '#d9d2f2', dark: '#a79ccf', pat: '#ffffff', obi: '#5d7fc9' }
    }[id] || { base: '#2c4d8f', dark: '#1b3163', pat: '#fff', obi: '#f90' };
    let pat = '';
    const pts = [[104, 452], [292, 432], [150, 520], [258, 506], [80, 530], [322, 528], [236, 470], [168, 468], [118, 400], [286, 392]];
    pts.forEach(([x, y], i) => {
      pat += `<g transform="translate(${x} ${y}) rotate(${i * 23})" opacity=".92">`;
      for (let k = 0; k < 5; k++) {
        const a = k * Math.PI * 2 / 5;
        pat += `<ellipse cx="${(Math.cos(a) * 8).toFixed(1)}" cy="${(Math.sin(a) * 8).toFixed(1)}" rx="7" ry="5" transform="rotate(${k * 72} ${(Math.cos(a) * 8).toFixed(1)} ${(Math.sin(a) * 8).toFixed(1)})" fill="${Y.pat}"/>`;
      }
      pat += `<circle r="3.5" fill="${Y.obi}"/></g>`;
    });
    return `
      <clipPath id="bc${u}"><path d="${BODY}"/></clipPath>
      <path d="${BODY}" fill="${Y.base}"/>
      <g clip-path="url(#bc${u})">${pat}${shadeL(Y.dark + '66')}${shadeR(Y.dark + '66')}
        <rect x="40" y="524" width="320" height="40" fill="${Y.obi}"/><rect x="40" y="532" width="320" height="5" fill="#fff" opacity=".35"/>
        <path d="M200 446 L238 560" stroke="${Y.dark}" stroke-width="3" fill="none"/>
      </g>
      <path d="M172 360 L200 420 L228 360 Z" fill="${SKIN}"/>
      <path d="M166 360 L200 432 L234 360" stroke="#fff" stroke-width="8" fill="none" stroke-linejoin="round"/>
      <path d="M156 362 L200 450 L244 362" stroke="${Y.dark}" stroke-width="9" fill="none" stroke-linejoin="round"/>`;
  }
  if (outfit === 'uni') {
    const arm = id === 're'
      ? `<g transform="rotate(-14 94 466)"><rect x="62" y="450" width="64" height="30" rx="3" fill="#c0283f"/><text x="94" y="471" font-size="15" font-weight="700" fill="#fff" text-anchor="middle" font-family="sans-serif">生徒会</text></g>`
      : '';
    return `
      <path d="${BODY}" fill="#fbfbff"/>
      ${shadeL('#e3e6f2')}${shadeR('#e3e6f2')}
      <path d="M178 364 L200 412 L222 364 Z" fill="${SKIN}"/>
      <path d="M96 398 L170 363 L200 466 L230 363 L304 398 L266 434 L200 508 L134 434 Z" fill="#26335e"/>
      <path d="M113 406 L200 490 L287 406" stroke="#fff" stroke-width="3.5" fill="none"/>
      <path d="M200 468 L166 452 L170 490 Z" fill="${c.ribbon}"/><path d="M200 468 L234 452 L230 490 Z" fill="${c.ribbon}"/>
      <path d="M196 472 L182 534 L200 524 Z" fill="${c.ribbon}"/><path d="M204 472 L218 534 L200 524 Z" fill="${c.ribbon}"/>
      <circle cx="200" cy="470" r="8" fill="${c.ribbon}"/><circle cx="198" cy="468" r="3" fill="#fff" opacity=".35"/>
      ${arm}`;
  }
  if (outfit === 'dress' || outfit === 'dress2') {
    return `
      <path d="${BODY}" fill="${SKIN}"/>
      <path d="M160 374 Q180 382 196 378 M240 374 Q220 382 204 378" stroke="${SKIN_S}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M88 452 Q200 428 312 452 L326 560 L74 560 Z" fill="#ffffff"/>
      <path d="M88 452 Q200 428 312 452 L310 468 Q200 446 90 468 Z" fill="#e8eef8"/>
      <path d="M138 380 L126 452 M262 380 L274 452" stroke="#ffffff" stroke-width="9" stroke-linecap="round"/>
      <path d="M200 446 L178 434 L180 460 Z M200 446 L222 434 L220 460 Z" fill="${c.ribbon}"/><circle cx="200" cy="447" r="6" fill="${c.ribbon}"/>
      <path d="M96 500 Q200 486 304 500" stroke="#dfe7f3" stroke-width="3" fill="none"/>`;
  }
  /* casual */
  if (id === 'hi') return `
      <path d="${BODY}" fill="#ffffff"/>
      <path d="M68 470 Q200 452 332 470 L334 494 Q200 476 66 494 Z" fill="#ffb35c"/>
      <path d="M172 364 Q200 392 228 364" stroke="#e1e1ea" stroke-width="6" fill="none"/>
      <path d="M54 560 C62 450 86 400 124 380 L156 370 C148 420 150 500 162 560 Z" fill="#7cc8ea"/>
      <path d="M346 560 C338 450 314 400 276 380 L244 370 C252 420 250 500 238 560 Z" fill="#7cc8ea"/>
      <path d="M156 370 C148 420 150 500 162 560 M244 370 C252 420 250 500 238 560" stroke="#5aa9cf" stroke-width="3" fill="none"/>`;
  if (id === 'sz') return `
      <path d="${BODY}" fill="#fbfbff"/>
      <path d="M170 362 L200 394 L184 404 Z M230 362 L200 394 L216 404 Z" fill="#fff" stroke="#d6d9e6" stroke-width="2"/>
      <path d="M54 560 C62 450 86 400 124 380 L166 366 C170 420 176 500 180 560 Z" fill="#b8a8e2"/>
      <path d="M346 560 C338 450 314 400 276 380 L234 366 C230 420 224 500 220 560 Z" fill="#b8a8e2"/>
      <circle cx="176" cy="450" r="4" fill="#fff"/><circle cx="178" cy="500" r="4" fill="#fff"/>`;
  if (id === 're') return `
      <path d="${BODY}" fill="#5c2334"/>
      ${shadeL('#471a28')}${shadeR('#471a28')}
      <path d="M160 362 Q180 392 200 380 Q220 392 240 362 Q222 404 200 396 Q178 404 160 362 Z" fill="#fff"/>
      <circle cx="200" cy="420" r="5" fill="#c9a24a"/>`;
  return `<path d="${BODY}" fill="#fff"/>`;
}

/* ---- 立ち絵本体 ---- */
function charaSVG(id, expr, outfit, opt) {
  const c = CHARA[id];
  if (!c) return '';
  opt = opt || {};
  const e = EXPR[expr] || EXPR.normal;
  const u = id + (++svgUid);
  const of = outfit || c.def;
  const vb = opt.face ? '104 92 192 192' : '0 0 400 560';
  const look = e.look || 0;
  let eyes;
  const big = (cx, svg) => `<g transform="translate(${cx} 238) scale(1.14) translate(${-cx} -238)">${svg}</g>`;
  if (e.eye === 'wink') eyes = big(160, eyeSVG(160, 236, 'open', c, u, -1, look)) + big(240, eyeSVG(240, 236, 'happy', c, u, 1, look));
  else eyes = big(160, eyeSVG(160, 236, e.eye, c, u, -1, look)) + big(240, eyeSVG(240, 236, e.eye, c, u, 1, look));
  let blush = '';
  if (e.blush) {
    blush = `<ellipse cx="150" cy="272" rx="20" ry="8" fill="#ff7f93" opacity="${e.blush > 1 ? .5 : .3}"/><ellipse cx="250" cy="272" rx="20" ry="8" fill="#ff7f93" opacity="${e.blush > 1 ? .5 : .3}"/>`;
    if (e.blush > 1) blush += `<path d="M138 268 l-5 8 M148 268 l-5 8 M158 268 l-5 8 M242 268 l-5 8 M252 268 l-5 8 M262 268 l-5 8" stroke="#e8536d" stroke-width="2" stroke-linecap="round" opacity=".6"/>`;
  }
  const tears = e.tears ? `<path d="M150 262 Q145 280 150 292 Q157 280 150 262 Z" fill="#bfe6ff" opacity=".9"/><path d="M250 262 Q245 282 250 296 Q257 282 250 262 Z" fill="#bfe6ff" opacity=".9"/>` : '';
  const sweat = e.sweat ? `<path d="M284 176 Q274 196 284 204 Q294 196 284 176 Z" fill="#cdeeff" stroke="#8fc6e8" stroke-width="1.5"/>` : '';
  const glasses = id === 'sz' ? `<g fill="none" stroke="#5d4a52" stroke-width="3" opacity=".85"><rect x="130" y="210" width="60" height="50" rx="18"/><rect x="210" y="210" width="60" height="50" rx="18"/><path d="M190 230 Q200 224 210 230"/></g><path d="M138 218 L150 214" stroke="#fff" stroke-width="3" opacity=".7" stroke-linecap="round"/><path d="M218 218 L230 214" stroke="#fff" stroke-width="3" opacity=".7" stroke-linecap="round"/>` : '';
  const acc = of === 'yukata' ? flowerPin(id === 'hi' ? 132 : 270, 140, id === 're' ? '#e0475f' : id === 'sz' ? '#8fb2f0' : id === 'lu' ? '#b8c8f4' : '#ffb0c2') : '';
  const hat = (id === 'lu' && of === 'dress' && !opt.face) ? hatSVG() : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="xMidYMax meet">
    <defs>
      <linearGradient id="hg${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.hairH}"/><stop offset=".3" stop-color="${c.hair}"/><stop offset="1" stop-color="${c.hairS}"/></linearGradient>
      <linearGradient id="ig${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.eyeD}"/><stop offset=".55" stop-color="${c.eye}"/><stop offset="1" stop-color="${c.eyeL}"/></linearGradient>
    </defs>
    ${hairBack(id, u)}
    ${outfitSVG(id, of, u, c)}
    <path d="M180 300 L180 372 Q200 384 220 372 L220 300 Z" fill="${SKIN}"/>
    <path d="M180 316 Q200 344 220 316 L220 340 Q200 356 180 340 Z" fill="${SKIN_S}" opacity=".85"/>
    <path d="M124 196 C124 262 152 314 200 334 C248 314 276 262 276 196 C276 132 244 104 200 104 C156 104 124 132 124 196 Z" fill="${SKIN}"/>
    <path d="M126 196 Q200 226 274 196 L274 180 L126 180 Z" fill="${SKIN_S}" opacity=".35"/>
    ${blush}
    ${eyes}
    <path d="M201 262 l-3 6" stroke="${SKIN_S}" stroke-width="2.5" stroke-linecap="round"/>
    ${mouthSVG(e.mouth)}
    ${tears}
    ${hairFront(id, u, c)}
    ${browSVG(e.brow)}
    ${glasses}
    ${acc}
    ${hat}
    ${sweat}
  </svg>`;
}

/* =========================================================
   3b. グラフィック：背景
   ========================================================= */
const W = 1600, H = 900;
const SKY = {
  day:   ['#3d8fdc', '#7cc0f0', '#d7f0ff'],
  eve:   ['#2b2766', '#b1557f', '#ffb27a'],
  night: ['#050922', '#0f1a45', '#27336a']
};
const SEA = {
  day:   ['#46b4e0', '#1e6fb0'],
  eve:   ['#e69a8a', '#553a78'],
  night: ['#1d2a5e', '#070d2c']
};

function skySVG(t, horizon, u, seed) {
  const s = SKY[t] || SKY.day;
  let o = `<defs><linearGradient id="sk${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s[0]}"/><stop offset=".6" stop-color="${s[1]}"/><stop offset="1" stop-color="${s[2]}"/></linearGradient>
    <radialGradient id="sg${u}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6d8" stop-opacity=".95"/><stop offset=".25" stop-color="#ffd48a" stop-opacity=".6"/><stop offset="1" stop-color="#ff9a6a" stop-opacity="0"/></radialGradient></defs>`;
  o += `<rect width="${W}" height="${horizon + 20}" fill="url(#sk${u})"/>`;
  const r = seeded(seed || 7);
  if (t === 'night') {
    for (let i = 0; i < 120; i++) {
      const x = r() * W, y = r() * horizon * .95, rr = r() * 1.6 + .4;
      o += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(1)}" fill="#fff" opacity="${(r() * .6 + .3).toFixed(2)}"/>`;
    }
    o += `<circle cx="1260" cy="150" r="46" fill="#fff8dc"/><circle cx="1282" cy="136" r="44" fill="${s[0]}"/>`;
    o += `<circle cx="1260" cy="150" r="90" fill="#fff8dc" opacity=".06"/>`;
  } else if (t === 'eve') {
    o += `<circle cx="1000" cy="${horizon - 10}" r="260" fill="url(#sg${u})"/><circle cx="1000" cy="${horizon - 10}" r="62" fill="#fff1c9"/>`;
    for (let i = 0; i < 5; i++) {
      const y = 120 + i * 70 + r() * 30, x = r() * 900 + 100;
      o += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(180 + r() * 180).toFixed(0)}" ry="${(10 + r() * 8).toFixed(0)}" fill="#ffb3a1" opacity=".35"/>`;
    }
  } else {
    /* 入道雲 */
    const cloud = (cx, cy, sc) => {
      let g = `<g transform="translate(${cx} ${cy}) scale(${sc})" fill="#fff">`;
      [[0, 0, 110], [-120, 40, 80], [120, 40, 90], [-60, -70, 80], [60, -90, 95], [0, -160, 80], [200, 70, 60], [-200, 80, 50]].forEach(([x, y, rr]) => { g += `<circle cx="${x}" cy="${y}" r="${rr}"/>`; });
      g += `<rect x="-260" y="60" width="520" height="80" rx="40"/></g>`;
      g += `<g transform="translate(${cx} ${cy}) scale(${sc})" fill="#c9dcf0" opacity=".55"><ellipse cx="0" cy="110" rx="250" ry="34"/></g>`;
      return g;
    };
    o += cloud(1220, horizon - 150, 1.05) + cloud(300, horizon - 70, .55);
    o += `<ellipse cx="720" cy="130" rx="160" ry="16" fill="#fff" opacity=".6"/>`;
  }
  return o;
}

function seaSVG(t, y, u) {
  const s = SEA[t] || SEA.day;
  let o = `<defs><linearGradient id="se${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s[0]}"/><stop offset="1" stop-color="${s[1]}"/></linearGradient></defs>`;
  o += `<rect y="${y}" width="${W}" height="${H - y}" fill="url(#se${u})"/>`;
  const r = seeded(33);
  for (let i = 0; i < 40; i++) {
    const yy = y + 8 + Math.pow(r(), 1.6) * (H - y), x = r() * W, w = 20 + r() * 70 * (yy - y) / 200;
    o += `<rect x="${x.toFixed(0)}" y="${yy.toFixed(0)}" width="${w.toFixed(0)}" height="2" rx="1" fill="#fff" opacity="${t === 'night' ? .18 : .35}"/>`;
  }
  if (t === 'eve') o += `<path d="M960 ${y} L1040 ${y} L1120 ${H} L880 ${H} Z" fill="#ffe0a6" opacity=".35"/>`;
  if (t === 'night') o += `<path d="M1240 ${y} L1280 ${y} L1330 ${H} L1190 ${H} Z" fill="#fff8dc" opacity=".12"/>`;
  return o;
}

function tint(t, indoor) {
  if (t === 'eve') return `<rect width="${W}" height="${H}" fill="#ff8a4a" opacity="${indoor ? .16 : .1}" style="mix-blend-mode:multiply"/><rect width="${W}" height="${H}" fill="#6a3a8a" opacity=".12"/>`;
  if (t === 'night') return `<rect width="${W}" height="${H}" fill="#0a1040" opacity="${indoor ? .5 : .38}"/>`;
  return '';
}

function windowView(x, y, w, h, t, u) {
  return `<clipPath id="wv${u}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>
    <g clip-path="url(#wv${u})"><g transform="translate(${x + (w - W * (h / 560)) / 2} ${y}) scale(${h / 560})">${skySVG(t, 420, u + 'w', 3)}${seaSVG(t, 420, u + 'w')}</g></g>`;
}

const BG = {
  black: () => `<rect width="${W}" height="${H}" fill="#000"/>`,
  white: () => `<rect width="${W}" height="${H}" fill="#fff"/>`,
  memory: (t, u) => `<defs><radialGradient id="mm${u}" cx=".5" cy=".5" r=".7"><stop offset="0" stop-color="#fff5e6"/><stop offset="1" stop-color="#e9c9a8"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#mm${u})"/>${skySVG('day', 520, u, 5)}${seaSVG('day', 520, u)}<rect width="${W}" height="${H}" fill="#f6d9b0" opacity=".55"/><rect width="${W}" height="${H}" fill="none" stroke="#fff" stroke-width="120" opacity=".7"/>`,

  room: (t, u) => `
    <rect width="${W}" height="${H}" fill="#f2e6d2"/>
    <rect y="0" width="${W}" height="40" fill="#e6d6bd"/>
    ${windowView(540, 130, 520, 400, t, u)}
    <rect x="530" y="120" width="540" height="420" fill="none" stroke="#fff" stroke-width="20"/>
    <rect x="792" y="130" width="16" height="400" fill="#fff"/>
    <path d="M460 100 Q500 330 470 580 L560 580 Q540 330 560 100 Z" fill="#8fd0e8"/>
    <path d="M1140 100 Q1100 330 1130 580 L1040 580 Q1060 330 1040 100 Z" fill="#8fd0e8"/>
    <rect x="440" y="92" width="720" height="14" rx="7" fill="#c89b6d"/>
    <rect y="700" width="${W}" height="200" fill="#c99a6a"/>
    <path d="M0 740 H1600 M0 800 H1600 M0 860 H1600" stroke="#b5875a" stroke-width="3"/>
    <rect x="0" y="560" width="440" height="220" rx="16" fill="#fff"/>
    <rect x="0" y="600" width="440" height="200" rx="14" fill="#9ec9f0"/>
    <path d="M0 640 Q220 610 440 650" stroke="#86b4e0" stroke-width="6" fill="none"/>
    <rect x="30" y="560" width="160" height="50" rx="25" fill="#fff" stroke="#e3e3ea" stroke-width="3"/>
    <rect x="1240" y="520" width="360" height="30" fill="#b98556"/>
    <rect x="1260" y="550" width="20" height="200" fill="#a0724a"/><rect x="1560" y="550" width="20" height="200" fill="#a0724a"/>
    <rect x="1300" y="460" width="80" height="60" rx="6" fill="#3a3f5c"/><rect x="1306" y="466" width="68" height="46" fill="#7fa7d6"/>
    <path d="M1470 520 L1470 430 L1440 400" stroke="#555" stroke-width="6" fill="none"/><path d="M1400 390 L1480 390 L1460 430 L1420 430 Z" fill="#ffd27a"/>
    <rect x="1250" y="160" width="300" height="20" fill="#b98556"/><rect x="1250" y="280" width="300" height="20" fill="#b98556"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<rect x="${1262 + i * 30}" y="${95 + (i % 3) * 8}" width="24" height="${65 - (i % 3) * 8}" fill="${['#e76f51', '#2a9d8f', '#e9c46a', '#264653', '#f4a261', '#8ab17d', '#6d597a', '#b56576', '#457b9d'][i]}"/>`).join('')}
    <rect x="1270" y="200" width="90" height="80" rx="8" fill="#fff" opacity=".8"/><circle cx="1315" cy="238" r="22" fill="#ffb3c1"/>
    <rect x="80" y="160" width="220" height="300" fill="#fff" stroke="#e0d2bb" stroke-width="6"/>
    <rect x="96" y="176" width="188" height="200" fill="#9fd6ea"/><circle cx="190" cy="270" r="44" fill="#ffd27a"/>
    <rect x="96" y="390" width="188" height="10" fill="#f28ca0"/><rect x="96" y="410" width="120" height="8" fill="#ccc"/>
    ${tint(t, true)}`,

  town: (t, u) => `
    ${skySVG(t, 430, u, 11)}${seaSVG(t, 430, u)}
    <path d="M0 470 L600 430 L1000 430 L1600 470 L1600 900 L0 900 Z" fill="#a9a6a0"/>
    <path d="M560 900 L760 440 L840 440 L1040 900 Z" fill="#6f7179"/>
    <path d="M800 450 L800 480 M800 520 L800 570 M800 620 L800 700 M800 760 L800 880" stroke="#f6f2e2" stroke-width="8"/>
    <path d="M0 500 L560 450 L620 460 L120 900 L0 900 Z" fill="#dcd6c8"/>
    <path d="M1600 500 L1040 450 L980 460 L1480 900 L1600 900 Z" fill="#dcd6c8"/>
    <g><rect x="0" y="260" width="360" height="300" fill="#efe4d0"/><path d="M-20 270 L180 170 L380 270 Z" fill="#35506e"/>
      <rect x="40" y="330" width="90" height="80" fill="#8fc3e0" stroke="#fff" stroke-width="6"/><rect x="200" y="360" width="100" height="200" fill="#9b6b4a"/>
      <rect x="360" y="330" width="220" height="190" fill="#f7efe0"/><path d="M350 340 L470 270 L590 340 Z" fill="#8a4a3a"/><rect x="400" y="380" width="60" height="50" fill="#8fc3e0" stroke="#fff" stroke-width="5"/></g>
    <g><rect x="1240" y="250" width="360" height="310" fill="#f1ead9"/><path d="M1220 262 L1420 160 L1620 262 Z" fill="#6b3f36"/>
      <rect x="1300" y="320" width="90" height="80" fill="#8fc3e0" stroke="#fff" stroke-width="6"/>
      <rect x="1040" y="340" width="200" height="180" fill="#e9dcc3"/><path d="M1030 350 L1140 285 L1250 350 Z" fill="#35506e"/></g>
    <rect x="600" y="380" width="46" height="80" rx="4" fill="#d6283b"/><rect x="606" y="390" width="34" height="30" fill="#e8f4ff"/><rect x="606" y="428" width="34" height="6" fill="#fff"/>
    <path d="M300 60 L300 600 M1330 40 L1330 600" stroke="#4b4b52" stroke-width="16"/>
    <path d="M270 110 H330 M1300 90 H1360" stroke="#4b4b52" stroke-width="8"/>
    <path d="M0 150 Q150 190 300 118 Q800 250 1330 98 Q1470 140 1600 110" stroke="#2c2c34" stroke-width="3" fill="none"/>
    <path d="M0 175 Q150 215 300 140 Q800 280 1330 120 Q1470 165 1600 135" stroke="#2c2c34" stroke-width="3" fill="none"/>
    <path d="M40 620 L520 560 L520 590 L40 660 Z M1560 620 L1080 560 L1080 590 L1560 660 Z" fill="#c9c9cf"/>
    ${tint(t)}`,

  beach: (t, u) => `
    ${skySVG(t, 470, u, 17)}${seaSVG(t, 470, u)}
    <path d="M1320 470 L1360 380 L1480 350 L1600 360 L1600 470 Z" fill="${t === 'day' ? '#4f7a5a' : '#2a2f4a'}"/>
    <rect x="1440" y="250" width="30" height="110" fill="#fff"/><rect x="1436" y="236" width="38" height="18" fill="#d64545"/>
    <path d="M0 640 Q400 610 800 640 T1600 630 L1600 900 L0 900 Z" fill="${t === 'night' ? '#6f6a7c' : t === 'eve' ? '#e8b58f' : '#f1dcae'}"/>
    <path d="M0 640 Q400 610 800 640 T1600 630" stroke="#fff" stroke-width="10" fill="none" opacity=".8"/>
    <path d="M0 662 Q420 632 820 662 T1600 652" stroke="#fff" stroke-width="4" fill="none" opacity=".35"/>
    <path d="M60 900 Q140 760 300 740 Q420 760 460 900 Z" fill="${t === 'night' ? '#3a3548' : '#8a7a6a'}" opacity=".5"/>
    <g opacity="${t === 'night' ? .3 : 1}"><path d="M1180 820 L1240 600" stroke="#fff" stroke-width="6"/><path d="M1090 620 Q1240 520 1390 620 Z" fill="#ff7a7a"/><path d="M1140 620 Q1240 540 1290 620 Z" fill="#fff"/></g>
    <circle cx="420" cy="780" r="8" fill="#fff" opacity=".8"/><path d="M700 790 l20 -8 l6 16 Z" fill="#ffc0cb" opacity=".8"/>
    ${tint(t)}`,

  pool: (t, u) => `
    ${skySVG(t, 360, u, 21)}
    <rect x="0" y="120" width="${W}" height="260" fill="#f2f2ef"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => `<rect x="${40 + i * 130}" y="160" width="80" height="70" fill="#9ccbe6"/><rect x="${40 + i * 130}" y="260" width="80" height="70" fill="#9ccbe6"/>`).join('')}
    <rect x="0" y="360" width="${W}" height="90" fill="#dfe6e8"/>
    <path d="M0 360 V450 M60 360 V450" stroke="#8a9a9e" stroke-width="3"/>
    ${Array.from({ length: 40 }, (_, i) => `<path d="M${i * 40} 360 L${i * 40 + 40} 450 M${i * 40 + 40} 360 L${i * 40} 450" stroke="#9aa6aa" stroke-width="2"/>`).join('')}
    <rect x="0" y="450" width="${W}" height="60" fill="#e9e4dc"/>
    <path d="M0 510 H1600 L1600 900 L0 900 Z" fill="#35a7dd"/>
    <path d="M0 510 H1600 L1600 540 L0 540 Z" fill="#7fd0f0"/>
    ${[0, 1, 2, 3, 4].map((i) => { const x0 = 160 + i * 320; return `<path d="M${x0} 510 L${x0 + (x0 - 800) * .9} 900" stroke="#fff" stroke-width="10" stroke-dasharray="14 12"/><path d="M${x0} 510 L${x0 + (x0 - 800) * .9} 900" stroke="#e84a5f" stroke-width="10" stroke-dasharray="14 26" stroke-dashoffset="13"/>`; }).join('')}
    ${Array.from({ length: 30 }, (_, i) => `<path d="M${(i * 173) % 1600} ${560 + (i * 37) % 320} q20 -8 40 0" stroke="#fff" stroke-width="3" fill="none" opacity=".45"/>`).join('')}
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${60 + i * 300}" y="470" width="70" height="40" fill="#fff"/><rect x="${60 + i * 300}" y="470" width="70" height="10" fill="#3a6fa8"/>`).join('')}
    ${tint(t)}`,

  school: (t, u) => `
    <rect width="${W}" height="${H}" fill="#efe7d6"/>
    <rect x="0" y="0" width="${W}" height="60" fill="#e0d5bf"/>
    ${windowView(0, 110, 250, 460, t, u)}
    <rect x="0" y="100" width="260" height="480" fill="none" stroke="#fff" stroke-width="16"/><rect x="120" y="110" width="12" height="460" fill="#fff"/>
    <path d="M250 90 Q280 330 250 590 L300 590 Q290 330 300 90 Z" fill="#fff8e8"/>
    <rect x="420" y="140" width="920" height="380" fill="#2f5a45" stroke="#8a6a44" stroke-width="18"/>
    <rect x="430" y="512" width="900" height="16" fill="#8a6a44"/>
    <text x="520" y="260" font-size="46" fill="#f4f4ea" opacity=".85" font-family="sans-serif">8/17</text>
    <text x="520" y="330" font-size="34" fill="#f4f4ea" opacity=".6" font-family="sans-serif">夏休み 補習室</text>
    <path d="M1100 220 q40 -30 80 0 q-40 40 -80 0" stroke="#ffd0dc" stroke-width="4" fill="none" opacity=".6"/>
    <rect x="1400" y="200" width="140" height="200" fill="#d8c8a8"/><rect x="1410" y="210" width="120" height="120" fill="#f5f0e0"/>
    <rect y="620" width="${W}" height="280" fill="#c7a47a"/>
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="${140 + i * 290}" y="640" width="220" height="30" fill="#d9b98c"/><rect x="${150 + i * 290}" y="670" width="200" height="70" fill="#b58a5a"/><rect x="${160 + i * 290}" y="740" width="12" height="120" fill="#777"/><rect x="${328 + i * 290}" y="740" width="12" height="120" fill="#777"/>`).join('')}
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${0 + i * 290}" y="800" width="240" height="40" fill="#d9b98c"/><rect x="${10 + i * 290}" y="840" width="220" height="60" fill="#b58a5a"/>`).join('')}
    ${tint(t, true)}`,

  council: (t, u) => `
    <rect width="${W}" height="${H}" fill="#ece3d4"/>
    ${windowView(1180, 120, 380, 420, t, u)}
    <rect x="1170" y="110" width="400" height="440" fill="none" stroke="#fff" stroke-width="16"/><rect x="1364" y="120" width="12" height="420" fill="#fff"/>
    <rect x="160" y="130" width="700" height="340" fill="#fbfbf6" stroke="#b8b8c0" stroke-width="10"/>
    <text x="210" y="210" font-size="40" fill="#3050a0" font-family="sans-serif">汐見夏祭り 準備</text>
    <path d="M210 260 H600 M210 310 H520 M210 360 H640" stroke="#e05a7a" stroke-width="6" opacity=".7"/>
    <path d="M660 280 l20 20 l40 -50" stroke="#2a9d8f" stroke-width="8" fill="none"/>
    <rect x="920" y="150" width="200" height="420" fill="#b8a283"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="935" y="${170 + i * 100}" width="170" height="80" fill="#cdb998"/><rect x="${945 + (i % 2) * 40}" y="${185 + i * 100}" width="40" height="55" fill="${['#e76f51', '#457b9d', '#e9c46a', '#8ab17d'][i]}"/>`).join('')}
    <rect y="640" width="${W}" height="260" fill="#b99468"/>
    <rect x="200" y="620" width="1200" height="50" rx="6" fill="#8a6440"/><rect x="220" y="670" width="20" height="200" fill="#6a4a30"/><rect x="1360" y="670" width="20" height="200" fill="#6a4a30"/>
    ${[0, 1, 2].map((i) => `<rect x="${60 + i * 110}" y="${640 - i * 30}" width="100" height="90" fill="#d9c09a" stroke="#a88a60" stroke-width="4"/>`).join('')}
    ${[0, 1, 2, 3].map((i) => `<ellipse cx="${520 + i * 160}" cy="600" rx="40" ry="26" fill="${['#ffcf6a', '#ff8a8a', '#ffcf6a', '#ff8a8a'][i]}"/><path d="M${480 + i * 160} 600 H${560 + i * 160}" stroke="#9a3a2a" stroke-width="3"/>`).join('')}
    ${tint(t, true)}`,

  library: (t, u) => {
    const r = seeded(99);
    const shelf = (x0) => {
      let s = `<rect x="${x0}" y="80" width="520" height="620" fill="#6e4a2e"/>`;
      for (let row = 0; row < 5; row++) {
        const y = 100 + row * 120;
        s += `<rect x="${x0 + 10}" y="${y}" width="500" height="100" fill="#4a2f1b"/>`;
        let x = x0 + 14;
        while (x < x0 + 500) {
          const w = 14 + r() * 18, h = 60 + r() * 36;
          if (x + w > x0 + 506) break;
          s += `<rect x="${x.toFixed(0)}" y="${(y + 100 - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${['#8e3b46', '#2f4b7c', '#b08d57', '#3f6b50', '#6a4c93', '#c9b79c', '#d98c5f', '#274c5e'][Math.floor(r() * 8)]}"/>`;
          x += w + 2;
        }
      }
      return s;
    };
    return `<rect width="${W}" height="${H}" fill="#e8dcc6"/>
      ${shelf(0)}${shelf(1080)}
      ${windowView(590, 110, 420, 460, t, u)}
      <rect x="580" y="100" width="440" height="480" fill="none" stroke="#fff" stroke-width="16"/><rect x="794" y="110" width="12" height="460" fill="#fff"/>
      <path d="M560 90 Q600 330 570 600 L620 600 Q610 330 620 90 Z M1040 90 Q1000 330 1030 600 L980 600 Q990 330 980 90 Z" fill="#f1e6cf"/>
      <rect y="700" width="${W}" height="200" fill="#a67c52"/>
      <rect x="360" y="650" width="880" height="44" rx="6" fill="#8a5d36"/><rect x="380" y="694" width="24" height="200" fill="#6a4426"/><rect x="1196" y="694" width="24" height="200" fill="#6a4426"/>
      <rect x="520" y="626" width="150" height="26" fill="#fff" transform="rotate(-6 595 640)"/><rect x="900" y="630" width="110" height="22" fill="#2f4b7c"/>
      <path d="M600 110 L780 700 L620 700 Z" fill="#fff5d0" opacity="${t === 'night' ? 0 : .18}"/>
      ${tint(t, true)}`;
  },

  shotengai: (t, u) => {
    const lit = t !== 'day';
    const shop = (x, w, col, sign) => `<rect x="${x}" y="260" width="${w}" height="420" fill="#efe3cf"/>
      <rect x="${x + 10}" y="280" width="${w - 20}" height="70" rx="6" fill="${col}"/>
      <text x="${x + w / 2}" y="330" font-size="40" fill="#fff" text-anchor="middle" font-family="sans-serif" font-weight="bold">${sign}</text>
      <path d="M${x} 370 L${x + w} 370 L${x + w - 10} 420 L${x + 10} 420 Z" fill="${col}" opacity=".85"/>
      ${Array.from({ length: Math.floor(w / 40) }, (_, i) => `<path d="M${x + 10 + i * 40} 420 q20 16 40 0" fill="#fff" opacity=".5"/>`).join('')}
      <rect x="${x + 20}" y="440" width="${w - 40}" height="240" fill="${lit ? '#ffe7a8' : '#cfe3ee'}"/>
      <rect x="${x + 30}" y="560" width="${w - 60}" height="40" fill="#b58a5a"/>`;
    return `<rect width="${W}" height="${H}" fill="${t === 'night' ? '#1a1c3a' : t === 'eve' ? '#e8a17e' : '#a8d4f0'}"/>
      <path d="M0 200 Q800 -40 1600 200 L1600 240 Q800 10 0 240 Z" fill="#dfe6ec" opacity=".85"/>
      ${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 140} ${140 - Math.sin(i / 11 * Math.PI) * 120} L${i * 140 + 20} 240" stroke="#b9c2ca" stroke-width="6"/>`).join('')}
      ${shop(0, 300, '#d9534f', '駄菓子')}${shop(300, 260, '#2d6aa3', '書店')}${shop(1060, 280, '#6b4c93', '喫茶')}${shop(1340, 260, '#3f8a5a', '青果')}
      <path d="M560 900 L700 300 L900 300 L1040 900 Z" fill="#cbbfae"/>
      ${Array.from({ length: 8 }, (_, i) => `<path d="M${560 + i * 60 - i * 8} ${900 - i * 80} H${1040 - i * 60 + i * 8}" stroke="#b8ab98" stroke-width="3"/>`).join('')}
      <path d="M0 250 Q400 330 800 250 T1600 250" stroke="#8a4a3a" stroke-width="3" fill="none"/>
      ${Array.from({ length: 9 }, (_, i) => { const x = 90 + i * 180, y = 250 + Math.sin((i + .5) / 9 * Math.PI * 2) * -40 + 60; return `<ellipse cx="${x}" cy="${y}" rx="24" ry="32" fill="${i % 2 ? '#ff6b6b' : '#fff1c1'}" ${lit ? `filter="url(#gl${u})"` : ''}/>`; }).join('')}
      <defs><filter id="gl${u}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      ${Array.from({ length: 14 }, (_, i) => `<path d="M${40 + i * 115} 110 l12 40 l12 -40" fill="${['#ff6b6b', '#ffd166', '#06d6a0', '#118ab2', '#ef476f'][i % 5]}"/>`).join('')}
      ${tint(t, true)}`;
  },

  cafe: (t, u) => `
    <rect width="${W}" height="${H}" fill="#6b4a36"/>
    ${Array.from({ length: 20 }, (_, i) => `<rect x="${i * 80}" y="0" width="76" height="560" fill="#7a5540"/>`).join('')}
    ${windowView(160, 120, 560, 380, t, u)}
    <rect x="150" y="110" width="580" height="400" fill="none" stroke="#3d2a1e" stroke-width="18"/><rect x="432" y="120" width="14" height="380" fill="#3d2a1e"/>
    <rect x="880" y="220" width="600" height="20" fill="#3d2a1e"/><rect x="880" y="360" width="600" height="20" fill="#3d2a1e"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${900 + i * 70}" y="${160}" width="40" height="60" rx="6" fill="${['#f4e1c1', '#c9e4de', '#f7d6e0', '#fff'][i % 4]}"/><rect x="${905 + i * 70}" y="300" width="50" height="60" rx="8" fill="#8fbf9f"/>`).join('')}
    ${[400, 900, 1300].map((x) => `<path d="M${x} 0 V120" stroke="#222" stroke-width="3"/><path d="M${x - 50} 150 Q${x} 90 ${x + 50} 150 Z" fill="#e0a64a"/><circle cx="${x}" cy="156" r="18" fill="#fff4c8" opacity=".9"/>`).join('')}
    <rect y="560" width="${W}" height="340" fill="#4a3226"/>
    <rect x="300" y="620" width="1000" height="40" rx="10" fill="#9a6b48"/><rect x="760" y="660" width="80" height="240" fill="#5a3c2a"/>
    <path d="M520 600 h70 v14 q-35 30 -70 0 Z" fill="#fff"/><path d="M1000 596 h60 v18 q-30 26 -60 0 Z" fill="#fff"/>
    <path d="M540 580 q10 -20 0 -40 M1020 576 q10 -20 0 -40" stroke="#fff" stroke-width="3" fill="none" opacity=".5"/>
    <rect width="${W}" height="${H}" fill="#ffb060" opacity=".08"/>
    ${tint(t, true)}`,

  shrine: (t, u) => {
    const lit = t !== 'day';
    return `${skySVG(t, 520, u, 41)}
      <path d="M0 0 Q180 120 120 520 L0 560 Z" fill="${t === 'night' ? '#0c1a1a' : '#2f5d3a'}"/>
      <path d="M1600 0 Q1420 140 1480 520 L1600 560 Z" fill="${t === 'night' ? '#0c1a1a' : '#2f5d3a'}"/>
      ${Array.from({ length: 14 }, (_, i) => `<circle cx="${i < 7 ? 40 + i * 30 : 1560 - (i - 7) * 30}" cy="${80 + (i % 7) * 60}" r="${70 - (i % 7) * 4}" fill="${t === 'night' ? '#10241f' : '#3a7046'}"/>`).join('')}
      <rect y="520" width="${W}" height="380" fill="${t === 'night' ? '#2a2d36' : '#b8ad98'}"/>
      <path d="M660 900 L760 520 L840 520 L940 900 Z" fill="${t === 'night' ? '#3d404c' : '#d6ccb6'}"/>
      ${[0, 1, 2, 3, 4].map((i) => `<path d="M${680 + i * 20} ${880 - i * 80} H${920 - i * 20}" stroke="${t === 'night' ? '#555a6a' : '#c0b59e'}" stroke-width="4"/>`).join('')}
      <g fill="#d63b2e"><rect x="560" y="200" width="36" height="340"/><rect x="1004" y="200" width="36" height="340"/>
        <path d="M480 170 Q800 130 1120 170 L1120 200 Q800 164 480 200 Z" fill="#1a1a1a"/><rect x="500" y="196" width="600" height="26"/>
        <rect x="520" y="258" width="560" height="24"/><rect x="786" y="222" width="28" height="40" fill="#1a1a1a"/></g>
      <g transform="translate(300 520)"><rect x="-30" y="0" width="60" height="30" fill="#8a8a8a"/><rect x="-14" y="-110" width="28" height="110" fill="#9a9a9a"/><rect x="-40" y="-160" width="80" height="54" fill="#a8a8a8"/><path d="M-56 -160 L0 -200 L56 -160 Z" fill="#8a8a8a"/><rect x="-24" y="-150" width="48" height="34" fill="${lit ? '#ffcf6a' : '#6a6a6a'}"/></g>
      <g transform="translate(1300 520)"><rect x="-30" y="0" width="60" height="30" fill="#8a8a8a"/><rect x="-14" y="-110" width="28" height="110" fill="#9a9a9a"/><rect x="-40" y="-160" width="80" height="54" fill="#a8a8a8"/><path d="M-56 -160 L0 -200 L56 -160 Z" fill="#8a8a8a"/><rect x="-24" y="-150" width="48" height="34" fill="${lit ? '#ffcf6a' : '#6a6a6a'}"/></g>
      ${lit ? `<circle cx="300" cy="-113" r="60" fill="#ffcf6a" opacity=".18" transform="translate(0 520)"/><circle cx="1300" cy="407" r="60" fill="#ffcf6a" opacity=".18"/>` : ''}
      ${tint(t)}`;
  },

  lighthouse: (t, u) => `
    ${skySVG(t, 560, u, 51)}${seaSVG(t, 560, u)}
    <path d="M0 900 L0 560 Q200 520 420 540 Q700 560 900 620 L1100 900 Z" fill="${t === 'night' ? '#1a2230' : t === 'eve' ? '#4d4a5e' : '#5d8a5a'}"/>
    <path d="M0 620 Q300 580 600 620 Q800 650 960 720" stroke="${t === 'day' ? '#7fb070' : '#6a6680'}" stroke-width="8" fill="none" opacity=".6"/>
    <g transform="translate(560 0)">
      <path d="M-50 580 L-34 250 L34 250 L50 580 Z" fill="#f4f1ea"/>
      <path d="M-46 500 L-42 420 L42 420 L46 500 Z M-39 340 L-37 300 L37 300 L39 340 Z" fill="#d64545"/>
      <rect x="-46" y="236" width="92" height="16" fill="#3a3a44"/>
      <rect x="-28" y="186" width="56" height="50" fill="${t === 'day' ? '#bfe0f0' : '#fff2b8'}" stroke="#3a3a44" stroke-width="6"/>
      <path d="M-36 186 L0 150 L36 186 Z" fill="#d64545"/><rect x="-3" y="130" width="6" height="22" fill="#3a3a44"/>
      <rect x="-14" y="520" width="28" height="60" rx="14" fill="#6b4a36"/>
      ${t !== 'day' ? `<path d="M0 210 L1100 120 L1100 320 Z" fill="#fff6c8" opacity="${t === 'night' ? .22 : .12}"/><circle cx="0" cy="210" r="40" fill="#fff6c8" opacity=".4"/>` : ''}
    </g>
    <path d="M760 560 l0 -30 m20 30 l0 -40 m20 40 l0 -26" stroke="${t === 'day' ? '#6a9a5a' : '#555a70'}" stroke-width="4"/>
    <rect x="200" y="600" width="140" height="10" fill="#8a6a4a"/><rect x="210" y="610" width="8" height="40" fill="#6a4a30"/><rect x="322" y="610" width="8" height="40" fill="#6a4a30"/>
    ${tint(t)}`,

  boathouse: (t, u) => `
    <rect width="${W}" height="${H}" fill="#5a4230"/>
    ${Array.from({ length: 16 }, (_, i) => `<rect x="${i * 100}" y="0" width="96" height="620" fill="${i % 2 ? '#6b4e38' : '#634833'}"/><rect x="${i * 100 + 96}" y="0" width="4" height="620" fill="#2a1d12"/>`).join('')}
    ${[240, 520, 1100].map((x) => `<path d="M${x} 0 L${x + 60} 0 L${x + 300} 900 L${x + 120} 900 Z" fill="#fff4c8" opacity="${t === 'night' ? .04 : .12}"/>`).join('')}
    <rect y="620" width="${W}" height="280" fill="#4a3424"/>
    <path d="M200 760 Q600 860 1000 760 L940 700 L260 700 Z" fill="#8a5a3a"/><path d="M260 700 L940 700" stroke="#f2e2c2" stroke-width="8"/>
    <rect x="1140" y="300" width="340" height="16" fill="#3d2a1e"/><rect x="1140" y="440" width="340" height="16" fill="#3d2a1e"/>
    <rect x="1170" y="236" width="80" height="64" fill="#b8453a"/><circle cx="1330" cy="270" r="30" fill="#e9c46a"/><rect x="1380" y="380" width="70" height="60" fill="#2a9d8f"/>
    <rect x="1180" y="560" width="160" height="110" rx="8" fill="#c8a24a"/><rect x="1180" y="560" width="160" height="26" rx="8" fill="#9a7a30"/>
    <path d="M80 200 Q140 260 120 360" stroke="#c9b28a" stroke-width="6" fill="none"/><circle cx="120" cy="370" r="30" fill="none" stroke="#e05a5a" stroke-width="10"/>
    <text x="720" y="300" font-size="40" fill="#f2e2c2" opacity=".55" font-family="sans-serif" transform="rotate(-4 720 300)">ひみつきち</text>
    ${tint(t, true)}`,

  keeper: (t, u) => `
    <rect width="${W}" height="${H}" fill="#e9e2d6"/>
    ${Array.from({ length: 30 }, (_, i) => `<path d="M${i * 60} 0 V620" stroke="#ddd3c4" stroke-width="3"/>`).join('')}
    ${windowView(980, 120, 460, 360, t, u)}
    <rect x="970" y="110" width="480" height="380" fill="none" stroke="#fff" stroke-width="16"/><rect x="1202" y="120" width="12" height="360" fill="#fff"/>
    <rect y="620" width="${W}" height="280" fill="#a07a58"/>
    <rect x="200" y="330" width="620" height="330" rx="10" fill="#2c1c16"/>
    <rect x="220" y="350" width="580" height="120" fill="#3a2820"/>
    <rect x="200" y="500" width="620" height="40" fill="#1c120e"/>
    ${Array.from({ length: 24 }, (_, i) => `<rect x="${214 + i * 24.5}" y="506" width="22" height="30" fill="#fbfbf6"/>`).join('')}
    ${Array.from({ length: 24 }, (_, i) => ([1, 2, 4, 5, 6].includes(i % 7) ? `<rect x="${230 + i * 24.5}" y="506" width="12" height="18" fill="#111"/>` : '')).join('')}
    <rect x="220" y="660" width="30" height="120" fill="#2c1c16"/><rect x="770" y="660" width="30" height="120" fill="#2c1c16"/>
    <rect x="400" y="700" width="220" height="30" rx="8" fill="#6b3a3a"/>
    <rect x="300" y="250" width="120" height="80" fill="#fff" stroke="#c9a86a" stroke-width="6"/><circle cx="360" cy="290" r="22" fill="#9fd6ea"/>
    <path d="M1500 620 L1500 420" stroke="#6a4a30" stroke-width="10"/><path d="M1460 420 H1540 L1520 360 H1480 Z" fill="#ffe8a8"/>
    ${tint(t, true)}`,

  festival: (t, u) => {
    const stall = (x, col, name) => `<rect x="${x}" y="470" width="260" height="260" fill="#2a1e1a"/>
      <path d="M${x - 10} 470 L${x + 270} 470 L${x + 250} 420 L${x + 10} 420 Z" fill="${col}"/>
      ${Array.from({ length: 6 }, (_, i) => `<path d="M${x + i * 44} 470 q22 24 44 0" fill="${i % 2 ? col : '#fff'}"/>`).join('')}
      <rect x="${x + 30}" y="500" width="200" height="54" rx="4" fill="#fff4dc"/>
      <text x="${x + 130}" y="540" font-size="36" fill="#b3261e" text-anchor="middle" font-family="sans-serif" font-weight="bold">${name}</text>
      <rect x="${x + 10}" y="600" width="240" height="60" fill="#ffcf6a" opacity=".85"/>`;
    return `${skySVG('night', 470, u, 61)}
      <rect y="480" width="${W}" height="260" fill="#2a1d24"/>
      <ellipse cx="800" cy="640" rx="520" ry="120" fill="#ffb46a" opacity=".14"/>
      <path d="M0 470 Q300 400 700 440 Q1100 380 1600 450 L1600 520 L0 520 Z" fill="#0c1426"/>
      ${stall(20, '#d63b2e', 'たこ焼')}${stall(330, '#2d6aa3', '金魚')}${stall(1000, '#e07aa0', 'りんご飴')}${stall(1310, '#3f8a5a', 'かき氷')}
      <rect y="730" width="${W}" height="170" fill="#3a2e2a"/>
      ${[0, 1].map((k) => `<path d="M0 ${200 + k * 90} Q400 ${300 + k * 90} 800 ${230 + k * 90} T1600 ${220 + k * 90}" stroke="#222" stroke-width="3" fill="none"/>`).join('')}
      ${Array.from({ length: 22 }, (_, i) => { const k = i % 2, j = Math.floor(i / 2); const x = 40 + j * 146; const y = 200 + k * 90 + Math.sin((x / 1600) * Math.PI * 1.5) * 50 + 20; return `<circle cx="${x}" cy="${y + 18}" r="46" fill="#ffb46a" opacity=".16"/><ellipse cx="${x}" cy="${y + 18}" rx="20" ry="26" fill="${k ? '#ff6b5a' : '#ffe6a0'}"/><rect x="${x - 12}" y="${y - 10}" width="24" height="6" fill="#222"/>`; }).join('')}
      ${Array.from({ length: 26 }, (_, i) => { const x = i * 64 + (i % 3) * 10, h = 120 + (i * 37) % 70; return `<path d="M${x} 900 L${x} ${900 - h + 30} Q${x + 26} ${900 - h - 30} ${x + 52} ${900 - h + 30} L${x + 52} 900 Z" fill="#0a0a14" opacity=".92"/><circle cx="${x + 26}" cy="${900 - h + 8}" r="22" fill="#0a0a14"/>`; }).join('')}
      <rect width="${W}" height="${H}" fill="#ff9a4a" opacity=".06"/>`;
  },

  fireworks: (t, u) => `
    <defs><linearGradient id="fw${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03061a"/><stop offset="1" stop-color="#1b2152"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#fw${u})"/>
    ${(() => { const r = seeded(71); let s = ''; for (let i = 0; i < 80; i++) s += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * 500).toFixed(0)}" r="${(r() * 1.3 + .3).toFixed(1)}" fill="#fff" opacity="${(r() * .5 + .2).toFixed(2)}"/>`; return s; })()}
    <rect y="600" width="${W}" height="300" fill="#0b1440"/>
    ${Array.from({ length: 30 }, (_, i) => `<rect x="${(i * 131) % 1600}" y="${610 + (i * 47) % 280}" width="${40 + (i * 13) % 60}" height="2" fill="#ffcf8a" opacity=".2"/>`).join('')}
    <path d="M0 610 L60 590 L140 598 L200 570 L300 585 L380 560 L480 588 L600 595 L1600 600 L1600 612 L0 612 Z" fill="#0a0f24"/>
    ${Array.from({ length: 40 }, (_, i) => `<circle cx="${20 + i * 14}" cy="${596 - (i % 5) * 4}" r="2" fill="#ffd27a" opacity=".8"/>`).join('')}
    <path d="M0 900 L0 760 Q300 700 700 740 Q1100 700 1600 780 L1600 900 Z" fill="#050818"/>
    <path d="M1200 760 L1204 680 L1216 680 L1220 760 Z" fill="#050818"/><path d="M1180 690 Q1210 640 1240 690 Z" fill="#050818"/>`,

  station: (t, u) => `
    ${skySVG(t, 480, u, 81)}${seaSVG(t, 480, u)}
    <rect y="560" width="${W}" height="340" fill="#b9b3a6"/>
    <rect y="560" width="${W}" height="18" fill="#f1d34a"/>
    <path d="M0 640 H1600 M0 700 H1600" stroke="#a09a8e" stroke-width="3"/>
    <rect x="0" y="120" width="${W}" height="36" fill="#6a6f7a"/>
    ${[200, 700, 1200].map((x) => `<rect x="${x}" y="156" width="22" height="404" fill="#7a7f8a"/>`).join('')}
    <rect x="860" y="300" width="340" height="120" rx="8" fill="#fff" stroke="#2d6aa3" stroke-width="8"/>
    <text x="1030" y="370" font-size="54" fill="#1b2a4a" text-anchor="middle" font-family="sans-serif" font-weight="bold">しおみ</text>
    <text x="1030" y="405" font-size="22" fill="#2d6aa3" text-anchor="middle" font-family="sans-serif">SHIOMI</text>
    <rect x="300" y="620" width="300" height="24" rx="6" fill="#4a7ab8"/><rect x="310" y="644" width="14" height="60" fill="#555"/><rect x="576" y="644" width="14" height="60" fill="#555"/>
    ${tint(t)}`,

  hall: (t, u) => `
    <rect width="${W}" height="${H}" fill="#0c0a14"/>
    <path d="M0 0 Q200 300 120 900 L0 900 Z M1600 0 Q1400 300 1480 900 L1600 900 Z" fill="#6a0f22"/>
    <path d="M0 0 H1600 V90 Q800 150 0 90 Z" fill="#7a1428"/>
    <path d="M800 0 L520 780 L1080 780 Z" fill="#fff6d8" opacity=".12"/>
    <ellipse cx="800" cy="780" rx="360" ry="60" fill="#fff6d8" opacity=".2"/>
    <rect y="760" width="${W}" height="140" fill="#2a1a12"/>
    <path d="M640 700 Q700 600 900 620 L960 640 L960 700 Z" fill="#050505"/><rect x="640" y="696" width="320" height="12" fill="#111"/>
    <rect x="690" y="708" width="8" height="70" fill="#111"/><rect x="920" y="708" width="8" height="70" fill="#111"/>
    ${Array.from({ length: 14 }, (_, i) => `<circle cx="${60 + i * 118}" cy="880" r="40" fill="#07060c"/>`).join('')}`
};

function bgSVG(id, time) {
  const f = BG[id] || BG.black;
  const u = 'b' + (++svgUid);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${f(time || 'day', u)}</svg>`;
}

/* ---- 町の地図 ---- */
const SPOTS = [
  { id: 'home', name: '自宅', x: 17, y: 72, bg: 'room' },
  { id: 'school', name: '学校', x: 22, y: 24, bg: 'school' },
  { id: 'town', name: '商店街', x: 48, y: 46, bg: 'shotengai' },
  { id: 'shrine', name: '神社', x: 78, y: 20, bg: 'shrine' },
  { id: 'beach', name: '海岸', x: 58, y: 82, bg: 'beach' },
  { id: 'lighthouse', name: '灯台', x: 88, y: 66, bg: 'lighthouse' }
];
function mapSVG(eve) {
  const land = eve ? '#d9b99a' : '#e9dfc4', sea = eve ? '#7a5a9a' : '#6ec3e6', road = eve ? '#f3dcc0' : '#fffaf0', tree = eve ? '#6d7a5a' : '#8cbf7a';
  return `
    <rect width="1000" height="620" fill="${land}"/>
    <path d="M0 470 Q200 520 420 520 Q620 520 760 440 Q860 380 1000 360 L1000 620 L0 620 Z" fill="${sea}"/>
    <path d="M0 470 Q200 520 420 520 Q620 520 760 440 Q860 380 1000 360" stroke="#fff" stroke-width="6" fill="none" opacity=".6"/>
    ${Array.from({ length: 16 }, (_, i) => `<path d="M${60 + (i * 211) % 900} ${540 + (i * 53) % 70} q14 -8 28 0" stroke="#fff" stroke-width="3" fill="none" opacity=".45"/>`).join('')}
    <path d="M170 450 L220 150 L480 285 L780 125 M480 285 L580 510 M480 285 L880 410" stroke="${road}" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M170 450 L480 285" stroke="${road}" stroke-width="16" fill="none" stroke-linecap="round"/>
    ${Array.from({ length: 22 }, (_, i) => `<circle cx="${(i * 97 + 40) % 960 + 20}" cy="${(i * 61) % 300 + 40}" r="${12 + (i % 3) * 4}" fill="${tree}" opacity=".85"/>`).join('')}
    <g transform="translate(220 150)"><rect x="-60" y="-34" width="120" height="60" fill="#fff" stroke="#9aa" stroke-width="3"/><rect x="-10" y="-60" width="20" height="30" fill="#fff" stroke="#9aa" stroke-width="3"/><circle cx="0" cy="-48" r="7" fill="#9ccbe6"/></g>
    <g transform="translate(170 450)"><rect x="-26" y="-22" width="52" height="40" fill="#fff4e0"/><path d="M-34 -20 L0 -48 L34 -20 Z" fill="#35506e"/></g>
    <g transform="translate(480 285)">${[0, 1, 2, 3].map((i) => `<rect x="${-70 + i * 36}" y="-24" width="32" height="30" fill="${['#ff8a8a', '#8ab8ff', '#b99ae8', '#8ad6a0'][i]}"/>`).join('')}</g>
    <g transform="translate(780 125)"><rect x="-38" y="-30" width="10" height="46" fill="#d63b2e"/><rect x="28" y="-30" width="10" height="46" fill="#d63b2e"/><rect x="-48" y="-38" width="96" height="10" fill="#d63b2e"/></g>
    <g transform="translate(880 410)"><path d="M-10 20 L-7 -40 L7 -40 L10 20 Z" fill="#fff"/><rect x="-9" y="-54" width="18" height="16" fill="#d64545"/>${eve ? '<path d="M0 -46 L-140 -80 L-140 -10 Z" fill="#fff6c8" opacity=".35"/>' : ''}</g>
    <g transform="translate(580 520)"><path d="M-40 10 Q0 -20 40 10 Z" fill="#ff7a7a"/><path d="M0 10 V40" stroke="#fff" stroke-width="3"/></g>`;
}

/* =========================================================
   4. 演出エフェクト（Canvas）
   ========================================================= */
class FXLayer {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.mode = 'none';
    this.p = [];
    this.one = [];
    this.lite = false;
    this.soundOn = true;
    this.last = 0;
    this.spawnT = 0;
    this.running = false;
    this.resize();
  }
  resize() {
    const r = this.cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.cv.width = Math.round(this.w * dpr); this.cv.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  set(mode) {
    if (mode === this.mode) return;
    this.mode = mode || 'none';
    this.p = [];
    this.spawnT = 0;
    if (this.mode === 'rain') for (let i = 0; i < (this.lite ? 70 : 180); i++) this.p.push(this.rainDrop(true));
    if (this.mode === 'fireflies') for (let i = 0; i < (this.lite ? 14 : 34); i++) this.p.push(this.firefly());
    if (this.mode === 'sparkle') for (let i = 0; i < (this.lite ? 16 : 40); i++) this.p.push(this.mote(true));
    this.start();
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (t) => {
      if (!this.running) return;
      const dt = Math.min(.05, (t - this.last) / 1000); this.last = t;
      this.update(dt); this.draw();
      if (this.mode === 'none' && this.one.length === 0) { this.running = false; this.ctx.clearRect(0, 0, this.w, this.h); return; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  rainDrop(init) {
    return { x: Math.random() * (this.w + 200) - 100, y: init ? Math.random() * this.h : -20 - Math.random() * 100, v: 900 + Math.random() * 500, l: 14 + Math.random() * 20 };
  }
  firefly() {
    return { x: Math.random() * this.w, y: this.h * (.3 + Math.random() * .6), vx: 0, vy: 0, ph: Math.random() * 6.28, r: 1.6 + Math.random() * 1.6 };
  }
  mote(init) {
    return { x: Math.random() * this.w, y: init ? Math.random() * this.h : this.h + 10, v: 10 + Math.random() * 25, r: 1 + Math.random() * 3, ph: Math.random() * 6.28, a: .2 + Math.random() * .5 };
  }
  hearts(n) {
    n = n || 10;
    for (let i = 0; i < n; i++) {
      this.one.push({ k: 'heart', x: this.w * (.3 + Math.random() * .4), y: this.h * (.55 + Math.random() * .2), vx: rand(-40, 40), vy: rand(-140, -80), life: 1.6 + Math.random() * .6, t: 0, s: 8 + Math.random() * 10 });
    }
    this.start();
  }
  firework(x, y, big) {
    const cols = [['#ff6b8a', '#ffd1dc'], ['#ffd166', '#fff3c4'], ['#7fd6cf', '#dffaf7'], ['#a78bfa', '#efe7ff'], ['#ff9f43', '#ffe2c2'], ['#8fd3ff', '#ffffff']];
    const c = pick(cols);
    const n = this.lite ? 40 : (big ? 110 : 76);
    const sp = (big ? 260 : 200) * (Math.min(this.w, this.h) / 700 + .4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * .05;
      const s = sp * (.75 + Math.random() * .3);
      this.one.push({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1.4 + Math.random() * .6, t: 0, c: Math.random() < .3 ? c[1] : c[0] });
    }
    if (this.soundOn) AudioSys.se('boom');
  }
  update(dt) {
    const w = this.w, h = this.h;
    if (this.mode === 'rain') {
      for (const d of this.p) { d.y += d.v * dt; d.x -= d.v * .18 * dt; if (d.y > h + 20) Object.assign(d, this.rainDrop(false)); }
    } else if (this.mode === 'fireflies') {
      for (const f of this.p) {
        f.ph += dt * 2; f.vx += rand(-20, 20) * dt; f.vy += rand(-20, 20) * dt;
        f.vx *= .98; f.vy *= .98; f.x += f.vx * dt * 6; f.y += f.vy * dt * 6;
        if (f.x < 0) f.x = w; if (f.x > w) f.x = 0; if (f.y < h * .2) f.vy += 4; if (f.y > h) f.vy -= 4;
      }
    } else if (this.mode === 'sparkle') {
      for (const m of this.p) { m.y -= m.v * dt; m.ph += dt; m.x += Math.sin(m.ph) * 8 * dt; if (m.y < -10) Object.assign(m, this.mote(false)); }
    } else if (this.mode === 'fireworks' || this.mode === 'finale') {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        const fin = this.mode === 'finale';
        this.spawnT = fin ? rand(.25, .55) : rand(.9, 1.8);
        this.one.push({ k: 'rocket', x: w * rand(.15, .85), y: h, vy: -h * rand(1.0, 1.25), ty: h * rand(.14, .42), t: 0, life: 4, big: fin || Math.random() < .3 });
      }
    }
    for (const o of this.one) {
      o.t += dt;
      if (o.k === 'rocket') {
        o.y += o.vy * dt; o.vy *= .985;
        if (o.y <= o.ty) { o.dead = true; this.firework(o.x, o.y, o.big); }
      } else if (o.k === 'spark') {
        o.vx *= .975; o.vy = o.vy * .975 + 60 * dt; o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.t > o.life) o.dead = true;
      } else if (o.k === 'heart') {
        o.x += o.vx * dt; o.y += o.vy * dt; o.vy *= .99;
        if (o.t > o.life) o.dead = true;
      }
    }
    this.one = this.one.filter((o) => !o.dead);
  }
  draw() {
    const c = this.ctx, w = this.w, h = this.h;
    c.clearRect(0, 0, w, h);
    if (this.mode === 'rain') {
      c.fillStyle = 'rgba(20,30,60,.22)'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(210,225,255,.55)'; c.lineWidth = 1.2; c.beginPath();
      for (const d of this.p) { c.moveTo(d.x, d.y); c.lineTo(d.x + d.l * .18, d.y - d.l); }
      c.stroke();
    } else if (this.mode === 'fireflies') {
      for (const f of this.p) {
        const a = .35 + .65 * Math.max(0, Math.sin(f.ph));
        const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 7);
        g.addColorStop(0, `rgba(220,255,150,${a})`); g.addColorStop(1, 'rgba(220,255,150,0)');
        c.fillStyle = g; c.beginPath(); c.arc(f.x, f.y, f.r * 7, 0, 6.29); c.fill();
      }
    } else if (this.mode === 'sparkle') {
      for (const m of this.p) {
        c.fillStyle = `rgba(255,244,214,${m.a * (.6 + .4 * Math.sin(m.ph * 2))})`;
        c.beginPath(); c.arc(m.x, m.y, m.r, 0, 6.29); c.fill();
      }
    }
    c.globalCompositeOperation = 'lighter';
    for (const o of this.one) {
      if (o.k === 'rocket') {
        c.fillStyle = 'rgba(255,230,180,.9)'; c.beginPath(); c.arc(o.x, o.y, 2.2, 0, 6.29); c.fill();
        c.fillStyle = 'rgba(255,200,120,.3)'; c.fillRect(o.x - 1, o.y, 2, 26);
      } else if (o.k === 'spark') {
        const a = Math.max(0, 1 - o.t / o.life);
        c.globalAlpha = a; c.fillStyle = o.c; c.beginPath(); c.arc(o.x, o.y, 2.2, 0, 6.29); c.fill();
        c.globalAlpha = a * .35; c.beginPath(); c.arc(o.x, o.y, 6, 0, 6.29); c.fill();
        c.globalAlpha = 1;
      }
    }
    c.globalCompositeOperation = 'source-over';
    for (const o of this.one) {
      if (o.k !== 'heart') continue;
      const a = Math.max(0, 1 - o.t / o.life);
      c.globalAlpha = a; c.fillStyle = '#ff7f9c';
      const s = o.s; c.beginPath();
      c.moveTo(o.x, o.y + s * .3);
      c.bezierCurveTo(o.x, o.y - s * .3, o.x - s, o.y - s * .3, o.x - s, o.y + s * .2);
      c.bezierCurveTo(o.x - s, o.y + s * .7, o.x, o.y + s, o.x, o.y + s * 1.3);
      c.bezierCurveTo(o.x, o.y + s, o.x + s, o.y + s * .7, o.x + s, o.y + s * .2);
      c.bezierCurveTo(o.x + s, o.y - s * .3, o.x, o.y - s * .3, o.x, o.y + s * .3);
      c.fill(); c.globalAlpha = 1;
    }
  }
}

/* =========================================================
   5. シナリオ解析
   ---------------------------------------------------------
   #ラベル            … ブロック開始
   @命令 引数...       … 演出・制御
   xx.表情: セリフ     … 話者 xx（hi/sz/re/lu/ke/me/mo/ba/？）
   ?xx.表情: セリフ    … 名前を「？？？」で表示
   それ以外            … 地の文
   > 選択肢 {hi+5} ?条件 => ラベル
   [1] 行頭           … 直前の選択で1番を選んだ時だけ実行
   [?条件] 行頭        … 条件を満たす時だけ実行
   ========================================================= */
const SPEAKERS = {
  hi: { name: '陽葵', chara: 'hi', color: CHARA.hi.color },
  sz: { name: '雫', chara: 'sz', color: CHARA.sz.color },
  re: { name: '玲奈', chara: 're', color: CHARA.re.color },
  lu: { name: 'ルナ', chara: 'lu', color: CHARA.lu.color },
  ke: { name: '健太', color: '#5fae6e' },
  me: { name: '{name}', color: '#5a7bd8' },
  mo: { name: '母', color: '#c78a5a' },
  ba: { name: '灯台守のおばあさん', color: '#9a8a7a' },
  xx: { name: '？？？', color: '#8a86a6' },
  an: { name: 'アナウンス', color: '#8a86a6' }
};

function parseEffects(str) {
  if (!str) return [];
  return str.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = /^([a-z]{2})([+-]\d+)$/.exec(s);
    return m ? { id: m[1], v: parseInt(m[2], 10) } : null;
  }).filter(Boolean);
}

function parseScript(src) {
  const labels = {};
  const errors = [];
  let cur = null;
  let lastChoice = null;
  const lines = src.split('\n');
  for (let ln = 0; ln < lines.length; ln++) {
    let raw = lines[ln].trim();
    if (!raw || raw.startsWith('//')) continue;
    if (raw.startsWith('#')) {
      cur = raw.slice(1).trim();
      if (labels[cur]) errors.push(`ラベル重複: ${cur} (${ln + 1}行目)`);
      labels[cur] = [];
      lastChoice = null;
      continue;
    }
    if (!cur) continue;
    if (raw.startsWith('>')) {
      if (!lastChoice) { errors.push(`選択肢の前に@choiceがありません (${ln + 1}行目)`); continue; }
      let s = raw.slice(1).trim(), target = null, cond = null, eff = [];
      const ai = s.indexOf('=>');
      if (ai >= 0) { target = s.slice(ai + 2).trim(); s = s.slice(0, ai).trim(); }
      let m = /\s\?(\S+)$/.exec(s);
      if (m) { cond = m[1]; s = s.slice(0, m.index).trim(); }
      m = /\{([^}]*)\}$/.exec(s);
      if (m) { eff = parseEffects(m[1]); s = s.slice(0, m.index).trim(); }
      lastChoice.opts.push({ text: s, target, cond, eff });
      continue;
    }
    const cmd = { ln: ln + 1 };
    let m;
    while ((m = /^\[(\d|\?[^\]]+)\]\s*/.exec(raw))) {
      if (m[1][0] === '?') cmd.cond = m[1].slice(1); else cmd.ch = parseInt(m[1], 10);
      raw = raw.slice(m[0].length);
    }
    if (raw.startsWith('@')) {
      const parts = raw.slice(1).trim().split(/\s+/);
      cmd.t = 'cmd'; cmd.op = parts[0]; cmd.args = parts.slice(1);
      if (cmd.op === 'center') cmd.text = raw.slice(1).trim().slice(6).trim();
      if (cmd.op === 'choice') { cmd.opts = []; lastChoice = cmd; } else lastChoice = null;
    } else {
      lastChoice = null;
      const d = /^(\?)?([a-z]{2})(?:\.([a-z]+))?:\s?(.*)$/.exec(raw);
      if (d && SPEAKERS[d[2]]) {
        cmd.t = 'say'; cmd.who = d[2]; cmd.hide = !!d[1]; cmd.expr = d[3] || null; cmd.text = d[4];
        if (cmd.expr && !EXPR[cmd.expr]) errors.push(`不明な表情: ${cmd.expr} (${ln + 1}行目)`);
      } else {
        cmd.t = 'say'; cmd.who = null; cmd.text = raw;
      }
    }
    labels[cur].push(cmd);
  }
  return { labels, errors };
}

/* =========================================================
   6. ゲームエンジン
   ========================================================= */
const DAYS = 14;
const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
const WEEK_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SLOT_NAME = ['昼', '夕方'];
const EV_DAY = [1, 2, 5, 8, 11];
const EV_AFF = [0, 10, 25, 40, 55];
const GOOD_AFF = 75;
const INVITE_AFF = 35;
const FIXED = { '7-1': 'ev_rain', '10-1': 'ev_kimo', '14-1': 'ev_festival' };

const ENDINGS = [
  { id: 'hi_good', kind: 'GOOD END', title: '約束のスタートライン', desc: '離れても、同じ水の中で。二人はそれぞれのスタートラインに立った。', chara: 'hi', outfit: 'yukata', expr: 'tearsmile', bg: 'fireworks' },
  { id: 'hi_normal', kind: 'NORMAL END', title: '夏の終わりの背中', desc: '言えなかった言葉は、ラムネの泡みたいに消えていった。', chara: 'hi', outfit: 'yukata', expr: 'sad', bg: 'station', time: 'day' },
  { id: 'sz_good', kind: 'GOOD END', title: '君と綴るラストページ', desc: '書きかけだった物語の最後の一行は、ふたりで書いた。', chara: 'sz', outfit: 'yukata', expr: 'love', bg: 'fireworks' },
  { id: 'sz_normal', kind: 'NORMAL END', title: '書きかけの恋', desc: '物語は完成した。けれど、その結末に僕の名前はなかった。', chara: 'sz', outfit: 'uni', expr: 'sad', bg: 'library', time: 'eve' },
  { id: 're_good', kind: 'GOOD END', title: '生徒会長の、ただひとつのわがまま', desc: '完璧じゃなくていい。その言葉が、彼女の夏を変えた。', chara: 're', outfit: 'yukata', expr: 'shy', bg: 'fireworks' },
  { id: 're_normal', kind: 'NORMAL END', title: '完璧な会長の夏', desc: '祭りは大成功に終わった。彼女は最後まで、完璧な会長だった。', chara: 're', outfit: 'uni', expr: 'smile', bg: 'shrine', time: 'night' },
  { id: 'lu_good', kind: 'TRUE END', title: '十年目の約束、月の光', desc: '十年前に交わした約束は、灯台の光の下でやっと果たされた。', chara: 'lu', outfit: 'yukata', expr: 'tearsmile', bg: 'lighthouse', time: 'night' },
  { id: 'lu_normal', kind: 'NORMAL END', title: '灯台の少女', desc: '思い出したときには、灯台に彼女の姿はもうなかった。', chara: 'lu', outfit: 'dress', expr: 'sad', bg: 'lighthouse', time: 'eve' },
  { id: 'friend', kind: 'FRIEND END', title: '男二人、夏の終わり', desc: '「来年こそは彼女つくろうな」花火が、やけに目にしみた。', chara: null, bg: 'fireworks' }
];

function whereIs(id, day, slot) {
  switch (id) {
    case 'hi': return slot === 0 ? (day % 3 === 0 ? 'town' : 'school') : 'beach';
    case 'sz': return slot === 0 ? 'school' : (day % 2 ? 'shrine' : 'town');
    case 're': return slot === 0 ? (day % 2 ? 'town' : 'school') : (day % 2 ? 'school' : 'shrine');
    case 'lu': return (slot === 1 && day >= 2) ? 'lighthouse' : null;
    default: return null;
  }
}
function dateOf(day) { return { d: 16 + day, wd: day % 7 }; } // 8/17 = 月曜

const DEFAULT_CFG = { bgm: 50, se: 60, text: 6, auto: 5, win: 82, skipAll: false, lite: false };

const G = {
  st: null, script: null, fx: null, titleFx: null, sys: null,
  waiting: null, typing: false, typeTimer: null, full: '', shown: 0,
  auto: false, skip: false, ctrlSkip: false, advTimer: null, gen: 0,
  bgFront: 'A', readDirty: 0, inGame: false, hiddenBox: false,

  /* ---------- 初期化 ---------- */
  boot() {
    this.sys = Store.get('sys', null) || { cfg: deepCopy(DEFAULT_CFG), endings: {}, read: {} };
    this.sys.cfg = Object.assign(deepCopy(DEFAULT_CFG), this.sys.cfg || {});
    this.sys.endings = this.sys.endings || {};
    this.sys.read = this.sys.read || {};
    const parsed = parseScript(SCENARIO);
    this.script = parsed;
    if (parsed.errors.length) console.warn(parsed.errors);
    this.fx = new FXLayer($('#fx'));
    this.titleFx = new FXLayer($('#titleFx'));
    this.fader = document.createElement('div');
    this.fader.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .45s ease;z-index:60';
    $('#app').appendChild(this.fader);
    this.applyCfg();
    this.bindUI();
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.onResize(), 300));
    document.addEventListener('visibilitychange', () => {
      if (!AudioSys.ctx) return;
      if (document.hidden) AudioSys.ctx.suspend(); else AudioSys.ctx.resume();
    });
  },
  onResize() {
    this.fx.resize(); this.titleFx.resize();
    if ($('#map').classList.contains('show')) this.layoutMap();
  },
  saveSys() { Store.set('sys', this.sys); this.readDirty = 0; },
  applyCfg() {
    const c = this.sys.cfg;
    AudioSys.vol.bgm = c.bgm / 100; AudioSys.vol.se = c.se / 100; AudioSys.applyVol();
    document.documentElement.style.setProperty('--win-alpha', (c.win / 100).toFixed(2));
    this.fx.lite = this.titleFx.lite = !!c.lite;
  },

  /* ---------- 画面遷移 ---------- */
  showScreen(id) {
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    this.inGame = id === 'game';
  },
  fade(fn, hold) {
    this.fader.style.pointerEvents = 'auto';
    this.fader.style.opacity = '1';
    setTimeout(() => {
      fn();
      setTimeout(() => { this.fader.style.opacity = '0'; this.fader.style.pointerEvents = 'none'; }, hold || 120);
    }, 470);
  },
  toTitle() {
    this.gen++;
    this.stopTimers(); this.auto = false; this.skip = false; this.updateCtrl();
    this.closeAllOverlays();
    $('#dayCard').classList.remove('show'); $('#endCard').classList.remove('show');
    $('#staffRoll').classList.remove('show'); $('#srScroll').classList.remove('run');
    this.fx.set('none'); AudioSys.rain(false);
    if (this.readDirty) this.saveSys();
    this.showScreen('title');
    $('#titleBg').innerHTML = bgSVG('lighthouse', 'eve');
    this.titleFx.resize(); this.titleFx.set('sparkle');
    $('.tm-btn[data-act="continue"]').disabled = !this.hasAnySave();
    AudioSys.playBGM('title');
    if (window.matchMedia && window.matchMedia('(orientation: portrait)').matches && Math.min(window.innerWidth, window.innerHeight) < 600) {
      const h = $('#rotateHint'); h.classList.add('show'); setTimeout(() => h.classList.remove('show'), 4200);
    }
  },
  newGame(sname, name) {
    this.st = {
      v: 1, sname, name, day: 1, slot: 0, mode: 'script', label: 'prologue', index: 0, lineIndex: 0, lastChoice: 0,
      aff: { hi: 0, sz: 0, re: 0, lu: 0 }, chain: { hi: 0, sz: 0, re: 0, lu: 0 }, lastEv: { hi: 0, sz: 0, re: 0, lu: 0 },
      met: {}, flags: {}, seen: {}, bg: { id: 'black', time: 'day' }, bgm: null, fx: 'none', chars: {},
      disp: { n: '', c: null, t: '' }, log: [], hud: true, win: true
    };
    this.titleFx.set('none');
    this.fade(() => {
      this.showScreen('game');
      this.restoreVisuals();
      this.run();
    });
  },

  /* ---------- 実行ループ ---------- */
  run() {
    const st = this.st;
    let guard = 0;
    while (true) {
      if (++guard > 3000) { console.error('scenario loop'); return; }
      const blk = this.script.labels[st.label];
      if (!blk) { console.error('label not found: ' + st.label); this.advanceTime(); return; }
      if (st.index >= blk.length) { this.advanceTime(); return; }
      const i = st.index, c = blk[i];
      st.index++;
      if (c.ch && c.ch !== st.lastChoice) continue;
      if (c.cond && !this.cond(c.cond)) continue;
      if (c.t === 'say') { st.lineIndex = i; this.say(c, i); return; }
      if (this.exec(c, i) === 'stop') return;
    }
  },
  goto(label) { this.st.label = label; this.st.index = 0; },
  timeNow() { return this.st.slot === 0 ? 'day' : 'eve'; },
  isSkipping() { return this.skip || this.ctrlSkip; },

  cond(expr) {
    const st = this.st;
    return expr.split('&').every((a) => {
      let neg = false;
      if (a[0] === '!') { neg = true; a = a.slice(1); }
      let r = false, m;
      if ((m = /^([a-z]{2})(>=|<=|>|<|==)(\d+)$/.exec(a))) r = this.cmp(st.aff[m[1]] || 0, m[2], +m[3]);
      else if ((m = /^chain:([a-z]{2})(>=|<=|>|<|==)(\d+)$/.exec(a))) r = this.cmp(st.chain[m[1]] || 0, m[2], +m[3]);
      else if ((m = /^day(>=|<=|>|<|==)(\d+)$/.exec(a))) r = this.cmp(st.day, m[1], +m[2]);
      else if ((m = /^met:([a-z]{2})$/.exec(a))) r = !!st.met[m[1]];
      else if ((m = /^flag:(\S+)$/.exec(a))) r = !!st.flags[m[1]];
      else if ((m = /^good:([a-z]{2})$/.exec(a))) r = st.chain[m[1]] >= 5 && st.aff[m[1]] >= GOOD_AFF;
      else if ((m = /^can:([a-z]{2})$/.exec(a))) r = this.canInvite(m[1]);
      else if ((m = /^best:([a-z]{2})$/.exec(a))) r = this.best(0) === m[1];
      else if (a === 'none') r = !HEROINES.some((h) => this.canInvite(h));
      else console.warn('unknown cond', a);
      return neg ? !r : r;
    });
  },
  cmp(a, op, b) { return op === '>=' ? a >= b : op === '<=' ? a <= b : op === '>' ? a > b : op === '<' ? a < b : a === b; },
  canInvite(h) { const st = this.st; return !!st.met[h] && st.aff[h] >= INVITE_AFF && st.chain[h] >= 3; },
  best(min) {
    let b = null, bv = -1;
    HEROINES.forEach((h) => { if (this.st.met[h] && this.st.aff[h] >= min && this.st.aff[h] > bv) { b = h; bv = this.st.aff[h]; } });
    return b;
  },
  fmt(s) {
    const st = this.st || { name: '湊', sname: '水瀬' };
    return String(s).replace(/\{name\}/g, st.name).replace(/\{sname\}/g, st.sname).replace(/\{full\}/g, st.sname + ' ' + st.name).replace(/\\n/g, '\n');
  },

  exec(c, i) {
    const st = this.st, a = c.args;
    const skipping = this.isSkipping();
    switch (c.op) {
      case 'bg': {
        let time = null, trans = 'fade';
        for (const x of a.slice(1)) {
          if (x === '$t') time = this.timeNow();
          else if (['day', 'eve', 'night'].includes(x)) time = x;
          else if (['cut', 'slow', 'fade'].includes(x)) trans = x;
        }
        this.setBg(a[0], time || 'day', skipping ? 'cut' : trans);
        break;
      }
      case 'bgm': st.bgm = a[0] === 'stop' ? null : a[0]; AudioSys.playBGM(st.bgm); break;
      case 'se': if (!skipping) AudioSys.se(a[0]); break;
      case 'show': {
        const [id, outfit] = a[0].split(':');
        this.showChara(id, outfit || null, a[1] || 'normal', a[2] || 'center');
        break;
      }
      case 'hide': this.hideChara(a[0]); break;
      case 'hideall': Object.keys(st.chars).forEach((id) => this.hideChara(id)); break;
      case 'expr': this.setExpr(a[0], a[1]); break;
      case 'hop': if (!skipping) this.anim(a[0], 'hop'); break;
      case 'shake': if (!skipping) this.shake(); break;
      case 'flash': if (!skipping) this.flash(); break;
      case 'fx': st.fx = a[0]; this.fx.set(a[0]); AudioSys.rain(a[0] === 'rain'); break;
      case 'hearts': if (!skipping) this.fx.hearts(12); break;
      case 'firework': if (!skipping) this.fx.firework(this.fx.w * rand(.3, .7), this.fx.h * rand(.2, .35), true); break;
      case 'aff': this.changeAff(a[0], parseInt(a[1], 10)); break;
      case 'flag': st.flags[a[0]] = true; break;
      case 'unflag': delete st.flags[a[0]]; break;
      case 'met': st.met[a[0]] = true; break;
      case 'jump': this.goto(a[0]); break;
      case 'if': if (this.cond(a[0])) this.goto(a[1]); break;
      case 'ifnot': if (!this.cond(a[0])) this.goto(a[1]); break;
      case 'bestjump': { const b = this.best(parseInt(a[0], 10)); this.goto(a[1] + (b || 'none')); break; }
      case 'hud': st.hud = a[0] !== 'off'; this.updateHud(); break;
      case 'window': st.win = a[0] !== 'off'; $('#textBox').classList.toggle('hidden', !st.win); break;
      case 'wait': {
        if (skipping) break;
        st.lineIndex = i; this.waiting = 'wait';
        const g = this.gen;
        this.advTimer = setTimeout(() => { if (g === this.gen && this.waiting === 'wait') { this.waiting = null; this.run(); } }, parseInt(a[0], 10) || 500);
        return 'stop';
      }
      case 'center': {
        st.lineIndex = i;
        const txt = this.fmt(c.text);
        this.pushLog('', txt);
        const el = $('#centerText'); el.textContent = txt; el.classList.add('show');
        this.waiting = 'center';
        if (skipping) { const g = this.gen; this.advTimer = setTimeout(() => { if (g === this.gen) this.advance(); }, 120); }
        else if (this.auto) this.scheduleAuto(txt.length);
        return 'stop';
      }
      case 'choice': st.lineIndex = i; this.showChoice(c); return 'stop';
      case 'end': this.advanceTime(); return 'stop';
      case 'free': this.showMap(); return 'stop';
      case 'ending': st.lineIndex = i; this.doEnding(a[0]); return 'stop';
      case 'title': this.fade(() => this.toTitle()); return 'stop';
      default: console.warn('unknown op', c.op);
    }
    return null;
  },

  /* ---------- 文章表示 ---------- */
  say(c, i) {
    const st = this.st;
    let name = '', color = null, text = this.fmt(c.text);
    if (c.who) {
      const sp = SPEAKERS[c.who];
      name = c.hide ? '？？？' : this.fmt(sp.name); color = sp.color;
      if (sp.chara) { if (c.expr) this.setExpr(sp.chara, c.expr); this.focus(sp.chara); } else this.focus(null);
      if (c.who !== 'an') text = '「' + text + '」';
    } else this.focus(null);
    st.disp = { n: name, c: color, t: text };
    this.pushLog(name, text);
    const key = st.label;
    const rd = this.sys.read[key] || (this.sys.read[key] = []);
    const wasRead = rd.indexOf(i) >= 0;
    if (!wasRead) { rd.push(i); if (++this.readDirty > 20) this.saveSys(); }
    if (this.isSkipping() && !wasRead && !this.sys.cfg.skipAll) { this.skip = false; this.ctrlSkip = false; this.updateCtrl(); }
    this.showText(name, color, text);
  },
  showText(name, color, text) {
    const np = $('#namePlate');
    np.textContent = name; np.classList.toggle('empty', !name);
    if (color) np.style.setProperty('--np', color);
    this.full = text; this.shown = 0;
    this.waiting = 'text';
    $('#nextMark').classList.remove('on');
    if (!this.st.win) { this.st.win = true; }
    $('#textBox').classList.remove('hidden'); this.hiddenBox = false;
    const msg = $('#msg');
    clearInterval(this.typeTimer); clearTimeout(this.advTimer);
    const sp = this.sys.cfg.text;
    if (this.isSkipping() || sp >= 10) {
      msg.textContent = text; this.shown = text.length; this.typing = false; this.typedDone();
      return;
    }
    const cps = 14 + sp * 9;
    this.typing = true; msg.textContent = '';
    const start = performance.now(), g = this.gen;
    this.typeTimer = setInterval(() => {
      if (g !== this.gen) { clearInterval(this.typeTimer); return; }
      const n = Math.min(text.length, Math.floor((performance.now() - start) / 1000 * cps) + 1);
      if (n !== this.shown) { this.shown = n; msg.textContent = text.slice(0, n); }
      if (n >= text.length) { clearInterval(this.typeTimer); this.typing = false; this.typedDone(); }
    }, 16);
  },
  typedDone() {
    $('#nextMark').classList.add('on');
    const g = this.gen;
    if (this.isSkipping()) { this.advTimer = setTimeout(() => { if (g === this.gen && this.waiting === 'text') this.next(); }, 45); }
    else if (this.auto) this.scheduleAuto(this.full.length);
  },
  scheduleAuto(len) {
    clearTimeout(this.advTimer);
    const g = this.gen;
    const delay = 2600 - this.sys.cfg.auto * 210 + len * 45;
    this.advTimer = setTimeout(() => { if (g === this.gen && this.auto && !this.anyOverlay()) this.advance(); else if (g === this.gen && this.auto) this.scheduleAuto(len); }, Math.max(400, delay));
  },
  finishTyping() {
    clearInterval(this.typeTimer);
    this.typing = false; this.shown = this.full.length;
    $('#msg').textContent = this.full;
    this.typedDone();
  },
  next() {
    clearTimeout(this.advTimer);
    this.waiting = null;
    $('#nextMark').classList.remove('on');
    this.run();
  },
  advance() {
    if (!this.inGame || this.anyOverlay()) return;
    if (this.hiddenBox) { this.toggleBox(false); return; }
    if (this.waiting === 'text') {
      if (this.typing) this.finishTyping(); else { AudioSys.se('click'); this.next(); }
    } else if (this.waiting === 'center') {
      clearTimeout(this.advTimer);
      $('#centerText').classList.remove('show');
      this.waiting = null; this.run();
    }
  },
  pushLog(n, t) {
    const log = this.st.log;
    log.push({ n, t });
    if (log.length > 160) log.splice(0, log.length - 160);
  },
  stopTimers() {
    clearInterval(this.typeTimer); clearTimeout(this.advTimer);
    this.typing = false; this.waiting = null;
  },

  /* ---------- 選択肢 ---------- */
  showChoice(c) {
    const st = this.st;
    if (this.skip || this.ctrlSkip) { this.skip = false; this.ctrlSkip = false; this.updateCtrl(); }
    const box = $('#choices');
    box.innerHTML = '';
    const opts = c.opts.map((o, k) => ({ o, k: k + 1 })).filter(({ o }) => !o.cond || this.cond(o.cond));
    if (!opts.length) { this.waiting = null; this.run(); return; }
    this.waiting = 'choice';
    opts.forEach(({ o, k }, idx) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'choice'; b.textContent = this.fmt(o.text);
      b.style.animationDelay = (idx * .08) + 's';
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.waiting !== 'choice') return;
        AudioSys.se('select');
        box.classList.remove('show'); box.innerHTML = '';
        st.lastChoice = k;
        o.eff.forEach((ef) => this.changeAff(ef.id, ef.v));
        this.pushLog('▶ 選択', this.fmt(o.text));
        if (o.target) this.goto(o.target);
        this.waiting = null;
        this.run();
      });
      box.appendChild(b);
    });
    box.classList.add('show');
  },

  changeAff(id, v) {
    const st = this.st;
    if (!(id in st.aff) || !v) return;
    st.aff[id] = clamp(st.aff[id] + v, 0, 100);
    if (this.isSkipping()) return;
    if (v >= 5) { AudioSys.se('heart'); if (st.chars[id] && v >= 8) this.fx.hearts(v >= 12 ? 14 : 8); }
    else if (v < 0) AudioSys.se('down');
  },

  /* ---------- キャラ・背景 ---------- */
  charaEl(id) { return document.getElementById('ch-' + id); },
  showChara(id, outfit, expr, pos, instant) {
    if (!CHARA[id]) return;
    const st = this.st;
    const prev = st.chars[id];
    const of = outfit || (prev && prev.outfit) || CHARA[id].def;
    st.chars[id] = { outfit: of, expr, pos };
    let el = this.charaEl(id);
    if (!el) {
      el = document.createElement('div'); el.id = 'ch-' + id; el.className = 'chara';
      $('#charLayer').appendChild(el);
    }
    clearTimeout(el._rm);
    el.className = 'chara pos-' + pos + (el.classList.contains('in') ? ' in' : '');
    el.innerHTML = charaSVG(id, expr, of);
    if (instant || this.isSkipping()) { el.style.transition = 'none'; el.classList.add('in'); void el.offsetWidth; el.style.transition = ''; }
    else { void el.offsetWidth; el.classList.add('in'); }
  },
  setExpr(id, expr) {
    const ch = this.st.chars[id];
    if (!ch || ch.expr === expr) return;
    ch.expr = expr;
    const el = this.charaEl(id);
    if (el) el.innerHTML = charaSVG(id, expr, ch.outfit);
  },
  hideChara(id) {
    delete this.st.chars[id];
    const el = this.charaEl(id);
    if (!el) return;
    el.classList.remove('in');
    el._rm = setTimeout(() => { if (!this.st || !this.st.chars[id]) el.remove(); }, this.isSkipping() ? 0 : 480);
  },
  focus(id) {
    const ids = Object.keys(this.st.chars);
    ids.forEach((k) => { const el = this.charaEl(k); if (el) el.classList.toggle('dim', !!id && ids.length > 1 && k !== id); });
  },
  anim(id, cls) {
    const el = this.charaEl(id); if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 500);
  },
  shake() { const g = $('#game'); g.classList.remove('shake-screen'); void g.offsetWidth; g.classList.add('shake-screen'); setTimeout(() => g.classList.remove('shake-screen'), 550); },
  flash() { const f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); },
  setBg(id, time, trans) {
    this.st.bg = { id, time };
    const cur = this.bgFront === 'A' ? $('#bgA') : $('#bgB');
    const nxt = this.bgFront === 'A' ? $('#bgB') : $('#bgA');
    nxt.innerHTML = bgSVG(id, time);
    [cur, nxt].forEach((e) => { e.classList.remove('cut', 'slow'); if (trans === 'cut' || trans === 'slow') e.classList.add(trans); });
    nxt.style.zIndex = 2; cur.style.zIndex = 1;
    void nxt.offsetWidth;
    nxt.classList.add('show');
    const g = this.gen;
    setTimeout(() => { if (g === this.gen) cur.classList.remove('show'); }, trans === 'cut' ? 0 : trans === 'slow' ? 2200 : 900);
    this.bgFront = this.bgFront === 'A' ? 'B' : 'A';
  },
  restoreVisuals() {
    const st = this.st;
    $('#charLayer').innerHTML = '';
    $('#bgA').className = 'bg-slot'; $('#bgB').className = 'bg-slot';
    this.setBg(st.bg.id, st.bg.time, 'cut');
    const chars = st.chars; st.chars = {};
    Object.keys(chars).forEach((id) => { const c = chars[id]; this.showChara(id, c.outfit, c.expr, c.pos, true); });
    this.fx.resize(); this.fx.set(st.fx || 'none'); AudioSys.rain(st.fx === 'rain');
    AudioSys.playBGM(st.bgm);
    $('#centerText').classList.remove('show');
    $('#choices').classList.remove('show'); $('#choices').innerHTML = '';
    $('#map').classList.remove('show');
    $('#textBox').classList.toggle('hidden', st.win === false);
    const d = st.disp || { n: '', t: '' };
    const np = $('#namePlate'); np.textContent = d.n; np.classList.toggle('empty', !d.n); if (d.c) np.style.setProperty('--np', d.c);
    $('#msg').textContent = d.t || '';
    this.updateHud();
  },
  updateHud() {
    const st = this.st; if (!st) return;
    const dt = dateOf(st.day);
    $('#hudDate').textContent = `8月${dt.d}日(${WEEK[dt.wd]})`;
    $('#hudSlot').textContent = SLOT_NAME[st.slot];
    $('#hudLeft').textContent = st.day < DAYS ? `夏祭りまで あと${DAYS - st.day}日` : '今日は汐見夏祭り';
    $('#hud').classList.toggle('hidden', !st.hud);
  },

  /* ---------- 時間の流れ ---------- */
  advanceTime() {
    const st = this.st;
    this.stopTimers();
    $('#choices').classList.remove('show');
    st.slot++;
    if (st.slot > 1) {
      st.slot = 0; st.day = Math.min(DAYS, st.day + 1);
      this.showDayCard(() => this.afterAdvance());
    } else this.afterAdvance();
  },
  afterAdvance() {
    const st = this.st;
    this.updateHud();
    const fixed = FIXED[st.day + '-' + st.slot];
    if (fixed) {
      st.mode = 'script';
      this.goto(fixed);
      this.run();
    } else this.showMap();
  },
  showDayCard(cb) {
    const st = this.st, dt = dateOf(st.day);
    $('#dcDay').textContent = dt.d;
    $('#dcWd').textContent = WEEK_EN[dt.wd];
    $('#dcLeft').textContent = st.day < DAYS ? `夏祭りまで あと${DAYS - st.day}日` : '今日は、汐見夏祭り';
    const card = $('#dayCard');
    this.waiting = 'day';
    card.classList.add('show');
    const g = this.gen;
    let done = false;
    const finish = () => {
      if (done || g !== this.gen) return; done = true;
      card.removeEventListener('click', clickFin);
      card.classList.remove('show');
      this.waiting = null;
      setTimeout(() => { if (g === this.gen) cb(); }, 300);
    };
    const t0 = Date.now();
    const clickFin = () => { if (Date.now() - t0 > 600) finish(); };
    card.addEventListener('click', clickFin);
    setTimeout(finish, this.isSkipping() ? 700 : 2300);
  },

  /* ---------- 自由行動マップ ---------- */
  eventReady(h) {
    const st = this.st, n = st.chain[h];
    return n < 5 && st.lastEv[h] !== st.day && st.day >= EV_DAY[n] && st.aff[h] >= EV_AFF[n];
  },
  showMap() {
    const st = this.st;
    st.mode = 'map';
    this.waiting = null;
    this.skip = false; this.ctrlSkip = false; this.auto = false; this.updateCtrl();
    Object.keys(st.chars).forEach((id) => this.hideChara(id));
    st.disp = { n: '', c: null, t: '' };
    this.fx.set('none'); st.fx = 'none'; AudioSys.rain(false);
    st.bgm = 'daily'; AudioSys.playBGM('daily');
    const dt = dateOf(st.day);
    $('#mapDay').textContent = dt.d; $('#mapWd').textContent = WEEK[dt.wd];
    $('#mapSlot').textContent = SLOT_NAME[st.slot];
    $('#mapFoot').textContent = st.day < DAYS ? `夏祭りまで あと${DAYS - st.day}日` : '今夜は汐見夏祭り。最後の昼を、どう過ごそう？';
    const map = $('#map');
    map.classList.toggle('eve', st.slot === 1);
    $('#mapArt').innerHTML = mapSVG(st.slot === 1);
    const spots = $('#mapSpots'); spots.innerHTML = '';
    SPOTS.forEach((sp) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'spot';
      b.style.left = sp.x + '%'; b.style.top = sp.y + '%';
      const present = HEROINES.filter((h) => whereIs(h, st.day, st.slot) === sp.id);
      let faces = '';
      present.forEach((h) => {
        if (st.met[h]) faces += `<span class="face${this.eventReady(h) ? ' event' : ''}" style="--fc:${CHARA[h].color}">${charaSVG(h, 'smile', null, { face: true })}</span>`;
        else faces += `<span class="face unknown event">？</span>`;
      });
      if (!present.length) faces = '<span class="nobody">だれもいない</span>';
      b.innerHTML = `<span class="faces">${faces}</span><span>${sp.name}</span>`;
      if (sp.id === 'lighthouse' && st.slot === 0) b.classList.add('closed');
      b.addEventListener('click', () => { AudioSys.se('select'); this.visit(sp.id); });
      spots.appendChild(b);
    });
    map.classList.add('show');
    this.layoutMap();
    this.updateHud();
    this.saveTo('auto');
  },
  layoutMap() {
    const body = $('.map-body').getBoundingClientRect();
    const ar = 1000 / 620;
    let w = body.width, h = w / ar;
    if (h > body.height) { h = body.height; w = h * ar; }
    const l = (body.width - w) / 2, t = (body.height - h) / 2;
    [$('#mapArt'), $('#mapSpots')].forEach((e) => { e.style.left = l + 'px'; e.style.top = t + 'px'; e.style.width = w + 'px'; e.style.height = h + 'px'; e.style.right = 'auto'; e.style.bottom = 'auto'; });
  },
  visit(spotId) {
    const st = this.st;
    const present = HEROINES.filter((h) => whereIs(h, st.day, st.slot) === spotId);
    if (present.length > 1) { this.pickWho(present, spotId); return; }
    this.startVisit(spotId, present[0] || null);
  },
  pickWho(list, spotId) {
    const box = $('#choices'); box.innerHTML = '';
    const mk = (label, fn) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'choice'; b.textContent = label;
      b.addEventListener('click', (e) => { e.stopPropagation(); AudioSys.se('select'); box.classList.remove('show'); box.innerHTML = ''; fn(); });
      box.appendChild(b);
    };
    list.forEach((h) => mk((this.st.met[h] ? CHARA[h].name : '気になる人影') + ' に会いに行く', () => this.startVisit(spotId, h)));
    mk('やっぱり別の場所にする', () => { box.style.zIndex = ''; });
    box.style.zIndex = 12;
    box.classList.add('show');
  },
  startVisit(spotId, h) {
    const st = this.st;
    $('#choices').style.zIndex = '';
    const sp = SPOTS.find((s) => s.id === spotId);
    $('#map').classList.remove('show');
    st.mode = 'script';
    this.setBg(sp.bg, this.timeNow(), 'fade');
    let label;
    if (!h) label = this.leastSeen(['solo_' + spotId + '_1', 'solo_' + spotId + '_2', 'solo_' + spotId + '_3']);
    else if (this.eventReady(h)) {
      st.chain[h]++; st.lastEv[h] = st.day; st.met[h] = true;
      label = h + '_e' + st.chain[h];
    } else label = this.leastSeen([h + '_t1', h + '_t2', h + '_t3', h + '_t4']);
    st.seen[label] = (st.seen[label] || 0) + 1;
    this.goto(label);
    this.run();
  },
  leastSeen(list) {
    const ok = list.filter((l) => this.script.labels[l]);
    let min = Infinity;
    ok.forEach((l) => { min = Math.min(min, this.st.seen[l] || 0); });
    return pick(ok.filter((l) => (this.st.seen[l] || 0) === min));
  },

  /* ---------- エンディング ---------- */
  doEnding(id) {
    const e = ENDINGS.find((x) => x.id === id) || ENDINGS[ENDINGS.length - 1];
    this.skip = false; this.ctrlSkip = false; this.auto = false; this.updateCtrl();
    this.waiting = 'end';
    this.sys.endings[id] = true; this.saveSys();
    $('#ecKind').textContent = e.kind; $('#ecTitle').textContent = e.title; $('#ecDesc').textContent = e.desc;
    const card = $('#endCard');
    card.classList.add('show');
    const t0 = Date.now();
    const onClick = () => {
      if (Date.now() - t0 < 1500) return;
      card.removeEventListener('click', onClick);
      card.classList.remove('show');
      this.staffRoll();
    };
    card.addEventListener('click', onClick);
  },
  staffRoll() {
    const sr = $('#staffRoll'), sc = $('#srScroll');
    $('#textBox').classList.add('hidden');
    sr.classList.add('show');
    sc.classList.remove('run'); void sc.offsetWidth; sc.classList.add('run');
    const g = this.gen;
    let done = false;
    const fin = () => {
      if (done || g !== this.gen) return; done = true;
      $('#srSkip').removeEventListener('click', fin);
      this.fade(() => { sr.classList.remove('show'); sc.classList.remove('run'); this.toTitle(); }, 300);
    };
    $('#srSkip').addEventListener('click', fin);
    setTimeout(fin, 35000);
  },

  /* ---------- セーブ・ロード ---------- */
  slotKey(n) { return 'save_' + n; },
  hasAnySave() {
    if (Store.get(this.slotKey('auto'), null) || Store.get(this.slotKey('quick'), null)) return true;
    for (let i = 1; i <= 12; i++) if (Store.get(this.slotKey(i), null)) return true;
    return false;
  },
  canSave() { return this.st && (this.st.mode === 'map' || this.waiting === 'text' || this.waiting === 'choice' || this.waiting === 'center'); },
  saveTo(n) {
    if (!this.st) return false;
    const st = this.st, dt = dateOf(st.day);
    const b = this.best(0);
    const data = {
      st: deepCopy(st), time: Date.now(),
      info: `8月${dt.d}日(${WEEK[dt.wd]}) ${SLOT_NAME[st.slot]}`,
      text: st.mode === 'map' ? '自由行動中' : (st.disp && st.disp.t ? (st.disp.n ? st.disp.n + '：' : '') + st.disp.t.replace(/\n/g, ' ') : ''),
      best: b ? CHARA[b].name : ''
    };
    data.st.log = data.st.log.slice(-60);
    const ok = Store.set(this.slotKey(n), data);
    if (this.readDirty) this.saveSys();
    return ok;
  },
  loadFrom(n) {
    const data = Store.get(this.slotKey(n), null);
    if (!data || !data.st) return false;
    this.gen++;
    this.stopTimers();
    this.auto = false; this.skip = false; this.ctrlSkip = false; this.updateCtrl();
    this.closeAllOverlays();
    $('#dayCard').classList.remove('show'); $('#endCard').classList.remove('show');
    this.titleFx.set('none');
    this.fade(() => {
      this.st = data.st;
      this.showScreen('game');
      this.restoreVisuals();
      if (this.st.mode === 'map') this.showMap();
      else { this.st.index = this.st.lineIndex; this.run(); }
    });
    return true;
  },
  openSaveLoad(mode) {
    this.slMode = mode;
    $('#slTitle').textContent = mode === 'save' ? 'セーブ' : 'ロード';
    const list = $('#slList'); list.innerHTML = '';
    const keys = mode === 'save' ? [] : ['auto', 'quick'];
    for (let i = 1; i <= 12; i++) keys.push(i);
    keys.forEach((k) => {
      const d = Store.get(this.slotKey(k), null);
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'sl-slot' + (d ? '' : ' empty');
      const no = k === 'auto' ? 'AUTO' : k === 'quick' ? 'Q' : String(k).padStart(2, '0');
      if (d) {
        const tm = new Date(d.time);
        const ts = `${tm.getFullYear()}/${tm.getMonth() + 1}/${tm.getDate()} ${String(tm.getHours()).padStart(2, '0')}:${String(tm.getMinutes()).padStart(2, '0')}`;
        b.innerHTML = `<span class="sl-no">${no}</span><span class="sl-info"><span class="sl-date">${esc(d.info)}${d.best ? ' ♥' + esc(d.best) : ''}</span><span class="sl-text" style="display:block">${esc(d.text || '')}</span><span class="sl-time">${ts}</span></span>`;
      } else b.innerHTML = `<span class="sl-no">${no}</span><span class="sl-info"><span class="sl-date">データなし</span></span>`;
      b.addEventListener('click', () => {
        if (mode === 'save') {
          const doSave = () => { if (this.saveTo(k)) { AudioSys.se('save'); this.toast('セーブしました'); } else this.toast('セーブできませんでした（ブラウザの保存領域を確認してください）'); this.openSaveLoad('save'); };
          if (d) this.confirm(`スロット${no}に上書きセーブしますか？`, doSave); else doSave();
        } else {
          if (!d) return;
          const doLoad = () => { AudioSys.se('select'); this.loadFrom(k); };
          if (this.inGame) this.confirm('このデータをロードしますか？\n現在の進行状況は失われます。', doLoad); else doLoad();
        }
      });
      list.appendChild(b);
    });
    this.openOverlay('saveLoad');
  },

  /* ---------- オーバーレイ ---------- */
  anyOverlay() { return !!document.querySelector('.overlay.show') || $('#choices').classList.contains('show') && this.waiting !== 'choice'; },
  openOverlay(id) { $('#' + id).classList.add('show'); },
  closeOverlay(id) { $('#' + id).classList.remove('show'); },
  closeAllOverlays() { $$('.overlay').forEach((o) => o.classList.remove('show')); },
  confirm(msg, yes) {
    $('#confirmMsg').textContent = msg;
    this.confirmYes = yes;
    this.openOverlay('confirm');
  },
  toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(this.toastT); this.toastT = setTimeout(() => t.classList.remove('show'), 1800);
  },
  openLog() {
    const list = $('#logList'); list.innerHTML = '';
    (this.st ? this.st.log : []).forEach((l) => {
      const d = document.createElement('div');
      d.className = 'log-item' + (l.n === '▶ 選択' ? ' choice-log' : '');
      d.innerHTML = (l.n ? `<p class="log-name">${esc(l.n)}</p>` : '') + `<p class="log-text">${esc(l.t)}</p>`;
      list.appendChild(d);
    });
    this.openOverlay('logView');
    list.scrollTop = list.scrollHeight;
  },
  openProfile() {
    const list = $('#profList'); list.innerHTML = '';
    const moods = [[70, '大好き'], [55, '特別な人'], [40, '気になる人'], [25, '仲良し'], [10, '友達'], [0, '顔見知り']];
    HEROINES.forEach((h) => {
      const c = CHARA[h], st = this.st, met = st && st.met[h];
      const d = document.createElement('div'); d.className = 'prof'; d.style.setProperty('--pc', c.color);
      if (met) {
        const a = st.aff[h], mood = moods.find((m) => a >= m[0])[1];
        d.innerHTML = `<div class="prof-face">${charaSVG(h, a >= 55 ? 'love' : 'smile', null, { face: true })}</div>
          <div class="prof-body"><p class="prof-name">${c.full}<small>${c.kana}</small></p>
          <p class="prof-desc">${c.prof}</p><p class="prof-desc">${c.birth}　好きなもの：${c.like}</p>
          <div class="prof-meter"><span>♥</span><span class="prof-bar"><i style="width:${a}%"></i></span></div>
          <p class="prof-mood">いまの関係：${mood}</p>
          <p class="prof-stars">${'★'.repeat(st.chain[h])}${'☆'.repeat(5 - st.chain[h])}</p></div>`;
      } else {
        d.innerHTML = `<div class="prof-face locked">？</div><div class="prof-body"><p class="prof-name">？？？</p><p class="prof-desc">まだ出会っていない。町のどこかにいるらしい。</p></div>`;
      }
      list.appendChild(d);
    });
    this.openOverlay('profile');
  },
  openGallery() {
    const list = $('#galList'); list.innerHTML = '';
    const got = ENDINGS.filter((e) => this.sys.endings[e.id]).length;
    $('#galRate').textContent = `エンディング ${got} / ${ENDINGS.length}`;
    ENDINGS.forEach((e) => {
      const d = document.createElement('div'); d.className = 'gal-item';
      if (this.sys.endings[e.id]) {
        d.innerHTML = `<div class="gal-thumb">${bgSVG(e.bg, e.time || 'night')}${e.chara ? `<div class="gal-chara">${charaSVG(e.chara, e.expr, e.outfit)}</div>` : ''}</div>
          <div class="gal-cap"><p class="gal-kind">${e.kind}</p><p class="gal-title">${e.title}</p></div>`;
      } else {
        d.innerHTML = `<div class="gal-thumb locked">？</div><div class="gal-cap"><p class="gal-kind">？？？</p><p class="gal-title">まだ見ていない結末</p></div>`;
      }
      list.appendChild(d);
    });
    this.openOverlay('gallery');
  },
  openConfig() {
    const c = this.sys.cfg;
    const bind = (id, key, fmt) => { const el = $('#' + id); el.value = c[key]; $('#' + id + 'V').textContent = fmt(c[key]); };
    bind('cfgBgm', 'bgm', (v) => v); bind('cfgSe', 'se', (v) => v); bind('cfgText', 'text', (v) => (v >= 10 ? '瞬間' : v));
    bind('cfgAuto', 'auto', (v) => v); bind('cfgWin', 'win', (v) => v + '%');
    $('#cfgSkipAll').checked = !!c.skipAll; $('#cfgFx').checked = !!c.lite;
    this.openOverlay('config');
  },
  previewText() {
    const el = $('#cfgSample'), t = '潮風の匂いがする。今年の夏は、きっと忘れられないものになる――。';
    clearInterval(this.pvT);
    const sp = this.sys.cfg.text;
    if (sp >= 10) { el.textContent = t; return; }
    const cps = 14 + sp * 9, s = performance.now();
    this.pvT = setInterval(() => { const n = Math.floor((performance.now() - s) / 1000 * cps) + 1; el.textContent = t.slice(0, n); if (n >= t.length) clearInterval(this.pvT); }, 16);
  },

  /* ---------- 操作 ---------- */
  updateCtrl() {
    $('#btnAuto').classList.toggle('on', this.auto);
    $('#btnSkip').classList.toggle('on', this.skip);
  },
  toggleBox(hide) {
    this.hiddenBox = hide;
    $('#textBox').classList.toggle('hidden', hide);
    $('#hud').classList.toggle('hidden', hide || (this.st && !this.st.hud));
  },
  ctrl(cmd) {
    switch (cmd) {
      case 'auto':
        this.auto = !this.auto; this.skip = false; this.updateCtrl();
        if (this.auto && this.waiting === 'text' && !this.typing) this.scheduleAuto(this.full.length);
        if (this.auto && this.waiting === 'center') this.scheduleAuto(10);
        break;
      case 'skip':
        this.skip = !this.skip; this.auto = false; this.updateCtrl();
        if (this.skip && this.waiting === 'text') { if (this.typing) this.finishTyping(); else this.next(); }
        else if (this.skip && this.waiting === 'center') this.advance();
        break;
      case 'log': this.openLog(); break;
      case 'qsave':
        if (!this.canSave()) { this.toast('いまはセーブできません'); break; }
        if (this.saveTo('quick')) { AudioSys.se('save'); this.toast('クイックセーブしました'); } else this.toast('セーブできませんでした');
        break;
      case 'menu': this.openOverlay('gameMenu'); break;
      case 'hide': this.toggleBox(true); break;
      default: break;
    }
  },
  bindUI() {
    /* スプラッシュ */
    $('#splash').addEventListener('click', () => {
      AudioSys.unlock();
      this.fade(() => { $('#splash').classList.remove('active'); this.toTitle(); });
    }, { once: true });
    /* タイトル */
    $$('.tm-btn').forEach((b) => b.addEventListener('click', () => {
      AudioSys.se('select');
      const act = b.dataset.act;
      if (act === 'new') { this.fade(() => { this.showScreen('nameEntry'); }); }
      else if (act === 'continue') this.openSaveLoad('load');
      else if (act === 'gallery') this.openGallery();
      else if (act === 'config') this.openConfig();
      else if (act === 'howto') this.openOverlay('howto');
    }));
    /* 名前入力 */
    $('#nameBack').addEventListener('click', () => { AudioSys.se('cancel'); this.fade(() => this.showScreen('title')); });
    const startGame = () => {
      const clean = (v, d) => { v = (v || '').replace(/[\s<>{}\\]/g, '').slice(0, 6); return v || d; };
      const sn = clean($('#inSname').value, '水瀬'), n = clean($('#inName').value, '湊');
      AudioSys.se('select');
      if (document.activeElement) document.activeElement.blur();
      this.newGame(sn, n);
    };
    $('#nameOk').addEventListener('click', startGame);
    ['#inSname', '#inName'].forEach((s) => $(s).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); startGame(); } }));
    /* 本編クリック */
    const game = $('#game');
    game.addEventListener('pointerup', (e) => {
      if (e.button && e.button !== 0) return;
      if (e.target.closest('button, .overlay, .map, .choices.show, input')) return;
      this.advance();
    });
    game.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.inGame && !this.anyOverlay() && this.st && this.st.mode !== 'map' && this.waiting !== 'day' && this.waiting !== 'end') this.openOverlay('gameMenu');
    });
    game.addEventListener('wheel', (e) => {
      if (e.deltaY < 0 && this.inGame && !this.anyOverlay() && this.st && this.st.mode === 'script') this.openLog();
      else if (e.deltaY > 0 && this.inGame && !this.anyOverlay()) this.advance();
    }, { passive: true });
    $$('.tb-ctrl button').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); AudioSys.se('click'); this.ctrl(b.dataset.cmd); }));
    $('#mapMenuBtn').addEventListener('click', () => { AudioSys.se('click'); this.openOverlay('gameMenu'); });
    /* ゲーム内メニュー */
    $$('.gm-btn').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.gm;
      AudioSys.se(a === 'close' ? 'cancel' : 'select');
      if (a === 'close') { this.closeOverlay('gameMenu'); return; }
      if (a === 'save') { if (!this.canSave()) { this.toast('いまはセーブできません'); return; } this.closeOverlay('gameMenu'); this.openSaveLoad('save'); }
      else if (a === 'load') { this.closeOverlay('gameMenu'); this.openSaveLoad('load'); }
      else if (a === 'qload') {
        if (!Store.get(this.slotKey('quick'), null)) { this.toast('クイックセーブがありません'); return; }
        this.confirm('クイックセーブをロードしますか？', () => this.loadFrom('quick'));
      }
      else if (a === 'profile') { this.closeOverlay('gameMenu'); this.openProfile(); }
      else if (a === 'log') { this.closeOverlay('gameMenu'); this.openLog(); }
      else if (a === 'config') { this.closeOverlay('gameMenu'); this.openConfig(); }
      else if (a === 'title') this.confirm('タイトルに戻りますか？\nセーブしていない進行状況は失われます。', () => this.fade(() => this.toTitle()));
    }));
    $('#gameMenu').addEventListener('click', (e) => { if (e.target.id === 'gameMenu') this.closeOverlay('gameMenu'); });
    /* 閉じるボタン */
    $$('[data-close]').forEach((b) => b.addEventListener('click', () => { AudioSys.se('cancel'); this.closeOverlay(b.dataset.close); }));
    $$('.overlay').forEach((o) => o.addEventListener('click', (e) => { if (e.target === o && o.id !== 'confirm' && o.id !== 'gameMenu') this.closeOverlay(o.id); }));
    /* 確認 */
    $('#confirmYes').addEventListener('click', () => { this.closeOverlay('confirm'); const f = this.confirmYes; this.confirmYes = null; if (f) f(); });
    $('#confirmNo').addEventListener('click', () => { AudioSys.se('cancel'); this.closeOverlay('confirm'); this.confirmYes = null; });
    /* 設定 */
    const cfgIn = (id, key, fmt, after) => $('#' + id).addEventListener('input', (e) => {
      this.sys.cfg[key] = parseInt(e.target.value, 10); $('#' + id + 'V').textContent = fmt(this.sys.cfg[key]);
      this.applyCfg(); if (after) after(); this.saveSys();
    });
    cfgIn('cfgBgm', 'bgm', (v) => v); cfgIn('cfgSe', 'se', (v) => v, () => AudioSys.se('click'));
    cfgIn('cfgText', 'text', (v) => (v >= 10 ? '瞬間' : v), () => this.previewText());
    cfgIn('cfgAuto', 'auto', (v) => v); cfgIn('cfgWin', 'win', (v) => v + '%');
    $('#cfgSkipAll').addEventListener('change', (e) => { this.sys.cfg.skipAll = e.target.checked; this.saveSys(); });
    $('#cfgFx').addEventListener('change', (e) => { this.sys.cfg.lite = e.target.checked; this.applyCfg(); this.saveSys(); });
    $('#cfgReset').addEventListener('click', () => this.confirm('セーブデータ・既読・エンディング記録をすべて消去します。\n本当によろしいですか？', () => {
      Store.clearAll();
      this.sys = { cfg: deepCopy(DEFAULT_CFG), endings: {}, read: {} };
      this.applyCfg(); this.closeAllOverlays(); this.toast('すべてのデータを消去しました');
      this.fade(() => this.toTitle());
    }));
    /* キーボード */
    document.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;
      if (e.key === 'Control') { if (this.inGame && this.st && this.st.mode === 'script' && !this.anyOverlay()) { this.ctrlSkip = true; if (this.waiting === 'text') { if (this.typing) this.finishTyping(); else this.next(); } } return; }
      if (e.key === 'Escape') {
        const open = $$('.overlay.show');
        if (open.length) { this.closeOverlay(open[open.length - 1].id); return; }
        if (this.inGame && this.st && this.waiting !== 'day' && this.waiting !== 'end') this.openOverlay('gameMenu');
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        if (this.inGame && !this.anyOverlay() && (this.waiting === 'text' || this.waiting === 'center')) { e.preventDefault(); this.advance(); }
      }
    });
    document.addEventListener('keyup', (e) => { if (e.key === 'Control') this.ctrlSkip = false; });
    window.addEventListener('blur', () => { this.ctrlSkip = false; });
  }
};

/* ---------- スマホ（Safari）向け：長押し・ダブルタップ・ピンチ拡大の抑止 ---------- */
if (IS_BROWSER) {
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', (e) => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    const t = e.target;
    const interactive = t && t.closest && t.closest('button, input, a, label');
    if (!interactive && now - lastTouchEnd <= 320) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
  document.addEventListener('contextmenu', (e) => { if (!(e.target && e.target.tagName === 'INPUT')) e.preventDefault(); });
  document.addEventListener('selectstart', (e) => { if (!(e.target && e.target.tagName === 'INPUT')) e.preventDefault(); });
}

/* =========================================================
   7. シナリオ本文
   ========================================================= */
const SCENARIO = String.raw`
// ===================== プロローグ =====================
#prologue
@bgm stop
@hud off
@window off
@center 8月17日。\n夏休みも、残り二週間。
@center 潮風の町、汐見町。\nこの町で過ごす、十七回目の夏。
@window on
@bg room day slow
@hud on
@se cicada
セミの声で目が覚めた。……いや、正確には。
xx: 起きろーーーっ！！
@se door
@shake
@show hi smile center
hi.laugh: おっはよー{name}！ いつまで寝てんの、もう十時だよ！
me: ……陽葵。なんで当たり前みたいに俺の部屋にいるんだよ。
hi.smile: おばさんが「どうぞどうぞ」って。顔パスだもん、私。
朝比奈陽葵。隣の家に住む幼なじみで、物心ついた頃からずっとこの調子だ。
水泳部のエースで、日に焼けた肌と、太陽みたいな笑顔。……本人に言うと調子に乗るから、絶対に言わないけど。
@choice
> 素直に起きる {hi+3}
> 布団にもぐる
[1]me: わかったわかった、起きるよ。
[1]hi.laugh: よろしい！ 素直な{name}には、あとでラムネをおごってあげよう。
[2]me: ……あと五分。
[2]hi.pout: だーめ！ ほら、布団没収！
[2]@se door
[2]布団をひっぺがされた。容赦がない。
hi.talk: ねえねえ、知ってる？ 今年の汐見夏祭り、花火が過去最多なんだって！
me: それ毎年言ってない？
hi.smile: 今年はほんとだってば。八月三十日。……あと、二週間。
hi.think: ……。
一瞬、陽葵の横顔が曇った気がした。
me: 陽葵？
hi.laugh: あ、ううん！ なんでもない！ とにかく、残りの夏休み、だらだらしてたらもったいないって話！
hi.smile: 私これからプールで練習だから。じゃあね、ちゃんと外に出るんだよ！
@hide hi
@se step
嵐のように去っていった。
@bg town day
@bgm daily
着替えて外に出ると、坂道の向こうで海がきらきらと光っていた。
ke: よう、{name}！ 生きてたか！
堂島健太。中学からの悪友で、口を開けば「彼女ほしい」しか言わない男だ。
ke: 聞いてくれ。今年こそ俺は、夏祭りまでに彼女をつくる。そう決めた。
me: 去年も聞いた。
ke: 去年の俺とは違う。……で、だ。この町の「噂のヒロイン情報」を仕入れてきた。
ke: まず一人目。夏休み中も毎日図書室にいる「図書室の幽霊」。うちのクラスの白鷺らしい。
ke: 二人目。生徒会長の神崎先輩。夏祭りの実行委員長で、手伝いを探してるって話だ。完璧超人すぎて、誰も近寄れねえけどな。
ke: 三人目。これはマジの怪談なんだけど……夕方の灯台に、白いワンピースの女の子が出るんだと。
me: 灯台の幽霊？
ke: そう。話しかけると、名前を呼ばれるらしいぜ。……会ったこともないのに。
灯台。
その言葉を聞いた瞬間、胸の奥で何かがかすかに鳴った。……気のせい、だろうか。
ke: ま、俺はいろいろ回ってみるわ。お前も、せっかくの夏なんだから誰かと過ごせよな！
@center 夏祭りまで、残された時間は十四日。\n――この夏を、誰と過ごそう。
毎日「昼」と「夕方」に、町の行きたい場所を選ぼう。光っている顔のところでは、何かが起こりそうだ。
@free

// ===================== 陽葵 =====================
#hi_e1
@bg pool $t
@bgm daily
@se splash
水しぶきの音がした。
フェンス越しにプールをのぞくと、一人だけ、ものすごい速さでレーンを往復している影がある。
しばらくして、ジャージを羽織った陽葵がプールサイドからこっちに気づいた。
@show hi:uni surprise center
hi.surprise: あれ、{name}？ 見に来てくれたの？
me: 外に出ろって言ったの、お前だろ。
hi.laugh: えへへ、ほんとに来るとは思わなかった。ねえ、ちょうどいいや。タイム計ってくれない？
ストップウォッチを押しつけられる。……断れる空気じゃない。
@hide hi
@se splash
@wait 900
@se splash
五十メートル。ストップウォッチの数字を見て、思わず目を疑った。
@show hi:uni talk center
hi.talk: 何秒だった？
me: 二十七秒……八。
hi.surprise: ……ほんと？
hi.laugh: やった……！ 自己ベスト！ {name}、やったよ！
@hop hi
濡れた手でぶんぶんと腕を振られる。水滴が飛んで、夏の光がはじけた。
@choice
> 「すごいな、陽葵」 {hi+8}
> 「喜びすぎ。無理すんなよ」 {hi+5}
[1]me: すごいな。本当に速くなったな、陽葵。
[1]hi.blush: ……っ。な、なに急に。{name}に素直に褒められると、調子狂うんだけど。
[1]hi.love: ……でも、ありがと。
[2]me: 喜ぶのはいいけど、無理はすんなよ。顔、真っ赤だぞ。
[2]hi.pout: これは日焼けですー。……もう、昔から心配性なんだから。
[2]hi.smile: でも、ありがと。
hi.normal: 私ね、この夏で絶対、自己ベストを出し切りたいんだ。
me: 大会でもあるのか？
hi.think: ……うん。まあ、そんな感じ。
hi.smile: だからさ、たまにこうやって見に来てよ。{name}がいると、なんか速く泳げる気がするんだ。
@end

#hi_t1
@show hi smile center
hi.laugh: お、{name}！ 暇そうだねー。
me: お前に言われたくない。
hi.smile: 私は忙しいもん。練習して、食べて、寝て、また練習。
hi.talk: あ、そうだ。駄菓子屋のおばあちゃんがね、{name}は最近来ないのかいって言ってたよ。
me: もう何年も行ってないな。
hi.smile: 昔は毎日二人で行ってたのにねー。十円ガム、どっちが当たりを出すか競争してさ。
hi.laugh: ……ま、勝率は私のほうが上だったけど！
@aff hi 3
@end

#hi_t2
@show hi normal center
hi.normal: ねえ{name}。……もしもだよ？ もし私が急にいなくなったら、どうする？
me: は？ なんだよ急に。
hi.panic: あ、い、いや！ ほら、あれ！ 夏休みの作文のテーマ！ 「もしも」シリーズ！
me: そんな課題あったか？
hi.laugh: あるある！ ……たぶん！
@choice
> 「寂しいに決まってるだろ」 {hi+4}
> 「静かになっていいかもな」 {hi-2}
[1]hi.blush: ……そっか。……そっかぁ。
[1]hi.smile: うん、作文の参考にする！
[2]hi.pout: ひどっ！ ……もういい、{name}のばか。
[2]hi.sad: ……ほんとに、そう思う？
[2]me: 冗談だよ。
[2]hi.smile: ……知ってる。
@aff hi 2
@end

#hi_t3
@show hi smile center
hi.smile: 見て見て、日焼けの跡。ここからくっきり！
me: そういうのを見せびらかすな。
hi.laugh: あはは、{name}照れてるー！
hi.normal: ……ねえ、覚えてる？ 小学生のとき、二人で海に行って、帰り道で迷子になったこと。
me: 覚えてる。お前が泣きだして、俺も泣きそうだった。
hi.smile: そうそう。でも{name}、ずっと手をつないでてくれたよね。「大丈夫、大丈夫」って。
hi.blush: ……あれ、実はちょっと、うれしかったんだ。
@aff hi 3
@end

#hi_t4
@show hi talk center
hi.talk: {name}ー！ ちょうどよかった、ラムネ一本多く買っちゃったの。はい！
me: お、サンキュ。
@se click
ビー玉がからんと鳴る。一口飲むと、しゅわっとした甘さが喉を抜けていった。
hi.smile: 夏って感じだよねー。私、ラムネのビー玉、いまだに取り出したくなるんだ。
hi.think: ……閉じこめられてるみたいで、なんかかわいそうじゃない？ 外に出たいのかなって。
me: ビー玉に感情移入するなよ。
hi.laugh: あはは、だよね！ ……うん、だよね。
@aff hi 3
@end

#hi_e2
@bg shotengai $t
@show hi smile center
hi.laugh: あ、{name}！ ナイスタイミング！ ちょっと付き合って！
腕を引っぱられて連れていかれたのは、商店街の外れにある駄菓子屋だった。
hi.smile: 懐かしいでしょ。おばあちゃん、まだ元気なんだよ。
色とりどりのお菓子。少しほこりっぽい匂い。十年前から、ここだけ時間が止まっているみたいだ。
hi.talk: よーし、勝負！ 当たり付きアイス、先に当たりを出したほうの勝ち！ 負けたほうは……
me: 負けたほうは？
hi.wink: 勝ったほうのお願いを、ひとつ聞く！
@choice
> 「受けて立つ」 {hi+6}
> 「お前が何か頼みたいだけだろ」 {hi+3}
[1]me: いいぜ。昔の借り、返してやる。
[1]hi.laugh: そうこなくっちゃ！
[2]me: それ、お前が何か頼みたいだけだろ。
[2]hi.panic: ぎくっ。……い、いいから！ やるの！
@se select
二人同時に、アイスの棒を見る。
@wait 700
hi.surprise: ……あ。
陽葵の棒には「あたり」の三文字。俺のは、はずれ。
hi.laugh: やったー！ 私の勝ちー！
me: くっそ……。で、お願いって？
hi.think: んー……。
陽葵はアイスをくわえたまま、しばらく空を見上げていた。
hi.shy: ……じゃあさ。夏祭り、一緒に行ってよ。
me: え？ 毎年一緒に行ってるだろ。
hi.panic: そ、そうだけど！ 今年は、その……ちゃんと約束、しておきたいの！ 絶対だからね！
hi.smile: 約束やぶったら、ハリセンボンだからね。
me: わかったよ。
hi.love: ……えへへ。
溶けかけたアイスが、陽葵の指先を伝って落ちた。
@flag hi_promise
@aff hi 4
@end

#hi_e3
@bg beach eve
@bgm daily
夕暮れの海岸。波打ち際で、陽葵がひとりで海を見つめていた。
@show hi normal center
hi.smile: あ、{name}。……ちょっとだけ、海で泳いでいこうかなって。
me: プールでさんざん泳いだんだろ。
hi.normal: プールは練習。海は……なんていうか、心の洗濯？
そう言って陽葵は上着を脱ぎ捨て、下に着ていた水着のまま海へ入っていった。
@hide hi
@se wave
オレンジ色の海を、陽葵がきれいなフォームで進んでいく。
……本当に、魚みたいだ。
@wait 900
@bgm tension
@se splash
――そのとき。沖のほうで、水しぶきが乱れた。
hi: {name}っ……！ あし、が……っ！
me: 陽葵！！
@shake
考えるより先に、体が動いていた。
@se splash
服のまま海に飛びこむ。水が重い。でも、そんなことはどうでもよかった。
@wait 700
必死に手を伸ばす。指先が、陽葵の手首をつかんだ。
@bg beach eve slow
@bgm romance
@wait 500
@show hi cry center
hi.cry: げほっ、げほ……っ。
砂浜に倒れこんだ陽葵は、俺のシャツをぎゅっとつかんで離さなかった。
hi.cry: ……こわ、かった……。足、つって……もう、だめかと……。
me: ばか。泳ぎ慣れてるやつほど油断するんだよ。
hi.cry: ……うん。ごめん。……ごめんね。
@choice
> 何も言わず、頭をなでる {hi+10}
> 「心配させんな」と叱る {hi+8}
> 「エースが溺れてどうすんだよ」と茶化す {hi+2}
[1]濡れた髪を、そっとなでた。陽葵の肩が小さく震えて――やがて、静かになった。
[1]hi.tearsmile: ……{name}の手、昔から変わんないね。あったかい。
[2]me: ……心配させんな。心臓止まるかと思った。
[2]hi.tearsmile: ……うん。……えへへ、{name}が本気で怒るの、久しぶりに見た。
[3]me: 水泳部のエースが海で溺れてどうすんだよ。
[3]hi.pout: うぅ……言い返せない……。
[3]hi.sad: ……でも、ちょっとくらい優しくしてくれてもいいじゃん。
hi.shy: ……ねえ。助けてくれて、ありがと。
hi.blush: {name}が来てくれなかったら、私……。
陽葵はそこで言葉を切って、真っ赤な顔で夕陽のほうを向いた。
hi.shy: ……い、今の、忘れて。
夕陽のせいだけじゃない。陽葵の頬は、ずっと赤いままだった。
@aff hi 3
@end

#hi_e4
@bg town eve
@bgm sad
帰り道。坂の上で、陽葵が立ち止まった。
@show hi sad center
hi.sad: ……{name}。話があるの。
いつもと違う声だった。
hi.normal: 東京の高校から、推薦の話が来てるの。水泳の強豪校。
hi.normal: 九月から転校。寮に入るんだ。……もう、ほとんど決まってる。
me: ……九月って。
hi.sad: うん。夏休みが終わったら、私、この町からいなくなる。
蝉の声が、急に遠くなった気がした。
hi.cry: ずっと言わなきゃって思ってた。でも言ったら、この夏が「最後の夏」になっちゃう気がして……。
hi.cry: 普通に、いつもみたいに、{name}と過ごしたかったの。
@choice
> 「行けよ。全力で応援する」 {hi+12}
> 「……行くなよ」 {hi+10}
> 「なんで黙ってたんだよ」 {hi+3}
[1]me: ……行けよ。お前の泳ぎ、もっと広いところで見せてこい。
[1]me: 俺は、全力で応援する。
[1]hi.tearsmile: ……っ。
[1]hi.tearsmile: ずるいなぁ……そんなふうに言われたら、泣いちゃうじゃん……。
[2]me: ……行くなよ。
[2]hi.surprise: ……え。
[2]me: いや……ごめん。今のは、ただのわがままだ。
[2]hi.cry: ……ううん。うれしい。ほんとは、そう言ってほしかったのかも。
[2]hi.tearsmile: 行くけどね。……でも、ありがと。
[3]me: なんで、ずっと黙ってたんだよ。
[3]hi.cry: ……ごめん。
[3]hi.sad: ……怒るよね。そうだよね。
[3]気まずい沈黙が流れた。本当は、責めたかったわけじゃないのに。
hi.normal: ……残りの夏休み、ちゃんと、思い出いっぱいつくろうね。
hi.smile: 私、この町のこと、ぜったい忘れないように。
@flag hi_known
@end

#hi_e5
@bg boathouse day
@bgm romance
@show hi smile center
hi.laugh: じゃーん！ ひみつきち、まだ残ってた！
海沿いの古い船小屋。子どものころ、俺と陽葵が「ひみつきち」と呼んで入りびたっていた場所だ。
hi.smile: 引っ越す前に、どうしてもここに来たかったんだ。……それに、掘り出したいものもあるし。
me: 掘り出したいもの？
hi.wink: タイムカプセル！ 小二のとき埋めたでしょ、「十年後に開けよう」って。
@se step
棚の奥から出てきた、さびた缶。ふたを開けると、ビー玉と、しおれた折り紙と――二通の手紙。
hi.surprise: あ……。
陽葵の手紙が、ひらりと落ちた。拾い上げると、大きなひらがなが目に飛びこんでくる。
@center 『おおきくなったら、{name}のおよめさんになる。　ひまり』
hi.panic: わーーーっ！！ 見ないで！ 見ちゃだめーっ！！
@shake
me: ……もう見た。
hi.panic: うそでしょ……なんで小二の私、そんなこと書いてるの……！
@choice
> 「……俺のも読むか？」 {hi+10}
> 「かわいいとこあるじゃん」 {hi+7}
[1]me: ……俺のも、読むか？
[1]hi.surprise: え？
[1]俺の手紙には、へたくそな字でこう書いてあった。『ずっと、ひまりとあそべますように』。
[1]hi.tearsmile: ……なにそれ。……ずるいよ、ほんとに。
[2]me: かわいいとこあるじゃん、小二の陽葵。
[2]hi.pout: 小二のって言うな！ ……今の私は、かわいくないって言うの？
[2]me: ……今も、まあ。
[2]hi.blush: ……っ！ まあって何！ まあって！
hi.shy: ……ねえ、{name}。
hi.shy: 夏祭りの日。花火の最後の一発、一緒に見てくれる？
――最後の花火を一緒に見た二人は、結ばれる。この町の、古い言い伝え。
hi.love: ……約束、だよ。
@flag hi_last
@aff hi 3
@end

// ===================== 雫 =====================
#sz_e1
@bg library $t
@bgm daily
夏休みの図書室は、しんと静まりかえっていた。
冷房の音と、紙の上をペンが走る音だけが聞こえる。
窓際の席で、黒髪の女の子が一心不乱にノートに何かを書いている。
@se step
近づいた拍子に、机の端から一枚の紙がひらりと落ちた。
拾い上げると、きれいな字が並んでいた。
@center 『彼の横顔を見るたびに、胸の奥で小さな鈴が鳴る。\nそれが恋という名前だと、私はまだ知らなかった。』
@show sz surprise center
?sz.surprise: ……っ！！
?sz.panic: か、返してください……！
me: あ、ごめん。落ちてたから。
紙をひったくるように取り返すと、その子は真っ赤な顔でノートを抱きしめた。
?sz.panic: ……読みましたか。
me: えっと、ちょっとだけ。
?sz.panic: ……わすれてください。いますぐ。記憶から、消去を。
よく見たら、同じクラスの白鷺雫だった。教室でも、ほとんど声を聞いたことがない。
@choice
> 「すごくいい文章だった」 {sz+8}
> 「ごめん、何も見てない」 {sz+4}
[1]me: 忘れるのはもったいないよ。すごくいい文章だった。
[1]sz.blush: ……え。
[1]sz.shy: ……本当、ですか。お世辞なら、いりません。
[1]me: 本当。続きが気になる。
[1]sz.blush: ……そう、ですか。……そう。
[2]me: ごめん、何も見てない。……ってことにしとく。
[2]sz.think: ……それ、見た人の言い方です。
[2]sz.normal: でも、ありがとうございます。……その気遣いは、嫌いじゃないです。
sz.normal: 白鷺、雫です。……知ってると思いますけど。
me: 知ってる。{sname}{name}。同じクラスの。
sz.smile: ……知ってます。窓際の、いつも眠そうな人。
それが、「図書室の幽霊」との、はじめての会話だった。
@end

#sz_t1
@show sz normal center
[?flag:sz_name]sz.normal: ……あ、{name}くん。
[?!flag:sz_name]sz.normal: ……あ、{sname}くん。
sz.smile: また来たんですか。……暇なんですね。
me: 白鷺こそ、毎日いるよな。
sz.think: 図書室は、涼しいし、静かだし、誰にも邪魔されないので。
sz.smile: ……最近は、ときどき邪魔が入りますけど。
me: 俺のこと？
sz.shy: ……さあ。どうでしょう。
@aff sz 3
@end

#sz_t2
@show sz normal center
sz.normal: ……どんな本を、読みますか。
@choice
> 「漫画くらいかな」 {sz+2}
> 「白鷺のおすすめが読みたい」 {sz+5}
[1]sz.smile: 漫画も立派な物語です。……馬鹿にしたりしません。
[1]sz.think: 最近、何を読みましたか。……ふむ。今度、貸してください。
[2]sz.surprise: ……わたしの、おすすめ。
[2]sz.blush: ……じゃあ、これ。短くて、読みやすくて……最後に、少しだけ泣けます。
[2]差し出された文庫本には、小さな付箋がたくさん貼ってあった。
@aff sz 2
@end

#sz_t3
@show sz think center
sz.think: ……「好き」って、どんな感じですか。
me: ぶっ……！ な、なんだよ急に。
sz.normal: 小説の参考です。……わたし、よくわからないので。
@choice
> 真面目に答える {sz+5}
> はぐらかす {sz+1}
[1]me: ……そいつのことばっかり考えちゃう、とか？ 何してても、ふと思い出すとか。
[1]sz.surprise: ……。
[1]sz.shy: ……メモ、しておきます。……思ったより、ちゃんとした答えでした。
[2]me: そういうのは、自分で見つけるもんだろ。
[2]sz.pout: ……ずるい答えです。
@aff sz 2
@end

#sz_t4
@show sz smile center
sz.smile: ……こんにちは。今日は、雨が降らなそうで残念です。
me: 雨、好きなのか？
sz.closed: はい。雨の音は、世界の音をぜんぶやさしくしてくれるので。
sz.smile: 雨の日の図書室は、世界でいちばん静かな場所になるんです。
sz.normal: ……今度、雨が降ったら。あなたも、来てみてください。
@aff sz 3
@end

#sz_e2
@bg library $t
@bgm daily
@show sz normal center
sz.normal: ……{sname}くん。お願いが、あります。
めずらしく、白鷺のほうから声をかけてきた。
sz.normal: わたし、小説のコンテストに応募するんです。締め切りは、八月三十一日。
sz.sad: でも……最後まで、書けなくて。
me: 最後？
sz.sad: 恋愛小説なんです。でもわたし、恋をしたことがないから。……二人がどうなるのか、結末がわからないんです。
sz.normal: だから、その……取材に、協力してもらえませんか。
me: 取材？
sz.blush: ……こ、恋人の、ふり……の、ような。ことを……。
sz.panic: あ、ち、違います！ 変な意味じゃなくて、あくまで取材で、資料として……！
耳まで真っ赤にして、白鷺はノートで顔を隠した。
@choice
> 「いいよ、協力する」 {sz+8}
> 「なんで俺なんだ？」 {sz+5}
[1]me: いいよ。俺でよければ。
[1]sz.surprise: ……本当ですか。
[1]sz.smile: ……ありがとう、ございます。……よかった。
[2]me: それはいいけど……なんで俺なんだ？
[2]sz.think: ……わたしの文章を「いい」って言ってくれたのは、{sname}くんがはじめてだったので。
[2]sz.shy: ……理由としては、不十分ですか。
[2]me: ……いや、十分。
sz.normal: では、契約成立です。取材期間は、夏休みが終わるまで。
sz.smile: よろしくお願いします。……「取材相手」さん。
@flag sz_contract
@aff sz 3
@end

#sz_e3
@bg shotengai $t
@bgm romance
@show sz:casual normal center
待ち合わせ場所に現れた白鷺は、いつもの制服じゃなかった。
淡い紫のカーディガン。……普通に、かわいい。
sz.normal: お、おまたせしました。……本日は、「デート」の取材です。
sz.think: まずは喫茶店に入る。メニューを見る。……ここで男性は、何を注文しますか。
me: 普通にアイスコーヒーだけど。
sz.normal: ……アイスコーヒー、と。
@bg cafe $t
それから白鷺は、俺の一挙一動をぜんぶメモしていった。
ストローの差し方。笑ったときの顔。店員さんへのお礼の言い方。
sz.think: ……{sname}くんは、店員さんに「ありがとうございます」を言う人。好感度、プラス。
me: 採点されてる……？
sz.laugh: ふふっ……。
――白鷺が、笑った。
小さく、でもたしかに。はじめて見る顔だった。
sz.surprise: ……な、なんですか。じっと見て。
@choice
> 「笑った顔、はじめて見た」 {sz+8}
> 「取材なら、手もつないでみる？」 {sz+10}
[1]me: 白鷺が笑うの、はじめて見たなと思って。
[1]sz.blush: ……っ。
[1]sz.shy: ……それ、メモしていいですか。自分のこと、ですけど。
[2]me: 取材なんだろ。手とか、つないでみる？
[2]sz.panic: て、ててて、て……！？
[2]sz.blush: ……い、いえ、取材です。取材ですから。……必要な、工程、です。
[2]テーブルの下で、ためらいがちに指先が触れた。ひんやりしていて、でも、すぐに熱くなった。
[2]sz.love: ……心拍数、上昇。……わたしの、ほうが。
sz.shy: ……今日は、とても良い取材になりました。
sz.smile: ……たぶん、小説の中の二人より、わたしのほうがドキドキしてました。
@aff sz 3
@end

#sz_e4
@bg shrine eve
@bgm sad
@show sz sad center
神社の石段に、白鷺がひとりで座っていた。膝の上には、あのノート。
sz.sad: ……{sname}くん。
sz.normal: わたしの母は、昔、小説家だったんです。
sz.normal: 本も何冊か出して。でもある日「もう書けない」って。それきり、ペンを置いてしまいました。
sz.sad: 母は言いました。「物語の結末なんて、現実はいつも裏切るのよ」って。
sz.cry: ……わたし、こわいんです。結末を書くのが。書いた瞬間に、ぜんぶ終わってしまう気がして。
白鷺は、ノートを差し出した。
sz.normal: ……読んで、くれますか。今まで、誰にも見せたことのない原稿です。
ページをめくる。
――夏休みの図書室。本ばかり読んでいる女の子と、窓際でいつも眠そうな男の子。
これは。
me: ……これ、俺たちの話？
sz.panic: ち、ちが……！ いえ、その、モデルに、しているだけで……！
sz.blush: ……はい。……そう、です。
@choice
> 「続きが読みたい。最後まで」 {sz+12}
> 「結末は、一緒に探そう」 {sz+10}
[1]me: 続きが読みたい。この二人がどうなるのか、最後まで。
[1]sz.surprise: ……。
[1]sz.tearsmile: ……そんなこと言われたら、書くしかないじゃないですか。
[2]me: 結末がこわいなら、一緒に探そう。取材はまだ終わってないだろ。
[2]sz.tearsmile: ……はい。……はい。
sz.smile: ……{sname}くん。……ううん。
sz.shy: ……{name}くん、って、呼んでもいいですか。……作中の、名前なので。
me: ……じゃあ俺も、雫って呼んでいい？
sz.panic: そ、それは……！ ……本番まで、とっておいてください。
@flag sz_name
@aff sz 3
@end

#sz_e5
@bg library eve
@bgm romance
@show sz sleep center
夕方の図書室。白鷺は、原稿の上に突っ伏して眠っていた。
机の上には、書いては消した跡だらけの紙の山。……昨日も、たぶん徹夜したんだろう。
起こすのも悪くて、隣の席に座る。
@wait 900
こつん、と。白鷺の頭が、俺の肩にもたれてきた。
@choice
> そのまま肩を貸す {sz+10}
> 上着をかけてあげる {sz+8}
[1]動けない。……いや、動きたくなかった。
[1]窓から入る夕陽が、白鷺のまつげを金色に染めている。
[2]そっと上着をかける。白鷺は小さく身じろぎして、また寝息をたてはじめた。
@wait 700
sz.sleep: ……ん……。
sz.surprise: ……っ！？ え、あ、わ、わたし……！
sz.panic: ご、ごめんなさい……！ ずっと、{name}くんに……！
me: いいよ。よく寝てた。
sz.blush: ……寝顔、見ましたね。
me: ……ちょっとだけ。
sz.pout: ……取材の、仕返しですか。
それから白鷺は、原稿の最後のページをじっと見つめた。
sz.normal: ……結末、決めました。でも、最後のシーンだけは、まだ書けないんです。
sz.normal: 物語の最後は、夏祭りの夜。花火の下で、二人が……。
sz.shy: ……だから、{name}くん。
sz.love: 最後のシーン。一緒に……見てくれますか。夏祭りで。
@flag sz_last
@aff sz 3
@end

// ===================== 玲奈 =====================
#re_e1
@bg shotengai $t
@bgm daily
商店街の角を曲がったとたん、ドサドサッと大きな音がした。
@se shock
崩れた段ボールの山に、女子生徒が半分埋もれている。
@show re serious center
?re.surprise: ……っ。
?re.serious: ……見なかったことにしなさい。
me: いや、無理があるでしょう。……手伝いますよ。
段ボールの中身は、たくさんの提灯だった。
?re.normal: ……助かりました。礼を言います。
生徒会長、神崎玲奈先輩。全校集会で何度も見た、凛とした横顔。
re.normal: あなたは……二年の{sname}くん、でしたね。
me: 俺のこと、知ってるんですか。
re.smug: 全校生徒の顔と名前くらい、把握しています。会長ですから。
re.think: ……ふむ。力はある。夏休み中で暇そう。ちょうどいいですね。
me: え？
re.smile: {sname}くん。本日付けで、あなたを「汐見夏祭り実行委員・会長補佐」に任命します。
@choice
> 「……光栄です、会長」 {re+8}
> 「拒否権は？」 {re+4}
[1]me: ……光栄です、会長。
[1]re.surprise: ……素直ですね。もう少し抵抗されるかと。
[1]re.smile: 期待しています。
[2]me: ……拒否権は？
[2]re.smug: ありません。会長命令です。
[2]re.smile: ……冗談です。でも、来てくれると、とても助かります。
re.normal: 祭りまで、あと二週間。やるべきことは山積みです。覚悟しておいてください。
@end

#re_t1
@show re normal center
re.normal: ちょうどいいところに。{sname}くん、これを運んでください。
me: 会うなり労働……。
re.smile: 補佐の仕事です。……終わったら、冷たいお茶くらいは出しますよ。
re.think: ……麦茶ではなく、紅茶ですが。水出しの。
me: 会長、紅茶好きなんですか。
re.shy: ……特に好きというわけでは。ただ、毎日飲んでいるだけです。
それを好きと言うのでは。
@aff re 3
@end

#re_t2
@show re serious center
re.serious: 屋台の配置図、三回目の修正です。……どうしても、通路が狭くなる。
@choice
> 一緒に考える {re+5}
> 「休憩しません？」 {re+3}
[1]me: 金魚すくいとかき氷、入れ替えたらどうです？ 水を使う店は、水道の近くに。
[1]re.surprise: ……。
[1]re.smile: ……盲点でした。やりますね、補佐。
[2]me: 会長、ちょっと休憩しません？ 目の下、クマできてますよ。
[2]re.blush: ……っ。見ないでください。
[2]re.normal: ……五分だけ、休憩します。五分だけです。
@aff re 2
@end

#re_t3
@show re normal center
re.normal: {sname}くん。あなた、ゲームはしますか。
me: まあ、人並みには。
re.think: ……そうですか。いえ、別に。統計的な興味です。
re.normal: 最近の高校生の娯楽について、生徒会として把握しておくべきかと。
me: 会長は？ やらないんですか。
re.panic: わ、わたしは……！ 特に、しません。……特に。
なぜか、とても目が泳いでいた。
@aff re 3
@end

#re_t4
@show re smile center
re.smile: お疲れさまです、補佐。今日の進捗は上々です。
re.normal: 商店街の皆さんも協力的で助かっています。……あなたのおかげも、少しはあります。
me: 少しは、ですか。
re.smug: ええ、少しは。……ほんの少しですよ。調子に乗らないように。
そう言いながら、会長の口元はちょっとだけゆるんでいた。
@aff re 3
@end

#re_e2
@bg shotengai $t
@bgm daily
@show re serious center
会長と二人、商店街の店を一軒ずつ回って、祭りの協賛をお願いしていく。
re.serious: ……というわけで、協賛金として、こちらの金額をお願いしたく。書類はこちらに。
店主のおじさんは、完璧すぎる説明にかえって腰が引けている。
re.troubled: ……あの、何か、不備が……？
@choice
> 間に入って場をなごませる {re+8}
> 会長に任せて見守る {re+3}
[1]me: おじさん、去年のかき氷うまかったです。今年もあの店の前、行列にしたいんですよ。
[1]店主のおじさんは豪快に笑って、書類にハンコを押してくれた。
[1]re.surprise: ……あっさり、決まった。
[1]re.smile: ……{sname}くん。あなた、意外と人たらしですね。
[2]会長は粘り強く説明を続け、なんとか協賛を取りつけた。
[2]re.sad: ……わたしの説明は、固すぎるのでしょうか。
re.normal: ……わたしは、昔からこうなんです。正しいことを、正しく言うことしかできない。
そのとき、会長のカバンから何かがころりと落ちた。
@se click
拾い上げると、なんとも言えない顔をした猫のキーホルダーだった。
me: ……ねこ？
re.panic: か、返しなさいっ！
@shake
re.panic: それは、その、もらいものです！ 偶然カバンについていただけで……！
me: かわいいですね、これ。「ねこまる」でしたっけ。ゲーセンの景品の。
re.surprise: ……知っているのですか、ねこまるを。
re.blush: ……。……誰にも、言わないでください。
@flag re_cat
@aff re 3
@end

#re_e3
@bg council eve
@bgm comic
夕方の生徒会室。ドアを開けると、ピコピコという電子音がした。
@show re serious center
re.serious: ……っ、そこ……！ 回避……っ、今っ……！
会長が、携帯ゲーム機を握りしめて前のめりになっている。
re.surprise: ……。
re.panic: ……い、いつから、そこに。
me: 「回避」のあたりから。
re.panic: ～～～っ！！
@shake
re.blush: ……これは、その、市場調査です。生徒会として、若者の娯楽を……。
me: レトロゲームですよね、それ。しかも、かなりやり込んでる。
re.shy: ……。……はい。好きです。ゲーム。昔から、ずっと。
re.sad: 父は、こういうものを「くだらない」と言うので。家ではできないんです。
re.normal: ……{sname}くん。対戦、しますか。
@choice
> 本気で勝ちにいく {re+10}
> わざと負ける {re+4}
[1]@se select
[1]手加減なしの本気勝負。結果は――僅差で俺の勝ちだった。
[1]re.angry: ……もう一回です。
[1]re.laugh: ふふっ……あはは！ 楽しい……！ こんなに本気で遊んだの、何年ぶりでしょう！
[1]re.smile: ……手加減しなかったこと、感謝します。
[2]@se select
[2]さりげなく負けてあげた。……つもりだった。
[2]re.pout: ……今、手加減しましたね。
[2]re.angry: 屈辱です。……真剣勝負を侮辱しないでください。
[2]re.normal: ……でも、気遣いは、受け取っておきます。
re.shy: ……このことは、二人だけの秘密です。いいですね？
@flag re_game
@aff re 3
@end

#re_e4
@bg shrine eve
@bgm sad
祭りの会場になる神社で、会長が電話をしていた。
@show re serious center
re.serious: ……はい。わかっています。……はい、お父様。
re.sad: ……医学部の模試の結果は、来週に。……生徒会は、祭りが終わったら……はい。
re.sad: ……わかっています。わたしは、神崎家の人間ですから。
@se click
電話を切った会長は、しばらくその場から動かなかった。
re.sad: ……{sname}くん。見ていましたか。
me: ……すみません。
re.normal: 父は、医者です。祖父も、曽祖父も。わたしも医者になるのが当たり前だと言われて育ちました。
re.normal: 成績は一番。生徒会長。品行方正。……ぜんぶ、そのためです。
re.cry: ……でも、本当は。わたし、ゲームをつくる人になりたかったんです。
re.cry: 子どものころ、ゲームの中の世界に何度も救われました。だから、いつか自分も、誰かを救う世界をつくりたいって……。
re.cry: ……笑っていいですよ。完璧な生徒会長が、こんな夢。
@choice
> 「完璧じゃなくていい」 {re+12}
> 「笑いません。すごい夢です」 {re+10}
> 黙ってハンカチを差し出す {re+8}
[1]me: 完璧じゃなくていいじゃないですか。
[1]me: ゲームで本気で悔しがる会長のほうが、俺は……いいと思います。
[1]re.surprise: ……っ。
[1]re.tearsmile: ……ずるいです。そんなこと、言われたこと、なかった……。
[2]me: 笑いません。誰かを救う世界をつくりたいなんて、すごい夢です。
[2]re.tearsmile: ……ありがとう、ございます。……はじめて、誰かに言えました。
[3]黙ってハンカチを差し出すと、会長はそれを受け取って、顔をおおった。
[3]re.tearsmile: ……洗って、返します。……ありがとう。
re.normal: ……もう少しだけ、ここにいてくれますか。
蝉の声がやむまで、俺たちは石段に並んで座っていた。
@aff re 3
@end

#re_e5
@bg council night
@bgm romance
@show re normal center
夜の生徒会室。祭りの準備は、いよいよ大詰めだ。
re.normal: ……プログラム、完成です。お疲れさまでした、補佐。
re.smile: あなたがいなかったら、間に合いませんでした。本当に。
me: 会長こそ。ちゃんと寝てます？
re.smug: 睡眠時間は、効率的に管理しています。
そう言った直後、会長の頭がかくんと揺れた。
re.sleep: ……管理、して……。
me: 会長。
re.surprise: っ！ ……寝ていません。
@choice
> 「送っていきますよ」 {re+8}
> 「少し休んでください。起こしますから」 {re+10}
[1]me: もう遅いですし、家まで送っていきます。
[1]re.blush: ……では、お言葉に甘えて。……補佐の業務外ですが。
[2]me: 十分でいいから、休んでください。起こしますから。
[2]re.shy: ……では、十分だけ。……絶対に、起こしてくださいね。
[2]会長は机に突っ伏して、本当に眠ってしまった。
[2]その寝顔は、完璧な生徒会長じゃなくて、ただの年上の女の子だった。
re.normal: ……{sname}くん。決めました。
re.serious: 祭りの朝、父に話します。わたしの、本当の夢のこと。
re.normal: 怒られるでしょう。反対されるでしょう。……でも、言わなかったら、きっと一生後悔するから。
re.shy: だから、その……祭りの夜。閉会の挨拶が終わったら。
re.love: ……少しだけ、わたしに時間をください。会長命令では、ありません。……お願い、です。
@flag re_last
@aff re 3
@end

// ===================== ルナ =====================
#lu_e1
@bg lighthouse eve
@bgm luna
夕暮れの灯台。噂なんて信じていなかったけど、足が勝手にここへ向いていた。
――鼻歌が、聞こえる。
どこかで聞いたことがあるような、やさしいメロディ。
@show lu normal center
白いワンピースに、麦わら帽子。灯台の下で、女の子が海を見ていた。
銀色の髪が、夕陽の中できらきらと揺れている。
?lu.surprise: ……あ。
?lu.smile: やっと、来てくれた。
me: え……？
?lu.laugh: ……なんてね。幽霊ごっこ。びっくりした？
?lu.smile: こんばんは、{name}。
心臓が跳ねた。……名前を、呼ばれた。会ったこともないのに。
me: なんで、俺の名前……。
@choice
> 「……君、本当に幽霊？」 {lu+5}
> 「どこかで会ったことある？」 {lu+8}
[1]?lu.laugh: ふふっ。どうでしょう。足、ちゃんとあるよ？ 見る？
[1]?lu.wink: 幽霊かどうかは、これからのお楽しみ。
[2]?lu.surprise: ……。
[2]?lu.sad: ……さあ、どうかな。
[2]一瞬だけ、女の子はさびしそうに笑った。
lu.smile: わたしは、ルナ。夕方になると、ここにいるの。
lu.normal: ねえ、{name}。また、来てくれる？
lu.closed: わたし、夕暮れの時間しか、ここにいられないから。
@end

#lu_t1
@show lu smile center
lu.smile: いらっしゃい、{name}。今日の夕焼け、きれいでしょ。
lu.closed: 毎日ちがう色なんだよ。昨日はもっと、ピンクっぽかった。
me: 毎日見てるのか？
lu.normal: うん。……見ておきたいの。忘れないように。
@aff lu 3
@end

#lu_t2
@show lu normal center
lu.normal: ねえ、{name}は、この町が好き？
@choice
> 「好きだよ」 {lu+4}
> 「何もない町だけどな」 {lu+2}
[1]lu.smile: ……よかった。わたしも、大好き。
[2]lu.pout: 何もなくないよ。海があって、灯台があって、夕焼けがあって。
[2]lu.smile: ……{name}がいる。
@aff lu 2
@end

#lu_t3
@show lu closed center
lu.closed: ♪～
ルナはまた、あのメロディを口ずさんでいた。
me: その歌、なんていう曲？
lu.think: ……名前は、ないの。昔、ここで、ある人と一緒につくった歌。
lu.sad: その人は、もう覚えてないかもしれないけど。
波の音が、メロディの続きを歌うように寄せては返した。
@aff lu 3
@end

#lu_t4
@show lu laugh center
lu.laugh: あ、{name}！ 見て見て、カニ！ ちっちゃいの！
me: 幽霊がカニで喜んでる……。
lu.pout: 幽霊だってカニくらい見るもん。
lu.smile: ……ふふ。{name}と話してると、ちゃんと生きてる感じがする。
@aff lu 3
@end

#lu_e2
@bg lighthouse eve
@bgm luna
@show lu smile center
lu.smile: {name}。今日は、ちょっとだけ歩かない？
ルナに誘われて、海沿いの道をゆっくり歩いた。
lu.normal: あの駄菓子屋さん、まだあるんだね。あ、あのバス停、前は屋根がなかったのに。
me: よく知ってるな。町の人なのか？
lu.think: ……昔、夏になると来てたの。おばあちゃんの家があって。
@bg beach eve
砂浜に出ると、ルナは波打ち際にしゃがみこんで、小さな貝がらを拾った。
lu.normal: ねえ、{name}。
lu.serious: 十年前の約束って、覚えてる？
me: 十年前……？
記憶をたどる。でも、指のあいだから砂がこぼれるみたいに、何もつかめない。
@choice
> 「……ごめん、わからない」 {lu+6}
> 「覚えてる」と嘘をつく {lu-3}
[1]me: ……ごめん。わからない。
[1]lu.sad: ……そっか。
[1]lu.smile: ううん、いいの。正直に言ってくれて、うれしい。
[2]me: ……ああ、覚えてるよ。
[2]lu.sad: ……うそつき。
[2]lu.normal: ……いいよ。{name}は、やさしいから。昔から。
lu.closed: 思い出さなくても、いいの。ただ、今年の夏は……一緒にいてくれたら、それで。
夕陽が沈む。ルナの横顔が、ほんの一瞬、泣きそうに見えた。
@aff lu 4
@end

#lu_e3
@bg lighthouse eve
@bgm luna
@show lu smile center
lu.smile: {name}、今日は特別。灯台守の家に、招待してあげる。
@bg keeper eve
@show lu:dress2 normal center
灯台のふもとの小さな家。古いアップライトピアノが、窓際に置かれていた。
me: ピアノ？
lu.normal: うん。……わたし、ピアノを弾いてたの。東京で。
lu.sad: コンクールとか、演奏会とか。……でも、去年の大きな舞台で、指が動かなくなっちゃった。
lu.sad: 客席が、ぜんぶこっちを見てて。頭が真っ白になって。……それから、人前で弾けないの。
ルナは鍵盤のふたを開けて、そっと指を置いた。
@se piano
一音、二音。そこで、指が止まる。
lu.cry: ……だめ。{name}が見てると思うと……。
@choice
> 背中を向けて座る {lu+10}
> 目を閉じて「聴いてるだけだ」と言う {lu+10}
> 「無理しなくていい」 {lu+5}
[1]俺は黙って、ピアノに背中を向けて座った。
[1]me: 見てない。窓の外、見てるから。
[1]lu.surprise: ……。
[2]me: 目、閉じた。ここにいるのは耳だけだ。
[2]lu.laugh: ……ふふ。なにそれ。
[3]me: 無理しなくていいよ。弾きたくなったときで。
[3]lu.sad: ……ううん。弾きたいの。……{name}には、聴いてほしい。
@bgm stop
@wait 800
@bgm luna
――音が、あふれだした。
あのメロディだった。夕暮れの灯台で、ルナがいつも口ずさんでいた歌。
波の音と重なって、部屋じゅうが、海の底みたいにやさしい音で満たされていく。
……知っている。この曲の、続きを。
なぜか、そう思った。
lu.tearsmile: ……弾けた。最後まで。
lu.tearsmile: 一年ぶりに……弾けたよ、{name}……！
ba: おやまあ。ルナのピアノ、久しぶりに聴いたねえ。
戸口に、小柄なおばあさんが立っていた。
lu.laugh: おばあちゃん！
ba: いらっしゃい。……あんた、もしかして。{name}ちゃんかい。大きくなったねえ。
me: え……？
lu.panic: お、おばあちゃん！ しーっ！
@aff lu 3
@end

#lu_e4
@bg keeper eve
@bgm luna
@show lu:dress2 normal center
ba: ルナはね、わたしの孫なんだよ。小さいころは、毎年夏になると遊びに来ててね。
ba: 近所の男の子と、それはもう仲良しでねえ。毎日、灯台の下で日が暮れるまで遊んでたよ。
lu.panic: おばあちゃん、それ以上は……！
ba: ……その子の名前はね、「{name}」っていったんだよ。
@hide lu
@bgm stop
@bg memory day slow
@se wave
――ざあっと、波の音。
記憶の底から、夏の光があふれだしてくる。
麦わら帽子の、小さな女の子。いつも灯台の下で、ピアノの歌を口ずさんでいた。
名前は、ルナ。月のしろ、と書いて月城。だから俺は、その子を――。
@center 「つきちゃん」
xx: 『{name}くん、わたしね、来年から来られなくなっちゃうの』
xx: 『でも、大きくなったら、ぜったいまた来るから。そしたら――』
xx: 『――灯台で、いっしょに花火を見ようね。やくそく』
@bg keeper eve slow
@bgm sad
@show lu:dress2 sad center
me: ……つき、ちゃん……？
lu.surprise: ……っ。
lu.cry: ……遅いよ。……遅いよ、{name}……。
lu.cry: 十年。……十年だよ……。
ルナの目から、ぽろぽろと涙がこぼれた。
lu.cry: 家のことでこの町に来られなくなって。ピアノばっかりの毎日で。舞台で弾けなくなって、ぜんぶいやになって……。
lu.cry: それでね、思い出したの。この町で、{name}と一緒につくった歌。
lu.tearsmile: 会いたくて、来ちゃった。……幽霊みたいに、こっそり。
lu.sad: でも、{name}はわたしのこと、ぜんぜん覚えてなくて。……当たり前だよね。子どもだったもん。
@choice
> 「……ごめん。思い出した」 {lu+10}
> 黙って抱きしめる {lu+12}
[1]me: ……ごめん。忘れてて、ごめん。
[1]me: 思い出したよ。つきちゃん。……ルナ。
[1]lu.tearsmile: ……うん。……うん……！
[2]気づいたら、ルナを抱きしめていた。細い肩が、腕の中で震えていた。
[2]lu.cry: ……ずるい……。こんなの、ずるいよ……。
[2]lu.tearsmile: ……おかえり、{name}。
ba: ……ルナはね、八月三十一日に東京へ帰るんだ。もう一度だけ、大きな舞台のオーディションがあってね。
lu.sad: ……それが最後のチャンス。そこで弾けなかったら、もうピアノはやめるって決めてるの。
@flag lu_memory
@aff lu 3
@end

#lu_e5
@bg lighthouse eve
@bgm romance
@show lu smile center
灯台の下。いつもの場所で、ルナが待っていた。
me: ルナ。これ、覚えてるか。
ポケットから取り出したのは、青いシーグラス。
机の引き出しの奥、宝物の箱にずっとしまってあったもの。
lu.surprise: ……それ……！
lu.tearsmile: わたしがあげた、シーグラス……。「約束のしるし」だって……。まだ、持ってたの……？
me: 忘れてたくせに、捨てられなかったんだ。……たぶん、どこかで覚えてたんだと思う。
lu.cry: ……っ。
ルナは、シーグラスを両手で包むように握って、胸に押し当てた。
lu.tearsmile: ねえ、{name}。
lu.normal: 八月三十日。夏祭りの夜。この灯台から、花火がいちばんきれいに見えるの。
lu.love: 十年前の約束……今度こそ、守ってくれる？
@choice
> 「守るよ。絶対に」 {lu+8}
> 黙って小指を差し出す {lu+10}
[1]me: 守るよ。今度は、絶対に。
[1]lu.love: ……うん。信じてる。
[2]黙って小指を差し出すと、ルナは泣き笑いの顔で、小さな小指をからめた。
[2]lu.tearsmile: ……ゆびきりげんまん。……十年分、だからね。
@flag lu_last
@end

// ===================== ひとりの時間 =====================
#solo_home_1
@bg room $t
@bgm daily
家でごろごろして過ごすことにした。
mo: {name}ー、ごろごろしてるなら、スイカ切ったから食べなさーい。
縁側で食べるスイカは、子どものころと同じ味がした。
……こうしていると、夏が永遠に続く気がする。でも、残りの日数は確実に減っていく。
@end

#solo_home_2
@bg room $t
@bgm luna
机の引き出しを整理していたら、古い宝物の箱が出てきた。
中には、ビー玉、どんぐり、変な形の石……。
それから、青く透きとおったシーグラス。
……これ、誰にもらったんだっけ。
手のひらの上で、シーグラスがきらりと光った。
@flag seaglass
@end

#solo_home_3
@bg room $t
@bgm comic
ke: おーい{name}！ 暇だろ、ゲームしようぜ！
突然やってきたケンタと、日が傾くまで対戦ゲームをした。
ke: くっそー、また負けた！ ……なあ、こういうの彼女とやりてえよなあ。
me: 相手が見つかるといいな。
ke: 他人事みたいに言うなよ！
@end

#solo_school_1
@bg school $t
@bgm daily
補習もない夏休みの教室は、がらんとしていた。
ke: お、{name}。お前も学校か。
ke: 俺？ 俺はほら、夏の校舎で運命の出会いが起こる確率に賭けてんだよ。
ke: ……今のところ、出会ったのは用務員のおっちゃんだけだけどな。
二人で並んで、窓の外の入道雲をぼんやり眺めた。
@end

#solo_school_2
@bg school $t
@bgm daily
誰もいない教室で、黒板に落書きをしてみた。
「夏休み、あと少し」
書いてから、なんだか急にさみしくなって、消した。
@end

#solo_town_1
@bg shotengai $t
@bgm daily
商店街をぶらぶら歩く。祭りのポスターが、あちこちに貼られていた。
『汐見夏祭り　八月三十日　花火大会　午後七時半より』
ke: おっ、{name}！ 見ろよこのポスター。今年は花火二千発だってよ！
ke: 最後の一発を好きな子と見たら結ばれるって言い伝え、知ってるか？ ……俺、見る相手いないけどな。
@end

#solo_town_2
@bg shotengai $t
@bgm daily
駄菓子屋の前を通りかかると、おばあちゃんが手を振ってくれた。
十円ガムを一個だけ買って、帰り道でかんだ。
……はずれ。昔から、くじ運はない。
@end

#solo_shrine_1
@bg shrine $t
@bgm daily
@se bell
神社にお参りしていくことにした。鈴を鳴らして、手を合わせる。
……何をお願いしよう。少し迷って、「いい夏になりますように」とだけ祈った。
@end

#solo_shrine_2
@bg shrine $t
@bgm comic
境内では、祭りのやぐらの骨組みが少しずつ組み上がっていた。
ke: {name}ー！ 暇なら手伝え！ 俺、実行委員に無理やり入れられたんだよ！
ケンタと二人、汗だくになって木材を運んだ。
@end

#solo_beach_1
@bg beach $t
@bgm daily
@se wave
海岸に来た。波の音だけが、ずっと続いている。
砂浜に座って、しばらく海を眺めた。
水平線の向こうに、夏が少しずつ遠ざかっていく気がした。
@end

#solo_beach_2
@bg beach $t
@bgm comic
ke: うおおお！ 海だー！ ……男二人だけどな！
ケンタと海に入って、子どもみたいに水をかけあった。
……楽しい。楽しいけど、何かが足りない気がした。
@end

#solo_lighthouse_1
@bg lighthouse $t
@bgm luna
灯台に来てみた。噂の「幽霊」の姿は、どこにもない。
……ただ、潮風に混じって、かすかに鼻歌が聞こえた気がした。
どこかで聞いたことのある、やさしいメロディ。
振り返っても、そこには誰もいなかった。
@end

#solo_lighthouse_2
@bg lighthouse $t
@bgm luna
灯台の白い壁が、夕陽でオレンジ色に染まっている。
子どものころ、この下で誰かと遊んでいた気がする。……誰だっけ。
@end

// ===================== 8月23日：夕立 =====================
#ev_rain
@hideall
@bg town eve
@bgm daily
夕方。空が急に暗くなったと思ったら――
@fx rain
@se shock
ざあっと、夕立が降りだした。
@bestjump 15 rain_

#rain_hi
@bg beach eve
@show hi surprise center
hi.panic: わっ、わっ、{name}！ こっちこっち！
陽葵に手を引かれて、海の家の軒下に駆けこんだ。
hi.laugh: あはは、びっしょびしょ！ 泳いだあとみたい！
hi.normal: ……くしゅんっ。
@choice
> 上着をかけてやる {hi+8}
> 「風邪ひくなよ、エース」 {hi+4}
[1]濡れていない上着を、陽葵の肩にかけてやった。
[1]hi.blush: ……あ、ありがと。……{name}の匂いがする。
[1]hi.panic: い、今のなし！ 変な意味じゃないから！
[2]hi.pout: わかってるよーだ。……大事な時期だもんね。
hi.smile: ……ねえ、昔もこんなことあったよね。夕立で、二人でびしょ濡れになって。
hi.love: ……あのときも、{name}が隣にいた。
雨音が、二人の沈黙をやさしく包んでいた。
@fx none
@aff hi 3
@end

#rain_sz
@bg library eve
@show sz normal center
雨宿りに駆けこんだのは、図書室だった。
sz.surprise: ……あ。
sz.smile: ……雨の日、来てくれたんですね。
雨の音を聞きながら、窓際の席に並んで座る。
sz.closed: ……ね。世界の音が、ぜんぶやさしくなったでしょう。
@choice
> 「本当だな」 {sz+6}
> 「白鷺の声も、やさしく聞こえる」 {sz+9}
[1]sz.smile: ……はい。この音を、{sname}くんと聞きたかったんです。
[2]sz.blush: ……っ。
[2]sz.shy: ……そういうの、ずるいです。……メモ、できないじゃないですか。
sz.shy: ……雨、やまなければいいのに。
小さなつぶやきは、雨音にまぎれて、聞こえなかったふりをした。
@fx none
@aff sz 3
@end

#rain_re
@bg council eve
@show re troubled center
生徒会室に駆けこむと、会長が窓の外をにらんでいた。
re.troubled: ……最悪です。今日、やぐらに防水シートを張る予定だったのに。
re.serious: 行きましょう、{sname}くん。資材が濡れる前に。
@choice
> 「一緒に行きます」 {re+8}
> 「会長は待っててください」 {re+5}
[1]二人でずぶ濡れになりながら、神社まで走ってシートを張った。
[1]re.laugh: ……ふふっ。あはは！ 二人ともひどい格好ですね！
[1]re.smile: ……でも、なんだか、楽しいです。
[2]me: 俺が行ってきます。会長に風邪ひかれたら困るんで。
[2]re.surprise: ……。
[2]re.shy: ……補佐のくせに、生意気です。……ありがとう。
@fx none
@aff re 3
@end

#rain_lu
@bg lighthouse eve
@show lu surprise center
灯台へ走ると、ルナが入り口の軒下で雨を見ていた。
lu.smile: ……{name}。雨なのに、来てくれたの？
並んで、雨にけぶる海を見つめる。
lu.normal: 雨の日はね、灯台の光がいちばん大事になるの。迷った船が、ちゃんと帰ってこられるように。
lu.closed: ……わたしにとっては、{name}が、灯台みたいなものなのかも。
@choice
> 「俺が？」 {lu+6}
> 黙って隣にいる {lu+8}
[1]lu.laugh: ……なんでもない！ 雨のせいで、ちょっとおセンチになっただけ！
[2]何も言わずに、隣に立っていた。ルナの肩が、そっと俺の腕に触れた。
[2]lu.love: ……あったかい。
@fx none
@aff lu 3
@end

#rain_none
@bg shotengai eve
@bgm comic
ke: うおお、{name}！ 急げ急げ！
ケンタと二人、商店街のアーケードに逃げこんだ。
ke: ……なあ。こういうのってさ、普通は女の子と相合傘するイベントじゃねえの？
me: 普通はな。
ke: 普通じゃない俺たちに、乾杯……。
自販機のサイダーで、むなしく乾杯した。
@fx none
@end

// ===================== 8月26日：肝だめし =====================
#ev_kimo
@hideall
@bg shrine night
@bgm comic
@fx fireflies
その夜、町内会主催の「肝だめし大会」が神社で開かれた。
ke: よっしゃ、ペア決めのくじ引きだ！ 頼む、女子と当たってくれ……！
@bestjump 20 kimo_

#kimo_hi
@show hi troubled center
hi.panic: み、{name}とペア……！ よ、よかったぁ……。
me: お前、怖いの苦手だったっけ。
hi.panic: に、苦手じゃないし！ ぜんぜん平気だし！
@se step
@shake
hi.panic: ひゃあっ！？
がさっと茂みが揺れた瞬間、陽葵が腕にしがみついてきた。
@choice
> 手をつないで歩く {hi+8}
> からかう {hi+3}
[1]me: ……ほら。手、つないでてやるから。
[1]hi.blush: ……う、うん。……離さないでね。
[1]ゴールまで、陽葵は一度も手を離さなかった。
[2]me: ぜんぜん平気じゃなかったか？
[2]hi.pout: うるさいっ！ ……もう、{name}のばか！
[2]そう言いながら、陽葵はゴールまで俺の服のすそを離さなかった。
@aff hi 3
@fx none
@end

#kimo_sz
@show sz normal center
sz.normal: ……ペア、よろしくお願いします。
白鷺は懐中電灯を片手に、平然としていた。
sz.think: 肝だめしは、吊り橋効果の実地取材に最適です。
me: 吊り橋効果？
sz.normal: 恐怖によるドキドキを、恋のドキドキと錯覚する現象です。……検証、しましょう。
@se step
@shake
sz.panic: っ……！
白鷺が、俺の袖をぎゅっとつかんだ。
@choice
> 「検証結果は？」 {sz+6}
> 「大丈夫か？」 {sz+8}
[1]sz.blush: ……わかりません。……吊り橋のせいなのか、そうじゃないのか。
[2]sz.shy: ……だいじょうぶです。……でも、もう少しだけ、このままでいいですか。
@aff sz 3
@fx none
@end

#kimo_re
@show re serious center
re.serious: 運営として、コースの最終点検をします。{sname}くん、同行を。
me: 会長、もしかして怖いの苦手とか……。
re.smug: まさか。お化けは非科学的な存在です。
@se step
@shake
re.panic: きゃあっ！？
脅かし役のケンタが飛び出した瞬間、会長は俺の背中に隠れていた。
ke: ……会長、今「きゃあ」って……。
re.angry: 言っていません。堂島くん、持ち場に戻りなさい。
@choice
> 「かわいかったですよ」 {re+8}
> 聞かなかったことにする {re+5}
[1]re.blush: ……っ。……減点です。補佐の査定から、大幅に減点です。
[1]そう言う会長の耳は、暗がりでもわかるくらい赤かった。
[2]re.shy: ……今のは、見なかったことに。……ありがとう。
@aff re 3
@fx none
@end

#kimo_lu
@fx none
@bg lighthouse night
@bgm luna
@show lu smile center
くじ引きの列を抜け出して、夜の灯台へ行くと、ルナが待っていた。
lu.smile: 肝だめし？ ……幽霊と二人きりなんて、最高の肝だめしでしょ。
灯台の光が、夜の海をゆっくりとなでていく。
lu.normal: 夜の灯台、はじめて見た？
@choice
> 「きれいだな」 {lu+6}
> 「ルナ、夜もいられるんだ」 {lu+6}
[1]lu.closed: うん。……昔も、こうやって誰かと見たかったんだ。
[2]lu.laugh: 幽霊だって、たまには夜更かしするよ。……なんてね。
lu.love: ……ねえ、{name}。今日は、来てくれてありがとう。
@aff lu 3
@end

#kimo_none
ke: ……で、俺のペアはお前か。
me: お互いさまだ。
ke: 男二人で肝だめし……ある意味、これがいちばん怖えよ……。
@se step
@shake
ke: ぎゃあああ！？
脅かし役の町内会のおじさんに、ケンタは全力で悲鳴を上げた。
@fx none
@end

// ===================== 8月30日：汐見夏祭り =====================
#ev_festival
@hideall
@hud off
@bgm stop
@window off
@center 8月30日。\n汐見夏祭り。
@window on
@bg festival night slow
@bgm festival
屋台の明かり。人ごみのざわめき。浴衣の袖と、ソースの焦げる匂い。
十四日間の夏休みが、今夜、終わろうとしている。
ke: よう、{name}！ ……で、お前は今夜、誰と過ごすんだ？
@if none fes_none
@choice
> 陽葵と過ごす ?can:hi => fes_hi
> 雫と過ごす ?can:sz => fes_sz
> 玲奈先輩のもとへ行く ?can:re => fes_re
> 灯台へ向かう ?can:lu => fes_lu
> 健太と回る => fes_none

// ---------- 友情エンド ----------
#fes_none
me: ……お前と回るよ。
ke: ……だよな。俺たち、そういう運命だよな。
たこ焼きを食べて、金魚すくいで一匹もすくえずに、りんご飴を半分こした。
@bg fireworks night
@bgm ending
@fx fireworks
@se boom
ドン、と夜空に大輪の花が咲いた。
ke: ……なあ、{name}。
ke: 来年こそは、彼女つくろうな。
me: ……ああ。来年こそは。
二千発の花火が、男二人の夏をやけに派手に照らしていた。
……でも、まあ。悪くない夏だった。……たぶん。
@fx finale
@wait 3500
@ending friend

// ---------- 陽葵 ----------
#fes_hi
@show hi:yukata shy center
hi.shy: ……お、おまたせ。
振り返ると、浴衣姿の陽葵が立っていた。紺地に、ひまわりみたいな花の柄。
hi.panic: な、なに。黙ってないで、なんか言ってよ。
@choice
> 「……似合ってる」 {hi+5}
> 「馬子にも衣装だな」 {hi-3}
[1]hi.blush: ……っ！ そ、そう？ ……えへへ。
[2]hi.angry: はあ！？ 最低！ ……でも、{name}らしくて、ちょっと安心した。
@if good:hi hi_good
@jump hi_normal

#hi_good
@bgm romance
二人で屋台を回った。射的で陽葵がぬいぐるみを落として、はしゃいで、笑って。
いつもと同じなのに、ぜんぶがいつもと違って見えた。
@bg beach night
@show hi:yukata normal center
花火が始まる少し前。人ごみを抜けて、二人で海岸に出た。
hi.normal: ……ここ、穴場なんだよ。子どものころ、二人で見つけたの。
hi.smile: 明日から、荷造りなんだ。九月一日には、もう東京。
hi.sad: ……ねえ、{name}。私、ずっと言えなかったことがあるの。
@bg fireworks night
@bgm ending
@fx fireworks
@se boom
ドン、と。夜空に、最初の花火が咲いた。
hi.blush: 小二のときから……ううん、もっと前から。
hi.tearsmile: 私、{name}のことが、ずっと好きだった。
hi.cry: 東京に行っても、きっと好き。……離れるの、こわいよ。忘れられるの、こわい。
@choice
> 「俺も好きだ。ずっと待ってる」
> 「忘れるわけないだろ。会いに行く」
[1]me: 俺も、陽葵が好きだ。
[1]me: だから、待ってる。お前がどんなに遠くまで泳いでいっても、ゴールで待ってる。
[2]me: 忘れるわけないだろ。十年以上、隣にいたんだぞ。
[2]me: 会いに行く。何回だって。……好きだから。
hi.tearsmile: ……っ、ばか……。
hi.tearsmile: そんなこと言われたら……ぜったい、ぜったい、一番になって帰ってくるしかないじゃん……！
@fx finale
@se boom
最後の一発が、夜空いっぱいに広がった。
その光の下で、陽葵は泣きながら、世界でいちばんきれいに笑っていた。
@hearts
@wait 2500
@fx none
@hideall
@bg station day slow
@bgm romance
@center ――翌年、夏。
@show hi laugh center
hi.laugh: {name}ーっ！！ ただいまーっ！！
改札を飛び越えそうな勢いで、陽葵が駆けてくる。その首には、全国大会の金メダル。
hi.smile: 約束どおり、一番になって帰ってきたよ！
me: ……おかえり、陽葵。
hi.love: えへへ……ただいま。
ビー玉みたいにまぶしい夏が、また始まる。
@ending hi_good

#hi_normal
@bgm festival
陽葵と屋台を回った。いつもどおり、楽しかった。……いつもどおりに。
@bg fireworks night
@bgm sad
@fx fireworks
@show hi:yukata smile center
hi.smile: ……きれいだね、花火。
hi.normal: ねえ{name}。……ううん、なんでもない。
言いかけた言葉を、陽葵はラムネと一緒に飲みこんだ。
俺も、何も言えなかった。
@fx none
@hideall
@bg station day slow
@center 九月一日。
[?!flag:hi_known]陽葵が東京の高校へ転校すると知ったのは、祭りの次の日だった。
@show hi sad center
hi.smile: じゃあね、{name}。……元気でね。
hi.tearsmile: ……またね！
電車のドアが閉まる。陽葵の背中が、あっという間に遠くなっていった。
言えなかった言葉は、ラムネの泡みたいに、夏の空に消えていった。
@ending hi_normal

// ---------- 雫 ----------
#fes_sz
@show sz:yukata shy center
sz.shy: ……お、おまたせ、しました。
白い浴衣に、青いあじさいの柄。黒髪には、花のかんざし。
sz.panic: ……ど、どうでしょうか。取材のため、母に着付けてもらって……。
@choice
> 「すごくきれいだ」 {sz+5}
> 「取材、気合い入ってるな」 {sz+1}
[1]sz.blush: ……っ。……今の、メモします。一生、保存します。
[2]sz.pout: ……取材だけじゃ、ないです。……鈍感。
@if good:sz sz_good
@jump sz_normal

#sz_good
@bgm romance
屋台を回りながら、白鷺はいつものようにメモを取っていた。……でも途中で、ペンが止まった。
sz.smile: ……もう、メモはいいです。今日は、ちゃんと自分の目で見ておきたいので。
@bg shrine night
@fx fireflies
@show sz:yukata normal center
神社の裏手。人のいない石段に、二人で座る。
sz.normal: 原稿、書きあがったんです。最後の一行以外、ぜんぶ。
sz.normal: ……最後の一行は、今夜、ここで書こうと思って。
@bg fireworks night
@bgm ending
@fx fireworks
@se boom
夜空に、光の花が咲いた。
sz.blush: ……{name}くん。取材は、今日でおしまいです。
sz.sad: 恋人のふりも、もうおしまい。
sz.shy: ……だから、ここからは、取材じゃなくて。
sz.tearsmile: わたし、白鷺雫は……{name}くんのことが、好きです。……ふりじゃ、なくて。
@choice
> 「俺も好きだ。……雫」
> 「その最後の一行、俺にも書かせて」
[1]me: 俺も好きだよ。……雫。
[1]sz.surprise: ……名前……。
[1]sz.tearsmile: ……はい。……はいっ……。
[2]me: その最後の一行、俺にも書かせてくれ。
[2]me: 「――そして二人は、次の夏も一緒にいた」。……どう？
[2]sz.tearsmile: ……ありきたり、です。……でも、世界でいちばん好きな結末です。
@fx finale
@se boom
最後の花火が、夜空を真昼みたいに照らした。
雫は涙をぬぐって、ノートの最後のページに、ゆっくりとペンを走らせた。
@hearts
@wait 2500
@fx none
@hideall
@bg library day slow
@bgm romance
@center ――翌年、春。
@show sz smile center
sz.smile: {name}くん。……見てください。
雫が差し出したのは、一冊の本だった。表紙には「新人賞受賞作」の帯。
sz.shy: ……最初のページ、読んでください。
@center 『わたしの物語に、結末をくれた人へ。』
sz.love: ……続編も、書くつもりです。取材、また協力してくれますか？
@ending sz_good

#sz_normal
@bgm festival
白鷺と屋台を回った。白鷺はずっとメモを取っていて、俺はずっとそれを隣で見ていた。
@bg fireworks night
@bgm sad
@fx fireworks
@show sz:yukata normal center
sz.normal: ……取材、ご協力ありがとうございました。
sz.smile: おかげで、結末が書けそうです。
sz.sad: ……二人は、最後に別々の道を歩いていく。そういう結末に、しようと思います。
その言葉に、何も言い返せなかった。
@fx none
@hideall
@bg library eve slow
@center 九月。
白鷺の小説は、ちゃんとコンテストに送られたらしい。
図書室で見かける白鷺は、また一人で本を読んでいる。
物語は完成した。けれど、その結末に、俺の名前はなかった。
@ending sz_normal

// ---------- 玲奈 ----------
#fes_re
@show re serious center
会長は、祭りの本部テントで無線を片手に指示を飛ばしていた。
re.serious: ……屋台Bの行列、誘導をお願いします。……救護テントは異常なし。了解。
re.surprise: あ……{sname}くん。
@if good:re re_good
@jump re_normal

#re_good
re.normal: 閉会の挨拶まで、あと少しです。……終わったら、約束の場所へ。
@hide re
@bgm romance
閉会の挨拶を終えた会長を迎えに行くと――
@show re:yukata shy center
re.shy: ……着替えて、きました。
黒地に、紅い椿の浴衣。いつものポニーテールに、赤い花のかんざし。
re.panic: 生徒会の業務は終了しました。今のわたしは、ただの神崎玲奈です。……ですから、その、見すぎです。
@choice
> 「きれいすぎて、目が離せなかった」 {re+5}
> 「会長も浴衣着るんですね」 {re+1}
[1]re.blush: ……っ！ ……そ、そういうことを、真顔で言わないでください……。
[2]re.pout: ……着ます。女子高生ですから。……もっと、他に言うことはないのですか。
@bg shrine night
@show re:yukata normal center
神社の裏手の高台。屋台のざわめきが、遠くに聞こえる。
re.normal: ……今朝、父に話しました。ゲームをつくる仕事がしたいって。
re.sad: 大げんかになりました。……でも最後に、父は言いました。「自分で決めたなら、最後までやり遂げろ」と。
re.tearsmile: ……言えたんです。あなたが、「完璧じゃなくていい」と言ってくれたから。
@bg fireworks night
@bgm ending
@fx fireworks
@se boom
夜空に、大きな花火が開いた。
re.blush: ……{name}くん。
はじめて、名前で呼ばれた。
re.shy: 会長命令ではありません。……わたしの、生まれてはじめての、わがままです。
re.tearsmile: ……わたしと、付き合ってください。あなたの隣でなら、完璧じゃない自分を、好きになれる気がするんです。
@choice
> 「喜んで。……玲奈さん」
> 「命令じゃなくても、ずっと隣にいます」
[1]me: 喜んで。……玲奈さん。
[1]re.surprise: ……っ！
[1]re.tearsmile: ……名前で呼ばれるのは、反則です……。
[2]me: 命令じゃなくても、ずっと隣にいますよ。補佐ですから。
[2]re.tearsmile: ……もう補佐じゃありません。……恋人、です。
@fx finale
@se boom
最後の一発の光の中で、完璧な生徒会長は、子どもみたいに泣きながら笑っていた。
@hearts
@wait 2500
@fx none
@hideall
@bg room night slow
@bgm romance
@center ――二年後。
スマートフォンが鳴った。玲奈さんからのメッセージだ。
『大学のゲーム制作コンテストで、わたしたちのチームの作品が入賞しました』
『タイトルは「夏色トワイライト」。……主人公のモデルは、誰だと思いますか？』
画面の向こうで、得意げに笑う顔が目に浮かんだ。
@ending re_good

#re_normal
re.normal: 閉会式の準備があるので、失礼します。……今日まで、本当にありがとうございました。
@hide re
@bgm sad
@bg fireworks night
@fx fireworks
会長は最後まで、本部テントから動かなかった。
花火の音と、無線から聞こえる凛とした声。
@fx none
@bg shrine night slow
@show re smile center
re.smile: 皆さん、今年の汐見夏祭りは大成功です。お疲れさまでした。
閉会の挨拶をする会長は、誰よりも完璧だった。
……その笑顔の奥にあったものを、俺は最後まで知ることができなかった。
@ending re_normal

// ---------- ルナ ----------
#fes_lu
人ごみを抜けて、俺は走った。約束の場所へ。
@if good:lu lu_good
@jump lu_normal

#lu_good
@bg lighthouse night
@bgm luna
@show lu:yukata smile center
灯台の下。淡い藤色の浴衣を着たルナが、手を振っていた。
lu.laugh: {name}！ ……来てくれた。ちゃんと、来てくれた！
lu.shy: えへへ……おばあちゃんに着せてもらったの。どう？
@choice
> 「月みたいにきれいだ」 {lu+5}
> 「十年前の麦わら帽子も、似合ってたけどな」 {lu+5}
[1]lu.blush: ……っ。{name}、いつからそんなこと言えるようになったの……。
[2]lu.laugh: ふふっ、覚えててくれたんだ。……うれしい。
lu.normal: ねえ、{name}。わたし、明日のオーディション……受けるよ。
lu.smile: この夏、{name}のおかげで、また弾けるようになったから。
lu.sad: 東京に帰ったら、また会えなくなるかもしれない。……でも、もう「幽霊」にはならない。
@bg fireworks night
@bgm ending
@fx fireworks
@se boom
灯台の向こうに、最初の花火が咲いた。十年前に、二人で見るはずだった花火。
lu.tearsmile: ……見られたね。約束の、花火。
lu.blush: {name}。……十年前からずっと言いたかったこと、言ってもいい？
lu.love: 大好き。……ずっと、ずっと、大好きだった。
@choice
> 「俺も好きだ。今度は絶対、忘れない」
> 「次の約束をしよう」
[1]me: 俺も、ルナが好きだ。
[1]me: 今度は、絶対に忘れない。十年先も、二十年先も。
[1]lu.tearsmile: ……うん……！
[2]me: 次の約束をしよう。……ルナのステージを、いちばん前の席で聴く。
[2]me: それから、来年の夏も、その次の夏も、ここで一緒に花火を見る。
[2]lu.tearsmile: ……欲張りな約束。……でも、ぜんぶ守ってね。
@fx finale
@se boom
最後の花火が灯台の光と重なって、夜の海を金色に染めた。
ルナの小指と、俺の小指。十年ぶりに結ばれた約束が、月の光の下で静かに輝いていた。
@hearts
@wait 2500
@fx none
@hideall
@bg hall night slow
@bgm luna
@center ――冬。東京。
満員のコンサートホール。スポットライトの下で、ルナがピアノの前に座る。
いちばん前の席で、俺は手を握りしめた。
――最初の一音が、ホールに響く。
あの夏、灯台で二人でつくった、名前のない歌。
演奏を終えたルナは、客席に向かって、あの夏と同じ笑顔で小さく手を振った。
@ending lu_good

#lu_normal
@bg lighthouse night
@bgm sad
灯台に着いたとき、そこには誰もいなかった。
@fx fireworks
@se boom
花火が上がる。灯台の光が、からっぽの海をなでていく。
……遅かったのかもしれない。何もかも。
[?!flag:lu_memory]あの子の名前を思い出したのは、夏が終わってからだった。
[?flag:lu_memory]約束をちゃんと言葉にできないまま、夏は終わろうとしていた。
@fx none
@bg lighthouse eve slow
@center 九月。
灯台の下に、もう白いワンピースの少女は現れない。
ただ、潮風に混じって、あのメロディがときどき聞こえる気がした。
@ending lu_normal
`;

/* ---------- 起動 ---------- */
if (IS_BROWSER) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => G.boot());
  else G.boot();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseScript, SCENARIO, CHARA, EXPR, BG, TRACKS, ENDINGS, SPEAKERS, charaSVG, bgSVG, mapSVG, whereIs, G, FIXED };
}
