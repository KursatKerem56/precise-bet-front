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
    ...overrides,
  };
}

function render(value: ComparedFixture): string {
  return renderToStaticMarkup(
    <table>
      <tbody>
        <ComparisonRow fixture={value} />
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
