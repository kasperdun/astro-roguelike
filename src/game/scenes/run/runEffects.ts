import { gsap } from 'gsap';
import { Container, Graphics } from 'pixi.js';
import { lerp } from './runMath';

export function flashAsteroid(g: Graphics) {
  gsap.killTweensOf(g);
  const base = g.alpha;
  gsap.to(g, {
    duration: 0.06,
    alpha: 0.45,
    yoyo: true,
    repeat: 1,
    ease: 'power1.out',
    onComplete: () => {
      g.alpha = base;
    }
  });
}

export function spawnExplosion(parent: Container, x: number, y: number, r: number) {
  const g = new Graphics();
  g.x = x;
  g.y = y;
  parent.addChild(g);

  const start = r * 0.25;
  const end = r * 1.25;

  const state = { t: 0 };
  gsap.to(state, {
    duration: 0.22,
    t: 1,
    ease: 'power2.out',
    onUpdate: () => {
      const rr = lerp(start, end, state.t);
      const a = lerp(0.55, 0, state.t);
      g.clear();
      g.circle(0, 0, rr).stroke({ color: 0xe8ecff, alpha: a, width: 2 });
    },
    onComplete: () => {
      parent.removeChild(g);
    }
  });
}


