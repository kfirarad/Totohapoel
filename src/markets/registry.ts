import type { MarketCode, MarketConfig, MarketPackage } from "./types";
import { ilConfig } from "./il/config";
import { ilAdapter } from "./il/adapter";

export const markets: Record<MarketCode, MarketPackage> = {
  il: { config: ilConfig, adapter: ilAdapter },
};

export const DEFAULT_MARKET: MarketCode = "il";

export const isMarketCode = (code: string): code is MarketCode => Object.prototype.hasOwnProperty.call(markets, code);

/** Config of a market; unknown codes fall back to the default market */
export const getMarket = (code: string = DEFAULT_MARKET): MarketConfig =>
  (isMarketCode(code) ? markets[code] : markets[DEFAULT_MARKET]).config;
