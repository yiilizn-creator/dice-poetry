let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

export function playGlassClink() {
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
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.11);
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

export function hapticRoll() {
  const ok = vibrate([18, 36, 14]);
  if (!ok) playRollTap();
}

export function hapticLand() {
  vibrate(10);
}
