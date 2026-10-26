/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Commit (or build time) this bundle was built from; see buildInfo in vite.config.ts. */
  readonly VITE_BUILD_ID?: string;
}
