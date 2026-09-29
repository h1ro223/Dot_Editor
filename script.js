/* =========================================================
   DOT GAP - すき間ドットエディタ
   made by hiro/ヒロ  https://github.com/h1ro223
   ========================================================= */
(() => {
  'use strict';

  /* ---------- 定数 ---------- */
  const STORAGE_KEY = 'dotgap:v1';
  const REF_KEY = 'dotgap:ref:v1';
  const LIMITS = { cols: [1, 128], rows: [1, 128], cell: [1, 64], gap: [0, 16] };
  const MAX_SIDE = 8192;          // 書き出し画像の一辺の上限
  const MAX_AREA = 16777216;      // iOS Safari のキャンバス面積上限の目安
  const HISTORY_MAX = 100;
  const RECENT_MAX = 12;
  const PALETTE_MAX = 64;
  const REF_MAX_SIDE = 2048;
  const ZMIN = 0.05;
  const ZMAX = 64;
  const DPR = Math.min(4, Math.max(1, window.devicePixelRatio || 1));
  const TOOLS = ['pen', 'eraser', 'fill', 'picker', 'hand'];
  const BG_MODES = ['dark', 'light', 'checker'];
  const EMPTY_FILL = {
    dark: 'rgba(255,255,255,0.075)',
    light: 'rgba(20,24,40,0.08)',
    checker: 'rgba(255,255,255,0.5)',
  };
  const DEFAULT_PALETTE = [
    '#000000', '#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#38b764',
    '#257179', '#29366f', '#3b5dc9', '#41a6f6', '#73eff7', '#f4f4f4', '#94b0c2', '#566c86',
    '#333c57', '#ffffff', '#7a1f1f', '#ff4d4d', '#ff9ecd', '#b86f50', '#733e39', '#3e2731',
  ];

  /* ---------- ユーティリティ ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function clampInt(v, min, max, def) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? clamp(n, min, max) : def;
  }

  function normHex(v) {
    if (typeof v !== 'string') return null;
    let s = v.trim().toLowerCase();
    if (s[0] !== '#') s = '#' + s;
    if (/^#[0-9a-f]{3}$/.test(s)) s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    return /^#[0-9a-f]{6}$/.test(s) ? s : null;
  }

  const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgbToHex = (r, g, b) =>
    '#' + [r, g, b].map((n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')).join('');

  function stamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }

  function calcSize(cols, rows, cell, gap, scale = 1) {
    return {
      w: (cols * cell + (cols - 1) * gap) * scale,
      h: (rows * cell + (rows - 1) * gap) * scale,
    };
  }

  function sizeOK(cols, rows, cell, gap, scale = 1) {
    const { w, h } = calcSize(cols, rows, cell, gap, scale);
    return w <= MAX_SIDE && h <= MAX_SIDE && w * h <= MAX_AREA;
  }

  function readFile(file, as) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error);
      if (as === 'text') fr.readAsText(file);
      else fr.readAsDataURL(file);
    });
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve) => {
      try {
        canvas.toBlob((b) => resolve(b), 'image/png');
      } catch (_) {
        resolve(null);
      }
    });
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // 色の近さ(人の目に近い簡易式)
  function colorDist(a, b) {
    const rm = (a[0] + b[0]) / 2;
    const dr = a[0] - b[0];
    const dg = a[1] - b[1];
    const db = a[2] - b[2];
    return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
  }

  /* ---------- 状態 ---------- */
  const state = {
    cols: 16,
    rows: 16,
    cell: 20,
    gap: 1,
    data: new Array(256).fill(null),
    color: '#ef7d57',
    tool: 'pen',
    prevTool: 'pen',
    mirror: false,
    palette: DEFAULT_PALETTE.slice(),
    recent: [],
    bg: 'dark',
    paletteEdit: false,
    panelCollapsed: false,
    ref: { show: false, overlay: false, opacity: 0.4, quantize: false, win: null },
  };
  const view = { zoom: 1, x: 0, y: 0, ready: false, sw: 0, sh: 0 };
  const history = { undo: [], redo: [] };

  /* ---------- DOM ---------- */
  const el = {
    app: $('#app'),
    stage: $('#stage'),
    holder: $('#canvasHolder'),
    board: $('#board'),
    overlay: $('#overlayImg'),
    mirrorLine: $('#mirrorLine'),
    hover: $('#hoverCell'),
    coord: $('#coordLabel'),
    zoomLabel: $('#zoomLabel'),
    zoomIn: $('#zoomInBtn'),
    zoomOut: $('#zoomOutBtn'),
    fit: $('#fitBtn'),
    undo: $('#undoBtn'),
    redo: $('#redoBtn'),
    panelToggle: $('#panelToggle'),
    exportOpen: $('#exportOpenBtn'),
    mirrorBtn: $('#mirrorBtn'),
    refToggle: $('#refToggleBtn'),
    toolColorBtn: $('#toolColorBtn'),
    toolColorSwatch: $('#toolColorSwatch'),
    refWin: $('#refWin'),
    refHead: $('#refHead'),
    refBody: $('#refBody'),
    refView: $('#refView'),
    refEmpty: $('#refEmpty'),
    refResize: $('#refResize'),
    refClose: $('#refClose'),
    refChip: $('#refChip'),
    toast: $('#toast'),
    curSwatch: $('#curSwatch'),
    colorInput: $('#colorInput'),
    hexInput: $('#hexInput'),
    recent: $('#recentList'),
    palette: $('#paletteList'),
    paletteAdd: $('#paletteAddBtn'),
    paletteEdit: $('#paletteEditBtn'),
    paletteReset: $('#paletteResetBtn'),
    refLoad: $('#refLoadBtn'),
    refRemove: $('#refRemoveBtn'),
    refInfo: $('#refInfo'),
    refShowChk: $('#refShowChk'),
    refOverlayChk: $('#refOverlayChk'),
    refOpacity: $('#refOpacity'),
    refOpacityOut: $('#refOpacityOut'),
    refQuantizeChk: $('#refQuantizeChk'),
    refImport: $('#refImportBtn'),
    sizeInfo: $('#sizeInfo'),
    bgSeg: $('#bgSeg'),
    projSave: $('#projSaveBtn'),
    projLoad: $('#projLoadBtn'),
    clear: $('#clearBtn'),
    refFile: $('#refFile'),
    projFile: $('#projectFile'),
    exportModal: $('#exportModal'),
    exportClose: $('#exportCloseBtn'),
    exportPreview: $('#exportPreview'),
    exportPreviewWrap: $('#exportPreviewWrap'),
    scaleSeg: $('#scaleSeg'),
    exportTrans: $('#exportTransChk'),
    exportBgRow: $('#exportBgRow'),
    exportBg: $('#exportBgInput'),
    exportSize: $('#exportSize'),
    exportDl: $('#exportDlBtn'),
    exportShare: $('#exportShareBtn'),
  };
  const bctx = el.board.getContext('2d');

  /* ---------- トースト ---------- */
  let toastTimer = 0;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 1900);
  }

  /* ---------- 保存・読み込み ---------- */
  let saveTimer = 0;
  let saveWarned = false;

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 400);
  }

  function saveNow() {
    clearTimeout(saveTimer);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          v: 1,
          cols: state.cols,
          rows: state.rows,
          cell: state.cell,
          gap: state.gap,
          data: state.data,
          color: state.color,
          palette: state.palette,
          recent: state.recent,
          bg: state.bg,
          mirror: state.mirror,
          panelCollapsed: state.panelCollapsed,
          ref: state.ref,
        })
      );
    } catch (_) {
      if (!saveWarned) {
        saveWarned = true;
        toast('自動保存できませんでした(ブラウザの保存容量を確認してください)');
      }
    }
  }

  function sanitizeColors(list, max) {
    if (!Array.isArray(list)) return null;
    const out = [];
    for (const c of list) {
      const h = normHex(c);
      if (h && !out.includes(h)) out.push(h);
      if (out.length >= max) break;
    }
    return out;
  }

  function loadSaved() {
    let s;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      s = JSON.parse(raw);
    } catch (_) {
      return;
    }
    if (!s || typeof s !== 'object') return;

    const cols = clampInt(s.cols, ...LIMITS.cols, 16);
    const rows = clampInt(s.rows, ...LIMITS.rows, 16);
    const cell = clampInt(s.cell, ...LIMITS.cell, 20);
    const gap = clampInt(s.gap, ...LIMITS.gap, 1);
    if (sizeOK(cols, rows, cell, gap)) {
      state.cols = cols;
      state.rows = rows;
      state.cell = cell;
      state.gap = gap;
      if (Array.isArray(s.data) && s.data.length === cols * rows) {
        state.data = s.data.map((c) => normHex(c));
      } else {
        state.data = new Array(cols * rows).fill(null);
      }
    }

    const color = normHex(s.color);
    if (color) state.color = color;
    const pal = sanitizeColors(s.palette, PALETTE_MAX);
    if (pal) state.palette = pal;
    const rec = sanitizeColors(s.recent, RECENT_MAX);
    if (rec) state.recent = rec;
    if (BG_MODES.includes(s.bg)) state.bg = s.bg;
    state.mirror = !!s.mirror;
    state.panelCollapsed = !!s.panelCollapsed;

    if (s.ref && typeof s.ref === 'object') {
      state.ref.show = !!s.ref.show;
      state.ref.overlay = !!s.ref.overlay;
      state.ref.quantize = !!s.ref.quantize;
      const op = Number(s.ref.opacity);
      if (Number.isFinite(op)) state.ref.opacity = clamp(op, 0.05, 1);
      const w = s.ref.win;
      if (w && [w.x, w.y, w.w, w.h].every((n) => Number.isFinite(n))) {
        state.ref.win = { x: w.x, y: w.y, w: w.w, h: w.h };
      }
    }
  }

  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
  });

  /* ---------- 履歴 ---------- */
  function snapshot() {
    return { cols: state.cols, rows: state.rows, data: state.data.slice() };
  }

  function pushHistory(snap) {
    history.undo.push(snap);
    if (history.undo.length > HISTORY_MAX) history.undo.shift();
    history.redo.length = 0;
    updateHistoryButtons();
  }

  function applySnap(snap) {
    const sizeChanged = snap.cols !== state.cols || snap.rows !== state.rows;
    state.cols = snap.cols;
    state.rows = snap.rows;
    state.data = snap.data.slice();
    if (sizeChanged) {
      resizeBoard();
      clampView();
      applyView();
      syncSettingsUI();
    } else {
      renderAll();
    }
    scheduleSave();
  }

  function undo() {
    if (stroke) return;
    const snap = history.undo.pop();
    if (!snap) return;
    history.redo.push(snapshot());
    applySnap(snap);
    updateHistoryButtons();
  }

  function redo() {
    if (stroke) return;
    const snap = history.redo.pop();
    if (!snap) return;
    history.undo.push(snapshot());
    applySnap(snap);
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    el.undo.disabled = history.undo.length === 0;
    el.redo.disabled = history.redo.length === 0;
  }

  /* ---------- 描画 ---------- */
  const pitch = () => state.cell + state.gap;
  const boardW = () => state.cols * state.cell + (state.cols - 1) * state.gap;
  const boardH = () => state.rows * state.cell + (state.rows - 1) * state.gap;
  const emptyFill = () => EMPTY_FILL[state.bg] || EMPTY_FILL.dark;

  function renderAll() {
    const { cols, rows, cell, data } = state;
    const p = pitch();
    const empty = emptyFill();
    bctx.clearRect(0, 0, el.board.width, el.board.height);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        bctx.fillStyle = data[y * cols + x] || empty;
        bctx.fillRect(x * p, y * p, cell, cell);
      }
    }
  }

  function drawCell(x, y) {
    const p = pitch();
    const c = state.cell;
    bctx.clearRect(x * p, y * p, c, c);
    bctx.fillStyle = state.data[y * state.cols + x] || emptyFill();
    bctx.fillRect(x * p, y * p, c, c);
  }

  function resizeBoard() {
    el.board.width = boardW();
    el.board.height = boardH();
    renderAll();
    applyView();
    updateSizeInfo();
  }

  function updateSizeInfo() {
    el.sizeInfo.textContent = `${boardW()} × ${boardH()} px`;
  }

  /* ---------- 表示(拡大・移動) ---------- */
  // 100%以上のときは端末のピクセルに合わせて隙間の太さを均一にする
  function snapZoom(z) {
    return z >= 1 ? Math.max(DPR, Math.round(z * DPR)) / DPR : z;
  }

  function applyView() {
    const w = boardW() * view.zoom;
    const h = boardH() * view.zoom;
    el.holder.style.width = w + 'px';
    el.holder.style.height = h + 'px';
    const rx = Math.round(view.x * DPR) / DPR;
    const ry = Math.round(view.y * DPR) / DPR;
    el.holder.style.transform = `translate(${rx}px, ${ry}px)`;
    el.zoomLabel.textContent = Math.round(view.zoom * 100) + '%';
    refreshHover();
  }

  function clampView() {
    const sw = el.stage.clientWidth;
    const sh = el.stage.clientHeight;
    if (!sw || !sh) return;
    const w = boardW() * view.zoom;
    const h = boardH() * view.zoom;
    const mx = Math.min(48, sw / 2);
    const my = Math.min(48, sh / 2);
    view.x = clamp(view.x, mx - w, sw - mx);
    view.y = clamp(view.y, my - h, sh - my);
  }

  function fitView() {
    const sw = el.stage.clientWidth;
    const sh = el.stage.clientHeight;
    if (!sw || !sh) return;
    const pad = Math.min(32, sw * 0.06);
    const availW = Math.max(sw - pad * 2, sw * 0.5);
    const availH = Math.max(sh - pad * 2 - 40, sh * 0.5);
    let z = Math.min(availW / boardW(), availH / boardH());
    z = clamp(z, ZMIN, ZMAX);
    if (z >= 1) z = Math.floor(z * DPR) / DPR;
    view.zoom = z;
    view.x = (sw - boardW() * z) / 2;
    view.y = (sh - boardH() * z) / 2;
    applyView();
  }

  function zoomAt(z, cx, cy) {
    z = clamp(z, ZMIN, ZMAX);
    const wx = (cx - view.x) / view.zoom;
    const wy = (cy - view.y) / view.zoom;
    view.zoom = z;
    view.x = cx - wx * z;
    view.y = cy - wy * z;
    clampView();
    applyView();
  }

  function stepZoom(dir, cx, cy) {
    let s = snapZoom(view.zoom * (dir > 0 ? 1.25 : 0.8));
    if (Math.abs(s - view.zoom) < 1e-6) s = snapZoom(view.zoom + dir / DPR);
    zoomAt(s, cx, cy);
  }

  function stageCenter() {
    return { x: el.stage.clientWidth / 2, y: el.stage.clientHeight / 2 };
  }

  function stagePoint(clientX, clientY) {
    const r = el.stage.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  function onStageResize() {
    const sw = el.stage.clientWidth;
    const sh = el.stage.clientHeight;
    if (!sw || !sh) return;
    if (!view.ready) {
      view.ready = true;
      view.sw = sw;
      view.sh = sh;
      fitView();
    } else {
      view.x += (sw - view.sw) / 2;
      view.y += (sh - view.sh) / 2;
      view.sw = sw;
      view.sh = sh;
      clampView();
      applyView();
    }
    applyRefWin();
  }

  /* ---------- マス座標 ---------- */
  function cellAt(clientX, clientY) {
    const r = el.board.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const lx = ((clientX - r.left) * el.board.width) / r.width;
    const ly = ((clientY - r.top) * el.board.height) / r.height;
    const p = pitch();
    const x = Math.floor(lx / p);
    const y = Math.floor(ly / p);
    const inside = lx >= 0 && ly >= 0 && x >= 0 && y >= 0 && x < state.cols && y < state.rows;
    return { x, y, inside };
  }

  /* ---------- ホバー表示(PC) ---------- */
  let lastMouse = null;
  let hoverCell = null;

  function showHover(c) {
    if (!c || !c.inside || state.tool === 'hand' || spaceDown) {
      hideHover();
      return;
    }
    hoverCell = c;
    const p = pitch() * view.zoom;
    const s = state.cell * view.zoom;
    el.hover.style.width = s + 'px';
    el.hover.style.height = s + 'px';
    el.hover.style.transform = `translate(${c.x * p}px, ${c.y * p}px)`;
    el.hover.style.background = state.tool === 'pen' ? state.color : 'transparent';
    el.hover.style.opacity = state.tool === 'pen' ? '0.75' : '1';
    el.hover.hidden = false;
    el.coord.textContent = `${c.x + 1}, ${c.y + 1}`;
  }

  function hideHover() {
    hoverCell = null;
    el.hover.hidden = true;
    el.coord.textContent = '';
  }

  function refreshHover() {
    if (lastMouse && hoverCell) showHover(cellAt(lastMouse.x, lastMouse.y));
  }

  /* ---------- ペン・消しゴム ---------- */
  let stroke = null;

  function beginStroke(c) {
    stroke = {
      snap: snapshot(),
      changed: false,
      last: null,
      value: state.tool === 'eraser' ? null : state.color,
    };
    strokeTo(c);
  }

  function setCellInStroke(x, y) {
    if (x < 0 || y < 0 || x >= state.cols || y >= state.rows) return;
    const i = y * state.cols + x;
    if (state.data[i] === stroke.value) return;
    state.data[i] = stroke.value;
    drawCell(x, y);
    stroke.changed = true;
  }

  function plot(x, y) {
    setCellInStroke(x, y);
    if (state.mirror) setCellInStroke(state.cols - 1 - x, y);
  }

  // ブレゼンハムで線をつなぐ(速く動かしても途切れない)
  function line(x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let guard = 0;
    for (;;) {
      plot(x0, y0);
      if ((x0 === x1 && y0 === y1) || ++guard > 100000) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  function strokeTo(c) {
    if (!stroke || !c) return;
    if (!stroke.last) plot(c.x, c.y);
    else if (stroke.last.x !== c.x || stroke.last.y !== c.y) line(stroke.last.x, stroke.last.y, c.x, c.y);
    stroke.last = { x: c.x, y: c.y };
  }

  function endStroke() {
    if (!stroke) return;
    const s = stroke;
    stroke = null;
    if (s.changed) {
      pushHistory(s.snap);
      if (s.value) addRecent(s.value);
      scheduleSave();
    }
  }

  function cancelStroke() {
    if (!stroke) return;
    const s = stroke;
    stroke = null;
    if (s.changed) {
      state.data = s.snap.data;
      renderAll();
    }
  }

  /* ---------- バケツ ---------- */
  function floodFill(sx, sy, val) {
    const { cols, rows, data } = state;
    const target = data[sy * cols + sx];
    if (target === val) return false;
    const seen = new Uint8Array(cols * rows);
    const stack = [sx, sy];
    while (stack.length) {
      const y = stack.pop();
      const x = stack.pop();
      const i = y * cols + x;
      if (seen[i]) continue;
      seen[i] = 1;
      if (data[i] !== target) continue;
      data[i] = val;
      if (x > 0) stack.push(x - 1, y);
      if (x < cols - 1) stack.push(x + 1, y);
      if (y > 0) stack.push(x, y - 1);
      if (y < rows - 1) stack.push(x, y + 1);
    }
    return true;
  }

  function doFill(c) {
    const snap = snapshot();
    if (floodFill(c.x, c.y, state.color)) {
      pushHistory(snap);
      addRecent(state.color);
      renderAll();
      scheduleSave();
    }
  }

  /* ---------- スポイト ---------- */
  function pickFromBoard(c) {
    const col = state.data[c.y * state.cols + c.x];
    if (!col) {
      toast('色が塗られていないマスです');
      return;
    }
    setColor(col);
    toast(`色を拾いました ${col.toUpperCase()}`);
    setTool(state.prevTool);
  }

  /* ---------- ツール ---------- */
  function setTool(t) {
    if (!TOOLS.includes(t)) return;
    if (t === 'picker' && state.tool !== 'picker') {
      state.prevTool = state.tool === 'fill' ? 'fill' : 'pen';
    }
    state.tool = t;
    $$('.tool-btn[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
    el.stage.dataset.tool = t;
    el.refWin.classList.toggle('picking', t === 'picker');
    if (lastMouse && hoverCell) showHover(cellAt(lastMouse.x, lastMouse.y));
  }

  function toggleMirror() {
    state.mirror = !state.mirror;
    updateMirrorUI();
    toast(state.mirror ? '左右対称:オン' : '左右対称:オフ');
    scheduleSave();
  }

  function updateMirrorUI() {
    el.mirrorBtn.setAttribute('aria-pressed', String(state.mirror));
    el.mirrorLine.hidden = !state.mirror;
  }

  /* ---------- 色 ---------- */
  function setColor(hex) {
    const h = normHex(hex);
    if (!h) return;
    state.color = h;
    if (el.colorInput.value !== h) el.colorInput.value = h;
    if (document.activeElement !== el.hexInput) el.hexInput.value = h.toUpperCase();
    el.curSwatch.style.background = h;
    el.toolColorSwatch.style.background = h;
    highlightSwatches();
    if (hoverCell && state.tool === 'pen') el.hover.style.background = h;
    scheduleSave();
  }

  function addRecent(hex) {
    const i = state.recent.indexOf(hex);
    if (i === 0) return;
    if (i > 0) state.recent.splice(i, 1);
    state.recent.unshift(hex);
    if (state.recent.length > RECENT_MAX) state.recent.length = RECENT_MAX;
    renderRecent();
  }

  function makeSwatch(c, i) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.style.setProperty('--c', c);
    b.dataset.index = String(i);
    b.dataset.color = c;
    b.title = c.toUpperCase();
    b.setAttribute('aria-label', c.toUpperCase());
    if (c === state.color) b.classList.add('active');
    return b;
  }

  function renderPalette() {
    el.palette.textContent = '';
    if (!state.palette.length) {
      const p = document.createElement('p');
      p.className = 'empty-msg';
      p.textContent = 'パレットが空です。「＋追加」でいまの色を登録できます。';
      el.palette.appendChild(p);
    } else {
      const frag = document.createDocumentFragment();
      state.palette.forEach((c, i) => frag.appendChild(makeSwatch(c, i)));
      el.palette.appendChild(frag);
    }
    el.palette.classList.toggle('editing', state.paletteEdit);
    el.paletteEdit.setAttribute('aria-pressed', String(state.paletteEdit));
    el.paletteEdit.textContent = state.paletteEdit ? '完了' : '削除';
  }

  function renderRecent() {
    el.recent.textContent = '';
    if (!state.recent.length) {
      const s = document.createElement('span');
      s.className = 'empty-msg';
      s.textContent = '塗った色がここに並びます';
      el.recent.appendChild(s);
      return;
    }
    const frag = document.createDocumentFragment();
    state.recent.forEach((c, i) => frag.appendChild(makeSwatch(c, i)));
    el.recent.appendChild(frag);
  }

  function highlightSwatches() {
    $$('.swatch', el.palette).forEach((b) => b.classList.toggle('active', b.dataset.color === state.color));
    $$('.swatch', el.recent).forEach((b) => b.classList.toggle('active', b.dataset.color === state.color));
  }

  /* ---------- 設定 ---------- */
  function syncSettingsUI() {
    $$('.stepper').forEach((st) => {
      const key = st.dataset.key;
      const [mn, mx] = LIMITS[key];
      const input = $('input', st);
      input.min = String(mn);
      input.max = String(mx);
      input.value = String(state[key]);
      $('button[data-step="-1"]', st).disabled = state[key] <= mn;
      $('button[data-step="1"]', st).disabled = state[key] >= mx;
    });
    updateSizeInfo();
    $$('button', el.bgSeg).forEach((b) => b.classList.toggle('active', b.dataset.bg === state.bg));
  }

  function commitSetting(key, raw) {
    const [mn, mx] = LIMITS[key];
    let v = parseInt(raw, 10);
    if (!Number.isFinite(v)) {
      syncSettingsUI();
      return;
    }
    v = clamp(v, mn, mx);
    if (v === state[key]) {
      syncSettingsUI();
      return;
    }
    const next = { cols: state.cols, rows: state.rows, cell: state.cell, gap: state.gap };
    next[key] = v;
    if (!sizeOK(next.cols, next.rows, next.cell, next.gap)) {
      toast(`大きすぎます(画像が${MAX_SIDE}px以内になるようにしてください)`);
      syncSettingsUI();
      return;
    }
    if (key === 'cols' || key === 'rows') {
      resizeGrid(next.cols, next.rows);
    } else {
      // 見た目の中心を保ったままサイズ変更
      const cx = view.x + (boardW() * view.zoom) / 2;
      const cy = view.y + (boardH() * view.zoom) / 2;
      state[key] = v;
      resizeBoard();
      view.x = cx - (boardW() * view.zoom) / 2;
      view.y = cy - (boardH() * view.zoom) / 2;
      clampView();
      applyView();
      scheduleSave();
    }
    syncSettingsUI();
  }

  function resizeGrid(nc, nr) {
    const snap = snapshot();
    const nd = new Array(nc * nr).fill(null);
    const cw = Math.min(nc, state.cols);
    const ch = Math.min(nr, state.rows);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) nd[y * nc + x] = state.data[y * state.cols + x];
    }
    state.cols = nc;
    state.rows = nr;
    state.data = nd;
    pushHistory(snap);
    resizeBoard();
    clampView();
    applyView();
    scheduleSave();
  }

  function setBg(mode) {
    if (!BG_MODES.includes(mode)) return;
    state.bg = mode;
    el.holder.classList.remove('bg-dark', 'bg-light', 'bg-checker');
    el.holder.classList.add('bg-' + mode);
    renderAll();
    syncSettingsUI();
    scheduleSave();
  }

  function clearAll() {
    if (!state.data.some(Boolean)) {
      toast('まだ何も描かれていません');
      return;
    }
    if (!window.confirm('全部のマスを消します。よろしいですか?\n(「元に戻す」で戻せます)')) return;
    const snap = snapshot();
    state.data = new Array(state.cols * state.rows).fill(null);
    pushHistory(snap);
    renderAll();
    scheduleSave();
    toast('全部消しました');
  }

  /* ---------- 作品データ(JSON) ---------- */
  function saveProject() {
    const json = JSON.stringify({
      app: 'dotgap',
      version: 1,
      cols: state.cols,
      rows: state.rows,
      cell: state.cell,
      gap: state.gap,
      data: state.data,
      palette: state.palette,
    });
    downloadBlob(new Blob([json], { type: 'application/json' }), `dotart_${state.cols}x${state.rows}_${stamp()}.json`);
    toast('データを保存しました');
  }

  async function loadProject(file) {
    let s;
    try {
      s = JSON.parse(await readFile(file, 'text'));
    } catch (_) {
      toast('データを開けませんでした(.json ファイルを選んでください)');
      return;
    }
    const ok =
      s && typeof s === 'object' &&
      Number.isInteger(s.cols) && Number.isInteger(s.rows) &&
      Array.isArray(s.data) && s.data.length === s.cols * s.rows &&
      s.cols >= LIMITS.cols[0] && s.cols <= LIMITS.cols[1] &&
      s.rows >= LIMITS.rows[0] && s.rows <= LIMITS.rows[1];
    if (!ok) {
      toast('このファイルは DOT GAP のデータではないようです');
      return;
    }
    const cell = clampInt(s.cell, ...LIMITS.cell, state.cell);
    const gap = clampInt(s.gap, ...LIMITS.gap, state.gap);
    if (!sizeOK(s.cols, s.rows, cell, gap)) {
      toast('サイズが大きすぎて開けません');
      return;
    }
    const snap = snapshot();
    state.cols = s.cols;
    state.rows = s.rows;
    state.cell = cell;
    state.gap = gap;
    state.data = s.data.map((c) => normHex(c));
    const pal = sanitizeColors(s.palette, PALETTE_MAX);
    if (pal) {
      for (const c of pal) {
        if (state.palette.length >= PALETTE_MAX) break;
        if (!state.palette.includes(c)) state.palette.push(c);
      }
      renderPalette();
    }
    pushHistory(snap);
    resizeBoard();
    fitView();
    syncSettingsUI();
    scheduleSave();
    toast('データを開きました');
  }

  /* ---------- 参考画像 ---------- */
  let refCanvas = null;
  let refCtx = null;
  let refPixels = null;

  function loadRefFromSrc(src, persist) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const nw = img.naturalWidth || img.width;
        const nh = img.naturalHeight || img.height;
        if (!nw || !nh) {
          toast('画像を読み込めませんでした');
          resolve(false);
          return;
        }
        const s = Math.min(1, REF_MAX_SIDE / Math.max(nw, nh));
        const w = Math.max(1, Math.round(nw * s));
        const h = Math.max(1, Math.round(nh * s));
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        refCanvas = c;
        refCtx = ctx;
        refPixels = null;

        el.refView.width = w;
        el.refView.height = h;
        const vctx = el.refView.getContext('2d');
        vctx.clearRect(0, 0, w, h);
        vctx.drawImage(c, 0, 0);

        let url = null;
        try {
          url = c.toDataURL('image/png');
        } catch (_) {
          url = null;
        }
        el.overlay.src = url || src;

        if (persist) {
          state.ref.show = true;
          saveRef(url);
          scheduleSave();
        }
        updateRefUI();
        resolve(true);
      };
      img.onerror = () => {
        toast('画像を読み込めませんでした(別の画像で試してください)');
        resolve(false);
      };
      img.src = src;
    });
  }

  function saveRef(pngUrl) {
    const tryStore = (v) => {
      try {
        localStorage.setItem(REF_KEY, v);
        return true;
      } catch (_) {
        return false;
      }
    };
    if (pngUrl && pngUrl.length < 4500000 && tryStore(pngUrl)) return;
    let jpg = null;
    try {
      jpg = refCanvas.toDataURL('image/jpeg', 0.88);
    } catch (_) {
      jpg = null;
    }
    if (jpg && tryStore(jpg)) return;
    try { localStorage.removeItem(REF_KEY); } catch (_) { /* 無視 */ }
    toast('参考画像が大きいため、次回は読み込み直しが必要です');
  }

  function removeRef() {
    if (!refCanvas) return;
    refCanvas = null;
    refCtx = null;
    refPixels = null;
    el.overlay.removeAttribute('src');
    state.ref.overlay = false;
    try { localStorage.removeItem(REF_KEY); } catch (_) { /* 無視 */ }
    updateRefUI();
    scheduleSave();
    toast('参考画像を外しました');
  }

  async function handleRefFile(file) {
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) {
      toast('画像ファイルを選んでください');
      return;
    }
    try {
      const src = await readFile(file, 'dataurl');
      const ok = await loadRefFromSrc(src, true);
      if (ok) toast('参考画像を読み込みました');
    } catch (_) {
      toast('画像を読み込めませんでした');
    }
  }

  function updateRefUI() {
    const has = !!refCanvas;
    el.refWin.hidden = !state.ref.show;
    el.refToggle.setAttribute('aria-pressed', String(state.ref.show));
    el.refShowChk.checked = state.ref.show;
    el.refOverlayChk.checked = state.ref.overlay && has;
    el.refOverlayChk.disabled = !has;
    el.refOpacity.disabled = !has;
    el.refQuantizeChk.checked = state.ref.quantize;
    el.refQuantizeChk.disabled = !has;
    el.refImport.disabled = !has;
    el.refRemove.disabled = !has;
    el.refView.hidden = !has;
    el.refEmpty.hidden = has;
    el.overlay.hidden = !(has && state.ref.overlay);
    el.overlay.style.opacity = String(state.ref.opacity);
    const pct = Math.round(state.ref.opacity * 100);
    el.refOpacity.value = String(pct);
    el.refOpacityOut.textContent = pct + '%';
    el.refInfo.textContent = has
      ? `読み込み済み(${refCanvas.width} × ${refCanvas.height} px)`
      : '画像はまだありません';
    el.refWin.classList.toggle('picking', state.tool === 'picker');
    applyRefWin();
  }

  function applyRefWin() {
    if (el.refWin.hidden) return;
    const sw = el.stage.clientWidth;
    const sh = el.stage.clientHeight;
    if (!sw || !sh) return;
    let r = state.ref.win;
    if (!r) {
      const w = Math.round(Math.min(260, sw * 0.42));
      const h = Math.round(Math.min(240, sh * 0.45));
      r = { x: sw - w - 12, y: 12, w, h };
    }
    const minW = Math.min(150, sw);
    const minH = Math.min(120, sh);
    r.w = clamp(r.w, minW, sw);
    r.h = clamp(r.h, minH, sh);
    r.x = clamp(r.x, 0, sw - r.w);
    r.y = clamp(r.y, 0, sh - r.h);
    state.ref.win = r;
    el.refWin.style.width = r.w + 'px';
    el.refWin.style.height = r.h + 'px';
    el.refWin.style.transform = `translate(${Math.round(r.x)}px, ${Math.round(r.y)}px)`;
    layoutRefView();
  }

  function layoutRefView() {
    if (!refCanvas) return;
    const bw = el.refBody.clientWidth - 8;
    const bh = el.refBody.clientHeight - 8;
    if (bw <= 0 || bh <= 0) return;
    const s = Math.min(bw / refCanvas.width, bh / refCanvas.height);
    el.refView.style.width = refCanvas.width * s + 'px';
    el.refView.style.height = refCanvas.height * s + 'px';
  }

  function sampleRef(clientX, clientY) {
    if (!refCanvas) return null;
    const r = el.refView.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null;
    const ix = clamp(Math.floor(((clientX - r.left) / r.width) * refCanvas.width), 0, refCanvas.width - 1);
    const iy = clamp(Math.floor(((clientY - r.top) / r.height) * refCanvas.height), 0, refCanvas.height - 1);
    let d;
    try {
      d = refCtx.getImageData(ix, iy, 1, 1).data;
    } catch (_) {
      return null;
    }
    if (d[3] < 16) return 'transparent';
    return rgbToHex(d[0], d[1], d[2]);
  }

  function importRefToGrid() {
    if (!refCanvas) return;
    if (state.data.some(Boolean) &&
      !window.confirm('いまの絵に上書きして、参考画像をドット化して取り込みます。\n(「元に戻す」で戻せます)')) return;

    const iw = refCanvas.width;
    const ih = refCanvas.height;
    if (!refPixels) {
      try {
        refPixels = refCtx.getImageData(0, 0, iw, ih).data;
      } catch (_) {
        toast('この画像は取り込めませんでした');
        return;
      }
    }
    const px = refPixels;
    const { cols, rows } = state;
    const s = Math.min(cols / iw, rows / ih); // 画像1pxあたりのマス数
    const ox = (cols - iw * s) / 2;
    const oy = (rows - ih * s) / 2;
    const pal = state.ref.quantize && state.palette.length ? state.palette.map((c) => [c, hexToRgb(c)]) : null;
    const nd = new Array(cols * rows).fill(null);

    for (let cy = 0; cy < rows; cy++) {
      const y0 = (cy - oy) / s;
      const y1 = (cy + 1 - oy) / s;
      if (y1 <= 0 || y0 >= ih) continue;
      const ya = clamp(Math.floor(y0), 0, ih - 1);
      const yb = clamp(Math.ceil(y1), ya + 1, ih);
      for (let cx = 0; cx < cols; cx++) {
        const x0 = (cx - ox) / s;
        const x1 = (cx + 1 - ox) / s;
        if (x1 <= 0 || x0 >= iw) continue;
        const xa = clamp(Math.floor(x0), 0, iw - 1);
        const xb = clamp(Math.ceil(x1), xa + 1, iw);
        let sr = 0, sg = 0, sb = 0, sa = 0, n = 0;
        for (let y = ya; y < yb; y++) {
          let i = (y * iw + xa) * 4;
          for (let x = xa; x < xb; x++, i += 4) {
            const a = px[i + 3];
            sr += px[i] * a;
            sg += px[i + 1] * a;
            sb += px[i + 2] * a;
            sa += a;
            n++;
          }
        }
        if (!n || sa / n < 128) continue;
        const rgb = [sr / sa, sg / sa, sb / sa];
        let hex;
        if (pal) {
          let best = pal[0][0];
          let bd = Infinity;
          for (const [h, prgb] of pal) {
            const d = colorDist(rgb, prgb);
            if (d < bd) { bd = d; best = h; }
          }
          hex = best;
        } else {
          hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
        }
        nd[cy * cols + cx] = hex;
      }
    }

    const snap = snapshot();
    state.data = nd;
    pushHistory(snap);
    renderAll();
    scheduleSave();
    toast('ドット化して取り込みました');
  }

  /* ---------- 参考ウィンドウの操作 ---------- */
  let refDrag = null;
  let refSize = null;
  let refPicking = false;

  el.refHead.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    e.stopPropagation();
    const r = state.ref.win;
    if (!r) return;
    try { el.refHead.setPointerCapture(e.pointerId); } catch (_) { /* 無視 */ }
    refDrag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: r.x, oy: r.y };
  });
  el.refHead.addEventListener('pointermove', (e) => {
    if (!refDrag || refDrag.id !== e.pointerId) return;
    state.ref.win.x = refDrag.ox + (e.clientX - refDrag.sx);
    state.ref.win.y = refDrag.oy + (e.clientY - refDrag.sy);
    applyRefWin();
  });
  const endRefDrag = (e) => {
    if (!refDrag || refDrag.id !== e.pointerId) return;
    refDrag = null;
    scheduleSave();
  };
  el.refHead.addEventListener('pointerup', endRefDrag);
  el.refHead.addEventListener('pointercancel', endRefDrag);

  el.refResize.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const r = state.ref.win;
    if (!r) return;
    try { el.refResize.setPointerCapture(e.pointerId); } catch (_) { /* 無視 */ }
    refSize = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ow: r.w, oh: r.h };
  });
  el.refResize.addEventListener('pointermove', (e) => {
    if (!refSize || refSize.id !== e.pointerId) return;
    state.ref.win.w = refSize.ow + (e.clientX - refSize.sx);
    state.ref.win.h = refSize.oh + (e.clientY - refSize.sy);
    applyRefWin();
  });
  const endRefSize = (e) => {
    if (!refSize || refSize.id !== e.pointerId) return;
    refSize = null;
    scheduleSave();
  };
  el.refResize.addEventListener('pointerup', endRefSize);
  el.refResize.addEventListener('pointercancel', endRefSize);

  el.refBody.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (!refCanvas) return; // 空のときは click で読み込み
    e.preventDefault();
    if (state.tool !== 'picker') {
      toast('スポイトを選ぶと、この画像から色を拾えます');
      return;
    }
    try { el.refBody.setPointerCapture(e.pointerId); } catch (_) { /* 無視 */ }
    refPicking = true;
    previewRefPick(e);
  });
  el.refBody.addEventListener('pointermove', (e) => {
    if (refPicking) previewRefPick(e);
  });
  el.refBody.addEventListener('pointerup', (e) => {
    if (!refPicking) return;
    refPicking = false;
    el.refChip.classList.remove('show');
    const col = sampleRef(e.clientX, e.clientY);
    if (!col) return;
    if (col === 'transparent') {
      toast('透明な部分です');
      return;
    }
    setColor(col);
    toast(`色を拾いました ${col.toUpperCase()}`);
    setTool(state.prevTool);
  });
  el.refBody.addEventListener('pointercancel', () => {
    refPicking = false;
    el.refChip.classList.remove('show');
  });
  el.refBody.addEventListener('click', () => {
    if (!refCanvas) el.refFile.click();
  });

  function previewRefPick(e) {
    const col = sampleRef(e.clientX, e.clientY);
    if (col && col !== 'transparent') {
      el.refChip.style.background = col;
      el.refChip.classList.add('show');
    } else {
      el.refChip.classList.remove('show');
    }
  }

  el.refClose.addEventListener('click', () => {
    state.ref.show = false;
    updateRefUI();
    scheduleSave();
  });

  /* ---------- ステージのポインター操作 ---------- */
  const pointers = new Map();
  let gesture = null;
  let gestureLock = false;
  let panDrag = null;
  let spaceDown = false;

  function blurInputs() {
    const a = document.activeElement;
    if (a && a.tagName === 'INPUT' && typeof a.blur === 'function') a.blur();
  }

  function startGesture() {
    const [a, b] = Array.from(pointers.values());
    const m = stagePoint((a.x + b.x) / 2, (a.y + b.y) / 2);
    gesture = {
      d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      z0: view.zoom,
      wx: (m.x - view.x) / view.zoom,
      wy: (m.y - view.y) / view.zoom,
      mid: m,
    };
  }

  function updateGesture() {
    const [a, b] = Array.from(pointers.values());
    const m = stagePoint((a.x + b.x) / 2, (a.y + b.y) / 2);
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const z = clamp((gesture.z0 * d) / gesture.d0, ZMIN, ZMAX);
    view.zoom = z;
    view.x = m.x - gesture.wx * z;
    view.y = m.y - gesture.wy * z;
    gesture.mid = m;
    clampView();
    applyView();
  }

  function endGesture() {
    if (!gesture) return;
    const m = gesture.mid;
    gesture = null;
    zoomAt(snapZoom(view.zoom), m.x, m.y);
  }

  el.stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.ref-win, .zoom-ctrl')) return;
    e.preventDefault();
    blurInputs();
    try { el.stage.setPointerCapture(e.pointerId); } catch (_) { /* 無視 */ }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 2本指:描きかけを取り消して拡大・移動モードへ
    if (pointers.size >= 2) {
      cancelStroke();
      panDrag = null;
      el.stage.classList.remove('grabbing');
      if (pointers.size === 2) startGesture();
      gestureLock = true;
      hideHover();
      return;
    }
    if (gestureLock) return;

    const panMode = state.tool === 'hand' || spaceDown || e.button === 1 || e.button === 2;
    if (panMode) {
      panDrag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
      el.stage.classList.add('grabbing');
      return;
    }
    if (e.button !== 0) return;

    const c = cellAt(e.clientX, e.clientY);
    if (!c) return;
    if (state.tool === 'pen' || state.tool === 'eraser') {
      beginStroke(c);
    } else if (state.tool === 'fill') {
      if (c.inside) doFill(c);
    } else if (state.tool === 'picker') {
      if (c.inside) pickFromBoard(c);
    }
    if (e.pointerType === 'mouse') {
      lastMouse = { x: e.clientX, y: e.clientY };
      showHover(c);
    }
  });

  el.stage.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') lastMouse = { x: e.clientX, y: e.clientY };

    if (!pointers.has(e.pointerId)) {
      if (e.pointerType === 'mouse') {
        if (e.target.closest('.ref-win, .zoom-ctrl')) hideHover();
        else showHover(cellAt(e.clientX, e.clientY));
      }
      return;
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (gesture) {
      if (pointers.size >= 2) updateGesture();
      return;
    }
    if (gestureLock) return;

    if (panDrag) {
      if (panDrag.id !== e.pointerId) return;
      view.x = panDrag.ox + (e.clientX - panDrag.sx);
      view.y = panDrag.oy + (e.clientY - panDrag.sy);
      clampView();
      applyView();
      return;
    }

    if (stroke) {
      const list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null;
      if (list && list.length) {
        for (const ce of list) strokeTo(cellAt(ce.clientX, ce.clientY));
      } else {
        strokeTo(cellAt(e.clientX, e.clientY));
      }
    }
    if (e.pointerType === 'mouse') showHover(cellAt(e.clientX, e.clientY));
  });

  function onPointerEnd(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (gesture) {
      if (pointers.size >= 2) startGesture();
      else endGesture();
    }
    if (pointers.size === 0) {
      gestureLock = false;
      endStroke();
      if (panDrag) {
        panDrag = null;
        el.stage.classList.remove('grabbing');
      }
    }
  }
  el.stage.addEventListener('pointerup', onPointerEnd);
  el.stage.addEventListener('pointercancel', onPointerEnd);
  el.stage.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse' && !pointers.size) {
      lastMouse = null;
      hideHover();
    }
  });
  el.stage.addEventListener('contextmenu', (e) => e.preventDefault());

  // ホイールで拡大縮小(トラックパッドのピンチにも対応)
  let wheelAcc = 0;
  let wheelSnapTimer = 0;
  el.stage.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (e.target.closest('.ref-win')) return;
      const p = stagePoint(e.clientX, e.clientY);
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= el.stage.clientHeight;
      if (e.ctrlKey) {
        zoomAt(view.zoom * Math.exp(-dy * 0.01), p.x, p.y);
        clearTimeout(wheelSnapTimer);
        wheelSnapTimer = setTimeout(() => zoomAt(snapZoom(view.zoom), p.x, p.y), 160);
      } else {
        wheelAcc += dy;
        if (Math.abs(wheelAcc) >= 40) {
          stepZoom(wheelAcc < 0 ? 1 : -1, p.x, p.y);
          wheelAcc = 0;
        }
      }
    },
    { passive: false }
  );

  /* ---------- Safari の拡大・コピー対策 ---------- */
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((t) =>
    document.addEventListener(t, (e) => e.preventDefault(), { passive: false })
  );
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches && e.touches.length > 1) e.preventDefault();
    },
    { passive: false }
  );
  document.addEventListener('selectstart', (e) => {
    if (!e.target.closest || !e.target.closest('input')) e.preventDefault();
  });

  /* ---------- キーボード ---------- */
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    const typing =
      t && ((t.tagName === 'INPUT' && ['text', 'number'].includes(t.type)) || t.tagName === 'TEXTAREA');

    if (!el.exportModal.hidden) {
      if (e.key === 'Escape') closeExport();
      return;
    }

    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (mod && key === 'z') {
      if (typing) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && key === 'y') {
      if (typing) return;
      e.preventDefault();
      redo();
      return;
    }
    if (typing || mod || e.altKey) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
      if (!spaceDown) {
        spaceDown = true;
        el.stage.classList.add('space-pan');
        hideHover();
      }
      return;
    }

    const c = stageCenter();
    switch (key) {
      case 'b': setTool('pen'); break;
      case 'e': setTool('eraser'); break;
      case 'g': setTool('fill'); break;
      case 'i': setTool('picker'); break;
      case 'h': setTool('hand'); break;
      case 'm': toggleMirror(); break;
      case '0': fitView(); break;
      case '+':
      case '=':
      case ';': stepZoom(1, c.x, c.y); break;
      case '-': stepZoom(-1, c.x, c.y); break;
      case 'escape': if (state.paletteEdit) { state.paletteEdit = false; renderPalette(); } break;
      default: break;
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && spaceDown) {
      spaceDown = false;
      el.stage.classList.remove('space-pan');
    }
  });
  window.addEventListener('blur', () => {
    spaceDown = false;
    el.stage.classList.remove('space-pan');
  });

  /* ---------- 書き出し ---------- */
  let exportScale = 2;
  let exportCache = { key: '', blob: null, busy: null };
  const SCALES = [1, 2, 3, 4, 8];
  let canShareFiles = false;
  try {
    canShareFiles = !!(
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [new File([new Blob([''])], 'x.png', { type: 'image/png' })] })
    );
  } catch (_) {
    canShareFiles = false;
  }

  function buildExportCanvas(scale, transparent, bg) {
    const w = boardW() * scale;
    const h = boardH() * scale;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!transparent) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    }
    const p = pitch() * scale;
    const s = state.cell * scale;
    const { cols, rows, data } = state;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const col = data[y * cols + x];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x * p, y * p, s, s);
      }
    }
    return c;
  }

  function validScales() {
    return SCALES.filter((s) => sizeOK(state.cols, state.rows, state.cell, state.gap, s));
  }

  function exportKey() {
    return `${exportScale}|${el.exportTrans.checked}|${el.exportBg.value}`;
  }

  function exportName() {
    return `dotart_${state.cols}x${state.rows}_${stamp()}.png`;
  }

  function prepareExportBlob() {
    const key = exportKey();
    if (exportCache.key === key) {
      if (exportCache.blob) return Promise.resolve(exportCache.blob);
      if (exportCache.busy) return exportCache.busy;
    }
    const c = buildExportCanvas(exportScale, el.exportTrans.checked, el.exportBg.value);
    const busy = canvasToBlob(c).then((blob) => {
      if (exportCache.key === key) {
        exportCache.blob = blob;
        exportCache.busy = null;
      }
      return blob;
    });
    exportCache = { key, blob: null, busy };
    return busy;
  }

  function updateExportUI() {
    const ok = validScales();
    if (!ok.includes(exportScale)) {
      const lower = ok.filter((s) => s <= exportScale);
      exportScale = lower.length ? lower[lower.length - 1] : ok[0] || 1;
    }
    $$('button', el.scaleSeg).forEach((b) => {
      const s = Number(b.dataset.scale);
      b.disabled = !ok.includes(s);
      b.classList.toggle('active', s === exportScale);
    });
    const trans = el.exportTrans.checked;
    el.exportBgRow.hidden = trans;
    el.exportSize.textContent = `${boardW() * exportScale} × ${boardH() * exportScale} px`;

    // プレビュー
    const src = buildExportCanvas(1, trans, el.exportBg.value);
    const pv = el.exportPreview;
    pv.width = src.width;
    pv.height = src.height;
    const pctx = pv.getContext('2d');
    pctx.clearRect(0, 0, pv.width, pv.height);
    pctx.drawImage(src, 0, 0);
    el.exportPreviewWrap.classList.toggle('checker', trans);
    el.exportPreviewWrap.style.background = trans ? '' : el.exportBg.value;
    const boxW = Math.max(40, el.exportPreviewWrap.clientWidth - 28);
    const boxH = Math.max(80, Math.min(window.innerHeight * 0.36, 340));
    let s = Math.min(boxW / pv.width, boxH / pv.height);
    if (s >= 1) s = Math.floor(s * DPR) / DPR || 1;
    pv.style.width = pv.width * s + 'px';
    pv.style.height = pv.height * s + 'px';

    prepareExportBlob();
  }

  function openExport() {
    if (stroke) return;
    el.exportShare.hidden = !canShareFiles;
    exportCache = { key: '', blob: null, busy: null };
    el.exportModal.hidden = false;
    updateExportUI();
    if (!state.data.some(Boolean)) toast('まだ何も描かれていません');
  }

  function closeExport() {
    el.exportModal.hidden = true;
    exportCache = { key: '', blob: null, busy: null };
  }

  el.exportOpen.addEventListener('click', openExport);
  el.exportClose.addEventListener('click', closeExport);
  el.exportModal.addEventListener('click', (e) => {
    if (e.target === el.exportModal) closeExport();
  });
  el.scaleSeg.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-scale]');
    if (!b || b.disabled) return;
    exportScale = Number(b.dataset.scale);
    updateExportUI();
  });
  el.exportTrans.addEventListener('change', updateExportUI);
  el.exportBg.addEventListener('input', updateExportUI);

  el.exportDl.addEventListener('click', async () => {
    const blob = await prepareExportBlob();
    if (!blob) {
      toast('書き出しに失敗しました(倍率を下げて試してください)');
      return;
    }
    downloadBlob(blob, exportName());
    toast('PNGを保存しました');
  });

  el.exportShare.addEventListener('click', async () => {
    // Safari はタップ直後でないと共有できないため、用意済みのデータを優先
    let blob = exportCache.key === exportKey() ? exportCache.blob : null;
    if (!blob) blob = await prepareExportBlob();
    if (!blob) {
      toast('書き出しに失敗しました(倍率を下げて試してください)');
      return;
    }
    const file = new File([blob], exportName(), { type: 'image/png' });
    try {
      await navigator.share({ files: [file] });
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      if (err && err.name === 'NotAllowedError') {
        toast('もう一度「共有・写真に保存」をタップしてください');
        return;
      }
      toast('共有できませんでした。「PNGを保存」を使ってください');
    }
  });

  /* ---------- UIイベント ---------- */
  $$('.tool-btn[data-tool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
  el.mirrorBtn.addEventListener('click', toggleMirror);
  el.refToggle.addEventListener('click', () => {
    state.ref.show = !state.ref.show;
    updateRefUI();
    scheduleSave();
  });

  el.undo.addEventListener('click', undo);
  el.redo.addEventListener('click', redo);

  el.zoomIn.addEventListener('click', () => {
    const c = stageCenter();
    stepZoom(1, c.x, c.y);
  });
  el.zoomOut.addEventListener('click', () => {
    const c = stageCenter();
    stepZoom(-1, c.x, c.y);
  });
  el.fit.addEventListener('click', fitView);

  function selectTab(name) {
    $$('.tab').forEach((t) => {
      const on = t.dataset.tab === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    $$('.tab-body').forEach((b) => b.classList.toggle('active', b.dataset.panel === name));
  }
  $$('.tab').forEach((t) => t.addEventListener('click', () => selectTab(t.dataset.tab)));

  function setPanelCollapsed(v) {
    state.panelCollapsed = v;
    el.app.classList.toggle('panel-collapsed', v);
    el.panelToggle.setAttribute('aria-pressed', String(!v));
    scheduleSave();
  }
  el.panelToggle.addEventListener('click', () => setPanelCollapsed(!state.panelCollapsed));

  el.toolColorBtn.addEventListener('click', () => {
    selectTab('color');
    if (state.panelCollapsed) setPanelCollapsed(false);
  });

  // 色
  el.colorInput.addEventListener('input', () => setColor(el.colorInput.value));
  el.colorInput.addEventListener('change', () => setColor(el.colorInput.value));
  el.hexInput.addEventListener('change', () => {
    const h = normHex(el.hexInput.value);
    if (h) setColor(h);
    else toast('カラーコードは #RRGGBB の形で入力してください');
    el.hexInput.value = state.color.toUpperCase();
  });
  el.hexInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el.hexInput.blur();
  });
  el.hexInput.addEventListener('blur', () => {
    el.hexInput.value = state.color.toUpperCase();
  });

  el.palette.addEventListener('click', (e) => {
    const b = e.target.closest('.swatch');
    if (!b) return;
    const i = Number(b.dataset.index);
    if (state.paletteEdit) {
      state.palette.splice(i, 1);
      renderPalette();
      scheduleSave();
    } else {
      setColor(state.palette[i]);
    }
  });
  el.recent.addEventListener('click', (e) => {
    const b = e.target.closest('.swatch');
    if (b) setColor(b.dataset.color);
  });
  el.paletteAdd.addEventListener('click', () => {
    if (state.palette.includes(state.color)) {
      toast('この色はもうパレットにあります');
      return;
    }
    if (state.palette.length >= PALETTE_MAX) {
      toast(`パレットは${PALETTE_MAX}色までです`);
      return;
    }
    state.palette.push(state.color);
    if (state.paletteEdit) state.paletteEdit = false;
    renderPalette();
    scheduleSave();
    toast('パレットに追加しました');
  });
  el.paletteEdit.addEventListener('click', () => {
    state.paletteEdit = !state.paletteEdit;
    renderPalette();
    if (state.paletteEdit) toast('消したい色をタップ(終わったら「完了」)');
  });
  el.paletteReset.addEventListener('click', () => {
    if (!window.confirm('パレットを最初の状態に戻します。よろしいですか?')) return;
    state.palette = DEFAULT_PALETTE.slice();
    state.paletteEdit = false;
    renderPalette();
    scheduleSave();
    toast('パレットを初期化しました');
  });

  // 参考画像
  el.refLoad.addEventListener('click', () => el.refFile.click());
  el.refFile.addEventListener('change', () => {
    const f = el.refFile.files && el.refFile.files[0];
    el.refFile.value = '';
    handleRefFile(f);
  });
  el.refRemove.addEventListener('click', removeRef);
  el.refShowChk.addEventListener('change', () => {
    state.ref.show = el.refShowChk.checked;
    updateRefUI();
    scheduleSave();
  });
  el.refOverlayChk.addEventListener('change', () => {
    state.ref.overlay = el.refOverlayChk.checked;
    updateRefUI();
    scheduleSave();
  });
  el.refOpacity.addEventListener('input', () => {
    state.ref.opacity = clamp(Number(el.refOpacity.value) / 100, 0.05, 1);
    el.overlay.style.opacity = String(state.ref.opacity);
    el.refOpacityOut.textContent = Math.round(state.ref.opacity * 100) + '%';
    scheduleSave();
  });
  el.refQuantizeChk.addEventListener('change', () => {
    state.ref.quantize = el.refQuantizeChk.checked;
    scheduleSave();
  });
  el.refImport.addEventListener('click', importRefToGrid);

  // 設定
  $$('.stepper').forEach((st) => {
    const key = st.dataset.key;
    const input = $('input', st);
    st.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-step]');
      if (!b || b.disabled) return;
      commitSetting(key, state[key] + Number(b.dataset.step));
    });
    input.addEventListener('change', () => commitSetting(key, input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
    });
  });
  el.bgSeg.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-bg]');
    if (b) setBg(b.dataset.bg);
  });
  el.projSave.addEventListener('click', saveProject);
  el.projLoad.addEventListener('click', () => el.projFile.click());
  el.projFile.addEventListener('change', () => {
    const f = el.projFile.files && el.projFile.files[0];
    el.projFile.value = '';
    if (f) loadProject(f);
  });
  el.clear.addEventListener('click', clearAll);

  /* ---------- 起動 ---------- */
  function init() {
    loadSaved();

    el.holder.classList.remove('bg-dark', 'bg-light', 'bg-checker');
    el.holder.classList.add('bg-' + state.bg);
    el.app.classList.toggle('panel-collapsed', state.panelCollapsed);
    el.panelToggle.setAttribute('aria-pressed', String(!state.panelCollapsed));

    renderPalette();
    renderRecent();
    setColor(state.color);
    setTool('pen');
    updateMirrorUI();
    syncSettingsUI();
    updateHistoryButtons();
    resizeBoard();
    updateRefUI();

    let refSrc = null;
    try { refSrc = localStorage.getItem(REF_KEY); } catch (_) { refSrc = null; }
    if (refSrc) loadRefFromSrc(refSrc, false);

    if ('ResizeObserver' in window) {
      new ResizeObserver(onStageResize).observe(el.stage);
      new ResizeObserver(() => layoutRefView()).observe(el.refBody);
    }
    window.addEventListener('resize', onStageResize);
    onStageResize();
  }

  init();
})();
