import { useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import { MATCH_COLUMNS, MatchRow } from "../components/MatchRow";
import { FilterBar, FilterSearch, FilterSelect } from "../components/FilterBar";
import { SkeletonTableRows } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { ApiErrorState } from "../components/ApiErrorState";
import { useApiResource } from "../lib/useApiResource";
import { fetchMatches } from "../lib/dataSource";
import { flattenMatches, uniqueSorted } from "../lib/transform";
import { formatDate, formatNumber, timeToMinutes } from "../lib/format";
import { SITES, SITE_LABELS, SPORT_LABELS, type Site } from "../types/domain";
import type { MatchRecord } from "../types/matches";

const ALL = "ALL";

interface LeagueGroup {
  league: string;
  records: MatchRecord[];
}

interface DayGroup {
  date: string;
  leagues: LeagueGroup[];
  count: number;
}

function groupByDayAndLeague(records: MatchRecord[]): DayGroup[] {
  const byDate = new Map<string, Map<string, MatchRecord[]>>();

  for (const record of records) {
    const dateKey = record.date || "Unscheduled";
    let leagues = byDate.get(dateKey);
    if (!leagues) {
      leagues = new Map<string, MatchRecord[]>();
      byDate.set(dateKey, leagues);
    }
    const bucket = leagues.get(record.league);
    if (bucket) bucket.push(record);
    else leagues.set(record.league, [record]);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, leagues]) => ({
      date,
      count: [...leagues.values()].reduce((total, list) => total + list.length, 0),
      leagues: [...leagues.entries()]
        .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))
        .map(([league, list]) => ({
          league,
          records: [...list].sort(
            (a, b) =>
              (timeToMinutes(a.time) ?? 9999) - (timeToMinutes(b.time) ?? 9999) ||
              a.home.localeCompare(b.home),
          ),
        })),
    }));
}

export function MatchesView() {
  const matches = useApiResource(fetchMatches);
  const [site, setSite] = useState<Site>("VIRUS_BET");
  const [sport, setSport] = useState(ALL);
  const [league, setLeague] = useState(ALL);
  const [date, setDate] = useState(ALL);
  const [search, setSearch] = useState("");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const allRecords = useMemo(() => flattenMatches(matches.data), [matches.data]);
  const siteRecords = useMemo(
    () => allRecords.filter((record) => record.site === site),
    [allRecords, site],
  );

  const sportOptions = useMemo(
    () => uniqueSorted(siteRecords.map((record) => record.rawSport)),
    [siteRecords],
  );
  const leagueOptions = useMemo(
    () =>
      uniqueSorted(
        siteRecords
          .filter((record) => sport === ALL || record.rawSport === sport)
          .map((record) => record.league),
      ),
    [siteRecords, sport],
  );
  const dateOptions = useMemo(
    () =>
      uniqueSorted(
        siteRecords
          .filter((record) => sport === ALL || record.rawSport === sport)
          .filter((record) => league === ALL || record.league === league)
          .map((record) => record.date),
      ),
    [siteRecords, sport, league],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return siteRecords.filter((record) => {
      if (sport !== ALL && record.rawSport !== sport) return false;
      if (league !== ALL && record.league !== league) return false;
      if (date !== ALL && record.date !== date) return false;
      if (
        term &&
        !record.home.toLowerCase().includes(term) &&
        !record.away.toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });
  }, [siteRecords, sport, league, date, search]);

  const groups = useMemo(() => groupByDayAndLeague(filtered), [filtered]);
  const filtersActive = sport !== ALL || league !== ALL || date !== ALL || search !== "";

  const resetFilters = () => {
    setSport(ALL);
    setLeague(ALL);
    setDate(ALL);
    setSearch("");
  };

  const selectSite = (next: Site) => {
    setSite(next);
    setSport(ALL);
    setLeague(ALL);
    setDate(ALL);
  };

  const onTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (offset === 0) return;
    event.preventDefault();
    const nextIndex = (index + offset + SITES.length) % SITES.length;
    selectSite(SITES[nextIndex]!);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <>
      <PageHeader
        title="Matches"
        description="Every fixture stored for a site, grouped by day and league."
        actions={
          <button
            type="button"
            className="button"
            onClick={matches.reload}
            disabled={matches.loading}
          >
            <RefreshCw
              size={14}
              aria-hidden="true"
              className={matches.loading ? "spin" : undefined}
            />
            Refresh
          </button>
        }
      />

      <div className="site-tabs" role="tablist" aria-label="Betting site">
        {SITES.map((option, index) => {
          const selected = option === site;
          const count = allRecords.filter((record) => record.site === option).length;
          return (
            <button
              key={option}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`site-tab-${option}`}
              aria-selected={selected}
              aria-controls="matches-panel"
              tabIndex={selected ? 0 : -1}
              className={`site-tab${selected ? " site-tab--active" : ""}`}
              onClick={() => selectSite(option)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
            >
              {SITE_LABELS[option]}
              <span className="site-tab__count">
                {matches.loading ? "" : formatNumber(count)}
              </span>
            </button>
          );
        })}
      </div>

      <div id="matches-panel" role="tabpanel" aria-labelledby={`site-tab-${site}`} className="stack">
        <FilterBar
          onReset={resetFilters}
          resetDisabled={!filtersActive}
          summary={
            matches.loading
              ? "Loading fixtures"
              : `Showing ${formatNumber(filtered.length)} of ${formatNumber(siteRecords.length)} fixtures`
          }
        >
          <FilterSelect
            id="matches-sport"
            label="Sport"
            value={sport}
            onChange={(value) => {
              setSport(value);
              setLeague(ALL);
              setDate(ALL);
            }}
            options={[
              { value: ALL, label: "All sports" },
              ...sportOptions.map((value) => ({
                value,
                label: SPORT_LABELS[value as keyof typeof SPORT_LABELS] ?? value,
              })),
            ]}
          />
          <FilterSelect
            id="matches-league"
            label="League"
            value={league}
            onChange={(value) => {
              setLeague(value);
              setDate(ALL);
            }}
            options={[
              { value: ALL, label: "All leagues" },
              ...leagueOptions.map((value) => ({ value, label: value })),
            ]}
          />
          <FilterSelect
            id="matches-date"
            label="Day"
            value={date}
            onChange={setDate}
            options={[
              { value: ALL, label: "All days" },
              ...dateOptions.map((value) => ({ value, label: formatDate(value) })),
            ]}
          />
          <FilterSearch
            id="matches-search"
            label="Team"
            value={search}
            onChange={setSearch}
            placeholder="Home or away team"
          />
        </FilterBar>

        {matches.error ? (
          <ApiErrorState error={matches.error} onRetry={matches.reload} />
        ) : matches.loading ? (
          <div className="fixture-league">
            <DataTable columns={MATCH_COLUMNS} caption="Loading fixtures">
              <SkeletonTableRows rows={8} columns={MATCH_COLUMNS.length} />
            </DataTable>
          </div>
        ) : groups.length === 0 ? (
          filtersActive ? (
            <EmptyState
              title="No fixtures match these filters"
              description="Widen the sport, league or day filter, or clear the team search."
              action={
                <button type="button" className="button" onClick={resetFilters}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              title={`${SITE_LABELS[site]} has no stored fixtures`}
              description="Nothing has been collected for this site yet. Check its link on the site links page, then refresh."
              action={
                <button type="button" className="button" onClick={matches.reload}>
                  Refresh
                </button>
              }
            />
          )
        ) : (
          groups.map((group) => (
            <section className="fixture-day" key={group.date}>
              <header className="fixture-day__head">
                <h2 className="fixture-day__date">{formatDate(group.date)}</h2>
                <span className="fixture-day__count">
                  {formatNumber(group.count)} {group.count === 1 ? "fixture" : "fixtures"}
                </span>
              </header>
              {group.leagues.map((leagueGroup) => (
                <div className="fixture-league" key={`${group.date}-${leagueGroup.league}`}>
                  <h3 className="fixture-league__name">{leagueGroup.league}</h3>
                  <DataTable
                    columns={MATCH_COLUMNS}
                    caption={`${leagueGroup.league} fixtures on ${formatDate(group.date)}`}
                  >
                    {leagueGroup.records.map((record) => (
                      <MatchRow key={record.id} record={record} />
                    ))}
                  </DataTable>
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </>
  );
}
