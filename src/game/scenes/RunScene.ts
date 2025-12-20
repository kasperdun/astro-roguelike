import { Container, Texture, TilingSprite } from 'pixi.js';
import type { Application, Ticker } from 'pixi.js';
import { useGameStore, type LevelId } from '../../state/gameStore';
import type { Scene } from '../core/Scene';
import { installRunInput } from './run/runInput';
import { createRunHudView, hookRunHud, type RunHudView } from './run/runHud';
import { preloadRunAssets } from '../runAssets';
import { layoutTilingBackground, pickRandomBackgroundTexture } from '../backgrounds';
import { RunRuntime } from './run/runRuntime';
import { tickRun } from './run/runRuntimeTick';

export class RunScene implements Scene {
    public readonly id = 'run' as const;

    private readonly root = new Container();
    private readonly bg = new TilingSprite({ texture: Texture.EMPTY, width: 1, height: 1 });
    private readonly world = new Container();
    private readonly hud = new Container();
    private bgLoadToken = 0;

    private hudView: RunHudView | null = null;
    private runtime: RunRuntime | null = null;

    private levelId: LevelId = 1;
    private width = 1;
    private height = 1;

    private tickerFn: ((t: Ticker) => void) | null = null;
    private unsubStore: (() => void) | null = null;
    private unsubInput: (() => void) | null = null;

    public constructor(private readonly app: Application) { }

    public setLevel(levelId: LevelId) {
        this.levelId = levelId;
    }

    mount() {
        const token = ++this.bgLoadToken;
        this.bg.texture = Texture.EMPTY;
        void pickRandomBackgroundTexture().then((tex) => {
            if (token !== this.bgLoadToken) return;
            if (!tex) return;
            this.bg.texture = tex;
        });

        this.root.addChild(this.bg);
        this.root.addChild(this.world);
        this.root.addChild(this.hud);
        this.app.stage.addChild(this.root);

        this.hudView = createRunHudView();
        this.hud.addChild(this.hudView.root);
        this.hudView.setScreenSize(this.width, this.height);

        // Important: mount() can be called before GameHost triggers resizeToContainer().
        // If we start warp-in with width/height still at defaults (1x1), the "center"
        // becomes top-left-ish. Sync to current renderer size first.
        this.resize(this.app.renderer.width, this.app.renderer.height);

        this.runtime = this.runtime ?? new RunRuntime(this.app, this.world);
        const run = useGameStore.getState().run;
        this.runtime.mount({
            width: this.width,
            height: this.height,
            asteroidsMaxCount: run?.stats.asteroidsMaxCount,
            asteroidsSpawnIntervalSec: run?.stats.asteroidsSpawnIntervalSec
        });

        // Kick off asset loading; once ready, patch textures on already-created sprites.
        void preloadRunAssets().then((assets) => {
            this.runtime?.onAssetsReady(assets);
            const run = useGameStore.getState().run;
            if (run) this.runtime?.ship.syncTextureFromHp(run.hp, run.maxHp, true);
        });

        this.unsubStore = hookRunHud({ hud: this.hudView, getLevelId: () => this.levelId });
        this.unsubInput = installRunInput({ input: this.runtime.input });

        this.tickerFn = (t) => {
            const rt = this.runtime;
            if (!rt) return;
            tickRun(rt, t.deltaMS / 1000);
        };
        this.app.ticker.add(this.tickerFn);
    }

    unmount() {
        this.bgLoadToken++;
        if (this.tickerFn) this.app.ticker.remove(this.tickerFn);
        this.tickerFn = null;

        this.unsubStore?.();
        this.unsubStore = null;

        this.unsubInput?.();
        this.unsubInput = null;

        this.runtime?.unmount();
        this.world.removeChildren();
        this.hud.removeChildren();
        this.hudView?.destroy();
        this.hudView = null;
        this.root.removeChildren();
        this.app.stage.removeChild(this.root);
    }

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
        layoutTilingBackground(this.bg, width, height);
        this.hudView?.setScreenSize(width, height);
        this.runtime?.resize(width, height);
    }
}
