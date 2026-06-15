import { content } from '../content.js?v=mqf4v9es';
import { initCarousel } from './carousel.js?v=mqf4v9es';
import { createGame } from './game.js?v=mqf4v9es';
import { start as startAudio, stopMusic, toggleMute } from './audio.js?v=mqf4v9es';

function paragraphs(el, text) {
  el.innerHTML = '';
  for (const para of text.split('\n')) {
    if (!para.trim()) continue;
    const p = document.createElement('p');
    p.textContent = para;
    el.appendChild(p);
  }
}

document.getElementById('banner-name').textContent = content.recipientName;
paragraphs(document.getElementById('heartfelt'), content.heartfelt);
document.getElementById('game-prompt').textContent = content.gamePrompt;

initCarousel(document.getElementById('carousel-root'), 'photos');

const canvas = document.getElementById('game-canvas');
const overlay = document.getElementById('game-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const hudScore = document.getElementById('hud-score');
const progressFill = document.getElementById('progress-fill');

// Lock page scrolling while the game is actively being played, so a tap-to-jump
// (which often includes a tiny drag on a phone) can't scroll the page. Released
// when the game ends, so the hidden message + footer become reachable.
function preventScroll(e) { e.preventDefault(); }
function setPlaying(on) {
  document.body.classList.toggle('playing', on);
  if (on) document.addEventListener('touchmove', preventScroll, { passive: false });
  else document.removeEventListener('touchmove', preventScroll, { passive: false });
}

const game = createGame(canvas, {
  onScore: (s) => { hudScore.textContent = `🎁 ${s}`; },
  onProgress: (p) => { progressFill.style.width = `${Math.round(p * 100)}%`; },
  onWin: (s) => { setPlaying(false); stopMusic(); revealPayoff(s); },
  onLose: () => { setPlaying(false); stopMusic(); gameoverOverlay.hidden = false; },
});
game.boot();

document.getElementById('play-btn').addEventListener('click', () => {
  startAudio();
  overlay.hidden = true;
  setPlaying(true);
  game.start();
});

document.getElementById('retry-btn').addEventListener('click', () => {
  gameoverOverlay.hidden = true;
  startAudio();   // restart the chiptune for the new run
  setPlaying(true);
  game.reset();
});

addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); game.jump(); }
});
canvas.addEventListener('pointerdown', () => game.jump());

const muteBtn = document.getElementById('mute-btn');
muteBtn.addEventListener('click', () => {
  const muted = toggleMute();
  muteBtn.textContent = muted ? '🔇' : '🔊';
});

function revealPayoff(score) {
  const payoff = document.getElementById('payoff');
  const card = document.getElementById('payoff-card');
  paragraphs(card, content.finalHidden);
  const tag = document.createElement('p');
  tag.innerHTML = `<strong>Final score: 🎁 ${score}</strong>`;
  card.appendChild(tag);
  const again = document.createElement('button');
  again.className = 'play-btn payoff-again';
  again.textContent = '▶ Play the game again';
  again.addEventListener('click', () => {
    startAudio();   // restart the chiptune for the new run
    setPlaying(true);
    game.reset();
    document.querySelector('.game-section').scrollIntoView({ behavior: 'smooth' });
  });
  card.appendChild(again);
  payoff.hidden = false;
  payoff.scrollIntoView({ behavior: 'smooth' });
  requestAnimationFrame(runConfetti);
}

function runConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width || canvas.offsetWidth || window.innerWidth;
  canvas.height = rect.height || canvas.offsetHeight || 300;
  const colors = ['#d6334a', '#ffd23f', '#6fa07a', '#ff7eb6', '#7ec8ff'];
  const pieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height,
    s: 5 + Math.random() * 7,
    vy: 2 + Math.random() * 3,
    vx: -1 + Math.random() * 2,
    c: colors[(Math.random() * colors.length) | 0],
    rot: Math.random() * Math.PI,
  }));
  let frames = 0;
  (function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of pieces) {
      p.y += p.vy; p.x += p.vx; p.rot += 0.1;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); ctx.restore();
    }
    if (++frames < 260) requestAnimationFrame(tick);
  })();
}
