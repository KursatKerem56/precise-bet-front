import { SITE_LABELS } from "../types/domain";
import type { ComparisonRecord } from "../types/comparison";
import type { TableColumn } from "./DataTable";
import { formatDate, formatMinutes, formatTime } from "../lib/format";
import { StatusBadge } from "./StatusBadge";
import { SportTag } from "./Tags";

export const COMPARISON_COLUMNS: TableColumn[] = [
  { key: "fixture", label: "Fixture" },
  { key: "league", label: "League", width: "11rem" },
  { key: "date", label: "Date", width: "9rem" },
  { key: "times", label: "Reported kick-off", width: "17rem" },
  { key: "delta", label: "Difference", width: "7rem", align: "end" },
];

/** "matchConfidence" / "match_confidence" -> "Match confidence". */
function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/**
 * The disagreeing times are the loudest thing on the page — that conflict is
 * the reason this view exists.
 */
export function ComparisonRow({ record }: { record: ComparisonRecord }) {
  const matched = record.siteTimes.length > 0;

  return (
    <tr className="data-table__row">
      <td data-label="Fixture">
        <span className="cell-fixture">
          {record.home}
          <span className="cell-fixture__v">v</span>
          {record.away}
        </span>
        <span className="cell-meta">
          <SportTag sport={record.sport} rawSport={record.rawSport} />
          {record.extras.map((extra) => (
            <StatusBadge key={extra.key}>
              {humanizeKey(extra.key)} {extra.value}
            </StatusBadge>
          ))}
        </span>
      </td>

      <td data-label="League" className="cell-quiet">
        {record.league}
      </td>

      <td data-label="Date" className="cell-quiet">
        {formatDate(record.date)}
      </td>

      <td data-label="Reported kick-off">
        <span className="times">
          {matched ? (
            record.siteTimes.map((entry) => (
              <span
                key={entry.site}
                className={`times__entry${entry.differs ? " times__entry--differs" : ""}`}
              >
                <span className="times__site">{SITE_LABELS[entry.site]}</span>
                <span className="times__clock">{formatTime(entry.time)}</span>
              </span>
            ))
          ) : (
            <>
              <span className="times__entry">
                <span className="times__site">Reported</span>
                <span className="times__clock">{formatTime(record.referenceTime)}</span>
              </span>
              <span className="times__note">No matching fixture on the other sites</span>
            </>
          )}
        </span>
      </td>

      <td data-label="Difference" className="align-end">
        {record.spreadMinutes !== null && record.spreadMinutes > 0 ? (
          <span className="delta">+{formatMinutes(record.spreadMinutes)}</span>
        ) : (
          <span className="delta delta--none">Not comparable</span>
        )}
      </td>
    </tr>
  );
}
