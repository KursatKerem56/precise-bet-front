export const SITES = ["VIRUS_BET", "MAVI_BET", "BETIST"] as const;
export type Site = (typeof SITES)[number];

export const SITE_LABELS: Record<Site, string> = {
  VIRUS_BET: "Virus Bet",
  MAVI_BET: "Mavi Bet",
  BETIST: "Betist",
};

export const SPORTS = [
  "FOOTBALL",
  "BASKETBALL",
  "VOLLEYBALL",
  "TENNIS",
] as const;
export type Sport = (typeof SPORTS)[number];

export const SPORT_LABELS: Record<Sport, string> = {
  FOOTBALL: "Football",
  BASKETBALL: "Basketball",
  VOLLEYBALL: "Volleyball",
  TENNIS: "Tennis",
};

export function isSite(value: unknown): value is Site {
  return typeof value === "string" && (SITES as readonly string[]).includes(value);
}

export function isSport(value: unknown): value is Sport {
  return typeof value === "string" && (SPORTS as readonly string[]).includes(value);
}
