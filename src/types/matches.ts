import type { Site, Sport } from "./domain";

/** A single fixture as returned inside a date bucket by GET /panel/matches. */
export interface ApiMatch {
  home: string;
  away: string;
  time: string;
}

export interface ApiDateBucket {
  date: string;
  matches: ApiMatch[];
}

export interface ApiLeagueBucket {
  league: string;
  dates: ApiDateBucket[];
}

/** One document per site + sport pair. */
export interface ApiSiteSportDocument {
  _id: string;
  site: string;
  sport: string;
  leagues: ApiLeagueBucket[];
  createdAt?: string;
  updatedAt?: string;
}

/** GET /panel/matches — keyed by site name, each holding one document per sport. */
export type MatchesResponse = Partial<Record<Site, ApiSiteSportDocument[]>>;

/** Denormalized fixture used by every presentation component. */
export interface MatchRecord {
  id: string;
  site: Site;
  sport: Sport | null;
  rawSport: string;
  league: string;
  date: string;
  home: string;
  away: string;
  time: string;
}

export interface SiteCoverage {
  site: Site;
  matches: number;
  leagues: number;
  sports: number;
  lastUpdated: string | null;
}
