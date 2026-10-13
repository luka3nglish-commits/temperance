/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** package.json version, injected at build time (vite.config.ts `define`). */
declare const __APP_VERSION__: string
/** short git hash of the build, or "dev". */
declare const __BUILD_HASH__: string
