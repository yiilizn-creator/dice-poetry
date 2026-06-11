import { hapticLand } from "./sound.js";

const HOLD_MS = 120;
const DRAG_START_PX = 10;

export function initDiceDrag(container, rolledItems, createItemEl, onChange) {
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
