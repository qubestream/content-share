import { LEVEL } from './level.js?v=mqeoqka4';
import { rectsOverlap, tryJump, stepRunner } from './physics.js?v=mqeoqka4';
import { drawBackground, drawCindy, drawItem, CINDY_W, CINDY_H, ITEM_SIZE } from './sprites.js?v=mqeoqka4';
import { blip, thud, win as winSound, boom as boomSound } from './audio.js?v=mqeoqka4';

const VIEW_W = 800;
const VIEW_H = 300;
const GROUND_Y = VIEW_H - 28 - CINDY_H;
const RUN_SPEED = 3.9;        // world px per frame
const GRAVITY = 1.1;
const JUMP_V = -16;
const ITEM_FLOAT_Y = GROUND_Y - 40;
const CINDY_X = 90;

// Forgiving hitbox inset so near-misses survive.
const HIT_INSET_X = 10;
const HIT_INSET_TOP = 8;
const ROCK_TOP = VIEW_H - 28 - ITEM_SIZE; // screen-y of the top of a ground rock
const STOMP_BOUNCE_V = -11;   // little hop after stomping a rock
const STOMP_POINTS = 2;       // reward for stomping a rock
const COLLECT_POINTS = 1;     // present / balloon
const STEP_MS = 1000 / 60;    // fixed simulation step (game speed is frame-rate independent)
const MAX_STEPS = 5;          // cap catch-up steps per frame (avoids spiral on slow devices)

export function createGame(canvas, { onScore, onProgress, onWin, onLose } = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap backing store (cheaper on hi-DPR phones)
  canvas.width = VIEW_W * dpr;
  canvas.height = VIEW_H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  // phase: 'idle' | 'running' | 'flinging' | 'won' | 'dead'
  let phase = 'idle';
  let scrollX = 0;
  let score = 0;
  let runPhaseTimer = 0;
  let runPhase = 0;
  let raf = null;
  let lastNow = null;          // timestamp of previous frame (for fixed-timestep)
  let acc = 0;                 // accumulated real time not yet simulated
  let cindy = { y: GROUND_Y, vy: 0, onGround: true };
  let fling = null;            // {x, y, vx, vy, rot} while being thrown out
  let blast = null;            // {parts, age} rock-explosion particles
  const consumed = new Set();

  function jump() {
    if (phase !== 'running') return;
    cindy = tryJump(cindy, JUMP_V);
  }

  function entityRect(e) {
    const screenX = e.x - scrollX + CINDY_X;
    const y = e.type === 'trash' ? VIEW_H - 28 - ITEM_SIZE : ITEM_FLOAT_Y;
    return { x: screenX, y, w: ITEM_SIZE, h: ITEM_SIZE };
  }

  function startFling() {
    phase = 'flinging';
    // Launch her up and forward, spinning, so she sails out of the window.
    fling = { x: CINDY_X, y: cindy.y, vx: 9, vy: -22, rot: 0 };
  }

  function spawnBlast(cx, cy) {
    const colors = ['#ffd23f', '#ff8c1a', '#d6334a', '#7d848c', '#ffffff'];
    const parts = [];
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16 + Math.random() * 0.4;
      const sp = 2 + Math.random() * 4.5;
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2, life: 1, c: colors[i % colors.length], s: 3 + Math.random() * 4 });
    }
    blast = { parts, age: 0 };
  }

  function stepBlast() {
    if (!blast) return;
    blast.age++;
    for (const p of blast.parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life -= 0.045; }
    if (blast.age > 28) blast = null;
  }

  function update() {
    stepBlast();
    if (phase === 'flinging') {
      fling.vy += GRAVITY * 0.6;
      fling.x += fling.vx;
      fling.y += fling.vy;
      fling.rot += 0.32;
      // Off any edge of the window -> game over.
      if (fling.y > VIEW_H + 120 || fling.y < -240 || fling.x > VIEW_W + 120 || fling.x < -160) {
        phase = 'dead';
        onLose && onLose(score);
      }
      return;
    }

    if (phase !== 'running') return;

    scrollX += RUN_SPEED;
    const feetBefore = cindy.y + CINDY_H;                 // feet position before this step
    cindy = stepRunner(cindy, { gravity: GRAVITY, groundY: GROUND_Y });

    if (cindy.onGround && ++runPhaseTimer > 5) { runPhase ^= 1; runPhaseTimer = 0; }

    const cindyRect = {
      x: CINDY_X + HIT_INSET_X,
      y: cindy.y + HIT_INSET_TOP,
      w: CINDY_W - HIT_INSET_X * 2,
      h: CINDY_H - HIT_INSET_TOP,
    };
    for (let i = 0; i < LEVEL.entities.length; i++) {
      if (consumed.has(i)) continue;
      const e = LEVEL.entities[i];
      const r = entityRect(e);
      if (r.x > VIEW_W + 50 || r.x < -50) continue;
      if (rectsOverlap(cindyRect, r)) {
        if (e.type === 'trash') {
          // Landing ON the rock (descending, feet were at/above its top) = stomp.
          const stomp = cindy.vy > 0 && feetBefore <= ROCK_TOP + 6;
          if (stomp) {
            consumed.add(i);                               // rock explodes & vanishes
            spawnBlast(r.x + ITEM_SIZE / 2, r.y + ITEM_SIZE / 2);
            boomSound();
            score += STOMP_POINTS;
            onScore && onScore(score);
            cindy = { ...cindy, vy: STOMP_BOUNCE_V, onGround: false }; // bounce, keep running
            continue;
          }
          thud();
          startFling();          // ran into its side -> flung off, rock untouched
          return;
        }
        consumed.add(i);
        score += COLLECT_POINTS;
        blip();
        onScore && onScore(score);
      }
    }

    onProgress && onProgress(Math.min(1, scrollX / LEVEL.finishX));

    if (scrollX >= LEVEL.finishX) {
      phase = 'won';
      winSound();
      onWin && onWin(score);
    }
  }

  function render() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawBackground(ctx, VIEW_W, VIEW_H, scrollX);
    for (let i = 0; i < LEVEL.entities.length; i++) {
      if (consumed.has(i)) continue;
      const e = LEVEL.entities[i];
      const r = entityRect(e);
      if (r.x > VIEW_W + 50 || r.x < -50) continue;
      drawItem(ctx, e.type === 'trash' ? e.kind : e.type, r.x, r.y);
    }
    if (phase === 'flinging') {
      ctx.save();
      ctx.translate(fling.x + CINDY_W / 2, fling.y + CINDY_H / 2);
      ctx.rotate(fling.rot);
      drawCindy(ctx, -CINDY_W / 2, -CINDY_H / 2, { jumping: true, runPhase: 0 });
      ctx.restore();
    } else if (phase !== 'dead') {
      drawCindy(ctx, CINDY_X, cindy.y, { jumping: !cindy.onGround, runPhase });
    }
    // phase === 'dead': Cindy is gone (flung out of the window).
    if (blast) {
      for (const p of blast.parts) {
        if (p.life <= 0) continue;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
      ctx.globalAlpha = 1;
    }
  }

  function frame(now) {
    // Fixed-timestep loop: simulate by REAL elapsed time, render once. This keeps
    // game speed identical at 30 / 60 / 120 fps (no more slow motion on phones).
    // `now` is undefined when frames are driven manually (tests) -> advance one step.
    if (now == null) now = (lastNow == null ? 0 : lastNow) + STEP_MS;
    if (lastNow == null) lastNow = now;
    let dt = now - lastNow;
    lastNow = now;
    if (dt > 100) dt = 100;            // clamp after a tab-away / hitch
    acc += dt;
    let steps = 0;
    while (acc >= STEP_MS && steps < MAX_STEPS) { update(); acc -= STEP_MS; steps++; }
    render();
    if (phase !== 'won' && phase !== 'dead') raf = requestAnimationFrame(frame);
    else raf = null;
  }

  function resetState() {
    phase = 'running';
    scrollX = 0;
    score = 0;
    runPhase = 0;
    runPhaseTimer = 0;
    fling = null;
    blast = null;
    lastNow = null;            // re-sync the clock so the gap while stopped isn't simulated
    acc = 0;
    cindy = { y: GROUND_Y, vy: 0, onGround: true };
    consumed.clear();
    onScore && onScore(0);
    onProgress && onProgress(0);
  }

  return {
    start() { if (phase === 'idle') phase = 'running'; },
    jump,
    boot() { if (!raf) raf = requestAnimationFrame(frame); },
    reset() {
      resetState();
      if (!raf) raf = requestAnimationFrame(frame); // restart loop if it had stopped
    },
  };
}
