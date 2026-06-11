import { hapticLand } from "./sound.js";

const LONG_PRESS_MS = 160;
const MOVE_CANCEL_PX = 8;
const DRAG_THRESHOLD = 4;

export function initDiceDrag(container, rolledItems, createItemEl, onChange) {
  let order = [...rolledItems];
  let dragUsed = false;
  let activeDrag = null;
  let rafId = 0;

  function getTiles() {
    return [...container.querySelectorAll(".dice-tile--draggable")];
  }

  function cacheSlotRects() {
    return getTiles().map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    });
  }

  function indexFromPoint(x, y, excludeEl) {
    const tiles = getTiles();
    let hit = null;

    for (const tile of tiles) {
      if (tile === excludeEl) continue;
      const r = tile.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return Number(tile.dataset.index);
      }
    }

    let bestDist = Infinity;
    for (const tile of tiles) {
      if (tile === excludeEl) continue;
      const r = tile.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < bestDist) {
        bestDist = dist;
        hit = Number(tile.dataset.index);
      }
    }

    return hit;
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
      if (ox === 0 && oy === 0) {
        tile.style.transform = "";
      } else {
        tile.style.transform = `translate3d(${ox}px, ${oy}px, 0)`;
      }
    });
  }

  function clearAllTransforms() {
    getTiles().forEach((tile) => {
      tile.classList.remove("dice-tile--dragging", "dice-tile--over", "dice-tile--shuffling");
      tile.style.transform = "";
      tile.style.zIndex = "";
      tile.style.willChange = "";
    });
  }

  function cancelLongPress(drag) {
    if (drag?.pressTimer) {
      clearTimeout(drag.pressTimer);
      drag.pressTimer = null;
    }
  }

  function startDragging(drag) {
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

  function scheduleFrame(drag, clientX, clientY) {
    drag.pendingX = clientX;
    drag.pendingY = clientY;
    if (rafId) return;

    rafId = requestAnimationFrame(() => {
      rafId = 0;
      if (!activeDrag?.dragging) return;

      const dx = activeDrag.pendingX - activeDrag.startX;
      const dy = activeDrag.pendingY - activeDrag.startY;
      activeDrag.dx = dx;
      activeDrag.dy = dy;

      const nextHover = indexFromPoint(activeDrag.pendingX, activeDrag.pendingY, activeDrag.el);
      if (nextHover !== null && nextHover !== activeDrag.hoverIndex) {
        activeDrag.hoverIndex = nextHover;
        hapticLand();
      }

      applyPreviewLayout(activeDrag);
    });
  }

  function finishDrag(clientX, clientY) {
    const drag = activeDrag;
    if (!drag) return;

    cancelLongPress(drag);
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

    if (committed) {
      render();
      onChange(order.map((i) => i.word), dragUsed);
    } else if (wasDragging) {
      onChange(order.map((i) => i.word), dragUsed);
    }
  }

  function bindTile(el, index) {
    el.dataset.index = String(index);
    el.classList.add("dice-tile--draggable");

    el.addEventListener("pointerdown", (e) => {
      if (activeDrag) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      activeDrag = {
        el,
        fromIndex: index,
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        startX: e.clientX,
        startY: e.clientY,
        pendingX: e.clientX,
        pendingY: e.clientY,
        dx: 0,
        dy: 0,
        dragging: false,
        hoverIndex: index,
        pressTimer: null,
      };

      if (e.pointerType === "touch") {
        activeDrag.pressTimer = setTimeout(() => {
          if (!activeDrag || activeDrag.el !== el) return;
          startDragging(activeDrag);
        }, LONG_PRESS_MS);
      }

      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    });

    el.addEventListener("pointermove", (e) => {
      if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;

      const dx = e.clientX - activeDrag.startX;
      const dy = e.clientY - activeDrag.startY;

      if (!activeDrag.dragging) {
        if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) cancelLongPress(activeDrag);
        if (!activeDrag.pressTimer) return;
        return;
      }

      e.preventDefault();
      scheduleFrame(activeDrag, e.clientX, e.clientY);
    });

    el.addEventListener("pointerup", (e) => {
      if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;
      finishDrag(e.clientX, e.clientY);
    });

    el.addEventListener("pointercancel", (e) => {
      if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;
      finishDrag(e.clientX, e.clientY);
    });
  }

  function render() {
    container.innerHTML = "";
    order.forEach((item, index) => {
      const el = createItemEl(item);
      el.dataset.word = item.word;
      bindTile(el, index);
      container.appendChild(el);
    });
  }

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
