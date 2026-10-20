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
  /** Found on 2+ sites, but fewer than two of them reported a readable time. */
  saatEksik?: number;
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
  /** site -> "HH:MM" exactly as that site reported it. */
  saatler?: Record<string, string | null>;
  /** site -> "YYYY-MM-DD" exactly as that site reported it. */
  tarihler?: Record<string, string | null>;
  /** The sites disagree on the calendar day, not just the clock. */
  tarihFarkli?: boolean;
  /** Widest gap between any two sites, computed on date + time. */
  maxFarkDakika?: number;
  /** Sites that deviate from the most common kick-off, signed minutes. */
  sapanSiteler?: Array<{ site: string; farkDakika: number }>;
  eksikSiteler?: string[];
  /** site -> "Home - Away" as that site spelled it. */
  takimlar?: Record<string, string>;
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
  dusukBenzerlik?: ApiLowSimilarityReport;
}

/** One side of a sample fixture inside a low-similarity entry. */
export interface ApiLowSimilarityFixture {
  site?: string;
  league?: string | null;
  date?: string | null;
  time?: string | null;
  eventId?: string | null;
  home?: string;
  away?: string;
}

/** A fixture pair in which the two team names were compared. */
export interface ApiLowSimilaritySample {
  /** Which side of fixture A held the compared team. */
  taraf?: "home" | "away";
  /** Fixture B lists home and away the other way round. */
  ters?: boolean;
  rakipBenzerlik?: number;
  rakipAsama?: string;
  ret?: string;
  a?: ApiLowSimilarityFixture;
  b?: ApiLowSimilarityFixture;
}

/** A team-name pair scored below the automatic threshold (`dusukBenzerlik.kayitlar`). */
export interface ApiLowSimilarityEntry {
  sport?: string;
  takimA?: string;
  takimB?: string;
  normalizeA?: string;
  normalizeB?: string;
  aliasA?: string | null;
  aliasB?: string | null;
  benzerlik?: number;
  asama?: string;
  algoritma?: {
    belirleyen?: string;
    bilesenler?: Record<string, number>;
    karsilastirilan?: [string, string];
  };
  ret?: string | null;
  siteler?: string[];
  adet?: number;
  ornekler?: ApiLowSimilaritySample[];
}

/** `dusukBenzerlik`: pairs with altSinir <= similarity < otomatikEsik. */
export interface ApiLowSimilarityReport {
  ayarlar?: {
    otomatikEsik?: number;
    altSinir?: number;
    maksKayit?: number;
    algoritma?: string;
  };
  toplam?: number;
  kayitlar?: ApiLowSimilarityEntry[];
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
  /** The calendar day this site reported, when known. */
  date?: string;
  /** "Home - Away" as this site spelled it, when known. */
  teams?: string;
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
  /** Widest gap in minutes; null only when no two readable times exist. */
  spreadMinutes: number | null;
  /** The sites disagree on the calendar day. */
  dateDiffers: boolean;
  extras: ExtraField[];
}

export interface LowSimilarityFixture {
  site: Site | null;
  league: string;
  date: string;
  time: string;
  eventId: string;
  home: string;
  away: string;
}

/** Denormalized `dusukBenzerlik` entry. */
export interface LowSimilarityRecord {
  id: string;
  rawSport: string;
  teamA: string;
  teamB: string;
  normalizedA: string;
  normalizedB: string;
  aliasA: string | null;
  aliasB: string | null;
  /** 0-100, from the same scorer the automatic matching uses. */
  similarity: number;
  stage: string;
  decisiveComponent: string | null;
  components: Array<{ name: string; value: number }>;
  rejection: string | null;
  sites: Site[];
  occurrences: number;
  samples: Array<{
    side: "home" | "away" | null;
    reversed: boolean;
    opponentSimilarity: number | null;
    opponentStage: string | null;
    a: LowSimilarityFixture;
    b: LowSimilarityFixture;
  }>;
}
