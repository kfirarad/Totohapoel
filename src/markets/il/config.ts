import type { MarketConfig } from "../types";

export const ilConfig: MarketConfig = {
  code: "il",
  operator: "Winner",
  product: "Toto 16",
  defaultLocale: "he",
  timeZone: "Asia/Jerusalem",
  gamesPerDraw: 16,
  outcomeLabels: { "1": "1", X: "X", "2": "2" },
  defaultLimits: { maxDoubles: 5, maxTriples: 4 },
  postponedPolicy: "operator-decides",
};
