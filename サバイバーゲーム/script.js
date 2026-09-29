/* =========================================================
 *  LUMINA FALL -光墜のサバイバー-
 *  made by hiro/ヒロ  https://github.com/h1ro223
 * ========================================================= */
'use strict';
(() => {

// ================= UTILS =================
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let RNG = Math.random;
const rr = (a, b) => a + (b - a) * RNG();
const ri = (a, b) => Math.floor(a + (b - a + 1) * RNG());
const pick = a => a[Math.floor(RNG() * a.length)];
const vr = Math.random;
const vrr = (a, b) => a + (b - a) * Math.random();
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function fmtTime(s) { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function fmtNum(n) { n = Math.floor(n); if (n >= 1e7) return (n / 1e6).toFixed(1) + 'M'; if (n >= 1e5) return (n / 1e3).toFixed(0) + 'K'; return n.toLocaleString('ja-JP'); }
const $ = id => document.getElementById(id);
function h(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function angDiff(a, b) { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
function wpickObj(obj) { let tot = 0; for (const k in obj) tot += obj[k]; let r = RNG() * tot; for (const k in obj) { r -= obj[k]; if (r <= 0) return k; } return Object.keys(obj)[0]; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ================= SAVE =================
const SAVE_KEY = 'lumina_fall_save_v1';
function defSave() {
  return {
    v: 1, shards: 0, up: {}, chars: ['akira'], ach: {}, stages: 1, clears: {}, maxAbyss: 0,
    stats: { runs: 0, kills: 0, time: 0, bosses: 0, chests: 0, gold: 0, maxLv: 0, dashes: 0, ults: 0, lanterns: 0, daily: 0, buys: 0, maxRunKills: 0, longest: 0, evos: 0, wdmg: {}, flags: {} },
    codex: { w: {}, e: {}, p: {}, en: {}, b: {} },
    best: {}, charClear: {},
    daily: { date: '', claimed: false, best: 0 },
    sel: { stage: 's1', char: 'akira', abyss: 0 },
    set: { bgm: 0.5, se: 0.7, shake: true, dmgNum: true, quality: 'high', joy: 'float', fps: false },
    tut: false
  };
}
let SAVE = defSave();
function deepMerge(base, src) {
  for (const k in src) {
    const v = src[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) deepMerge(base[k], v);
    else base[k] = v;
  }
  return base;
}
function loadSave() {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    if (s) SAVE = deepMerge(defSave(), JSON.parse(s));
  } catch (e) { SAVE = defSave(); }
  if (!Array.isArray(SAVE.chars) || !SAVE.chars.length) SAVE.chars = ['akira'];
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* 保存できない環境 */ } }

// ================= DATA: CHARACTERS =================
const CHARS = [
  { id: 'akira', name: 'アキラ', title: '光弾の射手', col: '#6ef2ff', col2: '#2f5bff', weapon: 'pulse', ult: 'nova', ultName: 'ノヴァバースト', ultDesc: '画面内の全ての敵に大ダメージ', passive: '経験値獲得 +10%', mod: { growth: .1 }, lock: null, story: '墜ちた星の欠片を拾った少年。まっすぐな光弾で道を切り開く。' },
  { id: 'rin', name: 'リン', title: '疾風の剣士', col: '#7dffb0', col2: '#12935a', weapon: 'sword', ult: 'timestop', ultName: 'クロノ・ブレイク', ultDesc: '5秒間、全ての敵と弾の時間を止める', passive: '移動速度 +15% / ダッシュ間隔 -25%', mod: { speed: .15, dash: .25 }, lock: 'surv5', story: '誰よりも速く駆ける剣士。止まった時の中でも剣は止まらない。' },
  { id: 'gou', name: 'ゴウ', title: '鋼の守護者', col: '#ffb35e', col2: '#b8461b', weapon: 'nova', ult: 'fortress', ultName: '不動城塞', ultDesc: '6秒間無敵になり、衝撃波を連発する', passive: '最大HP +50 / 防御 +2 / 移動速度 -10%', mod: { maxHp: 50, armor: 2, speed: -.1 }, lock: 'k1000', story: '仲間を守るため鋼の鎧をまとった大男。一歩も退かない。' },
  { id: 'miko', name: 'ミコ', title: '雷鳴の巫女', col: '#c9a2ff', col2: '#6b3dff', weapon: 'chain', ult: 'thunder', ultName: '天雷招来', ultDesc: '4秒間、敵に無数の落雷が降り注ぐ', passive: '範囲 +15% / クールダウン -8%', mod: { area: .15, cd: .08 }, lock: 'c1', story: '雷神に仕える巫女。祈りは雷となって魔を祓う。' },
  { id: 'shin', name: 'シン', title: '弾幕の狙撃手', col: '#ff7a9c', col2: '#c21f55', weapon: 'scatter', ult: 'barrage', ultName: 'フルバースト', ultDesc: '3秒間、全方位に弾幕を展開する', passive: '武器の数 +1 / 攻撃力 -10%', mod: { amount: 1, might: -.1 }, lock: 'lv30', story: '弾数こそ正義と信じる狙撃手。狙いは大雑把だが数で押し切る。' },
  { id: 'noa', name: 'ノア', title: '機巧の司令', col: '#8affff', col2: '#159aa8', weapon: 'drone', ult: 'legion', ultName: 'スウォーム展開', ultDesc: '8秒間、強化ドローン6機を召喚する', passive: '持続 +20% / 弾速 +10%', mod: { dur: .2, pspd: .1 }, lock: 'c3', story: '自作のドローンを率いる天才技師。戦場は彼女の実験場。' },
  { id: 'kuro', name: 'クロ', title: '賭博の黒猫', col: '#ffe066', col2: '#9b7a00', weapon: 'boomerang', ult: 'jackpot', ultName: 'ジャックポット', ultDesc: 'ランダムで3種の強力な効果のどれかが発動', passive: '運 +50% / 強欲 +30% / 最大HP -30%', mod: { luck: .5, greed: .3, hpMul: -.3 }, lock: 'chest20', story: '全てを運に賭ける気まぐれな黒猫。当たれば大きい。' },
  { id: 'lux', name: 'ルクス', title: '光墜の聖女', col: '#fff6d8', col2: '#e0a82e', weapon: 'laser', ult: 'judgement', ultName: 'ルミナ・ジャッジ', ultDesc: '全ての敵に超ダメージ＋HPを50%回復', passive: '全能力が少しずつ上昇', mod: { might: .1, area: .1, cd: .08, speed: .08, maxHp: 20, luck: .1 }, lock: 'c5', story: '星を墜とした張本人とも噂される聖女。その光は全てを裁く。' },
];

// ================= DATA: WEAPONS =================
// levels: Lv2〜Lv8で加算される値（area/spdは割合、その他は加算）
const WEAPONS = {
  pulse: { name: 'パルスショット', icon: '💠', desc: '最も近い敵に光弾を発射する。', amtName: '発射数',
    base: { dmg: 10, cd: 1.05, amt: 1, area: 1, spd: 440, pierce: 0, dur: 1.3, kb: 3 },
    levels: [{ amt: 1 }, { dmg: 5 }, { cd: -.15 }, { pierce: 1 }, { amt: 1 }, { dmg: 6 }, { pierce: 1, dmg: 6 }],
    evo: { id: 'hyperpulse', name: 'ハイパーパルス', icon: '🌟', need: 'power', desc: '巨大な光弾が敵を貫き、命中時に爆発する。', mod: s => { s.dmg += 14; s.pierce = 999; s.area *= 1.5; s.cd *= .7; s.amt += 1; } } },
  orbit: { name: 'オービットブレード', icon: '🪐', desc: '周囲を回転する光刃を一定時間展開する。', amtName: '刃の数',
    base: { dmg: 9, cd: 3.2, amt: 1, area: 1, spd: 3.4, pierce: 0, dur: 3, kb: 5 },
    levels: [{ amt: 1 }, { area: .25, spd: .3 }, { dur: .5, dmg: 4 }, { amt: 1 }, { area: .25, spd: .3 }, { dur: .5, dmg: 5 }, { amt: 1 }],
    evo: { id: 'eternal', name: 'エターナル・リング', icon: '💍', need: 'duration', desc: '光刃が消えずに永遠に回り続ける。', mod: s => { s.dmg += 10; s.amt += 1; s.area *= 1.2; } } },
  nova: { name: 'ショックウェーブ', icon: '💫', desc: '自分を中心に衝撃波を放ち、敵を吹き飛ばす。', amtName: '波の数',
    base: { dmg: 14, cd: 2.6, amt: 1, area: 1, spd: 1, pierce: 0, dur: 1, kb: 16 },
    levels: [{ dmg: 6 }, { area: .2 }, { cd: -.3 }, { dmg: 8 }, { area: .2 }, { amt: 1 }, { dmg: 10 }],
    evo: { id: 'quake', name: 'グランドクエイク', icon: '🌋', need: 'armor', desc: '大地を揺るがす巨大衝撃波。敵を気絶させる。', mod: s => { s.dmg += 22; s.area *= 1.45; s.cd *= .8; s.kb += 8; } } },
  chain: { name: 'チェインボルト', icon: '⚡', desc: '敵から敵へと連鎖する雷撃を落とす。', amtName: '落雷数', pierceName: '連鎖数',
    base: { dmg: 15, cd: 1.6, amt: 1, area: 1, spd: 1, pierce: 2, dur: 1, kb: 0 },
    levels: [{ pierce: 1 }, { dmg: 6 }, { amt: 1 }, { cd: -.2 }, { pierce: 2 }, { dmg: 8 }, { amt: 1 }],
    evo: { id: 'raijin', name: '天雷ジャッジメント', icon: '🌩️', need: 'area', desc: '連鎖数が大幅に増え、命中点で放電爆発する。', mod: s => { s.dmg += 12; s.pierce += 4; s.cd *= .8; } } },
  scatter: { name: 'スキャッター', icon: '✳️', desc: '扇状に散弾をばら撒く。近距離で強力。', amtName: '弾数',
    base: { dmg: 7, cd: 1.3, amt: 5, area: 1, spd: 540, pierce: 0, dur: .34, kb: 9 },
    levels: [{ amt: 2 }, { dmg: 3 }, { cd: -.15 }, { pierce: 1 }, { amt: 2 }, { dmg: 4 }, { dur: .1, amt: 2 }],
    evo: { id: 'dragon', name: 'ドラゴンブレス', icon: '🐉', need: 'amount', desc: '炎の散弾が敵を貫き、燃やし尽くす。', mod: s => { s.dmg += 6; s.amt += 4; s.pierce += 3; s.dur *= 1.35; } } },
  drone: { name: 'ガードドローン', icon: '🛸', desc: '周囲を飛ぶドローンが自動で射撃する。', amtName: 'ドローン数',
    base: { dmg: 8, cd: .9, amt: 1, area: 1, spd: 480, pierce: 0, dur: 1.1, kb: 2 },
    levels: [{ dmg: 3 }, { amt: 1 }, { cd: -.12 }, { pierce: 1 }, { amt: 1 }, { dmg: 4 }, { cd: -.12, amt: 1 }],
    evo: { id: 'legion', name: 'ドローン・レギオン', icon: '🤖', need: 'magnet', desc: 'ドローンが増え、貫通弾を高速連射する。', mod: s => { s.amt += 2; s.cd *= .6; s.pierce += 2; s.dmg += 4; } } },
  flame: { name: 'フレイムトレイル', icon: '🔥', desc: '足元に燃え盛る炎を設置する。', amtName: '炎の数',
    base: { dmg: 6, cd: 1.5, amt: 1, area: 1, spd: 1, pierce: 0, dur: 2.5, kb: 0 },
    levels: [{ dmg: 3 }, { area: .2 }, { dur: 1 }, { cd: -.25 }, { dmg: 4 }, { amt: 1 }, { area: .25, dmg: 4 }],
    evo: { id: 'inferno', name: 'インフェルノ', icon: '☄️', need: 'heart', desc: '歩いた跡が炎の海となる。', mod: s => { s.dmg += 8; s.area *= 1.5; s.dur += 2; } } },
  frost: { name: 'フロストシャード', icon: '❄️', desc: '敵を鈍足にする氷の破片を放つ。', amtName: '氷片数',
    base: { dmg: 9, cd: 1.25, amt: 2, area: 1, spd: 380, pierce: 0, dur: 1.4, kb: 2 },
    levels: [{ amt: 1 }, { dmg: 4 }, { pierce: 1 }, { cd: -.15 }, { amt: 1 }, { dmg: 5 }, { amt: 2 }],
    evo: { id: 'zero', name: 'アブソリュート・ゼロ', icon: '🧊', need: 'wing', desc: '敵を凍結させ、撃破時に砕け散って周囲を巻き込む。', mod: s => { s.dmg += 8; s.amt += 2; s.pierce += 1; } } },
  boomerang: { name: 'ブーメラン', icon: '🪃', desc: '投げると戻ってくる。往復で敵を切り裂く。', amtName: '投擲数',
    base: { dmg: 12, cd: 1.7, amt: 1, area: 1, spd: 420, pierce: 999, dur: 1.6, kb: 5 },
    levels: [{ dmg: 5 }, { amt: 1 }, { area: .2 }, { spd: .2 }, { amt: 1 }, { dmg: 7 }, { amt: 1 }],
    evo: { id: 'fortune', name: 'フォーチュン・サイクル', icon: '🎰', need: 'clover', desc: '巨大化し、会心ダメージが3倍になる。', mod: s => { s.dmg += 14; s.area *= 1.5; s.amt += 1; } } },
  laser: { name: 'プリズムレーザー', icon: '🔆', desc: '敵を貫く光線を照射する。', amtName: 'ビーム数',
    base: { dmg: 6, cd: 1.9, amt: 1, area: 1, spd: 1, pierce: 0, dur: .55, kb: 0 },
    levels: [{ dmg: 2 }, { dur: .2 }, { amt: 1 }, { area: .2 }, { cd: -.3 }, { dmg: 3 }, { amt: 1 }],
    evo: { id: 'ray', name: 'ジャッジメント・レイ', icon: '☀️', need: 'lens', desc: '回転する光線が全方位を薙ぎ払い続ける。', mod: s => { s.dmg += 4; s.area *= 1.25; } } },
  bomb: { name: 'グラビティボム', icon: '🕳️', desc: '敵を引き寄せてから爆発する重力弾。', amtName: '爆弾数',
    base: { dmg: 40, cd: 3.2, amt: 1, area: 1, spd: 1, pierce: 0, dur: 1, kb: 0 },
    levels: [{ dmg: 15 }, { area: .2 }, { cd: -.4 }, { amt: 1 }, { dmg: 20 }, { area: .2 }, { amt: 1 }],
    evo: { id: 'blackhole', name: 'ブラックホール', icon: '🌌', need: 'tome', desc: '全てを飲み込む暗黒の渦。吸引中も継続ダメージ。', mod: s => { s.dmg *= 1.8; s.area *= 1.5; s.dur += 1.2; } } },
  sword: { name: '光剣', icon: '🗡️', desc: '正面を大きく斬り払う。', amtName: '斬撃数',
    base: { dmg: 18, cd: 1.0, amt: 1, area: 1, spd: 1, pierce: 0, dur: 1, kb: 12 },
    levels: [{ dmg: 6 }, { area: .15 }, { amt: 1 }, { cd: -.15 }, { dmg: 8 }, { area: .2 }, { amt: 1 }],
    evo: { id: 'moon', name: '月華斬', icon: '🌙', need: 'cool', desc: '斬撃と同時に三日月の衝撃波を飛ばす。', mod: s => { s.dmg += 14; s.area *= 1.15; } } },
};
const WIDS = Object.keys(WEAPONS);
const WMAX = 8;

// ================= DATA: PASSIVES =================
const PASSIVES = {
  power: { name: 'パワーコア', icon: '💪', max: 5, desc: '攻撃力 +10%', apply: (B, l) => { B.might += .1 * l; } },
  duration: { name: '刻の砂時計', icon: '⏳', max: 5, desc: '効果の持続 +10%', apply: (B, l) => { B.dur += .1 * l; } },
  armor: { name: '装甲プレート', icon: '🛡️', max: 5, desc: '防御 +1（受けるダメージ -1）', apply: (B, l) => { B.armor += l; } },
  area: { name: '増幅器', icon: '📡', max: 5, desc: '攻撃範囲 +10%', apply: (B, l) => { B.area += .1 * l; } },
  amount: { name: 'マルチバレル', icon: '🎯', max: 2, desc: '全武器の数 +1', apply: (B, l) => { B.amount += l; } },
  magnet: { name: '磁場コイル', icon: '🧲', max: 5, desc: '回収範囲 +30%', apply: (B, l) => { B.magnet += .3 * l; } },
  heart: { name: '生命の心臓', icon: '❤️', max: 5, desc: '最大HP +20 / 毎秒HP回復 +0.2', apply: (B, l) => { B.maxHp += 20 * l; B.regen += .2 * l; } },
  wing: { name: '疾風の翼', icon: '🍃', max: 5, desc: '移動速度 +8%', apply: (B, l) => { B.speed += .08 * l; } },
  clover: { name: '四つ葉', icon: '🍀', max: 5, desc: '運 +15% / 会心率 +2%', apply: (B, l) => { B.luck += .15 * l; B.crit += .02 * l; } },
  lens: { name: '集光レンズ', icon: '🔍', max: 5, desc: '弾速 +12%', apply: (B, l) => { B.pspd += .12 * l; } },
  tome: { name: '知恵の書', icon: '📖', max: 5, desc: '経験値獲得 +10%', apply: (B, l) => { B.growth += .1 * l; } },
  cool: { name: 'クロノギア', icon: '⚙️', max: 5, desc: 'クールダウン -7%', apply: (B, l) => { B.cd += .07 * l; } },
};
const PIDS = Object.keys(PASSIVES);

// ================= DATA: ENEMIES =================
const ENEMIES = {
  slime: { name: 'スライム', hp: 10, spd: 46, dmg: 8, r: 12, xp: 1, col: '#6dff8a', shape: 'blob', ai: 'chase', desc: '平原のどこにでもいる、光を喰らう粘体。' },
  bat: { name: 'ヤミコウモリ', hp: 6, spd: 82, dmg: 6, r: 10, xp: 1, col: '#b98cff', shape: 'bat', ai: 'swarm', desc: '群れで飛び回る夜の眷属。うねるように迫る。' },
  beetle: { name: 'ヨロイ甲虫', hp: 42, spd: 34, dmg: 12, r: 17, xp: 3, col: '#4de0c0', shape: 'bug', ai: 'tank', kbRes: .7, desc: '硬い甲殻で攻撃を受け止める。吹き飛びにくい。' },
  sprout: { name: 'タネ砲台', hp: 18, spd: 38, dmg: 8, r: 13, xp: 2, col: '#c8ff5e', shape: 'sprout', ai: 'shooter', shot: { spd: 170, cd: 3.2, n: 1, sp: 0 }, desc: '距離をとって種を撃ち出してくる。' },
  mummy: { name: 'マミー', hp: 22, spd: 44, dmg: 10, r: 13, xp: 2, col: '#eadcae', shape: 'mummy', ai: 'chase', desc: '遺跡をさまよう包帯の亡者。' },
  scorpion: { name: 'サンドスコーピオン', hp: 26, spd: 50, dmg: 12, r: 14, xp: 2, col: '#ff9d3d', shape: 'bug', ai: 'dash', desc: '狙いを定めると一直線に突進してくる。' },
  wisp: { name: '砂霊', hp: 10, spd: 92, dmg: 7, r: 10, xp: 1, col: '#ffd36b', shape: 'orb', ai: 'swarm', desc: '砂嵐に宿る小さな精霊。とても素早い。' },
  cobra: { name: 'コブラ術士', hp: 24, spd: 42, dmg: 9, r: 13, xp: 2, col: '#ff7b4d', shape: 'imp', ai: 'shooter', shot: { spd: 190, cd: 2.8, n: 3, sp: .35 }, desc: '三方向に呪いの弾を放つ術士。' },
  iceslime: { name: '氷スライム', hp: 24, spd: 46, dmg: 10, r: 15, xp: 2, col: '#7fe8ff', shape: 'blob', ai: 'chase', split: 'icelet', desc: '倒すと二つに分裂する冷たい粘体。' },
  icelet: { name: '氷のかけら', hp: 9, spd: 72, dmg: 6, r: 9, xp: 1, col: '#c4f7ff', shape: 'blob', ai: 'chase', desc: '氷スライムから分かれた小さな分身。' },
  crystal: { name: 'クリスタル', hp: 30, spd: 34, dmg: 10, r: 14, xp: 2, col: '#9ab8ff', shape: 'crystal', ai: 'shooter', shot: { spd: 150, cd: 3.4, n: 6, sp: TAU }, desc: '全方位に氷弾をばら撒く結晶体。' },
  yeti: { name: 'イエティ', hp: 95, spd: 36, dmg: 16, r: 21, xp: 5, col: '#e6f6ff', shape: 'block', ai: 'tank', kbRes: .8, desc: '洞窟の主。怪力で押し潰してくる。' },
  icebat: { name: '氷コウモリ', hp: 12, spd: 96, dmg: 8, r: 10, xp: 1, col: '#5ec8ff', shape: 'bat', ai: 'swarm', desc: '冷気をまとう俊敏なコウモリ。' },
  bomber: { name: 'ボマー', hp: 20, spd: 74, dmg: 24, r: 13, xp: 2, col: '#ff5d5d', shape: 'bomb', ai: 'exploder', desc: '近づくと自爆する。光ったら離れよう。' },
  imp: { name: 'インプ', hp: 22, spd: 58, dmg: 12, r: 13, xp: 2, col: '#ff7a2e', shape: 'imp', ai: 'dash', desc: '素早い突進を繰り返す小悪魔。' },
  magma: { name: 'マグマ岩', hp: 120, spd: 32, dmg: 18, r: 23, xp: 6, col: '#ff4a1a', shape: 'block', ai: 'tank', kbRes: .85, desc: '灼熱の岩塊。とても硬い。' },
  firebat: { name: '火炎コウモリ', hp: 16, spd: 100, dmg: 9, r: 11, xp: 1, col: '#ffb13d', shape: 'bat', ai: 'swarm', desc: '火の粉を撒き散らしながら飛ぶ。' },
  salamander: { name: 'サラマンダー', hp: 34, spd: 44, dmg: 11, r: 14, xp: 3, col: '#ff3d6b', shape: 'bug', ai: 'shooter', shot: { spd: 200, cd: 2.6, n: 2, sp: .25 }, desc: '炎の弾を二連で吐き出すトカゲ。' },
  wraith: { name: 'レイス', hp: 34, spd: 52, dmg: 12, r: 14, xp: 3, col: '#c28bff', shape: 'ghost', ai: 'teleport', desc: '姿を消しては目の前に現れる怨霊。' },
  voidling: { name: 'ヴォイドリング', hp: 16, spd: 95, dmg: 9, r: 10, xp: 1, col: '#8f6bff', shape: 'orb', ai: 'swarm', desc: '虚空から湧き出る小さな闇。' },
  priest: { name: '闇司祭', hp: 50, spd: 40, dmg: 10, r: 15, xp: 4, col: '#ff6bd6', shape: 'priest', ai: 'healer', desc: '周囲の魔物の傷を癒やす。最優先で倒そう。' },
  hive: { name: 'ハイヴ', hp: 140, spd: 26, dmg: 14, r: 22, xp: 8, col: '#b04dff', shape: 'hive', ai: 'spawner', spawn: 'voidling', desc: 'ヴォイドリングを生み出し続ける巣。' },
  knight: { name: '虚空騎士', hp: 110, spd: 40, dmg: 18, r: 18, xp: 5, col: '#7a6bff', shape: 'knight', ai: 'tank', kbRes: .9, desc: '神殿を守る不滅の騎士。' },
  eye: { name: '監視の眼', hp: 40, spd: 40, dmg: 10, r: 14, xp: 3, col: '#ff4dff', shape: 'eye', ai: 'shooter', shot: { spd: 220, cd: 2.4, n: 1, sp: 0, burst: 3 }, desc: '三連射で狙い撃ってくる浮遊眼。' },
  lantern: { name: '灯籠', hp: 1, spd: 0, dmg: 0, r: 13, xp: 0, col: '#ffcf7a', shape: 'lantern', ai: 'static', prop: true, desc: '' },
};
const EIDS = Object.keys(ENEMIES).filter(k => !ENEMIES[k].prop);

// ================= DATA: STAGES =================
const STAGES = [
  { id: 's1', name: '翠の平原', en: 'Verdant Field', col: '#6dff8a', bg: '#08180f', mult: 1, bgm: 's1', desc: '星が最初に墜ちた緑の大地。旅はここから始まる。',
    waves: [[0, { slime: 1 }, 1.1], [25, { slime: 3, bat: 1 }, 1.7], [80, { slime: 2, bat: 2, beetle: .4 }, 2.3], [150, { slime: 2, bat: 3, beetle: 1 }, 3], [240, { slime: 2, bat: 2, beetle: 1, sprout: 1 }, 3.6], [330, { beetle: 2, sprout: 1.2, bat: 3, slime: 2 }, 4.4], [420, { slime: 3, beetle: 2, sprout: 2, bat: 3 }, 5.2]],
    elites: ['slime', 'beetle', 'bat'], swarm: 'bat', ring: 'slime', mid: 'beetle', midName: 'ヌシ甲虫', boss: 'kingslime' },
  { id: 's2', name: '砂塵の遺跡', en: 'Dune Ruins', col: '#ffc15e', bg: '#1a1106', mult: 1.2, bgm: 's2', desc: '砂に埋もれた古代文明。亡者たちが眠りを妨げられ目を覚ます。',
    waves: [[0, { mummy: 1, wisp: .5 }, 1.3], [30, { mummy: 2, wisp: 2 }, 2], [90, { mummy: 2, wisp: 2, scorpion: 1 }, 2.6], [160, { mummy: 2, scorpion: 1.5, wisp: 2, cobra: .6 }, 3.2], [240, { mummy: 2, scorpion: 2, cobra: 1, wisp: 2 }, 3.9], [330, { scorpion: 2, cobra: 1.5, wisp: 3, mummy: 2 }, 4.7], [420, { mummy: 3, scorpion: 2, cobra: 2, wisp: 3 }, 5.5]],
    elites: ['mummy', 'scorpion', 'cobra'], swarm: 'wisp', ring: 'mummy', mid: 'scorpion', midName: 'キングスコーピオン', boss: 'colossus' },
  { id: 's3', name: '氷晶の洞窟', en: 'Crystal Cavern', col: '#7fe8ff', bg: '#06111e', mult: 1.45, bgm: 's3', desc: '星の欠片が凍りついた地下洞窟。美しくも冷酷な世界。',
    waves: [[0, { iceslime: 1, icebat: .5 }, 1.2], [30, { iceslime: 2, icebat: 2 }, 1.9], [90, { iceslime: 2, icebat: 2, crystal: .6 }, 2.5], [160, { iceslime: 2, icebat: 3, crystal: 1, yeti: .4 }, 3.1], [240, { iceslime: 2, icebat: 2, crystal: 1, yeti: 1 }, 3.8], [330, { iceslime: 3, icebat: 3, crystal: 1.5, yeti: 1.2 }, 4.6], [420, { iceslime: 3, icebat: 3, crystal: 2, yeti: 2 }, 5.4]],
    elites: ['iceslime', 'yeti', 'crystal'], swarm: 'icebat', ring: 'iceslime', mid: 'yeti', midName: 'ビッグフット', boss: 'glacia' },
  { id: 's4', name: '紅蓮の火山', en: 'Crimson Volcano', col: '#ff6a3d', bg: '#1c0906', mult: 1.75, bgm: 's4', desc: '星の熱が大地を溶かす灼熱地帯。爆ぜる魔物に気をつけて。',
    waves: [[0, { imp: 1, firebat: .6 }, 1.3], [30, { imp: 2, firebat: 2, bomber: .5 }, 2], [90, { imp: 2, firebat: 2, bomber: 1, salamander: .5 }, 2.6], [160, { imp: 2, firebat: 3, bomber: 1, salamander: 1, magma: .4 }, 3.3], [240, { imp: 2, firebat: 2, bomber: 1.5, salamander: 1, magma: 1 }, 4], [330, { imp: 2, firebat: 3, bomber: 2, salamander: 1.5, magma: 1.2 }, 4.8], [420, { imp: 3, firebat: 3, bomber: 2, salamander: 2, magma: 2 }, 5.6]],
    elites: ['imp', 'magma', 'salamander'], swarm: 'firebat', ring: 'bomber', mid: 'magma', midName: 'マグマゴーレム', boss: 'ifrit' },
  { id: 's5', name: '虚空の神殿', en: 'Void Sanctum', col: '#c04dff', bg: '#0f0722', mult: 2.1, bgm: 's5', desc: '全ての光が還る場所。虚無の王が玉座で待つ。',
    waves: [[0, { voidling: 1, wraith: .5 }, 1.4], [30, { voidling: 2, wraith: 1, eye: .4 }, 2.1], [90, { voidling: 2, wraith: 1, eye: 1, priest: .4 }, 2.8], [160, { voidling: 3, wraith: 1.5, eye: 1, priest: .6, knight: .5 }, 3.5], [240, { voidling: 3, wraith: 1.5, eye: 1.2, priest: .8, knight: 1, hive: .3 }, 4.2], [330, { voidling: 3, wraith: 2, eye: 1.5, priest: 1, knight: 1.2, hive: .5 }, 5], [420, { voidling: 4, wraith: 2, eye: 2, priest: 1, knight: 2, hive: .6 }, 5.8]],
    elites: ['wraith', 'knight', 'eye'], swarm: 'voidling', ring: 'wraith', mid: 'knight', midName: '虚空の近衛', boss: 'nemesis' },
];
const STAGE_LEN = 480;
const EVENTS = [[45, 'elite'], [75, 'swarm'], [120, 'ring'], [150, 'elite'], [195, 'swarm'], [240, 'mid'], [300, 'elite'], [330, 'ring'], [370, 'swarm'], [400, 'elite'], [440, 'ring'], [STAGE_LEN, 'boss']];

// ================= DATA: BOSSES =================
const BOSSES = {
  kingslime: { name: 'キングスライム', shape: 'blob', col: '#6dff8a', hp: 2600, r: 46, spd: 52, dmg: 20, pats: ['slam', 'ring', 'summon', 'fan'], summon: 'slime', xp: 200, desc: '平原のスライムを統べる王。巨体で押し潰しにくる。' },
  colossus: { name: '砂塵の巨像アヌ', shape: 'mummy', col: '#ffc15e', hp: 4200, r: 48, spd: 46, dmg: 22, pats: ['spiral', 'charge', 'fan', 'summon'], summon: 'mummy', xp: 260, desc: '遺跡を守り続けてきた巨像。螺旋の呪弾を放つ。' },
  glacia: { name: '氷晶竜グラシア', shape: 'crystal', col: '#7fe8ff', hp: 6000, r: 46, spd: 58, dmg: 24, pats: ['fan', 'charge', 'ring', 'pillars', 'summon'], summon: 'icelet', xp: 320, desc: '洞窟の最奥で眠っていた結晶の竜。' },
  ifrit: { name: '炎魔イフリート', shape: 'imp', col: '#ff5a2e', hp: 8000, r: 50, spd: 55, dmg: 26, pats: ['pillars', 'spiral', 'meteor', 'ring', 'charge'], summon: 'firebat', xp: 400, desc: '火山の心臓に宿る炎の魔人。隕石を降らせる。' },
  nemesis: { name: '虚無王ネメシス', shape: 'eye', col: '#c04dff', hp: 11000, r: 54, spd: 50, dmg: 30, pats: ['teleport', 'spiral', 'pillars', 'fan', 'summon', 'meteor', 'ring'], summon: 'voidling', xp: 600, phase2: true, desc: '光を喰らい尽くそうとする虚無の王。追い詰めると本気を出す。' },
};
const BIDS = Object.keys(BOSSES);

// ================= DATA: SHOP =================
const SHOP = [
  { id: 'hp', name: '生命力', icon: '❤️', max: 5, cost: 120, desc: '最大HP +10', apply: (B, l) => { B.maxHp += 10 * l; } },
  { id: 'might', name: '攻撃力', icon: '💪', max: 5, cost: 200, desc: '攻撃力 +5%', apply: (B, l) => { B.might += .05 * l; } },
  { id: 'armor', name: '防御', icon: '🛡️', max: 3, cost: 300, desc: '防御 +1', apply: (B, l) => { B.armor += l; } },
  { id: 'speed', name: '移動速度', icon: '🍃', max: 3, cost: 200, desc: '移動速度 +5%', apply: (B, l) => { B.speed += .05 * l; } },
  { id: 'magnet', name: '回収範囲', icon: '🧲', max: 3, cost: 150, desc: '回収範囲 +15%', apply: (B, l) => { B.magnet += .15 * l; } },
  { id: 'growth', name: '成長', icon: '📖', max: 5, cost: 250, desc: '経験値獲得 +5%', apply: (B, l) => { B.growth += .05 * l; } },
  { id: 'luck', name: '運', icon: '🍀', max: 3, cost: 250, desc: '運 +10%', apply: (B, l) => { B.luck += .1 * l; } },
  { id: 'cd', name: 'クールダウン', icon: '⚙️', max: 3, cost: 400, desc: 'クールダウン -3%', apply: (B, l) => { B.cd += .03 * l; } },
  { id: 'area', name: '範囲', icon: '📡', max: 3, cost: 300, desc: '攻撃範囲 +5%', apply: (B, l) => { B.area += .05 * l; } },
  { id: 'dur', name: '持続', icon: '⏳', max: 3, cost: 250, desc: '効果の持続 +5%', apply: (B, l) => { B.dur += .05 * l; } },
  { id: 'regen', name: '再生', icon: '💚', max: 3, cost: 300, desc: '毎秒HP回復 +0.2', apply: (B, l) => { B.regen += .2 * l; } },
  { id: 'greed', name: '強欲', icon: '💰', max: 5, cost: 150, desc: '星片獲得 +10%', apply: (B, l) => { B.greed += .1 * l; } },
  { id: 'crit', name: '会心', icon: '✨', max: 3, cost: 300, desc: '会心率 +3%', apply: (B, l) => { B.crit += .03 * l; } },
  { id: 'ult', name: '必殺チャージ', icon: '🌟', max: 3, cost: 300, desc: '必殺ゲージ獲得 +10%', apply: (B, l) => { B.ult += .1 * l; } },
  { id: 'dash', name: 'ダッシュ短縮', icon: '💨', max: 3, cost: 250, desc: 'ダッシュ間隔 -10%', apply: (B, l) => { B.dash += .1 * l; } },
  { id: 'reroll', name: 'リロール', icon: '🎲', max: 5, cost: 200, desc: 'レベルアップ時の選び直し +1回' },
  { id: 'skip', name: 'スキップ', icon: '⏭️', max: 3, cost: 150, desc: 'レベルアップ報酬のスキップ +1回' },
  { id: 'banish', name: '除外', icon: '🚫', max: 3, cost: 250, desc: '候補をそのプレイ中出なくする +1回' },
  { id: 'amount', name: '発射数', icon: '🎯', max: 1, cost: 3000, desc: '全武器の数 +1', apply: (B, l) => { B.amount += l; } },
  { id: 'revive', name: '復活', icon: '👼', max: 2, cost: 2500, desc: '力尽きた時に1度復活', apply: (B, l) => { B.revive += l; } },
];
const shopCost = (s, l) => s.cost * (l + 1);
const upLv = id => SAVE.up[id] || 0;

// ================= DATA: DAILY MODIFIERS =================
const DMODS = [
  { id: 'glass', name: 'ガラスの大砲', desc: '攻撃力 +50% / 最大HP -50%', apply: B => { B.might += .5; B.hpMul -= .5; } },
  { id: 'horde', name: '大群', desc: '敵の出現数 +50% / 経験値 +20%', g: { rate: 1.5 }, apply: B => { B.growth += .2; } },
  { id: 'swift', name: '俊敏な敵', desc: '敵の移動速度 +25%', g: { spd: 1.25 } },
  { id: 'rich', name: '豊穣', desc: '星片の獲得量 2倍', apply: B => { B.greed += 1; } },
  { id: 'giant', name: '巨人の国', desc: '敵のHP +60% / 敵が大きく遅い', g: { hp: 1.6, spd: .85, size: 1.25 } },
  { id: 'sudden', name: '背水の陣', desc: '回復アイテムが出ない / 攻撃力 +25%', g: { noHeal: true }, apply: B => { B.might += .25; } },
  { id: 'growth', name: '急成長', desc: '経験値 +50% / 敵のHP +30%', g: { hp: 1.3 }, apply: B => { B.growth += .5; } },
  { id: 'haste', name: '加速世界', desc: '自分と敵の速度 +20% / クールダウン -10%', g: { spd: 1.2 }, apply: B => { B.speed += .2; B.cd += .1; } },
];

// ================= DATA: ACHIEVEMENTS =================
const ST = () => SAVE.stats;
const FL = k => !!SAVE.stats.flags[k];
const cleared = id => SAVE.clears[id] !== undefined;
const cnt = o => Object.keys(o).length;
const maxClearAbyss = () => { let m = -1; for (const k in SAVE.clears) m = Math.max(m, SAVE.clears[k]); return m; };
const ACHS = [
  { id: 'first', name: 'はじめの一歩', desc: '初めて出撃する', rw: 50, ck: () => ST().runs >= 1 },
  { id: 'surv5', name: '五分間の奇跡', desc: '1回のプレイで5分間生き延びる', rw: 100, ck: () => ST().longest >= 300 },
  { id: 'k1000', name: '千の光', desc: '累計1,000体の敵を倒す', rw: 100, ck: () => ST().kills >= 1000 },
  { id: 'c1', name: '平原の覇者', desc: '翠の平原をクリアする', rw: 200, ck: () => cleared('s1') },
  { id: 'lv30', name: '成長の証', desc: '1回のプレイでレベル30に到達する', rw: 150, ck: () => ST().maxLv >= 30 },
  { id: 'c2', name: '遺跡の踏破者', desc: '砂塵の遺跡をクリアする', rw: 300, ck: () => cleared('s2') },
  { id: 'c3', name: '氷晶を砕く者', desc: '氷晶の洞窟をクリアする', rw: 400, ck: () => cleared('s3') },
  { id: 'chest20', name: '宝探し', desc: '宝箱を累計20個開ける', rw: 150, ck: () => ST().chests >= 20 },
  { id: 'c4', name: '炎を越えて', desc: '紅蓮の火山をクリアする', rw: 500, ck: () => cleared('s4') },
  { id: 'c5', name: '光墜の果て', desc: '虚空の神殿をクリアする', rw: 1000, ck: () => cleared('s5') },
  { id: 'evo1', name: '進化の兆し', desc: '初めて武器を進化させる', rw: 100, ck: () => ST().evos >= 1 },
  { id: 'evo6', name: '進化の探究者', desc: '6種類の進化武器を発見する', rw: 400, ck: () => cnt(SAVE.codex.e) >= 6 },
  { id: 'evo12', name: '全ての光を', desc: '12種類すべての進化武器を発見する', rw: 1500, ck: () => cnt(SAVE.codex.e) >= 12 },
  { id: 'k10k', name: '万の光', desc: '累計10,000体の敵を倒す', rw: 300, ck: () => ST().kills >= 10000 },
  { id: 'k50k', name: '光の奔流', desc: '累計50,000体の敵を倒す', rw: 1000, ck: () => ST().kills >= 50000 },
  { id: 'boss1', name: '巨影を討つ', desc: 'ボスを初めて倒す', rw: 100, ck: () => ST().bosses >= 1 },
  { id: 'boss20', name: 'ボスハンター', desc: 'ボスを累計20体倒す', rw: 500, ck: () => ST().bosses >= 20 },
  { id: 'rk1000', name: '殲滅者', desc: '1回のプレイで1,000体倒す', rw: 150, ck: () => ST().maxRunKills >= 1000 },
  { id: 'rk3000', name: '光の嵐', desc: '1回のプレイで3,000体倒す', rw: 400, ck: () => ST().maxRunKills >= 3000 },
  { id: 'lv50', name: '極光', desc: '1回のプレイでレベル50に到達する', rw: 400, ck: () => ST().maxLv >= 50 },
  { id: 'aby3', name: '深淵を覗く', desc: '深淵レベル3以上でステージをクリアする', rw: 300, ck: () => maxClearAbyss() >= 3 },
  { id: 'aby6', name: '深淵を歩む', desc: '深淵レベル6以上でステージをクリアする', rw: 800, ck: () => maxClearAbyss() >= 6 },
  { id: 'aby10', name: '深淵の主', desc: '深淵レベル10でステージをクリアする', rw: 3000, ck: () => maxClearAbyss() >= 10 },
  { id: 'daily1', name: '今日の挑戦', desc: 'デイリー挑戦をプレイする', rw: 100, ck: () => ST().daily >= 1 },
  { id: 'daily7', name: '継続は力なり', desc: 'デイリー挑戦を7回プレイする', rw: 500, ck: () => ST().daily >= 7 },
  { id: 'gold5k', name: '星屑コレクター', desc: '道中で星片を累計5,000個拾う', rw: 300, ck: () => ST().gold >= 5000 },
  { id: 'full6', name: 'フル装備', desc: '1回のプレイで武器を6つ装備する', rw: 150, ck: () => FL('full6') },
  { id: 'allmax', name: '完全武装', desc: '6つの武器すべてを最大レベルにする', rw: 500, ck: () => FL('allmax') },
  { id: 'nohit', name: '無傷の凱旋', desc: 'ステージボスをノーダメージで倒す', rw: 600, ck: () => FL('nohit') },
  { id: 't15', name: '不屈', desc: '1回のプレイで15分間生き延びる', rw: 400, ck: () => ST().longest >= 900 },
  { id: 't25', name: '永遠の光', desc: '1回のプレイで25分間生き延びる', rw: 1000, ck: () => ST().longest >= 1500 },
  { id: 'ult100', name: '必殺の心得', desc: '必殺技を累計100回使う', rw: 300, ck: () => ST().ults >= 100 },
  { id: 'dash500', name: '疾走者', desc: 'ダッシュを累計500回使う', rw: 200, ck: () => ST().dashes >= 500 },
  { id: 'lan100', name: '灯籠割り', desc: '灯籠を累計100個壊す', rw: 200, ck: () => ST().lanterns >= 100 },
  { id: 'rich', name: '大富豪', desc: '1回のプレイで星片を500個以上拾う', rw: 300, ck: () => FL('rich') },
  { id: 'buy10', name: '投資家', desc: '永続強化を10回購入する', rw: 200, ck: () => ST().buys >= 10 },
  { id: 'shopmax', name: '極めし者', desc: '永続強化をすべて最大にする', rw: 2000, ck: () => SHOP.every(s => upLv(s.id) >= s.max) },
  { id: 'bestiary', name: '魔物博士', desc: '図鑑の敵をすべて発見する', rw: 500, ck: () => EIDS.every(id => SAVE.codex.en[id]) },
  { id: 'bossall', name: '五王討伐', desc: '5体のステージボスをすべて倒す', rw: 1000, ck: () => BIDS.every(id => SAVE.codex.b[id]) },
  { id: 'allchar', name: '集いし光', desc: 'すべてのキャラクターを解放する', rw: 800, ck: () => SAVE.chars.length >= CHARS.length },
  { id: 'charclear', name: '全員の勝利', desc: 'すべてのキャラクターでステージをクリアする', rw: 1500, ck: () => CHARS.every(c => SAVE.charClear[c.id]) },
];
// キャラ解放条件 → 実績ID
const charUnlockAch = c => ACHS.find(a => a.id === c.lock);

// ================= AUDIO =================
const AU = { ctx: null, master: null, bgmG: null, seG: null, nb: null, last: {}, trk: null, trkName: '', step: 0, next: 0, timer: 0, combo: 0, comboT: 0, duck: 1 };
function auInit() {
  if (AU.ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try {
    const c = new AC();
    AU.ctx = c;
    AU.master = c.createGain();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .15;
    AU.master.connect(comp); comp.connect(c.destination);
    AU.bgmG = c.createGain(); AU.seG = c.createGain();
    AU.bgmG.connect(AU.master); AU.seG.connect(AU.master);
    const len = c.sampleRate;
    const b = c.createBuffer(1, len, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    AU.nb = b;
    auVol();
    AU.timer = setInterval(bgmTick, 25);
    // iOS向け：無音を一度鳴らしてアンロック
    const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0);
    return true;
  } catch (e) { AU.ctx = null; return false; }
}
function auVol() {
  if (!AU.ctx) return;
  AU.bgmG.gain.value = SAVE.set.bgm * .5 * AU.duck;
  AU.seG.gain.value = SAVE.set.se * .85;
}
function auUnlock() {
  if (!auInit()) return;
  if (AU.ctx.state === 'suspended') AU.ctx.resume().catch(() => { });
}
const T = () => AU.ctx.currentTime;
function _tone(t, type, f0, f1, dur, vol, dest, cut) {
  const c = AU.ctx;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + .006);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  if (cut) {
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; f.Q.value = 2;
    o.connect(f); f.connect(g);
  } else o.connect(g);
  g.connect(dest || AU.seG);
  o.start(t); o.stop(t + dur + .03);
}
function _noise(t, dur, vol, freq, ft, f1, dest) {
  const c = AU.ctx;
  const s = c.createBufferSource(); s.buffer = AU.nb;
  const f = c.createBiquadFilter(); f.type = ft || 'lowpass'; f.frequency.setValueAtTime(freq, t);
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest || AU.seG);
  s.start(t, Math.random() * .5); s.stop(t + dur + .03);
}
const SFX = {
  shoot: () => _tone(T(), 'square', 980, 520, .05, .022, null, 3500),
  pew: () => _tone(T(), 'square', 1400, 900, .04, .015, null, 4000),
  scatter: () => { _noise(T(), .08, .07, 2500, 'bandpass'); _tone(T(), 'square', 500, 200, .06, .025, null, 2000); },
  hit: () => _noise(T(), .03, .04, 3200, 'highpass'),
  kill: () => _tone(T(), 'triangle', 540, 150, .07, .045),
  gem: p => { const f = 900 * Math.pow(2, Math.min(24, p || 0) / 24); _tone(T(), 'sine', f, f * 1.2, .06, .05); },
  coin: () => { _tone(T(), 'square', 1320, 1320, .05, .03, null, 5000); _tone(T() + .05, 'square', 1760, 1760, .08, .03, null, 5000); },
  lvl: () => { const t = T();[523, 659, 784, 1047].forEach((f, i) => _tone(t + i * .06, 'triangle', f, f, .18, .08)); },
  hurt: () => { _tone(T(), 'sawtooth', 240, 70, .2, .12, null, 1200); _noise(T(), .12, .1, 800); },
  dash: () => _noise(T(), .18, .12, 600, 'bandpass', 3000),
  boom: () => { _noise(T(), .45, .22, 900, 'lowpass', 120); _tone(T(), 'sine', 130, 35, .35, .2); },
  zap: () => { _tone(T(), 'sawtooth', 1600, 240, .09, .035, null, 5000); _noise(T(), .07, .05, 5000, 'highpass'); },
  slash: () => _noise(T(), .12, .09, 1800, 'bandpass', 5000),
  nova: () => { _tone(T(), 'sine', 220, 60, .3, .12); _noise(T(), .25, .06, 400, 'lowpass', 2000); },
  fire: () => _noise(T(), .25, .05, 700, 'lowpass', 200),
  ice: () => _tone(T(), 'sine', 2400, 1400, .08, .03),
  throw: () => _noise(T(), .1, .05, 1200, 'bandpass', 2400),
  laser: () => _tone(T(), 'sawtooth', 320, 900, .35, .04, null, 2600),
  grav: () => _tone(T(), 'sine', 90, 45, .5, .15),
  orbit: () => _tone(T(), 'triangle', 700, 1100, .12, .03),
  chest: () => { const t = T();[392, 523, 659, 784, 1047, 1319].forEach((f, i) => _tone(t + i * .08, 'square', f, f, .22, .05, null, 4000)); },
  evo: () => { const t = T();[523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => _tone(t + i * .07, 'triangle', f, f * 1.01, .3, .09)); _noise(t, .8, .05, 6000, 'highpass'); },
  warn: () => { const t = T(); for (let i = 0; i < 3; i++) { _tone(t + i * .36, 'square', 440, 440, .16, .06, null, 2000); _tone(t + i * .36 + .18, 'square', 330, 330, .16, .06, null, 2000); } },
  elite: () => { const t = T(); _tone(t, 'square', 660, 660, .1, .05, null, 2400); _tone(t + .12, 'square', 880, 880, .14, .05, null, 2400); },
  ult: () => { _tone(T(), 'sawtooth', 160, 1800, .7, .1, null, 3000); _noise(T(), .9, .12, 300, 'lowpass', 6000); },
  click: () => _tone(T(), 'sine', 720, 960, .045, .06),
  back: () => _tone(T(), 'sine', 700, 450, .06, .05),
  buy: () => { const t = T(); _tone(t, 'triangle', 880, 880, .08, .07); _tone(t + .07, 'triangle', 1320, 1320, .14, .07); },
  deny: () => _tone(T(), 'square', 200, 150, .15, .05, null, 1500),
  freeze: () => { _tone(T(), 'sine', 2600, 300, .5, .08); _noise(T(), .5, .05, 7000, 'highpass'); },
  heal: () => { const t = T();[660, 880, 1100].forEach((f, i) => _tone(t + i * .05, 'sine', f, f, .15, .06)); },
  break: () => { _noise(T(), .15, .1, 2000, 'bandpass'); _tone(T(), 'triangle', 900, 300, .1, .04); },
  ach: () => { const t = T();[784, 988, 1175, 1568].forEach((f, i) => _tone(t + i * .09, 'sine', f, f, .3, .07)); },
  revive: () => { const t = T();[262, 330, 392, 523, 659, 784].forEach((f, i) => _tone(t + i * .08, 'triangle', f, f, .4, .08)); },
  bossdie: () => { const t = T(); for (let i = 0; i < 5; i++) _noise(t + i * .15, .5, .18, 1200, 'lowpass', 100); _tone(t, 'sine', 200, 30, 1.2, .2); },
  clear: () => { const t = T();[523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => _tone(t + i * .12, 'square', f, f, i === 7 ? .8 : .14, .06, null, 3500)); },
  over: () => { const t = T();[392, 370, 349, 330, 262].forEach((f, i) => _tone(t + i * .22, 'triangle', f, f, .4, .08)); },
};
const SFXLIM = { hit: .035, kill: .03, gem: .018, shoot: .05, pew: .06, hurt: .15, boom: .08, zap: .06, slash: .05, fire: .15, ice: .08, laser: .12, coin: .05 };
function sfx(n, p) {
  if (!AU.ctx || AU.ctx.state !== 'running' || SAVE.set.se <= 0) return;
  const now = AU.ctx.currentTime;
  const lim = SFXLIM[n] !== undefined ? SFXLIM[n] : .02;
  if (now - (AU.last[n] || 0) < lim) return;
  AU.last[n] = now;
  try { SFX[n] && SFX[n](p); } catch (e) { /* ignore */ }
}

// ---------- 自動生成BGM ----------
const SC_MIN = [0, 2, 3, 5, 7, 8, 10], SC_DOR = [0, 2, 3, 5, 7, 9, 10], SC_PHR = [0, 1, 3, 5, 7, 8, 10], SC_HAR = [0, 2, 3, 5, 7, 8, 11], SC_MAJ = [0, 2, 4, 5, 7, 9, 11];
const TRK = {
  title: { bpm: 84, root: 50, sc: SC_MIN, prog: [0, 5, 2, 6], bass: 1, arp: 2, lead: 1, drum: 0, pad: 1, lw: 'triangle' },
  s1: { bpm: 124, root: 52, sc: SC_DOR, prog: [0, 3, 6, 4], bass: 1, arp: 1, lead: 1, drum: 1, lw: 'square' },
  s2: { bpm: 116, root: 50, sc: SC_PHR, prog: [0, 1, 0, 6], bass: 1, arp: 2, lead: 1, drum: 1, lw: 'triangle' },
  s3: { bpm: 108, root: 54, sc: SC_MIN, prog: [0, 5, 3, 4], bass: 1, arp: 1, lead: 1, drum: 1, pad: 1, lw: 'sine' },
  s4: { bpm: 138, root: 47, sc: SC_HAR, prog: [0, 5, 4, 4], bass: 2, arp: 1, lead: 1, drum: 2, lw: 'square' },
  s5: { bpm: 128, root: 49, sc: SC_MIN, prog: [0, 6, 5, 4], bass: 2, arp: 1, lead: 1, drum: 2, pad: 1, lw: 'sawtooth' },
  boss: { bpm: 156, root: 45, sc: SC_HAR, prog: [0, 0, 5, 4], bass: 2, arp: 1, lead: 1, drum: 3, lw: 'square' },
  result: { bpm: 92, root: 55, sc: SC_MAJ, prog: [0, 4, 5, 3], bass: 1, arp: 2, lead: 1, drum: 0, pad: 1, lw: 'triangle' },
};
const mf = m => 440 * Math.pow(2, (m - 69) / 12);
function noteOf(tr, idx, oct) { const o = Math.floor(idx / 7); const i = ((idx % 7) + 7) % 7; return tr.root + tr.sc[i] + 12 * (o + oct); }
function genMel(name) {
  const r = mulberry32(hashStr('mel' + name));
  const mel = []; let cur = 4;
  for (let i = 0; i < 16; i++) {
    if (r() < .28 && i % 4 !== 0) { mel.push(null); continue; }
    cur += Math.floor(r() * 5) - 2;
    cur = clamp(cur, 0, 9);
    mel.push(cur);
  }
  return mel;
}
function bgm(name) {
  if (AU.trkName === name) return;
  AU.trkName = name; AU.trk = TRK[name] || null;
  if (AU.trk && !AU.trk.mel) AU.trk.mel = genMel(name);
  AU.step = 0;
  AU.next = AU.ctx ? AU.ctx.currentTime + .08 : 0;
}
function bgmTick() {
  const c = AU.ctx;
  if (!c || !AU.trk || c.state !== 'running' || SAVE.set.bgm <= 0) return;
  if (AU.next < c.currentTime - .2) AU.next = c.currentTime + .05;
  let guard = 0;
  while (AU.next < c.currentTime + .15 && guard++ < 16) {
    try { schedStep(AU.step, AU.next); } catch (e) { /* ignore */ }
    AU.next += 60 / AU.trk.bpm / 4;
    AU.step++;
  }
}
function schedStep(i, t) {
  const tr = AU.trk, st = i % 16, bar = Math.floor(i / 16), deg = tr.prog[bar % tr.prog.length];
  const s16 = 60 / tr.bpm / 4, G2 = AU.bgmG;
  if (tr.drum) {
    const kick = tr.drum >= 2 ? st % 4 === 0 : (st === 0 || st === 8 || st === 10);
    if (kick) _tone(t, 'sine', 150, 42, .22, .5, G2);
    if (st === 4 || st === 12) _noise(t, .14, .22, 1800, 'bandpass', null, G2);
    if (st % 2 === 1 || (tr.drum >= 3 && st % 1 === 0)) _noise(t, .04, st % 2 ? .07 : .035, 7000, 'highpass', null, G2);
  }
  if (tr.bass) {
    const on = tr.bass === 2 ? st % 2 === 0 : (st % 4 === 0 || st === 6 || st === 14);
    if (on) { const n = noteOf(tr, deg, -2) + (tr.bass === 2 && st % 4 === 2 ? 12 : 0); _tone(t, 'sawtooth', mf(n), mf(n), s16 * 1.7, .16, G2, 520); }
  }
  if (tr.arp && st % tr.arp === 0) {
    const off = [0, 2, 4, 7][(st / tr.arp) % 4 | 0];
    const n = noteOf(tr, deg + off, 0);
    _tone(t, 'square', mf(n), mf(n), s16 * .9, .045, G2, 2600);
  }
  if (tr.lead && st % 2 === 0 && bar % 4 >= 2) {
    const m = tr.mel[(bar % 2) * 8 + st / 2];
    if (m !== null && m !== undefined) { const n = noteOf(tr, deg + m, 1); _tone(t, tr.lw, mf(n), mf(n), s16 * 1.8, tr.lw === 'sawtooth' ? .04 : .07, G2, 3800); }
  }
  if (tr.pad && st === 0) {
    [0, 2, 4].forEach(o => { const n = noteOf(tr, deg + o, 0); _tone(t, 'sine', mf(n), mf(n), s16 * 15, .05, G2); });
  }
}

// ================= SPRITES =================
const SPR = new Map();
const SS = 2; // スプライトのスーパーサンプリング倍率
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function hexRgb(hex) { let c = hex.replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); const n = parseInt(c, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function shade(hex, amt) {
  let [r, g, b] = hexRgb(hex);
  if (amt > 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function rgba(hex, a) { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; }
function bodyGrad(g, col, r) {
  const gr = g.createRadialGradient(-r * .35, -r * .45, r * .1, 0, 0, r * 1.2);
  gr.addColorStop(0, shade(col, .55)); gr.addColorStop(.55, col); gr.addColorStop(1, shade(col, -.45));
  return gr;
}
function eyes(g, r, x1, x2, y, er, pc) {
  for (const x of [x1, x2]) {
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x * r, y * r, er * r * .8, er * r, 0, 0, TAU); g.fill();
    g.fillStyle = pc || '#1a1030'; g.beginPath(); g.arc(x * r + er * r * .3, y * r + er * r * .1, er * r * .5, 0, TAU); g.fill();
  }
}
function glowEyes(g, r, pts, er, col) {
  g.save(); g.shadowColor = col; g.shadowBlur = r * .6; g.fillStyle = col;
  for (const [x, y] of pts) { g.beginPath(); g.arc(x * r, y * r, er * r, 0, TAU); g.fill(); }
  g.restore();
}
const SHAPES = {
  blob(g, r, col) {
    g.beginPath(); g.moveTo(-r, r * .55);
    g.bezierCurveTo(-r * 1.05, -r * .55, -r * .5, -r * 1.05, 0, -r);
    g.bezierCurveTo(r * .5, -r * 1.05, r * 1.05, -r * .55, r, r * .55);
    g.quadraticCurveTo(r * .5, r * .9, 0, r * .72); g.quadraticCurveTo(-r * .5, r * .9, -r, r * .55); g.closePath();
    g.fillStyle = bodyGrad(g, col, r); g.fill();
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(-r * .45, -r * .5, r * .22, r * .13, -.6, 0, TAU); g.fill();
    eyes(g, r, .1, .52, -.05, .19);
  },
  bat(g, r, col) {
    g.fillStyle = shade(col, -.25);
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(s * r * .3, -r * .1);
      g.quadraticCurveTo(s * r * .9, -r * .95, s * r * 1.35, -r * .45);
      g.quadraticCurveTo(s * r * 1.1, -r * .1, s * r * 1.2, r * .15);
      g.quadraticCurveTo(s * r * .9, 0, s * r * .85, r * .3);
      g.quadraticCurveTo(s * r * .6, r * .1, s * r * .3, r * .3); g.closePath(); g.fill();
    }
    g.fillStyle = bodyGrad(g, col, r * .6); g.beginPath(); g.arc(0, 0, r * .55, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-r * .4, -r * .3); g.lineTo(-r * .25, -r * .8); g.lineTo(-r * .05, -r * .4); g.moveTo(r * .4, -r * .3); g.lineTo(r * .25, -r * .8); g.lineTo(r * .05, -r * .4); g.fill();
    g.shadowBlur = 0;
    glowEyes(g, r, [[-.18, -.05], [.22, -.05]], .1, '#ff4d6d');
  },
  bug(g, r, col) {
    g.strokeStyle = shade(col, -.4); g.lineWidth = r * .12; g.lineCap = 'round';
    for (let i = -1; i <= 1; i++) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(i * r * .4, 0); g.lineTo(i * r * .5 + i * r * .15, s * r * 1.0); g.stroke(); }
    g.fillStyle = bodyGrad(g, col, r); g.beginPath(); g.ellipse(-r * .1, 0, r * .85, r * .72, 0, 0, TAU); g.fill();
    g.fillStyle = shade(col, -.2); g.beginPath(); g.arc(r * .7, 0, r * .42, 0, TAU); g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = shade(col, -.5); g.lineWidth = r * .07; g.beginPath(); g.moveTo(-r * .95, 0); g.lineTo(r * .35, 0); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-r * .35, -r * .35, r * .3, r * .12, -.3, 0, TAU); g.fill();
    glowEyes(g, r, [[.85, -.18], [.85, .18]], .1, '#fff27a');
  },
  sprout(g, r, col) {
    g.fillStyle = shade(col, -.3);
    g.beginPath(); g.ellipse(-r * .3, -r * .9, r * .45, r * .2, -.6, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(r * .25, -r * .95, r * .45, r * .2, .6, 0, TAU); g.fill();
    g.fillStyle = bodyGrad(g, col, r); g.beginPath(); g.arc(0, 0, r * .82, 0, TAU); g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#1a1030'; g.beginPath(); g.ellipse(r * .55, r * .05, r * .28, r * .32, 0, 0, TAU); g.fill();
    g.fillStyle = shade(col, -.5); g.beginPath(); g.ellipse(r * .55, r * .05, r * .14, r * .18, 0, 0, TAU); g.fill();
    eyes(g, r, -.35, .05, -.3, .15);
  },
  mummy(g, r, col) {
    g.fillStyle = bodyGrad(g, col, r);
    g.beginPath(); g.moveTo(-r * .75, r); g.lineTo(-r * .8, -r * .5); g.quadraticCurveTo(0, -r * 1.25, r * .8, -r * .5); g.lineTo(r * .75, r); g.closePath(); g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = shade(col, -.35); g.lineWidth = r * .1;
    for (let i = 0; i < 4; i++) { const y = -r * .35 + i * r * .38; g.beginPath(); g.moveTo(-r * .78, y + r * .12); g.lineTo(r * .78, y - r * .1); g.stroke(); }
    g.fillStyle = '#1a1030'; g.fillRect(-r * .1, -r * .52, r * .8, r * .26);
    glowEyes(g, r, [[.4, -.39]], .11, '#ff5d5d');
  },
  orb(g, r, col) {
    g.fillStyle = rgba(col, .5);
    g.beginPath(); g.moveTo(-r * .3, -r * .6); g.quadraticCurveTo(-r * 1.5, -r * .2, -r * 1.3, r * .1); g.quadraticCurveTo(-r * 1.0, r * .2, -r * .3, r * .6); g.fill();
    const gr = g.createRadialGradient(-r * .2, -r * .2, 0, 0, 0, r * .8);
    gr.addColorStop(0, '#fff'); gr.addColorStop(.4, shade(col, .3)); gr.addColorStop(1, col);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * .75, 0, TAU); g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#1a1030'; g.beginPath(); g.arc(r * .1, -r * .1, r * .11, 0, TAU); g.arc(r * .42, -r * .1, r * .11, 0, TAU); g.fill();
  },
  imp(g, r, col) {
    g.fillStyle = shade(col, -.3);
    g.beginPath(); g.moveTo(-r * .45, -r * .55); g.lineTo(-r * .75, -r * 1.2); g.lineTo(-r * .1, -r * .75); g.fill();
    g.beginPath(); g.moveTo(r * .45, -r * .55); g.lineTo(r * .75, -r * 1.2); g.lineTo(r * .1, -r * .75); g.fill();
    g.strokeStyle = shade(col, -.3); g.lineWidth = r * .12; g.beginPath(); g.moveTo(-r * .6, r * .5); g.quadraticCurveTo(-r * 1.3, r * .6, -r * 1.1, -r * .1); g.stroke();
    g.fillStyle = bodyGrad(g, col, r);
    g.beginPath(); g.moveTo(0, -r * .95); g.bezierCurveTo(r * 1.1, -r * .7, r * .95, r * .9, 0, r * .9); g.bezierCurveTo(-r * .95, r * .9, -r * 1.1, -r * .7, 0, -r * .95); g.fill();
    g.shadowBlur = 0;
    glowEyes(g, r, [[-.05, -.15], [.4, -.15]], .13, '#fff27a');
    g.strokeStyle = '#1a1030'; g.lineWidth = r * .08; g.beginPath(); g.moveTo(0, r * .3); g.quadraticCurveTo(r * .2, r * .45, r * .45, r * .3); g.stroke();
  },
  crystal(g, r, col) {
    g.fillStyle = shade(col, -.2);
    g.beginPath(); g.moveTo(-r * .75, -r * .2); g.lineTo(-r * .45, -r * .7); g.lineTo(-r * .3, r * .3); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(r * .75, -r * .1); g.lineTo(r * .5, -r * .75); g.lineTo(r * .3, r * .4); g.closePath(); g.fill();
    g.fillStyle = bodyGrad(g, col, r);
    g.beginPath(); g.moveTo(0, -r * 1.05); g.lineTo(r * .55, 0); g.lineTo(0, r * 1.0); g.lineTo(-r * .55, 0); g.closePath(); g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = r * .05;
    g.beginPath(); g.moveTo(0, -r * 1.05); g.lineTo(0, r); g.moveTo(-r * .55, 0); g.lineTo(r * .55, 0); g.stroke();
    glowEyes(g, r, [[-.13, -.2], [.13, -.2]], .07, '#ffffff');
  },
  block(g, r, col) {
    g.fillStyle = bodyGrad(g, col, r);
    const s = r * .9;
    g.beginPath(); g.moveTo(-s, -s * .7); g.lineTo(-s * .7, -s); g.lineTo(s * .7, -s); g.lineTo(s, -s * .7); g.lineTo(s, s * .8); g.lineTo(s * .8, s); g.lineTo(-s * .8, s); g.lineTo(-s, s * .8); g.closePath(); g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = shade(col, -.45); g.lineWidth = r * .08;
    g.beginPath(); g.moveTo(-s * .6, s * .9); g.lineTo(-s * .3, s * .4); g.lineTo(-s * .5, 0); g.moveTo(s * .7, -s * .9); g.lineTo(s * .4, -s * .55); g.stroke();
    g.fillStyle = '#1a1030'; g.fillRect(-s * .55, -s * .45, s * 1.25, s * .38);
    glowEyes(g, r, [[-.12, -.24], [.4, -.24]], .1, '#ffe27a');
  },
  bomb(g, r, col) {
    g.strokeStyle = '#d9c7a8'; g.lineWidth = r * .12; g.beginPath(); g.moveTo(r * .2, -r * .75); g.quadraticCurveTo(r * .5, -r * 1.2, r * .85, -r * 1.05); g.stroke();
    g.fillStyle = '#fff6a0'; g.beginPath(); g.arc(r * .88, -r * 1.07, r * .18, 0, TAU); g.fill();
    const gr = g.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r);
    gr.addColorStop(0, '#6a5a7a'); gr.addColorStop(.6, '#2a2038'); gr.addColorStop(1, '#120c1c');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * .85, 0, TAU); g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = col; g.lineWidth = r * .1; g.beginPath(); g.arc(0, 0, r * .82, 0, TAU); g.stroke();
    glowEyes(g, r, [[-.05, -.05], [.38, -.05]], .12, col);
    g.strokeStyle = col; g.lineWidth = r * .08; g.beginPath(); g.moveTo(-r * .2, -r * .3); g.lineTo(r * .1, -r * .18); g.moveTo(r * .6, -r * .3); g.lineTo(r * .3, -r * .18); g.stroke();
  },
  ghost(g, r, col) {
    g.fillStyle = bodyGrad(g, col, r);
    g.beginPath(); g.moveTo(-r * .8, r * .8); g.lineTo(-r * .8, -r * .1); g.bezierCurveTo(-r * .8, -r * 1.2, r * .8, -r * 1.2, r * .8, -r * .1); g.lineTo(r * .8, r * .8);
    for (let i = 0; i < 4; i++) { const x0 = r * .8 - i * r * .4; g.quadraticCurveTo(x0 - r * .1, r * .45, x0 - r * .2, r * .8); g.quadraticCurveTo(x0 - r * .3, r * 1.1, x0 - r * .4, r * .8); }
    g.closePath(); g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#1a1030'; g.beginPath(); g.ellipse(-r * .05, -r * .25, r * .14, r * .22, 0, 0, TAU); g.ellipse(r * .4, -r * .25, r * .14, r * .22, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(r * .18, r * .2, r * .12, r * .08, 0, 0, TAU); g.fill();
  },
  priest(g, r, col) {
    g.strokeStyle = '#d8c3ff'; g.lineWidth = r * .09; g.beginPath(); g.moveTo(r * .85, -r * 1.05); g.lineTo(r * .85, r * .95); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(r * .85, -r * 1.1, r * .2, 0, TAU); g.fill();
    g.fillStyle = bodyGrad(g, col, r);
    g.beginPath(); g.moveTo(0, -r * 1.05); g.quadraticCurveTo(r * .7, -r * .6, r * .75, r * .95); g.lineTo(-r * .75, r * .95); g.quadraticCurveTo(-r * .7, -r * .6, 0, -r * 1.05); g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#1a1030'; g.beginPath(); g.ellipse(r * .05, -r * .3, r * .38, r * .32, 0, 0, TAU); g.fill();
    glowEyes(g, r, [[-.08, -.32], [.2, -.32]], .08, '#7dffcf');
    g.strokeStyle = shade(col, .4); g.lineWidth = r * .06; g.beginPath(); g.moveTo(0, r * .15); g.lineTo(0, r * .7); g.moveTo(-r * .2, r * .35); g.lineTo(r * .2, r * .35); g.stroke();
  },
  hive(g, r, col) {
    g.fillStyle = bodyGrad(g, col, r);
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#1a0f2a';
    for (const [x, y] of [[-.35, -.3], [.3, -.35], [0, .3], [-.45, .35], [.45, .25]]) { g.beginPath(); g.arc(x * r, y * r, r * .17, 0, TAU); g.fill(); }
    glowEyes(g, r, [[-.35, -.3], [.3, -.35], [0, .3]], .07, '#ffd6ff');
  },
  knight(g, r, col) {
    g.fillStyle = '#ff5d7a'; g.beginPath(); g.moveTo(-r * .1, -r * .95); g.quadraticCurveTo(-r * .9, -r * 1.35, -r * 1.0, -r * .5); g.quadraticCurveTo(-r * .5, -r * .95, -r * .1, -r * .75); g.fill();
    g.fillStyle = bodyGrad(g, col, r);
    g.beginPath(); g.moveTo(-r * .75, r * .9); g.lineTo(-r * .8, -r * .3); g.quadraticCurveTo(-r * .75, -r * 1.0, 0, -r * 1.0); g.quadraticCurveTo(r * .75, -r * 1.0, r * .8, -r * .3); g.lineTo(r * .75, r * .9); g.closePath(); g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#0d0820'; g.fillRect(-r * .5, -r * .38, r * 1.15, r * .2);
    glowEyes(g, r, [[.05, -.28], [.4, -.28]], .07, '#9ff0ff');
    g.strokeStyle = shade(col, .5); g.lineWidth = r * .06; g.beginPath(); g.moveTo(0, -r * .05); g.lineTo(0, r * .8); g.stroke();
  },
  eye(g, r, col) {
    g.fillStyle = shade(col, -.35);
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; g.beginPath(); g.moveTo(Math.cos(a - .2) * r * .8, Math.sin(a - .2) * r * .8); g.lineTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2); g.lineTo(Math.cos(a + .2) * r * .8, Math.sin(a + .2) * r * .8); g.fill(); }
    g.fillStyle = '#f4ecff'; g.beginPath(); g.arc(0, 0, r * .85, 0, TAU); g.fill();
    g.shadowBlur = 0;
    const gr = g.createRadialGradient(r * .15, 0, 0, r * .15, 0, r * .5);
    gr.addColorStop(0, shade(col, .4)); gr.addColorStop(1, col);
    g.fillStyle = gr; g.beginPath(); g.arc(r * .15, 0, r * .48, 0, TAU); g.fill();
    g.fillStyle = '#12061f'; g.beginPath(); g.ellipse(r * .2, 0, r * .12, r * .3, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(-r * .05, -r * .2, r * .1, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,60,120,.5)'; g.lineWidth = r * .04; g.beginPath(); g.moveTo(-r * .8, -r * .1); g.lineTo(-r * .45, -r * .05); g.moveTo(-r * .7, r * .35); g.lineTo(-r * .4, r * .2); g.stroke();
  },
  lantern(g, r, col) {
    g.fillStyle = '#5a3a2a'; g.fillRect(-r * .55, -r * 1.0, r * 1.1, r * .22); g.fillRect(-r * .55, r * .78, r * 1.1, r * .22);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * .8);
    gr.addColorStop(0, '#fffbe0'); gr.addColorStop(.5, col); gr.addColorStop(1, shade(col, -.3));
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, r * .6, r * .8, 0, 0, TAU); g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(90,50,30,.8)'; g.lineWidth = r * .06; g.beginPath(); g.moveTo(-r * .3, -r * .75); g.lineTo(-r * .3, r * .75); g.moveTo(r * .3, -r * .75); g.lineTo(r * .3, r * .75); g.stroke();
  },
};
function enemySprite(shape, col, r) {
  const key = 'e' + shape + col + r;
  let s = SPR.get(key); if (s) return s;
  const pad = r * .9 + 8, size = (r + pad) * 2;
  const c = mkCanvas(size * SS, size * SS), g = c.getContext('2d');
  g.scale(SS, SS); g.translate(size / 2, size / 2);
  g.shadowColor = col; g.shadowBlur = r * .7 + 5;
  (SHAPES[shape] || SHAPES.blob)(g, r, col);
  const w = mkCanvas(c.width, c.height), wg = w.getContext('2d');
  wg.drawImage(c, 0, 0); wg.globalCompositeOperation = 'source-atop'; wg.fillStyle = '#fff'; wg.fillRect(0, 0, w.width, w.height);
  s = { c, w, size }; SPR.set(key, s); return s;
}
function playerSprite(ch) {
  const key = 'p' + ch.id; let s = SPR.get(key); if (s) return s;
  const r = 13, size = 64, c = mkCanvas(size * SS, size * SS), g = c.getContext('2d');
  g.scale(SS, SS); g.translate(size / 2, size / 2 + 2);
  g.shadowColor = ch.col; g.shadowBlur = 14;
  // マント
  g.fillStyle = ch.col2;
  g.beginPath(); g.moveTo(-r * .2, -r * .7); g.quadraticCurveTo(-r * 1.6, -r * .2, -r * 1.25, r * 1.1); g.lineTo(-r * .2, r * .8); g.closePath(); g.fill();
  // 体
  const gr = g.createLinearGradient(0, -r, 0, r);
  gr.addColorStop(0, shade(ch.col, .5)); gr.addColorStop(1, shade(ch.col, -.25));
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(-r * .7, r * 1.05); g.quadraticCurveTo(-r * .85, -r * .2, 0, -r * .35); g.quadraticCurveTo(r * .85, -r * .2, r * .7, r * 1.05); g.closePath(); g.fill();
  // 頭（フード）
  g.fillStyle = shade(ch.col2, -.1);
  g.beginPath(); g.arc(0, -r * .65, r * .72, 0, TAU); g.fill();
  g.shadowBlur = 0;
  g.fillStyle = '#0d0b24'; g.beginPath(); g.ellipse(r * .18, -r * .6, r * .5, r * .42, 0, 0, TAU); g.fill();
  // 光る目
  g.save(); g.shadowColor = ch.col; g.shadowBlur = 8; g.fillStyle = '#fff';
  g.beginPath(); g.ellipse(r * .08, -r * .62, r * .1, r * .15, 0, 0, TAU); g.ellipse(r * .42, -r * .62, r * .1, r * .15, 0, 0, TAU); g.fill(); g.restore();
  // 胸のコア
  g.save(); g.shadowColor = ch.col; g.shadowBlur = 10; g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(0, r * .05); g.lineTo(r * .18, r * .3); g.lineTo(0, r * .55); g.lineTo(-r * .18, r * .3); g.closePath(); g.fill(); g.restore();
  // 頭上の星
  g.save(); g.shadowColor = ch.col; g.shadowBlur = 10; g.fillStyle = ch.col; starPath(g, 0, -r * 1.6, r * .28, r * .12, 4); g.fill(); g.restore();
  const w = mkCanvas(c.width, c.height), wg = w.getContext('2d');
  wg.drawImage(c, 0, 0); wg.globalCompositeOperation = 'source-atop'; wg.fillStyle = '#fff'; wg.fillRect(0, 0, w.width, w.height);
  s = { c, w, size }; SPR.set(key, s); return s;
}
function starPath(g, x, y, R, r, n) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n; const rad = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
  g.closePath();
}
function glowSprite(col, r) {
  const key = 'g' + col + r; let s = SPR.get(key); if (s) return s;
  const size = r * 5, c = mkCanvas(size * SS, size * SS), g = c.getContext('2d');
  g.scale(SS, SS);
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(.18, '#ffffff'); gr.addColorStop(.3, col); gr.addColorStop(.55, rgba(col, .35)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  s = { c, size }; SPR.set(key, s); return s;
}
function ebSprite(col) {
  const key = 'eb' + col; let s = SPR.get(key); if (s) return s;
  const size = 28, c = mkCanvas(size * SS, size * SS), g = c.getContext('2d');
  g.scale(SS, SS); g.translate(size / 2, size / 2);
  g.shadowColor = col; g.shadowBlur = 8;
  g.fillStyle = col; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill();
  g.shadowBlur = 0; g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill();
  g.strokeStyle = '#1a0f2a'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.stroke();
  s = { c, size }; SPR.set(key, s); return s;
}
function iconSprite(kind, col) {
  const key = 'i' + kind + (col || ''); let s = SPR.get(key); if (s) return s;
  const size = 40, c = mkCanvas(size * SS, size * SS), g = c.getContext('2d');
  g.scale(SS, SS); g.translate(size / 2, size / 2);
  g.shadowColor = col || '#fff'; g.shadowBlur = 8;
  if (kind === 'gem') {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 0); g.lineTo(0, 8); g.lineTo(-6, 0); g.closePath(); g.fill();
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(0, -8); g.lineTo(2.5, -1); g.lineTo(-2.5, -1); g.closePath(); g.fill();
  } else if (kind === 'coin') {
    g.fillStyle = '#ffd66b'; starPath(g, 0, 0, 8, 3.6, 4); g.fill(); g.shadowBlur = 0; g.fillStyle = '#fff8d8'; starPath(g, 0, 0, 4, 1.6, 4); g.fill();
  } else if (kind === 'heal') {
    g.fillStyle = '#ff6b8a'; g.beginPath(); g.moveTo(0, 8); g.bezierCurveTo(-12, -1, -6, -10, 0, -4); g.bezierCurveTo(6, -10, 12, -1, 0, 8); g.fill();
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(-4, -3, 2, 0, TAU); g.fill();
  } else if (kind === 'magnet') {
    g.strokeStyle = '#ff5d7a'; g.lineWidth = 5; g.beginPath(); g.arc(0, -1, 6, Math.PI, 0); g.lineTo(6, 6); g.moveTo(-6, -1); g.lineTo(-6, 6); g.stroke();
    g.shadowBlur = 0; g.fillStyle = '#e9e4ff'; g.fillRect(-8.5, 4, 5, 4); g.fillRect(3.5, 4, 5, 4);
  } else if (kind === 'nuke') {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill();
    g.shadowBlur = 0; g.fillStyle = '#ff5d7a'; for (let i = 0; i < 3; i++) { const a = i * TAU / 3 - Math.PI / 2; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 7, a - .5, a + .5); g.closePath(); g.fill(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 2, 0, TAU); g.fill();
  } else if (kind === 'clock') {
    g.fillStyle = '#9fe6ff'; g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill();
    g.shadowBlur = 0; g.fillStyle = '#0d1a2a'; g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill();
    g.strokeStyle = '#9fe6ff'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -4.5); g.moveTo(0, 0); g.lineTo(3.2, 1.5); g.stroke();
  } else if (kind === 'chest') {
    g.fillStyle = '#ffd66b'; g.fillRect(-11, -4, 22, 12);
    g.fillStyle = '#e0a82e'; g.beginPath(); g.moveTo(-11, -4); g.quadraticCurveTo(0, -14, 11, -4); g.closePath(); g.fill();
    g.shadowBlur = 0; g.fillStyle = '#7a4a10'; g.fillRect(-11, -3, 22, 2.5); g.fillRect(-2, -5, 4, 13);
    g.fillStyle = '#fff'; g.fillRect(-1.5, -1, 3, 4);
  }
  s = { c, size }; SPR.set(key, s); return s;
}
function bladeSprite(col) {
  const key = 'bl' + col; let s = SPR.get(key); if (s) return s;
  const size = 44, c = mkCanvas(size * SS, size * SS), g = c.getContext('2d');
  g.scale(SS, SS); g.translate(size / 2, size / 2);
  g.shadowColor = col; g.shadowBlur = 10; g.fillStyle = col;
  g.beginPath(); g.moveTo(-12, 0); g.quadraticCurveTo(0, -12, 14, -2); g.quadraticCurveTo(2, -4, -12, 0); g.fill();
  g.beginPath(); g.moveTo(12, 0); g.quadraticCurveTo(0, 12, -14, 2); g.quadraticCurveTo(-2, 4, 12, 0); g.fill();
  g.shadowBlur = 0; g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 3.2, 0, TAU); g.fill();
  s = { c, size }; SPR.set(key, s); return s;
}
function boomSprite(col) {
  const key = 'bm' + col; let s = SPR.get(key); if (s) return s;
  const size = 40, c = mkCanvas(size * SS, size * SS), g = c.getContext('2d');
  g.scale(SS, SS); g.translate(size / 2, size / 2);
  g.shadowColor = col; g.shadowBlur = 8; g.fillStyle = col;
  for (let i = 0; i < 3; i++) { g.rotate(TAU / 3); g.beginPath(); g.moveTo(0, -2.5); g.quadraticCurveTo(9, -8, 13, -1); g.quadraticCurveTo(8, 1, 0, 2.5); g.fill(); }
  g.shadowBlur = 0; g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 2.6, 0, TAU); g.fill();
  s = { c, size }; SPR.set(key, s); return s;
}
function shardSprite(col) {
  const key = 'sh' + col; let s = SPR.get(key); if (s) return s;
  const size = 32, c = mkCanvas(size * SS, size * SS), g = c.getContext('2d');
  g.scale(SS, SS); g.translate(size / 2, size / 2);
  g.shadowColor = col; g.shadowBlur = 8; g.fillStyle = col;
  g.beginPath(); g.moveTo(11, 0); g.lineTo(-3, -4.5); g.lineTo(-9, 0); g.lineTo(-3, 4.5); g.closePath(); g.fill();
  g.shadowBlur = 0; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(9, 0); g.lineTo(-2, -2); g.lineTo(-2, 2); g.closePath(); g.fill();
  s = { c, size }; SPR.set(key, s); return s;
}
function crescentSprite(col) {
  const key = 'cr' + col; let s = SPR.get(key); if (s) return s;
  const size = 56, c = mkCanvas(size * SS, size * SS), g = c.getContext('2d');
  g.scale(SS, SS); g.translate(size / 2, size / 2);
  g.shadowColor = col; g.shadowBlur = 12; g.fillStyle = col;
  g.beginPath(); g.arc(-6, 0, 20, -1.25, 1.25); g.arc(-14, 0, 17, 1.1, -1.1, true); g.closePath(); g.fill();
  g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(-6, 0, 18, -.9, .9); g.arc(-12, 0, 16, .8, -.8, true); g.closePath(); g.fill();
  s = { c, size }; SPR.set(key, s); return s;
}
function droneSprite(col) {
  const key = 'dr' + col; let s = SPR.get(key); if (s) return s;
  const size = 36, c = mkCanvas(size * SS, size * SS), g = c.getContext('2d');
  g.scale(SS, SS); g.translate(size / 2, size / 2);
  g.shadowColor = col; g.shadowBlur = 8;
  g.fillStyle = '#2a3a5a'; g.beginPath(); g.ellipse(0, 0, 10, 6, 0, 0, TAU); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(0, -1, 5, 3.5, 0, 0, TAU); g.fill();
  g.shadowBlur = 0; g.strokeStyle = col; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(-10, 0); g.lineTo(-13, -4); g.moveTo(10, 0); g.lineTo(13, -4); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -1, 1.8, 0, TAU); g.fill();
  s = { c, size }; SPR.set(key, s); return s;
}
function spriteURL(sp) { try { return sp.c.toDataURL(); } catch (e) { return ''; } }

// ---------- 背景タイル ----------
function makeBgTile(stage) {
  const S = 512, R = mulberry32(hashStr('bg' + stage.id));
  const c = mkCanvas(S * 2, S * 2), g = c.getContext('2d');
  g.scale(2, 2);
  g.fillStyle = stage.bg; g.fillRect(0, 0, S, S);
  const col = stage.col;
  // 微かなムラ
  for (let i = 0; i < 18; i++) {
    const x = R() * S, y = R() * S, r = 40 + R() * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(col, .05 + R() * .04)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.save(); g.translate(ox, oy); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
  }
  const wrap = (fn) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.save(); g.translate(ox, oy); fn(); g.restore(); } };
  if (stage.id === 's1') {
    g.strokeStyle = rgba(col, .05); g.lineWidth = 1;
    for (let i = 0; i <= S; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); }
    for (let i = 0; i < 90; i++) {
      const x = R() * S, y = R() * S, n = 3 + (R() * 3 | 0), a = R() * .4;
      wrap(() => { g.strokeStyle = rgba(col, .13 + R() * .1); g.lineWidth = 1.4; g.beginPath(); for (let k = 0; k < n; k++) { g.moveTo(x + k * 2.2, y); g.quadraticCurveTo(x + k * 2.2 - 2 + a * 8, y - 6, x + k * 3 - 3, y - 9 - R() * 4); } g.stroke(); });
    }
    for (let i = 0; i < 26; i++) {
      const x = R() * S, y = R() * S, cc = ['#ffe27a', '#ff9dd6', '#9dd6ff'][i % 3];
      wrap(() => { g.fillStyle = rgba(cc, .5); for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.beginPath(); g.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.2, 0, TAU); g.fill(); } g.fillStyle = '#fff8d8'; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); });
    }
  } else if (stage.id === 's2') {
    g.strokeStyle = rgba(col, .06); g.lineWidth = 2;
    for (let y = 0; y < S; y += 32) { g.beginPath(); for (let x = 0; x <= S; x += 16) g.lineTo(x, y + Math.sin((x / S) * TAU * 2 + y) * 6); g.stroke(); }
    for (let i = 0; i < 14; i++) {
      const x = (R() * 8 | 0) * 64, y = (R() * 8 | 0) * 64;
      g.strokeStyle = rgba(col, .12); g.lineWidth = 2; g.strokeRect(x + 4, y + 4, 56, 56);
      g.fillStyle = rgba(col, .04); g.fillRect(x + 4, y + 4, 56, 56);
      g.fillStyle = rgba(col, .18); g.font = '20px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(['☥', '𓂀', '◬', '⌘', '☉'][i % 5], x + 32, y + 33);
    }
    for (let i = 0; i < 60; i++) { const x = R() * S, y = R() * S; wrap(() => { g.fillStyle = rgba('#ffe7b0', .12 + R() * .1); g.beginPath(); g.arc(x, y, 1 + R() * 2, 0, TAU); g.fill(); }); }
  } else if (stage.id === 's3') {
    for (let i = 0; i < 26; i++) {
      const x = R() * S, y = R() * S, n = 3 + (R() * 3 | 0);
      wrap(() => { g.strokeStyle = rgba(col, .12); g.lineWidth = 1; g.beginPath(); let px = x, py = y; g.moveTo(px, py); for (let k = 0; k < n; k++) { px += (R() - .5) * 60; py += (R() - .5) * 60; g.lineTo(px, py); } g.stroke(); });
    }
    for (let i = 0; i < 34; i++) {
      const x = R() * S, y = R() * S, s = 4 + R() * 9;
      wrap(() => { g.fillStyle = rgba(col, .16 + R() * .1); g.beginPath(); g.moveTo(x, y - s * 1.6); g.lineTo(x + s * .5, y); g.lineTo(x, y + s * .5); g.lineTo(x - s * .5, y); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - .5, y - s * 1.3, 1, s * 1.3); });
    }
    for (let i = 0; i < 80; i++) { const x = R() * S, y = R() * S; wrap(() => { g.fillStyle = 'rgba(220,250,255,' + (.08 + R() * .15) + ')'; g.fillRect(x, y, 1.5, 1.5); }); }
  } else if (stage.id === 's4') {
    for (let i = 0; i < 22; i++) {
      const x = R() * S, y = R() * S, n = 4 + (R() * 4 | 0);
      const pts = [[x, y]]; let px = x, py = y;
      for (let k = 0; k < n; k++) { px += (R() - .5) * 70; py += (R() - .5) * 70; pts.push([px, py]); }
      wrap(() => {
        g.lineCap = 'round';
        g.strokeStyle = 'rgba(255,90,30,.12)'; g.lineWidth = 9; g.beginPath(); pts.forEach(p => g.lineTo(p[0], p[1])); g.stroke();
        g.strokeStyle = 'rgba(255,160,60,.35)'; g.lineWidth = 2; g.beginPath(); pts.forEach(p => g.lineTo(p[0], p[1])); g.stroke();
      });
    }
    for (let i = 0; i < 40; i++) { const x = R() * S, y = R() * S, r = 3 + R() * 8; wrap(() => { g.fillStyle = 'rgba(40,14,10,.7)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }); }
  } else {
    g.strokeStyle = rgba(col, .07); g.lineWidth = 1;
    const hx = 40, hy = hx * Math.sqrt(3) / 2;
    for (let row = -1; row < S / hy + 1; row++) for (let q = -1; q < S / (hx * 1.5) + 1; q++) {
      const cx = q * hx * 1.5, cy = row * hy * 2 + (q % 2 ? hy : 0);
      g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * TAU / 6; g.lineTo(cx + Math.cos(a) * hx * .98, cy + Math.sin(a) * hx * .98); } g.closePath(); g.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const x = R() * S, y = R() * S, r = 20 + R() * 30;
      wrap(() => { g.strokeStyle = rgba(col, .16); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.beginPath(); g.arc(x, y, r * .7, 0, TAU); g.stroke(); starPath(g, x, y, r * .6, r * .25, 5); g.stroke(); });
    }
    for (let i = 0; i < 100; i++) { const x = R() * S, y = R() * S; wrap(() => { g.fillStyle = 'rgba(230,210,255,' + (.06 + R() * .2) + ')'; g.fillRect(x, y, 1.4, 1.4); }); }
  }
  return c;
}

// ================= CANVAS & STATE =================
const cv = $('game');
const ctx = cv.getContext('2d', { alpha: false });
let W = 0, H = 0, DPR = 1;
const G = {
  state: 'boot', t: 0, rt: 0, zoom: 1, viewW: 0, viewH: 0, viewR: 0, cam: { x: 0, y: 0 }, shake: 0,
  en: [], pr: [], eb: [], pk: [], ar: [], fx: [], pt: [], tx: [], hz: [], timers: [], bosses: [], legion: [],
  p: null, st: null, stage: STAGES[0], stageIdx: 0, char: CHARS[0], abyss: 0, daily: false, mods: [],
  gm: { rate: 1, spd: 1, hp: 1, size: 1, noHeal: false }, bgPat: null, vign: null, flashA: 0, flashC: '#fff',
  prevState: 'play', choices: [], lvSel: 0, banishMode: false, rerolls: 0, skips: 0, banishes: 0,
};
let R = { kills: 0, coins: 0, bosses: 0 };
const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

function resize() {
  W = window.innerWidth || 800; H = window.innerHeight || 600;
  const q = SAVE.set.quality, maxd = q === 'high' ? 2 : q === 'mid' ? 1.5 : 1;
  DPR = Math.min(window.devicePixelRatio || 1, maxd);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  G.zoom = clamp(Math.sqrt(W * H) / 760, .62, 1.7);
  G.viewW = W / G.zoom; G.viewH = H / G.zoom;
  G.viewR = Math.hypot(G.viewW, G.viewH) / 2;
  makeVignette();
}
function makeVignette() {
  const c = mkCanvas(Math.max(2, W / 2), Math.max(2, H / 2)), g = c.getContext('2d');
  const w = c.width, hh = c.height;
  const gr = g.createRadialGradient(w / 2, hh / 2, Math.min(w, hh) * .35, w / 2, hh / 2, Math.hypot(w, hh) * .6);
  gr.addColorStop(0, 'rgba(5,3,20,0)'); gr.addColorStop(1, 'rgba(5,3,20,.72)');
  g.fillStyle = gr; g.fillRect(0, 0, w, hh);
  G.vign = c;
}
const BGP = {};
function getBgPattern(stage) {
  if (BGP[stage.id]) return BGP[stage.id];
  const tile = makeBgTile(stage);
  let p = null;
  try {
    p = ctx.createPattern(tile, 'repeat');
    if (p && p.setTransform && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix().scale(.5, .5));
    else if (p) { // setTransform非対応：等倍タイルで作り直す
      const t1 = mkCanvas(512, 512); t1.getContext('2d').drawImage(tile, 0, 0, 512, 512);
      p = ctx.createPattern(t1, 'repeat');
    }
  } catch (e) {
    try { const t1 = mkCanvas(512, 512); t1.getContext('2d').drawImage(tile, 0, 0, 512, 512); p = ctx.createPattern(t1, 'repeat'); } catch (e2) { p = null; }
  }
  BGP[stage.id] = p || stage.bg;
  return BGP[stage.id];
}

// ================= INPUT =================
const IN = { keys: {}, mx: 0, my: 0, joy: { on: false, id: -1, bx: 0, by: 0, x: 0, y: 0 }, dashReq: false, ultReq: false, gpPrev: [], gpAx: 0, gpAy: 0, gpNav: 0, usedTouch: false };
const JOY_R = 58;
const fixedJoyX = () => 96 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sal')) || 0);
const fixedJoyY = () => H - 120;
window.addEventListener('keydown', e => {
  auUnlock();
  const c = e.code;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'].includes(c) && (G.state === 'play' || G.state === 'levelup' || G.state === 'chest')) e.preventDefault();
  const rep = e.repeat;
  IN.keys[c] = true;
  if (rep) return;
  if (G.state === 'play') {
    if (c === 'Space' || c === 'ShiftLeft' || c === 'ShiftRight' || c === 'KeyK') IN.dashReq = true;
    if (c === 'KeyE' || c === 'KeyQ' || c === 'KeyL') IN.ultReq = true;
    if (c === 'Escape' || c === 'KeyP') pauseGame();
  } else if (G.state === 'paused') {
    if (c === 'Escape' || c === 'KeyP') resumeGame();
  } else if (G.state === 'levelup') {
    if (/^Digit[1-4]$/.test(c)) chooseUpgrade(+c.slice(5) - 1);
    else if (c === 'ArrowUp' || c === 'ArrowLeft') moveLvSel(-1);
    else if (c === 'ArrowDown' || c === 'ArrowRight') moveLvSel(1);
    else if (c === 'Enter' || c === 'Space') { e.preventDefault(); chooseUpgrade(G.lvSel); }
    else if (c === 'KeyR') doReroll();
  } else if (G.state === 'chest') {
    if (c === 'Enter' || c === 'Space') { e.preventDefault(); closeChest(); }
  }
});
window.addEventListener('keyup', e => { IN.keys[e.code] = false; });
window.addEventListener('blur', () => { IN.keys = {}; if (G.state === 'play') pauseGame(); });
cv.addEventListener('pointerdown', e => {
  auUnlock();
  if (e.pointerType === 'touch') IN.usedTouch = true;
  if (G.state !== 'play' || IN.joy.on) return;
  e.preventDefault();
  const j = IN.joy; j.on = true; j.id = e.pointerId;
  if (SAVE.set.joy === 'fixed' && e.pointerType !== 'mouse') { j.bx = fixedJoyX(); j.by = fixedJoyY(); } else { j.bx = e.clientX; j.by = e.clientY; }
  j.x = e.clientX; j.y = e.clientY;
  try { cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
});
cv.addEventListener('pointermove', e => { const j = IN.joy; if (j.on && e.pointerId === j.id) { j.x = e.clientX; j.y = e.clientY; } });
const joyEnd = e => { const j = IN.joy; if (j.on && e.pointerId === j.id) { j.on = false; j.id = -1; } };
cv.addEventListener('pointerup', joyEnd);
cv.addEventListener('pointercancel', joyEnd);
cv.addEventListener('lostpointercapture', joyEnd);
function readInput() {
  let x = 0, y = 0; const k = IN.keys;
  if (k.KeyA || k.ArrowLeft) x -= 1; if (k.KeyD || k.ArrowRight) x += 1;
  if (k.KeyW || k.ArrowUp) y -= 1; if (k.KeyS || k.ArrowDown) y += 1;
  const j = IN.joy;
  if (j.on) {
    let dx = j.x - j.bx, dy = j.y - j.by, d = Math.hypot(dx, dy);
    if (SAVE.set.joy !== 'fixed' && d > JOY_R) { j.bx += dx / d * (d - JOY_R); j.by += dy / d * (d - JOY_R); dx = j.x - j.bx; dy = j.y - j.by; d = JOY_R; }
    if (d > 6) { const m = Math.min(1, d / JOY_R); x += dx / d * m; y += dy / d * m; }
  }
  x += IN.gpAx; y += IN.gpAy;
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
  IN.mx = x; IN.my = y;
}
function pollGamepad() {
  IN.gpAx = IN.gpAy = 0;
  if (!navigator.getGamepads) return;
  let gps; try { gps = navigator.getGamepads(); } catch (e) { return; }
  if (!gps) return;
  let gp = null; for (const g of gps) if (g && g.connected) { gp = g; break; }
  if (!gp) return;
  let ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  if (Math.hypot(ax, ay) < .22) ax = ay = 0;
  const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
  if (b(14)) ax = -1; if (b(15)) ax = 1; if (b(12)) ay = -1; if (b(13)) ay = 1;
  const pressed = i => b(i) && !IN.gpPrev[i];
  if (G.state === 'play') {
    IN.gpAx = ax; IN.gpAy = ay;
    if (pressed(0) || pressed(5) || pressed(7)) IN.dashReq = true;
    if (pressed(1) || pressed(3) || pressed(4) || pressed(6)) IN.ultReq = true;
    if (pressed(9)) pauseGame();
  } else if (G.state === 'paused') { if (pressed(9) || pressed(1)) resumeGame(); }
  else if (G.state === 'levelup') {
    const nav = (ay < -.5 || ax < -.5) ? -1 : (ay > .5 || ax > .5) ? 1 : 0;
    if (nav && nav !== IN.gpNav) moveLvSel(nav);
    IN.gpNav = nav;
    if (pressed(0)) chooseUpgrade(G.lvSel);
    if (pressed(2)) doReroll();
  } else if (G.state === 'chest') { if (pressed(0)) closeChest(); }
  else if (G.state === 'clear') { if (pressed(0)) continueEndless(); else if (pressed(1)) endRun(true); }
  else if (G.state === 'result') { if (pressed(0)) retryRun(); }
  IN.gpPrev = gp.buttons.map(x => x.pressed);
}

// ================= STATS =================
function xpNeed(lv) { return lv < 20 ? 5 + (lv - 1) * 9 : lv < 40 ? 176 + (lv - 20) * 13 : 436 + (lv - 40) * 17; }
function recalcStats() {
  const B = { maxHp: 0, hpMul: 0, armor: 0, regen: 0, speed: 0, might: 0, area: 0, cd: 0, amount: 0, dur: 0, pspd: 0, magnet: 0, luck: 0, growth: 0, greed: 0, revive: 0, ult: 0, dash: 0, crit: 0 };
  for (const k in G.char.mod) B[k] += G.char.mod[k];
  for (const s of SHOP) { const l = upLv(s.id); if (l && s.apply) s.apply(B, l); }
  for (const p of G.p.passives) PASSIVES[p.id].apply(B, p.lv);
  for (const m of G.mods) if (m.apply) m.apply(B);
  const old = G.st;
  const st = {
    maxHp: Math.max(10, Math.round((100 + B.maxHp) * (1 + B.hpMul))), armor: B.armor, regen: B.regen,
    speed: 165 * Math.max(.3, 1 + B.speed), might: Math.max(.1, 1 + B.might), area: 1 + B.area,
    cd: Math.max(.35, 1 - B.cd), amount: B.amount, dur: 1 + B.dur, pspd: 1 + B.pspd,
    magnet: 65 * (1 + B.magnet), luck: 1 + B.luck, growth: 1 + B.growth, greed: 1 + B.greed,
    revive: B.revive, ult: 1 + B.ult, dash: Math.max(.3, 1 - B.dash), crit: .05 + B.crit
  };
  G.st = st;
  if (old && st.maxHp > old.maxHp) G.p.hp += st.maxHp - old.maxHp;
  G.p.hp = Math.min(G.p.hp, st.maxHp);
  for (const w of G.p.weapons) w.s = weaponStats(w);
}
function weaponStats(w) {
  const d = WEAPONS[w.id];
  const s = Object.assign({}, d.base);
  let ar = 0, sp = 0;
  for (let i = 0; i < w.lv - 1 && i < d.levels.length; i++) {
    const L = d.levels[i];
    for (const k in L) { if (k === 'area') ar += L[k]; else if (k === 'spd') sp += L[k]; else s[k] += L[k]; }
  }
  s.area *= 1 + ar; s.spd *= 1 + sp;
  if (w.evo && d.evo.mod) d.evo.mod(s);
  const P = G.st;
  s.dmg *= P.might;
  s.cd = Math.max(.08, s.cd * P.cd);
  s.amt = Math.max(1, Math.round(s.amt + P.amount));
  s.area *= P.area; s.spd *= P.pspd; s.dur *= P.dur;
  return s;
}
function hasWeapon(id) { return G.p.weapons.find(w => w.id === id); }
function hasPassive(id) { return G.p.passives.find(p => p.id === id); }
function addWeapon(id) {
  const w = { id, lv: 1, evo: false, t: .4, dmg: 0, hm: new Map(), s: null };
  G.p.weapons.push(w);
  w.s = weaponStats(w);
  SAVE.codex.w[id] = 1;
  if (G.p.weapons.length >= 6) SAVE.stats.flags.full6 = true;
  return w;
}
function addPassive(id) { G.p.passives.push({ id, lv: 1 }); SAVE.codex.p[id] = 1; recalcStats(); }
function checkAllMax() { const ws = G.p.weapons; if (ws.length >= 6 && ws.every(w => w.lv >= WMAX)) SAVE.stats.flags.allmax = true; }

// ================= RUN =================
function startRun(opt) {
  const st = STAGES.find(s => s.id === opt.stage) || STAGES[0];
  const ch = CHARS.find(c => c.id === opt.char) || CHARS[0];
  RNG = opt.seed ? mulberry32(opt.seed) : Math.random;
  Object.assign(G, {
    stage: st, stageIdx: STAGES.indexOf(st), char: ch, abyss: opt.abyss || 0, daily: !!opt.daily, mods: opt.mods || [], runOpt: opt,
    t: 0, en: [], pr: [], eb: [], pk: [], ar: [], fx: [], pt: [], tx: [], hz: [], timers: [], bosses: [], legion: [],
    spawnAcc: 0, evIdx: 0, freezeT: 0, ultInv: 0, legionT: 0, endless: false, endT: null, pendingLv: 0, pendingClear: 0,
    banished: new Set(), bigGem: null, gemCount: 0, lanternT: 6, nextId: 1, shake: 0, bossNoHit: true, lvSel: 0, banishMode: false,
    hpMul: 1, dmgMul: 1, flashA: 0, flashC: '#fff', achT: 0
  });
  G.gm = { rate: 1, spd: 1, hp: 1, size: 1, noHeal: false };
  for (const m of G.mods) if (m.g) for (const k in m.g) { if (k === 'noHeal') G.gm.noHeal = true; else G.gm[k] *= m.g[k]; }
  G.p = { x: 0, y: 0, r: 12, hp: 100, face: 0, flip: 1, iT: 0, dashT: 0, dashCd: 0, dvx: 0, dvy: 0, ult: 0, level: 1, xp: 0, xpNeed: xpNeed(1), weapons: [], passives: [], walk: 0, revives: 0, trailT: 0, moving: false };
  G.st = null;
  R = { kills: 0, coins: 0, bosses: 0, elites: 0, chests: 0, evos: 0, dashes: 0, ults: 0, lanterns: 0, dmgTaken: 0, cleared: false, combo: 0, comboT: 0, maxCombo: 0, newAch: [] };
  recalcStats();
  G.p.hp = G.st.maxHp; G.p.revives = G.st.revive;
  G.rerolls = upLv('reroll'); G.skips = upLv('skip'); G.banishes = upLv('banish');
  addWeapon(ch.weapon);
  G.cam.x = 0; G.cam.y = 0;
  G.bgPat = getBgPattern(st);
  SAVE.stats.runs++;
  if (G.daily) SAVE.stats.daily++;
  writeSave();
  IN.joy.on = false; IN.dashReq = IN.ultReq = false;
  hideScreens(); hideOverlays();
  showHud(true); updateSlots(); hudReset();
  G.state = 'play';
  bgm(st.bgm); AU.duck = 1; auVol();
  bigToast(st.name, G.daily ? 'デイリー挑戦' : (G.abyss ? '深淵レベル ' + G.abyss : st.en));
  if (!SAVE.tut) { SAVE.tut = true; writeSave(); showTutorial(); }
}
function pauseGame() {
  if (G.state !== 'play') return;
  G.state = 'paused'; IN.joy.on = false;
  AU.duck = .35; auVol();
  buildPause(); showOv('ovPause');
}
function resumeGame() {
  if (G.state !== 'paused') return;
  hideOv('ovPause'); G.state = 'play'; AU.duck = 1; auVol();
  IN.dashReq = IN.ultReq = false;
}

// ================= SPATIAL GRID =================
const GRID = { cs: 80, n: 48, cells: [], ox: 0, oy: 0 };
for (let i = 0; i < GRID.n * GRID.n; i++) GRID.cells.push([]);
const QB = [], QB2 = [];
function gridBuild() {
  const g = GRID;
  for (let i = 0; i < g.cells.length; i++) g.cells[i].length = 0;
  g.ox = G.p.x - g.cs * g.n / 2; g.oy = G.p.y - g.cs * g.n / 2;
  for (const e of G.en) {
    if (e.dead) continue;
    const cx = Math.floor((e.x - g.ox) / g.cs), cy = Math.floor((e.y - g.oy) / g.cs);
    if (cx < 0 || cy < 0 || cx >= g.n || cy >= g.n) continue;
    g.cells[cy * g.n + cx].push(e);
  }
}
function gridQuery(x, y, r, out) {
  out.length = 0;
  const g = GRID, m = r + 64;
  const x0 = Math.max(0, Math.floor((x - m - g.ox) / g.cs)), x1 = Math.min(g.n - 1, Math.floor((x + m - g.ox) / g.cs));
  const y0 = Math.max(0, Math.floor((y - m - g.oy) / g.cs)), y1 = Math.min(g.n - 1, Math.floor((y + m - g.oy) / g.cs));
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
    const c = g.cells[cy * g.n + cx];
    for (let i = 0; i < c.length; i++) {
      const e = c[i]; if (e.dead) continue;
      const dx = e.x - x, dy = e.y - y, R0 = r + e.r;
      if (dx * dx + dy * dy <= R0 * R0) out.push(e);
    }
  }
  return out;
}
function separate() {
  const cells = GRID.cells;
  for (let ci = 0; ci < cells.length; ci++) {
    const c = cells[ci], n = Math.min(c.length, 12);
    for (let i = 0; i < n; i++) {
      const a = c[i]; if (a.boss || a.prop) continue;
      for (let k = i + 1; k < n; k++) {
        const b = c[k]; if (b.boss || b.prop) continue;
        const dx = b.x - a.x, dy = b.y - a.y, rr0 = (a.r + b.r) * .82, d2 = dx * dx + dy * dy;
        if (d2 < rr0 * rr0 && d2 > .01) { const d = Math.sqrt(d2), pu = (rr0 - d) * .25 / d; a.x -= dx * pu; a.y -= dy * pu; b.x += dx * pu; b.y += dy * pu; }
      }
    }
  }
}

// ================= TARGETING =================
function nearestEnemy(x, y, maxD, skip) {
  let best = null, bd = maxD * maxD;
  for (const e of G.en) {
    if (e.dead || e.prop || (skip && skip.has(e))) continue;
    const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function nearestN(x, y, n, maxD) {
  const arr = [], md = maxD * maxD;
  for (const e of G.en) {
    if (e.dead || e.prop) continue;
    const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
    if (d < md) arr.push([d, e]);
  }
  arr.sort((a, b) => a[0] - b[0]);
  const out = []; for (let i = 0; i < n && i < arr.length; i++) out.push(arr[i][1]);
  return out;
}
function randomEnemies(x, y, n, maxD) {
  const arr = [], md = maxD * maxD;
  for (const e of G.en) { if (e.dead || e.prop) continue; const dx = e.x - x, dy = e.y - y; if (dx * dx + dy * dy < md) arr.push(e); }
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(vr() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  return arr.slice(0, n);
}
function later(t, fn) { G.timers.push({ t, fn }); }
function updateTimers(dt) {
  if (!G.timers.length) return;
  const list = G.timers; G.timers = [];
  for (const t of list) { t.t -= dt; if (t.t <= 0) { try { t.fn(); } catch (e) { console.error(e); } } else G.timers.push(t); }
}

// ================= FX HELPERS =================
function maxParticles() { return SAVE.set.quality === 'high' ? 700 : SAVE.set.quality === 'mid' ? 420 : 220; }
function part(x, y, vx, vy, life, size, col, k) { if (G.pt.length >= maxParticles()) return; G.pt.push({ x, y, vx, vy, life, max: life, size, col, k: k || 0 }); }
function burst(x, y, col, n, spd, size, life) {
  const q = SAVE.set.quality === 'low' ? .5 : 1;
  n = Math.ceil(n * q);
  for (let i = 0; i < n; i++) { const a = vr() * TAU, s = spd * (.3 + vr() * .7); part(x, y, Math.cos(a) * s, Math.sin(a) * s, (life || .5) * (.6 + vr() * .6), (size || 3) * (.6 + vr() * .8), col, vr() < .35 ? 1 : 0); }
}
function shake(v) { G.shake = Math.max(G.shake, v); }
function dmgText(x, y, v, kind) {
  if (G.tx.length > 70) G.tx.shift();
  G.tx.push({ x, y, v, kind: kind || 'n', life: .75, max: .75, vx: vrr(-15, 15) });
}
function flashScreen(col, a) { G.flashC = col; G.flashA = Math.max(G.flashA, a); }

// ================= PROJECTILES =================
function shoot(w, x, y, a, spd, o) {
  if (G.pr.length > 900) return null;
  const p = { kind: o.kind || 'bullet', x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: o.r || 5, dmg: o.dmg, pierce: o.pierce === undefined ? 0 : o.pierce, life: o.life || 1, max: o.life || 1, age: 0, w, hit: new Set(), kb: o.kb || 0, col: o.col || '#fff', explode: o.explode || 0, slow: o.slow || 0, freeze: o.freeze || 0, burn: o.burn || 0, spr: o.spr || 'glow', rot: a, spin: o.spin || 0, dead: false };
  if (o.hcd) { p.hm = new Map(); p.hcd = o.hcd; }
  G.pr.push(p);
  return p;
}
function projHit(p, e) {
  const l = Math.hypot(p.vx, p.vy) || 1;
  damage(e, p.dmg, p.w, { kb: p.kb, dx: p.vx / l, dy: p.vy / l, slow: p.slow, freeze: p.freeze, burn: p.burn });
  if (p.explode) explosion(e.x, e.y, p.explode, p.dmg * .5, p.w, { silent: true, kb: 4, col: p.col });
  if (p.spr === 'shard') burst(e.x, e.y, '#dff8ff', 3, 120, 2, .3);
  if (!p.hm) { p.pierce--; if (p.pierce < 0) p.dead = true; }
}
function updateProjectiles(dt) {
  const arr = G.pr; let j = 0;
  for (let i = 0; i < arr.length; i++) {
    const p = arr[i];
    if (p.dead) continue;
    p.life -= dt; p.age += dt;
    if (p.kind === 'boom') {
      const half = p.T * .5;
      if (p.age < half) { const f = Math.cos(p.age / half * Math.PI / 2); p.x += p.vx * f * dt; p.y += p.vy * f * dt; }
      else {
        const dx = G.p.x - p.x, dy = G.p.y - p.y, d = Math.hypot(dx, dy) || 1;
        const sp = p.v0 * Math.min(1.7, .2 + (p.age - half) / half * 1.6);
        p.x += dx / d * sp * dt; p.y += dy / d * sp * dt;
        if (d < 22) p.dead = true;
      }
    } else if (p.kind === 'lob') {
      const k = Math.min(1, p.age / p.max);
      p.x = lerp(p.sx, p.tx, k); p.y = lerp(p.sy, p.ty, k); p.z = Math.sin(k * Math.PI) * 55;
    } else { p.x += p.vx * dt; p.y += p.vy * dt; }
    if (p.spin) p.rot += p.spin * dt;
    if (p.kind !== 'lob' && !p.dead) {
      const hits = gridQuery(p.x, p.y, p.r, QB);
      for (let k = 0; k < hits.length; k++) {
        if (p.dead) break;
        const e = hits[k]; if (e.dead) continue;
        if (p.hm) { const nt = p.hm.get(e); if (nt !== undefined && nt > G.t) continue; p.hm.set(e, G.t + p.hcd); }
        else { if (p.hit.has(e)) continue; p.hit.add(e); }
        projHit(p, e);
      }
    }
    if (p.life <= 0 || p.dead) { if (p.onEnd) { try { p.onEnd(p); } catch (e) { console.error(e); } } continue; }
    arr[j++] = p;
  }
  arr.length = j;
}

// ================= DAMAGE =================
function damage(e, dmg, w, o) {
  if (e.dead || !(dmg > 0)) return 0;
  const crit = vr() < G.st.crit;
  const mult = crit ? (w && w.evo && w.id === 'boomerang' ? 3 : 2) : 1;
  const d = dmg * mult * (.92 + vr() * .16);
  e.hp -= d; e.flash = .09;
  if (w) w.dmg += d;
  if (o) {
    if (o.kb && !e.boss) {
      const k = o.kb * (1 - (e.kbRes || 0)) * 14;
      let dx = o.dx || 0, dy = o.dy || 0;
      if (!dx && !dy) { dx = e.x - G.p.x; dy = e.y - G.p.y; }
      const l = Math.hypot(dx, dy) || 1;
      e.kvx += dx / l * k; e.kvy += dy / l * k;
    }
    if (o.slow) { e.slowT = 2; e.slow = Math.max(e.slow || 0, e.boss ? o.slow * .4 : o.slow); }
    if (o.freeze) e.frzT = Math.max(e.frzT, e.boss ? o.freeze * .2 : o.freeze);
    if (o.stun) e.stunT = Math.max(e.stunT, e.boss ? o.stun * .2 : o.stun);
    if (o.burn) { e.burnT = 3; e.burnD = Math.max(e.burnD || 0, o.burn); }
  }
  if (SAVE.set.dmgNum && !e.prop) dmgText(e.x + vrr(-6, 6), e.y - e.r * .8, d, crit ? 'crit' : 'n');
  if (!e.prop) sfx('hit');
  if (e.hp <= 0) killEnemy(e, w);
  return d;
}
function explosion(x, y, r, dmg, w, o) {
  o = o || {};
  const arr = gridQuery(x, y, r, []);
  for (const e of arr) damage(e, dmg, w, { kb: o.kb === undefined ? 6 : o.kb, dx: e.x - x, dy: e.y - y, stun: o.stun, freeze: o.freeze });
  G.fx.push({ kind: 'flash', x, y, r, life: .22, max: .22, col: o.col || '#ffd66b' });
  burst(x, y, o.col || '#ffd66b', o.silent ? 5 : 16, r * 3, 3, .45);
  if (o.shake) shake(o.shake);
  if (!o.silent) sfx('boom');
}
function killEnemy(e, w) {
  if (e.dead) return;
  e.dead = true;
  if (e.prop) {
    R.lanterns++; SAVE.stats.lanterns++;
    burst(e.x, e.y, '#ffcf7a', 14, 200, 3); sfx('break');
    dropLantern(e.x, e.y);
    return;
  }
  R.kills++;
  G.p.ult = Math.min(100, G.p.ult + (e.boss ? 15 : e.elite ? 5 : .45) * G.st.ult);
  burst(e.x, e.y, e.def.col, e.boss ? 60 : e.elite ? 26 : 7, e.boss ? 420 : 170, e.boss ? 6 : 3);
  sfx('kill');
  if (e.boss) { bossDefeated(e); return; }
  dropGem(e.x, e.y, e.xp);
  const lk = G.st.luck;
  if (e.elite) { R.elites++; spawnPickup('chest', e.x, e.y); G.fx.push({ kind: 'ringfx', x: e.x, y: e.y, r0: 10, r1: 120, life: .5, max: .5, col: '#ffd66b', lw: 6 }); }
  else {
    if (RNG() < .03 * lk) spawnPickup('coin', e.x, e.y, Math.max(1, Math.round((RNG() < .2 ? 5 : 1) * G.st.greed)));
    if (!G.gm.noHeal && RNG() < .0032 * lk) spawnPickup('heal', e.x, e.y);
    if (RNG() < .0009 * lk) spawnPickup('magnet', e.x, e.y);
    if (RNG() < .0005 * lk) spawnPickup('nuke', e.x, e.y);
    if (RNG() < .0005 * lk) spawnPickup('clock', e.x, e.y);
  }
  if (e.def.split && !e.small) {
    for (let i = 0; i < 2; i++) { const a = RNG() * TAU; const n = spawnEnemy(e.def.split, e.x + Math.cos(a) * 12, e.y + Math.sin(a) * 12, { force: true }); n.kvx = Math.cos(a) * 120; n.kvy = Math.sin(a) * 120; n.small = true; }
  }
  if (w && w.id === 'frost' && w.evo) explosion(e.x, e.y, 46 * G.st.area, w.s.dmg * .6, w, { silent: true, freeze: .8, kb: 2, col: '#dff8ff' });
}

// ================= WEAPON LOGIC =================
function areaHit(w, x, y, r, dmg, hcd, kb) {
  const arr = gridQuery(x, y, r, QB2);
  for (let i = 0; i < arr.length; i++) {
    const e = arr[i]; if (e.dead) continue;
    const nt = w.hm.get(e); if (nt !== undefined && nt > G.t) continue;
    w.hm.set(e, G.t + hcd);
    damage(e, dmg, w, { kb, dx: e.x - G.p.x, dy: e.y - G.p.y });
  }
}
function beamDamage(w, x, y, a, L, wid, dmg) {
  const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L, dx = ex - x, dy = ey - y, l2 = dx * dx + dy * dy || 1;
  const mnx = Math.min(x, ex) - wid - 60, mxx = Math.max(x, ex) + wid + 60, mny = Math.min(y, ey) - wid - 60, mxy = Math.max(y, ey) + wid + 60;
  for (let i = 0; i < G.en.length; i++) {
    const e = G.en[i];
    if (e.dead || e.x < mnx || e.x > mxx || e.y < mny || e.y > mxy) continue;
    const t = clamp(((e.x - x) * dx + (e.y - y) * dy) / l2, 0, 1);
    const px = x + dx * t - e.x, py = y + dy * t - e.y, R0 = e.r + wid;
    if (px * px + py * py <= R0 * R0) damage(e, dmg, w, null);
  }
}
function addFire(w, s, x, y, sc) {
  if (G.ar.length > 240) return;
  G.ar.push({ kind: 'fire', x, y, r: 34 * s.area * sc, life: s.dur * (sc < 1 ? .6 : 1), max: s.dur * (sc < 1 ? .6 : 1), tick: 0, dmg: s.dmg, w, iv: w.evo ? .3 : .4, seed: vr() * 10 });
}
function slash(w, s, a) {
  const P = G.p, R0 = 95 * s.area, arc = 2.2;
  const arr = gridQuery(P.x, P.y, R0, []);
  for (const e of arr) {
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1;
    if (Math.abs(angDiff(Math.atan2(dy, dx), a)) <= arc / 2 + e.r / Math.max(20, d)) damage(e, s.dmg, w, { kb: s.kb, dx, dy });
  }
  G.fx.push({ kind: 'slash', x: P.x, y: P.y, a, R: R0, arc, life: .2, max: .2, col: w.evo ? '#e6dcff' : '#7dffb0', follow: true });
  sfx('slash');
  if (w.evo) shoot(w, P.x, P.y, a, 470 * G.st.pspd, { dmg: s.dmg * .7, pierce: 999, life: .9 * G.st.dur, r: 20 * s.area, kb: 6, col: '#e6dcff', spr: 'crescent' });
}
function chainFrom(w, s, first) {
  let cur = first; const hit = new Set();
  const pts = [[G.p.x, G.p.y - 10]];
  let n = s.pierce + 1;
  while (cur && n-- > 0) {
    hit.add(cur); pts.push([cur.x, cur.y]);
    const cx = cur.x, cy = cur.y;
    damage(cur, s.dmg, w, { stun: .12 });
    if (w.evo) explosion(cx, cy, 44 * s.area, s.dmg * .45, w, { silent: true, kb: 3, col: '#bfe6ff' });
    cur = nearestEnemy(cx, cy, 140 * s.area, hit);
  }
  G.fx.push({ kind: 'bolt', pts: jag(pts), life: .25, max: .25, col: w.evo ? '#ffffff' : '#9ad8ff', w: w.evo ? 4 : 2.5 });
}
function jag(pts) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const seg = Math.max(2, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 22));
    for (let k = 1; k <= seg; k++) { const t = k / seg; const off = k === seg ? 0 : vrr(-9, 9); out.push([lerp(x0, x1, t) + off, lerp(y0, y1, t) + vrr(-9, 9) * (k === seg ? 0 : 1)]); }
  }
  return out;
}
const WL = {
  pulse: {
    fire(w, s) {
      const P = G.p, tg = nearestN(P.x, P.y, s.amt, G.viewR * .95), col = w.evo ? '#fff3a0' : '#6ef2ff';
      for (let i = 0; i < s.amt; i++) {
        let a;
        if (tg.length) { const t = tg[i % tg.length]; a = Math.atan2(t.y - P.y, t.x - P.x); if (i >= tg.length) a += (i - tg.length + 1) * .14 * (i % 2 ? 1 : -1); }
        else a = P.face + (i - (s.amt - 1) / 2) * .15;
        shoot(w, P.x, P.y, a, s.spd, { dmg: s.dmg, pierce: s.pierce, life: s.dur, r: (w.evo ? 9 : 5.5) * s.area, kb: s.kb, col, explode: w.evo ? 46 * s.area : 0 });
      }
      sfx('shoot');
    }
  },
  orbit: {
    update(w, s, dt) {
      w.ph = (w.ph || 0) + dt * s.spd;
      if (w.evo) w.on = 1;
      else if (w.on > 0) { w.on -= dt; if (w.on <= 0) { w.on = 0; w.cdT = s.cd; } }
      else { w.cdT = (w.cdT === undefined ? .3 : w.cdT) - dt; if (w.cdT <= 0) { w.on = s.dur; sfx('orbit'); } }
      if (!(w.on > 0)) return;
      const P = G.p, R0 = 66 * s.area, br = 12 * s.area * (w.evo ? 1.25 : 1);
      for (let i = 0; i < s.amt; i++) { const a = w.ph + i * TAU / s.amt; areaHit(w, P.x + Math.cos(a) * R0, P.y + Math.sin(a) * R0, br, s.dmg, w.evo ? .3 : .45, s.kb); }
    },
    draw(w, s) {
      if (!(w.on > 0)) return;
      const P = G.p, R0 = 66 * s.area, sc = s.area * (w.evo ? 1.25 : 1) * .6;
      const al = w.evo ? 1 : Math.min(1, w.on * 4);
      const sp = bladeSprite(w.evo ? '#ffe7a0' : '#c9a2ff');
      ctx.globalAlpha = al; ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < s.amt; i++) { const a = w.ph + i * TAU / s.amt; drawSpr(sp.c, sp.size, P.x + Math.cos(a) * R0, P.y + Math.sin(a) * R0, sc * 1.7, sc * 1.7, w.ph * 3 + i); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  },
  nova: {
    fire(w, s) {
      for (let i = 0; i < s.amt; i++) later(i * .22, () => {
        G.ar.push({ kind: 'ring', x: G.p.x, y: G.p.y, r: 0, R: (w.evo ? 150 : 105) * s.area, t: 0, T: .32, dmg: s.dmg, w, hit: new Set(), kb: s.kb, stun: w.evo ? .7 : 0, col: w.evo ? '#ffb35e' : '#ffd66b' });
        sfx('nova'); if (w.evo) shake(3);
      });
    }
  },
  chain: {
    fire(w, s) {
      const P = G.p, st = nearestN(P.x, P.y, s.amt, G.viewR * .8);
      if (!st.length) return false;
      for (const t of st) chainFrom(w, s, t);
      sfx('zap');
    }
  },
  scatter: {
    fire(w, s) {
      const P = G.p, t = nearestEnemy(P.x, P.y, G.viewR * .7), a0 = t ? Math.atan2(t.y - P.y, t.x - P.x) : P.face;
      const n = s.amt, spread = Math.min(1.7, .5 + n * .045);
      for (let i = 0; i < n; i++) {
        const a = a0 + (n > 1 ? (i / (n - 1) - .5) * spread : 0) + vrr(-.05, .05);
        shoot(w, P.x, P.y, a, s.spd * vrr(.85, 1.1), { dmg: s.dmg, pierce: s.pierce, life: s.dur * vrr(.9, 1.1), r: 5 * s.area, kb: s.kb, col: w.evo ? '#ff8a3d' : '#ffe27a', burn: w.evo ? s.dmg * .3 : 0 });
      }
      sfx('scatter');
    }
  },
  drone: {
    update(w, s, dt) {
      const P = G.p; w.drones = w.drones || [];
      while (w.drones.length < s.amt) w.drones.push({ x: P.x, y: P.y, cd: vr() * s.cd, aim: 0 });
      if (w.drones.length > s.amt) w.drones.length = s.amt;
      w.ph = (w.ph || 0) + dt * 1.6;
      const n = w.drones.length, R0 = 50 + (n > 4 ? 16 : 0);
      for (let i = 0; i < n; i++) {
        const d = w.drones[i], a = w.ph + i * TAU / n;
        const tx = P.x + Math.cos(a) * R0, ty = P.y + Math.sin(a) * R0 * .8;
        d.x += (tx - d.x) * Math.min(1, dt * 10); d.y += (ty - d.y) * Math.min(1, dt * 10);
        d.cd -= dt;
        if (d.cd <= 0) {
          const t = nearestEnemy(d.x, d.y, 400);
          if (t) { const aa = Math.atan2(t.y - d.y, t.x - d.x); d.aim = aa; shoot(w, d.x, d.y, aa, s.spd, { dmg: s.dmg, pierce: s.pierce, life: s.dur, r: 4.2 * s.area, kb: s.kb, col: w.evo ? '#9dffcf' : '#8affff' }); d.cd = s.cd; sfx('pew'); }
          else d.cd = .2;
        }
      }
    },
    draw(w) {
      if (!w.drones) return;
      const sp = droneSprite(w.evo ? '#9dffcf' : '#8affff');
      for (const d of w.drones) drawSpr(sp.c, sp.size, d.x, d.y + Math.sin(G.rt * 5 + d.x) * 2, 1, 1, 0);
    }
  },
  flame: {
    fire(w, s) {
      const P = G.p;
      for (let i = 0; i < s.amt; i++) { const a = vr() * TAU, dd = i === 0 ? 0 : vrr(40, 90); addFire(w, s, P.x + Math.cos(a) * dd, P.y + Math.sin(a) * dd, 1); }
      sfx('fire');
    },
    extra(w, s, dt) {
      if (!w.evo) return;
      w.trail = (w.trail || 0) - dt;
      if (w.trail <= 0 && G.p.moving) { w.trail = .25; addFire(w, s, G.p.x, G.p.y, .65); }
    }
  },
  frost: {
    fire(w, s) {
      const P = G.p, tg = randomEnemies(P.x, P.y, s.amt, G.viewR * .9);
      for (let i = 0; i < s.amt; i++) {
        const t = tg[i]; const a = t ? Math.atan2(t.y - P.y, t.x - P.x) : vr() * TAU;
        shoot(w, P.x, P.y, a, s.spd, { dmg: s.dmg, pierce: s.pierce, life: s.dur, r: 6 * s.area, kb: s.kb, col: w.evo ? '#e8fbff' : '#9fe6ff', slow: w.evo ? 0 : .45, freeze: w.evo ? 1.1 : 0, spr: 'shard' });
      }
      sfx('ice');
    }
  },
  boomerang: {
    fire(w, s) {
      const P = G.p, tg = nearestN(P.x, P.y, s.amt, G.viewR * .8);
      for (let i = 0; i < s.amt; i++) later(i * .12, () => {
        const t = tg[i] && !tg[i].dead ? tg[i] : null;
        const a = t ? Math.atan2(t.y - G.p.y, t.x - G.p.x) : G.p.face + i * .6;
        const p = shoot(w, G.p.x, G.p.y, a, s.spd, { kind: 'boom', dmg: s.dmg, pierce: 999, life: 4, r: (w.evo ? 15 : 10) * s.area, kb: s.kb, col: w.evo ? '#ffe066' : '#ffb35e', hcd: .35, spin: 16, spr: 'boom' });
        if (p) { p.T = s.dur; p.v0 = s.spd; }
        sfx('throw');
      });
    }
  },
  laser: {
    update(w, s, dt) {
      const P = G.p;
      if (w.evo) {
        w.rot = (w.rot || 0) + dt * 1.25; w.tick = (w.tick || 0) - dt;
        const n = 3 + s.amt; w.L = 330 * s.area; w.wid = 10 * s.area; w.on = 1;
        w.beams = []; for (let i = 0; i < n; i++) w.beams.push(w.rot + i * TAU / n);
        if (w.tick <= 0) { w.tick = .12; for (const a of w.beams) beamDamage(w, P.x, P.y, a, w.L, w.wid, s.dmg); }
        return;
      }
      if (w.on > 0) {
        w.on -= dt; w.tick -= dt;
        if (w.tick <= 0) { w.tick = .1; for (const b of w.beams) beamDamage(w, P.x, P.y, b, w.L, w.wid, s.dmg); }
        if (w.on <= 0) { w.on = 0; w.cdT = s.cd; }
        return;
      }
      w.cdT = (w.cdT === undefined ? .5 : w.cdT) - dt;
      if (w.cdT <= 0) {
        const tg = nearestN(P.x, P.y, s.amt, G.viewR * .9);
        if (!tg.length) { w.cdT = .25; return; }
        w.beams = [];
        for (let i = 0; i < s.amt; i++) { const t = tg[i % tg.length]; let a = Math.atan2(t.y - P.y, t.x - P.x); if (i >= tg.length) a += .35 * (i - tg.length + 1); w.beams.push(a); }
        w.on = s.dur; w.tick = 0; w.L = 340 * s.area; w.wid = 9 * s.area;
        sfx('laser');
      }
    },
    draw(w) {
      if (!(w.on > 0) || !w.beams) return;
      const P = G.p, al = w.evo ? 1 : Math.min(1, w.on * 6);
      worldT();
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const a of w.beams) {
        const ex = P.x + Math.cos(a) * w.L, ey = P.y + Math.sin(a) * w.L;
        ctx.globalAlpha = .35 * al; ctx.strokeStyle = w.evo ? '#ffd66b' : '#ff7ae0'; ctx.lineWidth = w.wid * 2.4;
        ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.globalAlpha = .8 * al; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = w.wid * .7 * (1 + Math.sin(G.rt * 40) * .15);
        ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(ex, ey); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  },
  bomb: {
    fire(w, s) {
      const P = G.p, tg = randomEnemies(P.x, P.y, s.amt, G.viewR * .8);
      for (let i = 0; i < s.amt; i++) {
        const t = tg[i];
        const tx = t ? t.x : P.x + vrr(-160, 160), ty = t ? t.y : P.y + vrr(-160, 160);
        if (G.pr.length > 900) break;
        G.pr.push({ kind: 'lob', x: P.x, y: P.y, sx: P.x, sy: P.y, tx, ty, z: 0, age: 0, life: .5, max: .5, w, dead: false, r: 8, spr: 'bomb', rot: 0, spin: 10, col: '#b48cff',
          onEnd: p => { G.ar.push({ kind: 'grav', x: p.tx, y: p.ty, r: 85 * s.area, t: 0, T: s.dur, dmg: s.dmg, w, tick: 0, evo: w.evo }); sfx('grav'); } });
      }
      sfx('throw');
    }
  },
  sword: {
    fire(w, s) {
      const P = G.p, t = nearestEnemy(P.x, P.y, 150 * s.area), base = t ? Math.atan2(t.y - P.y, t.x - P.x) : P.face;
      for (let i = 0; i < s.amt; i++) later(i * .13, () => { const a = base + (i % 2 ? Math.PI : 0) + (i >= 2 ? .6 * (i - 1) : 0); slash(w, s, a); });
    }
  },
};
function updateWeapons(dt) {
  for (const w of G.p.weapons) {
    const L = WL[w.id], s = w.s;
    if (L.update) L.update(w, s, dt);
    else { w.t -= dt; if (w.t <= 0) { const ok = L.fire(w, s); w.t = ok === false ? .25 : s.cd; } }
    if (L.extra) L.extra(w, s, dt);
    if (G.t - (w.hmClean || 0) > 3) { w.hmClean = G.t; for (const [e, t] of w.hm) if (e.dead || t < G.t) w.hm.delete(e); }
  }
}

// ================= ENEMIES =================
function maxEnemies() { return SAVE.set.quality === 'high' ? 300 : SAVE.set.quality === 'mid' ? 230 : 160; }
function spawnPos() {
  const P = G.p; let a;
  if ((IN.mx || IN.my) && RNG() < .45) a = Math.atan2(IN.my, IN.mx) + rr(-1, 1); else a = RNG() * TAU;
  const d = G.viewR + 30 + RNG() * 70;
  return [P.x + Math.cos(a) * d, P.y + Math.sin(a) * d];
}
function spawnEnemy(type, x, y, o) {
  o = o || {};
  const d = ENEMIES[type];
  const sz = (o.elite ? 1.6 : 1) * (d.prop ? 1 : G.gm.size);
  const hp = d.prop ? 1 : d.hp * G.hpMul * G.gm.hp * (o.elite ? 14 : 1);
  const e = {
    id: G.nextId++, type, def: d, x, y, r: d.r * sz, hp, maxHp: hp,
    spd: d.spd * (o.elite ? 1.08 : 1) * (.92 + RNG() * .16), dmg: d.dmg * (o.elite ? 1.5 : 1), xp: d.xp * (o.elite ? 12 : 1),
    ai: d.ai, kbRes: o.elite ? Math.max(.6, d.kbRes || 0) : (d.kbRes || 0), elite: !!o.elite, prop: !!d.prop, boss: false,
    kvx: 0, kvy: 0, flash: 0, slowT: 0, slow: 0, frzT: 0, stunT: 0, burnT: 0, burnD: 0, burnTick: 0,
    cd: 1 + RNG() * 2, st: 0, stT: 0, seed: RNG() * 100, face: 1, dead: false, spawnT: .3, alpha: 1, warn: 0, small: false, jump: 0
  };
  G.en.push(e);
  if (!d.prop && !SAVE.codex.en[type]) SAVE.codex.en[type] = 1;
  return e;
}
function updateSpawner(dt) {
  const S = G.stage, t = G.t, m = t / 60;
  G.hpMul = (1 + (S.mult - 1) * clamp(t / 300, 0, 1)) * (1 + .3 * m + .015 * m * m) * (1 + .2 * G.abyss) * (t > STAGE_LEN ? 1 + (t - STAGE_LEN) / 60 * .08 : 1);
  G.dmgMul = (1 + .07 * m) * (1 + .1 * G.abyss);
  let wi = 0; while (wi + 1 < S.waves.length && S.waves[wi + 1][0] <= t) wi++;
  const w = S.waves[wi], nx = S.waves[wi + 1];
  let rate = nx ? lerp(w[2], nx[2], (t - w[0]) / (nx[0] - w[0])) : w[2] + Math.max(0, t - w[0]) / 60 * .9;
  rate *= (1 + .08 * G.abyss) * G.gm.rate;
  if (G.bosses.length && !G.endless) rate *= .45;
  G.spawnAcc += rate * dt;
  const cap = maxEnemies();
  let guard = 0;
  while (G.spawnAcc >= 1 && guard++ < 20) {
    G.spawnAcc -= 1;
    if (G.en.length >= cap) { G.spawnAcc = 0; break; }
    const p = spawnPos(); spawnEnemy(wpickObj(w[1]), p[0], p[1]);
  }
  if (!G.endless) { while (G.evIdx < EVENTS.length && EVENTS[G.evIdx][0] <= t) { runEvent(EVENTS[G.evIdx][1]); G.evIdx++; } }
  else if (G.endT) {
    const E = G.endT;
    if (t >= E.elite) { E.elite = t + 32; runEvent('elite'); }
    if (t >= E.horde) { E.horde = t + 50; runEvent(RNG() < .5 ? 'swarm' : 'ring'); }
    if (t >= E.boss) { E.boss = t + 150; spawnBoss(bossDef(pick(BIDS.slice(0, G.stageIdx + 1))), { hpMul: 1 + (t - STAGE_LEN) / 120 * .6, endless: true }); }
  }
  G.lanternT -= dt;
  if (G.lanternT <= 0) {
    G.lanternT = rr(14, 22);
    let n = 0; for (const e of G.en) if (e.prop) n++;
    if (n < 5) { const a = RNG() * TAU, d = G.viewR * rr(.55, 1.05); spawnEnemy('lantern', G.p.x + Math.cos(a) * d, G.p.y + Math.sin(a) * d); }
  }
}
function runEvent(k) {
  const S = G.stage;
  if (k === 'elite') { const p = spawnPos(); const e = spawnEnemy(pick(S.elites), p[0], p[1], { elite: true }); toast('⚠ エリート「' + e.def.name + '」出現！ 倒すと宝箱', 'warn'); sfx('elite'); }
  else if (k === 'swarm') {
    const a = RNG() * TAU, d = G.viewR + 60, cx = G.p.x + Math.cos(a) * d, cy = G.p.y + Math.sin(a) * d;
    const n = 22 + G.abyss * 2 + Math.floor(G.t / 60) * 2;
    for (let i = 0; i < n; i++) spawnEnemy(S.swarm, cx + rr(-70, 70), cy + rr(-70, 70));
    toast('群れが迫ってくる！', 'warn');
  } else if (k === 'ring') {
    const n = 26 + G.abyss * 2, rad = Math.max(G.viewW, G.viewH) * .58;
    for (let i = 0; i < n; i++) { const a = i * TAU / n; spawnEnemy(S.ring, G.p.x + Math.cos(a) * rad, G.p.y + Math.sin(a) * rad); }
    toast('包囲された！ ダッシュで突破しよう', 'warn');
  } else if (k === 'mid') spawnBoss(midDef(), { mid: true });
  else if (k === 'boss') spawnBoss(bossDef(S.boss), { final: true });
}
function mv(e, vx, vy, dt) { e.x += vx * dt; e.y += vy * dt; }
function enemyShoot(e, ux, uy) {
  const sh = e.def.shot, a0 = Math.atan2(uy, ux), dmg = e.dmg * .8, col = e.def.col;
  const fire = () => {
    if (e.dead) return;
    if (sh.sp >= TAU - .01) { const off = RNG() * TAU; for (let i = 0; i < sh.n; i++) eBullet(e.x, e.y, off + i * TAU / sh.n, sh.spd, dmg, col); }
    else { const a = Math.atan2(G.p.y - e.y, G.p.x - e.x); for (let i = 0; i < sh.n; i++) eBullet(e.x, e.y, a + (sh.n > 1 ? (i / (sh.n - 1) - .5) * sh.sp * 2 : 0), sh.spd, dmg, col); }
  };
  fire();
  if (sh.burst) for (let i = 1; i < sh.burst; i++) later(i * .16, fire);
  e.warn = 0;
  void a0;
}
function enemyAI(e, dt, dx, dy, d) {
  const sp = e.spd * (1 - (e.slowT > 0 ? e.slow : 0)) * G.gm.spd * (1 + .02 * G.abyss) * (1 + Math.min(.35, G.t / 60 * .02));
  const ux = dx / d, uy = dy / d;
  switch (e.ai) {
    case 'chase': case 'tank': mv(e, ux * sp, uy * sp, dt); break;
    case 'swarm': { const wv = Math.sin(G.t * 3 + e.seed) * .7, c = Math.cos(wv), s = Math.sin(wv); mv(e, (ux * c - uy * s) * sp, (ux * s + uy * c) * sp, dt); break; }
    case 'dash': {
      if (e.st === 0) { mv(e, ux * sp, uy * sp, dt); e.cd -= dt; if (e.cd <= 0 && d < 230) { e.st = 1; e.stT = .6; e.dx = ux; e.dy = uy; e.warn = 1; } }
      else if (e.st === 1) { e.stT -= dt; if (e.stT <= 0) { e.st = 2; e.stT = .5; e.warn = 0; } }
      else { e.stT -= dt; mv(e, e.dx * sp * 4.2, e.dy * sp * 4.2, dt); if (vr() < .3) part(e.x, e.y, 0, 0, .3, 3, e.def.col); if (e.stT <= 0) { e.st = 0; e.cd = rr(2, 3); } }
      break;
    }
    case 'shooter': {
      let mx = 0, my = 0;
      if (d > 260) { mx = ux; my = uy; } else if (d < 170) { mx = -ux; my = -uy; } else { mx = -uy * .6; my = ux * .6; }
      mv(e, mx * sp, my * sp, dt);
      e.cd -= dt;
      if (e.cd < .5 && e.cd > 0) e.warn = 1;
      if (e.cd <= 0 && d < G.viewR * .9) { enemyShoot(e, ux, uy); e.cd = e.def.shot.cd * rr(.85, 1.15); }
      else if (e.cd <= 0) e.cd = .5;
      break;
    }
    case 'exploder': {
      if (e.st === 0) { mv(e, ux * sp, uy * sp, dt); if (d < 46) { e.st = 1; e.stT = .55; e.warn = 1; } }
      else {
        e.stT -= dt;
        if (e.stT <= 0) {
          e.dead = true;
          G.fx.push({ kind: 'flash', x: e.x, y: e.y, r: 72, life: .3, max: .3, col: '#ff5d5d' });
          burst(e.x, e.y, '#ff8a3d', 22, 260, 4);
          if (d < 72 + G.p.r) hurtPlayer(e.dmg);
          sfx('boom'); shake(4);
        }
      }
      break;
    }
    case 'teleport': {
      if (e.st === 0) { mv(e, ux * sp, uy * sp, dt); e.cd -= dt; if (e.cd <= 0 && d > 150) { e.st = 1; e.stT = .4; } }
      else if (e.st === 1) {
        e.stT -= dt; e.alpha = Math.max(.05, e.stT / .4);
        if (e.stT <= 0) { const a = RNG() * TAU, rd = rr(120, 170); e.x = G.p.x + Math.cos(a) * rd; e.y = G.p.y + Math.sin(a) * rd; e.st = 2; e.stT = .45; burst(e.x, e.y, e.def.col, 10, 150, 3); }
      } else { e.stT -= dt; e.alpha = 1 - Math.max(0, e.stT / .45) * .9; if (e.stT <= 0) { e.st = 0; e.cd = rr(3, 4.5); e.alpha = 1; } }
      break;
    }
    case 'healer': {
      let mx = 0, my = 0; if (d > 240) { mx = ux; my = uy; } else if (d < 180) { mx = -ux; my = -uy; }
      mv(e, mx * sp, my * sp, dt);
      e.cd -= dt;
      if (e.cd <= 0) {
        e.cd = 3.2;
        const arr = gridQuery(e.x, e.y, 150, []);
        for (const o of arr) if (!o.boss && !o.prop && o !== e) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * .25);
        G.fx.push({ kind: 'ringfx', x: e.x, y: e.y, r0: 10, r1: 150, life: .5, max: .5, col: '#7dff9a', lw: 3 });
      }
      break;
    }
    case 'spawner': {
      mv(e, ux * sp, uy * sp, dt);
      e.cd -= dt;
      if (e.cd <= 0) { e.cd = 5; if (G.en.length < maxEnemies()) for (let k = 0; k < 3; k++) { const a = RNG() * TAU; spawnEnemy(e.def.spawn, e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30); } }
      break;
    }
    default: break;
  }
  if (Math.abs(dx) > 2) e.face = dx < 0 ? -1 : 1;
}
function updateEnemies(dt) {
  const P = G.p, frozen = G.freezeT > 0, arr = G.en; let j = 0;
  for (let i = 0; i < arr.length; i++) {
    const e = arr[i];
    if (e.dead) continue;
    if (e.flash > 0) e.flash -= dt;
    if (e.spawnT > 0) e.spawnT -= dt;
    if (e.burnT > 0) {
      e.burnT -= dt; e.burnTick -= dt;
      if (e.burnTick <= 0) { e.burnTick = .5; damage(e, e.burnD, null, null); if (vr() < .8) part(e.x, e.y - e.r * .5, 0, -40, .4, 3, '#ff8a3d'); if (e.dead) continue; }
    }
    e.x += e.kvx * dt; e.y += e.kvy * dt;
    const kd = Math.exp(-9 * dt); e.kvx *= kd; e.kvy *= kd;
    const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (e.boss) { if (!frozen) updateBoss(e, dt, dx, dy, d); }
    else if (!frozen && e.frzT <= 0 && e.stunT <= 0) enemyAI(e, dt, dx, dy, d);
    if (e.frzT > 0) e.frzT -= dt;
    if (e.stunT > 0) e.stunT -= dt;
    if (e.slowT > 0) e.slowT -= dt; else e.slow = 0;
    if (e.dead) continue;
    if (!e.prop && !frozen && e.spawnT <= 0 && e.jump < 20 && e.alpha > .5) {
      const rr0 = e.r + P.r * .8;
      if (dx * dx + dy * dy < rr0 * rr0) hurtPlayer(e.dmg);
    }
    if (!e.boss && d > G.viewR * 1.8) {
      if (e.prop) { e.dead = true; continue; }
      const p = spawnPos(); e.x = p[0]; e.y = p[1]; e.kvx = e.kvy = 0; e.st = 0;
    }
    arr[j++] = e;
  }
  arr.length = j;
}

// ================= BOSSES =================
function midDef() {
  const S = G.stage, d = ENEMIES[S.mid];
  return { id: 'mid_' + S.id, name: S.midName, shape: d.shape, col: d.col, r: d.r * 2.3, hp: d.hp * 32 * S.mult, spd: d.spd * 1.25, dmg: d.dmg * 1.6, pats: ['ring', 'charge', 'fan', 'summon'], summon: S.ring, xp: 80 };
}
function bossDef(id) { return Object.assign({ id }, BOSSES[id]); }
function spawnBoss(def, o) {
  const p = spawnPos();
  const hp = def.hp * (1 + .2 * G.abyss) * G.gm.hp * (o.hpMul || 1);
  const e = {
    id: G.nextId++, type: def.id, def, boss: true, x: p[0], y: p[1], r: def.r, hp, maxHp: hp, spd: def.spd, dmg: def.dmg, xp: def.xp,
    ai: 'boss', kbRes: 1, kvx: 0, kvy: 0, flash: 0, slowT: 0, slow: 0, frzT: 0, stunT: 0, burnT: 0, burnD: 0, burnTick: 0, cd: 0,
    seed: RNG() * 100, face: 1, dead: false, spawnT: .5, alpha: 1, pat: null, pt: 0, patCd: 2.2, ps: {}, final: !!o.final, mid: !!o.mid, endless: !!o.endless,
    last: '', jump: 0, warn: 0, prop: false, elite: false
  };
  G.en.push(e); G.bosses.push(e);
  if (o.final) G.bossNoHit = true;
  bossBar(true); sfx('warn'); bgm('boss');
  bigToast(def.name, o.final ? 'ステージボス出現！' : o.mid ? '中ボス出現！' : '強敵出現！', true);
  return e;
}
function eBullet(x, y, a, spd, dmg, col, r) {
  if (G.eb.length > 700) return;
  G.eb.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: r || 6, dmg, life: 7, col });
}
function ringBullets(e, n, spd, off) { for (let i = 0; i < n; i++) eBullet(e.x, e.y, off + i * TAU / n, spd, e.dmg * .7, e.def.col); }
const BPAT = {
  ring(e, dt, rg) {
    const s = e.ps;
    if (!s.a && e.pt > .35) { s.a = 1; ringBullets(e, 16 + (e.ph2 ? 10 : 0) + G.abyss, 150, RNG() * TAU); sfx('nova'); }
    if (!s.b && e.pt > .85 && rg > 1.2) { s.b = 1; ringBullets(e, 16 + G.abyss, 125, RNG() * TAU); }
    return e.pt > 1.3;
  },
  spiral(e, dt, rg) {
    const s = e.ps; s.a = s.a || 0; s.t = (s.t || 0) - dt;
    if (e.pt > .3 && e.pt < 2.8 && s.t <= 0) {
      s.t = .1 / Math.min(1.5, rg);
      const arms = e.ph2 ? 4 : 3;
      for (let i = 0; i < arms; i++) eBullet(e.x, e.y, s.a + i * TAU / arms, 140, e.dmg * .6, e.def.col);
      s.a += .28;
    }
    return e.pt > 3.1;
  },
  fan(e) {
    const s = e.ps; s.n = s.n || 0;
    const times = [.35, .8, 1.25];
    if (s.n < times.length && e.pt > times[s.n]) {
      const a0 = Math.atan2(G.p.y - e.y, G.p.x - e.x), k = 7 + (e.ph2 ? 4 : 0);
      for (let i = 0; i < k; i++) eBullet(e.x, e.y, a0 + (i / (k - 1) - .5) * 1.0, 200, e.dmg * .7, e.def.col);
      s.n++; sfx('shoot');
    }
    return e.pt > 1.6;
  },
  charge(e, dt, rg, ux, uy) {
    const s = e.ps;
    if (!s.a) { s.a = 1; s.dx = ux; s.dy = uy; const L = 500; G.hz.push({ kind: 'line', x: e.x, y: e.y, x2: e.x + ux * L, y2: e.y + uy * L, w: e.r * 1.6, t: 0, delay: .75, dmg: 0, col: e.def.col }); }
    if (e.pt > .75 && e.pt < 1.45) { const sp = 580; e.x += s.dx * sp * dt; e.y += s.dy * sp * dt; if (vr() < .6) part(e.x + vrr(-e.r, e.r) * .5, e.y + vrr(-e.r, e.r) * .5, 0, 0, .4, 6, e.def.col); }
    return e.pt > 1.8;
  },
  slam(e) {
    const s = e.ps;
    if (!s.a) { s.a = 1; s.tx = G.p.x; s.ty = G.p.y; s.sx = e.x; s.sy = e.y; G.hz.push({ kind: 'circle', x: s.tx, y: s.ty, r: 105, t: 0, delay: 1.1, dmg: e.dmg * 1.3, col: e.def.col }); }
    if (e.pt < 1.1) { const k = e.pt / 1.1; e.x = lerp(s.sx, s.tx, k); e.y = lerp(s.sy, s.ty, k); e.jump = Math.sin(k * Math.PI) * 90; }
    else if (!s.b) { s.b = 1; e.jump = 0; e.x = s.tx; e.y = s.ty; ringBullets(e, 12 + G.abyss, 170, 0); shake(10); sfx('boom'); burst(e.x, e.y, e.def.col, 30, 300, 5); }
    return e.pt > 1.6;
  },
  summon(e) {
    const s = e.ps;
    if (!s.a && e.pt > .4) {
      s.a = 1;
      const n = 8 + G.abyss;
      for (let i = 0; i < n; i++) { const a = i * TAU / n; spawnEnemy(e.def.summon, e.x + Math.cos(a) * (e.r + 30), e.y + Math.sin(a) * (e.r + 30)); }
      G.fx.push({ kind: 'ringfx', x: e.x, y: e.y, r0: e.r, r1: e.r + 90, life: .5, max: .5, col: e.def.col, lw: 5 });
      sfx('grav');
    }
    return e.pt > 1;
  },
  pillars(e) {
    const s = e.ps; s.n = s.n || 0;
    const times = [0, .5, 1.0];
    if (s.n < 3 && e.pt >= times[s.n]) {
      s.n++;
      for (let i = 0; i < 3; i++) { const a = RNG() * TAU, d = i === 0 ? 0 : rr(60, 160); G.hz.push({ kind: 'circle', x: G.p.x + Math.cos(a) * d + IN.mx * 45, y: G.p.y + Math.sin(a) * d + IN.my * 45, r: 58, t: 0, delay: .95, dmg: e.dmg, col: e.def.col }); }
    }
    return e.pt > 2.2;
  },
  meteor(e, dt) {
    const s = e.ps; s.t = (s.t || 0) - dt;
    if (e.pt < 2 && s.t <= 0) { s.t = .16; const a = RNG() * TAU, d = rr(0, 260); G.hz.push({ kind: 'circle', x: G.p.x + Math.cos(a) * d, y: G.p.y + Math.sin(a) * d, r: 62, t: 0, delay: 1.05, dmg: e.dmg * .9, col: '#ff8a3d', meteor: true }); }
    return e.pt > 3.1;
  },
  teleport(e) {
    const s = e.ps;
    if (e.pt < .45) e.alpha = 1 - e.pt / .45 * .9;
    else if (!s.a) { s.a = 1; const a = RNG() * TAU, d = rr(170, 230); e.x = G.p.x + Math.cos(a) * d; e.y = G.p.y + Math.sin(a) * d; burst(e.x, e.y, e.def.col, 20, 200, 4); }
    if (e.pt >= .45) e.alpha = Math.min(1, .1 + (e.pt - .45) / .4 * .9);
    if (!s.b && e.pt > .85) { s.b = 1; ringBullets(e, 14 + (e.ph2 ? 8 : 0), 150, RNG() * TAU); }
    return e.pt > 1.2;
  },
};
function updateBoss(e, dt, dx, dy, d) {
  const ux = dx / d, uy = dy / d, frac = e.hp / e.maxHp;
  if (e.def.phase2 && frac < .5 && !e.ph2) { e.ph2 = true; bigToast(e.def.name, '怒りの第二形態！', true); sfx('warn'); ringBullets(e, 36, 160, 0); shake(12); flashScreen('#c04dff', .3); }
  const rage = e.ph2 ? 1.55 : 1 + (1 - frac) * .35;
  e.face = dx < 0 ? -1 : 1;
  if (!e.pat) {
    const sp = e.spd * (e.slowT > 0 ? .8 : 1) * (e.frzT > 0 || e.stunT > 0 ? .2 : 1);
    if (d > 60) { e.x += ux * sp * dt; e.y += uy * sp * dt; }
    e.patCd -= dt * rage;
    if (e.patCd <= 0) { let p, g = 0; do { p = pick(e.def.pats); } while (p === e.last && g++ < 6); e.pat = p; e.last = p; e.pt = 0; e.ps = {}; }
  } else {
    e.pt += dt;
    if (BPAT[e.pat](e, dt, rage, ux, uy, d)) { e.pat = null; e.patCd = rr(1.3, 2.3) / rage; e.alpha = 1; e.jump = 0; }
  }
  if (d > G.viewR * 1.5 && !e.pat) { const p = spawnPos(); e.x = p[0]; e.y = p[1]; }
}
function bossDefeated(e) {
  R.bosses++; SAVE.stats.bosses++;
  if (BOSSES[e.def.id]) SAVE.codex.b[e.def.id] = 1;
  G.bosses = G.bosses.filter(b => b !== e && !b.dead);
  shake(18); sfx('bossdie'); flashScreen('#ffffff', .5);
  for (let i = 0; i < 4; i++) later(i * .15, () => { burst(e.x + vrr(-40, 40), e.y + vrr(-40, 40), e.def.col, 30, 380, 5, .8); G.fx.push({ kind: 'ringfx', x: e.x, y: e.y, r0: 20, r1: 180 + i * 40, life: .6, max: .6, col: i % 2 ? '#fff' : e.def.col, lw: 8 }); });
  const n = 10;
  for (let i = 0; i < n; i++) { const a = i * TAU / n; dropGem(e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 40, e.xp / n); }
  for (let i = 0; i < (e.mid ? 6 : 12); i++) { const a = RNG() * TAU; spawnPickup('coin', e.x + Math.cos(a) * 50, e.y + Math.sin(a) * 50, Math.max(1, Math.round(3 * G.st.greed))); }
  const c = spawnPickup('chest', e.x, e.y); c.rich = !e.mid || e.endless;
  if (!G.bosses.length) { bossBar(false); bgm(G.stage.bgm); } else bossBar(true);
  G.eb.length = 0; G.hz.length = 0;
  if (e.final && !G.endless) onFinalBossDown();
}
function onFinalBossDown() {
  R.cleared = true;
  const sid = G.stage.id;
  if (!G.daily) {
    SAVE.clears[sid] = Math.max(SAVE.clears[sid] === undefined ? -1 : SAVE.clears[sid], G.abyss);
    if (G.abyss >= SAVE.maxAbyss && SAVE.maxAbyss < 10) SAVE.maxAbyss = G.abyss + 1;
    SAVE.stages = Math.max(SAVE.stages, Math.min(STAGES.length, G.stageIdx + 2));
  }
  SAVE.charClear[G.char.id] = 1;
  if (G.bossNoHit) SAVE.stats.flags.nohit = true;
  writeSave();
  G.pendingClear = 2.4;
}
function updateHazards(dt) {
  if (G.freezeT > 0) return;
  let j = 0;
  for (const z of G.hz) {
    z.t += dt;
    if (z.t >= z.delay) {
      if (z.dmg > 0) {
        const dx = G.p.x - z.x, dy = G.p.y - z.y, R0 = z.r + G.p.r * .6;
        if (dx * dx + dy * dy < R0 * R0) hurtPlayer(z.dmg);
        burst(z.x, z.y, z.col, z.meteor ? 18 : 12, 260, 4);
        G.fx.push({ kind: 'flash', x: z.x, y: z.y, r: z.r, life: .25, max: .25, col: z.col });
        if (z.meteor) sfx('boom');
        shake(3);
      }
      continue;
    }
    G.hz[j++] = z;
  }
  G.hz.length = j;
}
function updateEB(dt) {
  const P = G.p, fr = G.freezeT > 0, arr = G.eb; let j = 0;
  const far = (G.viewR * 1.6) ** 2;
  for (let i = 0; i < arr.length; i++) {
    const b = arr[i];
    if (!fr) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }
    const dx = b.x - P.x, dy = b.y - P.y, R0 = b.r + P.r * .6;
    if (dx * dx + dy * dy < R0 * R0 && hurtPlayer(b.dmg)) continue;
    if (b.life <= 0 || dx * dx + dy * dy > far) continue;
    arr[j++] = b;
  }
  arr.length = j;
}
function updateAreas(dt) {
  const arr = G.ar; let j = 0;
  for (let i = 0; i < arr.length; i++) {
    const a = arr[i]; let keep = true;
    if (a.kind === 'ring') {
      a.t += dt; a.x = G.p.x; a.y = G.p.y;
      const k = Math.min(1, a.t / a.T); a.r = a.R * (1 - (1 - k) * (1 - k));
      const hits = gridQuery(a.x, a.y, a.r, QB2);
      for (let q = 0; q < hits.length; q++) { const e = hits[q]; if (e.dead || a.hit.has(e)) continue; a.hit.add(e); damage(e, a.dmg, a.w, { kb: a.kb, dx: e.x - a.x, dy: e.y - a.y, stun: a.stun }); }
      if (a.t >= a.T) { keep = false; G.fx.push({ kind: 'ringfx', x: a.x, y: a.y, r0: a.R, r1: a.R * 1.1, life: .2, max: .2, col: a.col, lw: 4 }); }
    } else if (a.kind === 'fire') {
      a.life -= dt; a.tick -= dt;
      if (a.tick <= 0) { a.tick = a.iv; const hits = gridQuery(a.x, a.y, a.r, QB2); for (let q = 0; q < hits.length; q++) if (!hits[q].dead) damage(hits[q], a.dmg, a.w, null); }
      if (vr() < .25) part(a.x + vrr(-a.r, a.r) * .6, a.y + vrr(-a.r, a.r) * .6, 0, -vrr(20, 60), .5, vrr(2, 4), vr() < .5 ? '#ff8a3d' : '#ffd66b', 0);
      if (a.life <= 0) keep = false;
    } else if (a.kind === 'grav') {
      a.t += dt;
      const hits = gridQuery(a.x, a.y, a.r * 1.7, QB2);
      for (let q = 0; q < hits.length; q++) {
        const e = hits[q]; if (e.prop || e.dead) continue;
        const dx = a.x - e.x, dy = a.y - e.y, d = Math.hypot(dx, dy) || 1;
        if (d < 8) continue;
        const f = Math.min(d, (e.boss ? 25 : 170 * (1 - (e.kbRes || 0) * .6)) * dt);
        e.x += dx / d * f; e.y += dy / d * f;
      }
      if (a.evo) { a.tick -= dt; if (a.tick <= 0) { a.tick = .25; for (let q = 0; q < hits.length; q++) if (!hits[q].dead) damage(hits[q], a.dmg * .12, a.w, null); } }
      if (vr() < .5) { const an = vr() * TAU, rd = a.r * 1.5; part(a.x + Math.cos(an) * rd, a.y + Math.sin(an) * rd, -Math.cos(an) * rd * 2, -Math.sin(an) * rd * 2, .45, 2.5, '#b48cff', 1); }
      if (a.t >= a.T) { keep = false; explosion(a.x, a.y, a.r, a.dmg, a.w, { kb: 12, shake: a.evo ? 7 : 4, col: '#b48cff' }); }
    }
    if (keep) arr[j++] = a;
  }
  arr.length = j;
}

// ================= PICKUPS =================
function spawnPickup(type, x, y, v) {
  const k = { type, x, y, v: v || 1, mag: false, sp: 0, vx: 0, vy: 0, t: 0, dead: false, rich: false };
  if (type !== 'gem') { k.vx = vrr(-70, 70); k.vy = vrr(-110, -30); }
  if (type === 'gem') G.gemCount++;
  G.pk.push(k);
  return k;
}
function dropGem(x, y, v) {
  if (!(v > 0)) return;
  if (G.gemCount > 350) {
    if (G.bigGem && !G.bigGem.dead && G.pk.includes(G.bigGem)) { G.bigGem.v += v; return; }
    G.bigGem = spawnPickup('gem', x, y, v); G.bigGem.big = true; return;
  }
  spawnPickup('gem', x, y, v);
}
function dropLantern(x, y) {
  const opts = { coin: 40, heal: G.gm.noHeal ? 0 : 22, magnet: 12, clock: 8, nuke: 8, bigcoin: 10 };
  const k = wpickObj(opts);
  if (k === 'bigcoin') spawnPickup('coin', x, y, Math.round(10 * G.st.greed));
  else if (k === 'coin') spawnPickup('coin', x, y, Math.round(3 * G.st.greed));
  else spawnPickup(k, x, y);
}
function updatePickups(dt) {
  if (G.state !== 'play') return;
  const P = G.p, m2 = G.st.magnet * G.st.magnet, arr = G.pk; let j = 0;
  for (let i = 0; i < arr.length; i++) {
    const k = arr[i];
    if (k.dead) continue;
    k.t += dt;
    if (k.vx || k.vy) { k.x += k.vx * dt; k.y += k.vy * dt; const f = Math.exp(-5 * dt); k.vx *= f; k.vy *= f; if (Math.abs(k.vx) + Math.abs(k.vy) < 2) k.vx = k.vy = 0; }
    const dx = P.x - k.x, dy = P.y - k.y, d2 = dx * dx + dy * dy;
    const mg = k.type === 'gem' || k.type === 'coin';
    if (mg && !k.mag && d2 < m2) k.mag = true;
    if (k.mag) { k.sp = Math.min(950, k.sp + 1200 * dt); const d = Math.sqrt(d2) || 1, mvd = Math.min(d, k.sp * dt); k.x += dx / d * mvd; k.y += dy / d * mvd; }
    const cr = P.r + (mg ? 8 : 14);
    if (d2 < cr * cr) { k.dead = true; collect(k); if (G.state !== 'play') { for (let q = i + 1; q < arr.length; q++) arr[j++] = arr[q]; break; } continue; }
    arr[j++] = k;
  }
  arr.length = j;
}
function collect(k) {
  const P = G.p;
  switch (k.type) {
    case 'gem':
      G.gemCount--; if (k === G.bigGem) G.bigGem = null;
      gainXp(k.v);
      R.combo = R.comboT > 0 ? R.combo + 1 : 0; R.comboT = .35;
      sfx('gem', R.combo);
      break;
    case 'coin': R.coins += k.v; sfx('coin'); if (k.v > 1) dmgText(P.x, P.y - 22, '+' + k.v, 'coin'); break;
    case 'heal': { const v = Math.round(Math.max(30, G.st.maxHp * .3)); P.hp = Math.min(G.st.maxHp, P.hp + v); dmgText(P.x, P.y - 22, '+' + v, 'heal'); sfx('heal'); burst(P.x, P.y, '#7dff9a', 14, 160, 3); break; }
    case 'magnet': for (const o of G.pk) if (o.type === 'gem' || o.type === 'coin') o.mag = true; sfx('orbit'); toast('🧲 経験値を全回収！'); break;
    case 'nuke': nukeScreen(); break;
    case 'clock': G.freezeT = Math.max(G.freezeT, 5); sfx('freeze'); flashScreen('#9fe6ff', .35); toast('⏱ 時間停止！'); break;
    case 'chest': openChest(k.rich); break;
  }
}
function nukeScreen() {
  sfx('boom'); shake(16); flashScreen('#ffffff', .7);
  for (const e of G.en) {
    if (e.dead || Math.abs(e.x - G.p.x) > G.viewW * .6 || Math.abs(e.y - G.p.y) > G.viewH * .6) continue;
    if (e.boss) damage(e, e.maxHp * .05, null, null); else if (!e.prop) damage(e, e.hp + 1, null, null);
  }
  G.eb.length = 0;
}

// ================= PLAYER =================
function updatePlayer(dt) {
  const P = G.p, st = G.st;
  if (P.dashT > 0) {
    P.dashT -= dt;
    const sp = st.speed * 3.6; P.x += P.dvx * sp * dt; P.y += P.dvy * sp * dt;
    P.trailT -= dt;
    if (P.trailT <= 0) { P.trailT = .025; if (G.pt.length < maxParticles()) G.pt.push({ x: P.x, y: P.y, vx: 0, vy: 0, life: .25, max: .25, size: 1, col: G.char.col, k: 2, flip: P.flip }); }
  } else if (IN.mx || IN.my) { P.x += IN.mx * st.speed * dt; P.y += IN.my * st.speed * dt; }
  P.moving = !!(IN.mx || IN.my) || P.dashT > 0;
  if (IN.mx || IN.my) { P.face = Math.atan2(IN.my, IN.mx); if (Math.abs(IN.mx) > .1) P.flip = IN.mx < 0 ? -1 : 1; P.walk += dt * 12; }
  if (P.dashCd > 0) P.dashCd -= dt;
  if (P.iT > 0) P.iT -= dt;
  if (P.hurtT > 0) P.hurtT -= dt;
  if (st.regen > 0 && P.hp < st.maxHp) P.hp = Math.min(st.maxHp, P.hp + st.regen * dt);
}
function hurtPlayer(dmg) {
  const P = G.p;
  if (G.state !== 'play' || P.iT > 0 || P.dashT > 0 || G.ultInv > 0) return false;
  const d = Math.max(1, dmg * G.dmgMul - G.st.armor);
  P.hp -= d; P.iT = .5; P.hurtT = .25; R.dmgTaken += d;
  if (G.bosses.some(b => b.final)) G.bossNoHit = false;
  shake(7); sfx('hurt'); flashScreen('#ff2a4a', .22);
  dmgText(P.x, P.y - 20, Math.round(d), 'hurt');
  if (P.hp <= 0) playerDown();
  return true;
}
function playerDown() {
  const P = G.p;
  if (P.revives > 0) {
    P.revives--; P.hp = G.st.maxHp * .6; P.iT = 2.5;
    sfx('revive'); bigToast('復活！', '光はまだ消えない', false);
    for (const e of G.en) if (!e.boss && !e.prop && !e.dead && Math.hypot(e.x - P.x, e.y - P.y) < G.viewR * .8) damage(e, e.hp + 1, null, null);
    G.eb.length = 0;
    G.fx.push({ kind: 'ringfx', x: P.x, y: P.y, r0: 10, r1: G.viewR, life: .7, max: .7, col: '#ffd66b', lw: 10 });
    shake(15); flashScreen('#ffd66b', .5);
    return;
  }
  P.hp = 0;
  burst(P.x, P.y, G.char.col, 60, 400, 5, 1.2); sfx('over');
  G.state = 'dying'; G.dyingT = 1.5; IN.joy.on = false;
}
function tryDash() {
  const P = G.p;
  if (G.state !== 'play' || P.dashCd > 0 || P.dashT > 0) return;
  let dx = IN.mx, dy = IN.my;
  if (!dx && !dy) { dx = Math.cos(P.face); dy = Math.sin(P.face); }
  const l = Math.hypot(dx, dy) || 1;
  P.dvx = dx / l; P.dvy = dy / l; P.dashT = .18; P.dashCd = 2.2 * G.st.dash; P.iT = Math.max(P.iT, .3);
  R.dashes++; SAVE.stats.dashes++;
  sfx('dash'); burst(P.x, P.y, G.char.col, 8, 120, 3, .3);
}
function ultDmg(b) { return b * G.st.might * (1 + G.p.level * .06); }
function onScreen(e, m) { m = m || 0; return Math.abs(e.x - G.cam.x) < G.viewW / 2 + m && Math.abs(e.y - G.cam.y) < G.viewH / 2 + m; }
const ULTS = {
  nova() {
    const d = ultDmg(80), P = G.p;
    for (const e of G.en) if (!e.dead && onScreen(e, 40)) damage(e, e.boss ? d * 1.5 : d, null, { kb: 20, dx: e.x - P.x, dy: e.y - P.y });
    G.fx.push({ kind: 'ringfx', x: P.x, y: P.y, r0: 20, r1: G.viewR, life: .6, max: .6, col: '#6ef2ff', lw: 16 });
    flashScreen('#6ef2ff', .45);
  },
  timestop() { G.freezeT = Math.max(G.freezeT, 5); flashScreen('#9fe6ff', .5); sfx('freeze'); },
  fortress() {
    G.ultInv = 6; const P = G.p;
    for (let i = 0; i < 12; i++) later(i * .5, () => { G.ar.push({ kind: 'ring', x: P.x, y: P.y, r: 0, R: 170 * G.st.area, t: 0, T: .3, dmg: ultDmg(22), w: null, hit: new Set(), kb: 18, stun: .4, col: '#ffb35e' }); sfx('nova'); });
  },
  thunder() {
    for (let i = 0; i < 40; i++) later(i * .1, () => {
      const t = randomEnemies(G.p.x, G.p.y, 1, G.viewR)[0];
      if (!t) return;
      damage(t, ultDmg(38) * (t.boss ? 1.5 : 1), null, { stun: .3 });
      explosion(t.x, t.y, 50, ultDmg(12), null, { silent: true, col: '#c9a2ff', kb: 3 });
      G.fx.push({ kind: 'strike', x: t.x, y: t.y, life: .25, max: .25, col: '#e5d4ff' });
      sfx('zap');
    });
  },
  barrage() {
    let a = 0;
    for (let i = 0; i < 60; i++) later(i * .05, () => {
      for (let k = 0; k < 4; k++) shoot(null, G.p.x, G.p.y, a + k * TAU / 4, 560, { dmg: ultDmg(12), pierce: 2, life: .9, r: 6, kb: 4, col: '#ff7a9c' });
      a += .21; sfx('pew');
    });
  },
  legion() { G.legionT = 8; },
  jackpot() {
    const r = RNG(), P = G.p;
    if (r < 1 / 3) {
      bigToast('ジャックポット！', '星片の雨！', false);
      for (let i = 0; i < 40; i++) { const a = RNG() * TAU, d = rr(30, 220); spawnPickup('coin', P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, Math.max(1, Math.round(2 * G.st.greed))); }
    } else if (r < 2 / 3) {
      bigToast('ジャックポット！', '全回復＋無敵！', false);
      P.hp = G.st.maxHp; G.ultInv = 5; for (const o of G.pk) if (o.type === 'gem' || o.type === 'coin') o.mag = true;
    } else {
      bigToast('ジャックポット！', 'メガボム！', false);
      const d = ultDmg(150);
      for (const e of G.en) if (!e.dead && onScreen(e, 40)) damage(e, d, null, { kb: 20 });
      flashScreen('#ffe066', .6); shake(14);
    }
  },
  judgement() {
    const d = ultDmg(200), P = G.p;
    for (const e of G.en) if (!e.dead && onScreen(e, 60)) { damage(e, d, null, null); G.fx.push({ kind: 'strike', x: e.x, y: e.y, life: .35, max: .35, col: '#fff6d8' }); }
    P.hp = Math.min(G.st.maxHp, P.hp + G.st.maxHp * .5);
    flashScreen('#fff6d8', .7); shake(12);
  },
};
function useUlt() {
  if (G.state !== 'play' || G.p.ult < 100) return;
  G.p.ult = 0; R.ults++; SAVE.stats.ults++;
  sfx('ult'); shake(10);
  bigToast(G.char.ultName, '', false);
  ULTS[G.char.ult]();
}
function updateLegion(dt) {
  if (G.legionT <= 0) { if (G.legion.length) G.legion.length = 0; return; }
  const P = G.p;
  while (G.legion.length < 6) G.legion.push({ x: P.x, y: P.y, cd: vr() * .2 });
  G.legionPh = (G.legionPh || 0) + dt * 2.2;
  const dmg = ultDmg(14);
  for (let i = 0; i < G.legion.length; i++) {
    const d = G.legion[i], a = G.legionPh + i * TAU / 6;
    const tx = P.x + Math.cos(a) * 84, ty = P.y + Math.sin(a) * 70;
    d.x += (tx - d.x) * Math.min(1, dt * 8); d.y += (ty - d.y) * Math.min(1, dt * 8);
    d.cd -= dt;
    if (d.cd <= 0) {
      const t = nearestEnemy(d.x, d.y, 420);
      if (t) { shoot(null, d.x, d.y, Math.atan2(t.y - d.y, t.x - d.x), 620, { dmg, pierce: 2, life: .9, r: 5, kb: 3, col: '#9dffcf' }); d.cd = .2; sfx('pew'); }
      else d.cd = .15;
    }
  }
}

// ================= LEVEL UP =================
function gainXp(v) {
  const P = G.p; P.xp += v * G.st.growth;
  let g = 0;
  while (P.xp >= P.xpNeed && g++ < 200) { P.xp -= P.xpNeed; P.level++; P.xpNeed = xpNeed(P.level); G.pendingLv++; }
}
function genChoices() {
  const P = G.p, pool = [];
  for (const id of WIDS) {
    if (G.banished.has(id)) continue;
    const w = hasWeapon(id);
    if (w) { if (w.lv < WMAX) pool.push({ k: 'w', id, lv: w.lv + 1, wt: 1.3 }); }
    else if (P.weapons.length < 6) pool.push({ k: 'w', id, lv: 1, wt: .9 });
  }
  for (const id of PIDS) {
    if (G.banished.has(id)) continue;
    const p = hasPassive(id);
    if (p) { if (p.lv < PASSIVES[id].max) pool.push({ k: 'p', id, lv: p.lv + 1, wt: 1.1 }); }
    else if (P.passives.length < 6) pool.push({ k: 'p', id, lv: 1, wt: .8 });
  }
  for (const c of pool) if (c.k === 'p' && c.lv === 1 && P.weapons.some(w => !w.evo && WEAPONS[w.id].evo.need === c.id)) c.wt *= 1.5;
  const n = Math.min(pool.length, 3 + (RNG() < Math.min(.8, (G.st.luck - 1) * .6 + .08) ? 1 : 0));
  const out = [];
  for (let i = 0; i < n; i++) {
    let tot = 0; for (const c of pool) tot += c.wt;
    let r = RNG() * tot, idx = 0;
    for (; idx < pool.length; idx++) { r -= pool[idx].wt; if (r <= 0) break; }
    idx = Math.min(idx, pool.length - 1);
    out.push(pool[idx]); pool.splice(idx, 1);
  }
  if (!out.length) out.push({ k: 'coin' }, { k: 'heal' });
  return out;
}
function blurActive() { try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) { /* ignore */ } }
function openLevelUp() {
  G.state = 'levelup'; IN.joy.on = false;
  G.choices = genChoices(); G.lvSel = 0; G.banishMode = false;
  renderLevelUp(); showOv('ovLevel');
  AU.duck = .5; auVol(); sfx('lvl'); blurActive();
}
function chooseUpgrade(i) {
  if (G.state !== 'levelup') return;
  const c = G.choices[i]; if (!c) return;
  if (G.banishMode) {
    if ((c.k === 'w' || c.k === 'p') && G.banishes > 0) { G.banished.add(c.id); G.banishes--; G.banishMode = false; sfx('deny'); G.choices = genChoices(); G.lvSel = 0; renderLevelUp(); }
    return;
  }
  applyChoice(c); sfx('click');
  G.pendingLv--;
  afterChoice();
}
function applyChoice(c) {
  if (c.k === 'w') { const w = hasWeapon(c.id); if (w) { w.lv = Math.min(WMAX, w.lv + 1); w.s = weaponStats(w); } else addWeapon(c.id); checkAllMax(); }
  else if (c.k === 'p') { const p = hasPassive(c.id); if (p) { p.lv = Math.min(PASSIVES[c.id].max, p.lv + 1); recalcStats(); } else addPassive(c.id); }
  else if (c.k === 'coin') R.coins += Math.round(25 * G.st.greed);
  else if (c.k === 'heal') G.p.hp = Math.min(G.st.maxHp, G.p.hp + G.st.maxHp * .3);
  updateSlots();
}
function afterChoice() {
  if (G.pendingLv > 0) { G.choices = genChoices(); G.lvSel = 0; G.banishMode = false; renderLevelUp(); sfx('lvl'); }
  else { hideOv('ovLevel'); G.state = 'play'; AU.duck = 1; auVol(); IN.dashReq = IN.ultReq = false; blurActive(); }
}
function doReroll() { if (G.state !== 'levelup' || G.rerolls <= 0) return; G.rerolls--; G.banishMode = false; G.choices = genChoices(); G.lvSel = 0; renderLevelUp(); sfx('click'); }
function doSkip() { if (G.state !== 'levelup' || G.skips <= 0) return; G.skips--; G.pendingLv--; G.banishMode = false; sfx('back'); afterChoice(); }
function toggleBanish() { if (G.state !== 'levelup' || G.banishes <= 0) return; G.banishMode = !G.banishMode; renderLevelUp(); sfx('click'); }
function moveLvSel(d) { const n = G.choices.length; if (!n) return; G.lvSel = (G.lvSel + d + n) % n; renderLevelUp(); sfx('click'); }

// ================= CHEST =================
function openChest(rich) {
  const P = G.p, res = [];
  const n = rich ? 3 : (RNG() < .12 * G.st.luck ? 3 : 1);
  let evo = false;
  for (let i = 0; i < n; i++) {
    const ev = P.weapons.find(w => !w.evo && w.lv >= WMAX && hasPassive(WEAPONS[w.id].evo.need));
    if (ev) {
      ev.evo = true; ev.s = weaponStats(ev); ev.hm.clear();
      SAVE.codex.e[ev.id] = 1; R.evos++; SAVE.stats.evos++; evo = true;
      const E = WEAPONS[ev.id].evo;
      res.push({ icon: E.icon, name: E.name, sub: '進化！ ' + E.desc, evo: true });
      continue;
    }
    const ups = [];
    for (const w of P.weapons) if (w.lv < WMAX) ups.push({ t: 'w', o: w });
    for (const p of P.passives) if (p.lv < PASSIVES[p.id].max) ups.push({ t: 'p', o: p });
    if (ups.length) {
      const u = pick(ups); u.o.lv++;
      if (u.t === 'w') { u.o.s = weaponStats(u.o); res.push({ icon: WEAPONS[u.o.id].icon, name: WEAPONS[u.o.id].name, sub: 'Lv ' + u.o.lv + ' に強化' }); }
      else { recalcStats(); res.push({ icon: PASSIVES[u.o.id].icon, name: PASSIVES[u.o.id].name, sub: 'Lv ' + u.o.lv + ' に強化' }); }
    } else { const g = Math.round(ri(15, 30) * G.st.greed); R.coins += g; res.push({ icon: '✦', name: '星片', sub: '+' + g }); }
  }
  const g = Math.round(ri(8, 20) * (rich ? 3 : 1) * G.st.greed); R.coins += g;
  res.push({ icon: '✦', name: '星片', sub: '+' + g });
  R.chests++; SAVE.stats.chests++;
  recalcStats(); checkAllMax(); updateSlots();
  G.state = 'chest'; IN.joy.on = false;
  showChest(res, evo); sfx(evo ? 'evo' : 'chest'); blurActive();
}
function closeChest() {
  if (G.state !== 'chest') return;
  hideOv('ovChest'); G.state = 'play'; IN.dashReq = IN.ultReq = false; blurActive();
}

// ================= CLEAR / END =================
function openClear() {
  G.state = 'clear'; IN.joy.on = false;
  buildClear(); showOv('ovClear'); sfx('clear'); blurActive();
}
function continueEndless() {
  if (G.state !== 'clear') return;
  G.endless = true; G.endT = { elite: G.t + 30, horde: G.t + 45, boss: G.t + 150 };
  hideOv('ovClear'); G.state = 'play'; bgm(G.stage.bgm);
  bigToast('エンドレス', '限界まで生き延びろ！', false);
}
function endRun(win) {
  if (G.state === 'result' || !G.p) return;
  const P = G.p, S = SAVE.stats, time = G.t;
  hideOverlays();
  G.state = 'result'; IN.joy.on = false;
  S.kills += R.kills; S.time += time; S.maxLv = Math.max(S.maxLv, P.level); S.maxRunKills = Math.max(S.maxRunKills, R.kills);
  S.longest = Math.max(S.longest, time); S.gold += R.coins;
  for (const w of P.weapons) S.wdmg[w.id] = (S.wdmg[w.id] || 0) + w.dmg;
  if (R.coins >= 500) S.flags.rich = true;
  const base = R.coins;
  const bonus = Math.floor((R.kills * .05 + time / 60 * 8 + R.bosses * 30 + P.level * 2 + (R.cleared ? 120 * (G.stageIdx + 1) : 0)) * (1 + .15 * G.abyss));
  let dailyB = 0;
  if (G.daily) {
    const td = todayStr();
    if (SAVE.daily.date !== td) { SAVE.daily.date = td; SAVE.daily.claimed = false; SAVE.daily.best = 0; }
    if (!SAVE.daily.claimed) { dailyB = base + bonus; SAVE.daily.claimed = true; }
    SAVE.daily.best = Math.max(SAVE.daily.best, time);
  }
  const total = base + bonus + dailyB;
  SAVE.shards += total;
  if (!G.daily) {
    const b = SAVE.best[G.stage.id] || { time: 0, kills: 0, lv: 0 };
    b.time = Math.max(b.time, time); b.kills = Math.max(b.kills, R.kills); b.lv = Math.max(b.lv, P.level);
    SAVE.best[G.stage.id] = b;
  }
  const newA = checkAch();
  writeSave();
  showResult({ win: !!(win || R.cleared), time, base, bonus, dailyB, total, newA });
  bgm('result'); AU.duck = 1; auVol();
  sfx(win || R.cleared ? 'clear' : 'over');
}
function checkAch() {
  const out = []; let changed = true, guard = 0;
  while (changed && guard++ < 6) {
    changed = false;
    for (const a of ACHS) {
      if (SAVE.ach[a.id]) continue;
      let ok = false; try { ok = a.ck(); } catch (e) { ok = false; }
      if (ok) {
        SAVE.ach[a.id] = Date.now(); SAVE.shards += a.rw; out.push(a); changed = true;
        const ch = CHARS.find(c => c.lock === a.id);
        if (ch && !SAVE.chars.includes(ch.id)) SAVE.chars.push(ch.id);
      }
    }
  }
  return out;
}
function retryRun() { if (G.runOpt && G.state === 'result') startRun(G.runOpt); }

// ================= MAIN UPDATE =================
function updateFx(dt) {
  let j = 0;
  for (let i = 0; i < G.pt.length; i++) {
    const p = G.pt[i]; p.life -= dt;
    if (p.life <= 0) continue;
    p.x += p.vx * dt; p.y += p.vy * dt; const f = Math.exp(-3.5 * dt); p.vx *= f; p.vy *= f;
    G.pt[j++] = p;
  }
  G.pt.length = j;
  j = 0;
  for (let i = 0; i < G.tx.length; i++) { const t = G.tx[i]; t.life -= dt; if (t.life <= 0) continue; t.y -= 38 * dt; t.x += t.vx * dt; G.tx[j++] = t; }
  G.tx.length = j;
  j = 0;
  for (let i = 0; i < G.fx.length; i++) { const f = G.fx[i]; f.life -= dt; if (f.life <= 0) continue; if (f.follow) { f.x = G.p.x; f.y = G.p.y; } G.fx[j++] = f; }
  G.fx.length = j;
  G.shake = Math.max(0, G.shake - dt * 40);
  G.flashA = Math.max(0, G.flashA - dt * 1.6);
}
function update(dt) {
  G.t += dt;
  readInput();
  if (IN.dashReq) { IN.dashReq = false; tryDash(); }
  if (IN.ultReq) { IN.ultReq = false; useUlt(); }
  updateTimers(dt);
  if (G.state !== 'play') return;
  updatePlayer(dt);
  gridBuild(); separate();
  updateSpawner(dt);
  updateWeapons(dt);
  updateLegion(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateAreas(dt);
  updateEB(dt);
  updateHazards(dt);
  updatePickups(dt);
  updateFx(dt);
  const k = 1 - Math.exp(-dt * 9);
  G.cam.x += (G.p.x - G.cam.x) * k; G.cam.y += (G.p.y - G.cam.y) * k;
  if (G.freezeT > 0) G.freezeT -= dt;
  if (G.ultInv > 0) G.ultInv -= dt;
  if (G.legionT > 0) G.legionT -= dt;
  if (R.comboT > 0) R.comboT -= dt;
  if (G.state !== 'play') return;
  if (G.pendingClear > 0) { G.pendingClear -= dt; if (G.pendingClear <= 0) { openClear(); return; } }
  if (G.pendingLv > 0) openLevelUp();
}

// ================= RENDER =================
function camSetup(withShake) {
  let sx = 0, sy = 0;
  if (withShake && G.shake > 0 && SAVE.set.shake) { sx = (vr() - .5) * G.shake; sy = (vr() - .5) * G.shake; }
  G.rcx = G.cam.x + sx; G.rcy = G.cam.y + sy;
  G.rz = G.zoom * DPR;
  G.rox = W / 2 * DPR - G.rcx * G.rz; G.roy = H / 2 * DPR - G.rcy * G.rz;
}
function worldT() { ctx.setTransform(G.rz, 0, 0, G.rz, G.rox, G.roy); }
function screenT() { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
function drawSpr(img, size, x, y, sx, sy, rot) {
  const z = G.rz;
  if (rot) { const c = Math.cos(rot) * z, s = Math.sin(rot) * z; ctx.setTransform(c * sx, s * sx, -s * sy, c * sy, G.rox + x * z, G.roy + y * z); }
  else ctx.setTransform(sx * z, 0, 0, sy * z, G.rox + x * z, G.roy + y * z);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
}
function vis(x, y, m) { return Math.abs(x - G.rcx) < G.viewW / 2 + m && Math.abs(y - G.rcy) < G.viewH / 2 + m; }
let SHADOW = null, FIRE = null, AURA = null;
function initFxSprites() {
  SHADOW = (() => { const c = mkCanvas(64, 32), g = c.getContext('2d'); const gr = g.createRadialGradient(32, 16, 0, 32, 16, 32); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.save(); g.scale(1, .5); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); g.restore(); return c; })();
  FIRE = (() => { const c = mkCanvas(128, 128), g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,180,.9)'); gr.addColorStop(.35, 'rgba(255,140,40,.65)'); gr.addColorStop(.7, 'rgba(255,60,20,.25)'); gr.addColorStop(1, 'rgba(255,40,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return c; })();
  AURA = (() => { const c = mkCanvas(128, 128), g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 20, 64, 64, 64); gr.addColorStop(0, 'rgba(255,214,107,0)'); gr.addColorStop(.6, 'rgba(255,214,107,.35)'); gr.addColorStop(1, 'rgba(255,214,107,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return c; })();
}
const GEMCOL = v => v >= 80 ? '#ff5d7a' : v >= 20 ? '#ffd66b' : v >= 5 ? '#7dff8a' : '#6ef2ff';

function drawAreas() {
  for (const a of G.ar) {
    if (!vis(a.x, a.y, 200)) continue;
    if (a.kind === 'fire') {
      const al = Math.min(1, a.life * 3, (a.max - a.life) * 8 + .2);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = al * .9;
      const f = 1 + Math.sin(G.rt * 14 + a.seed) * .06, sc = a.r * 2.5 / 128 * f;
      drawSpr(FIRE, 128, a.x, a.y, sc, sc * .85, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    } else if (a.kind === 'grav') {
      worldT();
      const k = a.t / a.T, r = a.r * (1.1 - k * .3);
      const gr = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, r * 1.5);
      gr.addColorStop(0, 'rgba(5,0,15,.95)'); gr.addColorStop(.35, 'rgba(40,10,80,.6)'); gr.addColorStop(1, 'rgba(120,60,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(a.x, a.y, r * 1.5, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = a.evo ? '#e0a8ff' : '#b48cff'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) { const s0 = G.rt * 6 + i * TAU / 3; ctx.globalAlpha = .7; ctx.beginPath(); ctx.arc(a.x, a.y, r * (.45 + i * .2), s0, s0 + 1.8); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    } else if (a.kind === 'ring') {
      worldT();
      const k = a.t / a.T;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k * .6;
      ctx.strokeStyle = a.col; ctx.lineWidth = 10 * (1 - k) + 3;
      ctx.beginPath(); ctx.arc(a.x, a.y, Math.max(1, a.r), 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a.x, a.y, Math.max(1, a.r), 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }
}
function drawHazards() {
  if (!G.hz.length) return;
  worldT();
  for (const z of G.hz) {
    const k = clamp(z.t / z.delay, 0, 1), blink = .6 + Math.sin(G.rt * 25) * .4;
    if (z.kind === 'line') {
      const ang = Math.atan2(z.y2 - z.y, z.x2 - z.x), L = Math.hypot(z.x2 - z.x, z.y2 - z.y);
      ctx.save(); ctx.translate(z.x, z.y); ctx.rotate(ang);
      ctx.fillStyle = rgba(z.col, .12 + .12 * k); ctx.fillRect(0, -z.w / 2, L, z.w);
      ctx.strokeStyle = rgba(z.col, .5 * blink); ctx.lineWidth = 2; ctx.strokeRect(0, -z.w / 2, L, z.w);
      ctx.fillStyle = rgba('#ffffff', .15 * k); ctx.fillRect(0, -z.w / 2, L * k, z.w);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255,40,80,' + (.1 + .1 * k) + ')'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,90,120,' + (.55 * blink + .3) + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(255,120,140,.28)'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * k, 0, TAU); ctx.fill();
      if (z.meteor) {
        const my = z.y - (1 - k) * 320, mx = z.x + (1 - k) * 120;
        const sp = glowSprite('#ff8a3d', 12);
        ctx.globalCompositeOperation = 'lighter'; drawSpr(sp.c, sp.size, mx, my, 1.2, 1.2, 0); worldT();
        ctx.strokeStyle = 'rgba(255,160,80,.5)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + 60, my - 160); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }
}
function drawPickups() {
  for (const k of G.pk) {
    if (!vis(k.x, k.y, 30)) continue;
    let sp, sc = .5, bob = 0;
    if (k.type === 'gem') { const v = k.v; sp = iconSprite('gem', k.big ? '#ff5d7a' : GEMCOL(v)); sc = k.big ? .9 : v >= 20 ? .62 : v >= 5 ? .55 : .45; }
    else if (k.type === 'coin') { sp = iconSprite('coin'); sc = k.v >= 5 ? .7 : .5; bob = Math.sin(G.rt * 5 + k.x) * 2; }
    else if (k.type === 'chest') {
      sp = iconSprite('chest'); sc = 1.15; bob = Math.sin(G.rt * 3) * 3;
      ctx.globalCompositeOperation = 'lighter'; const a = .8 + Math.sin(G.rt * 4) * .2; ctx.globalAlpha = a;
      drawSpr(AURA, 128, k.x, k.y, .75, .75, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    } else { sp = iconSprite(k.type); sc = .75; bob = Math.sin(G.rt * 4 + k.x) * 2.5; }
    drawSpr(sp.c, sp.size, k.x, k.y + bob, sc, sc, 0);
  }
}
function drawEnemies() {
  const fz = G.freezeT > 0;
  for (const e of G.en) {
    if (e.dead || !vis(e.x, e.y, e.r * 2 + 20)) continue;
    const s = enemySprite(e.def.shape, e.def.col, e.def.r);
    const sc = e.r / e.def.r;
    const tt = (fz || e.frzT > 0) ? e.seed : G.rt * 7 + e.seed;
    let sx = sc * (1 + Math.sin(tt) * .05), sy = sc * (1 - Math.sin(tt) * .05);
    if (e.spawnT > 0) { const k = clamp(1 - e.spawnT / .3, .1, 1); sx *= k; sy *= k; }
    ctx.globalAlpha = e.alpha;
    drawSpr(SHADOW, 64, e.x, e.y + e.r * .85, e.r * 2.2 / 64 * (e.jump ? .7 : 1), e.r * 2.2 / 64, 0);
    if (e.elite || e.boss) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = e.alpha * (.7 + Math.sin(G.rt * 5) * .3);
      drawSpr(AURA, 128, e.x, e.y - e.jump, e.r * 3.4 / 128, e.r * 3.4 / 128, 0);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = e.alpha;
    }
    const warnFlash = e.warn && Math.sin(G.rt * 32) > 0;
    const img = (e.flash > 0 || warnFlash) ? s.w : s.c;
    drawSpr(img, s.size, e.x, e.y - e.jump, sx * e.face, sy, 0);
    if (e.frzT > 0 || fz) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .35;
      const g2 = glowSprite('#9fe6ff', Math.max(4, Math.round(e.r * .5)));
      drawSpr(g2.c, g2.size, e.x, e.y, 1, 1, 0);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
    if (e.elite && e.hp < e.maxHp) {
      worldT();
      const w = e.r * 2, y = e.y - e.r - 10;
      ctx.fillStyle = 'rgba(10,6,30,.8)'; ctx.fillRect(e.x - w / 2 - 1, y - 1, w + 2, 5);
      ctx.fillStyle = '#ffd66b'; ctx.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 3);
    }
  }
}
function drawPlayer() {
  const P = G.p, s = playerSprite(G.char);
  if (G.state === 'dying' || G.state === 'result') return;
  drawSpr(SHADOW, 64, P.x, P.y + 14, .55, .55, 0);
  if (G.ultInv > 0) {
    worldT(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,214,107,' + (.5 + Math.sin(G.rt * 10) * .3) + ')'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(P.x, P.y, 26, 0, TAU); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
  if (P.ult >= 100) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .45 + Math.sin(G.rt * 6) * .25;
    const g2 = glowSprite(G.char.col, 10); drawSpr(g2.c, g2.size, P.x, P.y, 1.2, 1.2, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  const blink = P.iT > 0 && Math.sin(G.rt * 40) > 0;
  ctx.globalAlpha = blink ? .35 : 1;
  const bob = P.moving ? Math.abs(Math.sin(P.walk)) * 2.5 : Math.sin(G.rt * 3) * 1;
  const st = P.dashT > 0 ? 1.15 : 1;
  const img = P.hurtT > 0 ? s.w : s.c;
  drawSpr(img, s.size, P.x, P.y - bob - 6, .62 * P.flip * st, .62 / st, 0);
  ctx.globalAlpha = 1;
  worldT();
  const w = 34, y = P.y + 20, r = clamp(P.hp / G.st.maxHp, 0, 1);
  ctx.fillStyle = 'rgba(10,6,30,.85)'; ctx.fillRect(P.x - w / 2 - 1, y - 1, w + 2, 6);
  ctx.fillStyle = r < .3 ? '#ff5d7a' : '#7dff9a'; ctx.fillRect(P.x - w / 2, y, w * r, 4);
}
function drawLegion() {
  if (!G.legion.length) return;
  const sp = droneSprite('#9dffcf');
  for (const d of G.legion) drawSpr(sp.c, sp.size, d.x, d.y, 1.25, 1.25, 0);
}
function drawProjectiles() {
  ctx.globalCompositeOperation = 'lighter';
  for (const p of G.pr) {
    if (!vis(p.x, p.y, 40)) continue;
    if (p.spr === 'glow') {
      const sp = glowSprite(p.col, Math.max(2, Math.round(p.r)));
      const ang = Math.atan2(p.vy, p.vx);
      const al = p.max ? Math.min(1, p.life / p.max * 4) : 1;
      ctx.globalAlpha = al;
      drawSpr(sp.c, sp.size, p.x, p.y, 1.5, 1, ang);
    } else if (p.spr === 'shard') { const sp = shardSprite(p.col); drawSpr(sp.c, sp.size, p.x, p.y, p.r / 6, p.r / 6, Math.atan2(p.vy, p.vx)); }
    else if (p.spr === 'boom') { const sp = boomSprite(p.col); drawSpr(sp.c, sp.size, p.x, p.y, p.r / 10, p.r / 10, p.rot); }
    else if (p.spr === 'crescent') { const sp = crescentSprite(p.col); ctx.globalAlpha = Math.min(1, p.life * 3); drawSpr(sp.c, sp.size, p.x, p.y, p.r / 20, p.r / 20, Math.atan2(p.vy, p.vx)); }
    else if (p.spr === 'bomb') {
      ctx.globalCompositeOperation = 'source-over'; drawSpr(SHADOW, 64, p.x, p.y + 6, .35, .35, 0); ctx.globalCompositeOperation = 'lighter';
      const sp = glowSprite('#b48cff', 7); drawSpr(sp.c, sp.size, p.x, p.y - (p.z || 0), 1, 1, 0);
    }
    ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = 'source-over';
}
function drawEB() {
  for (const b of G.eb) {
    if (!vis(b.x, b.y, 20)) continue;
    const sp = ebSprite(b.col);
    drawSpr(sp.c, sp.size, b.x, b.y, b.r / 7, b.r / 7, 0);
  }
}
function drawFx() {
  if (!G.fx.length) return;
  worldT(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const f of G.fx) {
    const k = 1 - f.life / f.max;
    if (f.kind === 'bolt') {
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = f.col; ctx.lineWidth = (f.w || 2.5) * 2.4;
      ctx.beginPath(); f.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = f.w || 2.5;
      ctx.beginPath(); f.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    } else if (f.kind === 'slash') {
      ctx.globalAlpha = 1 - k;
      const r = f.R * (.65 + k * .3);
      ctx.strokeStyle = f.col; ctx.lineWidth = f.R * .32 * (1 - k * .6);
      ctx.beginPath(); ctx.arc(f.x, f.y, r, f.a - f.arc / 2, f.a + f.arc / 2); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(f.x, f.y, r + f.R * .1, f.a - f.arc / 2 * .9, f.a + f.arc / 2 * .9); ctx.stroke();
    } else if (f.kind === 'ringfx') {
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = f.col; ctx.lineWidth = (f.lw || 4) * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(f.x, f.y, lerp(f.r0, f.r1, 1 - (1 - k) * (1 - k)), 0, TAU); ctx.stroke();
    } else if (f.kind === 'flash') {
      ctx.globalAlpha = 1 - k;
      const sp = glowSprite(f.col, 20); const sc = f.r * 2.4 / sp.size * (.7 + k * .5);
      drawSpr(sp.c, sp.size, f.x, f.y, sc, sc, 0); worldT();
    } else if (f.kind === 'strike') {
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = f.col; ctx.lineWidth = 14 * (1 - k) + 2;
      ctx.beginPath(); ctx.moveTo(f.x + 20, f.y - 420); ctx.lineTo(f.x - 8, f.y - 200); ctx.lineTo(f.x + 6, f.y - 90); ctx.lineTo(f.x, f.y); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4 * (1 - k) + 1;
      ctx.beginPath(); ctx.moveTo(f.x + 20, f.y - 420); ctx.lineTo(f.x - 8, f.y - 200); ctx.lineTo(f.x + 6, f.y - 90); ctx.lineTo(f.x, f.y); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawParticles() {
  if (!G.pt.length) return;
  worldT(); ctx.globalCompositeOperation = 'lighter';
  const ps = playerSprite(G.char);
  for (const p of G.pt) {
    if (!vis(p.x, p.y, 20)) continue;
    const k = p.life / p.max;
    if (p.k === 2) {
      ctx.globalAlpha = k * .45; drawSpr(ps.c, ps.size, p.x, p.y - 6, .62 * (p.flip || 1), .62, 0); worldT(); continue;
    }
    ctx.globalAlpha = Math.min(1, k * 1.5);
    ctx.fillStyle = p.col;
    if (p.k === 1) {
      ctx.strokeStyle = p.col; ctx.lineWidth = p.size * .6;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .05, p.y - p.vy * .05); ctx.stroke();
    } else { const s = p.size * (.3 + k * .7); ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawTexts() {
  if (!G.tx.length) return;
  worldT(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (const t of G.tx) {
    if (!vis(t.x, t.y, 40)) continue;
    const k = 1 - t.life / t.max, pop = k < .15 ? .6 + k / .15 * .6 : 1.2 - Math.min(.2, (k - .15));
    ctx.globalAlpha = Math.min(1, t.life / t.max * 3);
    let size = 11, col = '#ffffff', txt = typeof t.v === 'number' ? String(Math.round(t.v)) : t.v;
    if (t.kind === 'crit') { size = 15; col = '#ffe066'; txt += '!'; }
    else if (t.kind === 'hurt') { size = 14; col = '#ff5d7a'; txt = '-' + txt; }
    else if (t.kind === 'heal') { size = 13; col = '#7dff9a'; }
    else if (t.kind === 'coin') { size = 12; col = '#ffd66b'; }
    ctx.font = '900 ' + Math.round(size * pop) + 'px "Zen Kaku Gothic New", system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(13,8,36,.9)'; ctx.lineWidth = 3;
    ctx.strokeText(txt, t.x, t.y); ctx.fillStyle = col; ctx.fillText(txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
const MOTES = [];
function drawMotes(col, dt) {
  if (SAVE.set.quality === 'low') return;
  if (!MOTES.length) for (let i = 0; i < 34; i++) MOTES.push({ x: Math.random(), y: Math.random(), z: .3 + Math.random() * .7, s: 1 + Math.random() * 2, ph: Math.random() * TAU });
  screenT(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = col;
  for (const m of MOTES) {
    m.y -= dt * .012 * m.z; m.ph += dt;
    if (m.y < -.05) { m.y = 1.05; m.x = Math.random(); }
    let x = (m.x * W - G.rcx * G.zoom * m.z * .35) % W; if (x < 0) x += W;
    let y = (m.y * H - G.rcy * G.zoom * m.z * .35) % H; if (y < 0) y += H;
    ctx.globalAlpha = (.25 + Math.sin(m.ph * 2) * .15) * m.z;
    ctx.fillRect(x, y, m.s, m.s);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawIndicators() {
  const targets = [];
  for (const b of G.bosses) if (!b.dead) targets.push([b.x, b.y, b.def.col, 'boss']);
  for (const k of G.pk) if (k.type === 'chest') targets.push([k.x, k.y, '#ffd66b', 'chest']);
  if (!targets.length) return;
  screenT();
  const m = 34;
  for (const [x, y, col, kind] of targets) {
    const sx = (x - G.rcx) * G.zoom + W / 2, sy = (y - G.rcy) * G.zoom + H / 2;
    if (sx > 0 && sx < W && sy > 0 && sy < H) continue;
    const a = Math.atan2(sy - H / 2, sx - W / 2);
    const cx = clamp(sx, m, W - m), cy = clamp(sy, m + 50, H - m - 20);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-6, -9); ctx.lineTo(-2, 0); ctx.lineTo(-6, 9); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.font = '700 12px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = col; ctx.fillText(kind === 'boss' ? '☠' : '◆', cx - Math.cos(a) * 20, cy - Math.sin(a) * 20);
  }
}
function drawJoystick() {
  const j = IN.joy;
  const showFixed = SAVE.set.joy === 'fixed' && IS_TOUCH && G.state === 'play';
  if (!j.on && !showFixed) return;
  screenT();
  const bx = j.on ? j.bx : fixedJoyX(), by = j.on ? j.by : fixedJoyY();
  ctx.globalAlpha = j.on ? .9 : .35;
  ctx.fillStyle = 'rgba(233,228,255,.08)'; ctx.strokeStyle = 'rgba(233,228,255,.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(bx, by, JOY_R, 0, TAU); ctx.fill(); ctx.stroke();
  let kx = bx, ky = by;
  if (j.on) { const dx = j.x - bx, dy = j.y - by, d = Math.hypot(dx, dy); const m = Math.min(d, JOY_R); if (d > 0) { kx = bx + dx / d * m; ky = by + dy / d * m; } }
  const gr = ctx.createRadialGradient(kx, ky, 0, kx, ky, 26);
  gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, rgba(G.char.col, .5));
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(kx, ky, 24, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
}
function screenOverlays(dt) {
  drawMotes(G.stage.col, dt);
  screenT();
  if (G.freezeT > 0) { ctx.fillStyle = 'rgba(140,210,255,.1)'; ctx.fillRect(0, 0, W, H); }
  if (G.vign) ctx.drawImage(G.vign, 0, 0, W, H);
  const P = G.p;
  if (P && G.st && P.hp / G.st.maxHp < .3 && G.state === 'play') {
    const a = .25 + Math.sin(G.rt * 6) * .12;
    const gr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.hypot(W, H) * .6);
    gr.addColorStop(0, 'rgba(255,30,60,0)'); gr.addColorStop(1, 'rgba(255,30,60,' + a + ')');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  }
  if (G.flashA > 0) { ctx.globalAlpha = Math.min(.7, G.flashA); ctx.fillStyle = G.flashC; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  drawIndicators();
  drawJoystick();
}
function renderGame(dt) {
  camSetup(true);
  worldT();
  const vw = G.viewW / 2, vh = G.viewH / 2;
  ctx.fillStyle = G.bgPat || G.stage.bg;
  ctx.fillRect(G.rcx - vw - 40, G.rcy - vh - 40, G.viewW + 80, G.viewH + 80);
  drawAreas();
  drawHazards();
  drawPickups();
  drawEnemies();
  drawPlayer();
  if (G.state !== 'dying' && G.state !== 'result') for (const w of G.p.weapons) { const L = WL[w.id]; if (L.draw) L.draw(w, w.s); }
  drawLegion();
  drawProjectiles();
  drawEB();
  drawFx();
  drawParticles();
  drawTexts();
  screenOverlays(dt);
}
// ---------- タイトル背景（流れ星） ----------
const TSTARS = [], FALLS = [];
function renderTitle(dt) {
  const st = G.titleStage || STAGES[0];
  G.cam.x += dt * 14; G.cam.y += dt * 6;
  G.shake = 0;
  camSetup(false);
  worldT();
  ctx.fillStyle = getBgPattern(st);
  ctx.fillRect(G.rcx - G.viewW / 2 - 40, G.rcy - G.viewH / 2 - 40, G.viewW + 80, G.viewH + 80);
  screenT();
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, 'rgba(13,11,36,.92)'); sky.addColorStop(.6, 'rgba(13,11,36,.55)'); sky.addColorStop(1, 'rgba(13,11,36,.25)');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  if (!TSTARS.length) for (let i = 0; i < 90; i++) TSTARS.push({ x: Math.random(), y: Math.random() * .75, s: Math.random() * 1.6 + .4, ph: Math.random() * TAU });
  for (const s of TSTARS) { s.ph += dt * 1.5; ctx.globalAlpha = .35 + Math.sin(s.ph) * .3; ctx.fillStyle = '#fff'; ctx.fillRect(s.x * W, s.y * H, s.s, s.s); }
  ctx.globalAlpha = 1;
  if (Math.random() < dt * 1.3 && FALLS.length < 6) FALLS.push({ x: Math.random() * W * 1.2, y: -20, vx: -(220 + Math.random() * 200), vy: 260 + Math.random() * 200, life: 1.6, max: 1.6, col: ['#ffd66b', '#6ef2ff', '#ff9dd6', '#ffffff'][Math.floor(Math.random() * 4)] });
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = FALLS.length - 1; i >= 0; i--) {
    const f = FALLS[i]; f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.life <= 0 || f.y > H + 40) { FALLS.splice(i, 1); continue; }
    const a = Math.min(1, f.life / f.max * 2);
    const tx = f.x - f.vx * .22, ty = f.y - f.vy * .22;
    const gr = ctx.createLinearGradient(f.x, f.y, tx, ty);
    gr.addColorStop(0, rgba(f.col, a)); gr.addColorStop(1, rgba(f.col, 0));
    ctx.strokeStyle = gr; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.fillStyle = rgba('#ffffff', a); ctx.beginPath(); ctx.arc(f.x, f.y, 2.2, 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  if (G.vign) ctx.drawImage(G.vign, 0, 0, W, H);
}

// ================= UI =================
const SCR = ['Title', 'Prep', 'Daily', 'Shop', 'Codex', 'Ach', 'Stats', 'Settings', 'Help'];
function hideScreens() { for (const s of SCR) { const e = $('scr' + s); if (e) e.classList.add('hide'); } }
function hideOverlays() { document.querySelectorAll('.ov').forEach(o => o.classList.add('hide')); }
function showOv(id) { $(id).classList.remove('hide'); G.ovT = performance.now(); const p = $(id).querySelector('.ovPanel'); if (p) p.scrollTop = 0; }
function hideOv(id) { $(id).classList.add('hide'); }
function refreshShards() { document.querySelectorAll('.shardsVal').forEach(e => { e.textContent = fmtNum(SAVE.shards); }); }
const ovReady = () => performance.now() - (G.ovT || 0) > 260;
const URLC = {};
function sprURL(key, fn) { if (!URLC[key]) URLC[key] = spriteURL(fn()); return URLC[key]; }
const charImg = c => sprURL('c' + c.id, () => playerSprite(c));
const enemyImg = d => sprURL('e' + d.shape + d.col, () => enemySprite(d.shape, d.col, Math.min(d.r, 24)));
const imgTag = (src, cls) => `<img class="${cls || ''}" src="${src}" alt="">`;
function go(name) {
  sfx('click'); hideScreens(); hideOverlays(); showHud(false);
  G.state = 'title'; IN.joy.on = false;
  const map = { title: 'Title', prep: 'Prep', daily: 'Daily', shop: 'Shop', codex: 'Codex', ach: 'Ach', stats: 'Stats', settings: 'Settings', help: 'Help' };
  const k = map[name] || 'Title';
  $('scr' + k).classList.remove('hide');
  const fn = { prep: buildPrep, daily: buildDaily, shop: buildShop, codex: buildCodex, ach: buildAch, stats: buildStats, settings: buildSettings, help: buildHelp }[name] || buildTitle;
  fn();
  refreshShards(); bgm('title'); AU.duck = 1; auVol(); blurActive();
  const body = $('scr' + k).querySelector('.pbody'); if (body) body.scrollTop = 0;
  G.titleStage = STAGES.find(s => s.id === SAVE.sel.stage) || STAGES[0];
}
function buildTitle() {
  const n = ACHS.filter(a => SAVE.ach[a.id]).length;
  $('achTag').textContent = n + '/' + ACHS.length;
  const td = todayStr(), done = SAVE.daily.date === td && SAVE.daily.claimed;
  $('dailyTag').textContent = done ? '挑戦済' : '報酬2倍';
  $('dailyTag').className = 'tag' + (done ? ' done' : '');
}
function confirmBox(msg, yes, yesLabel) {
  $('ovConfirmIn').innerHTML = `<p class="cfMsg">${msg}</p><div class="btnRow"><button class="mbtn" data-cf="no">キャンセル</button><button class="mbtn danger" data-cf="yes">${yesLabel || 'はい'}</button></div>`;
  G.cfYes = yes; showOv('ovConfirm');
}
function toast(text, type) {
  const box = $('toasts');
  while (box.children.length > 3) box.removeChild(box.children[0]);
  const t = h('div', 'toast' + (type ? ' ' + type : ''), esc(text));
  box.appendChild(t);
  setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 2900);
}
function bigToast(title, sub, danger) {
  const b = $('bigtoast');
  b.className = danger ? 'danger' : '';
  b.innerHTML = `<div class="btTitle">${esc(title)}</div>${sub ? `<div class="btSub">${esc(sub)}</div>` : ''}`;
  void b.offsetWidth;
  b.classList.add('show');
}
function showTutorial() {
  const t = $('tut');
  t.innerHTML = IS_TOUCH
    ? '<b>画面のどこかをドラッグして移動</b><br>攻撃は自動！ 右下のボタンでダッシュ（無敵）と必殺技'
    : '<b>WASD / 矢印キーで移動</b><br>攻撃は自動！ Space でダッシュ（無敵）、E で必殺技、Esc でポーズ';
  t.classList.remove('hide');
  clearTimeout(G.tutTimer);
  G.tutTimer = setTimeout(() => t.classList.add('hide'), 7000);
}

// ---------- HUD ----------
let HC = {};
const E = {};
function showHud(on) { $('hud').classList.toggle('hide', !on); if (!on) { $('bossbar').classList.add('hide'); $('tut').classList.add('hide'); } }
function hudReset() {
  HC = {};
  $('stagetag').textContent = G.daily ? 'デイリー挑戦' : G.stage.name + (G.abyss ? '・深淵' + G.abyss : '');
  $('bossbar').classList.add('hide');
  $('btnUlt').querySelector('.cl').textContent = G.char.ultName;
}
function bossBar(on) { $('bossbar').classList.toggle('hide', !on); HC.bn = null; HC.br = -1; }
function updateSlots() {
  if (!G.p) return;
  const P = G.p;
  let s = '<div class="srow">';
  for (const w of P.weapons) {
    const d = WEAPONS[w.id], ready = !w.evo && w.lv >= WMAX && hasPassive(d.evo.need);
    s += `<div class="slot${w.evo ? ' evo' : ''}${ready ? ' ready' : ''}">${w.evo ? d.evo.icon : d.icon}<b>${w.evo ? '★' : w.lv}</b></div>`;
  }
  s += '</div><div class="srow">';
  for (const p of P.passives) s += `<div class="slot p">${PASSIVES[p.id].icon}<b>${p.lv}</b></div>`;
  s += '</div>';
  $('slots').innerHTML = s;
}
function setTxt(key, el, v) { if (HC[key] !== v) { HC[key] = v; el.textContent = v; } }
function updateHud() {
  if (!G.p || !G.st) return;
  if (!['play', 'levelup', 'chest', 'paused', 'clear', 'dying'].includes(G.state)) return;
  const P = G.p;
  const xr = clamp(P.xp / P.xpNeed, 0, 1);
  if (Math.abs(xr - (HC.xr === undefined ? -1 : HC.xr)) > .002) { HC.xr = xr; E.xpfill.style.transform = `scaleX(${xr})`; }
  setTxt('lv', E.lvtxt, 'Lv ' + P.level);
  const hr = clamp(P.hp / G.st.maxHp, 0, 1);
  if (Math.abs(hr - (HC.hr === undefined ? -1 : HC.hr)) > .003) { HC.hr = hr; E.hpfill.style.transform = `scaleX(${hr})`; E.hpbar.classList.toggle('low', hr < .3); }
  setTxt('hp', E.hptxt, Math.ceil(Math.max(0, P.hp)) + ' / ' + G.st.maxHp);
  setTxt('tm', E.timer, fmtTime(G.t));
  setTxt('k', E.killtxt, fmtNum(R.kills));
  setTxt('c', E.cointxt, fmtNum(R.coins));
  const dp = P.dashCd > 0 ? 1 - clamp(P.dashCd / (2.2 * G.st.dash), 0, 1) : 1;
  if (Math.abs(dp - (HC.dp === undefined ? -1 : HC.dp)) > .02 || (dp === 1 && HC.dp !== 1)) { HC.dp = dp; E.btnDash.style.setProperty('--p', dp.toFixed(3)); E.btnDash.classList.toggle('ready', dp >= 1); }
  const up = clamp(P.ult / 100, 0, 1);
  if (Math.abs(up - (HC.up === undefined ? -1 : HC.up)) > .01 || (up === 1 && HC.up !== 1)) { HC.up = up; E.btnUlt.style.setProperty('--p', up.toFixed(3)); E.btnUlt.classList.toggle('ready', up >= 1); }
  if (G.bosses.length) {
    let hp = 0, mx = 0; for (const b of G.bosses) { hp += Math.max(0, b.hp); mx += b.maxHp; }
    const br = mx ? hp / mx : 0;
    if (Math.abs(br - (HC.br === undefined ? -1 : HC.br)) > .002) { HC.br = br; E.bossfill.style.transform = `scaleX(${br})`; }
    const bn = G.bosses[0].def.name + (G.bosses.length > 1 ? ' ほか' + (G.bosses.length - 1) + '体' : '');
    setTxt('bn', E.bossname, bn);
  }
}

// ---------- LEVEL UP ----------
function levelDesc(id, lv) {
  const d = WEAPONS[id], L = d.levels[lv - 2]; if (!L) return d.desc;
  const out = [];
  for (const k in L) {
    const v = L[k];
    if (k === 'dmg') out.push('ダメージ +' + v);
    else if (k === 'cd') out.push('クールダウン ' + v + '秒');
    else if (k === 'amt') out.push(d.amtName + ' +' + v);
    else if (k === 'pierce') out.push((d.pierceName || '貫通') + ' +' + v);
    else if (k === 'area') out.push('範囲 +' + Math.round(v * 100) + '%');
    else if (k === 'spd') out.push((id === 'orbit' ? '回転速度' : '弾速') + ' +' + Math.round(v * 100) + '%');
    else if (k === 'dur') out.push('持続 +' + v + '秒');
  }
  return out.join('　');
}
function choiceInfo(c) {
  if (c.k === 'w') {
    const d = WEAPONS[c.id], E2 = d.evo, need = PASSIVES[E2.need];
    let hint = '';
    if (c.lv === 1) hint = `進化：${E2.icon}${E2.name}（${need.icon}${need.name}が必要）`;
    else if (c.lv === WMAX) hint = hasPassive(E2.need) ? `最大レベル！ 次の宝箱で ${E2.icon}${E2.name} に進化` : `最大レベル！ ${need.icon}${need.name} を持っていれば宝箱で進化`;
    return { icon: d.icon, name: d.name, lvTxt: c.lv === 1 ? 'NEW' : 'Lv ' + c.lv, isNew: c.lv === 1, desc: c.lv === 1 ? d.desc : levelDesc(c.id, c.lv), hint };
  }
  if (c.k === 'p') {
    const d = PASSIVES[c.id];
    const ws = G.p.weapons.filter(w => !w.evo && WEAPONS[w.id].evo.need === c.id);
    return { icon: d.icon, name: d.name, lvTxt: c.lv === 1 ? 'NEW' : 'Lv ' + c.lv, isNew: c.lv === 1, desc: d.desc, hint: ws.length ? ws.map(w => WEAPONS[w.id].icon + WEAPONS[w.id].name).join('・') + ' の進化に必要' : '' };
  }
  if (c.k === 'coin') return { icon: '✦', name: '星片', lvTxt: '', desc: '星片を ' + Math.round(25 * G.st.greed) + ' 個獲得', hint: '' };
  return { icon: '❤️', name: '回復', lvTxt: '', desc: '最大HPの30%を回復', hint: '' };
}
function renderLevelUp() {
  const P = G.p;
  let s = `<div class="lvHead"><div class="lvT">LEVEL UP</div><div class="lvN">Lv ${P.level}${G.pendingLv > 1 ? `<small>あと${G.pendingLv - 1}回</small>` : ''}</div></div>`;
  if (G.banishMode) s += '<div class="banTip">除外する候補を選んでね（このプレイ中は出なくなる）</div>';
  s += `<div class="cards${G.banishMode ? ' banish' : ''}">`;
  G.choices.forEach((c, i) => {
    const f = choiceInfo(c);
    s += `<button class="card${i === G.lvSel ? ' sel' : ''}" data-ch="${i}"><span class="cIco">${f.icon}</span><span class="cMain"><span class="cName">${f.name}${f.lvTxt ? `<em class="${f.isNew ? 'new' : ''}">${f.lvTxt}</em>` : ''}</span><span class="cDesc">${f.desc}</span>${f.hint ? `<span class="cHint">${f.hint}</span>` : ''}</span><span class="cKey">${i + 1}</span></button>`;
  });
  s += '</div><div class="lvActs">';
  s += `<button class="abtn" data-act="reroll" ${G.rerolls > 0 ? '' : 'disabled'}>🎲 リロール<b>${G.rerolls}</b></button>`;
  s += `<button class="abtn" data-act="skip" ${G.skips > 0 ? '' : 'disabled'}>⏭ スキップ<b>${G.skips}</b></button>`;
  s += `<button class="abtn${G.banishMode ? ' on' : ''}" data-act="banish" ${G.banishes > 0 ? '' : 'disabled'}>🚫 除外<b>${G.banishes}</b></button>`;
  s += '</div>';
  if (G.rerolls + G.skips + G.banishes === 0) s += '<div class="lvNote">リロール・スキップ・除外は永続強化で回数を増やせるよ</div>';
  $('ovLevelIn').innerHTML = s;
}
function showChest(res, evo) {
  let s = `<div class="chHead${evo ? ' evo' : ''}"><div class="chIco">${evo ? '🌠' : '🎁'}</div><div class="chT">${evo ? '武器が進化した！' : '宝箱を開けた！'}</div></div><div class="chList">`;
  res.forEach((r, i) => { s += `<div class="ci${r.evo ? ' evo' : ''}" style="animation-delay:${.15 + i * .18}s"><span class="ciIco">${r.icon}</span><span><b>${r.name}</b><small>${r.sub}</small></span></div>`; });
  s += `</div><button class="mbtn prime" data-act="closeChest">受け取る</button>`;
  $('ovChestIn').innerHTML = s;
  showOv('ovChest');
}
function statList() {
  const s = G.st, pct = v => (v >= 1 ? '+' : '') + Math.round((v - 1) * 100) + '%';
  return [['最大HP', s.maxHp], ['攻撃力', pct(s.might)], ['防御', s.armor], ['再生', s.regen.toFixed(1) + '/秒'], ['移動速度', pct(s.speed / 165)], ['範囲', pct(s.area)], ['クールダウン', '-' + Math.round((1 - s.cd) * 100) + '%'], ['持続', pct(s.dur)], ['弾速', pct(s.pspd)], ['武器の数', '+' + s.amount], ['回収範囲', pct(s.magnet / 65)], ['運', pct(s.luck)], ['経験値', pct(s.growth)], ['強欲', pct(s.greed)], ['会心率', Math.round(s.crit * 100) + '%'], ['復活', G.p.revives]];
}
function weaponTable(ws, time) {
  const tot = ws.reduce((a, w) => a + w.dmg, 0) || 1;
  const sorted = ws.slice().sort((a, b) => b.dmg - a.dmg);
  return '<div class="wTable">' + sorted.map(w => {
    const d = WEAPONS[w.id], nm = w.evo ? d.evo.icon + ' ' + d.evo.name : d.icon + ' ' + d.name;
    return `<div class="wRow"><span class="wN">${nm}<small>${w.evo ? '進化' : 'Lv' + w.lv}</small></span><span class="wBar"><i style="width:${(w.dmg / tot * 100).toFixed(1)}%"></i></span><span class="wD">${fmtNum(w.dmg)}<small>DPS ${fmtNum(w.dmg / Math.max(1, time))}</small></span></div>`;
  }).join('') + '</div>';
}
function buildPause() {
  const P = G.p;
  let s = `<div class="pvHead"><h2>ポーズ</h2><div class="pvSub">${esc(G.daily ? 'デイリー挑戦' : G.stage.name)}　${fmtTime(G.t)}　Lv ${P.level}</div></div>`;
  s += '<h3 class="sec">武器</h3>' + weaponTable(P.weapons, G.t);
  s += '<h3 class="sec">アイテム</h3><div class="pList">' + (P.passives.length ? P.passives.map(p => `<span class="pChip">${PASSIVES[p.id].icon} ${PASSIVES[p.id].name} <b>Lv${p.lv}</b></span>`).join('') : '<span class="dim">なし</span>') + '</div>';
  s += '<h3 class="sec">ステータス</h3><div class="stGrid">' + statList().map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('') + '</div>';
  s += `<h3 class="sec">音量</h3><div class="setRow"><label>BGM</label><input type="range" min="0" max="1" step="0.05" value="${SAVE.set.bgm}" data-set="bgm"></div><div class="setRow"><label>効果音</label><input type="range" min="0" max="1" step="0.05" value="${SAVE.set.se}" data-set="se"></div>`;
  s += `<div class="btnRow"><button class="mbtn" data-act="retire">リタイア</button><button class="mbtn prime" data-act="resume">再開する</button></div>`;
  s += '<a class="credit inl" href="https://github.com/h1ro223" target="_blank" rel="noopener">made by hiro/ヒロ</a>';
  $('ovPauseIn').innerHTML = s;
}
function buildClear() {
  const P = G.p;
  $('ovClearIn').innerHTML = `<div class="clrHead"><div class="clrBig">STAGE CLEAR</div><div class="clrSub">${esc(G.daily ? 'デイリー挑戦' : G.stage.name)} を制覇！</div></div>
  <div class="rsGrid"><div><span>時間</span><b>${fmtTime(G.t)}</b></div><div><span>撃破数</span><b>${fmtNum(R.kills)}</b></div><div><span>レベル</span><b>${P.level}</b></div><div><span>星片</span><b>${fmtNum(R.coins)}</b></div></div>
  <p class="clrNote">このまま「エンドレス」で限界に挑むこともできる。さらに強い敵と、時々ボスが再来するよ。力尽きてもクリア扱いは残る。</p>
  <div class="btnRow"><button class="mbtn" data-act="goHome">帰還する</button><button class="mbtn prime" data-act="endless">エンドレスへ</button></div>`;
}
function showResult(r) {
  showHud(false);
  const P = G.p;
  let s = `<div class="rsHead${r.win ? ' win' : ''}"><div class="rsBig">${r.win ? 'MISSION COMPLETE' : 'GAME OVER'}</div><div class="rsSub">${r.win ? '光は闇を打ち払った' : '光は一度、墜ちた。けれど必ずまた灯る'}</div>
  <div class="rsMeta">${esc(G.daily ? 'デイリー挑戦・' + G.stage.name : G.stage.name)}${G.abyss ? '・深淵' + G.abyss : ''}　${imgTag(charImg(G.char), 'mini')}${esc(G.char.name)}</div></div>`;
  s += `<div class="rsGrid"><div><span>生存時間</span><b>${fmtTime(r.time)}</b></div><div><span>撃破数</span><b>${fmtNum(R.kills)}</b></div><div><span>レベル</span><b>${P.level}</b></div><div><span>ボス撃破</span><b>${R.bosses}</b></div><div><span>宝箱</span><b>${R.chests}</b></div><div><span>進化</span><b>${R.evos}</b></div></div>`;
  s += '<h3 class="sec">武器ごとのダメージ</h3>' + weaponTable(P.weapons, r.time);
  s += `<h3 class="sec">獲得した星片</h3><div class="rwList"><div><span>道中で拾った星片</span><b>${fmtNum(r.base)}</b></div><div><span>戦果ボーナス</span><b>${fmtNum(r.bonus)}</b></div>${r.dailyB ? `<div><span>デイリー初回ボーナス</span><b>${fmtNum(r.dailyB)}</b></div>` : ''}<div class="tot"><span>合計</span><b>✦ ${fmtNum(r.total)}</b></div></div>`;
  if (r.newA.length) {
    s += '<h3 class="sec">実績解除！</h3><div class="achNew">' + r.newA.map(a => { const ch = CHARS.find(c => c.lock === a.id); return `<div class="anRow"><span>🏆 ${a.name}</span><b>✦${a.rw}</b>${ch ? `<em>${imgTag(charImg(ch), 'mini')}${ch.name} が仲間になった！</em>` : ''}</div>`; }).join('') + '</div>';
  }
  s += `<div class="btnRow three"><button class="mbtn" data-go="title">タイトル</button><button class="mbtn" data-go="prep">出撃準備</button><button class="mbtn prime" data-act="retry">もう一度</button></div>`;
  s += '<a class="credit inl" href="https://github.com/h1ro223" target="_blank" rel="noopener">made by hiro/ヒロ</a>';
  $('ovResultIn').innerHTML = s;
  showOv('ovResult');
  if (r.newA.length) sfx('ach');
}

// ---------- 出撃準備 ----------
let prepView = null;
function buildPrep() {
  const sel = SAVE.sel;
  if (STAGES.findIndex(s => s.id === sel.stage) >= SAVE.stages || STAGES.findIndex(s => s.id === sel.stage) < 0) sel.stage = 's1';
  if (!SAVE.chars.includes(sel.char)) sel.char = 'akira';
  sel.abyss = clamp(sel.abyss | 0, 0, SAVE.maxAbyss);
  const view = CHARS.find(c => c.id === (prepView || sel.char)) || CHARS[0];
  const b = $('prepBody'), keep = b.scrollTop;
  let s = '<h3 class="sec">ステージ</h3><div class="stageList">';
  STAGES.forEach((st, i) => {
    const lock = i >= SAVE.stages, cl = SAVE.clears[st.id], best = SAVE.best[st.id];
    s += `<button class="stageCard${lock ? ' locked' : ''}${sel.stage === st.id ? ' on' : ''}" style="--sc:${st.col}" ${lock ? 'disabled' : `data-stage="${st.id}"`}>`;
    s += lock ? `<span class="sNum">STAGE ${i + 1}</span><span class="sName">？？？</span><span class="sDesc">前のステージをクリアすると解放</span>`
      : `<span class="sNum">STAGE ${i + 1}　${st.en}</span><span class="sName">${st.name}</span><span class="sDesc">${st.desc}</span><span class="sMeta">${cl !== undefined ? `<i class="clr">クリア済・深淵${cl}</i>` : '<i>未クリア</i>'}${best ? `<i>最長 ${fmtTime(best.time)}</i>` : ''}</span>`;
    s += '</button>';
  });
  s += '</div><h3 class="sec">キャラクター</h3><div class="charList">';
  for (const c of CHARS) {
    const un = SAVE.chars.includes(c.id);
    s += `<button class="ccard${un ? '' : ' locked'}${view.id === c.id ? ' on' : ''}${sel.char === c.id ? ' pick' : ''}" data-char="${c.id}" style="--cc:${c.col}">${imgTag(charImg(c), 'pimg')}<span>${un ? c.name : '？？？'}</span>${SAVE.charClear[c.id] ? '<i class="star">★</i>' : ''}</button>`;
  }
  s += '</div>';
  const un = SAVE.chars.includes(view.id), W0 = WEAPONS[view.weapon];
  if (un) {
    s += `<div class="charInfo" style="--cc:${view.col}">${imgTag(charImg(view), 'big')}<div class="ciBody"><div class="ciName">${view.name}<small>${view.title}</small></div><p class="ciStory">${view.story}</p>
      <div class="ciRow"><span>初期武器</span><b>${W0.icon} ${W0.name}</b></div><div class="ciRow"><span>特性</span><b>${view.passive}</b></div><div class="ciRow"><span>必殺技</span><b>${view.ultName}<small>${view.ultDesc}</small></b></div></div></div>`;
  } else {
    const a = charUnlockAch(view);
    s += `<div class="charInfo locked">${imgTag(charImg(view), 'big')}<div class="ciBody"><div class="ciName">？？？</div><p class="ciStory">解放条件：${a ? a.desc : '???'}</p></div></div>`;
  }
  const A = sel.abyss;
  s += `<h3 class="sec">深淵レベル<small>敵が強くなる代わりに報酬が増える</small></h3><div class="abyssRow"><button class="abtn sq" data-aby="-1" ${A <= 0 ? 'disabled' : ''}>−</button><div class="abyV"><b>${A}</b><small>最大 ${SAVE.maxAbyss}</small></div><button class="abtn sq" data-aby="1" ${A >= SAVE.maxAbyss ? 'disabled' : ''}>＋</button>
    <div class="abyD">${A ? `敵HP +${A * 20}%　敵攻撃 +${A * 10}%　出現数 +${A * 8}%<br><b>報酬 +${A * 15}%</b>` : 'いつもの難易度。ステージをクリアすると次の深淵が解放される。'}</div></div>`;
  b.innerHTML = s;
  b.scrollTop = keep;
  const btn = $('btnStart');
  btn.disabled = !un;
  btn.textContent = un ? '出撃する' : 'このキャラはまだ使えない';
}
// ---------- デイリー ----------
function dailyCfg() {
  const d = todayStr(), seed = hashStr('LUMINA' + d), r = mulberry32(seed);
  const st = STAGES[Math.floor(r() * SAVE.stages)], ch = CHARS[Math.floor(r() * CHARS.length)];
  const pool = DMODS.slice(), mods = [];
  for (let i = 0; i < 2; i++) mods.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return { date: d, seed, stage: st, char: ch, mods };
}
function buildDaily() {
  const c = dailyCfg(), td = c.date;
  const claimed = SAVE.daily.date === td && SAVE.daily.claimed, best = SAVE.daily.date === td ? SAVE.daily.best : 0;
  $('dailyBody').innerHTML = `<div class="dailyCard"><div class="dDate">${td.replace(/-/g, '.')} の挑戦</div>
    <div class="dRow"><span>ステージ</span><b style="color:${c.stage.col}">${c.stage.name}</b></div>
    <div class="dRow"><span>キャラクター</span><b>${imgTag(charImg(c.char), 'mini')}${c.char.name}<small>${SAVE.chars.includes(c.char.id) ? '' : '（未解放キャラをお試し！）'}</small></b></div>
    <div class="dMods">${c.mods.map(m => `<div class="dMod"><b>${m.name}</b><span>${m.desc}</span></div>`).join('')}</div>
    <div class="dRow"><span>今日の最長記録</span><b>${best ? fmtTime(best) : '—'}</b></div>
    <p class="dNote">${claimed ? '今日の初回報酬は受け取り済み。記録更新を目指そう！' : '今日の初回プレイは獲得星片が <b>2倍</b>！'}<br>内容は毎日0時に変わるよ。</p></div>`;
}
// ---------- ショップ ----------
function shopSpent() { let n = 0; for (const s of SHOP) for (let l = 0; l < upLv(s.id); l++) n += shopCost(s, l); return n; }
function buildShop() {
  const spent = shopSpent(), b = $('shopBody'), keep = b.scrollTop;
  let s = `<div class="shopTop"><p>星片で能力を永続的に強化できる。全額返金していつでも振り直せるよ。</p><button class="abtn" data-refund ${spent ? '' : 'disabled'}>全て返金（✦${fmtNum(spent)}）</button></div><div class="shopGrid">`;
  for (const it of SHOP) {
    const l = upLv(it.id), max = l >= it.max, c = max ? 0 : shopCost(it, l), can = !max && SAVE.shards >= c;
    s += `<div class="shopItem${max ? ' max' : ''}"><span class="siIco">${it.icon}</span><span class="siMain"><span class="siName">${it.name}</span><span class="pips">${'<i class="on"></i>'.repeat(l)}${'<i></i>'.repeat(it.max - l)}</span><span class="siDesc">${it.desc}</span></span><button class="buy${can ? '' : ' off'}" data-buy="${it.id}" ${max ? 'disabled' : ''}>${max ? 'MAX' : '✦ ' + fmtNum(c)}</button></div>`;
  }
  b.innerHTML = s + '</div>';
  b.scrollTop = keep;
  refreshShards();
}
function achToasts(list) { list.forEach((a, i) => setTimeout(() => { toast('🏆 実績解除：' + a.name + '（✦' + a.rw + '）', 'ach'); sfx('ach'); }, i * 400)); }
// ---------- 図鑑 ----------
const CX = { tab: 'w', sel: null };
function stagesOf(id) { return STAGES.filter(s => s.waves.some(w => w[1][id]) || s.elites.includes(id) || s.mid === id).map(s => s.name).join('・') || '分裂・召喚で出現'; }
function codexItems(tab) {
  const C = SAVE.codex;
  if (tab === 'w') return WIDS.map(id => { const d = WEAPONS[id], n = PASSIVES[d.evo.need]; return { id, known: !!C.w[id], icon: d.icon, name: d.name, desc: d.desc, extra: `進化先：${C.e[id] ? d.evo.icon + ' ' + d.evo.name : '？？？'}<br>進化条件：Lv${WMAX} ＋ ${n.icon}${n.name} を持って宝箱を開ける<br>累計ダメージ：${fmtNum(SAVE.stats.wdmg[id] || 0)}` }; });
  if (tab === 'e') return WIDS.map(id => { const d = WEAPONS[id], E2 = d.evo, n = PASSIVES[E2.need]; return { id: E2.id, known: !!C.e[id], icon: E2.icon, name: E2.name, desc: E2.desc, extra: `${d.icon}${d.name} Lv${WMAX} ＋ ${n.icon}${n.name}`, lock: C.w[id] ? `レシピ：${d.icon}${d.name} Lv${WMAX} ＋ ${n.icon}${n.name} を持って宝箱を開ける` : 'もとになる武器をまだ見つけていない' }; });
  if (tab === 'p') return PIDS.map(id => { const d = PASSIVES[id]; const ws = WIDS.filter(w => WEAPONS[w].evo.need === id).map(w => WEAPONS[w].icon + WEAPONS[w].name); return { id, known: !!C.p[id], icon: d.icon, name: d.name, desc: d.desc + `（最大Lv${d.max}）`, extra: '進化に使う武器：' + ws.join('・') }; });
  if (tab === 'en') return EIDS.map(id => { const d = ENEMIES[id]; return { id, known: !!C.en[id], icon: imgTag(enemyImg(d)), name: d.name, desc: d.desc, extra: `基本HP ${d.hp}　攻撃 ${d.dmg}　速さ ${d.spd}<br>出現：${stagesOf(id)}` }; });
  if (tab === 'b') return BIDS.map(id => { const d = BOSSES[id], st = STAGES.find(s => s.boss === id); return { id, known: !!C.b[id], icon: imgTag(enemyImg(d)), name: d.name, desc: d.desc, extra: `基本HP ${fmtNum(d.hp)}　出現：${st ? st.name : ''}`, lock: '倒すと記録される' }; });
  return CHARS.map(c => { const a = charUnlockAch(c); return { id: c.id, known: SAVE.chars.includes(c.id), icon: imgTag(charImg(c)), name: c.name + '　' + c.title, desc: c.story, extra: `必殺技：${c.ultName}（${c.ultDesc}）`, lock: a ? '解放条件：' + a.desc : '' }; });
}
function buildCodex() {
  const tabs = [['w', '武器'], ['e', '進化'], ['p', 'アイテム'], ['en', '敵'], ['b', 'ボス'], ['c', 'キャラ']];
  const items = codexItems(CX.tab), found = items.filter(i => i.known).length;
  const sel = items.find(i => i.id === CX.sel) || items.find(i => i.known) || items[0];
  let s = '<div class="tabs">' + tabs.map(([k, n]) => `<button class="tab${CX.tab === k ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('') + '</div>';
  s += `<div class="cxCount">${found} / ${items.length} 発見</div>`;
  if (sel) s += sel.known
    ? `<div class="cxDetail"><div class="dIco">${sel.icon}</div><div><div class="dName">${sel.name}</div><div class="dDesc">${sel.desc}</div><div class="dExtra">${sel.extra}</div></div></div>`
    : `<div class="cxDetail unk"><div class="dIco">？</div><div><div class="dName">？？？</div><div class="dDesc">${sel.lock || 'まだ出会っていない'}</div></div></div>`;
  s += '<div class="cxGrid">' + items.map(i => `<button class="cxTile${i.known ? '' : ' unk'}${sel && i.id === sel.id ? ' on' : ''}" data-cx="${i.id}">${i.known ? i.icon : '？'}</button>`).join('') + '</div>';
  $('codexBody').innerHTML = s;
}
// ---------- 実績・戦績 ----------
function buildAch() {
  const n = ACHS.filter(a => SAVE.ach[a.id]).length;
  let s = `<div class="achHead"><b>${n}</b> / ${ACHS.length} 達成<div class="achBar"><i style="width:${n / ACHS.length * 100}%"></i></div></div><div class="achList">`;
  for (const a of ACHS) {
    const ok = !!SAVE.ach[a.id], ch = CHARS.find(c => c.lock === a.id);
    s += `<div class="achRow${ok ? ' ok' : ''}"><span class="achMark">${ok ? '★' : '☆'}</span><span class="achMain"><b>${a.name}</b><small>${a.desc}</small></span><span class="achRw">✦${a.rw}${ch ? `<small>${ch.name}解放</small>` : ''}</span></div>`;
  }
  $('achBody').innerHTML = s + '</div>';
}
function buildStats() {
  const S = SAVE.stats;
  const rows = [['出撃回数', S.runs], ['累計撃破数', fmtNum(S.kills)], ['累計プレイ時間', fmtTime(S.time)], ['最長生存', fmtTime(S.longest)], ['最高レベル', S.maxLv], ['1回の最多撃破', fmtNum(S.maxRunKills)], ['ボス撃破', S.bosses], ['宝箱', S.chests], ['進化', S.evos], ['拾った星片', fmtNum(S.gold)], ['ダッシュ', fmtNum(S.dashes)], ['必殺技', S.ults], ['灯籠', S.lanterns], ['デイリー挑戦', S.daily], ['深淵の最高解放', SAVE.maxAbyss], ['永続強化の購入', S.buys]];
  let s = '<div class="stRows">' + rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('') + '</div>';
  s += '<h3 class="sec">ステージ別の記録</h3><div class="stRows">' + STAGES.map((st, i) => { const b = SAVE.best[st.id]; return `<div><span>${i < SAVE.stages ? st.name : '？？？'}</span><b>${b ? fmtTime(b.time) + '・' + fmtNum(b.kills) + '体' : '—'}</b></div>`; }).join('') + '</div>';
  const wd = Object.entries(S.wdmg).sort((a, b) => b[1] - a[1]);
  if (wd.length) s += '<h3 class="sec">武器の累計ダメージ</h3><div class="stRows">' + wd.map(([id, v]) => `<div><span>${WEAPONS[id] ? WEAPONS[id].icon + ' ' + WEAPONS[id].name : id}</span><b>${fmtNum(v)}</b></div>`).join('') + '</div>';
  $('statsBody').innerHTML = s;
}
// ---------- 設定・遊び方 ----------
function buildSettings() {
  const S = SAVE.set;
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${S[k] === v ? 'on' : ''}" data-seg="${k}:${v}">${l}</button>`).join('')}</div>`;
  const tog = (k, l) => `<div class="setRow"><label>${l}</label><button class="tog${S[k] ? ' on' : ''}" data-tog="${k}"><i></i></button></div>`;
  $('settingsBody').innerHTML = `<h3 class="sec">サウンド</h3>
    <div class="setRow"><label>BGM</label><input type="range" min="0" max="1" step="0.05" value="${S.bgm}" data-set="bgm"></div>
    <div class="setRow"><label>効果音</label><input type="range" min="0" max="1" step="0.05" value="${S.se}" data-set="se"></div>
    <h3 class="sec">表示</h3>${tog('shake', '画面の揺れ')}${tog('dmgNum', 'ダメージ数値')}${tog('fps', 'FPS表示')}
    <div class="setRow"><label>画質<small>重いと感じたら下げてね</small></label>${seg('quality', [['high', '高'], ['mid', '中'], ['low', '低']])}</div>
    <h3 class="sec">操作</h3><div class="setRow"><label>スティック<small>フリー：触れた場所が中心 / 固定：左下</small></label>${seg('joy', [['float', 'フリー'], ['fixed', '固定']])}</div>
    <h3 class="sec">データ</h3><div class="setRow"><label>セーブデータを消去<small>強化・実績・記録がすべて消える</small></label><button class="abtn dangerTxt" data-reset>消去する</button></div>`;
}
function buildHelp() {
  $('helpBody').innerHTML = `<div class="help">
  <h3 class="sec">目的</h3><p>魔物の群れから8分間生き延び、最後に現れるステージボスを倒せばクリア。途中の4分には中ボスも出てくる。クリア後はそのまま「エンドレス」で限界に挑戦できる。</p>
  <h3 class="sec">操作</h3><p><b>スマホ</b>：画面をドラッグで移動。右下のボタンでダッシュと必殺技。<br><b>PC</b>：WASD / 矢印キーで移動、Space でダッシュ、E で必殺技、Esc でポーズ。レベルアップ時は 1〜4 キーでも選べる。<br><b>ゲームパッド</b>：左スティックで移動、A でダッシュ、B / Y で必殺技、START でポーズ。</p>
  <h3 class="sec">攻撃は自動</h3><p>装備した武器は勝手に攻撃してくれる。君がやることは、敵の間を縫って動き回り、経験値の結晶を集めること。</p>
  <h3 class="sec">ダッシュ</h3><p>一瞬で移動し、その間は無敵。敵の弾や包囲網を抜けるのに使おう。ボタンの外周がたまると再使用できる。</p>
  <h3 class="sec">必殺技</h3><p>敵を倒すとゲージがたまり、満タンで発動できる。キャラごとに効果が違う切り札。</p>
  <h3 class="sec">レベルアップと進化</h3><p>結晶を集めてレベルが上がると、武器かアイテムを1つ選べる。武器とアイテムはそれぞれ6つまで。<br>武器を<b>Lv${WMAX}</b>まで育て、対応するアイテムを持った状態で<b>宝箱</b>を開けると<b>進化</b>する。組み合わせは図鑑で確認できる。</p>
  <h3 class="sec">宝箱と灯籠</h3><p>宝箱はエリート（金色に光る強敵）やボスが落とす。フィールドの灯籠を壊すと回復やアイテムが出る。画面外の宝箱とボスは矢印で教えてくれる。</p>
  <h3 class="sec">星片と永続強化</h3><p>道中で拾った星片と戦果ボーナスは、プレイ後に持ち帰れる。永続強化に使ってどんどん強くなろう。</p>
  <h3 class="sec">深淵レベル</h3><p>ステージをクリアすると、より高い深淵レベルが解放される。敵は強くなるけど報酬も増える。最大は10。</p>
  <h3 class="sec">デイリー挑戦</h3><p>毎日変わるステージ・キャラ・特殊ルールで挑戦。まだ解放していないキャラを使えることもある。その日の初回は報酬2倍。</p>
  </div>`;
}

// ================= EVENTS / BOOT =================
function onSetting(k, v) {
  SAVE.set[k] = v; writeSave();
  if (k === 'bgm' || k === 'se') auVol();
  if (k === 'quality') { resize(); G.pt.length = Math.min(G.pt.length, maxParticles()); }
  if (k === 'fps') $('fps').classList.toggle('hide', !v);
}
function bindUI() {
  for (const id of ['xpfill', 'lvtxt', 'hpfill', 'hpbar', 'hptxt', 'timer', 'killtxt', 'cointxt', 'btnDash', 'btnUlt', 'bossfill', 'bossname']) E[id] = $(id);
  document.addEventListener('click', e => {
    const t = e.target;
    if (!t || !t.closest) return;
    auUnlock();
    const g = t.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
    const cf = t.closest('[data-cf]'); if (cf) { hideOv('ovConfirm'); sfx(cf.dataset.cf === 'yes' ? 'click' : 'back'); if (cf.dataset.cf === 'yes' && G.cfYes) { const f = G.cfYes; G.cfYes = null; f(); } return; }
    const ch = t.closest('[data-ch]'); if (ch) { if (ovReady()) chooseUpgrade(+ch.dataset.ch); return; }
    const a = t.closest('[data-act]');
    if (a) {
      const k = a.dataset.act;
      if (k === 'reroll') doReroll(); else if (k === 'skip') doSkip(); else if (k === 'banish') toggleBanish();
      else if (k === 'closeChest') { if (ovReady()) closeChest(); }
      else if (k === 'resume') resumeGame();
      else if (k === 'retire') confirmBox('リタイアしますか？<br><small>ここまでの星片と戦果は持ち帰れます。</small>', () => endRun(false), 'リタイア');
      else if (k === 'endless') { if (ovReady()) continueEndless(); }
      else if (k === 'goHome') { if (ovReady()) endRun(true); }
      else if (k === 'retry') { if (ovReady()) retryRun(); }
      return;
    }
    const st = t.closest('[data-stage]'); if (st) { SAVE.sel.stage = st.dataset.stage; G.titleStage = STAGES.find(s => s.id === st.dataset.stage); writeSave(); sfx('click'); buildPrep(); return; }
    const cc = t.closest('[data-char]'); if (cc) { const id = cc.dataset.char; prepView = id; if (SAVE.chars.includes(id)) SAVE.sel.char = id; writeSave(); sfx('click'); buildPrep(); return; }
    const ab = t.closest('[data-aby]'); if (ab) { SAVE.sel.abyss = clamp(SAVE.sel.abyss + (+ab.dataset.aby), 0, SAVE.maxAbyss); writeSave(); sfx('click'); buildPrep(); return; }
    const bu = t.closest('[data-buy]');
    if (bu) {
      const it = SHOP.find(s => s.id === bu.dataset.buy), l = upLv(it.id);
      if (l >= it.max) return;
      const c = shopCost(it, l);
      if (SAVE.shards < c) { sfx('deny'); toast('星片が足りない…あと ✦' + fmtNum(c - SAVE.shards)); return; }
      SAVE.shards -= c; SAVE.up[it.id] = l + 1; SAVE.stats.buys++;
      const na = checkAch(); writeSave(); sfx('buy'); buildShop(); achToasts(na);
      return;
    }
    if (t.closest('[data-refund]')) { const sp = shopSpent(); if (!sp) return; confirmBox(`永続強化をすべてリセットして ✦${fmtNum(sp)} を返金しますか？`, () => { SAVE.shards += sp; SAVE.up = {}; writeSave(); buildShop(); sfx('buy'); }, '返金する'); return; }
    const tb = t.closest('[data-tab]'); if (tb) { CX.tab = tb.dataset.tab; CX.sel = null; sfx('click'); buildCodex(); return; }
    const cx = t.closest('[data-cx]'); if (cx) { CX.sel = cx.dataset.cx; sfx('click'); buildCodex(); return; }
    const sg = t.closest('[data-seg]'); if (sg) { const [k, v] = sg.dataset.seg.split(':'); onSetting(k, v); sfx('click'); buildSettings(); return; }
    const tg = t.closest('[data-tog]'); if (tg) { const k = tg.dataset.tog; onSetting(k, !SAVE.set[k]); sfx('click'); buildSettings(); return; }
    if (t.closest('[data-reset]')) {
      confirmBox('本当にセーブデータを消去しますか？<br><small>この操作は取り消せません。</small>', () => confirmBox('最終確認：すべてのデータを消去します。', () => { const keepSet = SAVE.set; SAVE = defSave(); SAVE.set = keepSet; writeSave(); go('title'); toast('データを消去しました'); }, '消去する'), '消去する');
      return;
    }
    if (t.closest('#tut')) $('tut').classList.add('hide');
  });
  document.addEventListener('input', e => { const k = e.target && e.target.dataset && e.target.dataset.set; if (k) onSetting(k, +e.target.value); });
  $('btnStart').addEventListener('click', () => { const s = SAVE.sel; if (!SAVE.chars.includes(s.char)) return; prepView = null; startRun({ stage: s.stage, char: s.char, abyss: s.abyss }); });
  $('btnDailyStart').addEventListener('click', () => { const c = dailyCfg(); startRun({ stage: c.stage.id, char: c.char.id, abyss: 0, daily: true, mods: c.mods, seed: c.seed }); });
  const press = (el, fn) => el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); auUnlock(); IN.usedTouch = IN.usedTouch || e.pointerType === 'touch'; fn(); });
  press($('btnDash'), () => { if (G.state === 'play') IN.dashReq = true; });
  press($('btnUlt'), () => { if (G.state === 'play') IN.ultReq = true; });
  press($('btnPause'), () => pauseGame());
  // Safari：長押し・ダブルタップ・ピンチでの拡大／コピー防止
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => e.preventDefault(), { passive: false }));
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  let lastTouchEnd = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouchEnd <= 320) { const t = e.target; if (!(t && t.closest && t.closest('button,input,a,select,label'))) e.preventDefault(); }
    lastTouchEnd = now;
  }, { passive: false });
  document.addEventListener('touchmove', e => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('selectstart', e => { const t = e.target; if (!(t && t.closest && t.closest('input'))) e.preventDefault(); });
  document.addEventListener('pointerdown', () => auUnlock(), { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (G.state === 'play') pauseGame(); if (AU.ctx && AU.ctx.state === 'running') AU.ctx.suspend().catch(() => { }); }
    else if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume().catch(() => { });
  });
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  if (IS_TOUCH) document.body.classList.add('touch');
}
let lastT = 0, fpsN = 0, fpsT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = lastT ? (now - lastT) / 1000 : 0; lastT = now;
  if (!(dt > 0)) dt = 0; dt = Math.min(dt, .05);
  G.rt += dt;
  try {
    pollGamepad();
    if (G.state === 'play') { const steps = dt > .03 ? 2 : 1; for (let i = 0; i < steps && G.state === 'play'; i++) update(dt / steps); }
    else if (G.state === 'dying') { updateFx(dt * .5); G.dyingT -= dt; if (G.dyingT <= 0) endRun(false); }
    if (G.state === 'title' || !G.p) renderTitle(dt); else renderGame(dt);
    updateHud();
  } catch (e) { console.error(e); }
  if (SAVE.set.fps) { fpsN++; fpsT += dt; if (fpsT >= .5) { $('fps').textContent = Math.round(fpsN / fpsT) + ' FPS'; fpsN = 0; fpsT = 0; } }
}
function boot() {
  loadSave();
  initFxSprites();
  resize();
  bindUI();
  $('fps').classList.toggle('hide', !SAVE.set.fps);
  G.titleStage = STAGES.find(s => s.id === SAVE.sel.stage) || STAGES[0];
  go('title');
  requestAnimationFrame(frame);
}
window.LF = { G, IN, startRun, update, chooseUpgrade, closeChest, endRun, continueEndless, renderGame, renderTitle, updateHud, go, getR: () => R, getSave: () => SAVE, frame };
boot();
})();
