const DRAG_THRESHOLD = 10;

export function initDiceDrag(container, rolledItems, createItemEl, onChange) {
  let order = [...rolledItems];
  let dragUsed = false;
  let activeDrag = null;

  function clearOverStates() {
    container.querySelectorAll(".dice-tile--over").forEach((tile) => {
      tile.classList.remove("dice-tile--over");
    });
  }

  function resetDragStyles(el) {
    el.classList.remove("dice-tile--dragging");
    el.style.transform = "";
    el.style.zIndex = "";
  }

  function hitTile(x, y, excludeEl) {
    if (excludeEl) excludeEl.style.pointerEvents = "none";
    const target = document.elementFromPoint(x, y)?.closest(".dice-tile--draggable");
    if (excludeEl) excludeEl.style.pointerEvents = "";
    return target && target !== excludeEl ? target : null;
  }

  function finishDrag(clientX, clientY) {
    const drag = activeDrag;
    if (!drag) return;

    const hit = drag.dragging ? hitTile(clientX, clientY, drag.el) : null;
    resetDragStyles(drag.el);
    clearOverStates();
    activeDrag = null;

    if (hit && drag.dragging) {
      const toIndex = Number(hit.dataset.index);
      if (toIndex !== drag.fromIndex) {
        const next = [...order];
        const [moved] = next.splice(drag.fromIndex, 1);
        next.splice(toIndex, 0, moved);
        order = next;
        render();
        onChange(order.map((i) => i.word), dragUsed);
        return;
      }
    }

    if (drag.dragging) onChange(order.map((i) => i.word), dragUsed);
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
        startX: e.clientX,
        startY: e.clientY,
        dragging: false,
      };

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

      if (!activeDrag.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        activeDrag.dragging = true;
        dragUsed = true;
        activeDrag.el.classList.add("dice-tile--dragging");
      }

      if (!activeDrag.dragging) return;

      e.preventDefault();
      activeDrag.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.05)`;
      activeDrag.el.style.zIndex = "10";

      clearOverStates();
      const hit = hitTile(e.clientX, e.clientY, activeDrag.el);
      if (hit) hit.classList.add("dice-tile--over");
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
