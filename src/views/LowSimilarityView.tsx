import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { Ledger, MetricCard } from "../components/MetricCard";
import { DataTable } from "../components/DataTable";
import { LOW_SIMILARITY_COLUMNS, LowSimilarityRow } from "../components/LowSimilarityRow";
import { FilterBar, FilterSearch, FilterSelect } from "../components/FilterBar";
import { SkeletonTableRows } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { ApiErrorState } from "../components/ApiErrorState";
import { useApiResource } from "../lib/useApiResource";
import { fetchComparedMatches } from "../lib/dataSource";
import { buildLowSimilarityRecords, uniqueSorted } from "../lib/transform";
import { formatNumber, formatRelative, formatTimestamp } from "../lib/format";
import { SITES, SITE_LABELS, SPORT_LABELS, type Site } from "../types/domain";

const ALL = "ALL";

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function LowSimilarityView({ autoRefreshSignal }: { autoRefreshSignal: number }) {
  const compared = useApiResource(fetchComparedMatches);

  const [sport, setSport] = useState(ALL);
  const [site, setSite] = useState(ALL);
  const [minimum, setMinimum] = useState(ALL);
  const [search, setSearch] = useState("");

  const records = useMemo(() => buildLowSimilarityRecords(compared.data), [compared.data]);

  const report = compared.data?.dusukBenzerlik;
  const threshold = report?.ayarlar?.otomatikEsik ?? compared.data?.ayarlar?.takimEsigi;
  const floor = report?.ayarlar?.altSinir;
  const truncated =
    typeof report?.toplam === "number" && report.toplam > records.length ? report.toplam : null;

  const sportOptions = useMemo(
    () => uniqueSorted(records.map((record) => record.rawSport)),
    [records],
  );

  const minimumOptions = useMemo(() => {
    if (typeof threshold !== "number") return [];
    const start = Math.ceil((typeof floor === "number" ? floor : 0) / 10) * 10;
    const steps: number[] = [];
    for (let value = Math.max(start, 10); value < threshold; value += 10) steps.push(value);
    return steps;
  }, [threshold, floor]);

  const filtered = useMemo(() => {
    const needle = fold(search.trim());
    const min = minimum === ALL ? null : Number(minimum);
    return records
      .filter((record) => sport === ALL || record.rawSport === sport)
      .filter((record) => site === ALL || record.sites.includes(site as Site))
      .filter((record) => min === null || record.similarity >= min)
      .filter(
        (record) =>
          !needle ||
          fold(`${record.teamA} ${record.teamB} ${record.normalizedA} ${record.normalizedB}`).includes(
            needle,
          ),
      );
  }, [records, sport, site, minimum, search]);

  const generatedAt = compared.data?.olusturulma;
  const relative = formatRelative(generatedAt);
  const filtersActive = sport !== ALL || site !== ALL || minimum !== ALL || search !== "";
  const nearMiss = records.filter(
    (record) => typeof threshold === "number" && record.similarity >= threshold - 10,
  ).length;

  const resetFilters = () => {
    setSport(ALL);
    setSite(ALL);
    setMinimum(ALL);
    setSearch("");
  };

  useEffect(() => {
    if (autoRefreshSignal > 0) compared.reload();
  }, [autoRefreshSignal]);

  const rangeText =
    typeof threshold === "number" && typeof floor === "number"
      ? `${floor}% ≤ similarity < ${threshold}%`
      : "below the automatic threshold";

  return (
    <>
      <PageHeader
        title="Potential matches"
        description={`Team names the last run scored ${rangeText}. None of these were matched automatically; they are listed so you can check them.`}
        meta={
          generatedAt && !compared.loading ? (
            <>
              <b>Compared {formatTimestamp(generatedAt)}</b>
              {relative}
            </>
          ) : null
        }
        actions={
          <button
            type="button"
            className="button"
            onClick={compared.reload}
            disabled={compared.loading}
          >
            <RefreshCw
              size={14}
              aria-hidden="true"
              className={compared.loading ? "spin" : undefined}
            />
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
              value={typeof threshold === "number" ? `${threshold}%` : "—"}
              label="Automatic threshold"
              hint="Pairs at or above this match automatically"
              loading={compared.loading}
            />
            <MetricCard
              value={typeof floor === "number" ? `${floor}%` : "—"}
              label="Review floor"
              hint="Pairs below this are not listed"
              loading={compared.loading}
            />
            <MetricCard
              value={formatNumber(records.length)}
              label="Pairs to review"
              hint={truncated ? `Top ${formatNumber(records.length)} of ${formatNumber(truncated)}` : "Unique name pairs"}
              loading={compared.loading}
            />
            <MetricCard
              value={formatNumber(nearMiss)}
              label="Near misses"
              hint="Within 10 points of the threshold"
              flag
              loading={compared.loading}
            />
          </Ledger>

          <FilterBar
            onReset={resetFilters}
            resetDisabled={!filtersActive}
            summary={
              compared.loading
                ? "Loading pairs"
                : `Showing ${formatNumber(filtered.length)} of ${formatNumber(records.length)} pairs`
            }
          >
            <FilterSelect
              id="review-sport"
              label="Sport"
              value={sport}
              onChange={setSport}
              options={[
                { value: ALL, label: "All sports" },
                ...sportOptions.map((value) => ({
                  value,
                  label: SPORT_LABELS[value as keyof typeof SPORT_LABELS] ?? value,
                })),
              ]}
            />
            <FilterSelect
              id="review-site"
              label="Site"
              value={site}
              onChange={setSite}
              options={[
                { value: ALL, label: "All sites" },
                ...SITES.map((value: Site) => ({ value, label: SITE_LABELS[value] })),
              ]}
            />
            <FilterSelect
              id="review-minimum"
              label="Similarity"
              value={minimum}
              onChange={setMinimum}
              options={[
                { value: ALL, label: "Any" },
                ...minimumOptions.map((value) => ({
                  value: String(value),
                  label: `${value}% or more`,
                })),
              ]}
            />
            <FilterSearch
              id="review-search"
              label="Team"
              value={search}
              onChange={setSearch}
              placeholder="Either name"
            />
          </FilterBar>

          <Panel
            title="Name pairs below the threshold"
            description="Highest similarity first. Each pair is listed once per run, with up to three fixtures it was seen in."
            flush
          >
            <DataTable
              columns={LOW_SIMILARITY_COLUMNS}
              caption="Team-name pairs scored below the automatic matching threshold"
            >
              {compared.loading ? (
                <SkeletonTableRows rows={8} columns={LOW_SIMILARITY_COLUMNS.length} />
              ) : filtered.length > 0 ? (
                filtered.map((record) => <LowSimilarityRow key={record.id} record={record} />)
              ) : (
                <tr>
                  <td colSpan={LOW_SIMILARITY_COLUMNS.length}>
                    <EmptyState
                      bare
                      title={
                        filtersActive
                          ? "No pairs match these filters"
                          : report
                            ? "Nothing to review"
                            : "No review data yet"
                      }
                      description={
                        filtersActive
                          ? "Widen the sport, site or similarity filter to see more."
                          : report
                            ? "The last run found no unmatched team names in the review range."
                            : "The last comparison run did not include a low-similarity report. It appears after the fetcher's next run."
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
