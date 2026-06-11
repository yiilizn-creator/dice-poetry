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

export function hapticRoll() {
  vibrate([22, 40, 18, 55, 16]);
  playRollTap();
}

export function hapticLand() {
  const ok = vibrate([12, 18, 10]);
  if (!ok) playRollTap();
}
