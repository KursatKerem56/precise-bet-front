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
import { LiveSourceWarning } from "../components/LiveSourceWarning";
import { sportLabel } from "../components/Tags";
import { useApiResource } from "../lib/useApiResource";
import { fetchComparedMatches } from "../lib/dataSource";
import {
  buildComparedFixtures,
  buildLiveSources,
  isLiveStale,
  normalizeSport,
  uniqueSorted,
} from "../lib/transform";
import { formatNumber, formatRelative, formatTimestamp } from "../lib/format";
import { SITES, SITE_LABELS, type Site } from "../types/domain";
import type { ComparedFixture } from "../types/comparison";

const ALL = "ALL";

/** Only explicit site statuses; a past kick-off alone never counts as live. */
const STATUSES = {
  underway: "In play",
  live: "Live",
  interrupted: "Interrupted",
  finished: "Finished",
} as const;
type StatusKey = keyof typeof STATUSES | typeof ALL;

const SORTS = {
  live: "In play first",
  kickoff: "Kick-off",
  upcoming: "Listed upcoming first",
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

/** Live, then interrupted, then finished. */
function statusRank(record: ComparedFixture): number {
  const status = record.live?.status;
  return status === "live" ? 0 : status === "interrupted" ? 1 : 2;
}

function listedUpcoming(record: ComparedFixture): boolean {
  return record.live?.underway === true && record.live.notStartedOn.length > 0;
}

function matchesStatus(record: ComparedFixture, status: StatusKey): boolean {
  if (status === ALL) return true;
  if (status === "underway") return record.live?.underway === true;
  return record.live?.status === status;
}

const COMPARATORS: Record<SortKey, (a: ComparedFixture, b: ComparedFixture) => number> = {
  live: (a, b) => statusRank(a) - statusRank(b) || byKickOff(a, b),
  kickoff: byKickOff,
  upcoming: (a, b) =>
    Number(listedUpcoming(b)) - Number(listedUpcoming(a)) ||
    statusRank(a) - statusRank(b) ||
    byKickOff(a, b),
  sources: (a, b) => b.sources.length - a.sources.length || byKickOff(a, b),
};

export function LiveMatchesView({ autoRefreshSignal }: { autoRefreshSignal: number }) {
  const compared = useApiResource(fetchComparedMatches);

  const [sport, setSport] = useState(ALL);
  const [league, setLeague] = useState(ALL);
  const [site, setSite] = useState(ALL);
  const [status, setStatus] = useState<StatusKey>("underway");
  const [sort, setSort] = useState<SortKey>("live");

  const records = useMemo(
    () => buildComparedFixtures(compared.data).filter((record) => record.live !== null),
    [compared.data],
  );
  const liveSources = useMemo(() => buildLiveSources(compared.data), [compared.data]);

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

  const filtered = useMemo(
    () =>
      records
        .filter((record) => sport === ALL || record.rawSport === sport)
        .filter((record) => league === ALL || record.league === league)
        .filter(
          (record) =>
            site === ALL ||
            record.sources.some((source) => source.site === site && source.live !== null),
        )
        .filter((record) => matchesStatus(record, status))
        .sort(COMPARATORS[sort]),
    [records, sport, league, site, status, sort],
  );

  const live = compared.data?.ozet?.canli;
  const generatedAt = compared.data?.olusturulma;
  const relative = formatRelative(generatedAt);
  const liveStale = isLiveStale(generatedAt);
  const underwayListed = records.filter((record) => record.live?.underway).length;
  const busy = compared.loading;
  const filtersActive = sport !== ALL || league !== ALL || site !== ALL || status !== "underway";

  const resetFilters = () => {
    setSport(ALL);
    setLeague(ALL);
    setSite(ALL);
    setStatus("underway");
  };

  useEffect(() => {
    if (autoRefreshSignal > 0) compared.reload();
  }, [autoRefreshSignal, compared.reload]);

  return (
    <>
      <PageHeader
        title="Live matches"
        description="Fixtures that a site's own live feed reports as in play, interrupted or finished, with each site's score and how every other site still lists the kick-off."
        meta={
          generatedAt && !compared.loading ? (
            <>
              <b>{liveStale ? "Statuses from" : "Updated"} {formatTimestamp(generatedAt)}</b>
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
          {!busy ? <LiveSourceWarning sources={liveSources} /> : null}

          {liveStale && live && !busy ? (
            <p className="run-warning" role="status">
              The last comparison run is more than a few minutes old, so these statuses and scores
              describe that run, not the present.
            </p>
          ) : null}

          <Ledger>
            <MetricCard
              value={formatNumber(live?.canliMacGrubu)}
              label={liveStale ? "Live at last run" : "Live now"}
              hint={`${formatNumber(underwayListed)} listed below`}
              loading={busy}
            />
            <MetricCard
              value={formatNumber(live?.cokSitedeCanli)}
              label="Live on several sites"
              hint="Reported by more than one feed"
              loading={busy}
            />
            <MetricCard
              value={formatNumber(live?.baslamamisGosterilen)}
              label="Listed upcoming"
              hint="Live, but upcoming on another site"
              flag
              loading={busy}
            />
            <MetricCard
              value={formatNumber(live?.bitmis)}
              label="Finished"
              hint="A site reports full time"
              loading={busy}
            />
          </Ledger>

          <FilterBar
            onReset={resetFilters}
            resetDisabled={!filtersActive}
            summary={
              busy
                ? "Loading live matches"
                : `Showing ${formatNumber(filtered.length)} of ${formatNumber(records.length)} fixtures with a live status`
            }
          >
            <FilterSelect
              id="live-status"
              label="Status"
              value={status}
              onChange={(value) => setStatus(value as StatusKey)}
              options={[
                ...Object.entries(STATUSES).map(([value, label]) => ({ value, label })),
                { value: ALL, label: "Any status" },
              ]}
            />
            <FilterSelect
              id="live-sport"
              label="Sport"
              value={sport}
              onChange={(value) => {
                setSport(value);
                setLeague(ALL);
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
              id="live-league"
              label="League"
              value={league}
              onChange={setLeague}
              options={[
                { value: ALL, label: "All leagues" },
                ...leagueOptions.map((value) => ({ value, label: value })),
              ]}
            />
            <FilterSelect
              id="live-site"
              label="Live on"
              value={site}
              onChange={setSite}
              options={[
                { value: ALL, label: "Any site" },
                ...SITES.map((value: Site) => ({ value, label: SITE_LABELS[value] })),
              ]}
            />
            <FilterSelect
              id="live-sort"
              label="Sort by"
              value={sort}
              onChange={(value) => setSort(value as SortKey)}
              options={Object.entries(SORTS).map(([value, label]) => ({ value, label }))}
            />
          </FilterBar>

          <Panel
            title="Fixtures with a live status"
            description="Status, score and minute come only from the sites' own live feeds, shown next to the kick-off each site publishes. The comparison run returns a fixture only when the sites disagree on it, so live fixtures that every site lists the same way are counted above but not listed here."
            flush
          >
            <DataTable
              columns={COMPARISON_COLUMNS}
              caption="Fixtures that a betting site's live feed reports in play or finished"
            >
              {busy ? (
                <SkeletonTableRows rows={6} columns={COMPARISON_COLUMNS.length} />
              ) : filtered.length > 0 ? (
                filtered.map((record) => (
                  <ComparisonRow key={record.id} fixture={record} liveStale={liveStale} />
                ))
              ) : (
                <tr>
                  <td colSpan={COMPARISON_COLUMNS.length}>
                    <EmptyState
                      bare
                      title={
                        !live
                          ? "The last run used no live feed"
                          : records.length === 0
                            ? "No live fixture was flagged"
                            : "No live fixtures match these filters"
                      }
                      description={
                        !live
                          ? "No site's live file was found when the comparison ran, so no fixture has a live status."
                          : records.length === 0
                            ? "Live fixtures are listed only when the sites disagree on them. Every live fixture in the last run agreed."
                            : "Widen the filters, or pick “Any status” to include finished fixtures."
                      }
                      action={
                        filtersActive && records.length > 0 ? (
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
