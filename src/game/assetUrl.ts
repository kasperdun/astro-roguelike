/**
 * Build a URL for a file in the project root `assets/` directory.
 *
 * We keep this helper inside `src/` so Vite can rewrite `new URL(..., import.meta.url)`
 * into a correct runtime URL in dev/build.
 */
export function assetUrl(pathFromAssetsRoot: string): string {
  // `src/game/` -> project root -> `assets/`
  return new URL(`../../assets/${pathFromAssetsRoot}`, import.meta.url).toString();
}


