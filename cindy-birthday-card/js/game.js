import { LEVEL } from './level.js';
import { rectsOverlap, tryJump, stepRunner } from './physics.js';
import { drawBackground, drawCindy, drawItem, CINDY_W, CINDY_H, ITEM_SIZE } from './sprites.js';
import { blip, win as winSound, boom as boomSound } from './audio.js';

const VIEW_W = 800;
const VIEW_H = 300;
const GROUND_Y = VIEW_H - 28 - CINDY_H;
const RUN_SPEED = 3.9;        // world px per frame
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
          consumed.add(i);                                    // the rock blows up & vanishes
          spawnBlast(r.x + ITEM_SIZE / 2, r.y + ITEM_SIZE / 2);
          boomSound();
          startFling();          // hit a rock -> blown up & thrown out of the game
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
    blast = null;
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
