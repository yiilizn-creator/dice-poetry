import {
  rollDice,
  wordsToMap,
  renderDiceCluster,
  renderDiceStage,
  animateRoll,
  createResultTile,
} from "./dice.js";
import { composeBestArrangement, getPoemRevealSteps, getShareCopy, formatPoemHtml } from "./poem.js";
import { initDiceDrag } from "./drag.js";
import { renderPoster, downloadPoster, getPosterPreviewScale } from "./poster.js";
import { track, recordVisit, incrementRollCount, getObserverNumber } from "./analytics.js";
import { hapticRoll } from "./sound.js";

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
