import type { MarketAdapter } from "../types";

/**
 * Winner sits behind bot protection, so draws reach us through the bookmarklet in ./winner.ts
 * (run by the admin on winner.co.il), not through server calls. Results are entered by hand for now.
 */
export const ilAdapter: MarketAdapter = {
  transport: "browser-bridge",
};
