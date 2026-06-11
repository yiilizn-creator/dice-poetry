import { playGlassClink, hapticLand } from "./sound.js";

export const DICE_SETS = [
  { id: "emotion", label: "情绪", words: ["等待", "重逢", "拥抱", "遗忘", "想念", "告别"] },
  { id: "time", label: "时间", words: ["今天", "昨天", "黄昏", "深夜", "未来", "清晨"] },
  { id: "nature", label: "自然", words: ["晚风", "银河", "潮汐", "月亮", "雨水", "雪地"] },
  { id: "color", label: "颜色", words: ["蓝色", "粉色", "白色", "透明", "灰色", "金色"] },
  { id: "object", label: "事物", words: ["宇宙", "冰川", "灯塔", "小猫", "信件", "车站"] },
  { id: "action", label: "动作", words: ["流过", "经过", "停留", "闪烁", "坠落", "消失"] },
];

const ROLL_DURATION = 2500;

export function rollDice() {
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

export function wordsToMap(rolled) {
  const map = {};
  rolled.forEach((item) => {
    map[item.setId] = item.word;
  });
  return map;
}

export function createDiceTile(set, options = {}) {
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

export function setTileWord(tile, word) {
  const text = tile.querySelector(".dice-tile__text");
  if (text) text.textContent = word;
  tile.setAttribute("aria-label", word);
}

export function renderDiceCluster(container, { count = 3, size = "md", floating = true } = {}) {
  container.innerHTML = "";
  DICE_SETS.slice(0, count).forEach((set, i) => {
    const word = set.words[i % set.words.length];
    container.appendChild(
      createDiceTile(set, { size, word, floating, delay: i * 0.45 })
    );
  });
}

export function renderDiceStage(container, rolled) {
  container.innerHTML = "";
  rolled.forEach((item) => {
    const set = DICE_SETS.find((s) => s.id === item.setId);
    container.appendChild(createDiceTile(set, { size: "lg", word: "…" }));
  });
}

export function animateRoll(container, rolled, onComplete) {
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

export function createResultTile(item) {
  const set = DICE_SETS.find((s) => s.id === item.setId);
  return createDiceTile(set, { size: "lg", word: item.word });
}
