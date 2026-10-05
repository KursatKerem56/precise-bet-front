import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { Ledger, MetricCard } from "../components/MetricCard";
import { DataTable } from "../components/DataTable";
import { COMPARISON_COLUMNS, ComparisonRow } from "../components/ComparisonRow";
import { FilterBar, FilterSelect } from "../components/FilterBar";
import { SkeletonTableRows } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { ApiErrorState } from "../components/ApiErrorState";
import { sportLabel } from "../components/Tags";
import { useApiResource } from "../lib/useApiResource";
import { fetchComparedMatches } from "../lib/dataSource";
import {
  buildComparedFixtures,
  normalizeSite,
  normalizeSport,
  uniqueSorted,
} from "../lib/transform";
import { formatDate, formatNumber, formatRelative, formatTimestamp } from "../lib/format";
import { SITES, SITE_LABELS, type Site } from "../types/domain";
import type { ComparedFixture } from "../types/comparison";

const ALL = "ALL";

const KINDS = {
  time: "Same day, different time",
  day: "Different day",
} as const;

const SORTS = {
  kickoff: "Kick-off",
  spread: "Largest difference",
  sources: "Most sites",
} as const;
type SortKey = keyof typeof SORTS;

function byKickOff(a: ComparedFixture, b: ComparedFixture): number {
  return (
    a.date.localeCompare(b.date) ||
    a.sortKey.localeCompare(b.sortKey) ||
    a.home.localeCompare(b.home)
  );
}

const COMPARATORS: Record<SortKey, (a: ComparedFixture, b: ComparedFixture) => number> = {
  kickoff: byKickOff,
  spread: (a, b) => (b.maxDiffMinutes ?? -1) - (a.maxDiffMinutes ?? -1) || byKickOff(a, b),
  sources: (a, b) => b.sources.length - a.sources.length || byKickOff(a, b),
};

export function ComparedMatchesView({ autoRefreshSignal }: { autoRefreshSignal: number }) {
  const compared = useApiResource(fetchComparedMatches);

  const [sport, setSport] = useState(ALL);
  const [league, setLeague] = useState(ALL);
  const [date, setDate] = useState(ALL);
  const [site, setSite] = useState(ALL);
  const [siteCount, setSiteCount] = useState(ALL);
  const [kind, setKind] = useState(ALL);
  const [sort, setSort] = useState<SortKey>("kickoff");

  const records = useMemo(() => buildComparedFixtures(compared.data), [compared.data]);

  const sportOptions = useMemo(
    () => uniqueSorted(records.map((record) => record.rawSport)),
    [records],
  );
  const leagueOptions = useMemo(
    () =>
      uniqueSorted(
        records
          .filter((record) => sport === ALL || record.rawSport === sport)
          .map((record) => record.league),
      ),
    [records, sport],
  );
  const dateOptions = useMemo(
    () =>
      uniqueSorted(
        records
          .filter((record) => sport === ALL || record.rawSport === sport)
          .filter((record) => league === ALL || record.league === league)
          .map((record) => record.date),
      ),
    [records, sport, league],
  );
  const siteCountOptions = useMemo(
    () => [...new Set(records.map((record) => record.sources.length))].sort((a, b) => a - b),
    [records],
  );

  const filtered = useMemo(
    () =>
      records
        .filter((record) => sport === ALL || record.rawSport === sport)
        .filter((record) => league === ALL || record.league === league)
        .filter((record) => date === ALL || record.date === date)
        .filter(
          (record) => site === ALL || record.sources.some((source) => source.site === site),
        )
        .filter((record) => siteCount === ALL || record.sources.length === Number(siteCount))
        .filter(
          (record) =>
            kind === ALL || (kind === "day" ? record.dateDiffers : !record.dateDiffers),
        )
        .sort(COMPARATORS[sort]),
    [records, sport, league, date, site, siteCount, kind, sort],
  );

  const summary = compared.data?.ozet ?? {};
  const comparedSites = (compared.data?.siteler ?? []).length;
  const onEverySite = summary.kapsam?.[`${comparedSites}_sitede`];
  const unreadable = (compared.data?.okunamayan ?? [])
    .map((entry) => {
      const name = typeof entry?.site === "string" ? entry.site : "";
      const known = normalizeSite(name);
      return known ? SITE_LABELS[known] : name;
    })
    .filter(Boolean);
  const generatedAt = compared.data?.olusturulma;
  const relative = formatRelative(generatedAt);
  const busy = compared.loading;
  const filtersActive =
    sport !== ALL ||
    league !== ALL ||
    date !== ALL ||
    site !== ALL ||
    siteCount !== ALL ||
    kind !== ALL;
  const nothingComparable = (summary.karsilastirilabilir ?? 0) === 0;

  const resetFilters = () => {
    setSport(ALL);
    setLeague(ALL);
    setDate(ALL);
    setSite(ALL);
    setSiteCount(ALL);
    setKind(ALL);
  };

  useEffect(() => {
    if (autoRefreshSignal > 0) compared.reload();
  }, [autoRefreshSignal, compared.reload]);

  return (
    <>
      <PageHeader
        title="Kick-off conflicts"
        description="Fixtures listed on two or more sites where the sites publish different start times."
        meta={
          generatedAt && !compared.loading ? (
            <>
              <b>Compared {formatTimestamp(generatedAt)}</b>
              {relative}
            </>
          ) : null
        }
        actions={
          <button type="button" className="button" onClick={compared.reload} disabled={busy}>
            <RefreshCw size={14} aria-hidden="true" className={busy ? "spin" : undefined} />
            Refresh
          </button>
        }
      />

      {compared.error ? (
        <ApiErrorState error={compared.error} onRetry={compared.reload} />
      ) : (
        <>
          {unreadable.length > 0 && !busy ? (
            <p className="run-warning" role="status">
              The last run could not read {unreadable.join(", ")}, so fixtures from{" "}
              {unreadable.length === 1 ? "that site" : "those sites"} are missing below.
            </p>
          ) : null}

          <Ledger>
            <MetricCard
              value={formatNumber(summary.toplamMacGrubu)}
              label="Match groups"
              hint="Built by the last run"
              loading={compared.loading}
            />
            <MetricCard
              value={formatNumber(summary.karsilastirilabilir)}
              label="Comparable"
              hint={
                typeof onEverySite === "number" && comparedSites > 2
                  ? `${formatNumber(onEverySite)} on all ${comparedSites} sites`
                  : "Found on two or more sites"
              }
              loading={compared.loading}
            />
            <MetricCard
              value={formatNumber(summary.saatiFarkli)}
              label="Different times"
              hint={`${formatNumber(records.length)} listed below`}
              flag
              loading={compared.loading}
            />
            <MetricCard
              value={formatNumber(summary.saatiAyni)}
              label="Same time"
              hint="Sites agree on kick-off"
              loading={compared.loading}
            />
          </Ledger>

          <FilterBar
            onReset={resetFilters}
            resetDisabled={!filtersActive}
            summary={
              busy
                ? "Loading conflicts"
                : `Showing ${formatNumber(filtered.length)} of ${formatNumber(records.length)} conflicts`
            }
          >
            <FilterSelect
              id="compared-sport"
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
                  label: sportLabel(normalizeSport(value), value),
                })),
              ]}
            />
            <FilterSelect
              id="compared-league"
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
              id="compared-date"
              label="Day"
              value={date}
              onChange={setDate}
              options={[
                { value: ALL, label: "All days" },
                ...dateOptions.map((value) => ({ value, label: formatDate(value) })),
              ]}
            />
            <FilterSelect
              id="compared-site"
              label="Site"
              value={site}
              onChange={setSite}
              options={[
                { value: ALL, label: "All sites" },
                ...SITES.map((value: Site) => ({ value, label: SITE_LABELS[value] })),
              ]}
            />
            <FilterSelect
              id="compared-site-count"
              label="Listed on"
              value={siteCount}
              onChange={setSiteCount}
              options={[
                { value: ALL, label: "Any number of sites" },
                ...siteCountOptions.map((count) => ({
                  value: String(count),
                  label:
                    count === comparedSites ? `All ${count} sites` : `${count} sites`,
                })),
              ]}
            />
            <FilterSelect
              id="compared-kind"
              label="Disagreement"
              value={kind}
              onChange={setKind}
              options={[
                { value: ALL, label: "Any" },
                ...Object.entries(KINDS).map(([value, label]) => ({ value, label })),
              ]}
            />
            <FilterSelect
              id="compared-sort"
              label="Sort by"
              value={sort}
              onChange={(value) => setSort(value as SortKey)}
              options={Object.entries(SORTS).map(([value, label]) => ({ value, label }))}
            />
          </FilterBar>

          <Panel
            title="Flagged fixtures"
            description="One row per real-world fixture, as matched by the comparison run. Each site's kick-off is shown as that site publishes it; red times disagree with the majority. Fixtures where every site agrees are only counted above."
            flush
          >
            <DataTable
              columns={COMPARISON_COLUMNS}
              caption="Fixtures with differing kick-off times across betting sites"
            >
              {busy ? (
                <SkeletonTableRows rows={8} columns={COMPARISON_COLUMNS.length} />
              ) : filtered.length > 0 ? (
                filtered.map((record) => <ComparisonRow key={record.id} fixture={record} />)
              ) : (
                <tr>
                  <td colSpan={COMPARISON_COLUMNS.length}>
                    <EmptyState
                      bare
                      title={
                        filtersActive
                          ? "No time differences found for these filters"
                          : nothingComparable
                            ? "No fixture was found on more than one site"
                            : "Every comparable fixture agrees"
                      }
                      description={
                        filtersActive
                          ? "Widen the filters to see more."
                          : nothingComparable
                            ? "The last run had nothing to compare. Check that at least two sites were fetched."
                            : `The last run matched ${formatNumber(summary.karsilastirilabilir)} fixtures across sites and they all report the same kick-off.`
                      }
                      action={
                        filtersActive ? (
                          <button type="button" className="button" onClick={resetFilters}>
                            Clear filters
                          </button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              )}
            </DataTable>
          </Panel>
        </>
      )}
    </>
  );
}
