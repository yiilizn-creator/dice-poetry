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

export function composeBestArrangement(wordMap) {
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

export function generateBestPoem(wordMap) {
  return composeBestArrangement(wordMap).poem;
}

export function getBestOrder(wordMap) {
  return composeBestArrangement(wordMap).order;
}

export function getPoemRevealSteps(poem, order) {
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

export function formatPoemHtml(text, highlightWords = []) {
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

export function getShareCopy(bestPoem) {
  return `${bestPoem.replace(/\n/g, "\n")}\n\n—— 骰子诗句\n六个随机词，拼凑你的诗\n\n无聊的时候，就去写一首没有逻辑的诗。`;
}
