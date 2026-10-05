import { SITE_LABELS, SPORT_LABELS, type Site, type Sport } from "../types/domain";

interface SportTagProps {
  sport: Sport | null;
  rawSport: string;
}

/**
 * Display name for a sport. Catalog sports the UI has no label for are
 * humanized from the backend key: "BUZ_HOKEYI" -> "Buz hokeyi".
 */
export function sportLabel(sport: Sport | null, rawSport: string): string {
  if (sport) return SPORT_LABELS[sport];
  const spaced = rawSport.replace(/_+/g, " ").trim().toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Sport name with a colour-coded dot, so a mixed list stays scannable. */
export function SportTag({ sport, rawSport }: SportTagProps) {
  const label = sportLabel(sport, rawSport);
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
