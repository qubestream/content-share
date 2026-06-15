// Pure runner physics. No DOM, no canvas — safe to import in Node tests.
export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}
export function tryJump(state, jumpVelocity) {
  if (!state.onGround) return state;
  return { ...state, vy: jumpVelocity, onGround: false };
}
export function stepRunner(state, { gravity, groundY }) {
  let y = state.y + state.vy;
  let vy = state.vy + gravity;
  let onGround = false;
  if (y >= groundY) {
    y = groundY;
    vy = 0;
    onGround = true;
  }
  return { ...state, y, vy, onGround };
}
