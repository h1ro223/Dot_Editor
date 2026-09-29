/* =========================================================
   ピクセル商店街 繁盛記  —  script.js
   made by hiro/ヒロ  https://github.com/h1ro223
   ========================================================= */
(() => {
'use strict';

/* ================================================================
   1. ユーティリティ
   ================================================================ */
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const chance = (p) => Math.random() < p;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const lerp = (a, b, t) => a + (b - a) * t;
const yen = (n) => (n < 0 ? '-¥' : '¥') + Math.abs(Math.round(n)).toLocaleString('ja-JP');
const yenShort = (n) => {
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a >= 1e8) return s + '¥' + (a / 1e8).toFixed(a >= 1e9 ? 0 : 1) + '億';
  if (a >= 1e4) return s + '¥' + (a / 1e4).toFixed(a >= 1e5 ? 0 : 1) + '万';
  return s + '¥' + Math.round(a).toLocaleString('ja-JP');
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hash2 = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const weightedPick = (items, wfn) => {
  let total = 0;
  for (const it of items) total += Math.max(0, wfn(it));
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const it of items) { r -= Math.max(0, wfn(it)); if (r <= 0) return it; }
  return items[items.length - 1];
};
const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = clamp(Math.round(r + amt), 0, 255); g = clamp(Math.round(g + amt), 0, 255); b = clamp(Math.round(b + amt), 0, 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
};
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/* ================================================================
   2. パレット & ドット絵アイコン (8x8)
   ================================================================ */
const PAL = {
  k: '#1a1c2c', w: '#f4f4f4', r: '#e43b44', R: '#a22633', o: '#f77622', y: '#fee761', Y: '#feae34',
  g: '#63c74d', G: '#3e8948', t: '#265c42', b: '#0099db', B: '#124e89', c: '#2ce8f5', p: '#ff97c1',
  n: '#b86f50', N: '#733e39', e: '#e4a672', s: '#f5c9a0', l: '#c0cbdc', L: '#8b9bb4', d: '#5a6988',
  D: '#3a4466', v: '#b55088', V: '#68386c', m: '#f6757a', a: '#ead4aa', z: '#262b44', h: '#ffffff',
};

const ICONS = {
  onigiri: ['...kk...', '..kwwk..', '.kwwwwk.', '.kwwwwk.', 'kwwwwwwk', 'kwwttwwk', 'kwwttwwk', '.kkttkk.'],
  bread: ['........', '..NNNN..', '.NYYYYN.', 'NYeYeYYN', 'NYYeYeYN', 'NYYYYYYN', '.NNNNNN.', '........'],
  ramen: ['..l..l..', '.l..l...', 'kkkkkkkk', 'kyYyYyYk', 'krwrwrwk', '.krrrrk.', '..kkkk..', '........'],
  crepe: ['...pp...', '..pwwp..', '..wyrw..', '..eyye..', '..eeee..', '...ee...', '...ee...', '....e...'],
  burger: ['..YYYY..', '.YeYeYY.', 'YYYYYYYY', 'gggggggg', 'NNNNNNNN', 'yyyyyyyy', '.YYYYYY.', '........'],
  sushi: ['........', '........', '.oooooo.', 'ooowwooo', 'wwwwwwww', 'wwwwwwww', '.wwwwww.', '........'],
  meat: ['........', '.rrrrr..', 'rrmrrrr.', 'rmrrwrrr', 'rrrwrrmr', '.rrrrrr.', '..rrrr..', '........'],
  french: ['.w....l.', '.w.w..l.', '.www..l.', '..w..ll.', '..w..ll.', '..w...l.', '..w...l.', '..w...l.'],
  vend: ['.kkkkkk.', '.kbbbbk.', '.krgyrk.', '.kbbbbk.', '.kbbbbk.', '.kkykkk.', '.kbbbbk.', '.kkkkkk.'],
  dango: ['.....p..', '....ppp.', '....wpw.', '...www..', '..ggg...', '.ggg....', 'n.......', '........'],
  coffee: ['..l.l...', '...l.l..', 'wwwwww..', 'wNNNNwww', 'wNNNNw.w', 'wwwwwwww', '.wwwww..', '........'],
  tapioca: ['....k...', '...k....', '.wwkwww.', '.weeeew.', '.weeeew.', '.wkekew.', '.wekkew.', '..wwww..'],
  cocktail: ['kkkkkkkk', '.kbbbbk.', '..kbbk..', '...kk...', '...kk...', '...kk...', '..kkkk..', '........'],
  carrot: ['...g.g..', '....gg..', '...oo...', '..ooo...', '..oo....', '.oo.....', '.o......', '........'],
  gift: ['..r..r..', '...rr...', 'rrrrrrrr', 'yyyryyyy', 'yyyryyyy', 'yyyryyyy', 'yyyryyyy', '........'],
  book: ['........', 'bbbbbbb.', 'bwwwwwbk', 'bwLLLwbk', 'bwwwwwbk', 'bwLLLwbk', 'bbbbbbbk', '.kkkkkkk'],
  toy: ['.n....n.', 'nnn..nnn', '.nnnnnn.', 'nnknnknn', 'nnnkknnn', '.nnennn.', '..nnnn..', '........'],
  shirt: ['.bb..bb.', 'bbbwwbbb', 'bbbbbbbb', '..bbbb..', '..bbbb..', '..bbbb..', '..bbbb..', '........'],
  tv: ['..k..k..', '...kk...', 'dddddddd', 'dccccccd', 'dccwcccd', 'dccccccd', 'dddddddd', '.d....d.'],
  gem: ['........', '.cccccc.', 'cwccwcbc', 'bbbbbbbb', '.bccccb.', '..bccb..', '...bb...', '........'],
  bag: ['..kkkk..', '.k....k.', 'rrrrrrrr', 'rrrrrrrr', 'rrwwrrrr', 'rrrrrrrr', 'rrrrrrrr', '........'],
  game: ['........', '.dddddd.', 'dkdddddd', 'kkkddrdd', 'dkddrdyd', 'ddddddyd', '.dd..dd.', '........'],
  mic: ['..lll...', '.lLlLl..', '.lllll..', '..lll...', '...d....', '...d....', '...d....', '..ddd...'],
  pin: ['...w....', '..www...', '..rrr...', '..www...', '.wwwww..', '.wwwww..', '..www...', '........'],
  film: ['kkkkkkkk', 'kwkwkwkk', 'kyyyyyyk', 'kybbbbyk', 'kybbbbyk', 'kyyyyyyk', 'kwkwkwkk', 'kkkkkkkk'],
  fish: ['........', '...bb...', '..bbbb.b', '.bwbbbbb', 'bbbbbbbb', '.bbbbb.b', '..bbb...', '........'],
  wheel: ['..kkkk..', '.k.kk.k.', 'k..kk..k', 'kkkkkkkk', 'k..kk..k', '.k.kk.k.', '..kkkk..', '..r..r..'],
  onsen: ['.l.l.l..', 'l.l.l...', '.l.l.l..', '........', '.bbbbbb.', 'bccccccb', 'bbbbbbbb', '........'],
  scissor: ['.l...l..', '..l.l...', '...l....', '..l.l...', '.rr.rr..', 'r..rr.r.', 'r..rr.r.', '.rr..rr.'],
  lotus: ['...p....', '..ppp...', 'p.ppp.p.', 'pppppppp', '.pppppp.', 'gggggggg', '.gggggg.', '........'],
  bed: ['........', 'n.......', 'nww.....', 'nwwbbbbb', 'nbbbbbbb', 'nnnnnnnn', 'n......n', '........'],
  wc: ['.b....r.', 'bbb..rrr', '.b....r.', 'bbb..rrr', 'bbb..rrr', '.b....r.', '.b...r.r', '........'],
  bench: ['........', '........', 'nnnnnnnn', 'NNNNNNNN', 'nnnnnnnn', '.d....d.', '.d....d.', '........'],
  atm: ['.kkkkkk.', '.kgggggk', '.kgwwwgk', '.kggggkk', '.kllllk.', '.klkklk.', '.kllllk.', '.kkkkkk.'],
  koban: ['...rr...', '..kkkk..', '.kbbbbk.', 'kbwbbwbk', 'kbbbbbbk', 'kbbkkbbk', 'kbbkkbbk', 'kkkkkkkk'],
  trash: ['..kkkk..', '.kddddk.', '.kkkkkk.', '.klllk..', '.kldlk..', '.klllk..', '.kldlk..', '.kkkkk..'],
  parking: ['bbbbbbbb', 'bwwwwbbb', 'bwbbbwbb', 'bwwwwbbb', 'bwbbbbbb', 'bwbbbbbb', 'bbbbbbbb', '........'],
  bus: ['.gggggg.', 'gccgccgg', 'gccgccgg', 'gggggggg', 'gwggggwg', 'gggggggg', '.k....k.', '........'],
  conv: ['........', 'gggggggg', 'bbbbbbbb', 'rrrrrrrr', 'wcwwwcww', 'wcwkkcww', 'wwwkkwww', '........'],
  tree: ['..gggg..', '.gGggGg.', 'gggGgggg', 'gGgggGgg', '.gggggg.', '..gGGg..', '...nn...', '...nn...'],
  flower: ['.r..y.p.', 'ryr.yprp', '.r..y.p.', '.g..g.g.', 'gGggGggG', 'nnnnnnnn', 'NNNNNNNN', '........'],
  sakura: ['.pppp...', 'pphpppp.', 'ppppphpp', '.pphppp.', '..ppnp..', '....n...', '....n...', '...nnn..'],
  lamp: ['..kkk...', '.kyyyk..', '..kkk...', '...d....', '...d....', '...d....', '...d....', '..ddd...'],
  fountain: ['...c....', '..c.c...', '.c.c.c..', 'l.c.c.l.', 'lcccccl.', 'llllllll', '.llllll.', '........'],
  statue: ['...YY...', '..YYYY..', '...YY...', '..YYYY..', '..YYYY..', '..Y..Y..', '.llllll.', 'llllllll'],
  flagi: ['d.......', 'drrrrr..', 'drwwwr..', 'drwwwr..', 'drrrrr..', 'd.......', 'd.......', 'd.......'],
  pond: ['........', '..bbbb..', '.bccbbb.', 'bbbbcbbb', 'bcbbbbbb', '.bbbbcb.', '..bbbb..', '........'],
  lantern: ['...k....', '..kkk...', '.rrrrr..', 'rrwrrrr.', 'rrwrrrr.', '.rrrrr..', '..kkk...', '...k....'],
  xmas: ['...y....', '...g....', '..ggg...', '..grg...', '.ggggg..', '.gbggy..', 'ggggggg.', '...n....'],
  road: ['dddddddd', 'dddddddd', 'dddddddd', 'yy.yy.yy', 'dddddddd', 'dddddddd', 'dddddddd', 'dddddddd'],
  stone: ['llLlllLl', 'LLLLLLLL', 'lLlllLll', 'LLLLLLLL', 'llLlllLl', 'LLLLLLLL', 'lLlllLll', 'LLLLLLLL'],
  brick: ['rrRrrrRr', 'RRRRRRRR', 'rRrrrRrr', 'RRRRRRRR', 'rrRrrrRr', 'RRRRRRRR', 'rRrrrRrr', 'RRRRRRRR'],
  bulldoze: ['........', '..yyy...', '.yykyy..', 'yyyyyyy.', 'yyyyyyyl', '.kkkkk.l', 'kdkdkdkl', '.kkkkk..'],
  hammer: ['.dddd...', 'ddddd...', '.dddd...', '...n....', '...n....', '...n....', '...n....', '...n....'],
  staff: ['..NNNN..', '.NNNNNN.', '.NssssN.', '..skks..', '..ssss..', '.bbwwbb.', 'bbbwwbbb', 'bbbbbbbb'],
  flask: ['..llll..', '...ww...', '...ww...', '..wwww..', '.wggggw.', 'wggyggGw', 'wgggGggw', '.wwwwww.'],
  mega: ['......y.', '....yyy.', 'dd.yyyy.', 'ddyyyyyl', 'ddyyyyyl', 'dd.yyyy.', '.d..yyy.', '.d....y.'],
  flag: ['d.......', 'drrrrrr.', 'drrrrr..', 'drrrrrr.', 'd.......', 'd.......', 'd.......', 'ddd.....'],
  chart: ['.......y', '......y.', '.y..yy..', 'y.yy....', '.....g..', '..g..g..', 'g.g..g.g', 'gggggggg'],
  gear: ['..l..l..', '.llllll.', 'lllddlll', '.ld..dl.', '.ld..dl.', 'lllddlll', '.llllll.', '..l..l..'],
  coin: ['..yyyy..', '.yYYYYy.', 'yYyyyyYy', 'yYyYyyYy', 'yYyYyyYy', 'yYyyyyYy', '.yYYYYy.', '..yyyy..'],
  heart: ['........', '.rr.rr..', 'rwrrrrr.', 'rrrrrrr.', '.rrrrr..', '..rrr...', '...r....', '........'],
  angry: ['.rr..rr.', 'r.r..r.r', 'rr....rr', '........', '........', 'rr....rr', 'r.r..r.r', '.rr..rr.'],
  question: ['..kkk...', '.k...k..', '.....k..', '....k...', '...k....', '...k....', '........', '...k....'],
  zzz: ['........', 'bbbb....', '...b....', '..b.bbb.', '.b....b.', 'bbbb.b..', '....bbb.', '........'],
  yenb: ['k.....k.', '.k...k..', '..k.k...', 'kkkkkkk.', '...k....', 'kkkkkkk.', '...k....', '...k....'],
  star: ['...y....', '...y....', '.yyyyy..', 'yyyyyyy.', '.yyyyy..', '.yy.yy..', 'y.....y.', '........'],
  broom: ['......n.', '.....n..', '....n...', '...n....', '.yyy....', 'yyyy....', 'yyy.....', 'yy......'],
  cat: ['n.....n.', 'nn...nn.', 'nnnnnnn.', 'nknnnkn.', 'nnnpnnn.', '.nnnnn..', '.n...n..', '........'],
  bank: ['...y....', '..yyy...', '.yyyyy..', 'yyyyyyy.', '.w.w.w..', '.w.w.w..', 'yyyyyyy.', '........'],
  zukan: ['.rrrrrr.', 'rwwwwwrk', 'rwyywwrk', 'rwyywwrk', 'rwwwwwrk', 'rwLLLwrk', 'rrrrrrrk', '.kkkkkkk'],
  save: ['kkkkkkk.', 'kbwwwbkk', 'kbwwwbbk', 'kbbbbbbk', 'kblllbbk', 'kblkkbbk', 'kblllbbk', 'kkkkkkkk'],
  thief: ['.kkkkk..', 'kkkkkkk.', 'kswsswk.', '.sssss..', '.kwkwk..', 'kwkwkwk.', '.k...k..', '........'],
  rain: ['..lll...', '.lllll..', 'lllllll.', '........', '.b..b...', 'b..b..b.', '..b..b..', '........'],
  sun: ['y..y..y.', '.yyyyy..', 'yyYYYyy.', '.yYYYy..', 'yyYYYyy.', '.yyyyy..', 'y..y..y.', '........'],
  snow: ['...w....', '.w.w.w..', '..www...', 'wwwwwww.', '..www...', '.w.w.w..', '...w....', '........'],
  cloud: ['........', '..lll...', '.lllll..', 'llllllll', 'LLLLLLLL', '.LLLLLL.', '........', '........'],
};

const iconCache = new Map();
function iconCanvas(name, scale = 1) {
  const key = name + '@' + scale;
  if (iconCache.has(key)) return iconCache.get(key);
  const rows = ICONS[name] || ICONS.question;
  const c = mkCanvas(8 * scale, 8 * scale);
  const g = c.getContext('2d');
  for (let y = 0; y < 8; y++) {
    const row = rows[y] || '';
    for (let x = 0; x < 8; x++) {
      const ch = row.charAt(x);
      if (!ch || ch === '.' || !PAL[ch]) continue;
      g.fillStyle = PAL[ch];
      g.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  iconCache.set(key, c);
  return c;
}
const iconUrlCache = new Map();
function iconURL(name) {
  if (iconUrlCache.has(name)) return iconUrlCache.get(name);
  const src = iconCanvas(name, 1);
  const c = mkCanvas(40, 40);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  // 1px の縁取り
  const tmp = mkCanvas(10, 10), tg = tmp.getContext('2d');
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) tg.drawImage(src, dx, dy);
  tg.globalCompositeOperation = 'source-in'; tg.fillStyle = 'rgba(10,12,30,.85)'; tg.fillRect(0, 0, 10, 10);
  tg.globalCompositeOperation = 'source-over'; tg.drawImage(src, 1, 1);
  g.drawImage(tmp, 0, 0, 40, 40);
  const url = c.toDataURL();
  iconUrlCache.set(name, url);
  return url;
}

/* 会長の顔 (16x16) */
const FACE_CHAIR = [
  '....kkkkkkkk....', '...kllllllllk...', '..klllllllllk...', '..kllsssssslk...', '.kllssssssssk...',
  '.klsssssssssk...', '.ksskkssskkssk..', '.ksssssssssssk..', '.kssssnnsssssk..', '..kssssssssssk..',
  '..ksskkkkkssk...', '...kssssssssk...', '....kkssssk.....', '...kbbkkkkbbk...', '..kbbbwwwwbbbk..', '.kbbbbwrrwbbbbk.',
];
let chairFaceURL = null;
function chairFace() {
  if (chairFaceURL) return chairFaceURL;
  const c = mkCanvas(64, 64), g = c.getContext('2d');
  FACE_CHAIR.forEach((row, y) => {
    for (let x = 0; x < 16; x++) {
      const ch = row.charAt(x);
      if (ch === '.' || !PAL[ch]) continue;
      g.fillStyle = PAL[ch]; g.fillRect(x * 4, y * 4, 4, 4);
    }
  });
  chairFaceURL = c.toDataURL();
  return chairFaceURL;
}

/* ================================================================
   3. ゲームデータ
   ================================================================ */
const TILE = 16;
const MAP_W = 34, MAP_H = 24;
const GATE_X = 16, GATE_Y = 23;
const DAY_START = 6 * 60, DAY_END = 24 * 60;
const DAYS_PER_MONTH = 7;
const SUBSTEP = 1 / 30;           // 物理ステップ(実時間秒)
const MIN_PER_STEP = 0.6;         // 1ステップあたりのゲーム内分数
const WEEK = ['月', '火', '水', '木', '金', '土', '日'];
const SAVE_KEY = 'pixelShotengai_save_v1';

const CATS = {
  food: { name: '飲食', icon: 'ramen' },
  drink: { name: '喫茶', icon: 'coffee' },
  shop: { name: '買物', icon: 'bag' },
  fun: { name: '娯楽', icon: 'game' },
  relax: { name: '癒し', icon: 'onsen' },
  fac: { name: '施設', icon: 'wc' },
  deco: { name: '装飾', icon: 'tree' },
  road: { name: '道路', icon: 'road' },
};
const TAB_ORDER = ['food', 'drink', 'shop', 'fun', 'relax', 'fac', 'deco', 'road'];

const NEEDS = ['hunger', 'thirst', 'shop', 'fun', 'fatigue', 'toilet'];
const NEED_NAME = { hunger: '空腹', thirst: 'のどの渇き', shop: '買い物欲', fun: '遊びたい', fatigue: '疲れ', toilet: 'トイレ', money: 'お金' };
const NEED_ICON = { hunger: 'onigiri', thirst: 'coffee', shop: 'bag', fun: 'game', fatigue: 'zzz', toilet: 'wc', money: 'yenb' };

/* look: roof種類 awning/tri/flat/kawara/dome/modern, c1:屋根色, wall:壁色, aw:日よけ2色 */
const B = {};
function defB(o) {
  const d = Object.assign({
    size: [1, 1], price: 0, cap: 1, time: 20, sat: 60, appeal: 5, rank: 0, rp: 0,
    serves: [], staff: true, hours: [7, 22], adult: false, radius: 0, desc: '',
  }, o);
  d.maint = Math.round(d.cost * 0.04 / 100) * 100;
  B[d.id] = d;
  return d;
}
/* ---- 飲食 ---- */
defB({ id: 'onigiri', name: 'おにぎり屋', cat: 'food', icon: 'onigiri', cost: 20000, price: 180, cap: 2, time: 15, sat: 56, appeal: 10, serves: ['hunger'], hours: [6, 21], look: { roof: 'awning', aw: ['#3e8948', '#f4f4f4'], wall: '#ead4aa' }, desc: '手軽に小腹を満たせる。朝から営業。' });
defB({ id: 'bakery', name: 'パン屋', cat: 'food', icon: 'bread', cost: 30000, price: 280, cap: 3, time: 20, sat: 60, appeal: 14, serves: ['hunger'], hours: [6, 20], look: { roof: 'tri', c1: '#b86f50', wall: '#f4e2c0' }, desc: '焼きたての香りで人を呼ぶ。' });
defB({ id: 'crepe', name: 'クレープ屋', cat: 'food', icon: 'crepe', cost: 45000, price: 450, cap: 2, time: 18, sat: 66, appeal: 18, rank: 1, rp: 30, serves: ['hunger'], look: { roof: 'awning', aw: ['#ff97c1', '#f4f4f4'], wall: '#fff0f5' }, desc: '子供と学生に大人気。' });
defB({ id: 'ramen', name: 'ラーメン屋', cat: 'food', icon: 'ramen', size: [2, 1], cost: 60000, price: 850, cap: 4, time: 40, sat: 70, appeal: 20, rank: 1, rp: 40, serves: ['hunger'], hours: [11, 23], look: { roof: 'kawara', c1: '#3a4466', wall: '#733e39', noren: '#e43b44' }, desc: '会社員の味方。夜遅くまで営業。' });
defB({ id: 'burger', name: 'バーガー屋', cat: 'food', icon: 'burger', size: [2, 1], cost: 90000, price: 650, cap: 6, time: 25, sat: 63, appeal: 22, rank: 2, rp: 80, serves: ['hunger'], look: { roof: 'modern', c1: '#e43b44', wall: '#fee761' }, desc: '回転が早く大人数をさばける。' });
defB({ id: 'sushi', name: '寿司屋', cat: 'food', icon: 'sushi', size: [2, 1], cost: 180000, price: 2200, cap: 4, time: 60, sat: 78, appeal: 30, rank: 3, rp: 160, serves: ['hunger'], hours: [11, 22], look: { roof: 'kawara', c1: '#262b44', wall: '#ead4aa', noren: '#124e89' }, desc: '観光客と外国人の憧れ。' });
defB({ id: 'yakiniku', name: '焼肉屋', cat: 'food', icon: 'meat', size: [2, 2], cost: 320000, price: 3800, cap: 8, time: 80, sat: 80, appeal: 34, rank: 4, rp: 260, serves: ['hunger'], hours: [11, 24], look: { roof: 'flat', c1: '#733e39', wall: '#3a4466', sign: '#e43b44' }, desc: 'がっつり食べて大満足。' });
defB({ id: 'french', name: '高級フレンチ', cat: 'food', icon: 'french', size: [2, 2], cost: 700000, price: 9500, cap: 6, time: 100, sat: 90, appeal: 45, rank: 5, rp: 420, serves: ['hunger'], hours: [11, 23], look: { roof: 'dome', c1: '#68386c', wall: '#f4f4f4', sign: '#feae34' }, desc: 'お金持ちとカップル御用達。' });
/* ---- 喫茶 ---- */
defB({ id: 'vending', name: '自販機', cat: 'drink', icon: 'vend', cost: 8000, price: 130, cap: 1, time: 3, sat: 52, appeal: 2, staff: false, serves: ['thirst'], hours: [0, 24], look: { custom: 'vending' }, desc: '安くて早い。24時間稼働。' });
defB({ id: 'teahouse', name: '甘味処', cat: 'drink', icon: 'dango', cost: 25000, price: 380, cap: 3, time: 30, sat: 65, appeal: 14, serves: ['thirst', 'fatigue'], hours: [9, 19], look: { roof: 'kawara', c1: '#5a6988', wall: '#ead4aa', noren: '#68386c' }, desc: 'お団子とお茶でひと休み。' });
defB({ id: 'cafe', name: 'カフェ', cat: 'drink', icon: 'coffee', size: [2, 1], cost: 70000, price: 550, cap: 5, time: 35, sat: 70, appeal: 22, rank: 1, rp: 50, serves: ['thirst', 'fatigue'], hours: [7, 21], look: { roof: 'awning', aw: ['#733e39', '#ead4aa'], wall: '#b86f50' }, desc: 'のどを潤し疲れも癒す万能店。' });
defB({ id: 'tapioca', name: 'タピオカ屋', cat: 'drink', icon: 'tapioca', cost: 60000, price: 600, cap: 3, time: 15, sat: 68, appeal: 20, rank: 2, rp: 90, serves: ['thirst'], look: { roof: 'awning', aw: ['#b55088', '#fee761'], wall: '#f4f4f4' }, desc: '学生の行列ができる。' });
defB({ id: 'bar', name: 'バー', cat: 'drink', icon: 'cocktail', size: [2, 1], cost: 220000, price: 2800, cap: 5, time: 70, sat: 76, appeal: 26, rank: 3, rp: 180, adult: true, serves: ['thirst', 'fun'], hours: [17, 24], look: { roof: 'flat', c1: '#262b44', wall: '#3a4466', sign: '#b55088' }, desc: '夜だけ営業。大人の社交場。' });
/* ---- 買物 ---- */
defB({ id: 'greengrocer', name: '八百屋', cat: 'shop', icon: 'carrot', cost: 20000, price: 450, cap: 3, time: 15, sat: 58, appeal: 10, serves: ['shop'], hours: [7, 19], look: { roof: 'awning', aw: ['#63c74d', '#fee761'], wall: '#b86f50' }, desc: '主婦のお財布の味方。' });
defB({ id: 'zakka', name: '雑貨屋', cat: 'shop', icon: 'gift', cost: 30000, price: 750, cap: 3, time: 20, sat: 62, appeal: 14, serves: ['shop'], look: { roof: 'tri', c1: '#0099db', wall: '#fff6e0' }, desc: 'かわいい小物がいっぱい。' });
defB({ id: 'bookstore', name: '本屋', cat: 'shop', icon: 'book', cost: 45000, price: 1000, cap: 3, time: 30, sat: 66, appeal: 15, rank: 1, rp: 35, serves: ['shop'], look: { roof: 'kawara', c1: '#3e8948', wall: '#ead4aa', noren: '#124e89' }, desc: '学生とお年寄りが通う。' });
defB({ id: 'toy', name: 'おもちゃ屋', cat: 'shop', icon: 'toy', cost: 60000, price: 1300, cap: 3, time: 25, sat: 68, appeal: 18, rank: 1, rp: 45, serves: ['shop', 'fun'], look: { roof: 'tri', c1: '#feae34', wall: '#63c74d' }, desc: '子供たちの夢の場所。' });
defB({ id: 'clothes', name: '洋服屋', cat: 'shop', icon: 'shirt', size: [2, 1], cost: 130000, price: 3200, cap: 5, time: 40, sat: 70, appeal: 25, rank: 2, rp: 110, serves: ['shop'], hours: [10, 21], look: { roof: 'modern', c1: '#124e89', wall: '#f4f4f4' }, desc: '流行の最先端。' });
defB({ id: 'electronics', name: '家電量販店', cat: 'shop', icon: 'tv', size: [2, 2], cost: 380000, price: 9000, cap: 8, time: 45, sat: 72, appeal: 30, rank: 3, rp: 220, serves: ['shop', 'fun'], hours: [10, 22], look: { roof: 'flat', c1: '#e43b44', wall: '#f4f4f4', sign: '#fee761' }, desc: '高額商品で売上ドカン。' });
defB({ id: 'jewelry', name: '宝石店', cat: 'shop', icon: 'gem', cost: 500000, price: 30000, cap: 2, time: 40, sat: 80, appeal: 36, rank: 4, rp: 320, serves: ['shop'], hours: [10, 20], look: { roof: 'dome', c1: '#2ce8f5', wall: '#262b44', sign: '#feae34' }, desc: 'お金持ちしか買えない超高額店。' });
defB({ id: 'department', name: 'デパート', cat: 'shop', icon: 'bag', size: [2, 2], cost: 1500000, price: 14000, cap: 20, time: 70, sat: 82, appeal: 50, rank: 5, rp: 520, serves: ['shop', 'hunger', 'toilet'], hours: [10, 21], look: { roof: 'big', c1: '#a22633', wall: '#f4e2c0', sign: '#fee761' }, desc: '何でもそろう街の顔。トイレ付き。' });
/* ---- 娯楽 ---- */
defB({ id: 'arcade', name: 'ゲームセンター', cat: 'fun', icon: 'game', cost: 80000, price: 900, cap: 4, time: 45, sat: 68, appeal: 20, rank: 1, rp: 45, serves: ['fun'], hours: [10, 23], look: { roof: 'modern', c1: '#68386c', wall: '#262b44' }, desc: '学生と子供のたまり場。' });
defB({ id: 'karaoke', name: 'カラオケ', cat: 'fun', icon: 'mic', size: [2, 1], cost: 160000, price: 1600, cap: 6, time: 90, sat: 72, appeal: 24, rank: 2, rp: 100, serves: ['fun'], hours: [10, 24], look: { roof: 'flat', c1: '#b55088', wall: '#fee761', sign: '#124e89' }, desc: '学生と会社員が盛り上がる。' });
defB({ id: 'bowling', name: 'ボウリング場', cat: 'fun', icon: 'pin', size: [2, 2], cost: 360000, price: 2200, cap: 10, time: 100, sat: 74, appeal: 30, rank: 3, rp: 200, serves: ['fun'], hours: [10, 24], look: { roof: 'pin' }, desc: '屋根の巨大ピンが目印。' });
defB({ id: 'cinema', name: '映画館', cat: 'fun', icon: 'film', size: [2, 2], cost: 520000, price: 1900, cap: 20, time: 140, sat: 78, appeal: 36, rank: 3, rp: 260, serves: ['fun', 'fatigue'], hours: [9, 24], look: { roof: 'flat', c1: '#262b44', wall: '#a22633', sign: '#fee761' }, desc: '大人数を長時間収容。雨の日に強い。' });
defB({ id: 'aquarium', name: '水族館', cat: 'fun', icon: 'fish', size: [2, 2], cost: 1800000, price: 3200, cap: 25, time: 150, sat: 86, appeal: 55, rank: 5, rp: 560, serves: ['fun', 'fatigue'], hours: [9, 21], look: { roof: 'dome', c1: '#0099db', wall: '#2ce8f5', sign: '#f4f4f4' }, desc: '家族もカップルも観光客も集まる。' });
defB({ id: 'ferris', name: '観覧車', cat: 'fun', icon: 'wheel', size: [2, 2], cost: 3000000, price: 1500, cap: 16, time: 40, sat: 90, appeal: 80, rank: 6, rp: 800, serves: ['fun'], hours: [9, 24], staff: true, look: { custom: 'ferris' }, desc: '街のシンボル。遠くからでも人が来る。' });
/* ---- 癒し ---- */
defB({ id: 'bench', name: 'ベンチ', cat: 'relax', icon: 'bench', cost: 3000, price: 0, cap: 2, time: 20, sat: 55, appeal: 2, staff: false, serves: ['fatigue'], hours: [0, 24], look: { custom: 'bench' }, desc: '無料でひと休み。' });
defB({ id: 'sento', name: '銭湯', cat: 'relax', icon: 'onsen', size: [2, 1], cost: 110000, price: 520, cap: 8, time: 60, sat: 72, appeal: 20, rank: 1, rp: 70, serves: ['fatigue'], hours: [14, 24], look: { roof: 'kawara', c1: '#3a4466', wall: '#ead4aa', noren: '#0099db', chimney: true }, desc: 'お年寄りの憩いの場。' });
defB({ id: 'salon', name: '美容院', cat: 'relax', icon: 'scissor', cost: 100000, price: 4200, cap: 2, time: 60, sat: 72, appeal: 20, rank: 2, rp: 120, serves: ['fatigue', 'shop'], hours: [10, 20], look: { roof: 'modern', c1: '#f4f4f4', wall: '#ff97c1' }, desc: '客単価が高いおしゃれ店。' });
defB({ id: 'spa', name: 'スパリゾート', cat: 'relax', icon: 'lotus', size: [2, 2], cost: 900000, price: 5500, cap: 12, time: 120, sat: 86, appeal: 40, rank: 4, rp: 380, serves: ['fatigue'], hours: [10, 24], look: { roof: 'kawara', c1: '#265c42', wall: '#f4e2c0', noren: '#b55088', chimney: true }, desc: '極上の癒し。満足度が高い。' });
defB({ id: 'hotel', name: 'ホテル', cat: 'relax', icon: 'bed', size: [2, 2], cost: 1400000, price: 16000, cap: 10, time: 240, sat: 84, appeal: 42, rank: 4, rp: 450, serves: ['fatigue'], hours: [15, 24], look: { roof: 'hotel', c1: '#124e89', wall: '#ead4aa' }, desc: '夕方から観光客が泊まりに来る。' });
/* ---- 施設 ---- */
defB({ id: 'toilet', name: '公衆トイレ', cat: 'fac', icon: 'wc', cost: 12000, price: 0, cap: 3, time: 6, sat: 60, appeal: 1, staff: false, serves: ['toilet'], hours: [0, 24], look: { custom: 'toilet' }, desc: 'ないと客が怒って帰る。' });
defB({ id: 'trash', name: 'ゴミ箱', cat: 'fac', icon: 'trash', cost: 2500, appeal: 0, staff: false, radius: 3, hours: [0, 24], look: { custom: 'trash' }, desc: '周囲3マスのポイ捨てを大幅に減らす。' });
defB({ id: 'koban', name: '交番', cat: 'fac', icon: 'koban', cost: 60000, appeal: 6, rank: 1, rp: 40, staff: false, radius: 6, hours: [0, 24], look: { custom: 'koban' }, desc: '周囲6マスで泥棒を防ぐ。安心感UP。' });
defB({ id: 'conv', name: 'コンビニ', cat: 'fac', icon: 'conv', cost: 120000, price: 420, cap: 4, time: 8, sat: 64, appeal: 12, rank: 2, rp: 100, serves: ['hunger', 'thirst', 'toilet'], hours: [0, 24], look: { roof: 'conv' }, desc: '食べ物・飲み物・トイレ全部OK。' });
defB({ id: 'atm', name: 'ATM', cat: 'fac', icon: 'atm', cost: 50000, price: 110, cap: 2, time: 4, sat: 60, appeal: 2, rank: 2, rp: 80, staff: false, serves: ['money'], hours: [0, 24], look: { custom: 'atm' }, desc: 'お金が尽きた客がお金をおろす。手数料収入。' });
defB({ id: 'parking', name: '駐車場', cat: 'fac', icon: 'parking', size: [2, 2], cost: 90000, appeal: 3, rank: 2, rp: 90, staff: false, hours: [0, 24], look: { custom: 'parking' }, desc: '家族連れ・主婦の来客が増える。' });
defB({ id: 'busstop', name: 'バス停', cat: 'fac', icon: 'bus', cost: 150000, appeal: 4, rank: 3, rp: 150, staff: false, hours: [0, 24], look: { custom: 'busstop' }, desc: '新たな入口になり来客も増える。道に面して設置。' });
/* ---- 装飾 ---- */
defB({ id: 'tree', name: '街路樹', cat: 'deco', icon: 'tree', cost: 2000, appeal: 3, radius: 2, staff: false, look: { custom: 'tree' }, desc: '周囲2マスの魅力UP。' });
defB({ id: 'flower', name: '花壇', cat: 'deco', icon: 'flower', cost: 3000, appeal: 4, radius: 2, staff: false, look: { custom: 'flower' }, desc: '周囲2マスの魅力UP。' });
defB({ id: 'lamp', name: '街灯', cat: 'deco', icon: 'lamp', cost: 8000, appeal: 3, radius: 2, staff: false, look: { custom: 'lamp' }, desc: '夜は魅力が3倍になり街を照らす。' });
defB({ id: 'flagi', name: 'のぼり旗', cat: 'deco', icon: 'flagi', cost: 4000, appeal: 3, radius: 1, staff: false, look: { custom: 'flag' }, desc: '隣接店の魅力UP。' });
defB({ id: 'sakura', name: '桜の木', cat: 'deco', icon: 'sakura', cost: 20000, appeal: 7, radius: 3, rank: 1, rp: 30, staff: false, look: { custom: 'sakura' }, desc: '春は魅力が3倍に！' });
defB({ id: 'lantern', name: '提灯', cat: 'deco', icon: 'lantern', cost: 12000, appeal: 5, radius: 2, rank: 1, rp: 30, staff: false, look: { custom: 'lantern' }, desc: '夏祭りの間は魅力3倍。夜も明るい。' });
defB({ id: 'pond', name: '池', cat: 'deco', icon: 'pond', size: [2, 2], cost: 50000, appeal: 12, radius: 3, rank: 2, rp: 60, staff: false, look: { custom: 'pond' }, desc: '鯉が泳ぐ癒しの池。' });
defB({ id: 'xmas', name: 'ツリー', cat: 'deco', icon: 'xmas', cost: 60000, appeal: 10, radius: 3, rank: 2, rp: 80, staff: false, look: { custom: 'xmas' }, desc: '12月は魅力3倍＆カップル増。' });
defB({ id: 'statue', name: '銅像', cat: 'deco', icon: 'statue', cost: 90000, appeal: 14, radius: 3, rank: 3, rp: 120, staff: false, look: { custom: 'statue' }, desc: '商店街の創始者の像。' });
defB({ id: 'fountain', name: '噴水', cat: 'deco', icon: 'fountain', size: [2, 2], cost: 150000, appeal: 22, radius: 4, rank: 3, rp: 140, staff: false, look: { custom: 'fountain' }, desc: '広場の主役。広範囲の魅力UP。' });

const ROADS = {
  road: { id: 'road', name: '道路', icon: 'road', cost: 500, appeal: 0, rank: 0, rp: 0, desc: 'お客さんが歩く道。' },
  stone: { id: 'stone', name: '石畳', icon: 'stone', cost: 1500, appeal: 1, rank: 2, rp: 60, desc: '面した店の魅力+1。' },
  brick: { id: 'brick', name: 'レンガ道', icon: 'brick', cost: 3000, appeal: 2, rank: 4, rp: 150, desc: '面した店の魅力+2。' },
};
const ROAD_KEYS = { 1: 'road', 2: 'stone', 3: 'brick' };
const ROAD_CODE = { road: 1, stone: 2, brick: 3 };

/* ---- 客の種類 ---- */
const CUST = {
  kid: { name: '子供', budget: [600, 2500], speed: 1.25, rank: 0, weight: 1.0, needMul: { hunger: 1.1, thirst: 1.2, shop: 0.7, fun: 1.6, fatigue: 0.6, toilet: 1.2 },
    prefs: { toy: 3, crepe: 3, arcade: 2.5, onigiri: 1.6, bakery: 1.4, vending: 2, tapioca: 1.4, burger: 2.2, aquarium: 3, ferris: 3, bench: 1 }, look: { small: true } },
  student: { name: '学生', budget: [1500, 6000], speed: 1.1, rank: 0, weight: 1.2, needMul: { hunger: 1.2, thirst: 1.1, shop: 1.0, fun: 1.5, fatigue: 0.8, toilet: 1 },
    prefs: { arcade: 3, karaoke: 3, tapioca: 3, burger: 2.6, ramen: 2, bookstore: 2.2, crepe: 2, clothes: 1.6, cinema: 2, bowling: 2.6, conv: 1.8 }, look: { uniform: true } },
  housewife: { name: '主婦', budget: [3000, 12000], speed: 0.95, rank: 0, weight: 1.1, needMul: { hunger: 0.9, thirst: 1, shop: 1.6, fun: 0.6, fatigue: 1, toilet: 1 },
    prefs: { greengrocer: 3, bakery: 2.5, zakka: 2.5, teahouse: 2, salon: 2.6, clothes: 1.6, cafe: 2, department: 2.2 }, look: { apron: true } },
  salaryman: { name: '会社員', budget: [5000, 25000], speed: 1.05, rank: 0, weight: 1.1, needMul: { hunger: 1.4, thirst: 1.3, shop: 0.8, fun: 0.9, fatigue: 1.3, toilet: 1 },
    prefs: { ramen: 3, bar: 3.2, onigiri: 2, cafe: 1.6, yakiniku: 2.6, electronics: 2.2, sento: 1.6, conv: 2, karaoke: 1.6 }, look: { suit: true } },
  elder: { name: 'お年寄り', budget: [3000, 15000], speed: 0.7, rank: 1, weight: 0.9, needMul: { hunger: 0.8, thirst: 1.1, shop: 1, fun: 0.5, fatigue: 1.6, toilet: 1.4 },
    prefs: { teahouse: 3, sento: 3, greengrocer: 2, bookstore: 2, bench: 2.5, sushi: 1.6, spa: 2 }, look: { elder: true } },
  couple: { name: 'カップル', budget: [15000, 40000], speed: 0.95, rank: 2, weight: 0.8, needMul: { hunger: 1, thirst: 1.1, shop: 1.1, fun: 1.4, fatigue: 0.8, toilet: 0.9 },
    prefs: { cinema: 3, cafe: 2.6, french: 3, ferris: 3.6, jewelry: 2, aquarium: 3, crepe: 2, karaoke: 1.6, tapioca: 1.8 }, look: { couple: true } },
  tourist: { name: '観光客', budget: [20000, 60000], speed: 0.9, rank: 3, weight: 0.8, needMul: { hunger: 1.2, thirst: 1.2, shop: 1.3, fun: 1.2, fatigue: 1.2, toilet: 1.1 },
    prefs: { sushi: 3, zakka: 2.6, hotel: 3.2, ferris: 2.6, aquarium: 2.6, teahouse: 2.2, ramen: 2, spa: 2.2, statue: 1 }, look: { hat: true } },
  foreigner: { name: '外国人観光客', budget: [25000, 90000], speed: 1.0, rank: 4, weight: 0.6, needMul: { hunger: 1.3, thirst: 1.2, shop: 1.4, fun: 1.1, fatigue: 1.1, toilet: 1 },
    prefs: { sushi: 3.2, ramen: 3, onigiri: 2.4, teahouse: 2.6, electronics: 3, sento: 2, zakka: 2.2, hotel: 2.2 }, look: { cap: true } },
  rich: { name: 'お金持ち', budget: [100000, 400000], speed: 0.85, rank: 4, weight: 0.35, needMul: { hunger: 1, thirst: 1, shop: 1.6, fun: 0.9, fatigue: 1.1, toilet: 1 },
    prefs: { jewelry: 4, french: 3.6, spa: 3, hotel: 3, department: 3, sushi: 2.2, onigiri: 0.3, vending: 0.2, greengrocer: 0.3 }, look: { rich: true } },
  celeb: { name: '有名人', budget: [400000, 800000], speed: 0.9, rank: 99, weight: 0, needMul: { hunger: 1.3, thirst: 1.3, shop: 1.5, fun: 1.5, fatigue: 1, toilet: 1 }, prefs: {}, look: { celeb: true } },
  thief: { name: 'あやしい人', budget: [0, 0], speed: 1.3, rank: 99, weight: 0, needMul: {}, prefs: {}, look: { thief: true } },
};
const CUST_ORDER = ['kid', 'student', 'housewife', 'salaryman', 'elder', 'couple', 'tourist', 'foreigner', 'rich', 'celeb'];

/* ---- コンボ ---- */
const COMBOS = [
  { id: 'market', name: '朝市', ids: ['greengrocer', 'onigiri'] },
  { id: 'morning', name: '朝ごはん通り', ids: ['bakery', 'cafe'] },
  { id: 'souvenir', name: 'お土産通り', ids: ['zakka', 'teahouse'] },
  { id: 'bathmilk', name: '風呂上がりの一杯', ids: ['sento', 'vending'] },
  { id: 'bookcafe', name: 'ブックカフェ', ids: ['bookstore', 'cafe'] },
  { id: 'kidspark', name: 'キッズパーク', ids: ['toy', 'crepe'] },
  { id: 'wafu', name: '和の風情', ids: ['teahouse', 'sakura'] },
  { id: 'flowerpath', name: '花の小径', ids: ['flower', 'sakura', 'tree'] },
  { id: 'ramenwar', name: 'ラーメン激戦区', ids: ['ramen', 'ramen'] },
  { id: 'youth', name: '若者の街', ids: ['arcade', 'tapioca'] },
  { id: 'family', name: 'ファミリーランチ', ids: ['toy', 'burger'] },
  { id: 'sweets', name: 'スイーツ横丁', ids: ['crepe', 'tapioca', 'bakery'] },
  { id: 'safe', name: '安心安全', ids: ['koban', 'lamp'] },
  { id: 'fashion', name: 'おしゃれ通り', ids: ['clothes', 'salon'] },
  { id: 'conv24', name: '24時間の安心', ids: ['conv', 'atm'] },
  { id: 'showa', name: '昭和レトロ', ids: ['sento', 'teahouse', 'lantern'] },
  { id: 'salaryman', name: '仕事帰り', ids: ['bar', 'ramen'] },
  { id: 'night', name: '夜の街', ids: ['bar', 'lamp'] },
  { id: 'date', name: 'デートコース', ids: ['cinema', 'cafe'] },
  { id: 'gourmet', name: 'グルメ街道', ids: ['sushi', 'yakiniku'] },
  { id: 'afterparty', name: '打ち上げ', ids: ['karaoke', 'yakiniku'] },
  { id: 'akiba', name: '電気街', ids: ['electronics', 'arcade', 'bookstore'] },
  { id: 'bowlingburger', name: 'ボウル＆バーガー', ids: ['bowling', 'burger'] },
  { id: 'plaza', name: '癒しの広場', ids: ['fountain', 'bench'] },
  { id: 'xmasplaza', name: '聖夜の広場', ids: ['xmas', 'lamp', 'fountain'] },
  { id: 'celeb', name: 'セレブ通り', ids: ['jewelry', 'french'] },
  { id: 'resort', name: 'リゾート気分', ids: ['spa', 'hotel'] },
  { id: 'mall', name: 'ショッピングモール', ids: ['department', 'clothes'] },
  { id: 'water', name: '水辺の散歩道', ids: ['aquarium', 'pond'] },
  { id: 'dreamland', name: '夢の遊園地', ids: ['ferris', 'crepe'] },
];

/* ---- 研究(技術) ---- */
const TECHS = [
  { id: 'register', name: 'レジ改善', rp: 40, rank: 0, desc: '全店の滞在時間 -15%。回転率UP。' },
  { id: 'pointcard', name: 'ポイントカード', rp: 60, rank: 1, desc: 'お客さんが立ち寄る店が1軒増える。' },
  { id: 'cleanvol', name: '清掃ボランティア', rp: 80, rank: 1, desc: '毎朝ゴミの半分を自動で回収。' },
  { id: 'cashless', name: 'キャッシュレス決済', rp: 100, rank: 2, desc: '全店の売上 +6%。' },
  { id: 'sns', name: 'SNS運用', rp: 120, rank: 2, desc: '人気の自然減少が半分に。学生が増える。' },
  { id: 'camera', name: '防犯カメラ', rp: 150, rank: 3, desc: '泥棒被害を完全に防ぐ。' },
  { id: 'nightopen', name: '夜間営業', rp: 160, rank: 3, desc: '全店の閉店時間が1時間延長。夜の客が増える。' },
  { id: 'greenery', name: '緑化計画', rp: 180, rank: 3, desc: '装飾の魅力効果 +30%。' },
  { id: 'training', name: '人材育成', rp: 200, rank: 3, desc: 'スタッフの経験値1.5倍＆研修費30%OFF。' },
  { id: 'guide', name: '観光案内所', rp: 280, rank: 4, desc: '観光客・外国人の来客が2倍。' },
  { id: 'brand', name: '商店街ブランド', rp: 300, rank: 4, desc: '全店の価格 +8%（満足度は下がらない）。' },
  { id: 'festival', name: '商店街まつり', rp: 350, rank: 5, desc: '季節イベントの集客効果が1.5倍。' },
  { id: 'lucky', name: '招き猫', rp: 500, rank: 6, desc: '良いランダムイベントが起きやすくなる。' },
];

/* ---- 宣伝 ---- */
const ADS = [
  { id: 'flyer', name: 'チラシ配り', cost: 15000, days: 2, boost: 0.35, rank: 0, favor: {}, desc: '近所にチラシを配る。' },
  { id: 'paper', name: '地域情報誌', cost: 60000, days: 4, boost: 0.6, rank: 1, favor: { housewife: 2, elder: 2 }, desc: '主婦とお年寄りに届く。' },
  { id: 'radio', name: 'ラジオCM', cost: 150000, days: 5, boost: 0.9, rank: 2, favor: { salaryman: 2 }, desc: '通勤中の会社員に届く。' },
  { id: 'snsad', name: 'SNSキャンペーン', cost: 280000, days: 6, boost: 1.1, rank: 3, favor: { student: 2, couple: 2 }, desc: '若者の間でバズる。' },
  { id: 'tv', name: 'テレビCM', cost: 900000, days: 7, boost: 1.8, rank: 4, favor: {}, desc: '全国に知られる大型宣伝。' },
  { id: 'overseas', name: '海外PR', cost: 2500000, days: 14, boost: 1.0, rank: 5, favor: { tourist: 3, foreigner: 3 }, desc: '世界中から観光客を呼ぶ。' },
];

/* ---- ランク ---- */
const RANKS = [
  { name: '寂れた通り', visitors: 0, pop: 0, buildings: 0, reward: 0 },
  { name: '小さな商店街', visitors: 120, pop: 25, buildings: 5, reward: 50000 },
  { name: 'にぎわい商店街', visitors: 600, pop: 80, buildings: 12, reward: 150000 },
  { name: '人気の商店街', visitors: 2000, pop: 180, buildings: 20, reward: 400000 },
  { name: '話題の商店街', visitors: 6000, pop: 350, buildings: 30, reward: 1000000 },
  { name: '有名商店街', visitors: 15000, pop: 600, buildings: 42, reward: 3000000 },
  { name: '日本一の商店街', visitors: 35000, pop: 1000, buildings: 55, reward: 8000000 },
  { name: '伝説の商店街', visitors: 80000, pop: 1800, buildings: 70, reward: 20000000 },
];

/* ---- 土地 ---- */
const LANDS = [
  { id: 0, name: '中央南', x: 11, y: 12, w: 12, h: 12, rank: 0, cost: 0 },
  { id: 1, name: '西南', x: 0, y: 12, w: 11, h: 12, rank: 1, cost: 80000 },
  { id: 2, name: '東南', x: 23, y: 12, w: 11, h: 12, rank: 2, cost: 250000 },
  { id: 3, name: '中央北', x: 11, y: 0, w: 12, h: 12, rank: 3, cost: 700000 },
  { id: 4, name: '西北', x: 0, y: 0, w: 11, h: 12, rank: 4, cost: 2000000 },
  { id: 5, name: '東北', x: 23, y: 0, w: 11, h: 12, rank: 5, cost: 5000000 },
];

/* ---- スタッフ名 ---- */
const FAMILY = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '松本', '井上', '木村', '林', '清水', '森', '池田', '橋本', '石川', '前田', '藤田', '岡田', '後藤', '村上', '近藤', '坂本', '遠藤', '青木'];
const GIVEN = ['ゆうき', 'さくら', 'はると', 'ひなた', 'そうた', 'あおい', 'れん', 'みお', 'たくみ', 'ゆい', 'けんた', 'まい', 'だいき', 'りこ', 'しょう', 'なな', 'かいと', 'えま', 'りく', 'ことね', 'ひろし', 'のぞみ', 'つばさ', 'あかり', 'しゅん', 'みさき', 'ごろう', 'ちはる', 'こうじ', 'ほのか'];

/* ---- ライバル商店街 (全国ランキング) ---- */
const RIVALS = [
  { name: '銀杏通り商店街', base: 600 }, { name: '浪花ほんわか街', base: 1000 }, { name: '青葉台モール通り', base: 1500 },
  { name: '港町レンガ街', base: 2200 }, { name: '天神ひかり通り', base: 3200 }, { name: '雷門まえ仲見世', base: 4500 },
  { name: '北野坂ハイカラ街', base: 6500 }, { name: '心斎ばし筋', base: 9000 }, { name: '表参道アベニュー', base: 13000 },
];

/* ---- 目標 ---- */
const MISSIONS = [
  { t: '道を5マス敷こう', d: '「建設」→「道路」から。お客さんは道しか歩けない。', c: (S) => S.stats.roadsBuilt >= 5, r: { money: 10000 } },
  { t: 'おにぎり屋を建てよう', d: '道に面した場所に建てよう。', c: (S) => countB('onigiri') >= 1, r: { money: 15000, rp: 10 } },
  { t: '喫茶の店を建てよう', d: '自販機か甘味処。のどが渇いた客が使う。', c: (S) => countCat('drink') >= 1, r: { money: 15000 } },
  { t: '公衆トイレを設置しよう', d: 'トイレがないと客が不満で帰ってしまう。', c: (S) => countB('toilet') >= 1, r: { money: 20000, rp: 10 } },
  { t: '累計来客50人', d: '店を増やすとお客さんも増える。', c: (S) => S.stats.visitors >= 50, r: { money: 20000 } },
  { t: '装飾を3つ置こう', d: '装飾は周りの店の魅力を上げる。', c: (S) => countCat('deco') >= 3, r: { money: 15000, rp: 10 } },
  { t: '1か月の売上 ¥100,000', d: '月末に経営報告が届く。', c: (S) => S.stats.bestMonthSales >= 100000, r: { money: 30000, rp: 15 } },
  { t: 'ランク「小さな商店街」', d: '「目標」画面でランクアップ条件を確認しよう。', c: (S) => S.rank >= 1, r: { rp: 30 } },
  { t: 'スタッフを雇おう', d: 'スタッフを店に配置すると売上と満足度が上がる。', c: (S) => S.staff.length >= 1, r: { money: 30000 } },
  { t: '研究で新しい店を解放', d: 'お客さんが満足すると研究ポイント(RP)がたまる。', c: (S) => S.stats.researched >= 1, r: { rp: 20 } },
  { t: 'コンボを発見しよう', d: '特定の店同士を近く(1マス以内)に建てると発見。', c: (S) => S.combos.length >= 1, r: { money: 40000, rp: 20 } },
  { t: '店をLv2に改装しよう', d: 'お客さんが来ると経験値がたまり、改装できる。', c: (S) => maxLevel() >= 2, r: { money: 40000 } },
  { t: '宣伝をしてみよう', d: '一定期間、お客さんが増える。', c: (S) => S.stats.adsUsed >= 1, r: { rp: 20 } },
  { t: '新しい土地を購入', d: '「経営」→「土地」から購入できる。', c: (S) => S.lands.length >= 2, r: { money: 60000, rp: 20 } },
  { t: '累計来客500人', d: '', c: (S) => S.stats.visitors >= 500, r: { money: 80000 } },
  { t: '所持金 ¥500,000', d: '', c: (S) => S.money >= 500000, r: { rp: 40 } },
  { t: 'コンボを5つ発見', d: '「メニュー」→「図鑑」でヒントを確認。', c: (S) => S.combos.length >= 5, r: { money: 150000, rp: 40 } },
  { t: 'ランク「にぎわい商店街」', d: '', c: (S) => S.rank >= 2, r: { rp: 50 } },
  { t: '店をLv3に改装', d: '', c: (S) => maxLevel() >= 3, r: { money: 150000 } },
  { t: '1日の来客100人', d: '', c: (S) => S.stats.bestDayVisitors >= 100, r: { money: 200000, rp: 40 } },
  { t: 'スタッフ5人体制', d: '', c: (S) => S.staff.length >= 5, r: { money: 200000 } },
  { t: '1か月の売上 ¥1,000,000', d: '', c: (S) => S.stats.bestMonthSales >= 1000000, r: { money: 300000, rp: 60 } },
  { t: 'ランク「人気の商店街」', d: '', c: (S) => S.rank >= 3, r: { rp: 80 } },
  { t: 'コンボを10個発見', d: '', c: (S) => S.combos.length >= 10, r: { money: 500000, rp: 80 } },
  { t: '月の平均満足度80以上', d: '店のレベル・スタッフ・装飾で満足度UP。', c: (S) => S.stats.bestMonthSat >= 80, r: { money: 500000, rp: 60 } },
  { t: '1日の来客300人', d: '', c: (S) => S.stats.bestDayVisitors >= 300, r: { money: 800000, rp: 80 } },
  { t: 'ランク「話題の商店街」', d: '', c: (S) => S.rank >= 4, r: { rp: 120 } },
  { t: '店をLv5に改装', d: '', c: (S) => maxLevel() >= 5, r: { money: 1000000, rp: 100 } },
  { t: '1年の売上 ¥30,000,000', d: '', c: (S) => S.stats.bestYearSales >= 30000000, r: { money: 2000000, rp: 120 } },
  { t: 'ランク「有名商店街」', d: '', c: (S) => S.rank >= 5, r: { rp: 150 } },
  { t: '全国ランキングTOP3', d: '毎年3月末に発表される。', c: (S) => S.stats.bestNational > 0 && S.stats.bestNational <= 3, r: { money: 5000000, rp: 150 } },
  { t: '観覧車を建てよう', d: '', c: (S) => countB('ferris') >= 1, r: { money: 3000000, rp: 150 } },
  { t: 'すべての土地を購入', d: '', c: (S) => S.lands.length >= LANDS.length, r: { money: 5000000, rp: 200 } },
  { t: 'コンボを20個発見', d: '', c: (S) => S.combos.length >= 20, r: { money: 8000000, rp: 200 } },
  { t: 'ランク「日本一の商店街」', d: '', c: (S) => S.rank >= 6, r: { rp: 300 } },
  { t: '全国ランキング1位', d: '', c: (S) => S.stats.bestNational === 1, r: { money: 20000000, rp: 300 } },
  { t: '所持金 ¥100,000,000', d: '', c: (S) => S.money >= 100000000, r: { rp: 400 } },
  { t: 'ランク「伝説の商店街」', d: '', c: (S) => S.rank >= 7, r: { money: 50000000 } },
  { t: '全コンボ制覇', d: '', c: (S) => S.combos.length >= COMBOS.length, r: { money: 100000000 } },
];

/* ---- 季節イベント ---- */
const SEASON_EVENTS = {
  1: { name: '初売り', days: [1, 2, 3], spawn: 1.6, sales: { shop: 1.3 }, desc: '新年の初売りで買い物客が殺到！' },
  2: { name: 'バレンタイン', days: [4, 5], spawn: 1.3, pref: { bakery: 2, crepe: 2, cafe: 2, tapioca: 2, teahouse: 1.5 }, custBoost: { couple: 2.5 }, desc: 'スイーツのお店が大人気！' },
  3: { name: '卒業シーズン', days: [1, 2, 3, 4, 5, 6, 7], spawn: 1.15, custBoost: { student: 2 }, desc: '学生たちがお祝いにやってくる。' },
  4: { name: 'お花見', days: [2, 3, 4, 5, 6], spawn: 1.5, deco: { sakura: 3 }, desc: '桜の木の魅力が3倍！' },
  5: { name: 'ゴールデンウィーク', days: [1, 2, 3, 4, 5], spawn: 1.7, custBoost: { tourist: 1.8, kid: 1.5 }, desc: '連休で人出が大幅アップ！' },
  7: { name: '七夕', days: [6, 7], spawn: 1.3, custBoost: { couple: 2 }, desc: '願い事を胸にカップルが集まる。' },
  8: { name: '夏祭り', days: [4, 5, 6], spawn: 1.9, deco: { lantern: 3 }, fireworks: true, desc: '提灯の魅力3倍！夜には花火が上がる。' },
  9: { name: '敬老の日', days: [3], spawn: 1.3, custBoost: { elder: 3 }, desc: 'お年寄りが大勢やってくる。' },
  10: { name: 'ハロウィン', days: [5, 6, 7], spawn: 1.5, custBoost: { kid: 2.2, student: 1.5 }, halloween: true, sales: { fun: 1.3 }, desc: '仮装した子供たちで大にぎわい！' },
  11: { name: '商店街大感謝祭', days: [4, 5], spawn: 1.6, sales: { all: 1.1 }, desc: '街をあげての大セール！' },
  12: { name: 'クリスマス', days: [4, 5, 6], spawn: 1.6, deco: { xmas: 3 }, custBoost: { couple: 3 }, desc: 'ツリーの魅力3倍。カップルだらけ！' },
};

const SEASON_OF = (m) => (m >= 3 && m <= 5 ? 0 : m >= 6 && m <= 8 ? 1 : m >= 9 && m <= 11 ? 2 : 3);
const SEASON_NAME = ['春', '夏', '秋', '冬'];
const WEATHER = { sun: { name: '晴れ', icon: 'sun', spawn: 1 }, cloud: { name: 'くもり', icon: 'cloud', spawn: 0.95 }, rain: { name: '雨', icon: 'rain', spawn: 0.7 }, snow: { name: '雪', icon: 'snow', spawn: 0.65 } };

/* ================================================================
   4. ゲーム状態
   ================================================================ */
const NT = MAP_W * MAP_H;
const idx = (x, y) => y * MAP_W + x;
const inMap = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;

let S = null;                 // 保存される状態
let customers = [];           // 実行時のみ
let floats = [];              // 浮かぶ文字
let effects = [];             // エフェクト
let custSeq = 1;
const occ = new Int32Array(NT);     // 建物uid
const landGrid = new Int8Array(NT); // 土地ID
const bmap = new Map();             // uid -> building
let exitsList = [];
let appealDirty = true, comboDirty = true, staticDirty = true;
let spawnAcc = 0;
let spawnRateCache = 0;
let lastHour = -1;

for (const L of LANDS) for (let y = L.y; y < L.y + L.h; y++) for (let x = L.x; x < L.x + L.w; x++) landGrid[idx(x, y)] = L.id;

function newState() {
  const st = {
    version: 1,
    money: 120000,
    year: 1, month: 4, day: 1, minute: DAY_START, dayCount: 0,
    tiles: new Array(NT).fill(0),
    nature: new Array(NT).fill(0),
    litter: new Array(NT).fill(0),
    buildings: [], nextUid: 1,
    lands: [0],
    staff: [], candidates: [], nextStaffId: 1,
    unlocked: {}, techs: {},
    combos: [],
    missions: [],
    rank: 0, pop: 0, rp: 0,
    ads: [], loan: 0, debtMonths: 0,
    weather: 'sun', feature: null, buffs: [],
    stats: { visitors: 0, roadsBuilt: 0, researched: 0, adsUsed: 0, bestMonthSales: 0, bestDayVisitors: 0, bestMonthSat: 0, bestYearSales: 0, bestNational: 0, totalSales: 0, thievesCaught: 0, complaints: {}, celebs: 0, upgrades: 0 },
    cur: null, today: null, yearSales: 0,
    history: { days: [], months: [], national: [] },
    comments: [],
    seenCust: {}, builtEver: {},
    settings: { bgm: true, se: true, vol: 0.6, grid: false, autoClean: false },
    flags: {},
  };
  // 初期の道
  for (let y = 19; y <= GATE_Y; y++) st.tiles[idx(GATE_X, y)] = 1;
  st.tiles[idx(GATE_X, GATE_Y)] = 9;
  // 自然物
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (Math.abs(x - GATE_X) <= 1 && y >= 17) continue;
    const r = hash2(x, y, 7);
    const land = landGrid[idx(x, y)];
    const p = land === 0 ? 0.05 : 0.11;
    if (r < p) st.nature[idx(x, y)] = hash2(x, y, 3) < 0.7 ? 1 : 2;
    else if (r < p + 0.03) st.nature[idx(x, y)] = 3;
  }
  for (const id in B) if (B[id].rp === 0) st.unlocked[id] = true;
  st.unlocked.road = true;
  st.cur = newMonthRec();
  st.today = { visitors: 0, sales: 0 };
  st.missions = MISSIONS.map(() => false);
  st.candidates = [];
  return st;
}
function newMonthRec() {
  return { sales: 0, byCat: {}, visitors: 0, satSum: 0, satN: 0, fees: 0, build: 0, ads: 0, research: 0, clean: 0, events: 0, other: 0, income: 0 };
}

/* ---------- セーブ / ロード ---------- */
function serialize() {
  const o = Object.assign({}, S);
  o.buildings = S.buildings.map((b) => ({ uid: b.uid, id: b.id, x: b.x, y: b.y, lvl: b.lvl, xp: b.xp, visits: b.visits, sales: b.sales, msales: b.msales, priceMod: b.priceMod }));
  o.staff = S.staff.map((s) => Object.assign({}, s));
  return JSON.stringify(o);
}
function saveGame(silent) {
  try {
    localStorage.setItem(SAVE_KEY, serialize());
    if (!silent) toast('セーブしました', 'good');
    return true;
  } catch (e) {
    if (!silent) toast('セーブに失敗しました（ブラウザの保存領域を確認）', 'bad');
    return false;
  }
}
function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}
function loadFromString(str) {
  const o = JSON.parse(str);
  if (!o || o.version !== 1 || !Array.isArray(o.tiles)) throw new Error('bad');
  const base = newState();
  const st = Object.assign(base, o);
  st.stats = Object.assign(newState().stats, o.stats || {});
  st.settings = Object.assign(newState().settings, o.settings || {});
  st.history = Object.assign({ days: [], months: [], national: [] }, o.history || {});
  if (!Array.isArray(st.missions) || st.missions.length !== MISSIONS.length) {
    const m = MISSIONS.map((_, i) => !!(o.missions && o.missions[i]));
    st.missions = m;
  }
  st.cur = Object.assign(newMonthRec(), o.cur || {});
  st.today = Object.assign({ visitors: 0, sales: 0 }, o.today || {});
  st.buildings = (o.buildings || []).filter((b) => B[b.id]).map((b) => ({
    uid: b.uid, id: b.id, x: b.x, y: b.y, lvl: b.lvl || 1, xp: b.xp || 0, visits: b.visits || 0, sales: b.sales || 0, msales: b.msales || 0, priceMod: b.priceMod || 1,
  }));
  st.staff = (o.staff || []).map((s) => Object.assign({}, s));
  return st;
}
function loadGame() {
  try {
    const str = localStorage.getItem(SAVE_KEY);
    if (!str) return false;
    S = loadFromString(str);
    return true;
  } catch (e) {
    return false;
  }
}
function exportCode() {
  const json = serialize();
  return btoa(unescape(encodeURIComponent(json)));
}
function importCode(code) {
  const json = decodeURIComponent(escape(atob(code.trim())));
  return loadFromString(json);
}

/* ================================================================
   5. マップ
   ================================================================ */
const owned = (x, y) => inMap(x, y) && S.lands.includes(landGrid[idx(x, y)]);
const roadAt = (x, y) => (inMap(x, y) ? S.tiles[idx(x, y)] : 0);
const isRoad = (x, y) => roadAt(x, y) > 0;
const bAt = (x, y) => (inMap(x, y) ? bmap.get(occ[idx(x, y)]) || null : null);
const sizeOf = (b) => B[b.id].size;

function countB(id) { let n = 0; for (const b of S.buildings) if (b.id === id) n++; return n; }
function countCat(cat) { let n = 0; for (const b of S.buildings) if (B[b.id].cat === cat) n++; return n; }
function maxLevel() { let m = 0; for (const b of S.buildings) if (B[b.id].staff || B[b.id].price > 0) m = Math.max(m, b.lvl); return m; }
function shopCount() { let n = 0; for (const b of S.buildings) if (B[b.id].cat !== 'deco') n++; return n; }
const isShop = (d) => d.serves.length > 0;

function rebuildMap() {
  occ.fill(0);
  bmap.clear();
  for (const b of S.buildings) {
    bmap.set(b.uid, b);
    const [w, h] = sizeOf(b);
    for (let y = b.y; y < b.y + h; y++) for (let x = b.x; x < b.x + w; x++) occ[idx(x, y)] = b.uid;
  }
  for (const b of S.buildings) {
    const [w, h] = sizeOf(b);
    const acc = [];
    for (let x = b.x; x < b.x + w; x++) { if (isRoad(x, b.y + h)) acc.push(idx(x, b.y + h)); }
    for (let y = b.y; y < b.y + h; y++) { if (isRoad(b.x - 1, y)) acc.push(idx(b.x - 1, y)); if (isRoad(b.x + w, y)) acc.push(idx(b.x + w, y)); }
    for (let x = b.x; x < b.x + w; x++) { if (isRoad(x, b.y - 1)) acc.push(idx(x, b.y - 1)); }
    b._acc = acc;
    if (b._inside === undefined) b._inside = 0;
  }
  exitsList = [idx(GATE_X, GATE_Y)];
  for (const b of S.buildings) if (b.id === 'busstop' && b._acc.length) exitsList.push(b._acc[0]);
  appealDirty = true; comboDirty = true; staticDirty = true;
}

function canPlace(id, x, y) {
  const d = B[id];
  const [w, h] = d.size;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    if (!inMap(xx, yy)) return { ok: false, why: 'マップの外です' };
    if (!owned(xx, yy)) return { ok: false, why: '購入していない土地です' };
    if (yy === GATE_Y && Math.abs(xx - GATE_X) === 1) return { ok: false, why: '門の柱があります' };
    const i = idx(xx, yy);
    if (S.tiles[i]) return { ok: false, why: '道路の上には建てられません' };
    if (occ[i]) return { ok: false, why: '建物があります' };
    if (S.nature[i]) return { ok: false, why: '木や岩を撤去してください' };
  }
  return { ok: true };
}
function placeBuilding(id, x, y) {
  const d = B[id];
  const chk = canPlace(id, x, y);
  if (!chk.ok) { toast(chk.why, 'bad'); SE('err'); return false; }
  if (S.money < d.cost) { toast('お金が足りません', 'bad'); SE('err'); return false; }
  S.money -= d.cost;
  S.cur.build += d.cost;
  const b = { uid: S.nextUid++, id, x, y, lvl: 1, xp: 0, visits: 0, sales: 0, msales: 0, priceMod: 1 };
  S.buildings.push(b);
  rebuildMap();
  S.builtEver[id] = true;
  addEffect('dust', x + d.size[0] / 2, y + d.size[1] / 2);
  addFloat(x + d.size[0] / 2, y, '-' + yenShort(d.cost), '#ff8a80');
  SE('build');
  if (isShop(d) && d.cat !== 'deco' && !b._acc.length && id !== 'bench') toast('⚠ 道に面していません。お客さんが入れません', 'bad');
  if (id === 'busstop' && !b._acc.length) toast('⚠ バス停は道に面して設置してください', 'bad');
  return true;
}
function removeBuilding(b, refund = true) {
  const d = B[b.id];
  // 中の客を外へ
  for (const c of customers) if (c.target === b.uid) { c.target = 0; if (c.state === 'inside') { c.state = 'idle'; b._inside--; } else c.state = 'idle'; c.path = null; }
  // スタッフの配置解除
  for (const s of S.staff) if (s.bid === b.uid) s.bid = 0;
  S.buildings = S.buildings.filter((o) => o !== b);
  if (refund) {
    const back = Math.round(d.cost * 0.4 * (1 + (b.lvl - 1) * 0.3));
    S.money += back;
    addFloat(b.x + d.size[0] / 2, b.y, '+' + yenShort(back), '#ffe28a');
  }
  addEffect('dust', b.x + d.size[0] / 2, b.y + d.size[1] / 2);
  rebuildMap();
  SE('remove');
  if (UI.selected && UI.selected.uid === b.uid) closeInfo();
}
function placeRoad(x, y, type) {
  if (!inMap(x, y) || !owned(x, y)) return false;
  const i = idx(x, y);
  const code = ROAD_CODE[type];
  if (S.tiles[i] === 9 || S.tiles[i] === code) return false;
  if (occ[i] || S.nature[i]) return false;
  const cost = ROADS[type].cost;
  if (S.money < cost) { toast('お金が足りません', 'bad'); return false; }
  S.money -= cost;
  S.cur.build += cost;
  if (!S.tiles[i]) S.stats.roadsBuilt++;
  S.tiles[i] = code;
  S.litter[i] = 0;
  rebuildMap();
  SE('road');
  return true;
}
function removeAt(x, y) {
  if (!inMap(x, y)) return false;
  const i = idx(x, y);
  if (S.tiles[i] === 9) { toast('入口の門は撤去できません', 'bad'); return false; }
  if (occ[i]) return 'building';
  if (!owned(x, y)) return false;
  if (S.tiles[i]) {
    S.tiles[i] = 0; S.litter[i] = 0;
    // 道の上の客
    for (const c of customers) if (Math.floor(c.x) === x && Math.floor(c.y) === y && c.state !== 'inside') c.path = null;
    rebuildMap(); SE('remove');
    return true;
  }
  if (S.nature[i]) {
    const cost = S.nature[i] === 2 ? 3000 : 1000;
    if (S.money < cost) { toast('撤去費用 ' + yen(cost) + ' が足りません', 'bad'); return false; }
    S.money -= cost; S.cur.build += cost;
    S.nature[i] = 0;
    addEffect('dust', x + 0.5, y + 0.5);
    addFloat(x + 0.5, y, '-' + yenShort(cost), '#ff8a80');
    staticDirty = true; appealDirty = true; SE('remove');
    return true;
  }
  return false;
}

/* ================================================================
   6. 魅力・コンボ
   ================================================================ */
function rectGap(a, b) {
  const [aw, ah] = sizeOf(a), [bw, bh] = sizeOf(b);
  const gx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + aw, b.x + bw));
  const gy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + ah, b.y + bh));
  return Math.max(gx, gy);
}
function seasonEventToday() {
  const ev = SEASON_EVENTS[S.month];
  if (!ev || !ev.days.includes(S.day)) return null;
  return ev;
}
function isNight() { const h = S.minute / 60; return h >= 18.5 || h < 6; }
function decoMult(d) {
  let m = S.techs.greenery ? 1.3 : 1;
  const ev = seasonEventToday();
  if (d.id === 'sakura' && S.month >= 3 && S.month <= 4) m *= 3;
  else if (d.id === 'xmas' && S.month === 12) m *= 3;
  else if (ev && ev.deco && ev.deco[d.id]) m *= ev.deco[d.id];
  if (d.id === 'lamp' && isNight()) m *= 3;
  return m;
}
function recomputeAppeal() {
  appealDirty = false;
  const decos = S.buildings.filter((b) => B[b.id].cat === 'deco');
  for (const b of S.buildings) {
    const d = B[b.id];
    if (d.cat === 'deco') { b._appeal = d.appeal; continue; }
    let a = d.appeal * (1 + (b.lvl - 1) * 0.15);
    for (const o of decos) {
      const od = B[o.id];
      if (rectGap(b, o) < od.radius) a += od.appeal * decoMult(od);
    }
    // 自然の木
    const [w, h] = d.size;
    let nat = 0, lit = 0, road = 0;
    for (let y = b.y - 2; y < b.y + h + 2; y++) for (let x = b.x - 2; x < b.x + w + 2; x++) {
      if (!inMap(x, y)) continue;
      const i = idx(x, y);
      if (S.nature[i] === 1 || S.nature[i] === 3) nat++;
      lit += S.litter[i];
    }
    for (const ai of b._acc || []) road += ROADS[ROAD_KEYS[S.tiles[ai]] || 'road'] ? ROADS[ROAD_KEYS[S.tiles[ai]] || 'road'].appeal : 0;
    a += Math.min(4, nat * 0.5) + road - lit * 1.5;
    if (b._combo) a *= 1.25;
    b._appeal = Math.max(1, Math.round(a));
  }
}
function recomputeCombos() {
  comboDirty = false;
  for (const b of S.buildings) b._combo = null;
  const byId = {};
  for (const b of S.buildings) (byId[b.id] = byId[b.id] || []).push(b);
  const found = [];
  for (const cb of COMBOS) {
    const first = byId[cb.ids[0]];
    if (!first) continue;
    let hit = null;
    for (const a of first) {
      const used = [a];
      let ok = true;
      for (let k = 1; k < cb.ids.length; k++) {
        const list = byId[cb.ids[k]] || [];
        const m = list.find((o) => !used.includes(o) && rectGap(a, o) <= 1);
        if (!m) { ok = false; break; }
        used.push(m);
      }
      if (ok) { hit = used; break; }
    }
    if (hit) {
      for (const b of hit) b._combo = b._combo || cb.name;
      if (!S.combos.includes(cb.id)) found.push({ cb, hit });
    }
  }
  appealDirty = true;
  for (const f of found) {
    S.combos.push(f.cb.id);
    S.rp += 25;
    const cx = f.hit[0].x + sizeOf(f.hit[0])[0] / 2, cy = f.hit[0].y;
    addEffect('sparkle', cx, cy);
    addFloat(cx, cy - 0.5, 'コンボ！', '#ffd23f', 1.6);
    SE('combo');
    toast('★ コンボ発見「' + f.cb.name + '」！ 研究ポイント+25', 'big', 3.6);
    news('コンボ「' + f.cb.name + '」が誕生！ 周辺のお店の魅力がアップ');
  }
}

/* ================================================================
   7. 経路探索 (BFS)
   ================================================================ */
const bfsDist = new Int32Array(NT), bfsPrev = new Int32Array(NT), bfsQ = new Int32Array(NT);
function bfs(start) {
  bfsDist.fill(-1);
  let h = 0, t = 0;
  bfsDist[start] = 0; bfsPrev[start] = -1; bfsQ[t++] = start;
  while (h < t) {
    const cur = bfsQ[h++];
    const cx = cur % MAP_W, cy = (cur / MAP_W) | 0;
    const nd = bfsDist[cur] + 1;
    if (cx > 0) { const n = cur - 1; if (bfsDist[n] < 0 && S.tiles[n]) { bfsDist[n] = nd; bfsPrev[n] = cur; bfsQ[t++] = n; } }
    if (cx < MAP_W - 1) { const n = cur + 1; if (bfsDist[n] < 0 && S.tiles[n]) { bfsDist[n] = nd; bfsPrev[n] = cur; bfsQ[t++] = n; } }
    if (cy > 0) { const n = cur - MAP_W; if (bfsDist[n] < 0 && S.tiles[n]) { bfsDist[n] = nd; bfsPrev[n] = cur; bfsQ[t++] = n; } }
    if (cy < MAP_H - 1) { const n = cur + MAP_W; if (bfsDist[n] < 0 && S.tiles[n]) { bfsDist[n] = nd; bfsPrev[n] = cur; bfsQ[t++] = n; } }
  }
}
function pathTo(target) {
  if (bfsDist[target] < 0) return null;
  const p = [];
  let c = target;
  let guard = 0;
  while (c !== -1 && guard++ < NT) { p.push(c); c = bfsPrev[c]; }
  p.reverse();
  p.shift(); // 現在地を除く
  return p;
}
function nearestAcc(b) {
  let best = -1, bd = 1e9;
  for (const a of b._acc || []) { const d = bfsDist[a]; if (d >= 0 && d < bd) { bd = d; best = a; } }
  return best < 0 ? null : { tile: best, dist: bd };
}

/* ================================================================
   8. 客AI
   ================================================================ */
function hourNow() { return Math.floor(S.minute / 60); }
function isOpen(d, h) {
  const [o, c] = d.hours;
  let close = c;
  if (S.techs.nightopen && c < 24 && c > 12) close = Math.min(24, c + 1);
  return h >= o && h < close;
}
function staffOf(b) { return S.staff.filter((s) => s.bid === b.uid); }
function staffSlots(b) { return B[b.id].staff ? 1 + Math.floor(b.lvl / 2) : 0; }
function staffEffect(b) {
  let sales = 0, sat = 0, spd = 0;
  for (const s of staffOf(b)) {
    const m = s.morale >= 40 ? 1 : 0.6;
    sales += s.skill * m; sat += s.service * m; spd += s.stamina * m;
  }
  return { sales: 1 + sales / 250, sat: Math.min(22, sat / 10), time: 1 - Math.min(0.35, spd / 400) };
}
function priceOf(b) {
  const d = B[b.id];
  if (!d.price) return 0;
  let p = d.price * (1 + (b.lvl - 1) * 0.15) * b.priceMod;
  if (S.techs.brand) p *= 1.08;
  return Math.round(p);
}
function capOf(b) { const d = B[b.id]; return d.cap + Math.floor((b.lvl - 1) * Math.max(1, d.cap / 4)); }

function makeCustomer(type, spawnTile) {
  const T = CUST[type];
  const sx = spawnTile % MAP_W, sy = (spawnTile / MAP_W) | 0;
  const needs = {};
  for (const n of NEEDS) needs[n] = rand(5, 55) * (T.needMul[n] || 1);
  const c = {
    id: custSeq++, type, x: sx + 0.5, y: sy + 0.5, dir: 0, frame: 0, anim: 0,
    state: 'idle', path: null, target: 0, needs,
    money: type === 'thief' ? 0 : randi(T.budget[0], T.budget[1]),
    happy: 60, visits: 0, maxVisits: randi(2, 5) + (S.techs.pointcard ? 1 : 0),
    age: 0, wait: 0, wander: 0, spent: 0, insideT: 0, think: 0,
    thought: null, look: makeLook(type), alpha: 1, atm: false, visited: [], ox: randi(-3, 3), oy: randi(-3, 2),
  };
  if (type === 'celeb') c.maxVisits = 4;
  if (type === 'couple') c.maxVisits += 1;
  S.seenCust[type] = true;
  return c;
}
function makeLook(type) {
  const skins = ['#f5c9a0', '#eab48a', '#d99b6c', '#f7d7b5'];
  const hairs = ['#1a1c2c', '#3a2a22', '#733e39', '#5a3a1a', '#262b44', '#b86f50', '#feae34'];
  const shirts = ['#e43b44', '#0099db', '#63c74d', '#feae34', '#b55088', '#f4f4f4', '#124e89', '#f77622', '#68386c', '#2ce8f5', '#ff97c1'];
  const pants = ['#262b44', '#3a4466', '#5a6988', '#733e39', '#124e89'];
  const L = { type, skin: pick(skins), hair: pick(hairs), shirt: pick(shirts), pants: pick(pants), girl: chance(0.5) };
  if (type === 'elder') L.hair = pick(['#c0cbdc', '#f4f4f4', '#8b9bb4']);
  if (type === 'salaryman') { L.shirt = pick(['#262b44', '#3a4466', '#5a6988']); L.pants = L.shirt; }
  if (type === 'student') { L.shirt = pick(['#124e89', '#262b44', '#f4f4f4']); L.pants = '#262b44'; }
  if (type === 'rich') { L.shirt = pick(['#feae34', '#68386c', '#a22633']); L.pants = '#1a1c2c'; }
  if (type === 'celeb') { L.shirt = '#fee761'; L.hair = '#feae34'; L.pants = '#1a1c2c'; }
  if (type === 'thief') { L.shirt = '#1a1c2c'; L.pants = '#1a1c2c'; L.hair = '#1a1c2c'; }
  if (type === 'kid' && S && S.month === 10 && seasonEventToday()) L.costume = pick(['pumpkin', 'ghost', 'witch']);
  L.key = [type, L.skin, L.hair, L.shirt, L.pants, L.girl ? 1 : 0, L.costume || ''].join('|');
  return L;
}

function custAllowed(type) { return CUST[type].rank <= S.rank; }
function nightHour(h) { return h >= 20; }
function spawnTypeWeights() {
  const h = hourNow();
  const ev = seasonEventToday();
  const list = [];
  for (const t of CUST_ORDER) {
    const T = CUST[t];
    if (!T.weight || !custAllowed(t)) continue;
    let w = T.weight;
    if (t === 'salaryman') w *= (h >= 17 && h <= 21) ? 2.2 : (h === 12 ? 1.8 : (S.day >= 6 ? 0.6 : 0.8));
    if (t === 'student') w *= (h >= 15 && h <= 20) ? 1.9 : (S.day >= 6 ? 1.5 : 0.5);
    if (t === 'kid') w *= (h >= 9 && h <= 17) ? (S.day >= 6 ? 1.8 : 1.1) : 0.15;
    if (t === 'elder') w *= h < 12 ? 1.8 : h > 17 ? 0.3 : 1;
    if (t === 'housewife') w *= (h >= 9 && h <= 17) ? 1.5 : 0.4;
    if (t === 'couple') w *= (h >= 17 || S.day >= 6) ? 1.8 : 0.7;
    if (t === 'tourist' || t === 'foreigner') w *= S.techs.guide ? 2 : 1;
    if (t === 'student' && S.techs.sns) w *= 1.3;
    if (nightHour(h) && (t === 'kid' || t === 'elder' || t === 'housewife')) w *= 0.1;
    const parks = countB('parking');
    if (parks && (t === 'housewife' || t === 'kid')) w *= 1 + Math.min(0.6, parks * 0.2);
    for (const a of S.ads) { const ad = ADS.find((x) => x.id === a.id); if (ad && ad.favor[t]) w *= ad.favor[t]; }
    if (ev && ev.custBoost && ev.custBoost[t]) w *= ev.custBoost[t] * (S.techs.festival ? 1.3 : 1);
    if (S.month === 12 && t === 'couple' && countB('xmas')) w *= 1.5;
    list.push({ t, w });
  }
  return list;
}
const TIME_CURVE = [0, 0, 0, 0, 0, 0, 0.15, 0.35, 0.55, 0.7, 0.85, 1.1, 1.3, 1.1, 0.95, 1.0, 1.1, 1.25, 1.3, 1.1, 0.8, 0.5, 0.2, 0.05];
function computeSpawnRate() {
  const h = hourNow();
  let curve = TIME_CURVE[h] || 0;
  if (S.techs.nightopen && h >= 20) curve = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.95, 0.7, 0.4, 0.15][h];
  let attract = 0;
  for (const b of S.buildings) { const d = B[b.id]; if (isShop(d) && d.cat !== 'deco' && b._acc && b._acc.length) attract += Math.min(90, b._appeal || d.appeal); }
  let rate = 1.6 + S.pop * 0.012 + attract * 0.015 + S.rank * 0.5;
  rate *= curve;
  rate *= WEATHER[S.weather].spawn;
  if (S.weather === 'rain' && countB('cinema') + countB('aquarium') > 0) rate *= 1.15;
  let ad = 0; for (const a of S.ads) { const d = ADS.find((x) => x.id === a.id); if (d) ad = Math.max(ad, d.boost) + 0.1 * (S.ads.length - 1); }
  rate *= 1 + ad;
  const ev = seasonEventToday();
  if (ev) rate *= 1 + (ev.spawn - 1) * (S.techs.festival ? 1.5 : 1);
  if (S.day >= 6) rate *= 1.3;
  rate *= 1 + Math.min(0.5, countB('parking') * 0.12);
  rate *= 1 + Math.min(0.6, countB('busstop') * 0.2);
  for (const bf of S.buffs) if (bf.type === 'spawn') rate *= bf.mult;
  if (S.buffs.some((b) => b.type === 'typhoon')) rate *= 0.1;
  return rate; // 1時間あたり
}
function maxCustomers() { return Math.min(170, 45 + S.rank * 17); }
function spawnPoint() {
  if (exitsList.length > 1 && chance(0.45)) return pick(exitsList.slice(1));
  return exitsList[0];
}
function spawnCustomer(forceType) {
  let type = forceType;
  if (!type) {
    const w = weightedPick(spawnTypeWeights(), (o) => o.w);
    if (!w) return null;
    type = w.t;
  }
  const c = makeCustomer(type, spawnPoint());
  customers.push(c);
  return c;
}

function setThought(c, icon, t = 90) { c.thought = { icon, t }; }
function addComment(text) {
  S.comments.unshift({ t: text, d: dateLabel(true) });
  if (S.comments.length > 40) S.comments.length = 40;
}
function complain(c, need) {
  S.stats.complaints[need] = (S.stats.complaints[need] || 0) + 1;
  if (chance(0.12)) {
    const lines = {
      hunger: ['おなかすいた…食べる所ないの？', 'ご飯屋さんが欲しいな'], thirst: ['のど渇いた…', '飲み物売ってないの？'],
      shop: ['買い物できるお店が少ないなぁ'], fun: ['なにか遊べる場所ないかな'], fatigue: ['歩き疲れた…座る所ない？', '休める場所が欲しい'],
      toilet: ['トイレどこ！？', 'トイレがないなんて…'], money: ['お金なくなっちゃった…ATMないの？'],
    };
    const l = lines[need]; if (l) { addComment(CUST[c.type].name + '「' + pick(l) + '」'); }
  }
}

function custDecide(c) {
  c.think = 0;
  const h = hourNow();
  const T = CUST[c.type];
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  if (!inMap(cx, cy)) { c.state = 'gone'; return; }
  const start = idx(cx, cy);
  // 泥棒
  if (c.type === 'thief') {
    bfs(start);
    const targets = S.buildings.filter((b) => priceOf(b) > 0 && nearestAcc(b));
    if (!targets.length || c.visits > 0) return custLeave(c, true);
    const b = pick(targets); const a = nearestAcc(b);
    c.target = b.uid; c.path = pathTo(a.tile); c.goal = a.tile; c.state = 'walk';
    return;
  }
  const late = h >= (S.techs.nightopen ? 23 : 22);
  if (c.visits >= c.maxVisits || c.money < 120 || c.age > 600 || late || c.happy < 12 || c.wander > 3) {
    if (!(c.money < 120 && !c.atm && countB('atm') > 0 && !late)) return custLeave(c);
  }
  bfs(start);
  // お金がない→ATM
  if (c.money < 1500 && !c.atm && c.type !== 'kid') {
    const atms = S.buildings.filter((b) => b.id === 'atm');
    let best = null;
    for (const b of atms) { const a = nearestAcc(b); if (a && (!best || a.dist < best.a.dist)) best = { b, a }; }
    if (best) { c.target = best.b.uid; c.path = pathTo(best.a.tile); c.goal = best.a.tile; c.state = 'walk'; c.purpose = 'money'; return; }
    if (c.money < 400) { complain(c, 'money'); setThought(c, 'yenb'); return custLeave(c); }
  }
  const ranked = NEEDS.map((n) => ({ n, v: c.needs[n] })).sort((a, b) => b.v - a.v);
  const ev = seasonEventToday();
  for (const { n, v } of ranked) {
    if (v < 32) break;
    const cands = [];
    let existAny = false;
    for (const b of S.buildings) {
      const d = B[b.id];
      if (!d.serves.includes(n)) continue;
      existAny = true;
      if (!isOpen(d, h)) continue;
      if (d.adult && (c.type === 'kid' || c.type === 'student')) continue;
      if (c.visited.includes(b.uid) && d.id !== 'toilet' && d.id !== 'bench' && d.id !== 'vending') continue;
      const price = priceOf(b);
      if (price > c.money) continue;
      const a = nearestAcc(b);
      if (!a) continue;
      let pref = T.prefs[d.id] || 1;
      if (c.type === 'celeb') pref = 1 + (b._appeal || 0) / 20;
      if (ev && ev.pref && ev.pref[d.id]) pref *= ev.pref[d.id];
      if (S.weather === 'rain' || S.weather === 'snow') { if (d.id === 'bench' || d.id === 'ferris') pref *= 0.4; if (d.id === 'cinema' || d.id === 'cafe' || d.id === 'aquarium') pref *= 1.5; }
      if (S.feature && S.feature.uid === b.uid) pref *= 2;
      const priceW = b.priceMod > 1.25 ? 0.55 : b.priceMod > 1.05 ? 0.8 : b.priceMod < 0.95 ? 1.35 : 1;
      const afford = price > c.money * 0.6 ? 0.5 : 1;
      const w = pref * (1 + (b._appeal || 0) / 35) * priceW * afford / (1 + a.dist / 7);
      cands.push({ b, a, w });
    }
    if (!cands.length) {
      if (v >= 65) {
        c.needs[n] *= 0.55;
        c.happy -= existAny ? 4 : 9;
        setThought(c, NEED_ICON[n]);
        complain(c, n);
        continue;
      }
      continue;
    }
    cands.sort((a, b) => b.w - a.w);
    const top = cands.slice(0, 4);
    const ch = weightedPick(top, (o) => o.w);
    c.target = ch.b.uid; c.path = pathTo(ch.a.tile); c.goal = ch.a.tile; c.state = 'walk'; c.purpose = n;
    return;
  }
  // ぶらぶら歩き
  c.wander++;
  const opts = [];
  for (let i = 0; i < NT; i++) if (bfsDist[i] > 2 && bfsDist[i] < 10) opts.push(i);
  if (!opts.length) { if (c.wander > 1) return custLeave(c); c.think = -40; return; }
  const g = pick(opts);
  c.target = 0; c.path = pathTo(g); c.goal = g; c.state = 'walk'; c.purpose = 'wander';
}
function custLeave(c, fast) {
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  if (!inMap(cx, cy)) { c.state = 'gone'; return; }
  bfs(idx(cx, cy));
  let best = -1, bd = 1e9;
  for (const e of exitsList) { const d = bfsDist[e]; if (d >= 0 && d < bd) { bd = d; best = e; } }
  c.target = 0; c.purpose = 'leave';
  if (best < 0) { c.state = 'fade'; return; }
  c.path = pathTo(best); c.goal = best; c.state = 'leave';
  if (fast) c.speedMul = 1.4;
}
function custArrive(c) {
  const b = bmap.get(c.target);
  if (!b) { c.state = 'idle'; c.target = 0; return; }
  const d = B[b.id];
  if (c.type === 'thief') return thiefAct(c, b);
  if (!isOpen(d, hourNow())) { c.state = 'idle'; c.target = 0; c.happy -= 3; return; }
  if (b._inside >= capOf(b)) {
    c.state = 'wait';
    return;
  }
  c.state = 'inside';
  b._inside++;
  const eff = staffEffect(b);
  let t = d.time * eff.time * (S.techs.register ? 0.85 : 1);
  if (d.id === 'hotel' && hourNow() >= 19) t = 9999; // 泊まり
  c.insideT = t;
  c.enterWait = c.wait;
  c.wait = 0;
}
function custExit(c, b, silent) {
  const d = B[b.id];
  b._inside = Math.max(0, b._inside - 1);
  c.state = 'idle';
  c.target = 0;
  c.visits++;
  c.visited.push(b.uid);
  const T = CUST[c.type];
  if (d.id === 'atm') {
    const add = Math.round(randi(T.budget[0], T.budget[1]) * 0.6);
    c.money += add; c.atm = true;
    earn(b, d.price, 'fac');
    setThought(c, 'yenb', 60);
    return;
  }
  const eff = staffEffect(b);
  let sat = d.sat + (b.lvl - 1) * 4 + eff.sat + Math.min(14, (b._appeal || 0) / 4);
  sat -= (b.priceMod - 1) * 45;
  sat += ((T.prefs[d.id] || 1) - 1) * 6;
  sat -= (c.enterWait || 0) / 3;
  if (b._combo) sat += 5;
  if (c.type === 'rich' && priceOf(b) < 1000 && d.price > 0) sat -= 10;
  if (S.weather === 'rain' && (d.id === 'bench')) sat -= 12;
  sat = clamp(sat + rand(-6, 6), 0, 100);
  // 支払い
  let pay = priceOf(b);
  if (pay > 0) {
    pay *= eff.sales;
    if (b._combo) pay *= 1.1;
    if (S.techs.cashless) pay *= 1.06;
    const ev = seasonEventToday();
    if (ev && ev.sales) pay *= (ev.sales[d.cat] || ev.sales.all || 1);
    if (S.feature && S.feature.uid === b.uid) pay *= 1.3;
    if (c.type === 'celeb') pay *= 3;
    if (sat >= 88) pay *= 1.1;
    pay = Math.min(Math.round(pay), c.money);
    c.money -= pay; c.spent += pay;
    earn(b, pay, d.cat);
    if (!silent && pay > 0) addFloat(b.x + d.size[0] / 2, b.y + 0.2, '+' + yenShort(pay), '#ffe28a');
    if (!silent) SE('coin');
  }
  // 欲求
  for (const n of d.serves) c.needs[n] = Math.max(0, c.needs[n] - rand(55, 90));
  if (d.serves.includes('hunger') || d.serves.includes('thirst')) c.needs.toilet += rand(8, 18);
  c.happy = clamp(c.happy + (sat - 58) / 2.2, 0, 100);
  b.xp += 1 + (T.prefs[d.id] > 2 ? 1 : 0);
  b.visits++;
  S.cur.satSum += sat; S.cur.satN++;
  // スタッフ経験値
  for (const s of staffOf(b)) {
    s.exp += S.techs.training ? 1.5 : 1;
    if (s.exp >= s.lvl * 25) staffLevelUp(s);
  }
  // 研究ポイント
  if (sat >= 85 ? chance(0.1) : sat >= 70 ? chance(0.05) : false) S.rp += 1;
  if (c.type === 'celeb') { S.pop += 12; addFloat(b.x + d.size[0] / 2, b.y - 0.4, '人気UP!', '#ff97c1'); }
  if (!silent) {
    if (sat >= 80) setThought(c, 'heart', 70);
    else if (sat < 35) setThought(c, 'angry', 70);
  }
  // 口コミ
  if (sat >= 90 && chance(0.06)) addComment(T.name + '「' + pick([d.name + '最高！また来たい！', d.name + 'の接客が良かった〜', 'この街の' + d.name + 'はおすすめ！', d.name + '、SNSに載せよう']) + '」');
  else if (sat < 30 && chance(0.25)) addComment(T.name + '「' + pick([d.name + '…ちょっと高すぎ', d.name + 'で待たされた…', d.name + 'はイマイチだったな']) + '」');
}
function earn(b, amount, cat) {
  if (!amount) return;
  S.money += amount;
  b.sales += amount; b.msales += amount;
  S.cur.sales += amount;
  S.cur.byCat[cat] = (S.cur.byCat[cat] || 0) + amount;
  S.today.sales += amount;
  S.stats.totalSales += amount;
  S.yearSales += amount;
}
function thiefAct(c, b) {
  const d = B[b.id];
  const protectedBy = S.techs.camera || S.buildings.some((o) => o.id === 'koban' && rectGap(o, b) <= B.koban.radius);
  if (protectedBy) {
    const reward = 20000 + S.rank * 15000;
    S.money += reward; S.pop += 5; S.stats.thievesCaught++;
    addFloat(b.x + d.size[0] / 2, b.y, '逮捕!', '#63c74d', 1.6);
    toast('🚨 ' + d.name + 'で泥棒を逮捕！ 感謝状と報奨金 ' + yen(reward), 'good', 3.2);
    news('お手柄！交番のおかげで泥棒逮捕。街の安心度アップ');
    c.state = 'gone';
    SE('fanfare');
    return;
  }
  const loss = Math.min(Math.round(S.money * 0.04), 30000 + S.rank * 40000);
  S.money -= Math.max(0, loss);
  S.cur.other += Math.max(0, loss);
  addFloat(b.x + d.size[0] / 2, b.y, '-' + yenShort(loss), '#ff6b5e', 1.6);
  toast('💸 ' + d.name + 'に泥棒！ ' + yen(loss) + ' 盗まれた…（交番を建てよう）', 'bad', 3.6);
  S.pop = Math.max(0, S.pop - 3);
  SE('err');
  c.visits = 1;
  custLeave(c, true);
}

function custStep(c) {
  c.age += MIN_PER_STEP;
  if (c.thought) { c.thought.t -= 1; if (c.thought.t <= 0) c.thought = null; }
  const T = CUST[c.type];
  // 欲求の増加
  if (c.state !== 'inside' && c.type !== 'thief') {
    const season = SEASON_OF(S.month);
    for (const n of NEEDS) {
      let r = 0.07 * (T.needMul[n] || 1);
      if (n === 'thirst' && season === 1) r *= 1.5;
      if (n === 'fatigue' && season === 3) r *= 1.2;
      c.needs[n] = Math.min(100, c.needs[n] + r * MIN_PER_STEP);
    }
    if (c.needs.toilet >= 95) { c.happy -= 0.05; }
  }
  switch (c.state) {
    case 'idle':
      c.think += 1;
      if (c.think > 6) custDecide(c);
      break;
    case 'walk': case 'leave':
      custMove(c);
      break;
    case 'wait': {
      const b = bmap.get(c.target);
      if (!b) { c.state = 'idle'; break; }
      c.wait += MIN_PER_STEP;
      if (b._inside < capOf(b)) custArrive(c);
      else if (c.wait > 35) {
        c.happy -= 10; setThought(c, 'angry');
        c.visited.push(b.uid);
        if (chance(0.3)) addComment(T.name + '「' + B[b.id].name + '、混みすぎ！」');
        c.state = 'idle'; c.target = 0; c.wait = 0;
      }
      break;
    }
    case 'inside': {
      c.insideT -= MIN_PER_STEP;
      if (c.insideT <= 0) {
        const b = bmap.get(c.target);
        if (b) custExit(c, b);
        else c.state = 'idle';
      }
      break;
    }
    case 'fade':
      c.alpha -= 0.04;
      if (c.alpha <= 0) c.state = 'gone';
      break;
  }
  c.anim += 1;
}
function custMove(c) {
  if (!c.path) { c.state = c.state === 'leave' ? 'fade' : 'idle'; return; }
  if (!c.path.length) {
    if (c.state === 'leave') { c.state = 'exit'; return; }
    if (c.target) custArrive(c); else { c.state = 'idle'; c.think = 0; }
    return;
  }
  const next = c.path[0];
  if (!S.tiles[next]) { c.path = null; c.state = c.state === 'leave' ? 'idle' : 'idle'; if (c.purpose === 'leave') custLeave(c); return; }
  const tx = (next % MAP_W) + 0.5, ty = ((next / MAP_W) | 0) + 0.5;
  const sp = 0.068 * CUST[c.type].speed * (c.speedMul || 1);
  const dx = tx - c.x, dy = ty - c.y;
  const dist = Math.hypot(dx, dy);
  if (Math.abs(dx) > Math.abs(dy)) c.dir = dx > 0 ? 3 : 2; else c.dir = dy > 0 ? 0 : 1;
  if (dist <= sp) {
    c.x = tx; c.y = ty; c.path.shift();
    // ポイ捨て
    if (c.type !== 'thief' && chance(0.012 * (c.happy < 40 ? 1.8 : 1))) dropLitter(next);
    if (S.litter[next] >= 2) c.happy -= 0.3;
  } else { c.x += (dx / dist) * sp; c.y += (dy / dist) * sp; }
}
function dropLitter(i) {
  const x = i % MAP_W, y = (i / MAP_W) | 0;
  if (S.tiles[i] === 9) return;
  let protectedByTrash = false;
  for (const b of S.buildings) if (b.id === 'trash' && Math.abs(b.x - x) <= 3 && Math.abs(b.y - y) <= 3) { protectedByTrash = true; break; }
  if (protectedByTrash && !chance(0.12)) return;
  if (!chance(0.35)) return;
  if (S.litter[i] < 3) { S.litter[i]++; appealDirty = true; }
}
function custFinish(c) {
  // 退場時の評価
  if (c.type === 'thief') return;
  S.stats.visitors++;
  S.today.visitors++;
  S.cur.visitors++;
  const delta = (c.happy - 55) / 300 + (c.spent > 0 ? 0.02 : -0.05);
  S.pop = Math.max(0, S.pop + delta);
}

/* ================================================================
   9. 時間・日・月の処理
   ================================================================ */
function dateLabel(short) {
  const w = WEEK[(S.day - 1) % 7];
  return short ? `${S.year}年目${S.month}月${S.day}日` : `${S.year}年目 ${S.month}月${S.day}日(${w})`;
}
function timeLabel() {
  const m = Math.floor(S.minute);
  return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
}

function simStep() {
  const prevHour = hourNow();
  S.minute += MIN_PER_STEP;
  if (appealDirty) recomputeAppeal();
  if (comboDirty) recomputeCombos();
  // スポーン
  if (S.minute < DAY_END - 30) {
    spawnAcc += (spawnRateCache / 60) * MIN_PER_STEP;
    while (spawnAcc >= 1) {
      spawnAcc -= 1;
      if (customers.length < maxCustomers()) spawnCustomer();
    }
  }
  for (const c of customers) custStep(c);
  let removed = false;
  for (let i = customers.length - 1; i >= 0; i--) {
    const c = customers[i];
    if (c.state === 'exit' || c.state === 'gone' || (c.state === 'fade' && c.alpha <= 0)) {
      if (c.state === 'exit' || c.state === 'fade' || c.state === 'gone') custFinish(c);
      customers.splice(i, 1); removed = true;
    }
  }
  if (removed && UI.selectedCust && !customers.includes(UI.selectedCust)) closeInfo();
  const h = hourNow();
  if (h !== prevHour) onHour(h);
  if (S.minute >= DAY_END) endDay();
}
function onHour(h) {
  spawnRateCache = computeSpawnRate();
  appealDirty = true;
  checkMissions();
  if (h === 19 || h === 6) staticDirty = true;
  if (h >= 22) for (const c of customers) if (c.state === 'idle' || (c.state === 'walk' && c.purpose === 'wander')) custLeave(c);
}

function endDay() {
  // 店内の客は会計を済ませて帰る
  for (const c of customers) {
    if (c.state === 'inside') { const b = bmap.get(c.target); if (b) custExit(c, b, true); }
    if (c.type !== 'thief') custFinish(c);
  }
  customers = [];
  for (const b of S.buildings) b._inside = 0;
  floats = [];
  // 記録
  S.stats.bestDayVisitors = Math.max(S.stats.bestDayVisitors, S.today.visitors);
  S.history.days.push({ l: `${S.month}/${S.day}`, money: Math.round(S.money), v: S.today.visitors, s: Math.round(S.today.sales) });
  if (S.history.days.length > 56) S.history.days.shift();
  const todayV = S.today.visitors, todayS = S.today.sales;
  S.today = { visitors: 0, sales: 0 };
  // 人気の自然減少
  S.pop *= S.techs.sns ? 0.97 : 0.95;
  // 清掃
  let litterCount = 0;
  for (let i = 0; i < NT; i++) litterCount += S.litter[i];
  if (S.settings.autoClean && litterCount > 0) {
    const cost = 2000 + S.rank * 1000;
    S.money -= cost; S.cur.clean += cost;
    S.litter.fill(0);
  } else if (S.techs.cleanvol) {
    for (let i = 0; i < NT; i++) if (S.litter[i] && chance(0.5)) S.litter[i]--;
  }
  appealDirty = true;
  // スタッフのやる気
  for (const s of S.staff.slice()) {
    if (s.bid) s.morale = Math.max(0, s.morale - (s.morale > 60 ? 1.5 : 1));
    else s.morale = Math.min(100, s.morale + 2);
    if (s.morale <= 0 && chance(0.5)) {
      S.staff = S.staff.filter((o) => o !== s);
      toast(s.name + ' さんがやる気をなくして辞めてしまいました…', 'bad', 3.6);
      news(s.name + 'さんが退職。スタッフのやる気に気を配ろう');
    }
  }
  // 宣伝・バフ
  S.ads.forEach((a) => a.days--); S.ads = S.ads.filter((a) => a.days > 0);
  S.buffs.forEach((b) => b.days--); S.buffs = S.buffs.filter((b) => b.days > 0);
  if (S.feature) { S.feature.days--; if (S.feature.days <= 0) S.feature = null; }
  // 日付
  S.minute = DAY_START;
  S.dayCount++;
  S.day++;
  let monthEnded = false;
  if (S.day > DAYS_PER_MONTH) { S.day = 1; monthEnded = true; }
  if (!monthEnded) toast(`本日の来客 ${todayV}人 ／ 売上 ${yen(todayS)}`, '', 2.4);
  if (monthEnded) endMonth();
  checkRankUp();
  checkMissions();
  startDay();
  saveGame(true);
  fadeFx();
}
function startDay() {
  // 天気
  const season = SEASON_OF(S.month);
  const r = Math.random();
  if (S.month === 6) S.weather = r < 0.5 ? 'rain' : r < 0.8 ? 'cloud' : 'sun';
  else if (season === 3) S.weather = r < 0.18 ? 'snow' : r < 0.45 ? 'cloud' : 'sun';
  else S.weather = r < 0.16 ? 'rain' : r < 0.4 ? 'cloud' : 'sun';
  // 季節イベント
  const ev = seasonEventToday();
  if (ev && ev.days[0] === S.day) {
    showEventBanner();
    toast('🎉 ' + ev.name + '開催！ ' + ev.desc, 'big', 4);
    news(ev.name + '開催中！ ' + ev.desc);
  }
  if (S.month === 12 && S.day === 7) news('大晦日。今年もお疲れさまでした！');
  showEventBanner();
  randomEvent();
  staticDirty = true;
  appealDirty = true;
  spawnRateCache = computeSpawnRate();
  lastHour = hourNow();
}
function endMonth() {
  const cur = S.cur;
  // 支出
  let salary = 0; for (const s of S.staff) salary += s.salary;
  let maint = 0; for (const b of S.buildings) maint += Math.round(B[b.id].maint * (1 + (b.lvl - 1) * 0.25));
  const interest = Math.round(S.loan * 0.015);
  S.money -= salary + maint + interest;
  const expenses = { salary, maint, interest, build: cur.build, ads: cur.ads, research: cur.research, clean: cur.clean, other: cur.other + cur.events };
  const totalExp = salary + maint + interest + cur.build + cur.ads + cur.research + cur.clean + cur.other + cur.events;
  const profit = cur.sales + cur.income - totalExp;
  const avgSat = cur.satN ? Math.round(cur.satSum / cur.satN) : 0;
  S.stats.bestMonthSales = Math.max(S.stats.bestMonthSales, cur.sales);
  if (cur.satN >= 40) S.stats.bestMonthSat = Math.max(S.stats.bestMonthSat, avgSat);
  const label = `${S.year}年${S.month}月`;
  S.history.months.push({ l: `${S.month}月`, sales: Math.round(cur.sales), profit: Math.round(profit), v: cur.visitors, sat: avgSat, money: Math.round(S.money) });
  if (S.history.months.length > 24) S.history.months.shift();
  // 店の月売上リセット
  const topShops = S.buildings.filter((b) => b.msales > 0).sort((a, b) => b.msales - a.msales).slice(0, 3).map((b) => ({ n: B[b.id].name, s: b.msales }));
  for (const b of S.buildings) b.msales = 0;
  queueModal(() => monthReport(label, cur, expenses, profit, avgSat, topShops));
  // 破産チェック
  if (S.money < 0) {
    S.debtMonths++;
    if (S.debtMonths >= 3) queueModal(gameOverModal);
    else queueModal(() => debtWarn());
  } else S.debtMonths = 0;
  // 年度末
  const endedMonth = S.month;
  S.cur = newMonthRec();
  S.month++;
  if (S.month > 12) S.month = 1;
  if (endedMonth === 3) { nationalRanking(); S.year++; }
  refreshCandidates();
  staticDirty = true;
}
function nationalRanking() {
  const yr = S.year;
  const player = Math.round(S.yearSales / 10000 + S.pop * 3 + S.combos.length * 30 + S.rank * 200);
  const list = RIVALS.map((r, i) => ({ name: r.name, score: Math.round(r.base * (1 + 0.2 * (yr - 1)) * rand(0.92, 1.08)), me: false }));
  list.push({ name: 'あなたの商店街', score: player, me: true });
  list.sort((a, b) => b.score - a.score);
  const pos = list.findIndex((o) => o.me) + 1;
  S.stats.bestYearSales = Math.max(S.stats.bestYearSales, S.yearSales);
  if (!S.stats.bestNational || pos < S.stats.bestNational) S.stats.bestNational = pos;
  S.history.national.push({ year: yr, pos, score: player });
  const reward = pos === 1 ? 10000000 : pos <= 3 ? 3000000 : pos <= 5 ? 800000 : pos <= 8 ? 200000 : 50000;
  S.money += reward;
  const ys = S.yearSales;
  S.yearSales = 0;
  queueModal(() => nationalModal(yr, list, pos, reward, ys));
}

/* ---------- ランク・目標 ---------- */
function rankReq(r) { return RANKS[r]; }
function rankProgress() {
  const nx = RANKS[S.rank + 1];
  if (!nx) return null;
  return {
    next: nx,
    items: [
      { label: '累計来客', cur: S.stats.visitors, need: nx.visitors },
      { label: '人気', cur: Math.floor(S.pop), need: nx.pop },
      { label: '施設数(装飾以外)', cur: shopCount(), need: nx.buildings },
    ],
  };
}
function checkRankUp() {
  const p = rankProgress();
  if (!p) return;
  if (p.items.every((i) => i.cur >= i.need)) {
    S.rank++;
    S.money += p.next.reward;
    SE('fanfare');
    queueModal(() => rankUpModal(S.rank, p.next.reward));
    news('祝！ランクアップ「' + RANKS[S.rank].name + '」');
    spawnRateCache = computeSpawnRate();
    refreshCandidates();
  }
}
function checkMissions() {
  let n = 0;
  MISSIONS.forEach((m, i) => {
    if (S.missions[i]) return;
    let ok = false;
    try { ok = m.c(S); } catch (e) { ok = false; }
    if (ok) {
      S.missions[i] = true;
      if (m.r.money) S.money += m.r.money;
      if (m.r.rp) S.rp += m.r.rp;
      const rw = [m.r.money ? yen(m.r.money) : '', m.r.rp ? 'RP+' + m.r.rp : ''].filter(Boolean).join(' / ');
      toast('🎯 目標達成「' + m.t + '」 報酬 ' + rw, 'good', 3.4);
      SE('clear');
      n++;
    }
  });
  updateGoalBadge();
  return n;
}
function activeMissions() {
  const out = [];
  MISSIONS.forEach((m, i) => { if (!S.missions[i] && out.length < 3) out.push({ m, i }); });
  return out;
}

/* ---------- スタッフ ---------- */
function genStaff() {
  const top = 28 + S.rank * 9;
  const s = {
    id: S.nextStaffId++,
    name: pick(FAMILY) + ' ' + pick(GIVEN),
    service: randi(8, top), skill: randi(8, top), stamina: randi(8, top),
    lvl: 1, exp: 0, morale: randi(70, 95), bid: 0,
    look: { skin: pick(['#f5c9a0', '#eab48a', '#f7d7b5']), hair: pick(['#1a1c2c', '#3a2a22', '#733e39', '#b86f50']), shirt: pick(['#e43b44', '#0099db', '#3e8948', '#feae34', '#b55088']), girl: chance(0.5) },
  };
  s.service = Math.min(99, s.service); s.skill = Math.min(99, s.skill); s.stamina = Math.min(99, s.stamina);
  s.salary = staffSalary(s);
  return s;
}
function staffSalary(s) { return Math.round((6000 + (s.service + s.skill + s.stamina) * 110 + (s.lvl - 1) * 1500) / 100) * 100; }
function maxStaff() { return 3 + S.rank * 3; }
function refreshCandidates() {
  S.candidates = [];
  const n = 3 + Math.min(3, Math.floor(S.rank / 2));
  for (let i = 0; i < n; i++) S.candidates.push(genStaff());
}
function staffLevelUp(s) {
  s.exp = 0;
  s.lvl++;
  s.service = Math.min(99, s.service + randi(1, 4));
  s.skill = Math.min(99, s.skill + randi(1, 4));
  s.stamina = Math.min(99, s.stamina + randi(1, 4));
  s.salary = staffSalary(s);
  s.morale = Math.min(100, s.morale + 10);
  news(s.name + 'さんがLv' + s.lvl + 'にレベルアップ！');
}

/* ---------- 改装 ---------- */
const LV_XP = [0, 25, 80, 200, 450];
const LV_COST = [0, 0.6, 1.2, 2.4, 4.0];
function upgradeInfo(b) {
  const d = B[b.id];
  if (d.cat === 'deco' || b.lvl >= 5 || (!d.price && !d.staff)) return null;
  return { needXp: LV_XP[b.lvl], cost: Math.round(d.cost * LV_COST[b.lvl] / 100) * 100, ready: b.xp >= LV_XP[b.lvl] };
}
function upgradeBuilding(b) {
  const u = upgradeInfo(b);
  if (!u) return;
  if (!u.ready) { toast('経験値が足りません', 'bad'); return; }
  if (S.money < u.cost) { toast('お金が足りません', 'bad'); SE('err'); return; }
  S.money -= u.cost; S.cur.build += u.cost;
  b.lvl++; b.xp = 0;
  S.rp += 5 * b.lvl;
  S.stats.upgrades++;
  const d = B[b.id];
  addEffect('sparkle', b.x + d.size[0] / 2, b.y + d.size[1] / 2);
  addFloat(b.x + d.size[0] / 2, b.y, 'Lv' + b.lvl + '!', '#ffd23f', 1.6);
  SE('levelup');
  toast(d.name + 'がLv' + b.lvl + 'に！ 価格・定員・満足度アップ', 'good');
  appealDirty = true; staticDirty = true;
  checkMissions();
}

/* ---------- ランダムイベント ---------- */
function randomEvent() {
  if (S.dayCount < 3) return;
  const lucky = S.techs.lucky ? 1.5 : 1;
  const pool = [
    { w: 5 * lucky, ok: () => S.rank >= 1, run: () => {
      const gain = 15 + S.rank * 12;
      S.pop += gain;
      S.buffs.push({ type: 'spawn', mult: 1.4, days: 1 });
      toast('📺 テレビの取材が来た！ 人気+' + gain, 'big', 3.6);
      news('ローカル番組で商店街が紹介されました！');
    } },
    { w: 5 * lucky, ok: () => S.buildings.some((b) => priceOf(b) > 0), run: () => {
      const shops = S.buildings.filter((b) => priceOf(b) > 0);
      const b = shops.sort((a, c) => (c._appeal || 0) - (a._appeal || 0))[Math.floor(Math.random() * Math.min(4, shops.length))];
      S.feature = { uid: b.uid, days: 3 };
      toast('📖 グルメ雑誌に「' + B[b.id].name + '」が掲載！ 3日間 大人気', 'big', 3.6);
      news('雑誌掲載！「' + B[b.id].name + '」に行列ができています');
    } },
    { w: 3 * lucky, ok: () => S.rank >= 2, run: () => {
      spawnCustomer('celeb'); S.stats.celebs++;
      toast('🌟 有名人がお忍びでやってきた！', 'big', 3.6);
      news('あの有名人が商店街に！？ SNSで話題に');
    } },
    { w: 4 * lucky, ok: () => S.rank >= 1, run: () => {
      const t = pick(S.rank >= 3 ? ['tourist', 'student', 'elder'] : ['student', 'elder', 'housewife']);
      const n = 6 + S.rank * 2;
      for (let i = 0; i < n; i++) setTimeout(() => { if (S && customers.length < maxCustomers() + 10) spawnCustomer(custAllowed(t) ? t : 'student'); }, i * 350);
      toast('🚌 ' + CUST[custAllowed(t) ? t : 'student'].name + 'の団体客がやってきた！', 'good', 3);
    } },
    { w: 4, ok: () => S.rank >= 1 && !S.techs.camera, run: () => {
      spawnCustomer('thief');
      toast('⚠ あやしい人物が商店街に入ってきた…', 'bad', 3.2);
    } },
    { w: 2 * lucky, ok: () => true, run: () => {
      S.pop += 5;
      toast('🐈 かわいい野良猫が住み着いた！ 人気+5', 'good', 3);
      news('看板猫が誕生？ 猫目当てのお客さんも');
      S.flags.cat = true;
    } },
    { w: 3, ok: () => (S.month >= 7 && S.month <= 10), run: () => {
      S.buffs.push({ type: 'typhoon', mult: 0, days: 1 });
      S.weather = 'rain';
      toast('🌀 台風接近！ 今日はお客さんがほとんど来ない…', 'bad', 3.6);
      news('台風のため客足が遠のいています');
    } },
    { w: 3, ok: () => S.rank >= 1, run: () => queueModal(choiceEvent) },
  ];
  if (!chance(0.3 * (S.techs.lucky ? 1.2 : 1))) return;
  const ev = weightedPick(pool.filter((p) => p.ok()), (p) => p.w);
  if (ev) ev.run();
}
const CHOICES = [
  () => ({ title: '商店会からの相談', text: '「地域のお祭りに協賛してくれんか？ 協賛金は ' + yen(30000 + S.rank * 30000) + ' じゃ」', a: '協賛する', b: '断る',
    onA: () => { const c = 30000 + S.rank * 30000; if (S.money < c) return toast('お金が足りません', 'bad'); S.money -= c; S.cur.events += c; S.pop += 10 + S.rank * 6; S.buffs.push({ type: 'spawn', mult: 1.3, days: 2 }); toast('お祭りが盛り上がった！ 人気アップ', 'good'); },
    onB: () => { S.pop = Math.max(0, S.pop - 2); } }),
  () => ({ title: '職場体験の依頼', text: '「近所の中学校から職場体験の受け入れ依頼が来ておる。スタッフの負担は増えるがどうする？」', a: '受け入れる', b: '断る',
    onA: () => { S.pop += 8; for (const s of S.staff) s.exp += 10; S.staff.forEach((s) => { s.morale = Math.max(0, s.morale - 5); }); toast('生徒たちが喜んでいた！ 人気+8 スタッフ経験値UP', 'good'); },
    onB: () => {} }),
  () => ({ title: 'あやしい投資話', text: '「' + yen(100000 + S.rank * 100000) + ' 出してくれたら倍にして返しますよ…」と怪しい男が言っている。', a: '投資する', b: '追い返す',
    onA: () => { const c = 100000 + S.rank * 100000; if (S.money < c) return toast('お金が足りません', 'bad'); S.money -= c; if (chance(0.35)) { S.money += c * 3; toast('なんと本当に3倍になった！ +' + yen(c * 2), 'good'); } else { S.cur.other += c; toast('男は二度と現れなかった…', 'bad'); } },
    onB: () => { S.pop += 1; } }),
  () => ({ title: '大型チェーンの進出', text: '「隣町に大型ショッピングセンターができるらしい。対抗セールを打つか？（' + yen(50000 + S.rank * 50000) + '）」', a: '対抗セール', b: '様子を見る',
    onA: () => { const c = 50000 + S.rank * 50000; if (S.money < c) return toast('お金が足りません', 'bad'); S.money -= c; S.cur.events += c; S.buffs.push({ type: 'spawn', mult: 1.5, days: 3 }); toast('セール大成功！ 3日間客足アップ', 'good'); },
    onB: () => { S.pop *= 0.9; toast('お客さんが少し流れてしまった…', 'bad'); } }),
  () => ({ title: 'ドキュメンタリー撮影', text: '「テレビ局が商店街の一日を撮りたいそうじゃ。無料だが、失敗すると評判が落ちるかもしれん」', a: '撮影OK', b: '断る',
    onA: () => { const avg = S.cur.satN ? S.cur.satSum / S.cur.satN : 60; if (chance(avg / 100 + 0.1)) { S.pop += 30 + S.rank * 15; toast('放送は大好評！ 人気大幅アップ', 'good'); } else { S.pop *= 0.92; toast('イマイチな放送になってしまった…', 'bad'); } },
    onB: () => {} }),
  () => ({ title: '商店街の清掃活動', text: '「みんなで街を掃除せんか？ 費用は ' + yen(10000 + S.rank * 5000) + ' じゃ」', a: '清掃する', b: 'しない',
    onA: () => { const c = 10000 + S.rank * 5000; if (S.money < c) return toast('お金が足りません', 'bad'); S.money -= c; S.cur.clean += c; S.litter.fill(0); S.pop += 4; appealDirty = true; toast('街がピカピカになった！', 'good'); },
    onB: () => {} }),
];

/* ================================================================
   10. 描画
   ================================================================ */
const cv = $('#game');
const ctx = cv.getContext('2d');
const WORLD_W = MAP_W * TILE, WORLD_H = MAP_H * TILE;
const staticCv = mkCanvas(WORLD_W, WORLD_H);
const sg = staticCv.getContext('2d');
const lightCv = mkCanvas(WORLD_W, WORLD_H);
const lg = lightCv.getContext('2d');
const cam = { x: 0, y: 0, z: 2 };
let dpr = 1, viewW = 300, viewH = 300;
let frameCount = 0;
let particles = [];

const P = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

const GROUND = [
  { base: '#6cbf55', dark: '#58a846', light: '#8ad46c', spec: ['#ff97c1', '#f4f4f4'] },
  { base: '#4caf45', dark: '#3c9538', light: '#68c65a', spec: ['#fee761', '#f4f4f4'] },
  { base: '#a9a04c', dark: '#8f873e', light: '#c4b95e', spec: ['#f77622', '#e43b44'] },
  { base: '#e3eaf3', dark: '#c9d3e1', light: '#ffffff', spec: ['#c0cbdc', '#ffffff'] },
];
const curSeason = () => (S ? SEASON_OF(S.month) : 0);

function drawGround(g, x, y, season) {
  const G = GROUND[season];
  const ox = x * 16, oy = y * 16;
  P(g, ox, oy, 16, 16, G.base);
  for (let k = 0; k < 7; k++) {
    const px = Math.floor(hash2(x * 7 + k, y * 13 + k, 1) * 16), py = Math.floor(hash2(x + k * 3, y * 5 + k, 2) * 16);
    P(g, ox + px, oy + py, 1, 1, k < 4 ? G.dark : G.light);
  }
  if (hash2(x, y, 5) < 0.35) {
    const a = Math.floor(hash2(x, y, 6) * 12) + 2, b = Math.floor(hash2(x, y, 8) * 11) + 3;
    P(g, ox + a, oy + b, 1, 2, G.dark); P(g, ox + a + 2, oy + b, 1, 2, G.dark); P(g, ox + a + 1, oy + b + 1, 1, 1, G.dark);
  }
  if (hash2(x, y, 9) < 0.14) {
    const a = Math.floor(hash2(x, y, 10) * 14) + 1, b = Math.floor(hash2(x, y, 11) * 14) + 1;
    P(g, ox + a, oy + b, 1, 1, G.spec[hash2(x, y, 12) < 0.5 ? 0 : 1]);
  }
}
function drawRoadTile(g, x, y, code) {
  const ox = x * 16, oy = y * 16;
  if (code === 2) {
    P(g, ox, oy, 16, 16, '#b9bfca');
    for (let r = 0; r < 4; r++) {
      P(g, ox, oy + r * 4 + 3, 16, 1, '#98a0b0');
      for (let c = 0; c < 4; c++) P(g, ox + c * 4 + (r % 2) * 2, oy + r * 4, 1, 3, '#a4acbb');
      P(g, ox + 1 + (r % 2) * 2, oy + r * 4, 1, 1, '#d4d9e1');
    }
  } else if (code === 3) {
    P(g, ox, oy, 16, 16, '#b65a48');
    for (let r = 0; r < 4; r++) {
      P(g, ox, oy + r * 4 + 3, 16, 1, '#8a3e33');
      for (let c = 0; c < 2; c++) P(g, ox + c * 8 + (r % 2) * 4, oy + r * 4, 1, 3, '#8a3e33');
      P(g, ox + 2 + (r % 2) * 4, oy + r * 4, 2, 1, '#cf7662');
    }
  } else {
    P(g, ox, oy, 16, 16, '#5d6477');
    for (let k = 0; k < 6; k++) {
      P(g, ox + Math.floor(hash2(x + k, y, 21) * 16), oy + Math.floor(hash2(x, y + k, 22) * 16), 1, 1, k % 2 ? '#6b7386' : '#51586a');
    }
  }
  const road = (xx, yy) => isRoad(xx, yy) || (code === 9 && yy === MAP_H);
  const n = road(x, y - 1), s = road(x, y + 1) || (x === GATE_X && y === GATE_Y), w = road(x - 1, y), e = road(x + 1, y);
  const curb = code === 1 || code === 9 ? '#a7b0c2' : shade(code === 2 ? '#b9bfca' : '#b65a48', 30);
  const curbD = '#737c90';
  if (!n) { P(g, ox, oy, 16, 2, curb); P(g, ox, oy + 2, 16, 1, curbD); }
  if (!s) { P(g, ox, oy + 14, 16, 2, curb); P(g, ox, oy + 13, 16, 1, curbD); }
  if (!w) { P(g, ox, oy, 2, 16, curb); P(g, ox + 2, oy, 1, 16, curbD); }
  if (!e) { P(g, ox + 14, oy, 2, 16, curb); P(g, ox + 13, oy, 1, 16, curbD); }
  if ((code === 1 || code === 9) && w && e && !n && !s) { P(g, ox + 2, oy + 7, 4, 1, '#e9e0b8'); P(g, ox + 10, oy + 7, 4, 1, '#e9e0b8'); }
  if ((code === 1 || code === 9) && n && s && !w && !e) { P(g, ox + 7, oy + 2, 1, 4, '#e9e0b8'); P(g, ox + 7, oy + 10, 1, 4, '#e9e0b8'); }
}
function treeColors(season, sakura) {
  if (sakura) return season === 0 ? ['#ff97c1', '#ffc3dc', '#e06b9c'] : season === 1 ? ['#4fa648', '#6cc85a', '#2f7a36'] : season === 2 ? ['#f77622', '#feae34', '#b8481a'] : null;
  return season === 2 ? ['#d98a2b', '#f2b64a', '#9c5a1c'] : season === 3 ? ['#4f8a5a', '#f4f4f4', '#2f6a3e'] : ['#4fa648', '#6cc85a', '#2f7a36'];
}
function drawTreeShape(g, ox, oy, season, sakura, big) {
  P(g, ox + 4, oy + 14, 9, 1, 'rgba(0,0,0,.22)');
  P(g, ox + 7, oy + 9, 2, 6, '#733e39'); P(g, ox + 7, oy + 9, 1, 6, '#8a4e44');
  const col = treeColors(season, sakura);
  if (!col) { // 冬の桜: 枝だけ
    P(g, ox + 7, oy + 3, 2, 7, '#733e39'); P(g, ox + 4, oy + 5, 3, 1, '#733e39'); P(g, ox + 9, oy + 4, 3, 1, '#733e39');
    P(g, ox + 4, oy + 4, 3, 1, '#f4f4f4'); P(g, ox + 9, oy + 3, 3, 1, '#f4f4f4'); P(g, ox + 7, oy + 2, 2, 1, '#f4f4f4');
    return;
  }
  const [c, l, d] = col;
  const t = big ? 0 : 1;
  P(g, ox + 4, oy + 1 + t, 8, 1, c); P(g, ox + 3, oy + 2 + t, 10, 1, c); P(g, ox + 2, oy + 3 + t, 12, 5, c); P(g, ox + 3, oy + 8 + t, 10, 1, c); P(g, ox + 5, oy + 9 + t, 6, 1, c);
  P(g, ox + 4, oy + 2 + t, 3, 1, l); P(g, ox + 3, oy + 3 + t, 3, 2, l); P(g, ox + 8, oy + 4 + t, 1, 1, l);
  P(g, ox + 3, oy + 8 + t, 10, 1, d); P(g, ox + 11, oy + 5 + t, 2, 3, d);
  if (season === 3 && !sakura) { P(g, ox + 4, oy + 1 + t, 8, 1, '#f4f4f4'); P(g, ox + 3, oy + 2 + t, 10, 1, '#f4f4f4'); }
  if (sakura && season === 0) { P(g, ox + 6, oy + 5, 1, 1, '#f4f4f4'); P(g, ox + 10, oy + 3, 1, 1, '#f4f4f4'); }
}
function drawNature(g, x, y, kind, season) {
  const ox = x * 16, oy = y * 16;
  if (kind === 1) drawTreeShape(g, ox, oy, season, false);
  else if (kind === 2) {
    P(g, ox + 3, oy + 13, 11, 1, 'rgba(0,0,0,.22)');
    P(g, ox + 4, oy + 7, 8, 7, '#8b9bb4'); P(g, ox + 3, oy + 9, 10, 4, '#8b9bb4');
    P(g, ox + 5, oy + 7, 4, 2, '#c0cbdc'); P(g, ox + 3, oy + 12, 10, 1, '#5a6988'); P(g, ox + 10, oy + 9, 2, 3, '#6c7a96');
    if (season === 3) P(g, ox + 4, oy + 6, 8, 2, '#f4f4f4');
  } else if (kind === 3) {
    const c = season === 2 ? '#9c8a2c' : season === 3 ? '#8aa28e' : '#3e8948';
    P(g, ox + 3, oy + 13, 10, 1, 'rgba(0,0,0,.2)');
    P(g, ox + 4, oy + 8, 8, 5, c); P(g, ox + 3, oy + 9, 10, 3, c);
    P(g, ox + 5, oy + 8, 2, 1, shade(c, 40)); P(g, ox + 4, oy + 12, 8, 1, shade(c, -30));
    if (season < 2) { P(g, ox + 6, oy + 9, 1, 1, season ? '#fee761' : '#ff97c1'); P(g, ox + 9, oy + 10, 1, 1, '#f4f4f4'); }
  }
}

/* ---------- 建物描画 ---------- */
function drawSign(g, icon, x, y, plate, border) {
  if (plate) { P(g, x - 1, y - 1, 10, 10, border || '#1a1c2c'); P(g, x, y, 8, 8, plate); }
  g.drawImage(iconCanvas(icon), x, y);
}
function winRect(g, x, y, w, h, frame, lights) {
  P(g, x - 1, y - 1, w + 2, h + 2, frame);
  P(g, x, y, w, h, '#8fcfea');
  P(g, x, y, 1, 1, '#d6f1fb');
  if (lights) lights.push({ x, y, w, h, k: 'win' });
}
function drawDoor(g, x, y, w, h, style) {
  if (style === 'glass') { P(g, x, y, w, h, '#2e4a6e'); P(g, x + 1, y + 1, w - 2, h - 1, '#8fcfea'); P(g, x + Math.floor(w / 2), y + 1, 1, h - 1, '#2e4a6e'); }
  else { P(g, x, y, w, h, '#3a2a22'); P(g, x + 1, y + 1, w - 2, h - 1, '#5b3a26'); P(g, x + w - 2, y + Math.floor(h / 2), 1, 1, '#fee761'); }
}
function drawBuilding(g, id, lvl, ox, oy, lights) {
  const d = B[id], L = d.look;
  const W = d.size[0] * 16, H = d.size[1] * 16;
  const winter = curSeason() === 3;
  if (L.custom) { CUSTOM_DRAW[L.custom](g, ox, oy, W, H, lvl, lights, winter); return; }
  const wall = L.wall || '#ead4aa';
  const c1 = L.c1 || '#b86f50';
  const big = H > 16;
  const R = big ? 14 : 9;
  // 影
  P(g, ox + 1, oy + H - 1, W - 2, 1, 'rgba(0,0,0,.28)');
  // 壁
  const wx = ox + 1, ww = W - 2, wy = oy + R, wh = H - R - 1;
  P(g, wx, wy, ww, wh, wall);
  P(g, wx, wy + wh - 1, ww, 1, shade(wall, -45));
  P(g, wx, wy, 1, wh, shade(wall, 18));
  P(g, wx + ww - 1, wy, 1, wh, shade(wall, -28));
  const roofType = L.roof;
  let signX = ox + Math.floor(W / 2) - 4, signY = oy + (big ? 3 : 1);
  let plate = '#f4f4f4', border = '#1a1c2c';
  switch (roofType) {
    case 'awning': {
      const pc = shade(wall, -28);
      P(g, ox + 1, oy + 1, W - 2, R - 2, pc);
      P(g, ox + 1, oy, W - 2, 1, shade(pc, -40));
      P(g, ox + 1, oy + 1, W - 2, 1, shade(pc, 25));
      if (winter) P(g, ox + 1, oy, W - 2, 1, '#f4f4f4');
      const ay = oy + R - 2;
      for (let i = 0; i < W; i += 2) {
        const col = L.aw[(i / 2) % 2];
        P(g, ox + i, ay, 2, 3, col);
        P(g, ox + i, ay + 3, 1, 1, col);
      }
      P(g, ox, ay, W, 1, shade(L.aw[0], 30));
      signY = oy + (big ? 3 : 0);
      if (!big) { signY = oy + 0; }
      break;
    }
    case 'tri': {
      for (let r = 0; r < R; r++) {
        const inset = Math.round((R - 1 - r) * (W / 2 - 2) / (R - 1));
        const col = r % 3 === 2 ? shade(c1, -22) : c1;
        P(g, ox + inset, oy + r, W - inset * 2, 1, col);
        P(g, ox + inset, oy + r, 1, 1, shade(c1, 35));
        if (winter && r < 2) P(g, ox + inset, oy + r, W - inset * 2, 1, '#f4f4f4');
      }
      P(g, ox, oy + R - 1, W, 1, shade(c1, -45));
      signY = oy + R - 9; plate = '#fff6e0';
      break;
    }
    case 'kawara': {
      P(g, ox + 2, oy + 1, W - 4, R - 3, c1);
      for (let r = oy + 2; r < oy + R - 2; r += 2) P(g, ox + 2, r, W - 4, 1, shade(c1, 22));
      P(g, ox + 1, oy, W - 2, 1, shade(c1, -30));
      P(g, ox, oy + R - 2, W, 2, shade(c1, -35));
      P(g, ox, oy + R - 2, W, 1, shade(c1, 12));
      if (winter) { P(g, ox + 1, oy, W - 2, 2, '#f4f4f4'); P(g, ox, oy + R - 2, W, 1, '#f4f4f4'); }
      if (L.chimney) { P(g, ox + W - 5, oy - 0, 3, 5, '#8b9bb4'); P(g, ox + W - 5, oy, 3, 1, '#5a6988'); }
      plate = '#e4a672'; border = '#5e3b24';
      signY = oy + (big ? 3 : 0);
      break;
    }
    case 'flat': case 'big': case 'hotel': {
      P(g, ox + 1, oy, W - 2, R, c1);
      P(g, ox + 1, oy, W - 2, 1, shade(c1, 40));
      P(g, ox + 1, oy + R - 1, W - 2, 1, shade(c1, -40));
      if (winter) P(g, ox + 1, oy, W - 2, 1, '#f4f4f4');
      const sc = L.sign || '#fee761';
      P(g, ox + 3, oy + 2, W - 6, R - 4, sc);
      P(g, ox + 3, oy + R - 3, W - 6, 1, shade(sc, -40));
      plate = null;
      signY = oy + Math.floor((R - 8) / 2);
      break;
    }
    case 'modern': {
      P(g, ox + 1, oy, W - 2, 3, c1);
      if (winter) P(g, ox + 1, oy, W - 2, 1, '#f4f4f4');
      P(g, ox + 1, oy + 3, W - 2, R - 3, '#2e4a6e');
      for (let i = 0; i < W - 2; i += 4) P(g, ox + 2 + i, oy + 4, 1, R - 5, '#4d73a0');
      P(g, ox + 1, oy + R - 1, W - 2, 1, c1);
      plate = '#f4f4f4'; border = c1;
      signY = oy + (big ? 4 : 1);
      break;
    }
    case 'dome': {
      for (let r = 0; r < R; r++) {
        const t = r / (R - 1);
        const inset = Math.round((1 - Math.sqrt(1 - Math.pow(1 - t, 2))) * (W / 2 - 1));
        P(g, ox + inset, oy + r, W - inset * 2, 1, r < 2 && winter ? '#f4f4f4' : (r % 4 === 3 ? shade(c1, -25) : c1));
      }
      P(g, ox + Math.floor(W / 2) - 1, oy, 2, 1, L.sign || '#fee761');
      P(g, ox, oy + R - 1, W, 1, shade(c1, -45));
      plate = L.sign || '#fee761';
      signY = oy + R - 10;
      break;
    }
    case 'conv': {
      P(g, ox + 1, oy, W - 2, R, '#f4f4f4');
      if (winter) P(g, ox + 1, oy, W - 2, 1, '#e3eaf3');
      P(g, ox + 1, oy + 1, W - 2, 2, '#3e8948'); P(g, ox + 1, oy + 3, W - 2, 2, '#f4f4f4'); P(g, ox + 1, oy + 5, W - 2, 2, '#0099db'); P(g, ox + 1, oy + 7, W - 2, 1, '#e43b44');
      plate = null; signY = -99;
      break;
    }
    case 'pin': {
      P(g, ox + 1, oy + 6, W - 2, R - 6, '#e43b44');
      P(g, ox + 1, oy + 6, W - 2, 1, '#f77622');
      // 巨大ピン
      const px = ox + W / 2 - 3;
      P(g, px + 1, oy, 4, 1, '#f4f4f4'); P(g, px, oy + 1, 6, 3, '#f4f4f4'); P(g, px + 1, oy + 4, 4, 1, '#f4f4f4');
      P(g, px, oy + 5, 6, 1, '#e43b44'); P(g, px - 1, oy + 6, 8, 6, '#f4f4f4'); P(g, px, oy + 12, 6, 1, '#c0cbdc');
      P(g, px + 1, oy + 1, 1, 2, '#ffffff'); P(g, px + 5, oy + 7, 1, 5, '#c0cbdc');
      plate = null; signY = -99;
      break;
    }
  }
  if (signY > -50) drawSign(g, d.icon, signX, signY, plate, border);
  // 窓とドア
  if (!big) {
    const dy = oy + H - 7;
    const glass = roofType === 'modern' || roofType === 'conv';
    if (W === 16) {
      drawDoor(g, ox + 6, dy, 4, 6, glass ? 'glass' : 'wood');
      winRect(g, ox + 2, oy + R + 2, 2, 3, shade(wall, -55), lights);
      winRect(g, ox + 12, oy + R + 2, 2, 3, shade(wall, -55), lights);
    } else {
      drawDoor(g, ox + 13, dy, 6, 6, glass ? 'glass' : 'wood');
      winRect(g, ox + 3, oy + R + 2, 7, 3, shade(wall, -55), lights);
      winRect(g, ox + 22, oy + R + 2, 7, 3, shade(wall, -55), lights);
    }
    if (roofType === 'conv') { winRect(g, ox + 2, oy + R + 1, 3, 5, '#5a6988', lights); winRect(g, ox + 11, oy + R + 1, 3, 5, '#5a6988', lights); }
  } else {
    // 2x2
    const floors = roofType === 'hotel' || roofType === 'big' ? 3 : 2;
    const rowsY = [];
    for (let f = 0; f < floors - 1; f++) rowsY.push(oy + R + 2 + f * 5);
    for (const ry of rowsY) for (let x = ox + 4; x < ox + W - 5; x += 6) winRect(g, x, ry, 3, 3, shade(wall, -55), lights);
    const dy = oy + H - 9;
    drawDoor(g, ox + W / 2 - 4, dy, 8, 8, roofType === 'kawara' ? 'wood' : 'glass');
    winRect(g, ox + 3, dy + 1, 6, 5, shade(wall, -55), lights);
    winRect(g, ox + W - 9, dy + 1, 6, 5, shade(wall, -55), lights);
  }
  // のれん
  if (L.noren) {
    const nw = W === 16 ? 8 : 10, nx = ox + Math.floor(W / 2) - nw / 2, ny = oy + R;
    P(g, nx, ny, nw, 3, L.noren);
    for (let i = 2; i < nw; i += 3) P(g, nx + i, ny + 1, 1, 2, shade(L.noren, -50));
    P(g, nx, ny, nw, 1, shade(L.noren, 30));
  }
  // レベル表示
  if (lvl > 1) {
    for (let i = 0; i < lvl - 1; i++) { P(g, ox + 1 + i * 3, oy + H - 4, 3, 3, '#1a1c2c'); P(g, ox + 2 + i * 3, oy + H - 3, 1, 1, '#fee761'); }
  }
  if (lvl >= 5) { P(g, ox, oy, W, 1, '#feae34'); P(g, ox, oy, 1, 3, '#feae34'); P(g, ox + W - 1, oy, 1, 3, '#feae34'); }
}

const CUSTOM_DRAW = {
  vending(g, ox, oy, W, H, lvl, lights, winter) {
    P(g, ox + 3, oy + 15, 10, 1, 'rgba(0,0,0,.25)');
    P(g, ox + 4, oy + 2, 8, 13, '#e43b44'); P(g, ox + 4, oy + 2, 8, 1, '#f6757a'); P(g, ox + 11, oy + 2, 1, 13, '#a22633');
    P(g, ox + 5, oy + 4, 6, 4, '#d6f1fb');
    for (let i = 0; i < 3; i++) P(g, ox + 5 + i * 2, oy + 5, 1, 2, ['#0099db', '#63c74d', '#feae34'][i]);
    P(g, ox + 5, oy + 9, 6, 1, '#fee761'); P(g, ox + 5, oy + 12, 6, 2, '#1a1c2c');
    if (winter) P(g, ox + 4, oy + 1, 8, 1, '#f4f4f4');
    if (lights) lights.push({ x: ox + 5, y: oy + 4, w: 6, h: 4, k: 'vend' });
  },
  bench(g, ox, oy) {
    P(g, ox + 2, oy + 13, 12, 1, 'rgba(0,0,0,.22)');
    P(g, ox + 2, oy + 6, 12, 2, '#733e39'); P(g, ox + 2, oy + 9, 12, 2, '#b86f50'); P(g, ox + 2, oy + 9, 12, 1, '#e4a672');
    P(g, ox + 3, oy + 11, 1, 3, '#3a4466'); P(g, ox + 12, oy + 11, 1, 3, '#3a4466'); P(g, ox + 3, oy + 8, 1, 1, '#3a4466'); P(g, ox + 12, oy + 8, 1, 1, '#3a4466');
  },
  toilet(g, ox, oy, W, H, lvl, lights, winter) {
    P(g, ox + 1, oy + 15, 14, 1, 'rgba(0,0,0,.25)');
    P(g, ox + 1, oy + 1, 14, 4, '#3a4466'); P(g, ox + 1, oy + 1, 14, 1, winter ? '#f4f4f4' : '#5a6988');
    P(g, ox + 2, oy + 5, 12, 10, '#e3eaf3'); P(g, ox + 2, oy + 14, 12, 1, '#a9b3c4');
    g.drawImage(iconCanvas('wc'), ox + 4, oy + 5);
    P(g, ox + 3, oy + 12, 3, 3, '#124e89'); P(g, ox + 10, oy + 12, 3, 3, '#a22633');
  },
  trash(g, ox, oy) {
    P(g, ox + 5, oy + 14, 7, 1, 'rgba(0,0,0,.25)');
    P(g, ox + 5, oy + 6, 6, 8, '#5a6988'); P(g, ox + 4, oy + 5, 8, 2, '#3a4466'); P(g, ox + 6, oy + 7, 1, 6, '#8b9bb4'); P(g, ox + 9, oy + 7, 1, 6, '#3a4466');
    P(g, ox + 6, oy + 4, 4, 1, '#3a4466');
  },
  koban(g, ox, oy, W, H, lvl, lights, winter) {
    P(g, ox + 1, oy + 15, 14, 1, 'rgba(0,0,0,.25)');
    P(g, ox + 1, oy + 3, 14, 4, '#3a4466'); P(g, ox + 1, oy + 3, 14, 1, winter ? '#f4f4f4' : '#5a6988');
    P(g, ox + 2, oy + 7, 12, 8, '#ead4aa'); P(g, ox + 2, oy + 14, 12, 1, '#b8a47e');
    P(g, ox + 7, oy + 0, 2, 3, '#e43b44'); P(g, ox + 6, oy + 2, 4, 1, '#1a1c2c');
    P(g, ox + 4, oy + 8, 8, 2, '#124e89'); P(g, ox + 5, oy + 8, 1, 1, '#f4f4f4'); P(g, ox + 8, oy + 8, 1, 1, '#f4f4f4');
    drawDoor(g, ox + 6, oy + 10, 4, 5, 'glass');
    if (lights) lights.push({ x: ox + 7, y: oy, w: 2, h: 2, k: 'red' });
  },
  atm(g, ox, oy, W, H, lvl, lights, winter) {
    P(g, ox + 2, oy + 15, 12, 1, 'rgba(0,0,0,.25)');
    P(g, ox + 3, oy + 2, 10, 13, '#3e8948'); P(g, ox + 3, oy + 2, 10, 1, winter ? '#f4f4f4' : '#63c74d');
    P(g, ox + 4, oy + 4, 8, 4, '#9fd8ef'); P(g, ox + 5, oy + 5, 3, 1, '#f4f4f4');
    P(g, ox + 4, oy + 9, 8, 5, '#c0cbdc'); P(g, ox + 5, oy + 10, 2, 1, '#1a1c2c'); P(g, ox + 8, oy + 10, 3, 1, '#1a1c2c'); P(g, ox + 5, oy + 12, 6, 1, '#5a6988');
    g.drawImage(iconCanvas('yenb'), ox + 4, oy - 1);
    if (lights) lights.push({ x: ox + 4, y: oy + 4, w: 8, h: 4, k: 'vend' });
  },
  parking(g, ox, oy, W, H, lvl, lights, winter) {
    P(g, ox, oy, W, H, '#6b7386'); P(g, ox, oy, W, 1, '#8b9bb4');
    for (let i = 0; i < 4; i++) P(g, ox + 3 + i * 8, oy + 3, 1, 11, '#e9e0b8');
    for (let i = 0; i < 4; i++) P(g, ox + 3 + i * 8, oy + 18, 1, 11, '#e9e0b8');
    const cars = [['#e43b44', 5, 5], ['#0099db', 21, 20], ['#fee761', 13, 20]];
    for (const [c, x, y] of cars) {
      P(g, ox + x, oy + y, 6, 9, c); P(g, ox + x + 1, oy + y + 2, 4, 2, '#d6f1fb'); P(g, ox + x + 1, oy + y + 6, 4, 1, '#d6f1fb');
      P(g, ox + x - 1, oy + y + 1, 1, 2, '#1a1c2c'); P(g, ox + x + 6, oy + y + 1, 1, 2, '#1a1c2c'); P(g, ox + x - 1, oy + y + 6, 1, 2, '#1a1c2c'); P(g, ox + x + 6, oy + y + 6, 1, 2, '#1a1c2c');
      if (winter) P(g, ox + x, oy + y, 6, 1, '#f4f4f4');
    }
    drawSign(g, 'parking', ox + 13, oy + 5, null);
  },
  busstop(g, ox, oy, W, H, lvl, lights, winter) {
    P(g, ox + 1, oy + 15, 14, 1, 'rgba(0,0,0,.22)');
    P(g, ox + 1, oy + 3, 12, 2, '#3a4466'); if (winter) P(g, ox + 1, oy + 3, 12, 1, '#f4f4f4');
    P(g, ox + 2, oy + 5, 1, 9, '#5a6988'); P(g, ox + 12, oy + 5, 1, 9, '#5a6988');
    P(g, ox + 3, oy + 5, 9, 5, 'rgba(159,216,239,.6)');
    P(g, ox + 4, oy + 11, 7, 2, '#b86f50');
    P(g, ox + 14, oy + 2, 1, 13, '#8b9bb4');
    P(g, ox + 12, oy, 5, 5, '#e43b44'); P(g, ox + 13, oy + 1, 3, 3, '#f4f4f4'); P(g, ox + 14, oy + 2, 1, 1, '#3e8948');
  },
  tree(g, ox, oy, W, H, lvl, lights, winter) {
    drawTreeShape(g, ox, oy, curSeason(), false, true);
    P(g, ox + 5, oy + 13, 6, 2, '#733e39'); P(g, ox + 5, oy + 13, 6, 1, '#b86f50');
  },
  flower(g, ox, oy, W, H, lvl, lights, winter) {
    P(g, ox + 2, oy + 9, 12, 5, '#733e39'); P(g, ox + 2, oy + 9, 12, 1, '#b86f50'); P(g, ox + 2, oy + 14, 12, 1, 'rgba(0,0,0,.25)');
    if (winter) { P(g, ox + 3, oy + 8, 10, 2, '#f4f4f4'); return; }
    const cols = ['#e43b44', '#fee761', '#ff97c1', '#f4f4f4', '#b55088'];
    for (let i = 0; i < 5; i++) {
      const x = ox + 3 + i * 2 + (i % 2), y = oy + 4 + (i % 3);
      P(g, x, y + 2, 1, 3, '#3e8948'); P(g, x - 1, y, 3, 2, cols[i]); P(g, x, y, 1, 1, '#fee761');
    }
  },
  lamp(g, ox, oy, W, H, lvl, lights) {
    P(g, ox + 6, oy + 14, 5, 1, 'rgba(0,0,0,.25)');
    P(g, ox + 7, oy + 4, 2, 11, '#3a4466'); P(g, ox + 6, oy + 13, 4, 2, '#3a4466');
    P(g, ox + 5, oy + 1, 6, 1, '#1a1c2c'); P(g, ox + 5, oy + 2, 6, 3, '#fee761'); P(g, ox + 6, oy + 5, 4, 1, '#1a1c2c');
    if (lights) lights.push({ x: ox + 8, y: oy + 3, k: 'lamp' });
  },
  flag(g, ox, oy) {
    P(g, ox + 4, oy + 14, 6, 1, 'rgba(0,0,0,.25)');
    P(g, ox + 4, oy + 1, 1, 14, '#5a6988');
    P(g, ox + 5, oy + 2, 6, 11, '#e43b44'); P(g, ox + 6, oy + 3, 4, 9, '#f4f4f4');
    P(g, ox + 7, oy + 4, 2, 1, '#e43b44'); P(g, ox + 7, oy + 6, 2, 1, '#e43b44'); P(g, ox + 7, oy + 8, 2, 1, '#e43b44'); P(g, ox + 7, oy + 10, 2, 1, '#e43b44');
  },
  sakura(g, ox, oy) { drawTreeShape(g, ox, oy, curSeason(), true, true); },
  lantern(g, ox, oy, W, H, lvl, lights) {
    P(g, ox + 1, oy + 2, 1, 13, '#733e39'); P(g, ox + 14, oy + 2, 1, 13, '#733e39');
    P(g, ox + 1, oy + 3, 14, 1, '#1a1c2c');
    for (const x of [3, 7, 11]) { P(g, ox + x, oy + 4, 3, 1, '#1a1c2c'); P(g, ox + x - 0, oy + 5, 3, 4, '#e43b44'); P(g, ox + x + 1, oy + 5, 1, 4, '#f6757a'); P(g, ox + x, oy + 9, 3, 1, '#1a1c2c'); if (lights) lights.push({ x: ox + x + 1, y: oy + 7, k: 'lan' }); }
  },
  pond(g, ox, oy, W, H, lvl, lights, winter) {
    const water = winter ? '#b8d8ea' : '#0099db';
    P(g, ox + 4, oy + 5, 24, 22, '#8b9bb4'); P(g, ox + 2, oy + 8, 28, 16, '#8b9bb4');
    P(g, ox + 5, oy + 7, 22, 18, water); P(g, ox + 4, oy + 9, 24, 14, water);
    P(g, ox + 7, oy + 9, 6, 1, winter ? '#f4f4f4' : '#2ce8f5'); P(g, ox + 16, oy + 18, 5, 1, winter ? '#f4f4f4' : '#2ce8f5');
    P(g, ox + 20, oy + 10, 4, 3, '#3e8948'); P(g, ox + 21, oy + 9, 2, 1, '#63c74d');
    for (const [x, y] of [[3, 6], [26, 7], [2, 22], [27, 23], [14, 4]]) P(g, ox + x, oy + y, 3, 2, '#c0cbdc');
  },
  xmas(g, ox, oy, W, H, lvl, lights) {
    P(g, ox + 3, oy + 14, 10, 1, 'rgba(0,0,0,.25)');
    P(g, ox + 7, oy + 12, 2, 3, '#733e39');
    for (let r = 0; r < 11; r++) { const w = 2 + Math.floor(r * 1.1) - (r % 3 === 0 ? 1 : 0); P(g, ox + 8 - w / 2 - 0.5 | 0, oy + 2 + r, Math.max(1, w), 1, r % 3 === 1 ? '#3e8948' : '#265c42'); }
    P(g, ox + 7, oy, 2, 2, '#fee761');
    for (const [x, y, c] of [[6, 5, '#e43b44'], [9, 7, '#fee761'], [5, 9, '#0099db'], [10, 10, '#e43b44'], [7, 11, '#fee761']]) { P(g, ox + x, oy + y, 1, 1, c); if (lights) lights.push({ x: ox + x, y: oy + y, k: 'tw' }); }
  },
  statue(g, ox, oy) {
    P(g, ox + 2, oy + 15, 12, 1, 'rgba(0,0,0,.25)');
    P(g, ox + 3, oy + 11, 10, 4, '#8b9bb4'); P(g, ox + 3, oy + 11, 10, 1, '#c0cbdc'); P(g, ox + 4, oy + 10, 8, 1, '#5a6988');
    P(g, ox + 6, oy + 1, 4, 3, '#b87d2a'); P(g, ox + 6, oy + 1, 4, 1, '#feae34');
    P(g, ox + 5, oy + 4, 6, 4, '#b87d2a'); P(g, ox + 5, oy + 4, 2, 4, '#feae34'); P(g, ox + 11, oy + 2, 1, 3, '#b87d2a');
    P(g, ox + 6, oy + 8, 1, 2, '#b87d2a'); P(g, ox + 9, oy + 8, 1, 2, '#b87d2a');
  },
  fountain(g, ox, oy, W, H, lvl, lights, winter) {
    P(g, ox + 2, oy + 28, 28, 2, 'rgba(0,0,0,.2)');
    P(g, ox + 4, oy + 8, 24, 20, '#c0cbdc'); P(g, ox + 2, oy + 11, 28, 14, '#c0cbdc');
    P(g, ox + 6, oy + 10, 20, 16, winter ? '#b8d8ea' : '#0099db'); P(g, ox + 4, oy + 13, 24, 10, winter ? '#b8d8ea' : '#0099db');
    P(g, ox + 2, oy + 24, 28, 1, '#8b9bb4'); P(g, ox + 4, oy + 27, 24, 1, '#8b9bb4');
    P(g, ox + 14, oy + 8, 4, 12, '#c0cbdc'); P(g, ox + 12, oy + 7, 8, 2, '#8b9bb4'); P(g, ox + 15, oy + 4, 2, 3, '#c0cbdc');
  },
  ferris(g, ox, oy, W, H) {
    P(g, ox + 3, oy + 30, 26, 2, 'rgba(0,0,0,.25)');
    P(g, ox + 4, oy + 26, 24, 4, '#8b9bb4'); P(g, ox + 4, oy + 26, 24, 1, '#c0cbdc');
    for (let i = 0; i < 12; i++) { P(g, ox + 15 - i, oy + 14 + i, 1, 1, '#5a6988'); P(g, ox + 16 + i, oy + 14 + i, 1, 1, '#5a6988'); }
    P(g, ox + 11, oy + 27, 10, 3, '#e43b44'); P(g, ox + 14, oy + 28, 4, 2, '#fee761');
  },
};

/* ---------- 建物のプレビュー画像キャッシュ ---------- */
const previewCache = new Map();
function buildingPreview(id) {
  const key = id + '_' + curSeason();
  if (previewCache.has(key)) return previewCache.get(key);
  const d = B[id];
  const c = mkCanvas(d.size[0] * 16, d.size[1] * 16);
  const g = c.getContext('2d');
  drawBuilding(g, id, 1, 0, 0, null);
  previewCache.set(key, c);
  return c;
}

/* ---------- 静的レイヤー ---------- */
function buildStatic() {
  staticDirty = false;
  previewCache.clear();
  const season = curSeason();
  const g = sg;
  g.clearRect(0, 0, WORLD_W, WORLD_H);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const i = idx(x, y);
    if (S.tiles[i]) drawRoadTile(g, x, y, S.tiles[i]);
    else drawGround(g, x, y, season);
  }
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const n = S.nature[idx(x, y)];
    if (n) drawNature(g, x, y, n, season);
  }
  const sorted = S.buildings.slice().sort((a, b) => a.y - b.y || a.x - b.x);
  for (const b of sorted) {
    b._lights = [];
    drawBuilding(g, b.id, b.lvl, b.x * 16, b.y * 16, b._lights);
  }
  // 門の柱 (下部)
  P(g, (GATE_X - 1) * 16 + 10, GATE_Y * 16 + 2, 4, 14, '#a22633');
  P(g, (GATE_X + 1) * 16 + 2, GATE_Y * 16 + 2, 4, 14, '#a22633');
  // 未購入の土地
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (owned(x, y)) continue;
    const ox = x * 16, oy = y * 16;
    P(g, ox, oy, 16, 16, 'rgba(20,24,56,.46)');
    P(g, ox + 3, oy + 3, 1, 1, 'rgba(255,255,255,.1)'); P(g, ox + 11, oy + 11, 1, 1, 'rgba(255,255,255,.1)');
    const L = landGrid[idx(x, y)];
    const edge = '#fee761';
    if (x > 0 && owned(x - 1, y) && landGrid[idx(x - 1, y)] !== L) for (let k = 0; k < 16; k += 4) P(g, ox, oy + k, 1, 2, edge);
    if (x < MAP_W - 1 && owned(x + 1, y)) for (let k = 0; k < 16; k += 4) P(g, ox + 15, oy + k, 1, 2, edge);
    if (y > 0 && owned(x, y - 1)) for (let k = 0; k < 16; k += 4) P(g, ox + k, oy, 2, 1, edge);
    if (y < MAP_H - 1 && owned(x, y + 1)) for (let k = 0; k < 16; k += 4) P(g, ox + k, oy + 15, 2, 1, edge);
  }
  for (const L of LANDS) {
    if (S.lands.includes(L.id)) continue;
    const sx = (L.x + Math.floor(L.w / 2)) * 16, sy = (L.y + Math.floor(L.h / 2)) * 16;
    P(g, sx + 7, sy + 6, 2, 10, '#733e39');
    P(g, sx - 1, sy - 3, 18, 11, '#1a1c2c'); P(g, sx, sy - 2, 16, 9, S.rank >= L.rank ? '#fee761' : '#8b9bb4');
    g.drawImage(iconCanvas(S.rank >= L.rank ? 'yenb' : 'question'), sx + 4, sy - 2);
  }
}

/* ---------- 人物スプライト ---------- */
const personCache = new Map();
function partnerOf(L) {
  if (!L.partner) {
    const p = Object.assign({}, L);
    p.girl = !L.girl; p.shirt = pick(['#ff97c1', '#f4f4f4', '#63c74d', '#feae34', '#0099db']); p.hair = pick(['#1a1c2c', '#733e39', '#b86f50']);
    p.type = 'couple2'; p.key = L.key + '|p';
    L.partner = p;
  }
  return L.partner;
}
function personSprite(L, dir, frame) {
  const flip = dir === 2;
  const key = L.key + '|' + dir + '|' + frame;
  let c = personCache.get(key);
  if (c) return c;
  const base = mkCanvas(8, 12), g = base.getContext('2d');
  const small = L.type === 'kid';
  const side = dir >= 2;
  const up = dir === 1;
  const oy = small ? 1 : 0;
  const hair = L.hair, skin = L.skin, shirt = L.shirt, pants = L.pants;
  const X = (x, y, w, h, col) => P(g, x, y + oy, w, h, col);
  if (L.costume === 'ghost') {
    X(2, 0, 4, 1, '#f4f4f4'); X(1, 1, 6, 8, '#f4f4f4'); X(1, 9, 1, 1, '#f4f4f4'); X(3, 9, 2, 1, '#f4f4f4'); X(6, 9, 1, 1, '#f4f4f4');
    if (!up) { X(side ? 4 : 2, 3, 1, 2, '#1a1c2c'); X(side ? 6 : 5, 3, 1, 2, '#1a1c2c'); }
  } else {
    // 頭
    X(2, 0, 4, 1, hair); X(1, 1, 6, 2, hair);
    if (up) X(1, 3, 6, 3, hair);
    else {
      X(1, 3, 6, 3, skin);
      X(1, 3, 1, 1, hair); X(6, 3, 1, 1, hair);
      if (side) { X(5, 4, 1, 1, '#1a1c2c'); X(1, 3, 2, 2, hair); }
      else { X(2, 4, 1, 1, '#1a1c2c'); X(5, 4, 1, 1, '#1a1c2c'); X(1, 5, 1, 1, '#f6757a'); X(6, 5, 1, 1, '#f6757a'); }
    }
    if (L.girl && L.type !== 'thief') { X(0, 2, 1, 4, hair); X(7, 2, 1, 4, hair); if (up) X(1, 6, 6, 1, hair); }
    // 体
    const tr = small ? 2 : 3;
    X(1, 6, 6, tr, shirt);
    X(1, 6, 6, 1, shade(shirt, 25));
    if (side) { X(3, 6 + (frame ? 0 : 1), 2, 2, shade(shirt, -25)); X(3, 6 + tr - 1 + (frame ? 0 : 0), 2, 1, skin); }
    else { X(0, 6, 1, tr - 1, shirt); X(7, 6, 1, tr - 1, shirt); X(0, 6 + tr - 1, 1, 1, skin); X(7, 6 + tr - 1, 1, 1, skin); }
    const by = 6 + tr;
    // 服装の特徴
    if (L.type === 'salaryman' && !up) { X(3, 6, 2, 1, '#f4f4f4'); X(3, 7, 1, 2, '#e43b44'); }
    if (L.type === 'student' && !up) { X(2, 6, 4, 1, '#f4f4f4'); X(3, 7, 2, 1, '#e43b44'); }
    if (L.type === 'housewife' && !up) X(2, 7, 4, tr, '#f4f4f4');
    if ((L.type === 'rich' || L.type === 'celeb') && !up) X(2, 6, 4, 1, '#fee761');
    // 下半身
    if (L.girl && !small) { X(1, by, 6, 1, shade(shirt, -30)); X(2, by + 1, 4, 1, shade(shirt, -30)); }
    else X(2, by, 4, 1, pants);
    const ly = by + 1;
    const legH = small ? 1 : 1;
    const legC = L.girl && !small ? skin : pants;
    if (side) {
      if (frame) { X(2, ly, 1, legH, legC); X(5, ly, 1, legH, legC); X(1, ly + legH, 2, 1, '#3a2a22'); X(5, ly + legH, 2, 1, '#3a2a22'); }
      else { X(3, ly, 2, legH, legC); X(3, ly + legH, 3, 1, '#3a2a22'); }
    } else {
      if (frame) { X(2, ly, 1, legH, legC); X(5, ly, 1, legH + (dir === 0 ? -0 : 0), legC); X(2, ly + legH, 1, 1, '#3a2a22'); X(5, ly + legH - 1, 1, 1, '#3a2a22'); }
      else { X(2, ly, 1, legH, legC); X(5, ly, 1, legH, legC); X(2, ly + legH, 1, 1, '#3a2a22'); X(5, ly + legH, 1, 1, '#3a2a22'); }
    }
    // 帽子など
    if (L.type === 'tourist') { X(2, -1 < 0 ? 0 : 0, 4, 1, '#f4f4f4'); X(0, 1, 8, 1, '#f4f4f4'); X(2, 0, 4, 1, '#e43b44'); }
    if (L.type === 'foreigner') { X(1, 0, 6, 2, '#e43b44'); if (!up) X(side ? 6 : 1, 2, side ? 2 : 6, 1, '#a22633'); }
    if (L.type === 'celeb' && !up) X(1, 4, 6, 1, '#1a1c2c');
    if (L.type === 'thief' && !up) { X(1, 4, 6, 1, '#1a1c2c'); X(2, 4, 1, 1, '#f4f4f4'); X(5, 4, 1, 1, '#f4f4f4'); }
    if (L.type === 'elder' && !up) X(1, 4, 6, 1, 'rgba(26,28,44,.4)');
    if (L.costume === 'pumpkin') { X(1, 0, 6, 6, '#f77622'); X(3, -0, 2, 1, '#3e8948'); if (!up) { X(2, 2, 1, 1, '#1a1c2c'); X(5, 2, 1, 1, '#1a1c2c'); X(2, 4, 4, 1, '#1a1c2c'); } }
    if (L.costume === 'witch') { X(3, 0, 2, 1, '#1a1c2c'); X(2, 1, 4, 1, '#1a1c2c'); X(0, 2, 8, 1, '#1a1c2c'); }
  }
  // 縁取り
  c = mkCanvas(10, 14);
  const cg = c.getContext('2d');
  const sil = mkCanvas(10, 14), sgc = sil.getContext('2d');
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) sgc.drawImage(base, dx, dy);
  sgc.globalCompositeOperation = 'source-in'; sgc.fillStyle = 'rgba(20,20,40,.75)'; sgc.fillRect(0, 0, 10, 14);
  cg.drawImage(sil, 0, 0);
  cg.drawImage(base, 1, 1);
  if (flip) {
    const f = mkCanvas(10, 14), fg = f.getContext('2d');
    fg.translate(10, 0); fg.scale(-1, 1); fg.drawImage(c, 0, 0);
    c = f;
  }
  if (personCache.size > 3000) personCache.clear();
  personCache.set(key, c);
  return c;
}
function drawPersonAt(g, L, wx, wy, dir, frame, alpha) {
  const sp = personSprite(L, dir === 2 ? 2 : dir === 3 ? 3 : dir, frame);
  const x = Math.round(wx - 5), y = Math.round(wy - 13);
  if (alpha < 1) g.globalAlpha = alpha;
  g.drawImage(sp, x, y);
  if (alpha < 1) g.globalAlpha = 1;
  return { x, y };
}

/* ---------- カメラ ---------- */
function resizeCanvas() {
  const r = cv.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  viewW = Math.max(1, r.width); viewH = Math.max(1, r.height);
  cv.width = Math.round(viewW * dpr); cv.height = Math.round(viewH * dpr);
  clampCam();
}
function minZoom() { return Math.max(0.5, Math.min(viewW / WORLD_W, viewH / WORLD_H) * 0.95); }
function clampCam() {
  cam.z = clamp(cam.z, minZoom(), 7);
  const vw = viewW / cam.z, vh = viewH / cam.z;
  const m = 48;
  cam.x = vw >= WORLD_W + m * 2 ? (WORLD_W - vw) / 2 : clamp(cam.x, -m, WORLD_W - vw + m);
  cam.y = vh >= WORLD_H + m * 2 ? (WORLD_H - vh) / 2 : clamp(cam.y, -m, WORLD_H - vh + m);
}
function zoomAt(sx, sy, nz) {
  const wx = cam.x + sx / cam.z, wy = cam.y + sy / cam.z;
  cam.z = clamp(nz, minZoom(), 7);
  cam.x = wx - sx / cam.z; cam.y = wy - sy / cam.z;
  clampCam();
}
function centerOn(wx, wy) { cam.x = wx - viewW / cam.z / 2; cam.y = wy - viewH / cam.z / 2; clampCam(); }
function screenToWorld(sx, sy) { return { x: cam.x + sx / cam.z, y: cam.y + sy / cam.z }; }
function worldToScreen(wx, wy) { return { x: (wx - cam.x) * cam.z, y: (wy - cam.y) * cam.z }; }
function fitView() {
  // 所有地が収まるように
  let x0 = MAP_W, y0 = MAP_H, x1 = 0, y1 = 0;
  for (const id of S.lands) { const L = LANDS[id]; x0 = Math.min(x0, L.x); y0 = Math.min(y0, L.y); x1 = Math.max(x1, L.x + L.w); y1 = Math.max(y1, L.y + L.h); }
  const w = (x1 - x0 + 1) * 16, h = (y1 - y0 + 1) * 16;
  cam.z = clamp(Math.min(viewW / w, viewH / h), minZoom(), 5);
  centerOn((x0 + x1) / 2 * 16, (y0 + y1) / 2 * 16);
}

/* ---------- 夜と天気 ---------- */
function darkness() {
  const h = S.minute / 60;
  if (h < 7) return clamp((7 - h) * 0.22, 0, 0.22);
  if (h < 17.5) return 0;
  if (h < 20) return (h - 17.5) / 2.5 * 0.58;
  return Math.min(0.66, 0.58 + (h - 20) * 0.02);
}
function updateParticles(dt) {
  const w = S.weather;
  const season = curSeason();
  const petals = season === 0 && countB('sakura') > 0 && w !== 'rain';
  const leaves = season === 2 && (countB('tree') + countB('sakura')) > 0 && w !== 'rain';
  const maxP = w === 'rain' ? 90 : w === 'snow' ? 70 : petals || leaves ? 22 : 0;
  while (particles.length < maxP && chance(w === 'rain' ? 0.9 : 0.3)) {
    const kind = w === 'rain' ? 'rain' : w === 'snow' ? 'snow' : petals ? 'petal' : 'leaf';
    particles.push({ k: kind, x: rand(-20, viewW + 20), y: rand(-40, -5), v: kind === 'rain' ? rand(420, 560) : rand(22, 50), s: rand(0, 6.28) });
  }
  for (const p of particles) {
    if (p.k === 'rain') { p.y += p.v * dt; p.x -= p.v * dt * 0.18; }
    else { p.y += p.v * dt; p.s += dt * 2; p.x += Math.sin(p.s) * 0.6 + (p.k === 'snow' ? 0 : 0.4); }
  }
  particles = particles.filter((p) => p.y < viewH + 20 && (maxP > 0 || p.y < viewH));
  if (particles.length > maxP + 30) particles.length = maxP;
}
function drawParticles(g) {
  for (const p of particles) {
    if (p.k === 'rain') P(g, Math.round(p.x), Math.round(p.y), 1, 7, 'rgba(180,210,255,.55)');
    else if (p.k === 'snow') P(g, Math.round(p.x), Math.round(p.y), 3, 3, 'rgba(255,255,255,.9)');
    else if (p.k === 'petal') P(g, Math.round(p.x), Math.round(p.y), 3, 2, '#ffb3d1');
    else P(g, Math.round(p.x), Math.round(p.y), 3, 2, '#e8862a');
  }
}

/* ---------- エフェクト ---------- */
function addFloat(wx, wy, text, color, scale = 1) { floats.push({ x: wx * 16, y: wy * 16, t: 0, text, color, scale }); if (floats.length > 60) floats.shift(); }
function addEffect(type, wx, wy) {
  if (type === 'dust') for (let i = 0; i < 14; i++) effects.push({ type: 'p', x: wx * 16, y: wy * 16, vx: rand(-40, 40), vy: rand(-50, -5), t: 0, life: rand(0.4, 0.8), c: pick(['#ead4aa', '#c0cbdc', '#f4f4f4']) });
  if (type === 'sparkle') for (let i = 0; i < 18; i++) effects.push({ type: 'star', x: wx * 16 + rand(-12, 12), y: wy * 16 + rand(-8, 8), vx: rand(-10, 10), vy: rand(-45, -15), t: 0, life: rand(0.7, 1.3), c: pick(['#fee761', '#ffffff', '#ff97c1']) });
}
function fireworkBurst() {
  const vw = viewW / cam.z;
  const x = cam.x + rand(0.15, 0.85) * Math.min(vw, WORLD_W);
  const y = Math.max(cam.y, 0) + rand(20, 90);
  const col = pick(['#fee761', '#ff97c1', '#2ce8f5', '#63c74d', '#f77622', '#ffffff']);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const sp = rand(30, 55);
    effects.push({ type: 'fw', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: rand(1, 1.5), c: col });
  }
  SE('fw');
}
function updateEffects(dt) {
  for (const e of effects) {
    e.t += dt;
    if (e.type === 'p' || e.type === 'star') { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 60 * dt; }
    if (e.type === 'fw') { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 18 * dt; e.vx *= 0.985; }
  }
  effects = effects.filter((e) => e.t < e.life);
  for (const f of floats) { f.t += dt; f.y -= 14 * dt; }
  floats = floats.filter((f) => f.t < 1.4);
}

/* ---------- メイン描画 ---------- */
function render(dt) {
  frameCount++;
  if (!S) return;
  if (staticDirty) buildStatic();
  const s = cam.z * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1a2238';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.imageSmoothingEnabled = false;
  const tx = Math.round(-cam.x * s), ty = Math.round(-cam.y * s);
  ctx.setTransform(s, 0, 0, s, tx, ty);
  ctx.drawImage(staticCv, 0, 0);
  const t = performance.now() / 1000;
  const dark = darkness();
  const h = hourNow();

  // グリッド
  if (S.settings.grid || UI.mode === 'build' || UI.mode === 'road') {
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    for (let x = 0; x <= MAP_W; x++) ctx.fillRect(x * 16, 0, 0.5, WORLD_H);
    for (let y = 0; y <= MAP_H; y++) ctx.fillRect(0, y * 16, WORLD_W, 0.5);
  }
  // ゴミ
  for (let i = 0; i < NT; i++) {
    const n = S.litter[i];
    if (!n) continue;
    const x = (i % MAP_W) * 16, y = ((i / MAP_W) | 0) * 16;
    for (let k = 0; k < n; k++) {
      const a = Math.floor(hash2(i, k, 31) * 11) + 2, b = Math.floor(hash2(i, k, 32) * 10) + 3;
      P(ctx, x + a, y + b, 2, 1, k % 2 ? '#f4f4f4' : '#feae34'); P(ctx, x + a, y + b + 1, 1, 1, '#8b9bb4');
    }
  }
  // 建物アニメ
  for (const b of S.buildings) {
    const ox = b.x * 16, oy = b.y * 16;
    switch (b.id) {
      case 'fountain': {
        const k = Math.floor(t * 6) % 3;
        const wc = curSeason() === 3 ? null : '#9fe8ff';
        if (wc) {
          P(ctx, ox + 15, oy + 1 - k % 2, 2, 4, wc);
          for (let i = 0; i < 4; i++) { const ph = (t * 1.5 + i / 4) % 1; P(ctx, ox + 16 + (i % 2 ? -1 : 1) * Math.round(ph * 9), oy + 3 + Math.round(ph * ph * 10), 1, 1, '#d6f7ff'); P(ctx, ox + 16 + (i % 2 ? 1 : -1) * Math.round(ph * 6), oy + 3 + Math.round(ph * ph * 12), 1, 1, '#ffffff'); }
          P(ctx, ox + 8 + k * 3, oy + 20, 3, 1, '#2ce8f5'); P(ctx, ox + 20 - k * 2, oy + 14, 3, 1, '#2ce8f5');
        }
        break;
      }
      case 'ferris': {
        const cx = ox + 16, cy = oy + 13, r = 11;
        ctx.fillStyle = '#c0cbdc';
        for (let a = 0; a < 48; a++) { const an = a / 48 * Math.PI * 2; ctx.fillRect(Math.round(cx + Math.cos(an) * r), Math.round(cy + Math.sin(an) * r), 1, 1); }
        const rot = t * 0.35;
        for (let i = 0; i < 8; i++) {
          const an = rot + i / 8 * Math.PI * 2;
          const ex = cx + Math.cos(an) * r, ey = cy + Math.sin(an) * r;
          for (let k = 1; k < r; k += 2) P(ctx, Math.round(cx + Math.cos(an) * k), Math.round(cy + Math.sin(an) * k), 1, 1, '#8b9bb4');
          P(ctx, Math.round(ex) - 2, Math.round(ey), 4, 3, ['#e43b44', '#fee761', '#0099db', '#63c74d'][i % 4]);
          P(ctx, Math.round(ex) - 1, Math.round(ey), 2, 1, '#d6f1fb');
        }
        P(ctx, cx - 1, cy - 1, 3, 3, '#5a6988');
        if (dark > 0.1) for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2 - rot; P(ctx, Math.round(cx + Math.cos(an) * r), Math.round(cy + Math.sin(an) * r), 1, 1, ['#fee761', '#ff97c1', '#2ce8f5'][(i + Math.floor(t * 3)) % 3]); }
        break;
      }
      case 'koban':
        if (Math.floor(t * 2) % 2) P(ctx, ox + 7, oy, 2, 2, '#ff8a80');
        break;
      case 'pond': {
        const a = t * 0.7;
        P(ctx, Math.round(ox + 16 + Math.cos(a) * 7), Math.round(oy + 16 + Math.sin(a) * 4), 3, 2, '#f77622');
        P(ctx, Math.round(ox + 14 + Math.cos(-a * 1.3 + 2) * 6), Math.round(oy + 15 + Math.sin(-a * 1.3 + 2) * 5), 3, 2, '#f4f4f4');
        break;
      }
      case 'sento': case 'spa': {
        if (h >= B[b.id].hours[0]) {
          const W = B[b.id].size[0] * 16;
          for (let i = 0; i < 3; i++) { const ph = (t * 0.5 + i / 3) % 1; ctx.globalAlpha = 0.6 * (1 - ph); P(ctx, Math.round(ox + W - 5 + Math.sin(ph * 6 + i) * 2), Math.round(oy - ph * 12), 3, 2, '#f4f4f4'); }
          ctx.globalAlpha = 1;
        }
        break;
      }
      case 'xmas':
        for (const L of b._lights || []) if ((Math.floor(t * 3) + L.x + L.y) % 3 === 0) P(ctx, L.x, L.y, 1, 1, '#ffffff');
        break;
      case 'flagi':
        if (Math.floor(t * 3) % 2) P(ctx, ox + 11, oy + 3, 1, 9, '#e43b44');
        break;
    }
    // 夜の窓明かり
    if (dark > 0.08 && b._lights) {
      const d = B[b.id];
      const open = isOpen(d, h);
      for (const L of b._lights) {
        if (L.k === 'win' && open) P(ctx, L.x, L.y, L.w, L.h, '#ffe28a');
        if (L.k === 'vend') P(ctx, L.x, L.y, L.w, L.h, '#f4fbff');
      }
    }
    // 満員
    if (b._inside && b._inside >= capOf(b) && capOf(b) > 1) {
      const W = B[b.id].size[0] * 16;
      P(ctx, ox + W - 7, oy - 2, 7, 5, '#e43b44'); P(ctx, ox + W - 6, oy - 1, 5, 3, '#fee761');
    }
    // 道に面していない警告
    const d = B[b.id];
    if (isShop(d) && d.id !== 'bench' && (!b._acc || !b._acc.length) && Math.floor(t * 2) % 2) {
      const W = d.size[0] * 16;
      P(ctx, ox + W / 2 - 3, oy + 2, 7, 7, '#e43b44'); P(ctx, ox + W / 2, oy + 3, 1, 3, '#ffffff'); P(ctx, ox + W / 2, oy + 7, 1, 1, '#ffffff');
    }
  }
  // 猫
  if (S.flags.cat) {
    const cx = (GATE_X + 1.1) * 16 + Math.round(Math.sin(t * 0.4) * 6), cy = (GATE_Y - 1) * 16 + 6;
    ctx.drawImage(iconCanvas('cat'), cx, cy);
  }
  // 客 (y順)
  const vis = customers.filter((c) => c.state !== 'inside').sort((a, b) => a.y - b.y);
  const rainy = S.weather === 'rain' || S.weather === 'snow';
  for (const c of vis) {
    const moving = c.state === 'walk' || c.state === 'leave';
    const frame = moving ? Math.floor(c.anim / 7) % 2 : 0;
    const wx = c.x * 16 + c.ox, wy = c.y * 16 + 2 + c.oy;
    const alpha = c.alpha;
    if (c.type === 'couple') {
      const off = c.dir >= 2 ? 0 : 3;
      drawPersonAt(ctx, partnerOf(c.look), wx + off, wy - (c.dir >= 2 ? 2 : 0), c.dir, frame, alpha);
      drawPersonAt(ctx, c.look, wx - off, wy, c.dir, frame, alpha);
    } else drawPersonAt(ctx, c.look, wx, wy, c.dir, frame, alpha);
    const topY = Math.round(wy - 13 + (c.type === 'kid' ? 2 : 0));
    if (rainy && S.weather === 'rain') {
      const uc = c.look.shirt;
      const ux = Math.round(wx - 5);
      P(ctx, ux + 3, topY - 4, 4, 1, uc); P(ctx, ux + 1, topY - 3, 8, 1, uc); P(ctx, ux, topY - 2, 10, 1, shade(uc, -30)); P(ctx, ux + 5, topY - 1, 1, 3, '#3a2a22');
    }
    if (c.type === 'celeb' && Math.floor(t * 4) % 2) P(ctx, Math.round(wx + 4), topY, 1, 1, '#ffffff');
    if (c.thought) {
      const bx = Math.round(wx - 5), by = topY - 13;
      P(ctx, bx, by, 11, 10, '#1a1c2c'); P(ctx, bx + 1, by + 1, 9, 8, '#ffffff'); P(ctx, bx + 4, by + 10, 2, 1, '#1a1c2c'); P(ctx, bx + 5, by + 9, 1, 1, '#ffffff');
      ctx.drawImage(iconCanvas(c.thought.icon), bx + 1, by + 1, 8, 8);
    } else if (c.state === 'wait' && Math.floor(t * 2) % 2) {
      P(ctx, Math.round(wx - 3), topY - 3, 1, 1, '#ffffff'); P(ctx, Math.round(wx), topY - 3, 1, 1, '#ffffff'); P(ctx, Math.round(wx + 3), topY - 3, 1, 1, '#ffffff');
    }
    if (UI.selectedCust === c) {
      const bob = Math.round(Math.sin(t * 6) * 1.5);
      P(ctx, Math.round(wx - 2), topY - 6 + bob, 5, 1, '#fee761'); P(ctx, Math.round(wx - 1), topY - 5 + bob, 3, 1, '#fee761'); P(ctx, Math.round(wx), topY - 4 + bob, 1, 1, '#fee761');
    }
  }
  // 門のアーチ (前景)
  {
    const gx = (GATE_X - 1) * 16 + 8, gy = GATE_Y * 16 - 6;
    P(ctx, gx + 2, gy + 2, 4, 6, '#a22633'); P(ctx, gx + 26, gy + 2, 4, 6, '#a22633');
    P(ctx, gx, gy, 32, 5, '#e43b44'); P(ctx, gx, gy, 32, 1, '#f6757a'); P(ctx, gx - 2, gy - 1, 36, 2, '#1a1c2c');
    P(ctx, gx + 9, gy + 5, 14, 7, '#1a1c2c'); P(ctx, gx + 10, gy + 6, 12, 5, '#fee761');
    ctx.drawImage(iconCanvas('star'), gx + 12, gy + 5, 8, 6);
  }
  // 選択中の建物
  if (UI.selected && bmap.has(UI.selected.uid)) {
    const b = UI.selected, d = B[b.id];
    const blink = Math.floor(t * 3) % 2 ? '#fee761' : '#ffffff';
    strokeRectPx(ctx, b.x * 16 - 1, b.y * 16 - 1, d.size[0] * 16 + 2, d.size[1] * 16 + 2, blink);
    if (d.radius) drawRadius(ctx, b.x, b.y, d.size, d.radius, 'rgba(254,231,97,.14)');
  }
  // ゴースト
  if (UI.mode === 'build' && UI.ghost) {
    const gh = UI.ghost, d = B[gh.id];
    const ok = canPlace(gh.id, gh.x, gh.y).ok && S.money >= d.cost;
    if (d.radius) drawRadius(ctx, gh.x, gh.y, d.size, d.radius, 'rgba(99,199,77,.16)');
    ctx.globalAlpha = 0.8;
    ctx.drawImage(buildingPreview(gh.id), gh.x * 16, gh.y * 16);
    ctx.globalAlpha = 1;
    ctx.fillStyle = ok ? 'rgba(99,199,77,.28)' : 'rgba(228,59,68,.4)';
    ctx.fillRect(gh.x * 16, gh.y * 16, d.size[0] * 16, d.size[1] * 16);
    strokeRectPx(ctx, gh.x * 16, gh.y * 16, d.size[0] * 16, d.size[1] * 16, ok ? '#63c74d' : '#e43b44');
  }
  if ((UI.mode === 'road' || UI.mode === 'remove') && UI.hover) {
    const col = UI.mode === 'road' ? '#fee761' : '#e43b44';
    strokeRectPx(ctx, UI.hover.x * 16, UI.hover.y * 16, 16, 16, col);
    const hb = UI.mode === 'remove' ? bAt(UI.hover.x, UI.hover.y) : null;
    if (hb) { const d = B[hb.id]; ctx.fillStyle = 'rgba(228,59,68,.3)'; ctx.fillRect(hb.x * 16, hb.y * 16, d.size[0] * 16, d.size[1] * 16); }
  }
  // エフェクト
  for (const e of effects) {
    const a = 1 - e.t / e.life;
    ctx.globalAlpha = Math.max(0, a);
    if (e.type === 'p') P(ctx, Math.round(e.x), Math.round(e.y), 2, 2, e.c);
    else if (e.type === 'star') { P(ctx, Math.round(e.x), Math.round(e.y) - 1, 1, 3, e.c); P(ctx, Math.round(e.x) - 1, Math.round(e.y), 3, 1, e.c); }
    ctx.globalAlpha = 1;
  }
  // 夜
  if (dark > 0.01) {
    lg.globalCompositeOperation = 'source-over';
    lg.clearRect(0, 0, WORLD_W, WORLD_H);
    lg.fillStyle = `rgba(12,16,46,${dark})`;
    lg.fillRect(0, 0, WORLD_W, WORLD_H);
    lg.globalCompositeOperation = 'destination-out';
    const glows = [];
    for (const b of S.buildings) {
      if (!b._lights) continue;
      const open = isOpen(B[b.id], h);
      for (const L of b._lights) {
        if (L.k === 'win') { if (open) { lg.fillStyle = 'rgba(0,0,0,.85)'; lg.fillRect(L.x - 1, L.y - 1, L.w + 2, L.h + 3); } }
        else if (L.k === 'vend') { lg.fillStyle = 'rgba(0,0,0,.9)'; lg.fillRect(L.x - 2, L.y - 2, L.w + 4, L.h + 6); }
        else { const r = L.k === 'lamp' ? 40 : L.k === 'lan' ? 20 : L.k === 'red' ? 10 : 6; glows.push({ x: L.x, y: L.y, r, k: L.k }); }
      }
    }
    for (const gl of glows) {
      const gr = lg.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, gl.r);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      lg.fillStyle = gr; lg.fillRect(gl.x - gl.r, gl.y - gl.r, gl.r * 2, gl.r * 2);
    }
    for (const e of effects) if (e.type === 'fw') { lg.fillStyle = 'rgba(0,0,0,.5)'; lg.fillRect(e.x - 6, e.y - 6, 12, 12); }
    lg.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(lightCv, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'lighter';
    for (const gl of glows) {
      if (gl.k !== 'lamp' && gl.k !== 'lan') continue;
      const gr = ctx.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, gl.r * 0.7);
      gr.addColorStop(0, gl.k === 'lamp' ? `rgba(255,220,120,${0.35 * dark})` : `rgba(255,110,80,${0.45 * dark})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(gl.x - gl.r, gl.y - gl.r, gl.r * 2, gl.r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // 花火
  for (const e of effects) {
    if (e.type !== 'fw') continue;
    ctx.globalAlpha = Math.max(0, 1 - e.t / e.life);
    P(ctx, Math.round(e.x), Math.round(e.y), 2, 2, e.c);
    ctx.globalAlpha = 1;
  }
  // 画面座標
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  drawParticles(ctx);
  // 浮かぶ文字
  const fs = Math.round(clamp(8 * cam.z * 0.55, 11, 17));
  ctx.font = `${fs}px ${getComputedFont()}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const f of floats) {
    const p = worldToScreen(f.x, f.y);
    const a = f.t < 1 ? 1 : 1 - (f.t - 1) / 0.4;
    ctx.globalAlpha = Math.max(0, a);
    if (f.scale > 1) ctx.font = `${Math.round(fs * f.scale)}px ${getComputedFont()}`;
    ctx.lineWidth = 3; ctx.strokeStyle = '#1a1c2c';
    ctx.strokeText(f.text, p.x, p.y);
    ctx.fillStyle = f.color; ctx.fillText(f.text, p.x, p.y);
    if (f.scale > 1) ctx.font = `${fs}px ${getComputedFont()}`;
  }
  ctx.globalAlpha = 1;
}
let fontName = null;
function getComputedFont() {
  if (!fontName) fontName = '"DotGothic16", sans-serif';
  return fontName;
}
function strokeRectPx(g, x, y, w, h, c) {
  g.fillStyle = c;
  g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h);
}
function drawRadius(g, x, y, size, r, col) {
  const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(MAP_W, x + size[0] + r), y1 = Math.min(MAP_H, y + size[1] + r);
  g.fillStyle = col;
  g.fillRect(x0 * 16, y0 * 16, (x1 - x0) * 16, (y1 - y0) * 16);
}

/* ---------- タイトルの絵 ---------- */
function drawTitleArt() {
  const c = $('#title-canvas');
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, c.width, c.height);
  P(g, 0, 32, 176, 16, '#5d6477');
  P(g, 0, 32, 176, 2, '#a7b0c2'); P(g, 0, 46, 176, 2, '#a7b0c2');
  for (let x = 4; x < 176; x += 12) P(g, x, 39, 6, 1, '#e9e0b8');
  const row = [['lamp', 0], ['bakery', 16], ['ramen', 32], ['sakura', 64], ['cafe', 80], ['zakka', 112], ['teahouse', 128], ['tree', 144], ['vending', 160]];
  for (const [id, x] of row) drawBuilding(g, id, id === 'ramen' ? 3 : 1, x, 16, null);
  const L1 = { type: 'student', skin: '#f5c9a0', hair: '#1a1c2c', shirt: '#124e89', pants: '#262b44', girl: true, key: 't1' };
  const L2 = { type: 'salaryman', skin: '#eab48a', hair: '#3a2a22', shirt: '#3a4466', pants: '#3a4466', girl: false, key: 't2' };
  const L3 = { type: 'kid', skin: '#f7d7b5', hair: '#733e39', shirt: '#e43b44', pants: '#124e89', girl: false, key: 't3' };
  g.drawImage(personSprite(L1, 3, 0), 50, 30);
  g.drawImage(personSprite(L2, 2, 1), 98, 31);
  g.drawImage(personSprite(L3, 0, 0), 140, 33);
}

/* ================================================================
   11. サウンド (WebAudio)
   ================================================================ */
let AC = null, master = null, seGain = null, bgmGain = null;
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.connect(AC.destination);
    seGain = AC.createGain(); seGain.connect(master);
    bgmGain = AC.createGain(); bgmGain.connect(master);
    applyVolume();
  } catch (e) { AC = null; }
}
function applyVolume() {
  if (!AC || !S) return;
  master.gain.value = S.settings.vol;
  seGain.gain.value = S.settings.se ? 0.5 : 0;
  bgmGain.gain.value = S.settings.bgm ? 0.22 : 0;
}
function tone(freq, dur, type = 'square', vol = 0.2, when = 0, slide = 0, dest = null) {
  if (!AC) return;
  const t0 = AC.currentTime + when;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  o.connect(g); g.connect(dest || seGain);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur, vol = 0.1, when = 0, dest = null, hp = 3000) {
  if (!AC) return;
  const t0 = AC.currentTime + when;
  const len = Math.max(1, Math.floor(AC.sampleRate * dur));
  const buf = AC.createBuffer(1, len, AC.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = AC.createBufferSource(); src.buffer = buf;
  const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(dest || seGain);
  src.start(t0);
}
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let lastCoin = 0;
function SE(name) {
  if (!AC || !S || !S.settings.se) return;
  switch (name) {
    case 'click': tone(880, 0.05, 'square', 0.08); break;
    case 'build': tone(220, 0.08, 'square', 0.15); tone(330, 0.08, 'square', 0.15, 0.07); tone(440, 0.12, 'square', 0.15, 0.14); noise(0.15, 0.08, 0, null, 800); break;
    case 'road': tone(160, 0.05, 'triangle', 0.15); break;
    case 'remove': noise(0.2, 0.15, 0, null, 400); tone(200, 0.15, 'sawtooth', 0.08, 0, 0.5); break;
    case 'coin': { const now = performance.now(); if (now - lastCoin < 90) return; lastCoin = now; tone(1318, 0.06, 'square', 0.07); tone(1760, 0.14, 'square', 0.07, 0.05); break; }
    case 'err': tone(180, 0.12, 'square', 0.12); tone(140, 0.18, 'square', 0.12, 0.1); break;
    case 'levelup': [60, 64, 67, 72, 76].forEach((m, i) => tone(mtof(m + 12), 0.12, 'square', 0.12, i * 0.07)); break;
    case 'combo': [72, 76, 79, 84, 79, 84, 88].forEach((m, i) => tone(mtof(m), 0.1, 'square', 0.11, i * 0.06)); break;
    case 'clear': [67, 72, 76, 79].forEach((m, i) => tone(mtof(m + 12), 0.1, 'triangle', 0.18, i * 0.08)); break;
    case 'fanfare': [[60, 0], [60, 0.12], [60, 0.24], [67, 0.36], [65, 0.6], [67, 0.72], [72, 0.84]].forEach(([m, w]) => { tone(mtof(m + 12), 0.2, 'square', 0.13, w); tone(mtof(m), 0.2, 'triangle', 0.15, w); }); break;
    case 'fw': noise(0.5, 0.08, 0, null, 600); tone(300, 0.5, 'sine', 0.05, 0, 0.3); break;
    case 'open': tone(660, 0.05, 'square', 0.07); tone(990, 0.06, 'square', 0.07, 0.04); break;
  }
}
/* ---- BGM シーケンサー ---- */
const SONGS = {
  day: {
    bpm: 116, wave: 'square', vol: 0.09,
    mel: [72, 0, 76, 0, 79, 0, 76, 74, 72, 0, 74, 76, 77, 0, 76, 0, 74, 0, 77, 0, 81, 0, 79, 77, 76, 74, 72, 0, 67, 0, 0, 0,
      69, 0, 72, 0, 76, 0, 74, 72, 71, 0, 72, 74, 76, 0, 79, 0, 77, 76, 74, 72, 74, 0, 76, 0, 72, 0, 0, 0, 79, 0, 81, 83],
    bass: [48, 53, 50, 55, 45, 52, 53, 55],
  },
  night: {
    bpm: 84, wave: 'triangle', vol: 0.16,
    mel: [69, 0, 0, 72, 76, 0, 74, 0, 72, 0, 71, 0, 69, 0, 0, 0, 65, 0, 0, 69, 72, 0, 71, 0, 69, 0, 68, 0, 71, 0, 0, 0,
      69, 0, 0, 72, 76, 0, 79, 0, 77, 0, 76, 0, 74, 0, 0, 0, 72, 0, 74, 0, 71, 0, 68, 0, 69, 0, 0, 0, 0, 0, 0, 0],
    bass: [45, 50, 53, 52, 45, 50, 52, 45],
  },
  fest: {
    bpm: 132, wave: 'square', vol: 0.08,
    mel: [74, 0, 76, 74, 71, 0, 69, 0, 71, 71, 74, 0, 76, 0, 0, 0, 79, 0, 76, 74, 76, 0, 74, 71, 69, 0, 71, 0, 74, 0, 0, 0,
      74, 0, 76, 79, 81, 0, 79, 76, 74, 0, 76, 74, 71, 0, 69, 0, 67, 69, 71, 0, 74, 0, 71, 69, 67, 0, 0, 0, 0, 0, 0, 0],
    bass: [43, 50, 43, 50, 48, 50, 43, 43],
  },
};
let bgm = { song: null, step: 0, next: 0, timer: null };
function currentSongName() {
  if (!S) return 'day';
  const ev = seasonEventToday();
  if (ev && (ev.fireworks || ev.halloween || S.month === 1 || S.month === 11)) return 'fest';
  const h = S.minute / 60;
  return h >= 18.5 ? 'night' : 'day';
}
function bgmStart() {
  if (!AC || bgm.timer) return;
  bgm.next = AC.currentTime + 0.1;
  bgm.timer = setInterval(bgmTick, 90);
}
function bgmTick() {
  if (!AC || !S) return;
  const name = currentSongName();
  if (bgm.song !== name) { bgm.song = name; bgm.step = 0; }
  const song = SONGS[name];
  const stepDur = 60 / song.bpm / 2;
  while (bgm.next < AC.currentTime + 0.35) {
    const when = bgm.next - AC.currentTime;
    if (S.settings.bgm && !(UI.paused)) {
      const m = song.mel[bgm.step % song.mel.length];
      if (m) tone(mtof(m), stepDur * 1.6, song.wave, song.vol, when, 0, bgmGain);
      const bar = Math.floor(bgm.step / 8) % song.bass.length;
      const r = song.bass[bar];
      const bp = [r, 0, r + 12, 0, r, 0, r + 7, 0][bgm.step % 8];
      if (bp) tone(mtof(bp), stepDur * 0.9, 'triangle', 0.2, when, 0, bgmGain);
      if (bgm.step % 2 === 1) noise(0.03, name === 'night' ? 0.015 : 0.03, when, bgmGain, 7000);
      if (bgm.step % 8 === 0 && name !== 'night') tone(90, 0.1, 'sine', 0.25, when, 0.4, bgmGain);
    }
    bgm.step++;
    bgm.next += stepDur;
  }
}

/* ================================================================
   12. UI
   ================================================================ */
const UI = {
  mode: 'select', buildId: null, roadType: 'road', ghost: null, hover: null,
  selected: null, selectedCust: null, tab: 'food', modalOpen: false, modalQueue: [],
  speed: 1, paused: false, choice: null, infoTimer: 0, pendingConfirm: null,
};
const el = {
  title: $('#title-screen'), game: $('#game-screen'), money: $('#hud-money'), date: $('#hud-date'), time: $('#hud-time'),
  weather: $('#hud-weather'), rank: $('#hud-rank'), pop: $('#hud-pop'), guests: $('#hud-guests'), rp: $('#hud-rp'),
  ticker: $('#ticker-text'), modeBar: $('#mode-bar'), modeText: $('#mode-text'), confirmBar: $('#confirm-bar'), confirmText: $('#confirm-text'),
  info: $('#info-panel'), sheet: $('#build-sheet'), tabs: $('#build-tabs'), list: $('#build-list'), modal: $('#modal'), modalTitle: $('#modal-title'),
  modalBody: $('#modal-body'), toasts: $('#toasts'), banner: $('#event-banner'), fade: $('#fade'), toolbar: $('#toolbar'),
};

function toast(msg, cls = '', life = 2.6) {
  const d = document.createElement('div');
  d.className = 'toast pix ' + cls;
  d.textContent = msg;
  d.style.setProperty('--life', life + 's');
  el.toasts.appendChild(d);
  while (el.toasts.children.length > 3) el.toasts.firstChild.remove();
  setTimeout(() => d.remove(), (life + 0.4) * 1000);
}
/* ---- ティッカー ---- */
const tickerQ = [];
let tickerX = 0, tickerW = 0;
const TIPS = [
  '会長「お客さんは道しか歩けん。店は必ず道に面して建てるんじゃ」',
  '会長「装飾は周りの店の魅力を上げるぞい。魅力が高いほど客が選んでくれる」',
  '会長「特定の店を1マス以内に並べるとコンボ発見じゃ！図鑑にヒントがあるぞ」',
  '会長「トイレとベンチを忘れるでないぞ。客の不満は人気を下げる」',
  '会長「ゴミはタップで拾えるぞ。ゴミ箱を置けばポイ捨てが減る」',
  '会長「店はお客さんが来るほど経験値がたまる。改装で大きく育てよう」',
  '会長「スタッフのやる気が0になると辞めてしまう。ボーナスで労うのじゃ」',
  '会長「土曜と日曜はお客さんが多い。宣伝のタイミングも大事じゃぞ」',
  '会長「毎年3月末に全国商店街ランキングが発表される。目指せ日本一！」',
  '会長「夜は街灯が明るく照らす。夜の街の魅力もあなどれんぞ」',
];
function news(msg) { tickerQ.push(msg); if (tickerQ.length > 8) tickerQ.shift(); }
function updateTicker(dt) {
  tickerX -= 55 * dt;
  if (tickerX < -tickerW - 20) {
    const next = tickerQ.length ? '📰 ' + tickerQ.shift() : (S && S.comments.length && chance(0.4) ? '💬 ' + S.comments[Math.floor(Math.random() * Math.min(8, S.comments.length))].t : pick(TIPS));
    el.ticker.textContent = next;
    tickerW = el.ticker.offsetWidth;
    tickerX = el.ticker.parentElement.offsetWidth + 10;
  }
  el.ticker.style.transform = `translateX(${Math.round(tickerX)}px)`;
}
function showEventBanner() {
  if (!S) return;
  const ev = seasonEventToday();
  const parts = [];
  if (ev) parts.push('🎉 ' + ev.name);
  if (S.buffs.some((b) => b.type === 'typhoon')) parts.push('🌀 台風');
  if (S.feature && bmap.get(S.feature.uid)) parts.push('📖 雑誌掲載中');
  if (S.ads.length) parts.push('📣 宣伝中');
  if (parts.length) { el.banner.textContent = parts.join('　'); el.banner.classList.remove('hidden'); }
  else el.banner.classList.add('hidden');
}
function fadeFx() {
  el.fade.classList.remove('hidden');
  el.fade.style.animation = 'none';
  void el.fade.offsetWidth;
  el.fade.style.animation = '';
  setTimeout(() => el.fade.classList.add('hidden'), 950);
}

/* ---- HUD ---- */
const hudCache = {};
function setText(node, key, text) { if (hudCache[key] !== text) { hudCache[key] = text; node.textContent = text; } }
function updateHUD() {
  if (!S) return;
  setText(el.money, 'm', yen(S.money));
  el.money.classList.toggle('neg', S.money < 0);
  setText(el.date, 'd', dateLabel());
  setText(el.time, 't', '🕒 ' + timeLabel());
  setText(el.weather, 'w', WEATHER[S.weather].name + '・' + SEASON_NAME[curSeason()]);
  setText(el.rank, 'r', '★' + S.rank + ' ' + RANKS[S.rank].name);
  setText(el.pop, 'p', '人気 ' + Math.floor(S.pop));
  setText(el.guests, 'g', '客 ' + customers.length + '人');
  setText(el.rp, 'rp', 'RP ' + S.rp);
  document.querySelectorAll('.spd').forEach((b) => b.classList.toggle('on', +b.dataset.speed === UI.speed));
}
function updateGoalBadge() {
  const b = $('#badge-goals');
  if (!S) return;
  const p = rankProgress();
  const ready = p && p.items.every((i) => i.cur >= i.need);
  const buyable = LANDS.some((L) => !S.lands.includes(L.id) && S.rank >= L.rank && S.money >= L.cost);
  if (ready || buyable) { b.textContent = '!'; b.classList.remove('hidden'); } else b.classList.add('hidden');
}

/* ---- モード ---- */
function setMode(mode, opt) {
  UI.mode = mode;
  UI.ghost = null; UI.hover = null;
  el.confirmBar.classList.add('hidden');
  if (mode === 'select') { el.modeBar.classList.add('hidden'); cv.style.cursor = 'grab'; return; }
  closeInfo();
  if (mode === 'build') { UI.buildId = opt; const d = B[opt]; el.modeText.textContent = `${d.name}（${yen(d.cost)}）場所をタップ`; cv.style.cursor = 'crosshair'; }
  if (mode === 'road') { UI.roadType = opt; const r = ROADS[opt]; el.modeText.textContent = `${r.name}（1マス${yen(r.cost)}）なぞって敷く`; cv.style.cursor = 'cell'; }
  if (mode === 'remove') { el.modeText.textContent = '撤去：タップ／なぞって削除'; cv.style.cursor = 'not-allowed'; }
  el.modeBar.classList.remove('hidden');
}

/* ---- 建設シート ---- */
function openBuild() {
  closeInfo();
  const tb = el.toolbar.getBoundingClientRect();
  el.sheet.style.bottom = (window.innerHeight - tb.top) + 'px';
  el.sheet.classList.remove('hidden');
  renderBuildTabs(); renderBuildList();
  SE('open');
}
function closeBuild() { el.sheet.classList.add('hidden'); }
function renderBuildTabs() {
  el.tabs.innerHTML = TAB_ORDER.map((t) => `<button class="tab${UI.tab === t ? ' on' : ''}" data-action="build-tab" data-tab="${t}">${CATS[t].name}</button>`).join('');
}
function lockReason(o) {
  if (S.rank < o.rank) return `ランク${o.rank}「${RANKS[o.rank].name}」で研究可能`;
  return `研究で解放（${o.rp} RP）`;
}
function renderBuildList() {
  let html = '';
  if (UI.tab === 'road') {
    for (const r of Object.values(ROADS)) {
      const un = S.unlocked[r.id];
      html += `<button class="card${un ? '' : ' locked'}${S.money < r.cost ? ' cant' : ''}" data-action="pick-road" data-id="${r.id}"><img src="${iconURL(r.icon)}" alt=""><div><div class="c-name">${r.name}</div><div class="c-sub">${un ? r.desc : lockReason(r)}</div><div class="c-cost">${yen(r.cost)}/マス</div></div></button>`;
    }
    html += `<button class="card" data-action="pick-remove"><img src="${iconURL('bulldoze')}" alt=""><div><div class="c-name">撤去</div><div class="c-sub">道・建物・木や岩を撤去</div><div class="c-cost">建物は4割返金</div></div></button>`;
  } else {
    for (const d of Object.values(B)) {
      if (d.cat !== UI.tab) continue;
      const un = S.unlocked[d.id];
      const sub = un ? `${d.size[0]}×${d.size[1]}　${d.price ? '単価' + yenShort(d.price) : d.appeal ? '魅力+' + d.appeal : ''}` : lockReason(d);
      html += `<button class="card${un ? '' : ' locked'}${S.money < d.cost ? ' cant' : ''}" data-action="pick-build" data-id="${d.id}"><img src="${iconURL(d.icon)}" alt=""><div><div class="c-name">${d.name}${un ? '' : ' 🔒'}</div><div class="c-sub">${sub}</div><div class="c-cost">${yen(d.cost)}</div></div></button>`;
    }
  }
  el.list.innerHTML = html;
}

/* ---- 情報パネル ---- */
function closeInfo() { UI.selected = null; UI.selectedCust = null; el.info.classList.add('hidden'); }
function openInfoBuilding(b) { UI.selected = b; UI.selectedCust = null; renderInfo(); el.info.classList.remove('hidden'); }
function openInfoCust(c) { UI.selectedCust = c; UI.selected = null; renderInfo(); el.info.classList.remove('hidden'); }
function pips(v) { const n = Math.round(v / 20); let s = '<span class="stat-pips">'; for (let i = 0; i < 5; i++) s += `<i class="${i < n ? 'on' : ''}"></i>`; return s + '</span>'; }
function bar(v, max, cls = '') { return `<div class="bar ${cls}"><i style="width:${clamp(v / max * 100, 0, 100)}%"></i></div>`; }
function renderInfo() {
  if (UI.selected) {
    const b = UI.selected, d = B[b.id];
    if (!bmap.has(b.uid)) { closeInfo(); return; }
    let h = `<div class="ip-head"><img src="${iconURL(d.icon)}" alt=""><h3>${d.name}${d.cat !== 'deco' ? ' <span class="gold">Lv' + b.lvl + '</span>' : ''}<small>${CATS[d.cat].name}　${d.desc}</small></h3><button class="btn btn-icon" data-action="info-close" aria-label="閉じる">✕</button></div>`;
    if (d.cat === 'deco' || (!d.serves.length)) {
      h += `<div class="ip-grid"><div>魅力 <b>+${d.appeal}</b></div>${d.radius ? `<div>効果範囲 <b>${d.radius}マス</b></div>` : ''}</div>`;
      if (d.id === 'parking') h += `<p class="note">家族連れ・主婦の来客と全体の客数が増えます。</p>`;
      if (d.id === 'busstop') h += `<p class="note">${b._acc && b._acc.length ? 'お客さんの出入口として機能中' : '⚠ 道に面していないため機能していません'}</p>`;
    } else {
      const u = upgradeInfo(b);
      const open = isOpen(d, hourNow());
      h += `<div class="ip-grid">
        <div>魅力 <b>${b._appeal || 0}</b></div><div>客 <b>${b._inside || 0}/${capOf(b)}</b></div>
        <div>価格 <b>${d.price ? yen(priceOf(b)) : '無料'}</b></div><div>営業 <b class="${open ? 'good' : 'badc'}">${open ? '営業中' : '準備中'} ${d.hours[0]}-${d.hours[1]}時</b></div>
        <div>来店数 <b>${b.visits.toLocaleString()}</b></div><div>今月 <b>${yenShort(b.msales)}</b></div>
        <div>累計売上 <b>${yenShort(b.sales)}</b></div><div>維持費 <b>${yenShort(Math.round(d.maint * (1 + (b.lvl - 1) * 0.25)))}/月</b></div>
      </div>`;
      if (b._combo) h += `<div class="gold" style="font-size:12px">★ コンボ「${esc(b._combo)}」魅力×1.25・売上×1.1</div>`;
      if (S.feature && S.feature.uid === b.uid) h += `<div class="gold" style="font-size:12px">📖 雑誌掲載中（あと${S.feature.days}日）</div>`;
      if (!b._acc || !b._acc.length) h += `<div class="ip-warn">⚠ 道に面していないため、お客さんが入れません</div>`;
      if (u) {
        h += `<div class="ip-label">改装まで 経験値 ${Math.min(b.xp, u.needXp)}/${u.needXp}</div>${bar(b.xp, u.needXp, 'gold')}`;
        h += `<div class="ip-row"><button class="btn ${u.ready ? 'btn-gold' : ''}" data-action="upgrade" ${u.ready ? '' : 'disabled'}>Lv${b.lvl + 1}に改装 ${yen(u.cost)}</button></div>`;
      } else if (b.lvl >= 5) h += `<div class="ip-label gold">最大レベル！</div>`;
      if (d.price) {
        const mods = [[0.8, '安め'], [1, '普通'], [1.2, '高め'], [1.5, '強気']];
        h += `<div class="ip-label">価格設定（高いほど売上↑・満足度と客足↓）</div><div class="ip-row">` + mods.map(([m, n]) => `<button class="btn btn-small${b.priceMod === m ? ' on' : ''}" data-action="price" data-v="${m}">${n}</button>`).join('') + `</div>`;
      }
      if (d.staff) {
        const st = staffOf(b), slots = staffSlots(b);
        h += `<div class="ip-label">スタッフ ${st.length}/${slots}</div><div class="ip-row">`;
        for (const s of st) h += `<button class="btn btn-small" data-action="unassign" data-sid="${s.id}">${esc(s.name)} ✕</button>`;
        if (st.length < slots) h += `<button class="btn btn-small btn-green" data-action="assign-pick">＋ 配置</button>`;
        h += `</div>`;
        if (st.length) { const e = staffEffect(b); h += `<div class="note">売上×${e.sales.toFixed(2)}　満足度+${e.sat.toFixed(0)}　時間×${e.time.toFixed(2)}</div>`; }
      }
    }
    const back = Math.round(d.cost * 0.4 * (1 + (b.lvl - 1) * 0.3));
    h += `<div class="ip-row" style="justify-content:flex-end"><button class="btn btn-small" data-action="demolish">撤去（${yenShort(back)}返金）</button></div>`;
    el.info.innerHTML = h;
  } else if (UI.selectedCust) {
    const c = UI.selectedCust, T = CUST[c.type];
    const stateText = { idle: '考え中…', walk: c.target && bmap.get(c.target) ? B[bmap.get(c.target).id].name + 'へ向かっている' : 'ぶらぶら散歩中', leave: '帰るところ', wait: '順番待ち', inside: '店内', fade: '…', exit: '帰宅' }[c.state] || '';
    let h = `<div class="ip-head"><img src="${custPortrait(c.look)}" alt=""><h3>${T.name}<small>${stateText}</small></h3><button class="btn btn-icon" data-action="info-close" aria-label="閉じる">✕</button></div>`;
    h += `<div class="ip-grid"><div>所持金 <b>${yen(c.money)}</b></div><div>使ったお金 <b>${yen(c.spent)}</b></div><div>立ち寄り <b>${c.visits}/${c.maxVisits}</b></div><div>ご機嫌 <b>${Math.round(c.happy)}</b></div></div>`;
    h += bar(c.happy, 100, c.happy < 35 ? 'red' : '');
    if (c.type !== 'thief') {
      h += `<div class="ip-grid" style="margin-top:8px">`;
      for (const n of NEEDS) h += `<div>${NEED_NAME[n]}${bar(c.needs[n], 100, c.needs[n] > 70 ? 'red' : 'gold')}</div>`;
      h += `</div>`;
      const likes = Object.entries(T.prefs).filter(([, v]) => v >= 2).map(([k]) => B[k] ? B[k].name : '').filter(Boolean).slice(0, 5);
      if (likes.length) h += `<div class="note">好きな店：${likes.join('、')}</div>`;
    } else h += `<div class="ip-warn">あやしい…。交番の近くなら捕まえられるかも</div>`;
    el.info.innerHTML = h;
  }
}
const portraitCache = new Map();
function custPortrait(L) {
  if (portraitCache.has(L.key)) return portraitCache.get(L.key);
  const sp = personSprite(L, 0, 0);
  const c = mkCanvas(40, 40), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(sp, 0, 0, 10, 14, 6, 2, 28, 39);
  const u = c.toDataURL();
  if (portraitCache.size > 200) portraitCache.clear();
  portraitCache.set(L.key, u);
  return u;
}

/* ---- モーダル ---- */
function openModal(title, html, opts = {}) {
  UI.modalOpen = true;
  UI.modalOnClose = opts.onClose || null;
  UI.modalRefresh = opts.refresh || null;
  el.modalTitle.textContent = title;
  el.modalBody.innerHTML = html;
  el.modal.classList.remove('hidden');
  el.modalBody.scrollTop = 0;
  if (opts.after) opts.after();
  const x = el.modal.querySelector('[data-action="modal-close"]');
  x.classList.toggle('hidden', !!opts.noClose);
}
function refreshModal(html) { const st = el.modalBody.scrollTop; el.modalBody.innerHTML = html; el.modalBody.scrollTop = st; }
function closeModal() {
  el.modal.classList.add('hidden');
  UI.modalOpen = false;
  const cb = UI.modalOnClose; UI.modalOnClose = null; UI.modalRefresh = null;
  if (cb) cb();
  if (UI.modalQueue.length && !UI.modalOpen) { const fn = UI.modalQueue.shift(); setTimeout(() => { if (!UI.modalOpen) fn(); else UI.modalQueue.unshift(fn); }, 120); }
}
function queueModal(fn) { if (UI.modalOpen) UI.modalQueue.push(fn); else fn(); }
function chairSays(text) { return `<div class="dialog-face"><img src="${chairFace()}" alt="会長"><div class="speech">${text}</div></div>`; }

/* 月次報告 */
function monthReport(label, cur, ex, profit, avgSat, topShops) {
  const cats = Object.entries(cur.byCat).sort((a, b) => b[1] - a[1]);
  let h = chairSays(profit >= 0 ? (profit > 500000 ? 'すごい黒字じゃ！この調子で街を大きくしていこう！' : '今月も黒字でなによりじゃ。') : '今月は赤字じゃ…。店の配置や価格、スタッフの人数を見直そう。');
  h += `<h3>収入</h3><div class="kv"><div>売上</div><div class="v">${yen(cur.sales)}</div>`;
  for (const [c, v] of cats) h += `<div class="note">　${CATS[c] ? CATS[c].name : c}</div><div class="v note">${yen(v)}</div>`;
  h += `</div><h3>支出</h3><div class="kv">
    <div>給料</div><div class="v">${yen(ex.salary)}</div>
    <div>維持費</div><div class="v">${yen(ex.maint)}</div>
    <div>建設・改装</div><div class="v">${yen(ex.build)}</div>
    <div>宣伝</div><div class="v">${yen(ex.ads)}</div>
    <div>清掃</div><div class="v">${yen(ex.clean)}</div>
    <div>利息</div><div class="v">${yen(ex.interest)}</div>
    <div>その他</div><div class="v">${yen(ex.other)}</div>
    <div class="sum">収支</div><div class="v sum ${profit >= 0 ? 'good' : 'badc'}">${yen(profit)}</div></div>`;
  h += `<h3>お客さん</h3><div class="kv"><div>来客数</div><div class="v">${cur.visitors.toLocaleString()}人</div><div>平均満足度</div><div class="v">${avgSat}</div><div>人気</div><div class="v">${Math.floor(S.pop)}</div></div>`;
  if (topShops.length) { h += `<h3>今月の売上トップ</h3><div class="kv">`; topShops.forEach((t, i) => { h += `<div>${i + 1}位 ${t.n}</div><div class="v">${yen(t.s)}</div>`; }); h += `</div>`; }
  const nextEv = SEASON_EVENTS[S.month];
  if (nextEv) h += `<p class="note" style="margin-top:10px">📅 ${S.month}月は「${nextEv.name}」（${nextEv.days[0]}日〜）${nextEv.desc}</p>`;
  h += `<div class="btn-row center"><button class="btn btn-ok" data-action="modal-close">OK</button></div>`;
  openModal(`📊 ${label} 経営報告`, h);
  SE('clear');
}
function debtWarn() {
  openModal('⚠ 赤字です', chairSays(`資金がマイナスじゃ！ 月末に${3 - S.debtMonths}回続けてマイナスだと破産してしまうぞ。「経営」→「銀行」で融資を受けるか、支出を減らすのじゃ。`) + `<div class="btn-row center"><button class="btn" data-action="goto-bank">銀行へ</button><button class="btn btn-ok" data-action="modal-close">わかった</button></div>`);
}
function gameOverModal() {
  openModal('破産…', chairSays('3か月連続の赤字で、商店街の経営が続けられなくなってしまった…。だが銀行が特別に再建融資を提案しておる。どうする？') +
    `<div class="btn-row center"><button class="btn btn-gold" data-action="bailout">再建融資を受ける</button><button class="btn" data-action="to-title">タイトルへ</button></div>`, { noClose: true });
}
function rankUpModal(r, reward) {
  const newCust = CUST_ORDER.filter((t) => CUST[t].rank === r).map((t) => CUST[t].name);
  const lands = LANDS.filter((L) => L.rank === r).map((L) => L.name);
  const newRes = Object.values(B).filter((d) => d.rank === r && !S.unlocked[d.id]).map((d) => d.name);
  let h = chairSays(`おめでとう！ わしらの街は「<b>${RANKS[r].name}</b>」になったぞ！ 祝い金として ${yen(reward)} を贈ろう。`);
  h += '<h3>新しくできること</h3><div class="list">';
  if (newCust.length) h += `<div class="item"><img src="${iconURL('staff')}" alt=""><div class="i-main"><div class="i-title">新しいお客さん</div><div class="i-sub">${newCust.join('、')}が来るようになった</div></div></div>`;
  if (lands.length) h += `<div class="item"><img src="${iconURL('flag')}" alt=""><div class="i-main"><div class="i-title">土地が購入可能に</div><div class="i-sub">${lands.join('、')}（「経営」→「土地」）</div></div></div>`;
  if (newRes.length) h += `<div class="item"><img src="${iconURL('flask')}" alt=""><div class="i-main"><div class="i-title">研究できる店が増えた</div><div class="i-sub">${newRes.join('、')}</div></div></div>`;
  h += `<div class="item"><img src="${iconURL('staff')}" alt=""><div class="i-main"><div class="i-title">スタッフ上限 ${maxStaff()}人</div><div class="i-sub">より優秀な人材が応募してくるように</div></div></div></div>`;
  h += `<div class="btn-row center"><button class="btn btn-ok" data-action="modal-close">やったね！</button></div>`;
  openModal('🎊 ランクアップ！', h);
  addEffect('sparkle', GATE_X + 0.5, GATE_Y - 1);
}
function nationalModal(yr, list, pos, reward, ys) {
  let h = chairSays(pos === 1 ? 'なんと全国1位じゃ！！ わしは夢を見とるのか…！' : pos <= 3 ? `全国${pos}位！ 表彰台じゃ、素晴らしい！` : `今年は全国${pos}位じゃった。来年はもっと上を目指そう！`);
  h += `<p class="note">${yr}年目の年間売上：${yen(ys)}　賞金：${yen(reward)}</p><h3>全国商店街ランキング</h3><div class="list">`;
  list.forEach((o, i) => { h += `<div class="item${o.me ? ' done' : ''}"><div class="i-main"><div class="i-title">${i + 1}位　${o.me ? '<span class="gold">' + o.name + '</span>' : o.name}</div></div><div class="i-side">${o.score.toLocaleString()}pt</div></div>`; });
  h += `</div><div class="btn-row center"><button class="btn btn-ok" data-action="modal-close">閉じる</button></div>`;
  openModal(`🏆 ${yr}年目 全国ランキング発表`, h);
  SE('fanfare');
}
function choiceEvent() {
  const ch = pick(CHOICES)();
  UI.choice = ch;
  openModal(ch.title, chairSays(esc(ch.text)) + `<div class="btn-row center"><button class="btn btn-ok" data-action="choice-a">${ch.a}</button><button class="btn" data-action="choice-b">${ch.b}</button></div>`, { noClose: true });
}

/* スタッフ */
function staffFace(s) {
  return custPortrait({ type: 'staff', skin: s.look.skin, hair: s.look.hair, shirt: s.look.shirt, pants: '#262b44', girl: s.look.girl, key: 'staff' + s.id });
}
function buildingLabel(b) {
  const same = S.buildings.filter((o) => o.id === b.id);
  const n = same.indexOf(b) + 1;
  return B[b.id].name + (same.length > 1 ? ' #' + n : '') + ' Lv' + b.lvl;
}
function staffHTML(tab) {
  let h = `<div class="mtabs"><button class="btn btn-small${tab === 'emp' ? ' on' : ''}" data-action="staff-tab" data-tab="emp">雇用中 ${S.staff.length}/${maxStaff()}</button><button class="btn btn-small${tab === 'cand' ? ' on' : ''}" data-action="staff-tab" data-tab="cand">採用候補 ${S.candidates.length}</button></div>`;
  if (tab === 'emp') {
    if (!S.staff.length) h += `<p class="note">まだスタッフがいません。「採用候補」から雇いましょう。店に配置すると売上・満足度・回転率が上がります。</p>`;
    const slotB = S.buildings.filter((b) => B[b.id].staff);
    h += '<div class="list">';
    for (const s of S.staff) {
      const cost = Math.round(8000 * s.lvl * (S.techs.training ? 0.7 : 1));
      let opts = `<option value="0">— 未配置 —</option>`;
      for (const b of slotB) {
        const full = staffOf(b).length >= staffSlots(b) && s.bid !== b.uid;
        opts += `<option value="${b.uid}" ${s.bid === b.uid ? 'selected' : ''} ${full ? 'disabled' : ''}>${buildingLabel(b)} [${staffOf(b).length}/${staffSlots(b)}]</option>`;
      }
      h += `<div class="item"><img src="${staffFace(s)}" alt=""><div class="i-main"><div class="i-title">${esc(s.name)} <span class="gold">Lv${s.lvl}</span></div>
        <div class="i-sub">接客${pips(s.service)} ${s.service}　技術${pips(s.skill)} ${s.skill}　体力${pips(s.stamina)} ${s.stamina}</div>
        <div class="i-sub">やる気 ${Math.round(s.morale)}${bar(s.morale, 100, s.morale < 40 ? 'red' : '')}給料 ${yen(s.salary)}/月　EXP ${Math.floor(s.exp)}/${s.lvl * 25}</div>
        <select class="btn btn-small" data-action="staff-assign" data-sid="${s.id}" style="margin-top:4px;max-width:100%">${opts}</select>
        <div class="ip-row"><button class="btn btn-small" data-action="staff-train" data-sid="${s.id}">研修 ${yenShort(cost)}</button><button class="btn btn-small" data-action="staff-bonus" data-sid="${s.id}">ボーナス ${yenShort(Math.round(s.salary * 0.5))}</button><button class="btn btn-small" data-action="staff-fire" data-sid="${s.id}">解雇</button></div></div></div>`;
    }
    h += '</div>';
  } else {
    h += `<p class="note">候補は毎月入れ替わります。雇用時に給料1か月分の採用費がかかります。</p><div class="list">`;
    for (const s of S.candidates) {
      h += `<div class="item"><img src="${staffFace(s)}" alt=""><div class="i-main"><div class="i-title">${esc(s.name)}</div>
        <div class="i-sub">接客${pips(s.service)} ${s.service}　技術${pips(s.skill)} ${s.skill}　体力${pips(s.stamina)} ${s.stamina}</div><div class="i-sub">給料 ${yen(s.salary)}/月</div></div>
        <div class="i-side"><button class="btn btn-small btn-gold" data-action="staff-hire" data-sid="${s.id}">雇う</button></div></div>`;
    }
    if (!S.candidates.length) h += `<p class="note">今月の候補はもういません。来月をお待ちください。</p>`;
    h += '</div>';
  }
  return h;
}
function openStaff(tab = 'emp') { UI.staffTab = tab; openModal('スタッフ', staffHTML(tab), { refresh: () => refreshModal(staffHTML(UI.staffTab)) }); }

/* 研究 */
function researchHTML(tab) {
  let h = `<p>研究ポイント：<span class="gold">${S.rp} RP</span>　<span class="note">満足したお客さん・改装・コンボ・目標達成でたまる</span></p>
    <div class="mtabs"><button class="btn btn-small${tab === 'b' ? ' on' : ''}" data-action="res-tab" data-tab="b">店・施設</button><button class="btn btn-small${tab === 't' ? ' on' : ''}" data-action="res-tab" data-tab="t">技術</button></div><div class="list">`;
  if (tab === 'b') {
    const items = [...Object.values(B), ...Object.values(ROADS)].filter((d) => d.rp > 0).sort((a, b) => a.rank - b.rank || a.rp - b.rp);
    for (const d of items) {
      const done = S.unlocked[d.id];
      const can = !done && S.rank >= d.rank && S.rp >= d.rp;
      h += `<div class="item${done ? ' done' : S.rank < d.rank ? ' lock' : ''}"><img src="${iconURL(d.icon)}" alt=""><div class="i-main"><div class="i-title">${d.name}</div><div class="i-sub">${d.desc || ''}${d.cost ? '　建設費 ' + yenShort(d.cost) : ''}</div><div class="i-sub">${S.rank < d.rank ? '必要ランク：' + RANKS[d.rank].name : ''}</div></div>
        <div class="i-side">${done ? '<span class="good">解放済</span>' : `<button class="btn btn-small ${can ? 'btn-gold' : ''}" data-action="research" data-id="${d.id}" ${can ? '' : 'disabled'}>${d.rp} RP</button>`}</div></div>`;
    }
  } else {
    for (const t of TECHS) {
      const done = S.techs[t.id];
      const can = !done && S.rank >= t.rank && S.rp >= t.rp;
      h += `<div class="item${done ? ' done' : S.rank < t.rank ? ' lock' : ''}"><img src="${iconURL('flask')}" alt=""><div class="i-main"><div class="i-title">${t.name}</div><div class="i-sub">${t.desc}</div><div class="i-sub">${S.rank < t.rank ? '必要ランク：' + RANKS[t.rank].name : ''}</div></div>
        <div class="i-side">${done ? '<span class="good">習得済</span>' : `<button class="btn btn-small ${can ? 'btn-gold' : ''}" data-action="tech" data-id="${t.id}" ${can ? '' : 'disabled'}>${t.rp} RP</button>`}</div></div>`;
    }
  }
  return h + '</div>';
}
function openResearch(tab = 'b') { UI.resTab = tab; openModal('研究', researchHTML(tab), { refresh: () => refreshModal(researchHTML(UI.resTab)) }); }

/* 宣伝 */
function adsHTML() {
  let h = '';
  if (S.ads.length) h += `<p>実施中：${S.ads.map((a) => { const d = ADS.find((x) => x.id === a.id); return d.name + '（あと' + a.days + '日）'; }).join('、')}</p>`;
  h += '<div class="list">';
  for (const a of ADS) {
    const active = S.ads.some((x) => x.id === a.id);
    const can = S.rank >= a.rank && S.money >= a.cost && !active;
    const fav = Object.keys(a.favor).map((k) => CUST[k].name).join('・');
    h += `<div class="item${S.rank < a.rank ? ' lock' : ''}"><img src="${iconURL('mega')}" alt=""><div class="i-main"><div class="i-title">${a.name}</div><div class="i-sub">${a.desc} ${a.days}日間 客足+${Math.round(a.boost * 100)}%${fav ? '　' + fav + 'が増加' : ''}</div><div class="i-sub">${S.rank < a.rank ? '必要ランク：' + RANKS[a.rank].name : ''}</div></div>
      <div class="i-side"><button class="btn btn-small ${can ? 'btn-gold' : ''}" data-action="ad" data-id="${a.id}" ${can ? '' : 'disabled'}>${active ? '実施中' : yenShort(a.cost)}</button></div></div>`;
  }
  return h + '</div>';
}
function openAds() { openModal('宣伝', adsHTML(), { refresh: () => refreshModal(adsHTML()) }); }

/* 目標 */
function goalsHTML() {
  let h = `<h3>ランク：★${S.rank} ${RANKS[S.rank].name}</h3>`;
  const p = rankProgress();
  if (p) {
    h += `<p class="note">次のランク「${p.next.name}」の条件（祝い金 ${yen(p.next.reward)}）</p>`;
    for (const it of p.items) h += `<div class="kv"><div>${it.label}</div><div class="v ${it.cur >= it.need ? 'good' : ''}">${Math.floor(it.cur).toLocaleString()} / ${it.need.toLocaleString()}</div></div>${bar(it.cur, it.need, it.cur >= it.need ? '' : 'gold')}`;
    h += `<p class="note">条件を満たすと一日の終わりにランクアップします。</p>`;
  } else h += `<p class="gold">最高ランクに到達！ あなたの商店街は伝説になった！</p>`;
  const done = S.missions.filter(Boolean).length;
  h += `<h3>目標（${done}/${MISSIONS.length} 達成）</h3><div class="list">`;
  for (const { m } of activeMissions()) {
    const rw = [m.r.money ? yen(m.r.money) : '', m.r.rp ? 'RP+' + m.r.rp : ''].filter(Boolean).join(' / ');
    h += `<div class="item"><img src="${iconURL('flag')}" alt=""><div class="i-main"><div class="i-title">${m.t}</div><div class="i-sub">${m.d}</div></div><div class="i-side gold" style="font-size:12px">${rw}</div></div>`;
  }
  if (done === MISSIONS.length) h += `<p class="gold">全目標達成！ 本当におめでとう！</p>`;
  h += '</div>';
  if (S.history.national.length) {
    h += `<h3>全国ランキングの記録</h3><div class="kv">`;
    for (const n of S.history.national) h += `<div>${n.year}年目</div><div class="v">${n.pos}位（${n.score.toLocaleString()}pt）</div>`;
    h += '</div>';
  }
  return h;
}
function openGoals() { openModal('目標', goalsHTML(), { refresh: () => refreshModal(goalsHTML()) }); }

/* 経営 */
function financeHTML(tab) {
  const tabs = [['now', '今月'], ['graph', '推移'], ['land', '土地'], ['bank', '銀行'], ['shops', '店舗'], ['voice', '客の声']];
  let h = `<div class="mtabs">${tabs.map(([k, n]) => `<button class="btn btn-small${tab === k ? ' on' : ''}" data-action="fin-tab" data-tab="${k}">${n}</button>`).join('')}</div>`;
  if (tab === 'now') {
    const c = S.cur;
    let salary = 0; for (const s of S.staff) salary += s.salary;
    let maint = 0; for (const b of S.buildings) maint += Math.round(B[b.id].maint * (1 + (b.lvl - 1) * 0.25));
    h += `<div class="kv"><div>今月の売上</div><div class="v gold">${yen(c.sales)}</div><div>今月の来客</div><div class="v">${c.visitors.toLocaleString()}人</div>
      <div>平均満足度</div><div class="v">${c.satN ? Math.round(c.satSum / c.satN) : '-'}</div><div>今日の売上</div><div class="v">${yen(S.today.sales)}</div><div>今日の来客</div><div class="v">${S.today.visitors}人</div></div>
      <h3>月末の支払い予定</h3><div class="kv"><div>給料</div><div class="v">${yen(salary)}</div><div>維持費</div><div class="v">${yen(maint)}</div><div>利息</div><div class="v">${yen(Math.round(S.loan * 0.015))}</div></div>
      <h3>今月の出費</h3><div class="kv"><div>建設・改装</div><div class="v">${yen(c.build)}</div><div>宣伝</div><div class="v">${yen(c.ads)}</div><div>清掃</div><div class="v">${yen(c.clean)}</div><div>その他</div><div class="v">${yen(c.other + c.events)}</div></div>
      <h3>設定</h3><div class="toggle-row"><div>清掃業者に委託<div class="note">毎晩すべてのゴミを回収（1日 ${yen(2000 + S.rank * 1000)}）</div></div><button class="btn btn-small${S.settings.autoClean ? ' on' : ''}" data-action="toggle" data-key="autoClean">${S.settings.autoClean ? 'ON' : 'OFF'}</button></div>`;
  } else if (tab === 'graph') {
    h += `<h3>日別の来客数</h3><canvas class="stats-canvas" id="chart-v" width="560" height="170"></canvas><h3>所持金の推移</h3><canvas class="stats-canvas" id="chart-m" width="560" height="170"></canvas><h3>月別の収支</h3><canvas class="stats-canvas" id="chart-p" width="560" height="170"></canvas>`;
    h += `<div class="kv"><div>累計来客</div><div class="v">${S.stats.visitors.toLocaleString()}人</div><div>累計売上</div><div class="v">${yen(S.stats.totalSales)}</div><div>最高の1日来客</div><div class="v">${S.stats.bestDayVisitors}人</div><div>最高の月売上</div><div class="v">${yen(S.stats.bestMonthSales)}</div><div>泥棒逮捕</div><div class="v">${S.stats.thievesCaught}回</div></div>`;
  } else if (tab === 'land') {
    h += `<p class="note">土地を買うと建てられる範囲が広がります。</p><div class="list">`;
    for (const L of LANDS) {
      const own = S.lands.includes(L.id);
      const can = !own && S.rank >= L.rank && S.money >= L.cost;
      h += `<div class="item${own ? ' done' : S.rank < L.rank ? ' lock' : ''}"><img src="${iconURL('flag')}" alt=""><div class="i-main"><div class="i-title">${L.name}エリア（${L.w}×${L.h}）</div><div class="i-sub">${own ? '所有済み' : S.rank < L.rank ? '必要ランク：' + RANKS[L.rank].name : '購入できます'}</div></div>
        <div class="i-side">${own ? '<span class="good">所有</span>' : `<button class="btn btn-small ${can ? 'btn-gold' : ''}" data-action="buy-land" data-id="${L.id}" ${can ? '' : 'disabled'}>${yenShort(L.cost)}</button>`}</div></div>`;
    }
    h += '</div>';
  } else if (tab === 'bank') {
    const limit = loanLimit();
    h += chairSays('銀行から資金を借りられるぞい。利息は毎月1.5%じゃ。借りすぎには注意じゃよ。');
    h += `<div class="kv"><div>借入残高</div><div class="v">${yen(S.loan)}</div><div>借入上限</div><div class="v">${yen(limit)}</div><div>毎月の利息</div><div class="v">${yen(Math.round(S.loan * 0.015))}</div></div>
      <div class="btn-row">${[100000, 500000, 2000000].map((v) => `<button class="btn btn-small" data-action="borrow" data-v="${v}" ${S.loan + v > limit ? 'disabled' : ''}>${yenShort(v)} 借りる</button>`).join('')}</div>
      <div class="btn-row">${[100000, 500000].map((v) => `<button class="btn btn-small" data-action="repay" data-v="${v}" ${S.loan <= 0 || S.money < Math.min(v, S.loan) ? 'disabled' : ''}>${yenShort(v)} 返す</button>`).join('')}<button class="btn btn-small btn-gold" data-action="repay" data-v="all" ${S.loan <= 0 || S.money < S.loan ? 'disabled' : ''}>全額返済</button></div>`;
  } else if (tab === 'shops') {
    const list = S.buildings.filter((b) => B[b.id].price > 0).sort((a, b) => b.sales - a.sales);
    if (!list.length) h += `<p class="note">まだお店がありません。</p>`;
    h += '<div class="list">';
    for (const b of list) {
      h += `<div class="item"><img src="${iconURL(B[b.id].icon)}" alt=""><div class="i-main"><div class="i-title">${buildingLabel(b)}</div><div class="i-sub">来店 ${b.visits.toLocaleString()}　魅力 ${b._appeal || 0}　今月 ${yenShort(b.msales)}${b._combo ? '　★' + esc(b._combo) : ''}</div></div><div class="i-side"><span class="gold">${yenShort(b.sales)}</span><button class="btn btn-small" data-action="goto-b" data-uid="${b.uid}">見る</button></div></div>`;
    }
    h += '</div>';
  } else if (tab === 'voice') {
    const comp = Object.entries(S.stats.complaints).sort((a, b) => b[1] - a[1]).slice(0, 4);
    if (comp.length) {
      h += `<h3>お客さんの不満（累計）</h3><div class="kv">`;
      for (const [n, v] of comp) h += `<div>${NEED_NAME[n]}を満たす店がない・閉まっている</div><div class="v badc">${v}件</div>`;
      h += '</div>';
      const top = comp[0][0];
      const adv = { hunger: '飲食店を増やそう', thirst: '自販機や喫茶店を増やそう', shop: '買い物できる店を増やそう', fun: '娯楽施設を建てよう', fatigue: 'ベンチや休める店を置こう', toilet: 'トイレを増やそう', money: 'ATMを設置しよう' }[top];
      h += chairSays('一番多い不満は「' + NEED_NAME[top] + '」じゃな。' + adv + '。');
    }
    h += `<h3>最近の口コミ</h3><div class="list">`;
    if (!S.comments.length) h += `<p class="note">まだ口コミはありません。</p>`;
    for (const c of S.comments.slice(0, 20)) h += `<div class="item"><div class="i-main"><div class="i-sub">${c.d}</div><div class="i-title">${esc(c.t)}</div></div></div>`;
    h += '</div>';
  }
  return h;
}
function loanLimit() { return 300000 + S.rank * 500000; }
function openFinance(tab = 'now') {
  UI.finTab = tab;
  openModal('経営', financeHTML(tab), { refresh: () => { refreshModal(financeHTML(UI.finTab)); drawCharts(); }, after: drawCharts });
}
function drawChart(id, values, labels, color, bars) {
  const c = document.getElementById(id);
  if (!c) return;
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  g.font = '12px "DotGothic16", sans-serif';
  if (!values.length) { g.fillStyle = '#a9b0d4'; g.fillText('データがまだありません', 16, H / 2); return; }
  let max = Math.max(1, ...values), min = Math.min(0, ...values);
  const pad = 34, bw = (W - pad - 8) / values.length;
  const ys = (v) => H - 18 - (v - min) / (max - min || 1) * (H - 30);
  g.fillStyle = '#3d4c8f'; g.fillRect(pad, ys(0), W - pad - 8, 1);
  g.fillStyle = '#a9b0d4'; g.fillText(yenShortOrNum(max), 2, 14); g.fillText(yenShortOrNum(min), 2, H - 20);
  values.forEach((v, i) => {
    const x = pad + i * bw;
    if (bars) { g.fillStyle = v >= 0 ? color : '#e43b44'; const y0 = ys(0), y1 = ys(v); g.fillRect(Math.round(x + 1), Math.min(y0, y1), Math.max(2, Math.round(bw - 2)), Math.max(1, Math.abs(y1 - y0))); }
    else { g.fillStyle = color; g.fillRect(Math.round(x + bw / 2 - 2), Math.round(ys(v)) - 2, 4, 4); if (i > 0) { g.strokeStyle = color; g.lineWidth = 2; g.beginPath(); g.moveTo(pad + (i - 1) * bw + bw / 2, ys(values[i - 1])); g.lineTo(x + bw / 2, ys(v)); g.stroke(); } }
    if (labels && (i % Math.ceil(values.length / 8) === 0)) { g.fillStyle = '#a9b0d4'; g.fillText(labels[i], x, H - 3); }
  });
}
function yenShortOrNum(v) { return Math.abs(v) >= 10000 ? yenShort(v).replace('¥', '') : String(Math.round(v)); }
function drawCharts() {
  if (UI.finTab !== 'graph') return;
  const d = S.history.days, m = S.history.months;
  drawChart('chart-v', d.map((o) => o.v), d.map((o) => o.l), '#63c74d', true);
  drawChart('chart-m', d.map((o) => o.money), d.map((o) => o.l), '#fee761', false);
  drawChart('chart-p', m.map((o) => o.profit), m.map((o) => o.l), '#2ce8f5', true);
}

/* メニュー・図鑑・設定 */
function openMenu() {
  const h = `<div class="list">
    <button class="item" data-action="open-zukan"><img src="${iconURL('zukan')}" alt=""><div class="i-main"><div class="i-title">図鑑</div><div class="i-sub">建物・お客さん・コンボの記録</div></div></button>
    <button class="item" data-action="open-settings"><img src="${iconURL('gear')}" alt=""><div class="i-main"><div class="i-title">設定</div><div class="i-sub">音量・表示・セーブデータ</div></div></button>
    <button class="item" data-action="save-now"><img src="${iconURL('save')}" alt=""><div class="i-main"><div class="i-title">セーブ</div><div class="i-sub">毎日の終わりに自動セーブされます</div></div></button>
    <button class="item" data-action="open-help"><img src="${iconURL('book')}" alt=""><div class="i-main"><div class="i-title">遊び方</div><div class="i-sub">基本ルールとコツ</div></div></button>
    <button class="item" data-action="to-title-confirm"><img src="${iconURL('flag')}" alt=""><div class="i-main"><div class="i-title">タイトルへ戻る</div><div class="i-sub">セーブしてから戻ります</div></div></button>
  </div><p class="note" style="margin-top:12px;text-align:center">ピクセル商店街 繁盛記　made by <a href="https://github.com/h1ro223" target="_blank" rel="noopener">hiro/ヒロ</a></p>`;
  openModal('メニュー', h);
}
function zukanHTML(tab) {
  let h = `<div class="mtabs"><button class="btn btn-small${tab === 'b' ? ' on' : ''}" data-action="zk-tab" data-tab="b">建物</button><button class="btn btn-small${tab === 'c' ? ' on' : ''}" data-action="zk-tab" data-tab="c">お客さん</button><button class="btn btn-small${tab === 'k' ? ' on' : ''}" data-action="zk-tab" data-tab="k">コンボ ${S.combos.length}/${COMBOS.length}</button></div>`;
  if (tab === 'b') {
    const all = Object.values(B);
    h += `<p class="note">建てたことのある建物 ${all.filter((d) => S.builtEver[d.id]).length}/${all.length}</p><div class="grid-zukan">`;
    for (const d of all) { const got = S.builtEver[d.id]; h += `<div class="zk${got ? '' : ' no'}"><img src="${iconURL(d.icon)}" alt="">${got ? d.name : '？？？'}</div>`; }
    h += '</div>';
  } else if (tab === 'c') {
    h += '<div class="list">';
    for (const t of CUST_ORDER) {
      const T = CUST[t], got = S.seenCust[t];
      const L = { type: t, skin: '#f5c9a0', hair: t === 'elder' ? '#c0cbdc' : '#3a2a22', shirt: t === 'salaryman' ? '#3a4466' : t === 'student' ? '#124e89' : t === 'celeb' ? '#fee761' : '#e43b44', pants: '#262b44', girl: t === 'housewife', key: 'zk_' + t };
      const likes = Object.entries(T.prefs).filter(([, v]) => v >= 2.5).map(([k]) => B[k] ? B[k].name : '').filter(Boolean).slice(0, 5);
      h += `<div class="item${got ? '' : ' lock'}"><img src="${custPortrait(L)}" alt=""><div class="i-main"><div class="i-title">${got ? T.name : '？？？'}</div><div class="i-sub">${got ? '予算 ' + yenShort(T.budget[0]) + '〜' + yenShort(T.budget[1]) + (likes.length ? '　好き：' + likes.join('、') : '') : (T.rank < 99 ? 'ランク' + T.rank + 'から来店' : 'イベントで出現')}</div></div></div>`;
    }
    h += '</div>';
  } else {
    h += `<p class="note">近く（1マス以内）に並べると発見。見つけたコンボの店は魅力×1.25・売上×1.1！</p><div class="list">`;
    for (const cb of COMBOS) {
      const got = S.combos.includes(cb.id);
      const icons = cb.ids.map((id, i) => (got || i === 0) ? `<img src="${iconURL(B[id].icon)}" alt="" style="width:28px;height:28px">` : `<img src="${iconURL('question')}" alt="" style="width:28px;height:28px">`).join('');
      h += `<div class="item${got ? ' done' : ''}"><div class="i-main"><div class="i-title">${got ? cb.name : '？？？'}</div><div class="i-sub">${got ? cb.ids.map((id) => B[id].name).join(' ＋ ') : 'ヒント：' + B[cb.ids[0]].name + ' ＋ ？'}</div></div><div class="i-side" style="flex-direction:row">${icons}</div></div>`;
    }
    h += '</div>';
  }
  return h;
}
function openZukan(tab = 'b') { UI.zkTab = tab; openModal('図鑑', zukanHTML(tab), { refresh: () => refreshModal(zukanHTML(UI.zkTab)) }); }
function settingsHTML() {
  const T = (k, name, sub) => `<div class="toggle-row"><div>${name}${sub ? `<div class="note">${sub}</div>` : ''}</div><button class="btn btn-small${S.settings[k] ? ' on' : ''}" data-action="toggle" data-key="${k}">${S.settings[k] ? 'ON' : 'OFF'}</button></div>`;
  return T('bgm', 'BGM') + T('se', '効果音') +
    `<div class="toggle-row"><div>音量</div><div class="btn-row" style="margin:0">${[0.2, 0.4, 0.6, 0.8, 1].map((v) => `<button class="btn btn-small${Math.abs(S.settings.vol - v) < 0.01 ? ' on' : ''}" data-action="vol" data-v="${v}">${Math.round(v * 100)}</button>`).join('')}</div></div>` +
    T('grid', 'グリッド表示') +
    `<h3>セーブデータの書き出し／読み込み</h3><p class="note">別の端末に引き継ぐときは、書き出したコードをコピーして読み込んでください。</p>
     <div class="btn-row"><button class="btn btn-small" data-action="export">コードを書き出す</button><button class="btn btn-small" data-action="export-file">ファイルで保存</button></div>
     <textarea class="save-code" id="save-code" placeholder="ここにセーブコードを貼り付け"></textarea>
     <div class="btn-row"><button class="btn btn-small" data-action="copy-code">コピー</button><button class="btn btn-small btn-gold" data-action="import-code">このコードを読み込む</button></div>
     <h3>その他</h3><div class="btn-row"><button class="btn btn-small" data-action="new-game-confirm">最初からやり直す</button></div>
     <p class="note" style="margin-top:10px">made by <a href="https://github.com/h1ro223" target="_blank" rel="noopener">hiro/ヒロ</a></p>`;
}
function openSettings() { openModal('設定', settingsHTML(), { refresh: () => refreshModal(settingsHTML()) }); }
function helpHTML() {
  return chairSays('ようこそ！わしは商店会の会長じゃ。寂れたこの通りを、日本一の商店街に育ててほしい！') +
    `<h3>基本</h3><p>「建設」から道路を敷き、道に面した場所に店を建てよう。お客さんは入口の門（とバス停）から来て、道を歩いて店に入ります。</p>
    <h3>お客さんの気持ち</h3><p>お客さんは「空腹・のどの渇き・買い物欲・遊びたい・疲れ・トイレ」の欲求を持っています。欲求を満たす店がないと不満になり、人気が下がります。お客さんをタップすると気持ちが見られます。</p>
    <h3>魅力とコンボ</h3><p>装飾は周囲の店の魅力を上げます。魅力が高い店ほど選ばれ、満足度も上がります。特定の店を1マス以内に並べるとコンボが発見でき、さらに魅力と売上がアップ！</p>
    <h3>成長</h3><p>店はお客さんが来るほど経験値がたまり、改装でレベルアップ。スタッフを配置すると売上・満足度・回転率が上がります。満足したお客さんからたまる研究ポイントで新しい店や技術を解放しよう。</p>
    <h3>ランク</h3><p>来客数・人気・施設数を満たすとランクアップ。新しいお客さんや土地、研究が解放されます。毎年3月末には全国商店街ランキングが発表されます。</p>
    <h3>操作</h3><p>ドラッグで移動、ピンチ／ホイールで拡大縮小。建設中は2本指で移動できます。道のゴミはタップで拾えます。</p>
    <h3>時間</h3><p>1か月は7日（月〜日）。土日はお客さんが増えます。月末に給料と維持費を支払います。資金が3か月連続でマイナスだと破産です。</p>`;
}

/* ================================================================
   13. 入力
   ================================================================ */
const pointers = new Map();
let gesture = null;
function evPos(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function tileAt(sx, sy) { const w = screenToWorld(sx, sy); return { x: Math.floor(w.x / 16), y: Math.floor(w.y / 16), wx: w.x, wy: w.y }; }
function ghostPos(tx, ty) { const d = B[UI.buildId]; return { id: UI.buildId, x: tx - Math.floor((d.size[0] - 1) / 2), y: ty - Math.floor((d.size[1] - 1) / 2) }; }

cv.addEventListener('pointerdown', (e) => {
  if (!S) return;
  initAudio();
  cv.setPointerCapture(e.pointerId);
  const p = evPos(e);
  pointers.set(e.pointerId, { x: p.x, y: p.y, sx: p.x, sy: p.y, t: performance.now(), type: e.pointerType, button: e.button });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    gesture = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), z0: cam.z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    UI.painting = false;
    return;
  }
  if (pointers.size > 2) return;
  const t = tileAt(p.x, p.y);
  if (e.button === 2 || e.button === 1) { gesture = { kind: 'pan', lx: p.x, ly: p.y }; return; }
  if (UI.mode === 'road' || UI.mode === 'remove') {
    gesture = { kind: 'paint', last: null, removedB: false };
    paintAt(t);
  } else if (UI.mode === 'build') {
    if (e.pointerType === 'mouse') gesture = { kind: 'maybeClick', lx: p.x, ly: p.y };
    else { gesture = { kind: 'ghost' }; UI.ghost = ghostPos(t.x, t.y); el.confirmBar.classList.add('hidden'); }
  } else {
    gesture = { kind: 'maybeClick', lx: p.x, ly: p.y };
  }
});
cv.addEventListener('pointermove', (e) => {
  if (!S) return;
  const p = evPos(e);
  const pt = pointers.get(e.pointerId);
  if (!pt) {
    // ホバー (マウス)
    const t = tileAt(p.x, p.y);
    if (UI.mode === 'build' && e.pointerType === 'mouse') UI.ghost = ghostPos(t.x, t.y);
    if (UI.mode === 'road' || UI.mode === 'remove') UI.hover = { x: t.x, y: t.y };
    return;
  }
  pt.x = p.x; pt.y = p.y;
  if (!gesture) return;
  if (gesture.kind === 'pinch' && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    cam.x -= (mx - gesture.mx) / cam.z; cam.y -= (my - gesture.my) / cam.z;
    gesture.mx = mx; gesture.my = my;
    zoomAt(mx, my, gesture.z0 * d / Math.max(1, gesture.d0));
    return;
  }
  const t = tileAt(p.x, p.y);
  if (gesture.kind === 'paint') { UI.hover = { x: t.x, y: t.y }; paintAt(t); return; }
  if (gesture.kind === 'ghost') { UI.ghost = ghostPos(t.x, t.y); return; }
  if (gesture.kind === 'maybeClick') {
    if (Math.hypot(p.x - pt.sx, p.y - pt.sy) > 8) gesture = { kind: 'pan', lx: p.x, ly: p.y };
    else if (UI.mode === 'build') UI.ghost = ghostPos(t.x, t.y);
  }
  if (gesture.kind === 'pan') {
    cam.x -= (p.x - gesture.lx) / cam.z; cam.y -= (p.y - gesture.ly) / cam.z;
    gesture.lx = p.x; gesture.ly = p.y;
    clampCam();
    cv.style.cursor = 'grabbing';
  }
});
function endPointer(e) {
  const pt = pointers.get(e.pointerId);
  pointers.delete(e.pointerId);
  if (!pt || !S) return;
  const p = evPos(e);
  if (gesture && gesture.kind === 'pinch') { if (pointers.size < 2) gesture = pointers.size === 1 ? { kind: 'none' } : null; return; }
  if (gesture && gesture.kind === 'ghost') {
    if (UI.ghost) showConfirm();
  } else if (gesture && gesture.kind === 'maybeClick' && e.type === 'pointerup') {
    const t = tileAt(p.x, p.y);
    if (UI.mode === 'build') { UI.ghost = ghostPos(t.x, t.y); tryBuild(UI.ghost); }
    else handleTap(t);
  }
  if (pointers.size === 0) { gesture = null; if (UI.mode === 'select') cv.style.cursor = 'grab'; if (e.pointerType !== 'mouse' && UI.mode !== 'build') UI.hover = null; }
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);
cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !pointers.size) { UI.hover = null; if (UI.mode === 'build') UI.ghost = null; } });
cv.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (!S) return;
  const p = evPos(e);
  const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018));
  zoomAt(p.x, p.y, cam.z * f);
}, { passive: false });
cv.addEventListener('contextmenu', (e) => e.preventDefault());

function paintAt(t) {
  const g = gesture;
  const key = t.x + ',' + t.y;
  if (g.last === key) return;
  g.last = key;
  if (!inMap(t.x, t.y)) return;
  if (UI.mode === 'road') {
    if (!owned(t.x, t.y)) return;
    const i = idx(t.x, t.y);
    if (S.tiles[i] === ROAD_CODE[UI.roadType]) return;
    if (occ[i]) return;
    if (S.nature[i]) { toast('木や岩は撤去してから道を敷こう', 'bad', 1.6); return; }
    if (placeRoad(t.x, t.y, UI.roadType)) addFloat(t.x + 0.5, t.y + 0.2, '-' + yenShort(ROADS[UI.roadType].cost), '#ff8a80');
  } else {
    const r = removeAt(t.x, t.y);
    if (r === 'building' && !g.removedB) {
      g.removedB = true;
      const b = bAt(t.x, t.y);
      if (b) confirmDemolish(b);
    }
  }
}
function showConfirm() {
  const d = B[UI.ghost.id];
  const chk = canPlace(UI.ghost.id, UI.ghost.x, UI.ghost.y);
  el.confirmText.textContent = chk.ok ? `${d.name} ${yen(d.cost)}` : chk.why;
  el.confirmBar.querySelector('[data-action="confirm-build"]').disabled = !chk.ok || S.money < d.cost;
  el.confirmBar.classList.remove('hidden');
}
function tryBuild(gh) {
  if (!gh) return;
  if (!S.unlocked[gh.id]) return;
  if (placeBuilding(gh.id, gh.x, gh.y)) {
    checkMissions();
    if (S.money < B[gh.id].cost) { toast('資金が足りなくなりました', '', 1.8); }
  }
}
function handleTap(t) {
  // 客
  let best = null, bd = 9;
  for (const c of customers) {
    if (c.state === 'inside') continue;
    const d = Math.hypot(c.x * 16 + c.ox - t.wx, c.y * 16 - 4 + c.oy - t.wy);
    if (d < bd) { bd = d; best = c; }
  }
  if (best) { openInfoCust(best); SE('click'); return; }
  if (!inMap(t.x, t.y)) { closeInfo(); return; }
  const i = idx(t.x, t.y);
  if (S.litter[i]) {
    const n = S.litter[i];
    S.litter[i] = 0; appealDirty = true;
    S.pop += 0.05 * n;
    addFloat(t.x + 0.5, t.y + 0.3, 'ピカピカ！', '#9fe8ff');
    SE('click');
    return;
  }
  const b = bAt(t.x, t.y);
  if (b) { openInfoBuilding(b); SE('click'); return; }
  if (!owned(t.x, t.y)) {
    const L = LANDS[landGrid[i]];
    toast(`${L.name}エリア：${S.rank >= L.rank ? yen(L.cost) + 'で購入可能（経営→土地）' : RANKS[L.rank].name + 'で購入可能'}`, '', 2.4);
    closeInfo();
    return;
  }
  if (S.nature[i]) { toast(`${S.nature[i] === 2 ? '岩' : '木'}：「撤去」で取り除けます（${yen(S.nature[i] === 2 ? 3000 : 1000)}）`, '', 2.2); return; }
  closeInfo();
}
function confirmDemolish(b) {
  const d = B[b.id];
  const back = Math.round(d.cost * 0.4 * (1 + (b.lvl - 1) * 0.3));
  UI.demolishTarget = b;
  openModal('撤去の確認', `<p>${d.name}${d.cat !== 'deco' ? '（Lv' + b.lvl + '）' : ''}を撤去しますか？</p><p class="note">返金：${yen(back)}　配置中のスタッフは未配置に戻ります。</p><div class="btn-row center"><button class="btn btn-ok" data-action="demolish-yes">撤去する</button><button class="btn" data-action="modal-close">やめる</button></div>`);
}

/* ================================================================
   14. クリック処理
   ================================================================ */
const ACTIONS = {
  'title-new': () => {
    if (hasSave()) {
      openModal('はじめから', '<p>セーブデータがあります。上書きして最初から始めますか？</p><div class="btn-row center"><button class="btn btn-ok" data-action="new-game-go">はじめから</button><button class="btn" data-action="modal-close">やめる</button></div>');
    } else startNewGame();
  },
  'new-game-go': () => { closeModal(); startNewGame(); },
  'title-continue': () => { if (loadGame()) enterGame(false); else toast('セーブデータが読み込めませんでした', 'bad'); },
  'title-import': () => $('#import-file').click(),
  'speed': (t) => { UI.speed = +t.dataset.speed; SE('click'); },
  'open-build': () => { if (el.sheet.classList.contains('hidden')) openBuild(); else closeBuild(); },
  'close-build': closeBuild,
  'build-tab': (t) => { UI.tab = t.dataset.tab; renderBuildTabs(); renderBuildList(); SE('click'); },
  'pick-build': (t) => {
    const id = t.dataset.id;
    if (!S.unlocked[id]) { toast(lockReason(B[id]) + '（研究メニュー）', 'bad'); SE('err'); return; }
    closeBuild(); setMode('build', id); SE('click');
  },
  'pick-road': (t) => {
    const id = t.dataset.id;
    if (!S.unlocked[id]) { toast(lockReason(ROADS[id]) + '（研究メニュー）', 'bad'); SE('err'); return; }
    closeBuild(); setMode('road', id); SE('click');
  },
  'pick-remove': () => { closeBuild(); setMode('remove'); SE('click'); },
  'mode-cancel': () => setMode('select'),
  'confirm-build': () => { tryBuild(UI.ghost); showConfirm(); },
  'confirm-cancel': () => { UI.ghost = null; el.confirmBar.classList.add('hidden'); },
  'zoom-in': () => zoomAt(viewW / 2, viewH / 2, cam.z * 1.3),
  'zoom-out': () => zoomAt(viewW / 2, viewH / 2, cam.z / 1.3),
  'zoom-fit': () => fitView(),
  'info-close': closeInfo,
  'upgrade': () => { if (UI.selected) { upgradeBuilding(UI.selected); renderInfo(); } },
  'price': (t) => { if (UI.selected) { UI.selected.priceMod = +t.dataset.v; renderInfo(); SE('click'); } },
  'unassign': (t) => { const s = S.staff.find((o) => o.id === +t.dataset.sid); if (s) s.bid = 0; renderInfo(); },
  'assign-pick': () => {
    const b = UI.selected; if (!b) return;
    const free = S.staff.filter((s) => !s.bid);
    let h = free.length ? '<div class="list">' + free.map((s) => `<button class="item" data-action="assign-do" data-sid="${s.id}"><img src="${staffFace(s)}" alt=""><div class="i-main"><div class="i-title">${esc(s.name)} Lv${s.lvl}</div><div class="i-sub">接客${s.service} 技術${s.skill} 体力${s.stamina} やる気${Math.round(s.morale)}</div></div></button>`).join('') + '</div>'
      : chairSays('手の空いているスタッフがおらん。「スタッフ」から新しく雇うのじゃ。') + '<div class="btn-row center"><button class="btn btn-gold" data-action="goto-hire">採用へ</button></div>';
    UI.assignTarget = b;
    openModal(B[b.id].name + 'に配置', h);
  },
  'assign-do': (t) => {
    const s = S.staff.find((o) => o.id === +t.dataset.sid), b = UI.assignTarget;
    if (s && b && bmap.has(b.uid) && staffOf(b).length < staffSlots(b)) { s.bid = b.uid; toast(s.name + 'さんを' + B[b.id].name + 'に配置しました', 'good'); }
    closeModal(); if (UI.selected) renderInfo();
  },
  'goto-hire': () => { closeModal(); openStaff('cand'); },
  'demolish': () => { if (UI.selected) confirmDemolish(UI.selected); },
  'demolish-yes': () => { const b = UI.demolishTarget; closeModal(); if (b && bmap.has(b.uid)) removeBuilding(b); },
  'modal-close': closeModal,
  'open-staff': () => openStaff('emp'),
  'staff-tab': (t) => { UI.staffTab = t.dataset.tab; refreshModal(staffHTML(UI.staffTab)); },
  'staff-hire': (t) => {
    const s = S.candidates.find((o) => o.id === +t.dataset.sid);
    if (!s) return;
    if (S.staff.length >= maxStaff()) { toast('スタッフ上限です（ランクアップで増加）', 'bad'); return; }
    if (S.money < s.salary) { toast('採用費が足りません', 'bad'); return; }
    S.money -= s.salary; S.cur.other += s.salary;
    S.candidates = S.candidates.filter((o) => o !== s);
    S.staff.push(s);
    toast(s.name + 'さんを採用しました！', 'good'); SE('clear');
    checkMissions();
    UI.staffTab = 'emp';
    refreshModal(staffHTML('emp'));
  },
  'staff-train': (t) => {
    const s = S.staff.find((o) => o.id === +t.dataset.sid); if (!s) return;
    const cost = Math.round(8000 * s.lvl * (S.techs.training ? 0.7 : 1));
    if (S.money < cost) { toast('お金が足りません', 'bad'); return; }
    S.money -= cost; S.cur.other += cost;
    const k = ['service', 'skill', 'stamina'].sort((a, b) => s[a] - s[b])[0];
    const up = randi(3, 7);
    s[k] = Math.min(99, s[k] + up);
    s.salary = staffSalary(s);
    s.morale = Math.max(0, s.morale - 5);
    toast(s.name + 'さんの' + { service: '接客', skill: '技術', stamina: '体力' }[k] + 'が' + up + '上がった！', 'good');
    SE('levelup');
    refreshModal(staffHTML('emp'));
  },
  'staff-bonus': (t) => {
    const s = S.staff.find((o) => o.id === +t.dataset.sid); if (!s) return;
    const cost = Math.round(s.salary * 0.5);
    if (S.money < cost) { toast('お金が足りません', 'bad'); return; }
    S.money -= cost; S.cur.other += cost;
    s.morale = Math.min(100, s.morale + 35);
    toast(s.name + 'さん「ありがとうございます！がんばります！」', 'good');
    SE('coin');
    refreshModal(staffHTML('emp'));
  },
  'staff-fire': (t) => {
    const s = S.staff.find((o) => o.id === +t.dataset.sid); if (!s) return;
    S.staff = S.staff.filter((o) => o !== s);
    toast(s.name + 'さんを解雇しました', '');
    refreshModal(staffHTML('emp'));
  },
  'open-research': () => openResearch('b'),
  'res-tab': (t) => { UI.resTab = t.dataset.tab; refreshModal(researchHTML(UI.resTab)); },
  'research': (t) => {
    const id = t.dataset.id;
    const d = B[id] || ROADS[id];
    if (!d || S.unlocked[id] || S.rp < d.rp || S.rank < d.rank) return;
    S.rp -= d.rp; S.unlocked[id] = true; S.stats.researched++;
    toast('「' + d.name + '」が建設できるようになった！', 'good'); SE('levelup');
    checkMissions();
    refreshModal(researchHTML('b'));
  },
  'tech': (t) => {
    const tc = TECHS.find((x) => x.id === t.dataset.id);
    if (!tc || S.techs[tc.id] || S.rp < tc.rp || S.rank < tc.rank) return;
    S.rp -= tc.rp; S.techs[tc.id] = true; S.stats.researched++;
    toast('技術「' + tc.name + '」を習得！', 'good'); SE('levelup');
    appealDirty = true; spawnRateCache = computeSpawnRate();
    checkMissions();
    refreshModal(researchHTML('t'));
  },
  'open-ads': openAds,
  'ad': (t) => {
    const a = ADS.find((x) => x.id === t.dataset.id);
    if (!a || S.money < a.cost || S.rank < a.rank || S.ads.some((x) => x.id === a.id)) return;
    S.money -= a.cost; S.cur.ads += a.cost;
    S.ads.push({ id: a.id, days: a.days });
    S.pop += 2 + a.cost / 50000;
    S.stats.adsUsed++;
    spawnRateCache = computeSpawnRate();
    toast('「' + a.name + '」を実施！ ' + a.days + '日間お客さんが増えます', 'good'); SE('fanfare');
    news(a.name + 'がスタート！');
    showEventBanner(); checkMissions();
    refreshModal(adsHTML());
  },
  'open-goals': openGoals,
  'open-finance': () => openFinance('now'),
  'fin-tab': (t) => { UI.finTab = t.dataset.tab; refreshModal(financeHTML(UI.finTab)); drawCharts(); },
  'goto-bank': () => { closeModal(); openFinance('bank'); },
  'goto-b': (t) => {
    const b = bmap.get(+t.dataset.uid);
    closeModal();
    if (b) { const d = B[b.id]; cam.z = Math.max(cam.z, 3); centerOn((b.x + d.size[0] / 2) * 16, (b.y + d.size[1] / 2) * 16); openInfoBuilding(b); }
  },
  'buy-land': (t) => {
    const L = LANDS[+t.dataset.id];
    if (!L || S.lands.includes(L.id) || S.rank < L.rank || S.money < L.cost) return;
    S.money -= L.cost; S.cur.build += L.cost;
    S.lands.push(L.id);
    rebuildMap(); staticDirty = true;
    toast(L.name + 'エリアを購入しました！', 'good'); SE('fanfare');
    news('商店街が' + L.name + 'へ拡大！');
    checkMissions();
    refreshModal(financeHTML('land'));
  },
  'borrow': (t) => {
    const v = +t.dataset.v;
    if (S.loan + v > loanLimit()) return;
    S.loan += v; S.money += v;
    if (S.money >= 0) S.debtMonths = 0;
    toast(yen(v) + ' 借り入れました', ''); SE('coin');
    refreshModal(financeHTML('bank'));
  },
  'repay': (t) => {
    const v = t.dataset.v === 'all' ? S.loan : Math.min(+t.dataset.v, S.loan);
    if (v <= 0 || S.money < v) return;
    S.loan -= v; S.money -= v;
    toast(yen(v) + ' 返済しました', 'good'); SE('coin');
    refreshModal(financeHTML('bank'));
  },
  'open-menu': openMenu,
  'open-zukan': () => { closeModal(); setTimeout(() => openZukan('b'), 50); },
  'zk-tab': (t) => { UI.zkTab = t.dataset.tab; refreshModal(zukanHTML(UI.zkTab)); },
  'open-settings': () => { closeModal(); setTimeout(openSettings, 50); },
  'open-help': () => { closeModal(); setTimeout(() => openModal('遊び方', helpHTML()), 50); },
  'save-now': () => { saveGame(false); closeModal(); },
  'toggle': (t) => {
    const k = t.dataset.key;
    S.settings[k] = !S.settings[k];
    applyVolume();
    if (UI.modalRefresh) UI.modalRefresh();
    SE('click');
  },
  'vol': (t) => { S.settings.vol = +t.dataset.v; applyVolume(); if (UI.modalRefresh) UI.modalRefresh(); SE('click'); },
  'export': () => { const ta = $('#save-code'); ta.value = exportCode(); ta.select(); toast('セーブコードを書き出しました', 'good'); },
  'export-file': () => {
    const blob = new Blob([exportCode()], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pixel-shotengai-save.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  'copy-code': () => {
    const ta = $('#save-code');
    if (!ta.value) ta.value = exportCode();
    ta.select();
    if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(() => toast('コピーしました', 'good'), () => toast('コピーできませんでした。手動で選択してください', 'bad'));
    else { try { document.execCommand('copy'); toast('コピーしました', 'good'); } catch (e) { toast('コピーできませんでした', 'bad'); } }
  },
  'import-code': () => {
    const ta = $('#save-code');
    try { const st = importCode(ta.value); closeModal(); S = st; enterGame(false); saveGame(true); toast('読み込みました', 'good'); }
    catch (e) { toast('セーブコードが正しくありません', 'bad'); }
  },
  'new-game-confirm': () => {
    refreshModal('<p>本当に最初からやり直しますか？ 現在のデータは消えます。</p><div class="btn-row center"><button class="btn btn-ok" data-action="new-game-go">やり直す</button><button class="btn" data-action="modal-close">やめる</button></div>');
  },
  'to-title-confirm': () => { saveGame(true); closeModal(); toTitle(); },
  'to-title': () => { closeModal(); toTitle(); },
  'bailout': () => {
    const need = Math.max(0, -S.money) + 300000;
    S.loan += need; S.money += need; S.debtMonths = 0;
    S.pop *= 0.7;
    closeModal();
    toast('再建融資 ' + yen(need) + ' を受けました。心機一転がんばろう！', 'good', 3.6);
  },
  'choice-a': () => { const c = UI.choice; closeModal(); if (c) c.onA(); UI.choice = null; },
  'choice-b': () => { const c = UI.choice; closeModal(); if (c) c.onB(); UI.choice = null; },
  'tutorial-ok': () => { closeModal(); S.flags.welcomed = true; },
};
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action],[data-speed]');
  if (!t) return;
  if (t.tagName === 'SELECT') return;
  if (t.disabled) return;
  initAudio();
  if (AC && !bgm.timer) bgmStart();
  if (t.dataset.speed !== undefined && !t.dataset.action) { ACTIONS.speed(t); return; }
  const fn = ACTIONS[t.dataset.action];
  if (fn) fn(t, e);
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.action === 'staff-assign') {
    const s = S.staff.find((o) => o.id === +t.dataset.sid);
    if (!s) return;
    const uid = +t.value;
    if (uid) { const b = bmap.get(uid); if (b && (staffOf(b).length < staffSlots(b) || s.bid === uid)) s.bid = uid; }
    else s.bid = 0;
    refreshModal(staffHTML('emp'));
  }
});
$('#import-file').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try { S = importCode(String(r.result)); enterGame(false); saveGame(true); toast('セーブデータを読み込みました', 'good'); }
    catch (err) { toast('ファイルが正しくありません', 'bad'); }
  };
  r.readAsText(f);
  e.target.value = '';
});
document.addEventListener('keydown', (e) => {
  if (!S || el.game.classList.contains('hidden')) return;
  if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) return;
  if (e.key === 'Escape') { if (UI.modalOpen) closeModal(); else if (UI.mode !== 'select') setMode('select'); else closeInfo(); }
  if (e.key === ' ') { e.preventDefault(); UI.speed = UI.speed ? 0 : 1; }
  if (e.key === '1') UI.speed = 1; if (e.key === '2') UI.speed = 2; if (e.key === '3') UI.speed = 4;
  if (e.key === 'b' && !UI.modalOpen) ACTIONS['open-build']();
});

/* ---- スマホ(Safari)の拡大・コピー対策 ---- */
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  const interactive = e.target && e.target.closest && e.target.closest('button,a,select,textarea,input,canvas,[data-action]');
  if (!interactive && now - lastTouchEnd < 320) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
document.addEventListener('selectstart', (e) => { const tag = e.target && e.target.tagName; if (tag !== 'TEXTAREA' && tag !== 'INPUT') e.preventDefault(); });
document.addEventListener('contextmenu', (e) => { const tag = e.target && e.target.tagName; if (tag !== 'TEXTAREA' && tag !== 'A') e.preventDefault(); });

/* ================================================================
   15. 起動・メインループ
   ================================================================ */
function enterGame(isNew) {
  customers = []; floats = []; effects = []; particles = [];
  UI.modalQueue = []; UI.speed = 1; UI.selected = null; UI.selectedCust = null;
  closeModal(); closeBuild(); closeInfo(); setMode('select');
  el.title.classList.add('hidden');
  el.game.classList.remove('hidden');
  rebuildMap();
  recomputeCombos();
  recomputeAppeal();
  if (!S.candidates.length && S.dayCount === 0) refreshCandidates();
  spawnRateCache = computeSpawnRate();
  requestAnimationFrame(() => { resizeCanvas(); fitView(); if (isNew) { cam.z = clamp(Math.min(viewW, viewH) / 190, minZoom(), 5); centerOn(GATE_X * 16 + 8, 18 * 16); } });
  initAudio(); applyVolume(); bgmStart();
  showEventBanner();
  updateGoalBadge();
  tickerX = -99999;
  if (isNew) {
    queueModal(() => openModal('ようこそ！', helpHTML() + `<div class="btn-row center"><button class="btn btn-ok" data-action="tutorial-ok">さっそく始める</button></div>`, { noClose: true }));
  } else toast(dateLabel() + ' から再開', 'good');
}
function startNewGame() {
  S = newState();
  refreshCandidates();
  S.weather = 'sun';
  enterGame(true);
  news('寂れた通りに、新しい商店街づくりが始まった！');
}
function toTitle() {
  el.game.classList.add('hidden');
  el.title.classList.remove('hidden');
  $('#btn-continue').disabled = !hasSave();
  S = null; customers = [];
  drawTitleArt();
}

let lastTs = 0, simAcc = 0, fwTimer = 0;
function loop(ts) {
  const dt = Math.min(0.1, lastTs ? (ts - lastTs) / 1000 : 0.016);
  lastTs = ts;
  if (S && !el.game.classList.contains('hidden')) {
    const running = !UI.modalOpen && UI.speed > 0;
    UI.paused = !running;
    if (running) {
      simAcc += dt * UI.speed;
      let n = 0;
      while (simAcc >= SUBSTEP && n < 40) { simStep(); simAcc -= SUBSTEP; n++; if (!S) break; }
      if (n >= 40) simAcc = 0;
    }
    if (!S) { requestAnimationFrame(loop); return; }
    // 花火
    const ev = seasonEventToday();
    const h = S.minute / 60;
    if (running && ((ev && ev.fireworks) || (S.month === 12 && S.day === 7) || (S.month === 1 && S.day === 1)) && h >= 19 && h < 23) {
      fwTimer -= dt * UI.speed;
      if (fwTimer <= 0) { fireworkBurst(); fwTimer = rand(0.5, 1.6); }
    }
    updateEffects(dt);
    updateParticles(dt);
    render(dt);
    updateHUD();
    updateTicker(dt);
    UI.infoTimer += dt;
    if (UI.infoTimer > 0.5) {
      UI.infoTimer = 0;
      if (!el.info.classList.contains('hidden')) {
        const a = document.activeElement;
        if (!(a && el.info.contains(a) && a.tagName === 'SELECT')) renderInfo();
      }
      if (!el.sheet.classList.contains('hidden')) renderBuildListCosts();
      if (UI.modalOpen && UI.finTab === 'now' && $('#modal-title').textContent === '経営') { /* 静的表示 */ }
      showEventBanner();
    }
  }
  requestAnimationFrame(loop);
}
function renderBuildListCosts() {
  el.list.querySelectorAll('.card').forEach((c) => {
    const id = c.dataset.id;
    const d = id ? (B[id] || ROADS[id]) : null;
    if (d) c.classList.toggle('cant', S.money < d.cost);
  });
}

function init() {
  document.querySelectorAll('img[data-icon]').forEach((img) => { img.src = iconURL(img.dataset.icon); });
  $('#btn-continue').disabled = !hasSave();
  drawTitleArt();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawTitleArt(); });
  window.addEventListener('resize', () => { if (S) resizeCanvas(); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { if (S) resizeCanvas(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && S) saveGame(true); });
  window.addEventListener('pagehide', () => { if (S) saveGame(true); });
  requestAnimationFrame(loop);
}
init();

})();
