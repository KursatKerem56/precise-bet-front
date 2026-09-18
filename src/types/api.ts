import type { Site } from "./domain";

/** Error body returned by the backend for 4xx/5xx responses. */
export interface ApiErrorPayload {
  statusCode?: number;
  message?: string;
  locale_key?: string;
  error?: string;
}

export type ApiErrorKind =
  | "unauthorized"
  | "rate-limited"
  | "network"
  | "server"
  | "client"
  | "unknown";

export interface SiteLink {
  _id?: string;
  site: Site;
  link: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveSiteLinkPayload {
  site: Site;
  link: string;
}
