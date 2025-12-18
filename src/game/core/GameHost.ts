import { Application } from 'pixi.js';
import { MenuBackgroundScene } from '../scenes/MenuBackgroundScene';
import { RunScene } from '../scenes/RunScene';
import type { Scene } from './Scene';
import type { LevelId } from '../../state/gameStore';

export type GameHost = {
  mount: (container: HTMLElement) => void;
  unmount: () => void;
  showMenuBackground: () => void;
  startRun: (levelId: LevelId) => void;
};

export function createGameHost(): GameHost {
  const app = new Application();

  let mountedEl: HTMLElement | null = null;
  let activeScene: Scene | null = null;
  let isReady = false;
  let initPromise: Promise<void> | null = null;
  let canvasEl: HTMLCanvasElement | null = null;
  let pendingScene: Scene | null = null;
  let isMounted = false;

  const scenes = {
    menu_bg: new MenuBackgroundScene(app),
    run: new RunScene(app)
  } as const;

  function activate(scene: Scene) {
    if (activeScene) activeScene.unmount();
    activeScene = scene;
    activeScene.mount();
    resizeToContainer();
  }

  function resizeToContainer() {
    const el = mountedEl;
    if (!el) return;
    if (!isReady) return;
    const rect = el.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    app.renderer.resize(w, h);
    activeScene?.resize(w, h);
  }

  const resizeObserver = new ResizeObserver(() => resizeToContainer());

  return {
    mount: (container) => {
      mountedEl = container;
      isMounted = true;

      // If Pixi is already initialized (React StrictMode can mount/unmount/mount),
      // just re-attach the existing canvas and continue.
      if (isReady) {
        canvasEl = app.canvas;
        mountedEl.appendChild(canvasEl);
        resizeObserver.observe(mountedEl);
        app.start();
        activate(pendingScene ?? scenes.menu_bg);
        pendingScene = null;
        return;
      }

      // Pixi v8: init() is async
      initPromise =
        initPromise ??
        app.init({
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true
        });

      void initPromise.then(() => {
        if (!mountedEl || !isMounted) return;
        isReady = true;
        canvasEl = app.canvas;
        mountedEl.appendChild(canvasEl);
        resizeObserver.observe(mountedEl);

        // If something requested a scene before init finished, honor it.
        if (pendingScene) {
          const s = pendingScene;
          pendingScene = null;
          activate(s);
        } else {
          activate(scenes.menu_bg);
        }
      });
    },
    unmount: () => {
      isMounted = false;
      if (mountedEl) resizeObserver.unobserve(mountedEl);
      pendingScene = null;

      // If init didn't finish yet, we still want cleanup to be safe.
      if (isReady) {
        activeScene?.unmount();
        activeScene = null;

        if (mountedEl && canvasEl && canvasEl.parentElement === mountedEl) {
          mountedEl.removeChild(canvasEl);
        }
        app.stop();
      }

      mountedEl = null;
      canvasEl = null;
    },
    showMenuBackground: () => {
      if (!isReady) {
        pendingScene = scenes.menu_bg;
        return;
      }
      activate(scenes.menu_bg);
    },
    startRun: (levelId) => {
      scenes.run.setLevel(levelId);
      if (!isReady) {
        pendingScene = scenes.run;
        return;
      }
      activate(scenes.run);
    }
  };
}


