import { formatNumber } from "../lib/format";
import type { LiveSourceState } from "../lib/transform";

/** Names the sites whose live files the last run could not use. */
export function LiveSourceWarning({ sources }: { sources: LiveSourceState[] }) {
  const unused = sources.filter((source) => source.state !== "ok");
  if (unused.length === 0) return null;

  return (
    <p className="run-warning" role="status">
      The last run did not use live data from{" "}
      {unused
        .map((source) =>
          source.state === "stale"
            ? `${source.label} (${source.ageMinutes !== null ? `${formatNumber(Math.round(source.ageMinutes))} min old` : "out of date"})`
            : `${source.label} (could not be read)`,
        )
        .join(", ")}
      . Those sites are compared on scheduled times only, and a fixture missing from a live feed is
      not treated as finished.
    </p>
  );
}
