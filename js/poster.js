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

export function renderPoster(canvas, { bestPoem, format = "square", observerId = 3048 }) {
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

export function downloadPoster(canvas, filename = "骰子诗句.png") {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function getPosterPreviewScale(canvas, maxWidth, format = "square") {
  const { w, h } = FORMATS[format] || FORMATS.square;
  const scale = Math.min(1, maxWidth / w);
  canvas.style.width = `${w * scale}px`;
  canvas.style.height = `${h * scale}px`;
}
