import { gsap } from 'gsap';
import { AnimatedSprite, Container, Graphics } from 'pixi.js';
import { preloadRunAssets } from '../../runAssets';
import type { EnemyKind } from '../../enemies/enemyCatalog';
import type { BossKind } from '../../boss/bossCatalog';
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

export function spawnEnemyDestruction(parent: Container, args: { x: number; y: number; r: number; kind: EnemyKind; rotationRad: number }) {
  // Immediate feedback ring (also acts as fallback if sheet can't load).
  spawnExplosion(parent, args.x, args.y, args.r);

  void preloadRunAssets().then((assets) => {
    const frames = assets.enemy[args.kind].destructionFrames;
    if (!frames.length) return;

    const anim = new AnimatedSprite(frames);
    anim.anchor.set(0.5);
    anim.x = args.x;
    anim.y = args.y;
    anim.rotation = args.rotationRad;

    // Visual size: a bit larger than collision radius so it reads well.
    const size = args.r * 3.0;
    anim.width = size;
    anim.height = size;

    anim.loop = false;
    // Make the destruction readable: keep ~constant perceived duration across sheets with different frame counts.
    // AnimatedSprite advances `animationSpeed` frames per tick; at 60fps, duration ≈ framesCount / (animationSpeed * 60).
    const desiredDurationSec = 1.05;
    const fps = 60;
    const speed = frames.length / Math.max(1, desiredDurationSec * fps);
    anim.animationSpeed = Math.min(1.0, Math.max(0.12, speed));
    anim.onComplete = () => {
      parent.removeChild(anim);
      anim.destroy();
    };

    parent.addChild(anim);
    anim.play();
  });
}

export function spawnBossDestruction(parent: Container, args: { x: number; y: number; r: number; kind: BossKind; rotationRad: number }) {
  spawnExplosion(parent, args.x, args.y, args.r * 1.2);

  void preloadRunAssets().then((assets) => {
    const frames = assets.boss[args.kind].destructionFrames;
    if (!frames.length) return;

    const anim = new AnimatedSprite(frames);
    anim.anchor.set(0.5);
    anim.x = args.x;
    anim.y = args.y;
    anim.rotation = args.rotationRad;

    // Bigger than regular enemies.
    const size = args.r * 3.4;
    anim.width = size;
    anim.height = size;

    anim.loop = false;
    const desiredDurationSec = 1.25;
    const fps = 60;
    const speed = frames.length / Math.max(1, desiredDurationSec * fps);
    anim.animationSpeed = Math.min(1.0, Math.max(0.12, speed));
    anim.onComplete = () => {
      parent.removeChild(anim);
      anim.destroy();
    };

    parent.addChild(anim);
    anim.play();
  });
}


