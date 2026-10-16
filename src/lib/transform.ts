import { SITES, SITE_LABELS, isSport, type Site, type Sport } from "../types/domain";
import type {
  ApiSiteSportDocument,
  MatchRecord,
  MatchesResponse,
  SiteCoverage,
} from "../types/matches";
import type {
  ApiDifferentMatch,
  ApiLiveInfo,
  ApiSiteLive,
  ComparedFixture,
  ComparedMatchesResponse,
  DifferentMatchesTree,
  FixtureLink,
  FixtureLive,
  FixtureSource,
  LiveStatus,
  SourceLive,
} from "../types/comparison";
import { formatTime, timeToMinutes } from "./format";

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

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

/** Backend site name ("zlot") -> enum key and display label. */
function siteIdentity(raw: string): { site: string; label: string } {
  const site = normalizeSite(raw);
  return site ? { site, label: SITE_LABELS[site] } : { site: raw, label: raw };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * "YYYY-MM-DD HH:MM" for a well-formed date and time, else null. Every site's
 * times are compared as published (the backend reads them all as Turkey local
 * time), so no timezone conversion happens here.
 */
function kickOffKey(date: string | null, time: string | null): string | null {
  if (!date || !DATE_KEY.test(date) || timeToMinutes(time) === null) return null;
  return `${date} ${formatTime(time)}`;
}

/** Minutes since the epoch for a kick-off key; only used for differences. */
function keyToMinutes(key: string): number {
  const [date = "", time = ""] = key.split(" ");
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year!, month! - 1, day!) / 60000 + (timeToMinutes(time) ?? 0);
}

/**
 * Fallback for entries without `sapanSiteler`: the backend's own rule — the
 * most reported kick-off is the reference, ties go to the earliest.
 */
function deviationsFromReference(keys: Array<string | null>): number[] {
  const counts = new Map<string, number>();
  for (const key of keys) if (key) counts.set(key, (counts.get(key) ?? 0) + 1);

  let reference: string | null = null;
  let best = -1;
  for (const [key, count] of counts) {
    if (count > best || (count === best && reference !== null && key < reference)) {
      reference = key;
      best = count;
    }
  }

  return keys.map((key) =>
    key && reference ? keyToMinutes(key) - keyToMinutes(reference) : 0,
  );
}

/** Site order: as the run listed them in `siteler`, then any extras. */
function orderedSiteNames(entry: ApiDifferentMatch, siteOrder: string[]): string[] {
  const listed = [
    ...Object.keys(asRecord(entry.saatler)),
    ...Object.keys(asRecord(entry.tarihler)),
  ];
  const present = new Set(listed);
  return [
    ...siteOrder.filter((site) => present.has(site)),
    ...[...present].filter((site) => !siteOrder.includes(site)),
  ];
}

function buildLinks(entry: ApiDifferentMatch): FixtureLink[] {
  if (!Array.isArray(entry.eslesme)) return [];
  return entry.eslesme
    .filter((edge) => edge && typeof edge === "object")
    .map((edge) => ({
      siteA: siteIdentity(asString(edge.siteA)).label,
      siteB: siteIdentity(asString(edge.siteB)).label,
      method: asString(edge.kimlik) || null,
      reversed: edge.ters === true,
      confidence: asNumber(edge.guven),
      liveEvidence: asString(edge.canliKanit) || null,
    }));
}

const LIVE_STATUSES: readonly LiveStatus[] = ["live", "interrupted", "finished"];

/** Only the backend's normalized statuses count; anything else is ignored. */
function asLiveStatus(value: unknown): LiveStatus | null {
  const status = asString(value).toLowerCase();
  return (LIVE_STATUSES as readonly string[]).includes(status) ? (status as LiveStatus) : null;
}

function buildSourceLive(raw: ApiSiteLive | undefined): SourceLive | null {
  const status = asLiveStatus(raw?.durum);
  if (!raw || !status) return null;
  return {
    status,
    score: asString(raw.skor) || null,
    period: asString(raw.periyot) || null,
    minute: asString(raw.dakika) || null,
    reportedStart: asString(raw.bildirilenBaslama) || null,
    scheduleFromEarlierList: raw.saatKaynagi === "onceki-liste",
  };
}

/**
 * Live state as the backend decided it from explicit site statuses. A site
 * reporting the fixture finished outranks one still showing it live, and a
 * kick-off time in the past never makes a fixture live here.
 */
function buildFixtureLive(
  canli: ApiLiveInfo | undefined,
  perSite: Map<string, SourceLive>,
): FixtureLive | null {
  const statuses = [...perSite.values()].map((live) => live.status);
  const status =
    asLiveStatus(canli?.durum) ??
    (statuses.includes("finished")
      ? "finished"
      : statuses.includes("live")
        ? "live"
        : statuses.includes("interrupted")
          ? "interrupted"
          : null);
  if (!status) return null;

  const underway = status !== "finished";
  return {
    status,
    underway,
    notStartedOn: underway
      ? notStartedSites(canli).map((site) => siteIdentity(site).label)
      : [],
  };
}

function notStartedSites(canli: ApiLiveInfo | undefined): string[] {
  return Array.isArray(canli?.baslamamisGosteren)
    ? canli.baslamamisGosteren.map((site) => asString(site)).filter(Boolean)
    : [];
}

function buildFixture(
  entry: ApiDifferentMatch,
  bucket: { sport: string; league: string; date: string },
  siteOrder: string[],
  toleranceMinutes: number,
  kickOffConflict: boolean,
): Omit<ComparedFixture, "id"> {
  const times = asRecord(entry.saatler);
  const dates = asRecord(entry.tarihler);
  const teams = asRecord(entry.takimlar);
  const leagues = asRecord(entry.ligler);

  const rawSport = asString(entry.sport) || bucket.sport || "Unknown";
  const date = asString(entry.date) || bucket.date;
  const siteNames = orderedSiteNames(entry, siteOrder);

  const deviating = new Map<string, number>();
  const backendDeviations = Array.isArray(entry.sapanSiteler);
  if (backendDeviations) {
    for (const item of entry.sapanSiteler!) {
      const minutes = asNumber(item?.farkDakika);
      if (item && minutes !== null) deviating.set(asString(item.site), minutes);
    }
  }

  const liveBySite = new Map<string, SourceLive>();
  for (const [site, raw] of Object.entries(asRecord(entry.canli?.siteler))) {
    const live = buildSourceLive(raw as ApiSiteLive);
    if (live) liveBySite.set(site, live);
  }
  const live = buildFixtureLive(entry.canli, liveBySite);
  const notStarted = new Set(live?.underway ? notStartedSites(entry.canli) : []);

  const keys = siteNames.map((site) =>
    kickOffKey(asString(dates[site]) || date, asString(times[site]) || null),
  );
  const fallback = backendDeviations ? null : deviationsFromReference(keys);

  const sources: FixtureSource[] = siteNames.map((site, index) => {
    const deviationMinutes = fallback ? fallback[index]! : (deviating.get(site) ?? 0);
    return {
      ...siteIdentity(site),
      time: asString(times[site]) || null,
      date: asString(dates[site]) || null,
      deviationMinutes,
      differs: deviationMinutes !== 0,
      teams: asString(teams[site]) || null,
      league: asString(leagues[site]) || null,
      live: liveBySite.get(site) ?? null,
      showsNotStarted: notStarted.has(site),
    };
  });

  const timed = sources
    .map((source, index) => ({ source, key: keys[index] ?? null }))
    .filter((item): item is { source: FixtureSource; key: string } => item.key !== null)
    .sort((a, b) => a.key.localeCompare(b.key));
  const first = timed[0] ?? null;
  const last = timed.at(-1) ?? null;

  const backendSpread = asNumber(entry.maxFarkDakika);
  const maxDiffMinutes =
    backendSpread ??
    (first && last && timed.length > 1 ? keyToMinutes(last.key) - keyToMinutes(first.key) : null);
  const uniqueTimes = new Set(timed.map((item) => item.key)).size;

  const missing = Array.isArray(entry.eksikSiteler)
    ? entry.eksikSiteler.map((site) => siteIdentity(asString(site)).label)
    : siteOrder.filter((site) => !siteNames.includes(site)).map((site) => siteIdentity(site).label);

  return {
    sport: normalizeSport(rawSport),
    rawSport,
    league: asString(entry.league) || bucket.league || "Unknown league",
    date,
    home: asString(entry.home) || "—",
    away: asString(entry.away) || "—",
    sources,
    missing,
    hasTimeDifference:
      maxDiffMinutes !== null ? maxDiffMinutes > toleranceMinutes : uniqueTimes > 1,
    maxDiffMinutes,
    dateDiffers:
      entry.tarihFarkli === true ||
      new Set(sources.map((source) => source.date).filter(Boolean)).size > 1,
    uniqueTimes,
    earliest: first?.source ?? null,
    latest: last?.source ?? null,
    links: buildLinks(entry),
    sortKey: first?.key ?? `${date} 99:99`,
    live,
    kickOffConflict,
  };
}

type Bucket = { sport: string; league: string; date: string };

function forEachEntry(
  tree: DifferentMatchesTree | undefined,
  visit: (entry: ApiDifferentMatch, bucket: Bucket) => void,
): void {
  if (!tree || typeof tree !== "object") return;

  for (const [sport, leagues] of Object.entries(tree)) {
    if (!leagues || typeof leagues !== "object") continue;

    for (const [league, dates] of Object.entries(leagues)) {
      if (!dates || typeof dates !== "object") continue;

      for (const [date, entries] of Object.entries(dates)) {
        if (!Array.isArray(entries)) continue;

        for (const entry of entries) {
          if (entry && typeof entry === "object") visit(entry, { sport, league, date });
        }
      }
    }
  }
}

function sortedRecord(value: unknown): Array<[string, unknown]> {
  return Object.entries(asRecord(value)).sort(([a], [b]) => a.localeCompare(b));
}

/**
 * Identity of one backend row. The backend writes the same row into both
 * trees when a fixture is a kick-off conflict and also live-but-upcoming
 * somewhere, so only a row matching on every per-site field is a repeat.
 * Equal team names alone never are: the same sides can meet in another
 * sport, competition or on another day.
 */
function rowSignature(entry: ApiDifferentMatch, bucket: Bucket): string {
  return JSON.stringify([
    asString(entry.sport) || bucket.sport,
    asString(entry.league) || bucket.league,
    asString(entry.date) || bucket.date,
    asString(entry.home),
    asString(entry.away),
    sortedRecord(entry.saatler),
    sortedRecord(entry.tarihler),
    sortedRecord(entry.takimlar),
    sortedRecord(entry.ligler),
  ]);
}

/**
 * Maps `farkliMaclar` onto one UI record per real-world fixture, then adds
 * live fixtures from `canliAmaBaslamamisGorunen` that are not already there.
 * The backend has already decided which site records are the same match --
 * live records go through the same name matcher as scheduled ones -- so team
 * names, variants (U19, B, Women) and home/away orientation are taken
 * verbatim and never re-matched or normalized here.
 */
export function buildComparedFixtures(
  compared: ComparedMatchesResponse | null,
): ComparedFixture[] {
  if (!compared || typeof compared !== "object") return [];

  const siteOrder = Array.isArray(compared.siteler)
    ? compared.siteler.filter((site): site is string => typeof site === "string")
    : [];
  const tolerance = asNumber(compared.ayarlar?.toleransDakika) ?? 0;

  const fixtures: ComparedFixture[] = [];
  const seenIds = new Map<string, number>();
  const listedRows = new Set<string>();

  const add = (entry: ApiDifferentMatch, bucket: Bucket, kickOffConflict: boolean) => {
    const fixture = buildFixture(entry, bucket, siteOrder, tolerance, kickOffConflict);
    // Content-based, so a row keeps its expanded state across refreshes.
    const base = [fixture.rawSport, fixture.league, fixture.date, fixture.home, fixture.away].join("|");
    const seen = seenIds.get(base) ?? 0;
    seenIds.set(base, seen + 1);
    fixtures.push({ id: seen === 0 ? base : `${base}#${seen}`, ...fixture });
  };

  forEachEntry(compared.farkliMaclar, (entry, bucket) => {
    listedRows.add(rowSignature(entry, bucket));
    add(entry, bucket, true);
  });

  // A conflict row repeated here already carries the same live state.
  forEachEntry(compared.canliAmaBaslamamisGorunen, (entry, bucket) => {
    const signature = rowSignature(entry, bucket);
    if (listedRows.has(signature)) return;
    listedRows.add(signature);
    add(entry, bucket, false);
  });

  return fixtures;
}

/**
 * Mirrors the backend's live file limit (MATCH_LIVE_MAX_AGE_MINUTES default).
 * A run older than this says what was live then, not what is live now.
 */
export const LIVE_STALE_MINUTES = 15;

export function isLiveStale(generatedAt: string | null | undefined, now = Date.now()): boolean {
  const at = generatedAt ? Date.parse(generatedAt) : Number.NaN;
  return !Number.isFinite(at) || now - at > LIVE_STALE_MINUTES * 60000;
}

export interface LiveSourceState {
  label: string;
  state: "ok" | "stale" | "error";
  ageMinutes: number | null;
  error: string | null;
}

/** How the last run used each site's live feed; empty when it read none. */
export function buildLiveSources(compared: ComparedMatchesResponse | null): LiveSourceState[] {
  return Object.entries(asRecord(compared?.ozet?.canli?.kaynaklar)).map(([site, raw]) => {
    const info = asRecord(raw);
    return {
      label: siteIdentity(site).label,
      state: info.durum === "ok" ? "ok" : info.durum === "eski" ? "stale" : "error",
      ageMinutes: asNumber(info.yasDakika),
      error: asString(info.hata) || null,
    };
  });
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "en", { numeric: true }),
  );
}
