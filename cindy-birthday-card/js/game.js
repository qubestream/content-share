import { LEVEL } from './level.js';
import { rectsOverlap, tryJump, stepRunner } from './physics.js';
import { drawBackground, drawCindy, drawItem, CINDY_W, CINDY_H, ITEM_SIZE } from './sprites.js';
import { blip, thud, win as winSound } from './audio.js';

const VIEW_W = 800;
const VIEW_H = 300;
const GROUND_Y = VIEW_H - 28 - CINDY_H;
const RUN_SPEED = 4.6;        // world px per frame (snappier pace)
const GRAVITY = 1.1;
const JUMP_V = -16;
const ITEM_FLOAT_Y = GROUND_Y - 40;
const CINDY_X = 90;

// Forgiving hitbox inset so near-misses survive (trash now ends the run).
const HIT_INSET_X = 10;
const HIT_INSET_TOP = 8;

export function createGame(canvas, { onScore, onProgress, onWin, onLose } = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
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
  let cindy = { y: GROUND_Y, vy: 0, onGround: true };
  let fling = null;            // {x, y, vx, vy, rot} while being thrown out
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
    thud();
    phase = 'flinging';
    // Launch her up and forward, spinning, so she sails out of the window.
    fling = { x: CINDY_X, y: cindy.y, vx: 8, vy: -22, rot: 0 };
  }

  function update() {
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
          startFling();          // hit a rock -> thrown out of the game
          return;
        }
        consumed.add(i);
        score += 1;
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
  }

  function frame() {
    update();
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
