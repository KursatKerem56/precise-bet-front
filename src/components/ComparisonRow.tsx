import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import type {
  ComparedFixture,
  FixtureLink,
  FixtureLive,
  FixtureSource,
  LiveStatus,
  SourceLive,
} from "../types/comparison";
import type { TableColumn } from "./DataTable";
import {
  formatDate,
  formatDateShort,
  formatMinutes,
  formatSignedMinutes,
  formatTime,
} from "../lib/format";
import { StatusBadge } from "./StatusBadge";
import { SportTag } from "./Tags";

export const COMPARISON_COLUMNS: TableColumn[] = [
  { key: "fixture", label: "Fixture" },
  { key: "league", label: "League", width: "10rem" },
  { key: "date", label: "Date", width: "8.5rem" },
  { key: "times", label: "Reported kick-off", width: "21rem" },
  { key: "delta", label: "Difference", width: "8rem", align: "end" },
];

/** Identity stages from the backend's matcher (`eslesme[].kimlik`). */
const METHOD_LABELS: Record<string, string> = {
  exact: "Exact name",
  alias: "Known alias",
  core: "Same core name",
  fuzzy: "Similar name",
  anchored: "One team exact, one similar",
  "double-partial": "Both names partial",
  reversed: "Home and away swapped",
  esports: "Esports team identity",
};

/** Why a time guard was passed (`eslesme[].canliKanit`). */
const LIVE_EVIDENCE_LABELS: Record<string, string> = {
  simultaneous: "both sites showed it live at the same time",
  "live-vs-upcoming": "one site showed it live while the other still listed it as upcoming",
};

const STATUS_LABELS: Record<LiveStatus, string> = {
  live: "Live",
  interrupted: "Interrupted",
  finished: "Finished",
};

/** "Live 1:0 63'" — the site's own status, never inferred from the clock. */
function describeSourceLive(live: SourceLive): string {
  return [
    STATUS_LABELS[live.status],
    live.score,
    live.period,
    live.minute ? `${live.minute.replace(/'$/, "")}'` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function LiveBadge({ live, stale }: { live: FixtureLive; stale: boolean }) {
  if (!live.underway) {
    return (
      <StatusBadge title="A site reports this fixture as finished">
        {STATUS_LABELS.finished}
      </StatusBadge>
    );
  }
  const label = STATUS_LABELS[live.status];
  return (
    <StatusBadge
      tone={live.status === "live" ? "live" : "hold"}
      title={
        stale
          ? "A site reported this fixture in play when the last run was made. That run is not recent."
          : "A site's live feed reports this fixture in play"
      }
    >
      {live.status === "live" && !stale ? <span className="badge__pulse" aria-hidden="true" /> : null}
      {stale ? `${label} at last run` : label}
    </StatusBadge>
  );
}

function KickOff({ source, showDate }: { source: FixtureSource; showDate: boolean }) {
  return (
    <span className={`times__entry${source.differs ? " times__entry--differs" : ""}`}>
      <span className="times__site">{source.label}</span>
      <span className="times__clock">{formatTime(source.time)}</span>
      {showDate ? <span className="times__date">{formatDateShort(source.date)}</span> : null}
      {source.differs ? (
        <span className="times__offset">{formatSignedMinutes(source.deviationMinutes)}</span>
      ) : null}
      {source.live ? (
        <span className={`times__status times__status--${source.live.status}`}>
          {describeSourceLive(source.live)}
        </span>
      ) : source.showsNotStarted ? (
        <span className="times__status times__status--upcoming">Listed upcoming</span>
      ) : null}
    </span>
  );
}

function describeLink(link: FixtureLink): string {
  const parts = [link.method ? (METHOD_LABELS[link.method] ?? link.method) : "Matched"];
  if (link.confidence !== null) parts.push(`${Math.round(link.confidence * 100)}% confidence`);
  if (link.reversed && link.method !== "reversed") parts.push("home and away swapped");
  if (link.liveEvidence) {
    parts.push(
      `kick-off gap accepted because ${LIVE_EVIDENCE_LABELS[link.liveEvidence] ?? link.liveEvidence}`,
    );
  }
  return parts.join(", ");
}

function SourceStatus({ source }: { source: FixtureSource }) {
  const { live } = source;
  if (!live && !source.showsNotStarted) return null;

  return (
    <span className="source-list__status">
      {live ? (
        <span className={`times__status times__status--${live.status}`}>{describeSourceLive(live)}</span>
      ) : (
        <span className="times__status times__status--upcoming">
          Still listed as upcoming while the fixture is being played
        </span>
      )}
      {live?.reportedStart ? (
        <span className="source-list__note">Live feed reports a start at {formatTime(live.reportedStart)}</span>
      ) : null}
      {live?.scheduleFromEarlierList ? (
        <span className="source-list__note">
          Scheduled time from this site&apos;s earlier list. It was dropped from the current one once play began.
        </span>
      ) : null}
    </span>
  );
}

function FixtureDetails({ fixture }: { fixture: ComparedFixture }) {
  const { earliest, latest, live } = fixture;
  const liveOn = fixture.sources
    .filter((source) => source.live && source.live.status !== "finished")
    .map((source) => source.label);

  return (
    <div className="fixture-details">
      {live?.underway && live.notStartedOn.length > 0 ? (
        <p className="fixture-details__summary">
          Being played{liveOn.length > 0 ? ` (live on ${liveOn.join(", ")})` : ""}, but{" "}
          {live.notStartedOn.join(", ")} still {live.notStartedOn.length === 1 ? "lists" : "list"} it
          as upcoming. That scheduled kick-off is probably wrong.
        </p>
      ) : null}

      {fixture.uniqueTimes > 1 && earliest && latest ? (
        <p className="fixture-details__summary">
          {fixture.uniqueTimes} different kick-offs reported. Earliest{" "}
          <b>
            {formatTime(earliest.time)}
            {fixture.dateDiffers ? `, ${formatDateShort(earliest.date)}` : ""}
          </b>{" "}
          ({earliest.label}), latest{" "}
          <b>
            {formatTime(latest.time)}
            {fixture.dateDiffers ? `, ${formatDateShort(latest.date)}` : ""}
          </b>{" "}
          ({latest.label}).
        </p>
      ) : null}

      <div className="source-list" role="list" aria-label="Kick-off by site">
        {fixture.sources.map((source) => (
          <div
            key={source.site}
            role="listitem"
            className={`source-list__row${source.differs ? " source-list__row--differs" : ""}`}
          >
            <span className="source-list__site">{source.label}</span>
            <span className="source-list__when">
              <b>{formatTime(source.time)}</b> {formatDate(source.date)}
              <SourceStatus source={source} />
            </span>
            <span className="source-list__offset">
              {source.differs ? formatSignedMinutes(source.deviationMinutes) : "Agrees"}
            </span>
            <span className="source-list__listed">
              {source.teams ?? "—"}
              {source.league ? <span className="source-list__league">{source.league}</span> : null}
            </span>
          </div>
        ))}
      </div>

      {fixture.missing.length > 0 ? (
        <p className="fixture-details__note">Not listed on {fixture.missing.join(", ")}.</p>
      ) : null}

      {fixture.links.length > 0 ? (
        <div className="fixture-details__links">
          <p className="fixture-details__heading">Why these are the same fixture</p>
          <ul>
            {fixture.links.map((link, index) => (
              <li key={`${link.siteA}-${link.siteB}-${index}`}>
                {link.siteA} and {link.siteB}: {describeLink(link)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * One real-world fixture as grouped by the backend. The disagreeing times are
 * the loudest thing on the page — that conflict is the reason this view exists.
 */
export function ComparisonRow({
  fixture,
  liveStale = false,
}: {
  fixture: ComparedFixture;
  /** The run is too old for its live statuses to describe the present. */
  liveStale?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const hasSources = fixture.sources.length > 0;
  const { live } = fixture;
  const listedUpcoming = live?.underway === true && live.notStartedOn.length > 0;

  return (
    <>
      <tr className="data-table__row">
        <td data-label="Fixture">
          <span className="cell-fixture">
            {fixture.home}
            <span className="cell-fixture__v">v</span>
            {fixture.away}
          </span>
          <span className="cell-meta">
            <SportTag sport={fixture.sport} rawSport={fixture.rawSport} />
            {live ? <LiveBadge live={live} stale={liveStale} /> : null}
            {hasSources ? (
              <StatusBadge title="Sites the backend matched this fixture on">
                {fixture.sources.length} sites
              </StatusBadge>
            ) : null}
            {fixture.dateDiffers ? (
              <StatusBadge tone="hold" title="The sites list this fixture on different days">
                Different day
              </StatusBadge>
            ) : null}
            {hasSources ? (
              <button
                type="button"
                className="row-toggle"
                aria-expanded={open}
                aria-controls={open ? detailsId : undefined}
                onClick={() => setOpen((value) => !value)}
              >
                Details
                <ChevronDown size={12} aria-hidden="true" className="row-toggle__icon" />
              </button>
            ) : null}
          </span>
        </td>

        <td data-label="League" className="cell-quiet">
          {fixture.league}
        </td>

        <td data-label="Date" className="cell-quiet">
          {formatDate(fixture.date)}
        </td>

        <td data-label="Reported kick-off">
          <span className="cell-stack">
            <span className="times">
              {hasSources ? (
                fixture.sources.map((source) => (
                  <KickOff key={source.site} source={source} showDate={fixture.dateDiffers} />
                ))
              ) : (
                <span className="times__note">
                  No per-site times in this entry. It comes from an older comparison run.
                </span>
              )}
            </span>
            {fixture.missing.length > 0 ? (
              <span className="times__missing">Not on {fixture.missing.join(", ")}</span>
            ) : null}
          </span>
        </td>

        <td data-label="Difference" className="align-end">
          <span className="cell-stack">
            {fixture.hasTimeDifference ? (
              <span className="delta">
                {fixture.maxDiffMinutes !== null ? `+${formatMinutes(fixture.maxDiffMinutes)}` : "Differs"}
              </span>
            ) : listedUpcoming ? (
              <span className="delta delta--live">Listed upcoming</span>
            ) : !fixture.kickOffConflict && fixture.maxDiffMinutes === null ? (
              <span className="delta delta--none">Not comparable</span>
            ) : (
              <span className="delta delta--agree">Same time</span>
            )}
            {fixture.uniqueTimes > 2 ? (
              <span className="delta__note">{fixture.uniqueTimes} different times</span>
            ) : null}
            {listedUpcoming ? (
              <span className="delta__note">
                {fixture.hasTimeDifference ? "Live, but upcoming on " : "on "}
                {live!.notStartedOn.join(", ")}
              </span>
            ) : null}
          </span>
        </td>
      </tr>

      {open ? (
        <tr className="data-table__details" id={detailsId}>
          <td colSpan={COMPARISON_COLUMNS.length}>
            <FixtureDetails fixture={fixture} />
          </td>
        </tr>
      ) : null}
    </>
  );
}
