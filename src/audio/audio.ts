type MusicKind = 'menu' | 'run';
type SfxKind = 'click' | 'laser' | 'warp' | 'hit' | 'ship_dead' | 'asteroid_dead';

function assetUrl(relativeToThisFile: string): string {
    // Vite will rewrite this into a hashed asset URL.
    return new URL(relativeToThisFile, import.meta.url).toString();
}

const MUSIC_URL: Record<MusicKind, string> = {
    menu: assetUrl('../../assets/sounds/Forgotten Biomes.ogg'),
    run: assetUrl('../../assets/sounds/Strange Worlds.ogg')
};

const SFX_URL: Record<SfxKind, string> = {
    click: assetUrl('../../assets/sounds/click_sound.wav'),
    laser: assetUrl('../../assets/sounds/lasergun.ogg'),
    warp: assetUrl('../../assets/sounds/underwater world.ogg'),
    hit: assetUrl('../../assets/sounds/Hit.ogg'),
    ship_dead: assetUrl('../../assets/sounds/dead.ogg'),
    asteroid_dead: assetUrl('../../assets/sounds/Asteroid dead.wav')
};

const DEFAULT_MUSIC_VOLUME: Record<MusicKind, number> = {
    menu: 0.28,
    run: 0.32
};

const DEFAULT_SFX_VOLUME: Record<SfxKind, number> = {
    click: 0.55,
    laser: 0.25,
    warp: 0.65,
    hit: 0.25,
    ship_dead: 0.45,
    asteroid_dead: 0.45
};

const SFX_MIN_INTERVAL_MS: Record<SfxKind, number> = {
    click: 35,
    laser: 28,
    warp: 250,
    hit: 22,
    ship_dead: 500,
    asteroid_dead: 35
};

class AudioManager {
    private music: HTMLAudioElement | null = null;
    private musicKind: MusicKind | null = null;
    private desiredMusicKind: MusicKind | null = null;
    private musicRequestId = 0;

    private lastSfxAtMs: Partial<Record<SfxKind, number>> = {};
    private lastPickupAtMs = -Infinity;
    private sfxPools = new Map<string, HTMLAudioElement[]>();

    /**
     * Browsers can block autoplay until the first user gesture.
     * We treat any UI-triggered SFX as a "gesture" and try to (re)start music then.
     */
    private hadUserGesture = false;

    public setBackgroundMusic(kind: MusicKind | null) {
        this.desiredMusicKind = kind;
        void this.applyBackgroundMusic();
    }

    public stopAll() {
        this.musicRequestId++;
        this.desiredMusicKind = null;
        this.stopMusic();
    }

    public playMenuClick() {
        this.markUserGesture();
        this.playSfx('click');
    }

    public playWarp() {
        this.markUserGesture();
        this.playSfx('warp');
    }

    public playLaser() {
        // Likely already unlocked by user gesture (mouse/keyboard), but it's safe.
        this.markUserGesture();
        this.playSfx('laser');
    }

    public playHit() {
        this.markUserGesture();
        this.playSfx('hit');
    }

    public playShipDead() {
        this.markUserGesture();
        this.playSfx('ship_dead');
    }

    public playAsteroidDead() {
        this.markUserGesture();
        this.playSfx('asteroid_dead');
    }

    public playPickupPop() {
        this.markUserGesture();

        const now = performance.now();
        if (now - this.lastPickupAtMs < 35) return;
        this.lastPickupAtMs = now;

        const pop1 = assetUrl('../../assets/sounds/pop1.flac');
        const pop2 = assetUrl('../../assets/sounds/pop2.aiff');

        const a = document.createElement('audio');
        const canAiff = a.canPlayType('audio/aiff') !== '' || a.canPlayType('audio/x-aiff') !== '';

        const urls = canAiff ? this.pickRandomOrder([pop1, pop2]) : [pop1, pop2];
        this.playFromUrls(urls, { volume: 0.55 });
    }

    private markUserGesture() {
        this.hadUserGesture = true;
        // If music was blocked earlier, retry now.
        void this.applyBackgroundMusic();
    }

    private stopMusic() {
        if (!this.music) return;
        this.music.pause();
        try {
            this.music.currentTime = 0;
        } catch {
            // ignore
        }
        this.music = null;
        this.musicKind = null;
    }

    private async applyBackgroundMusic() {
        const reqId = ++this.musicRequestId;
        const desired = this.desiredMusicKind;
        if (!desired) {
            this.stopMusic();
            return;
        }

        // Already playing the desired music.
        if (this.music && this.musicKind === desired && !this.music.paused) return;

        // Replace current music.
        this.stopMusic();

        const el = new Audio(MUSIC_URL[desired]);
        el.preload = 'auto';
        el.loop = true;
        el.volume = DEFAULT_MUSIC_VOLUME[desired];
        this.music = el;
        this.musicKind = desired;

        // If autoplay is blocked and we have no user gesture yet, this will fail.
        // That's OK: we'll retry on the first click (markUserGesture()).
        const ok = await this.tryPlay(el);
        if (reqId !== this.musicRequestId) return;
        if (!ok && !this.hadUserGesture) {
            // Keep desiredMusicKind; we'll retry later.
            this.stopMusic();
        }
    }

    private playSfx(kind: SfxKind) {
        const now = performance.now();
        const last = this.lastSfxAtMs[kind] ?? -Infinity;
        if (now - last < SFX_MIN_INTERVAL_MS[kind]) return;
        this.lastSfxAtMs[kind] = now;

        this.playFromUrls([SFX_URL[kind]], { volume: DEFAULT_SFX_VOLUME[kind], kind });
    }

    private playFromUrls(
        urls: string[],
        opts: { volume: number; kind?: SfxKind }
    ) {
        for (const url of urls) {
            const pool = this.getUrlPool(url);
            const el = pool.find((a) => a.paused || a.ended) ?? this.maybeGrowUrlPool(url, pool, opts.kind);
            if (!el) continue;

            el.volume = opts.volume;
            try {
                el.currentTime = 0;
            } catch {
                // ignore
            }

            void this.tryPlay(el).then((ok) => {
                // If this format isn't supported / playback failed, try next URL.
                if (!ok) this.playFromUrls(urls.slice(urls.indexOf(url) + 1), opts);
            });
            return;
        }
    }

    private getUrlPool(url: string): HTMLAudioElement[] {
        const existing = this.sfxPools.get(url);
        if (existing) return existing;

        const base = new Audio(url);
        base.preload = 'auto';
        const pool = [base];
        this.sfxPools.set(url, pool);
        return pool;
    }

    private maybeGrowUrlPool(url: string, pool: HTMLAudioElement[], kind?: SfxKind): HTMLAudioElement | null {
        // Prevent unbounded memory growth if player holds fire.
        const MAX_PER_KIND: Record<SfxKind, number> = {
            click: 4,
            warp: 2,
            laser: 10,
            hit: 8,
            ship_dead: 2,
            asteroid_dead: 6
        };
        const max = kind ? MAX_PER_KIND[kind] : 4;
        if (pool.length >= max) return null;

        const el = new Audio(url);
        el.preload = 'auto';
        pool.push(el);
        return el;
    }

    private pickRandomOrder<T>(items: T[]): T[] {
        if (items.length <= 1) return items.slice();
        const i = Math.floor(Math.random() * items.length);
        const first = items[i]!;
        const rest = items.filter((_, idx) => idx !== i);
        return [first, ...rest];
    }

    private async tryPlay(el: HTMLAudioElement): Promise<boolean> {
        try {
            await el.play();
            return true;
        } catch {
            return false;
        }
    }
}

export const audio = new AudioManager();


