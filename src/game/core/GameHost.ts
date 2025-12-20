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
    // IMPORTANT (React 18 StrictMode / Fast Refresh):
    // Do not create WebGL resources during render. This factory can be called during
    // render (e.g. inside useMemo initializer), and React may invoke render twice.
    // We create Pixi Application lazily inside mount() and destroy it in unmount().
    let app: Application | null = null;
    let scenes: { menu_bg: MenuBackgroundScene; run: RunScene } | null = null;

    let mountedEl: HTMLElement | null = null;
    let activeScene: Scene | null = null;
    let isReady = false;
    let initPromise: Promise<void> | null = null;
    let initToken = 0;
    let canvasEl: HTMLCanvasElement | null = null;
    let pendingSceneId: Scene['id'] | null = null;
    let pendingRunLevelId: LevelId | null = null;
    let isMounted = false;

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
        app?.renderer.resize(w, h);
        activeScene?.resize(w, h);
    }

    const resizeObserver = new ResizeObserver(() => resizeToContainer());

    function ensureAppAndScenes() {
        if (!app) app = new Application();
        if (!scenes) scenes = { menu_bg: new MenuBackgroundScene(app), run: new RunScene(app) };
        return { app, scenes };
    }

    return {
        mount: (container) => {
            mountedEl = container;
            isMounted = true;

            // If Pixi is already initialized (React StrictMode can mount/unmount/mount),
            // just re-attach the existing canvas and continue.
            if (isReady) {
                if (!app || !scenes) {
                    // Shouldn't happen, but keep behavior safe.
                    isReady = false;
                } else {
                    canvasEl = app.canvas;
                    mountedEl.appendChild(canvasEl);
                    resizeObserver.observe(mountedEl);
                    app.start();
                    const target =
                        pendingSceneId === 'run' ? scenes.run :
                            pendingSceneId === 'menu_bg' ? scenes.menu_bg :
                                scenes.menu_bg;
                    if (pendingSceneId === 'run' && pendingRunLevelId) scenes.run.setLevel(pendingRunLevelId);
                    pendingSceneId = null;
                    pendingRunLevelId = null;
                    activate(target);
                    return;
                }
            }

            const ensured = ensureAppAndScenes();
            const myApp = ensured.app;
            const myScenes = ensured.scenes;

            // Token guards against StrictMode / HMR sequences:
            // mount(A) -> start init -> unmount (destroy A) -> mount(B) -> init(B)
            // If init(A) resolves late, we must NOT touch current host state.
            const myToken = ++initToken;

            // Pixi v8: init() is async
            initPromise =
                initPromise ??
                myApp.init({
                    backgroundAlpha: 0,
                    antialias: true,
                    resolution: window.devicePixelRatio || 1,
                    autoDensity: true
                });

            void initPromise.then(() => {
                if (myToken !== initToken) return;
                if (!mountedEl || !isMounted) return;
                if (app !== myApp || scenes !== myScenes) return;
                isReady = true;
                canvasEl = myApp.canvas;
                mountedEl.appendChild(canvasEl);
                resizeObserver.observe(mountedEl);

                // If something requested a scene before init finished, honor it.
                const target =
                    pendingSceneId === 'run' ? myScenes.run :
                        pendingSceneId === 'menu_bg' ? myScenes.menu_bg :
                            myScenes.menu_bg;
                if (pendingSceneId === 'run' && pendingRunLevelId) myScenes.run.setLevel(pendingRunLevelId);
                pendingSceneId = null;
                pendingRunLevelId = null;
                activate(target);
            });
        },
        unmount: () => {
            isMounted = false;
            if (mountedEl) resizeObserver.unobserve(mountedEl);
            pendingSceneId = null;
            pendingRunLevelId = null;
            initToken++;

            // If init didn't finish yet, we still want cleanup to be safe.
            if (isReady) {
                activeScene?.unmount();
                activeScene = null;

                if (mountedEl && canvasEl && canvasEl.parentElement === mountedEl) {
                    mountedEl.removeChild(canvasEl);
                }
                app?.stop();
            }

            // Always destroy Pixi on unmount to release the WebGL context.
            // This is required for React StrictMode + Fast Refresh stability.
            try {
                app?.stop();
                app?.destroy(true);
            } catch {
                // ignore - we only care about best-effort cleanup in dev/hmr scenarios
            }

            app = null;
            scenes = null;
            isReady = false;
            initPromise = null;

            mountedEl = null;
            canvasEl = null;
        },
        showMenuBackground: () => {
            if (!isReady) {
                pendingSceneId = 'menu_bg';
                return;
            }
            if (!scenes) return;
            activate(scenes.menu_bg);
        },
        startRun: (levelId) => {
            if (!isReady) {
                pendingSceneId = 'run';
                pendingRunLevelId = levelId;
                return;
            }
            if (!scenes) return;
            scenes.run.setLevel(levelId);
            activate(scenes.run);
        }
    };
}


