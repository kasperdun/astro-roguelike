import { gsap } from 'gsap';
import { Sprite, Texture } from 'pixi.js';
import { GAME_CONFIG } from '../../../config/gameConfig';
import { getRunAssets, type RunAssets } from '../../runAssets';

export type ShipDamageStage = 'full' | 'slight' | 'damaged' | 'very_damaged';

export class RunShipView {
    public readonly sprite = new Sprite();
    public isWarpingIn = false;

    private stage: ShipDamageStage = 'full';

    public build(args: { width: number; height: number; assets?: RunAssets | null }) {
        this.sprite.anchor.set(0.5);
        this.sprite.rotation = 0;
        this.stage = 'full';
        this.sprite.texture = args.assets?.shipFull ?? getRunAssets()?.shipFull ?? Texture.EMPTY;
        this.applyVisualSize();

        this.sprite.x = args.width / 2;
        this.sprite.y = args.height / 2;
        this.sprite.alpha = 1;
    }

    public resetTweens() {
        gsap.killTweensOf(this.sprite);
        this.isWarpingIn = false;
    }

    public applyVisualSize() {
        // Make the sprite readable while keeping collisions governed by GAME_CONFIG.shipCollisionRadiusPx.
        const base = GAME_CONFIG.shipCollisionRadiusPx * 3.2;
        const tex = this.sprite.texture;
        const tw = tex.width;
        const th = tex.height;
        if (tw > 1 && th > 1) {
            this.sprite.width = base;
            this.sprite.height = (base * th) / tw;
        } else {
            // Texture not ready yet; apply a reasonable square placeholder size.
            this.sprite.width = base;
            this.sprite.height = base;
        }
    }

    public syncTextureFromHp(hp: number, maxHp: number, force = false) {
        const assets = getRunAssets();
        if (!assets) return;

        const max = Math.max(0.0001, maxHp);
        const ratio = hp / max;
        const next: ShipDamageStage =
            ratio < 0.25 ? 'very_damaged' : ratio < 0.5 ? 'damaged' : ratio < 0.8 ? 'slight' : 'full';

        if (!force && next === this.stage) return;
        this.stage = next;

        this.sprite.texture =
            next === 'full'
                ? assets.shipFull
                : next === 'slight'
                    ? assets.shipSlight
                    : next === 'damaged'
                        ? assets.shipDamaged
                        : assets.shipVeryDamaged;
        this.applyVisualSize();
    }

    public warpIn(args: { width: number; height: number; durationSec: number }) {
        const targetX = args.width / 2;
        const targetY = args.height / 2;

        this.isWarpingIn = true;
        this.sprite.x = -80;
        this.sprite.y = targetY;
        this.sprite.alpha = 0;

        gsap.killTweensOf(this.sprite);
        gsap.to(this.sprite, {
            duration: args.durationSec,
            x: targetX,
            y: targetY,
            alpha: 1,
            ease: 'power3.out',
            onComplete: () => {
                this.isWarpingIn = false;
            }
        });
    }
}


