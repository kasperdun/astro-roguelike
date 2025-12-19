export function clampDt(dt: number): number {
  if (!Number.isFinite(dt) || dt <= 0) return 0;
  return Math.min(dt, 0.05);
}

export function wrap(obj: { x: number; y: number }, w: number, h: number, r: number) {
  if (obj.x < -r) obj.x = w + r;
  if (obj.x > w + r) obj.x = -r;
  if (obj.y < -r) obj.y = h + r;
  if (obj.y > h + r) obj.y = -r;
}

export function circleHit(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const rr = r1 + r2;
  return dx * dx + dy * dy <= rr * rr;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerp01(t: number): number {
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.min(1, t));
}

export function randInt(min: number, max: number): number {
  const a = Math.ceil(Math.min(min, max));
  const b = Math.floor(Math.max(min, max));
  return Math.floor(a + Math.random() * (b - a + 1));
}

export function rotate(x: number, y: number, rad: number): { x: number; y: number } {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: x * c - y * s, y: x * s + y * c };
}




