export function initDiceDrag(container, rolledItems, createItemEl, onChange) {
  let order = [...rolledItems];
  let dragUsed = false;

  function render() {
    container.innerHTML = "";
    order.forEach((item, index) => {
      const el = createItemEl(item);
      el.draggable = true;
      el.dataset.index = String(index);
      el.classList.add("dice-tile--draggable");

      el.addEventListener("dragstart", (e) => {
        dragUsed = true;
        el.classList.add("dice-tile--dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
      });

      el.addEventListener("dragend", () => {
        el.classList.remove("dice-tile--dragging");
      });

      el.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        el.classList.add("dice-tile--over");
      });

      el.addEventListener("dragleave", () => {
        el.classList.remove("dice-tile--over");
      });

      el.addEventListener("drop", (e) => {
        e.preventDefault();
        el.classList.remove("dice-tile--over");
        const from = Number(e.dataTransfer.getData("text/plain"));
        const to = Number(el.dataset.index);
        if (from === to) return;

        const next = [...order];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        order = next;
        render();
        onChange(order.map((i) => i.word), dragUsed);
      });

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
