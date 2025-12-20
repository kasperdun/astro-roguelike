import { Container, Graphics, Text } from 'pixi.js';
import { useGameStore, type LevelId, type RunSession } from '../../../state/gameStore';
import { lerp01 } from './runMath';

function lerpColor(a: number, b: number, t: number): number {
  const tt = lerp01(t);
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * tt);
  const g = Math.round(ag + (bg - ag) * tt);
  const b2 = Math.round(ab + (bb - ab) * tt);
  return (r << 16) | (g << 8) | b2;
}

function ratio(current: number, max: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) return 0;
  return lerp01(current / max);
}

export type RunHudView = {
  root: Container;
  setScreenSize: (w: number, h: number) => void;
  render: (args: {
    run: RunSession | null;
    levelId: LevelId;
    bossBar:
      | { mode: 'hidden' }
      | { mode: 'progress'; current: number; max: number; label: string; fillColor: number }
      | { mode: 'boss'; current: number; max: number; label: string; fillColor: number };
  }) => void;
  destroy: () => void;
};

export function createRunHudView(): RunHudView {
  const root = new Container();

  const topLeft = new Container();
  root.addChild(topLeft);

  const panel = new Graphics();
  topLeft.addChild(panel);

  const title = new Text({
    text: '',
    style: { fill: 0xe8ecff, fontSize: 14, fontWeight: '600' }
  });
  topLeft.addChild(title);

  const noSession = new Text({
    text: '(no session)',
    style: { fill: 0xaab2d6, fontSize: 12 }
  });
  topLeft.addChild(noSession);

  const textSmallStyle = { fill: 0xbfc7ea, fontSize: 12 } as const;
  const mineralsText = new Text({ text: '', style: textSmallStyle });
  const scrapText = new Text({ text: '', style: textSmallStyle });
  const coresText = new Text({ text: '', style: textSmallStyle });
  topLeft.addChild(mineralsText);
  topLeft.addChild(scrapText);
  topLeft.addChild(coresText);

  const controls = new Text({
    text: 'WASD: thrust   LMB: shoot   ESC: menu',
    style: { fill: 0x93a0d6, fontSize: 11 }
  });
  topLeft.addChild(controls);

  const barW = 190;
  const barH = 12;

  const hpRow = new Container();
  const shieldRow = new Container();
  const fuelRow = new Container();
  topLeft.addChild(hpRow, shieldRow, fuelRow);

  function makeBarRow(labelText: string): {
    row: Container;
    label: Text;
    value: Text;
    bg: Graphics;
    fill: Graphics;
    frame: Graphics;
    set: (current: number, max: number, fillColor: number) => void;
    setVisible: (v: boolean) => void;
  } {
    const row = new Container();

    const label = new Text({ text: labelText, style: { fill: 0xe8ecff, fontSize: 12, fontWeight: '600' } });
    const value = new Text({ text: '', style: { fill: 0xd7dcf2, fontSize: 12 } });

    const bg = new Graphics();
    const fill = new Graphics();
    const frame = new Graphics();

    row.addChild(label, bg, fill, frame, value);

    label.x = 0;
    label.y = -1;

    const barX = 54;
    const barY = 2;

    bg.x = barX;
    bg.y = barY;
    fill.x = barX;
    fill.y = barY;
    frame.x = barX;
    frame.y = barY;

    value.x = barX + barW + 10;
    value.y = -1;

    const set = (current: number, max: number, fillColor: number) => {
      const t = ratio(current, max);
      const w = Math.round(barW * t);

      bg.clear();
      bg.rect(0, 0, barW, barH).fill({ color: 0x0b1020, alpha: 0.65 });

      fill.clear();
      if (w > 0) fill.rect(0, 0, w, barH).fill({ color: fillColor, alpha: 0.95 });

      frame.clear();
      frame.rect(0, 0, barW, barH).stroke({ color: 0x5060a8, width: 1, alpha: 0.85 });

      value.text = `${Math.round(current)}/${Math.round(max)}`;
    };

    const setVisible = (v: boolean) => {
      row.visible = v;
    };

    return { row, label, value, bg, fill, frame, set, setVisible };
  }

  const hpBar = makeBarRow('HP');
  hpRow.addChild(hpBar.row);

  const shieldBar = makeBarRow('SHIELD');
  shieldRow.addChild(shieldBar.row);

  const fuelBar = makeBarRow('FUEL');
  fuelRow.addChild(fuelBar.row);

  // Bottom boss/progress bar (pinned to bottom).
  const bossRow = new Container();
  const bossBg = new Graphics();
  const bossFill = new Graphics();
  const bossFrame = new Graphics();
  const bossLabel = new Text({ text: '', style: { fill: 0xe8ecff, fontSize: 12, fontWeight: '600' } });
  const bossValue = new Text({ text: '', style: { fill: 0xd7dcf2, fontSize: 12 } });
  bossRow.addChild(bossBg, bossFill, bossFrame, bossLabel, bossValue);
  root.addChild(bossRow);

  // Layout constants
  const padX = 16;
  const padY = 12;
  const panelPad = 10;
  const rowGap = 18;

  let screenW = 1;
  let screenH = 1;

  function layout() {
    // Pin top-left panel to screen corner.
    topLeft.x = padX;
    topLeft.y = padY;

    title.x = panelPad;
    title.y = panelPad;

    noSession.x = panelPad;
    noSession.y = panelPad + 22;

    hpRow.x = panelPad;
    shieldRow.x = panelPad;
    fuelRow.x = panelPad;

    let y = panelPad + 22;
    if (hpRow.visible) {
      hpRow.y = y;
      y += rowGap;
    }
    if (shieldRow.visible) {
      shieldRow.y = y;
      y += rowGap;
    }
    if (fuelRow.visible) {
      fuelRow.y = y;
      y += rowGap;
    }

    mineralsText.x = panelPad;
    mineralsText.y = y + 2;

    scrapText.x = panelPad + 110;
    scrapText.y = mineralsText.y;

    coresText.x = panelPad + 200;
    coresText.y = mineralsText.y;

    controls.x = panelPad;
    controls.y = mineralsText.y + 18;

    const rowsCount = (hpRow.visible ? 1 : 0) + (shieldRow.visible ? 1 : 0) + (fuelRow.visible ? 1 : 0);
    const effectiveRows = Math.max(2, rowsCount); // keep minimum size stable
    const panelW = panelPad * 2 + 54 + barW + 10 + 150;
    const panelH = panelPad * 2 + 22 + rowGap * effectiveRows + 40;

    panel.clear();
    panel.rect(0, 0, panelW, panelH).fill({ color: 0x070a12, alpha: 0.45 });
    panel.rect(0, 0, panelW, panelH).stroke({ color: 0x2b3566, width: 1, alpha: 0.85 });

    // Bottom boss/progress row (centered).
    const barH2 = 12;
    const w = Math.round(Math.max(320, Math.min(820, screenW - 40)));
    const x = Math.round(screenW * 0.5 - w * 0.5);
    const y2 = Math.round(screenH - 18 - barH2);
    bossRow.x = x;
    bossRow.y = y2;

    bossLabel.x = 0;
    bossLabel.y = -18;
    bossValue.x = w;
    bossValue.y = -18;
    bossValue.anchor.set(1, 0);

    bossBg.x = 0;
    bossBg.y = 0;
    bossFill.x = 0;
    bossFill.y = 0;
    bossFrame.x = 0;
    bossFrame.y = 0;

    // Drawn in render() so we can color + fill amount.
    void w;
  }

  // Render state
  let last: {
    levelId: LevelId | null;
    hp: number;
    maxHp: number;
    shield: number;
    maxShield: number;
    fuel: number;
    maxFuel: number;
    minerals: number;
    scrap: number;
    cores: number;
    hasRun: boolean;
    bossMode: 'hidden' | 'progress' | 'boss';
    bossCurrent: number;
    bossMax: number;
  } | null = null;

  const render = (args: {
    run: RunSession | null;
    levelId: LevelId;
    bossBar:
      | { mode: 'hidden' }
      | { mode: 'progress'; current: number; max: number; label: string; fillColor: number }
      | { mode: 'boss'; current: number; max: number; label: string; fillColor: number };
  }) => {
    const { run, levelId, bossBar } = args;

    if (!run) {
      title.text = `LEVEL ${levelId}`;
      noSession.visible = true;
      hpRow.visible = false;
      shieldRow.visible = false;
      fuelRow.visible = false;
      bossRow.visible = false;
      mineralsText.text = '';
      scrapText.text = '';
      coresText.text = '';
      controls.visible = true;
      layout();
      last = null;
      return;
    }

    const next = {
      levelId: run.levelId,
      hp: run.hp,
      maxHp: run.maxHp,
      shield: run.shield,
      maxShield: run.maxShield,
      fuel: run.fuel,
      maxFuel: run.maxFuel,
      minerals: run.minerals,
      scrap: run.scrap,
      cores: run.cores,
      hasRun: true,
      bossMode: bossBar.mode,
      bossCurrent: bossBar.mode === 'hidden' ? 0 : bossBar.current,
      bossMax: bossBar.mode === 'hidden' ? 0 : bossBar.max
    } as const;

    // Cheap change detection: avoid redrawing when values didn't meaningfully change.
    const changed =
      !last ||
      last.levelId !== next.levelId ||
      Math.abs(last.hp - next.hp) >= 0.05 ||
      last.maxHp !== next.maxHp ||
      Math.abs(last.fuel - next.fuel) >= 0.05 ||
      last.maxFuel !== next.maxFuel ||
      Math.abs(last.shield - next.shield) >= 0.05 ||
      last.maxShield !== next.maxShield ||
      last.minerals !== next.minerals ||
      last.scrap !== next.scrap ||
      last.cores !== next.cores ||
      last.bossMode !== next.bossMode ||
      Math.abs(last.bossCurrent - next.bossCurrent) >= 0.05 ||
      last.bossMax !== next.bossMax;

    if (!changed) return;
    last = { ...next };

    title.text = `LEVEL ${run.levelId}`;
    noSession.visible = false;

    hpRow.visible = true;
    fuelRow.visible = true;
    shieldRow.visible = run.maxShield > 0;

    const hpT = ratio(run.hp, run.maxHp);
    const hpColor = lerpColor(0xe84a5f, 0x3ee89a, hpT);
    hpBar.set(run.hp, run.maxHp, hpColor);

    if (run.maxShield > 0) shieldBar.set(run.shield, run.maxShield, 0x7a6cff);
    fuelBar.set(run.fuel, run.maxFuel, 0x3db7ff);

    mineralsText.text = `MINERALS: ${run.minerals}`;
    scrapText.text = `SCRAP: ${run.scrap}`;
    coresText.text = `CORES: ${run.cores}`;

    controls.visible = true;

    bossRow.visible = bossBar.mode !== 'hidden';
    if (bossBar.mode !== 'hidden') {
      const barH2 = 12;
      const w = Math.round(Math.max(320, Math.min(820, screenW - 40)));
      const t = ratio(bossBar.current, bossBar.max);
      const fillW = Math.round(w * t);

      bossLabel.text = bossBar.mode === 'boss' ? `${bossBar.label} HP` : `${bossBar.label} CHARGE`;
      bossValue.text = bossBar.mode === 'boss' ? `${Math.ceil(bossBar.current)}/${Math.ceil(bossBar.max)}` : `${Math.round(t * 100)}%`;

      bossBg.clear();
      bossBg.rect(0, 0, w, barH2).fill({ color: 0x070a12, alpha: 0.55 });

      bossFill.clear();
      if (fillW > 0) bossFill.rect(0, 0, fillW, barH2).fill({ color: bossBar.fillColor, alpha: 0.92 });

      bossFrame.clear();
      bossFrame.rect(0, 0, w, barH2).stroke({ color: 0x2b3566, width: 1, alpha: 0.9 });
    }
    layout();
  };

  layout();

  return {
    root,
    setScreenSize: (w: number, h: number) => {
      screenW = Math.max(1, w);
      screenH = Math.max(1, h);
      layout();
    },
    render,
    destroy: () => {
      root.destroy({ children: true });
    }
  };
}

export function hookRunHud(args: { hud: RunHudView; getLevelId: () => LevelId }): () => void {
  const { hud, getLevelId } = args;

  const renderHud = () => {
    const state = useGameStore.getState();
    hud.render({
      run: state.run,
      levelId: state.run?.levelId ?? getLevelId(),
      bossBar: { mode: 'hidden' }
    });
  };

  renderHud();
  const unsub = useGameStore.subscribe(() => renderHud());
  return unsub;
}


