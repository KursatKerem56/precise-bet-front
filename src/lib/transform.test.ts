import { describe, expect, it } from "vitest";
import { buildComparedFixtures } from "./transform";
import { sampleComparedMatches } from "./sampleData";
import type { ApiDifferentMatch, ComparedMatchesResponse } from "../types/comparison";

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
