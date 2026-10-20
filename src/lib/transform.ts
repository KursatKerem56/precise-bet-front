import { SITES, isSport, type Site, type Sport } from "../types/domain";
import type {
  ApiSiteSportDocument,
  MatchRecord,
  MatchesResponse,
  SiteCoverage,
} from "../types/matches";
import type {
  ApiDifferentMatch,
  ApiLowSimilarityFixture,
  ComparedMatchesResponse,
  ComparisonRecord,
  ExtraField,
  LowSimilarityFixture,
  LowSimilarityRecord,
  SiteTime,
} from "../types/comparison";
import { minutesBetween, timeToMinutes } from "./format";

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

/** Keys rendered structurally, so they are not repeated as raw badges. */
const KNOWN_DIFF_KEYS = new Set([
  "sport",
  "league",
  "date",
  "home",
  "away",
  "time",
  "saatler",
  "tarihler",
  "tarihFarkli",
  "maxFarkDakika",
  "sapanSiteler",
  "takimlar",
]);

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

/** A kick-off is the date AND the clock: "20:00" today is not "20:00" tomorrow. */
const kickOffKey = ({ date, time }: { date?: string; time: string }) => `${date ?? ""}T${time}`;

/** Flags every kick-off that disagrees with the most frequently reported one. */
function markDifferences(times: Array<Omit<SiteTime, "differs">>): SiteTime[] {
  const counts = new Map<string, number>();
  for (const entry of times) {
    const key = kickOffKey(entry);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  if (counts.size <= 1) return times.map((entry) => ({ ...entry, differs: false }));

  let baseline = times[0] ? kickOffKey(times[0]) : "";
  let best = -1;
  for (const [key, count] of counts) {
    if (count > best || (count === best && key < baseline)) {
      best = count;
      baseline = key;
    }
  }

  return times.map((entry) => ({ ...entry, differs: kickOffKey(entry) !== baseline }));
}

/** Minutes since the epoch for a "YYYY-MM-DD" + "HH:MM" pair; null when either is unreadable. */
function absoluteMinutes(date: string | undefined, time: string): number | null {
  const clock = timeToMinutes(time);
  if (clock === null || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const day = Date.parse(`${date}T00:00:00Z`);
  return Number.isNaN(day) ? null : day / 60000 + clock;
}

/**
 * Widest gap between any two sites. With both dates known the gap is exact
 * (23:30 vs 00:30 the next day is 60 min; 20:00 vs 20:00 the next day is
 * 1440 min). Without dates it falls back to the shortest clock distance.
 */
function widestGap(times: SiteTime[]): number | null {
  let widest: number | null = null;
  for (let i = 0; i < times.length; i += 1) {
    for (let j = i + 1; j < times.length; j += 1) {
      const a = times[i]!;
      const b = times[j]!;
      const first = absoluteMinutes(a.date, a.time);
      const second = absoluteMinutes(b.date, b.time);
      const gap =
        first !== null && second !== null
          ? Math.abs(first - second)
          : minutesBetween(a.time, b.time);
      if (gap !== null && (widest === null || gap > widest)) widest = gap;
    }
  }
  return widest;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/**
 * The comparison run already knows which site reported which kick-off for
 * this fixture (`saatler` / `tarihler`) and the exact spread
 * (`maxFarkDakika`, computed on date + time). Those are the values the
 * conflict was flagged on, so they are used as-is. Returns null for older
 * payloads that do not carry them.
 */
function reportedSiteTimes(
  entry: ApiDifferentMatch,
  fallbackDate: string,
): { siteTimes: SiteTime[]; spreadMinutes: number | null } | null {
  const times = asRecord(entry.saatler);
  if (!times) return null;

  const dates = asRecord(entry.tarihler) ?? {};
  const teams = asRecord(entry.takimlar) ?? {};
  const deviating = Array.isArray(entry.sapanSiteler)
    ? new Set(entry.sapanSiteler.map((item) => normalizeSite(item?.site)))
    : null;

  const reported: Array<Omit<SiteTime, "differs">> = [];
  for (const site of SITES) {
    const key = Object.keys(times).find((raw) => normalizeSite(raw) === site);
    if (key === undefined) continue;
    const time = asString(times[key]);
    if (!time) continue;
    reported.push({
      site,
      time,
      date: asString(dates[key]) || fallbackDate,
      teams: asString(teams[key]) || undefined,
    });
  }

  if (reported.length === 0) return null;

  const marked = markDifferences(reported);
  const siteTimes = deviating
    ? marked.map((entry) => ({ ...entry, differs: deviating.has(entry.site) }))
    : marked;

  const spread =
    typeof entry.maxFarkDakika === "number" &&
    Number.isFinite(entry.maxFarkDakika) &&
    entry.maxFarkDakika >= 0
      ? entry.maxFarkDakika
      : widestGap(siteTimes);

  return { siteTimes, spreadMinutes: spread };
}

interface IndexedMatch extends MatchRecord {
  normalizedHome: string;
  normalizedAway: string;
}

/**
 * Builds one record per `farkliMaclar` entry with the kick-off every site
 * reported.
 *
 * The comparison run ships those times itself (`saatler`, `tarihler`,
 * `maxFarkDakika`) and they are used directly: they are the values the
 * conflict was detected on. Re-deriving them here used to be the cause of
 * "Not comparable" on genuine conflicts — this simpler name join misses
 * spellings the backend's alias/variant matching resolves (only one site
 * found -> no spread) and ignored the date (20:00 vs 20:00 a day apart ->
 * spread 0).
 *
 * Only payloads without `saatler` (older backends) fall back to joining
 * against GET /panel/matches with the run's own thresholds (`takimEsigi`,
 * `tarihToleransGun`).
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

  /** Fallback for payloads without `saatler`: best fuzzy candidate per site. */
  const joinSiteTimes = (
    sport: Sport | null,
    date: string,
    home: string,
    away: string,
  ): SiteTime[] => {
    const candidateDates = new Set<string>([date]);
    for (let offset = 1; offset <= dateTolerance; offset += 1) {
      const earlier = shiftDate(date, -offset);
      const later = shiftDate(date, offset);
      if (earlier) candidateDates.add(earlier);
      if (later) candidateDates.add(later);
    }

    const normalizedHome = normalizeText(home);
    const normalizedAway = normalizeText(away);
    const bestBySite = new Map<Site, { score: number; time: string; date: string }>();

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
          bestBySite.set(candidate.site, {
            score,
            time: candidate.time,
            date: candidate.date,
          });
        }
      }
    }

    return markDifferences(
      SITES.filter((site) => bestBySite.has(site)).map((site) => ({
        site,
        time: bestBySite.get(site)!.time,
        date: bestBySite.get(site)!.date,
      })),
    );
  };

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

          const reported = reportedSiteTimes(entry, date);
          const siteTimes = reported?.siteTimes ?? joinSiteTimes(sport, date, home, away);
          const spreadMinutes = reported ? reported.spreadMinutes : widestGap(siteTimes);
          const dateDiffers =
            entry.tarihFarkli === true ||
            new Set(siteTimes.map((item) => item.date).filter(Boolean)).size > 1;

          records.push({
            id: `${rawSport}:${rawLeague}:${rawDate}:${index}`,
            sport,
            rawSport: sportLabel || "Unknown",
            league,
            date,
            home,
            away,
            referenceTime: asString(entry.time) || (siteTimes[0]?.time ?? ""),
            siteTimes,
            spreadMinutes,
            dateDiffers,
            extras: extractExtras(entry),
          });
        }
      }
    }
  }

  return records;
}

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

function toLowSimilarityFixture(raw: ApiLowSimilarityFixture | undefined): LowSimilarityFixture {
  return {
    site: normalizeSite(raw?.site),
    league: asString(raw?.league),
    date: asString(raw?.date),
    time: asString(raw?.time),
    eventId: asString(raw?.eventId),
    home: asString(raw?.home) || "—",
    away: asString(raw?.away) || "—",
  };
}

/**
 * Flattens `dusukBenzerlik`: team-name pairs the comparison run scored in
 * [altSinir, otomatikEsik) and therefore did NOT match automatically.
 *
 * The backend already reports each pair once per run; entries with the same
 * sport and normalized names are still merged here so a payload assembled
 * from several runs can never list a pair twice. Highest similarity first.
 */
export function buildLowSimilarityRecords(
  compared: ComparedMatchesResponse | null,
): LowSimilarityRecord[] {
  const entries = compared?.dusukBenzerlik?.kayitlar;
  if (!Array.isArray(entries)) return [];

  const byKey = new Map<string, LowSimilarityRecord>();

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;

    const teamA = asString(entry.takimA);
    const teamB = asString(entry.takimB);
    const similarityScore = asNumber(entry.benzerlik);
    if (!teamA || !teamB || similarityScore === null) continue;

    const rawSport = asString(entry.sport) || "Unknown";
    const normalizedA = asString(entry.normalizeA) || normalizeText(teamA);
    const normalizedB = asString(entry.normalizeB) || normalizeText(teamB);
    // Keyed on the names as written, not `normalize*`: the normalized key
    // drops variant markers, and "X (W)" / "Y (W)" is a different pair
    // from "X" / "Y".
    const [first, second] = [normalizeText(teamA), normalizeText(teamB)].sort();
    const id = `${rawSport}:${first}:${second}`;

    const sites = (Array.isArray(entry.siteler) ? entry.siteler : [])
      .map(normalizeSite)
      .filter((site): site is Site => site !== null);

    const samples = (Array.isArray(entry.ornekler) ? entry.ornekler : [])
      .filter((sample) => sample && typeof sample === "object")
      .map((sample) => ({
        side: sample.taraf === "home" || sample.taraf === "away" ? sample.taraf : null,
        reversed: sample.ters === true,
        opponentSimilarity: asNumber(sample.rakipBenzerlik),
        opponentStage: asString(sample.rakipAsama) || null,
        a: toLowSimilarityFixture(sample.a),
        b: toLowSimilarityFixture(sample.b),
      }));

    const existing = byKey.get(id);
    if (existing) {
      existing.occurrences += Math.max(1, asNumber(entry.adet) ?? 1);
      existing.similarity = Math.max(existing.similarity, similarityScore);
      existing.sites = SITES.filter((site) => existing.sites.includes(site) || sites.includes(site));
      existing.samples.push(...samples);
      continue;
    }

    const components = Object.entries(entry.algoritma?.bilesenler ?? {})
      .map(([name, value]) => ({ name, value: asNumber(value) }))
      .filter((item): item is { name: string; value: number } => item.value !== null);

    byKey.set(id, {
      id,
      rawSport,
      teamA,
      teamB,
      normalizedA,
      normalizedB,
      aliasA: asString(entry.aliasA) || null,
      aliasB: asString(entry.aliasB) || null,
      similarity: similarityScore,
      stage: asString(entry.asama) || "weak",
      decisiveComponent: asString(entry.algoritma?.belirleyen) || null,
      components,
      rejection: asString(entry.ret) || null,
      sites: SITES.filter((site) => sites.includes(site)),
      occurrences: Math.max(1, asNumber(entry.adet) ?? 1),
      samples,
    });
  }

  return [...byKey.values()].sort(
    (a, b) =>
      b.similarity - a.similarity ||
      b.occurrences - a.occurrences ||
      a.teamA.localeCompare(b.teamA),
  );
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "en", { numeric: true }),
  );
}
