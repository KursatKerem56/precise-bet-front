import { SITE_LABELS } from "../types/domain";
import type { LowSimilarityFixture, LowSimilarityRecord } from "../types/comparison";
import type { TableColumn } from "./DataTable";
import { formatDateShort, formatTime } from "../lib/format";
import { normalizeSport } from "../lib/transform";
import { StatusBadge } from "./StatusBadge";
import { SportTag } from "./Tags";

export const LOW_SIMILARITY_COLUMNS: TableColumn[] = [
  { key: "names", label: "Team names", width: "16rem" },
  { key: "similarity", label: "Similarity", width: "8rem", align: "end" },
  { key: "fixtures", label: "Seen in" },
  { key: "why", label: "Why it was not matched", width: "15rem" },
];

/** Which part of `similarityRatio` (similarity.js) produced the score. */
const COMPONENT_LABELS: Record<string, string> = {
  levenshtein: "edit distance",
  tokenSort: "sorted words",
  tokenOverlap: "word overlap",
  acronym: "acronym",
};

const STAGE_LABELS: Record<string, string> = {
  weak: "Fuzzy score below the auto-match threshold",
  partial: "One name is a short form of the other; needs a confirmed opponent",
};

const REJECTION_LABELS: Record<string, string> = {
  "team-below-threshold": "Team name below threshold",
  "anchored-without-league-context": "Opponent matched, but league and country do not confirm",
  "low-league-weak-team": "League names differ and the team score is not strong enough",
};

const STAGE_SHORT: Record<string, string> = {
  exact: "exact",
  alias: "alias",
  core: "same core name",
  fuzzy: "fuzzy",
  partial: "short form",
  weak: "weak",
};

const formatPercent = (value: number) =>
  `${Number.isInteger(value) ? value : value.toFixed(1)}%`;

function FixtureLine({ fixture }: { fixture: LowSimilarityFixture }) {
  const meta = [
    fixture.league,
    fixture.date ? formatDateShort(fixture.date) : "",
    fixture.time ? formatTime(fixture.time) : "no time",
    fixture.eventId ? `ID ${fixture.eventId}` : "",
  ].filter(Boolean);

  return (
    <>
      <span className="samples__site">{fixture.site ? SITE_LABELS[fixture.site] : "—"}</span>
      <span className="samples__fixture">
        {fixture.home} <span className="cell-fixture__v">v</span> {fixture.away}
      </span>
      <span className="samples__meta">{meta.join(" · ")}</span>
    </>
  );
}

/**
 * A team-name pair the comparison run scored below its automatic threshold.
 * Nothing here was matched; the row only exists so a person can judge it.
 */
export function LowSimilarityRow({ record }: { record: LowSimilarityRecord }) {
  const sample = record.samples[0];
  const hidden = record.occurrences - record.samples.length;
  const showNormalized = (raw: string, normalized: string) =>
    normalized && normalized !== raw.toLowerCase() ? normalized : null;
  const normalizedA = showNormalized(record.teamA, record.normalizedA);
  const normalizedB = showNormalized(record.teamB, record.normalizedB);

  return (
    <tr className="data-table__row">
      <td data-label="Team names">
        <span className="name-pair">
          <span className="name-pair__name">
            {record.teamA}
            {normalizedA ? <span className="name-pair__normalized">{normalizedA}</span> : null}
            {record.aliasA ? (
              <span className="name-pair__normalized">alias: {record.aliasA}</span>
            ) : null}
          </span>
          <span className="name-pair__vs">compared with</span>
          <span className="name-pair__name">
            {record.teamB}
            {normalizedB ? <span className="name-pair__normalized">{normalizedB}</span> : null}
            {record.aliasB ? (
              <span className="name-pair__normalized">alias: {record.aliasB}</span>
            ) : null}
          </span>
        </span>
        <span className="cell-meta">
          <SportTag sport={normalizeSport(record.rawSport)} rawSport={record.rawSport} />
          {record.occurrences > 1 ? (
            <StatusBadge>{record.occurrences} fixtures</StatusBadge>
          ) : null}
        </span>
      </td>

      <td data-label="Similarity" className="align-end">
        <span
          className="similarity"
          title={record.components
            .map((item) => `${COMPONENT_LABELS[item.name] ?? item.name}: ${formatPercent(item.value)}`)
            .join("\n")}
        >
          <span className="similarity__value">{formatPercent(record.similarity)}</span>
          <span className="similarity__meter" aria-hidden="true">
            <span
              className="similarity__fill"
              style={{ width: `${Math.max(0, Math.min(100, record.similarity))}%` }}
            />
          </span>
          {record.decisiveComponent ? (
            <span className="similarity__how">
              via {COMPONENT_LABELS[record.decisiveComponent] ?? record.decisiveComponent}
            </span>
          ) : null}
        </span>
      </td>

      <td data-label="Seen in">
        <span className="samples">
          {record.samples.map((item, index) => (
            <span key={index} className="samples__item">
              <FixtureLine fixture={item.a} />
              <FixtureLine fixture={item.b} />
            </span>
          ))}
          {hidden > 0 ? (
            <span className="samples__more">
              and {hidden} more {hidden === 1 ? "fixture" : "fixtures"}
            </span>
          ) : null}
        </span>
      </td>

      <td data-label="Why it was not matched" className="cell-quiet">
        <span className="samples">
          <span>{STAGE_LABELS[record.stage] ?? record.stage}</span>
          {record.rejection && record.rejection !== "team-below-threshold" ? (
            <span>{REJECTION_LABELS[record.rejection] ?? record.rejection}</span>
          ) : null}
          {sample && sample.opponentSimilarity !== null ? (
            <span className="samples__more">
              Opponent: {formatPercent(sample.opponentSimilarity)}
              {sample.opponentStage
                ? ` (${STAGE_SHORT[sample.opponentStage] ?? sample.opponentStage})`
                : ""}
              {sample.reversed ? " · home and away swapped" : ""}
            </span>
          ) : null}
        </span>
      </td>
    </tr>
  );
}
