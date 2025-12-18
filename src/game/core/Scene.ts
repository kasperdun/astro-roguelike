export type SceneId = 'menu_bg' | 'run';

export interface Scene {
    readonly id: SceneId;
    mount(): void;
    unmount(): void;
    resize(width: number, height: number): void;
}


