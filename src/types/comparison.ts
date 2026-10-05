import type { Sport } from "./domain";

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
  /** Fixture groups by how many sites list them: { "1_sitede": n, "4_sitede": n }. */
  kapsam?: Record<string, number>;
  siteBazinda?: Record<string, { toplam?: number; sadeceBuSitede?: number }>;
  ikiliEslesme?: Array<{ siteA?: string; siteB?: string; eslesen?: number }>;
  eslestirme?: Record<string, unknown>;
}

/** A site whose time disagrees with the most-reported one (`sapanSiteler`). */
export interface ApiDeviatingSite {
  site?: string;
  /** Signed minutes from the reference kick-off; date differences included. */
  farkDakika?: number;
}

/** How two sites' records were tied to the same fixture (`eslesme`). */
export interface ApiMatchEdge {
  siteA?: string;
  siteB?: string;
  /** Identity stage: exact / alias / core / fuzzy / anchored / reversed / esports... */
  kimlik?: string;
  /** The two sites list home and away the other way round. */
  ters?: boolean;
  /** Confidence in [0, 1]. */
  guven?: number;
}

/**
 * One grouped fixture under `farkliMaclar`. The backend has already decided
 * that every per-site record here is the same real-world match; the per-site
 * maps are keyed by the lowercase site names listed in `siteler`.
 */
export interface ApiDifferentMatch {
  sport?: string;
  /** Canonical league name (country prefix stripped). */
  league?: string;
  date?: string;
  /** Canonical orientation, taken from the first site that lists the fixture. */
  home?: string;
  away?: string;
  /** Kick-off as each site publishes it ("HH:MM", Turkey local time). */
  saatler?: Record<string, string | null>;
  /** Date as each site publishes it ("YYYY-MM-DD"). */
  tarihler?: Record<string, string | null>;
  /** The sites disagree on the day, not only the clock time. */
  tarihFarkli?: boolean;
  /** Earliest to latest kick-off, in minutes, date differences included. */
  maxFarkDakika?: number;
  sapanSiteler?: ApiDeviatingSite[];
  eksikSiteler?: string[];
  /** League label as each site writes it. */
  ligler?: Record<string, string | null>;
  /** "Home - Away" as each site writes it, in that site's own order. */
  takimlar?: Record<string, string | null>;
  eslesme?: ApiMatchEdge[];
  /** Single kick-off from comparison runs that predate per-site times. */
  time?: string;
}

/** farkliMaclar: sport -> league -> date -> entries. */
export type DifferentMatchesTree = Record<
  string,
  Record<string, Record<string, ApiDifferentMatch[]>>
>;

/** A source file the comparison run could not read (`okunamayan`). */
export interface ApiUnreadableSource {
  site?: string;
  dosya?: string;
  hata?: string;
}

export interface ComparedMatchesResponse {
  olusturulma?: string;
  siteler?: string[];
  kaynaklar?: Record<string, unknown>;
  okunamayan?: ApiUnreadableSource[];
  ayarlar?: ComparisonSettings;
  ozet?: ComparisonSummary;
  farkliMaclar?: DifferentMatchesTree;
}

/** The kick-off one site publishes for a grouped fixture. */
export interface FixtureSource {
  /** Uppercase site key ("ZLOT") when known, otherwise the backend's name. */
  site: string;
  label: string;
  time: string | null;
  date: string | null;
  /** Signed minutes from the reference kick-off; 0 when this site agrees. */
  deviationMinutes: number;
  differs: boolean;
  /** Team and league names exactly as this site writes them. */
  teams: string | null;
  league: string | null;
}

/** Why the backend tied two sites' records together. */
export interface FixtureLink {
  siteA: string;
  siteB: string;
  method: string | null;
  reversed: boolean;
  confidence: number | null;
}

/** One real-world fixture, as grouped by the backend, ready to render. */
export interface ComparedFixture {
  id: string;
  sport: Sport | null;
  rawSport: string;
  league: string;
  date: string;
  home: string;
  away: string;
  sources: FixtureSource[];
  /** Labels of compared sites that do not list this fixture. */
  missing: string[];
  hasTimeDifference: boolean;
  /** Earliest to latest kick-off in minutes, or null when not computable. */
  maxDiffMinutes: number | null;
  dateDiffers: boolean;
  /** Distinct date + time combinations reported. */
  uniqueTimes: number;
  earliest: FixtureSource | null;
  latest: FixtureSource | null;
  links: FixtureLink[];
  /** Sortable "YYYY-MM-DD HH:MM" of the earliest reported kick-off. */
  sortKey: string;
}
