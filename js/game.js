import { LEVEL } from './level.js';
import { rectsOverlap, tryJump, stepRunner } from './physics.js';
import { drawBackground, drawCindy, drawItem, CINDY_W, CINDY_H, ITEM_SIZE } from './sprites.js';
import { blip, thud, win as winSound } from './audio.js';

const VIEW_W = 800;
const VIEW_H = 300;
const GROUND_Y = VIEW_H - 28 - CINDY_H;
const RUN_SPEED = 3.4;
const GRAVITY = 1.1;
const JUMP_V = -16;
const ITEM_FLOAT_Y = GROUND_Y - 40;
const CINDY_X = 90;

export function createGame(canvas, { onScore, onProgress, onWin } = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = VIEW_W * dpr;
  canvas.height = VIEW_H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  let scrollX = 0;
  let score = 0;
  let runPhaseTimer = 0;
  let runPhase = 0;
  let stumble = 0;
  let running = false;
  let won = false;
  let raf = null;
  let cindy = { y: GROUND_Y, vy: 0, onGround: true };
  const consumed = new Set();

  function jump() {
    if (!running || won) return;
    cindy = tryJump(cindy, JUMP_V);
  }

  function entityRect(e) {
    const screenX = e.x - scrollX + CINDY_X;
    const y = e.type === 'trash' ? VIEW_H - 28 - ITEM_SIZE : ITEM_FLOAT_Y;
    return { x: screenX, y, w: ITEM_SIZE, h: ITEM_SIZE };
  }

  function update() {
    if (!running || won) return;
    const speed = stumble > 0 ? RUN_SPEED * 0.5 : RUN_SPEED;
    if (stumble > 0) stumble--;
    scrollX += speed;

    cindy = stepRunner(cindy, { gravity: GRAVITY, groundY: GROUND_Y });

    if (cindy.onGround && ++runPhaseTimer > 6) { runPhase ^= 1; runPhaseTimer = 0; }

    const cindyRect = { x: CINDY_X, y: cindy.y, w: CINDY_W, h: CINDY_H };
    LEVEL.entities.forEach((e, i) => {
      if (consumed.has(i)) return;
      const r = entityRect(e);
      if (r.x > VIEW_W + 50 || r.x < -50) return;
      if (rectsOverlap(cindyRect, r)) {
        consumed.add(i);
        if (e.type === 'trash') {
          stumble = 30;
          score = Math.max(0, score - 1);
          thud();
        } else {
          score += 1;
          blip();
        }
        onScore && onScore(score);
      }
    });

    const progress = Math.min(1, scrollX / LEVEL.finishX);
    onProgress && onProgress(progress);

    if (scrollX >= LEVEL.finishX) {
      won = true;
      running = false;
      winSound();
      onWin && onWin(score);
    }
  }

  function render() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawBackground(ctx, VIEW_W, VIEW_H, scrollX);
    LEVEL.entities.forEach((e, i) => {
      if (consumed.has(i)) return;
      const r = entityRect(e);
      if (r.x > VIEW_W + 50 || r.x < -50) return;
      const kind = e.type === 'trash' ? e.kind : e.type;
      drawItem(ctx, kind, r.x, r.y);
    });
    drawCindy(ctx, CINDY_X, cindy.y, { jumping: !cindy.onGround, runPhase });
  }

  function frame() {
    update();
    render();
    if (!won) raf = requestAnimationFrame(frame);
  }

  return {
    start() { if (!running && !won) { running = true; } },
    jump,
    boot() { raf = requestAnimationFrame(frame); },
  };
}
