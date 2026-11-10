import { DEFAULT_MARKET, getMarket } from "./registry";

/**
 * The market the UI is showing. Always the default market for now; once groups exist it will read
 * the current group's market.
 */
export const useMarket = () => getMarket(DEFAULT_MARKET);
