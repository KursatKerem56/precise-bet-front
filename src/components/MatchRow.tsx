import type { MatchRecord } from "../types/matches";
import type { TableColumn } from "./DataTable";
import { formatTime } from "../lib/format";
import { SiteTag, SportTag } from "./Tags";

export const MATCH_COLUMNS: TableColumn[] = [
  { key: "home", label: "Home" },
  { key: "away", label: "Away" },
  { key: "time", label: "Kick-off", width: "6.5rem" },
  { key: "sport", label: "Sport", width: "8rem" },
  { key: "site", label: "Site", width: "8rem" },
];

export function MatchRow({ record }: { record: MatchRecord }) {
  return (
    <tr className="data-table__row">
      <td data-label="Home" className="cell-team">
        {record.home}
      </td>
      <td data-label="Away" className="cell-team">
        {record.away}
      </td>
      <td data-label="Kick-off" className="cell-time">
        {formatTime(record.time)}
      </td>
      <td data-label="Sport">
        <SportTag sport={record.sport} rawSport={record.rawSport} />
      </td>
      <td data-label="Site">
        <SiteTag site={record.site} />
      </td>
    </tr>
  );
}
