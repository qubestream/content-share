// Runtime-synthesized chiptune + sfx. No audio files. iOS-safe: the AudioContext
// is created/resumed only inside start(), which must be called from a user gesture.
//
// Routing: melody -> musicGain -> master -> destination; sfx -> master.
// stopMusic() silences the looping melody (on game end) without muting sfx.

let ctx = null;
let master = null;
let musicGain = null;
let muted = false;
let loopTimer = null;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.25;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 1;
    musicGain.connect(master);
  }
}

function tone(freq, start, dur, type = 'square', gain = 0.25, dest = null) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g);
  g.connect(dest || master);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

const MELODY = [523, 659, 784, 659, 587, 784, 880, 784];
function scheduleLoop() {
  if (!ctx) return;
  const now = ctx.currentTime;
  const beat = 0.22;
  MELODY.forEach((f, i) => tone(f, now + i * beat, beat * 0.9, 'square', 0.18, musicGain));
  loopTimer = setTimeout(scheduleLoop, MELODY.length * beat * 1000);
}

export function start() {
  ensureCtx();
  if (ctx.state === 'suspended') ctx.resume();
  // Restore music volume in case it was stopped on a previous game end.
  musicGain.gain.cancelScheduledValues(ctx.currentTime);
  musicGain.gain.setValueAtTime(1, ctx.currentTime);
  if (!loopTimer) scheduleLoop();
}

// Stop the looping chiptune (called when the game ends). Sfx still work.
export function stopMusic() {
  if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
  if (musicGain && ctx) {
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.12); // quick fade-out
  }
}

export function blip() {
  if (!ctx || muted) return;
  tone(880, ctx.currentTime, 0.08, 'square', 0.3);
  tone(1320, ctx.currentTime + 0.04, 0.08, 'square', 0.25);
}

export function thud() {
  if (!ctx || muted) return;
  tone(120, ctx.currentTime, 0.18, 'sawtooth', 0.3);
}

export function win() {
  if (!ctx || muted) return;
  const seq = [523, 659, 784, 1047];
  seq.forEach((f, i) => tone(f, ctx.currentTime + i * 0.12, 0.16, 'square', 0.3));
}

export function boom() {            // rock explosion
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  tone(180, t, 0.28, 'sawtooth', 0.38);
  tone(90, t, 0.4, 'square', 0.32);
  tone(320, t + 0.02, 0.14, 'sawtooth', 0.22);
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.25;
  return muted;
}
