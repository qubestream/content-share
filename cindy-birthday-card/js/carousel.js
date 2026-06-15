import { photos } from '../photos.js?v=mqeo4y7g';

// Mounts a carousel into `root` (an element). Returns nothing.
export function initCarousel(root, photoDir = 'photos') {
  if (!photos || photos.length === 0) {
    root.innerHTML = '<p class="carousel-empty">Photos coming soon 💛</p>';
    return;
  }

  let index = 0;
  root.classList.add('carousel');
  root.innerHTML = `
    <button class="carousel-arrow prev" aria-label="Previous photo">‹</button>
    <div class="carousel-viewport"><div class="carousel-track"></div></div>
    <button class="carousel-arrow next" aria-label="Next photo">›</button>
    <div class="carousel-dots" role="tablist"></div>
  `;

  const track = root.querySelector('.carousel-track');
  const dots = root.querySelector('.carousel-dots');

  photos.forEach((p, i) => {
    const fig = document.createElement('figure');
    fig.className = 'carousel-slide';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = `${photoDir}/${p.src}`;
    img.alt = p.caption || `Photo ${i + 1}`;
    fig.appendChild(img);
    if (p.caption) {
      const cap = document.createElement('figcaption');
      cap.textContent = p.caption;
      fig.appendChild(cap);
    }
    track.appendChild(fig);

    const dot = document.createElement('button');
    dot.className = 'carousel-dot';
    dot.setAttribute('aria-label', `Go to photo ${i + 1}`);
    dot.addEventListener('click', () => go(i));
    dots.appendChild(dot);
  });

  function go(i) {
    index = (i + photos.length) % photos.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.querySelectorAll('.carousel-dot').forEach((d, di) =>
      d.classList.toggle('active', di === index),
    );
  }

  root.querySelector('.prev').addEventListener('click', () => go(index - 1));
  root.querySelector('.next').addEventListener('click', () => go(index + 1));

  let startX = 0;
  const vp = root.querySelector('.carousel-viewport');
  vp.addEventListener('touchstart', (e) => (startX = e.touches[0].clientX), { passive: true });
  vp.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) go(dx < 0 ? index + 1 : index - 1);
  });

  go(0);
}
