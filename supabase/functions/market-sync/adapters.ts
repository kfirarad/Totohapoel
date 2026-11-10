import type { ServerAdapter } from "../_shared/types.ts";

/**
 * Server-side operator adapters, one per market whose operator can be called from a server.
 * Empty in Phase 0: Israel (Winner) blocks servers, so it imports through the admin's browser.
 * Each market phase adds its adapter here (see docs/markets-plan.md §5).
 */
export const serverAdapters: Record<string, ServerAdapter> = {};
