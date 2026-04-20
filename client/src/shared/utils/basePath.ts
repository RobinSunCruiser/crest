/**
 * Detects the base path of the application at runtime.
 *
 * Extracts the deployment subdirectory from the script tag's src attribute.
 * This is more reliable than parsing window.location.pathname because:
 * - Script src is set by Vite's base config at build time
 * - It's independent of the current route
 * - Works consistently across all pages
 *
 * @returns Base path with trailing slash (e.g., '/' or '/crest/')
 *
 * @example
 * // Development: always returns '/'
 * getBasePath() // returns '/'
 *
 * // Production at root with <script src="/assets/index-abc.js">
 * getBasePath() // returns '/'
 *
 * // Production at /crest/ with <script src="/crest/assets/index-abc.js">
 * getBasePath() // returns '/crest/'
 */
export function getBasePath(): string {
  // In development, always use root (Vite dev server proxy expects this)
  if (import.meta.env.DEV) {
    return '/';
  }

  // Find the main script tag added by Vite in production
  const scripts = document.getElementsByTagName('script');
  for (const script of scripts) {
    const src = script.src;
    if (src && src.includes('/assets/index-')) {
      // Extract path before /assets/
      const url = new URL(src);
      const path = url.pathname;
      const assetsIndex = path.indexOf('/assets/');

      if (assetsIndex > 0) {
        // Base path is everything before /assets/
        return path.substring(0, assetsIndex + 1);
      }
    }
  }

  // Fallback: assume root deployment
  return '/';
}
