import { useMemo, useState } from "react";
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
import { useApiResource } from "../lib/useApiResource";
import { fetchComparedMatches, fetchMatches } from "../lib/dataSource";
import { buildComparisonRecords, flattenMatches, uniqueSorted } from "../lib/transform";
import {
  formatDate,
  formatNumber,
  formatRelative,
  formatTimestamp,
  timeToMinutes,
} from "../lib/format";
import { SITES, SITE_LABELS, SPORT_LABELS, type Site } from "../types/domain";
import type { ComparisonRecord } from "../types/comparison";

const ALL = "ALL";

/** Earliest kick-off reported by any site; unknown times sort last. */
function kickOffMinutes(record: ComparisonRecord): number {
  const times = [...record.siteTimes.map((entry) => entry.time), record.referenceTime]
    .map(timeToMinutes)
    .filter((value): value is number => value !== null);
  return times.length > 0 ? Math.min(...times) : Number.MAX_SAFE_INTEGER;
}

export function ComparedMatchesView() {
  const compared = useApiResource(fetchComparedMatches);
  const matches = useApiResource(fetchMatches);

  const [sport, setSport] = useState(ALL);
  const [league, setLeague] = useState(ALL);
  const [date, setDate] = useState(ALL);
  const [site, setSite] = useState(ALL);

  const matchRecords = useMemo(() => flattenMatches(matches.data), [matches.data]);
  const records = useMemo(
    () => buildComparisonRecords(compared.data, matchRecords),
    [compared.data, matchRecords],
  );

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

  const filtered = useMemo(
    () =>
      records
        .filter((record) => sport === ALL || record.rawSport === sport)
        .filter((record) => league === ALL || record.league === league)
        .filter((record) => date === ALL || record.date === date)
        .filter(
          (record) => site === ALL || record.siteTimes.some((entry) => entry.site === site),
        )
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            kickOffMinutes(a) - kickOffMinutes(b) ||
            a.home.localeCompare(b.home),
        ),
    [records, sport, league, date, site],
  );

  const summary = compared.data?.ozet ?? {};
  const generatedAt = compared.data?.olusturulma;
  const relative = formatRelative(generatedAt);
  const busy = compared.loading || matches.loading;
  const filtersActive = sport !== ALL || league !== ALL || date !== ALL || site !== ALL;

  const resetFilters = () => {
    setSport(ALL);
    setLeague(ALL);
    setDate(ALL);
    setSite(ALL);
  };

  const refreshAll = () => {
    compared.reload();
    matches.reload();
  };

  return (
    <>
      <PageHeader
        title="Kick-off conflicts"
        description="Fixtures the last run flagged because the sites report different start times."
        meta={
          generatedAt && !compared.loading ? (
            <>
              <b>Compared {formatTimestamp(generatedAt)}</b>
              {relative}
            </>
          ) : null
        }
        actions={
          <button type="button" className="button" onClick={refreshAll} disabled={busy}>
            <RefreshCw size={14} aria-hidden="true" className={busy ? "spin" : undefined} />
            Refresh
          </button>
        }
      />

      {compared.error ? (
        <ApiErrorState error={compared.error} onRetry={compared.reload} />
      ) : (
        <>
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
              hint="Found on two or more sites"
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
                  label: SPORT_LABELS[value as keyof typeof SPORT_LABELS] ?? value,
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
          </FilterBar>

          {matches.error ? (
            <ApiErrorState error={matches.error} onRetry={matches.reload} />
          ) : null}

          <Panel
            title="Flagged fixtures"
            description="Each site's kick-off comes from its own stored fixtures, matched using the run's team and date thresholds."
            flush
          >
            <DataTable
              columns={COMPARISON_COLUMNS}
              caption="Fixtures with differing kick-off times across betting sites"
            >
              {busy ? (
                <SkeletonTableRows rows={8} columns={COMPARISON_COLUMNS.length} />
              ) : filtered.length > 0 ? (
                filtered.map((record) => <ComparisonRow key={record.id} record={record} />)
              ) : (
                <tr>
                  <td colSpan={COMPARISON_COLUMNS.length}>
                    <EmptyState
                      bare
                      title={
                        filtersActive
                          ? "No conflicts match these filters"
                          : "Every comparable fixture agrees"
                      }
                      description={
                        filtersActive
                          ? "Widen the sport, league, day or site filter to see more."
                          : "The last run found no kick-off times that differ between sites."
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
