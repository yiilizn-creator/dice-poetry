(function(){
'use strict';
/* === analytics.js === */
const STORAGE_KEY = "dice-poetry-analytics";

function track(event, data = {}) {
  const payload = { event, timestamp: Date.now(), ...data };
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    stored.push(payload);
    if (stored.length > 200) stored.splice(0, stored.length - 200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* ignore */
  }

  document.dispatchEvent(new CustomEvent("poetry:track", { detail: payload }));
}

function recordVisit() {
  const key = "dice-poetry-visit";
  try {
    const data = JSON.parse(localStorage.getItem(key) || "{}");
    data.count = (data.count || 0) + 1;
    data.lastVisit = Date.now();
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  } catch {
    return { count: 1 };
  }
}

function getObserverNumber() {
  try {
    const data = JSON.parse(localStorage.getItem("dice-poetry-visit") || "{}");
    return (data.count || 1) + 3047;
  } catch {
    return 3048;
  }
}

function incrementRollCount() {
  const key = "dice-poetry-rolls";
  try {
    const n = Number(localStorage.getItem(key) || "0") + 1;
    localStorage.setItem(key, String(n));
    return n;
  } catch {
    return 1;
  }
}

/* === poem.js === */
function countChars(text) {
  return text.replace(/\s/g, "").length;
}

function varsFromMap(wordMap) {
  return {
    emotion: wordMap.emotion,
    time: wordMap.time,
    nature: wordMap.nature,
    color: wordMap.color,
    object: wordMap.object,
    action: wordMap.action,
  };
}

const BEST_TEMPLATES = [
  (w) => ({
    poem: `${w.nature}${w.action}${w.object}\n${w.color}${w.emotion}${w.time}`,
    order: [w.nature, w.action, w.object, w.color, w.emotion, w.time],
  }),
  (w) => ({
    poem: `${w.color}${w.nature}${w.action}\n${w.object}${w.emotion}${w.time}`,
    order: [w.color, w.nature, w.action, w.object, w.emotion, w.time],
  }),
  (w) => ({
    poem: `${w.emotion}${w.time}\n${w.nature}${w.action}${w.object}${w.color}`,
    order: [w.emotion, w.time, w.nature, w.action, w.object, w.color],
  }),
  (w) => ({
    poem: `${w.time}${w.nature}\n${w.action}${w.object}\n${w.color}${w.emotion}`,
    order: [w.time, w.nature, w.action, w.object, w.color, w.emotion],
  }),
  (w) => ({
    poem: `${w.color}${w.object}\n${w.nature}${w.action}${w.emotion}${w.time}`,
    order: [w.color, w.object, w.nature, w.action, w.emotion, w.time],
  }),
  (w) => ({
    poem: `${w.nature}${w.object}\n${w.color}${w.emotion}\n${w.action}${w.time}`,
    order: [w.nature, w.object, w.color, w.emotion, w.action, w.time],
  }),
  (w) => ({
    poem: `${w.emotion}${w.nature}${w.action}\n${w.time}${w.color}${w.object}`,
    order: [w.emotion, w.nature, w.action, w.time, w.color, w.object],
  }),
  (w) => ({
    poem: `${w.time}${w.color}${w.nature}\n${w.action}${w.emotion}${w.object}`,
    order: [w.time, w.color, w.nature, w.action, w.emotion, w.object],
  }),
];

function isValidArrangement({ poem, order }, rolledWords) {
  const rolled = new Set(rolledWords);
  if (order.length !== rolledWords.length) return false;
  if (order.some((word) => !rolled.has(word))) return false;
  if (new Set(order).size !== order.length) return false;
  return order.every((word) => poem.includes(word));
}

function composeBestArrangement(wordMap) {
  const w = varsFromMap(wordMap);
  const rolledWords = Object.values(w);
  const shuffled = [...BEST_TEMPLATES].sort(() => Math.random() - 0.5);

  for (const tpl of shuffled) {
    const result = tpl(w);
    if (!isValidArrangement(result, rolledWords)) continue;
    const len = countChars(result.poem);
    if (len >= 12 && len <= 36) return result;
  }

  return {
    poem: `${w.nature}${w.action}${w.object}\n${w.color}${w.emotion}${w.time}`,
    order: [w.nature, w.action, w.object, w.color, w.emotion, w.time],
  };
}

function generateBestPoem(wordMap) {
  return composeBestArrangement(wordMap).poem;
}

function getBestOrder(wordMap) {
  return composeBestArrangement(wordMap).order;
}

function getPoemRevealSteps(poem, order) {
  const steps = [""];
  let cursor = 0;
  let accumulated = "";

  for (const word of order) {
    const idx = poem.indexOf(word, cursor);
    if (idx === -1) {
      accumulated += word;
    } else {
      accumulated += poem.slice(cursor, idx + word.length);
      cursor = idx + word.length;
    }
    steps.push(accumulated);
  }

  return steps;
}

function formatPoemHtml(text, highlightWords = []) {
  if (!text) return "";

  const wordSet = new Set(highlightWords);
  const sorted = [...wordSet].sort((a, b) => b.length - a.length);

  function highlightSegment(segment) {
    let html = "";
    let i = 0;
    while (i < segment.length) {
      let matched = "";
      for (const word of sorted) {
        if (segment.slice(i, i + word.length) === word) {
          matched = word;
          break;
        }
      }
      if (matched) {
        html += `<span class="poem-word">${matched}</span>`;
        i += matched.length;
      } else {
        html += `<span class="poem-muted">${segment[i]}</span>`;
        i += 1;
      }
    }
    return html;
  }

  return text
    .split("\n")
    .map((line, index) => {
      const inner = highlightSegment(line);
      return `<div class="poem-line poem-line--${index + 1}">${inner || "&nbsp;"}</div>`;
    })
    .join("");
}

function getShareCopy(bestPoem) {
  return `${bestPoem.replace(/\n/g, "\n")}\n\n—— 骰子诗句\n六个随机词，拼凑你的诗\n\n无聊的时候，就去写一首没有逻辑的诗。`;
}

/* === drag.js === */
const HOLD_MS = 120;
const DRAG_START_PX = 10;

function initDiceDrag(container, rolledItems, createItemEl, onChange) {
  let order = [...rolledItems];
  let dragUsed = false;
  let activeDrag = null;
  let rafId = 0;

  function getTiles() {
    return [...container.querySelectorAll(".dice-tile--draggable")];
  }

  function tileFromTarget(target) {
    const tile = target?.closest?.(".dice-tile--draggable");
    return tile && container.contains(tile) ? tile : null;
  }

  function cacheSlotRects() {
    return getTiles().map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    });
  }

  function indexFromPoint(x, y, excludeEl) {
    const tiles = getTiles();
    for (const tile of tiles) {
      if (tile === excludeEl) continue;
      const r = tile.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return Number(tile.dataset.index);
      }
    }

    let best = null;
    let bestDist = Infinity;
    for (const tile of tiles) {
      if (tile === excludeEl) continue;
      const r = tile.getBoundingClientRect();
      const dist = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (dist < bestDist) {
        bestDist = dist;
        best = Number(tile.dataset.index);
      }
    }
    return best;
  }

  function buildPreviewOrder(fromIndex, hoverIndex) {
    if (hoverIndex === null || hoverIndex === fromIndex) return order;
    const preview = [...order];
    const [moved] = preview.splice(fromIndex, 1);
    preview.splice(hoverIndex, 0, moved);
    return preview;
  }

  function applyPreviewLayout(drag) {
    const { el, fromIndex, hoverIndex, slotRects, dx, dy } = drag;
    const preview = buildPreviewOrder(fromIndex, hoverIndex);

    getTiles().forEach((tile) => {
      if (tile === el) {
        tile.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.08)`;
        return;
      }

      const currentIndex = Number(tile.dataset.index);
      const word = order[currentIndex]?.word;
      const targetIndex = preview.findIndex((item) => item.word === word);
      const fromRect = slotRects[currentIndex];
      const toRect = slotRects[targetIndex];
      if (!fromRect || !toRect) return;

      const ox = toRect.left - fromRect.left;
      const oy = toRect.top - fromRect.top;
      tile.style.transform = ox === 0 && oy === 0 ? "" : `translate3d(${ox}px, ${oy}px, 0)`;
    });
  }

  function clearAllTransforms() {
    getTiles().forEach((tile) => {
      tile.classList.remove("dice-tile--dragging", "dice-tile--shuffling");
      tile.style.transform = "";
      tile.style.zIndex = "";
      tile.style.willChange = "";
    });
  }

  function clearHoldTimer(drag) {
    if (drag?.holdTimer) {
      clearTimeout(drag.holdTimer);
      drag.holdTimer = null;
    }
  }

  function startDragging(drag) {
    if (drag.dragging) return;
    clearHoldTimer(drag);
    drag.dragging = true;
    dragUsed = true;
    drag.slotRects = cacheSlotRects();
    drag.hoverIndex = drag.fromIndex;
    drag.el.classList.add("dice-tile--dragging");
    drag.el.style.zIndex = "20";
    drag.el.style.willChange = "transform";
    getTiles().forEach((tile) => {
      if (tile !== drag.el) tile.classList.add("dice-tile--shuffling");
    });
    hapticLand();
  }

  function maybeStartDrag(drag, clientX, clientY) {
    if (drag.dragging) return true;
    const dx = clientX - drag.startX;
    const dy = clientY - drag.startY;
    if (Math.hypot(dx, dy) >= DRAG_START_PX) {
      startDragging(drag);
      return true;
    }
    return false;
  }

  function scheduleFrame(clientX, clientY) {
    if (!activeDrag?.dragging) return;
    activeDrag.pendingX = clientX;
    activeDrag.pendingY = clientY;
    if (rafId) return;

    rafId = requestAnimationFrame(() => {
      rafId = 0;
      const drag = activeDrag;
      if (!drag?.dragging) return;

      drag.dx = drag.pendingX - drag.startX;
      drag.dy = drag.pendingY - drag.startY;

      const nextHover = indexFromPoint(drag.pendingX, drag.pendingY, drag.el);
      if (nextHover !== null && nextHover !== drag.hoverIndex) {
        drag.hoverIndex = nextHover;
        hapticLand();
      }
      applyPreviewLayout(drag);
    });
  }

  function finishDrag(clientX, clientY) {
    const drag = activeDrag;
    if (!drag) return;

    clearHoldTimer(drag);
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }

    const wasDragging = drag.dragging;
    let committed = false;

    if (wasDragging) {
      const hoverIndex = indexFromPoint(clientX, clientY, drag.el) ?? drag.hoverIndex;
      if (hoverIndex !== null && hoverIndex !== drag.fromIndex) {
        const next = [...order];
        const [moved] = next.splice(drag.fromIndex, 1);
        next.splice(hoverIndex, 0, moved);
        order = next;
        committed = true;
      }
    }

    clearAllTransforms();
    activeDrag = null;
    detachDocumentListeners();

    if (committed) {
      render();
      onChange(order.map((i) => i.word), dragUsed);
    } else if (wasDragging) {
      onChange(order.map((i) => i.word), dragUsed);
    }
  }

  function onDocumentMove(e) {
    if (!activeDrag) return;

    let x;
    let y;

    if (e.type === "touchmove") {
      const touch = [...e.changedTouches, ...e.touches].find((t) => t.identifier === activeDrag.touchId);
      if (!touch) return;
      x = touch.clientX;
      y = touch.clientY;
    } else {
      if (activeDrag.pointerId !== e.pointerId) return;
      x = e.clientX;
      y = e.clientY;
    }

    if (!activeDrag.dragging) {
      maybeStartDrag(activeDrag, x, y);
      if (!activeDrag.dragging) return;
    }

    e.preventDefault();
    scheduleFrame(x, y);
  }

  function onDocumentEnd(e) {
    if (!activeDrag) return;

    let x = activeDrag.pendingX;
    let y = activeDrag.pendingY;

    if (e.type === "touchend" || e.type === "touchcancel") {
      const touch = [...e.changedTouches].find((t) => t.identifier === activeDrag.touchId);
      if (!touch) return;
      x = touch.clientX;
      y = touch.clientY;
    } else if (activeDrag.pointerId === e.pointerId) {
      x = e.clientX;
      y = e.clientY;
    } else {
      return;
    }

    finishDrag(x, y);
  }

  function attachDocumentListeners() {
    document.addEventListener("touchmove", onDocumentMove, { passive: false });
    document.addEventListener("touchend", onDocumentEnd, { passive: true });
    document.addEventListener("touchcancel", onDocumentEnd, { passive: true });
    document.addEventListener("pointermove", onDocumentMove);
    document.addEventListener("pointerup", onDocumentEnd);
    document.addEventListener("pointercancel", onDocumentEnd);
  }

  function detachDocumentListeners() {
    document.removeEventListener("touchmove", onDocumentMove);
    document.removeEventListener("touchend", onDocumentEnd);
    document.removeEventListener("touchcancel", onDocumentEnd);
    document.removeEventListener("pointermove", onDocumentMove);
    document.removeEventListener("pointerup", onDocumentEnd);
    document.removeEventListener("pointercancel", onDocumentEnd);
  }

  function beginDrag(tile, clientX, clientY, meta) {
    if (activeDrag) return;

    activeDrag = {
      el: tile,
      fromIndex: Number(tile.dataset.index),
      startX: clientX,
      startY: clientY,
      pendingX: clientX,
      pendingY: clientY,
      dx: 0,
      dy: 0,
      dragging: false,
      hoverIndex: Number(tile.dataset.index),
      holdTimer: null,
      ...meta,
    };

    attachDocumentListeners();

    activeDrag.holdTimer = setTimeout(() => {
      if (activeDrag?.el === tile) startDragging(activeDrag);
    }, HOLD_MS);
  }

  function onContainerTouchStart(e) {
    if (activeDrag) return;
    const tile = tileFromTarget(e.target);
    if (!tile) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    beginDrag(tile, touch.clientX, touch.clientY, { touchId: touch.identifier, isTouch: true });
  }

  function onContainerPointerDown(e) {
    if (activeDrag || e.pointerType === "touch") return;
    if (e.button !== 0) return;

    const tile = tileFromTarget(e.target);
    if (!tile) return;

    beginDrag(tile, e.clientX, e.clientY, { pointerId: e.pointerId, isTouch: false });
    try {
      tile.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function render() {
    container.innerHTML = "";
    order.forEach((item, index) => {
      const el = createItemEl(item);
      el.dataset.index = String(index);
      el.dataset.word = item.word;
      el.classList.add("dice-tile--draggable");
      container.appendChild(el);
    });
  }

  container.addEventListener("touchstart", onContainerTouchStart, { passive: true });
  container.addEventListener("pointerdown", onContainerPointerDown);

  render();
  onChange(order.map((i) => i.word), false);

  return {
    getOrder: () => order.map((i) => i.word),
    setOrder: (words) => {
      order = words
        .map((word) => order.find((i) => i.word === word) || rolledItems.find((i) => i.word === word))
        .filter(Boolean);
      render();
      onChange(order.map((i) => i.word), dragUsed);
    },
    wasDragUsed: () => dragUsed,
  };
}

/* === sound.js === */
let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playGlassClink() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(920 + Math.random() * 280, t);
    osc.frequency.exponentialRampToValueAtTime(640, t + 0.12);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  } catch {
    /* ignore */
  }
}

function playRollTap() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.1);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.13);

    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(60, t + 0.02);
    gain2.gain.setValueAtTime(0.14, t + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc2.connect(gain2);
    gain2.connect(ac.destination);
    osc2.start(t + 0.02);
    osc2.stop(t + 0.11);
  } catch {
    /* ignore */
  }
}

function vibrate(pattern) {
  try {
    if (typeof navigator.vibrate === "function") {
      return navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
  return false;
}

function hapticRoll() {
  vibrate([22, 40, 18, 55, 16]);
  playRollTap();
}

function hapticLand() {
  const ok = vibrate([12, 18, 10]);
  if (!ok) playRollTap();
}

/* === poster.js === */
const FORMATS = {
  square: { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1920 },
};

const FOOTER_COPY = "六个随机词，拼凑你的诗";

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const lines = text.split("\n");
  let cy = y;
  lines.forEach((line) => {
    const chars = [...line];
    let current = "";
    chars.forEach((ch) => {
      const test = current + ch;
      if (ctx.measureText(test).width > maxWidth && current) {
        ctx.fillText(current, x, cy);
        cy += lineHeight;
        current = ch;
      } else {
        current = test;
      }
    });
    if (current) {
      ctx.fillText(current, x, cy);
      cy += lineHeight;
    }
  });
  return cy;
}

function drawPoemGradient(ctx, text, x, startY, maxWidth, lineHeight, fontSize) {
  ctx.font = `500 ${fontSize}px 'PingFang SC', 'Noto Sans SC', sans-serif`;
  ctx.textAlign = "center";
  const lines = text.split("\n");
  let cy = startY;
  lines.forEach((line) => {
    const chars = [...line];
    let current = "";
    chars.forEach((ch) => {
      const test = current + ch;
      if (ctx.measureText(test).width > maxWidth && current) {
        const grad = ctx.createLinearGradient(x - maxWidth / 2, cy - lineHeight, x + maxWidth / 2, cy);
        grad.addColorStop(0, "#1a1a1a");
        grad.addColorStop(0.6, "#3a3a3a");
        grad.addColorStop(1, "#b85c7a");
        ctx.fillStyle = grad;
        ctx.fillText(current, x, cy);
        cy += lineHeight;
        current = ch;
      } else {
        current = test;
      }
    });
    if (current) {
      const grad = ctx.createLinearGradient(x - maxWidth / 2, cy - lineHeight, x + maxWidth / 2, cy);
      grad.addColorStop(0, "#1a1a1a");
      grad.addColorStop(0.6, "#3a3a3a");
      grad.addColorStop(1, "#b85c7a");
      ctx.fillStyle = grad;
      ctx.fillText(current, x, cy);
      cy += lineHeight;
    }
  });
  return cy;
}

function drawBackground(ctx, w, h) {
  ctx.fillStyle = "#FAF8F6";
  ctx.fillRect(0, 0, w, h);

  const pink = ctx.createRadialGradient(w * 0.2, h * 0.15, 0, w * 0.2, h * 0.15, w * 0.5);
  pink.addColorStop(0, "rgba(255, 182, 220, 0.18)");
  pink.addColorStop(1, "transparent");
  ctx.fillStyle = pink;
  ctx.fillRect(0, 0, w, h);

  const blue = ctx.createRadialGradient(w * 0.85, h * 0.85, 0, w * 0.85, h * 0.85, w * 0.45);
  blue.addColorStop(0, "rgba(143, 216, 255, 0.14)");
  blue.addColorStop(1, "transparent");
  ctx.fillStyle = blue;
  ctx.fillRect(0, 0, w, h);
}

function renderPoster(canvas, { bestPoem, format = "square", observerId = 3048 }) {
  const { w, h } = FORMATS[format] || FORMATS.square;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, w, h);

  ctx.textAlign = "center";
  const poemY = h * 0.38;
  const poemSize = 52;
  const lineH = 78;
  drawPoemGradient(ctx, bestPoem, w / 2, poemY, w - 160, lineH, poemSize);

  ctx.font = "400 28px 'PingFang SC', 'Noto Sans SC', sans-serif";
  ctx.fillStyle = "rgba(170, 170, 170, 0.9)";
  const sigY = h * 0.72;
  ctx.fillText(`——《骰子诗句》第${observerId}位观测者 著`, w / 2, sigY);

  ctx.font = "400 26px 'PingFang SC', 'Noto Sans SC', sans-serif";
  ctx.fillStyle = "rgba(119, 119, 119, 0.85)";
  wrapText(ctx, FOOTER_COPY, w / 2, h - 80, w - 120, 38);

  return canvas;
}

function downloadPoster(canvas, filename = "骰子诗句.png") {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function getPosterPreviewScale(canvas, maxWidth, format = "square") {
  const { w, h } = FORMATS[format] || FORMATS.square;
  const scale = Math.min(1, maxWidth / w);
  canvas.style.width = `${w * scale}px`;
  canvas.style.height = `${h * scale}px`;
}

/* === dice.js === */
const DICE_SETS = [
  { id: "emotion", label: "情绪", words: ["等待", "重逢", "拥抱", "遗忘", "想念", "告别"] },
  { id: "time", label: "时间", words: ["今天", "昨天", "黄昏", "深夜", "未来", "清晨"] },
  { id: "nature", label: "自然", words: ["晚风", "银河", "潮汐", "月亮", "雨水", "雪地"] },
  { id: "color", label: "颜色", words: ["蓝色", "粉色", "白色", "透明", "灰色", "金色"] },
  { id: "object", label: "事物", words: ["宇宙", "冰川", "灯塔", "小猫", "信件", "车站"] },
  { id: "action", label: "动作", words: ["流过", "经过", "停留", "闪烁", "坠落", "消失"] },
];

const ROLL_DURATION = 2500;

function rollDice() {
  return DICE_SETS.map((set) => {
    const faceIndex = Math.floor(Math.random() * 6);
    return {
      setId: set.id,
      label: set.label,
      word: set.words[faceIndex],
      faceIndex,
    };
  });
}

function wordsToMap(rolled) {
  const map = {};
  rolled.forEach((item) => {
    map[item.setId] = item.word;
  });
  return map;
}

function createDiceTile(set, options = {}) {
  const {
    size = "md",
    word = "…",
    floating = false,
    delay = 0,
    stagger = false,
  } = options;

  const tile = document.createElement("div");
  tile.className = `dice-tile dice-tile--crystal dice-tile--${size}`;
  if (floating) {
    tile.classList.add("dice-tile--float");
    tile.style.animationDelay = `${delay}s`;
  }
  if (stagger) {
    tile.classList.add("dice-tile--stagger");
    tile.style.animationDelay = `${delay}ms`;
  }
  tile.dataset.setId = set.id;

  const body = document.createElement("div");
  body.className = "dice-tile__body";

  const edgeTop = document.createElement("div");
  edgeTop.className = "dice-tile__edge dice-tile__edge--top";
  edgeTop.setAttribute("aria-hidden", "true");

  const edgeLeft = document.createElement("div");
  edgeLeft.className = "dice-tile__edge dice-tile__edge--left";
  edgeLeft.setAttribute("aria-hidden", "true");

  const front = document.createElement("div");
  front.className = "dice-tile__front";

  const highlight = document.createElement("div");
  highlight.className = "dice-tile__highlight";
  highlight.setAttribute("aria-hidden", "true");

  const refract = document.createElement("div");
  refract.className = "dice-tile__refract";
  refract.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.className = "dice-tile__text";
  text.textContent = word;

  front.appendChild(highlight);
  front.appendChild(refract);
  front.appendChild(text);
  body.appendChild(edgeTop);
  body.appendChild(edgeLeft);
  body.appendChild(front);
  tile.appendChild(body);
  tile.setAttribute("role", "img");
  tile.setAttribute("aria-label", `${set.label}：${word}`);
  return tile;
}

function setTileWord(tile, word) {
  const text = tile.querySelector(".dice-tile__text");
  if (text) text.textContent = word;
  tile.setAttribute("aria-label", word);
}

function renderDiceCluster(container, { count = 3, size = "md", floating = true } = {}) {
  container.innerHTML = "";
  DICE_SETS.slice(0, count).forEach((set, i) => {
    const word = set.words[i % set.words.length];
    container.appendChild(
      createDiceTile(set, { size, word, floating, delay: i * 0.45 })
    );
  });
}

function renderDiceStage(container, rolled) {
  container.innerHTML = "";
  rolled.forEach((item) => {
    const set = DICE_SETS.find((s) => s.id === item.setId);
    container.appendChild(createDiceTile(set, { size: "lg", word: "…" }));
  });
}

function animateRoll(container, rolled, onComplete) {
  const tiles = [...container.querySelectorAll(".dice-tile")];

  tiles.forEach((tile) => tile.classList.add("dice-tile--toss"));

  setTimeout(() => {
    tiles.forEach((tile) => {
      tile.querySelector(".dice-tile__body")?.classList.add("dice-tile__body--tumble");
    });
  }, 180);

  const stopStart = 900;
  const stopGap = 260;

  tiles.forEach((tile, i) => {
    setTimeout(() => {
      const body = tile.querySelector(".dice-tile__body");
      body?.classList.remove("dice-tile__body--tumble");
      body?.classList.add("dice-tile__body--land");
      setTileWord(tile, rolled[i].word);
      tile.classList.remove("dice-tile--toss");
      playGlassClink();
      hapticLand();
    }, stopStart + i * stopGap);
  });

  setTimeout(() => {
    tiles.forEach((tile) => {
      tile.querySelector(".dice-tile__body")?.classList.remove("dice-tile__body--land");
    });
    onComplete?.();
  }, ROLL_DURATION);
}

function createResultTile(item) {
  const set = DICE_SETS.find((s) => s.id === item.setId);
  return createDiceTile(set, { size: "lg", word: item.word });
}

/* === app.js === */
const SITE_URL = window.location.href.split("?")[0];
const PAGE_TRANSITION_MS = 600;
const POEM_ANIM_MS = 1000;

const state = {
  screen: "home",
  rolled: [],
  wordMap: {},
  words: [],
  bestPoem: "",
  bestOrder: [],
  isRolling: false,
  diceCtrl: null,
  poemRevealed: false,
  posterFormat: "square",
};

const $ = (sel) => document.querySelector(sel);

function showToast(msg) {
  const toast = $("#toast");
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}

function switchScreen(name, { force = false } = {}) {
  if (!force && state.screen === name) return;
  const prev = $(`.screen[data-screen="${state.screen}"]`);
  const next = $(`.screen[data-screen="${name}"]`);
  if (!next) return;

  prev?.classList.remove("screen--active");
  next.classList.add("screen--active", "screen--entering");
  setTimeout(() => next.classList.remove("screen--entering"), PAGE_TRANSITION_MS);

  state.screen = name;
  next.querySelectorAll(".reveal").forEach((el, i) => {
    el.classList.remove("reveal--visible");
    setTimeout(() => el.classList.add("reveal--visible"), 80 + i * 60);
  });
}

function resetPoemCard() {
  const card = $("#poem-card");
  const poemEl = $("#best-poem");
  const signatureEl = $("#poem-signature");
  const loading = $("#best-loading");
  const arrangeBtn = $("#best-arrange-btn");

  card?.classList.remove("poem-card--ready");
  if (card) card.hidden = true;
  if (poemEl) {
    poemEl.innerHTML = "";
    poemEl.classList.remove("best-poem--visible");
  }
  if (signatureEl) signatureEl.textContent = "";
  if (loading) loading.hidden = true;
  if (arrangeBtn) {
    arrangeBtn.hidden = false;
    arrangeBtn.disabled = false;
  }
  state.poemRevealed = false;
}

function revealPoem() {
  if (state.poemRevealed) return;

  const loading = $("#best-loading");
  const poemEl = $("#best-poem");
  const card = $("#poem-card");
  const signatureEl = $("#poem-signature");
  if (!poemEl || !state.bestPoem) return;

  const observerId = getObserverNumber();

  if (loading) loading.hidden = false;
  poemEl.innerHTML = "";
  poemEl.classList.remove("best-poem--visible");
  if (signatureEl) signatureEl.textContent = "";
  if (card) {
    card.hidden = false;
    card.classList.add("poem-card--ready");
  }

  const steps = getPoemRevealSteps(state.bestPoem, state.bestOrder);
  const stepCount = Math.max(steps.length - 1, 1);
  const stepMs = POEM_ANIM_MS / stepCount;

  steps.forEach((text, i) => {
    if (i === 0) return;

    setTimeout(() => {
      poemEl.innerHTML = formatPoemHtml(text, state.words);

      if (i === steps.length - 1) {
        if (loading) loading.hidden = true;
        poemEl.classList.add("best-poem--visible");
        if (signatureEl) {
          signatureEl.textContent = `——《骰子诗句》第${observerId}位观测者 著`;
        }
        const arrangeBtn = $("#best-arrange-btn");
        if (arrangeBtn) arrangeBtn.hidden = true;
        state.poemRevealed = true;
        track("poem_revealed", { poem: state.bestPoem, observerId });
      }
    }, stepMs * i);
  });
}

function renderResultContent() {
  state.words = state.rolled.map((r) => r.word);
  const best = composeBestArrangement(state.wordMap);
  state.bestPoem = best.poem;
  state.bestOrder = best.order;
  resetPoemCard();

  const row = $("#result-dice-row");
  if (!row) throw new Error("Missing #result-dice-row");

  state.diceCtrl = initDiceDrag(
    row,
    state.rolled,
    createResultTile,
    (order, dragUsed) => {
      if (dragUsed) track("drag_used");
    }
  );

  row.querySelectorAll(".dice-tile").forEach((tile, i) => {
    tile.classList.add("dice-tile--stagger");
    tile.style.animationDelay = `${i * 120}ms`;
  });

  track("words_revealed", { words: state.words });
}

function showBestArrangement() {
  if (state.poemRevealed) return;
  const btn = $("#best-arrange-btn");
  if (btn) btn.disabled = true;
  revealPoem();
  track("best_arrange_click");
}

function renderPosterPreview() {
  const canvas = $("#poster-canvas");
  renderPoster(canvas, {
    bestPoem: state.bestPoem,
    format: state.posterFormat,
    observerId: getObserverNumber(),
  });
  getPosterPreviewScale(canvas, $("#poster-preview").clientWidth, "square");
}

function finishRoll() {
  try {
    renderResultContent();
  } catch (err) {
    console.error("renderResultContent failed:", err);
  }
  switchScreen("result", { force: true });
  state.isRolling = false;
  track("roll_complete", { words: state.rolled.map((r) => r.word) });
}

function startRoll() {
  if (state.isRolling) return;
  state.isRolling = true;

  try {
    track("roll_start");
    incrementRollCount();
    hapticRoll();
    switchScreen("roll");

    state.rolled = rollDice();
    state.wordMap = wordsToMap(state.rolled);

    const stage = $("#roll-dice-stage");
    if (!stage) throw new Error("Missing #roll-dice-stage");

    renderDiceStage(stage, state.rolled);
    animateRoll(stage, state.rolled, finishRoll);
  } catch (err) {
    console.error("startRoll failed:", err);
    state.isRolling = false;
    switchScreen("home", { force: true });
    showToast("投掷出现问题，请重试");
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("已复制到剪贴板");
    return true;
  } catch {
    showToast("复制失败，请手动复制");
    return false;
  }
}

function goPoster() {
  if (!state.poemRevealed) {
    showToast("请先点击「显示最佳✨」");
    return;
  }
  renderPosterPreview();
  switchScreen("share");
  track("poster_view");
}

function copyShare() {
  if (!state.poemRevealed) {
    copyText(`${SITE_URL}\n\n六个随机词，拼凑你的诗`);
    track("share_copy_link_only");
    return;
  }
  copyText(getShareCopy(state.bestPoem));
  track("share_copy");
}

function bindActions() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    switch (btn.dataset.action) {
      case "start-roll":
        track("start_roll_click");
        btn.classList.add("btn--pressed");
        setTimeout(() => btn.classList.remove("btn--pressed"), 150);
        startRoll();
        break;
      case "roll-again":
        track("roll_again_click");
        startRoll();
        break;
      case "best-arrange":
        showBestArrangement();
        break;
      case "save-poster":
        goPoster();
        track("save_poster_click");
        break;
      case "copy-share":
        copyShare();
        break;
      case "back-result":
        switchScreen("result");
        break;
      case "download-poster":
        downloadPoster($("#poster-canvas"));
        showToast("诗卡已保存");
        track("poster_download");
        break;
      default:
        break;
    }
  });
}

function init() {
  recordVisit();
  track("page_view", { screen: "home" });

  renderDiceCluster($("#home-dice-cluster"), { count: 6, size: "lg", floating: true });

  document.querySelectorAll(".screen.screen--active .reveal").forEach((el, i) => {
    setTimeout(() => el.classList.add("reveal--visible"), 100 + i * 80);
  });

  bindActions();
}

init();

})();
