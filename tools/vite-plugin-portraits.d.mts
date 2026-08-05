import type { Plugin } from 'vite';

/**
 * Types for the drop-in portrait folder plugin. The implementation is .mjs
 * because it runs in the Vite config, before any TypeScript pipeline exists.
 */
export interface PortraitsOptions {
  /** Overrides Vite's own `publicDir`; `portraits/` is resolved inside it. */
  publicDir?: string;
  /**
   * The valid person ids. Supplied so a file whose basename matches nobody is
   * reported at startup instead of silently never appearing.
   */
  knownIds?: () => string[];
}

export function portraits(opts?: PortraitsOptions): Plugin;
export default portraits;
