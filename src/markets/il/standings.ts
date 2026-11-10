import leagues from "./standingsLeagues.json";

/** Winner's competition name (data, in Hebrew) -> ScoreAxis league id for the standings widget */
export const standingsLeagueId = (competition: string | null | undefined): string | null => {
  const id = competition ? (leagues as Record<string, unknown>)[competition] : null;
  return typeof id === "string" ? id : null;
};
