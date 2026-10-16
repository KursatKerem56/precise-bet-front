export const VIEWS = ["dashboard", "matches", "compared", "live", "settings"] as const;
export type ViewKey = (typeof VIEWS)[number];
