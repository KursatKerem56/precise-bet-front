export const VIEWS = ["dashboard", "matches", "compared", "review", "settings"] as const;
export type ViewKey = (typeof VIEWS)[number];
