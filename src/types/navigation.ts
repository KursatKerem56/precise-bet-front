export const VIEWS = ["dashboard", "matches", "compared", "settings"] as const;
export type ViewKey = (typeof VIEWS)[number];
