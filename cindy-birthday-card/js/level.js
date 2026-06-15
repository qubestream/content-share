// Pure level data. x is distance along the track in world pixels.
const TRASH_KINDS = ['can', 'bag', 'banana'];
function buildEntities() {
  const entities = [];
  let x = 600;
  let k = 0;
  while (x < 5400) {
    entities.push({ type: 'trash', x, kind: TRASH_KINDS[k % TRASH_KINDS.length] });
    entities.push({ type: 'present', x: x + 90 });
    if (k % 2 === 0) entities.push({ type: 'balloon', x: x + 200 });
    x += 440;
    k += 1;
  }
  return entities;
}
export const LEVEL = {
  length: 6000,
  finishX: 6000,
  groundY: 0,
  entities: buildEntities(),
};
export function validateLevel(level) {
  if (!(level.length > 0)) return false;
  if (level.finishX !== level.length) return false;
  const trash = level.entities.filter((e) => e.type === 'trash').sort((a, b) => a.x - b.x);
  for (let i = 1; i < trash.length; i++) {
    if (trash[i].x - trash[i - 1].x < 220) return false;
  }
  return level.entities.every(
    (e) => ['trash', 'present', 'balloon'].includes(e.type) && e.x >= 0 && e.x <= level.length,
  );
}
