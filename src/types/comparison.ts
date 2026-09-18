import type { Site, Sport } from "./domain";

/** Tuning used by the backend comparison run (`ayarlar`). */
export interface ComparisonSettings {
  toleransDakika?: number;
  takimEsigi?: number;
  ligEsigi?: number;
  ligZorunlu?: boolean;
  tarihToleransGun?: number;
}

/** Headline counts from the comparison run (`ozet`). */
export interface ComparisonSummary {
  toplamMacGrubu?: number;
  karsilastirilabilir?: number;
  saatiFarkli?: number;
  saatiAyni?: number;
}

/**
 * An entry under `farkliMaclar`. The documented keys are listed explicitly;
 * the index signature preserves any extra metadata the comparison run emits so
 * it can be surfaced without being invented here.
 */
export interface ApiDifferentMatch {
  sport?: string;
  league?: string;
  date?: string;
  home?: string;
  away?: string;
  time?: string;
  [key: string]: unknown;
}

/** farkliMaclar: sport -> league -> date -> entries. */
export type DifferentMatchesTree = Record<
  string,
  Record<string, Record<string, ApiDifferentMatch[]>>
>;

export interface ComparedMatchesResponse {
  olusturulma?: string;
  siteler?: string[];
  kaynaklar?: Record<string, unknown>;
  ayarlar?: ComparisonSettings;
  ozet?: ComparisonSummary;
  farkliMaclar?: DifferentMatchesTree;
}

/** Extra fields present on an API entry beyond the documented shape. */
export interface ExtraField {
  key: string;
  value: string;
}

/** A time reported by one site for a comparison group. */
export interface SiteTime {
  site: Site;
  time: string;
  differs: boolean;
}

/** Denormalized `farkliMaclar` entry, joined against GET /panel/matches. */
export interface ComparisonRecord {
  id: string;
  sport: Sport | null;
  rawSport: string;
  league: string;
  date: string;
  home: string;
  away: string;
  referenceTime: string;
  siteTimes: SiteTime[];
  spreadMinutes: number | null;
  extras: ExtraField[];
}
