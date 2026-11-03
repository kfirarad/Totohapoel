import { cn } from "@/lib/utils";
import type { Game } from "@/types/database.types";

/**
 * Mobile: home, a dash, away, stacked and centered (long names wrap, never truncated).
 * From md: "home – away" on one line.
 * Once a result exists the winner is bold and the loser regular; a draw keeps both equal.
 */
export const Teams = ({ game }: { game: Pick<Game, "home_team" | "away_team" | "result"> }) => {
  const weight = (side: "1" | "2") =>
    !game.result || game.result === "X" ? "font-semibold" : game.result === side ? "font-bold" : "font-normal";

  return (
    <span className="flex min-w-0 flex-col items-center text-center leading-snug md:flex-row md:flex-wrap md:items-baseline md:gap-x-1 md:text-start">
      <span className={cn("max-w-full text-balance", weight("1"))}>{game.home_team}</span>
      <span className="text-xs leading-none font-normal text-muted-foreground md:text-[length:inherit] md:leading-[inherit]" aria-hidden>
        –
      </span>
      <span className={cn("max-w-full text-balance", weight("2"))}>{game.away_team}</span>
    </span>
  );
};
