// Pixel-art sprites drawn as scaled rects. Each sprite is rows of single-char
// codes mapped through PALETTE. '.' = transparent. Designed at a small grid and
// drawn at integer scale for crisp retro pixels.

const PALETTE = {
  '.': null,          // transparent
  S: '#d9dde3',       // silver hair
  s: '#b9c0c8',       // hair shadow
  K: '#f3c9a9',       // skin
  k: '#e0ad88',       // skin shadow
  G: '#6fa07a',       // cardigan green
  g: '#557d60',       // cardigan shadow
  W: '#fbfbfb',       // white top
  B: '#222222',       // skirt / outline
  R: '#d6334a',       // red glasses
  E: '#3a3a3a',       // eyes
};

// 12 wide x 16 tall. Two run frames (legs swap) + a jump pose.
const CINDY_RUN_A = [
  '....SSSS....',
  '...SSSSSS...',
  '..SSsKKsS...',
  '..SKKKKKS...',
  '..RKEKEKR...',
  '...KKkKK....',
  '..GGGGGGG...',
  '.GGGWWWGGG..',
  '.GGGWWWGGG..',
  '.GGGWWWGG...',
  '..GGGGGG....',
  '..BBBBBB....',
  '..BB..BB....',
  '..BB..BB....',
  '.KK....KK...',
  '.KK......K..',
];
const CINDY_RUN_B = [
  '....SSSS....',
  '...SSSSSS...',
  '..SSsKKsS...',
  '..SKKKKKS...',
  '..RKEKEKR...',
  '...KKkKK....',
  '..GGGGGGG...',
  '.GGGWWWGGG..',
  '.GGGWWWGGG..',
  '..GGWWWGGG..',
  '..GGGGGG....',
  '..BBBBBB....',
  '..BB..BB....',
  '..BB..BB....',
  '..KK..KK....',
  '.K......KK..',
];
const CINDY_JUMP = [
  '....SSSS....',
  '...SSSSSS...',
  '..SSsKKsS...',
  '..SKKKKKS...',
  '..RKEKEKR...',
  '...KKkKK....',
  '.GGGGGGGG...',
  'GGGWWWGGGG..',
  '.GGWWWGGG...',
  '..GGGGGG....',
  '..BBBBBB....',
  '..BB..BB....',
  '..BBB.BBB...',
  '.KK......KK.',
  '............',
  '............',
];

const PRESENT = [
  '..Y..Y..',
  '...YY...',
  'CCCCCCCC',
  'CCCYYCCC',
  'YYYYYYYY',
  'CCCYYCCC',
  'CCCYYCCC',
  'CCCYYCCC',
];
const BALLOON = [
  '..PPPP..',
  '.PPPPPP.',
  '.PPPPPP.',
  '.PPPPPP.',
  '..PPPP..',
  '...PP...',
  '....P...',
  '...P....',
];
const CAN = [
  '.gRRRRg.',
  '.RRRRRR.',
  '.RRWWRR.',
  '.RRWWRR.',
  '.RRRRRR.',
  '.gRRRRg.',
  '........',
  '........',
];
const BAG = [
  '..BBBB..',
  '.BBBBBB.',
  'BBBBBBBB',
  'BBBBBBBB',
  'BBBBBBBB',
  'BBBBBBBB',
  '.BBBBBB.',
  '........',
];
const BANANA = [
  '....YY..',
  '...YY...',
  '..YY....',
  '.YY.....',
  '.YY.....',
  '..YYYY..',
  '....YYY.',
  '........',
];

const ITEM_PALETTE = {
  '.': null, R: '#d6334a', Y: '#ffd23f', P: '#ff7eb6',
  g: '#9aa0a6', W: '#e8eaed', B: '#5b4636', C: '#3aa0ff',
};

function drawGrid(ctx, grid, palette, x, y, scale) {
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const color = palette[grid[row][col]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}

export const SPRITE_SCALE = 4;

export function drawCindy(ctx, x, y, { jumping, runPhase }) {
  const grid = jumping ? CINDY_JUMP : runPhase ? CINDY_RUN_B : CINDY_RUN_A;
  drawGrid(ctx, grid, PALETTE, x, y, SPRITE_SCALE);
}

export const CINDY_W = 12 * SPRITE_SCALE;
export const CINDY_H = 16 * SPRITE_SCALE;

const ITEM_GRIDS = { present: PRESENT, balloon: BALLOON, can: CAN, bag: BAG, banana: BANANA };

export function drawItem(ctx, kind, x, y, scale = SPRITE_SCALE) {
  drawGrid(ctx, ITEM_GRIDS[kind] || PRESENT, ITEM_PALETTE, x, y, scale);
}
export const ITEM_SIZE = 8 * SPRITE_SCALE;

export function drawBackground(ctx, w, h, scrollX) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#ffd9a8');
  sky.addColorStop(1, '#ffb3d1');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#caa6e8';
  const off1 = -(scrollX * 0.3) % 240;
  for (let bx = off1 - 240; bx < w + 240; bx += 240) {
    ctx.beginPath();
    ctx.arc(bx + 120, h * 0.7, 120, Math.PI, 0);
    ctx.fill();
  }
  ctx.fillStyle = '#8ad48a';
  ctx.fillRect(0, h - 28, w, 28);
  ctx.fillStyle = '#74b974';
  const off2 = -(scrollX * 1.0) % 32;
  for (let gx = off2 - 32; gx < w + 32; gx += 32) {
    ctx.fillRect(gx, h - 28, 16, 6);
  }
}
