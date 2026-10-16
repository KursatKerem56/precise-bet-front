import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ComparisonRow } from "./ComparisonRow";
import type { ComparedFixture, FixtureSource } from "../types/comparison";

function source(label: string, time: string, deviationMinutes = 0): FixtureSource {
  return {
    site: label.toUpperCase().replace(/\s+/g, "_"),
    label,
    time,
    date: "2026-09-19",
    deviationMinutes,
    differs: deviationMinutes !== 0,
    teams: null,
    league: null,
    live: null,
    showsNotStarted: false,
  };
}

function fixture(overrides: Partial<ComparedFixture>): ComparedFixture {
  const sources = overrides.sources ?? [];
  return {
    id: "fixture",
    sport: "FOOTBALL",
    rawSport: "FUTBOL",
    league: "Süper Lig",
    date: "2026-09-19",
    home: "Fenerbahçe",
    away: "Galatasaray",
    sources,
    missing: [],
    hasTimeDifference: true,
    maxDiffMinutes: 60,
    dateDiffers: false,
    uniqueTimes: 2,
    earliest: sources[0] ?? null,
    latest: sources.at(-1) ?? null,
    links: [],
    sortKey: "2026-09-19 18:00",
    live: null,
    kickOffConflict: true,
    ...overrides,
  };
}

function render(value: ComparedFixture, liveStale = false): string {
  return renderToStaticMarkup(
    <table>
      <tbody>
        <ComparisonRow fixture={value} liveStale={liveStale} />
      </tbody>
    </table>,
  );
}

function count(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

describe("ComparisonRow", () => {
  it("renders one row with all four labelled source times and flags the outliers", () => {
    const html = render(
      fixture({
        sources: [
          source("Virus Bet", "18:00"),
          source("Mavi Bet", "19:00", 60),
          source("Betist", "18:00"),
          source("Zlot", "18:30", 30),
        ],
        uniqueTimes: 3,
      }),
    );

    expect(count(html, 'class="data-table__row"')).toBe(1);
    for (const label of ["Virus Bet", "Mavi Bet", "Betist", "Zlot"]) {
      expect(html).toContain(`<span class="times__site">${label}</span>`);
    }
    expect(count(html, "times__entry--differs")).toBe(2);
    expect(html).toContain("4 sites");
    expect(html).toContain("+1 hr");
    expect(html).toContain("+30 min");
    expect(html).toContain("3 different times");
  });

  it("shows agreeing sources as consistent", () => {
    const html = render(
      fixture({
        sources: [source("Virus Bet", "18:00"), source("Mavi Bet", "18:00")],
        hasTimeDifference: false,
        maxDiffMinutes: 0,
        uniqueTimes: 1,
      }),
    );

    expect(html).toContain("Same time");
    expect(html).not.toContain("times__entry--differs");
  });

  it("keeps youth identifiers in the fixture title", () => {
    const html = render(
      fixture({
        home: "Galatasaray U19",
        away: "Fenerbahce U19",
        sources: [source("Virus Bet", "14:00"), source("Betist", "15:00", 60)],
      }),
    );

    expect(html).toContain("Galatasaray U19");
    expect(html).toContain("Fenerbahce U19");
  });

  it("names sites that do not list the fixture without treating it as an error", () => {
    const html = render(
      fixture({
        sources: [
          source("Virus Bet", "18:00"),
          source("Mavi Bet", "18:30", 30),
          source("Betist", "18:00"),
        ],
        missing: ["Zlot"],
      }),
    );

    expect(html).toContain("3 sites");
    expect(html).toContain("Not on Zlot");
  });

  it("shows each site's date when the sites disagree on the day", () => {
    const html = render(
      fixture({
        sources: [
          { ...source("Mavi Bet", "17:00"), date: "2026-10-06" },
          { ...source("Betist", "17:00", -2880), date: "2026-10-04" },
        ],
        dateDiffers: true,
        maxDiffMinutes: 2880,
      }),
    );

    expect(html).toContain("Different day");
    expect(count(html, "times__date")).toBe(2);
    expect(html).toContain("−2 days");
  });

  it("explains an entry from an older run that has no per-site times", () => {
    const html = render(fixture({ sources: [], maxDiffMinutes: null, uniqueTimes: 0 }));

    expect(html).toContain("No per-site times in this entry");
    expect(html).not.toContain("Details");
  });
});

describe("ComparisonRow with live data", () => {
  const live = {
    status: "live" as const,
    score: "1:0",
    period: "2nd half",
    minute: "63",
    reportedStart: "19:34",
    scheduleFromEarlierList: false,
  };

  it("shows no live markup for a fixture without a live status", () => {
    const html = render(fixture({ sources: [source("Virus Bet", "18:00"), source("Mavi Bet", "19:00", 60)] }));

    expect(html).not.toContain("badge--live");
    expect(html).not.toContain("times__status");
    expect(html).not.toContain("Listed upcoming");
  });

  it("marks a live fixture and keeps each site's scheduled kick-off", () => {
    const html = render(
      fixture({
        sources: [
          { ...source("Virus Bet", "19:30"), live },
          { ...source("Mavi Bet", "21:00", 90), showsNotStarted: true },
        ],
        maxDiffMinutes: 90,
        live: { status: "live", underway: true, notStartedOn: ["Mavi Bet"] },
      }),
    );

    expect(html).toContain("badge--live");
    expect(html).toContain("Live 1:0 2nd half 63&#x27;");
    expect(html).toContain('<span class="times__clock">19:30</span>');
    expect(html).toContain('<span class="times__clock">21:00</span>');
    // The reported start belongs in the details, never in place of a kick-off.
    expect(html).not.toContain('<span class="times__clock">19:34</span>');
    expect(html).toContain("+1 hr 30 min");
    expect(html).toContain("Live, but upcoming on Mavi Bet");
  });

  it("explains a live fixture listed as upcoming when no times can be compared", () => {
    const html = render(
      fixture({
        sources: [{ ...source("Betist", ""), time: null, live }, { ...source("Virus Bet", "21:00"), showsNotStarted: true }],
        hasTimeDifference: false,
        maxDiffMinutes: null,
        uniqueTimes: 1,
        kickOffConflict: false,
        live: { status: "live", underway: true, notStartedOn: ["Virus Bet"] },
      }),
    );

    expect(html).toContain("Listed upcoming");
    expect(html).toContain("on Virus Bet");
    expect(html).not.toContain("Same time");
  });

  it("never calls a finished fixture live", () => {
    const html = render(
      fixture({
        sources: [{ ...source("Virus Bet", "19:30"), live: { ...live, status: "finished", score: "2:1" } }],
        live: { status: "finished", underway: false, notStartedOn: [] },
      }),
    );

    expect(html).toContain("Finished");
    expect(html).not.toContain("badge--live");
    expect(html).not.toContain(">Live<");
  });

  it("says a live status is from the last run when that run is old", () => {
    const html = render(
      fixture({
        sources: [{ ...source("Virus Bet", "19:30"), live }],
        live: { status: "live", underway: true, notStartedOn: [] },
      }),
      true,
    );

    expect(html).toContain("Live at last run");
    expect(html).not.toContain("badge__pulse");
  });
});
