import { Container, Graphics } from 'pixi.js';
import type { Application } from 'pixi.js';
import type { Scene } from '../core/Scene';

export class MenuBackgroundScene implements Scene {
  public readonly id = 'menu_bg' as const;

  private readonly root = new Container();
  private readonly bg = new Graphics();

  public constructor(private readonly app: Application) {}

  mount() {
    this.root.addChild(this.bg);
    this.app.stage.addChild(this.root);
  }

  unmount() {
    this.root.removeChildren();
    this.app.stage.removeChild(this.root);
  }

  resize(width: number, height: number) {
    this.bg.clear();
    this.bg.rect(0, 0, width, height).fill({ color: 0x070a12, alpha: 1 });

    // simple vignette-ish overlay
    this.bg
      .rect(0, 0, width, height)
      .fill({ color: 0x000000, alpha: 0.25 })
      .stroke({ color: 0x1b2a55, alpha: 0.25, width: 2 });
  }
}




