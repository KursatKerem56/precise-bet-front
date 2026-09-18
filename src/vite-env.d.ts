/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Precise Bet backend, e.g. http://localhost:3005 */
  readonly VITE_API_URL?: string;
  /** Raw auth token. Sent verbatim in the Authorization header (no "Bearer" prefix). */
  readonly VITE_AUTH_TOKEN?: string;
  /** "true" serves bundled sample data instead of calling the API. Development only. */
  readonly VITE_USE_SAMPLE_DATA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
