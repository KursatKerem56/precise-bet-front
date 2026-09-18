import {
  getComparedMatches,
  getMatches,
  getSiteLinks,
  saveSiteLink,
  useSampleData,
} from "./api";
import {
  sampleComparedMatches,
  sampleMatches,
  sampleSiteLinks,
} from "./sampleData";
import type { SaveSiteLinkPayload, SiteLink } from "../types/api";
import type { MatchesResponse } from "../types/matches";
import type { ComparedMatchesResponse } from "../types/comparison";

/**
 * Single entry point for view data. With VITE_USE_SAMPLE_DATA="true" the app
 * serves bundled fixtures; otherwise every call goes to the real API.
 */

const SAMPLE_LATENCY_MS = 450;

function delayed<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), SAMPLE_LATENCY_MS);
  });
}

let sampleLinks: SiteLink[] = [...sampleSiteLinks];

export function fetchMatches(signal: AbortSignal): Promise<MatchesResponse> {
  return useSampleData ? delayed(sampleMatches) : getMatches(signal);
}

export function fetchComparedMatches(
  signal: AbortSignal,
): Promise<ComparedMatchesResponse> {
  return useSampleData ? delayed(sampleComparedMatches) : getComparedMatches(signal);
}

export function fetchSiteLinks(signal: AbortSignal): Promise<SiteLink[]> {
  return useSampleData ? delayed(sampleLinks) : getSiteLinks(signal);
}

export function persistSiteLink(
  payload: SaveSiteLinkPayload,
  signal?: AbortSignal,
): Promise<SiteLink> {
  if (!useSampleData) return saveSiteLink(payload, signal);

  sampleLinks = [
    ...sampleLinks.filter((entry) => entry.site !== payload.site),
    { ...payload, updatedAt: new Date().toISOString() },
  ];
  return delayed({ ...payload, updatedAt: new Date().toISOString() });
}

export { useSampleData };
