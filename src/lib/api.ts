import axios, { type AxiosInstance } from "axios";
import type {
  ApiErrorKind,
  ApiErrorPayload,
  SaveSiteLinkPayload,
  SiteLink,
} from "../types/api";
import type { MatchesResponse } from "../types/matches";
import type { ComparedMatchesResponse } from "../types/comparison";
import { isSite } from "../types/domain";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3005";
const AUTH_TOKEN = import.meta.env.VITE_AUTH_TOKEN ?? "";

export const useSampleData = import.meta.env.VITE_USE_SAMPLE_DATA === "true";

/** Whether a token is configured — the value itself is never exposed to the UI. */
export const hasAuthToken = AUTH_TOKEN.trim().length > 0;

export const apiBaseUrl = API_URL;

const client: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  // The backend compares this header verbatim against AUTH_TOKEN — no "Bearer" prefix.
  if (AUTH_TOKEN) config.headers.set("Authorization", AUTH_TOKEN);
  return config;
});

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly localeKey: string | null;

  constructor(
    kind: ApiErrorKind,
    message: string,
    status: number | null,
    localeKey: string | null,
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.localeKey = localeKey;
  }
}

function kindForStatus(status: number | null): ApiErrorKind {
  if (status === null) return "network";
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 429) return "rate-limited";
  if (status >= 500) return "server";
  if (status >= 400) return "client";
  return "unknown";
}

function messageForKind(kind: ApiErrorKind, payload: ApiErrorPayload): string {
  const fromBody =
    typeof payload.message === "string" && payload.message.trim().length > 0
      ? payload.message
      : null;

  switch (kind) {
    case "unauthorized":
      return "Your auth token was rejected by the API.";
    case "rate-limited":
      return "Too many requests. The API allows roughly 600 requests per 30 seconds.";
    case "network":
      return `Could not reach the API at ${API_URL}.`;
    case "server":
      return fromBody ?? "The API returned an unexpected server error.";
    default:
      return fromBody ?? "The request could not be completed.";
  }
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const payload: ApiErrorPayload =
      error.response?.data && typeof error.response.data === "object"
        ? (error.response.data as ApiErrorPayload)
        : {};
    const kind = kindForStatus(status);
    return new ApiError(
      kind,
      messageForKind(kind, payload),
      status,
      typeof payload.locale_key === "string" ? payload.locale_key : null,
    );
  }

  return new ApiError("unknown", "The request could not be completed.", null, null);
}

async function request<T>(fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    const response = await fn();
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export function getMatches(signal?: AbortSignal): Promise<MatchesResponse> {
  return request<MatchesResponse>(() =>
    client.get("/panel/matches", { signal }),
  );
}

export function getComparedMatches(
  signal?: AbortSignal,
): Promise<ComparedMatchesResponse> {
  return request<ComparedMatchesResponse>(() =>
    client.get("/panel/compared-matches", { signal }),
  );
}

export async function getSiteLinks(signal?: AbortSignal): Promise<SiteLink[]> {
  const data = await request<unknown>(() =>
    client.get("/panel/site-links", { signal }),
  );
  if (!Array.isArray(data)) return [];
  return data.filter(
    (entry): entry is SiteLink =>
      typeof entry === "object" &&
      entry !== null &&
      isSite((entry as SiteLink).site) &&
      typeof (entry as SiteLink).link === "string",
  );
}

export function saveSiteLink(
  payload: SaveSiteLinkPayload,
  signal?: AbortSignal,
): Promise<SiteLink> {
  return request<SiteLink>(() =>
    client.post("/panel/save-site-link", payload, { signal }),
  );
}

export default client;
