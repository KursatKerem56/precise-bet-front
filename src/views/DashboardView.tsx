import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { Ledger, MetricCard } from "../components/MetricCard";
import { DataTable } from "../components/DataTable";
import { COMPARISON_COLUMNS, ComparisonRow } from "../components/ComparisonRow";
import { SkeletonTableRows } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { ApiErrorState } from "../components/ApiErrorState";
import { StatusBadge } from "../components/StatusBadge";
import { SiteTag } from "../components/Tags";
import { useApiResource } from "../lib/useApiResource";
import { fetchComparedMatches, fetchMatches } from "../lib/dataSource";
import {
  buildComparisonRecords,
  buildSiteCoverage,
  flattenMatches,
  normalizeSite,
} from "../lib/transform";
import { formatNumber, formatRelative, formatTimestamp } from "../lib/format";
import type { TableColumn } from "../components/DataTable";
import type { ViewKey } from "../types/navigation";

const COVERAGE_COLUMNS: TableColumn[] = [
  { key: "site", label: "Site" },
  { key: "matches", label: "Fixtures", align: "end", width: "7rem" },
  { key: "leagues", label: "Leagues", align: "end", width: "7rem" },
  { key: "sports", label: "Sports", align: "end", width: "6rem" },
];

const PREVIEW_LIMIT = 6;

export function DashboardView({ onNavigate }: { onNavigate: (view: ViewKey) => void }) {
  const compared = useApiResource(fetchComparedMatches);
  const matches = useApiResource(fetchMatches);

  const matchRecords = useMemo(() => flattenMatches(matches.data), [matches.data]);
  const coverage = useMemo(
    () => buildSiteCoverage(matches.data, matchRecords),
    [matches.data, matchRecords],
  );
  const comparisons = useMemo(
    () => buildComparisonRecords(compared.data, matchRecords),
    [compared.data, matchRecords],
  );

  const preview = useMemo(
    () =>
      [...comparisons]
        .sort((a, b) => a.date.localeCompare(b.date) || a.home.localeCompare(b.home))
        .slice(0, PREVIEW_LIMIT),
    [comparisons],
  );

  const summary = compared.data?.ozet ?? {};
  const settings = compared.data?.ayarlar ?? {};
  const generatedAt = compared.data?.olusturulma;
  const relative = formatRelative(generatedAt);
  const busy = compared.loading || matches.loading;

  const reportedSites = (compared.data?.siteler ?? [])
    .map((site) => normalizeSite(site))
    .filter((site): site is NonNullable<typeof site> => site !== null);

  const refreshAll = () => {
    compared.reload();
    matches.reload();
  };

  return (
    <>
      <PageHeader
        title="Fixture comparison"
        description="Where the three betting sites agree on kick-off times, and where they don't."
        meta={
          generatedAt && !compared.loading ? (
            <>
              <b>Updated {formatTimestamp(generatedAt)}</b>
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
            hint="Sites disagree on kick-off"
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
      )}

      <Panel
        title="Latest conflicts"
        description="Fixtures the comparison run flagged because the sites report different kick-off times."
        flush
        actions={
          <button
            type="button"
            className="button button--quiet"
            onClick={() => onNavigate("compared")}
          >
            See all conflicts
          </button>
        }
      >
        {compared.error ? (
          <div className="sheet__body">
            <ApiErrorState error={compared.error} onRetry={compared.reload} />
          </div>
        ) : (
          <DataTable columns={COMPARISON_COLUMNS} caption="Latest fixtures with differing kick-off times">
            {busy ? (
              <SkeletonTableRows rows={4} columns={COMPARISON_COLUMNS.length} />
            ) : preview.length > 0 ? (
              preview.map((record) => <ComparisonRow key={record.id} record={record} />)
            ) : (
              <tr>
                <td colSpan={COMPARISON_COLUMNS.length}>
                  <EmptyState
                    bare
                    title="Every comparable fixture agrees"
                    description="The last run found no kick-off times that differ between sites."
                  />
                </td>
              </tr>
            )}
          </DataTable>
        )}
      </Panel>

      <div className="section-split">
        <Panel title="Site coverage" description="Fixtures stored for each site." flush>
          {matches.error ? (
            <div className="sheet__body">
              <ApiErrorState error={matches.error} onRetry={matches.reload} />
            </div>
          ) : (
            <DataTable columns={COVERAGE_COLUMNS} caption="Fixtures stored per betting site">
              {matches.loading ? (
                <SkeletonTableRows rows={3} columns={COVERAGE_COLUMNS.length} />
              ) : (
                coverage.map((entry) => (
                  <tr key={entry.site} className="data-table__row">
                    <td data-label="Site">
                      <SiteTag site={entry.site} />{" "}
                      {entry.matches === 0 ? <StatusBadge tone="hold">Empty</StatusBadge> : null}
                    </td>
                    <td data-label="Fixtures" className="align-end cell-number">
                      {formatNumber(entry.matches)}
                    </td>
                    <td data-label="Leagues" className="align-end cell-number">
                      {formatNumber(entry.leagues)}
                    </td>
                    <td data-label="Sports" className="align-end cell-number">
                      {formatNumber(entry.sports)}
                    </td>
                  </tr>
                ))
              )}
            </DataTable>
          )}
        </Panel>

        <Panel title="How the run was tuned" description="Settings the last comparison used.">
          {compared.error ? (
            <ApiErrorState error={compared.error} onRetry={compared.reload} />
          ) : (
            <dl className="readout">
              {reportedSites.length > 0 ? (
                <div className="readout__row">
                  <dt>Sites compared</dt>
                  <dd className="readout__names">
                    {reportedSites.map((site) => (
                      <SiteTag key={site} site={site} />
                    ))}
                  </dd>
                </div>
              ) : null}
              {typeof settings.toleransDakika === "number" ? (
                <div className="readout__row">
                  <dt>Times may differ by</dt>
                  <dd>
                    {settings.toleransDakika} min
                    <span className="readout__note">Anything wider is flagged</span>
                  </dd>
                </div>
              ) : null}
              {typeof settings.tarihToleransGun === "number" ? (
                <div className="readout__row">
                  <dt>Dates may differ by</dt>
                  <dd>
                    {settings.tarihToleransGun} {settings.tarihToleransGun === 1 ? "day" : "days"}
                  </dd>
                </div>
              ) : null}
              {typeof settings.takimEsigi === "number" ? (
                <div className="readout__row">
                  <dt>Team names must match</dt>
                  <dd>{settings.takimEsigi}%</dd>
                </div>
              ) : null}
              {typeof settings.ligEsigi === "number" ? (
                <div className="readout__row">
                  <dt>League names must match</dt>
                  <dd>
                    {settings.ligEsigi}%
                    <span className="readout__note">
                      {settings.ligZorunlu === true ? "Required" : "Optional"}
                    </span>
                  </dd>
                </div>
              ) : null}
            </dl>
          )}
        </Panel>
      </div>
    </>
  );
}
