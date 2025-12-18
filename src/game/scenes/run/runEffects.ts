import { gsap } from 'gsap';
import { AnimatedSprite, Container, Graphics } from 'pixi.js';
import { preloadRunAssets } from '../../runAssets';
import { lerp } from './runMath';

// Start loading early.
void preloadRunAssets();

export function flashAsteroid(g: { alpha: number }) {
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

export function flashEnemy(g: { alpha: number }) {
  // Same visual language as asteroid hit flash, but kept separate for future tuning.
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

export function spawnAsteroidExplosion(parent: Container, x: number, y: number, r: number) {
  // Keep the old ring as a fallback / instant feedback while the sheet loads (first time).
  spawnExplosion(parent, x, y, r);

  void preloadRunAssets().then((assets) => {
    const anim = new AnimatedSprite(assets.asteroidExplodeFrames);
    anim.anchor.set(0.5);
    anim.x = x;
    anim.y = y;

    // Visual size: slightly larger than the asteroid.
    const size = r * 2.6;
    anim.width = size;
    anim.height = size;

    anim.loop = false;
    anim.animationSpeed = 0.9;
    anim.onComplete = () => {
      parent.removeChild(anim);
      anim.destroy();
    };

    parent.addChild(anim);
    anim.play();
  });
}


