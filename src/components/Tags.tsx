import { SITE_LABELS, SPORT_LABELS, type Site, type Sport } from "../types/domain";

interface SportTagProps {
  sport: Sport | null;
  rawSport: string;
}

/** Sport name with a colour-coded dot, so a mixed list stays scannable. */
export function SportTag({ sport, rawSport }: SportTagProps) {
  const label = sport ? SPORT_LABELS[sport] : rawSport;
  return (
    <span className={`tag tag--${(sport ?? "unknown").toLowerCase()}`}>
      <span className="tag__dot" aria-hidden="true" />
      {label}
    </span>
  );
}

export function SiteTag({ site }: { site: Site }) {
  return <span className="site-name">{SITE_LABELS[site]}</span>;
}
