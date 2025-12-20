import { Container, Graphics, Texture, TilingSprite } from 'pixi.js';
import type { Application } from 'pixi.js';
import type { Scene } from '../core/Scene';
import { layoutTilingBackground, pickRandomBackgroundTexture } from '../backgrounds';

export class MenuBackgroundScene implements Scene {
    public readonly id = 'menu_bg' as const;

    private readonly root = new Container();
    private readonly fill = new Graphics();
    private readonly bg = new TilingSprite({ texture: Texture.EMPTY, width: 1, height: 1 });
    private readonly overlay = new Graphics();
    private bgLoadToken = 0;

    public constructor(private readonly app: Application) { }

    mount() {
        const token = ++this.bgLoadToken;
        this.bg.texture = Texture.EMPTY;
        void pickRandomBackgroundTexture().then((tex) => {
            if (token !== this.bgLoadToken) return;
            if (!tex) return;
            this.bg.texture = tex;
        });

        this.root.addChild(this.fill);
        this.root.addChild(this.bg);
        this.root.addChild(this.overlay);
        this.app.stage.addChild(this.root);
    }

    unmount() {
        this.bgLoadToken++;
        this.root.removeChildren();
        this.app.stage.removeChild(this.root);
    }

    resize(width: number, height: number) {
        this.fill.clear();
        this.fill.rect(0, 0, width, height).fill({ color: 0x070a12, alpha: 1 });

        layoutTilingBackground(this.bg, width, height);

        // simple vignette-ish overlay
        this.overlay.clear();
        this.overlay
            .rect(0, 0, width, height)
            .fill({ color: 0x000000, alpha: 0.25 })
            .stroke({ color: 0x1b2a55, alpha: 0.25, width: 2 });
    }
}




