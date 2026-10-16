import { describe, expect, it } from "vitest";
import {
  LIVE_STALE_MINUTES,
  buildComparedFixtures,
  buildLiveSources,
  isLiveStale,
} from "./transform";
import { sampleComparedMatches } from "./sampleData";
import type {
  ApiDifferentMatch,
  ComparedMatchesResponse,
  DifferentMatchesTree,
} from "../types/comparison";

const SITES = ["virus_bet", "mavi_bet", "betist", "zlot"];

/** One-entry payload in the shape GET /panel/compared-matches returns. */
function payload(
  entries: Array<Partial<ApiDifferentMatch>>,
  extra: Partial<ComparedMatchesResponse> = {},
): ComparedMatchesResponse {
  return {
    siteler: SITES,
    ayarlar: { toleransDakika: 0 },
    farkliMaclar: {
      FUTBOL: { "Süper Lig": { "2026-09-19": entries as ApiDifferentMatch[] } },
    },
    ...extra,
  };
}

const derby: Partial<ApiDifferentMatch> = {
  sport: "FUTBOL",
  league: "Süper Lig",
  date: "2026-09-19",
  home: "Fenerbahçe",
  away: "Galatasaray",
};

function sameDay(sites: string[]): Record<string, string> {
  return Object.fromEntries(sites.map((site) => [site, "2026-09-19"]));
}

describe("buildComparedFixtures", () => {
  it("returns nothing for a missing or empty payload", () => {
    expect(buildComparedFixtures(null)).toEqual([]);
    expect(buildComparedFixtures({})).toEqual([]);
  });

  it("scenario 1: two sources with the same time are consistent", () => {
    const [fixture] = buildComparedFixtures(
      payload([
        {
          ...derby,
          saatler: { virus_bet: "18:00", mavi_bet: "18:00" },
          tarihler: sameDay(["virus_bet", "mavi_bet"]),
          maxFarkDakika: 0,
          sapanSiteler: [],
        },
      ]),
    );

    expect(fixture!.hasTimeDifference).toBe(false);
    expect(fixture!.uniqueTimes).toBe(1);
    expect(fixture!.sources.map((source) => source.differs)).toEqual([false, false]);
  });

  it("scenario 2: two sources with different times are one fixture with a difference", () => {
    const fixtures = buildComparedFixtures(
      payload([
        {
          ...derby,
          saatler: { virus_bet: "18:00", mavi_bet: "19:00" },
          tarihler: sameDay(["virus_bet", "mavi_bet"]),
          maxFarkDakika: 60,
          sapanSiteler: [{ site: "mavi_bet", farkDakika: 60 }],
        },
      ]),
    );

    expect(fixtures).toHaveLength(1);
    const [fixture] = fixtures;
    expect(fixture!.hasTimeDifference).toBe(true);
    expect(fixture!.maxDiffMinutes).toBe(60);
    expect(fixture!.sources).toMatchObject([
      { site: "VIRUS_BET", label: "Virus Bet", time: "18:00", differs: false },
      { site: "MAVI_BET", label: "Mavi Bet", time: "19:00", differs: true, deviationMinutes: 60 },
    ]);
  });

  it("scenario 3: four sources keep every time with its site", () => {
    const [fixture] = buildComparedFixtures(
      payload([
        {
          ...derby,
          // Deliberately out of `siteler` order: the adapter restores it.
          saatler: { zlot: "18:30", betist: "18:00", mavi_bet: "19:00", virus_bet: "18:00" },
          tarihler: sameDay(SITES),
          maxFarkDakika: 60,
          sapanSiteler: [
            { site: "mavi_bet", farkDakika: 60 },
            { site: "zlot", farkDakika: 30 },
          ],
          eksikSiteler: [],
        },
      ]),
    );

    expect(fixture!.sources.map((source) => [source.label, source.time, source.differs])).toEqual([
      ["Virus Bet", "18:00", false],
      ["Mavi Bet", "19:00", true],
      ["Betist", "18:00", false],
      ["Zlot", "18:30", true],
    ]);
    expect(fixture!.uniqueTimes).toBe(3);
    expect(fixture!.earliest?.label).toBe("Virus Bet");
    expect(fixture!.latest?.label).toBe("Mavi Bet");
    expect(fixture!.maxDiffMinutes).toBe(60);
    expect(fixture!.missing).toEqual([]);
  });

  it("scenario 4: differently named source records stay one fixture with the canonical names", () => {
    const fixtures = buildComparedFixtures(
      payload([
        {
          ...derby,
          saatler: { virus_bet: "18:00", mavi_bet: "19:00", zlot: "18:00" },
          tarihler: sameDay(["virus_bet", "mavi_bet", "zlot"]),
          maxFarkDakika: 60,
          sapanSiteler: [{ site: "mavi_bet", farkDakika: 60 }],
          takimlar: {
            virus_bet: "Fenerbahçe - Galatasaray",
            mavi_bet: "Fenerbahce SK - Galatasaray SK",
            zlot: "Galatasaray - Fenerbahce",
          },
          eslesme: [
            { siteA: "virus_bet", siteB: "mavi_bet", kimlik: "alias", ters: false, guven: 1 },
            { siteA: "virus_bet", siteB: "zlot", kimlik: "reversed", ters: true, guven: 0.94 },
          ],
        },
      ]),
    );

    expect(fixtures).toHaveLength(1);
    const [fixture] = fixtures;
    expect(fixture!.home).toBe("Fenerbahçe");
    expect(fixture!.away).toBe("Galatasaray");
    expect(fixture!.sources.map((source) => source.teams)).toEqual([
      "Fenerbahçe - Galatasaray",
      "Fenerbahce SK - Galatasaray SK",
      "Galatasaray - Fenerbahce",
    ]);
    expect(fixture!.links[1]).toEqual({
      siteA: "Virus Bet",
      siteB: "Zlot",
      method: "reversed",
      reversed: true,
      confidence: 0.94,
      liveEvidence: null,
    });
  });

  it("scenario 5: youth and reserve identifiers are kept verbatim", () => {
    const [fixture] = buildComparedFixtures(
      payload([
        {
          ...derby,
          home: "Galatasaray U19",
          away: "Fenerbahce II",
          saatler: { virus_bet: "14:00", betist: "15:00" },
          sapanSiteler: [{ site: "betist", farkDakika: 60 }],
          maxFarkDakika: 60,
        },
      ]),
    );

    expect(fixture!.home).toBe("Galatasaray U19");
    expect(fixture!.away).toBe("Fenerbahce II");
  });

  it("scenario 6: a fixture on three of four sites lists the absent one as missing", () => {
    const [fixture] = buildComparedFixtures(
      payload([
        {
          ...derby,
          saatler: { virus_bet: "18:00", mavi_bet: "18:30", betist: "18:00" },
          tarihler: sameDay(["virus_bet", "mavi_bet", "betist"]),
          maxFarkDakika: 30,
          sapanSiteler: [{ site: "mavi_bet", farkDakika: 30 }],
          eksikSiteler: ["zlot"],
        },
      ]),
    );

    expect(fixture!.sources).toHaveLength(3);
    expect(fixture!.missing).toEqual(["Zlot"]);
    expect(fixture!.hasTimeDifference).toBe(true);
  });

  it("flags a different day and uses the backend's date-aware spread", () => {
    const [fixture] = buildComparedFixtures(
      payload([
        {
          ...derby,
          saatler: { mavi_bet: "17:00", betist: "17:00", zlot: "17:00" },
          tarihler: { mavi_bet: "2026-10-06", betist: "2026-10-04", zlot: "2026-10-06" },
          tarihFarkli: true,
          maxFarkDakika: 2880,
          sapanSiteler: [{ site: "betist", farkDakika: -2880 }],
        },
      ]),
    );

    expect(fixture!.dateDiffers).toBe(true);
    expect(fixture!.maxDiffMinutes).toBe(2880);
    expect(fixture!.uniqueTimes).toBe(2);
    expect(fixture!.earliest?.label).toBe("Betist");
    expect(fixture!.sources.find((source) => source.label === "Betist")).toMatchObject({
      differs: true,
      deviationMinutes: -2880,
      date: "2026-10-04",
    });
  });

  it("derives deviations and spread when the backend leaves them out", () => {
    const [fixture] = buildComparedFixtures(
      payload([
        {
          ...derby,
          saatler: { virus_bet: "23:50", mavi_bet: "00:10", betist: "23:50" },
          tarihler: { virus_bet: "2026-09-19", mavi_bet: "2026-09-20", betist: "2026-09-19" },
        },
      ]),
    );

    // 23:50 -> 00:10 the next day is 20 minutes, not 23 hr 40 min.
    expect(fixture!.maxDiffMinutes).toBe(20);
    expect(fixture!.sources.map((source) => source.deviationMinutes)).toEqual([0, 20, 0]);
    expect(fixture!.missing).toEqual(["Zlot"]);
  });

  it("survives malformed entries and missing source times", () => {
    const fixtures = buildComparedFixtures(
      payload([
        null as unknown as ApiDifferentMatch,
        {
          ...derby,
          saatler: { virus_bet: "18:00", mavi_bet: null, new_site: "19:00" },
          sapanSiteler: [{ site: "new_site", farkDakika: 60 }, null as never],
          maxFarkDakika: 60,
          eslesme: "broken" as never,
        },
        { home: "Legacy FC", away: "Old Format", time: "20:00" },
      ]),
    );

    expect(fixtures).toHaveLength(2);
    const [current, legacy] = fixtures;
    expect(current!.sources.map((source) => [source.label, source.time])).toEqual([
      ["Virus Bet", "18:00"],
      ["Mavi Bet", null],
      ["new_site", "19:00"],
    ]);
    expect(current!.links).toEqual([]);
    expect(legacy!.sources).toEqual([]);
    expect(legacy!.league).toBe("Süper Lig");
  });

  it("gives every fixture a unique, stable id", () => {
    const entry = { ...derby, saatler: { virus_bet: "18:00", mavi_bet: "19:00" } };
    const first = buildComparedFixtures(payload([entry, entry]));
    const second = buildComparedFixtures(payload([entry, entry]));

    expect(new Set(first.map((fixture) => fixture.id)).size).toBe(2);
    expect(first.map((fixture) => fixture.id)).toEqual(second.map((fixture) => fixture.id));
  });

  it("reads the bundled sample payload", () => {
    const fixtures = buildComparedFixtures(sampleComparedMatches);
    expect(fixtures.length).toBeGreaterThan(0);
    expect(fixtures.every((fixture) => fixture.sources.length >= 2)).toBe(true);
  });
});

/** A one-entry tree for `canliAmaBaslamamisGorunen`, keyed like `farkliMaclar`. */
function tree(
  entries: Array<Partial<ApiDifferentMatch>>,
  sport = "FUTBOL",
  league = "Süper Lig",
  date = "2026-09-19",
): DifferentMatchesTree {
  return { [sport]: { [league]: { [date]: entries as ApiDifferentMatch[] } } };
}

/**
 * Galatasaray v Fenerbahçe as the backend writes it once Virus Bet's live
 * feed has it in play at 19:30 while Mavi Bet still lists 21:00.
 */
const liveDerby: Partial<ApiDifferentMatch> = {
  sport: "FUTBOL",
  league: "Süper Lig",
  date: "2026-09-19",
  home: "Galatasaray",
  away: "Fenerbahce",
  saatler: { virus_bet: "19:30", mavi_bet: "21:00" },
  tarihler: sameDay(["virus_bet", "mavi_bet"]),
  tarihFarkli: false,
  maxFarkDakika: 90,
  sapanSiteler: [{ site: "mavi_bet", farkDakika: 90 }],
  eksikSiteler: ["betist", "zlot"],
  takimlar: { virus_bet: "Galatasaray - Fenerbahce", mavi_bet: "Galatasaray SK - Fenerbahçe" },
  eslesme: [{ siteA: "virus_bet", siteB: "mavi_bet", kimlik: "alias", ters: false, guven: 1 }],
  canli: {
    durum: "live",
    siteler: {
      virus_bet: { durum: "live", skor: "1:0", periyot: "2nd half", dakika: "63", bildirilenBaslama: "19:34" },
    },
    baslamamisGosteren: ["mavi_bet"],
  },
};

describe("buildComparedFixtures with live data", () => {
  it("scenario 1: a payload without live fields reads exactly as before", () => {
    const entry = {
      ...derby,
      saatler: { virus_bet: "18:00", mavi_bet: "19:00" },
      sapanSiteler: [{ site: "mavi_bet", farkDakika: 60 }],
      maxFarkDakika: 60,
    };
    const plain = buildComparedFixtures(payload([entry]));
    const withEmptyLive = buildComparedFixtures(payload([entry], { canliAmaBaslamamisGorunen: {} }));

    expect(withEmptyLive).toEqual(plain);
    expect(plain).toHaveLength(1);
    expect(plain[0]!.live).toBeNull();
    expect(plain[0]!.kickOffConflict).toBe(true);
    expect(plain[0]!.sources.every((source) => source.live === null && !source.showsNotStarted)).toBe(
      true,
    );
  });

  it("scenario 2: parses the fixture's live state and each site's live record", () => {
    const [fixture] = buildComparedFixtures(payload([liveDerby]));

    expect(fixture!.live).toEqual({ status: "live", underway: true, notStartedOn: ["Mavi Bet"] });
    const [virus, mavi] = fixture!.sources;
    expect(virus!.live).toEqual({
      status: "live",
      score: "1:0",
      period: "2nd half",
      minute: "63",
      reportedStart: "19:34",
      scheduleFromEarlierList: false,
    });
    // The feed's reported start never replaces the published kick-off.
    expect(virus!.time).toBe("19:30");
    expect(virus!.showsNotStarted).toBe(false);
    expect(mavi!.live).toBeNull();
    expect(mavi!.showsNotStarted).toBe(true);
    expect(mavi!.time).toBe("21:00");
  });

  it("scenarios 3-5: keeps the backend's identity decision and each site's names verbatim", () => {
    const [fixture] = buildComparedFixtures(
      payload([
        {
          ...liveDerby,
          saatler: { virus_bet: "19:30", zlot: "21:00" },
          tarihler: sameDay(["virus_bet", "zlot"]),
          sapanSiteler: [{ site: "zlot", farkDakika: 90 }],
          takimlar: { virus_bet: "Galatasaray - Fenerbahce", zlot: "Fenerbahçe SK - Galatasaray AŞ" },
          eslesme: [
            {
              siteA: "virus_bet",
              siteB: "zlot",
              kimlik: "reversed",
              ters: true,
              guven: 0.93,
              canliKanit: "live-vs-upcoming",
            },
          ],
          canli: { ...liveDerby.canli, baslamamisGosteren: ["zlot"] },
        },
      ]),
    );

    expect(fixture!.home).toBe("Galatasaray");
    expect(fixture!.away).toBe("Fenerbahce");
    expect(fixture!.sources.map((source) => source.teams)).toEqual([
      "Galatasaray - Fenerbahce",
      "Fenerbahçe SK - Galatasaray AŞ",
    ]);
    expect(fixture!.links).toEqual([
      {
        siteA: "Virus Bet",
        siteB: "Zlot",
        method: "reversed",
        reversed: true,
        confidence: 0.93,
        liveEvidence: "live-vs-upcoming",
      },
    ]);
  });

  it("scenarios 6-7: shows a live fixture another site lists as upcoming, even without a comparable time", () => {
    // Betist's live menu has no scheduled time, so the run cannot compare
    // kick-offs and the row is absent from farkliMaclar.
    const liveOnly: Partial<ApiDifferentMatch> = {
      ...liveDerby,
      saatler: { virus_bet: "21:00", betist: "" },
      tarihler: sameDay(["virus_bet", "betist"]),
      maxFarkDakika: null,
      sapanSiteler: [],
      eksikSiteler: ["mavi_bet", "zlot"],
      takimlar: { virus_bet: "Galatasaray - Fenerbahce", betist: "Galatasaray - Fenerbahçe" },
      canli: { durum: "live", siteler: { betist: { durum: "live", skor: "0:0" } }, baslamamisGosteren: ["virus_bet"] },
    };

    const fixtures = buildComparedFixtures(
      payload([], { farkliMaclar: {}, canliAmaBaslamamisGorunen: tree([liveOnly]) }),
    );

    expect(fixtures).toHaveLength(1);
    const [fixture] = fixtures;
    expect(fixture!.kickOffConflict).toBe(false);
    expect(fixture!.hasTimeDifference).toBe(false);
    expect(fixture!.maxDiffMinutes).toBeNull();
    expect(fixture!.live).toMatchObject({ underway: true, notStartedOn: ["Virus Bet"] });
    expect(fixture!.sources.map((source) => [source.label, source.time])).toEqual([
      ["Virus Bet", "21:00"],
      ["Betist", null],
    ]);
  });

  it("scenario 8: a fixture in both the conflict and the live list appears once", () => {
    const fixtures = buildComparedFixtures(
      payload([liveDerby], { canliAmaBaslamamisGorunen: tree([liveDerby]) }),
    );

    expect(fixtures).toHaveLength(1);
    expect(fixtures[0]!.kickOffConflict).toBe(true);
    expect(fixtures[0]!.live?.notStartedOn).toEqual(["Mavi Bet"]);
  });

  it("scenario 8: key order in the per-site maps does not defeat the duplicate check", () => {
    const reordered = {
      ...liveDerby,
      saatler: { mavi_bet: "21:00", virus_bet: "19:30" },
      takimlar: { mavi_bet: "Galatasaray SK - Fenerbahçe", virus_bet: "Galatasaray - Fenerbahce" },
    };

    expect(
      buildComparedFixtures(payload([liveDerby], { canliAmaBaslamamisGorunen: tree([reordered]) })),
    ).toHaveLength(1);
  });

  it("scenario 9: the same teams on another day stay separate fixtures", () => {
    const nextWeek = {
      ...liveDerby,
      date: "2026-09-26",
      tarihler: { virus_bet: "2026-09-26", mavi_bet: "2026-09-26" },
    };
    const fixtures = buildComparedFixtures(
      payload([liveDerby], { canliAmaBaslamamisGorunen: tree([nextWeek], "FUTBOL", "Süper Lig", "2026-09-26") }),
    );

    expect(fixtures.map((fixture) => fixture.date)).toEqual(["2026-09-19", "2026-09-26"]);
    expect(new Set(fixtures.map((fixture) => fixture.id)).size).toBe(2);
  });

  it("scenario 9: the same teams with different per-site times stay separate fixtures", () => {
    const rematch = { ...liveDerby, saatler: { virus_bet: "16:00", mavi_bet: "17:00" } };

    expect(
      buildComparedFixtures(payload([liveDerby], { canliAmaBaslamamisGorunen: tree([rematch]) })),
    ).toHaveLength(2);
  });

  it("scenario 10: the same names in another sport are not merged", () => {
    const basketball = { ...liveDerby, sport: "BASKETBOL", league: "Süper Lig" };
    const fixtures = buildComparedFixtures(
      payload([liveDerby], { canliAmaBaslamamisGorunen: tree([basketball], "BASKETBOL") }),
    );

    expect(fixtures.map((fixture) => fixture.rawSport)).toEqual(["FUTBOL", "BASKETBOL"]);
    expect(fixtures.map((fixture) => fixture.sport)).toEqual(["FOOTBALL", "BASKETBALL"]);
  });

  it("scenario 11: malformed or missing live data leaves the comparison intact", () => {
    const fixtures = buildComparedFixtures(
      payload(
        [
          { ...derby, saatler: { virus_bet: "18:00", mavi_bet: "19:00" }, canli: "broken" as never },
          {
            ...derby,
            home: "Besiktas",
            away: "Trabzonspor",
            saatler: { virus_bet: "18:00", mavi_bet: "19:00" },
            canli: { durum: "live", siteler: null as never, baslamamisGosteren: "mavi_bet" as never },
          },
        ],
        { canliAmaBaslamamisGorunen: "broken" as never, ozet: { canli: null as never } },
      ),
    );

    expect(fixtures).toHaveLength(2);
    expect(fixtures[0]!.live).toBeNull();
    expect(fixtures[1]!.live).toEqual({ status: "live", underway: true, notStartedOn: [] });
    expect(fixtures[1]!.sources.every((source) => !source.showsNotStarted)).toBe(true);
  });

  it("scenario 12: a finished fixture is not live, even while a site lags behind", () => {
    const [fixture] = buildComparedFixtures(
      payload([
        {
          ...liveDerby,
          canli: {
            durum: "finished",
            siteler: {
              virus_bet: { durum: "finished", skor: "2:1" },
              mavi_bet: { durum: "live", skor: "2:1" },
            },
            baslamamisGosteren: ["mavi_bet"],
          },
        },
      ]),
    );

    expect(fixture!.live).toEqual({ status: "finished", underway: false, notStartedOn: [] });
    expect(fixture!.sources.some((source) => source.showsNotStarted)).toBe(false);
  });

  it("scenario 12: only explicit statuses count, never a kick-off in the past", () => {
    const fixtures = buildComparedFixtures(
      payload([
        { ...derby, date: "2020-01-01", saatler: { virus_bet: "18:00", mavi_bet: "19:00" } },
        {
          ...derby,
          home: "Besiktas",
          away: "Trabzonspor",
          saatler: { virus_bet: "18:00", mavi_bet: "19:00" },
          canli: { siteler: { virus_bet: { durum: "scheduled" }, mavi_bet: { durum: "not_started" } } },
        },
      ]),
    );

    expect(fixtures.map((fixture) => fixture.live)).toEqual([null, null]);
  });

  it("falls back to the sites' own statuses when the group status is missing", () => {
    const [fixture] = buildComparedFixtures(
      payload([
        {
          ...liveDerby,
          canli: {
            siteler: { virus_bet: { durum: "interrupted" }, mavi_bet: { durum: "live" } },
          },
        },
      ]),
    );

    expect(fixture!.live?.status).toBe("live");
  });

  it("marks a scheduled time restored from the site's earlier list", () => {
    const [fixture] = buildComparedFixtures(
      payload([
        {
          ...liveDerby,
          canli: {
            durum: "live",
            siteler: { virus_bet: { durum: "live", saatKaynagi: "onceki-liste" } },
          },
        },
      ]),
    );

    expect(fixture!.sources[0]!.live?.scheduleFromEarlierList).toBe(true);
    expect(fixture!.sources[0]!.time).toBe("19:30");
  });

  it("reads the bundled sample payload's live rows without duplicates", () => {
    const fixtures = buildComparedFixtures(sampleComparedMatches);
    const ids = fixtures.map((fixture) => fixture.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(fixtures.some((fixture) => fixture.live?.underway && !fixture.kickOffConflict)).toBe(true);
    expect(fixtures.some((fixture) => fixture.live?.status === "finished")).toBe(true);
  });
});

describe("buildLiveSources", () => {
  it("is empty when the run read no live files", () => {
    expect(buildLiveSources(null)).toEqual([]);
    expect(buildLiveSources(payload([]))).toEqual([]);
  });

  it("scenario 11: reports stale and unreadable live feeds per site", () => {
    const sources = buildLiveSources(
      payload([], {
        ozet: {
          canli: {
            kaynaklar: {
              virus_bet: { durum: "ok", yasDakika: 1.2, kayit: 40 },
              mavi_bet: { durum: "eski", yasDakika: 23.4 },
              zlot: { durum: "hata", hata: "Unexpected token" },
            },
          },
        },
      }),
    );

    expect(sources).toEqual([
      { label: "Virus Bet", state: "ok", ageMinutes: 1.2, error: null },
      { label: "Mavi Bet", state: "stale", ageMinutes: 23.4, error: null },
      { label: "Zlot", state: "error", ageMinutes: null, error: "Unexpected token" },
    ]);
  });
});

describe("isLiveStale", () => {
  const now = Date.parse("2026-10-16T19:00:00.000Z");

  it("treats a recent run as current", () => {
    expect(isLiveStale("2026-10-16T18:55:00.000Z", now)).toBe(false);
  });

  it("treats an old or undated run as stale", () => {
    const old = new Date(now - (LIVE_STALE_MINUTES + 1) * 60000).toISOString();
    expect(isLiveStale(old, now)).toBe(true);
    expect(isLiveStale(undefined, now)).toBe(true);
    expect(isLiveStale("not a date", now)).toBe(true);
  });
});
