import { SITES, isSport, type Site, type Sport } from "../types/domain";
import type {
  ApiSiteSportDocument,
  MatchRecord,
  MatchesResponse,
  SiteCoverage,
} from "../types/matches";
import type {
  ApiDifferentMatch,
  ComparedMatchesResponse,
  ComparisonRecord,
  ExtraField,
  SiteTime,
} from "../types/comparison";
import { minutesBetween } from "./format";

const SPORT_ALIASES: Record<string, Sport> = {
  FOOTBALL: "FOOTBALL",
  FUTBOL: "FOOTBALL",
  SOCCER: "FOOTBALL",
  BASKETBALL: "BASKETBALL",
  BASKETBOL: "BASKETBALL",
  VOLLEYBALL: "VOLLEYBALL",
  VOLEYBOL: "VOLLEYBALL",
  TENNIS: "TENNIS",
  TENIS: "TENNIS",
};

/** The API mixes English and Turkish sport names; both map onto one enum. */
export function normalizeSport(raw: unknown): Sport | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toUpperCase();
  const alias = SPORT_ALIASES[key];
  if (alias) return alias;
  return isSport(key) ? key : null;
}

/** `siteler` reports lowercase names; documents use the uppercase enum. */
export function normalizeSite(raw: unknown): Site | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return (SITES as readonly string[]).includes(key) ? (key as Site) : null;
}

/** Lowercase, strip diacritics and punctuation — used for cross-site matching. */
function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function bigrams(value: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < value.length - 1; i += 1) set.add(value.slice(i, i + 2));
  return set;
}

/** Sørensen–Dice coefficient over character bigrams, in [0, 1]. */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const first = bigrams(a);
  const second = bigrams(b);
  let shared = 0;
  for (const gram of first) if (second.has(gram)) shared += 1;
  return (2 * shared) / (first.size + second.size);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function shiftDate(date: string, days: number): string | null {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/** Flattens the nested site → sport → league → date → match payload. */
export function flattenMatches(response: MatchesResponse | null): MatchRecord[] {
  if (!response || typeof response !== "object") return [];
  const records: MatchRecord[] = [];

  for (const site of SITES) {
    const documents: ApiSiteSportDocument[] | undefined = response[site];
    if (!Array.isArray(documents)) continue;

    for (const document of documents) {
      if (!document || typeof document !== "object") continue;
      const rawSport = asString(document.sport);
      const sport = normalizeSport(rawSport);
      const leagues = Array.isArray(document.leagues) ? document.leagues : [];

      for (const leagueBucket of leagues) {
        if (!leagueBucket || typeof leagueBucket !== "object") continue;
        const league = asString(leagueBucket.league) || "Unknown league";
        const dates = Array.isArray(leagueBucket.dates) ? leagueBucket.dates : [];

        for (const dateBucket of dates) {
          if (!dateBucket || typeof dateBucket !== "object") continue;
          const date = asString(dateBucket.date);
          const matches = Array.isArray(dateBucket.matches) ? dateBucket.matches : [];

          for (const [index, match] of matches.entries()) {
            if (!match || typeof match !== "object") continue;
            const home = asString(match.home);
            const away = asString(match.away);
            if (!home && !away) continue;

            records.push({
              id: `${site}:${document._id ?? rawSport}:${league}:${date}:${index}`,
              site,
              sport,
              rawSport: rawSport || "Unknown",
              league,
              date,
              home: home || "—",
              away: away || "—",
              time: asString(match.time),
            });
          }
        }
      }
    }
  }

  return records;
}

export function buildSiteCoverage(
  response: MatchesResponse | null,
  records: MatchRecord[],
): SiteCoverage[] {
  return SITES.map((site) => {
    const siteRecords = records.filter((record) => record.site === site);
    const documents = response?.[site];
    const timestamps = Array.isArray(documents)
      ? documents
          .map((document) => document?.updatedAt ?? document?.createdAt ?? null)
          .filter((value): value is string => typeof value === "string")
          .sort()
      : [];

    return {
      site,
      matches: siteRecords.length,
      leagues: new Set(siteRecords.map((record) => record.league)).size,
      sports: new Set(siteRecords.map((record) => record.rawSport)).size,
      lastUpdated: timestamps.at(-1) ?? null,
    };
  });
}

const KNOWN_DIFF_KEYS = new Set(["sport", "league", "date", "home", "away", "time"]);

function extractExtras(entry: ApiDifferentMatch): ExtraField[] {
  const extras: ExtraField[] = [];

  for (const [key, value] of Object.entries(entry)) {
    if (KNOWN_DIFF_KEYS.has(key) || value === null || value === undefined) continue;

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      const text = String(value).trim();
      if (text) extras.push({ key, value: text });
    } else {
      const text = JSON.stringify(value);
      if (text && text !== "{}" && text !== "[]") {
        extras.push({ key, value: text.length > 80 ? `${text.slice(0, 77)}…` : text });
      }
    }
  }

  return extras;
}

/** Flags every time that disagrees with the most frequently reported one. */
function markDifferences(times: Array<{ site: Site; time: string }>): SiteTime[] {
  const counts = new Map<string, number>();
  for (const { time } of times) counts.set(time, (counts.get(time) ?? 0) + 1);

  if (counts.size <= 1) {
    return times.map(({ site, time }) => ({ site, time, differs: false }));
  }

  let baseline = times[0]?.time ?? "";
  let best = -1;
  for (const [time, count] of counts) {
    if (count > best || (count === best && time < baseline)) {
      best = count;
      baseline = time;
    }
  }

  return times.map(({ site, time }) => ({ site, time, differs: time !== baseline }));
}

function widestGap(times: SiteTime[]): number | null {
  let widest: number | null = null;
  for (let i = 0; i < times.length; i += 1) {
    for (let j = i + 1; j < times.length; j += 1) {
      const gap = minutesBetween(times[i]!.time, times[j]!.time);
      if (gap !== null && (widest === null || gap > widest)) widest = gap;
    }
  }
  return widest;
}

interface IndexedMatch extends MatchRecord {
  normalizedHome: string;
  normalizedAway: string;
}

/**
 * Joins `farkliMaclar` entries against GET /panel/matches so each comparison can
 * show the time every site reported. The backend matches teams fuzzily, so the
 * join reuses its own thresholds (`takimEsigi`, `tarihToleransGun`) rather than
 * assuming the team strings are identical across sites.
 */
export function buildComparisonRecords(
  compared: ComparedMatchesResponse | null,
  matchRecords: MatchRecord[],
): ComparisonRecord[] {
  const tree = compared?.farkliMaclar;
  if (!tree || typeof tree !== "object") return [];

  const settings = compared?.ayarlar ?? {};
  const teamThreshold =
    typeof settings.takimEsigi === "number" && settings.takimEsigi > 0
      ? Math.min(settings.takimEsigi, 100) / 100
      : 0.78;
  const dateTolerance =
    typeof settings.tarihToleransGun === "number" && settings.tarihToleransGun >= 0
      ? Math.min(Math.trunc(settings.tarihToleransGun), 7)
      : 1;

  const byDate = new Map<string, IndexedMatch[]>();
  for (const record of matchRecords) {
    if (!record.time) continue;
    const bucket = byDate.get(record.date);
    const indexed: IndexedMatch = {
      ...record,
      normalizedHome: normalizeText(record.home),
      normalizedAway: normalizeText(record.away),
    };
    if (bucket) bucket.push(indexed);
    else byDate.set(record.date, [indexed]);
  }

  const records: ComparisonRecord[] = [];

  for (const [rawSport, leagues] of Object.entries(tree)) {
    if (!leagues || typeof leagues !== "object") continue;

    for (const [rawLeague, dates] of Object.entries(leagues)) {
      if (!dates || typeof dates !== "object") continue;

      for (const [rawDate, entries] of Object.entries(dates)) {
        if (!Array.isArray(entries)) continue;

        for (const [index, entry] of entries.entries()) {
          if (!entry || typeof entry !== "object") continue;

          const sportLabel = asString(entry.sport) || rawSport;
          const sport = normalizeSport(sportLabel);
          const league = asString(entry.league) || rawLeague || "Unknown league";
          const date = asString(entry.date) || rawDate;
          const home = asString(entry.home) || "—";
          const away = asString(entry.away) || "—";

          const candidateDates = new Set<string>([date]);
          for (let offset = 1; offset <= dateTolerance; offset += 1) {
            const earlier = shiftDate(date, -offset);
            const later = shiftDate(date, offset);
            if (earlier) candidateDates.add(earlier);
            if (later) candidateDates.add(later);
          }

          const normalizedHome = normalizeText(home);
          const normalizedAway = normalizeText(away);
          const bestBySite = new Map<Site, { score: number; time: string }>();

          for (const candidateDate of candidateDates) {
            for (const candidate of byDate.get(candidateDate) ?? []) {
              if (sport && candidate.sport && candidate.sport !== sport) continue;

              const homeScore = similarity(normalizedHome, candidate.normalizedHome);
              const awayScore = similarity(normalizedAway, candidate.normalizedAway);
              const score = (homeScore + awayScore) / 2;
              if (score < teamThreshold) continue;
              if (Math.min(homeScore, awayScore) < teamThreshold * 0.6) continue;

              const current = bestBySite.get(candidate.site);
              if (!current || score > current.score) {
                bestBySite.set(candidate.site, { score, time: candidate.time });
              }
            }
          }

          const siteTimes = markDifferences(
            SITES.filter((site) => bestBySite.has(site)).map((site) => ({
              site,
              time: bestBySite.get(site)!.time,
            })),
          );

          records.push({
            id: `${rawSport}:${rawLeague}:${rawDate}:${index}`,
            sport,
            rawSport: sportLabel || "Unknown",
            league,
            date,
            home,
            away,
            referenceTime: asString(entry.time),
            siteTimes,
            spreadMinutes: widestGap(siteTimes),
            extras: extractExtras(entry),
          });
        }
      }
    }
  }

  return records;
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "en", { numeric: true }),
  );
}
