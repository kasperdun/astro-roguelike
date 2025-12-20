export type RunInputState = {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  firing: boolean;
};

export function installRunInput(args: { input: RunInputState }): () => void {
  const { input } = args;

  const onKey = (e: KeyboardEvent, down: boolean) => {
    // Use physical key codes so WASD works on any keyboard layout.
    if (e.code === 'KeyW') input.w = down;
    if (e.code === 'KeyA') input.a = down;
    if (e.code === 'KeyS') input.s = down;
    if (e.code === 'KeyD') input.d = down;
  };

  const onKeyDown = (e: KeyboardEvent) => onKey(e, true);
  const onKeyUp = (e: KeyboardEvent) => onKey(e, false);

  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) input.firing = true;
  };
  const onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) input.firing = false;
  };

  const onContextMenu = (e: MouseEvent) => {
    // We want right-click available for future controls; avoid browser menu.
    e.preventDefault();
  };

  const onBlur = () => {
    input.w = false;
    input.a = false;
    input.s = false;
    input.d = false;
    input.firing = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('blur', onBlur);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('blur', onBlur);
  };
}




